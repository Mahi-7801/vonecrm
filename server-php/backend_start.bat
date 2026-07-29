@echo off
cd /d "%~dp0"
echo Starting V ONE DIGITALS CRM on http://localhost:8000
echo Press CTRL+C to stop
echo.
php artisan serve --port=8000
