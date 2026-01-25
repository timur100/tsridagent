# 🔌 USB Device Manager - Desktop App Anleitung

## 📥 Teil 1: Download & Installation

### 🎯 Was ist das?
Diese Electron Desktop-App ermöglicht den **direkten Zugriff auf USB-Geräte** (Drucker, Scanner, HID-Geräte) aus dem TSRID Admin Portal. Die App lädt das Web-Portal in einem nativen Desktop-Fenster und stellt USB-APIs bereit.

---

## 📋 Voraussetzungen

### Auf Ihrem Computer benötigen Sie:

1. **Node.js** (Version 18 oder höher)
   - Download: https://nodejs.org/
   - Nach Installation prüfen: `node --version`

2. **Yarn** (empfohlen, alternativ npm)
   ```bash
   npm install -g yarn
   ```

3. **USB-Gerät** (optional zum Testen)
   - Z.B. USB-Drucker, Etikettendrucker (Zebra), Scanner, etc.

---

## 🚀 Methode 1: Schnellstart (Ohne Build)

### Schritt 1: Dateien herunterladen

#### Option A: Über Emergent Portal
1. Navigieren Sie zu Ihrem Emergent Job
2. Klicken Sie auf **"Dateien"** oder **"Files"**
3. Navigieren Sie zu `/app/electron-app/`
4. Klicken Sie auf **"Download"** oder laden Sie den kompletten Ordner herunter

#### Option B: Via GitHub (wenn verbunden)
```bash
git clone <ihr-repository-url>
cd electron-app
```

#### Option C: Manueller Download einzelner Dateien
Laden Sie mindestens diese Dateien herunter:
- `package.json`
- `main.js`
- `preload.js`
- `assets/` (ganzer Ordner)

### Schritt 2: Terminal öffnen

**Windows:**
```cmd
cd C:\Pfad\zum\electron-app
```

**Mac/Linux:**
```bash
cd /pfad/zum/electron-app
```

### Schritt 3: Dependencies installieren

```bash
yarn install
```

⏱️ Dies dauert 3-5 Minuten beim ersten Mal (lädt ~500MB Dependencies)

### Schritt 4: App starten

```bash
yarn start
```

✅ Die App öffnet sich automatisch!

---

## 🎯 Methode 2: Executable bauen (.exe / .dmg / .AppImage)

### Warum ein Build?
- ✅ Kein Node.js auf Ziel-PC nötig
- ✅ Einfach per Doppelklick starten
- ✅ Weitergabe an Kollegen möglich
- ✅ Professionelle Installation

### Schritt 1: Dependencies installieren (falls noch nicht)

```bash
cd electron-app
yarn install
```

### Schritt 2: Build ausführen

#### Für Windows (.exe):
```bash
yarn build:win
```

**Output:**
```
electron-app/dist/
├── TSRID Admin Portal Setup 1.0.0.exe    ← Installer
└── win-unpacked/
    └── TSRID Admin Portal.exe            ← Portable .exe
```

#### Für macOS (.dmg):
```bash
yarn build:mac
```

**Output:**
```
electron-app/dist/
└── TSRID Admin Portal-1.0.0.dmg
```

#### Für Linux (.AppImage, .deb):
```bash
yarn build:linux
```

**Output:**
```
electron-app/dist/
├── TSRID Admin Portal-1.0.0.AppImage
└── tsrid-admin-portal_1.0.0_amd64.deb
```

#### Alle Plattformen gleichzeitig:
```bash
yarn build
```

⏱️ **Build-Dauer:** 5-15 Minuten je nach System

---

## 🖥️ App nutzen

### Nach dem Start:

1. **Automatischer Login-Screen:**
   - Die App lädt: `https://offline-agent.preview.emergentagent.com/portal/admin`
   
2. **Einloggen:**
   - Email: `admin@tsrid.com`
   - Passwort: `admin123`

3. **Zum USB Device Manager navigieren:**
   - Klicken Sie auf **"R&D"** Tab (oben rechts)
   - Sidebar: **"Test Center"** → **"USB Device Manager"** (🔌 Symbol)

