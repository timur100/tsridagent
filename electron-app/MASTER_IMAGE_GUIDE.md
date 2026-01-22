# TSRID Tablet Master-Image Erstellungs-Guide

## 📋 Übersicht

Dieses Dokument beschreibt die Erstellung eines Windows 11 Master-Images für das Deployment von 100+ TSRID Verification Tablets.

---

## 🖥️ Hardware-Anforderungen

### Empfohlene Tablet-Spezifikationen:
| Komponente | Minimum | Empfohlen |
|------------|---------|-----------|
| CPU | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |
| RAM | 4 GB | 8 GB |
| Speicher | 64 GB SSD | 128 GB SSD |
| Display | 10" Touch | 12" Touch |
| USB | 2x USB 3.0 | 3x USB 3.0 |
| Netzwerk | WiFi 5 | WiFi 6 + LAN |
| OS | Windows 11 Home | Windows 11 Pro |

### Unterstützte Scanner:
- **Regula** (ID-Dokumente)
- **Desko** (ID-Dokumente)
- **USB Barcode Scanner** (optional)

---

## 📦 Phase 1: Basis-System vorbereiten

### 1.1 Windows 11 Pro Installation

```powershell
# Nach Windows-Installation als Administrator:

# Windows Updates installieren
Install-WindowsUpdate -AcceptAll -AutoReboot

# Unnötige Apps entfernen
Get-AppxPackage *xbox* | Remove-AppxPackage
Get-AppxPackage *zune* | Remove-AppxPackage
Get-AppxPackage *bing* | Remove-AppxPackage
Get-AppxPackage *solitaire* | Remove-AppxPackage
```

### 1.2 Lokalen Admin-Account erstellen

```powershell
# TSRID Service Account erstellen
$Password = ConvertTo-SecureString "TsridAdmin2024!" -AsPlainText -Force
New-LocalUser -Name "TSRIDAdmin" -Password $Password -FullName "TSRID Administrator" -Description "Service Account für TSRID App"
Add-LocalGroupMember -Group "Administrators" -Member "TSRIDAdmin"

# Kiosk-Benutzer erstellen (eingeschränkt)
$KioskPassword = ConvertTo-SecureString "Kiosk123!" -AsPlainText -Force
New-LocalUser -Name "TSRIDKiosk" -Password $KioskPassword -FullName "TSRID Kiosk" -Description "Eingeschränkter Kiosk-Benutzer"
```

### 1.3 Ordnerstruktur erstellen

```powershell
# Verzeichnisse erstellen
New-Item -ItemType Directory -Force -Path "C:\Program Files\TSRID"
New-Item -ItemType Directory -Force -Path "C:\Program Files\TSRID\app"
New-Item -ItemType Directory -Force -Path "C:\Program Files\TSRID\logs"
New-Item -ItemType Directory -Force -Path "C:\Program Files\TSRID\updates"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\TSRID"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\TSRID\database"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\TSRID\config"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\TSRID\scans"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\TSRID\offline-data"
```

---

## 📦 Phase 2: Scanner SDKs installieren

### 2.1 Regula SDK

```powershell
# Regula Document Reader SDK installieren
# Download von: https://regulaforensics.com/
# Installer: Regula_Document_Reader_SDK_Windows_x64.exe

# Nach Installation - Umgebungsvariable setzen
[Environment]::SetEnvironmentVariable("REGULA_SDK_PATH", "C:\Program Files\Regula\Document Reader SDK", "Machine")

# Treiber für Regula Scanner
# pnputil /add-driver "C:\Regula\Drivers\*.inf" /install
```

### 2.2 Desko SDK

```powershell
# Desko PENTA Scanner SDK installieren
# Download von: https://www.desko.com/
# Installer: DESKO_PENTA_SDK_Setup.exe

# Nach Installation - Umgebungsvariable setzen
[Environment]::SetEnvironmentVariable("DESKO_SDK_PATH", "C:\Program Files\DESKO\SDK", "Machine")
```

### 2.3 Scanner-Erkennung testen

```powershell
# USB-Geräte auflisten
Get-PnpDevice -Class USB | Where-Object {$_.Status -eq "OK"} | Format-Table Name, DeviceID

# Regula Scanner suchen (VID: 0x1DDA)
Get-PnpDevice | Where-Object {$_.DeviceID -like "*VID_1DDA*"}

# Desko Scanner suchen (VID: 0x0403 für FTDI oder spezifisch)
Get-PnpDevice | Where-Object {$_.DeviceID -like "*VID_0403*" -or $_.DeviceID -like "*DESKO*"}
```

