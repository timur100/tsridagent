# 📋 Changelog - Document Verification Scanner

## Version 6 (2025-01-04)

### ✨ Neue Features

#### **Regula ReaderDemo.exe Integration**
- ✅ PIN-geschützter Zugriff auf ReaderDemo.exe
- ✅ RegulaReader.ini Settings-Integration
- ✅ Process-Management für ReaderDemo.exe
- ✅ Scanner-Konflikt-Warnung
- ✅ "Mehr Details" Floating Button

#### **PIN-Modal Component**
- 🔐 4-stellige PIN-Eingabe (Default: 1234)
- 🎹 Numpad-Layout mit visuellen Feedback (●/○)
- ⌨️ Keyboard-Support (0-9, Backspace, Enter, Escape)
- ❌ Fehler-Anzeige bei falschem PIN
- 🎨 Dark Theme mit rotem Border

#### **ReaderDemo.exe Process Management**
- 🔄 Automatischer Process-Status-Check (alle 5 Sekunden)
- 🚀 Start via PIN-Eingabe
- 🪟 Window-Fokussierung bei bereits laufendem Process
- 🚫 Duplikat-Prävention (erkennt laufende Instanz)

#### **Scanner-Konflikt-Warnung**
- ⚠️ Automatische Erkennung wenn ReaderDemo.exe läuft
- 📢 Banner-Warnung oben rechts
- 💡 Hinweis: Nur eine App kann gleichzeitig auf Scanner zugreifen
- 🔇 Warnung kann permanent ausgeblendet werden

#### **Backend API für Scanner-Settings**
- 📡 GET /api/scanner/settings - Settings abrufen
- 🔑 POST /api/scanner/settings/pin - PIN setzen
- ✔️ POST /api/scanner/settings/verify-pin - PIN prüfen
- 🔧 PUT /api/scanner/settings - Settings aktualisieren
- 🔒 SHA-256 Hash-basierte PIN-Speicherung

### 🔧 Technische Details

**Neue Dateien:**
- `/app/frontend/src/components/PinModal.jsx`
- `/app/frontend/src/components/ReaderDemoManager.jsx`
- `/app/backend/routes/scanner_settings.py`
- `/app/REGULA_INTEGRATION_GUIDE.md`
- `/app/IMPLEMENTATION_SUMMARY.md`
- `/app/TESTING_GUIDE.md`
- `/app/WINDOWS_QUICKSTART.md`

**Aktualisierte Dateien:**
- `/app/electron-app/main.js` (+Settings-Parser, +Process-Management)
- `/app/electron-app/preload.js` (+neue IPC APIs)
- `/app/electron-app/package.json` (+ini dependency)
- `/app/frontend/src/components/VerificationInterface.jsx` (+ReaderDemoManager)
- `/app/backend/server.py` (+scanner_settings_router)

**Electron IPC API Erweiterungen:**
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

**RegulaReader.ini Integration:**
- Automatisches Laden beim Electron-Start
- Pfad: `C:\Users\[USER]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini`
- Kritische Settings werden extrahiert:
  - `ProbabilityThreshold` (85)
  - `DoRFID` (1)
  - `DoAuthenticity` (98307)
  - `AutoScan` (1)
  - `GlareCompensation` (1)

### 📥 Installation

**Backend:**
```bash
# Backend läuft bereits
sudo supervisorctl status backend
# → backend RUNNING
```

**Electron-App (Windows):**
```bash
cd /app/electron-app
yarn install
yarn build-portable
# → dist/DocumentVerificationScanner-Portable.exe
```

### 🎯 Verwendung

#### **Workflow:**
1. User klickt "Mehr Details" Button (unten links)
2. PIN-Modal öffnet sich
3. User gibt PIN ein (Standard: `1234`)
4. Bei korrektem PIN: ReaderDemo.exe startet automatisch
5. ReaderDemo.exe zeigt erweiterte Scanner-Details
6. Warnung erscheint wenn beide Apps gleichzeitig laufen

