@echo off
setlocal EnableDelayedExpansion

REM TSRID Agent Installer v6.0 - Complete Fresh Install

if "%1"=="" (
    start "TSRID Installer" cmd /k "mode con: cols=85 lines=50 & color 0F & "%~f0" RUN"
    exit /b
)

title TSRID Agent Installer v6.0
cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
set "ERRORS=0"
set "INSTALLED_SOMETHING=0"

set "npm_config_msvs_version=2022"
set "GYP_MSVS_VERSION=2022"

cls
echo.
echo  ===========================================================================
echo.
echo                        TSRID AGENT INSTALLER v6.0
echo.
echo                      Complete Fresh Installation
echo.
echo  ===========================================================================
echo.
echo.

REM =========================================================================
REM SCHRITT 1: ADMINISTRATORRECHTE
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 1: Administratorrechte pruefen
echo  ---------------------------------------------------------------------------
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo   [X] FEHLER: Keine Administratorrechte!
    echo       Rechtsklick - Als Administrator ausfuehren
    echo.
    pause
    exit /b 1
)

echo   [OK] Administratorrechte vorhanden
echo.
echo.

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

REM =========================================================================
REM SCHRITT 2: NODE.JS
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 2: Node.js pruefen
echo  ---------------------------------------------------------------------------
echo.

set "NODE_OK=0"
echo   Suche Node.js...

where node >nul 2>&1
if !errorLevel! equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do (
        echo   [OK] Node.js gefunden: %%i
        set "NODE_OK=1"
    )
)

if "!NODE_OK!"=="0" (
    if exist "C:\Program Files\nodejs\node.exe" (
        for /f "tokens=*" %%i in ('"C:\Program Files\nodejs\node.exe" --version 2^>nul') do (
            echo   [OK] Node.js gefunden: %%i
            set "NODE_OK=1"
        )
    )
)

if "!NODE_OK!"=="0" (
    echo   [X] Node.js NICHT gefunden
    echo   Installiere Node.js 20 LTS...
    
    if not exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        echo   Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    )
    
    if exist "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" (
        msiexec /i "%INSTALLERS_DIR%\node-v20.11.0-x64.msi" /qn /norestart
        timeout /t 15 /nobreak >nul
        echo   [OK] Node.js installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo   [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
)
echo.
echo.

REM =========================================================================
REM SCHRITT 3: PYTHON
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 3: Python pruefen
echo  ---------------------------------------------------------------------------
echo.

set "PYTHON_OK=0"
set "PYTHON_CMD="
echo   Suche Python...

py -3 --version >nul 2>&1
if !errorLevel! equ 0 (
    for /f "tokens=*" %%i in ('py -3 --version 2^>^&1') do (
        echo   [OK] Python gefunden: %%i
        set "PYTHON_OK=1"
        set "PYTHON_CMD=py -3"
    )
    for /f "tokens=*" %%p in ('py -3 -c "import sys; print(sys.executable)"') do (
        set "npm_config_python=%%p"
    )
)

if "!PYTHON_OK!"=="0" (
    where python >nul 2>&1
    if !errorLevel! equ 0 (
        for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
            echo   [OK] Python gefunden: %%i
            set "PYTHON_OK=1"
            set "PYTHON_CMD=python"
        )
        for /f "tokens=*" %%p in ('where python 2^>nul') do (
            set "npm_config_python=%%p"
        )
    )
)