---

## 📦 Phase 3: Node.js & Electron App

### 3.1 Node.js LTS installieren

```powershell
# Node.js 20 LTS installieren (winget)
winget install OpenJS.NodeJS.LTS

# Oder manuell von https://nodejs.org/
# Empfohlen: node-v20.x.x-x64.msi

# Überprüfen
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 3.2 Electron App installieren

```powershell
# App-Verzeichnis
cd "C:\Program Files\TSRID\app"

# Electron App kopieren (von Build-Server oder USB)
# Die gebaute App liegt in: electron-app\dist\win-unpacked\

# Oder komplett neu bauen:
# git clone [repo] .
# npm install
# npm run build:win
```

### 3.3 SQLite vorbereiten

Die SQLite-Datenbank wird automatisch erstellt beim ersten Start.
Schema liegt in der App unter: `/src/database/schema.sql`

```sql
-- Wird automatisch erstellt in: C:\ProgramData\TSRID\database\tsrid.sqlite

-- Offline Standort-Liste (wird aus MongoDB exportiert)
CREATE TABLE IF NOT EXISTS locations_cache (
    location_code TEXT PRIMARY KEY,
    name TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tenant_id TEXT,
    tenant_name TEXT,
    updated_at DATETIME
);

-- Lokale Scans (Offline-Queue)
CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    scan_type TEXT,
    document_type TEXT,
    document_number TEXT,
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    nationality TEXT,
    expiry_date TEXT,
    mrz_data TEXT,
    face_image BLOB,
    document_image BLOB,
    result TEXT,
    confidence_score REAL,
    location_code TEXT,
    device_id TEXT,
    operator_id TEXT,
    scanned_at DATETIME,
    synced_at DATETIME,
    sync_status TEXT DEFAULT 'pending',
    raw_data TEXT
);

-- Geräte-Konfiguration
CREATE TABLE IF NOT EXISTS device_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync-Protokoll
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    records_count INTEGER,
    status TEXT,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME
);

-- Offline-Befehle (vom Server, wenn wieder online)
CREATE TABLE IF NOT EXISTS pending_commands (
    id TEXT PRIMARY KEY,
    command_type TEXT,
    command_data TEXT,
    received_at DATETIME,
    executed_at DATETIME,
    status TEXT DEFAULT 'pending'
);
```

### 3.4 Standort-Liste für Offline-Setup exportieren

```javascript
// Dieses Script läuft auf dem Server und exportiert alle Standorte
// Export nach: locations_cache.json

const { MongoClient } = require('mongodb');
const fs = require('fs');

async function exportLocations() {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    
    const db = client.db('tsrid_db');
    const locations = await db.collection('tenants')
        .find({ tenant_level: 'location' })
        .project({
            _id: 0,
            location_code: 1,
            name: 1,
            display_name: 1,
            address: 1,
            city: 1,
            country_code: 1,
            tenant_id: 1,
            parent_tenant_id: 1
        })
        .toArray();
    
    fs.writeFileSync(
        'C:\\ProgramData\\TSRID\\offline-data\\locations_cache.json',
        JSON.stringify(locations, null, 2)
    );
    
    console.log(`Exported ${locations.length} locations`);
    await client.close();
}

exportLocations();
```

---

## 📦 Phase 4: Windows-Dienst einrichten

### 4.1 NSSM (Non-Sucking Service Manager) installieren

```powershell
# NSSM herunterladen
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "C:\temp\nssm.zip"
Expand-Archive -Path "C:\temp\nssm.zip" -DestinationPath "C:\Program Files\TSRID"
Copy-Item "C:\Program Files\TSRID\nssm-2.24\win64\nssm.exe" "C:\Program Files\TSRID\nssm.exe"
```

### 4.2 TSRID Service konfigurieren (NICHT starten - wird beim Setup gemacht)

```powershell
# Service installieren aber NICHT starten
& "C:\Program Files\TSRID\nssm.exe" install TSRIDAgent "C:\Program Files\TSRID\app\TSRID Admin Portal.exe"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent AppDirectory "C:\Program Files\TSRID\app"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent DisplayName "TSRID Verification Agent"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent Description "TSRID ID Verification Kiosk Agent"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent Start SERVICE_AUTO_START
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent ObjectName ".\TSRIDKiosk" "Kiosk123!"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent AppStdout "C:\Program Files\TSRID\logs\service.log"
& "C:\Program Files\TSRID\nssm.exe" set TSRIDAgent AppStderr "C:\Program Files\TSRID\logs\error.log"

