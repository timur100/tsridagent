# 📥 Download & Installation - Document Verification Scanner

## 🎯 Ziel
Diese Electron-App ermöglicht die Nutzung des Regula Scanners auf Ihrer Windows-Maschine während wir hier weiter entwickeln.

## 📋 Voraussetzungen auf Windows

1. **Node.js installieren** (falls noch nicht vorhanden)
   - Download: https://nodejs.org/ (LTS Version empfohlen)
   - Version prüfen: `node --version` (sollte v18+ sein)

2. **Yarn installieren** (optional, aber empfohlen)
   ```cmd
   npm install -g yarn
   ```

3. **Regula SDK Service läuft**
   - Muss bereits installiert sein
   - Service starten: https://localhost/Regula.SDK.Api

## 🚀 Methode 1: Download vom Server (Empfohlen)

### Schritt 1: Dateien herunterladen

Da die komplette App zu groß für einfachen Download ist, hier die **schnellste Methode**:

#### Option A: Git Clone (wenn Git installiert)
```cmd
git clone <repository-url>
cd electron-app
```

#### Option B: Manueller Download
1. Laden Sie diese Dateien einzeln herunter:
   - `package.json`
   - `main.js`
   - `preload.js`
   - `build-on-windows.bat`
   - `renderer/` Ordner (komplett)

### Schritt 2: Dependencies installieren & App bauen

```cmd
cd electron-app
build-on-windows.bat
```

Das Skript:
1. Installiert alle Dependencies (kann 5-10 Min dauern)
2. Baut portable .exe
3. Baut Installer

### Schritt 3: App starten

Nach dem Build:
```cmd
cd dist
DocumentVerificationScanner-Portable.exe
```

## 🛠️ Methode 2: Lokale Entwicklung

### Schnellstart ohne Build:

```cmd
cd electron-app
yarn install
yarn start
```

Dies startet die App im Entwicklungsmodus (kein .exe nötig).

## 📦 Was wird gebaut?

Nach erfolgreichem Build finden Sie:

```
electron-app/dist/
├── DocumentVerificationScanner-Portable.exe  ← Einfach zu testen
├── Document Verification Scanner Setup.exe   ← Installer
└── win-unpacked/                            ← Entpackte Dateien
```

## ✅ Testen

1. **Portable .exe starten:**
   ```
   DocumentVerificationScanner-Portable.exe
   ```

2. **App überprüft automatisch:**
   - Scanner Service (https://localhost:443 oder :88)
   - Backend-Verbindung

3. **Scanner-Button:**
   - Grüner Punkt = Scanner online ✅
   - Grauer Button = Scanner offline ❌

4. **Dokument scannen:**
   - "Scanner"-Button klicken
   - Dokument einlegen
   - LED leuchtet gelb → Scannen
   - LED leuchtet grün → Erfolg

## 🔧 Konfiguration anpassen

### Backend-URL ändern

Bearbeiten Sie `main.js` **vor** dem Build:

```javascript
// Zeile ~13
const BACKEND_URL = 'https://ihre-backend-url.com';
```

Standard ist: `https://job-portal-harmony.emergentagent.com`

### Scanner-Port ändern

In `main.js`:

```javascript
// Zeile ~52
const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api',
  'https://localhost:IHREPORT/Regula.SDK.Api'  // Hinzufügen
];
```

## 🐛 Troubleshooting

### "yarn nicht gefunden"
```cmd
npm install -g yarn
```

### "Node.js nicht gefunden"
- Node.js installieren: https://nodejs.org/

### Build schlägt fehl
```cmd
# Cache löschen
rmdir /s /q node_modules
del yarn.lock
yarn install
build-on-windows.bat
```

### Scanner wird nicht erkannt
1. Regula Service läuft?
   - Task-Manager → Suche "Regula"
2. Port korrekt?
   - Browser öffnen: https://localhost/Regula.SDK.Api.Documentation/index
3. Falls anderer Port → `main.js` anpassen

### App startet nicht
- Antivirus deaktivieren (temporär)
- Als Administrator ausführen

## 📊 Systemanforderungen

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4GB+ empfohlen
- **Node.js:** v18+
- **Festplatte:** 500MB frei

## 🔄 Updates

Wenn wir hier neue Features entwickeln:

1. Download neue Dateien
2. `build-on-windows.bat` erneut ausführen
3. Neue .exe verwenden

## 💡 Tipps

- **Entwicklungsmodus:** `yarn start` für schnelles Testen
- **Portable .exe:** Keine Installation nötig, ideal für Tests
- **Installer:** Für dauerhafte Installation
- **DevTools:** F12 in der App für Debugging

## 📞 Support

Bei Problemen:
1. Logs prüfen (F12 in App)
2. Screenshots machen
3. Error-Meldungen notieren

## 🎉 Fertig!

Nach erfolgreichem Build können Sie die App testen und Feedback geben, während wir parallel hier weiterentwickeln.
