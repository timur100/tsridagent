# TSR Electron Agent

## Übersicht
Eine plattformübergreifende Desktop-Anwendung für ID-Verifizierung und Geräte-Management.

## Features
- **ID Verification**: Integration mit Regula 7028M.111 USB Scanner
- **Device Agent**: PowerShell-kompatible Geräteüberwachung
- **Auto-Update**: Automatische Updates vom TSR Admin Portal
- **Cross-Platform**: Windows, macOS, Linux
- **Kiosk-Modus**: Vollbild-Modus mit versteckter Umschaltung
- **Screensaver**: Animierter Bildschirmschoner mit PIN-Schutz
- **Autostart**: Automatischer Start bei Windows-Anmeldung

## Architektur

```
electron-agent/
├── main/                    # Electron Main Process
│   ├── main.js             # Entry point
│   ├── preload.js          # Secure bridge to renderer
│   ├── regulaScanner.js    # Regula SDK via electron-edge-js (NEU)
│   ├── regulaClient.js     # HTTP-Client für externe Bridge (Fallback)
│   └── scanner/            # Alternative Scanner-Module
│       └── regula.js       # HTTPS/REST Scanner-Client
├── renderer/               # React UI (from existing VerificationInterface)
│   ├── index.html
│   └── src/
├── package.json
└── electron-builder.json   # Build configuration
```

## Regula 7028M.111 Integration

### Neue Architektur (electron-edge-js)

Der Scanner wird jetzt **direkt** über `electron-edge-js` angesprochen:

1. **electron-edge-js** - Führt C# Code direkt in Node.js aus
2. **Regula COM/ActiveX** - Die SDK wird über COM-Interfaces angesteuert
3. **Keine separate Bridge-App nötig**

#### Voraussetzungen:
- Windows 10/11 mit .NET Framework 4.x
- Regula Document Reader SDK installiert
- Scanner-Treiber installiert

#### Unterstützte COM-ProgIDs:
- `PassportReader.SDK`
- `PassportReader.ABOREAD`
- `RegulaReader.SDK`
- `READERDEMO.RegulaReader`
- `Regula.DocumentReader`

### Fallback: HTTP Bridge

Falls electron-edge-js nicht funktioniert, kann alternativ die HTTP-Bridge verwendet werden:
- `regulaClient.js` kommuniziert mit einer separaten Tray-App
- Service läuft auf `http://localhost:5000`

## Lokale Entwicklung

### Voraussetzungen
- Node.js 18.x oder höher
- yarn (npm kann Probleme verursachen)
- Windows (für Scanner-Integration)

### Setup

```bash
cd electron-agent
yarn install
```

### Entwicklungs-Modus starten

```bash
yarn dev
```

Dies startet die Anwendung mit:
- DevTools automatisch geöffnet
- Kiosk-Modus deaktiviert
- Hot-Reload für schnelles Testen

### Produktions-Build

```bash
# Nur Windows
yarn build:win

# Alle Plattformen
yarn build:all
```

## Scanner testen

Nach dem Start der Anwendung im Entwicklungsmodus:

1. Öffne das Admin-Panel (PIN: `9988`)
2. Gehe zu "Geräte & Scanner"
3. Klicke auf "Scanner Status prüfen"

Im DevTools Console erscheint:
- Gefundene COM-Komponenten
- Verbindungsstatus
- Eventuelle Fehler

### Debug-Info abrufen

```javascript
// In der DevTools Console der Electron-App:
const info = await window.electronAPI.getScannerDebugInfo();
console.log(info);
```

Dies zeigt alle verfügbaren Methoden und Eigenschaften der Regula SDK.

## Version Management

Versionen werden im Format `MAJOR.MINOR.PATCH` verwaltet:
- **MAJOR**: Breaking changes
- **MINOR**: Neue Features
- **PATCH**: Bug fixes

Aktuelle Version: **1.0.5**

## Admin Portal Integration

- `/api/electron-agent/versions` - Verfügbare Versionen
- `/api/electron-agent/download/{version}` - Download
- `/api/electron-agent/devices` - Registrierte Geräte
- `/api/electron-agent/update-push` - Update an Geräte senden

## Tastaturkürzel

| Kürzel | Funktion |
|--------|----------|
| `Ctrl+Shift+K` | Kiosk-Modus umschalten |
| `Ctrl+Shift+Q` | App beenden (nur außerhalb Kiosk-Modus) |

## Bekannte Einschränkungen

- **electron-edge-js** funktioniert nur auf Windows mit .NET Framework
- Auf macOS/Linux ist nur die HTTP-Bridge verfügbar
- Scanner-Hardware muss vor dem App-Start verbunden sein
