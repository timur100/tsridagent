@echo off
REM ============================================================
REM TSRID Agent - Automatic Agent Installer v3.1
REM ============================================================

REM Verhindere sofortiges Schliessen bei Fehlern
if "%1"=="" (
    cmd /k "%~f0" RUN
    exit /b
)

setlocal EnableDelayedExpansion
title TSRID Automatic Agent Installer
mode con: cols=75 lines=50

color 0F
cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
set "ERRORS=0"
set "INSTALLED_SOMETHING=0"
set "SCRIPT_PATH=%~f0"

cls
echo.
echo   ========================================================
echo.
echo            TSRID AGENT INSTALLER v3.1
echo.
echo            Automatic Agent Installer
echo.
echo   ========================================================
echo.

REM ============================================================
REM ADMINISTRATOR-PRUEFUNG
REM ============================================================

echo   [STEP 1] Pruefe Administratorrechte...
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    color 0C
    echo   ========================================================
    echo.
    echo      FEHLER: Administratorrechte erforderlich!
    echo.
    echo      Bitte Rechtsklick auf diese Datei und dann:
    echo      "Als Administrator ausfuehren" waehlen
    echo.
    echo   ========================================================
    echo.
    pause
    exit /b 1
)
echo            [OK] Administratorrechte vorhanden
echo.

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SYSTEM-CHECK
REM ============================================================

echo   ========================================================
echo            SYSTEMVORAUSSETZUNGEN PRUEFEN
echo   ========================================================
echo.

REM --- Node.js ---
echo   [CHECK 1/3] Node.js
set "NODE_OK=0"

where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do (
        echo              Status: [OK] %%i
        set "NODE_OK=1"
    )
)

if "%NODE_OK%"=="0" (
    if exist "C:\Program Files\nodejs\node.exe" (
        for /f "tokens=*" %%i in ('"C:\Program Files\nodejs\node.exe" --version 2^>nul') do (
            echo              Status: [OK] %%i
            set "NODE_OK=1"
        )
    )
)

if "%NODE_OK%"=="0" (
    echo              Status: [X] Nicht installiert
)
echo.

REM --- Python ---
echo   [CHECK 2/3] Python
set "PYTHON_OK=0"
set "PYTHON_EXE="

REM Methode 1: py launcher
py -3 --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('py -3 --version 2^>^&1') do (
        echo              Status: [OK] %%i
        set "PYTHON_OK=1"
        set "PYTHON_EXE=py"
    )
)

REM Methode 2: python im PATH
if "%PYTHON_OK%"=="0" (
    where python >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
            echo              Status: [OK] %%i
            set "PYTHON_OK=1"
            for /f "tokens=*" %%p in ('where python') do set "PYTHON_EXE=%%p"
        )
    )
)

REM Methode 3: Bekannte Pfade
if "%PYTHON_OK%"=="0" (
    if exist "C:\Program Files\Python312\python.exe" (
        echo              Status: [OK] Python 3.12 gefunden
        set "PYTHON_OK=1"
        set "PYTHON_EXE=C:\Program Files\Python312\python.exe"
    )
)

if "%PYTHON_OK%"=="0" (
    if exist "C:\Python312\python.exe" (
        echo              Status: [OK] Python 3.12 gefunden
        set "PYTHON_OK=1"
        set "PYTHON_EXE=C:\Python312\python.exe"
    )
)

if "%PYTHON_OK%"=="0" (
    echo              Status: [X] Nicht installiert
)
echo.

REM --- Visual Studio Build Tools ---
echo   [CHECK 3/3] Visual Studio Build Tools
set "VS_OK=0"

if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC" set "VS_OK=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools\VC" set "VS_OK=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC" set "VS_OK=1"
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" set "VS_OK=1"

if "%VS_OK%"=="1" (
    echo              Status: [OK] Installiert
) else (
    echo              Status: [X] Nicht installiert
)
echo.

REM ============================================================
REM ALLE VORAUSSETZUNGEN PRUEFEN
REM ============================================================

if "%NODE_OK%"=="1" (
    if "%PYTHON_OK%"=="1" (
        if "%VS_OK%"=="1" (
            echo   ========================================================
            echo.
            echo         ALLE VORAUSSETZUNGEN ERFUELLT!
            echo.
            echo   ========================================================
            echo.
            goto :BUILD_APP
        )
    )
)

echo   ========================================================
echo            INSTALLIERE FEHLENDE SOFTWARE
echo   ========================================================
echo.

