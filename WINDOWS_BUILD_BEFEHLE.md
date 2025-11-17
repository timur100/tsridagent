# ✅ Korrekte Build-Befehle für Windows

## 🔧 Verfügbare Scripts in package.json:

```json
"scripts": {
  "start": "electron .",              // App im Dev-Modus starten
  "build": "electron-builder --win --x64",  // Installer bauen
  "build-portable": "electron-builder --win portable",  // Portable Version
  "dist": "electron-builder"          // Allgemeiner Build
}
```

---

## 📦 RICHTIGE Build-Befehle:

### Option 1: Installer bauen (NSIS Setup.exe)
```cmd
npm run build
```
**Erstellt:**
- Setup-Datei mit Installer
- Pfad: `dist\Document Verification Scanner Setup 1.0.0.exe`

### Option 2: Portable Version (ohne Installation)
```cmd
npm run build-portable
```
**Erstellt:**
- Standalone EXE-Datei
- Pfad: `dist\DocumentVerificationScanner-Portable.exe`
- Kann direkt ausgeführt werden ohne Installation!

### Option 3: Test im Dev-Modus (ohne Build)
```cmd
npm start
```
**Für schnelle Tests - startet die App direkt**

---

## 🚀 Empfohlene Schritte:

### Schritt 1: Dependencies installieren
```cmd
cd C:\electron123\electron-app
npm install
```

### Schritt 2: Portable Version bauen (empfohlen für Tests)
```cmd
npm run build-portable
```

### Schritt 3: App testen
```cmd
cd dist
DocumentVerificationScanner-Portable.exe
```

**ODER**

### Installer bauen:
```cmd
npm run build
```
Dann installiere: `dist\Document Verification Scanner Setup 1.0.0.exe`

---

## 📁 Build-Ausgabe:

Nach erfolgreichem Build findest du die Dateien hier:

```
C:\electron123\electron-app\dist\
│
├── Document Verification Scanner Setup 1.0.0.exe   ← Installer (Option 1)
├── DocumentVerificationScanner-Portable.exe        ← Portable (Option 2)
└── win-unpacked\                                   ← Unpacked Files
    └── Document Verification Scanner.exe
```

---

## ⚠️ Häufige Fehler & Lösungen:

### Fehler: "electron-builder not found"
```cmd
npm install --save-dev electron-builder
```

### Fehler: "Cannot find module 'electron'"
```cmd
npm install --save-dev electron
```

### Fehler: Build schlägt fehl wegen icon.ico
Erstelle einen Platzhalter:
```cmd
mkdir assets
echo. > assets\icon.ico
```

### Fehler: "EPERM: operation not permitted"
```cmd
npm cache clean --force
npm install
```

---

## ✅ Schnellster Weg zum Testen:

```cmd
# 1. Dependencies installieren
npm install

# 2. Portable Version bauen (am schnellsten)
npm run build-portable

# 3. Direkt ausführen
dist\DocumentVerificationScanner-Portable.exe
```

**Die Portable-Version ist ideal zum Testen!**

---

## 🔍 Was passiert beim Build?

1. **electron-builder** packt alle Dateien zusammen:
   - `main.js` (dein geänderter Code mit Process API!)
   - `preload.js`
   - `renderer/*` (Frontend)
   - `assets/*` (Icons, etc.)

2. **Erstellt ausführbare Datei** für Windows x64

3. **Speichert in `dist/` Ordner**

---

## 📝 Vollständige Kommando-Sequenz:

```cmd
cd C:\electron123\electron-app
npm install
npm run build-portable
cd dist
DocumentVerificationScanner-Portable.exe
```

**Das war's! Die App sollte starten und der Scanner-Fix ist aktiv! 🎉**

---

## 🎯 Nach dem Start testen:

1. ✅ App öffnet sich
2. ✅ "Scanner" Button ist aktiv (nicht grau)
3. ✅ Klick auf Scanner
4. ✅ Dokument auflegen
5. ✅ **Sollte jetzt funktionieren mit Process API!**

Bei Problemen:
- F12 drücken für DevTools
- Console-Tab öffnen
- Nach "[ELECTRON] Using standard Regula SDK Process API" suchen

---

**Viel Erfolg! 🚀**
