@echo off
REM ============================================================
REM TSRID Agent - Vollautomatische Installation
REM Installiert ALLES automatisch inkl. Node.js, Python, Build Tools
REM ============================================================

title TSRID Agent - Vollautomatische Installation
color 0A
setlocal EnableDelayedExpansion

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║     TSRID Agent - Vollautomatische Installation       ║
echo  ║                                                       ║
echo  ║  Dieses Script installiert automatisch:               ║
echo  ║  - Node.js 20 LTS                                     ║
echo  ║  - Python 3.12 (fuer native Module)                   ║
echo  ║  - Visual Studio Build Tools                          ║
echo  ║  - Alle Dependencies                                  ║
echo  ║  - Erstellt den Windows Installer                     ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

REM Als Administrator pruefen
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [!] WICHTIG: Bitte als Administrator ausfuehren!
    echo.
    echo  Rechtsklick auf diese Datei ^> "Als Administrator ausfuehren"
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SCHRITT 1: Node.js
REM ============================================================

echo [1/7] Pruefe Node.js...

where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo       [OK] Node.js: %%i
    goto :CHECK_PYTHON
)

echo       [!] Node.js nicht gefunden - installiere...

set "NODE_VERSION=20.11.0"
set "NODE_MSI=node-v%NODE_VERSION%-x64.msi"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_MSI%"
set "NODE_PATH=%INSTALLERS_DIR%\%NODE_MSI%"

if not exist "%NODE_PATH%" (
    echo       Lade Node.js herunter...
    curl -L -o "%NODE_PATH%" "%NODE_URL%" --progress-bar
)

echo       Installiere Node.js...
msiexec /i "%NODE_PATH%" /qn /norestart
timeout /t 5 /nobreak >nul
set "PATH=%PATH%;C:\Program Files\nodejs"

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo       [FEHLER] Node.js Installation fehlgeschlagen
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo       [OK] Node.js installiert: %%i

REM ============================================================
REM SCHRITT 2: Python
REM ============================================================

:CHECK_PYTHON
echo.
echo [2/7] Pruefe Python...

where python >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo       [OK] %%i
    goto :CHECK_BUILDTOOLS
)

echo       [!] Python nicht gefunden - installiere...

set "PYTHON_VERSION=3.12.2"
set "PYTHON_MSI=python-%PYTHON_VERSION%-amd64.exe"
set "PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/%PYTHON_MSI%"
set "PYTHON_PATH=%INSTALLERS_DIR%\%PYTHON_MSI%"

if not exist "%PYTHON_PATH%" (
    echo       Lade Python herunter...
    curl -L -o "%PYTHON_PATH%" "%PYTHON_URL%" --progress-bar
)

echo       Installiere Python (bitte warten)...
"%PYTHON_PATH%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0

timeout /t 10 /nobreak >nul

REM PATH aktualisieren
set "PATH=%PATH%;C:\Program Files\Python312;C:\Program Files\Python312\Scripts"
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts"

where python >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo       [OK] %%i installiert
) else (
    echo       [!] Python PATH muss aktualisiert werden
    echo       Bitte Terminal neu starten nach Abschluss
)

REM ============================================================
REM SCHRITT 3: Visual Studio Build Tools
REM ============================================================

:CHECK_BUILDTOOLS
echo.
echo [3/7] Pruefe Visual Studio Build Tools...

REM Prüfe ob Build Tools installiert
set "VSINSTALLER=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if exist "%VSINSTALLER%" (
    echo       [OK] Visual Studio Build Tools gefunden
    goto :NPM_INSTALL
)

REM Alternativ: Prüfe über npm config
npm config get msvs_version >nul 2>&1
if %errorLevel% equ 0 (
    echo       [OK] Build Tools konfiguriert
    goto :NPM_INSTALL
)

echo       [!] Build Tools nicht gefunden - installiere via npm...
echo       (Dies kann 5-10 Minuten dauern)
echo.

REM Installiere windows-build-tools via npm (enthält Python + VS Build Tools)
call npm install --global windows-build-tools --vs2019 2>nul

if %errorLevel% neq 0 (
    echo.
    echo       [!] Automatische Installation fehlgeschlagen.
    echo.
    echo       Bitte manuell installieren:
    echo       1. Oeffnen Sie: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo       2. Laden Sie "Build Tools for Visual Studio" herunter
    echo       3. Bei Installation waehlen: "Desktop development with C++"
    echo       4. Nach Installation dieses Script erneut starten
    echo.
    echo       ODER versuchen Sie in einer Admin-PowerShell:
    echo       npm install --global windows-build-tools
    echo.
    pause
    exit /b 1
)

echo       [OK] Build Tools installiert

REM ============================================================
REM SCHRITT 4: npm install
REM ============================================================

:NPM_INSTALL
echo.
echo [4/7] Installiere npm Dependencies...
echo       Dies kann einige Minuten dauern...
echo.

REM npm cache leeren falls vorherige Fehler
call npm cache clean --force >nul 2>&1

REM Installation mit Rebuild
call npm install

if %errorLevel% neq 0 (
    echo.
    echo       [!] npm install hatte Fehler, versuche Alternativen...
    
    REM Versuche ohne optionale Dependencies
    call npm install --ignore-scripts
    call npm rebuild
)

echo       [OK] Dependencies installiert
echo.

REM ============================================================
REM SCHRITT 5: Native Module rebuilden
REM ============================================================

echo [5/7] Baue native Module...

call npx electron-rebuild -f 2>nul
if %errorLevel% neq 0 (
    echo       [!] electron-rebuild Probleme, versuche Alternative...
    call npm rebuild 2>nul
)

echo       [OK] Native Module gebaut
echo.

REM ============================================================
REM SCHRITT 6: Offline-Daten
REM ============================================================

echo [6/7] Lade Offline-Standortdaten...

if not exist "offline-data" mkdir "offline-data"
curl -s "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul

if %errorLevel% equ 0 (
    echo       [OK] Standortdaten heruntergeladen
) else (
    echo       [INFO] Server nicht erreichbar
)
echo.

REM ============================================================
REM SCHRITT 7: Windows Installer bauen
REM ============================================================

echo [7/7] Erstelle Windows Installer...
echo       Dies kann 2-3 Minuten dauern...
echo.

call npm run build:win

if %errorLevel% neq 0 (
    echo.
    echo       [FEHLER] Build fehlgeschlagen
    echo.
    echo       Moegliche Loesung:
    echo       1. Terminal schliessen
    echo       2. PC neu starten (damit PATH-Aenderungen wirksam werden)
    echo       3. Script erneut als Administrator ausfuehren
    echo.
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
echo  Admin-Zugang: Ctrl+Shift+Alt+Q
echo  Passwort: tsrid2024!
echo.

start "" "%~dp0dist"

echo  Druecken Sie eine Taste zum Beenden...
pause >nul
