# TSRID Agent Control Desk - Product Requirements Document

## Original Problem Statement
System für die automatische Konfiguration und Echtzeit-Überwachung einer großen Flotte von Windows-Tablets mit:
- PowerShell Agent für Hardware/Software-Inventar
- Admin Portal Dashboard (React/FastAPI)
- Station Assignment & Remote Control
- Electron Desktop Agent für ID-Verifikation

## Current Version: 1.0.6

---

## Implemented Features

### Electron Agent (TSRID Agent)
- **Kiosk-Modus**: Vollbild ohne Taskleiste, Toggle mit 5x Klick oder Ctrl+Shift+K
- **Bildschirmschoner**: 
  - Matrix-Rain Animation (japanische Zeichen)
  - TSRID Logo bewegt sich über gesamten Bildschirm
  - Scan-Linie, Cyber-Rahmen, Glitch-Effekte
  - System-Status-Texte
  - Konfigurierbar: 1-30 Minuten Timeout
- **Stations-PIN**: 4-6 stellige PIN für Start und Entsperrung
- **Server-Konfiguration**: URL änderbar für Produktivbetrieb
- **Autostart**: Mit Windows starten (konfigurierbar)
- **Regula Scanner Integration (v1.0.6)**:
  - Direkte Integration via `electron-edge-js`
  - Keine separate Bridge-Anwendung nötig
  - Automatische Erkennung installierter COM-Komponenten
  - Unterstützte ProgIDs: PassportReader.SDK, PassportReader.ABOREAD, etc.
  - Debug-Funktion um verfügbare Methoden/Properties anzuzeigen

### Admin Portal
- Station Tab mit:
  - Stations-PIN Verwaltung
  - Bildschirmschoner-Einstellungen
  - Server-Verbindung anzeigen/ändern
- Test-Button für Bildschirmschoner (funktioniert auch im Browser)
- Scanner-Manager mit:
  - Electron-App Erkennung
  - Regula Scanner Status/Verbindung
  - Debug-Info Button für SDK-Analyse

### CI/CD Pipeline
- GitHub Actions für automatische Builds
- Cross-Platform: Windows (.exe), macOS (.dmg), Linux (.AppImage)
- Automatische Releases bei Tag-Push (v*)

---

## Known Issues

### P0 - Download-Buttons
- Downloads funktionieren nicht direkt aus dem Emergent Preview iframe
- Ursache: Sandbox `allow-downloads` Flag nicht gesetzt
- Workaround: URL kopieren und in neuem Tab öffnen

### P1 - PowerShell Agent
- Log-Datei wird gesperrt (Write-Log Funktion)
- Agent geht zeitweise offline

---

## Upcoming Tasks

### P0
- [x] Regula 7028M.111 Scanner Integration (electron-edge-js) - IMPLEMENTIERT v1.0.6
- [ ] Electron Agent lokal testen mit Scanner-Hardware

### P1  
- [ ] RustDesk Integration für Remote Control
- [ ] PowerShell Agent Log-Fix

### P2
- [ ] Agent-zu-Agent Kommunikation
- [ ] Nachbestellungs-Funktion

---

## File References

### Electron Agent
- `/app/electron-agent/main/main.js` - Hauptprozess
- `/app/electron-agent/main/preload.js` - IPC Bridge
- `/app/electron-agent/main/regulaScanner.js` - Regula SDK via electron-edge-js (NEU v1.0.6)
- `/app/electron-agent/package.json` - Version 1.0.6
- `/app/electron-agent/README.md` - Entwickler-Dokumentation

### Frontend Components
- `/app/frontend/src/components/ScreensaverOverlay.jsx` - Bildschirmschoner
- `/app/frontend/src/components/StartupPinPrompt.jsx` - PIN beim Start
- `/app/frontend/src/components/AdminPanel.jsx` - Admin mit Station-Tab
- `/app/frontend/src/components/ScannerManager.jsx` - Scanner-Verwaltung (aktualisiert v1.0.6)

### Backend
- `/app/backend/routes/electron_agent.py` - Build & Download API

---

## Technical Details - Regula Scanner Integration

### Architektur (v1.0.6)
```
Electron App (Node.js)
  └── regulaScanner.js
       └── electron-edge-js
            └── C# Code (inline)
                 └── COM/ActiveX
                      └── Regula SDK (PassportReader.SDK)
                           └── Scanner Hardware (7028M.111)
```

### Voraussetzungen
- Windows 10/11 mit .NET Framework 4.x
- Regula Document Reader SDK installiert
- Scanner-Treiber installiert
- Scanner per USB verbunden

### API (Electron)
```javascript
// Status prüfen
await window.electronAPI.getScannerStatus()

// Verbinden
await window.electronAPI.connectScanner()

// Scannen
await window.electronAPI.triggerScan()

// Debug-Info
await window.electronAPI.getScannerDebugInfo()
```

---

## Credentials
- Admin PIN: 9988

---

## Last Updated
2026-03-11 - Regula Scanner Integration via electron-edge-js implementiert (v1.0.6)
