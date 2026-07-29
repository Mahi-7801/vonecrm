Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# ─────────────────────────────────────────────────────────────────────────────
#  make-deploy-vonecrm.ps1
#  Builds React frontend + packs everything into deploy-vonecrm.zip
#  Target: Hostinger shared hosting — vonecrm.vonedigitals.com
#
#  ZIP structure (extracted into public_html/):
#    .htaccess              ← root SPA + API routing
#    index.html             ← React app entry (from client/build/)
#    static/                ← React static assets
#    manifest.json, etc.    ← React public assets
#    backend/               ← Laravel 11 app (outside web root)
#    backend/public/        ← Laravel public entry (routed via .htaccess)
#    backend/.env           ← Production env (from .env.production)
#    backend/storage/       ← Writable storage dirs
#    unzip.php              ← Self-deleting extractor (for next deploy)
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'

$root      = 'c:\Users\ramya\Downloads\mahi'
$backend   = "$root\server-php"
$frontend  = "$root\client"
$buildDir  = "$frontend\build"                   # CRA outputs to build/ not dist/
$zipPath   = "$root\deploy-vonecrm.zip"

# Folders/files to exclude from backend (never deploy these)
$excludeNames = @(
    '.env',
    '.env.production',
    '.env.example',
    '.gitignore',
    '.git',
    'node_modules',
    'tests',
    'phpunit.xml',
    'backend_start.bat',
    'start_backend.bat',
    'start_backend.ps1',
    '.mimocode'
)

# ── Clean up old zip ─────────────────────────────────────────────────────────
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "  Removed old deploy-vonecrm.zip" -ForegroundColor Gray
}

# ── Step 0 : Build React frontend ────────────────────────────────────────────
Write-Host ""
Write-Host "=== [0/5] Building React frontend... ===" -ForegroundColor Yellow

# Ensure .env.production is in place for the React build
$clientEnvProd = "$frontend\.env.production"
if (-not (Test-Path $clientEnvProd)) {
    Write-Host "  WARNING: client/.env.production not found!" -ForegroundColor Yellow
    Write-Host "  Creating it now with production API URL..." -ForegroundColor Yellow
    @"
REACT_APP_WHATSAPP_APP_ID=4257112177765455
REACT_APP_API_URL=https://vonecrm.vonedigitals.com/api
"@ | Set-Content $clientEnvProd
}

$oldDir = Get-Location
Set-Location "$frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Set-Location $oldDir
    throw "Frontend build failed! Fix errors above and retry."
}
Set-Location $oldDir
Write-Host "  React build OK → client/build/" -ForegroundColor Green

# ── Helper: recursively add a local folder to the zip ────────────────────────
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FolderToZip {
    param(
        [System.IO.Compression.ZipArchive]$z,
        [string]$folder,
        [string]$prefix,
        [string[]]$exclude = @()
    )
    Get-ChildItem -LiteralPath $folder -File | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
        $entry = if ($prefix) { "$prefix/$($_.Name)" } else { $_.Name }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $z, $_.FullName, $entry,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
    Get-ChildItem -LiteralPath $folder -Directory | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
        $newPrefix = if ($prefix) { "$prefix/$($_.Name)" } else { $_.Name }
        Add-FolderToZip -z $z -folder $_.FullName -prefix $newPrefix -exclude $exclude
    }
}

# ── Step 1 : React build files → web root ────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Adding React build files to web root..." -ForegroundColor Cyan

if (Test-Path $buildDir) {
    # Add all files in build/ directly at zip root (web root)
    Get-ChildItem -LiteralPath $buildDir -File | ForEach-Object {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $_.FullName, $_.Name,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
    # Add subdirectories (static/, etc.)
    Get-ChildItem -LiteralPath $buildDir -Directory | ForEach-Object {
        Add-FolderToZip -z $zip -folder $_.FullName -prefix $_.Name
    }
    Write-Host "  Added React build from: $buildDir" -ForegroundColor Gray
} else {
    Write-Host "  ERROR: build/ not found at $buildDir" -ForegroundColor Red
    $zip.Dispose()
    throw "React build folder missing — did npm run build succeed?"
}

# ── Step 2 : Laravel backend → backend/ folder ───────────────────────────────
Write-Host "[2/5] Adding Laravel backend to backend/ folder..." -ForegroundColor Cyan
Add-FolderToZip -z $zip -folder $backend -prefix 'backend' -exclude $excludeNames
Write-Host "  Added Laravel app (vendor/ included)" -ForegroundColor Gray

# ── Step 3 : Production .env → backend/.env ──────────────────────────────────
Write-Host "[3/5] Adding production .env to backend/ folder..." -ForegroundColor Cyan
$envProd = "$backend\.env.production"
$envDev  = "$backend\.env"
if (Test-Path $envProd) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $envProd, "backend/.env",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    Write-Host "  Using .env.production (DB: u615113169_crmmanagement)" -ForegroundColor Gray
} elseif (Test-Path $envDev) {
    Write-Host "  WARNING: .env.production not found — using dev .env (fix before going live!)" -ForegroundColor Yellow
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $envDev, "backend/.env",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
} else {
    Write-Host "  ERROR: No .env file found for backend!" -ForegroundColor Red
    $zip.Dispose()
    throw "Missing backend .env — create server-php/.env.production"
}

