# Environment Variables Setup

## 📋 Required Environment Variables

You need to create a `.env` file in the `/backend` directory with the following variables:

### Location
```
/backend/.env  # ← Create this file here
```

### Required Contents
```env
# DART API Configuration
DART_API_KEY=your_dart_api_key_here

# Database Configuration  
DATABASE_URL=mysql://user:password@localhost:3306/database

# Other Environment Variables
NODE_ENV=development
PORT=3000

# Security Keys (replace with your own)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# External APIs (add as needed)
# BOK_API_KEY=
# UPBIT_API_KEY=
# KRX_API_KEY=

# Email Configuration (if needed for alerts)
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=

# Logging Level
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔧 How to Create the .env File

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create .env file:**
   ```bash
   touch .env
   ```
   
3. **Edit the file with your preferred editor:**
   ```bash
   nano .env
   # or
   code .env
   # or
   vim .env
   ```

4. **Copy the environment variables from above and update with your actual values**

## ⚙️ Integration with NPM Scripts

The `.env` file is automatically loaded by all npm scripts in `package.json` using `dotenv-cli`:

- **Development:** `npm run dev` → loads `.env`
- **Testing:** `npm run test` → loads `.env`  
- **DART Testing:** `npm run test:dart` → loads `.env`
- **Data Collection:** `npm run collect:dart-daily` → loads `.env`
- **Manual Commands:** All commands load `.env` automatically

## 🚀 VS Code Launch Configurations

The updated `launch.json` includes DART-specific debug configurations:

- **DART: Test Collector** - Run DART tests
- **DART: Collect Daily Data** - Manual daily data collection
- **DART: Collect Financial Data** - Financial data batch processing
- **DART: Debug Collector (Direct)** - Direct debugging with breakpoints

## 🔐 Security Notes

- ✅ **Never commit `.env` files** - They're in `.gitignore`
- ✅ **Use strong, unique secrets** for JWT and session keys
- ✅ **Rotate API keys regularly**
- ✅ **Use different `.env` files** for different environments

## 📝 DART API Key Setup

1. **Register at DART (전자공시시스템):**
   - Visit: https://opendart.fss.or.kr/
   - Create developer account
   - Request API key

2. **Update .env file:**
   ```env
   DART_API_KEY=your_actual_api_key_from_dart
   ```

3. **Test the connection:**
   ```bash
   npm run test:dart
   ```

## 🗄️ Database Setup

Update the `DATABASE_URL` with your actual database credentials:

```env
# For MySQL
DATABASE_URL=mysql://username:password@localhost:3306/kospi_fg_index

# For PostgreSQL  
DATABASE_URL=postgresql://username:password@localhost:5432/kospi_fg_index
```

## ✅ Verification

After creating `.env`, verify everything works:

1. **Check environment loading:**
   ```bash
   npm run dev
   ```

2. **Test DART integration:**
   ```bash
   npm run test:dart
   ```

3. **Run data collection:**
   ```bash
   npm run collect:dart-daily
   ```

All commands should now have access to your environment variables!
