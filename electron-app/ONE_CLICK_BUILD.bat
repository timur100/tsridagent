@echo off
REM ============================================================
REM TSRID Agent - Automatic Agent Installer v3.0
REM Komplett automatisiert - Ein Klick genuegt!
REM ============================================================

setlocal EnableDelayedExpansion
title TSRID Automatic Agent Installer
mode con: cols=75 lines=50

color 0F
cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
set "ERRORS=0"
set "INSTALLED_SOMETHING=0"
set "SCRIPT_PATH=%~f0"

REM ============================================================
REM HEADER
REM ============================================================

cls
echo.
echo   ========================================================
echo   ^|                                                      ^|
echo   ^|            TSRID AGENT INSTALLER                     ^|
echo   ^|                 Version 3.0                          ^|
echo   ^|                                                      ^|
echo   ^|            Automatic Agent Installer                 ^|
echo   ^|                                                      ^|
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
    echo   ^|                                                      ^|
    echo   ^|   FEHLER: Administratorrechte erforderlich!          ^|
    echo   ^|                                                      ^|
    echo   ^|   Bitte Rechtsklick auf diese Datei und dann:        ^|
    echo   ^|   "Als Administrator ausfuehren" waehlen             ^|
    echo   ^|                                                      ^|
    echo   ========================================================
    echo.
    pause
    exit /b 1
)
echo            [OK] Administratorrechte vorhanden
echo.

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM ============================================================
REM SYSTEM-CHECK MIT FORTSCHRITTSANZEIGE
REM ============================================================

echo   ========================================================
echo   ^|          SYSTEMVORAUSSETZUNGEN PRUEFEN               ^|
echo   ========================================================
echo.

REM --- Node.js ---
echo   [CHECK 1/3] Node.js
set "NODE_OK=0"
set "NODE_PATH_FOUND="

REM Pruefe im PATH
where node >nul 2>&1
if !errorLevel! equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do (
        set "NODE_VER=%%i"
        echo              Status: [OK] !NODE_VER!
        set "NODE_OK=1"
    )
)

REM Pruefe Standard-Pfade falls nicht im PATH
if "!NODE_OK!"=="0" (
    for %%P in (
        "C:\Program Files\nodejs\node.exe"
        "C:\Program Files (x86)\nodejs\node.exe"
    ) do (
        if exist %%P (
            set "NODE_PATH_FOUND=%%~dpP"
            for /f "tokens=*" %%i in ('"%%~P" --version 2^>nul') do (
                set "NODE_VER=%%i"
                echo              Status: [OK] !NODE_VER! (gefunden: %%~dpP)
                set "NODE_OK=1"
            )
        )
    )
)

if "!NODE_OK!"=="0" (
    echo              Status: [X] Nicht installiert
)
echo.

REM --- Python (Erweiterte Erkennung) ---
echo   [CHECK 2/3] Python
set "PYTHON_OK=0"
set "PYTHON_PATH="

REM Methode 1: Pruefe py launcher (Standard unter Windows)
py -3 --version >nul 2>&1
if !errorLevel! equ 0 (
    for /f "tokens=*" %%i in ('py -3 --version 2^>^&1') do (
        echo              Status: [OK] %%i (via py launcher)
        set "PYTHON_OK=1"
        set "PYTHON_PATH=py"
    )
)

REM Methode 2: Pruefe python im PATH
if "!PYTHON_OK!"=="0" (
    where python >nul 2>&1
    if !errorLevel! equ 0 (
        for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
            echo %%i | findstr /C:"Python 3" >nul
            if !errorLevel! equ 0 (
                echo              Status: [OK] %%i
                set "PYTHON_OK=1"
                for /f "tokens=*" %%p in ('where python 2^>nul') do (
                    set "PYTHON_PATH=%%p"
                )
            )
        )
    )
)

