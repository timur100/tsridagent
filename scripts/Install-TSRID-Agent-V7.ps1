# ============================================================================
# TSRID Agent Installer V7 - MIT REMOTE CONTROL
# ============================================================================

$TSRID_DIR = "C:\TSRID"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TSRID Agent Installer V7 (mit Remote Control)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verzeichnis erstellen
Write-Host "[1/4] Erstelle Verzeichnis..." -ForegroundColor Yellow
if (-not (Test-Path $TSRID_DIR)) { New-Item -Path $TSRID_DIR -ItemType Directory -Force | Out-Null }
Write-Host "      OK: $TSRID_DIR" -ForegroundColor Green

# Agent-Service-Script mit Remote Control erstellen
Write-Host "[2/4] Erstelle Agent-Script mit Remote Control..." -ForegroundColor Yellow

$AgentScript = @'
# ============================================================================
# TSRID Agent Service V7 - MIT REMOTE CONTROL
# ============================================================================

$API = "https://tablet-mgmt.preview.emergentagent.com/api/device-agent"
$HEARTBEAT_INTERVAL = 60
$LOG = "C:\TSRID\agent.log"
$CONFIG_FILE = "C:\TSRID\config.json"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# === LOGGING ===
function Log($M, $L = "INFO") { 
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$L] $M"
    Add-Content -Path $LOG -Value $line -EA 0
    if ($L -eq "ERROR") { Write-Host $line -ForegroundColor Red }
}

# === DEVICE ID ===
function Get-DeviceId {
    $uuid = (Get-WmiObject Win32_ComputerSystemProduct).UUID
    return "$env:COMPUTERNAME-$uuid"
}