4. **USB-Geräte anzeigen:**
   - Klicken Sie auf **"Aktualisieren"** Button
   - Alle angeschlossenen USB-Geräte werden aufgelistet

### Features testen:

#### 🖨️ USB-Drucker testen:
1. USB-Drucker anschließen
2. "Aktualisieren" klicken
3. Drucker aus Dropdown auswählen
4. "Verbindung testen" klicken
5. Optional: "Test-Label drucken (ZPL)" für Zebra-Drucker

#### 🔌 USB-Geräte-Info:
- **USB Geräte:** Zeigt Vendor ID und Product ID
- **Serial Ports:** Zeigt COM-Ports für Drucker
- **HID Geräte:** Zeigt Human Interface Devices (Keyboards, Scanner, etc.)

---

## 🔧 Konfiguration anpassen

### Backend-URL ändern

Wenn Sie einen eigenen Backend-Server haben, bearbeiten Sie **vor** dem Build:

**Datei:** `/app/electron-app/main.js`

```javascript
// Zeile ~8
const PREVIEW_URL = 'https://ihre-eigene-url.com/portal/admin';
```

Standard ist:
```javascript
const PREVIEW_URL = 'https://offline-agent.preview.emergentagent.com/portal/admin';
```

### App-Name und Icon ändern

**Datei:** `/app/electron-app/package.json`

```json
{
  "name": "ihr-app-name",
  "productName": "Ihr App Name",
  "version": "1.0.0",
  "description": "Ihre Beschreibung"
}
```

**Icon ersetzen:**
- Windows: `assets/icon.ico` (256x256 .ico)
- Mac: `assets/icon.icns`
- Linux: `assets/icon.png` (512x512 .png)

---

## 🐛 Troubleshooting

### Problem: "yarn nicht gefunden"
```bash
npm install -g yarn
```

### Problem: "Node.js nicht gefunden"
- Node.js installieren: https://nodejs.org/
- Terminal neu starten

### Problem: Build schlägt fehl
```bash
# Cache löschen und neu installieren
rm -rf node_modules yarn.lock
yarn install
yarn build:win
```

### Problem: USB-Geräte werden nicht erkannt
1. **USB-Gerät angeschlossen?** Kabel prüfen
2. **Treiber installiert?** Gerätehersteller-Treiber installieren
3. **Berechtigung?** App als Administrator starten (Windows)
4. **Aktualisieren:** "Aktualisieren"-Button in der App klicken

### Problem: "App startet nicht" / "Weißer Bildschirm"
1. **Internet-Verbindung prüfen** (App lädt Web-Portal)
2. **Firewall/Antivirus deaktivieren** (temporär zum Testen)
3. **DevTools öffnen:** F12 drücken und Fehler im Console prüfen

### Problem: Drucker druckt nicht
1. **Richtiger Port?** COM-Port in Dropdown prüfen
2. **Baudrate korrekt?** Standard ist 9600 (im Code änderbar)
3. **ZPL-Drucker?** Nur Zebra-Drucker unterstützen ZPL
4. **ESC/POS-Drucker?** Raw-Text-Druck verwenden

---

## 📊 Systemanforderungen

### Minimum:
- **Betriebssystem:** Windows 10, macOS 10.13, Ubuntu 18.04 (oder neuer)
- **RAM:** 4 GB
- **Festplatte:** 500 MB frei
- **Internet:** Stabile Verbindung für Web-Portal

### Empfohlen:
- **RAM:** 8 GB+
- **Festplatte:** 1 GB frei (für Build-Prozess)

---

## 📁 Verzeichnisstruktur erklärt

```
electron-app/
├── main.js                 # ⚡ Hauptprozess (Node.js) - USB-Handler hier
├── preload.js              # 🔒 Sichere API-Bridge zwischen Web und Node
├── package.json            # 📦 Dependencies, Scripts, App-Info
├── assets/
│   └── icon.png            # 🎨 App-Icon
├── dist/                   # 📦 Build-Output (nach yarn build)
│   ├── *.exe               # Windows Executable
│   ├── *.dmg               # macOS Installer
│   └── *.AppImage          # Linux Portable
├── node_modules/           # 📚 Installierte Dependencies (nach yarn install)
└── *.md                    # 📖 Dokumentationen
```

