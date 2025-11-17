# Regula Scanner Integration Guide

## Übersicht

Dieses Dokument beschreibt die Integration des Regula Document Reader SDK in die Enterprise Portal Electron-Anwendung, einschließlich der Konfiguration, PIN-Verwaltung und ReaderDemo.exe-Integration.

## Architektur

### Komponenten

1. **Electron App** (`/app/electron-app/`)
   - Hauptprozess (`main.js`): Scanner-Kommunikation, Settings-Management, Prozess-Kontrolle
   - Preload-Skript (`preload.js`): Sichere Bridge zwischen Renderer und Main Process
   - Store: Persistente Settings mit `electron-store`

2. **Frontend Components** (`/app/frontend/src/components/`)
   - `PinModal.jsx`: PIN-Eingabe-Dialog (4-stellig)
   - `ReaderDemoManager.jsx`: Process-Management und UI-Steuerung
   - `VerificationInterface.jsx`: Hauptanwendung mit Scanner-Integration

3. **Backend API** (`/app/backend/routes/scanner_settings.py`)
   - PIN-Verwaltung (Hash-basiert)
   - Settings-Speicherung
   - Scanner-Status-API

## Konfiguration

### RegulaReader.ini

Die Electron-App liest automatisch die Konfiguration aus:
```
C:\Users\[USERNAME]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini
```

#### Wichtige Settings:

| Setting | Wert | Beschreibung |
|---------|------|--------------|
| `ProbabilityThreshold` | 85 | Mindestgenauigkeit für Erkennung |
| `DoRFID` | 1 | RFID-Chip-Lesen aktiviert |
| `DoAuthenticity` | 98307 | Authentizitätsprüfungen (Bitmask) |
| `AutoScan` | 1 | Automatischer Scan bei Dokumenterkennung |
| `GlareCompensation` | 1 | Blendkompensation aktiviert |
| `GraphicsCompressionRatio` | 2 | Bildkompression (2 = mittel) |
| `DoMRZOCR` | 1 | MRZ-OCR aktiviert |
| `DoVisualOCR` | 1 | Visuelle OCR aktiviert |
| `DoBARCODE` | 1 | Barcode-Lesen aktiviert |

### Electron Settings

Gespeichert in `electron-store` (AppData):

```javascript
{
  "scanner.pin": "1234",                    // Default PIN
  "scanner.hideConflictWarning": false,     // Warnung ausblenden
  "scanner.autoStartReaderDemo": false      // Auto-Start ReaderDemo.exe
}
```

## Features

### 1. PIN-Verwaltung

#### PIN-Modal UI
- 4-stellige numerische Eingabe
- Visuelles Feedback (○ → ●)
- Keyboard-Support (0-9, Backspace, Enter, Escape)
- Fehler-Anzeige bei falschem PIN

#### PIN-Sicherheit
- SHA-256 Hash-Speicherung
- Server-seitige Validierung
- Default-PIN: `1234`

#### PIN ändern (API):
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "5678"}'
```

### 2. ReaderDemo.exe Process Management

#### Features:
- ✅ Process-Status-Check (alle 5 Sekunden)
- ✅ Automatischer Start bei korrektem PIN
- ✅ Window-Fokussierung bei bereits laufendem Process
- ✅ Scanner-Zugriffs-Konflikt-Warnung

#### Warnung bei Konflikt:
Wenn `ReaderDemo.exe` läuft, wird ein Banner angezeigt:
```
⚠️ ReaderDemo.exe läuft
Beide Anwendungen können nicht gleichzeitig auf den Scanner zugreifen.
Bitte schließen Sie ReaderDemo.exe, um die Electron-App zu verwenden.
```

Die Warnung kann permanent ausgeblendet werden.

### 3. "Mehr Details" Button

#### Funktion:
1. User klickt auf "Mehr Details"
2. PIN-Modal öffnet sich
3. Nach korrektem PIN: `ReaderDemo.exe` wird gestartet
4. ReaderDemo.exe zeigt erweiterte Scanner-Details

#### UI-Position:
- Floating Action Button: Unten links
- Status-Indikator: Zeigt ob ReaderDemo.exe läuft
- Icon: 🔒 Lock + 🔗 External Link

## API-Referenz

### Scanner Settings Endpoints

#### GET /api/scanner/settings
Aktuelle Scanner-Settings abrufen.

**Response:**
```json
{
  "pin_configured": true,
  "hide_conflict_warning": false,
  "auto_start_reader_demo": false,
  "settings": {}
}
```

#### POST /api/scanner/settings/pin
PIN setzen oder aktualisieren.

**Request:**
```json
{
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN updated successfully"
}
```

#### POST /api/scanner/settings/verify-pin
PIN überprüfen.

**Request:**
```json
{
  "pin": "1234"
}
```

**Response:**
```json
{
  "valid": true
}
```

#### PUT /api/scanner/settings
Settings aktualisieren.

**Request:**
```json
{
  "hide_conflict_warning": true,
  "auto_start_reader_demo": false
}
```

## Electron IPC API

### Scanner Functions

```javascript
// Scanner-Status prüfen
const status = await window.electronAPI.checkScannerStatus();
// { success: true, online: true, url: "https://localhost/...", ... }

