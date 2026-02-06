# ============================================================
# TSRID Agent - PowerShell Setup Script
# Installiert automatisch alle Voraussetzungen inkl. Node.js
# ============================================================

param(
    [switch]$Install,
    [switch]$Build,
    [switch]$Start,
    [switch]$All,
    [switch]$Silent,
    [switch]$Help
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallersDir = Join-Path $ScriptDir "installers"

# Node.js Version
$NodeVersion = "20.11.0"
$NodeInstallerName = "node-v$NodeVersion-x64.msi"
$NodeDownloadUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeInstallerName"

# Farben
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[!] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[FEHLER] $args" -ForegroundColor Red }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║        TSRID Agent - Automatisches Setup              ║" -ForegroundColor Cyan
    Write-Host "  ║                   Version 1.1.0                       ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Hilfe
function Show-Help {
    Write-Host "Verwendung: .\setup.ps1 [Optionen]"
    Write-Host ""
    Write-Host "Optionen:"
    Write-Host "  -Install    Dependencies installieren"
    Write-Host "  -Build      Windows Installer bauen"
    Write-Host "  -Start      App starten"
    Write-Host "  -All        Alles (Install + Build)"
    Write-Host "  -Silent     Keine Benutzerinteraktion"
    Write-Host "  -Help       Diese Hilfe"
    Write-Host ""
    Write-Host "Beispiele:"
    Write-Host "  .\setup.ps1              # Interaktives Menue"
    Write-Host "  .\setup.ps1 -All         # Vollautomatisch"
    Write-Host "  .\setup.ps1 -All -Silent # Komplett still"
    Write-Host ""
}

# Node.js Installation prüfen und ggf. installieren
function Ensure-NodeJS {
    Write-Info "Pruefe Node.js..."
    
    # Prüfen ob Node.js verfügbar
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    
    if ($nodeCmd) {
        $version = & node --version 2>$null
        Write-Success "Node.js gefunden: $version"
        return $true
    }
    
    Write-Warn "Node.js nicht gefunden - wird installiert..."
    
    # Installer-Verzeichnis erstellen
    if (-not (Test-Path $InstallersDir)) {
        New-Item -ItemType Directory -Path $InstallersDir -Force | Out-Null
    }
    
    $installerPath = Join-Path $InstallersDir $NodeInstallerName
    
    # Download falls nicht vorhanden
    if (-not (Test-Path $installerPath)) {
        Write-Info "Lade Node.js v$NodeVersion herunter..."
        Write-Host "       URL: $NodeDownloadUrl" -ForegroundColor Gray
        
        try {
            # Progress Bar deaktivieren für schnelleren Download
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $NodeDownloadUrl -OutFile $installerPath -UseBasicParsing
            Write-Success "Download abgeschlossen"
        } catch {
            Write-Err "Download fehlgeschlagen: $_"
            return $false
        }
    } else {
        Write-Info "Node.js Installer bereits vorhanden"
    }
    
    # Installation
    Write-Info "Installiere Node.js (bitte warten)..."
    
    try {
        $process = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installerPath`" /qn /norestart" -Wait -PassThru
        
        if ($process.ExitCode -ne 0) {
            Write-Err "Installation fehlgeschlagen (Exit Code: $($process.ExitCode))"
            return $false
        }
        
        # PATH aktualisieren
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path += ";C:\Program Files\nodejs"
        
        # Kurz warten
        Start-Sleep -Seconds 3
        
        # Verifizieren
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCmd) {
            $version = & node --version 2>$null
            Write-Success "Node.js erfolgreich installiert: $version"
            return $true
        } else {
            Write-Warn "Node.js installiert, aber PATH muss aktualisiert werden"
            Write-Host "       Bitte Terminal neu starten und Script erneut ausfuehren" -ForegroundColor Yellow
            return $false
        }
        
    } catch {
        Write-Err "Installation fehlgeschlagen: $_"
        return $false
    }
}

# npm prüfen
function Ensure-NPM {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCmd) {
        $env:Path += ";C:\Program Files\nodejs"
        $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    }
    
    if ($npmCmd) {
        $version = & npm --version 2>$null
        Write-Success "npm gefunden: v$version"
        return $true
    }
    
    Write-Err "npm nicht gefunden"
    return $false
}

# Dependencies installieren
function Install-Dependencies {
    Write-Info "Installiere npm Dependencies..."
    
    Set-Location $ScriptDir
    
    & npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install fehlgeschlagen"
        return $false
    }
    Write-Success "Dependencies installiert"
    
    Write-Info "Baue native Module..."
    & npx electron-rebuild -f 2>&1 | Out-Null
    Write-Success "Native Module gebaut"
    
    return $true
}

# Verzeichnisse erstellen
function Initialize-Directories {
    Write-Info "Erstelle Verzeichnisse..."
    
    $dirs = @(
        "$env:PROGRAMDATA\TSRID",
        "$env:PROGRAMDATA\TSRID\database",
        "$env:PROGRAMDATA\TSRID\config",
        "$env:PROGRAMDATA\TSRID\logs",
        "$env:PROGRAMDATA\TSRID\offline-data",
        "$ScriptDir\offline-data"
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Success "Verzeichnisse erstellt"
}

# Offline-Daten laden
function Download-OfflineData {
    Write-Info "Lade Offline-Standortdaten..."
    
    $url = "https://tablet-agent-1.preview.emergentagent.com/api/agent/locations/export"
    $outputFile = Join-Path $ScriptDir "offline-data\locations_cache.json"
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        $response.Content | Out-File -FilePath $outputFile -Encoding UTF8
        
        $data = $response.Content | ConvertFrom-Json
        Write-Success "$($data.count) Standorte heruntergeladen"
    } catch {
        Write-Warn "Standortdaten konnten nicht geladen werden"
    }
}

# App starten
function Start-App {
    Write-Info "Starte TSRID Agent..."
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║                 TASTENKOMBINATIONEN                   ║" -ForegroundColor Yellow
    Write-Host "  ╠═══════════════════════════════════════════════════════╣" -ForegroundColor Yellow
    Write-Host "  ║  Ctrl+Shift+Alt+Q = Admin-Modus                       ║" -ForegroundColor Yellow
    Write-Host "  ║  F12              = DevTools                          ║" -ForegroundColor Yellow
    Write-Host "  ║  Admin-Passwort   = tsrid2024!                        ║" -ForegroundColor Yellow
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location $ScriptDir
    & npm start
}

# Installer bauen
function Build-Installer {
    Write-Info "Erstelle Windows Installer..."
    Write-Host "       Dies kann 2-3 Minuten dauern..." -ForegroundColor Gray
    
    Set-Location $ScriptDir
    
    & npm run build:win 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build fehlgeschlagen"
        return $false
    }
    
    Write-Success "Windows Installer erstellt!"
    
    $installerPath = Join-Path $ScriptDir "dist"
    $installerFile = Get-ChildItem -Path $installerPath -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($installerFile) {
        Write-Host ""
        Write-Host "  Installer: " -NoNewline
        Write-Host $installerFile.FullName -ForegroundColor Green
        Write-Host ""
        
        if (-not $Silent) {
            Start-Process explorer.exe -ArgumentList $installerPath
        }
    }
    
    return $true
}

# Menü
function Show-Menu {
    Write-Host "  Was moechten Sie tun?"
    Write-Host ""
    Write-Host "  [1] Vollstaendiges Setup"
    Write-Host "  [2] App starten"
    Write-Host "  [3] Windows Installer bauen"
    Write-Host "  [4] Alles (Setup + Build)"
    Write-Host "  [5] Beenden"
    Write-Host ""
    
    $choice = Read-Host "  Ihre Wahl (1-5)"
    
    switch ($choice) {
        "1" {
            if (-not (Ensure-NodeJS)) { return }
            if (-not (Ensure-NPM)) { return }
            Install-Dependencies
            Initialize-Directories
            Download-OfflineData
            Write-Success "Setup abgeschlossen!"
        }
        "2" { Start-App }
        "3" { Build-Installer }
        "4" {
            if (-not (Ensure-NodeJS)) { return }
            if (-not (Ensure-NPM)) { return }
            Install-Dependencies
            Initialize-Directories
            Download-OfflineData
            Build-Installer
            Write-Success "Alles erledigt!"
        }
        "5" {
            Write-Host "Auf Wiedersehen!"
            exit 0
        }
        default {
            Write-Warn "Ungueltige Auswahl"
            Show-Menu
        }
    }
}

# ============================================================
# HAUPTPROGRAMM
# ============================================================

Show-Banner

if ($Help) {
    Show-Help
    exit 0
}

Set-Location $ScriptDir

# Automatische Modi
if ($All -or $Install -or $Build -or $Start) {
    if (-not (Ensure-NodeJS)) {
        Write-Err "Node.js konnte nicht installiert werden"
        exit 1
    }
    if (-not (Ensure-NPM)) {
        Write-Err "npm nicht verfuegbar"
        exit 1
    }
}

if ($All) {
    Install-Dependencies
    Initialize-Directories
    Download-OfflineData
    Build-Installer
    Write-Success "Alles erledigt!"
    exit 0
}

if ($Install) {
    Install-Dependencies
    Initialize-Directories
    Download-OfflineData
    Write-Success "Installation abgeschlossen!"
    exit 0
}

if ($Build) {
    Build-Installer
    exit 0
}

if ($Start) {
    Start-App
    exit 0
}

# Interaktiv
if (-not (Ensure-NodeJS)) {
    Write-Host ""
    Write-Host "Druecken Sie eine Taste zum Beenden..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Ensure-NPM | Out-Null

Write-Host ""
Show-Menu

Write-Host ""
Write-Host "Druecken Sie eine Taste zum Beenden..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
