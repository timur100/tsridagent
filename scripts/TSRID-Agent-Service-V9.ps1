# TSRID Agent Service V9
# PowerShell Agent mit Always-on-Top Message, Datum/Uhrzeit und Countdown-Timer
# Fuer Windows-Tablets zur Remote-Steuerung

param(
    [string]$ApiUrl = "https://tsrid-management.preview.emergentagent.com",
    [int]$HeartbeatInterval = 60,
    [int]$CommandPollInterval = 5
)

# ==================== KONFIGURATION ====================
$global:DeviceId = $null
$global:ComputerName = $env:COMPUTERNAME
$global:LogFile = "$env:TEMP\TSRID-Agent.log"

# ==================== LOGGING ====================
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Add-Content -Path $global:LogFile -Value $logEntry
    Write-Host $logEntry
}

# ==================== DEVICE ID ====================
function Get-DeviceId {
    $uuid = (Get-WmiObject -Class Win32_ComputerSystemProduct).UUID
    return "$($global:ComputerName)-$uuid"
}

# ==================== HARDWARE INFO ====================
function Get-HardwareInfo {
    try {
        $cs = Get-WmiObject -Class Win32_ComputerSystem
        $cpu = Get-WmiObject -Class Win32_Processor
        $os = Get-WmiObject -Class Win32_OperatingSystem
        $bios = Get-WmiObject -Class Win32_BIOS
        $board = Get-WmiObject -Class Win32_BaseBoard
        $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        $network = Get-WmiObject -Class Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
        
        # TeamViewer ID auslesen
        $tvId = "not found"
        $tvPaths = @(
            "HKLM:\SOFTWARE\TeamViewer",
            "HKLM:\SOFTWARE\WOW6432Node\TeamViewer"
        )
        foreach ($path in $tvPaths) {
            if (Test-Path $path) {
                $tvId = (Get-ItemProperty -Path $path -Name "ClientID" -ErrorAction SilentlyContinue).ClientID
                if ($tvId) { break }
            }
        }

        # Prozess-Status pruefen
        $tvStatus = if (Get-Process -Name "TeamViewer" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }
        $tsridStatus = if (Get-Process -Name "tsrid" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }

        return @{
            device_id = $global:DeviceId
            computername = $global:ComputerName
            uuid = (Get-WmiObject -Class Win32_ComputerSystemProduct).UUID
            bios_serial = $bios.SerialNumber
            mainboard_serial = $board.SerialNumber
            teamviewer_id = $tvId
            teamviewer_status = $tvStatus
            tsrid_status = $tsridStatus
            manufacturer = $cs.Manufacturer
            model = $cs.Model
            cpu = $cpu.Name
            cpu_cores = $cpu.NumberOfCores
            cpu_threads = $cpu.NumberOfLogicalProcessors
            ram_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
            mac_address = ($network | Select-Object -First 1).MACAddress
            ip_address = ($network | Select-Object -First 1).IPAddress | Where-Object { $_ -match '\d+\.\d+\.\d+\.\d+' } | Select-Object -First 1
            windows_version = $os.Caption
            windows_build = $os.BuildNumber
            disks = ($disk | ForEach-Object { "$($_.DeviceID) $([math]::Round($_.Size/1GB))GB" }) -join ", "
            timestamp = (Get-Date).ToString("o")
        }
    } catch {
        Write-Log "Fehler beim Sammeln der Hardware-Infos: $_"
        return @{
            device_id = $global:DeviceId
            computername = $global:ComputerName
            timestamp = (Get-Date).ToString("o")
        }
    }
}

# ==================== API CALLS ====================
function Invoke-ApiCall {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )
    
    try {
        $url = "$ApiUrl/api/device-agent/$Endpoint"
        $params = @{
            Uri = $url
            Method = $Method
            ContentType = "application/json"
            TimeoutSec = 30
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return $response
    } catch {
        Write-Log "API-Fehler ($Endpoint): $_"
        return $null
    }
}

# ==================== REGISTRIERUNG ====================
function Register-Device {
    Write-Log "Registriere Geraet..."
    $hwInfo = Get-HardwareInfo
    $result = Invoke-ApiCall -Endpoint "register" -Method "POST" -Body $hwInfo
    
    if ($result -and $result.success) {
        Write-Log "Geraet erfolgreich registriert: $($result.device_id)"
        if ($result.assigned) {
            Write-Log "Zugewiesen zu: $($result.config.location_code)-$($result.config.device_number)"
        }
        return $true
    }
    return $false
}