# Service auf "Manuell" setzen (wird beim Setup auf Auto gestellt)
Set-Service -Name "TSRIDAgent" -StartupType Manual
```

---

## 📦 Phase 5: Kiosk-Modus vorbereiten

### 5.1 Assigned Access (Windows Kiosk) vorbereiten

```powershell
# Kiosk-Konfiguration erstellen (wird beim Setup aktiviert)
$kioskConfig = @"
<?xml version="1.0" encoding="utf-8" ?>
<AssignedAccessConfiguration 
    xmlns="http://schemas.microsoft.com/AssignedAccess/2017/config"
    xmlns:rs5="http://schemas.microsoft.com/AssignedAccess/201810/config">
    <Profiles>
        <Profile Id="{TSRID-KIOSK-PROFILE}">
            <AllAppsList>
                <AllowedApps>
                    <App AppUserModelId="TSRIDAgent" />
                </AllowedApps>
            </AllAppsList>
            <rs5:FileExplorerNamespaceRestrictions>
                <rs5:AllowedNamespace Name="Downloads" />
            </rs5:FileExplorerNamespaceRestrictions>
            <StartLayout>
                <![CDATA[<LayoutModificationTemplate xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification" xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout" xmlns:start="http://schemas.microsoft.com/Start/2014/StartLayout" Version="1">
                  <LayoutOptions StartTileGroupCellWidth="6" />
                  <DefaultLayoutOverride>
                    <StartLayoutCollection>
                      <defaultlayout:StartLayout GroupCellWidth="6" />
                    </StartLayoutCollection>
                  </DefaultLayoutOverride>
                </LayoutModificationTemplate>]]>
            </StartLayout>
            <Taskbar ShowTaskbar="false" />
        </Profile>
    </Profiles>
    <Configs>
        <Config>
            <Account>TSRIDKiosk</Account>
            <DefaultProfile Id="{TSRID-KIOSK-PROFILE}" />
        </Config>
    </Configs>
</AssignedAccessConfiguration>
"@

$kioskConfig | Out-File -FilePath "C:\ProgramData\TSRID\config\kiosk-config.xml" -Encoding UTF8
```

### 5.2 Shell Launcher (Alternative zu Assigned Access)

```powershell
# Für mehr Kontrolle: Shell Launcher Feature aktivieren
Enable-WindowsOptionalFeature -Online -FeatureName "Client-EmbeddedShellLauncher" -All -NoRestart

# Shell Launcher Konfiguration
$shellConfig = @{
    Shell = "C:\Program Files\TSRID\app\TSRID Admin Portal.exe"
    DefaultAction = "RestartShell"  # Bei Crash: Neu starten
}

# Wird beim Setup angewendet
```

---

## 📦 Phase 6: Firewall & Netzwerk

### 6.1 Firewall-Regeln

```powershell
# Ausgehende Verbindungen für Sync erlauben
New-NetFirewallRule -DisplayName "TSRID Agent - MongoDB Atlas" `
    -Direction Outbound `
    -Program "C:\Program Files\TSRID\app\TSRID Admin Portal.exe" `
    -Action Allow `
    -Protocol TCP `
    -RemotePort 27017,443

# Eingehende Verbindungen für Remote-Management (optional)
New-NetFirewallRule -DisplayName "TSRID Agent - Remote Management" `
    -Direction Inbound `
    -Program "C:\Program Files\TSRID\app\TSRID Admin Portal.exe" `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 8080
