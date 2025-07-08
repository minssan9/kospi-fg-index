@echo off
echo === Starting Docker Desktop and Fixing Daemon Issues ===

REM Check if Docker Desktop is installed
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo Docker Desktop found
) else (
    echo Docker Desktop not found at expected location
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Desktop is running
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Docker Desktop is already running
) else (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" --start
    echo Docker Desktop startup initiated
)

REM Wait for Docker to be ready
echo Waiting for Docker daemon to be ready...
set /a attempts=0
:wait_loop
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Docker is ready after %attempts% attempts
    goto :docker_ready
) else (
    set /a attempts+=1
    if %attempts% GTR 30 (
        echo Docker daemon failed to start after 30 attempts
        echo Please check Docker Desktop status manually
        pause
        exit /b 1
    )
    echo Docker not ready on attempt %attempts%, waiting...
    timeout /t 2 /nobreak >nul
    goto :wait_loop
)

:docker_ready
echo Testing Docker functionality...
docker --version
if %ERRORLEVEL% EQU 0 (
    echo Docker version check passed
) else (
    echo Docker version check failed
)

docker info
if %ERRORLEVEL% EQU 0 (
    echo Docker info check passed
) else (
    echo Docker info check failed
)

echo === Docker Setup Complete ===
echo Docker should now be ready for GitHub Actions workflows
pause 