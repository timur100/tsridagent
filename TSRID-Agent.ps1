<# 
.SYNOPSIS
    TSRID Device Agent - Kommuniziert mit dem TSRID Admin Portal
    
.DESCRIPTION
    Dieses Script sammelt Geräteinformationen und sendet sie an das TSRID Admin Portal.
    Es läuft kontinuierlich und aktualisiert den Status in Echtzeit.
    
.PARAMETER ServerUrl
    Die URL des TSRID Admin Portals (z.B. https://tenant-security-4.preview.emergentagent.com)
    
.PARAMETER Interval
    Das Intervall in Sekunden zwischen den Heartbeats (Standard: 30)
    
.EXAMPLE
    .\TSRID-Agent.ps1 -ServerUrl "https://tenant-security-4.preview.emergentagent.com"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl,
    
    [Parameter(Mandatory=$false)]
    [int]$Interval = 30
)

# ============================================================
# KONFIGURATION
# ============================================================

$API_BASE = "$ServerUrl/api/device-agent"
$VERSION = "1.0.0"

# ============================================================
# FUNKTIONEN
# ============================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    if ($NoNewline) {
        Write-Host "[$timestamp] $Message" -ForegroundColor $Color -NoNewline
    } else {
        Write-Host "[$timestamp] $Message" -ForegroundColor $Color
    }
}

