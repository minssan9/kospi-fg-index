#!/bin/bash

# KOSPI Fear & Greed Index - Production Deployment Script

set -e  # Exit on any error

echo "🚀 Starting KOSPI Fear & Greed Index Production Deployment..."

# Configuration
IMAGE_NAME="kospi-fg-backend"
CONTAINER_NAME="kospi-backend"
VERSION=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    log_warn ".env.production not found. Creating from template..."
    cp .env.production .env.production.bak
    log_info "Please edit .env.production with your actual configuration"
fi

# Build the application
log_info "Building TypeScript application..."
npm run build:prod

# Generate Prisma client
log_info "Generating Prisma client..."
npm run db:generate

# Build Docker image
log_info "Building Docker image: ${IMAGE_NAME}:${VERSION}"
docker build -t ${IMAGE_NAME}:${VERSION} .
docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:latest

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose down || true

# Start the application with docker-compose
log_info "Starting application with docker-compose..."
docker-compose up -d

# Wait for services to start
log_info "Waiting for services to start..."
sleep 30

# Check if services are healthy
log_info "Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    log_info "✅ Backend service is healthy"
else
    log_warn "⚠️  Backend service health check pending..."
fi

# Show running containers
log_info "Running containers:"
docker-compose ps

# Show logs
log_info "Recent logs:"
docker-compose logs --tail=20

log_info "🎉 Deployment completed!"
log_info "Backend API: http://localhost:3000"
log_info "Health check: http://localhost:3000/api/system/status"
log_info ""
log_info "Useful commands:"
log_info "  View logs: docker-compose logs -f"
log_info "  Stop services: docker-compose down"
log_info "  Restart services: docker-compose restart"
log_info "  Update application: ./deploy.sh" 