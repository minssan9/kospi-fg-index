# GitHub Actions Workflows for Windows Local Runner

This directory contains GitHub Actions workflows for deploying the KOSPI Fear & Greed Index backend server on a Windows local runner using Docker.

## Available Workflows

### 1. `backend-windows-runner.yml`
- **Purpose**: Deploy backend using individual Docker commands
- **Features**: 
  - Direct Docker container management
  - Individual container health checks
  - Local environment file configuration
  - Cleanup of old images

### 2. `backend-windows-compose.yml`
- **Purpose**: Deploy backend using Docker Compose
- **Features**:
  - Multi-service orchestration
  - Automatic service dependency management
  - Database migrations
  - Redis health checks
  - Better service isolation
  - Local environment file configuration

## Prerequisites

### Windows Runner Setup (Windows)
1. **Install Docker Desktop for Windows**
   ```powershell
   # Download and install from: https://www.docker.com/products/docker-desktop
   # Enable WSL 2 backend for better performance
   ```

2. **Install Git**
   ```powershell
   # Download from: https://git-scm.com/download/win
   ```

3. **Configure Docker**
   ```powershell
   # Start Docker Desktop
   # Ensure Docker is running and accessible
   docker --version
   docker-compose --version
   ```

4. **Register Self-Hosted Runner**
   ```powershell
   # The runner 'Windows' should be registered and running
   # Check runner status in GitHub repository settings
   ```

### Environment Configuration
Create a `.env` file in your system root directory (C:\ or D:\) with the following variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@host:3306/database_name
REDIS_URL=redis://localhost:6379
API_KEY=your-api-key-here
LOG_LEVEL=info
```

**File Locations (in order of preference):**
1. `C:\.env` - Primary location
2. `D:\.env` - Secondary location
3. Default values - If no .env file is found

## Usage

### Automatic Triggers
- **Push to main/master/develop**: Automatically triggers deployment when backend files change
- **Pull Request**: Runs deployment for testing on PRs
- **Manual Trigger**: Use the "workflow_dispatch" trigger with environment selection

### Manual Execution
1. Go to your GitHub repository
2. Navigate to "Actions" tab
3. Select the desired workflow
4. Click "Run workflow"
5. Choose the environment (development/production)
6. Click "Run workflow"

## Workflow Steps

### Common Steps (Both Workflows)
1. **Checkout Code**: Clone the repository
2. **Setup Docker**: Configure Docker Buildx
3. **Environment Setup**: Copy `.env` file from system root to backend directory
4. **Build & Deploy**: Build Docker image and start containers
5. **Health Checks**: Verify services are running
6. **Testing**: Run basic tests
7. **Cleanup**: Remove old Docker images

### Docker Compose Specific Steps
- **Service Orchestration**: Start all services (backend, collector, redis)
- **Database Migrations**: Run Prisma migrations
- **Multi-service Health Checks**: Check backend and Redis
- **Service Logs**: Display logs from all services

## Environment Variables

The workflows automatically copy a `.env` file from your system root with the following variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@host:3306/database_name
REDIS_URL=redis://localhost:6379
API_KEY=your-api-key-here
LOG_LEVEL=info
```

### Default Values (if no .env file found)
If no `.env` file is found in the system root, the workflow will create one with these defaults:
- `DATABASE_URL=mysql://localhost:3306/kospi_fg`
- `REDIS_URL=redis://localhost:6379`
- `API_KEY=local-dev-key`

## Health Check Endpoints

The workflows expect the following health check endpoints:

- **Backend Health**: `http://localhost:3000/health`
- **Redis Health**: `redis-cli ping` (returns PONG)

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```powershell
   # Start Docker Desktop
   # Check Docker status
   docker info
   ```

2. **Environment file not found**
   ```powershell
   # Check if .env file exists in root
   dir C:\.env
   dir D:\.env
   # Create .env file if needed
   echo NODE_ENV=production > C:\.env
   echo DATABASE_URL=mysql://localhost:3306/kospi_fg >> C:\.env
   # Add other required variables...
   ```

3. **Port conflicts**
   ```powershell
   # Check what's using port 3000
   netstat -ano | findstr :3000
   # Kill process if needed
   taskkill /PID <process-id> /F
   ```

4. **Container startup issues**
   ```powershell
   # Check container logs
   docker logs kospi-backend
   # Check container status
   docker ps -a
   ```

5. **Runner not available**
   ```powershell
   # Check if Windows runner is online
   # Go to GitHub repository settings > Actions > Runners
   # Ensure the runner is registered and running
   ```

### Debug Commands

```powershell
# Check Docker status
docker info

# List all containers
docker ps -a

# Check Docker Compose services
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs collector

# Access container shell
docker exec -it kospi-backend sh

# Check environment file
type backend\.env

# Check runner status
# Go to GitHub repository settings > Actions > Runners
```

## Monitoring

### Service Status
- Backend API: `http://localhost:3000`
- Redis: `localhost:6379`
- Container logs: Available in GitHub Actions output
- Runner: Windows

### Log Files
- Application logs: Mounted to `./logs` directory
- Docker logs: Available via `docker logs` commands

## Security Considerations

1. **Local Environment Management**: Environment variables are managed locally on the runner
2. **Environment Isolation**: Production and development environments are separated
3. **Container Security**: Running containers as non-root user
4. **Network Isolation**: Services run in isolated Docker networks
5. **File Permissions**: Ensure `.env` file has appropriate permissions
6. **Runner Security**: Windows runner should be properly secured

## Performance Optimization

1. **Docker Layer Caching**: Optimized Dockerfile for faster builds
2. **Multi-stage Builds**: Separate build and runtime stages
3. **Image Cleanup**: Automatic cleanup of old images
4. **Resource Limits**: Consider setting memory and CPU limits for containers

## Local Environment Setup

### Creating the .env file
```powershell
# Create .env file in system root
echo NODE_ENV=production > C:\.env
echo PORT=3000 >> C:\.env
echo DATABASE_URL=mysql://user:password@host:3306/database_name >> C:\.env
echo REDIS_URL=redis://localhost:6379 >> C:\.env
echo API_KEY=your-secure-api-key >> C:\.env
echo LOG_LEVEL=info >> C:\.env
```

### Environment File Security
- Keep your `.env` file secure and don't commit it to version control
- Use strong, unique API keys
- Regularly rotate sensitive credentials
- Consider using Windows file permissions to restrict access

## Support

For issues with the workflows:
1. Check the GitHub Actions logs for detailed error messages
2. Verify all prerequisites are met
3. Ensure Docker Desktop is running
4. Check that the `.env` file exists in the system root
5. Verify the `.env` file contains all required variables
6. Ensure Windows runner is online and available 