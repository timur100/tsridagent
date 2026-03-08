# ============================================================================
# TSRID Agent - Vollautomatisches Deployment-Script
# ============================================================================
# Version: 1.0.0
# 
# VERWENDUNG:
# 1. PowerShell als Administrator oeffnen
# 2. Script ausfuehren: .\Deploy-TSRID-Agent.ps1
#
# Das Script erstellt automatisch:
# - Verzeichnis C:\TSRID
# - Agent-Service-Script (TSRID-Agent-Service.ps1)
# - Scheduled Task mit Startverzoegerung (90 Sekunden)
# - Log-Dateien unter C:\TSRID\
# ============================================================================

# === KONFIGURATION ===
$TSRID_DIR = "C:\TSRID"
$SERVICE_SCRIPT_PATH = "$TSRID_DIR\TSRID-Agent-Service.ps1"
$INSTALL_LOG = "$TSRID_DIR\install.log"
$API_BASE_URL = "https://tablet-mgmt.preview.emergentagent.com/api/device-agent"
$HEARTBEAT_INTERVAL = 60  # Sekunden
$STARTUP_DELAY_MINUTES = 1  # Verzoegerung nach Systemstart
$TASK_NAME = "TSRID-Agent-Service"

# === HILFSFUNKTIONEN ===
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Stelle sicher, dass Verzeichnis existiert
    if (Test-Path $TSRID_DIR) {
        Add-Content -Path $INSTALL_LOG -Value $logMessage -ErrorAction SilentlyContinue
    }
    
    # Konsolen-Ausgabe mit Farbe
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        default { Write-Host $logMessage -ForegroundColor Cyan }
    }
}

function Test-AdminRights {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# === AGENT SERVICE SCRIPT INHALT ===
$AgentServiceScript = @'
# ============================================================================
# TSRID Agent Service Script
# Laeuft als Hintergrunddienst und sendet regelmaessig Heartbeats
# ============================================================================

# === KONFIGURATION ===
$API_BASE_URL = "https://tablet-mgmt.preview.emergentagent.com/api/device-agent"
$HEARTBEAT_INTERVAL = 60
$LOG_FILE = "C:\TSRID\agent.log"
$MAX_RETRIES = 5
$RETRY_DELAY = 30

# === TLS 1.2 ERZWINGEN ===
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# === LOG-FUNKTION ===
function Write-AgentLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logMessage -ErrorAction SilentlyContinue
}

# === GERAETE-ID GENERIEREN ===
function Get-DeviceId {
    try {
        $uuid = (Get-WmiObject -Class Win32_ComputerSystemProduct).UUID
        $computerName = $env:COMPUTERNAME
        return "$computerName-$uuid"
    } catch {
        return "$env:COMPUTERNAME-FALLBACK-$(Get-Random)"
    }
}

