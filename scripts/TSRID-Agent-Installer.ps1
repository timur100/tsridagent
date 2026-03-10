# ============================================================
# TSRID Agent Installer - Version 16
# Fuer Massenausrollung via TeamViewer
# ============================================================
# ANLEITUNG: In PowerShell (Administrator) einfuegen und Enter druecken
# ============================================================

$ApiUrl = "https://electron-regula-hub.preview.emergentagent.com"
$InstallPath = "C:\TSRID-Agent"
$ScriptPath = "$InstallPath\TSRID-Agent-Service.ps1"
$LogPath = "$InstallPath\agent.log"
$TaskName = "TSRID-Agent"

# Cleanup alte Installation
Write-Host "=== TSRID Agent Installer V16 ===" -ForegroundColor Cyan
Write-Host "[1/5] Bereinige alte Installation..." -ForegroundColor Yellow

try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
Stop-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*TSRID*" }
if (Test-Path $InstallPath) { Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue }

# Erstelle Verzeichnis
Write-Host "[2/5] Erstelle Verzeichnis..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null

# Erstelle Agent-Script
Write-Host "[3/5] Erstelle Agent-Script..." -ForegroundColor Yellow

$AgentScript = @'
# TSRID Agent Service V16
$ApiUrl = "https://electron-regula-hub.preview.emergentagent.com"
$LogFile = "C:\TSRID-Agent\agent.log"
$HeartbeatInterval = 30

function Write-Log($Message, $Level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

function Get-DeviceId {
    $uuid = (Get-WmiObject -Class Win32_ComputerSystemProduct).UUID
    $name = $env:COMPUTERNAME
    return "$name-$uuid"
}

function Get-HardwareInfo {
    try {
        $cs = Get-WmiObject -Class Win32_ComputerSystem
        $cpu = Get-WmiObject -Class Win32_Processor | Select-Object -First 1
        $os = Get-WmiObject -Class Win32_OperatingSystem
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $net = Get-WmiObject -Class Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
        $bios = Get-WmiObject -Class Win32_BIOS
        $csp = Get-WmiObject -Class Win32_ComputerSystemProduct
        
        # TeamViewer ID aus Registry
        $tvId = $null
        $tvPaths = @(
            "HKLM:\SOFTWARE\TeamViewer",
            "HKLM:\SOFTWARE\WOW6432Node\TeamViewer"
        )
        foreach ($p in $tvPaths) {
            if (Test-Path $p) {
                $tvId = (Get-ItemProperty -Path $p -ErrorAction SilentlyContinue).ClientID
                if ($tvId) { break }
            }
        }
        
        # Prozess-Status
        $tvStatus = if (Get-Process -Name "TeamViewer*" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }
        $tsridStatus = if (Get-Process -Name "TSRID*" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }
        
        return @{
            device_id = Get-DeviceId
            computername = $env:COMPUTERNAME
            uuid = $csp.UUID
            bios_serial = $bios.SerialNumber
            manufacturer = $cs.Manufacturer
            model = $cs.Model
            cpu = $cpu.Name
            ram_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
            mac_address = $net.MACAddress
            ip_address = ($net.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
            windows_version = $os.Caption
            windows_build = $os.BuildNumber
            teamviewer_id = $tvId
            teamviewer_status = $tvStatus
            tsrid_status = $tsridStatus
            disks = "C: $([math]::Round($disk.FreeSpace/1GB,1))GB frei / $([math]::Round($disk.Size/1GB,1))GB"
        }
    } catch {
        Write-Log "Fehler bei Hardware-Info: $_" "ERROR"
        return @{
            device_id = Get-DeviceId
            computername = $env:COMPUTERNAME
        }
    }
}

function Invoke-Api($Endpoint, $Method = "POST", $Body = $null) {
    $url = "$ApiUrl/api/device-agent/$Endpoint"
    $headers = @{ "Content-Type" = "application/json" }
    
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10 -Compress
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $json -TimeoutSec 30
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -TimeoutSec 30
        }
        return $response
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Log "API-Fehler ($Endpoint): $statusCode - $_" "ERROR"
        return $null
    }
}

