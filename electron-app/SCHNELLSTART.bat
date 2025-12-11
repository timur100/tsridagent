@echo off
echo ========================================
echo   TSRID USB Device Manager - Schnellstart
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js ist nicht installiert!
    echo.
    echo Bitte installieren Sie Node.js von: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js gefunden: 
node --version
echo.

REM Check if yarn is installed
where yarn >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Yarn wird installiert...
    call npm install -g yarn
    if %errorlevel% neq 0 (
        echo [FEHLER] Yarn-Installation fehlgeschlagen!
        pause
        exit /b 1
    )
)

echo [OK] Yarn gefunden:
yarn --version
echo.

echo ========================================
echo   Was moechten Sie tun?
echo ========================================
echo.
echo   1. App STARTEN (ohne Build)
echo   2. App BAUEN (.exe erstellen)
echo   3. Dependencies INSTALLIEREN
echo   4. Alles NEU installieren (Clean Install)
echo   5. Beenden
echo.

set /p choice="Ihre Wahl (1-5): "

if "%choice%"=="1" goto start_app
if "%choice%"=="2" goto build_app
if "%choice%"=="3" goto install_deps
if "%choice%"=="4" goto clean_install
if "%choice%"=="5" goto end

echo [FEHLER] Ungueltige Auswahl!
pause
exit /b 1

:install_deps
echo.
echo ========================================
echo   Dependencies werden installiert...
echo ========================================
echo.
call yarn install
if %errorlevel% neq 0 (
    echo [FEHLER] Installation fehlgeschlagen!
    pause
    exit /b 1
)
echo.
echo [ERFOLG] Dependencies installiert!
echo.
pause
goto end

:start_app
echo.
echo ========================================
echo   Dependencies pruefen...
echo ========================================
echo.
if not exist "node_modules\" (
    echo [INFO] Dependencies werden installiert (erstes Mal)...
    call yarn install
    if %errorlevel% neq 0 (
        echo [FEHLER] Installation fehlgeschlagen!
        pause
        exit /b 1
    )
)
echo.
echo ========================================
echo   App wird gestartet...
echo ========================================
echo.
echo [INFO] Die App oeffnet sich automatisch...
echo [INFO] Login: admin@tsrid.com / admin123
echo [INFO] Navigation: R^&D -^> Test Center -^> USB Device Manager
echo.
echo Druecken Sie Strg+C zum Beenden
echo.
call yarn start
goto end

:build_app
echo.
echo ========================================
echo   Dependencies pruefen...
echo ========================================
echo.
if not exist "node_modules\" (
    echo [INFO] Dependencies werden installiert...
    call yarn install
    if %errorlevel% neq 0 (
        echo [FEHLER] Installation fehlgeschlagen!
        pause
        exit /b 1
    )
)
echo.
echo ========================================
echo   Windows .exe wird gebaut...
echo ========================================
echo.
echo [INFO] Dies kann 5-15 Minuten dauern...
echo [INFO] Bitte warten...
echo.
call yarn build:win
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b 1
)
echo.
echo ========================================
echo   BUILD ERFOLGREICH!
echo ========================================
echo.
echo Die fertigen Dateien finden Sie hier:
echo.
echo   dist\TSRID Admin Portal Setup 1.0.0.exe    (Installer)
echo   dist\win-unpacked\TSRID Admin Portal.exe   (Portable)
echo.
echo Moechten Sie den dist-Ordner oeffnen? (J/N)
set /p open_dist=""
if /i "%open_dist%"=="J" start explorer dist
if /i "%open_dist%"=="Y" start explorer dist
echo.
pause
goto end

:clean_install
echo.
echo ========================================
echo   Clean Install wird durchgefuehrt...
echo ========================================
echo.
echo [INFO] Loesche alte Dateien...
if exist "node_modules\" rmdir /s /q node_modules
if exist "dist\" rmdir /s /q dist
if exist "yarn.lock" del /q yarn.lock
echo [OK] Alte Dateien geloescht
echo.
echo [INFO] Installiere Dependencies neu...
call yarn install
if %errorlevel% neq 0 (
    echo [FEHLER] Installation fehlgeschlagen!
    pause
    exit /b 1
)
echo.
echo [ERFOLG] Clean Install abgeschlossen!
echo.
pause
goto end

:end
echo.
echo Auf Wiedersehen!
