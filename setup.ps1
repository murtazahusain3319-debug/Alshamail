Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  =========================================="
Write-Host "   Al Shamail -- First-Time Setup"
Write-Host "  =========================================="
Write-Host ""
Write-Host "  Folder: $PSScriptRoot"
Write-Host ""

# ---- Node.js ----
Write-Host "[1] Checking Node.js..."
try {
    $nodeVer = & node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "node exited $LASTEXITCODE" }
    Write-Host "    $nodeVer  OK"
} catch {
    Write-Host ""
    Write-Host "  ERROR: Node.js not found."
    Write-Host "  Install from https://nodejs.org then re-run setup.bat"
    Write-Host ""
    return
}

# ---- pnpm ----
Write-Host ""
Write-Host "[2] Checking pnpm..."
$pnpmOk = $false
try {
    $pnpmVer = & pnpm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    $pnpmVer  OK"
        $pnpmOk = $true
    }
} catch {}

if (-not $pnpmOk) {
    Write-Host "    Not found. Installing via npm..."
    & npm install -g pnpm
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ERROR: pnpm install failed."
        Write-Host "  Try right-clicking setup.bat and choosing 'Run as administrator'."
        Write-Host ""
        return
    }
    Write-Host "    pnpm installed OK."
}

# ---- .env ----
Write-Host ""
Write-Host "[3] Checking .env file..."
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "  ERROR: .env file not found in:"
    Write-Host "  $PSScriptRoot"
    Write-Host ""
    Write-Host "  Make sure you extracted the full zip and run setup.bat"
    Write-Host "  from inside the al-shamail folder."
    Write-Host ""
    return
}
Write-Host "    Found OK"

# ---- Install dependencies ----
Write-Host ""
Write-Host "[4] Installing dependencies  (1-3 minutes, please wait)..."
Write-Host ""
& pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: pnpm install failed. See output above."
    Write-Host ""
    return
}
Write-Host ""
Write-Host "    Dependencies installed OK."

# ---- DB push ----
Write-Host ""
Write-Host "[5] Setting up database tables..."
Write-Host ""
& pnpm --filter "@workspace/db" run push
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: Database setup failed."
    Write-Host ""
    Write-Host "  Checklist:"
    Write-Host "   - Is PostgreSQL running?"
    Write-Host "     Open Windows Services, find postgresql-x64-17, click Start."
    Write-Host "   - Is the password in .env correct?"
    Write-Host "   - Does a database named 'appdb' exist in pgAdmin?"
    Write-Host ""
    return
}

Write-Host ""
Write-Host "  =========================================="
Write-Host "   SUCCESS! Setup complete."
Write-Host "   Now double-click start.bat to launch."
Write-Host "  =========================================="
Write-Host ""
