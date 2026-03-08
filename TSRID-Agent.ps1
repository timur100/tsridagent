<# 
.SYNOPSIS
    TSRID Device Agent - Kommuniziert mit dem TSRID Admin Portal
    
.PARAMETER ServerUrl
    Die URL des TSRID Admin Portals
    
.PARAMETER Interval
    Das Intervall in Sekunden zwischen den Heartbeats (Standard: 30)
    
.EXAMPLE
    .\TSRID-Agent.ps1 -ServerUrl "https://station-config-hub.preview.emergentagent.com"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl,
    
    [Parameter(Mandatory=$false)]
    [int]$Interval = 30
)

$API_BASE = "$ServerUrl/api/device-agent"
$VERSION = "1.0.2"

# TLS 1.2 aktivieren fuer HTTPS-Verbindungen
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# SSL-Zertifikat-Validierung (fuer Self-Signed Certs)
if (-not ([System.Management.Automation.PSTypeName]'TrustAllCertsPolicy').Type) {
    Add-Type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
    }
"@
}
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White", [switch]$NoNewline)
    $timestamp = Get-Date -Format "HH:mm:ss"
    if ($NoNewline) { Write-Host "[$timestamp] $Message" -ForegroundColor $Color -NoNewline }
    else { Write-Host "[$timestamp] $Message" -ForegroundColor $Color }
}

