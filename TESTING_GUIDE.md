# Regula Scanner Integration - Testing Guide

## Übersicht

Dieser Guide beschreibt alle Testschritte für die Regula Scanner Integration mit ReaderDemo.exe. Die Tests sind nach Backend, Frontend und Electron-App kategorisiert.

## ✅ Backend API Tests

### 1. Scanner Settings API

#### Test 1.1: Settings abrufen (Default)
```bash
curl http://localhost:8001/api/scanner/settings
```

**Erwartetes Ergebnis:**
```json
{
  "pin_configured": false,
  "hide_conflict_warning": false,
  "auto_start_reader_demo": false,
  "settings": {}
}
```

#### Test 1.2: PIN setzen
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

**Erwartetes Ergebnis:**
```json
{
  "success": true,
  "message": "PIN updated successfully"
}
```

#### Test 1.3: PIN verifizieren (korrekt)
```bash
curl -X POST http://localhost:8001/api/scanner/settings/verify-pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

**Erwartetes Ergebnis:**
```json
{
  "valid": true
}
```

#### Test 1.4: PIN verifizieren (falsch)
```bash
curl -X POST http://localhost:8001/api/scanner/settings/verify-pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "9999"}'
```

**Erwartetes Ergebnis:**
```json
{
  "valid": false
}
```

#### Test 1.5: Settings aktualisieren
```bash
curl -X PUT http://localhost:8001/api/scanner/settings \
  -H "Content-Type: application/json" \
  -d '{
    "hide_conflict_warning": true,
    "auto_start_reader_demo": false
  }'
```

**Erwartetes Ergebnis:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

#### Test 1.6: Settings erneut abrufen (nach Update)
```bash
curl http://localhost:8001/api/scanner/settings
```

**Erwartetes Ergebnis:**
```json
{
  "pin_configured": true,
  "hide_conflict_warning": true,
  "auto_start_reader_demo": false,
  "settings": {}
}
```

### 2. Fehlerbehandlung Tests

#### Test 2.1: Ungültiger PIN (zu kurz)
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "123"}'
```

**Erwartetes Ergebnis:**
```json
{
  "detail": "PIN must be exactly 4 digits"
}
```
**Status Code:** 400

#### Test 2.2: Ungültiger PIN (nicht numerisch)
```bash
curl -X POST http://localhost:8001/api/scanner/settings/pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "abcd"}'
```

**Erwartetes Ergebnis:**
```json
{
  "detail": "PIN must be exactly 4 digits"
}
```
**Status Code:** 400

### ✅ Backend Tests Status:
- [x] Test 1.1: Settings abrufen ✓
- [x] Test 1.2: PIN setzen ✓
- [x] Test 1.3: PIN verifizieren (korrekt) ✓
- [x] Test 1.4: PIN verifizieren (falsch) ✓
- [x] Test 1.5: Settings aktualisieren ✓
- [x] Test 1.6: Settings erneut abrufen ✓

---

## 🖥️ Electron App Tests (Windows)

### Voraussetzungen:
- ✅ Windows 10/11
- ✅ Regula Document Reader SDK installiert
- ✅ ReaderDemo.exe vorhanden: `C:\Program Files\Regula\Document Reader SDK\READERDEMO.exe`
- ✅ RegulaReader.ini vorhanden: `C:\Users\[USER]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini`

### 1. Electron App Setup

#### Test 1.1: Dependencies installieren
```bash
cd /app/electron-app
yarn install
```

**Erwartetes Ergebnis:**
- Alle Dependencies werden installiert
- Keine Fehler
- `node_modules` Ordner wird erstellt

#### Test 1.2: Portable Version bauen
```bash
cd /app/electron-app
yarn build-portable
```

**Erwartetes Ergebnis:**
- Build erfolgreich
- `dist/DocumentVerificationScanner-Portable.exe` wird erstellt
- Keine Build-Fehler

### 2. Electron IPC API Tests

Diese Tests werden in den DevTools der Electron-App durchgeführt (F12).

