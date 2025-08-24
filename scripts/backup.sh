#!/bin/bash

# Database Backup Script for Fear & Greed Index Production
# Performs automated database backups with compression and retention
# Usage: ./backup.sh [--type full|incremental] [--upload-s3]

set -euo pipefail

# Configuration
APP_DIR="/home/min/fg-index"
BACKUP_DIR="$APP_DIR/backups"
LOG_FILE="$APP_DIR/logs/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
BACKUP_TYPE="full"
UPLOAD_S3=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --upload-s3)
            UPLOAD_S3=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--type full|incremental] [--upload-s3]"
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
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Ensure backup directory exists
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        chmod 750 "$BACKUP_DIR"
    fi
}

# Check if database container is running
check_database_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "fg-database-prod"; then
        error "Database container (fg-database-prod) is not running"
    fi
}

# Get database connection info
get_db_info() {
    DB_NAME=${DATABASE_NAME:-fg_index_prod}
    DB_USER=${DATABASE_USER:-fg_user}
    
    # Try to get password from environment or docker container
    if [ -z "${DATABASE_PASSWORD:-}" ]; then
        DB_PASS=$(docker exec fg-database-prod printenv POSTGRES_PASSWORD 2>/dev/null || echo "")
        if [ -z "$DB_PASS" ]; then
            error "Could not determine database password"
        fi
    else
        DB_PASS="$DATABASE_PASSWORD"
    fi
    
    info "Database: $DB_NAME, User: $DB_USER"
}

# Create full database backup
backup_full() {
    local backup_file="$BACKUP_DIR/backup_full_${DATE}.sql"
    
    log "Creating full database backup..."
    
    # Create SQL dump with custom format for better compression and recovery options
    docker exec fg-database-prod pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --format=custom \
        --no-password \
        --file="/tmp/backup_full_${DATE}.dump" || error "Failed to create database dump"
    
    # Copy dump file from container
    docker cp fg-database-prod:/tmp/backup_full_${DATE}.dump "$backup_file.dump"
    
    # Create SQL version for compatibility
    docker exec fg-database-prod pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        > "$backup_file" || error "Failed to create SQL backup"
    
    # Clean up container temporary file
    docker exec fg-database-prod rm -f "/tmp/backup_full_${DATE}.dump"
    
    # Compress backups
    gzip "$backup_file"
    gzip "$backup_file.dump"
    
    log "Full backup created: backup_full_${DATE}.sql.gz and backup_full_${DATE}.sql.dump.gz"
    
    # Get backup size
    local backup_size=$(du -h "$backup_file.gz" | cut -f1)
    info "Backup size: $backup_size"
}

# Create incremental backup (using pg_basebackup for WAL)
backup_incremental() {
    local backup_file="$BACKUP_DIR/backup_incremental_${DATE}.sql"
    
    log "Creating incremental database backup..."
    
    # For PostgreSQL, we'll create a logical backup of recently changed data
    # This is a simplified incremental approach - real incremental backups need WAL archiving
    
    local yesterday=$(date -d "1 day ago" '+%Y-%m-%d')
    
    # Backup tables with recent modifications
    docker exec fg-database-prod pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --table-pattern="*" \
        --where="updated_at >= '$yesterday' OR created_at >= '$yesterday'" \
        > "$backup_file" || {
        warn "Incremental backup failed, falling back to full backup"
        backup_full
        return
    }
    
    # Compress backup
    gzip "$backup_file"
    
    log "Incremental backup created: backup_incremental_${DATE}.sql.gz"
    
    local backup_size=$(du -h "$backup_file.gz" | cut -f1)
    info "Incremental backup size: $backup_size"
}

# Backup application configuration
backup_config() {
    local config_backup="$BACKUP_DIR/config_backup_${DATE}.tar.gz"
    
    log "Creating configuration backup..."
    
    cd "$APP_DIR"
    tar -czf "$config_backup" \
        --exclude='logs/*' \
        --exclude='backups/*' \
        --exclude='node_modules' \
        --exclude='.git' \
        docker-compose.prod.yml \
        nginx.prod.conf \
        .env.production \
        scripts/ \
        2>/dev/null || warn "Some configuration files may be missing"
    
    info "Configuration backup created: config_backup_${DATE}.tar.gz"
}

