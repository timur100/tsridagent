# Document Verification Scanner - Electron App

Diese Electron-App ermöglicht die Nutzung des Regula Document Readers mit dem Enterprise Portal auf Windows-Maschinen.

## ✨ Features

- ✅ Direkte Anbindung an Regula Scanner Service (localhost)
- ✅ Vollständige VerificationInterface-Integration
- ✅ Automatischer Scan mit LED-Feedback
- ✅ Kommunikation mit Cloud-Backend für Datenspeicherung
- ✅ **NEU:** RegulaReader.ini Settings-Integration
- ✅ **NEU:** PIN-geschützter Zugriff auf ReaderDemo.exe
- ✅ **NEU:** Process-Management für ReaderDemo.exe
- ✅ **NEU:** Scanner-Konflikt-Warnung
- ✅ Offline-Scan-Möglichkeit (später erweiterbar)
- ✅ Windows-kompatibel

## 📋 Voraussetzungen

**Auf Ihrer Windows-Maschine:**
1. ✅ Regula SDK Service muss installiert und laufen sein
   - URL: `https://localhost/Regula.SDK.Api` oder `https://localhost:88/Regula.SDK.Api`
2. ✅ Node.js installiert (für lokales Testen/Bauen)

## 🚀 Schnellstart (Testen)

### Option 1: Portable .exe herunterladen (Empfohlen für Tests)

1. Nachdem die App gebaut wurde, finden Sie:
   ```
   electron-app/dist/DocumentVerificationScanner-Portable.exe
   ```

2. Diese .exe-Datei auf Ihre Windows-Maschine kopieren

3. Doppelklick auf die .exe

4. Die App startet und verbindet sich automatisch mit:
   - **Scanner:** `https://localhost/Regula.SDK.Api`
   - **Backend:** `https://job-portal-harmony.emergentagent.com`

### Option 2: Installer verwenden

1. Installer finden in `electron-app/dist/`
2. Installieren auf Windows
3. App über Desktop-Icon starten

## 🔨 App bauen (für Entwickler)

### Schritt 1: Build-Skript ausführen

```bash
cd /app
./electron-app/build.sh
```

Das Skript:
- Baut die React-Frontend-App
- Kopiert alles in den Electron-Renderer
- Passt Pfade für Electron an
- Installiert Electron-Dependencies

### Schritt 2: Windows-Executable erstellen

```bash
cd /app/electron-app

# Portable .exe (keine Installation nötig)
yarn build-portable

# Oder: Installer erstellen
yarn build

# Beide erstellen
yarn dist
```

### Schritt 3: App finden und testen

Nach dem Build finden Sie in `electron-app/dist/`:
- **DocumentVerificationScanner-Portable.exe** (Portable Version)
- **Document Verification Scanner Setup.exe** (Installer)

## 🧪 Lokales Testen (Entwicklungsmodus)

```bash
cd /app/electron-app
yarn start
```

Dies startet die App im Entwicklungsmodus mit DevTools.

## ⚙️ Konfiguration

### Backend-URL ändern

Bearbeiten Sie `main.js`:

```javascript
const BACKEND_URL = 'https://ihre-backend-url.com';
```

Oder setzen Sie eine Umgebungsvariable:

```bash
export BACKEND_URL=https://ihre-backend-url.com
yarn start
```

### Scanner-URLs anpassen

In `main.js` können Sie die Scanner-URLs ändern:

```javascript
const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api',
  'https://localhost:8080/Regula.SDK.Api'  // Ihre URL hinzufügen
];
```

## 📁 Projektstruktur

```
electron-app/
├── main.js              # Electron Hauptprozess (Scanner-Kommunikation)
├── preload.js           # Preload-Skript (API-Bridge)
├── package.json         # Electron-Konfiguration & Dependencies
├── build.sh            # Build-Skript
├── renderer/           # React-App (wird beim Build kopiert)
│   ├── index.html
│   ├── static/
│   └── ...
└── dist/               # Gebaute Executables (nach yarn build)
    ├── DocumentVerificationScanner-Portable.exe
    └── ...
```

## 🔍 Troubleshooting

### Scanner wird nicht erkannt

1. **Regula Service läuft nicht:**
   ```
   - Öffnen Sie Task-Manager
   - Suchen Sie "Regula" oder "SDK Service"
   - Service starten falls nicht aktiv
   ```