#### Test 2.1: RegulaReader.ini laden
```javascript
const config = await window.electronAPI.getRegulaConfig();
console.log('Regula Config:', config);
```

**Erwartetes Ergebnis:**
```javascript
{
  probabilityThreshold: 85,
  doRFID: true,
  doAuthenticity: 98307,
  autoScan: true,
  glareCompensation: true,
  graphicsCompressionRatio: 2,
  // ... weitere Settings
}
```

**Falls INI nicht gefunden:**
```javascript
{
  message: "RegulaReader.ini not found",
  path: "C:\\Users\\...",
  exists: false
}
```

#### Test 2.2: ReaderDemo.exe Status prüfen
```javascript
const status = await window.electronAPI.checkReaderDemo();
console.log('ReaderDemo Status:', status);
```

**Erwartetes Ergebnis (läuft nicht):**
```javascript
{
  running: false,
  message: "ReaderDemo.exe is not running"
}
```

**Erwartetes Ergebnis (läuft):**
```javascript
{
  running: true,
  message: "ReaderDemo.exe is running"
}
```

#### Test 2.3: PIN verifizieren
```javascript
const isValid = await window.electronAPI.verifyPin('1234');
console.log('PIN valid:', isValid);
```

**Erwartetes Ergebnis:**
- `true` bei korrektem PIN (1234)
- `false` bei falschem PIN

#### Test 2.4: ReaderDemo.exe starten
```javascript
const result = await window.electronAPI.startReaderDemo();
console.log('Start Result:', result);
```

**Erwartetes Ergebnis (erfolgreich):**
```javascript
{
  success: true,
  alreadyRunning: false,
  message: "ReaderDemo.exe started successfully"
}
```

**Erwartetes Ergebnis (bereits laufend):**
```javascript
{
  success: true,
  alreadyRunning: true,
  message: "ReaderDemo.exe was already running - brought to foreground"
}
```

#### Test 2.5: Settings lesen/schreiben
```javascript
// Schreiben
await window.electronAPI.setSetting('test.key', 'test value');

// Lesen
const value = await window.electronAPI.getSetting('test.key');
console.log('Setting value:', value);
```

**Erwartetes Ergebnis:**
- Wert wird korrekt gespeichert
- Wert kann gelesen werden
- Persistiert nach App-Neustart

### 3. UI Component Tests

#### Test 3.1: "Mehr Details" Button sichtbar
**Schritte:**
1. Electron-App starten
2. Hauptansicht öffnen

**Erwartetes Ergebnis:**
- Button ist unten links sichtbar
- Icon: 🔒 + Text "Mehr Details" + 🔗
- Status-Indikator zeigt "ReaderDemo gestoppt"

#### Test 3.2: PIN-Modal öffnen
**Schritte:**
1. "Mehr Details" Button klicken

**Erwartetes Ergebnis:**
- PIN-Modal öffnet sich
- Titel: "ReaderDemo.exe öffnen"
- 4 Eingabefelder (○○○○)
- Numpad (1-9, 0, C, ⌫)
- "Bestätigen" Button (disabled)
- "Demo PIN: 1234" Footer

#### Test 3.3: PIN-Eingabe (Maus)
**Schritte:**
1. PIN-Modal öffnen
2. Zahlen 1, 2, 3, 4 klicken

**Erwartetes Ergebnis:**
- Eingabefelder füllen sich: ●●●●
- "Bestätigen" Button wird aktiv (rot)

#### Test 3.4: PIN-Eingabe (Keyboard)
**Schritte:**
1. PIN-Modal öffnen
2. Tastatur: 1, 2, 3, 4

**Erwartetes Ergebnis:**
- Eingabe funktioniert wie Maus-Klick
- Backspace löscht letzte Ziffer
- Enter bestätigt (bei 4 Ziffern)
- Escape schließt Modal

#### Test 3.5: PIN-Verifizierung (korrekt)
**Schritte:**
1. PIN "1234" eingeben
2. "Bestätigen" klicken

