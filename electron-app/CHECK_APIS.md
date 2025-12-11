# 🔍 API-Check: printImage nicht verfügbar

## ❌ Fehler: "window.printerAPI.printImage is not a function"

**Ursache:** Die neue `preload.js` wurde noch nicht geladen.

---

## ✅ Schnelle Lösung - 3 Optionen:

### Option 1: Electron-App komplett neu starten ⚡ (EMPFOHLEN)

```bash
# 1. App komplett beenden (nicht nur Fenster schließen!)
# Windows: Task Manager → Electron beenden
# Oder: ALT+F4 mehrmals

# 2. Neu starten
cd electron-app
yarn start
```

**Wichtig:** Electron cached die alte `preload.js`. Nur Fenster schließen reicht nicht!

---

### Option 2: Hard Reload in der App

```
In der Electron-App:
1. F12 drücken (DevTools öffnen)
2. Console öffnen
3. Eingeben: location.reload(true)
4. Enter

Oder: STRG+SHIFT+R (Hard Reload)
```

---

### Option 3: Fallback nutzen (Temporär)

**Die App hat jetzt einen Fallback:**
- Statt zu drucken: Label wird als PNG heruntergeladen
- Sie können es dann manuell drucken:
  1. Heruntergeladenes `label_TSR.EC.SCDE.000001.png` öffnen
  2. STRG+P (Drucken)
  3. Brother QL auswählen
  4. Drucken

---

## 🔍 Debug: Verfügbare APIs prüfen

### In der Electron-App (F12 Console):

```javascript
// Prüfen welche APIs verfügbar sind
console.log('Available APIs:', Object.keys(window));
console.log('printerAPI:', window.printerAPI);
console.log('printImage available:', !!window.printerAPI?.printImage);

// Alle printerAPI Funktionen auflisten
if (window.printerAPI) {
  console.log('printerAPI functions:', Object.keys(window.printerAPI));
}
```

**Erwartete Ausgabe (NEU):**
```
printerAPI functions: [
  "print",
  "printZPL", 
  "test",
  "getSystemPrinters",
  "printToWindows",
  "printImage"        ← Diese Funktion muss da sein!
]
```

**Falls fehlt:**
```
printerAPI functions: [
  "print",
  "printZPL", 
  "test",
  "getSystemPrinters",
  "printToWindows"
  // printImage fehlt! ← Alte preload.js!
]
```

---

## 📁 Dateien prüfen:

### 1. Ist die neue preload.js am richtigen Ort?

```bash
cd electron-app
type preload.js | findstr printImage
```

**Sollte zeigen:**
```javascript
printImage: (printerName, imageData) => 
    ipcRenderer.invoke('printer:printImage', { printerName, imageData })
```

### 2. Ist die neue main.js am richtigen Ort?

```bash
type main.js | findstr "printer:printImage"
```

**Sollte zeigen:**
```javascript
ipcMain.handle('printer:printImage', async (event, { printerName, imageData }) => {
```

---

## 🔄 Richtig neu starten:

### Windows:

```bash
# 1. Alle Electron-Prozesse beenden
taskkill /F /IM electron.exe

# 2. Neu starten
cd electron-app
yarn start
```

### Alternative:

```bash
# 1. Task Manager öffnen (STRG+SHIFT+ESC)
# 2. Suche "Electron"
# 3. Rechtsklick → Task beenden
# 4. Electron-App neu starten
```

---

## ✅ Nach Neustart testen:

### F12 Console:

```javascript
// Test ob API verfügbar
window.printerAPI.printImage ? 
  console.log('✓ printImage verfügbar!') : 
  console.log('✗ printImage fehlt noch!');
```

**Falls verfügbar:**
- ✅ Drucker-Button klicken
- ✅ Label wird generiert
- ✅ Brother QL druckt hochauflösendes Label!

**Falls immer noch nicht verfügbar:**
- ⚠️ Fallback wird genutzt
- 📥 Label als PNG heruntergeladen
- 🖨️ Manuell drucken

---

## 🎯 Checkliste:

- [ ] Electron-App **komplett** beendet (Task Manager prüfen)
- [ ] Neue `preload.js` heruntergeladen
- [ ] Neue `main.js` heruntergeladen
- [ ] Neue `AssetManagement.jsx` heruntergeladen (mit Fallback)
- [ ] Dateien im richtigen Ordner (`electron-app/`)
- [ ] App neu gestartet mit `yarn start`
- [ ] F12 Console: `window.printerAPI.printImage` verfügbar?
- [ ] Drucker-Button getestet

---

## 💡 Warum passiert das?

**Electron cached alte Dateien:**
- preload.js wird beim App-Start geladen
- Nur Fenster schließen ≠ App beenden
- Electron-Prozess läuft im Hintergrund weiter
- Nutzt weiterhin alte preload.js

**Lösung:**
- Kompletter Neustart (Process beenden)
- Oder: Dev-Modus mit Hot Reload

---

## 🚀 Finale Lösung:

**JETZT:**
1. ✅ Task Manager → Electron beenden
2. ✅ `yarn start` → Neu starten
3. ✅ F12 → `window.printerAPI.printImage` prüfen
4. ✅ Drucker-Button klicken → Funktioniert!

**FALLBACK (falls immer noch Fehler):**
- Label wird als PNG heruntergeladen
- Manuell drucken (STRG+P)
- Funktioniert genauso gut!

---

**Die App hat jetzt beide Methoden: automatisch (neu) + manuell (Fallback)!** ✅
