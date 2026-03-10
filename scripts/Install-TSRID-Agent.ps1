# TSRID Agent Installer Script V2
# Installiert den Agent als Scheduled Task mit SYSTEM-Rechten
# GARANTIERT automatischen Start nach Neustart

param(
    [string]$InstallPath = "C:\TSRID-Agent",
    [string]$ApiUrl = "https://electron-regula-hub.preview.emergentagent.com"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TSRID Agent Installer V2" -ForegroundColor Cyan
Write-Host "   Permanente Installation" -ForegroundColor Cyan
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
    # Fallback: Script aus gleichem Verzeichnis ohne V9
    $scriptSource2 = Join-Path $PSScriptRoot "TSRID-Agent-Service.ps1"
    if (Test-Path $scriptSource2) {
        Copy-Item -Path $scriptSource2 -Destination $scriptDest -Force
    } else {
        Write-Host "[FEHLER] Agent-Script nicht gefunden!" -ForegroundColor Red
        Write-Host "Erwartet: $scriptSource" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[OK] Agent-Script kopiert nach: $scriptDest" -ForegroundColor Green

# ==================== SCHEDULED TASK ENTFERNEN ====================
$taskName = "TSRID-Agent-Service"
Write-Host "[INFO] Pruefe bestehenden Task..."

# Stoppe laufenden Task
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "[INFO] Stoppe und entferne alten Task..."
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# ==================== NEUEN SCHEDULED TASK ERSTELLEN ====================
Write-Host "[INFO] Erstelle neuen Scheduled Task..."

# Action: PowerShell unsichtbar starten
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -File `"$scriptDest`" -ApiUrl `"$ApiUrl`""

# MEHRERE TRIGGER für maximale Zuverlässigkeit:
$triggers = @()

# Trigger 1: Bei Systemstart (mit 1 Minute Verzögerung für Netzwerk)
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggerStartup.Delay = "PT1M"
$triggers += $triggerStartup

# Trigger 2: Bei Anmeldung eines Benutzers
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggers += $triggerLogon

# Principal: Als SYSTEM mit höchster Priorität
$principal = New-ScheduledTaskPrincipal `
    -UserId "NT AUTHORITY\SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Settings: Maximale Zuverlässigkeit
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Days 9999) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -Priority 4

# Task registrieren
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $triggers `
        -Principal $principal `
        -Settings $settings `
        -Description "TSRID Device Agent - Startet automatisch und laeuft permanent" `
        -Force | Out-Null
    
    Write-Host "[OK] Scheduled Task erstellt" -ForegroundColor Green
} catch {
    Write-Host "[FEHLER] Task konnte nicht erstellt werden: $_" -ForegroundColor Red
    exit 1
}

# ==================== ZUSÄTZLICHE ABSICHERUNG: Windows-Dienst ====================
Write-Host "[INFO] Erstelle zusaetzlichen Watchdog..."

# Watchdog-Script erstellen (startet Agent falls er nicht läuft)
$watchdogScript = @"
# TSRID Agent Watchdog - Prueft alle 60 Sekunden ob Agent laeuft
while (`$true) {
    `$agentRunning = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
        `$_.CommandLine -like "*TSRID-Agent-Service*"
    }
    
    if (-not `$agentRunning) {
        # Agent nicht gefunden - Task starten
        Start-ScheduledTask -TaskName "TSRID-Agent-Service" -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 60
}
"@

$watchdogPath = Join-Path $InstallPath "TSRID-Watchdog.ps1"
$watchdogScript | Out-File -FilePath $watchdogPath -Encoding UTF8 -Force

# Watchdog Task erstellen
$watchdogTaskName = "TSRID-Agent-Watchdog"
Unregister-ScheduledTask -TaskName $watchdogTaskName -Confirm:$false -ErrorAction SilentlyContinue

$watchdogAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -File `"$watchdogPath`""

$watchdogTrigger = New-ScheduledTaskTrigger -AtStartup
$watchdogTrigger.Delay = "PT2M"

Register-ScheduledTask `
    -TaskName $watchdogTaskName `
    -Action $watchdogAction `
    -Trigger $watchdogTrigger `
    -Principal $principal `
    -Settings $settings `
    -Description "TSRID Watchdog - Stellt sicher dass Agent immer laeuft" `
    -Force | Out-Null

Write-Host "[OK] Watchdog Task erstellt" -ForegroundColor Green

# ==================== AUTOSTART IN REGISTRY ====================
Write-Host "[INFO] Setze Registry-Autostart als Backup..."

$regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
$regName = "TSRID-Agent"
$regValue = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command `"Start-ScheduledTask -TaskName 'TSRID-Agent-Service'`""

try {
    Set-ItemProperty -Path $regPath -Name $regName -Value $regValue -Force
    Write-Host "[OK] Registry-Autostart gesetzt" -ForegroundColor Green
} catch {
    Write-Host "[WARNUNG] Registry-Eintrag fehlgeschlagen (nicht kritisch)" -ForegroundColor Yellow
}

# ==================== TASKS SOFORT STARTEN ====================
Write-Host "[INFO] Starte Agent und Watchdog..."

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $watchdogTaskName

Start-Sleep -Seconds 3

# ==================== STATUS PRÜFEN ====================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STATUS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$watchdog = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue

if ($task) {
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    Write-Host "Agent Task:    $($task.State)" -ForegroundColor $(if($task.State -eq "Running"){"Green"}else{"Yellow"})
    Write-Host "Letzter Start: $($taskInfo.LastRunTime)" -ForegroundColor Gray
}

if ($watchdog) {
    Write-Host "Watchdog Task: $($watchdog.State)" -ForegroundColor $(if($watchdog.State -eq "Running"){"Green"}else{"Yellow"})
}

# Prüfe ob PowerShell-Prozess läuft
$agentProcess = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -like "*TSRID-Agent*" } catch { $false }
}

if ($agentProcess) {
    Write-Host "Agent Prozess: AKTIV (PID: $($agentProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "Agent Prozess: Wird gestartet..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   INSTALLATION ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Der Agent startet jetzt automatisch bei:"
Write-Host "  - Systemstart (nach 1 Min.)"
Write-Host "  - Benutzeranmeldung"
Write-Host "  - Falls er abstuerzt (Watchdog)"
Write-Host ""
Write-Host "Log-Datei: $env:TEMP\TSRID-Agent.log"
Write-Host ""
Write-Host "Druecken Sie Enter zum Beenden..."
Read-Host