**Erwartetes Ergebnis:**
- Modal schließt sich
- ReaderDemo.exe startet
- Status-Nachricht: "ReaderDemo.exe started successfully"
- Status-Indikator ändert sich: ✓ "ReaderDemo läuft"

#### Test 3.6: PIN-Verifizierung (falsch)
**Schritte:**
1. PIN "9999" eingeben
2. "Bestätigen" klicken

**Erwartetes Ergebnis:**
- Fehler-Banner: "Falscher PIN. Bitte versuchen Sie es erneut."
- Modal bleibt offen
- Eingabe wird gelöscht (○○○○)
- ReaderDemo.exe startet NICHT

#### Test 3.7: Warnung-Banner
**Schritte:**
1. ReaderDemo.exe manuell starten
2. Electron-App beobachten (5 Sekunden warten)

**Erwartetes Ergebnis:**
- Warnung-Banner erscheint oben rechts
- Text: "⚠️ ReaderDemo.exe läuft"
- Hinweis auf Scanner-Konflikt
- "Warnung ausblenden" Link vorhanden
- ✕ Button zum Schließen

#### Test 3.8: Warnung ausblenden
**Schritte:**
1. Warnung-Banner sichtbar
2. "Warnung ausblenden" klicken

**Erwartetes Ergebnis:**
- Banner verschwindet
- Setting wird gespeichert
- Nach App-Neustart: Banner erscheint NICHT mehr

#### Test 3.9: Process-Status Polling
**Schritte:**
1. Electron-App läuft
2. ReaderDemo.exe manuell starten
3. 5 Sekunden warten
4. ReaderDemo.exe schließen
5. 5 Sekunden warten

**Erwartetes Ergebnis:**
- Status-Indikator wechselt von "gestoppt" zu "läuft"
- Warnung-Banner erscheint (falls nicht ausgeblendet)
- Nach Schließen: Status wechselt zurück zu "gestoppt"

### 4. ReaderDemo.exe Integration Tests

#### Test 4.1: Start via PIN
**Schritte:**
1. ReaderDemo.exe ist NICHT gestartet
2. "Mehr Details" Button klicken
3. PIN "1234" eingeben
4. Bestätigen

**Erwartetes Ergebnis:**
- ReaderDemo.exe Fenster öffnet sich
- App ist voll funktionsfähig
- Scanner kann verwendet werden

#### Test 4.2: Fokussierung bei bereits laufendem Process
**Schritte:**
1. ReaderDemo.exe manuell starten und minimieren
2. In Electron-App: "Mehr Details" → PIN eingeben
3. Bestätigen

**Erwartetes Ergebnis:**
- ReaderDemo.exe Fenster kommt in den Vordergrund
- KEIN zweiter Process wird gestartet
- Status-Nachricht: "...was already running - brought to foreground"

#### Test 4.3: Scanner-Zugriff (exklusiv)
**Schritte:**
1. Electron-App hat Scanner-Verbindung
2. ReaderDemo.exe starten
3. In ReaderDemo.exe scannen versuchen

**Erwartetes Ergebnis:**
- Nur EINE App kann gleichzeitig scannen
- Fehler in der anderen App
- Warnung-Banner in Electron-App

---

## 🌐 Frontend (Web-Browser) Tests

### Test 1: Electron-Detection
**Schritte:**
1. App im Browser öffnen: http://localhost:3000
2. Nach "Mehr Details" Button suchen

**Erwartetes Ergebnis:**
- Button ist NICHT sichtbar
- Keine Console-Errors
- ReaderDemoManager rendert NICHT
- App funktioniert normal

### Test 2: electronAPI Verfügbarkeit
**Schritte:**
1. Im Browser: DevTools öffnen (F12)
2. Console: `console.log(window.electronAPI)`

**Erwartetes Ergebnis:**
```javascript
undefined
```
- Keine Fehler
- App ist stabil

---

## 📋 Zusammenfassende Test-Checkliste

### Backend Tests:
- [x] ✅ GET /api/scanner/settings (default)
- [x] ✅ POST /api/scanner/settings/pin
- [x] ✅ POST /api/scanner/settings/verify-pin (valid)
- [x] ✅ POST /api/scanner/settings/verify-pin (invalid)
- [x] ✅ PUT /api/scanner/settings
- [ ] ⏳ Fehlerbehandlung (ungültiger PIN)

