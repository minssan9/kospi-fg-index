# KOSPI Fear & Greed Index - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ (for development)
- 4GB+ RAM available
- Valid API keys for BOK and KRX

### 1. Environment Configuration

Copy and edit the production environment file:
```bash
cp .env.production .env.production.local
```

Edit `.env.production.local` with your actual values:
```env
# API Keys (REQUIRED)
BOK_API_KEY=your_actual_bok_api_key
KRX_API_KEY=your_actual_krx_api_key

# Database (Optional - defaults provided)
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_user_password

# Security (REQUIRED for production)
JWT_SECRET=your_jwt_secret_minimum_32_characters
CORS_ORIGIN=https://yourdomain.com
```

### 2. Deploy with One Command

```bash
./deploy.sh
```

### 3. Verify Deployment

Check if services are running:
```bash
curl http://localhost:3000/api/system/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "system": {
      "status": "RUNNING",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## 🐳 Docker Commands

### Build and Run Manually

```bash
# Build application
npm run build:prod

# Build Docker image
npm run docker:build

# Start with docker-compose
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Individual Container Management

```bash
# Build image manually
docker build -t kospi-fg-backend .

# Run backend only
docker run -p 3000:3000 --env-file .env.production kospi-fg-backend

# Run with database
docker-compose up -d mysql
docker-compose up -d backend

# Run collector separately
docker-compose up -d collector
```

## 📊 Service Architecture

The production deployment includes:

### 1. MySQL Database (`mysql`)
- **Port**: 3307 (external), 3306 (internal)
- **Data**: Persistent volume `mysql_data`
- **User**: `kospi_user` / `kospi_pass_2024`

### 2. Backend API (`kospi-backend`)
- **Port**: 3000
- **Health**: `/api/system/status`
- **Logs**: `./logs/` volume mount
- **Restart**: `unless-stopped`

### 3. Data Collector (`kospi-collector`)
- **Schedule**: 06:00, 15:45, 18:00 KST
- **Function**: Automated data collection
- **Dependencies**: MySQL, Backend

### 4. Redis Cache (`kospi-redis`) - Optional
- **Port**: 6379
- **Data**: Persistent volume `redis_data`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BOK_API_KEY` | Bank of Korea API Key | - | ✅ |
| `KRX_API_KEY` | Korea Exchange API Key | - | ✅ |
| `DATABASE_URL` | MySQL connection string | Auto-generated | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `CORS_ORIGIN` | Allowed origins | `*` | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |

### Scheduler Configuration

```env
ENABLE_SCHEDULER=true
COLLECTION_TIMES=06:00,15:45,18:00
```

## 📝 API Endpoints

### System APIs
- `GET /api/system/status` - System health check
- `GET /api/system/collection-status` - Data collection status

### Fear & Greed Index APIs
- `GET /api/fear-greed/latest` - Latest index value
- `GET /api/fear-greed/history?days=30` - Historical data

### Market Data APIs
- `GET /api/market/kospi/latest` - Latest KOSPI data

### Admin APIs (Protected)
- `POST /api/admin/collect-data` - Manual data collection
- `POST /api/admin/calculate-index` - Manual index calculation

## 🔍 Monitoring & Logs

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f collector
docker-compose logs -f mysql
```

### Health Checks
```bash
# Backend health
curl http://localhost:3000/api/system/status

# Container health
docker-compose ps
```

### Database Access
```bash
# Connect to MySQL
docker exec -it mysql mysql -u kospi_user -p fg_index

# Check tables
SHOW TABLES;
SELECT COUNT(*) FROM fear_greed_index;
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Restart services
docker-compose restart
```

### Database Connection Issues
```bash
# Check MySQL logs
docker-compose logs mysql

# Test database connection
docker exec kospi-backend npm run test:basic
```

### Memory Issues
```bash
# Check resource usage
docker stats

# Restart with more memory
docker-compose down
docker-compose up -d --memory=2g
```

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Redeploy
./deploy.sh
```

### Database Backup
```bash
# Backup database
docker exec mysql mysqldump -u root -p fg_index > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i mysql mysql -u root -p fg_index < backup_20241215.sql
```

### Clean Up
```bash
# Remove old containers and images
docker system prune -f

# Remove volumes (⚠️ Data loss!)
docker-compose down -v
```

## 🔐 Security Checklist

- [ ] Change default database passwords
- [ ] Set strong JWT secret (32+ characters)
- [ ] Configure CORS origins
- [ ] Use HTTPS in production
- [ ] Enable firewall on production server
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 📈 Performance Optimization

### Resource Limits
```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Database Optimization
```sql
-- Index optimization
CREATE INDEX idx_fear_greed_date ON fear_greed_index(date);
CREATE INDEX idx_kospi_date ON kospi_data(date);
```

## 📞 Support

For issues and questions:
1. Check logs: `docker-compose logs`
2. Verify configuration: `.env.production`
3. Test health endpoints
4. Review this documentation

## 🎯 Production Checklist

Before going live:

- [ ] API keys configured and tested
- [ ] Database backup strategy implemented
- [ ] Monitoring and alerting set up
- [ ] SSL/TLS certificates configured
- [ ] Domain name and DNS configured
- [ ] Firewall and security configured
- [ ] Load testing completed
- [ ] Recovery procedures documented 