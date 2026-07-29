# V ONE DIGITALS CRM - Laravel Backend Startup Script
# Run this in PowerShell: .\start_backend.ps1

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  V ONE DIGITALS CRM - Laravel Backend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Step 1: Install Composer Dependencies
Write-Host "[1/6] Installing Composer dependencies..." -ForegroundColor Yellow
composer install --no-interaction
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Composer install failed. Make sure Composer is installed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "DONE: Dependencies installed.`n" -ForegroundColor Green

# Step 2: Copy .env if not exists
Write-Host "[2/6] Checking environment file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}
Write-Host ""

# Step 3: Generate Application Key
Write-Host "[3/6] Generating application key..." -ForegroundColor Yellow
php artisan key:generate --force
Write-Host "DONE: Application key generated.`n" -ForegroundColor Green

# Step 4: Run Database Migrations
Write-Host "[4/6] Running database migrations..." -ForegroundColor Yellow
php artisan migrate --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed. Check your database connection in .env" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "DONE: Migrations completed.`n" -ForegroundColor Green

# Step 5: Seed Database
Write-Host "[5/6] Seeding database..." -ForegroundColor Yellow
php artisan db:seed --force
Write-Host "DONE: Database seeded.`n" -ForegroundColor Green

# Step 6: Start Development Server
Write-Host "[6/6] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Server: http://localhost:8000" -ForegroundColor White
Write-Host "  Admin:  admin / admin123" -ForegroundColor White
Write-Host "  Stop:   CTRL+C" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
php artisan serve --port=8000
