@echo off
title V ONE DIGITALS CRM - Laravel Backend
color 0A

echo ============================================
echo   V ONE DIGITALS CRM - Laravel Backend
echo ============================================
echo.

cd /d "%~dp0"

REM Create required directories
if not exist bootstrap\cache mkdir bootstrap\cache
if not exist storage\framework\cache mkdir storage\framework\cache
if not exist storage\framework\sessions mkdir storage\framework\sessions
if not exist storage\framework\views mkdir storage\framework\views
if not exist storage\logs mkdir storage\logs

REM Step 1: Install Composer Dependencies
echo [1/6] Installing Composer dependencies...
call composer install --no-interaction
if %errorlevel% neq 0 (
    echo ERROR: Composer install failed. Make sure Composer is installed.
    pause
    exit /b 1
)
echo DONE: Dependencies installed.
echo.

REM Step 2: Copy .env if not exists
echo [2/6] Checking environment file...
if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example
) else (
    echo .env file already exists.
)
echo.

REM Step 3: Generate Application Key
echo [3/6] Generating application key...
call php artisan key:generate --force
echo DONE: Application key generated.
echo.

REM Step 4: Fresh Migration (drops old tables, re-creates)
echo [4/7] Running fresh migration (drops old tables)...
call php artisan migrate:fresh --force
if %errorlevel% neq 0 (
    echo ERROR: Migration failed. Check your database connection in .env
    pause
    exit /b 1
)
echo DONE: Migrations completed.
echo.

REM Step 5: Regenerate Autoloader
echo [5/7] Regenerating autoloader...
call composer dump-autoload --no-interaction
echo.

REM Step 6: Seed Database
echo [6/7] Seeding database...
call php artisan db:seed --force
if %errorlevel% neq 0 (
    echo WARNING: Seeding failed. You can run "php artisan db:seed" manually later.
)
echo DONE: Database seeded.
echo.

REM Step 7: Start Development Server
echo [7/7] Starting development server...
echo.
echo ============================================
echo   Server starting on http://localhost:8000
echo   Admin Login: admin / admin123
echo   Press CTRL+C to stop the server
echo ============================================
echo.
call php artisan serve --port=8000