#### **PIN ändern:**
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "5678"}'
```

### 🔒 Sicherheit

- PIN wird als SHA-256 Hash gespeichert (nicht im Klartext)
- MongoDB-basierte Speicherung
- Server-seitige Validierung
- Default-PIN: `1234` (sollte geändert werden)

### 📚 Dokumentation

**Neue Guides:**
- `/app/REGULA_INTEGRATION_GUIDE.md` - Vollständiger Integration-Guide
- `/app/IMPLEMENTATION_SUMMARY.md` - Technische Details
- `/app/TESTING_GUIDE.md` - Umfassender Test-Guide
- `/app/WINDOWS_QUICKSTART.md` - Windows-Benutzer Quick-Start

### ✅ Testing

**Backend API Tests (abgeschlossen):**
- ✅ GET /api/scanner/settings
- ✅ POST /api/scanner/settings/pin
- ✅ POST /api/scanner/settings/verify-pin (valid)
- ✅ POST /api/scanner/settings/verify-pin (invalid)
- ✅ PUT /api/scanner/settings

**Electron Tests (auf Windows-PC erforderlich):**
- ⏳ PIN-Modal Funktionalität
- ⏳ ReaderDemo.exe Start via PIN
- ⏳ Process-Status-Check
- ⏳ Scanner-Konflikt-Warnung
- ⏳ RegulaReader.ini Laden

---

## Version 5 (2024-11-04)

### ✨ Neue Features

#### **Scanner-Modus-Switch: Live vs. Simulation**
- ✅ Toggle im Admin-Panel hinzugefügt
- 🎚️ Zwei Modi:
  - **Live-Modus:** Echter Regula Scanner über localhost (Electron-App)
  - **Simulation-Modus:** Mock-Daten für Entwicklung bei Emergent
- 💾 Persistenz via localStorage
- 🏷️ UI-Badge zeigt aktuellen Modus an ("SIM" für Simulation)

#### **Verbesserungen**
- Scanner-Button zeigt Modus an: "Scanner" (Live) oder "Scanner (Sim)"
- Grüner Dot nur bei Live-Modus und Scanner online
- Console-Logs für Debugging
- Automatische Modus-Erkennung

### 🔧 Technische Details

**Admin-Panel:**
- Neuer Toggle: "📡 Scanner-Modus"
- Visuelles Feedback (LIVE / SIMULATION Badge)
- Beschreibung der beiden Modi

**VerificationInterface:**
- Modus-Check vor jedem Scan
- Simulation verwendet Mock-Daten
- Live verwendet Electron-API oder Backend-API

**Persistenz:**
- `scannerMode` in localStorage gespeichert
- Lädt beim App-Start
- Überlebt Page-Reloads

### 📥 Installation

**Emergent (Browser):**
- Keine Installation nötig
- Simulation-Modus standardmäßig aktiv
- Für Entwicklung perfekt

**Electron-App (Windows):**
```cmd
1. Download: electron-scanner-package-v5.zip
2. Entpacken nach C:\scanner
3. build-on-windows-npm.bat ausführen
4. npm start oder .exe starten
5. Admin-Panel → Scanner-Modus auf "Live" stellen
```

### 🎯 Verwendung

#### **Für Entwicklung (Emergent):**
1. Admin-Panel öffnen
2. Scanner-Modus: **SIMULATION** (Standard)
3. Normal entwickeln und testen
4. Keine Hardware nötig! ✅

#### **Für Produktion (Electron):**
1. Electron-App starten
2. Admin-Panel öffnen
3. Scanner-Modus: **LIVE** umschalten
4. **"Einstellungen speichern" klicken**
5. Echter Scanner wird verwendet ✅

---

## Version 4 (2024-11-04)

### ✨ Neue Features

#### **Regula Scanner Integration**
- ✅ Vollständige Regula Document Reader Integration
- ✅ Port Auto-Detection (443 → 88)
- ✅ LED-Steuerung (Grün/Gelb/Rot)
- ✅ Alle Bildtypen (UV, IR, White Light)
- ✅ RFID-Chip-Auslesen
- ✅ OCR & Dokumentenerkennung

#### **Banned Documents Toggle**
- ✅ Ein/Aus-Schalter im Admin-Panel
- ✅ Deaktivierbar für Testing
- ✅ localStorage-Persistenz

### 🔧 Fixes
- ❌ Simulation-Modus entfernt (war für Desko)
- ✅ Live Scanner-Anzeige im Admin-Panel
- ✅ "Simulated" Badge entfernt

---

## Version 3 (2024-11-04)

### 🔧 Fixes

#### **Scanner-Detection verbessert**
- ✅ Electron-App erkennt lokalen Scanner
- ✅ Browser-App nutzt Backend-API
- ✅ Feature-Detection für beide Modi

#### **UI-Verbesserungen**
- ✅ Scanner-Button mit Online-Indicator
- ✅ Bessere Error-Messages
- ✅ Console-Logs für Debugging

---

## Version 2 (2024-11-04)

### 🔧 Fixes

#### **Scanner-Status-Check**
- ✅ Auto-Retry auf verschiedenen Ports
- ✅ SSL Self-Signed Certificate Support
- ✅ Timeout-Handling

#### **Debug-Tools hinzugefügt**
- ✅ `debug-scanner.js` - Scanner-Test-Script
- ✅ `SCANNER-DEBUG.md` - Troubleshooting-Guide
- ✅ Verbesserte Error-Logs

---

## Version 1 (2024-11-04)

### 🎉 Initial Release

#### **Electron-App**
- ✅ Windows-Desktop-App
- ✅ Regula Scanner Support
- ✅ Cloud-Backend Integration
- ✅ VerificationInterface komplett

#### **Features**
- ✅ Dokumenten-Scan
- ✅ OCR & Erkennung
- ✅ Führerschein-Verifikation
- ✅ Gesperrte Dokumente-Check
- ✅ Admin-Panel

---

## 📝 Migration Guide

### Von v4 → v5:

**Was ist neu:**
- Scanner-Modus-Switch hinzugefügt

**Was Sie tun müssen:**
1. Neues Paket downloaden (v5)
2. App neu bauen
3. Admin-Panel öffnen
4. Scanner-Modus wählen (Live/Simulation)
5. **"Einstellungen speichern" klicken**

**Breaking Changes:**
- Keine! Vollständig rückwärtskompatibel

---

## 🔮 Geplante Features

### Version 6 (Zukunft)
- [ ] Offline-Modus mit SQLite
- [ ] Automatische Sync bei Online-Verbindung
- [ ] Queue-System für ausstehende Scans
- [ ] Background-Sync-Service

### Version 7 (Zukunft)
- [ ] Multi-Scanner-Support
- [ ] Batch-Scanning
- [ ] Export-Funktionen
- [ ] Advanced Analytics

---

## 🐛 Known Issues

### Version 5:
- Keine bekannten Probleme

### Version 4:
- ~~Scanner-Modus fehlte~~ → Fixed in v5

---

## 📞 Support

Bei Problemen:
1. Logs prüfen (F12 Console)
2. CHANGELOG.md durchlesen
3. QUICK_START.md konsultieren
4. BUILD_GUIDE.md für Entwicklung
