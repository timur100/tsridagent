# 🚀 TSRID USB Device Manager - START HIER!

## 📍 Sie sind hier: `/app/electron-app/`

Diese Electron Desktop-App ermöglicht **USB-Zugriff** (Drucker, Scanner, HID-Geräte) aus dem TSRID Admin Portal.

---

## ⚡ Schnellstart (in 2 Minuten)

### Windows:
```cmd
SCHNELLSTART.bat
```
Doppelklick auf `SCHNELLSTART.bat` → Option 1 wählen → Fertig!

### Mac / Linux:
```bash
./schnellstart.sh
```
Im Terminal: `./schnellstart.sh` → Option 1 wählen → Fertig!

---

## 📚 Vollständige Anleitungen

### 1️⃣ **Download & Installation**
→ Lesen Sie: **`USB_DEVICE_MANAGER_ANLEITUNG.md`**

- Wie Sie die App auf Ihren PC herunterladen
- Wie Sie sie ohne Build starten
- Wie Sie USB-Geräte testen
- Troubleshooting

### 2️⃣ **Executable bauen (.exe / .dmg / .AppImage)**
→ Lesen Sie: **`BUILD_ANLEITUNG.md`**

- Wie Sie eine fertige .exe erstellen
- Wie Sie die App anpassen (Icon, Name)
- Multi-Platform Builds
- CI/CD Integration

### 3️⃣ **API-Dokumentation (für Entwickler)**
→ Lesen Sie: **`INTEGRATION_GUIDE.md`**

- Alle verfügbaren USB-APIs
- Code-Beispiele
- Preload-Script Details

---

## 🎯 Was kann die App?

✅ **USB-Geräte erkennen** - Alle angeschlossenen USB-Geräte auflisten
✅ **Serial Ports / Drucker** - COM-Ports für Drucker anzeigen
✅ **HID-Geräte** - Human Interface Devices (Scanner, etc.)
✅ **Druckerverbindung testen** - Prüfen, ob Drucker online ist
✅ **ZPL-Label drucken** - Zebra-Etikettendrucker unterstützt
✅ **Raw-Text drucken** - Einfache Text-Ausgabe an Drucker

---

## 🛠️ Verfügbare Skripte

### Entwicklung:
```bash
yarn start              # App starten (Dev-Modus)
yarn install            # Dependencies installieren
```

### Build:
```bash
yarn build:win          # Windows .exe
yarn build:mac          # macOS .dmg
yarn build:linux        # Linux .AppImage + .deb
yarn build              # Alle Plattformen
```

---

## 📁 Wichtige Dateien

```
electron-app/
├── 📄 START_HIER.md                         ← Diese Datei
├── 📘 USB_DEVICE_MANAGER_ANLEITUNG.md       ← Download & Installation
├── 📗 BUILD_ANLEITUNG.md                    ← .exe erstellen
├── 📙 INTEGRATION_GUIDE.md                  ← API-Doku für Entwickler
│
├── ⚡ SCHNELLSTART.bat                       ← Windows Quick-Start
├── ⚡ schnellstart.sh                        ← Mac/Linux Quick-Start
│
├── 🔧 main.js                               ← Hauptprozess + USB-Handler
├── 🔒 preload.js                            ← Sichere API-Bridge
├── 📦 package.json                          ← Dependencies & Config
│
└── 🎨 assets/
    └── icon.png                             ← App-Icon
```

---

## 🎮 Nutzung nach Start

1. **App startet automatisch** und lädt das Web-Portal

2. **Login:**
   - Email: `admin@tsrid.com`
   - Passwort: `admin123`

3. **Navigation:**
   - Klicken Sie auf **"R&D"** Tab (oben rechts)
   - Sidebar: **"Test Center"** → **"USB Device Manager"** (🔌)

4. **USB-Geräte anzeigen:**
   - USB-Gerät anschließen
   - Button **"Aktualisieren"** klicken
   - Geräte werden aufgelistet

5. **Drucker testen:**
   - Drucker aus Dropdown wählen
   - **"Verbindung testen"** klicken
   - Optional: **"Test-Label drucken"** für Zebra-Drucker

---

## ❓ Häufige Fragen

