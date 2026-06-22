Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  =========================================="
Write-Host "   Al Shamail -- Starting Services"
Write-Host "  =========================================="
Write-Host ""
Write-Host "  Folder: $PSScriptRoot"
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "  ERROR: .env not found. Run setup.bat first."
    Write-Host ""
    return
}

if (-not (Test-Path "node_modules")) {
    Write-Host "  ERROR: node_modules not found. Run setup.bat first."
    Write-Host ""
    return
}

Write-Host "  Starting API Server on port 3001..."
$apiDir = $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$apiDir'; `$env:PORT='3001'; pnpm --filter '@workspace/api-server' run dev"

Write-Host "  Waiting 4 seconds for API to boot..."
Start-Sleep -Seconds 4

Write-Host "  Starting Frontend on port 5173..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$apiDir'; `$env:PORT='5173'; `$env:BASE_PATH='/'; pnpm --filter '@workspace/al-shamail' run dev"

Write-Host ""
Write-Host "  =========================================="
Write-Host "   Both services are starting."
Write-Host "   Browser: http://localhost:5173"
Write-Host ""
Write-Host "   Logins:"
Write-Host "    admin@alshamail.edu   / admin123"
Write-Host "    teacher@alshamail.edu / teacher123"
Write-Host "    student@alshamail.edu / student123"
Write-Host "  =========================================="
Write-Host ""

Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