2. **Falscher Port:**
   - Öffnen Sie `https://localhost/Regula.SDK.Api.Documentation/index` im Browser
   - Wenn nicht erreichbar, versuchen Sie Port 88 oder andere

3. **SSL-Zertifikat Problem:**
   - Die App akzeptiert selbst-signierte Zertifikate automatisch
   - Falls Probleme: Scanner-Service neu starten

### App startet nicht

1. **"Node.js nicht gefunden" Fehler:**
   - Node.js installieren: https://nodejs.org/

2. **Build-Fehler:**
   ```bash
   cd /app/electron-app
   rm -rf node_modules
   yarn install
   yarn build
   ```

### Backend-Verbindung fehlgeschlagen

1. Prüfen Sie Internet-Verbindung
2. Backend-URL in `main.js` überprüfen
3. Firewall-Einstellungen prüfen

## 🎯 Verwendung

1. **App starten**
2. **VerificationInterface erscheint**
3. **Scanner-Button sollte grünen Punkt zeigen** (wenn Scanner online)
4. **Dokument einlegen und "Scanner" klicken**
5. **Automatischer Scan startet**
6. **LED leuchtet:**
   - Gelb = Scannen läuft
   - Grün = Erfolgreich
   - Rot (blinkend) = Fehler

## 🆕 Neue Features (v2.0)

### PIN-Verwaltung & ReaderDemo.exe Integration

#### "Mehr Details" Button
- Floating Action Button unten links
- PIN-Eingabe erforderlich (4-stellig, Standard: 1234)
- Startet ReaderDemo.exe für erweiterte Scanner-Analyse
- Zeigt Process-Status (läuft/gestoppt)

#### PIN-Modal
- Numerisches Tastatur-Layout
- Visuelles Feedback (●/○ Anzeige)
- Keyboard-Support (0-9, Backspace, Enter, Escape)
- Fehler-Anzeige bei falschem PIN

#### Scanner-Konflikt-Warnung
- Automatische Erkennung wenn ReaderDemo.exe läuft
- Hinweis: Nur eine App kann gleichzeitig auf Scanner zugreifen
- Warnung kann permanent ausgeblendet werden

#### RegulaReader.ini Settings
- Automatisches Laden der Konfiguration beim Start
- Pfad: `C:\Users\[USER]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini`
- Wichtige Settings:
  - `ProbabilityThreshold` (85): Genauigkeitsgrenze
  - `DoRFID` (1): RFID-Chip-Lesen
  - `DoAuthenticity` (98307): Authentizitätsprüfungen
  - `GlareCompensation` (1): Blendkompensation

### API-Erweiterungen

#### Electron IPC Handlers:
```javascript
// Settings-Management
window.electronAPI.getSetting(key)
window.electronAPI.setSetting(key, value)
window.electronAPI.getRegulaConfig()

// Process-Management
window.electronAPI.checkReaderDemo()
window.electronAPI.startReaderDemo()

// PIN-Verifizierung
window.electronAPI.verifyPin(pin)
```

### Neue Backend-Endpoints

#### Scanner Settings API
```
GET    /api/scanner/settings              - Settings abrufen
POST   /api/scanner/settings/pin          - PIN setzen
POST   /api/scanner/settings/verify-pin   - PIN prüfen
PUT    /api/scanner/settings              - Settings aktualisieren
```

## 🔧 PIN ändern

### Via Backend-API:
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "5678"}'
```

### Via Electron Store:
```javascript
await window.electronAPI.setSetting('scanner.pin', '5678')
```

## 🔄 Updates

Um eine neue Version zu bauen:

```bash
# 1. Frontend-Änderungen machen in /app/frontend/
# 2. Build neu ausführen:
cd /app
./electron-app/build.sh
cd electron-app
yarn build-portable
```

## 📞 Support

Bei Problemen:
1. Logs prüfen (DevTools öffnen in App: F12)
2. Scanner-Service Status prüfen
3. Backend-Erreichbarkeit testen
4. ReaderDemo.exe Status prüfen (Task-Manager)
5. Siehe auch: `/app/REGULA_INTEGRATION_GUIDE.md`

## 📝 Lizenz

Internes Tool für Europcar

---

**Version:** 2.0.0  
**Letztes Update:** Januar 2025
