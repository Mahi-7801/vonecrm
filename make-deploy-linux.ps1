Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# ─────────────────────────────────────────────────────────────────
#  make-deploy-linux.ps1
#  Builds React frontend + packages Laravel backend into deploy-linux.zip
# ─────────────────────────────────────────────────────────────────

$root      = 'c:\Users\ramya\Downloads\mahi'
$backend   = "$root\server-php"
$frontend  = "$root\client"
$buildDir  = "$frontend\build"
$zipPath   = "$root\deploy-linux.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath }

# ── Step 1 : Build frontend ──────────────────────────────────────
Write-Host ""
Write-Host "=== Building React Frontend... ===" -ForegroundColor Yellow
$oldDir = Get-Location
Set-Location "$frontend"

npm run build
if ($LASTEXITCODE -ne 0) {
    Set-Location $oldDir
    throw "Frontend build failed!"
}
Set-Location $oldDir
Write-Host "Frontend build completed successfully!" -ForegroundColor Green

# ── Helper : recursively add a folder to the zip ────────────────
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FolderToZip {
    param(
        [System.IO.Compression.ZipArchive]$z,
        [string]$folder,
        [string]$prefix,
        [string[]]$exclude = @('vendor', 'node_modules', '.git', 'storage/logs/*.log', '.env.local')
    )
    Get-ChildItem -LiteralPath $folder -File | Where-Object { 
        $rel = $_.FullName.Replace("$folder\", '')
        $exclude -notcontains $_.Name
    } | ForEach-Object {
        $entry = if ($prefix) { "$prefix/$($_.Name)" } else { $_.Name }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $z, $_.FullName, $entry,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
    Get-ChildItem -LiteralPath $folder -Directory | Where-Object { 
        $exclude -notcontains $_.Name -and $_.Name -ne 'vendor' -and $_.Name -ne 'node_modules'
    } | ForEach-Object {
        $newPrefix = if ($prefix) { "$prefix/$($_.Name)/" } else { "$($_.Name)/" }
        Add-FolderToZip -z $z -folder $_.FullName -prefix $newPrefix.TrimEnd('/')
    }
}

# ── Step 2 : Backend PHP files ───────────────────────────────────
Write-Host ""
Write-Host "[1/3] Adding server-php files..." -ForegroundColor Cyan
Add-FolderToZip -z $zip -folder $backend -prefix 'server-php'

# ── Step 3 : Frontend static build files ─────────────────────────
Write-Host "[2/3] Adding client build files..." -ForegroundColor Cyan
if (Test-Path $buildDir) {
    Add-FolderToZip -z $zip -folder $buildDir -prefix 'client-build'
}

# ── Step 4 : Database SQL dump ───────────────────────────────────
Write-Host "[3/3] Adding database schema SQL..." -ForegroundColor Cyan
$sqlPath = "$root\full_database_schema.sql"
if (Test-Path $sqlPath) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $sqlPath, "full_database_schema.sql",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
}

$zip.Dispose()

$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  DONE - deploy-linux.zip ready! (${size} MB)" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Location : $zipPath" -ForegroundColor Cyan
Write-Host ""
