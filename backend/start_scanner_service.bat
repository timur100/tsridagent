@echo off
REM Desko Scanner Service Launcher for Windows
REM This script starts the scanner service on your Windows PC

echo ============================================================
echo Desko Scanner Service - Windows Launcher
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Install required packages
echo Installing required packages...
echo This may take a moment...
echo.

pip install flask flask-cors
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install packages
    echo.
    echo Please try manually:
    echo   1. Open Command Prompt as Administrator
    echo   2. Run: pip install --upgrade pip
    echo   3. Run: pip install flask flask-cors
    echo   4. Then run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Packages installed
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%

echo ============================================================
echo Starting Scanner Service...
echo ============================================================
echo.
echo Service will be available at:
echo   - Local:  http://localhost:8888
echo   - Network: http://%IP%:8888
echo.
echo Configure your Docker app with:
echo   SCANNER_SERVICE_URL=http://%IP%:8888
echo.
echo Press Ctrl+C to stop the service
echo ============================================================
echo.

REM Start the service
python scanner_service.py

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Service failed to start
    echo Check the error messages above
    echo.
)

pause
