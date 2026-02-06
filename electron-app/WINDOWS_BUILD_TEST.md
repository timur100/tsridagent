# TSRID Agent - Windows Build & Test Anleitung

## 🚀 Schnellstart (Ein-Klick)

### Option 1: Vollautomatisch
1. Code herunterladen ("Download Code" Button)
2. ZIP extrahieren
3. In `electron-app` Ordner navigieren
4. **Doppelklick auf `ONE_CLICK_BUILD.bat`**
5. Fertig! Installer liegt in `dist/`

### Option 2: Mit Menü
1. **Doppelklick auf `SETUP.bat`**
2. Menü-Option wählen:
   - [1] App testen
   - [2] Installer bauen
   - [3] Beides

### Option 3: PowerShell (erweitert)
```powershell
# Alles automatisch
.\setup.ps1 -All

# Nur installieren
.\setup.ps1 -Install

# Nur bauen
.\setup.ps1 -Build
```

---

## 📋 Voraussetzungen

Auf dem Windows Test-Tablet installieren:

1. **Node.js 20 LTS**
   - Download: https://nodejs.org/
   - Installer: `node-v20.x.x-x64.msi`
   - Nach Installation prüfen: `node --version` (sollte v20.x.x zeigen)

2. **Git** (optional, für Updates)
   - Download: https://git-scm.com/download/win

3. **Visual Studio Build Tools** (für native Module)
   - Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Bei Installation auswählen: "Desktop development with C++"

---

## 📥 Schritt 1: Electron App herunterladen

### Option A: Aus Emergent herunterladen
1. Im Emergent Chat: "Download Code" Button klicken
2. ZIP-Datei extrahieren
3. In den Ordner `electron-app` navigieren

### Option B: Nur electron-app Ordner kopieren
Der komplette Ordner `/app/electron-app/` muss auf das Windows-Tablet kopiert werden.

Struktur sollte so aussehen:
```
C:\TSRID\electron-app\
├── main.js
├── preload.js
├── package.json
├── printer-windows.js
├── src\
│   └── services\
│       ├── database.js
│       ├── device-info.js
│       ├── sync-engine.js
│       └── mode-manager.js
├── assets\
└── offline-data\
```

---

## 🔧 Schritt 2: Dependencies installieren

Öffnen Sie PowerShell als Administrator und navigieren Sie zum electron-app Ordner:

```powershell
cd C:\TSRID\electron-app

# Dependencies installieren
npm install

# Native Module für Windows neu bauen
npm run rebuild
# ODER falls das nicht funktioniert:
npx electron-rebuild
```

**Hinweis:** Falls `better-sqlite3` Fehler zeigt:
```powershell
npm install --build-from-source better-sqlite3
```

---

## 🚀 Schritt 3: App im Entwicklungsmodus starten

```powershell
# Im electron-app Ordner:
npm start
```

**Was sollte passieren:**
1. App startet und zeigt die Scan-App (https://tablet-agent-1.preview.emergentagent.com/)
2. Im Hintergrund: SQLite Datenbank wird erstellt
3. Console zeigt: `[TSRID] Device ID: xxxxxxxx`

---

## 🔐 Schritt 4: Admin-Modus testen

1. Drücken Sie: **Ctrl + Shift + Alt + Q**
2. Ein Passwort-Dialog sollte erscheinen (im Web-Frontend)
3. Standard-Passwort: `tsrid2024!`
4. Nach erfolgreicher Eingabe: App wechselt zum Admin-Portal

**Hinweis:** Der Passwort-Dialog muss noch im Frontend implementiert werden. 
Aktuell wechselt die App direkt zum Admin-Portal wenn Sie den Shortcut drücken.

---

## 🧪 Schritt 5: Funktionen testen

### A) Device Info prüfen
Öffnen Sie die DevTools (F12) und geben Sie in der Console ein:

```javascript
// Device ID
await window.tsridDevice.getId()

// Vollständige System-Info
await window.tsridDevice.getInfo()

// Heartbeat-Payload
await window.tsridDevice.getHeartbeat()
```

### B) Datenbank testen
```javascript
// Config speichern
await window.tsridDB.setConfig('test_key', 'test_value')

// Config lesen
await window.tsridDB.getConfig('test_key')

// Alle Config-Werte
await window.tsridDB.getAllConfig()

// Standorte suchen (falls offline-data vorhanden)
await window.tsridDB.searchLocations('Berlin')
```

### C) Sync Status prüfen
```javascript
// Sync-Status
await window.tsridSync.getStatus()

// Manueller Sync
await window.tsridSync.forceSyncNow()
```

### D) Modus-Wechsel testen
```javascript
// Aktuellen Modus prüfen
await window.tsridMode.getCurrent()

// Setup-Status
await window.tsridMode.getSetupStatus()

// Zu Kiosk wechseln
await window.tsridMode.switchToKiosk()

// Zu Admin wechseln (benötigt Passwort im echten Betrieb)
await window.tsridMode.switchToAdmin()
```

---

## 📦 Schritt 6: Windows Build erstellen

```powershell
# Im electron-app Ordner:
npm run build:win
```

Nach dem Build finden Sie:
- **Installer:** `dist\TSRID Admin Portal Setup 1.1.0.exe`
- **Portable Version:** `dist\win-unpacked\TSRID Admin Portal.exe`

---

## 🐛 Troubleshooting

### Problem: "better-sqlite3" Fehler beim Start
```powershell
# Native Module neu bauen
npx electron-rebuild -f -w better-sqlite3
```

### Problem: "node-hid" oder "usb" Fehler
```powershell
# Alle native Module neu bauen
npx electron-rebuild
```

### Problem: App startet nicht
```powershell
# Mit Debug-Output starten
set DEBUG=*
npm start
```

### Problem: Keine Verbindung zum Server
- Prüfen Sie die Internet-Verbindung
- Prüfen Sie ob https://tablet-agent-1.preview.emergentagent.com/ erreichbar ist

---

## 📍 Offline-Daten vorbereiten

Um die Standort-Liste für Offline-Setup zu laden:

1. Öffnen Sie im Browser: 
   `https://tablet-agent-1.preview.emergentagent.com/api/agent/locations/export`

2. Speichern Sie die JSON-Antwort als:
   `C:\TSRID\electron-app\offline-data\locations_cache.json`

3. App neu starten - Standorte sind jetzt offline verfügbar

---

## ✅ Test-Checkliste

- [ ] App startet ohne Fehler
- [ ] DevTools zeigen `[TSRID Desktop] APIs exposed: ...`
- [ ] `window.tsridDevice.getId()` gibt eine Device ID zurück
- [ ] `window.tsridDB.setConfig()` und `getConfig()` funktionieren
- [ ] `window.tsridSync.getStatus()` zeigt Sync-Status
- [ ] Ctrl+Shift+Alt+Q wechselt zwischen Kiosk und Admin
- [ ] Windows Build erstellt erfolgreich Installer

---

## 📞 Bei Problemen

Teilen Sie mir mit:
1. Fehlermeldung aus der Console (F12 → Console Tab)
2. Output von `npm start`
3. Windows-Version (`winver` in CMD)
4. Node.js Version (`node --version`)

Ich helfe gerne beim Debugging!
