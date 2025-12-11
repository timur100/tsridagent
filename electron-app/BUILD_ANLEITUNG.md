# 🏗️ Build-Anleitung - Executable erstellen (.exe / .dmg / .AppImage)

## 🎯 Ziel

Diese Anleitung zeigt Ihnen, wie Sie aus der Electron-App eine **fertige, ausführbare Datei** erstellen, die Sie ohne Node.js starten und an Kollegen weitergeben können.

---

## 📋 Was wird erstellt?

### Windows:
- ✅ **Setup.exe** - Vollständiger Installer mit Deinstallation
- ✅ **Portable.exe** - Einzelne .exe ohne Installation
- ✅ **Automatische Updates** möglich (optional)

### macOS:
- ✅ **.dmg** - Drag-and-Drop Installer
- ✅ **Code Signing** möglich (für Distribution)

### Linux:
- ✅ **.AppImage** - Portable, keine Installation
- ✅ **.deb** - Debian/Ubuntu Paket
- ✅ **.rpm** - RedHat/Fedora Paket (optional)

---

## 🛠️ Build-Prozess

### Schritt 1: Vorbereitung

#### 1.1 Node.js & Yarn installieren

**Node.js:**
- Download: https://nodejs.org/
- Version: 18.x oder höher
- Prüfen: `node --version`

**Yarn:**
```bash
npm install -g yarn
```

#### 1.2 Projekt-Ordner öffnen

```bash
cd /pfad/zum/electron-app
```

#### 1.3 Dependencies installieren

```bash
yarn install
```

⏱️ Dauert 3-5 Minuten beim ersten Mal

---

### Schritt 2: Build für Ihre Plattform

#### 🪟 Windows Build

```bash
yarn build:win
```

**Was passiert:**
1. Electron-App wird gepackt
2. Windows-spezifische Dateien erstellt
3. Installer + Portable .exe generiert

**Output-Verzeichnis:**
```
electron-app/dist/
├── TSRID Admin Portal Setup 1.0.0.exe     ← Installer (empfohlen)
└── win-unpacked/
    └── TSRID Admin Portal.exe             ← Portable (kein Installer)
```

**Größe:** ~150-200 MB

**Installation:**
- **Setup.exe:** Doppelklick → Installation in Programme-Ordner
- **Portable.exe:** Doppelklick → Läuft sofort ohne Installation

---

#### 🍎 macOS Build

```bash
yarn build:mac
```

**Voraussetzung:**
- Muss auf einem **Mac** ausgeführt werden
- Xcode Command Line Tools: `xcode-select --install`

**Output:**
```
electron-app/dist/
└── TSRID Admin Portal-1.0.0.dmg
```

**Installation:**
1. .dmg öffnen
2. App-Icon in Applications-Ordner ziehen
3. Fertig!

---

#### 🐧 Linux Build

```bash
yarn build:linux
```

**Output:**
```
electron-app/dist/
├── TSRID Admin Portal-1.0.0.AppImage      ← Portable
├── tsrid-admin-portal_1.0.0_amd64.deb     ← Debian/Ubuntu
└── tsrid-admin-portal-1.0.0.x86_64.rpm    ← RedHat/Fedora
```

**Installation:**
- **AppImage:** Ausführbar machen (`chmod +x`) und starten
- **.deb:** `sudo dpkg -i *.deb`
- **.rpm:** `sudo rpm -i *.rpm`

---

#### 🌍 Multi-Platform Build

Alle Plattformen gleichzeitig bauen:

```bash
yarn build
```

⚠️ **Achtung:**
- Mac .dmg kann nur auf Mac gebaut werden
- Cross-Platform Build ist komplex und oft fehlerhaft
- **Empfehlung:** Jede Plattform auf ihrem nativen System bauen

---

### Schritt 3: Testen

#### Windows:
```cmd
cd dist
"TSRID Admin Portal Setup 1.0.0.exe"
```

Oder Portable:
```cmd
cd dist\win-unpacked
"TSRID Admin Portal.exe"
```

#### macOS:
```bash
open "dist/TSRID Admin Portal-1.0.0.dmg"
```

#### Linux:
```bash
chmod +x "dist/TSRID Admin Portal-1.0.0.AppImage"
./dist/TSRID\ Admin\ Portal-1.0.0.AppImage
```

---

## ⚙️ Build-Konfiguration anpassen

### App-Name & Version ändern

**Datei:** `package.json`

```json
{
  "name": "tsrid-admin-portal",
  "productName": "TSRID Admin Portal",
  "version": "1.0.0",
  "description": "TSRID Admin Portal Desktop App with USB Device Support",
  "author": "TSRID"
}
```

**Ändern Sie:**
- `productName` → Name der App
- `version` → Versionsnummer (z.B. 1.1.0)
- `description` → Beschreibung
- `author` → Ihr Name/Firma

---

