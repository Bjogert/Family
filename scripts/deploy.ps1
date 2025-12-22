# Family Hub Deployment Script
# Usage: .\scripts\deploy.ps1 [-Target api|web|all]

param(
    [ValidateSet("api", "web", "all")]
    [string]$Target = "all"
)

$PI_HOST = "robert@192.168.68.127"
$PI_PATH = "~/Family"

function Write-Step($message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Deploy-Api {
    Write-Step "Building API..."
    Push-Location "$PSScriptRoot\..\apps\api"
    pnpm build
    if ($LASTEXITCODE -ne 0) { 
        Pop-Location
        throw "API build failed" 
    }
    
    Write-Step "Deploying API to Pi..."
    scp -r dist "${PI_HOST}:${PI_PATH}/apps/api/"
    if ($LASTEXITCODE -ne 0) { 
        Pop-Location
        throw "API deploy failed" 
    }
    
    Write-Step "Restarting API service..."
    ssh $PI_HOST "sudo systemctl restart family-hub-api"
    
    Pop-Location
    Write-Host "API deployed successfully!" -ForegroundColor Green
}

function Deploy-Web {
    Write-Step "Building Web..."
    Push-Location "$PSScriptRoot\..\apps\web"
    pnpm build
    if ($LASTEXITCODE -ne 0) { 
        Pop-Location
        throw "Web build failed" 
    }
    
    Write-Step "Deploying Web to Pi..."
    scp -r build "${PI_HOST}:${PI_PATH}/apps/web/"
    if ($LASTEXITCODE -ne 0) { 
        Pop-Location
        throw "Web deploy failed" 
    }
    
    Write-Step "Restarting Web service..."
    ssh $PI_HOST "sudo systemctl restart family-hub-web"
    
    Pop-Location
    Write-Host "Web deployed successfully!" -ForegroundColor Green
}

# Main
Write-Host "`nFamily Hub Deployment" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    switch ($Target) {
        "api" { Deploy-Api }
        "web" { Deploy-Web }
        "all" { 
            Deploy-Api
            Deploy-Web
        }
    }
    
    Write-Host "`n✓ Deployment complete!" -ForegroundColor Green
    
    Write-Step "Checking service status..."
    ssh $PI_HOST "sudo systemctl status family-hub-api family-hub-web --no-pager -l | head -30"
    
}
catch {
    Write-Host "`n✗ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
