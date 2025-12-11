# Integration Guide: USB-Funktionen im Admin Portal

## ✅ Verfügbare APIs

Die Electron App stellt folgende APIs im Admin Portal zur Verfügung:

### 1. **USB API** (`window.usbAPI`)
### 2. **Printer API** (`window.printerAPI`)
### 3. **Dialog API** (`window.dialogAPI`)
### 4. **App API** (`window.appAPI`)

---

## 🔌 USB API

### Pr\u00fcfen ob Desktop App l\u00e4uft:

```javascript
if (window.isDesktopApp) {
  console.log('Desktop App Version:', window.desktopVersion);
  // USB Funktionen verf\u00fcgbar
} else {
  console.log('Web Browser - Keine USB Funktionen');
}
```

### USB Ger\u00e4te auflisten:

```javascript
const devices = await window.usbAPI.getDevices();
console.log('USB Devices:', devices);
// Output: [{ vendorId: 0x04b8, productId: 0x0e28 }, ...]
```

### Serial Ports auflisten:

```javascript
const ports = await window.usbAPI.getSerialPorts();
console.log('Serial Ports:', ports);
/* Output:
[
  {
    path: '/dev/ttyUSB0',
    manufacturer: 'Zebra Technologies',
    serialNumber: '12345',
    vendorId: '0x0a5f',
    productId: '0x0094'
  },
  ...
]
*/
```

---

## \ud83d\udda8\ufe0f Printer API

### Test-Druck an USB-Drucker:

```javascript
const result = await window.printerAPI.print(
  '/dev/ttyUSB0',  // Port
  'Hello Printer!', // Daten
  'utf8'           // Encoding (optional)
);

if (result.success) {
  console.log('Druck erfolgreich!');
} else {
  console.error('Druck fehlgeschlagen:', result.error);
}
```

### ZPL Label drucken (Zebra):

```javascript
// Generiere ZPL f\u00fcr Asset-Label mit QR-Code
const assetId = 'TSR.EC.SCDE.000001';

const zpl = `
^XA
^FO50,50^A0N,50,50^FD${assetId}^FS
^FO50,150^BQN,2,10^FDQA,${assetId}^FS
^XZ
`;

const result = await window.printerAPI.printZPL('/dev/ttyUSB0', zpl);

if (result.success) {
  alert('Label gedruckt!');
}
```

### Drucker-Verbindung testen:

```javascript
const result = await window.printerAPI.test('/dev/ttyUSB0');

if (result.success) {
  console.log('Drucker verbunden!');
} else {
  console.error('Drucker nicht erreichbar:', result.error);
}
```

---

## \ud83d\udcdd React Component Beispiel

### USB Device Manager Komponente:

```jsx
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

function USBPrinterManager() {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Pr\u00fcfe ob Desktop App
    setIsDesktop(!!window.isDesktopApp);
    
    if (window.isDesktopApp) {
      loadPrinters();
    }
  }, []);

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const serialPorts = await window.usbAPI.getSerialPorts();
      setPorts(serialPorts);
      if (serialPorts.length > 0) {
        setSelectedPort(serialPorts[0].path);
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Drucker');
    } finally {
      setLoading(false);
    }
  };

  const testPrinter = async () => {
    if (!selectedPort) {
      toast.error('Bitte Drucker ausw\u00e4hlen');
      return;
    }

    try {
      const result = await window.printerAPI.test(selectedPort);
      if (result.success) {
        toast.success('Drucker verbunden!');
      } else {
        toast.error('Drucker nicht erreichbar');
      }
    } catch (error) {
      toast.error('Fehler beim Testen');
    }
  };

  const printAssetLabel = async (assetId) => {
    if (!selectedPort) {
      toast.error('Bitte Drucker ausw\u00e4hlen');
      return;
    }

    try {
      // Generiere ZPL Label
      const zpl = `
