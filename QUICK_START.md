# ⚡ Quick Start Guide

## 🎯 Zwei Nutzungsarten:

---

## 1️⃣ **Bei Emergent entwickeln** (Standard)

### Einfach normal weiterarbeiten:
- Code ändern bei Emergent.sh
- Features hinzufügen
- Im Browser testen
- **Nichts Spezielles nötig!**

### Banned Documents Check deaktivieren (für Testing):

1. **App öffnen** bei Emergent
2. **Admin-Panel** (⚙️ Zahnrad-Icon oben rechts)
3. **Settings** → **Gesperrte Dokumente & Auto-Ban**
4. **Toggle "🧪 Gesperrte Dokumente Prüfung" AUS**
5. **Speichern**

✅ Jetzt werden gesperrte Dokumente NICHT mehr blockiert!

---

## 2️⃣ **Electron-App erstellen** (für Download)

### Wenn Sie eine neue Windows-App brauchen:

```bash
# 1. Electron-Build erstellen
cd /app/electron-app
bash build.sh

# 2. Download-Paket erstellen
cd /app
bash create-electron-package.sh
# Versionsnummer eingeben (z.B. "5")

# 3. Fertig!
# Datei: electron-scanner-package-v5.zip
# Location: /app/frontend/public/
```

### Download-Link teilen:
```
https://job-portal-harmony.emergentagent.com/electron-scanner-package-v5.zip
```

---

## 🧪 Testing Features:

### **Feature: Banned Documents Check deaktivieren**

**Wo finde ich das?**
```
Admin-Panel → Settings → Gesperrte Dokumente & Auto-Ban
→ 🧪 Gesperrte Dokumente Prüfung [AN/AUS]
```

**Wofür?**
- **AN:** Produktionsmodus - Gesperrte Dokumente werden blockiert
- **AUS:** Test-Modus - Alle Dokumente werden durchgelassen

**Console-Output:**
- AN: `🚨 Banned check result: ...`
- AUS: `ℹ️ Banned document check is DISABLED - skipping check`

---

## 📁 Wichtige Dateien:

```
/app/
├── BUILD_GUIDE.md                ← Vollständige Build-Anleitung
├── QUICK_START.md               ← Diese Datei
├── create-electron-package.sh   ← Paket-Ersteller
│
├── frontend/                     ← Emergent-Entwicklung (HIER entwickeln!)
│   └── src/
│       └── components/
│
├── electron-app/                 ← Electron-Build (Auto-generiert)
│   ├── build.sh
│   ├── main.js
│   └── renderer/                 ← NICHT hier entwickeln!
│
└── frontend/public/              ← Download-Pakete hier
    └── electron-scanner-package-vX.zip
```

---

## ✅ Checkliste: Neues Feature deployen

### **Emergent (Browser):**
- [ ] Feature entwickeln
- [ ] Testen im Browser
- [ ] Fertig! ✅

### **Electron-App:**
- [ ] Feature entwickeln (wie oben)
- [ ] `cd /app/electron-app && bash build.sh`
- [ ] `cd /app && bash create-electron-package.sh`
- [ ] Version erhöhen (z.B. v4 → v5)
- [ ] Download-Link teilen

---

## 🚨 Troubleshooting:

### **Problem: Banned Check greift immer**
**Lösung:** Admin-Panel → Settings → Toggle ausschalten

### **Problem: Electron-App zeigt alte Version**
**Lösung:** 
```bash
cd C:\scanner
rmdir /s /q node_modules renderer
npm install
build-on-windows-npm.bat
```

### **Problem: Build schlägt fehl**
**Lösung:**
```bash
cd /app/frontend
yarn build  # Manuell bauen
cd /app/electron-app
bash build.sh
```

---

## 💡 Best Practices:

1. **Entwickeln:** Immer in `/app/frontend/src/`
2. **Testen:** Erst Browser, dann Electron
3. **Builden:** Nur wenn Electron-App nötig
4. **Versionieren:** Jedes Release neue Version (v4, v5, ...)

---

## 🎉 Das war's!

**Normal entwickeln bei Emergent = Electron-App bleibt unberührt ✅**

Wenn Electron-App nötig:
```bash
bash /app/create-electron-package.sh
```

**Fertig!** 🚀
