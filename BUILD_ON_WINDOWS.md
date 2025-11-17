# 🪟 Electron App auf Windows bauen - Anleitung

## ⚠️ Wichtiger Hinweis

Die Electron App kann **nicht direkt auf diesem ARM64 Linux-System** für Windows gebaut werden. 

**Grund:** Windows .exe erfordert Windows-Tools oder Wine, was auf ARM64 Linux komplex ist.

## ✅ Empfohlene Lösung: Auf Windows bauen

### Option 1: Direkt auf Windows-PC bauen (Empfohlen)

Dies ist der **einfachste und zuverlässigste Weg**.

---

## 📦 Schritt-für-Schritt-Anleitung

### Schritt 1: Dateien auf Windows-PC kopieren

**Was kopieren:**
```
/app/electron-app/
```

**Alle Dateien in diesem Verzeichnis:**
- main.js
- preload.js
- package.json
- yarn.lock
- renderer/ (gesamter Ordner)
- assets/ (gesamter Ordner)

**Wie kopieren:**
- Via USB-Stick
- Via Cloud (Google Drive, OneDrive, etc.)
- Via Git (empfohlen)
- Via Netzwerk-Share

### Schritt 2: Node.js auf Windows installieren

1. Download: https://nodejs.org/
2. LTS Version wählen (z.B. 20.x)
3. Installer ausführen
4. **Wichtig:** "Add to PATH" Option aktivieren

**Prüfen:**
```cmd
node --version
npm --version
```

### Schritt 3: Yarn auf Windows installieren

```cmd
npm install -g yarn
```

**Prüfen:**
```cmd
yarn --version
```

### Schritt 4: In electron-app Verzeichnis wechseln

```cmd
cd C:\Pfad\zu\electron-app
```

### Schritt 5: Dependencies installieren

```cmd
yarn install
```

**Dauer:** 1-2 Minuten  
**Output:** node_modules/ Ordner wird erstellt

### Schritt 6: Windows .exe bauen

**Portable Version (empfohlen):**
```cmd
yarn build-portable
```

**Installer Version:**
```cmd
yarn build
```

**Beide:**
```cmd
yarn dist
```

**Dauer:** 1-2 Minuten  
**Output:** `dist\DocumentVerificationScanner-Portable.exe`

### Schritt 7: .exe testen

1. Doppelklick auf `.exe` in `dist/` Ordner
2. App startet
3. "Mehr Details" Button sollte sichtbar sein

---

## 🎯 Schnell-Anleitung (Copy-Paste)

```cmd
REM 1. Node.js & Yarn installieren (falls noch nicht)
node --version
npm install -g yarn

REM 2. In Verzeichnis wechseln
cd C:\Pfad\zu\electron-app

REM 3. Dependencies installieren
yarn install

REM 4. Build
yarn build-portable

REM 5. Testen
cd dist
DocumentVerificationScanner-Portable.exe
```

---

## 🔄 Option 2: GitHub Actions (CI/CD)

Wenn Sie regelmäßig bauen, können Sie GitHub Actions verwenden:

### .github/workflows/build.yml

```yaml
name: Build Electron App

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd electron-app
          yarn install
          
      - name: Build Windows .exe
        run: |
          cd electron-app
          yarn build-portable
          
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: windows-portable
          path: electron-app/dist/*.exe
```

**Vorteile:**
- Automatischer Build bei Git Push
- Windows-Build ohne Windows-PC
- .exe kann heruntergeladen werden

---

## 📤 Option 3: Fertiges Package bereitstellen

### Was Sie auf dem Linux-System tun können:

1. **Frontend bauen** (bereits erledigt) ✅
2. **Alle Dateien packen** für Transfer zu Windows

**Script:**

```bash
#!/bin/bash
# package-for-windows.sh

echo "📦 Packaging Electron App for Windows Build..."

cd /app

# Create temporary directory
mkdir -p /tmp/electron-package

# Copy electron-app files
echo "Copying Electron files..."
cp -r /app/electron-app/* /tmp/electron-package/

# Remove old builds and node_modules (will be rebuilt on Windows)
rm -rf /tmp/electron-package/dist
rm -rf /tmp/electron-package/node_modules

# Create ZIP
echo "Creating ZIP archive..."
cd /tmp
zip -r electron-app-package.zip electron-package/ -q

# Move to app directory
mv electron-app-package.zip /app/
rm -rf /tmp/electron-package

echo ""
echo "✅ Package created: /app/electron-app-package.zip"
echo ""
echo "📤 Next steps:"
echo "1. Download: /app/electron-app-package.zip"
echo "2. Extract on Windows PC"
echo "3. Run: yarn install && yarn build-portable"
echo ""
```