// Scan durchführen
const result = await window.electronAPI.performScan({ mode: 'live' });
// { success: true, images: [...], document_data: {...}, ... }

// LED steuern
await window.electronAPI.controlLED({ state: 'on', color: 'green', duration: 2000 });
```

### Settings Functions

```javascript
// Setting lesen
const pin = await window.electronAPI.getSetting('scanner.pin');

// Setting setzen
await window.electronAPI.setSetting('scanner.pin', '5678');

// Regula-Konfiguration laden
const config = await window.electronAPI.getRegulaConfig();
// { probabilityThreshold: 85, doRFID: true, ... }
```

### Process Management

```javascript
// ReaderDemo.exe Status prüfen
const status = await window.electronAPI.checkReaderDemo();
// { running: true, message: "ReaderDemo.exe is running" }

// ReaderDemo.exe starten
const result = await window.electronAPI.startReaderDemo();
// { success: true, alreadyRunning: false, message: "..." }
```

### PIN Verification

```javascript
// PIN verifizieren
const isValid = await window.electronAPI.verifyPin('1234');
// true oder false
```

## Installation & Build

### Voraussetzungen:
- Windows 10/11
- Node.js 18+
- Regula Document Reader SDK installiert

### Electron App bauen:

```bash
cd /app/electron-app

# Dependencies installieren
npm install

# App lokal starten
npm start

# Windows Installer bauen
npm run build

# Portable Version bauen
npm run build-portable
```

### Output:
- **Installer**: `dist/Document Verification Scanner Setup.exe`
- **Portable**: `dist/DocumentVerificationScanner-Portable.exe`

## Troubleshooting

### Problem: Scanner nicht gefunden

**Lösung:**
1. Regula Document Reader SDK Service prüfen:
   ```
   https://localhost/Regula.SDK.Api/Methods/GetServiceVersion
   ```
2. Alternativer Port: `https://localhost:88/Regula.SDK.Api`
3. Firewall-Einstellungen prüfen

### Problem: RegulaReader.ini nicht gefunden

**Pfad prüfen:**
```
C:\Users\[USERNAME]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini
```

**Fallback:** Electron App verwendet Standard-Settings.

### Problem: ReaderDemo.exe startet nicht

**Überprüfen:**
1. Installation vorhanden:
   ```
   C:\Program Files\Regula\Document Reader SDK\READERDEMO.exe
   ```
2. Berechtigungen (Admin-Rechte erforderlich?)
3. Console-Logs in Electron DevTools

### Problem: PIN wird nicht akzeptiert

**Schritte:**
1. Backend-Logs prüfen
2. MongoDB-Verbindung testen
3. PIN zurücksetzen via API:
   ```bash
   curl -X POST http://localhost:8001/api/scanner/settings/pin \
     -H "Content-Type: application/json" \
     -d '{"pin": "1234"}'
   ```

## Best Practices

### 1. Scanner-Zugriff
- **Nur eine App** sollte gleichzeitig auf den Scanner zugreifen
- Electron App für normale Scans
- ReaderDemo.exe für erweiterte Analyse

### 2. Settings-Synchronisation
- RegulaReader.ini wird beim Start geladen
- Änderungen in ReaderDemo.exe erfordern Electron-Neustart

### 3. Sicherheit
- PIN ändern von Default `1234`
- Regelmäßige Updates der Electron-App
- HTTPS für Backend-Kommunikation

### 4. Performance
- Settings werden gecacht (nur einmal beim Start geladen)
- Process-Checks alle 5 Sekunden (nicht öfter)
- LED-Timeout: Max. 10 Sekunden

## Workflow-Beispiel

### Normaler Scan:
1. User startet Electron App
2. Dokument auf Scanner legen
3. App triggert automatischen Scan (wenn AutoScan=1)
4. LED: 🟡 Gelb (Scanning...)
5. Scan-Ergebnisse werden angezeigt
6. LED: 🟢 Grün (Erfolg)

### Erweiterte Analyse:
1. User klickt "Mehr Details"
2. PIN-Modal öffnet sich
3. User gibt PIN ein (Standard: 1234)
4. Bei korrektem PIN: ReaderDemo.exe startet
5. ReaderDemo.exe zeigt detaillierte Analyse
6. User kann zwischen Electron-App und ReaderDemo.exe wechseln

## Zusätzliche Ressourcen

- [Regula SDK Documentation](https://docs.regulaforensics.com/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [COM Interface Guide](/app/electron-app/COM%20interface%20documentation.pdf)
- [Programmers Guide](/app/electron-app/Programmers%20Guide%20(en).pdf)

## Support

Bei Fragen oder Problemen:
1. Console-Logs prüfen (Electron DevTools: F12)
2. Backend-Logs prüfen: `tail -f /var/log/supervisor/backend.*.log`
3. Issue im Repository erstellen

---

**Version:** 1.0.0  
**Letztes Update:** Januar 2025  
**Autor:** Enterprise Portal Team