# === API AUFRUFE ===
function Send-ToApi($Endpoint, $Data) {
    try {
        $json = $Data | ConvertTo-Json -Depth 10 -Compress
        $response = Invoke-RestMethod -Uri "$API/$Endpoint" -Method POST -Body $json -ContentType "application/json" -TimeoutSec 30
        return $response
    } catch {
        Log "API Fehler ($Endpoint): $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Get-FromApi($Endpoint) {
    try {
        $response = Invoke-RestMethod -Uri "$API/$Endpoint" -Method GET -ContentType "application/json" -TimeoutSec 30
        return $response
    } catch {
        Log "API GET Fehler ($Endpoint): $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# === HARDWARE SAMMELN ===
function Get-HardwareInfo {
    $hw = @{}
    try { $p = Get-WmiObject Win32_ComputerSystemProduct; $hw.uuid = $p.UUID; $hw.vendor = $p.Vendor; $hw.model = $p.Name } catch {}
    try { $hw.bios_serial = (Get-WmiObject Win32_BIOS).SerialNumber } catch {}
    try { $hw.mainboard_serial = (Get-WmiObject Win32_BaseBoard).SerialNumber } catch {}
    try { $c = Get-WmiObject Win32_Processor; $hw.cpu = $c.Name; $hw.cpu_cores = $c.NumberOfCores; $hw.cpu_threads = $c.NumberOfLogicalProcessors } catch {}
    try { $hw.ram_gb = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory/1GB, 2) } catch {}
    try { $d = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"; $hw.disks = "C: $([math]::Round($d.Size/1GB))GB" } catch {}
    try { $hw.windows_version = (Get-WmiObject Win32_OperatingSystem).Caption; $hw.windows_build = (Get-WmiObject Win32_OperatingSystem).BuildNumber } catch {}
    try { $a = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled } | Select-Object -First 1; $hw.ip_address = ($a.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })[0]; $hw.mac_address = $a.MACAddress } catch {}
    try { @("HKLM:\SOFTWARE\TeamViewer", "HKLM:\SOFTWARE\WOW6432Node\TeamViewer") | ForEach-Object { if (Test-Path $_) { $x = (Get-ItemProperty $_ -EA 0).ClientID; if ($x) { $hw.teamviewer_id = [string]$x } } } } catch {}
    return $hw
}

# === PROZESS STATUS ===
function Get-ProcessStatus {
    $tv = if (Get-Process -Name "TeamViewer" -EA 0) { "running" } else { "stopped" }
    $ts = if (Get-Process -Name "tsrid" -EA 0) { "running" } else { "stopped" }
    return @{ tv = $tv; tsrid = $ts }
}

# === REMOTE BEFEHLE AUSFUEHREN ===
function Execute-RemoteCommand($cmd) {
    $command = $cmd.command
    $params = $cmd.params
    $commandId = $cmd.command_id
    
    Log "Fuehre Remote-Befehl aus: $command (ID: $commandId)"
    
    $result = @{
        device_id = $global:deviceId
        command_id = $commandId
        success = $false
        output = ""
        error = ""
    }
    
    try {
        switch ($command) {
            "restart_agent" {
                Log "Agent wird neugestartet..."
                $result.output = "Agent wird neugestartet"
                $result.success = $true
                # Ergebnis senden bevor Neustart
                Send-ToApi "remote/result" $result | Out-Null
                # Agent neustarten via Scheduled Task
                Stop-ScheduledTask -TaskName "TSRID-Agent" -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Start-ScheduledTask -TaskName "TSRID-Agent"
                exit 0
            }
            
            "restart_pc" {
                Log "PC wird neugestartet..."
                $result.output = "PC wird neugestartet"
                $result.success = $true
                Send-ToApi "remote/result" $result | Out-Null
                shutdown /r /t 30 /c "TSRID Remote: PC wird neugestartet"
            }
            
            "shutdown_pc" {
                Log "PC wird heruntergefahren..."
                $result.output = "PC wird heruntergefahren"
                $result.success = $true
                Send-ToApi "remote/result" $result | Out-Null
                shutdown /s /t 30 /c "TSRID Remote: PC wird heruntergefahren"
            }
            
            "message" {
                $text = $params.text
                Log "Zeige Nachricht: $text"
                try {
                    # msg.exe sendet Nachricht an alle Benutzer-Sessions
                    $msgResult = msg * /TIME:120 "$text" 2>&1
                    $result.output = "Nachricht gesendet"
                    $result.success = $true
                } catch {
                    $result.error = $_.Exception.Message
                    $result.success = $false
                }
            }
            
            "update_config" {
                Log "Aktualisiere Konfiguration..."
                $newConfig = $params
                
                # Config speichern
                $newConfig | ConvertTo-Json | Out-File $CONFIG_FILE -Encoding UTF8 -Force
                
                # Heartbeat-Intervall aktualisieren wenn angegeben
                if ($newConfig.heartbeat_interval) {
                    $global:HEARTBEAT_INTERVAL = $newConfig.heartbeat_interval
                    Log "Heartbeat-Intervall auf $($newConfig.heartbeat_interval) Sekunden gesetzt"
                }
                
                $result.output = "Konfiguration aktualisiert: $($newConfig | ConvertTo-Json -Compress)"
                $result.success = $true
            }
            
            "run_script" {
                $script = $params.script
                Log "Fuehre PowerShell-Script aus: $script"
                
                try {
                    $scriptOutput = Invoke-Expression $script 2>&1
                    $result.output = $scriptOutput | Out-String
                    $result.success = $true
                    Log "Script-Ausgabe: $($result.output)"
                } catch {
                    $result.error = $_.Exception.Message
                    $result.success = $false
                    Log "Script-Fehler: $($result.error)" "ERROR"
                }
            }
            
            "screenshot" {
                Log "Erstelle Screenshot..."
                try {
                    Add-Type -AssemblyName System.Windows.Forms
                    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
                    $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
                    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
                    $screenshotPath = "C:\TSRID\screenshot_$(Get-Date -Format 'yyyyMMdd_HHmmss').png"
                    $bitmap.Save($screenshotPath)
                    $graphics.Dispose()
                    $bitmap.Dispose()
                    $result.output = "Screenshot gespeichert: $screenshotPath"
                    $result.success = $true
                } catch {
                    $result.error = $_.Exception.Message
                    $result.success = $false
                }
            }
            
            default {
                $result.error = "Unbekannter Befehl: $command"
                Log "Unbekannter Befehl: $command" "ERROR"
            }
        }
    } catch {
        $result.error = $_.Exception.Message
        $result.success = $false
        Log "Fehler bei Befehl $command : $($_.Exception.Message)" "ERROR"
    }
    
    # Ergebnis an Server senden
    Send-ToApi "remote/result" $result | Out-Null
    
    return $result
}

# === AUSSTEHENDE BEFEHLE PRUEFEN ===
function Check-PendingCommands {
    $response = Get-FromApi "remote/commands/$global:deviceId"
    
    if ($response -and $response.success -and $response.commands -and $response.commands.Count -gt 0) {
        Log "Empfangen: $($response.commands.Count) ausstehende Befehle"
        
        foreach ($cmd in $response.commands) {
            Execute-RemoteCommand $cmd
        }
    }
}

# === CONFIG LADEN ===
function Load-Config {
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
            if ($config.heartbeat_interval) {
                $global:HEARTBEAT_INTERVAL = $config.heartbeat_interval
            }
            Log "Konfiguration geladen: Heartbeat=$($global:HEARTBEAT_INTERVAL)s"
        } catch {
            Log "Fehler beim Laden der Konfiguration" "ERROR"
        }
    }
}

# ============================================================================
# HAUPTPROGRAMM
# ============================================================================

Log "=== TSRID Agent V7 gestartet (mit Remote Control) ==="

