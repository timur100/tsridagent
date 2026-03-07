@echo off
REM TSRID Agent Installer - Klicken Sie doppelt auf diese Datei
REM Startet die Installation mit Admin-Rechten

echo ===========================================
echo    TSRID Agent Installer V9
echo ===========================================
echo.

REM Pruefe ob als Admin gestartet
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Admin-Rechte vorhanden
    goto :install
) else (
    echo [INFO] Admin-Rechte erforderlich...
    echo.
)

REM Mit runas als User "ec" neu starten
echo Starte mit Benutzer 'ec'...
runas /user:ec "powershell.exe -ExecutionPolicy Bypass -File \"%~dp0Install-TSRID-Agent.ps1\""
if %errorLevel% == 0 (
    echo [OK] Installation gestartet
) else (
    echo [FEHLER] Installation fehlgeschlagen
    echo Versuche manuell: Rechtsklick - Als Administrator ausfuehren
)
goto :end

:install
echo Starte PowerShell Installer...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Install-TSRID-Agent.ps1"

:end
echo.
echo Druecken Sie eine Taste zum Beenden...
pause >nul
