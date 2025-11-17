# 🚀 Windows Quick-Start Guide - Regula Scanner Integration

## Für Windows-Benutzer: So testen Sie die neue Integration

### Schritt 1: Voraussetzungen prüfen ✅

Stellen Sie sicher, dass folgende Software installiert ist:

- [x] **Windows 10 oder 11**
- [x] **Regula Document Reader SDK** 
  - Installation: `C:\Program Files\Regula\Document Reader SDK`
  - ReaderDemo.exe muss vorhanden sein
- [x] **Node.js** (für das Bauen der App)
  - Download: https://nodejs.org/

### Schritt 2: Electron App herunterladen/bauen 🔨

#### Option A: Portable .exe herunterladen (Empfohlen)

Falls die App bereits gebaut wurde:

1. Navigieren Sie zu: `/app/electron-app/dist/`
2. Datei suchen: `DocumentVerificationScanner-Portable.exe`
3. Kopieren Sie diese Datei auf Ihren Windows-PC
4. **Fertig!** Kein Installer nötig.

#### Option B: Selbst bauen (für Entwickler)

**Auf Linux/Mac (im Development-Environment):**

```bash
# 1. Frontend bauen
cd /app
./electron-app/build.sh

# 2. Electron App bauen
cd /app/electron-app
yarn install
yarn build-portable

# 3. .exe finden
# Die Datei ist jetzt hier: /app/electron-app/dist/DocumentVerificationScanner-Portable.exe
```

**Datei auf Windows-PC übertragen:**
- Per USB-Stick
- Per Netzwerk-Share
- Per Cloud-Drive

### Schritt 3: App starten 🎯

1. **Doppelklick** auf `DocumentVerificationScanner-Portable.exe`
2. Windows Defender Warnung? → "Weitere Informationen" → "Trotzdem ausführen"
3. App startet automatisch
4. Sie sehen die VerificationInterface

### Schritt 4: Neue Features testen 🧪

#### Test 1: "Mehr Details" Button finden

**Wo:** Unten links in der App

```
┌─────────────────────────────────────┐
│                                     │
│         [App Content]               │
│                                     │
│  ┌────────────────────────┐         │
│  │ 🔒 Mehr Details 🔗     │         │
│  └────────────────────────┘         │
│  ○ ReaderDemo gestoppt              │
└─────────────────────────────────────┘
```

**Erwartetes Ergebnis:**
- ✅ Button ist sichtbar
- ✅ Status zeigt: "ReaderDemo gestoppt"

#### Test 2: PIN-Modal öffnen

**Schritte:**
1. Klick auf "Mehr Details" Button
2. PIN-Modal öffnet sich

**Erwartetes Ergebnis:**

```
┌─────────────────────────────┐
│ ReaderDemo.exe öffnen    ✕  │
├─────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐  │
│  │ ○ │ │ ○ │ │ ○ │ │ ○ │  │
│  └───┘ └───┘ └───┘ └───┘  │
│                             │
│  [1] [2] [3]                │
│  [4] [5] [6]                │
│  [7] [8] [9]                │
│  [C] [0] [⌫]                │
│                             │
│     [Bestätigen]            │
│                             │
│    Demo PIN: 1234           │
└─────────────────────────────┘
```

#### Test 3: PIN eingeben (Standard: 1234)

**Schritte:**
1. Klicken Sie auf: `1` → `2` → `3` → `4`
2. ODER: Tastatur benutzen: `1234`
3. Klick auf "Bestätigen" (oder Enter drücken)

**Erwartetes Ergebnis:**
- ✅ Eingabefelder füllen sich: ●●●●
- ✅ "Bestätigen" Button wird rot
- ✅ Nach Bestätigung: ReaderDemo.exe startet
- ✅ Modal schließt sich
- ✅ Status ändert sich: "✓ ReaderDemo läuft"

#### Test 4: ReaderDemo.exe startet

**Nach korrektem PIN:**
1. ReaderDemo.exe Fenster öffnet sich automatisch
2. Sie sehen die Regula Desktop-Anwendung
3. Scanner kann verwendet werden

**Hinweis:** Beim ersten Start kann Windows Firewall nach Berechtigungen fragen → "Zugriff zulassen"

#### Test 5: Warnung-Banner (Scanner-Konflikt)

**Situation:** Wenn ReaderDemo.exe läuft

**Erwartetes Ergebnis:**
- ✅ Banner erscheint oben rechts nach ~5 Sekunden
- ✅ Text: "⚠️ ReaderDemo.exe läuft"
- ✅ Hinweis: Nur eine App kann gleichzeitig auf Scanner zugreifen
- ✅ "Warnung ausblenden" Link vorhanden

```
┌────────────────────────────────────────┐
│ ⚠️ ReaderDemo.exe läuft            ✕   │
│ Beide Anwendungen können nicht         │
│ gleichzeitig auf den Scanner zugreifen.│
│ [Warnung ausblenden]                   │
└────────────────────────────────────────┘
```

#### Test 6: Falscher PIN

**Schritte:**
1. "Mehr Details" Button klicken
2. Falschen PIN eingeben (z.B. `9999`)
3. Bestätigen

