#!/bin/bash

# ===================================================================
# Environment Setup Script for Local Development
# ===================================================================
# This script helps set up environment variables for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env already exists
check_existing_env() {
    if [ -f "backend/.env" ] || [ -f "frontend/.env" ]; then
        print_warning "Environment files already exist!"
        if [ -f "backend/.env" ]; then
            print_info "Found: backend/.env"
        fi
        if [ -f "frontend/.env" ]; then
            print_info "Found: frontend/.env"
        fi
        read -p "Do you want to overwrite them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Setup cancelled. Existing .env files preserved."
            exit 0
        fi
        
        if [ -f "backend/.env" ]; then
            cp backend/.env backend/.env.backup
            print_info "Existing backend/.env backed up to backend/.env.backup"
        fi
        
        if [ -f "frontend/.env" ]; then
            cp frontend/.env frontend/.env.backup
            print_info "Existing frontend/.env backed up to frontend/.env.backup"
        fi
    fi
}

# Copy template and basic setup
setup_basic_env() {
    print_header "Setting up basic environment files"
    
    # Backend environment
    if [ ! -f "backend/env.template" ]; then
        print_error "backend/env.template file not found!"
        print_info "Please run this script from the project root directory."
        exit 1
    fi
    
    cp backend/env.template backend/.env
    print_success "Created backend .env from template"
    
    # Frontend environment
    if [ -f "frontend/env.template" ]; then
        cp frontend/env.template frontend/.env
        print_success "Created frontend .env from template"
    else
        print_warning "Frontend env.template not found, skipping frontend .env"
    fi
}

# Generate secure values
generate_secrets() {
    print_header "Generating secure values"
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))" 2>/dev/null || openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Generate a random admin password
    ADMIN_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))" 2>/dev/null || openssl rand -base64 24 | tr -d "=+/" | cut -c1-16)
    
    # Generate Redis password
    REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))" 2>/dev/null || openssl rand -base64 24 | tr -d "=+/" | cut -c1-16)
    
    # Replace placeholders in backend .env file
    if command -v sed >/dev/null 2>&1; then
        sed -i.bak "s/your_jwt_secret_minimum_32_characters_long/$JWT_SECRET/g" backend/.env
        sed -i.bak "s/your_secure_admin_password/$ADMIN_PASSWORD/g" backend/.env
        sed -i.bak "s/your_redis_password/$REDIS_PASSWORD/g" backend/.env
        rm backend/.env.bak 2>/dev/null || true
    else
        print_warning "sed not available. Please manually replace the following in your backend/.env file:"
        echo "JWT_SECRET=$JWT_SECRET"
        echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
        echo "REDIS_PASSWORD=$REDIS_PASSWORD"
    fi
    
    print_success "Generated secure JWT_SECRET"
    print_success "Generated secure ADMIN_PASSWORD: $ADMIN_PASSWORD"
    print_success "Generated secure REDIS_PASSWORD: $REDIS_PASSWORD"
}

# Database setup instructions
setup_database_instructions() {
    print_header "Database Setup Instructions"
    
    print_info "To set up PostgreSQL locally:"
    echo "1. Install PostgreSQL:"
    echo "   macOS: brew install postgresql && brew services start postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo ""
    echo "2. Create database and user:"
    echo "   createdb fg_index_dev"
    echo "   createuser -s fg_user"
    echo "   psql -c \"ALTER USER fg_user PASSWORD 'your_password';\""
    echo ""
    echo "3. Update DATABASE_URL in backend/.env with your actual password"
    print_warning "Don't forget to update DATABASE_PASSWORD in your backend/.env file!"
}

# Redis setup instructions
setup_redis_instructions() {
    print_header "Redis Setup Instructions (Optional)"
    
    print_info "To set up Redis locally:"
    echo "1. Install Redis:"
    echo "   macOS: brew install redis && brew services start redis"
    echo "   Ubuntu: sudo apt-get install redis-server"
    echo ""
    echo "2. Set password (optional but recommended):"
    echo "   redis-cli"
    echo "   > CONFIG SET requirepass \"$REDIS_PASSWORD\""
    echo "   > exit"
    print_info "Redis password has been auto-generated in your .env file"
}

# API setup instructions
setup_api_instructions() {
    print_header "API Keys Setup"
    
    print_info "Required API Keys:"
    echo ""
    echo "1. DART API (Essential for Korean financial data):"
    echo "   - Visit: https://opendart.fss.or.kr/"
    echo "   - Register and apply for API key"
    echo "   - Update DART_API_KEY in backend/.env"
    echo ""
    echo "2. Optional APIs:"
    echo "   - KIS_API_KEY: Korea Investment & Securities"
    echo "   - BOK_API_KEY: Bank of Korea Economic Statistics"
    echo "   - UPBIT_*: Upbit cryptocurrency exchange"
    echo ""
    print_warning "Update the API keys in your backend/.env file before running the application"
}

# Validation setup
setup_validation() {
    print_header "Environment Validation"
    
    print_info "You can validate your environment setup by running:"
    echo "cd backend && node config/env-validator.js .env"
    echo ""
    print_info "Test your setup with:"
    echo "cd backend && npm run test:simple"
}

# Main execution
main() {
    print_header "KOSPI Fear & Greed Index - Environment Setup"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    check_existing_env
    setup_basic_env
    generate_secrets
    setup_database_instructions
    setup_redis_instructions
    setup_api_instructions
    setup_validation
    
    print_header "Setup Complete!"
    print_success "Environment file created successfully"
    print_warning "Don't forget to:"
    echo "  1. Set up PostgreSQL database"
    echo "  2. Get DART API key and update backend/.env"
    echo "  3. Update database password in backend/.env"
    echo "  4. Run validation: cd backend && node config/env-validator.js .env"
    echo ""
    print_info "For detailed setup instructions, see: LOCAL_ENV_SETUP.md"
}

# Run main function
main "$@"
