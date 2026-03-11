# TSRID Agent - Lokale Entwicklung

## Voraussetzungen

1. **Node.js** (LTS Version 18 oder 20) - [Download](https://nodejs.org)
2. **Git** - bereits installiert

## Installation

```bash
# Repository klonen
git clone https://github.com/timur100/tsridagent.git
cd tsridagent

# Dependencies installieren
npm install
```

## Entwicklungsmodus starten

```bash
# Agent im Entwicklungsmodus starten
npm start
```

Der Agent startet und lädt automatisch die **Emergent Preview-URL**:
`https://tsrid-agent-platform.preview.emergentagent.com/id-verification`

## Konfiguration ändern

Die Konfiguration wird in einer JSON-Datei gespeichert:
- **Windows:** `%APPDATA%/tsrid-agent/config.json`
- **macOS:** `~/Library/Application Support/tsrid-agent/config.json`
- **Linux:** `~/.config/tsrid-agent/config.json`

### Wichtige Einstellungen:

```json
{
  "appUrl": "https://tsrid-agent-platform.preview.emergentagent.com/id-verification",
  "kioskMode": false,
  "screensaverEnabled": true,
  "screensaverTimeout": 5,
  "stationPin": "",
  "requirePinOnStart": false
}
```

### URL ändern für lokale Entwicklung:

Wenn Sie die Web-App lokal entwickeln möchten:
```json
{
  "appUrl": "http://localhost:3000/id-verification"
}
```

## Tastenkombinationen

| Kombination | Funktion |
|-------------|----------|
| `Ctrl+Shift+K` | Kiosk-Modus umschalten |
| `Ctrl+Shift+Q` | App beenden (nur außerhalb Kiosk-Modus) |
| `F12` | DevTools öffnen (nur im Dev-Modus) |

## Build erstellen

```bash
# Windows .exe
npm run build:win

# macOS .dmg
npm run build:mac

# Linux .AppImage
npm run build:linux

# Alle Plattformen
npm run build
```

## Tipps für die Entwicklung

1. **Kiosk-Modus deaktivieren:**
   - Starten Sie mit `--dev` Flag: `npm start -- --dev`
   - Oder ändern Sie `kioskMode: false` in der config.json

2. **DevTools immer sichtbar:**
   - Im Dev-Modus automatisch aktiv
   - Oder `Ctrl+Shift+I` drücken

3. **Hot Reload:**
   - Änderungen an der Web-App werden sofort angezeigt
   - Änderungen an `main.js` erfordern Neustart

4. **Bildschirmschoner testen:**
   - Im Admin-Panel (PIN: 9988) → Station → Bildschirmschoner
   - Klick auf "Bildschirmschoner jetzt testen"

## Fehlerbehebung

### "electron" command not found
```bash
npm install -g electron
```

### Fenster startet im Vollbild
Drücken Sie `Ctrl+Shift+K` um den Kiosk-Modus zu verlassen.

### Config zurücksetzen
Löschen Sie die config.json im AppData-Ordner.
