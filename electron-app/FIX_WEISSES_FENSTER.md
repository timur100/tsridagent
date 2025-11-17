# ✅ Fix: Weißes Fenster nach Build

## 🐛 Problem
Nach dem Build zeigte die App nur ein weißes Fenster.

## ✅ Lösung
**Behobene Dateien:**
1. ✅ `renderer/index.html` - Pfade von `/static/...` auf `./static/...` geändert
2. ✅ `main.js` - DevTools immer aktiviert + Error-Logging hinzugefügt

---

## 🔧 Was wurde geändert:

### 1. Pfade in index.html korrigiert
```html
<!-- ❌ VORHER (funktionierte nicht): -->
<script defer="defer" src="/static/js/main.a812e0f5.js"></script>
<link href="/static/css/main.3f61bb6a.css" rel="stylesheet">

<!-- ✅ NACHHER (funktioniert): -->
<script defer="defer" src="./static/js/main.a812e0f5.js"></script>
<link href="./static/css/main.3f61bb6a.css" rel="stylesheet">
```

**Warum?**
- Absolute Pfade (`/static/...`) funktionieren in gepackten Electron-Apps nicht
- Relative Pfade (`./static/...`) funktionieren korrekt

### 2. DevTools & Error-Logging aktiviert
```javascript
// DevTools wird jetzt immer geöffnet (zum Debuggen)
mainWindow.webContents.openDevTools();

// Error-Logging hinzugefügt
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  console.error('Failed to load:', errorCode, errorDescription);
});
```

---

## 🚀 Neue Build-Anleitung:

### Schritt 1: Lösche alten Build
```cmd
cd C:\electron123\electron-app
rmdir /s /q dist
rmdir /s /q node_modules
```

### Schritt 2: Neu installieren
```cmd
npm install
```

### Schritt 3: Build
```cmd
npm run build-portable
```

### Schritt 4: Starten
```cmd
dist\DocumentVerificationScanner-Portable.exe
```

---

## ✅ Erwartetes Ergebnis:

Nach dem neuen Build solltest du sehen:

1. ✅ **App-Fenster öffnet sich**
2. ✅ **DevTools öffnet sich automatisch** (rechte Seite)
3. ✅ **Frontend wird geladen** (nicht mehr weiß!)
4. ✅ **Scanner-Button ist sichtbar**

### Screenshot-Beschreibung:
- Links: Deine App mit Scanner-Interface
- Rechts: DevTools (Console-Tab)
- In Console: Logs vom Electron-Prozess

---

## 🔍 Wenn es immer noch weiß ist:

### 1. DevTools prüfen (öffnet sich automatisch)
In der Console nach Fehlern suchen:
```
❌ Failed to load script: ./static/js/main.a812e0f5.js
❌ net::ERR_FILE_NOT_FOUND
```

### 2. Dateistruktur prüfen
Nach dem Build sollte `dist` so aussehen:
```
dist\win-unpacked\
├── Document Verification Scanner.exe
├── resources\
│   └── app.asar  (oder app Ordner)
│       ├── main.js
│       ├── preload.js
│       └── renderer\
│           ├── index.html
│           └── static\
│               ├── js\
│               │   └── main.a812e0f5.js
│               └── css\
│                   └── main.3f61bb6a.css
```

### 3. Prüfe ob Dateien vorhanden sind
Öffne die App-Installation und prüfe:
```cmd
dir "dist\win-unpacked\resources\app\renderer\static\js"
```

Sollte zeigen: `main.a812e0f5.js`

---

## 🎯 Weitere Debugging-Schritte:

### Console-Logs anschauen:
1. App starten
2. DevTools öffnet sich automatisch
3. Console-Tab öffnen
4. Logs lesen:

**✅ Erfolgreich:**
```
[ELECTRON] Scanner online at: https://localhost/Regula.SDK.Api
Backend URL: https://job-portal-harmony.emergentagent.com
```

**❌ Fehler:**
```
Failed to load: -6 ERR_FILE_NOT_FOUND
Failed to load script: ./static/js/main.a812e0f5.js
```

### Wenn "ERR_FILE_NOT_FOUND":
Die Dateien wurden nicht korrekt gepackt. Prüfe:
1. Wurde `npm install` ausgeführt?
2. Existiert `renderer/static/js/main.a812e0f5.js` im Quellordner?
3. Build nochmal durchführen mit `--verbose`:
   ```cmd
   npm run build-portable -- --verbose
   ```

---

## 📦 Alternative: Dev-Modus testen

Wenn der Build Probleme macht, teste erst im Dev-Modus:
```cmd
npm start
```

Sollte die App direkt starten und laden (ohne Build).

**Wenn Dev-Modus funktioniert, aber Build nicht:**
→ Build-Konfiguration ist das Problem

**Wenn Dev-Modus auch nicht funktioniert:**
→ Code oder Dependencies haben Probleme

---

## 💡 Schnelltest-Kommandos:

```cmd
# Alles neu bauen
cd C:\electron123\electron-app
rmdir /s /q dist node_modules
npm install
npm run build-portable

# Direkt testen
dist\DocumentVerificationScanner-Portable.exe
```

---

## ✅ Nach erfolgreichem Fix

Die App sollte jetzt:
1. ✅ Scanner-Interface anzeigen
2. ✅ Scanner-Button funktioniert
3. ✅ **Process API wird verwendet** (unser Haupt-Fix!)
4. ✅ DevTools zeigt Logs

In DevTools nach diesem Text suchen:
```
[ELECTRON] Using standard Regula SDK Process API
```

Das zeigt, dass der Scanner-Fix aktiv ist! 🎉

---

**Falls du weitere Fehler siehst, schicke mir bitte:**
1. Screenshot der DevTools Console
2. Fehlermeldungen aus Console
3. Output von `npm run build-portable`
