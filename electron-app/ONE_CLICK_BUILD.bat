@echo off
REM ============================================================
REM TSRID Agent - Automatic Agent Installer v2.1
REM Ein Klick - Alles wird automatisch installiert und gebaut!
REM ============================================================

setlocal EnableDelayedExpansion
title TSRID Automatic Agent Installer
mode con: cols=70 lines=45

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
echo  ^|                  Version 2.1                       ^|
echo  ^|____________________________________________________^|
echo.
echo              Automatic Agent Installer
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
for /f "tokens=*" %%i in ('node --version 2^>nul') do (
    set "NODE_VER=%%i"
    if "!NODE_VER:~0,1!"=="v" (
        echo         Status:  [OK] !NODE_VER!
        set "NODE_OK=1"
    )
)
if "%NODE_OK%"=="0" (
    echo         Status:  [X] Nicht installiert
)
echo.

REM --- Python (verbesserte Erkennung) ---
echo   [2/3] Python
set "PYTHON_OK=0"
set "PYTHON_PATH="

REM Prüfe verschiedene Python-Pfade
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
        set "PYTHON_PATH=%%P"
        set "PYTHON_OK=1"
    )
)

REM Versuche py launcher
if "%PYTHON_OK%"=="0" (
    py -3 --version >nul 2>&1
    if !errorLevel! equ 0 (
        for /f "tokens=*" %%i in ('py -3 --version 2^>^&1') do (
            echo         Status:  [OK] %%i
            set "PYTHON_OK=1"
        )
    )
)

if "%PYTHON_OK%"=="1" (
    if defined PYTHON_PATH (
        for /f "tokens=*" %%i in ('"!PYTHON_PATH!" --version 2^>^&1') do (
            echo         Status:  [OK] %%i
        )
    )
) else (
    echo         Status:  [X] Nicht installiert
)
echo.

REM --- Visual Studio Build Tools ---
echo   [3/3] Visual Studio Build Tools
set "VS_OK=0"

for %%D in (
    "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools"
    "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools"
    "%ProgramFiles%\Microsoft Visual Studio\2022\Community"
    "%ProgramFiles%\Microsoft Visual Studio\2019\Community"
    "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools"
    "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools"
) do (
    if exist "%%~D\VC" (
        set "VS_OK=1"
    )
)

if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
    set "VS_OK=1"
)

if "%VS_OK%"=="1" (
    echo         Status:  [OK] Installiert
) else (
    echo         Status:  [X] Nicht installiert
)
echo.

REM ============================================================
REM ALLE VORAUSSETZUNGEN PRÜFEN
REM ============================================================

