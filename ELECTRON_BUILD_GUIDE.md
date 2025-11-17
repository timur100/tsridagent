# 🔨 Electron App - Build & Ausführungs-Anleitung

## 📍 Dateien-Location

```
/app/electron-app/
```

Alle Electron-Dateien befinden sich in diesem Verzeichnis.

---

## 🎯 Methode 1: Lokal testen (Development Mode)

**Wann verwenden:** Nur zum schnellen Testen auf dem aktuellen System (Linux/Mac)  
**Nicht für:** Windows-Produktion

### Schritt 1: In das Verzeichnis wechseln

```bash
cd /app/electron-app
```

### Schritt 2: Dependencies prüfen (bereits installiert)

```bash
# Prüfen ob node_modules existiert
ls node_modules/

# Falls nicht installiert:
yarn install
```

### Schritt 3: Electron App starten

```bash
npm start
# oder
yarn start
```

**Was passiert:**
- Electron öffnet sich als Desktop-Fenster
- DevTools sind automatisch aktiviert (F12)
- Hot-Reload funktioniert NICHT (manuelle Neustart nötig)

**Hinweis:** Diese Methode funktioniert NICHT auf Windows, da die ReaderDemo.exe Integration Windows-spezifisch ist.

---

## 🏗️ Methode 2: Windows .exe bauen (Production)

**Wann verwenden:** Für Testing auf Windows-PC mit Regula Scanner  
**Output:** Portable .exe Datei

### Schritt 1: Frontend bauen (React-App)

**WICHTIG:** Das Frontend muss zuerst gebaut werden!

```bash
# Im Root-Verzeichnis
cd /app

# Build-Script ausführen
./electron-app/build.sh
```

**Was macht build.sh:**
1. Baut die React-Frontend-App (`yarn build` in `/app/frontend`)
2. Kopiert Build-Output nach `/app/electron-app/renderer/`
3. Passt Pfade für Electron an
4. Bereitet alles für Electron-Packaging vor

**Output:**
```
/app/electron-app/renderer/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── ...
```

### Schritt 2: Electron Dependencies installieren

```bash
cd /app/electron-app
yarn install
```

**Was wird installiert:**
- electron (^28.0.0)
- electron-builder (^24.9.1)
- electron-store (^8.1.0)
- ini (^4.1.1)

### Schritt 3: Windows .exe bauen

**Option A: Portable Version (Empfohlen)**

```bash
cd /app/electron-app
yarn build-portable
```

**Option B: Installer Version**

```bash
cd /app/electron-app
yarn build
```

**Option C: Beide Versionen**

```bash
cd /app/electron-app
yarn dist
```

### Schritt 4: Gebaute .exe finden

Nach erfolgreichem Build:

```bash
cd /app/electron-app/dist
ls -lh
```

**Dateien:**
- `DocumentVerificationScanner-Portable.exe` (Portable Version, ~150-200 MB)
- `Document Verification Scanner Setup.exe` (Installer Version)

---

## 📦 Komplettes Build-Script (Alles in einem)

Kopieren Sie dieses Script und führen Sie es aus:

```bash
#!/bin/bash
# build-electron-complete.sh

echo "🔨 Starting Electron App Build Process..."
echo ""

# Schritt 1: Frontend bauen
echo "📦 Step 1/4: Building React Frontend..."
cd /app/frontend
yarn build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

# Schritt 2: Frontend nach Electron kopieren
echo "📋 Step 2/4: Copying Frontend to Electron..."
rm -rf /app/electron-app/renderer/*
cp -r /app/frontend/build/* /app/electron-app/renderer/

# Schritt 3: Electron Dependencies installieren
echo "📥 Step 3/4: Installing Electron Dependencies..."
cd /app/electron-app
yarn install

# Schritt 4: Windows .exe bauen
echo "🏗️ Step 4/4: Building Windows .exe..."
yarn build-portable

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "📂 Output location:"
    echo "/app/electron-app/dist/DocumentVerificationScanner-Portable.exe"
    echo ""
    echo "📊 File size:"
    ls -lh /app/electron-app/dist/*.exe
    echo ""
    echo "🎯 Next steps:"
    echo "1. Copy .exe to Windows PC"
    echo "2. Run on Windows with Regula SDK installed"
    echo "3. Test PIN feature (Default: 1234)"
else
    echo "❌ BUILD FAILED!"
    exit 1
fi
```

**Script ausführen:**

```bash
# Script erstellen
nano /app/build-electron-complete.sh

# Inhalt einfügen (oben)
# Speichern: Ctrl+O, Enter, Ctrl+X

# Ausführbar machen
chmod +x /app/build-electron-complete.sh

# Ausführen
/app/build-electron-complete.sh
```

---

## 🪟 Auf Windows ausführen

### Voraussetzungen auf Windows-PC:

1. **Regula Document Reader SDK installiert**
   - Installation: `C:\Program Files\Regula\Document Reader SDK`
   - ReaderDemo.exe muss vorhanden sein

2. **Keine weiteren Dependencies nötig**
   - Node.js NICHT erforderlich (ist in .exe eingebaut)
   - Electron NICHT erforderlich (ist in .exe eingebaut)

### Ausführung:

1. **Portable .exe auf Windows-PC kopieren**
   ```
   Von: /app/electron-app/dist/DocumentVerificationScanner-Portable.exe
   Nach: Irgendwo auf Windows-PC (z.B. Desktop)
   ```

2. **Doppelklick auf .exe**
   
3. **Windows Defender Warnung (möglicherweise):**
   ```
   "Windows hat Ihren PC geschützt"
   → Klick auf "Weitere Informationen"
   → Klick auf "Trotzdem ausführen"
   ```

