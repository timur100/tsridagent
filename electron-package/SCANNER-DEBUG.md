# 🔍 Scanner Debug - Wenn Button deaktiviert ist

## Problem: Scanner-Button ist deaktiviert (grau)

Das bedeutet, die App kann den Regula Scanner Service nicht finden.

## ✅ Schritt 1: Scanner-Service prüfen

### Test im Browser:
Öffnen Sie einen Browser und gehen Sie zu:
```
https://localhost/Regula.SDK.Api.Documentation/index
```

**Ergebnis:**
- ✅ **Seite lädt** → Scanner läuft, aber App findet ihn nicht
- ❌ **Fehler/Timeout** → Scanner läuft nicht

### Test mit Debug-Script:
```cmd
cd C:\scanner-app
node debug-scanner.js
```

Das Script testet alle möglichen URLs und zeigt Ihnen genau, wo der Scanner erreichbar ist.

**Beispiel-Output wenn Scanner läuft:**
```
Testing: https://localhost/Regula.SDK.Api/Methods/GetServiceVersion
✅ SUCCESS! Scanner found at: https://localhost/Regula.SDK.Api
   Status: 200
   Version: 5.2.0
```

**Beispiel-Output wenn Scanner NICHT läuft:**
```
Testing: https://localhost/Regula.SDK.Api/Methods/GetServiceVersion
❌ FAILED: connect ECONNREFUSED
```

## ✅ Schritt 2: Regula Service starten (falls offline)

### Option A: Windows Services
1. Windows-Taste drücken
2. "Services" eingeben
3. Services-App öffnen
4. Nach "Regula" suchen
5. Rechtsklick → "Starten"

### Option B: Task-Manager
1. Task-Manager öffnen (Strg+Shift+Esc)
2. "Details"-Tab
3. Nach "Regula" suchen
4. Falls nicht vorhanden → Service manuell starten

### Option C: Regula SDK Service App
1. Suchen Sie die Regula SDK Service Anwendung
2. Als Administrator starten
3. Warten bis Tray-Icon erscheint

## ✅ Schritt 3: App mit Debug-Modus starten

```cmd
cd C:\scanner-app
npm start
```

Jetzt öffnet sich die App mit DevTools (F12 ist automatisch offen).

### In der Console sehen Sie:
```
🔍 Running in Electron - checking local scanner...
✅ Scanner online (Electron): https://localhost/Regula.SDK.Api
```

**Oder bei Fehler:**
```
🔍 Running in Electron - checking local scanner...
❌ Scanner offline (Electron): Scanner service not available
```

## ✅ Schritt 4: Häufige Probleme

### Problem: "ECONNREFUSED"
**Ursache:** Scanner-Service läuft nicht
**Lösung:** Service starten (siehe Schritt 2)

### Problem: "ETIMEDOUT"
**Ursache:** Falscher Port oder Firewall blockiert
**Lösung:** 
1. Firewall temporär deaktivieren
2. Port-Nummer prüfen (siehe unten)

### Problem: "ENOTFOUND"
**Ursache:** DNS-Problem mit "localhost"
**Lösung:** In `main.js` ändern:
```javascript
// Statt "localhost" verwenden Sie:
const scannerUrls = [
  'https://127.0.0.1/Regula.SDK.Api',
  'https://127.0.0.1:88/Regula.SDK.Api'
];
```

### Problem: Scanner läuft auf anderem Port
**Lösung:** Port herausfinden und in `main.js` anpassen

**Port herausfinden:**
1. Regula Dokumentation öffnen im Browser
2. URL-Leiste zeigt den Port
3. z.B. `https://localhost:8080/...` → Port ist 8080

**main.js anpassen:**
```javascript
const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api',
  'https://localhost:8080/Regula.SDK.Api'  // Ihren Port hinzufügen
];
```

## ✅ Schritt 5: App neu bauen nach Änderungen

Nach jeder Änderung in `main.js`:

```cmd
cd C:\scanner-app
build-on-windows-npm.bat
```

## 📊 Scanner-Status in der App

### Grüner Punkt + aktiver Button
```
Scanner online ✅
Bereit zum Scannen
```

### Grauer Button (deaktiviert)
```
Scanner offline ❌
Service starten erforderlich
```

## 🔧 Erweiterte Diagnose

### Console-Logs in der App anschauen:
1. App starten
2. F12 drücken (DevTools)
3. "Console"-Tab
4. Nach "Scanner" suchen

**Was Sie sehen sollten:**
```javascript
Electron app started
Backend URL: https://job-portal-harmony.emergentagent.com
Looking for Regula Scanner on localhost...
🔍 Running in Electron - checking local scanner...
✅ Scanner online (Electron): https://localhost/Regula.SDK.Api
```

### Network-Logs prüfen:
1. DevTools → "Network"-Tab
2. Nach "GetServiceVersion" suchen
3. Status-Code prüfen:
   - 200 = OK ✅
   - 404 = Falscher Pfad ❌
   - Timeout = Service läuft nicht ❌

## 🆘 Wenn nichts funktioniert

### Letzte Möglichkeiten:

1. **Regula SDK Service neu installieren**
   - Deinstallieren
   - PC neu starten
   - Neu installieren
   - Als Administrator starten

2. **Windows Firewall Ausnahme hinzufügen**
   ```
   Firewall-Einstellungen → App durchlassen
   → Regula SDK Service hinzufügen
   ```

3. **Antivirus temporär deaktivieren**
   - Manchmal blockiert Antivirus lokale HTTPS-Verbindungen

4. **Electron-App als Administrator starten**
   ```
   Rechtsklick auf .exe → Als Administrator ausführen
   ```

## 📞 Support-Informationen sammeln

Wenn Sie Hilfe benötigen, sammeln Sie diese Infos:

1. **Output von `node debug-scanner.js`**
2. **Console-Logs aus App (F12)**
3. **Task-Manager Screenshot** (Prozesse mit "Regula")
4. **Browser-Test Ergebnis** (https://localhost/Regula.SDK.Api.Documentation/index)

## ✅ Erfolgreiches Setup sieht so aus:

```
C:\scanner-app> node debug-scanner.js
🔍 Testing Regula Scanner Service...

Testing: https://localhost/Regula.SDK.Api/Methods/GetServiceVersion
✅ SUCCESS! Scanner found at: https://localhost/Regula.SDK.Api
   Status: 200
   Version: 5.2.0
```

Dann in der App:
- ✅ Grüner Punkt am Scanner-Button
- ✅ Button ist aktiv (nicht grau)
- ✅ Klick auf "Scanner" öffnet Scan-Dialog