# === HARDWARE-INFORMATIONEN SAMMELN ===
function Get-HardwareInfo {
    Write-AgentLog "Sammle Hardware-Informationen..."
    
    $info = @{
        computername = $env:COMPUTERNAME
        username = $env:USERNAME
        domain = $env:USERDOMAIN
    }
    
    # UUID und Serials
    try {
        $csProduct = Get-WmiObject -Class Win32_ComputerSystemProduct
        $info.uuid = $csProduct.UUID
        $info.product_name = $csProduct.Name
        $info.vendor = $csProduct.Vendor
    } catch { Write-AgentLog "Fehler bei UUID: $_" "WARNING" }
    
    # BIOS Serial
    try {
        $bios = Get-WmiObject -Class Win32_BIOS
        $info.bios_serial = $bios.SerialNumber
        $info.bios_version = $bios.SMBIOSBIOSVersion
    } catch { Write-AgentLog "Fehler bei BIOS: $_" "WARNING" }
    
    # System Board Serial
    try {
        $baseboard = Get-WmiObject -Class Win32_BaseBoard
        $info.baseboard_serial = $baseboard.SerialNumber
        $info.baseboard_product = $baseboard.Product
    } catch { Write-AgentLog "Fehler bei Baseboard: $_" "WARNING" }
    
    # CPU
    try {
        $cpu = Get-WmiObject -Class Win32_Processor | Select-Object -First 1
        $info.cpu_name = $cpu.Name
        $info.cpu_cores = $cpu.NumberOfCores
        $info.cpu_threads = $cpu.NumberOfLogicalProcessors
    } catch { Write-AgentLog "Fehler bei CPU: $_" "WARNING" }
    
    # RAM
    try {
        $ram = Get-WmiObject -Class Win32_ComputerSystem
        $info.ram_total_gb = [math]::Round($ram.TotalPhysicalMemory / 1GB, 2)
    } catch { Write-AgentLog "Fehler bei RAM: $_" "WARNING" }
    
    # Disk
    try {
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $info.disk_total_gb = [math]::Round($disk.Size / 1GB, 2)
        $info.disk_free_gb = [math]::Round($disk.FreeSpace / 1GB, 2)
    } catch { Write-AgentLog "Fehler bei Disk: $_" "WARNING" }
    
    # OS
    try {
        $os = Get-WmiObject -Class Win32_OperatingSystem
        $info.os_name = $os.Caption
        $info.os_version = $os.Version
        $info.os_build = $os.BuildNumber
        $info.os_architecture = $os.OSArchitecture
    } catch { Write-AgentLog "Fehler bei OS: $_" "WARNING" }
    
    # Netzwerk
    try {
        $adapters = Get-WmiObject -Class Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true }
        $info.ip_addresses = @($adapters | ForEach-Object { $_.IPAddress } | Where-Object { $_ -match '^\d' })
        $info.mac_addresses = @($adapters | ForEach-Object { $_.MACAddress } | Where-Object { $_ })
    } catch { Write-AgentLog "Fehler bei Netzwerk: $_" "WARNING" }
    
    # TeamViewer ID
    try {
        $tvPaths = @(
            "HKLM:\SOFTWARE\TeamViewer",
            "HKLM:\SOFTWARE\WOW6432Node\TeamViewer"
        )
        foreach ($path in $tvPaths) {
            if (Test-Path $path) {
                $tvId = (Get-ItemProperty -Path $path -ErrorAction SilentlyContinue).ClientID
                if ($tvId) {
                    $info.teamviewer_id = [string]$tvId
                    break
                }
            }
        }
    } catch { Write-AgentLog "Fehler bei TeamViewer: $_" "WARNING" }
    
    # Uptime
    try {
        $os = Get-WmiObject -Class Win32_OperatingSystem
        $bootTime = $os.ConvertToDateTime($os.LastBootUpTime)
        $info.uptime_hours = [math]::Round(((Get-Date) - $bootTime).TotalHours, 2)
        $info.last_boot = $bootTime.ToString("yyyy-MM-dd HH:mm:ss")
    } catch { Write-AgentLog "Fehler bei Uptime: $_" "WARNING" }
    
    return $info
}

# === API AUFRUF MIT RETRY ===
function Invoke-ApiWithRetry {
    param(
        [string]$Uri,
        [string]$Method = "POST",
        [hashtable]$Body,
        [int]$MaxRetries = $MAX_RETRIES,
        [int]$RetryDelay = $RETRY_DELAY
    )
    
    $attempt = 0
    while ($attempt -lt $MaxRetries) {
        $attempt++
        try {
            $jsonBody = $Body | ConvertTo-Json -Depth 10 -Compress
            Write-AgentLog "API Aufruf ($attempt/$MaxRetries): $Uri"
            
            $response = Invoke-RestMethod -Uri $Uri -Method $Method -Body $jsonBody -ContentType "application/json" -TimeoutSec 30
            Write-AgentLog "API Erfolg: $Uri" "SUCCESS"
            return $response
            
        } catch {
            $errorMsg = $_.Exception.Message
            Write-AgentLog "API Fehler ($attempt/$MaxRetries): $errorMsg" "ERROR"
            
            if ($attempt -lt $MaxRetries) {
                Write-AgentLog "Warte $RetryDelay Sekunden vor erneutem Versuch..."
                Start-Sleep -Seconds $RetryDelay
            }
        }
    }
    
    Write-AgentLog "Alle $MaxRetries Versuche fehlgeschlagen fuer: $Uri" "ERROR"
    return $null
}

# === WARTE AUF NETZWERK ===
function Wait-ForNetwork {
    param([int]$TimeoutSeconds = 300)
    
    Write-AgentLog "Warte auf Netzwerkverbindung (max. $TimeoutSeconds Sek.)..."
    $startTime = Get-Date
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        try {
            $adapters = Get-WmiObject -Class Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true -and $_.IPAddress }
            if ($adapters) {
                Write-AgentLog "Netzwerk verfuegbar!" "SUCCESS"
                return $true
            }
        } catch { }
        
        Write-AgentLog "Netzwerk noch nicht verfuegbar, warte 10 Sekunden..."
        Start-Sleep -Seconds 10
    }
    
    Write-AgentLog "Timeout - Netzwerk nicht verfuegbar nach $TimeoutSeconds Sekunden" "ERROR"
    return $false
}