function Get-DeviceInfo {
    <#
    .SYNOPSIS
        Sammelt alle Geräteinformationen
    #>
    
    $computer = $env:COMPUTERNAME
    $parts = $computer.Split("-")
    
    $locationCode = "unknown"
    $deviceNumber = "unknown"
    
    if ($parts.Count -ge 2) {
        $locationCode = $parts[0]
        $deviceNumber = $parts[1]
    }
    
    # Hardware IDs
    try { $uuid = (Get-CimInstance Win32_ComputerSystemProduct).UUID } catch { $uuid = "unknown" }
    try { $biosSerial = (Get-CimInstance Win32_BIOS).SerialNumber } catch { $biosSerial = "unknown" }
    try { $boardSerial = (Get-CimInstance Win32_BaseBoard).SerialNumber } catch { $boardSerial = "unknown" }
    
    # TeamViewer ID
    $tvID = "not found"
    if (Test-Path "HKLM:\SOFTWARE\TeamViewer") {
        $tvID = (Get-ItemProperty "HKLM:\SOFTWARE\TeamViewer").ClientID
    } elseif (Test-Path "HKLM:\SOFTWARE\WOW6432Node\TeamViewer") {
        $tvID = (Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\TeamViewer").ClientID
    }
    
    # Network
    try { $mac = (Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object {$_.IPEnabled}).MACAddress | Select-Object -First 1 } catch { $mac = "unknown" }
    try { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress } catch { $ip = "unknown" }
    
    # Windows
    try {
        $windows = (Get-CimInstance Win32_OperatingSystem).Caption
        $windowsBuild = (Get-CimInstance Win32_OperatingSystem).BuildNumber
    } catch {
        $windows = "unknown"
        $windowsBuild = "unknown"
    }
    
    # Hardware
    try {
        $system = Get-CimInstance Win32_ComputerSystem
        $manufacturer = $system.Manufacturer
        $model = $system.Model
    } catch {
        $manufacturer = "unknown"
        $model = "unknown"
    }
    
    # CPU
    try {
        $cpu = Get-CimInstance Win32_Processor
        $cpuName = $cpu.Name
        $cpuCores = $cpu.NumberOfCores
        $cpuThreads = $cpu.NumberOfLogicalProcessors
    } catch {
        $cpuName = "unknown"
        $cpuCores = 0
        $cpuThreads = 0
    }
    
    # RAM
    try {
        $ramBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
        $ramGB = [math]::Round($ramBytes / 1GB, 2)
    } catch {
        $ramGB = 0
    }
    
    # Disks
    $diskInfo = @()
    try {
        $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
        foreach ($disk in $disks) {
            $sizeGB = [math]::Round($disk.Size / 1GB, 2)
            $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            $diskInfo += "$($disk.DeviceID) $sizeGB GB ($freeGB GB frei)"
        }
    } catch {
        $diskInfo = @("unknown")
    }
    
    # Process Status
    $teamviewerRunning = if (Get-Process TeamViewer -ErrorAction SilentlyContinue) { "running" } else { "offline" }
    $tsridRunning = if (Get-Process TSRID -ErrorAction SilentlyContinue) { "running" } else { "offline" }
    
    # Device ID (kombination aus UUID und BIOS Serial)
    $deviceID = "$uuid-$biosSerial"
    
    return @{
        device_id = $deviceID
        computername = $computer
        location_code = $locationCode
        device_number = $deviceNumber
        
        uuid = $uuid
        bios_serial = $biosSerial
        mainboard_serial = $boardSerial
        teamviewer_id = $tvID
        
        teamviewer_status = $teamviewerRunning
        tsrid_status = $tsridRunning
        
        manufacturer = $manufacturer
        model = $model
        cpu = $cpuName
        cpu_cores = $cpuCores
        cpu_threads = $cpuThreads
        ram_gb = $ramGB
        
        mac_address = $mac
        ip_address = $ip
        
        windows_version = $windows
        windows_build = $windowsBuild
        
        disks = ($diskInfo -join ", ")
        
        timestamp = (Get-Date -Format "o")
    }
}

function Send-Registration {
    param([hashtable]$DeviceInfo)
    
    try {
        $json = $DeviceInfo | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$API_BASE/register" -Method Post -Body $json -ContentType "application/json" -TimeoutSec 10
        return $response
    } catch {
        Write-ColorOutput "Fehler bei Registrierung: $_" -Color Red
        return $null
    }
}

function Send-Heartbeat {
    param([hashtable]$DeviceInfo)
    
    try {
        $heartbeat = @{
            device_id = $DeviceInfo.device_id
            teamviewer_status = $DeviceInfo.teamviewer_status
            tsrid_status = $DeviceInfo.tsrid_status
            ip_address = $DeviceInfo.ip_address
            timestamp = (Get-Date -Format "o")
        }
        
        $json = $heartbeat | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$API_BASE/heartbeat" -Method Post -Body $json -ContentType "application/json" -TimeoutSec 10
        return $response
    } catch {
        return $null
    }
}

function Get-Configuration {
    param([string]$DeviceId)
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/config/$DeviceId" -Method Get -TimeoutSec 10
        return $response
    } catch {
        return $null
    }
}

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                            ║" -ForegroundColor Cyan
    Write-Host "  ║              TSRID DEVICE AGENT v$VERSION                   ║" -ForegroundColor Cyan
    Write-Host "  ║                                                            ║" -ForegroundColor Cyan
    Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-DeviceInfo {
    param(
        [hashtable]$DeviceInfo,
        [hashtable]$Config
    )
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ GERÄTEINFORMATIONEN                                         │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    
    Write-Host "  Computername:    " -NoNewline -ForegroundColor Gray
    Write-Host $DeviceInfo.computername -ForegroundColor White
    
    Write-Host "  Device ID:       " -NoNewline -ForegroundColor Gray
    Write-Host ($DeviceInfo.device_id.Substring(0, [Math]::Min(40, $DeviceInfo.device_id.Length)) + "...") -ForegroundColor DarkGray
    
    Write-Host "  TeamViewer ID:   " -NoNewline -ForegroundColor Gray
    Write-Host $DeviceInfo.teamviewer_id -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ STATIONSZUWEISUNG                                           │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    
    if ($Config -and $Config.assigned -eq $true) {
        Write-Host "  Status:          " -NoNewline -ForegroundColor Gray
        Write-Host "ZUGEWIESEN" -ForegroundColor Green
        
        Write-Host "  Station:         " -NoNewline -ForegroundColor Gray
        Write-Host "$($Config.config.location_code)-$($Config.config.device_number)" -ForegroundColor Cyan
        
        Write-Host "  Standort:        " -NoNewline -ForegroundColor Gray
        Write-Host $Config.config.location_name -ForegroundColor White
        
        if ($Config.config.city) {
            Write-Host "  Stadt:           " -NoNewline -ForegroundColor Gray
            Write-Host $Config.config.city -ForegroundColor White
        }
    } else {
        Write-Host "  Status:          " -NoNewline -ForegroundColor Gray
        Write-Host "NICHT ZUGEWIESEN" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Warte auf Zuweisung im Admin-Portal..." -ForegroundColor DarkYellow
    }
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ PROZESS-STATUS                                              │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    
    Write-Host "  TeamViewer:      " -NoNewline -ForegroundColor Gray
    if ($DeviceInfo.teamviewer_status -eq "running") {
        Write-Host "● AKTIV" -ForegroundColor Green
    } else {
        Write-Host "○ OFFLINE" -ForegroundColor Red
    }
    
    Write-Host "  TSRID App:       " -NoNewline -ForegroundColor Gray
    if ($DeviceInfo.tsrid_status -eq "running") {
        Write-Host "● AKTIV" -ForegroundColor Green
    } else {
        Write-Host "○ OFFLINE" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ HARDWARE                                                    │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    
    Write-Host "  Hersteller:      " -NoNewline -ForegroundColor Gray
    Write-Host "$($DeviceInfo.manufacturer) $($DeviceInfo.model)" -ForegroundColor White
    
    Write-Host "  CPU:             " -NoNewline -ForegroundColor Gray
    Write-Host "$($DeviceInfo.cpu)" -ForegroundColor White
    
    Write-Host "  RAM:             " -NoNewline -ForegroundColor Gray
    Write-Host "$($DeviceInfo.ram_gb) GB" -ForegroundColor White
    
    Write-Host "  Speicher:        " -NoNewline -ForegroundColor Gray
    Write-Host $DeviceInfo.disks -ForegroundColor White
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ NETZWERK                                                    │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    
    Write-Host "  IP-Adresse:      " -NoNewline -ForegroundColor Gray
    Write-Host $DeviceInfo.ip_address -ForegroundColor White
    
    Write-Host "  MAC-Adresse:     " -NoNewline -ForegroundColor Gray
    Write-Host $DeviceInfo.mac_address -ForegroundColor White
    
    Write-Host ""
}

function Show-StatusBar {
    param(
        [string]$Status,
        [int]$NextUpdate,
        [string]$ServerUrl
    )
    
    $statusColor = switch ($Status) {
        "connected" { "Green" }
        "connecting" { "Yellow" }
        "error" { "Red" }
        default { "Gray" }
    }
    
    Write-Host "  ═════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  Server: " -NoNewline -ForegroundColor Gray
    Write-Host $ServerUrl -NoNewline -ForegroundColor DarkCyan
    Write-Host "  │  Status: " -NoNewline -ForegroundColor Gray
    Write-Host $Status.ToUpper() -NoNewline -ForegroundColor $statusColor
    Write-Host "  │  Update in: " -NoNewline -ForegroundColor Gray
    Write-Host "${NextUpdate}s" -ForegroundColor White
    Write-Host "  ═════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Drücken Sie [Q] zum Beenden oder [R] zum sofortigen Refresh" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
# HAUPTPROGRAMM
# ============================================================

Show-Banner
Write-ColorOutput "Starte TSRID Device Agent..." -Color Cyan
Write-ColorOutput "Server: $ServerUrl" -Color Gray
Write-Host ""

# Initiale Geräteinfo sammeln
Write-ColorOutput "Sammle Geräteinformationen..." -Color Yellow
$deviceInfo = Get-DeviceInfo

# Registrierung
Write-ColorOutput "Registriere Gerät beim Server..." -Color Yellow
$registration = Send-Registration -DeviceInfo $deviceInfo

if ($registration -and $registration.success) {
    Write-ColorOutput "Registrierung erfolgreich!" -Color Green
    $currentConfig = $registration
} else {
    Write-ColorOutput "Registrierung fehlgeschlagen - Versuche es weiter..." -Color Red
    $currentConfig = $null
}

Start-Sleep -Seconds 2

# Hauptschleife
$lastHeartbeat = Get-Date
$status = if ($registration) { "connected" } else { "error" }

while ($true) {
    # UI aktualisieren
    Show-Banner
    Show-DeviceInfo -DeviceInfo $deviceInfo -Config $currentConfig
    
    $nextUpdate = [math]::Max(0, $Interval - ((Get-Date) - $lastHeartbeat).TotalSeconds)
    Show-StatusBar -Status $status -NextUpdate ([math]::Round($nextUpdate)) -ServerUrl $ServerUrl
    
    # Prüfe auf Tastendruck
    if ([Console]::KeyAvailable) {
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq 'Q') {
            Write-ColorOutput "Agent wird beendet..." -Color Yellow
            break
        }
        if ($key.Key -eq 'R') {
            $lastHeartbeat = (Get-Date).AddSeconds(-$Interval)
        }
    }
    
    # Heartbeat senden wenn Intervall erreicht
    if (((Get-Date) - $lastHeartbeat).TotalSeconds -ge $Interval) {
        # Aktualisiere Prozess-Status
        $deviceInfo.teamviewer_status = if (Get-Process TeamViewer -ErrorAction SilentlyContinue) { "running" } else { "offline" }
        $deviceInfo.tsrid_status = if (Get-Process TSRID -ErrorAction SilentlyContinue) { "running" } else { "offline" }
        $deviceInfo.ip_address = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress } catch { "unknown" }
        
        $heartbeatResponse = Send-Heartbeat -DeviceInfo $deviceInfo
        
        if ($heartbeatResponse -and $heartbeatResponse.success) {
            $status = "connected"
            
            # Prüfe auf Konfigurations-Updates
            if ($heartbeatResponse.config) {
                $newConfig = Get-Configuration -DeviceId $deviceInfo.device_id
                if ($newConfig -and $newConfig.success) {
                    # Prüfe ob sich die Konfiguration geändert hat
                    if ($newConfig.assigned -and (!$currentConfig -or !$currentConfig.assigned -or 
                        $newConfig.config.location_code -ne $currentConfig.config.location_code)) {
                        Write-ColorOutput "NEUE STATIONSZUWEISUNG ERHALTEN!" -Color Green
                        [Console]::Beep(800, 200)
                        [Console]::Beep(1000, 200)
                    }
                    $currentConfig = $newConfig
                }
            }
        } else {
            $status = "error"
            Write-ColorOutput "Heartbeat fehlgeschlagen - Versuche erneut..." -Color Red
        }
        
        $lastHeartbeat = Get-Date
    }
    
    Start-Sleep -Milliseconds 500
}

Write-ColorOutput "TSRID Device Agent beendet." -Color Cyan