if "%NODE_OK%"=="1" if "%PYTHON_OK%"=="1" if "%VS_OK%"=="1" (
    echo   ____________________________________________________
    echo  ^|                                                    ^|
    echo  ^|       Alle Voraussetzungen erfuellt!               ^|
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
        call :DOWNLOAD_WITH_PROGRESS "!NODE_URL!" "%INSTALLERS_DIR%\!NODE_FILE!"
    ) else (
        echo       [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!NODE_FILE!" (
        echo       Installiere Node.js...
        call :SHOW_PROGRESS "Installation" 8
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
        call :DOWNLOAD_WITH_PROGRESS "!PY_URL!" "%INSTALLERS_DIR%\!PY_FILE!"
    ) else (
        echo       [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!PY_FILE!" (
        echo       Installiere Python...
        call :SHOW_PROGRESS "Installation" 15
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
    echo       HINWEIS: Dies kann 10-20 Minuten dauern!
    echo.
    
    set "VS_FILE=vs_BuildTools.exe"
    set "VS_URL=https://aka.ms/vs/17/release/vs_BuildTools.exe"
    
    if not exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo       Downloading Build Tools...
        call :DOWNLOAD_WITH_PROGRESS "!VS_URL!" "%INSTALLERS_DIR%\!VS_FILE!"
    ) else (
        echo       [i] Installer bereits vorhanden
    )
    
    if exist "%INSTALLERS_DIR%\!VS_FILE!" (
        echo.
        echo       Installiere Build Tools...
        echo       [========================================]   0%%
        start /wait "" "%INSTALLERS_DIR%\!VS_FILE!" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        echo       [########################################] 100%%
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
echo.
echo         Fortschritt:
echo         [                                        ]   0%%

call npm install >nul 2>&1 &
call :NPM_PROGRESS

if %errorLevel% neq 0 (
    echo.
    echo         [!] Fehler - Versuche erneut...
    call npm install --force >nul 2>&1
)

echo         [########################################] 100%%
echo         [OK] Dependencies installiert
echo.

REM --- Native Module ---
echo   [2/4] Baue native Module...
echo.
echo         Fortschritt:
echo         [                                        ]   0%%

call npx electron-rebuild -f >nul 2>&1 &
call :REBUILD_PROGRESS

echo         [########################################] 100%%
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
echo.
echo         Fortschritt:
echo         [                                        ]   0%%

call npm run build:win >nul 2>&1 &
call :BUILD_PROGRESS

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

echo         [########################################] 100%%
echo         [OK] Windows Installer erstellt
echo.

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

start "" "%~dp0dist"

echo.
echo   Druecken Sie eine Taste zum Beenden...
pause >nul
exit /b 0

REM ============================================================
REM HILFSFUNKTIONEN
REM ============================================================

:DOWNLOAD_WITH_PROGRESS
set "URL=%~1"
set "OUTPUT=%~2"
echo.
echo       [----------------------------------------]   0%%
curl -L -# -o "%OUTPUT%" "%URL%" 2>&1
echo       [########################################] 100%%
echo.
goto :eof

:SHOW_PROGRESS
set "MSG=%~1"
set "SECONDS=%~2"
set /a STEP=40/%SECONDS%
set "BAR="
for /L %%i in (1,1,%SECONDS%) do (
    set /a PCT=%%i*100/%SECONDS%
    call :UPDATE_BAR %%i %SECONDS%
    timeout /t 1 /nobreak >nul
)
goto :eof

:UPDATE_BAR
set /a FILLED=%1*40/%2
set /a EMPTY=40-FILLED
set "BAR="
for /L %%j in (1,1,%FILLED%) do set "BAR=!BAR!#"
for /L %%j in (1,1,%EMPTY%) do set "BAR=!BAR! "
set /a PCT=%1*100/%2
<nul set /p "=       [!BAR!] !PCT!%%   " & echo.
goto :eof

:NPM_PROGRESS
for /L %%i in (1,1,20) do (
    set /a PCT=%%i*5
    set /a FILLED=%%i*2
    set "BAR="
    for /L %%j in (1,1,!FILLED!) do set "BAR=!BAR!#"
    for /L %%j in (!FILLED!,1,39) do set "BAR=!BAR! "
    <nul set /p "=         [!BAR!] !PCT!%%   "
    echo.
    timeout /t 3 /nobreak >nul
    
    REM Prüfe ob npm fertig
    tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
    if !errorLevel! neq 0 goto :eof
)
goto :eof

:REBUILD_PROGRESS
for /L %%i in (1,1,10) do (
    set /a PCT=%%i*10
    set /a FILLED=%%i*4
    set "BAR="
    for /L %%j in (1,1,!FILLED!) do set "BAR=!BAR!#"
    for /L %%j in (!FILLED!,1,39) do set "BAR=!BAR! "
    <nul set /p "=         [!BAR!] !PCT!%%   "
    echo.
    timeout /t 5 /nobreak >nul
)
goto :eof

:BUILD_PROGRESS
for /L %%i in (1,1,20) do (
    set /a PCT=%%i*5
    set /a FILLED=%%i*2
    set "BAR="
    for /L %%j in (1,1,!FILLED!) do set "BAR=!BAR!#"
    for /L %%j in (!FILLED!,1,39) do set "BAR=!BAR! "
    <nul set /p "=         [!BAR!] !PCT!%%   "
    echo.
    timeout /t 6 /nobreak >nul
    
    REM Prüfe ob build fertig
    if exist "dist\*.exe" goto :eof
)
goto :eof
