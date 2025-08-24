#!/bin/bash

# ===================================================================
# Environment Validation Script for Local Development
# ===================================================================
# This script validates your .env file setup

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

# Check if .env file exists
check_env_file() {
    print_header "Checking Environment Files"
    
    if [ ! -f "backend/.env" ]; then
        print_error "Backend .env file not found!"
        print_info "Run './scripts/setup-env.sh' to create it from template"
        return 1
    fi
    
    print_success "Backend .env file found"
    
    if [ -f "frontend/.env" ]; then
        print_success "Frontend .env file found"
    else
        print_warning "Frontend .env file not found (optional)"
        print_info "Frontend will use default values"
    fi
    
    return 0
}

# Basic environment validation using the backend validator
validate_with_backend() {
    print_header "Running Backend Environment Validation"
    
    if [ ! -f "backend/config/env-validator.js" ]; then
        print_warning "Backend validator not found, skipping validation"
        return 0
    fi
    
    cd backend
    if node config/env-validator.js .env; then
        print_success "Backend validation passed"
        cd ..
        return 0
    else
        print_error "Backend validation failed"
        cd ..
        return 1
    fi
}

# Test database connection
test_database() {
    print_header "Testing Database Connection"
    
    if ! command -v psql >/dev/null 2>&1; then
        print_warning "PostgreSQL client (psql) not found, skipping database test"
        return 0
    fi
    
    # Load DATABASE_URL from backend/.env
    DATABASE_URL=$(grep "^DATABASE_URL=" backend/.env | cut -d'=' -f2-)
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not found in backend/.env"
        return 1
    fi
    
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Database connection failed"
        print_info "Make sure PostgreSQL is running and database exists"
        return 1
    fi
}

# Test Redis connection (if configured)
test_redis() {
    print_header "Testing Redis Connection (Optional)"
    
    if ! command -v redis-cli >/dev/null 2>&1; then
        print_warning "Redis client not found, skipping Redis test"
        return 0
    fi
    
    # Load Redis configuration from backend/.env
    REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" backend/.env | cut -d'=' -f2-)
    
    if [ -z "$REDIS_PASSWORD" ]; then
        print_warning "REDIS_PASSWORD not configured, testing without auth"
        if redis-cli ping >/dev/null 2>&1; then
            print_success "Redis connection successful (no auth)"
        else
            print_warning "Redis connection failed (this is optional)"
        fi
    else
        if redis-cli -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
            print_success "Redis connection successful (with auth)"
        else
            print_warning "Redis connection failed (this is optional)"
        fi
    fi
}

# Test API keys format
test_api_keys() {
    print_header "Validating API Keys Format"
    
    # Check DART API key
    DART_API_KEY=$(grep "^DART_API_KEY=" backend/.env | cut -d'=' -f2-)
    if [ -n "$DART_API_KEY" ] && [ "$DART_API_KEY" != "your_dart_api_key" ]; then
        if [ ${#DART_API_KEY} -ge 32 ]; then
            print_success "DART_API_KEY format looks valid"
        else
            print_warning "DART_API_KEY seems too short (should be 32+ characters)"
        fi
    else
        print_error "DART_API_KEY not configured or using placeholder"
    fi
    
    # Check JWT secret
    JWT_SECRET=$(grep "^JWT_SECRET=" backend/.env | cut -d'=' -f2-)
    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "your_jwt_secret_minimum_32_characters_long" ]; then
        if [ ${#JWT_SECRET} -ge 32 ]; then
            print_success "JWT_SECRET format looks valid"
        else
            print_warning "JWT_SECRET seems too short (should be 32+ characters)"
        fi
    else
        print_error "JWT_SECRET not configured or using placeholder"
    fi
}

# Run a quick backend test
test_backend_startup() {
    print_header "Testing Backend Startup"
    
    if [ ! -d "backend/node_modules" ]; then
        print_warning "Backend dependencies not installed"
        print_info "Run 'cd backend && npm install' first"
        return 0
    fi
    
    cd backend
    if timeout 10s npm run test:simple >/dev/null 2>&1; then
        print_success "Backend startup test passed"
        cd ..
        return 0
    else
        print_warning "Backend startup test failed or timed out"
        print_info "Try running 'cd backend && npm run test:simple' manually"
        cd ..
        return 0
    fi
}

# Generate summary report
generate_summary() {
    print_header "Validation Summary"
    
    print_info "Environment validation completed"
    
    if [ "$validation_errors" -gt 0 ]; then
        print_error "Found $validation_errors critical issues"
        print_info "Please fix the errors above before running the application"
        return 1
    elif [ "$validation_warnings" -gt 0 ]; then
        print_warning "Found $validation_warnings warnings"
        print_info "The application should work, but consider addressing warnings"
        return 0
    else
        print_success "All validations passed!"
        print_info "Your environment is ready for development"
        return 0
    fi
}

# Main execution
main() {
    print_header "Environment Validation for KOSPI Fear & Greed Index"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    validation_errors=0
    validation_warnings=0
    
    # Run all checks
    check_env_file || ((validation_errors++))
    
    validate_with_backend || ((validation_errors++))
    
    test_database || ((validation_warnings++))
    
    test_redis # This is optional, don't count as error
    
    test_api_keys || ((validation_errors++))
    
    test_backend_startup || ((validation_warnings++))
    
    generate_summary
    return $?
}

# Run main function
main "$@"
