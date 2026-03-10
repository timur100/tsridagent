# TSR Electron Agent

## Übersicht
Eine plattformübergreifende Desktop-Anwendung für ID-Verifizierung und Geräte-Management.

## Features
- **ID Verification**: Integration mit Regula 7028M.111 USB Scanner
- **Device Agent**: PowerShell-kompatible Geräteüberwachung
- **Auto-Update**: Automatische Updates vom TSR Admin Portal
- **Cross-Platform**: Windows, macOS, Linux

## Architektur

```
electron-agent/
├── main/                    # Electron Main Process
│   ├── main.js             # Entry point
│   ├── preload.js          # Secure bridge to renderer
│   ├── scanner/            # Regula Scanner Integration
│   │   └── regula.js       # USB HID communication
│   ├── agent/              # Device Agent Logic
│   │   └── heartbeat.js    # Status reporting
│   └── updater/            # Auto-update system
│       └── updater.js      # Update management
├── renderer/               # React UI (from existing VerificationInterface)
│   ├── index.html
│   └── src/
├── package.json
└── electron-builder.json   # Build configuration
```

## Regula 7028M.111 Integration

Der Scanner kommuniziert über:
1. **Regula SDK API** (HTTPS auf localhost:443 oder :88)
2. **USB HID** für direkte Hardware-Kommunikation

## Version Management

Versionen werden im Format `MAJOR.MINOR.PATCH` verwaltet:
- **MAJOR**: Breaking changes
- **MINOR**: Neue Features
- **PATCH**: Bug fixes

## Admin Portal Integration

- `/api/electron-agent/versions` - Verfügbare Versionen
- `/api/electron-agent/download/{version}` - Download
- `/api/electron-agent/devices` - Registrierte Geräte
- `/api/electron-agent/update-push` - Update an Geräte senden
