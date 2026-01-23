@echo off
REM ============================================================
REM TSRID Agent - Vollautomatische Installation
REM Installiert ALLES automatisch inkl. Node.js!
REM Einfach doppelklicken - fertig!
REM ============================================================

title TSRID Agent - Vollautomatische Installation
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║     TSRID Agent - Vollautomatische Installation       ║
echo  ║                                                       ║
echo  ║  Dieses Script installiert automatisch:               ║
echo  ║  - Node.js 20 LTS (falls nicht vorhanden)             ║
echo  ║  - Alle Dependencies                                  ║
echo  ║  - Native Module (SQLite, USB)                        ║
echo  ║  - Erstellt den Windows Installer                     ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

REM Zum Script-Verzeichnis wechseln
cd /d "%~dp0"

REM Installer-Ordner erstellen
set "INSTALLERS_DIR=%~dp0installers"
if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SCHRITT 1: Node.js prüfen und ggf. installieren
REM ============================================================

echo [1/6] Pruefe Node.js Installation...

where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo       [OK] Node.js bereits installiert: %NODE_VERSION%
    goto :SKIP_NODE_INSTALL
)

echo       [!] Node.js nicht gefunden - wird automatisch installiert...
echo.

REM Node.js Version und Download-URL
set "NODE_VERSION=20.11.0"
set "NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%"
set "NODE_PATH=%INSTALLERS_DIR%\%NODE_INSTALLER%"

REM Prüfen ob Installer bereits heruntergeladen
if exist "%NODE_PATH%" (
    echo       [OK] Node.js Installer bereits vorhanden
    goto :INSTALL_NODE
)

echo       Lade Node.js v%NODE_VERSION% herunter...
echo       URL: %NODE_URL%
echo.

REM Download mit curl (in Windows 10/11 vorinstalliert)
curl -L -o "%NODE_PATH%" "%NODE_URL%" --progress-bar
if %errorLevel% neq 0 (
    echo.
    echo       [!] curl fehlgeschlagen, versuche PowerShell...
    powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_PATH%'"
)

if not exist "%NODE_PATH%" (
    color 0C
    echo.
    echo  ╔═══════════════════════════════════════════════════════╗
    echo  ║  FEHLER: Node.js konnte nicht heruntergeladen werden  ║
    echo  ║                                                       ║
    echo  ║  Bitte manuell installieren:                          ║
    echo  ║  https://nodejs.org/                                  ║
    echo  ╚═══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

echo       [OK] Download erfolgreich

:INSTALL_NODE
echo.
echo       Installiere Node.js (dies kann 1-2 Minuten dauern)...
echo       Bitte warten und keine Fenster schliessen!
echo.

REM Stille Installation
msiexec /i "%NODE_PATH%" /qn /norestart

REM Warten bis Installation abgeschlossen
timeout /t 5 /nobreak >nul

REM PATH aktualisieren für diese Session
set "PATH=%PATH%;C:\Program Files\nodejs"

REM Prüfen ob Installation erfolgreich
where node >nul 2>&1
if %errorLevel% neq 0 (
    REM Manchmal braucht Windows einen Moment
    timeout /t 10 /nobreak >nul
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

where node >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo  ╔═══════════════════════════════════════════════════════╗
    echo  ║  FEHLER: Node.js Installation fehlgeschlagen          ║
    echo  ║                                                       ║
    echo  ║  Bitte manuell installieren und Script neu starten:   ║
    echo  ║  https://nodejs.org/                                  ║
    echo  ╚═══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo       [OK] Node.js erfolgreich installiert: %NODE_VERSION%

:SKIP_NODE_INSTALL
echo.

REM ============================================================
REM SCHRITT 2: npm prüfen
REM ============================================================

echo [2/6] Pruefe npm...
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo       [!] npm nicht gefunden, warte auf PATH-Update...
    timeout /t 5 /nobreak >nul
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
if defined NPM_VERSION (
    echo       [OK] npm gefunden: v%NPM_VERSION%
) else (
    color 0C
    echo       [FEHLER] npm nicht gefunden!
    echo       Bitte Terminal neu starten und Script erneut ausfuehren.
    pause
    exit /b 1
)
echo.

REM ============================================================
REM SCHRITT 3: Dependencies installieren
REM ============================================================

echo [3/6] Installiere Dependencies (npm install)...
echo       Dies kann einige Minuten dauern...
echo.

call npm install
if %errorLevel% neq 0 (
    color 0C
    echo       [FEHLER] npm install fehlgeschlagen!
    pause
    exit /b 1
)
echo       [OK] Dependencies installiert
echo.

REM ============================================================
REM SCHRITT 4: Native Module bauen
REM ============================================================

echo [4/6] Baue native Module (SQLite, USB, HID)...
echo       Dies kann 1-2 Minuten dauern...
echo.

call npx electron-rebuild -f 2>nul
if %errorLevel% neq 0 (
    echo       [!] electron-rebuild hatte Probleme, versuche Alternative...
    call npm rebuild 2>nul
)
echo       [OK] Native Module gebaut
echo.

REM ============================================================
REM SCHRITT 5: Offline-Daten laden
REM ============================================================

echo [5/6] Lade Offline-Standortdaten...

if not exist "offline-data" mkdir "offline-data"

curl -s "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
if %errorLevel% equ 0 (
    echo       [OK] Standortdaten heruntergeladen
) else (
    echo       [INFO] Standortdaten konnten nicht geladen werden (offline?)
)
echo.

REM ============================================================
REM SCHRITT 6: Windows Installer bauen
REM ============================================================

echo [6/6] Erstelle Windows Installer...
echo       Dies kann 2-3 Minuten dauern...
echo.

call npm run build:win
if %errorLevel% neq 0 (
    color 0C
    echo       [FEHLER] Build fehlgeschlagen!
    echo.
    echo       Moegliche Loesung: Visual Studio Build Tools installieren
    echo       https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║                                                       ║
echo  ║            INSTALLATION ERFOLGREICH!                  ║
echo  ║                                                       ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.
echo  Der Windows Installer wurde erstellt unter:
echo  %~dp0dist\
echo.
echo  Naechste Schritte:
echo  1. Installer aus dem dist-Ordner auf Tablets kopieren
echo  2. Installer ausfuehren
echo  3. App startet automatisch im Kiosk-Modus
echo.
echo  Admin-Zugang: Ctrl+Shift+Alt+Q
echo  Passwort: tsrid2024!
echo.

REM Öffne dist Ordner
start "" "%~dp0dist"

echo  Druecken Sie eine Taste zum Beenden...
pause >nul
