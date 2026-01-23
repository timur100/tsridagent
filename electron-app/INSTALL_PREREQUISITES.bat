@echo off
REM ============================================================
REM TSRID Agent - Voraussetzungen installieren
REM Installiert Node.js, Python und Build Tools
REM MUSS ALS ADMINISTRATOR AUSGEFUEHRT WERDEN!
REM ============================================================

title TSRID - Voraussetzungen installieren
color 0B

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║      TSRID - Voraussetzungen installieren             ║
echo  ║                                                       ║
echo  ║  Dieses Script installiert:                           ║
echo  ║  [1] Node.js 20 LTS                                   ║
echo  ║  [2] Python 3.12                                      ║
echo  ║  [3] Visual Studio Build Tools                        ║
echo  ║                                                       ║
echo  ║  WICHTIG: Als Administrator ausfuehren!               ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

REM Administrator-Pruefung
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo  [FEHLER] Bitte als Administrator ausfuehren!
    echo.
    echo  Rechtsklick auf diese Datei ^> "Als Administrator ausfuehren"
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
set "INSTALLERS_DIR=%~dp0installers"
if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

echo  Pruefe installierte Software...
echo.

REM ============================================================
REM NODE.JS
REM ============================================================

echo  [1/3] Node.js
where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do (
        echo        Status: Installiert ^(%%i^)
        echo        [SKIP]
    )
) else (
    echo        Status: Nicht installiert
    echo        Aktion: Installiere Node.js 20 LTS...
    
    set "NODE_MSI=node-v20.11.0-x64.msi"
    set "NODE_URL=https://nodejs.org/dist/v20.11.0/!NODE_MSI!"
    
    if not exist "%INSTALLERS_DIR%\!NODE_MSI!" (
        echo        Download...
        curl -L -o "%INSTALLERS_DIR%\!NODE_MSI!" "!NODE_URL!" --progress-bar
    )
    
    echo        Installiere...
    msiexec /i "%INSTALLERS_DIR%\!NODE_MSI!" /qn /norestart
    timeout /t 5 /nobreak >nul
    echo        [OK] Node.js installiert
)
echo.

REM ============================================================
REM PYTHON
REM ============================================================

echo  [2/3] Python
where python >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do (
        echo        Status: Installiert ^(%%i^)
        echo        [SKIP]
    )
) else (
    echo        Status: Nicht installiert
    echo        Aktion: Installiere Python 3.12...
    
    set "PYTHON_EXE=python-3.12.2-amd64.exe"
    set "PYTHON_URL=https://www.python.org/ftp/python/3.12.2/!PYTHON_EXE!"
    
    if not exist "%INSTALLERS_DIR%\!PYTHON_EXE!" (
        echo        Download...
        curl -L -o "%INSTALLERS_DIR%\!PYTHON_EXE!" "!PYTHON_URL!" --progress-bar
    )
    
    echo        Installiere (kann 1-2 Minuten dauern)...
    "%INSTALLERS_DIR%\!PYTHON_EXE!" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    timeout /t 15 /nobreak >nul
    echo        [OK] Python installiert
)
echo.

REM ============================================================
REM VISUAL STUDIO BUILD TOOLS
REM ============================================================

echo  [3/3] Visual Studio Build Tools

set "VS_FOUND=0"
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" set "VS_FOUND=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools" set "VS_FOUND=1"
if exist "%ProgramFiles%\Microsoft Visual Studio\2019\BuildTools" set "VS_FOUND=1"

if "%VS_FOUND%"=="1" (
    echo        Status: Installiert
    echo        [SKIP]
) else (
    echo        Status: Nicht installiert
    echo        Aktion: Installiere Build Tools...
    echo.
    echo        HINWEIS: Dies oeffnet den Visual Studio Installer.
    echo        Bitte waehlen Sie "Desktop development with C++"
    echo        und klicken Sie auf "Installieren".
    echo.
    
    set "VS_EXE=vs_BuildTools.exe"
    set "VS_URL=https://aka.ms/vs/17/release/vs_BuildTools.exe"
    
    if not exist "%INSTALLERS_DIR%\!VS_EXE!" (
        echo        Download Build Tools Installer...
        curl -L -o "%INSTALLERS_DIR%\!VS_EXE!" "!VS_URL!" --progress-bar
    )
    
    echo.
    echo        Starte Installer...
    echo        Bitte "Desktop development with C++" auswaehlen!
    echo.
    start /wait "" "%INSTALLERS_DIR%\!VS_EXE!" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart
    
    echo        [OK] Build Tools Installation gestartet
)
echo.

REM ============================================================
REM ABSCHLUSS
REM ============================================================

echo  ════════════════════════════════════════════════════════
echo.
echo  Installation abgeschlossen!
echo.
echo  WICHTIG: Bitte das Terminal schliessen und neu oeffnen,
echo           damit die PATH-Aenderungen wirksam werden.
echo.
echo  Danach: ONE_CLICK_BUILD.bat ausfuehren
echo.
echo  ════════════════════════════════════════════════════════
echo.

pause