### Icon anpassen

**Windows Icon (.ico):**
```bash
electron-app/assets/icon.ico
```
- Format: .ico
- Größe: 256x256 empfohlen
- Multi-Size .ico unterstützt mehrere Auflösungen

**macOS Icon (.icns):**
```bash
electron-app/assets/icon.icns
```
- Format: .icns
- Größe: 512x512 oder 1024x1024

**Linux Icon (.png):**
```bash
electron-app/assets/icon.png
```
- Format: .png
- Größe: 512x512

**Icon erstellen:**
- Online Tool: https://icoconvert.com/
- Von .png zu .ico / .icns konvertieren

---

### Build-Optionen anpassen

**Datei:** `package.json` → `"build"` Sektion

```json
"build": {
  "appId": "com.tsrid.adminportal",
  "productName": "TSRID Admin Portal",
  "directories": {
    "output": "dist"
  },
  "files": [
    "main.js",
    "preload.js",
    "assets/**/*"
  ],
  "win": {
    "target": ["nsis"],           // Installer-Typ
    "icon": "assets/icon.ico"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "assets/icon.icns",
    "category": "public.app-category.business"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "assets/icon.png",
    "category": "Office"
  }
}
```

**Anpassen:**
- `appId` → Eindeutige App-ID (Reverse-Domain)
- `target` → Build-Formate ([nsis, portable, zip] für Windows)
- `category` → App-Kategorie im Betriebssystem

---

## 🚀 Erweiterte Build-Optionen

### Windows: Verschiedene Build-Typen

**NSIS Installer (Standard):**
```bash
yarn build:win
```
- Vollständiger Installer mit Deinstallation
- Erstellt Start-Menü-Eintrag
- ~150 MB

**Portable ohne Installer:**

**Datei:** `package.json`
```json
"win": {
  "target": ["portable"]
}
```

**Beide (Installer + Portable):**
```json
"win": {
  "target": ["nsis", "portable"]
}
```

**ZIP-Archiv:**
```json
"win": {
  "target": ["zip"]
}
```

---

### macOS: Code Signing

Für Distribution außerhalb des App Stores:

**1. Apple Developer Account benötigt**

**2. Zertifikat installieren:**
```bash
# Im Keychain Access prüfen
```

**3. package.json anpassen:**
```json
"mac": {
  "identity": "Developer ID Application: Ihr Name (TEAMID)",
  "hardenedRuntime": true,
  "entitlements": "build/entitlements.mac.plist"
}
```

**4. Notarisierung:**
```bash
yarn build:mac
# Dann Notarisierung via Xcode oder notarytool
```

---

### Linux: Weitere Formate

**RPM hinzufügen:**
```json
"linux": {
  "target": ["AppImage", "deb", "rpm"]
}
```

**Snap Package:**
```json
"linux": {
  "target": ["snap"]
}
```

---

## 📦 Build-Output verstehen

### Windows Output:

```
dist/
├── TSRID Admin Portal Setup 1.0.0.exe      # Installer
│   └── Größe: ~150 MB
│   └── Installation: C:\Program Files\TSRID Admin Portal\
│   └── Deinstallation: Systemsteuerung → Programme
│
├── win-unpacked/                           # Entpackte Dateien
│   ├── TSRID Admin Portal.exe              # Portable
│   ├── resources/
│   │   └── app.asar                        # Gepackte App
│   └── locales/                            # Sprachdateien
│
└── latest.yml                              # Auto-Update Info
```

**Weitergabe:**
- **Installer:** Nur `TSRID Admin Portal Setup 1.0.0.exe` weitergeben
- **Portable:** Ganzen `win-unpacked/` Ordner als .zip weitergeben

---

### macOS Output:

```
dist/
├── TSRID Admin Portal-1.0.0.dmg            # Disk Image
│   └── Größe: ~150 MB
│   └── Installation: Drag-and-Drop in Applications
│
└── mac/                                    # Entpackte App
    └── TSRID Admin Portal.app
```

---

### Linux Output:

```
dist/
├── TSRID Admin Portal-1.0.0.AppImage       # Portable
│   └── Größe: ~170 MB
│   └── Keine Installation nötig
│
├── tsrid-admin-portal_1.0.0_amd64.deb      # Debian/Ubuntu
│   └── Größe: ~150 MB
│   └── Installation: dpkg -i
│
└── tsrid-admin-portal-1.0.0.x86_64.rpm     # RedHat/Fedora
    └── Größe: ~150 MB
    └── Installation: rpm -i
```

---

## 🔧 Troubleshooting

### Problem: "electron-builder not found"

```bash
yarn add electron-builder --dev
```

---

### Problem: Build schlägt fehl (Allgemein)

```bash
# Cache löschen
rm -rf node_modules dist yarn.lock

# Neu installieren
yarn install

# Erneut bauen
yarn build:win
```

