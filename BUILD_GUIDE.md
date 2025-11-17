# 🏗️ Build-Anleitung: Parallel-Entwicklung

Diese Anleitung erklärt, wie Sie bei **Emergent weiterentwickeln** UND gleichzeitig **Electron-Apps erstellen** können, ohne die Hauptapp zu zerstören.

---

## 🎯 Zwei Modi:

### **1. Emergent-Entwicklung** (Standard)
- Bei Emergent.sh entwickeln
- Hot-Reload aktiv
- Alle Features verfügbar
- **Browser-basiert**

### **2. Electron-App** (Download)
- Lokale Windows-App
- Regula Scanner Integration
- Standalone-Betrieb
- **Desktop-App**

---

## 📂 Projekt-Struktur:

```
/app/
├── frontend/              ← Emergent-Entwicklung (UNVERÄNDERT)
├── backend/               ← Emergent-Entwicklung (UNVERÄNDERT)
├── electron-app/          ← Electron-Build (SEPARAT)
└── BUILD_GUIDE.md         ← Diese Datei
```

**Wichtig:** `/app/frontend/` und `/app/backend/` bleiben IMMER unberührt!

---

## 🚀 Workflow: Entwicklung → Electron-Build

### **Schritt 1: Bei Emergent entwickeln** (normal)

Arbeiten Sie wie gewohnt bei Emergent.sh:
- Code ändern in `/app/frontend/src/`
- Features hinzufügen
- Testen im Browser
- **Nichts Spezielles nötig!**

### **Schritt 2: Electron-App erstellen** (nur wenn nötig)

Wenn Sie eine neue Electron-App zum Download erstellen möchten:

```bash
cd /app/electron-app
bash build.sh
```

**Was passiert:**
1. Baut React-App neu (`/app/frontend/build/`)
2. Kopiert Build nach `/app/electron-app/renderer/`
3. Passt Pfade für Electron an
4. Fertig!

**Wichtig:** `/app/frontend/` bleibt unverändert!

### **Schritt 3: Windows-Executable erstellen**

```bash
cd /app/electron-app
yarn build-portable  # Portable .exe
yarn build          # Installer
```

### **Schritt 4: Download-Paket erstellen**

```bash
cd /app
./create-electron-package.sh
```

Erstellt: `electron-scanner-package-vX.zip`

Dieses ZIP enthält:
- `renderer/` - Fertig gebaute React-App
- `main.js` - Electron-Hauptprozess
- `package.json` - Dependencies
- Build-Scripts

---

## 🔄 Update-Workflow:

### **Szenario 1: Feature bei Emergent hinzugefügt**

```bash
# 1. Feature entwickeln bei Emergent (normal)
# 2. Testen im Browser
# 3. Neue Electron-App erstellen:
cd /app/electron-app
bash build.sh
# 4. Paket erstellen:
cd /app
./create-electron-package.sh
# 5. Hochladen nach /app/frontend/public/
cp electron-scanner-package-vX.zip /app/frontend/public/
```

### **Szenario 2: Nur Electron-spezifische Änderung**

```bash
# Nur main.js oder preload.js ändern
cd /app/electron-app
# Datei bearbeiten
# Paket neu erstellen
./create-electron-package.sh
```

---

## 🛡️ Schutz der Hauptapp:

### **Was wird NIEMALS verändert:**
- ✅ `/app/frontend/src/` - Quellcode
- ✅ `/app/backend/` - Backend-Code
- ✅ Emergent-Konfiguration
- ✅ `.env` Dateien

### **Was wird erstellt/überschrieben:**
- ⚠️ `/app/frontend/build/` - Temporär (wird immer neu gebaut)
- ⚠️ `/app/electron-app/renderer/` - Kopie des Builds
- ⚠️ `/app/electron-app/dist/` - Windows-Executables

**Regel:** Niemals in `/app/electron-app/renderer/` entwickeln! Immer in `/app/frontend/src/`!

---

## 🧪 Testing:

### **Test 1: Emergent-Entwicklung**
```
Emergent.sh → Änderungen machen → Browser-Vorschau
```
**Funktioniert wie immer!**

### **Test 2: Electron-App lokal testen**
```bash
cd /app/electron-app
yarn start  # Startet Electron im Dev-Mode
```

### **Test 3: Produktions-Build testen**
```bash
cd /app/electron-app
yarn build-portable
cd dist
./DocumentVerificationScanner-Portable.exe
```

---

## 📦 Versionierung:

### **Electron-Paket-Versionen:**

Erstellen Sie für jedes Update eine neue Version:

```bash
# v1: Initial
electron-scanner-package-v1.zip

# v2: Fixes
electron-scanner-package-v2.zip

# v3: Regula Integration
electron-scanner-package-v3.zip

# v4: Neue Features
electron-scanner-package-v4.zip
```

**Im Frontend hochladen:**
```bash
cp electron-scanner-package-v4.zip /app/frontend/public/
```

**Download-Link:**
```
https://job-portal-harmony.emergentagent.com/electron-scanner-package-v4.zip
```

---

## 🔧 Konfiguration:

### **Electron-spezifische Anpassungen:**

**Backend-URL ändern** (main.js):
```javascript
const BACKEND_URL = 'https://job-portal-harmony.emergentagent.com';
```

**Scanner-URLs** (main.js):
```javascript
const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api'
];
```

---

## 🚨 Häufige Fehler vermeiden:

### ❌ **NICHT tun:**
- Direkt in `/app/electron-app/renderer/` entwickeln
- `/app/frontend/build/` committen
- Electron-Code in `/app/frontend/src/` mischen (außer Feature-Detection)

### ✅ **Stattdessen:**
- Immer in `/app/frontend/src/` entwickeln
- Build-Script verwenden
- Feature-Detection für Electron: `window.electronAPI.isElectron`

---

## 💡 Best Practices:

### **1. Feature-Detection:**

Im Code prüfen, ob Electron oder Browser:

```javascript
if (window.electronAPI && window.electronAPI.isElectron) {
  // Electron-spezifischer Code
  const result = await window.electronAPI.checkScannerStatus();
} else {
  // Browser-Code
  const result = await fetch('/api/scanner/status');
}
```

### **2. Testing-Reihenfolge:**

1. ✅ Emergent-Browser testen
2. ✅ Electron-Dev-Mode testen (`yarn start`)
3. ✅ Produktions-Build testen (`.exe`)

### **3. Deployment:**

- **Emergent:** Normale Deployment-Funktionen
- **Electron:** ZIP-Download via `/app/frontend/public/`

---

## 📝 Checkliste: Neues Release

- [ ] Features bei Emergent entwickelt & getestet
- [ ] `cd /app/electron-app && bash build.sh`
- [ ] Lokal testen: `yarn start`
- [ ] Build erstellen: `yarn build-portable`
- [ ] Paket erstellen: `./create-electron-package.sh`
- [ ] Versionsnummer erhöhen (v3 → v4)
- [ ] Nach `/app/frontend/public/` kopieren
- [ ] README aktualisieren
- [ ] Changelog dokumentieren

---

## 🎉 Zusammenfassung:

**Entwickeln Sie normal bei Emergent.sh!**

Wenn Sie eine Electron-App brauchen:
```bash
cd /app/electron-app && bash build.sh
```

**Das war's!** Ihre Hauptapp bleibt unberührt. ✅