# ==================== HEARTBEAT ====================
function Send-Heartbeat {
    $hwInfo = Get-HardwareInfo
    $result = Invoke-ApiCall -Endpoint "heartbeat" -Method "POST" -Body $hwInfo
    
    if ($result -and $result.success) {
        # Verarbeite Remote-Befehle aus Heartbeat-Antwort
        if ($result.commands -and $result.commands.Count -gt 0) {
            foreach ($cmd in $result.commands) {
                Process-RemoteCommand -Command $cmd
            }
        }
    }
    return $result
}

# ==================== COMMAND POLLING ====================
function Get-PendingCommands {
    $result = Invoke-ApiCall -Endpoint "remote/commands/$($global:DeviceId)" -Method "GET"
    
    if ($result -and $result.success -and $result.commands) {
        foreach ($cmd in $result.commands) {
            Process-RemoteCommand -Command $cmd
        }
    }
}

# ==================== ALWAYS-ON-TOP MESSAGE BOX MIT TIMER ====================
function Show-BigMessage {
    param(
        [string]$Message,
        [int]$DurationMinutes = 0
    )
    
    $timestamp = Get-Date -Format "dd.MM.yyyy HH:mm:ss"
    
    # HTML fuer mshta.exe erstellen - Always-on-Top mit optionalem Countdown
    $timerScript = ""
    $timerDisplay = ""
    
    if ($DurationMinutes -gt 0) {
        $totalSeconds = $DurationMinutes * 60
        $timerDisplay = @"
        <div id='timer' style='font-size: 48px; color: #ff6600; margin-top: 30px; font-weight: bold;'>
            Verbleibend: <span id='countdown'>--:--:--</span>
        </div>
"@
        $timerScript = @"
        var totalSec = $totalSeconds;
        function updateTimer() {
            if (totalSec <= 0) {
                document.getElementById('countdown').innerHTML = '00:00:00';
                document.getElementById('timer').style.color = '#00ff00';
                return;
            }
            var hours = Math.floor(totalSec / 3600);
            var mins = Math.floor((totalSec % 3600) / 60);
            var secs = totalSec % 60;
            document.getElementById('countdown').innerHTML = 
                (hours < 10 ? '0' : '') + hours + ':' +
                (mins < 10 ? '0' : '') + mins + ':' +
                (secs < 10 ? '0' : '') + secs;
            totalSec--;
            setTimeout(updateTimer, 1000);
        }
        updateTimer();
"@
    }
    
    $escapedMessage = $Message.Replace("'", "&#39;").Replace('"', "&quot;").Replace("`n", "<br>")
    
    $htmlContent = @"
<html>
<head>
<title>TSRID Nachricht</title>
<HTA:APPLICATION 
    ID="oHTA"
    APPLICATIONNAME="TSRID Message"
    BORDER="none"
    BORDERSTYLE="none"
    CAPTION="no"
    CONTEXTMENU="no"
    INNERBORDER="no"
    MAXIMIZEBUTTON="no"
    MINIMIZEBUTTON="no"
    NAVIGABLE="no"
    SCROLL="no"
    SCROLLFLAT="no"
    SELECTION="no"
    SHOWINTASKBAR="yes"
    SINGLEINSTANCE="yes"
    SYSMENU="no"
    VERSION="1.0"
/>
<script>
// Fenster zentrieren und maximieren
window.resizeTo(screen.width, screen.height);
window.moveTo(0, 0);

// Always-on-top durch regelmaessiges Focus-Setzen
function stayOnTop() {
    try {
        window.focus();
        self.focus();
    } catch(e) {}
    setTimeout(stayOnTop, 500);
}
stayOnTop();

// Timer starten
window.onload = function() {
    $timerScript
};

// Schliessen mit ESC oder Klick auf Button
document.onkeydown = function(e) {
    if (e.keyCode == 27) window.close();
};
function closeWindow() {
    window.close();
}
</script>
<style>
body {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: #ffffff;
    font-family: 'Segoe UI', Arial, sans-serif;
    margin: 0;
    padding: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    overflow: hidden;
}
.container {
    max-width: 90%;
    padding: 60px;
    background: rgba(255,255,255,0.05);
    border-radius: 20px;
    border: 3px solid #d50c2d;
    box-shadow: 0 0 60px rgba(213,12,45,0.3);
}
.header {
    color: #d50c2d;
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 3px;
}
.timestamp {
    color: #888;
    font-size: 24px;
    margin-bottom: 40px;
}
.message {
    font-size: 56px;
    line-height: 1.4;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    margin-bottom: 30px;
}
.close-btn {
    background: #d50c2d;
    color: white;
    border: none;
    padding: 20px 60px;
    font-size: 28px;
    cursor: pointer;
    border-radius: 10px;
    margin-top: 40px;
    font-weight: bold;
    transition: all 0.3s;
}
.close-btn:hover {
    background: #ff1744;
    transform: scale(1.05);
}
</style>
</head>
<body>
<div class='container'>
    <div class='header'>TSRID Mitteilung</div>
    <div class='timestamp'>Gesendet am: $timestamp</div>
    <div class='message'>$escapedMessage</div>
    $timerDisplay
    <button class='close-btn' onclick='closeWindow()'>SCHLIESSEN (ESC)</button>
</div>
</body>
</html>
"@
    
    # HTML in temp-Datei speichern
    $htaFile = "$env:TEMP\tsrid_message_$(Get-Date -Format 'yyyyMMddHHmmss').hta"
    $htmlContent | Out-File -FilePath $htaFile -Encoding UTF8
    
    # mshta.exe starten (Always-on-top durch HTA-Einstellungen)
    Start-Process -FilePath "mshta.exe" -ArgumentList "`"$htaFile`""
    
    Write-Log "Nachricht angezeigt: $Message (Timer: $DurationMinutes Min.)"
}

# ==================== COMMAND PROCESSING ====================
function Process-RemoteCommand {
    param($Command)
    
    $cmdType = $Command.command
    $params = $Command.params
    $cmdId = $Command.command_id
    
    Write-Log "Verarbeite Befehl: $cmdType (ID: $cmdId)"
    
    $success = $false
    $output = ""
    $error = ""
    
    try {
        switch ($cmdType) {
            "message" {
                $text = $params.text
                $duration = if ($params.duration_minutes) { [int]$params.duration_minutes } else { 0 }
                Show-BigMessage -Message $text -DurationMinutes $duration
                $output = "Nachricht angezeigt"
                $success = $true
            }
            "restart_agent" {
                $output = "Agent wird neugestartet"
                $success = $true
                # Neustart nach Antwort
                Start-Job -ScriptBlock {
                    Start-Sleep -Seconds 2
                    Restart-Computer -Force
                }
            }
            "restart_pc" {
                $output = "PC wird neugestartet"
                $success = $true
                Start-Job -ScriptBlock {
                    Start-Sleep -Seconds 2
                    Restart-Computer -Force
                }
            }
            "shutdown_pc" {
                $output = "PC wird heruntergefahren"
                $success = $true
                Start-Job -ScriptBlock {
                    Start-Sleep -Seconds 2
                    Stop-Computer -Force
                }
            }
            "run_script" {
                $script = $params.script
                $result = Invoke-Expression $script
                $output = $result | Out-String
                $success = $true
            }
            "update_config" {
                if ($params.heartbeat_interval) {
                    $global:HeartbeatInterval = $params.heartbeat_interval
                    Write-Log "Heartbeat-Intervall auf $($params.heartbeat_interval) Sekunden gesetzt"
                }
                $output = "Konfiguration aktualisiert"
                $success = $true
            }
            default {
                $output = "Unbekannter Befehl: $cmdType"
                $error = "Nicht implementiert"
            }
        }
    } catch {
        $error = $_.Exception.Message
        Write-Log "Fehler bei Befehl $cmdType : $error"
    }
    
    # Ergebnis an Server melden
    $resultBody = @{
        device_id = $global:DeviceId
        command_id = $cmdId
        success = $success
        output = $output
        error = $error
    }
    
    Invoke-ApiCall -Endpoint "remote/result" -Method "POST" -Body $resultBody
}

# ==================== HAUPTSCHLEIFE ====================
function Start-AgentLoop {
    Write-Log "=== TSRID Agent Service V9 gestartet ==="
    Write-Log "API URL: $ApiUrl"
    Write-Log "Computer: $global:ComputerName"
    
    # Device ID generieren
    $global:DeviceId = Get-DeviceId
    Write-Log "Device ID: $global:DeviceId"
    
    # Initial registrieren
    Register-Device
    
    $lastHeartbeat = [DateTime]::MinValue
    $lastCommandPoll = [DateTime]::MinValue
    
    while ($true) {
        $now = Get-Date
        
        # Heartbeat senden
        if (($now - $lastHeartbeat).TotalSeconds -ge $HeartbeatInterval) {
            Send-Heartbeat
            $lastHeartbeat = $now
        }
        
        # Commands pollen (alle 5 Sekunden fuer Echtzeit-Reaktion)
        if (($now - $lastCommandPoll).TotalSeconds -ge $CommandPollInterval) {
            Get-PendingCommands
            $lastCommandPoll = $now
        }
        
        Start-Sleep -Seconds 1
    }
}

# ==================== START ====================
Start-AgentLoop