### Electron IPC API Tests:
- [ ] ⏳ getRegulaConfig()
- [ ] ⏳ checkReaderDemo()
- [ ] ⏳ startReaderDemo()
- [ ] ⏳ verifyPin()
- [ ] ⏳ getSetting() / setSetting()

### UI Component Tests:
- [ ] ⏳ "Mehr Details" Button Sichtbarkeit
- [ ] ⏳ PIN-Modal öffnen
- [ ] ⏳ PIN-Eingabe (Maus)
- [ ] ⏳ PIN-Eingabe (Keyboard)
- [ ] ⏳ PIN-Verifizierung (korrekt)
- [ ] ⏳ PIN-Verifizierung (falsch)
- [ ] ⏳ Warnung-Banner
- [ ] ⏳ Process-Status Polling

### ReaderDemo.exe Integration Tests:
- [ ] ⏳ Start via PIN
- [ ] ⏳ Fokussierung bei laufendem Process
- [ ] ⏳ Scanner-Zugriff (exklusiv)

### Frontend (Browser) Tests:
- [ ] ⏳ Electron-Detection
- [ ] ⏳ electronAPI Verfügbarkeit

---

## 🐛 Bekannte Issues & Troubleshooting

### Issue 1: RegulaReader.ini nicht gefunden
**Symptom:** `getRegulaConfig()` gibt `exists: false` zurück

**Lösung:**
1. Pfad prüfen: `C:\Users\[USER]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini`
2. ReaderDemo.exe mindestens einmal starten (erstellt INI)
3. Falls nicht vorhanden: App verwendet Fallback-Werte

### Issue 2: ReaderDemo.exe startet nicht
**Symptom:** `startReaderDemo()` gibt `success: false`

**Lösung:**
1. Installation prüfen: `C:\Program Files\Regula\Document Reader SDK\READERDEMO.exe`
2. Admin-Rechte erforderlich?
3. Console-Logs in DevTools prüfen

### Issue 3: Process-Check funktioniert nicht
**Symptom:** Status zeigt immer "gestoppt"

**Lösung:**
1. `tasklist` Command manuell testen
2. Windows-Sicherheitseinstellungen prüfen
3. Console-Logs prüfen

### Issue 4: PIN-Verifizierung schlägt fehl
**Symptom:** Korrekter PIN wird als falsch angezeigt

**Lösung:**
1. Backend-Logs prüfen: `tail -f /var/log/supervisor/backend.*.log`
2. MongoDB-Verbindung testen
3. PIN in MongoDB überprüfen
4. PIN zurücksetzen via API

---

## 📊 Test-Report Template

Verwenden Sie dieses Template für Test-Berichte:

```markdown
## Test-Report: [Feature Name]
**Datum:** [TT.MM.YYYY]
**Tester:** [Name]
**Version:** [App Version]

### Umgebung:
- OS: Windows 10/11
- Regula SDK Version: [Version]
- Electron App Version: [Version]

### Tests:
| Test-ID | Test-Name | Status | Bemerkung |
|---------|-----------|--------|-----------|
| 1.1 | Settings abrufen | ✅ Pass | - |
| 1.2 | PIN setzen | ✅ Pass | - |
| ... | ... | ... | ... |

### Gefundene Bugs:
1. [Bug-Beschreibung]
2. [Bug-Beschreibung]

### Empfehlungen:
- [Empfehlung 1]
- [Empfehlung 2]
```

---

## 🚀 Automatisierte Tests (Zukünftig)

### Geplant:
- [ ] Jest Tests für React Components
- [ ] Playwright E2E Tests
- [ ] Backend Unit Tests (pytest)
- [ ] CI/CD Integration

---

**Version:** 1.0  
**Letztes Update:** 04. Januar 2025  
**Status:** Backend Tests ✅ | Electron Tests ⏳ | Browser Tests ⏳
