# ============================================================
# TSRID Agent - PowerShell Setup & Build Script
# Mit erweiterten Funktionen und Fehlerbehandlung
# ============================================================

param(
    [switch]$Install,      # Nur installieren
    [switch]$Build,        # Nur bauen
    [switch]$Start,        # Nur starten
    [switch]$All,          # Alles machen
    [switch]$Silent,       # Keine Benutzerinteraktion
    [switch]$Help          # Hilfe anzeigen
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Farben für Output
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[WARNUNG] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[FEHLER] $args" -ForegroundColor Red }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║     TSRID Agent - Automatisches Setup     ║" -ForegroundColor Cyan
    Write-Host "  ║           Version 1.1.0                   ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Hilfe anzeigen
function Show-Help {
    Write-Host "Verwendung: .\setup.ps1 [Optionen]"
    Write-Host ""
    Write-Host "Optionen:"
    Write-Host "  -Install    Nur Dependencies installieren"
    Write-Host "  -Build      Nur Windows Installer bauen"
    Write-Host "  -Start      Nur App starten"
    Write-Host "  -All        Alles ausfuehren (Install + Build)"
    Write-Host "  -Silent     Keine Benutzerinteraktion"
    Write-Host "  -Help       Diese Hilfe anzeigen"
    Write-Host ""
    Write-Host "Beispiele:"
    Write-Host "  .\setup.ps1              # Interaktives Menue"
    Write-Host "  .\setup.ps1 -All         # Alles automatisch"
    Write-Host "  .\setup.ps1 -Install     # Nur installieren"
    Write-Host "  .\setup.ps1 -Build       # Nur bauen"
    Write-Host ""
}

# Voraussetzungen prüfen
function Test-Prerequisites {
    Write-Info "Pruefe Voraussetzungen..."
    
    # Node.js
    $nodeVersion = $null
    try {
        $nodeVersion = (node --version 2>$null)
    } catch {}
    
    if (-not $nodeVersion) {
        Write-Err "Node.js nicht gefunden!"
        Write-Host ""
        Write-Host "Bitte installieren Sie Node.js 20 LTS von:" -ForegroundColor Yellow
        Write-Host "https://nodejs.org/" -ForegroundColor White
        Write-Host ""
        
        if (-not $Silent) {
            $install = Read-Host "Node.js jetzt automatisch installieren? (j/n)"
            if ($install -eq "j") {
                Install-NodeJS
            } else {
                throw "Node.js erforderlich"
            }
        } else {
            throw "Node.js nicht installiert"
        }
    } else {
        Write-Success "Node.js gefunden: $nodeVersion"
    }
    
    # npm
    $npmVersion = (npm --version 2>$null)
    if (-not $npmVersion) {
        Write-Err "npm nicht gefunden!"
        throw "npm nicht installiert"
    }
    Write-Success "npm gefunden: v$npmVersion"
    
    # Visual Studio Build Tools (optional check)
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        Write-Success "Visual Studio Build Tools gefunden"
    } else {
        Write-Warn "Visual Studio Build Tools nicht gefunden"
        Write-Host "  Native Module koennten Probleme haben." -ForegroundColor Yellow
        Write-Host "  Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Node.js automatisch installieren (winget)
function Install-NodeJS {
    Write-Info "Installiere Node.js via winget..."
    try {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        Write-Success "Node.js installiert. Bitte Terminal neu starten und Script erneut ausfuehren."
        exit 0
    } catch {
        Write-Err "Automatische Installation fehlgeschlagen."
        Write-Host "Bitte manuell von https://nodejs.org/ installieren"
        throw
    }
}

# Dependencies installieren
function Install-Dependencies {
    Write-Info "Installiere npm Dependencies..."
    
    Set-Location $ScriptDir
    
    # npm install
    $result = npm install 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install fehlgeschlagen"
        Write-Host $result
        throw "Installation fehlgeschlagen"
    }
    Write-Success "Dependencies installiert"
    
    # Native Module rebuilden
    Write-Info "Baue native Module (SQLite, USB, HID)..."
    
    try {
        npx electron-rebuild -f 2>&1 | Out-Null
        Write-Success "Native Module gebaut"
    } catch {
        Write-Warn "electron-rebuild hatte Probleme, versuche npm rebuild..."
        npm rebuild 2>&1 | Out-Null
    }
    
    Write-Host ""
}

# Verzeichnisse erstellen
function Initialize-Directories {
    Write-Info "Erstelle Datenverzeichnisse..."
    
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
    Write-Host ""
}

# Offline-Daten herunterladen
function Download-OfflineData {
    Write-Info "Lade Offline-Standortdaten..."
    
    $url = "https://stability-rescue-1.preview.emergentagent.com/api/agent/locations/export"
    $outputFile = "$ScriptDir\offline-data\locations_cache.json"
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        $response.Content | Out-File -FilePath $outputFile -Encoding UTF8
        
        $data = $response.Content | ConvertFrom-Json
        $count = $data.count
        
        Write-Success "$count Standorte heruntergeladen"
    } catch {
        Write-Warn "Standortdaten konnten nicht geladen werden (offline?)"
    }
    
    Write-Host ""
}