### "Kann ich die App ohne Node.js nutzen?"
**Ja!** Bauen Sie eine .exe (siehe `BUILD_ANLEITUNG.md`), dann benötigt der Ziel-PC kein Node.js.

### "Funktioniert das auch im Browser?"
**Nein.** USB-Zugriff ist aus Sicherheitsgründen nur in der Desktop-App möglich. Im Browser sehen Sie eine Info-Meldung.

### "Welche Drucker werden unterstützt?"
- **ZPL-Drucker:** Zebra-Etikettendrucker (ZPL-Befehle)
- **ESC/POS-Drucker:** Bondrucker (Raw-Text)
- **Serial-Drucker:** Alle Drucker mit COM-Port

### "Kann ich die App an Kollegen weitergeben?"
**Ja!** Bauen Sie eine .exe (Windows) / .dmg (Mac) / .AppImage (Linux) und geben Sie diese weiter. Keine Installation nötig für portable Versionen.

---

## 🔧 Voraussetzungen

### Zum Starten (ohne Build):
- Node.js 18+ (https://nodejs.org/)
- Yarn oder npm
- Internet-Verbindung

### Zum Bauen:
- Zusätzlich: electron-builder (wird automatisch installiert)

### Zum Nutzen (nach Build):
- **Nichts!** Die .exe / .dmg / .AppImage läuft standalone

---

## 📞 Support & Hilfe

### Bei Problemen:

1. **Schnellstart-Script nicht funktioniert?**
   → Siehe `USB_DEVICE_MANAGER_ANLEITUNG.md` für manuelle Schritte

2. **Build schlägt fehl?**
   → Siehe `BUILD_ANLEITUNG.md` → Troubleshooting

3. **USB-Gerät nicht erkannt?**
   → "Aktualisieren"-Button klicken
   → Treiber installiert?
   → App als Administrator starten (Windows)

4. **Fehler in der App?**
   → F12 drücken → Console-Tab → Fehler kopieren

---

## 🎯 Next Steps

### Einsteiger:
1. ✅ `SCHNELLSTART.bat` oder `schnellstart.sh` ausführen
2. ✅ App testen mit USB-Gerät
3. ✅ Bei Erfolg: .exe bauen (siehe `BUILD_ANLEITUNG.md`)

### Fortgeschritten:
1. ✅ `INTEGRATION_GUIDE.md` lesen
2. ✅ Eigene USB-Features entwickeln
3. ✅ Backend-URL anpassen (`main.js` Zeile 8)
4. ✅ App-Icon ersetzen (`assets/`)

### Profis:
1. ✅ Code Signing einrichten (macOS)
2. ✅ Auto-Update implementieren
3. ✅ CI/CD Pipeline aufsetzen (GitHub Actions)
4. ✅ Multi-Platform Builds automatisieren

---

## 🌟 Features erweitern

Die App ist modular aufgebaut. Sie können einfach neue USB-Features hinzufügen:

**1. Handler in `main.js` erstellen:**
```javascript
ipcMain.handle('usb:myCustomFunction', async () => {
  // Ihr Code hier
  return result;
});
```

**2. API in `preload.js` exponieren:**
```javascript
contextBridge.exposeInMainWorld('usbAPI', {
  myCustomFunction: () => ipcRenderer.invoke('usb:myCustomFunction')
});
```

**3. Im Frontend nutzen:**
```javascript
const result = await window.usbAPI.myCustomFunction();
```

Siehe `INTEGRATION_GUIDE.md` für Details.

---

## ✅ Checkliste

- [ ] Node.js installiert (`node --version`)
- [ ] Yarn installiert (`yarn --version`)
- [ ] `SCHNELLSTART.bat` / `schnellstart.sh` ausgeführt
- [ ] App gestartet und getestet
- [ ] USB-Gerät erkannt
- [ ] Bei Erfolg: .exe gebaut (optional)

---

## 🎉 Viel Erfolg!

Die USB Device Manager Desktop-App ist **vollständig einsatzbereit**.

**Starten Sie jetzt:**
- Windows: `SCHNELLSTART.bat`
- Mac/Linux: `./schnellstart.sh`

Bei Fragen → Siehe die umfassenden Anleitungen in diesem Ordner! 📚

**Happy Coding!** 🚀🔌
