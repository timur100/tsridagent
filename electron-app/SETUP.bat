@echo off
REM ============================================================
REM TSRID Agent - Automatisches Setup & Build Script
REM Einfach doppelklicken zum Starten!
REM ============================================================

title TSRID Agent Setup
color 0A

echo.
echo  ========================================
echo   TSRID Agent - Automatisches Setup
echo  ========================================
echo.

REM Prüfe ob als Administrator ausgeführt
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNUNG] Bitte als Administrator ausfuehren fuer beste Ergebnisse.
    echo.
)

REM Aktuelles Verzeichnis speichern
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [1/7] Pruefe Voraussetzungen...
echo.

REM Prüfe Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [FEHLER] Node.js nicht gefunden!
    echo.
    echo Bitte installieren Sie Node.js 20 LTS von:
    echo https://nodejs.org/
    echo.
    echo Nach der Installation dieses Script erneut ausfuehren.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js gefunden: %NODE_VERSION%

REM Prüfe npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [FEHLER] npm nicht gefunden!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm gefunden: v%NPM_VERSION%

echo.
echo [2/7] Installiere Dependencies...
echo.
call npm install
if %errorLevel% neq 0 (
    echo [FEHLER] npm install fehlgeschlagen!
    pause
    exit /b 1
)
echo [OK] Dependencies installiert

echo.
echo [3/7] Baue native Module (SQLite, USB, etc.)...
echo.
call npx electron-rebuild -f
if %errorLevel% neq 0 (
    echo [WARNUNG] electron-rebuild hatte Probleme, versuche Alternative...
    call npm rebuild
)
echo [OK] Native Module gebaut

echo.
echo [4/7] Erstelle Datenverzeichnisse...
echo.
if not exist "%PROGRAMDATA%\TSRID" mkdir "%PROGRAMDATA%\TSRID"
if not exist "%PROGRAMDATA%\TSRID\database" mkdir "%PROGRAMDATA%\TSRID\database"
if not exist "%PROGRAMDATA%\TSRID\config" mkdir "%PROGRAMDATA%\TSRID\config"
if not exist "%PROGRAMDATA%\TSRID\logs" mkdir "%PROGRAMDATA%\TSRID\logs"
if not exist "%PROGRAMDATA%\TSRID\offline-data" mkdir "%PROGRAMDATA%\TSRID\offline-data"
echo [OK] Verzeichnisse erstellt

echo.
echo [5/7] Lade Offline-Standortdaten...
echo.
if not exist "offline-data" mkdir "offline-data"
curl -s "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
if %errorLevel% equ 0 (
    echo [OK] Standortdaten heruntergeladen
) else (
    echo [INFO] Standortdaten konnten nicht geladen werden (offline?)
)

echo.
echo  ========================================
echo   Setup abgeschlossen!
echo  ========================================
echo.
echo  Optionen:
echo.
echo  [1] App jetzt starten (Test-Modus)
echo  [2] Windows Installer bauen
echo  [3] Beides (Erst testen, dann bauen)
echo  [4] Beenden
echo.

set /p CHOICE="Ihre Wahl (1-4): "

if "%CHOICE%"=="1" goto START_APP
if "%CHOICE%"=="2" goto BUILD_INSTALLER
if "%CHOICE%"=="3" goto TEST_AND_BUILD
if "%CHOICE%"=="4" goto END

:START_APP
echo.
echo [6/7] Starte App im Test-Modus...
echo.
echo  ----------------------------------------
echo   TASTENKOMBINATIONEN:
echo   Ctrl+Shift+Alt+Q = Admin-Modus
echo   F12 = DevTools oeffnen
echo   Admin-Passwort: tsrid2024!
echo  ----------------------------------------
echo.
call npm start
goto END

:BUILD_INSTALLER
echo.
echo [6/7] Erstelle Windows Installer...
echo.
call npm run build:win
if %errorLevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b 1
)
echo.
echo [OK] Installer erstellt!
echo.
echo Installer zu finden unter:
echo %SCRIPT_DIR%dist\TSRID Admin Portal Setup 1.1.0.exe
echo.
explorer "%SCRIPT_DIR%dist"
goto END

:TEST_AND_BUILD
echo.
echo [6/7] Starte App zum Testen...
echo.
echo Schliessen Sie die App nach dem Test (X Button oder Alt+F4)
echo Der Installer wird danach automatisch gebaut.
echo.
call npm start
echo.
echo [7/7] Erstelle Windows Installer...
echo.
call npm run build:win
echo.
echo [OK] Alles fertig!
echo.
echo Installer zu finden unter:
echo %SCRIPT_DIR%dist\
echo.
explorer "%SCRIPT_DIR%dist"
goto END

:END
echo.
echo Druecken Sie eine Taste zum Beenden...
pause >nul