# === GERAETE-REGISTRIERUNG ===
function Register-Device {
    $deviceId = Get-DeviceId
    $hwInfo = Get-HardwareInfo
    
    # Payload im Format fuer /api/device-agent/register (DeviceInfo Model)
    $payload = @{
        device_id = $deviceId
        computername = $env:COMPUTERNAME
        
        # Hardware IDs
        uuid = $hwInfo.uuid
        bios_serial = $hwInfo.bios_serial
        mainboard_serial = $hwInfo.baseboard_serial
        teamviewer_id = $hwInfo.teamviewer_id
        
        # Hardware Info
        manufacturer = $hwInfo.vendor
        model = $hwInfo.product_name
        cpu = $hwInfo.cpu_name
        cpu_cores = $hwInfo.cpu_cores
        cpu_threads = $hwInfo.cpu_threads
        ram_gb = $hwInfo.ram_total_gb
        
        # Network
        ip_address = if ($hwInfo.ip_addresses -and $hwInfo.ip_addresses.Count -gt 0) { $hwInfo.ip_addresses[0] } else { $null }
        mac_address = if ($hwInfo.mac_addresses -and $hwInfo.mac_addresses.Count -gt 0) { $hwInfo.mac_addresses[0] } else { $null }
        
        # OS
        windows_version = $hwInfo.os_name
        windows_build = $hwInfo.os_build
        
        # Storage
        disks = "C: $($hwInfo.disk_total_gb)GB (Frei: $($hwInfo.disk_free_gb)GB)"
        
        # Timestamp
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    Write-AgentLog "Registriere Geraet: $deviceId"
    $result = Invoke-ApiWithRetry -Uri "$API_BASE_URL/register" -Body $payload
    
    if ($result -and $result.success) {
        Write-AgentLog "Geraet erfolgreich registriert!" "SUCCESS"
        return $deviceId
    } else {
        Write-AgentLog "Geraete-Registrierung fehlgeschlagen" "ERROR"
        return $null
    }
}

# === HEARTBEAT SENDEN ===
function Send-Heartbeat {
    param([string]$DeviceId)
    
    $hwInfo = Get-HardwareInfo
    
    # Payload im Format fuer /api/device-agent/heartbeat (DeviceInfo Model)
    $payload = @{
        device_id = $DeviceId
        computername = $env:COMPUTERNAME
        
        # Hardware IDs (aktualisieren bei jedem Heartbeat)
        uuid = $hwInfo.uuid
        bios_serial = $hwInfo.bios_serial
        teamviewer_id = $hwInfo.teamviewer_id
        
        # Network (kann sich aendern)
        ip_address = if ($hwInfo.ip_addresses -and $hwInfo.ip_addresses.Count -gt 0) { $hwInfo.ip_addresses[0] } else { $null }
        
        # Prozess-Status
        teamviewer_status = "unknown"
        tsrid_status = "running"
        
        # Timestamp
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    Write-AgentLog "Sende Heartbeat fuer: $DeviceId"
    $result = Invoke-ApiWithRetry -Uri "$API_BASE_URL/heartbeat" -Body $payload -MaxRetries 3 -RetryDelay 10
    
    if ($result -and $result.success) {
        Write-AgentLog "Heartbeat erfolgreich gesendet" "SUCCESS"
        
        # Pruefe auf neue Konfiguration
        if ($result.config -and $result.config.assigned) {
            Write-AgentLog "Zugewiesen an: $($result.config.location_code) / $($result.config.location_name)"
        }
        return $true
    } else {
        Write-AgentLog "Heartbeat fehlgeschlagen" "ERROR"
        return $false
    }
}

# === HAUPTPROGRAMM ===
Write-AgentLog "========================================"
Write-AgentLog "TSRID Agent Service gestartet"
Write-AgentLog "========================================"

# Warte auf Netzwerk (wichtig nach Systemstart)
if (-not (Wait-ForNetwork -TimeoutSeconds 300)) {
    Write-AgentLog "KRITISCH: Kein Netzwerk verfuegbar. Beende." "ERROR"
    exit 1
}

# Geraet registrieren
$deviceId = Register-Device
if (-not $deviceId) {
    Write-AgentLog "KRITISCH: Registrierung fehlgeschlagen. Beende." "ERROR"
    exit 1
}

Write-AgentLog "Agent laeuft. Heartbeat alle $HEARTBEAT_INTERVAL Sekunden."

# Endlosschleife fuer Heartbeats
while ($true) {
    try {
        Send-Heartbeat -DeviceId $deviceId
    } catch {
        Write-AgentLog "Heartbeat-Ausnahme: $_" "ERROR"
    }
    
    Start-Sleep -Seconds $HEARTBEAT_INTERVAL
}
'@

# ============================================================================
# HAUPTINSTALLATION
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TSRID Agent - Automatisches Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Admin-Rechte pruefen
if (-not (Test-AdminRights)) {
    Write-Host "[FEHLER] Dieses Script muss als Administrator ausgefuehrt werden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte:" -ForegroundColor Yellow
    Write-Host "1. Rechtsklick auf PowerShell" -ForegroundColor Yellow
    Write-Host "2. 'Als Administrator ausfuehren' waehlen" -ForegroundColor Yellow
    Write-Host "3. Script erneut starten" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Druecken Sie Enter zum Beenden"
    exit 1
}

Write-Log "Administrator-Rechte bestaetigt" "SUCCESS"

# 2. Verzeichnis erstellen
Write-Log "Erstelle Verzeichnis: $TSRID_DIR"
if (-not (Test-Path $TSRID_DIR)) {
    try {
        New-Item -Path $TSRID_DIR -ItemType Directory -Force | Out-Null
        Write-Log "Verzeichnis erstellt" "SUCCESS"
    } catch {
        Write-Log "Fehler beim Erstellen des Verzeichnisses: $_" "ERROR"
        exit 1
    }
} else {
    Write-Log "Verzeichnis existiert bereits" "INFO"
}

# 3. Agent-Service-Script schreiben
Write-Log "Schreibe Agent-Service-Script: $SERVICE_SCRIPT_PATH"
try {
    $AgentServiceScript | Out-File -FilePath $SERVICE_SCRIPT_PATH -Encoding UTF8 -Force
    Write-Log "Agent-Script geschrieben" "SUCCESS"
} catch {
    Write-Log "Fehler beim Schreiben des Scripts: $_" "ERROR"
    exit 1
}

# 4. Existierenden Task entfernen (falls vorhanden)
Write-Log "Pruefe existierenden Scheduled Task..."
$existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Log "Entferne existierenden Task..."
    try {
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false
        Write-Log "Alter Task entfernt" "SUCCESS"
    } catch {
        Write-Log "Warnung beim Entfernen: $_" "WARNING"
    }
}

# 5. Neuen Scheduled Task erstellen (mit Startverzoegerung)
Write-Log "Erstelle Scheduled Task mit $STARTUP_DELAY_MINUTES Minuten Startverzoegerung..."

try {
    # Aktion: PowerShell starten mit dem Service-Script
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$SERVICE_SCRIPT_PATH`""
    
    # Trigger: Bei Systemstart mit Verzoegerung
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $trigger.Delay = "PT${STARTUP_DELAY_MINUTES}M"  # PT1M = 1 Minute Verzoegerung
    
    # Einstellungen
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartInterval (New-TimeSpan -Minutes 5) `
        -RestartCount 3 `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
        -MultipleInstances IgnoreNew
    
    # Principal: Als SYSTEM ausfuehren
    $principal = New-ScheduledTaskPrincipal `
        -UserId "SYSTEM" `
        -LogonType ServiceAccount `
        -RunLevel Highest
    
    # Task registrieren
    Register-ScheduledTask `
        -TaskName $TASK_NAME `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "TSRID Agent Service - Sendet Heartbeats an das TSRID Portal" `
        -Force | Out-Null
    
    Write-Log "Scheduled Task erfolgreich erstellt" "SUCCESS"
    
} catch {
    Write-Log "Fehler beim Erstellen des Tasks: $_" "ERROR"
    exit 1
}

# 6. Task sofort starten (fuer Sofort-Test)
Write-Log "Starte Task sofort fuer initialen Test..."
try {
    Start-ScheduledTask -TaskName $TASK_NAME
    Start-Sleep -Seconds 5
    
    $taskStatus = (Get-ScheduledTask -TaskName $TASK_NAME).State
    Write-Log "Task-Status: $taskStatus" "INFO"
    
    if ($taskStatus -eq "Running") {
        Write-Log "Agent laeuft!" "SUCCESS"
    }
} catch {
    Write-Log "Warnung beim Starten: $_" "WARNING"
}

# 7. Abschluss
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  INSTALLATION ERFOLGREICH!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Installierte Komponenten:" -ForegroundColor Cyan
Write-Host "  - Agent-Script: $SERVICE_SCRIPT_PATH" -ForegroundColor White
Write-Host "  - Scheduled Task: $TASK_NAME" -ForegroundColor White
Write-Host "  - Log-Datei: $TSRID_DIR\agent.log" -ForegroundColor White
Write-Host ""
Write-Host "  Der Agent startet automatisch:" -ForegroundColor Cyan
Write-Host "  - Nach jedem Systemstart (mit $STARTUP_DELAY_MINUTES Min. Verzoegerung)" -ForegroundColor White
Write-Host "  - Sendet alle $HEARTBEAT_INTERVAL Sekunden einen Heartbeat" -ForegroundColor White
Write-Host ""
Write-Host "  Nuetzliche Befehle:" -ForegroundColor Cyan
Write-Host "  - Status pruefen: Get-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor Gray
Write-Host "  - Manuell starten: Start-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor Gray
Write-Host "  - Logs anzeigen: Get-Content '$TSRID_DIR\agent.log' -Tail 50" -ForegroundColor Gray
Write-Host "  - Task entfernen: Unregister-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Log "Installation abgeschlossen" "SUCCESS"

Read-Host "Druecken Sie Enter zum Beenden"
