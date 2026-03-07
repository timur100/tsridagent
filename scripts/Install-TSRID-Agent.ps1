# TSRID Agent Installer Script
# Installiert den Agent als Scheduled Task mit SYSTEM-Rechten

param(
    [string]$InstallPath = "C:\TSRID-Agent",
    [string]$ApiUrl = "https://tsrid-management.preview.emergentagent.com"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TSRID Agent Installer V9" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe Admin-Rechte
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[FEHLER] Dieses Script benoetigt Administrator-Rechte!" -ForegroundColor Red
    Write-Host "Bitte als Administrator ausfuehren." -ForegroundColor Yellow
    Read-Host "Druecken Sie Enter zum Beenden"
    exit 1
}

Write-Host "[OK] Admin-Rechte vorhanden" -ForegroundColor Green

# Installationsverzeichnis erstellen
Write-Host "[INFO] Erstelle Installationsverzeichnis: $InstallPath"
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# Agent-Script kopieren
$scriptSource = Join-Path $PSScriptRoot "TSRID-Agent-Service-V9.ps1"
$scriptDest = Join-Path $InstallPath "TSRID-Agent-Service.ps1"

if (Test-Path $scriptSource) {
    Write-Host "[INFO] Kopiere Agent-Script..."
    Copy-Item -Path $scriptSource -Destination $scriptDest -Force
} else {
    Write-Host "[FEHLER] Agent-Script nicht gefunden: $scriptSource" -ForegroundColor Red
    exit 1
}

# Alten Scheduled Task entfernen
$taskName = "TSRID-Agent-Service"
Write-Host "[INFO] Pruefe bestehenden Task..."
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "[INFO] Entferne alten Task..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Neuen Scheduled Task erstellen
Write-Host "[INFO] Erstelle Scheduled Task..."

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptDest`" -ApiUrl `"$ApiUrl`""

# Trigger: Bei Systemstart mit 2 Minuten Verzoegerung
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT2M"  # 2 Minuten Verzoegerung

# Als SYSTEM ausfuehren mit hoechster Prioritaet
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Task-Einstellungen
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Task registrieren
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "TSRID Device Agent Service - Sendet Geraetestatus und empfaengt Remote-Befehle"

Write-Host "[OK] Scheduled Task erstellt" -ForegroundColor Green

# Task sofort starten
Write-Host "[INFO] Starte Agent..."
Start-ScheduledTask -TaskName $taskName

Start-Sleep -Seconds 3

# Status pruefen
$task = Get-ScheduledTask -TaskName $taskName
if ($task.State -eq "Running") {
    Write-Host "[OK] Agent laeuft!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Task-Status: $($task.State)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Installation abgeschlossen!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Der Agent wird bei jedem Systemstart automatisch gestartet."
Write-Host "Log-Datei: $env:TEMP\TSRID-Agent.log"
Write-Host ""
Write-Host "Druecken Sie Enter zum Beenden..."
Read-Host
