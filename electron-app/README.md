# TSRID Admin Portal - Desktop App

## Überblick

Diese Electron Desktop App lädt das TSRID Admin Portal und bietet zusätzliche native Funktionen:

✅ **USB-Geräte-Zugriff** (Drucker, Scanner, etc.)
✅ **Automatische Updates** (lädt immer aktuellste Version vom Preview-Server)
✅ **Native Features** (Tray Icon, Benachrichtigungen)
✅ **Cross-Platform** (Windows, Mac, Linux)

## Installation

```bash
cd /app/electron-app
npm install  # oder yarn install
```

## Entwicklung

```bash
# App starten
npm start

# Mit DevTools
NODE_ENV=development npm start
```

## Build

```bash
# Für aktuelles OS
npm run build

# Für Windows
npm run build:win

# Für Mac
npm run build:mac

# Für Linux
npm run build:linux
```

## USB API Nutzung im Admin Portal

### JavaScript im Admin Portal:

```javascript
// Prüfen ob Desktop App
if (window.isDesktopApp) {
  console.log('Running in Desktop App:', window.desktopVersion);
  
  // USB Geräte abrufen
  const devices = await window.usbAPI.getDevices();
  console.log('USB Devices:', devices);
  
  // Serial Ports abrufen
  const ports = await window.usbAPI.getSerialPorts();
  console.log('Serial Ports:', ports);
  
  // Zu USB Drucker drucken
  await window.printerAPI.print('/dev/ttyUSB0', 'Hello Printer!');
  
  // ZPL Label drucken (Zebra)
  const zpl = '^XA^FO50,50^A0N,50,50^FDHello World^FS^XZ';
  await window.printerAPI.printZPL('/dev/ttyUSB0', zpl);
}
```

### React Component Beispiel:

```jsx
import { useState, useEffect } from 'react';

function USBDeviceManager() {
  const [devices, setDevices] = useState([]);
  const [ports, setPorts] = useState([]);
  
  useEffect(() => {
    if (window.usbAPI) {
      loadDevices();
    }
  }, []);
  
  const loadDevices = async () => {
    const usbDevices = await window.usbAPI.getDevices();
    const serialPorts = await window.usbAPI.getSerialPorts();
    setDevices(usbDevices);
    setPorts(serialPorts);
  };
  
  const printLabel = async (port, assetId) => {
    // Generiere ZPL für Asset-Label
    const zpl = `
      ^XA
      ^FO50,50^A0N,50,50^FD${assetId}^FS
      ^FO50,150^BQN,2,10^FDQA,${assetId}^FS
      ^XZ
    `;
    
    const result = await window.printerAPI.printZPL(port, zpl);
    if (result.success) {
      alert('Label gedruckt!');
    }
  };
  
  return (
    <div>
      <h3>USB Geräte</h3>
      <button onClick={loadDevices}>Aktualisieren</button>
      
      <h4>Serial Ports:</h4>
      <ul>
        {ports.map(port => (
          <li key={port.path}>
            {port.path} - {port.manufacturer}
            <button onClick={() => printLabel(port.path, 'TSR.EC.SCDE.000001')}>
              Test Druck
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Unterstützte Drucker

### Zebra Drucker (ZPL)
- GK420d, GX420d, ZD410, ZD420, ZD620
- Verwendet ZPL (Zebra Programming Language)

### Dymo Drucker
- LabelWriter 450, 4XL
- Verwendet ESC/POS oder proprietäres Protokoll

### Brother Drucker
- QL-Serie (QL-700, QL-800)
- Verwendet ESC/P oder Raster

### TSC Drucker
- TTP-244, TTP-345
- Verwendet TSPL

## Fehlerbehebung

### USB Gerät wird nicht erkannt
```bash
# Linux: USB Berechtigungen
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyUSB0

# Windows: Treiber installieren
# Mac: Keine zusätzlichen Schritte nötig
```

### Drucker antwortet nicht
1. Überprüfe Kabel-Verbindung
2. Überprüfe Port-Name (`/dev/ttyUSB0`, `COM3`, etc.)
3. Teste mit `printer:test` API
4. Überprüfe Baudrate (meist 9600)

## Architektur

```
Electron App
├── Main Process (Node.js)
│   ├── USB Device Management
│   ├── Serial Port Communication
│   ├── Printer Handlers
│   └── IPC Bridge
├── Renderer Process (Web)
│   └── Lädt: https://offline-agent.preview.emergentagent.com
└── Preload Script
    └── Exposes APIs to Web Content
```

## Sicherheit

- ✅ Context Isolation aktiviert
- ✅ Node Integration deaktiviert
- ✅ Remote Module deaktiviert
- ✅ Nur whitelisted IPC Channels
- ✅ Keine eval() oder unsichere Code-Ausführung

## Lizenz

MIT