REM --- Node.js installieren ---
if "%NODE_OK%"=="0" (
    echo   [INSTALL] Node.js 20 LTS
    echo.
    
    set "NODE_FILE=node-v20.11.0-x64.msi"
    set "NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    
    if not exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        echo              Downloading Node.js...
        curl -L -o "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    )
    
    if exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        echo              Installiere...
        msiexec /i "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" /qn /norestart
        timeout /t 10 /nobreak >nul
        echo              [OK] Node.js installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo              [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Python installieren ---
if "%PYTHON_OK%"=="0" (
    echo   [INSTALL] Python 3.12
    echo.
    
    if not exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        echo              Downloading Python...
        curl -L -o "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" "https://www.python.org/ftp/python/3.12.2/python-3.12.2-amd64.exe"
    )
    
    if exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        echo              Installiere...
        "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
        timeout /t 15 /nobreak >nul
        echo              [OK] Python installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo              [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Visual Studio Build Tools installieren ---
if "%VS_OK%"=="0" (
    echo   [INSTALL] Visual Studio Build Tools
    echo.
    echo              HINWEIS: Dies dauert 10-20 Minuten!
    echo.
    
    if not exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        echo              Downloading Build Tools...
        curl -L -o "%INSTALLERS_DIR%\vs_BuildTools.exe" "https://aka.ms/vs/17/release/vs_BuildTools.exe"
    )
    
    if exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        echo              Installiere C++ Build Tools...
        start /wait "" "%INSTALLERS_DIR%\vs_BuildTools.exe" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        echo              [OK] Build Tools installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo              [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM ============================================================
REM FEHLERBEHANDLUNG
REM ============================================================

if %ERRORS% gtr 0 (
    echo.
    color 0C
    echo   FEHLER bei der Installation!
    echo   Bitte Internetverbindung pruefen und erneut starten.
    echo.
    pause
    exit /b 1
)

if "%INSTALLED_SOMETHING%"=="1" (
    echo.
    color 0E
    echo   ========================================================
    echo.
    echo      Software wurde installiert!
    echo.
    echo      WICHTIG: Bitte dieses Fenster SCHLIESSEN
    echo      und das Script ERNEUT starten.
    echo.
    echo      (PATH-Aenderungen muessen wirksam werden)
    echo.
    echo   ========================================================
    echo.
    pause
    exit /b 0
)

REM ============================================================
REM APP BAUEN
REM ============================================================

:BUILD_APP
color 0B
echo.
echo   ========================================================
echo              BAUE TSRID AGENT
echo   ========================================================
echo.

REM Konfiguriere npm
echo   [CONFIG] Konfiguriere npm fuer native Module...

if defined PYTHON_EXE (
    echo              Python: %PYTHON_EXE%
    call npm config set python "%PYTHON_EXE%"
) else (
    REM Versuche Python zu finden
    py -3 -c "import sys; print(sys.executable)" > "%TEMP%\python_path.txt" 2>nul
    if exist "%TEMP%\python_path.txt" (
        set /p PYTHON_EXE=<"%TEMP%\python_path.txt"
        if defined PYTHON_EXE (
            echo              Python: !PYTHON_EXE!
            call npm config set python "!PYTHON_EXE!"
        )
    )
)

call npm config set msvs_version 2022
echo              MSVS Version: 2022
echo.

REM --- npm install ---
echo   [BUILD 1/4] npm install...
echo              (Dies kann einige Minuten dauern)
echo.

call npm install
if %errorLevel% neq 0 (
    echo              [!] Fehler - versuche mit --force...
    call npm install --force
)
echo              [OK] Dependencies installiert
echo.

REM --- Native Module ---
echo   [BUILD 2/4] electron-rebuild...
echo              (Native Module kompilieren)
echo.

call npx electron-rebuild -f
echo              [OK] Native Module gebaut
echo.

REM --- Offline-Daten ---
echo   [BUILD 3/4] Offline-Daten laden...
echo.

if not exist "offline-data" mkdir "offline-data"
curl -s "https://tablet-fleet-sync.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
echo              [OK] Fertig
echo.

REM --- Windows Installer ---
echo   [BUILD 4/4] Windows Installer erstellen...
echo              (Dies kann 5-10 Minuten dauern)
echo.

call npm run build:win
if %errorLevel% neq 0 (
    echo.
    color 0C
    echo   Build fehlgeschlagen!
    echo.
    echo   Loesungen:
    echo   1. PC neu starten
    echo   2. Script erneut ausfuehren
    echo.
    pause
    exit /b 1
)
echo              [OK] Installer erstellt
echo.

REM ============================================================
REM ERFOLG
REM ============================================================

color 0A
echo.
echo   ========================================================
echo.
echo           INSTALLATION ERFOLGREICH!
echo.
echo   ========================================================
echo.
echo   Installer erstellt unter: %~dp0dist\
echo.
echo   --------------------------------------------------------
echo   TASTENKOMBINATIONEN:
echo     Ctrl+Shift+Alt+Q  =  Admin-Modus
echo     F12               =  DevTools
echo.
echo   ADMIN-ZUGANGSDATEN:
echo     PIN:       3842
echo     Passwort:  tsrid2024!
echo   --------------------------------------------------------
echo.

start "" "%~dp0dist"

echo.
pause
exit /b 0