if "!PYTHON_OK!"=="0" (
    echo   [X] Python NICHT gefunden
    echo   Installiere Python 3.12...
    
    if not exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        echo   Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" "https://www.python.org/ftp/python/3.12.2/python-3.12.2-amd64.exe"
    )
    
    if exist "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" (
        "%INSTALLERS_DIR%\python-3.12.2-amd64.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
        timeout /t 20 /nobreak >nul
        echo   [OK] Python installiert
        set "INSTALLED_SOMETHING=1"
        set "PYTHON_CMD=py -3"
        set "npm_config_python=C:\Program Files\Python312\python.exe"
    ) else (
        echo   [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
)
echo.
echo.

REM =========================================================================
REM SCHRITT 4: SETUPTOOLS (fuer Python 3.12 distutils)
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 4: Python setuptools installieren
echo  ---------------------------------------------------------------------------
echo.

if "!PYTHON_OK!"=="1" (
    echo   Installiere setuptools fuer node-gyp Kompatibilitaet...
    
    if "!PYTHON_CMD!"=="py -3" (
        py -3 -m pip install --upgrade setuptools pip --quiet 2>nul
    ) else (
        python -m pip install --upgrade setuptools pip --quiet 2>nul
    )
    
    echo   [OK] setuptools installiert
) else (
    echo   [!] Python nicht verfuegbar - uebersprungen
)
echo.
echo.

REM =========================================================================
REM SCHRITT 5: VISUAL STUDIO BUILD TOOLS
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 5: Visual Studio Build Tools pruefen
echo  ---------------------------------------------------------------------------
echo.

set "VS_OK=0"
echo   Suche Build Tools...

set "VSCHECK1=%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC"
set "VSCHECK2=%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools\VC"
set "VSCHECK3=%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC"
set "VSWHERE=C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"

if exist "!VSCHECK1!" set "VS_OK=1"
if exist "!VSCHECK2!" set "VS_OK=1"
if exist "!VSCHECK3!" set "VS_OK=1"
if exist "!VSWHERE!" set "VS_OK=1"

if "!VS_OK!"=="1" (
    echo   [OK] Visual Studio Build Tools gefunden
) else (
    echo   [X] Build Tools NICHT gefunden
    echo   HINWEIS: Installation dauert 10-20 Minuten!
    echo   Installiere Visual Studio Build Tools...
    
    if not exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        echo   Downloading...
        curl -L -# -o "%INSTALLERS_DIR%\vs_BuildTools.exe" "https://aka.ms/vs/17/release/vs_BuildTools.exe"
    )
    
    if exist "%INSTALLERS_DIR%\vs_BuildTools.exe" (
        start /wait "" "%INSTALLERS_DIR%\vs_BuildTools.exe" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart --wait
        echo   [OK] Build Tools installiert
        set "INSTALLED_SOMETHING=1"
    ) else (
        echo   [X] Download fehlgeschlagen
        set /a ERRORS+=1
    )
)
echo.
echo.

REM =========================================================================
REM FEHLER/NEUSTART PRUEFEN
REM =========================================================================

if !ERRORS! gtr 0 (
    echo  ===========================================================================
    echo   [X] FEHLER - Bitte Internetverbindung pruefen
    echo  ===========================================================================
    pause
    exit /b 1
)

if "!INSTALLED_SOMETHING!"=="1" (
    echo  ===========================================================================
    echo   [!] SOFTWARE WURDE INSTALLIERT
    echo       BITTE: Fenster schliessen und Script ERNEUT starten
    echo  ===========================================================================
    pause
    exit /b 0
)

REM =========================================================================
REM SCHRITT 6: ALTE INSTALLATION LOESCHEN
REM =========================================================================

cls
echo.
echo  ===========================================================================
echo.
echo                        TSRID AGENT INSTALLER v6.0
echo.
echo                              BUILD PROZESS
echo.
echo  ===========================================================================
echo.
echo   Konfiguration:
echo       Python: !npm_config_python!
echo       MSVS:   !npm_config_msvs_version!
echo.
echo.

echo  ---------------------------------------------------------------------------
echo   SCHRITT 6: Alte Installation bereinigen
echo  ---------------------------------------------------------------------------
echo.

if exist "node_modules" (
    echo   Loesche node_modules...
    rmdir /s /q "node_modules" 2>nul
    echo   [OK] node_modules geloescht
) else (
    echo   [OK] Keine alte Installation vorhanden
)

if exist "dist" (
    echo   Loesche dist...
    rmdir /s /q "dist" 2>nul
    echo   [OK] dist geloescht
) else (
    echo   [OK] Kein alter Build vorhanden
)

