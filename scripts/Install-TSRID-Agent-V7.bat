@echo off
:: ============================================================================
:: TSRID Agent V7 - One-Click Installer (mit Remote Control)
:: ============================================================================

echo.
echo ============================================================
echo   TSRID Agent V7 Installer (mit Remote Control)
echo   Passwort fuer "ec": Berlin#2018
echo ============================================================
echo.

runas /user:ec "powershell -ExecutionPolicy Bypass -File \"%~dp0Install-TSRID-Agent-V7.ps1\""

pause