```

### 6.2 Proxy-Einstellungen (falls benötigt)

```powershell
# Proxy für TSRID App setzen (optional)
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "", "Machine")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "", "Machine")
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1", "Machine")
```

---

## 📦 Phase 7: Auto-Update vorbereiten

### 7.1 Update-Verzeichnis

```powershell
# Update-Verzeichnis mit Schreibrechten für Service
$acl = Get-Acl "C:\Program Files\TSRID\updates"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("TSRIDKiosk", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl "C:\Program Files\TSRID\updates" $acl
```

### 7.2 Update-Konfiguration

```json
// C:\ProgramData\TSRID\config\update-config.json
{
    "updateServerUrl": "https://your-server.com/api/agent/updates",
    "checkInterval": 3600000,
    "autoInstall": true,
    "channel": "stable"
}
```

---

## 📦 Phase 8: Sysprep & Image erstellen

### 8.1 Cleanup vor Sysprep

```powershell
# Temporäre Dateien löschen
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\*\AppData\Local\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# Windows Update Cache leeren
Stop-Service -Name wuauserv
Remove-Item -Path "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force
Start-Service -Name wuauserv

# Prefetch leeren
Remove-Item -Path "C:\Windows\Prefetch\*" -Force -ErrorAction SilentlyContinue

# Event Logs leeren
wevtutil cl Application
wevtutil cl Security
wevtutil cl System

# Browser-Cache (falls vorhanden)
Remove-Item -Path "C:\Users\*\AppData\Local\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 8.2 Sysprep Antwortdatei erstellen

```xml
<!-- C:\Windows\System32\Sysprep\unattend.xml -->
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <settings pass="specialize">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
            <ComputerName>TSRID-*</ComputerName>
            <TimeZone>W. Europe Standard Time</TimeZone>
        </component>
    </settings>
    <settings pass="oobeSystem">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
            <OOBE>
                <HideEULAPage>true</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>
                <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
                <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
                <ProtectYourPC>3</ProtectYourPC>
            </OOBE>
            <UserAccounts>
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Name>TSRIDKiosk</Name>
                        <Group>Users</Group>
                        <Password>
                            <Value>Kiosk123!</Value>
                            <PlainText>true</PlainText>
                        </Password>
                    </LocalAccount>
                </LocalAccounts>
            </UserAccounts>
            <AutoLogon>
                <Enabled>true</Enabled>
                <Username>TSRIDKiosk</Username>
                <Password>
                    <Value>Kiosk123!</Value>
                    <PlainText>true</PlainText>
                </Password>
                <LogonCount>999</LogonCount>
            </AutoLogon>
            <FirstLogonCommands>
                <SynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <CommandLine>powershell -ExecutionPolicy Bypass -File "C:\Program Files\TSRID\scripts\first-boot.ps1"</CommandLine>
                    <Description>TSRID First Boot Setup</Description>
                </SynchronousCommand>
            </FirstLogonCommands>
        </component>
    </settings>
</unattend>
```

### 8.3 First-Boot Script

```powershell
# C:\Program Files\TSRID\scripts\first-boot.ps1

# Einzigartige Device-ID generieren
$deviceId = [System.Guid]::NewGuid().ToString()
$deviceId | Out-File "C:\ProgramData\TSRID\config\device-id.txt"

# Hardware-Info sammeln
$hardwareInfo = @{
    DeviceId = $deviceId
    ComputerName = $env:COMPUTERNAME
    SerialNumber = (Get-WmiObject -Class Win32_BIOS).SerialNumber
    Manufacturer = (Get-WmiObject -Class Win32_ComputerSystem).Manufacturer
    Model = (Get-WmiObject -Class Win32_ComputerSystem).Model
    WindowsVersion = (Get-WmiObject -Class Win32_OperatingSystem).Version
    TotalRAM = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    CreatedAt = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
}

$hardwareInfo | ConvertTo-Json | Out-File "C:\ProgramData\TSRID\config\hardware-info.json"

# Setup-Modus markieren
"SETUP_REQUIRED" | Out-File "C:\ProgramData\TSRID\config\status.txt"

# TSRID App starten (zeigt Setup-Screen)
Start-Process "C:\Program Files\TSRID\app\TSRID Admin Portal.exe"
```

### 8.4 Sysprep ausführen

```powershell
# WICHTIG: Vor Sysprep alle Programme schließen!

# Sysprep im Audit-Modus (für weitere Anpassungen)
# C:\Windows\System32\Sysprep\sysprep.exe /audit /reboot

# Sysprep für Image-Erstellung (FINAL)
C:\Windows\System32\Sysprep\sysprep.exe /generalize /oobe /shutdown /unattend:C:\Windows\System32\Sysprep\unattend.xml
```

---

## 📦 Phase 9: Image erstellen & verteilen

### 9.1 Mit DISM (Windows-Boardmittel)

```powershell
# Von einem anderen PC mit Windows PE booten
# Oder von einer Windows-Installations-USB

# Image erfassen
Dism /Capture-Image /ImageFile:D:\Images\TSRID-Master.wim /CaptureDir:C:\ /Name:"TSRID Master Image v1.0" /Description:"TSRID Verification Tablet - Master Image" /Compress:max

# Image auf neues Tablet anwenden
Dism /Apply-Image /ImageFile:D:\Images\TSRID-Master.wim /Index:1 /ApplyDir:C:\
```

### 9.2 Mit Clonezilla (Empfohlen für 100+ Geräte)

```bash
# 1. Clonezilla Live USB erstellen
# Download: https://clonezilla.org/downloads.php

# 2. Master-Tablet mit Clonezilla booten

# 3. "device-image" wählen → "local_dev" → USB-Festplatte auswählen

# 4. "Beginner" → "savedisk" → Image-Name eingeben: "TSRID-Master-v1.0"

# 5. Komprimierung: -z1p (parallel gzip, schneller)

# 6. Image wird auf USB-Festplatte gespeichert

# Restore auf neues Tablet:
# 1. Clonezilla booten
# 2. "device-image" → "local_dev" → USB auswählen
# 3. "Beginner" → "restoredisk" → Image auswählen → Ziel-Disk
```

### 9.3 Netzwerk-basiertes Deployment (für 100 Geräte optimal)

```powershell
# Windows Deployment Services (WDS) auf einem Server einrichten
# Oder: FOG Project (Open Source)

# FOG Project Setup:
# 1. FOG Server installieren (Ubuntu/Debian empfohlen)
# 2. Master-Image hochladen
# 3. Tablets per PXE booten
# 4. Image wird automatisch deployed

# Vorteile:
# - Kein USB-Stick pro Tablet nötig
# - Paralleles Deployment möglich
# - Zentrale Image-Verwaltung
```

---

## 📋 Deployment-Checkliste pro Tablet

### Vor-Ort Setup (ca. 2-3 Minuten pro Gerät)

```
□ 1. Tablet einschalten (bootet automatisch in Setup-Modus)

□ 2. "SETUP ERFORDERLICH" Screen wird angezeigt

□ 3. Tastenkombination drücken: Ctrl + Shift + Alt + Q

□ 4. Admin-Passwort eingeben: [Standard-Passwort]

□ 5. Im Admin-Menü:
    □ Standort auswählen (aus Offline-Liste oder Suche)
    □ Scanner wird automatisch erkannt
    □ Drucker auswählen (falls vorhanden)
    
□ 6. "Setup abschließen" klicken

□ 7. Tablet startet neu in Kiosk-Modus

□ 8. Test-Scan durchführen

□ 9. Sync-Status prüfen (grüner Punkt = verbunden)

□ 10. Fertig! ✓
```

---

## 🔧 Troubleshooting

### Problem: Scanner wird nicht erkannt
```powershell
# USB-Geräte prüfen
Get-PnpDevice -Class USB | Where-Object {$_.Status -eq "Error"}

# Treiber neu installieren
pnputil /scan-devices
```

### Problem: Sync funktioniert nicht
```powershell
# Netzwerk testen
Test-NetConnection -ComputerName "your-mongodb-atlas-cluster.mongodb.net" -Port 27017

# Firewall prüfen
Get-NetFirewallRule -DisplayName "*TSRID*" | Format-Table Name, Enabled, Action
```

### Problem: Kiosk-Modus lässt sich nicht beenden
```
# Tastenkombination: Ctrl + Shift + Alt + Q
# Falls das nicht funktioniert:
# 1. Tablet neu starten
# 2. Beim Booten F8 drücken → Abgesicherter Modus
# 3. Als Administrator anmelden
# 4. Kiosk-Modus deaktivieren
```

---

## 📞 Support

Bei Problemen:
- Admin Portal: Settings → Support
- Log-Dateien: `C:\Program Files\TSRID\logs\`
- Remote-Support: TeamViewer-ID im Admin-Menü

---

*Dokumentversion: 1.0*
*Erstellt: Januar 2025*
*Für: TSRID Verification System*