4. **App startet**
   - VerificationInterface erscheint
   - "Mehr Details" Button ist sichtbar (unten links)

5. **DevTools öffnen (für Debugging):**
   - F12 drücken
   - Console zeigt Logs

---

## 🔧 Build-Optionen anpassen

### Backend-URL ändern

**In `/app/electron-app/main.js`:**

```javascript
// Zeile ~12
const BACKEND_URL = process.env.BACKEND_URL || 'https://job-portal-harmony.emergentagent.com';

// Ändern zu:
const BACKEND_URL = 'https://ihre-backend-url.com';
```

**Dann neu bauen:**
```bash
cd /app/electron-app
yarn build-portable
```

### ReaderDemo.exe Pfad ändern

**In `/app/electron-app/main.js`:**

```javascript
// Zeile ~29
const READER_DEMO_PATH = 'C:\\Program Files\\Regula\\Document Reader SDK\\READERDEMO.exe';

// Ändern zu:
const READER_DEMO_PATH = 'C:\\Ihr\\Pfad\\READERDEMO.exe';
```

### RegulaReader.ini Pfad ändern

**In `/app/electron-app/main.js`:**

```javascript
// Zeile ~23-27
const REGULA_INI_PATH = path.join(
  process.env.LOCALAPPDATA || process.env.APPDATA,
  'Regula',
  'Document Reader SDK (x64)',
  'RegulaReader.ini'
);

// Ändern zu Ihrem Pfad
```

---

## 🐛 Troubleshooting

### Problem: "yarn: command not found"

**Lösung:**
```bash
npm install -g yarn
```

### Problem: "electron-builder: command not found"

**Lösung:**
```bash
cd /app/electron-app
yarn install
```

### Problem: Build schlägt fehl mit "Cannot find module"

**Lösung:**
```bash
cd /app/electron-app
rm -rf node_modules
yarn install
yarn build-portable
```

### Problem: Frontend ist nicht aktuell in der .exe

**Lösung:**
```bash
# Frontend neu bauen
cd /app/frontend
yarn build

# Nach Electron kopieren
rm -rf /app/electron-app/renderer/*
cp -r /app/frontend/build/* /app/electron-app/renderer/

# Electron neu bauen
cd /app/electron-app
yarn build-portable
```

### Problem: .exe startet nicht auf Windows

**Mögliche Ursachen:**
1. Windows Defender blockiert → "Trotzdem ausführen"
2. Visual C++ Redistributable fehlt → [Download](https://aka.ms/vs/17/release/vc_redist.x64.exe)
3. .NET Framework fehlt → Windows Update ausführen

### Problem: ReaderDemo.exe startet nicht

**Lösung:**
1. Prüfen ob installiert: `C:\Program Files\Regula\Document Reader SDK\READERDEMO.exe`
2. Als Administrator ausführen
3. Pfad in `main.js` prüfen

---

## 📊 Build-Zeiten & Dateigrößen

| Operation | Zeit | Output-Größe |
|-----------|------|--------------|
| Frontend Build | ~30-60s | ~5 MB |
| Electron Dependencies | ~60-120s | ~200 MB |
| Windows .exe Build | ~60-90s | ~150 MB |
| **Gesamt** | **~3-5 Min** | **~150 MB** |

---

## 📝 Build-Log prüfen

Bei Fehlern im Build-Prozess:

```bash
# Letzten Build-Log anzeigen
cd /app/electron-app
cat yarn-error.log

# Oder für electron-builder:
cat dist/builder-debug.yml
```

---

## 🎯 Quick Commands Cheat-Sheet

```bash
# Alles in einem (empfohlen)
cd /app && ./electron-app/build.sh && cd electron-app && yarn build-portable

# Nur Frontend bauen
cd /app/frontend && yarn build

# Nur Electron bauen
cd /app/electron-app && yarn build-portable

# Lokal testen (Development)
cd /app/electron-app && npm start

# Dependencies neu installieren
cd /app/electron-app && rm -rf node_modules && yarn install

# Build-Output löschen
rm -rf /app/electron-app/dist/*
```

---

## 🔮 Erweiterte Build-Optionen

### Auto-Update konfigurieren

In `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

### Mehrere Plattformen bauen

```bash
# Windows + Mac + Linux
yarn dist --win --mac --linux

# Nur Windows 32-bit + 64-bit
yarn dist --win --ia32 --x64
```

### Code Signing (Optional)

Für Produktion empfohlen (verhindert Windows Defender Warnung):

```bash
# In package.json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "password"
    }
  }
}
```

---

## 📚 Weitere Ressourcen

- [Electron Builder Docs](https://www.electron.build/)
- [Electron Docs](https://www.electronjs.org/docs)
- [Node.js Docs](https://nodejs.org/docs)

---

## ✅ Erfolgs-Checkliste

Nach erfolgreichem Build:

```
□ Frontend wurde gebaut (yarn build)
□ Frontend ist in /app/electron-app/renderer/ kopiert
□ Electron Dependencies installiert (node_modules vorhanden)
□ Windows .exe wurde erstellt
□ .exe ist in /app/electron-app/dist/ vorhanden
□ Dateigröße ~150 MB (plausibel)
□ .exe auf Windows-PC kopiert
□ App startet auf Windows
□ "Mehr Details" Button ist sichtbar
□ DevTools öffnen mit F12 funktioniert
```

---

**Version:** 1.0  
**Letztes Update:** 04. Januar 2025  
**Für:** Electron App Build & Deployment