function Get-DeviceInfo {
    $computer = $env:COMPUTERNAME
    $parts = $computer.Split("-")
    $locationCode = "unknown"; $deviceNumber = "unknown"
    if ($parts.Count -ge 2) { $locationCode = $parts[0]; $deviceNumber = $parts[1] }
    
    try { $uuid = [string](Get-CimInstance Win32_ComputerSystemProduct).UUID } catch { $uuid = "unknown" }
    try { $biosSerial = [string](Get-CimInstance Win32_BIOS).SerialNumber } catch { $biosSerial = "unknown" }
    try { $boardSerial = [string](Get-CimInstance Win32_BaseBoard).SerialNumber } catch { $boardSerial = "unknown" }
    
    # TeamViewer ID als String
    $tvID = "not found"
    if (Test-Path "HKLM:\SOFTWARE\TeamViewer") {
        $tvID = [string](Get-ItemProperty "HKLM:\SOFTWARE\TeamViewer").ClientID
    } elseif (Test-Path "HKLM:\SOFTWARE\WOW6432Node\TeamViewer") {
        $tvID = [string](Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\TeamViewer").ClientID
    }
    
    try { $mac = [string]((Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object {$_.IPEnabled}).MACAddress | Select-Object -First 1) } catch { $mac = "unknown" }
    try { $ip = [string](Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress } catch { $ip = "unknown" }
    
    try { $windows = [string](Get-CimInstance Win32_OperatingSystem).Caption; $windowsBuild = [string](Get-CimInstance Win32_OperatingSystem).BuildNumber } catch { $windows = "unknown"; $windowsBuild = "unknown" }
    try { $system = Get-CimInstance Win32_ComputerSystem; $manufacturer = [string]$system.Manufacturer; $model = [string]$system.Model } catch { $manufacturer = "unknown"; $model = "unknown" }
    try { $cpu = Get-CimInstance Win32_Processor; $cpuName = [string]$cpu.Name; $cpuCores = [int]$cpu.NumberOfCores; $cpuThreads = [int]$cpu.NumberOfLogicalProcessors } catch { $cpuName = "unknown"; $cpuCores = 0; $cpuThreads = 0 }
    try { $ramBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory; $ramGB = [math]::Round($ramBytes / 1GB, 2) } catch { $ramGB = 0 }
    
    $diskInfo = @()
    try { $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"; foreach ($disk in $disks) { $sizeGB = [math]::Round($disk.Size / 1GB, 2); $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2); $diskInfo += "$($disk.DeviceID) $sizeGB GB ($freeGB GB frei)" } } catch { $diskInfo = @("unknown") }
    
    $teamviewerRunning = if (Get-Process TeamViewer* -ErrorAction SilentlyContinue) { "running" } else { "offline" }
    $tsridRunning = if (Get-Process TSRID* -ErrorAction SilentlyContinue) { "running" } else { "offline" }
    
    return @{
        device_id = [string]"$uuid-$biosSerial"
        computername = [string]$computer
        location_code = [string]$locationCode
        device_number = [string]$deviceNumber
        uuid = [string]$uuid
        bios_serial = [string]$biosSerial
        mainboard_serial = [string]$boardSerial
        teamviewer_id = [string]$tvID
        teamviewer_status = [string]$teamviewerRunning
        tsrid_status = [string]$tsridRunning
        manufacturer = [string]$manufacturer
        model = [string]$model
        cpu = [string]$cpuName
        cpu_cores = [int]$cpuCores
        cpu_threads = [int]$cpuThreads
        ram_gb = [double]$ramGB
        mac_address = [string]$mac
        ip_address = [string]$ip
        windows_version = [string]$windows
        windows_build = [string]$windowsBuild
        disks = [string]($diskInfo -join ", ")
        timestamp = [string](Get-Date -Format "o")
    }
}

function Send-Registration { param([hashtable]$DeviceInfo)
    try { 
        $json = $DeviceInfo | ConvertTo-Json -Depth 10
        return Invoke-RestMethod -Uri "$API_BASE/register" -Method Post -Body $json -ContentType "application/json; charset=utf-8" -TimeoutSec 10 
    }
    catch { 
        Write-ColorOutput "Fehler bei Registrierung: $_" -Color Red
        return $null 
    }
}

function Send-Heartbeat { param([hashtable]$DeviceInfo)
    try { 
        $hb = @{
            device_id = [string]$DeviceInfo.device_id
            teamviewer_status = [string]$DeviceInfo.teamviewer_status
            tsrid_status = [string]$DeviceInfo.tsrid_status
            ip_address = [string]$DeviceInfo.ip_address
            timestamp = [string](Get-Date -Format "o")
        }
        return Invoke-RestMethod -Uri "$API_BASE/heartbeat" -Method Post -Body ($hb|ConvertTo-Json) -ContentType "application/json; charset=utf-8" -TimeoutSec 10 
    }
    catch { return $null }
}

function Get-Configuration { param([string]$DeviceId)
    try { return Invoke-RestMethod -Uri "$API_BASE/config/$DeviceId" -Method Get -TimeoutSec 10 } catch { return $null }
}

function Show-Banner { 
    Clear-Host
    Write-Host ""
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host "  |              TSRID DEVICE AGENT v$VERSION                   |" -ForegroundColor Cyan
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host ""
}

function Show-DeviceInfo { param([hashtable]$DeviceInfo, [hashtable]$Config)
    Write-Host ""
    Write-Host "  GERAETEINFORMATIONEN" -ForegroundColor White
    Write-Host "  --------------------" -ForegroundColor DarkGray
    Write-Host "  Computername:    $($DeviceInfo.computername)" -ForegroundColor White
    Write-Host "  TeamViewer ID:   $($DeviceInfo.teamviewer_id)" -ForegroundColor Yellow
    Write-Host "  UUID:            $($DeviceInfo.uuid)" -ForegroundColor DarkGray
    Write-Host "  BIOS Serial:     $($DeviceInfo.bios_serial)" -ForegroundColor DarkGray
    
    Write-Host ""
    Write-Host "  STATIONSZUWEISUNG" -ForegroundColor White
    Write-Host "  -----------------" -ForegroundColor DarkGray
    if ($Config -and $Config.assigned) { 
        Write-Host "  Status:          ZUGEWIESEN" -ForegroundColor Green
        Write-Host "  Station:         $($Config.config.location_code)-$($Config.config.device_number)" -ForegroundColor Cyan
        Write-Host "  Standort:        $($Config.config.location_name)" -ForegroundColor White 
    }
    else { 
        Write-Host "  Status:          NICHT ZUGEWIESEN" -ForegroundColor Yellow
        Write-Host "  Warte auf Zuweisung im Admin-Portal..." -ForegroundColor DarkYellow 
    }
    
    Write-Host ""
    Write-Host "  PROZESS-STATUS" -ForegroundColor White
    Write-Host "  --------------" -ForegroundColor DarkGray
    if ($DeviceInfo.teamviewer_status -eq "running") { Write-Host "  TeamViewer:      [AKTIV]" -ForegroundColor Green } else { Write-Host "  TeamViewer:      [OFFLINE]" -ForegroundColor Red }
    if ($DeviceInfo.tsrid_status -eq "running") { Write-Host "  TSRID App:       [AKTIV]" -ForegroundColor Green } else { Write-Host "  TSRID App:       [OFFLINE]" -ForegroundColor Red }
    
    Write-Host ""
    Write-Host "  HARDWARE" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor DarkGray
    Write-Host "  Hersteller:      $($DeviceInfo.manufacturer) $($DeviceInfo.model)" -ForegroundColor White
    Write-Host "  CPU:             $($DeviceInfo.cpu)" -ForegroundColor White
    Write-Host "  RAM:             $($DeviceInfo.ram_gb) GB" -ForegroundColor White
    Write-Host "  Speicher:        $($DeviceInfo.disks)" -ForegroundColor White
    
    Write-Host ""
    Write-Host "  NETZWERK" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor DarkGray
    Write-Host "  IP-Adresse:      $($DeviceInfo.ip_address)" -ForegroundColor White
    Write-Host "  MAC-Adresse:     $($DeviceInfo.mac_address)" -ForegroundColor White
    Write-Host ""
}

function Show-StatusBar { param([string]$Status, [int]$NextUpdate, [string]$ServerUrl)
    $col = if($Status -eq "connected"){"Green"}elseif($Status -eq "error"){"Red"}else{"Yellow"}
    Write-Host "  ============================================================" -ForegroundColor DarkGray
    Write-Host "  Server: $ServerUrl" -ForegroundColor DarkCyan
    Write-Host "  Status: $($Status.ToUpper())  |  Update in: ${NextUpdate}s" -ForegroundColor $col
    Write-Host "  ============================================================" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [Q] = Beenden   [R] = Refresh" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
# HAUPTPROGRAMM
# ============================================================

Show-Banner
Write-ColorOutput "Starte TSRID Device Agent..." -Color Cyan
Write-ColorOutput "Server: $ServerUrl" -Color Gray
Write-Host ""

Write-ColorOutput "Sammle Geraeteinformationen..." -Color Yellow
$deviceInfo = Get-DeviceInfo

Write-ColorOutput "Registriere Geraet beim Server..." -Color Yellow
$registration = Send-Registration -DeviceInfo $deviceInfo

if ($registration -and $registration.success) { 
    Write-ColorOutput "Registrierung erfolgreich!" -Color Green
    $currentConfig = $registration 
} else { 
    Write-ColorOutput "Registrierung fehlgeschlagen - Versuche es weiter..." -Color Red
    $currentConfig = $null 
}

Start-Sleep -Seconds 2

$lastHeartbeat = Get-Date
if ($registration) { $status = "connected" } else { $status = "error" }

while ($true) {
    Show-Banner
    Show-DeviceInfo -DeviceInfo $deviceInfo -Config $currentConfig
    
    $nextUpdate = [math]::Max(0, $Interval - ((Get-Date) - $lastHeartbeat).TotalSeconds)
    Show-StatusBar -Status $status -NextUpdate ([math]::Round($nextUpdate)) -ServerUrl $ServerUrl
    
    if ([Console]::KeyAvailable) { 
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq "Q") { 
            Write-ColorOutput "Agent wird beendet..." -Color Yellow
            break 
        }
        if ($key.Key -eq "R") { 
            $lastHeartbeat = (Get-Date).AddSeconds(-$Interval) 
        } 
    }
    
    if (((Get-Date) - $lastHeartbeat).TotalSeconds -ge $Interval) {
        # Aktualisiere Prozess-Status
        $deviceInfo.teamviewer_status = if (Get-Process TeamViewer* -ErrorAction SilentlyContinue) { "running" } else { "offline" }
        $deviceInfo.tsrid_status = if (Get-Process TSRID* -ErrorAction SilentlyContinue) { "running" } else { "offline" }
        try { $deviceInfo.ip_address = [string](Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress } catch { }
        
        $hbResp = Send-Heartbeat -DeviceInfo $deviceInfo
        
        if ($hbResp -and $hbResp.success) { 
            $status = "connected"
            $newConfig = Get-Configuration -DeviceId $deviceInfo.device_id
            if ($newConfig -and $newConfig.success -and $newConfig.assigned) { 
                if (!$currentConfig -or !$currentConfig.assigned) { 
                    Write-ColorOutput "NEUE STATIONSZUWEISUNG ERHALTEN!" -Color Green
                    [Console]::Beep(800,200)
                    [Console]::Beep(1000,200) 
                }
                $currentConfig = $newConfig 
            } 
        }
        else { 
            $status = "error" 
        }
        
        $lastHeartbeat = Get-Date
    }
    
    Start-Sleep -Milliseconds 500
}

Write-ColorOutput "TSRID Device Agent beendet." -Color Cyan
