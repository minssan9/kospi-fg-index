#!/bin/bash

# Production VM Setup Script for Fear & Greed Index
# Supports Ubuntu 22.04 LTS on Google Cloud Platform
# Usage: chmod +x setup-vm.sh && sudo ./setup-vm.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="fg-app"
APP_DIR="/opt/fg-index"
DOMAIN="investand.voyagerss.com"
EMAIL="admin@${DOMAIN}"

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
    apt-get autoremove -y
    apt-get autoclean
}

# Install essential packages
install_packages() {
    log "Installing essential packages..."
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        software-properties-common \
        ufw \
        fail2ban \
        htop \
        nginx \
        certbot \
        python3-certbot-nginx \
        logrotate \
        rsync \
        cron \
        supervisor
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add user to docker group
    usermod -aG docker ubuntu 2>/dev/null || warn "Could not add ubuntu user to docker group"
}

# Install Docker Compose (standalone)
install_docker_compose() {
    log "Installing Docker Compose..."
    
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink for compatibility
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
}

# Create application user and directories
setup_app_user() {
    log "Setting up application user and directories..."
    
    # Create application user
    if ! id "$APP_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
        usermod -aG docker "$APP_USER"
    fi
    
    # Create application directory structure
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/logs/nginx"
    mkdir -p "$APP_DIR/logs/backend"
    mkdir -p "$APP_DIR/logs/frontend" 
    mkdir -p "$APP_DIR/logs/postgres"
    mkdir -p "$APP_DIR/logs/redis"
    mkdir -p "$APP_DIR/logs/scheduler"
    mkdir -p "$APP_DIR/backups"
    mkdir -p "$APP_DIR/scripts"
    
    # Set ownership
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chmod 755 "$APP_DIR"
}

# Configure firewall
setup_firewall() {
    log "Configuring UFW firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow internal Docker network
    ufw allow from 172.16.0.0/12
    ufw allow from 192.168.0.0/16
    ufw allow from 10.0.0.0/8
    
    # Enable UFW
    ufw --force enable
    
    # Show status
    ufw status verbose
}

# Configure fail2ban
setup_fail2ban() {
    log "Configuring fail2ban..."
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /opt/fg-index/logs/nginx/error.log

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
port = http,https
logpath = /opt/fg-index/logs/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /opt/fg-index/logs/nginx/access.log
maxretry = 2
EOF

    # Create custom nginx filters
    cat > /etc/fail2ban/filter.d/nginx-req-limit.conf << EOF
[Definition]
failregex = limiting requests, excess: .* by zone .*, client: <HOST>
ignoreregex =
EOF

    cat > /etc/fail2ban/filter.d/nginx-botsearch.conf << EOF
[Definition]
failregex = <HOST>.*GET.*(\.php|\.asp|\.exe|\.pl|\.cgi|\.scgi)
ignoreregex =
EOF

    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
}

# Setup log rotation
setup_logrotate() {
    log "Configuring log rotation..."
    
    cat > /etc/logrotate.d/fg-index << EOF
$APP_DIR/logs/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $APP_USER $APP_USER
    postrotate
        docker exec fg-nginx-prod nginx -s reload 2>/dev/null || true
    endscript
}
EOF
}

# Setup automatic security updates
setup_auto_updates() {
    log "Configuring automatic security updates..."
    
    apt-get install -y unattended-upgrades apt-listchanges
    
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id} ESMApps:\${distro_codename}-apps-security";
    "\${distro_id} ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

    systemctl enable unattended-upgrades
}

# Setup monitoring scripts
setup_monitoring() {
    log "Setting up monitoring scripts..."
    
    # System monitoring script
    cat > "$APP_DIR/scripts/monitor.sh" << EOF
#!/bin/bash
# System monitoring script

DATE=\$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$APP_DIR/logs/monitor.log"

# Check disk space
DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
if [ "\$DISK_USAGE" -gt 80 ]; then
    echo "[\$DATE] WARNING: Disk usage is \${DISK_USAGE}%" >> "\$LOG_FILE"
fi

# Check memory usage
MEM_USAGE=\$(free | awk 'FNR==2{printf "%.0f", \$3/\$2*100}')
if [ "\$MEM_USAGE" -gt 85 ]; then
    echo "[\$DATE] WARNING: Memory usage is \${MEM_USAGE}%" >> "\$LOG_FILE"
fi

# Check Docker containers
CONTAINERS_DOWN=\$(docker-compose -f $APP_DIR/docker-compose.prod.yml ps --filter "status=exited" -q | wc -l)
if [ "\$CONTAINERS_DOWN" -gt 0 ]; then
    echo "[\$DATE] ERROR: \$CONTAINERS_DOWN containers are down" >> "\$LOG_FILE"
fi

# Check SSL certificate expiry
SSL_DAYS=\$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
CURRENT_DAYS=\$(date +%s)
DAYS_LEFT=\$(( (\$SSL_DAYS - \$CURRENT_DAYS) / 86400 ))

if [ "\$DAYS_LEFT" -lt 30 ]; then
    echo "[\$DATE] WARNING: SSL certificate expires in \$DAYS_LEFT days" >> "\$LOG_FILE"
fi
EOF

    chmod +x "$APP_DIR/scripts/monitor.sh"
    chown "$APP_USER:$APP_USER" "$APP_DIR/scripts/monitor.sh"
    
    # Add to crontab for app user
    (crontab -u "$APP_USER" -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/monitor.sh") | crontab -u "$APP_USER" -
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate for $DOMAIN..."
    
    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true
    
    # Create nginx minimal config for certification
    cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 'Server is ready for SSL setup';
        add_header Content-Type text/plain;
    }
}
EOF

    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Obtain SSL certificate
    certbot certonly --webroot --webroot-path=/var/www/html --email "$EMAIL" --agree-tos --no-eff-email -d "$DOMAIN"
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    
    # Stop nginx (will be managed by Docker)
    systemctl stop nginx
    systemctl disable nginx
}