# Warte auf Netzwerk
$timeout = 120
while ($timeout -gt 0) {
    $net = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -and $_.IPAddress }
    if ($net) { break }
    Log "Warte auf Netzwerk..."
    Start-Sleep -Seconds 5
    $timeout -= 5
}

# Config laden
Load-Config

# Hardware sammeln
$hw = Get-HardwareInfo
$global:deviceId = Get-DeviceId
Log "Device ID: $global:deviceId"

# Registrieren
$status = Get-ProcessStatus
$regData = @{
    device_id = $global:deviceId
    computername = $env:COMPUTERNAME
    uuid = $hw.uuid
    bios_serial = $hw.bios_serial
    mainboard_serial = $hw.mainboard_serial
    teamviewer_id = $hw.teamviewer_id
    manufacturer = $hw.vendor
    model = $hw.model
    cpu = $hw.cpu
    cpu_cores = $hw.cpu_cores
    cpu_threads = $hw.cpu_threads
    ram_gb = $hw.ram_gb
    ip_address = $hw.ip_address
    mac_address = $hw.mac_address
    windows_version = $hw.windows_version
    windows_build = $hw.windows_build
    disks = $hw.disks
    teamviewer_status = $status.tv
    tsrid_status = $status.tsrid
}

$reg = Send-ToApi "register" $regData
if ($reg.success) { 
    Log "Registrierung OK" 
} else { 
    Log "Registrierung fehlgeschlagen" "ERROR"
    exit 1 
}

# Heartbeat Loop mit Remote-Befehls-Pruefung
Log "Starte Heartbeat-Schleife (Intervall: $HEARTBEAT_INTERVAL Sek.)"

while ($true) {
    $status = Get-ProcessStatus
    
    $hbData = @{
        device_id = $global:deviceId
        computername = $env:COMPUTERNAME
        uuid = $hw.uuid
        bios_serial = $hw.bios_serial
        teamviewer_id = $hw.teamviewer_id
        ip_address = $hw.ip_address
        teamviewer_status = $status.tv
        tsrid_status = $status.tsrid
    }
    
    $hbResponse = Send-ToApi "heartbeat" $hbData
    
    if ($hbResponse.success) { 
        Log "Heartbeat OK (TV:$($status.tv) TSRID:$($status.tsrid))"
        
        # Prüfe auf ausstehende Remote-Befehle aus Heartbeat-Response
        if ($hbResponse.commands -and $hbResponse.commands.Count -gt 0) {
            Log "Empfangen: $($hbResponse.commands.Count) Befehle aus Heartbeat"
            foreach ($cmd in $hbResponse.commands) {
                Execute-RemoteCommand $cmd
            }
        }
        
        # Prüfe auf neue Konfiguration
        if ($hbResponse.pending_config) {
            Log "Neue Konfiguration empfangen"
            $hbResponse.pending_config | ConvertTo-Json | Out-File $CONFIG_FILE -Encoding UTF8 -Force
            if ($hbResponse.pending_config.heartbeat_interval) {
                $global:HEARTBEAT_INTERVAL = $hbResponse.pending_config.heartbeat_interval
            }
        }
    }
    
    Start-Sleep -Seconds $HEARTBEAT_INTERVAL
}
'@

$AgentScript | Out-File "$TSRID_DIR\TSRID-Agent-Service.ps1" -Encoding UTF8 -Force
Write-Host "      OK: Agent-Script erstellt" -ForegroundColor Green

# Scheduled Task erstellen
Write-Host "[3/4] Erstelle Scheduled Task..." -ForegroundColor Yellow

# Alten Task entfernen
Unregister-ScheduledTask -TaskName "TSRID-Agent" -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File C:\TSRID\TSRID-Agent-Service.ps1"
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT2M"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartInterval (New-TimeSpan -Minutes 5) -RestartCount 3
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest -LogonType ServiceAccount
Register-ScheduledTask -TaskName "TSRID-Agent" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "      OK: Scheduled Task erstellt" -ForegroundColor Green

# Agent starten
Write-Host "[4/4] Starte Agent..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "TSRID-Agent"
Start-Sleep -Seconds 3
Write-Host "      OK: Agent gestartet" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  INSTALLATION ERFOLGREICH!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Remote Control Features:" -ForegroundColor Cyan
Write-Host "  - Agent neustarten" -ForegroundColor White
Write-Host "  - PC neustarten / herunterfahren" -ForegroundColor White
Write-Host "  - Nachrichten anzeigen" -ForegroundColor White
Write-Host "  - Konfiguration aendern" -ForegroundColor White
Write-Host "  - PowerShell-Scripts ausfuehren" -ForegroundColor White
Write-Host "  - Screenshots erstellen" -ForegroundColor White
Write-Host ""
Write-Host "  Log-Datei: C:\TSRID\agent.log" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 5
