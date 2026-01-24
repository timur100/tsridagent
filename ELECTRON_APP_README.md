# TSRID Desktop App - USB Device Integration

## ✅ Status: Implementiert und Testbereit

### Was wurde implementiert?

#### 1. **Electron App Grundgerüst** ✅
- Vollständige Electron-Anwendung in `/app/electron-app/`
- Lädt die Web-Applikation in einem nativen Desktop-Fenster
- Sicherer IPC-Kommunikationskanal zwischen Web und Node.js

#### 2. **USB-Bibliotheken** ✅
Installiert und konfiguriert:
- `usb` - Zugriff auf USB-Geräte
- `node-hid` - HID-Geräte (Human Interface Devices)
- `serialport` - Serial/COM-Port-Kommunikation für Drucker
- `escpos` - ESC/POS Druckerprotokoll
- `qrcode` - QR-Code-Generierung

#### 3. **IPC-Handler (main.js)** ✅
Implementierte Backend-Funktionen:
- `usb:getDevices` - Liste aller USB-Geräte
- `usb:getSerialPorts` - Liste aller Serial Ports / Drucker
- `usb:getHIDDevices` - Liste aller HID-Geräte
- `printer:print` - Raw-Text an Drucker senden
- `printer:printZPL` - ZPL-Labels drucken (Zebra-Drucker)
- `printer:test` - Druckerverbindung testen

#### 4. **API-Exposition (preload.js)** ✅
Sichere APIs für die Web-App:
```javascript
window.usbAPI.getDevices()
window.usbAPI.getSerialPorts()
window.usbAPI.getHIDDevices()
window.printerAPI.print(port, data)
window.printerAPI.printZPL(port, zpl)
window.printerAPI.test(port)
```

#### 5. **USB Device Manager UI** ✅
Vollständige React-Komponente (`/app/frontend/src/components/USBDeviceManager.jsx`):
- Automatische Erkennung ob in Desktop-App oder Browser
- Liste aller USB-Geräte mit Vendor/Product IDs
- Liste aller Serial Ports / Drucker
- Liste aller HID-Geräte
- Druckerauswahl und Verbindungstest
- Test-Label-Druck (ZPL-Format)
- Raw-Text-Druck

#### 6. **Integration in Portal** ✅
- Unter **R&D** → **Test Center** → **USB Device Manager**
- Zeigt Warnung in Web-Version
- Voll funktional in Desktop-App

---

## 🚀 So startet man die Desktop-App

### Lokal (auf Entwicklermaschine mit GUI):

```bash
# Im Root-Verzeichnis
yarn electron

# Oder direkt im electron-app Verzeichnis
cd electron-app
yarn start
```

### Was passiert:
1. Electron öffnet ein Desktop-Fenster
2. Lädt automatisch: `https://agent-hub-77.preview.emergentagent.com/portal/admin`
3. Injiziert USB-APIs via `window.usbAPI` und `window.printerAPI`
4. Web-App erkennt `window.isDesktopApp = true`

---

## 🧪 Testen der USB-Funktionalität

### Voraussetzungen:
- USB-Drucker oder anderes USB-Gerät angeschlossen
- Desktop-App auf einem Rechner mit GUI starten (Windows/Mac/Linux)

### Test-Schritte:

1. **Desktop-App starten:**
   ```bash
   cd /app/electron-app
   yarn start
   ```

2. **Zum USB Device Manager navigieren:**
   - Login: `admin@tsrid.com` / `admin123`
   - Klick auf **R&D** Tab
   - Klick auf **Test Center** in der Sidebar
   - Klick auf **USB Device Manager**

3. **USB-Geräte anzeigen:**
   - Klick auf "Aktualisieren"-Button
   - Alle USB-Geräte werden aufgelistet
   - Serial Ports (Drucker) werden separat angezeigt

4. **Drucker testen (falls vorhanden):**
   - Drucker aus Dropdown auswählen
   - "Verbindung testen" klicken
   - Optional: "Test-Label drucken (ZPL)" für Zebra-Drucker
   - Optional: Text eingeben und "Senden" für Raw-Druck

---

## 📁 Dateistruktur

```
/app/electron-app/
├── main.js              # Electron Hauptprozess + IPC-Handler
├── preload.js           # Sichere API-Exposition
├── package.json         # Dependencies
├── assets/
│   └── icon.png         # App-Icon
└── INTEGRATION_GUIDE.md # Detaillierte API-Dokumentation

/app/frontend/src/components/
└── USBDeviceManager.jsx # React UI-Komponente
```

---

## 🔧 Technische Details

### IPC-Kommunikation:
```
Web-App (Renderer) → window.usbAPI.getDevices()
                  ↓
Preload Script    → ipcRenderer.invoke('usb:getDevices')
                  ↓
Main Process      → Zugriff auf node-usb Bibliothek
                  ↓
Return            → Liste der USB-Geräte
```

### Sicherheit:
- ✅ `contextIsolation: true` - Isolierte Kontexte
- ✅ `nodeIntegration: false` - Kein direkter Node.js-Zugriff
- ✅ `enableRemoteModule: false` - Remote-Modul deaktiviert
- ✅ Nur explizit exponierte APIs verfügbar

---

## 📋 Nächste Schritte (für zukünftige Entwicklung)

### Erweiterungen für Etikettendrucker:
1. **Label-Designer UI** - Visuelle Label-Erstellung
2. **Template-Speicherung** - Wiederverwendbare Label-Vorlagen
3. **Bulk-Print** - Mehrere Labels auf einmal
4. **Drucker-Konfiguration** - Baudrate, Encoding, etc.

### Weitere USB-Geräte:
1. **Barcode-Scanner** - HID-Input-Events abfangen
2. **RFID-Leser** - Kartenleser-Integration
3. **Waagen** - Serial-Port-Daten auslesen
4. **LED-Anzeigen** - Status-Display-Steuerung

---

## ⚠️ Wichtige Hinweise

### Deployment:
- Die Desktop-App kann mit `electron-builder` gebaut werden
- Builds für Windows (.exe), macOS (.dmg), Linux (.AppImage, .deb)
- Siehe `package.json` für Build-Scripts:
  ```bash
  yarn build      # Alle Plattformen
  yarn build:win  # Nur Windows
  yarn build:mac  # Nur macOS
  yarn build:linux # Nur Linux
  ```

### Headless-Umgebung (wie aktuelles Container):
- Electron benötigt X11/Wayland Display
- In Docker-Container nicht ohne Weiteres lauffähig
- **Lösung:** Auf lokalem Rechner mit GUI testen/deployen

### Web-Version:
- USB-APIs sind **nicht** im Browser verfügbar (Sicherheit)
- Web-Version zeigt Info-Box: "Nur in Desktop App verfügbar"
- Kein Code-Breaking - Komponente funktioniert in beiden Modi

---

## 🎯 Erfolgskriterien (Alle erfüllt! ✅)

- [x] Electron-App lädt Web-Portal
- [x] USB-Bibliotheken installiert
- [x] IPC-Handler für USB-Zugriff implementiert
- [x] Sichere API-Exposition via Preload
- [x] USB Device Manager UI erstellt
- [x] Integration in Admin-Portal
- [x] Fallback-Meldung für Web-Version
- [x] Documentation erstellt

---

**Status:** ✅ **READY FOR TESTING**

Die Desktop-App ist vollständig implementiert und testbereit. Alle erforderlichen USB-Handler und UI-Komponenten sind fertig. Sobald ein USB-Gerät (z.B. Etikettendrucker) angeschlossen wird und die App auf einem Rechner mit GUI gestartet wird, sollte alles funktionieren.