^XA
^FO50,30^A0N,40,40^FDTSRID Asset^FS
^FO50,90^A0N,60,60^FD${assetId}^FS
^FO50,180^BQN,2,8^FDQA,${assetId}^FS
^XZ
      `;

      const result = await window.printerAPI.printZPL(selectedPort, zpl);
      
      if (result.success) {
        toast.success(`Label f\u00fcr ${assetId} gedruckt!`);
      } else {
        toast.error('Druck fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler beim Drucken');
    }
  };

  if (!isDesktop) {
    return (
      <Card className=\"p-4\">
        <p className=\"text-yellow-600\">
          \u26a0\ufe0f USB-Druck ist nur in der Desktop App verf\u00fcgbar.
        </p>
      </Card>
    );
  }

  return (
    <Card className=\"p-6\">
      <h3 className=\"text-xl font-bold mb-4\">USB Drucker</h3>
      
      <div className=\"space-y-4\">
        {/* Drucker Auswahl */}
        <div>
          <label className=\"block mb-2 font-medium\">Drucker:</label>
          <select
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            className=\"w-full p-2 border rounded\"
          >
            {ports.map(port => (
              <option key={port.path} value={port.path}>
                {port.path} - {port.manufacturer || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className=\"flex gap-2\">
          <Button onClick={loadPrinters} disabled={loading}>
            \ud83d\udd04 Aktualisieren
          </Button>
          <Button onClick={testPrinter} disabled={!selectedPort}>
            \ud83e\uddea Test Druck
          </Button>
          <Button 
            onClick={() => printAssetLabel('TSR.EC.SCDE.000001')}
            disabled={!selectedPort}
            className=\"bg-[#c00000] text-white\"
          >
            \ud83d\udda8\ufe0f Asset Label Drucken
          </Button>
        </div>

        {/* Ger\u00e4te Liste */}
        {ports.length > 0 && (
          <div>
            <h4 className=\"font-medium mb-2\">Gefundene Ger\u00e4te:</h4>
            <ul className=\"space-y-1 text-sm\">
              {ports.map(port => (
                <li key={port.path} className=\"flex items-center gap-2\">
                  <span className=\"w-32 font-mono\">{port.path}</span>
                  <span className=\"text-gray-600\">
                    {port.manufacturer || 'Unknown'} 
                    {port.productId && ` (${port.productId})`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

export default USBPrinterManager;
```

---

## \ud83c\udf9b\ufe0f Integration in Asset Management

### Asset-Details Modal mit Druck-Button:

```jsx
// In AssetManagement.jsx

const printAssetLabel = async (asset) => {
  if (!window.isDesktopApp) {
    toast.error('USB-Druck nur in Desktop App verf\u00fcgbar');
    return;
  }

  // Hole verf\u00fcgbare Drucker
  const ports = await window.usbAPI.getSerialPorts();
  
  if (ports.length === 0) {
    toast.error('Kein Drucker gefunden');
    return;
  }

  // W\u00e4hle ersten Drucker
  const printerPort = ports[0].path;

  // Generiere ZPL Label
  const zpl = `
^XA
^FO30,30^A0N,35,35^FDTSRID Asset Label^FS
^FO30,80^A0N,50,50^FD${asset.asset_id}^FS
^FO30,150^A0N,30,30^FD${asset.name}^FS
^FO30,200^A0N,25,25^FDSN: ${asset.serial_number}^FS
^FO30,240^BQN,2,6^FDQA,${asset.asset_id}^FS
^XZ
  `;

  try {
    const result = await window.printerAPI.printZPL(printerPort, zpl);
    
    if (result.success) {
      toast.success(`Label f\u00fcr ${asset.asset_id} gedruckt!`);
    } else {
      toast.error('Druckfehler: ' + result.error);
    }
  } catch (error) {
    toast.error('Fehler beim Drucken');
  }
};

// Im Asset-Detail Modal Button hinzuf\u00fcgen:
{window.isDesktopApp && (
  <Button
    onClick={() => printAssetLabel(selectedAsset)}
    className=\"bg-green-600 hover:bg-green-700\"
  >
    \ud83d\udda8\ufe0f Label Drucken
  </Button>
)}
```

---

## \ud83d\udcca Bulk-Druck f\u00fcr mehrere Assets:

```javascript
const printMultipleLabels = async (assets) => {
  if (!window.isDesktopApp) {
    toast.error('Nur in Desktop App verf\u00fcgbar');
    return;
  }

  const ports = await window.usbAPI.getSerialPorts();
  if (ports.length === 0) {
    toast.error('Kein Drucker gefunden');
    return;
  }

  const printerPort = ports[0].path;
  let successCount = 0;
  let failCount = 0;

  for (const asset of assets) {
    const zpl = `