**Erwartetes Ergebnis:**
- ✅ Fehler-Banner: "Falscher PIN. Bitte versuchen Sie es erneut."
- ✅ Eingabe wird gelöscht (○○○○)
- ✅ Modal bleibt offen
- ✅ ReaderDemo.exe startet NICHT

### Schritt 5: RegulaReader.ini Settings prüfen (Optional) 🔧

**Pfad überprüfen:**
```
C:\Users\[IHR-USERNAME]\AppData\Local\Regula\Document Reader SDK (x64)\RegulaReader.ini
```

**DevTools öffnen:**
1. In der Electron-App: `F12` drücken
2. Console öffnen
3. Eingeben:
   ```javascript
   window.electronAPI.getRegulaConfig()
   ```

**Erwartetes Ergebnis:**
```javascript
Promise {<pending>}
// Dann erscheint:
{
  probabilityThreshold: 85,
  doRFID: true,
  doAuthenticity: 98307,
  autoScan: true,
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

**Lösung:** ReaderDemo.exe mindestens einmal manuell starten (erstellt die INI-Datei).

---

## 🔧 Häufige Probleme & Lösungen

### Problem 1: "Mehr Details" Button nicht sichtbar

**Mögliche Ursachen:**
- App läuft im Browser statt Electron
- ReaderDemoManager Component lädt nicht

**Lösung:**
1. Sicherstellen, dass die Portable .exe gestartet wurde
2. Nicht im Browser öffnen
3. DevTools öffnen (F12) und nach Fehlern suchen

### Problem 2: ReaderDemo.exe startet nicht

**Mögliche Ursachen:**
- ReaderDemo.exe nicht installiert
- Falscher Installationspfad
- Keine Admin-Rechte

**Lösung:**
1. Installation prüfen:
   ```
   C:\Program Files\Regula\Document Reader SDK\READERDEMO.exe
   ```
2. Datei existiert?
   - Ja: App als Administrator starten
   - Nein: Regula SDK neu installieren

### Problem 3: PIN funktioniert nicht

**Mögliche Ursachen:**
- Backend nicht erreichbar
- MongoDB-Verbindung fehlt

**Lösung:**
1. DevTools öffnen (F12)
2. Console prüfen auf Fehler
3. Backend-URL prüfen in Console:
   ```javascript
   window.electronAPI.getBackendUrl()
   ```
4. Falls nötig: Backend-URL in `main.js` anpassen

### Problem 4: RegulaReader.ini nicht gefunden

**Lösung:**
1. ReaderDemo.exe manuell starten (erstellt INI)
2. Oder: Pfad manuell erstellen:
   ```
   C:\Users\[USER]\AppData\Local\Regula\Document Reader SDK (x64)\
   ```

### Problem 5: Scanner-Konflikt

**Symptom:** Beide Apps können nicht gleichzeitig scannen

**Erwartetes Verhalten:** Das ist korrekt! Nur eine App kann den Scanner nutzen.

**Lösung:**
- Für normale Scans: Electron-App verwenden
- Für erweiterte Details: ReaderDemo.exe öffnen (via PIN)
- Zwischen Apps wechseln: Eine schließen, andere nutzen

---

## 📋 Quick-Checkliste

Verwenden Sie diese Checkliste beim ersten Test:

```
Windows Testing - Checkliste

□ App heruntergeladen/gebaut
□ Portable .exe auf Windows-PC kopiert
□ Regula SDK installiert (ReaderDemo.exe vorhanden)
□ App gestartet (Doppelklick auf .exe)
□ VerificationInterface erscheint
□ "Mehr Details" Button sichtbar (unten links)
□ PIN-Modal öffnet sich bei Klick
□ PIN 1234 eingegeben
□ ReaderDemo.exe startet nach Bestätigung
□ Status-Indikator zeigt "läuft"
□ Warnung-Banner erscheint (falls ReaderDemo läuft)
□ DevTools öffnen (F12) - keine Fehler
□ getRegulaConfig() funktioniert
□ checkReaderDemo() funktioniert
```

---

## 🎥 Video-Tutorial (Optional)

Für ein visuelles Tutorial, siehe:
- [Link zum Video-Tutorial] (falls vorhanden)

---

## 📞 Support

Bei Problemen:

1. **DevTools prüfen:** F12 in der App
2. **Console-Logs:** Fehler notieren
3. **Screenshots:** Fehler-Screens erstellen
4. **Backend-Logs:** (Falls Zugriff vorhanden)
   ```bash
   tail -f /var/log/supervisor/backend.*.log
   ```

**Dokumentation:**
- Vollständiger Guide: `/app/REGULA_INTEGRATION_GUIDE.md`
- Testing Guide: `/app/TESTING_GUIDE.md`

---

## ✅ Erfolg!

Wenn alle Tests erfolgreich sind:

✅ PIN-Modal funktioniert  
✅ ReaderDemo.exe startet bei korrektem PIN  
✅ Warnung-Banner erscheint bei laufendem Process  
✅ Status-Indikator funktioniert  
✅ RegulaReader.ini Settings werden geladen  

**Herzlichen Glückwunsch! Die Integration ist erfolgreich getestet.** 🎉

---

**Version:** 1.0  
**Datum:** 04. Januar 2025  
**Für:** Windows 10/11 Benutzer
