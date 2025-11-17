@echo off
echo ========================================
echo Building Document Verification Scanner
echo ========================================
echo.

REM Install dependencies
echo [1/3] Installing dependencies...
call yarn install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Build portable executable
echo [2/3] Building portable executable...
call yarn build-portable
if errorlevel 1 (
    echo ERROR: Failed to build portable
    pause
    exit /b 1
)
echo.

REM Build installer
echo [3/3] Building installer...
call yarn build
if errorlevel 1 (
    echo ERROR: Failed to build installer
    pause
    exit /b 1
)
echo.

echo ========================================
echo Build complete!
echo ========================================
echo.
echo Find your executables in the 'dist' folder:
echo   - DocumentVerificationScanner-Portable.exe
echo   - Document Verification Scanner Setup.exe
echo.
pause