---

### Problem: Windows - "NSIS Error"

**Ursache:** Fehler im Installer-Script

**Lösung:**
```bash
# NSIS Build-Tools installieren (Windows)
choco install nsis

# Oder: Auf portable-Build wechseln
# In package.json: "target": ["portable"]
```

---

### Problem: macOS - "Code signing failed"

**Ursache:** Kein gültiges Zertifikat

**Lösung 1 - Ohne Code Signing:**
```json
"mac": {
  "identity": null
}
```

**Lösung 2 - Ad-hoc Signing:**
```bash
codesign --force --deep --sign - "dist/mac/TSRID Admin Portal.app"
```

---

### Problem: Linux - "AppImage not executable"

```bash
chmod +x "dist/TSRID Admin Portal-1.0.0.AppImage"
```

---

### Problem: "Out of memory" während Build

**Lösung:**
```bash
# Memory Limit erhöhen
export NODE_OPTIONS="--max-old-space-size=4096"

# Dann bauen
yarn build:win
```

---

### Problem: Build ist zu groß (>500 MB)

**Ursachen:**
- Unnötige node_modules inkludiert
- Entwicklungs-Dependencies

**Lösung:**
```json
// package.json
"build": {
  "files": [
    "main.js",
    "preload.js",
    "assets/**/*",
    "!node_modules/**/*"  // Exclude all
  ]
}
```

---

## 📊 Build-Zeiten & Größen

| Plattform | Build-Zeit | Output-Größe | Installer-Größe |
|-----------|------------|--------------|-----------------|
| Windows   | 5-10 Min   | ~400 MB      | ~150 MB         |
| macOS     | 5-8 Min    | ~350 MB      | ~150 MB         |
| Linux     | 3-5 Min    | ~450 MB      | ~170 MB         |

**Warum so groß?**
- Electron Runtime (~100 MB)
- Chromium Browser Engine (~50 MB)
- Node.js Runtime
- Native Module (node-hid, serialport, usb)
- App-Code

---

## 🎨 CI/CD: Automatischer Build

### GitHub Actions Beispiel:

**Datei:** `.github/workflows/build.yml`

```yaml
name: Build Electron App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn build:win
      - uses: actions/upload-artifact@v2
        with:
          name: windows-build
          path: dist/*.exe

  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn build:mac
      - uses: actions/upload-artifact@v2
        with:
          name: mac-build
          path: dist/*.dmg

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn build:linux
      - uses: actions/upload-artifact@v2
        with:
          name: linux-build
          path: dist/*.AppImage
```

---

## 📝 Checkliste vor Release

- [ ] Version in `package.json` erhöht
- [ ] Changelog aktualisiert
- [ ] Icon gesetzt (Windows .ico, Mac .icns, Linux .png)
- [ ] Build getestet auf Ziel-Plattform
- [ ] Code Signing (optional, für macOS)
- [ ] Auto-Update konfiguriert (optional)
- [ ] Installer getestet (Installation + Deinstallation)
- [ ] USB-Funktionalität getestet
- [ ] README für Endbenutzer erstellt

---

## 🚢 Weitergabe & Distribution

### Einfache Weitergabe:

**Windows:**
```
TSRID_Admin_Portal_Setup_1.0.0.exe
```
Per E-Mail, USB-Stick, oder Netzlaufwerk

**macOS:**
```
TSRID_Admin_Portal_1.0.0.dmg
```

**Linux:**
```
TSRID_Admin_Portal_1.0.0.AppImage
```

---

### Professionelle Distribution:

**1. Eigene Website / Download-Portal**
```
https://ihre-firma.de/downloads/tsrid-portal/
```

**2. GitHub Releases**
```bash
# Tag erstellen
git tag v1.0.0
git push origin v1.0.0

# Auf GitHub: Releases → New Release
# Builds als Assets hochladen
```

**3. Internes Software-Portal**
- SCCM (Windows)
- Jamf (macOS)
- Apt/Yum Repository (Linux)

---

## 📚 Weiterführende Themen

### Auto-Update implementieren:
- electron-updater: https://www.electron.build/auto-update
- Eigener Update-Server oder GitHub Releases

### Native Module troubleshooting:
- node-hid, serialport, usb sind pre-compiled
- Rebuild für spezifische Electron-Version:
  ```bash
  npm rebuild --runtime=electron --target=28.0.0
  ```

### Performance-Optimierung:
- App.asar compression
- Code minification
- Lazy loading

---

## ✅ Fertig!

Sie haben jetzt eine **fertige, ausführbare Desktop-App** erstellt! 🎉

**Nächste Schritte:**
1. Testen Sie die .exe / .dmg / .AppImage
2. Geben Sie sie an Kollegen zum Testen weiter
3. Bei Erfolg: Release erstellen und verteilen

**Viel Erfolg bei der Distribution!** 🚀📦