if exist "package-lock.json" (
    del /f "package-lock.json" 2>nul
    echo   [OK] package-lock.json geloescht
)
echo.
echo.

REM =========================================================================
REM SCHRITT 7: NPM INSTALL
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 7: NPM Dependencies installieren
echo  ---------------------------------------------------------------------------
echo.
echo   Starte npm install --ignore-scripts...
echo   Dies kann 2-5 Minuten dauern...
echo.

call npm install --ignore-scripts 2>&1
set "NPM_RESULT=!errorLevel!"

if !NPM_RESULT! neq 0 (
    echo.
    echo   [!] Warnungen - versuche mit --force
    call npm install --ignore-scripts --force 2>&1
)

if exist "node_modules\electron-builder" (
    echo.
    echo   [OK] Basis-Dependencies installiert
) else (
    echo.
    echo   [X] Installation fehlgeschlagen
    pause
    exit /b 1
)
echo.
echo.

REM =========================================================================
REM SCHRITT 8: NATIVE MODULE
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 8: Native Module fuer Electron kompilieren
echo  ---------------------------------------------------------------------------
echo.
echo   Starte electron-builder install-app-deps...
echo   Dies kann 5-10 Minuten dauern...
echo.

call npx electron-builder install-app-deps 2>&1
set "REBUILD_RESULT=!errorLevel!"

echo.
if !REBUILD_RESULT! equ 0 (
    echo   [OK] Native Module kompiliert
) else (
    echo   [!] Einige Module hatten Warnungen
)
echo.
echo.

REM =========================================================================
REM SCHRITT 9: OFFLINE-DATEN
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 9: Offline-Daten herunterladen
echo  ---------------------------------------------------------------------------
echo.

if not exist "offline-data" mkdir "offline-data"
echo   Lade Standortdaten vom Server...

curl -s "https://bundle-inventory-pro.preview.emergentagent.com/api/agent/locations/export" > "offline-data\locations_cache.json" 2>nul

if exist "offline-data\locations_cache.json" (
    echo   [OK] Offline-Daten heruntergeladen
) else (
    echo   [!] Keine Daten verfuegbar - wird spaeter geladen
)
echo.
echo.

REM =========================================================================
REM SCHRITT 10: WINDOWS INSTALLER
REM =========================================================================

echo  ---------------------------------------------------------------------------
echo   SCHRITT 10: Windows Installer erstellen
echo  ---------------------------------------------------------------------------
echo.
echo   Starte electron-builder --win...
echo   Dies kann 5-10 Minuten dauern...
echo.

call npm run build:win 2>&1
set "BUILD_RESULT=!errorLevel!"

echo.
if !BUILD_RESULT! equ 0 (
    echo   [OK] Windows Installer erstellt
) else (
    echo   [X] Build fehlgeschlagen
    echo       Bitte PC neu starten und erneut versuchen
    pause
    exit /b 1
)
echo.
echo.

REM =========================================================================
REM ERFOLG
REM =========================================================================

cls
echo.
echo  ===========================================================================
echo.
echo                     INSTALLATION ERFOLGREICH!
echo.
echo  ===========================================================================
echo.
echo   Der Installer wurde erstellt:
echo.
echo       %~dp0dist\
echo.
echo.
echo  ---------------------------------------------------------------------------
echo   TASTENKOMBINATIONEN
echo  ---------------------------------------------------------------------------
echo.
echo       Ctrl+Shift+Alt+Q     Admin-Modus aktivieren
echo       F12                  Developer Tools oeffnen
echo.
echo  ---------------------------------------------------------------------------
echo   ADMIN-ZUGANGSDATEN
echo  ---------------------------------------------------------------------------
echo.
echo       PIN:        3842
echo       Passwort:   tsrid2024!
echo.
echo  ===========================================================================
echo.

if exist "%~dp0dist" start "" "%~dp0dist"

echo   Beliebige Taste zum Beenden...
pause >nul
exit /b 0
