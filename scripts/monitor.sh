#!/bin/bash

# Production Monitoring Script for Fear & Greed Index
# Monitors system health, Docker containers, SSL certificates, and application metrics
# Usage: ./monitor.sh [--check-all] [--alert] [--report]

set -euo pipefail

# Configuration
APP_DIR="/home/min/fg-index"
LOG_FILE="$APP_DIR/logs/monitor.log"
ALERT_LOG="$APP_DIR/logs/alerts.log"
DOMAIN="investand.voyagerss.com"

# Thresholds
DISK_WARNING_THRESHOLD=80
DISK_CRITICAL_THRESHOLD=90
MEMORY_WARNING_THRESHOLD=85
MEMORY_CRITICAL_THRESHOLD=95
CPU_WARNING_THRESHOLD=80
CPU_CRITICAL_THRESHOLD=90
SSL_WARNING_DAYS=30
SSL_CRITICAL_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
CHECK_ALL=false
SEND_ALERTS=false
GENERATE_REPORT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --check-all)
            CHECK_ALL=true
            shift
            ;;
        --alert)
            SEND_ALERTS=true
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--check-all] [--alert] [--report]"
            exit 1
            ;;
    esac
done

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

alert() {
    echo -e "${RED}[ALERT] $(date '+%Y-%m-%d %H:%M:%S') $1${NC}" | tee -a "$ALERT_LOG"
    if [ "$SEND_ALERTS" = true ]; then
        send_alert "$1"
    fi
}

# Send alert notification
send_alert() {
    local message="$1"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 ALERT: $message - $DOMAIN\", \"color\":\"danger\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # Send email alert if configured
    if [ -n "${ALERT_EMAIL:-}" ] && command -v mail &> /dev/null; then
        echo "Alert from $DOMAIN: $message" | mail -s "Production Alert - $DOMAIN" "$ALERT_EMAIL" || true
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt "$DISK_CRITICAL_THRESHOLD" ]; then
        alert "CRITICAL: Disk usage is ${disk_usage}% (threshold: ${DISK_CRITICAL_THRESHOLD}%)"
    elif [ "$disk_usage" -gt "$DISK_WARNING_THRESHOLD" ]; then
        warn "WARNING: Disk usage is ${disk_usage}% (threshold: ${DISK_WARNING_THRESHOLD}%)"
    else
        info "Disk usage: ${disk_usage}% - OK"
    fi
    
    # Check memory usage
    local memory_info=$(free | awk 'FNR==2{printf "%.0f %.0f %.0f", $3/$2*100, $2/1024/1024, $3/1024/1024}')
    local memory_usage=$(echo "$memory_info" | cut -d' ' -f1)
    local total_memory=$(echo "$memory_info" | cut -d' ' -f2)
    local used_memory=$(echo "$memory_info" | cut -d' ' -f3)
    
    if [ "$memory_usage" -gt "$MEMORY_CRITICAL_THRESHOLD" ]; then
        alert "CRITICAL: Memory usage is ${memory_usage}% (${used_memory}GB/${total_memory}GB)"
    elif [ "$memory_usage" -gt "$MEMORY_WARNING_THRESHOLD" ]; then
        warn "WARNING: Memory usage is ${memory_usage}% (${used_memory}GB/${total_memory}GB)"
    else
        info "Memory usage: ${memory_usage}% (${used_memory}GB/${total_memory}GB) - OK"
    fi
    
    # Check CPU usage (5-minute average)
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local cpu_int=${cpu_usage%.*}
    
    if [ "$cpu_int" -gt "$CPU_CRITICAL_THRESHOLD" ]; then
        alert "CRITICAL: CPU usage is ${cpu_usage}% (threshold: ${CPU_CRITICAL_THRESHOLD}%)"
    elif [ "$cpu_int" -gt "$CPU_WARNING_THRESHOLD" ]; then
        warn "WARNING: CPU usage is ${cpu_usage}% (threshold: ${CPU_WARNING_THRESHOLD}%)"
    else
        info "CPU usage: ${cpu_usage}% - OK"
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    local cpu_cores=$(nproc)
    local load_1min=$(echo "$load_avg" | awk '{print $1}' | sed 's/,//')
    
    if (( $(echo "$load_1min > $cpu_cores * 2" | bc -l) )); then
        alert "CRITICAL: High load average: $load_avg (${cpu_cores} cores available)"
    elif (( $(echo "$load_1min > $cpu_cores * 1.5" | bc -l) )); then
        warn "WARNING: Elevated load average: $load_avg (${cpu_cores} cores available)"
    else
        info "Load average: $load_avg - OK"
    fi
}

