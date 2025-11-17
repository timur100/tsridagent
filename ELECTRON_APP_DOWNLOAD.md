# 🎉 Electron Scanner App - Fertig zum Download!

## 📥 Download-Link

**Direkter Download (1.1 MB):**
```
https://job-portal-harmony.emergentagent.com/electron-scanner-package.zip
```

## 🚀 Schnellstart (5 Minuten)

### Schritt 1: Download & Entpacken
1. Download: https://job-portal-harmony.emergentagent.com/electron-scanner-package.zip
2. ZIP entpacken auf Windows (z.B. nach `C:\Scanner-App\`)

### Schritt 2: Node.js installieren (falls noch nicht vorhanden)
- Download: https://nodejs.org/ (LTS Version)
- Installieren & PC neu starten

### Schritt 3: App bauen
```cmd
cd C:\Scanner-App
build-on-windows.bat
```

Das Skript:
- Installiert alle Dependencies (~5 Min)
- Baut Windows .exe (~2 Min)
- Fertig!

### Schritt 4: App starten
```cmd
cd dist
DocumentVerificationScanner-Portable.exe
```

## ✅ Was die App kann

- ✅ **Regula Scanner Integration** (localhost)
- ✅ **Automatischer Scan** mit LED-Feedback
- ✅ **VerificationInterface** komplett integriert
- ✅ **Cloud-Backend** Verbindung
- ✅ **Offline-fähig** (Scanner funktioniert ohne Internet)

## 📋 Voraussetzungen

**Auf Ihrer Windows-Maschine:**
1. ✅ Node.js (v18+)
2. ✅ Regula SDK Service läuft auf:
   - `https://localhost/Regula.SDK.Api` oder
   - `https://localhost:88/Regula.SDK.Api`

## 🎯 Scanner-Status überprüfen

**Scanner online?**
- Öffnen Sie Browser: https://localhost/Regula.SDK.Api.Documentation/index
- Wenn die Seite lädt → Scanner läuft ✅
- Wenn Fehler → Service starten

**In der App:**
- Grüner Punkt am Scanner-Button = Online ✅
- Grauer Button = Offline ❌

## 📦 Paket-Inhalt

```
electron-scanner-package.zip (1.1 MB)
├── package.json                    # Electron-Konfiguration
├── main.js                         # Scanner-Kommunikation
├── preload.js                      # API-Bridge
├── build-on-windows.bat           # Build-Script
├── README.md                       # Dokumentation
├── DOWNLOAD-ANLEITUNG.md          # Ausführliche Anleitung
└── renderer/                       # React-App (fertig gebaut)
    ├── index.html
    └── static/
```

## 🔧 Konfiguration

### Backend-URL anpassen (optional)

Bearbeiten Sie `main.js` **vor** dem Build:

```javascript
const BACKEND_URL = 'https://ihre-url.com';
```

**Standard:** `https://job-portal-harmony.emergentagent.com`

### Scanner-Port anpassen (optional)

In `main.js`:

```javascript
const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api'
];
```

## 🧪 Testen ohne Build

Für schnelles Testen ohne .exe zu bauen:

```cmd
cd C:\Scanner-App
npm install
npm start
```

App startet im Entwicklungsmodus mit DevTools.

## 🐛 Häufige Probleme

### "yarn/npm nicht gefunden"
```cmd
# Node.js neu installieren
# Dann PC neu starten
```

### Build schlägt fehl
```cmd
# Lösche node_modules
rmdir /s /q node_modules
del package-lock.json

# Neu installieren
npm install
build-on-windows.bat
```

### Scanner nicht erkannt
1. **Service läuft?**
   - Task-Manager → "Regula" suchen
   
2. **Port korrekt?**
   - Browser: https://localhost/Regula.SDK.Api.Documentation/index
   
3. **SSL-Problem?**
   - App akzeptiert selbst-signierte Zertifikate automatisch

### App startet nicht
- Als Administrator ausführen
- Antivirus temporär deaktivieren
- Windows Defender Ausnahme hinzufügen

## 💡 Tipps

### Entwicklung & Testing
- **Entwicklungsmodus:** `npm start` (schnell, mit DevTools)
- **Build für Produktion:** `build-on-windows.bat`
- **Portable .exe:** Keine Installation, direkt starten
- **Installer:** Für dauerhafte Installation

### Debugging
- **DevTools:** F12 in der App
- **Console:** Zeigt Scanner-Status & Errors
- **Network:** Zeigt API-Calls

## 🔄 Updates

Wenn wir neue Features entwickeln:

1. **Download** neue ZIP
2. **Entpacken** über alte Version
3. **Build** neu ausführen: `build-on-windows.bat`
4. **Fertig!**

## 📊 System-Anforderungen

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4GB+
- **Node.js:** v18+
- **Speicher:** 500MB frei für Build

## 🎬 Nach erfolgreichem Build

```
dist/
├── DocumentVerificationScanner-Portable.exe  ← Starten Sie diese!
├── Document Verification Scanner Setup.exe   ← Oder diese für Installation
└── win-unpacked/                            ← Entpackte Version
```

## 🎯 Workflow

```
1. Download ZIP
2. Entpacken
3. build-on-windows.bat ausführen
4. Portable.exe starten
5. Scanner-Button hat grünen Punkt ✅
6. Dokument scannen!
```

## 📞 Support

**Scanner-Probleme:**
- Logs in App (F12)
- Regula Service Status
- Port-Konfiguration

**Build-Probleme:**
- Node.js Version prüfen
- Internet-Verbindung
- Firewall/Antivirus

## ✨ Features in der App

### Scanner-Funktionen
- ✅ Automatischer Scan bei Dokumenteneinlage
- ✅ LED-Feedback (Grün/Gelb/Rot)
- ✅ UV & IR Bildaufnahme
- ✅ RFID-Chip-Auslesen
- ✅ OCR & Dokumentenerkennung

### VerificationInterface
- ✅ Vollständige Verifikation
- ✅ Führerscheinklassen-Prüfung
- ✅ Dokumenten-Historie
- ✅ Admin-Panel
- ✅ PDF-Anzeige (AVB)

## 🎉 Fertig!

Nach dem Build haben Sie eine vollständige Windows-App mit Scanner-Integration!

Die App kann **sofort getestet** werden, während wir hier parallel weiterentwickeln.

**Viel Erfolg beim Testen! 🚀**