# === HAUPTPROGRAMM ===
Write-Log "=== TSRID Agent V16 gestartet ===" "INFO"
Write-Log "Server: $ApiUrl" "INFO"
Write-Log "Device: $(Get-DeviceId)" "INFO"

# Initiale Registrierung mit vollstaendigen Hardware-Daten
$hwInfo = Get-HardwareInfo
$regResult = Invoke-Api -Endpoint "register" -Body $hwInfo
if ($regResult.success) {
    Write-Log "Registrierung erfolgreich" "INFO"
} else {
    Write-Log "Registrierung fehlgeschlagen" "ERROR"
}

# Heartbeat-Loop
$errorCount = 0
while ($true) {
    try {
        # Heartbeat senden
        $heartbeatData = @{
            device_id = Get-DeviceId
            computername = $env:COMPUTERNAME
            teamviewer_status = if (Get-Process -Name "TeamViewer*" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }
            tsrid_status = if (Get-Process -Name "TSRID*" -ErrorAction SilentlyContinue) { "running" } else { "stopped" }
            ip_address = (Get-WmiObject -Class Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled } | Select-Object -First 1).IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1
        }
        
        $response = Invoke-Api -Endpoint "heartbeat" -Body $heartbeatData
        
        if ($response.success) {
            $errorCount = 0
            
            # Remote-Befehle verarbeiten
            if ($response.commands -and $response.commands.Count -gt 0) {
                foreach ($cmd in $response.commands) {
                    Write-Log "Befehl empfangen: $($cmd.command)" "INFO"
                    
                    switch ($cmd.command) {
                        "restart_agent" {
                            Write-Log "Agent wird neu gestartet..." "INFO"
                            Start-ScheduledTask -TaskName "TSRID-Agent"
                            exit
                        }
                        "restart_pc" {
                            Write-Log "PC wird neu gestartet..." "INFO"
                            Restart-Computer -Force
                        }
                        "shutdown_pc" {
                            Write-Log "PC wird heruntergefahren..." "INFO"
                            Stop-Computer -Force
                        }
                        "run_script" {
                            if ($cmd.params.script) {
                                Write-Log "Script wird ausgefuehrt..." "INFO"
                                try {
                                    $scriptBlock = [ScriptBlock]::Create($cmd.params.script)
                                    $output = & $scriptBlock 2>&1
                                    Write-Log "Script-Output: $output" "INFO"
                                    
                                    # Ergebnis melden
                                    Invoke-Api -Endpoint "remote/result" -Body @{
                                        device_id = Get-DeviceId
                                        command_id = $cmd.command_id
                                        success = $true
                                        output = "$output"
                                    }
                                } catch {
                                    Write-Log "Script-Fehler: $_" "ERROR"
                                    Invoke-Api -Endpoint "remote/result" -Body @{
                                        device_id = Get-DeviceId
                                        command_id = $cmd.command_id
                                        success = $false
                                        error = "$_"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            $errorCount++
            Write-Log "Heartbeat fehlgeschlagen (Fehler #$errorCount)" "ERROR"
        }
        
        # Bei zu vielen Fehlern laengere Pause
        if ($errorCount -ge 10) {
            Write-Log "Zu viele Fehler - Pause 60s" "ERROR"
            Start-Sleep -Seconds 60
            $errorCount = 0
        }
        
    } catch {
        $errorCount++
        Write-Log "Loop-Fehler: $_ (Fehler #$errorCount)" "ERROR"
    }
    
    Start-Sleep -Seconds $HeartbeatInterval
}
'@

# Script speichern
$AgentScript | Out-File -FilePath $ScriptPath -Encoding UTF8 -Force

# Scheduled Task erstellen
Write-Host "[4/5] Erstelle Scheduled Task..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

# Task starten
Write-Host "[5/5] Starte Agent..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName

# Verifizierung
Start-Sleep -Seconds 3
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq "Running") {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  TSRID Agent V16 erfolgreich installiert!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Server: $ApiUrl" -ForegroundColor Cyan
    Write-Host "  Device: $env:COMPUTERNAME" -ForegroundColor Cyan
    Write-Host "  Status: RUNNING" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNUNG: Task wurde erstellt aber laeuft nicht" -ForegroundColor Yellow
    Write-Host "Manuell starten: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
}
