@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

REM ============================================================
REM TSRID Agent Installer v4.0 - Grafische Version
REM ============================================================

REM Starte in neuem Fenster mit besseren Einstellungen
if "%1"=="" (
    powershell -Command "& {$w = Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);' -Name Win32 -Namespace Native -PassThru; Start-Process cmd -ArgumentList '/c mode con: cols=90 lines=45 & \"%~f0\" RUN' -Verb RunAs -Wait}"
    exit /b
)

title TSRID Agent Installer v4.0
color 1F

cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
set "ERRORS=0"
set "INSTALLED_SOMETHING=0"

REM Umgebungsvariablen fuer node-gyp (statt npm config)
set "npm_config_python=python"
set "npm_config_msvs_version=2022"
set "GYP_MSVS_VERSION=2022"

cls

REM ============================================================
REM HEADER
REM ============================================================

echo.
echo.
color 1F
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║             TSRID AGENT INSTALLER                    ║
echo                 ║                                                      ║
echo                 ║                  Version 4.0                         ║
echo                 ║                                                      ║
echo                 ║            Automatic Agent Installer                 ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.

REM ============================================================
REM ADMINISTRATOR CHECK
REM ============================================================

echo        Schritt 1: Administratorrechte pruefen...
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    color 4F
    echo.
    echo                 ╔══════════════════════════════════════════════════════╗
    echo                 ║                                                      ║
    echo                 ║       FEHLER: Administratorrechte erforderlich       ║
    echo                 ║                                                      ║
    echo                 ║       Rechtsklick - Als Administrator ausfuehren     ║
    echo                 ║                                                      ║
    echo                 ╚══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

echo                       Administratorrechte vorhanden
echo.
echo.

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SYSTEM CHECK
REM ============================================================

color 3F
cls
echo.
echo.
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║           SYSTEMVORAUSSETZUNGEN PRUEFEN              ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.

REM --- Node.js ---
echo        Pruefe 1/3: Node.js
set "NODE_OK=0"

where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do (
        echo                       INSTALLIERT  %%i
        set "NODE_OK=1"
    )
)

if "%NODE_OK%"=="0" (
    if exist "C:\Program Files\nodejs\node.exe" (
        for /f "tokens=*" %%i in ('"C:\Program Files\nodejs\node.exe" --version 2^>nul') do (
            echo                       INSTALLIERT  %%i
            set "NODE_OK=1"
        )
    )
)

if "%NODE_OK%"=="0" (
    echo                       FEHLT - wird installiert
)
echo.

REM --- Python ---
echo        Pruefe 2/3: Python
set "PYTHON_OK=0"
set "PYTHON_EXE="

py -3 --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('py -3 --version 2^>^&1') do (
        echo                       INSTALLIERT  %%i
        set "PYTHON_OK=1"
        set "PYTHON_EXE=py"
        set "npm_config_python=py"
    )
)

if "%PYTHON_OK%"=="0" (
    where python >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
            echo                       INSTALLIERT  %%i
            set "PYTHON_OK=1"
            for /f "tokens=*" %%p in ('where python') do (
                set "PYTHON_EXE=%%p"
                set "npm_config_python=%%p"
            )
        )
    )
)

if "%PYTHON_OK%"=="0" (
    for %%P in (
        "C:\Program Files\Python312\python.exe"
        "C:\Python312\python.exe"
        "C:\Program Files\Python311\python.exe"
    ) do (
        if exist %%P (
            echo                       INSTALLIERT  Python 3.x
            set "PYTHON_OK=1"
            set "PYTHON_EXE=%%~P"
            set "npm_config_python=%%~P"
        )
    )
)

if "%PYTHON_OK%"=="0" (
    echo                       FEHLT - wird installiert
)
echo.

REM --- Visual Studio Build Tools ---
echo        Pruefe 3/3: Visual Studio Build Tools
set "VS_OK=0"

if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC" set "VS_OK=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools\VC" set "VS_OK=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC" set "VS_OK=1"
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" set "VS_OK=1"

if "%VS_OK%"=="1" (
    echo                       INSTALLIERT
) else (
    echo                       FEHLT - wird installiert
)
echo.
echo.

REM ============================================================
REM CHECK IF ALL PREREQUISITES MET
REM ============================================================

if "%NODE_OK%"=="1" (
    if "%PYTHON_OK%"=="1" (
        if "%VS_OK%"=="1" (
            color 2F
            echo                 ╔══════════════════════════════════════════════════════╗
            echo                 ║                                                      ║
            echo                 ║          ALLE VORAUSSETZUNGEN ERFUELLT               ║
            echo                 ║                                                      ║
            echo                 ╚══════════════════════════════════════════════════════╝
            echo.
            timeout /t 2 /nobreak >nul
            goto :BUILD_APP
        )
    )
)

REM ============================================================
REM INSTALL MISSING SOFTWARE
REM ============================================================

color 6F
cls
echo.
echo.
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║           INSTALLIERE FEHLENDE SOFTWARE              ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.