**Ausführen:**

```bash
chmod +x /app/package-for-windows.sh
/app/package-for-windows.sh
```

**Dann auf Windows:**
1. ZIP entpacken
2. `yarn install`
3. `yarn build-portable`

---

## 🔧 Troubleshooting auf Windows

### Problem: "yarn: command not found"

```cmd
npm install -g yarn
```

### Problem: Build schlägt fehl

```cmd
REM Dependencies löschen und neu installieren
rmdir /s /q node_modules
yarn install
yarn build-portable
```

### Problem: "Cannot find module"

```cmd
REM Yarn cache löschen
yarn cache clean
yarn install
```

### Problem: .exe ist zu groß (>300 MB)

**Normal!** Electron-Apps sind groß weil:
- Node.js eingebaut (~80 MB)
- Electron Framework (~50 MB)
- Chromium (~100 MB)
- Ihre App (~20 MB)

**Optimierung möglich:**
- electron-builder compression
- Ressourcen-Optimierung
- Code-Splitting

---

## 📊 Erwartete Ergebnisse

| Datei | Größe | Beschreibung |
|-------|-------|--------------|
| DocumentVerificationScanner-Portable.exe | ~150-200 MB | Portable Version |
| Document Verification Scanner Setup.exe | ~150-200 MB | Installer |

**Build-Zeit auf Windows:**
- Dependencies: ~1-2 Min
- Build: ~1-2 Min
- Gesamt: ~3-5 Min

---

## ✅ Erfolgs-Checkliste (Windows)

Nach Build auf Windows:

```
□ Node.js installiert
□ Yarn installiert
□ electron-app Dateien kopiert
□ yarn install ausgeführt
□ yarn build-portable ausgeführt
□ .exe in dist/ erstellt
□ .exe läuft (Doppelklick)
□ "Mehr Details" Button sichtbar
□ DevTools öffnen mit F12 funktioniert
```

---

## 🎯 Was Sie JETZT auf Linux tun können

Obwohl Sie die .exe nicht hier bauen können, können Sie:

### 1. Frontend vorbereiten (✅ Bereits erledigt)

```bash
cd /app/frontend
yarn build
```

### 2. Frontend nach Electron kopieren (✅ Bereits erledigt)

```bash
rm -rf /app/electron-app/renderer/*
cp -r /app/frontend/build/* /app/electron-app/renderer/
```

### 3. Package für Windows erstellen

```bash
cd /app
tar -czf electron-app-ready-for-windows.tar.gz \
  electron-app/main.js \
  electron-app/preload.js \
  electron-app/package.json \
  electron-app/yarn.lock \
  electron-app/renderer/ \
  electron-app/assets/
```

**Dann:**
- Download: `electron-app-ready-for-windows.tar.gz`
- Auf Windows entpacken
- `yarn install && yarn build-portable` ausführen

---

## 📚 Weitere Ressourcen

- [Electron Builder Docs](https://www.electron.build/)
- [Multi-Platform Build Guide](https://www.electron.build/multi-platform-build)
- [Windows Build Requirements](https://www.electron.build/configuration/win)

---

## 💡 Empfehlung

**Beste Lösung für Sie:**

1. ✅ Frontend ist auf Linux bereits gebaut
2. 📤 Kopieren Sie `/app/electron-app/` zu Windows-PC
3. 🪟 Auf Windows: `yarn install && yarn build-portable`
4. ✅ Testen Sie die .exe

**Warum?**
- Schneller (keine Cross-Compilation)
- Zuverlässiger (native Windows Build)
- Einfacher (keine Wine-Setup)

---

**Version:** 1.0  
**Letztes Update:** 04. Januar 2025  
**Für:** Windows .exe Build auf ARM64 Linux (nicht direkt möglich)
