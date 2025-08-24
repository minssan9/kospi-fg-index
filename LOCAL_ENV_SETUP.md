# Local Environment Setup Guide

This guide helps you set up environment variables for local development of the KOSPI Fear & Greed Index application.

## Quick Setup

1. **Copy the template files:**
   ```bash
   # Backend environment
   cp backend/env.template backend/.env
   
   # Frontend environment  
   cp frontend/env.template frontend/.env
   ```

2. **Fill in your actual values** in the `.env` files (see sections below)

3. **Verify your setup:**
   ```bash
   # Backend validation
   cd backend
   node config/env-validator.js .env
   
   # Frontend validation
   cd frontend
   npm run dev
   ```

## Required Environment Variables

### Database (PostgreSQL)
```env
DATABASE_URL=postgresql://fg_user:your_password@localhost:5432/fg_index_dev
DATABASE_PASSWORD=your_secure_password
```

**Setup Instructions:**
1. Install PostgreSQL locally
2. Create database: `createdb fg_index_dev`
3. Create user: `createuser -s fg_user`
4. Set password: `psql -c "ALTER USER fg_user PASSWORD 'your_password';"`

### Security
```env
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
ADMIN_PASSWORD=your_secure_admin_password
```

**Generate secure values:**
```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use a strong admin password (12+ characters with mixed case, numbers, symbols)
```

### Korean Financial APIs

#### DART API (Required)
```env
DART_API_KEY=your_dart_api_key
```

**How to get DART API key:**
1. Visit [DART API Registration](https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do)
2. Register as a developer
3. Apply for API key
4. Verify email and get your API key

#### Korea Investment & Securities (Optional)
```env
KIS_API_KEY=your_korea_investment_api_key
KIS_API_SECRET=your_korea_investment_api_secret
```

#### Bank of Korea (Optional)
```env
BOK_API_KEY=your_bank_of_korea_api_key
```

## Optional Environment Variables

### Redis Cache
```env
REDIS_URL=redis://:your_redis_password@localhost:6379/0
REDIS_PASSWORD=your_redis_password
```

**Setup Redis locally:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Set password in redis
redis-cli
> CONFIG SET requirepass "your_redis_password"
> AUTH your_redis_password
> exit
```

### Cryptocurrency APIs
```env
UPBIT_ACCESS_KEY=your_upbit_access_key
UPBIT_SECRET_KEY=your_upbit_secret_key
```

### Notifications
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ALERT_EMAIL=alerts@yourdomain.com
```

## Environment Validation

The project includes an environment validator. Run it to check your setup:

```bash
# Quick validation script
./scripts/validate-env.sh

# Or manual backend validation
cd backend
node config/env-validator.js .env
```

This will validate:
- ✅ All required variables are present
- ✅ Database URL format is correct
- ✅ API keys have proper length
- ✅ JWT secret has sufficient entropy
- ⚠️ Security best practices

## Development vs Production

### Local Development (.env)
- Uses `development` mode
- Connects to local database
- Less strict security requirements
- Detailed logging enabled

### Production (.env.production)
- Uses `production` mode
- Connects to cloud database
- Strict security requirements
- Optimized logging

## Common Issues & Solutions

### Database Connection Failed
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -l | grep fg_index_dev

# Test connection
psql "postgresql://fg_user:password@localhost:5432/fg_index_dev" -c "SELECT 1;"
```

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### DART API Issues
```bash
# Test DART API key
curl "https://opendart.fss.or.kr/api/list.json?crtfc_key=YOUR_API_KEY&corp_code=&bgn_de=20230101&end_de=20230131&page_no=1&page_count=10"
```

### JWT Secret Too Weak
```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

## Backend Scripts

The backend package.json includes these environment-aware scripts:

```bash
# Development mode
npm run dev                 # Uses .env
npm run test               # Uses .env
npm run collect:dart       # Uses .env

# Production mode
npm run start:prod         # Uses .env.production
npm run build:prod         # Uses .env.production
```

## Frontend Configuration

The frontend uses Vite environment variables:

```env
# Frontend-specific variables (prefix with VITE_)
VITE_API_BASE_URL=http://localhost:3000/api
```

## Security Best Practices

1. **Never commit `.env` files** - they're already in `.gitignore`
2. **Use strong passwords** - minimum 12 characters
3. **Rotate API keys regularly** - especially in production
4. **Use different credentials** for development vs production
5. **Validate environment** before deployment

## Getting API Keys

### Required APIs
1. **DART (Essential)**: Korean corporate disclosure data
   - Free registration required
   - Used for financial statements and corporate actions

### Optional APIs
2. **Korea Investment & Securities**: Real-time market data
   - Requires account with KIS
   - Provides more detailed market information

3. **Bank of Korea**: Economic indicators
   - Free API for economic statistics
   - Enhances fear & greed calculations

4. **Upbit**: Cryptocurrency sentiment
   - Optional for crypto market sentiment
   - Requires Upbit account

## Next Steps

1. Set up your `.env` file using the template
2. Install and configure local database
3. Run environment validation
4. Test the backend API endpoints
5. Run the frontend development server

For production deployment, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).