# Upload backup to S3 (if configured)
upload_to_s3() {
    if [ "$UPLOAD_S3" = false ] || [ -z "${BACKUP_S3_BUCKET:-}" ]; then
        info "S3 upload skipped"
        return
    fi
    
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI not installed, skipping S3 upload"
        return
    fi
    
    log "Uploading backups to S3 bucket: $BACKUP_S3_BUCKET"
    
    # Upload all backups created today
    for backup_file in "$BACKUP_DIR"/*${DATE}*; do
        if [ -f "$backup_file" ]; then
            local s3_key="backups/$(basename "$backup_file")"
            aws s3 cp "$backup_file" "s3://$BACKUP_S3_BUCKET/$s3_key" || warn "Failed to upload $(basename "$backup_file")"
        fi
    done
    
    log "S3 upload completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Verifying backup integrity..."
    
    # Test gzip integrity
    if [[ "$backup_file" == *.gz ]]; then
        gzip -t "$backup_file" || error "Backup file is corrupted: $backup_file"
    fi
    
    # Test SQL syntax (basic check)
    if [[ "$backup_file" == *.sql.gz ]]; then
        zcat "$backup_file" | head -n 20 | grep -q "PostgreSQL database dump" || warn "Backup may not be a valid PostgreSQL dump"
    fi
    
    info "Backup verification completed"
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Remove old backup files
    find "$BACKUP_DIR" -name "backup_*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old S3 backups (if configured)
    if [ "$UPLOAD_S3" = true ] && [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
        aws s3 ls "s3://$BACKUP_S3_BUCKET/backups/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$BACKUP_S3_BUCKET/backups/$file_name" || true
            fi
        done
    fi
    
    info "Cleanup completed"
}

# Send backup notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local emoji="✅"
        if [ "$status" = "error" ]; then
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Database Backup: $message - $DOMAIN\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # Log notification
    log "Notification sent: $status - $message"
}

# Create backup summary
create_summary() {
    local summary_file="$BACKUP_DIR/backup_summary_${DATE}.txt"
    
    cat > "$summary_file" << EOF
Backup Summary - $(date '+%Y-%m-%d %H:%M:%S')
=====================================
Backup Type: $BACKUP_TYPE
Date: $DATE
Database: $DB_NAME
User: $DB_USER

Files Created:
$(ls -la "$BACKUP_DIR"/*${DATE}* 2>/dev/null || echo "No backup files found")

Disk Usage:
$(df -h "$BACKUP_DIR")

Total Backup Size:
$(du -sh "$BACKUP_DIR"/*${DATE}* 2>/dev/null | awk '{total+=$1} END {print total}' || echo "0")

Status: $([ $? -eq 0 ] && echo "SUCCESS" || echo "PARTIAL/FAILED")
EOF

    info "Backup summary created: $summary_file"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "Starting $BACKUP_TYPE database backup..."
    
    # Ensure prerequisites
    ensure_backup_dir
    check_database_container
    get_db_info
    
    # Create lock file to prevent concurrent backups
    local lock_file="$BACKUP_DIR/.backup.lock"
    if [ -f "$lock_file" ]; then
        local pid=$(cat "$lock_file")
        if kill -0 "$pid" 2>/dev/null; then
            error "Another backup process is already running (PID: $pid)"
        else
            warn "Removing stale lock file"
            rm -f "$lock_file"
        fi
    fi
    echo $$ > "$lock_file"
    trap "rm -f '$lock_file'" EXIT
    
    # Perform backup based on type
    case "$BACKUP_TYPE" in
        "full")
            backup_full
            backup_config
            ;;
        "incremental")
            backup_incremental
            ;;
        *)
            error "Invalid backup type: $BACKUP_TYPE. Use 'full' or 'incremental'"
            ;;
    esac
    
    # Verify the backup
    for backup_file in "$BACKUP_DIR"/*${DATE}*.gz; do
        if [ -f "$backup_file" ]; then
            verify_backup "$backup_file"
        fi
    done
    
    # Upload to S3 if configured
    upload_to_s3
    
    # Clean up old backups
    cleanup_old_backups
    
    # Create summary
    create_summary
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Backup completed successfully in ${duration}s"
    send_notification "success" "$BACKUP_TYPE backup completed in ${duration}s"
    
    # Show final status
    info "Backup files:"
    ls -la "$BACKUP_DIR"/*${DATE}* 2>/dev/null || echo "No backup files found"
}

# Execute main function
main "$@"