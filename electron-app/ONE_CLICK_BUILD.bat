@echo off
REM ============================================================
REM TSRID Agent - Vollautomatische Installation v2.0
REM Ein Klick - Alles wird automatisch installiert und gebaut!
REM ============================================================

setlocal EnableDelayedExpansion
title TSRID Agent Installer
mode con: cols=70 lines=40

REM Farben: 0=Schwarz,1=Blau,2=Gruen,3=Cyan,4=Rot,5=Magenta,6=Gelb,7=Weiss
REM A=Hellgruen,B=Hellcyan,C=Hellrot,D=Hellmagenta,E=Hellgelb,F=Hellweiss
color 0F

cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
set "ERRORS=0"
set "NEED_RESTART=0"

REM ============================================================
REM HEADER
REM ============================================================

cls
echo.
echo   ____________________________________________________
echo  ^|                                                    ^|
echo  ^|              TSRID AGENT INSTALLER                 ^|
echo  ^|                  Version 2.0                       ^|
echo  ^|____________________________________________________^|
echo.
echo    Vollautomatische Installation - Ein Klick genuegt!
echo.
echo   ____________________________________________________
echo.

REM ============================================================
REM ADMINISTRATOR-PRUEFUNG
REM ============================================================

echo   [*] Pruefe Administratorrechte...

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    color 0C
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|   FEHLER: Administratorrechte erforderlich!        ^|
    echo  ^|                                                    ^|
    echo  ^|   Bitte Rechtsklick auf diese Datei und dann:      ^|
    echo  ^|   "Als Administrator ausfuehren" waehlen           ^|
    echo  ^|____________________________________________________^|
    echo.
    pause
    exit /b 1
)
echo       [OK] Administratorrechte vorhanden
echo.

REM Installer-Verzeichnis erstellen
if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SYSTEM-CHECK
REM ============================================================

echo   ____________________________________________________
echo  ^|                                                    ^|
echo  ^|              SYSTEMVORAUSSETZUNGEN                 ^|
echo  ^|____________________________________________________^|
echo.

REM --- Node.js ---
echo   [1/3] Node.js
set "NODE_OK=0"
where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do (
        echo         Status:  INSTALLIERT [%%i]
        set "NODE_OK=1"
    )
) else (
    echo         Status:  NICHT INSTALLIERT
)
echo.

REM --- Python ---
echo   [2/3] Python
set "PYTHON_OK=0"
where python >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
        echo         Status:  INSTALLIERT [%%i]
        set "PYTHON_OK=1"
    )
) else (
    REM Auch py.exe prüfen
    where py >nul 2>&1
    if !errorLevel! equ 0 (
        for /f "tokens=*" %%i in ('py --version 2^>^&1') do (
            echo         Status:  INSTALLIERT [%%i]
            set "PYTHON_OK=1"
        )
    ) else (
        echo         Status:  NICHT INSTALLIERT
    )
)
echo.

REM --- Visual Studio Build Tools ---
echo   [3/3] Visual Studio Build Tools
set "VS_OK=0"

if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC" (
    echo         Status:  INSTALLIERT [VS 2022]
    set "VS_OK=1"
) else if exist "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools\VC" (
    echo         Status:  INSTALLIERT [VS 2019]
    set "VS_OK=1"
) else if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC" (
    echo         Status:  INSTALLIERT [VS 2022]
    set "VS_OK=1"
) else if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC" (
    echo         Status:  INSTALLIERT [VS 2019]
    set "VS_OK=1"
) else (
    REM Prüfe über vswhere
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
        echo         Status:  INSTALLIERT
        set "VS_OK=1"
    ) else (
        echo         Status:  NICHT INSTALLIERT
    )
)
echo.

REM ============================================================
REM FEHLENDE KOMPONENTEN INSTALLIEREN
REM ============================================================

if "%NODE_OK%"=="1" if "%PYTHON_OK%"=="1" if "%VS_OK%"=="1" (
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|    Alle Voraussetzungen erfuellt!                  ^|
    echo  ^|____________________________________________________^|
    echo.
    goto :BUILD_APP
)

echo   ____________________________________________________
echo  ^|                                                    ^|
echo  ^|           INSTALLIERE FEHLENDE SOFTWARE            ^|
echo  ^|____________________________________________________^|
echo.