REM --- Node.js ---
if "%NODE_OK%"=="0" (
    echo        Installiere Node.js 20 LTS...
    echo.
    
    if not exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        echo                Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    )
    
    if exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        echo                Installiere...
        msiexec /i "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" /qn /norestart
        timeout /t 10 /nobreak >nul
        echo                Fertig
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo                Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Python ---
if "%PYTHON_OK%"=="0" (
    echo        Installiere Python 3.12...
    echo.
    
    if not exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        echo                Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" "https://www.python.org/ftp/python/3.12.2/python-3.12.2-amd64.exe"
    )
    
    if exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        echo                Installiere...
        "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
        timeout /t 15 /nobreak >nul
        echo                Fertig
        set "INSTALLED_SOMETHING=1"
        set "npm_config_python=C:\Program Files\Python312\python.exe"
    ) else (
        echo                Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Visual Studio Build Tools ---
if "%VS_OK%"=="0" (
    echo        Installiere Visual Studio Build Tools...
    echo.
    echo                HINWEIS: Dies dauert 10-20 Minuten
    echo.
    
    if not exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        echo                Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\vs_BuildTools.exe" "https://aka.ms/vs/17/release/vs_BuildTools.exe"
    )
    
    if exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        echo                Installiere C++ Build Tools...
        start /wait "" "%INSTALLERS_DIR%\vs_BuildTools.exe" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        echo                Fertig
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo                Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM ============================================================
REM ERROR HANDLING
REM ============================================================

if %ERRORS% gtr 0 (
    color 4F
    echo.
    echo                 ╔══════════════════════════════════════════════════════╗
    echo                 ║                                                      ║
    echo                 ║              INSTALLATION FEHLGESCHLAGEN             ║
    echo                 ║                                                      ║
    echo                 ║         Bitte Internetverbindung pruefen             ║
    echo                 ║                                                      ║
    echo                 ╚══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

if "%INSTALLED_SOMETHING%"=="1" (
    color 5F
    echo.
    echo                 ╔══════════════════════════════════════════════════════╗
    echo                 ║                                                      ║
    echo                 ║            SOFTWARE WURDE INSTALLIERT                ║
    echo                 ║                                                      ║
    echo                 ║     Bitte dieses Fenster schliessen und das          ║
    echo                 ║     Script ERNEUT starten                            ║
    echo                 ║                                                      ║
    echo                 ╚══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 0
)

REM ============================================================
REM BUILD APP
REM ============================================================

:BUILD_APP
color 9F
cls
echo.
echo.
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║                BAUE TSRID AGENT                      ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.

echo        Konfiguration:
echo                Python:     %npm_config_python%
echo                VS Version: %npm_config_msvs_version%
echo.
echo.

REM --- npm install ---
echo        Schritt 1/4: npm install
echo.
echo                Dies kann einige Minuten dauern...
echo.

call npm install 2>&1
if %errorLevel% neq 0 (
    echo.
    echo                Erneuter Versuch mit --force...
    call npm install --force 2>&1
)
echo.
echo                Fertig
echo.

REM --- electron-rebuild ---
echo        Schritt 2/4: Native Module kompilieren
echo.
echo                Dies kann 2-5 Minuten dauern...
echo.

call npx electron-rebuild -f 2>&1
echo.
echo                Fertig
echo.

REM --- Offline Data ---
echo        Schritt 3/4: Offline-Daten laden
echo.

if not exist "offline-data" mkdir "offline-data"
curl -s "https://tablet-fleet-sync.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
echo                Fertig
echo.

REM --- Build Windows Installer ---
echo        Schritt 4/4: Windows Installer erstellen
echo.
echo                Dies kann 5-10 Minuten dauern...
echo.

call npm run build:win 2>&1
if %errorLevel% neq 0 (
    color 4F
    echo.
    echo                 ╔══════════════════════════════════════════════════════╗
    echo                 ║                                                      ║
    echo                 ║               BUILD FEHLGESCHLAGEN                   ║
    echo                 ║                                                      ║
    echo                 ║         PC neu starten und erneut versuchen          ║
    echo                 ║                                                      ║
    echo                 ╚══════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo.
echo                Fertig
echo.

REM ============================================================
REM SUCCESS
REM ============================================================

color 2F
cls
echo.
echo.
echo.
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║                                                      ║
echo                 ║           INSTALLATION ERFOLGREICH                   ║
echo                 ║                                                      ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.
echo.
echo        Der Installer wurde erstellt unter:
echo.
echo                %~dp0dist\
echo.
echo.
echo                 ╔══════════════════════════════════════════════════════╗
echo                 ║                                                      ║
echo                 ║   TASTENKOMBINATIONEN                                ║
echo                 ║                                                      ║
echo                 ║      Ctrl+Shift+Alt+Q     Admin-Modus                ║
echo                 ║      F12                  Developer Tools            ║
echo                 ║                                                      ║
echo                 ╠══════════════════════════════════════════════════════╣
echo                 ║                                                      ║
echo                 ║   ADMIN-ZUGANGSDATEN                                 ║
echo                 ║                                                      ║
echo                 ║      PIN:       3842                                 ║
echo                 ║      Passwort:  tsrid2024!                           ║
echo                 ║                                                      ║
echo                 ╚══════════════════════════════════════════════════════╝
echo.
echo.

start "" "%~dp0dist"

echo.
echo        Druecken Sie eine beliebige Taste zum Beenden...
pause >nul
exit /b 0