# ── Step 4 : Root .htaccess ───────────────────────────────────────────────────
Write-Host "[4/5] Writing .htaccess files..." -ForegroundColor Cyan

# Root .htaccess: serves React SPA + routes /api/* to Laravel
$rootHtaccess = @"
DirectoryIndex index.html index.php

Options -Indexes
ServerSignature Off

# PHP settings for Hostinger
php_value upload_max_filesize 64M
php_value post_max_size 64M
php_value max_execution_time 300
php_value memory_limit 256M

RewriteEngine On

# Route /api/* to Laravel backend
RewriteCond %{REQUEST_URI} ^/api/(.*)$
RewriteRule ^api/(.*)$ backend/public/index.php [QSA,L]

# Route /up (Laravel health) to backend
RewriteCond %{REQUEST_URI} ^/up$
RewriteRule ^up$ backend/public/index.php [QSA,L]

# Let actual files and directories pass through (React static assets)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else → React SPA index.html
RewriteRule ^ index.html [QSA,L]
"@

$rootEntry = $zip.CreateEntry(".htaccess")
$stream    = $rootEntry.Open()
$writer    = New-Object System.IO.StreamWriter($stream)
$writer.Write($rootHtaccess)
$writer.Close(); $stream.Close()
Write-Host "  Added root .htaccess (SPA + /api/ routing)" -ForegroundColor Gray

# Backend .htaccess — allow PHP execution inside backend/public/
$backendPublicHtaccess = @"
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Handle CORS preflight
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
"@

$bpEntry = $zip.CreateEntry("backend/public/.htaccess")
$stream2 = $bpEntry.Open()
$writer2 = New-Object System.IO.StreamWriter($stream2)
$writer2.Write($backendPublicHtaccess)
$writer2.Close(); $stream2.Close()
Write-Host "  Added backend/public/.htaccess" -ForegroundColor Gray

# ── Step 5 : Storage dirs + unzip.php helper ─────────────────────────────────
Write-Host "[5/5] Adding storage directories and helpers..." -ForegroundColor Cyan

# Laravel writable storage dirs (must exist on server)
$storageDirs = @(
    'backend/storage/',
    'backend/storage/app/',
    'backend/storage/app/public/',
    'backend/storage/framework/',
    'backend/storage/framework/cache/',
    'backend/storage/framework/sessions/',
    'backend/storage/framework/views/',
    'backend/storage/logs/',
    'backend/bootstrap/cache/'
)
foreach ($d in $storageDirs) {
    $zip.CreateEntry($d) | Out-Null
}

# Add a .gitkeep to each so the directory entry is non-empty
foreach ($d in $storageDirs) {
    $keepEntry = $zip.CreateEntry("${d}.gitkeep")
    $keepEntry.Open().Close()
}

# Add full_database_schema.sql for MySQL phpMyAdmin import
$sqlSchemaPath = "$root\full_database_schema.sql"
if (Test-Path $sqlSchemaPath) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $sqlSchemaPath, "full_database_schema.sql",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    Write-Host "  Added full_database_schema.sql (for phpMyAdmin import)" -ForegroundColor Gray
}

$zip.Dispose()

# ── Done ──────────────────────────────────────────────────────────────────────
$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE — deploy-vonecrm.zip ready!  (${size} MB)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  File : $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "DEPLOY STEPS (Hostinger hPanel):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Login to hPanel → Websites → vonedigitals.com → File Manager"
Write-Host "  2. Navigate to: domains/vonecrm.vonedigitals.com/public_html/"
Write-Host "     (or public_html/ if the subdomain folder differs)"
Write-Host "  3. Upload deploy-vonecrm.zip and click 'Extract' in File Manager UI"
Write-Host ""
Write-Host "  4. Run Laravel setup via SSH (or Hostinger Terminal):"
Write-Host "     cd domains/vonecrm.vonedigitals.com/public_html/backend"
Write-Host "     php artisan migrate --force"
Write-Host "     php artisan db:seed --force   # (if seeders exist)"
Write-Host "     php artisan config:cache"
Write-Host "     php artisan route:cache"
Write-Host "     php artisan view:cache"
Write-Host "     chmod -R 775 storage bootstrap/cache"
Write-Host ""
Write-Host "  6. Database was created in hPanel as:" -ForegroundColor Cyan
Write-Host "     DB:   u615113169_crmmanagement"
Write-Host "     User: u615113169_crm_management"
Write-Host "     Pass: crm_management_vone#Digital443"
Write-Host ""
Write-Host "  7. Open CRM: https://vonecrm.vonedigitals.com/" -ForegroundColor Green
Write-Host ""
