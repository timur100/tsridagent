@echo off
REM Simplified Scanner Service Launcher - Works without pip
REM This version uses python -m pip instead of pip command

echo ============================================================
echo Desko Scanner Service - Simplified Launcher
echo ============================================================
echo.

REM Check if Python is installed
python --version 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.9+ from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Try to install packages using python -m pip
echo Installing required packages (this may take a minute)...
echo.

python -m pip install --upgrade pip
python -m pip install flask flask-cors

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Package installation had issues
    echo Trying to start service anyway...
    echo.
    timeout /t 3
)

REM Get local IP address
echo.
echo Detecting network configuration...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%

echo.
echo ============================================================
echo Starting Desko Scanner Service...
echo ============================================================
echo.
echo Service URL:
echo   - Local:    http://localhost:8888
echo   - Network:  http://%IP%:8888
echo.
echo To connect from Docker app, add to backend/.env:
echo   SCANNER_SERVICE_URL=http://%IP%:8888
echo.
echo Press Ctrl+C to stop the service
echo ============================================================
echo.

REM Start the service
python scanner_service.py

if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo ERROR: Service failed to start
    echo ============================================================
    echo.
    echo Possible reasons:
    echo   1. Flask not installed - Run as Administrator
    echo   2. Port 8888 already in use
    echo   3. Missing files (desko_integration.py, desko_sdk folder)
    echo.
    echo For detailed help, see: FIX_PIP_PROBLEM.md
    echo.
)

pause