# Check Docker containers
check_docker_containers() {
    log "Checking Docker containers..."
    
    # Check if Docker is running
    if ! systemctl is-active --quiet docker; then
        alert "CRITICAL: Docker service is not running"
        return 1
    fi
    
    # List of expected containers
    local expected_containers=("fg-nginx-prod" "fg-frontend-prod" "fg-backend-prod" "fg-database-prod" "fg-redis-prod" "fg-scheduler-prod")
    local failed_containers=()
    
    for container in "${expected_containers[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            failed_containers+=("$container")
        else
            # Check container health
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
            if [ "$health_status" = "unhealthy" ]; then
                alert "CRITICAL: Container $container is unhealthy"
            elif [ "$health_status" = "starting" ]; then
                warn "WARNING: Container $container is still starting"
            elif [ "$health_status" = "healthy" ] || [ "$health_status" = "none" ]; then
                info "Container $container - OK"
            fi
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        alert "CRITICAL: ${#failed_containers[@]} containers are down: ${failed_containers[*]}"
    else
        info "All expected containers are running"
    fi
    
    # Check container resource usage
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | while IFS=$'\t' read -r name cpu mem; do
        if [ "$name" != "NAME" ]; then
            local cpu_num=$(echo "$cpu" | sed 's/%//')
            if (( $(echo "$cpu_num > 90" | bc -l) )); then
                warn "WARNING: Container $name CPU usage: $cpu"
            fi
        fi
    done
}

# Check SSL certificate
check_ssl_certificate() {
    log "Checking SSL certificate for $DOMAIN..."
    
    # Check if certificate file exists
    local cert_file="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if [ ! -f "$cert_file" ]; then
        alert "CRITICAL: SSL certificate file not found: $cert_file"
        return 1
    fi
    
    # Check certificate expiry via OpenSSL
    local cert_end_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local cert_end_epoch=$(date -d "$cert_end_date" +%s)
    local current_epoch=$(date +%s)
    local days_left=$(( (cert_end_epoch - current_epoch) / 86400 ))
    
    if [ "$days_left" -lt "$SSL_CRITICAL_DAYS" ]; then
        alert "CRITICAL: SSL certificate expires in $days_left days"
    elif [ "$days_left" -lt "$SSL_WARNING_DAYS" ]; then
        warn "WARNING: SSL certificate expires in $days_left days"
    else
        info "SSL certificate expires in $days_left days - OK"
    fi
    
    # Check if certificate is valid via HTTPS
    if ! curl -s -I "https://$DOMAIN" | grep -q "HTTP/"; then
        alert "CRITICAL: HTTPS connection to $DOMAIN failed"
    else
        info "HTTPS connection to $DOMAIN - OK"
    fi
}