# App starten
function Start-App {
    Write-Info "Starte TSRID Agent..."
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║          TASTENKOMBINATIONEN              ║" -ForegroundColor Yellow
    Write-Host "  ╠═══════════════════════════════════════════╣" -ForegroundColor Yellow
    Write-Host "  ║  Ctrl+Shift+Alt+Q = Admin-Modus           ║" -ForegroundColor Yellow
    Write-Host "  ║  F12              = DevTools              ║" -ForegroundColor Yellow
    Write-Host "  ║  Admin-Passwort   = tsrid2024!            ║" -ForegroundColor Yellow
    Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location $ScriptDir
    npm start
}

# Windows Installer bauen
function Build-Installer {
    Write-Info "Erstelle Windows Installer..."
    Write-Host ""
    
    Set-Location $ScriptDir
    
    $result = npm run build:win 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build fehlgeschlagen"
        Write-Host $result
        throw "Build fehlgeschlagen"
    }
    
    Write-Success "Windows Installer erstellt!"
    Write-Host ""
    
    $installerPath = "$ScriptDir\dist"
    $installerFile = Get-ChildItem -Path $installerPath -Filter "*.exe" | Select-Object -First 1
    
    if ($installerFile) {
        Write-Host "  Installer: " -NoNewline
        Write-Host $installerFile.FullName -ForegroundColor Green
        Write-Host ""
        
        if (-not $Silent) {
            # Explorer öffnen
            Start-Process explorer.exe -ArgumentList $installerPath
        }
    }
    
    Write-Host ""
}

# Interaktives Menü
function Show-Menu {
    Write-Host "  Was moechten Sie tun?"
    Write-Host ""
    Write-Host "  [1] Vollstaendiges Setup (Install + Offline-Daten)"
    Write-Host "  [2] App starten (Test-Modus)"
    Write-Host "  [3] Windows Installer bauen"
    Write-Host "  [4] Alles (Setup + Test + Build)"
    Write-Host "  [5] Beenden"
    Write-Host ""
    
    $choice = Read-Host "  Ihre Wahl (1-5)"
    
    switch ($choice) {
        "1" {
            Test-Prerequisites
            Install-Dependencies
            Initialize-Directories
            Download-OfflineData
            Write-Success "Setup abgeschlossen!"
        }
        "2" {
            Start-App
        }
        "3" {
            Build-Installer
        }
        "4" {
            Test-Prerequisites
            Install-Dependencies
            Initialize-Directories
            Download-OfflineData
            Write-Host ""
            Write-Info "Starte App zum Testen. Schliessen Sie die App wenn fertig..."
            Start-App
            Write-Host ""
            Build-Installer
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

# Parameter-gesteuerte Ausführung
if ($All) {
    Test-Prerequisites
    Install-Dependencies
    Initialize-Directories
    Download-OfflineData
    Build-Installer
    Write-Host ""
    Write-Success "Alles erledigt!"
    exit 0
}

if ($Install) {
    Test-Prerequisites
    Install-Dependencies
    Initialize-Directories
    Download-OfflineData
    Write-Host ""
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

# Interaktives Menü (Standard)
Show-Menu

Write-Host ""
Write-Host "Druecken Sie eine Taste zum Beenden..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
