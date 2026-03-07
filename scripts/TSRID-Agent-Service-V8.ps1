# ============================================================================
# TSRID Agent Service V8 - ECHTZEIT REMOTE CONTROL
# ============================================================================

$API = "https://tsrid-management.preview.emergentagent.com/api/device-agent"
$HEARTBEAT_INTERVAL = 60
$COMMAND_CHECK_INTERVAL = 5  # Alle 5 Sekunden nach Befehlen fragen
$LOG = "C:\TSRID\agent.log"
$CONFIG_FILE = "C:\TSRID\config.json"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# === LOGGING ===
function Log($M, $L = "INFO") { 
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$L] $M"
    Add-Content -Path $LOG -Value $line -EA 0
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
        $response = Invoke-RestMethod -Uri "$API/$Endpoint" -Method GET -ContentType "application/json" -TimeoutSec 10
        return $response
    } catch {
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
    
    Log ">>> Fuehre Befehl aus: $command (ID: $commandId)"
    
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
                Send-ToApi "remote/result" $result | Out-Null
                Stop-ScheduledTask -TaskName "TSRID-Agent" -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Start-ScheduledTask -TaskName "TSRID-Agent"
                exit 0
            }
            
            "restart_pc" {
                Log "PC wird neugestartet..."
                $result.output = "PC wird in 30 Sekunden neugestartet"
                $result.success = $true
                Send-ToApi "remote/result" $result | Out-Null
                shutdown /r /t 30 /c "TSRID Remote: PC wird neugestartet"
            }
            
            "shutdown_pc" {
                Log "PC wird heruntergefahren..."
                $result.output = "PC wird in 30 Sekunden heruntergefahren"
                $result.success = $true
                Send-ToApi "remote/result" $result | Out-Null
                shutdown /s /t 30 /c "TSRID Remote: PC wird heruntergefahren"
            }
            
            "message" {
                $text = $params.text
                Log "Zeige Nachricht: $text"
                try {
                    msg * /TIME:120 "$text" 2>&1
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
                $newConfig | ConvertTo-Json | Out-File $CONFIG_FILE -Encoding UTF8 -Force
                if ($newConfig.heartbeat_interval) {
                    $global:HEARTBEAT_INTERVAL = $newConfig.heartbeat_interval
                }
                $result.output = "Konfiguration aktualisiert"
                $result.success = $true
            }
            
            "run_script" {
                $script = $params.script
                Log "Fuehre Script aus: $script"
                try {
                    $scriptOutput = Invoke-Expression $script 2>&1
                    $result.output = $scriptOutput | Out-String
                    $result.success = $true
                } catch {
                    $result.error = $_.Exception.Message
                    $result.success = $false
                }
            }
            
            "screenshot" {
                Log "Erstelle Screenshot..."
                try {
                    Add-Type -AssemblyName System.Windows.Forms
                    Add-Type -AssemblyName System.Drawing
                    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
                    $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
                    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
                    $screenshotPath = "C:\TSRID\screenshot_$(Get-Date -Format 'yyyyMMdd_HHmmss').png"
                    $bitmap.Save($screenshotPath)
                    $graphics.Dispose()
                    $bitmap.Dispose()
                    $result.output = "Screenshot: $screenshotPath"
                    $result.success = $true
                } catch {
                    $result.error = $_.Exception.Message
                    $result.success = $false
                }
            }
            
            default {
                $result.error = "Unbekannter Befehl: $command"
            }
        }
    } catch {
        $result.error = $_.Exception.Message
        $result.success = $false
        Log "Fehler bei $command : $($_.Exception.Message)" "ERROR"
    }
    
    # Ergebnis senden
    Send-ToApi "remote/result" $result | Out-Null
    Log "<<< Befehl $command abgeschlossen (Erfolg: $($result.success))"
}

# ============================================================================
# HAUPTPROGRAMM
# ============================================================================

Log "=== TSRID Agent V8 (ECHTZEIT) gestartet ==="

# Warte auf Netzwerk
$timeout = 120
while ($timeout -gt 0) {
    $net = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -and $_.IPAddress }
    if ($net) { break }
    Start-Sleep -Seconds 5
    $timeout -= 5
}

# Hardware und Device ID
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
if ($reg.success) { Log "Registrierung OK" } else { Log "Registrierung fehlgeschlagen" "ERROR"; exit 1 }

# Zeitstempel für Heartbeat
$lastHeartbeat = Get-Date

Log "Starte Echtzeit-Loop (Befehle alle $COMMAND_CHECK_INTERVAL Sek., Heartbeat alle $HEARTBEAT_INTERVAL Sek.)"

# Hauptschleife - Echtzeit Befehls-Check
while ($true) {
    
    # 1. Prüfe auf neue Befehle (SCHNELL - alle 5 Sekunden)
    $cmdResponse = Get-FromApi "remote/commands/$global:deviceId"
    if ($cmdResponse -and $cmdResponse.success -and $cmdResponse.commands -and $cmdResponse.commands.Count -gt 0) {
        Log ">>> $($cmdResponse.commands.Count) neue Befehle empfangen!"
        foreach ($cmd in $cmdResponse.commands) {
            Execute-RemoteCommand $cmd
        }
    }
    
    # 2. Heartbeat senden (alle 60 Sekunden)
    $now = Get-Date
    if (($now - $lastHeartbeat).TotalSeconds -ge $HEARTBEAT_INTERVAL) {
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
        }
        
        $lastHeartbeat = $now
    }
    
    # Warte 5 Sekunden bis zum nächsten Befehls-Check
    Start-Sleep -Seconds $COMMAND_CHECK_INTERVAL
}
