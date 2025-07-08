# Fix OpenSSL Configuration Error for GitHub Actions Runner
# Run this script as Administrator on your Windows runner

Write-Host "=== Fixing OpenSSL Configuration Error ===" -ForegroundColor Green

# Method 1: Set environment variable for the current session
Write-Host "Setting OPENSSL_CONF environment variable..." -ForegroundColor Yellow
$env:OPENSSL_CONF = ""

# Method 2: Set environment variable permanently for the runner user
Write-Host "Setting permanent environment variable..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("OPENSSL_CONF", "", "Machine")

# Method 3: Check if the problematic OpenSSL config file exists
$problematicPath = "D:\3_private_share\3_developer\DevOps\openssl-0.9.8k_X64\openssl.cnf"
if (Test-Path $problematicPath) {
    Write-Host "Found problematic OpenSSL config at: $problematicPath" -ForegroundColor Red
    Write-Host "Consider removing or relocating this file" -ForegroundColor Yellow
} else {
    Write-Host "Problematic OpenSSL config file not found" -ForegroundColor Green
}

# Method 4: Create a minimal OpenSSL config file in a safe location
Write-Host "Creating minimal OpenSSL config..." -ForegroundColor Yellow
$opensslConfigDir = "C:\ProgramData\OpenSSL"
$opensslConfigFile = "$opensslConfigDir\openssl.cnf"

if (!(Test-Path $opensslConfigDir)) {
    New-Item -ItemType Directory -Path $opensslConfigDir -Force | Out-Null
}

$minimalConfig = @"
# Minimal OpenSSL configuration
openssl_conf = default_conf

[default_conf]
ssl_conf = ssl_sect

[ssl_sect]
system_default = system_default_sect

[system_default_sect]
MinProtocol = TLSv1.2
CipherString = DEFAULT@SECLEVEL=1
"@

$minimalConfig | Out-File -FilePath $opensslConfigFile -Encoding ASCII

# Method 5: Set OPENSSL_CONF to point to our safe config
[Environment]::SetEnvironmentVariable("OPENSSL_CONF", $opensslConfigFile, "Machine")

Write-Host "OpenSSL configuration fixed!" -ForegroundColor Green
Write-Host "Please restart your GitHub Actions runner service" -ForegroundColor Yellow

# Method 6: Restart the runner service (if running)
try {
    $runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
    if ($runnerService) {
        Write-Host "Restarting GitHub Actions runner service..." -ForegroundColor Yellow
        Restart-Service -Name $runnerService.Name -Force
        Write-Host "Runner service restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "GitHub Actions runner service not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not restart runner service: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host "Environment variables set:" -ForegroundColor Cyan
Write-Host "OPENSSL_CONF = $([Environment]::GetEnvironmentVariable('OPENSSL_CONF', 'Machine'))" -ForegroundColor White 