REM Methode 3: Pruefe bekannte Installationspfade
if "!PYTHON_OK!"=="0" (
    for %%P in (
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "C:\Python310\python.exe"
        "C:\Program Files\Python312\python.exe"
        "C:\Program Files\Python311\python.exe"
        "C:\Program Files\Python310\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    ) do (
        if exist %%P (
            for /f "tokens=*" %%i in ('"%%~P" --version 2^>^&1') do (
                echo              Status: [OK] %%i (gefunden: %%~P)
                set "PYTHON_OK=1"
                set "PYTHON_PATH=%%~P"
            )
        )
    )
)

if "!PYTHON_OK!"=="0" (
    echo              Status: [X] Nicht installiert
)
echo.

REM --- Visual Studio Build Tools ---
echo   [CHECK 3/3] Visual Studio Build Tools
set "VS_OK=0"

for %%D in (
    "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC"
    "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools\VC"
    "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC"
    "%ProgramFiles%\Microsoft Visual Studio\2019\Community\VC"
    "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC"
    "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC"
) do (
    if exist "%%~D" (
        set "VS_OK=1"
    )
)

REM Alternative: vswhere
if "!VS_OK!"=="0" (
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
        for /f "tokens=*" %%i in ('"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2^>nul') do (
            if exist "%%i\VC" (
                set "VS_OK=1"
            )
        )
    )
)

if "!VS_OK!"=="1" (
    echo              Status: [OK] Installiert
) else (
    echo              Status: [X] Nicht installiert
)
echo.

REM ============================================================
REM ALLE VORAUSSETZUNGEN PRUEFEN
REM ============================================================

if "!NODE_OK!"=="1" if "!PYTHON_OK!"=="1" if "!VS_OK!"=="1" (
    echo   ========================================================
    echo   ^|                                                      ^|
    echo   ^|         ALLE VORAUSSETZUNGEN ERFUELLT!               ^|
    echo   ^|                                                      ^|
    echo   ========================================================
    echo.
    goto :BUILD_APP
)

echo   ========================================================
echo   ^|          INSTALLIERE FEHLENDE SOFTWARE                ^|
echo   ========================================================
echo.

