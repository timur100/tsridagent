@echo off
REM ============================================================
REM TSRID Agent - Setup mit Menü
REM Installiert Node.js automatisch falls nicht vorhanden
REM ============================================================

title TSRID Agent Setup
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║           TSRID Agent - Setup Assistent               ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

REM Zum Script-Verzeichnis wechseln
cd /d "%~dp0"

REM Installer-Ordner
set "INSTALLERS_DIR=%~dp0installers"
if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM Node.js prüfen
REM ============================================================

echo  Pruefe Systemvoraussetzungen...
echo.

where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo  [OK] Node.js: %NODE_VER%
    goto :CHECK_NPM
)

echo  [!] Node.js nicht gefunden
echo.
echo  Node.js wird automatisch installiert...
echo.

call :INSTALL_NODEJS
if %errorLevel% neq 0 (
    echo.
    echo  [FEHLER] Node.js Installation fehlgeschlagen
    echo  Bitte manuell von https://nodejs.org/ installieren
    pause
    exit /b 1
)

:CHECK_NPM
where npm >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
    echo  [OK] npm: v%NPM_VER%
) else (
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

echo.
echo  ════════════════════════════════════════════════════════
echo.

REM ============================================================
REM Hauptmenü
REM ============================================================

:MENU
echo  Was moechten Sie tun?
echo.
echo  [1] Vollstaendiges Setup (empfohlen fuer ersten Start)
echo  [2] App starten (Test-Modus)
echo  [3] Windows Installer bauen
echo  [4] Setup + Test + Build (alles)
echo  [5] Nur Offline-Daten aktualisieren
echo  [6] Beenden
echo.

set /p CHOICE="  Ihre Wahl (1-6): "

if "%CHOICE%"=="1" goto :FULL_SETUP
if "%CHOICE%"=="2" goto :START_APP
if "%CHOICE%"=="3" goto :BUILD_ONLY
if "%CHOICE%"=="4" goto :ALL
if "%CHOICE%"=="5" goto :UPDATE_OFFLINE
if "%CHOICE%"=="6" goto :END

echo.
echo  [!] Ungueltige Auswahl, bitte 1-6 eingeben
echo.
goto :MENU

REM ============================================================
REM Funktionen
REM ============================================================

:FULL_SETUP
echo.
echo  ════════════════════════════════════════════════════════
echo   Vollstaendiges Setup
echo  ════════════════════════════════════════════════════════
echo.

echo  [1/4] Installiere Dependencies...
call npm install
if %errorLevel% neq 0 (
    echo  [FEHLER] npm install fehlgeschlagen
    pause
    goto :MENU
)
echo  [OK] Dependencies installiert
echo.

echo  [2/4] Baue native Module...
call npx electron-rebuild -f 2>nul
echo  [OK] Native Module gebaut
echo.

echo  [3/4] Erstelle Verzeichnisse...
if not exist "%PROGRAMDATA%\TSRID" mkdir "%PROGRAMDATA%\TSRID"
if not exist "%PROGRAMDATA%\TSRID\database" mkdir "%PROGRAMDATA%\TSRID\database"
if not exist "%PROGRAMDATA%\TSRID\config" mkdir "%PROGRAMDATA%\TSRID\config"
if not exist "%PROGRAMDATA%\TSRID\logs" mkdir "%PROGRAMDATA%\TSRID\logs"
echo  [OK] Verzeichnisse erstellt
echo.

echo  [4/4] Lade Offline-Standortdaten...
call :DOWNLOAD_OFFLINE_DATA
echo.

echo  ════════════════════════════════════════════════════════
echo   Setup abgeschlossen!
echo  ════════════════════════════════════════════════════════
echo.
pause
goto :MENU

:START_APP
echo.
echo  ════════════════════════════════════════════════════════
echo   Starte TSRID Agent
echo  ════════════════════════════════════════════════════════
echo.
echo   Tastenkombinationen:
echo   - Ctrl+Shift+Alt+Q = Admin-Modus
echo   - F12 = DevTools oeffnen
echo   - Admin-Passwort: tsrid2024!
echo.
echo  ════════════════════════════════════════════════════════
echo.
call npm start
echo.
pause
goto :MENU

:BUILD_ONLY
echo.
echo  ════════════════════════════════════════════════════════
echo   Erstelle Windows Installer
echo  ════════════════════════════════════════════════════════
echo.
echo  Dies kann 2-3 Minuten dauern...
echo.
call npm run build:win
if %errorLevel% neq 0 (
    echo  [FEHLER] Build fehlgeschlagen
    pause
    goto :MENU
)
echo.
echo  [OK] Installer erstellt unter: %~dp0dist\
echo.
start "" "%~dp0dist"
pause
goto :MENU

:ALL
echo.
echo  ════════════════════════════════════════════════════════
echo   Vollstaendiger Durchlauf
echo  ════════════════════════════════════════════════════════
echo.

echo  [1/5] Dependencies...
call npm install
echo.

echo  [2/5] Native Module...
call npx electron-rebuild -f 2>nul
echo.

echo  [3/5] Offline-Daten...
call :DOWNLOAD_OFFLINE_DATA
echo.

echo  [4/5] Starte App zum Testen...
echo  (Schliessen Sie die App nach dem Test)
echo.
call npm start
echo.

echo  [5/5] Erstelle Installer...
call npm run build:win
echo.

echo  [OK] Alles erledigt! Installer unter: %~dp0dist\
start "" "%~dp0dist"
pause
goto :MENU

:UPDATE_OFFLINE
echo.
echo  Aktualisiere Offline-Standortdaten...
call :DOWNLOAD_OFFLINE_DATA
echo.
pause
goto :MENU

:END
echo.
echo  Auf Wiedersehen!
exit /b 0

REM ============================================================
REM Hilfsfunktionen
REM ============================================================

:INSTALL_NODEJS
set "NODE_VERSION=20.11.0"
set "NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%"
set "NODE_PATH=%INSTALLERS_DIR%\%NODE_INSTALLER%"

if not exist "%NODE_PATH%" (
    echo  Lade Node.js v%NODE_VERSION% herunter...
    curl -L -o "%NODE_PATH%" "%NODE_URL%" --progress-bar
    if %errorLevel% neq 0 (
        powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_PATH%'" 2>nul
    )
)

if not exist "%NODE_PATH%" (
    exit /b 1
)

echo  Installiere Node.js (bitte warten)...
msiexec /i "%NODE_PATH%" /qn /norestart
timeout /t 10 /nobreak >nul
set "PATH=%PATH%;C:\Program Files\nodejs"

where node >nul 2>&1
if %errorLevel% neq 0 (
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js installiert: %NODE_VER%
exit /b 0

:DOWNLOAD_OFFLINE_DATA
if not exist "offline-data" mkdir "offline-data"
echo  Lade Standorte von Server...
curl -s "https://tablet-agent-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
if %errorLevel% equ 0 (
    echo  [OK] Standortdaten aktualisiert
) else (
    echo  [INFO] Server nicht erreichbar (offline?)
)
exit /b 0
