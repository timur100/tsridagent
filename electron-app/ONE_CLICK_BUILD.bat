@echo off
REM ============================================================
REM TSRID Agent - Ein-Klick Installation und Build
REM Einfach doppelklicken - alles passiert automatisch!
REM ============================================================

title TSRID Agent - Automatische Installation
color 0A

echo.
echo  ========================================
echo   TSRID Agent - Ein-Klick Installation
echo  ========================================
echo.
echo  Bitte warten, Installation laeuft...
echo.

cd /d "%~dp0"

REM Prüfe Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo  [FEHLER] Node.js nicht gefunden!
    echo.
    echo  Bitte zuerst Node.js installieren:
    echo  https://nodejs.org/
    echo.
    echo  Nach Installation dieses Script erneut starten.
    echo.
    pause
    exit /b 1
)

echo [1/5] Node.js gefunden...
echo [2/5] Installiere Dependencies...
call npm install >nul 2>&1

echo [3/5] Baue native Module...
call npx electron-rebuild -f >nul 2>&1

echo [4/5] Lade Offline-Daten...
if not exist "offline-data" mkdir "offline-data"
curl -s "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul

echo [5/5] Erstelle Windows Installer...
call npm run build:win >nul 2>&1

echo.
echo  ========================================
echo   Installation erfolgreich!
echo  ========================================
echo.
echo  Installer erstellt unter:
echo  %~dp0dist\
echo.

REM Öffne dist Ordner
start "" "%~dp0dist"

echo  Druecken Sie eine Taste zum Beenden...
pause >nul
