@echo off
REM ============================================================
REM TSRID Agent - Schnellstart (nur App starten)
REM Voraussetzung: SETUP.bat wurde bereits ausgeführt
REM ============================================================

title TSRID Agent
cd /d "%~dp0"

echo.
echo  TSRID Agent wird gestartet...
echo.
echo  Tastenkombinationen:
echo  - Ctrl+Shift+Alt+Q = Admin-Modus
echo  - F12 = DevTools
echo  - Admin-Passwort: tsrid2024!
echo.

npm start
