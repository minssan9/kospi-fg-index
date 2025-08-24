# Production Deployment Guide - Rocky Linux

Complete guide for deploying the Fear & Greed Index application to production using GitHub Actions, Docker, and Google Cloud VM with Rocky Linux.

## Overview

This deployment setup provides:
- **Automated CI/CD** with GitHub Actions
- **Zero-downtime deployments** with blue-green strategy
- **SSL/TLS encryption** with automatic certificate renewal
- **Comprehensive monitoring** and alerting
- **Database backups** with retention policies
- **Security hardening** and performance optimization

## Architecture

```
Internet → CloudFlare/DNS → GCP VM → nginx (SSL) → Docker Containers
                                    ├── Frontend (Vue.js)
                                    ├── Backend (Node.js/Express)
                                    ├── Database (PostgreSQL)
                                    ├── Cache (Redis)
                                    └── Scheduler (Data Collection)
```

## Prerequisites

### 1. Google Cloud VM Setup
- **Instance Type**: e2-standard-2 (2 vCPUs, 8GB RAM) minimum
- **OS**: Rocky Linux 9 (recommended) or Rocky Linux 8
- **Disk**: 50GB SSD minimum
- **Network**: Allow HTTP (80) and HTTPS (443) traffic
- **Firewall**: Configure firewall rules for SSH, HTTP, HTTPS