---

## 🔐 Sicherheit

Die App verwendet **sichere IPC-Kommunikation:**

✅ **Context Isolation** aktiviert
✅ **Node Integration** deaktiviert (kein direkter Node.js-Zugriff aus Web)
✅ **Nur explizit exponierte APIs** verfügbar
✅ **Preload-Script** als sichere Bridge

USB-APIs sind **nur** in der Desktop-App verfügbar, nicht im Browser.

---

## 🎓 Für Entwickler: API-Nutzung

### Im Frontend (React):

```javascript
// USB-Geräte abrufen
const devices = await window.usbAPI.getDevices();
console.log('USB-Geräte:', devices);

// Serial Ports abrufen
const ports = await window.usbAPI.getSerialPorts();
console.log('Serial Ports:', ports);

// Drucker testen
const result = await window.printerAPI.test('/dev/ttyUSB0');
if (result.success) {
  console.log('Drucker online!');
}

// ZPL-Label drucken
const zpl = '^XA^FO50,50^A0N,50,50^FDTest^FS^XZ';
await window.printerAPI.printZPL('/dev/ttyUSB0', zpl);
```

Siehe **`INTEGRATION_GUIDE.md`** für vollständige API-Dokumentation.

---

## 🔄 Updates & Weiterentwicklung

### Wenn neue Features entwickelt werden:

1. **Dateien aktualisieren:**
   - Neue `main.js` / `preload.js` herunterladen
   - Oder: `git pull` (falls Git-Repo)

2. **Dependencies aktualisieren:**
   ```bash
   yarn install
   ```

3. **Neu bauen (falls .exe gewünscht):**
   ```bash
   yarn build:win
   ```

4. **Oder direkt testen:**
   ```bash
   yarn start
   ```

---

## 💡 Tipps & Best Practices

### Entwicklung:
- **`yarn start`** für schnelles Testen ohne Build
- **F12** öffnet DevTools für Debugging
- **Hot Reload:** Code-Änderungen erfordern App-Neustart

### Produktion:
- **Portable .exe** für schnelle Tests ohne Installation
- **Installer .exe** für dauerhafte Installation mit Start-Menü-Eintrag
- **Code Signing** für professionelle Verteilung (optional)

### Testing:
1. Erst **ohne** USB-Gerät testen → Sollte "Keine Geräte" anzeigen
2. Dann **mit** USB-Gerät → Sollte Gerät in Liste zeigen
3. Drucker-Test nur mit **echtem Drucker** → Leeres Papier einlegen!

---

## 📞 Support & Hilfe

### Bei Problemen:

1. **DevTools öffnen:** F12 in der App
2. **Console-Tab:** Fehler-Meldungen kopieren
3. **Screenshots:** Von Fehlern und USB Device Manager
4. **Logs prüfen:**
   ```bash
   # Windows
   %APPDATA%\tsrid-admin-portal\logs\
   
   # Mac
   ~/Library/Logs/tsrid-admin-portal/
   
   # Linux
   ~/.config/tsrid-admin-portal/logs/
   ```

### Dokumentation:
- **USB APIs:** `INTEGRATION_GUIDE.md`
- **Electron Docs:** https://www.electronjs.org/docs
- **Node-HID:** https://github.com/node-hid/node-hid

---

## ✅ Checkliste: Bereit zum Testen

- [ ] Node.js installiert (`node --version`)
- [ ] Yarn installiert (`yarn --version`)
- [ ] Electron-App Ordner heruntergeladen
- [ ] Dependencies installiert (`yarn install`)
- [ ] App gestartet (`yarn start`)
- [ ] Zum USB Device Manager navigiert
- [ ] USB-Gerät angeschlossen und erkannt

---

## 🎉 Fertig!

Die USB Device Manager Desktop-App ist jetzt einsatzbereit!

**Nächste Schritte:**
1. App testen mit USB-Gerät
2. Bei Erfolg: `.exe` bauen für Weitergabe
3. Feedback geben für weitere Features

**Viel Erfolg!** 🚀🔌