REM --- Node.js installieren ---
if "!NODE_OK!"=="0" (
    echo   [INSTALL 1/3] Node.js 20 LTS
    echo.
    
    set "NODE_VERSION=20.11.0"
    set "NODE_FILE=node-v!NODE_VERSION!-x64.msi"
    set "NODE_URL=https://nodejs.org/dist/v!NODE_VERSION!/!NODE_FILE!"
    
    if not exist "%INSTALLERS_DIR%\!NODE_FILE!" (
        echo              Downloading Node.js...
        echo.
        call :DOWNLOAD_FILE "!NODE_URL!" "%INSTALLERS_DIR%\!NODE_FILE!"
    ) else (
        echo              [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!NODE_FILE!" (
        echo              Installiere Node.js...
        echo              [####                                    ] 10%%
        msiexec /i "%INSTALLERS_DIR%\!NODE_FILE!" /qn /norestart
        echo              [##########                              ] 25%%
        timeout /t 5 /nobreak >nul
        echo              [####################                    ] 50%%
        timeout /t 5 /nobreak >nul
        echo              [##############################          ] 75%%
        timeout /t 5 /nobreak >nul
        echo              [########################################] 100%%
        echo              [OK] Node.js installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo              [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Python installieren ---
if "!PYTHON_OK!"=="0" (
    echo   [INSTALL 2/3] Python 3.12
    echo.
    
    set "PY_VERSION=3.12.2"
    set "PY_FILE=python-!PY_VERSION!-amd64.exe"
    set "PY_URL=https://www.python.org/ftp/python/!PY_VERSION!/!PY_FILE!"
    
    if not exist "%INSTALLERS_DIR%\!PY_FILE!" (
        echo              Downloading Python...
        echo.
        call :DOWNLOAD_FILE "!PY_URL!" "%INSTALLERS_DIR%\!PY_FILE!"
    ) else (
        echo              [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!PY_FILE!" (
        echo              Installiere Python (InstallAllUsers + PATH)...
        echo              [####                                    ] 10%%
        "%INSTALLERS_DIR%\!PY_FILE!" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0 Include_pip=1
        echo              [##########                              ] 25%%
        timeout /t 5 /nobreak >nul
        echo              [####################                    ] 50%%
        timeout /t 10 /nobreak >nul
        echo              [##############################          ] 75%%
        timeout /t 5 /nobreak >nul
        echo              [########################################] 100%%
        echo              [OK] Python installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo              [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
    echo.
)

REM --- Visual Studio Build Tools installieren ---
if "!VS_OK!"=="0" (
    echo   [INSTALL 3/3] Visual Studio Build Tools
    echo.
    echo              HINWEIS: Dies kann 10-20 Minuten dauern!
    echo.
    
    set "VS_FILE=vs_BuildTools.exe"
    set "VS_URL=https://aka.ms/vs/17/release/vs_BuildTools.exe"
    
    if not exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo              Downloading Build Tools...
        echo.
        call :DOWNLOAD_FILE "!VS_URL!" "%INSTALLERS_DIR%\!VS_FILE!"
    ) else (
        echo              [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo              Installiere Build Tools (C++ Workload)...
        echo              [####                                    ] 10%%
        start /wait "" "%INSTALLERS_DIR%\!VS_FILE!" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        echo              [########################################] 100%%
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

if !ERRORS! gtr 0 (
    echo.
    color 0C
    echo   ========================================================
    echo   ^|                                                      ^|
    echo   ^|   FEHLER bei der Installation aufgetreten!           ^|
    echo   ^|                                                      ^|
    echo   ^|   Bitte pruefen Sie Ihre Internetverbindung          ^|
    echo   ^|   und fuehren Sie das Script erneut aus.             ^|
    echo   ^|                                                      ^|
    echo   ========================================================
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM NEUSTART ERFORDERLICH - SKRIPT STARTET SICH SELBST NEU
REM ============================================================

if "!INSTALLED_SOMETHING!"=="1" (
    echo.
    color 0E
    echo   ========================================================
    echo   ^|                                                      ^|
    echo   ^|   Software wurde installiert!                        ^|
    echo   ^|                                                      ^|
    echo   ^|   Das Skript startet automatisch neu, um die         ^|
    echo   ^|   neuen PATH-Einstellungen zu laden...               ^|
    echo   ^|                                                      ^|
    echo   ========================================================
    echo.
    echo   Neustart in 5 Sekunden...
    timeout /t 5 /nobreak >nul
    
    REM Starte Skript in neuem CMD-Prozess mit frischen Umgebungsvariablen
    start "TSRID Installer" cmd /c ""%SCRIPT_PATH%""
    exit /b 0
)

REM ============================================================
REM APP BAUEN
REM ============================================================

:BUILD_APP
color 0B
echo.
echo   ========================================================
echo   ^|              BAUE TSRID AGENT                        ^|
echo   ========================================================
echo.

REM Setze npm Konfiguration fuer native Module
echo   [PREP] Konfiguriere npm fuer native Module...
echo.

REM Finde Python fuer node-gyp
set "NPM_CONFIG_PYTHON="
py -3 --version >nul 2>&1
if !errorLevel! equ 0 (
    for /f "tokens=*" %%p in ('py -3 -c "import sys; print(sys.executable)"') do (
        set "NPM_CONFIG_PYTHON=%%p"
    )
)

if not defined NPM_CONFIG_PYTHON (
    where python >nul 2>&1
    if !errorLevel! equ 0 (
        for /f "tokens=*" %%p in ('where python') do (
            set "NPM_CONFIG_PYTHON=%%p"
        )
    )
)

if not defined NPM_CONFIG_PYTHON (
    for %%P in (
        "C:\Program Files\Python312\python.exe"
        "C:\Program Files\Python311\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) do (
        if exist %%P (
            set "NPM_CONFIG_PYTHON=%%~P"
        )
    )
)

if defined NPM_CONFIG_PYTHON (
    echo              Python fuer node-gyp: !NPM_CONFIG_PYTHON!
    call npm config set python "!NPM_CONFIG_PYTHON!"
) else (
    echo              [!] WARNUNG: Python nicht gefunden!
    echo              Native Module koennten fehlschlagen.
)

REM Setze msvs_version
call npm config set msvs_version 2022
echo              Visual Studio Version: 2022
echo.

REM --- npm install ---
echo   [BUILD 1/4] Installiere npm Dependencies...
echo.
echo              Dies kann einige Minuten dauern...
echo.
echo              [                                        ]   0%%

call npm install 2>&1 | findstr /i "error warn added" > "%TEMP%\npm_output.txt"
set "NPM_RESULT=!errorLevel!"

echo              [########################################] 100%%

if !NPM_RESULT! neq 0 (
    echo.
    echo              [!] Fehler bei npm install - Versuche mit --force...
    call npm install --force 2>&1 | findstr /i "error warn" > "%TEMP%\npm_output.txt"
)

echo              [OK] Dependencies installiert
echo.

REM --- Native Module ---
echo   [BUILD 2/4] Baue native Module (electron-rebuild)...
echo.
echo              Dies kann 2-5 Minuten dauern...
echo.
echo              [                                        ]   0%%

call npx electron-rebuild -f 2>&1 | findstr /i "error building" > "%TEMP%\rebuild_output.txt"

echo              [########################################] 100%%
echo              [OK] Native Module gebaut
echo.

REM --- Offline-Daten ---
echo   [BUILD 3/4] Lade Offline-Standortdaten...
echo.

if not exist "offline-data" mkdir "offline-data"
curl -s "https://tablet-fleet-sync.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul

if exist "offline-data\locations_cache.json" (
    echo              [OK] Standortdaten geladen
) else (
    echo              [i] Keine Standortdaten verfuegbar (wird spaeter geladen)
)
echo.

REM --- Windows Installer ---
echo   [BUILD 4/4] Erstelle Windows Installer...
echo.
echo              Dies kann 5-10 Minuten dauern...
echo.
echo              [                                        ]   0%%

call npm run build:win 2>&1 | findstr /i "error" > "%TEMP%\build_output.txt"
set "BUILD_RESULT=!errorLevel!"

echo              [########################################] 100%%

if !BUILD_RESULT! neq 0 (
    echo.
    color 0C
    echo   ========================================================
    echo   ^|                                                      ^|
    echo   ^|   Build fehlgeschlagen!                              ^|
    echo   ^|                                                      ^|
    echo   ^|   Moegliche Loesungen:                               ^|
    echo   ^|   1. PC neu starten                                  ^|
    echo   ^|   2. Script erneut ausfuehren                        ^|
    echo   ^|   3. Logs pruefen in: %TEMP%\build_output.txt        ^|
    echo   ^|                                                      ^|
    echo   ========================================================
    echo.
    pause
    exit /b 1
)

echo              [OK] Windows Installer erstellt
echo.

REM ============================================================
REM ERFOLG
REM ============================================================

color 0A
echo.
echo   ========================================================
echo   ^|                                                      ^|
echo   ^|                                                      ^|
echo   ^|           INSTALLATION ERFOLGREICH!                  ^|
echo   ^|                                                      ^|
echo   ^|                                                      ^|
echo   ========================================================
echo.
echo.
echo   Der Windows Installer wurde erstellt unter:
echo.
echo   %~dp0dist\
echo.
echo   ========================================================
echo.
echo   TASTENKOMBINATIONEN:
echo.
echo     Ctrl+Shift+Alt+Q  =  Admin-Modus aktivieren
echo     F12               =  Developer Tools
echo.
echo   ADMIN-ZUGANGSDATEN:
echo.
echo     PIN:       3842
echo     Passwort:  tsrid2024!
echo.
echo   ========================================================
echo.

start "" "%~dp0dist"

echo.
echo   Druecken Sie eine Taste zum Beenden...
pause >nul
exit /b 0

REM ============================================================
REM HILFSFUNKTIONEN
REM ============================================================

:DOWNLOAD_FILE
set "DL_URL=%~1"
set "DL_OUTPUT=%~2"
echo              [                                        ]   0%%
curl -L -# -o "%DL_OUTPUT%" "%DL_URL%" 2>&1
if exist "%DL_OUTPUT%" (
    echo              [########################################] 100%%
    echo              [OK] Download abgeschlossen
) else (
    echo              [X] Download fehlgeschlagen
)
goto :eof
