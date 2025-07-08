# Start Docker Desktop and Fix Docker Daemon Issues
# Run this script as Administrator on your Windows runner

Write-Host "=== Starting Docker Desktop and Fixing Daemon Issues ===" -ForegroundColor Green

# Method 1: Check if Docker Desktop is installed
$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    Write-Host "Docker Desktop found at: $dockerDesktopPath" -ForegroundColor Green
} else {
    Write-Host "Docker Desktop not found at expected location" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Method 2: Check if Docker Desktop is running
$dockerProcesses = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcesses) {
    Write-Host "Docker Desktop is already running" -ForegroundColor Green
} else {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    try {
        Start-Process $dockerDesktopPath -ArgumentList "--start" -WindowStyle Minimized
        Write-Host "Docker Desktop startup initiated" -ForegroundColor Green
    } catch {
        Write-Host "Failed to start Docker Desktop: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually" -ForegroundColor Yellow
    }
}

# Method 3: Wait for Docker daemon to be ready
Write-Host "Waiting for Docker daemon to be ready..." -ForegroundColor Yellow
$maxAttempts = 60
$attempt = 1
$dockerReady = $false

while ($attempt -le $maxAttempts -and -not $dockerReady) {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker daemon is ready on attempt $attempt" -ForegroundColor Green
            $dockerReady = $true
        } else {
            Write-Host "Docker daemon not ready on attempt $attempt: $dockerInfo" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Docker daemon not ready on attempt $attempt: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    if (-not $dockerReady) {
        Start-Sleep -Seconds 2
        $attempt++
    }
}

if (-not $dockerReady) {
    Write-Host "Docker daemon failed to start after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "Please check Docker Desktop status manually" -ForegroundColor Yellow
    exit 1
}

# Method 4: Test Docker functionality
Write-Host "Testing Docker functionality..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker version: $dockerVersion" -ForegroundColor Green
    
    $dockerInfo = docker info
    Write-Host "Docker info retrieved successfully" -ForegroundColor Green
    
    # Test Docker buildx
    $buildxInfo = docker buildx version
    Write-Host "Docker Buildx version: $buildxInfo" -ForegroundColor Green
    
} catch {
    Write-Host "Docker functionality test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Method 5: Check Docker service status
Write-Host "Checking Docker service status..." -ForegroundColor Yellow
try {
    $dockerService = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($dockerService) {
        Write-Host "Docker service status: $($dockerService.Status)" -ForegroundColor Green
        if ($dockerService.Status -ne "Running") {
            Write-Host "Starting Docker service..." -ForegroundColor Yellow
            Start-Service -Name "com.docker.service"
            Write-Host "Docker service started" -ForegroundColor Green
        }
    } else {
        Write-Host "Docker service not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not check Docker service: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Method 6: Reset Docker Desktop (if needed)
Write-Host "If Docker is still not working, you may need to reset Docker Desktop:" -ForegroundColor Yellow
Write-Host "1. Open Docker Desktop" -ForegroundColor Cyan
Write-Host "2. Go to Settings > Troubleshoot" -ForegroundColor Cyan
Write-Host "3. Click 'Reset to factory defaults'" -ForegroundColor Cyan
Write-Host "4. Restart Docker Desktop" -ForegroundColor Cyan

# Method 7: Check WSL 2 backend
Write-Host "Checking WSL 2 backend..." -ForegroundColor Yellow
try {
    $wslStatus = wsl --status
    Write-Host "WSL status: $wslStatus" -ForegroundColor Green
} catch {
    Write-Host "WSL not available or not configured" -ForegroundColor Yellow
    Write-Host "Consider enabling WSL 2 backend in Docker Desktop settings" -ForegroundColor Cyan
}

Write-Host "=== Docker Setup Complete ===" -ForegroundColor Green
Write-Host "Docker should now be ready for GitHub Actions workflows" -ForegroundColor Green 