^XA
^FO30,30^A0N,50,50^FD${asset.asset_id}^FS
^FO30,100^BQN,2,6^FDQA,${asset.asset_id}^FS
^XZ
    `;

    try {
      const result = await window.printerAPI.printZPL(printerPort, zpl);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Kleine Pause zwischen Drucken
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      failCount++;
    }
  }

  toast.success(`${successCount} Labels gedruckt, ${failCount} Fehler`);
};

// Verwendung:
<Button onClick={() => printMultipleLabels(selectedAssets)}>
  \ud83d\udda8\ufe0f Alle Labels Drucken ({selectedAssets.length})
</Button>
```

---

## \u2699\ufe0f Drucker-Konfiguration Komponente:

```jsx
function PrinterSettings() {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    // Lade gespeicherte Einstellung
    const saved = localStorage.getItem('defaultPrinter');
    if (saved) setSelectedPrinter(saved);
    
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    if (window.usbAPI) {
      const ports = await window.usbAPI.getSerialPorts();
      setPrinters(ports);
    }
  };

  const saveDefaultPrinter = () => {
    localStorage.setItem('defaultPrinter', selectedPrinter);
    toast.success('Standard-Drucker gespeichert');
  };

  return (
    <div>
      <h3>Drucker Einstellungen</h3>
      <select 
        value={selectedPrinter}
        onChange={(e) => setSelectedPrinter(e.target.value)}
      >
        {printers.map(p => (
          <option key={p.path} value={p.path}>
            {p.path} - {p.manufacturer}
          </option>
        ))}
      </select>
      <Button onClick={saveDefaultPrinter}>
        Speichern
      </Button>
    </div>
  );
}
```

---

## \ud83d\udd0d Debugging

### Console Logs pr\u00fcfen:

```javascript
// In der Desktop App Console (Electron DevTools)
window.usbAPI.getSerialPorts().then(console.log);

// Output sehen
// [{ path: '/dev/ttyUSB0', manufacturer: 'Zebra', ... }]
```

### Fehlerbehandlung:

```javascript
try {
  const result = await window.printerAPI.printZPL(port, zpl);
  if (!result.success) {
    console.error('Print failed:', result.error);
    // Zeige User-freundliche Fehlermeldung
  }
} catch (error) {
  console.error('Exception:', error);
  // Handle exception
}
```

---

## \ud83d\udcdd ZPL Kommando-Referenz

### Basis-Struktur:

```
^XA          <- Start Label
^FO x,y      <- Field Origin (Position)
^A0N,h,w     <- Font (0=default, N=normal, height, width)
^FD text ^FS <- Field Data + Field Separator
^BQN,2,10    <- QR Code (N=normal, model 2, size 10)
^XZ          <- End Label
```

### Beispiel - Asset Label mit allen Details:

```javascript
const generateAssetLabelZPL = (asset) => {
  return `
^XA
^FO30,20^A0N,30,30^FDTSRID Asset Label^FS
^FO30,60^GB700,3,3^FS

^FO30,80^A0N,50,50^FD${asset.asset_id}^FS
^FO30,140^A0N,30,30^FD${asset.name}^FS
^FO30,180^A0N,25,25^FDSN: ${asset.serial_number}^FS
^FO30,210^A0N,25,25^FDLocation: ${asset.location}^FS

^FO550,80^BQN,2,8^FDQA,${asset.asset_id}^FS

^FO30,450^GB700,3,3^FS
^FO30,470^A0N,20,20^FDwww.tsrid.com^FS
^XZ
  `;
};
```

---

## \u2705 Checkliste f\u00fcr Integration

- [ ] Electron App installiert und gestartet
- [ ] USB Drucker angeschlossen
- [ ] Drucker in Serial Ports Liste sichtbar
- [ ] Test-Druck erfolgreich
- [ ] Admin Portal l\u00e4dt in Desktop App
- [ ] `window.isDesktopApp` ist `true`
- [ ] USB API funktioniert
- [ ] Label-Druck Button im UI eingef\u00fcgt
- [ ] Standard-Drucker konfiguriert
- [ ] Bulk-Druck funktioniert

---

**Die Electron App ist jetzt bereit f\u00fcr USB-Integration!** \ud83c\udf89