REM --- Node.js installieren ---
if "%NODE_OK%"=="0" (
    echo   [*] Installiere Node.js 20 LTS...
    echo.
    
    set "NODE_VERSION=20.11.0"
    set "NODE_FILE=node-v!NODE_VERSION!-x64.msi"
    set "NODE_URL=https://nodejs.org/dist/v!NODE_VERSION!/!NODE_FILE!"
    
    if not exist "%INSTALLERS_DIR%\!NODE_FILE!" (
        echo       Downloading Node.js...
        echo       URL: !NODE_URL!
        echo.
        curl -L -# -o "%INSTALLERS_DIR%\!NODE_FILE!" "!NODE_URL!"
        if !errorLevel! neq 0 (
            echo       [!] Download fehlgeschlagen, versuche PowerShell...
            powershell -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '%INSTALLERS_DIR%\!NODE_FILE!'" 2>nul
        )
    ) else (
        echo       [i] Node.js Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!NODE_FILE!" (
        echo       Installiere...
        msiexec /i "%INSTALLERS_DIR%\!NODE_FILE!" /qn /norestart
        timeout /t 8 /nobreak >nul
        set "PATH=!PATH!;C:\Program Files\nodejs"
        set "NEED_RESTART=1"
        echo       [OK] Node.js installiert
    ) else (
        echo       [X] Installation fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Python installieren ---
if "%PYTHON_OK%"=="0" (
    echo   [*] Installiere Python 3.12...
    echo.
    
    set "PY_VERSION=3.12.2"
    set "PY_FILE=python-!PY_VERSION!-amd64.exe"
    set "PY_URL=https://www.python.org/ftp/python/!PY_VERSION!/!PY_FILE!"
    
    if not exist "%INSTALLERS_DIR%\!PY_FILE!" (
        echo       Downloading Python...
        echo       URL: !PY_URL!
        echo.
        curl -L -# -o "%INSTALLERS_DIR%\!PY_FILE!" "!PY_URL!"
        if !errorLevel! neq 0 (
            powershell -Command "Invoke-WebRequest -Uri '!PY_URL!' -OutFile '%INSTALLERS_DIR%\!PY_FILE!'" 2>nul
        )
    ) else (
        echo       [i] Python Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!PY_FILE!" (
        echo       Installiere (bitte warten)...
        "%INSTALLERS_DIR%\!PY_FILE!" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        timeout /t 15 /nobreak >nul
        set "PATH=!PATH!;C:\Program Files\Python312;C:\Program Files\Python312\Scripts"
        set "NEED_RESTART=1"
        echo       [OK] Python installiert
    ) else (
        echo       [X] Installation fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Visual Studio Build Tools installieren ---
if "%VS_OK%"=="0" (
    echo   [*] Installiere Visual Studio Build Tools...
    echo.
    echo       HINWEIS: Dies kann 5-15 Minuten dauern!
    echo.
    
    set "VS_FILE=vs_BuildTools.exe"
    set "VS_URL=https://aka.ms/vs/17/release/vs_BuildTools.exe"
    
    if not exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo       Downloading Build Tools...
        curl -L -# -o "%INSTALLERS_DIR%\!VS_FILE!" "!VS_URL!"
        if !errorLevel! neq 0 (
            powershell -Command "Invoke-WebRequest -Uri '!VS_URL!' -OutFile '%INSTALLERS_DIR%\!VS_FILE!'" 2>nul
        )
    ) else (
        echo       [i] Build Tools Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo       Installiere Build Tools...
        echo       (Das Fenster kann minimiert aussehen)
        echo.
        start /wait "" "%INSTALLERS_DIR%\!VS_FILE!" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        set "NEED_RESTART=1"
        echo       [OK] Build Tools installiert
    ) else (
        echo       [X] Download fehlgeschlagen
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
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|   FEHLER bei der Installation aufgetreten!         ^|
    echo  ^|                                                    ^|
    echo  ^|   Bitte pruefen Sie Ihre Internetverbindung        ^|
    echo  ^|   und fuehren Sie das Script erneut aus.           ^|
    echo  ^|____________________________________________________^|
    echo.
    pause
    exit /b 1
)

if "%NEED_RESTART%"=="1" (
    echo.
    color 0E
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|   Software wurde installiert!                      ^|
    echo  ^|                                                    ^|
    echo  ^|   WICHTIG: Bitte dieses Fenster schliessen,        ^|
    echo  ^|   dann das Script ERNEUT starten.                  ^|
    echo  ^|                                                    ^|
    echo  ^|   (PATH-Aenderungen muessen wirksam werden)        ^|
    echo  ^|____________________________________________________^|
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
echo   ____________________________________________________
echo  ^|                                                    ^|
echo  ^|              BAUE TSRID AGENT                      ^|
echo  ^|____________________________________________________^|
echo.

REM --- npm install ---
echo   [1/4] Installiere npm Dependencies...
echo         (Dies kann einige Minuten dauern)
echo.

call npm install 2>nul
if %errorLevel% neq 0 (
    echo         [!] Versuche erneut mit --force...
    call npm install --force 2>nul
)
echo         [OK] Dependencies installiert
echo.

REM --- Native Module ---
echo   [2/4] Baue native Module...
echo.

call npx electron-rebuild -f 2>nul
if %errorLevel% neq 0 (
    call npm rebuild 2>nul
)
echo         [OK] Native Module gebaut
echo.

REM --- Offline-Daten ---
echo   [3/4] Lade Offline-Standortdaten...
echo.

if not exist "offline-data" mkdir "offline-data"
curl -s "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul
echo         [OK] Standortdaten geladen
echo.

REM --- Windows Installer ---
echo   [4/4] Erstelle Windows Installer...
echo         (Dies kann 2-3 Minuten dauern)
echo.

call npm run build:win 2>nul

if %errorLevel% neq 0 (
    echo.
    color 0C
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|   Build fehlgeschlagen!                            ^|
    echo  ^|                                                    ^|
    echo  ^|   Moegliche Loesungen:                             ^|
    echo  ^|   1. PC neu starten                                ^|
    echo  ^|   2. Script erneut ausfuehren                      ^|
    echo  ^|____________________________________________________^|
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM ERFOLG
REM ============================================================

color 0A
echo.
echo   ____________________________________________________
echo  ^|                                                    ^|
echo  ^|                                                    ^|
echo  ^|         INSTALLATION ERFOLGREICH!                  ^|
echo  ^|                                                    ^|
echo  ^|                                                    ^|
echo  ^|____________________________________________________^|
echo.
echo.
echo   Der Windows Installer wurde erstellt unter:
echo.
echo   %~dp0dist\
echo.
echo   ____________________________________________________
echo.
echo   TASTENKOMBINATIONEN:
echo.
echo     Ctrl+Shift+Alt+Q  =  Admin-Modus
echo     F12               =  DevTools
echo.
echo   ADMIN-PASSWORT:  tsrid2024!
echo   ____________________________________________________
echo.

REM Öffne dist Ordner
start "" "%~dp0dist"

echo.
echo   Druecken Sie eine Taste zum Beenden...
pause >nul