# Check application health endpoints
check_application_health() {
    log "Checking application health endpoints..."
    
    # Check main health endpoint
    local health_response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost/health" || echo "000")
    if [ "$health_response" != "200" ]; then
        alert "CRITICAL: Main health endpoint returned $health_response"
    else
        info "Main health endpoint - OK"
    fi
    
    # Check API health endpoint
    local api_health_response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost/api/health" || echo "000")
    if [ "$api_health_response" != "200" ]; then
        alert "CRITICAL: API health endpoint returned $api_health_response"
    else
        info "API health endpoint - OK"
    fi
    
    # Check HTTPS endpoints
    local https_response=$(curl -s -w "%{http_code}" -o /dev/null "https://$DOMAIN/health" || echo "000")
    if [ "$https_response" != "200" ]; then
        alert "CRITICAL: HTTPS health endpoint returned $https_response"
    else
        info "HTTPS health endpoint - OK"
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker ps --format '{{.Names}}' | grep -q "fg-database-prod"; then
        # Test database connection
        if docker exec fg-database-prod pg_isready -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}" >/dev/null 2>&1; then
            info "Database connectivity - OK"
            
            # Check database size
            local db_size=$(docker exec fg-database-prod psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}" -t -c "SELECT pg_size_pretty(pg_database_size('${DATABASE_NAME:-fg_index_prod}'))" | xargs)
            info "Database size: $db_size"
            
            # Check active connections
            local active_connections=$(docker exec fg-database-prod psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'" | xargs)
            info "Active database connections: $active_connections"
            
            # Check for long-running queries (>5 minutes)
            local long_queries=$(docker exec fg-database-prod psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes'" | xargs)
            if [ "$long_queries" -gt 0 ]; then
                warn "WARNING: $long_queries long-running queries detected"
            fi
            
        else
            alert "CRITICAL: Database connection failed"
        fi
    else
        alert "CRITICAL: Database container is not running"
    fi
}

# Check Redis cache
check_redis() {
    log "Checking Redis cache..."
    
    if docker ps --format '{{.Names}}' | grep -q "fg-redis-prod"; then
        # Test Redis connection
        if docker exec fg-redis-prod redis-cli ping | grep -q "PONG"; then
            info "Redis connectivity - OK"
            
            # Check Redis memory usage
            local redis_memory=$(docker exec fg-redis-prod redis-cli info memory | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
            info "Redis memory usage: $redis_memory"
            
            # Check number of connected clients
            local redis_clients=$(docker exec fg-redis-prod redis-cli info clients | grep "connected_clients:" | cut -d: -f2 | tr -d '\r')
            info "Redis connected clients: $redis_clients"
            
        else
            alert "CRITICAL: Redis connection failed"
        fi
    else
        alert "CRITICAL: Redis container is not running"
    fi
}

# Check log files for errors
check_logs_for_errors() {
    log "Checking logs for recent errors..."
    
    local log_dirs=("$APP_DIR/logs/backend" "$APP_DIR/logs/frontend" "$APP_DIR/logs/nginx" "$APP_DIR/logs/scheduler")
    local error_count=0
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            # Check for errors in the last hour
            local recent_errors=$(find "$log_dir" -name "*.log" -mmin -60 -exec grep -i "error\|exception\|fatal\|critical" {} \; | wc -l)
            if [ "$recent_errors" -gt 10 ]; then
                warn "WARNING: $recent_errors errors found in $log_dir in the last hour"
                error_count=$((error_count + recent_errors))
            fi
        fi
    done
    
    if [ "$error_count" -gt 50 ]; then
        alert "CRITICAL: High error count in logs: $error_count errors in the last hour"
    elif [ "$error_count" -gt 0 ]; then
        info "Log errors in last hour: $error_count - Monitoring"
    else
        info "No significant errors in recent logs - OK"
    fi
}

# Check network connectivity
check_network() {
    log "Checking network connectivity..."
    
    # Check external DNS resolution
    if ! nslookup google.com >/dev/null 2>&1; then
        alert "CRITICAL: DNS resolution failed"
    else
        info "DNS resolution - OK"
    fi
    
    # Check external HTTP connectivity
    if ! curl -s --max-time 10 "https://httpbin.org/status/200" >/dev/null; then
        warn "WARNING: External HTTP connectivity may be limited"
    else
        info "External HTTP connectivity - OK"
    fi
    
    # Check if required ports are listening
    local required_ports=(80 443 22)
    for port in "${required_ports[@]}"; do
        if ! netstat -tuln | grep -q ":$port "; then
            alert "CRITICAL: Port $port is not listening"
        else
            info "Port $port is listening - OK"
        fi
    done
}

# Generate system report
generate_system_report() {
    local report_file="$APP_DIR/logs/system_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log "Generating system report: $report_file"
    
    {
        echo "System Health Report - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================================="
        echo
        
        echo "System Information:"
        echo "- Hostname: $(hostname)"
        echo "- Uptime: $(uptime -p)"
        echo "- Kernel: $(uname -r)"
        echo "- OS: $(lsb_release -d | cut -f2)"
        echo
        
        echo "Resource Usage:"
        echo "- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "- Memory: $(free -h | awk 'FNR==2{printf "%s/%s (%.0f%%)", $3,$2,$3*100/$2}')"
        echo "- Disk: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}')"
        echo "- Load: $(uptime | awk -F'load average:' '{print $2}')"
        echo
        
        echo "Docker Containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo
        
        echo "Docker Resource Usage:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
        echo
        
        echo "Network Connections:"
        netstat -tuln | grep LISTEN
        echo
        
        echo "Recent Alerts (Last 24 hours):"
        tail -n 50 "$ALERT_LOG" 2>/dev/null | grep "$(date -d '1 day ago' '+%Y-%m-%d')\|$(date '+%Y-%m-%d')" || echo "No recent alerts"
        echo
        
        echo "Log File Sizes:"
        find "$APP_DIR/logs" -name "*.log" -exec ls -lh {} \; | awk '{print $5 "\t" $9}'
        echo
        
        echo "Certificate Status:"
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout | grep -A 2 "Validity"
        else
            echo "Certificate not found"
        fi
        
    } > "$report_file"
    
    info "System report generated: $report_file"
}

# Main monitoring function
main() {
    log "Starting system monitoring checks..."
    
    # Basic checks (always run)
    check_system_resources
    check_docker_containers
    check_application_health
    
    # Extended checks (when --check-all is specified)
    if [ "$CHECK_ALL" = true ]; then
        check_ssl_certificate
        check_database
        check_redis
        check_logs_for_errors
        check_network
    fi
    
    # Generate report if requested
    if [ "$GENERATE_REPORT" = true ]; then
        generate_system_report
    fi
    
    log "Monitoring checks completed"
    
    # Show summary
    local alert_count=$(grep -c "ALERT" "$ALERT_LOG" 2>/dev/null | tail -1 || echo "0")
    local warning_count=$(grep -c "WARNING" "$LOG_FILE" | tail -1 || echo "0")
    
    if [ "$alert_count" -gt 0 ]; then
        error "Summary: $alert_count critical alerts, $warning_count warnings"
        exit 1
    elif [ "$warning_count" -gt 0 ]; then
        warn "Summary: No critical alerts, $warning_count warnings"
        exit 0
    else
        info "Summary: System is healthy - no alerts or warnings"
        exit 0
    fi
}

# Execute main function
main "$@"