# Create deployment script
create_deploy_script() {
    log "Creating deployment script..."
    
    cat > "$APP_DIR/scripts/deploy.sh" << 'EOF'
#!/bin/bash

set -euo pipefail

APP_DIR="/opt/fg-index"
LOG_FILE="$APP_DIR/logs/deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[ERROR] $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

cd "$APP_DIR"

log "Starting deployment..."

# Pull latest code
log "Pulling latest code..."
git pull origin main

# Pull latest Docker images
log "Pulling Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Create backup
log "Creating database backup..."
./scripts/backup.sh

# Deploy with zero downtime
log "Deploying services..."
docker-compose -f docker-compose.prod.yml up -d --remove-orphans

# Wait for services
log "Waiting for services to start..."
sleep 30

# Health check
log "Performing health checks..."
if curl -f http://localhost/health && curl -f http://localhost/api/health; then
    log "✅ Deployment successful!"
    
    # Cleanup old images
    docker image prune -f
    
    exit 0
else
    error "❌ Health check failed!"
fi
EOF

    chmod +x "$APP_DIR/scripts/deploy.sh"
    chown "$APP_USER:$APP_USER" "$APP_DIR/scripts/deploy.sh"
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > "$APP_DIR/scripts/backup.sh" << EOF
#!/bin/bash

set -euo pipefail

BACKUP_DIR="$APP_DIR/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_\${DATE}.sql"

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Database backup
docker exec fg-database-prod pg_dump -U \${DATABASE_USER:-fg_user} -d \${DATABASE_NAME:-fg_index_prod} > "\$BACKUP_DIR/\$BACKUP_FILE"

# Compress backup
gzip "\$BACKUP_DIR/\$BACKUP_FILE"

# Remove backups older than 7 days
find "\$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup created: \$BACKUP_FILE.gz"
EOF

    chmod +x "$APP_DIR/scripts/backup.sh"
    chown "$APP_USER:$APP_USER" "$APP_DIR/scripts/backup.sh"
    
    # Add to crontab for daily backups
    (crontab -u "$APP_USER" -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | crontab -u "$APP_USER" -
}

# Setup GitHub deployment key
setup_github_key() {
    log "Setting up GitHub deployment..."
    
    # Create SSH key for GitHub
    if [ ! -f /home/ubuntu/.ssh/id_rsa ]; then
        sudo -u ubuntu ssh-keygen -t rsa -b 4096 -f /home/ubuntu/.ssh/id_rsa -N ""
        info "Add this public key to your GitHub repository as a deployment key:"
        cat /home/ubuntu/.ssh/id_rsa.pub
    fi
    
    # Clone repository if it doesn't exist
    if [ ! -d "$APP_DIR/.git" ]; then
        warn "Please clone your repository to $APP_DIR manually:"
        info "sudo -u $APP_USER git clone git@github.com:your-username/your-repo.git $APP_DIR"
    fi
}

# Final system optimization
optimize_system() {
    log "Optimizing system settings..."
    
    # Optimize kernel parameters
    cat >> /etc/sysctl.conf << EOF

# Network optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# File system optimizations
fs.file-max = 65536
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

    sysctl -p
    
    # Increase file limits
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
}

# Main execution
main() {
    log "Starting Fear & Greed Index VM setup..."
    
    check_root
    update_system
    install_packages
    install_docker
    install_docker_compose
    setup_app_user
    setup_firewall
    setup_fail2ban
    setup_logrotate
    setup_auto_updates
    setup_monitoring
    setup_ssl
    create_deploy_script
    create_backup_script
    setup_github_key
    optimize_system
    
    log "VM setup completed successfully!"
    info "Next steps:"
    info "1. Add your GitHub public key to your repository as a deployment key"
    info "2. Clone your repository to $APP_DIR"
    info "3. Create .env.production file with your environment variables"
    info "4. Run the deployment: $APP_DIR/scripts/deploy.sh"
    info "5. Configure GitHub Actions secrets for automated deployment"
    
    warn "Please reboot the system to apply all changes: sudo reboot"
}

# Execute main function
main "$@"
EOF