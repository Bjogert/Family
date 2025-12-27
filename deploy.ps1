# ===========================================
# Family Hub - Deployment Script
# ===========================================
# Usage: .\deploy.ps1 [-SkipBuild] [-ApiOnly] [-WebOnly] [-NoRestart]

param(
    [switch]$SkipBuild,
    [switch]$ApiOnly,
    [switch]$WebOnly,
    [switch]$NoRestart,
    [switch]$Help
)

# Configuration
$PI_HOST = "robert@192.168.68.118"
$PI_PATH = "/home/robert/Family"
$LOCAL_PATH = "c:\Tools\Git-Projects\Family"

# Colors for output
function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  • $msg" -ForegroundColor Gray }

if ($Help) {
    Write-Host @"
Family Hub Deployment Script
============================
Usage: .\deploy.ps1 [options]

Options:
  -SkipBuild    Skip building, just deploy existing builds
  -ApiOnly      Only deploy API (skip web)
  -WebOnly      Only deploy web (skip API)
  -NoRestart    Don't restart services after deploy
  -Help         Show this help message

Examples:
  .\deploy.ps1              # Full build and deploy
  .\deploy.ps1 -ApiOnly     # Only deploy API
  .\deploy.ps1 -SkipBuild   # Deploy without rebuilding
"@
    exit 0
}

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  Family Hub Deployment" -ForegroundColor Yellow
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Track what we're deploying
$deployApi = -not $WebOnly
$deployWeb = -not $ApiOnly

# Step 1: Sync environment variables
Write-Step "Syncing environment variables to Pi..."
try {
    # Copy .env file to Pi
    scp "$LOCAL_PATH\.env" "${PI_HOST}:${PI_PATH}/.env" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "SCP failed" }
    Write-Success "Environment variables synced"
}
catch {
    Write-Fail "Failed to sync .env: $_"
    exit 1
}

# Step 2: Build shared package (ALWAYS - required by both API and Web)
if (-not $SkipBuild) {
    Write-Step "Building shared package..."
    Push-Location "$LOCAL_PATH\packages\shared"
    cmd /c "pnpm build 2>&1 >nul"
    $buildResult = $LASTEXITCODE
    Pop-Location
    if ($buildResult -ne 0) { 
        Write-Fail "Shared package build failed"
        exit 1
    }
    Write-Success "Shared package built successfully"
}

# Step 3: Build API
if ($deployApi -and -not $SkipBuild) {
    Write-Step "Building API..."
    Push-Location "$LOCAL_PATH\apps\api"
    cmd /c "pnpm build 2>&1 >nul"
    $buildResult = $LASTEXITCODE
    Pop-Location
    if ($buildResult -ne 0) { 
        Write-Fail "API build failed"
        exit 1
    }
    Write-Success "API built successfully"
}

# Step 4: Build Web
if ($deployWeb -and -not $SkipBuild) {
    Write-Step "Building Web app..."
    Push-Location "$LOCAL_PATH\apps\web"
    cmd /c "pnpm build 2>&1 >nul"
    $buildResult = $LASTEXITCODE
    Pop-Location
    if ($buildResult -ne 0) { 
        Write-Fail "Web build failed"
        exit 1
    }
    Write-Success "Web app built successfully"
}

# Step 5: Deploy shared package (ALWAYS - required by API)
Write-Step "Deploying shared package to Pi..."
try {
    scp -r "$LOCAL_PATH\packages\shared\dist\*" "${PI_HOST}:${PI_PATH}/packages/shared/dist/" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "SCP failed" }
    Write-Success "Shared package deployed"
}
catch {
    Write-Fail "Shared package deploy failed: $_"
    exit 1
}

# Step 6: Deploy API
if ($deployApi) {
    Write-Step "Deploying API to Pi..."
    try {
        # Clean old dist directory first
        ssh $PI_HOST "rm -rf ${PI_PATH}/apps/api/dist" 2>$null
        scp -r "$LOCAL_PATH\apps\api\dist" "${PI_HOST}:${PI_PATH}/apps/api/" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "SCP failed" }
        Write-Success "API deployed"
    }
    catch {
        Write-Fail "API deploy failed: $_"
        exit 1
    }
}

# Step 7: Deploy Web
if ($deployWeb) {
    Write-Step "Deploying Web app to Pi..."
    try {
        # Clean old build directory first (keeps node_modules etc)
        ssh $PI_HOST "rm -rf ${PI_PATH}/apps/web/build" 2>$null
        scp -r "$LOCAL_PATH\apps\web\build" "${PI_HOST}:${PI_PATH}/apps/web/" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "SCP failed" }
        Write-Success "Web app deployed"
    }
    catch {
        Write-Fail "Web deploy failed: $_"
        exit 1
    }
}

# Step 6: Restart services
if (-not $NoRestart) {
    Write-Step "Restarting services..."
    try {
        # Kill any zombie processes holding the ports
        if ($deployApi) {
            ssh $PI_HOST "sudo fuser -k 3001/tcp 2>/dev/null; sleep 1" 2>$null
            ssh $PI_HOST "sudo systemctl restart family-hub-api" 2>$null
            Write-Success "API service restarted"
        }
        if ($deployWeb) {
            ssh $PI_HOST "sudo fuser -k 3000/tcp 2>/dev/null; sleep 1" 2>$null
            ssh $PI_HOST "sudo systemctl restart family-hub-web" 2>$null
            Write-Success "Web service restarted"
        }
        # Give services time to start
        Start-Sleep -Seconds 3
    }
    catch {
        Write-Fail "Failed to restart services: $_"
        exit 1
    }
}

# Step 7: Health check
Write-Step "Running health checks..."
$healthOk = $true

# Check API health
$apiHealthJson = ssh $PI_HOST "curl -s http://localhost:3001/health" 2>$null
if ($apiHealthJson -match '"status"\s*:\s*"ok"') {
    Write-Success "API is healthy"
}
else {
    Write-Fail "API health check failed"
    $healthOk = $false
}

# Check Web health (just that it responds)
$webStatus = ssh $PI_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" 2>$null
if ($webStatus -eq "200") {
    Write-Success "Web app is healthy"
}
else {
    Write-Fail "Web health check failed (HTTP $webStatus)"
    $healthOk = $false
}

# Check external access
try {
    $extResponse = Invoke-WebRequest -Uri "https://familjehubben.vip/api" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($extResponse.StatusCode -eq 200) {
        Write-Success "External access (familjehubben.vip) is working"
    }
}
catch {
    Write-Fail "External access check failed - Cloudflare tunnel may need attention"
    $healthOk = $false
}

# Summary
$elapsed = (Get-Date) - $startTime
Write-Host "`n========================================" -ForegroundColor Yellow
if ($healthOk) {
    Write-Host "  ✓ Deployment completed successfully!" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Deployment completed with warnings" -ForegroundColor Yellow
}
Write-Host "  Time: $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Yellow

if (-not $healthOk) {
    exit 1
}