#### Rocky Linux Specific Notes
- **SELinux**: Enabled by default (recommended to keep enabled)
- **Package Manager**: Uses `dnf` instead of `apt`
- **Firewall**: Uses `firewalld` instead of `ufw`
- **User Management**: Default user is typically `rocky` (we'll use `min` for this deployment)
- **Security Updates**: Uses `dnf-automatic` for automatic updates

### 2. Domain Configuration
- Point `investand.voyagerss.com` to your VM's public IP
- Ensure DNS propagation is complete before SSL setup

### 3. GitHub Repository
- Fork or clone the repository
- Configure GitHub Actions secrets (see [Secrets Configuration](#secrets-configuration))

## Initial VM Setup

### 1. Run Setup Script

Connect to your VM and run the automated setup script:

```bash
# Download and run the setup script
sudo dnf update -y && sudo dnf install -y curl
curl -fsSL https://github.com/minssan9/kospi-fg-index/main/scripts/setup-vm.sh -o setup-vm.sh
chmod +x setup-vm.sh
sudo ./setup-vm.sh
```

The setup script will:
- Install Docker, Docker Compose, nginx, certbot
- Configure firewall (firewalld) and fail2ban
- Set up application user and directories
- Configure automatic security updates (dnf-automatic)
- Set up SSL certificate for your domain
- Create monitoring and backup scripts

### 2. Manual Steps After Setup

1. **Add GitHub Deploy Key**:
   ```bash
   # The setup script will display the public key
   cat /home/min/.ssh/id_rsa.pub
   ```
   Add this key to your GitHub repository: Settings → Deploy keys → Add deploy key

2. **Clone Repository**:
   ```bash
   sudo -u min git clone git@github.com:min/kospi-fg-index.git /home/min/fg-index
   cd /home/min/fg-index
   ```

3. **Configure Environment**:
   ```bash
   sudo -u min cp .env.production.template .env.production
   sudo -u min vi .env.production
   ```
   Fill in your actual API keys and credentials (see [Environment Configuration](#environment-configuration))

### 3. Initial Deployment

Run the first deployment manually to verify everything works:

```bash
cd /home/min/fg-index
sudo -u min ./scripts/deploy.sh
```

## Secrets Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets

```yaml
# VM Access
VM_HOST: "your-vm-public-ip"
VM_USER: "min"
VM_SSH_KEY: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  [Your private key content]
  -----END OPENSSH PRIVATE KEY-----

# Container Registry
GITHUB_TOKEN: "ghp_your_github_token_here"

# Database
DATABASE_URL: "postgresql://fg_user:secure_password@database:5432/fg_index_prod"
DATABASE_PASSWORD: "secure_database_password"

# Redis
REDIS_URL: "redis://:secure_redis_password@redis:6379/0"
REDIS_PASSWORD: "secure_redis_password"

# API Keys
KIS_API_KEY: "your_korea_investment_api_key"
KIS_API_SECRET: "your_korea_investment_api_secret"
BOK_API_KEY: "your_bank_of_korea_api_key"
DART_API_KEY: "your_dart_api_key"

# Security
JWT_SECRET: "your_jwt_secret_min_32_chars_long"
ADMIN_PASSWORD: "secure_admin_password"

# SSL Configuration
CERTBOT_EMAIL: "admin@investand.voyagerss.com"

# Notifications (Optional)
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

### Optional Secrets

```yaml
# Monitoring
ALERT_EMAIL: "alerts@investand.voyagerss.com"

# S3 Backup (Optional)
BACKUP_S3_BUCKET: "fg-index-backups"
BACKUP_S3_ACCESS_KEY: "your_s3_access_key"
BACKUP_S3_SECRET_KEY: "your_s3_secret_key"

# External Services
UPBIT_ACCESS_KEY: "your_upbit_access_key"
UPBIT_SECRET_KEY: "your_upbit_secret_key"
```

## Environment Configuration

The `.env.production` file contains all environment variables. Key configurations:

### Database Settings
```env
DATABASE_URL=postgresql://fg_user:YOUR_PASSWORD@database:5432/fg_index_prod
DATABASE_NAME=fg_index_prod
DATABASE_USER=fg_user
DATABASE_PASSWORD=YOUR_SECURE_PASSWORD
```

### API Configuration
```env
# Korean market data
KIS_API_KEY=YOUR_KIS_API_KEY
KIS_API_SECRET=YOUR_KIS_API_SECRET
BOK_API_KEY=YOUR_BOK_API_KEY
DART_API_KEY=YOUR_DART_API_KEY

# Security
JWT_SECRET=YOUR_JWT_SECRET_MINIMUM_32_CHARACTERS
ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD
```

### Performance Tuning
```env
# Database connections
DB_POOL_MIN=2
DB_POOL_MAX=10

# Cache settings
CACHE_TTL=3600
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Process

### Automated Deployment (Recommended)

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "feat: update feature"
   git push origin main
   ```

2. **Monitor deployment**:
   - Check GitHub Actions tab in your repository
   - Monitor Slack notifications (if configured)
   - Verify health endpoints after deployment

### Manual Deployment

For emergency deployments or troubleshooting:

```bash
cd /home/min/fg-index
sudo -u min ./scripts/deploy.sh
```

#### Deployment Options
```bash
# Standard deployment
./scripts/deploy.sh

# Skip backup (faster)
./scripts/deploy.sh --skip-backup

# Skip health checks (emergency)
./scripts/deploy.sh --skip-health-check

# Rollback to previous version
./scripts/deploy.sh --rollback
```

## Monitoring and Maintenance

### Health Check Endpoints

- **Main Health**: `https://investand.voyagerss.com/health`
- **API Health**: `https://investand.voyagerss.com/api/health`
- **Metrics**: `https://investand.voyagerss.com/api/metrics` (admin auth required)

### Monitoring Script

The monitoring script runs every 5 minutes via cron:

```bash
# Manual monitoring check
sudo -u min /home/min/fg-index/scripts/monitor.sh --check-all --alert

# Generate system report
sudo -u min /home/min/fg-index/scripts/monitor.sh --report
```

### Log Management

Logs are automatically rotated and stored in `/home/min/fg-index/logs/`:

```bash
# View recent logs
tail -f /home/min/fg-index/logs/backend/app.log
tail -f /home/min/fg-index/logs/nginx/access.log
tail -f /home/min/fg-index/logs/deploy.log

# Check for errors
grep -i error /home/min/fg-index/logs/**/*.log
```

### Database Backup

Automated backups run daily at 2:00 AM:

```bash
# Manual backup
sudo -u min /home/min/fg-index/scripts/backup.sh

# Full backup with S3 upload
sudo -u min /home/min/fg-index/scripts/backup.sh --type full --upload-s3

# Incremental backup
sudo -u min /home/min/fg-index/scripts/backup.sh --type incremental
```

### SSL Certificate Management

Certificates are automatically renewed via cron. Manual renewal:

```bash
# Check certificate status
sudo certbot certificates

# Manual renewal
sudo certbot renew --nginx

# Force renewal (testing)
sudo certbot renew --force-renewal --nginx
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check deployment logs
tail -f /home/min/fg-index/logs/deploy.log

# Check container status
cd /home/min/fg-index
docker-compose -f docker-compose.prod.yml ps

# Restart services
sudo -u min docker-compose -f docker-compose.prod.yml restart
```

#### 2. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Check nginx configuration
sudo nginx -t

# Restart nginx container
docker restart fg-nginx-prod
```

#### 3. Database Connection Issues
```bash
# Check database container
docker logs fg-database-prod

# Test database connection
docker exec fg-database-prod pg_isready -U fg_user -d fg_index_prod

# Access database console
docker exec -it fg-database-prod psql -U fg_user -d fg_index_prod
```

#### 4. High Resource Usage
```bash
# Check resource usage
sudo -u min /home/min/fg-index/scripts/monitor.sh --check-all

# Check container stats
docker stats

# Clean up old containers and images
docker system prune -f
```

#### 5. SELinux Issues (Rocky Linux Specific)
```bash
# Check SELinux status
sestatus

# Check SELinux denials
sudo ausearch -m AVC -ts recent

# Temporarily set SELinux to permissive (for troubleshooting only)
sudo setenforce 0

# Re-enable SELinux
sudo setenforce 1

# Check if Docker has proper SELinux context
ls -Z /var/lib/docker

# Allow container access to specific directories (if needed)
sudo setsebool -P container_manage_cgroup on
```

### Recovery Procedures

#### 1. Complete System Recovery
```bash
# Stop all services
cd /home/min/fg-index
sudo -u min docker-compose -f docker-compose.prod.yml down

# Restore from backup
sudo -u min ./scripts/backup.sh --restore

# Redeploy
sudo -u min ./scripts/deploy.sh
```

#### 2. Database Recovery
```bash
# Find latest backup
ls -la /home/min/fg-index/backups/backup_full_*.sql.gz

# Restore database
gunzip -c /home/min/fg-index/backups/backup_full_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i fg-database-prod psql -U fg_user -d fg_index_prod
```

#### 3. Rollback Deployment
```bash
# Automatic rollback (if health checks fail)
sudo -u min ./scripts/deploy.sh --rollback

# Manual rollback to specific commit
cd /home/min/fg-index
git reset --hard COMMIT_HASH
sudo -u min ./scripts/deploy.sh
```

## Performance Optimization

### System-Level Optimization (Rocky Linux)
```bash
# Update system packages
sudo dnf update -y

# Install performance monitoring tools
sudo dnf install -y htop iotop nethogs

# Optimize kernel parameters for containers
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Enable and configure firewalld zones
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https
sudo firewall-cmd --reload
```

### Database Optimization
```sql
-- Run these queries to optimize database performance
ANALYZE;
VACUUM;
REINDEX;

-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Container Resource Limits
Adjust in `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### nginx Optimization
Key settings in `nginx.prod.conf`:
- Gzip compression enabled
- HTTP/2 support
- Connection keep-alive
- Rate limiting configured

## Security Checklist

- [ ] SSL/TLS certificate configured and auto-renewing
- [ ] Firewall (firewalld) enabled with minimal required ports
- [ ] fail2ban configured for SSH protection
- [ ] SELinux enabled and properly configured
- [ ] Docker containers run as non-root users
- [ ] Database credentials are secure and rotated
- [ ] Admin passwords are strong and unique
- [ ] API keys are properly secured in environment variables
- [ ] Security headers configured in nginx
- [ ] Regular security updates enabled (dnf-automatic)
- [ ] Backup encryption configured (if using S3)

## Support and Monitoring

### Alerts Configuration

The system sends alerts for:
- **Critical**: Service failures, high resource usage, SSL expiry
- **Warnings**: Performance degradation, configuration issues
- **Info**: Successful deployments, backup completion

### Contact Information

- **Primary**: Configure Slack webhook for real-time alerts
- **Secondary**: Email notifications for critical issues
- **Escalation**: Phone alerts for prolonged outages (external service)

### Maintenance Schedule

- **Daily**: Automated backups, log rotation
- **Weekly**: Security updates, performance review
- **Monthly**: Full system health check, disaster recovery test
- **Quarterly**: Security audit, dependency updates

## Additional Resources

- [SECURITY.md](./SECURITY.md) - Security hardening guide
- [MONITORING.md](./MONITORING.md) - Detailed monitoring setup
- [API Documentation](./API_ENDPOINTS.md) - API reference
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions