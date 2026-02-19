/**
 * TSRID Mobile App - Drucker Konfiguration
 * 
 * Unterstützte Drucker:
 * - Zebra ZQ630 (Bluetooth, ZPL)
 * - Brother QL-820NWB (Bluetooth/WLAN, ESC/P)
 */

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'zebra' | 'brother';
  protocol: 'zpl' | 'escp' | 'cpcl';
  connectionType: 'bluetooth' | 'wifi' | 'usb';
  defaultLabelSize: LabelSize;
  supportedLabelSizes: LabelSize[];
}

export interface LabelSize {
  id: string;
  name: string;
  width: number;  // mm
  height: number; // mm
}

// Unterstützte Label-Größen
export const LABEL_SIZES: Record<string, LabelSize> = {
  '62x29': { id: '62x29', name: '62 x 29 mm', width: 62, height: 29 },
  '62x100': { id: '62x100', name: '62 x 100 mm', width: 62, height: 100 },
  '50x30': { id: '50x30', name: '50 x 30 mm', width: 50, height: 30 },
  '102x51': { id: '102x51', name: '102 x 51 mm', width: 102, height: 51 },
  '102x76': { id: '102x76', name: '102 x 76 mm', width: 102, height: 76 }
};

// Vorkonfigurierte Drucker
export const SUPPORTED_PRINTERS: PrinterConfig[] = [
  {
    id: 'zebra_zq630',
    name: 'Zebra ZQ630',
    type: 'zebra',
    protocol: 'zpl',
    connectionType: 'bluetooth',
    defaultLabelSize: LABEL_SIZES['102x51'],
    supportedLabelSizes: [
      LABEL_SIZES['50x30'],
      LABEL_SIZES['102x51'],
      LABEL_SIZES['102x76']
    ]
  },
  {
    id: 'brother_ql820nwb',
    name: 'Brother QL-820NWB',
    type: 'brother',
    protocol: 'escp',
    connectionType: 'bluetooth',
    defaultLabelSize: LABEL_SIZES['62x29'],
    supportedLabelSizes: [
      LABEL_SIZES['62x29'],
      LABEL_SIZES['62x100']
    ]
  }
];

// Bluetooth Service UUIDs
export const BLUETOOTH_UUIDS = {
  zebra: {
    serviceUUID: '38eb4a80-c570-11e3-9507-0002a5d5c51b',
    writeCharUUID: '38eb4a82-c570-11e3-9507-0002a5d5c51b'
  },
  brother: {
    serviceUUID: '00001101-0000-1000-8000-00805f9b34fb', // SPP
    writeCharUUID: null // Uses SPP stream
  }
};

// ZPL Templates für Zebra
export const ZPL_TEMPLATES = {
  // Standard Asset-Label
  assetLabel: (data: { assetId: string; serialNumber: string; qrData: string }) => `
^XA
^FO20,20^BY2
^BQN,2,5^FDQA,${data.qrData}^FS
^FO150,20^A0N,30,30^FD${data.assetId}^FS
^FO150,60^A0N,20,20^FDSN: ${data.serialNumber}^FS
^FO20,100^GB380,0,2^FS
^FO20,110^A0N,18,18^FDTSRID Asset Management^FS
^XZ
`,
  
  // Kompaktes Label
  compactLabel: (data: { assetId: string; qrData: string }) => `
^XA
^FO10,10^BY2
^BQN,2,4^FDQA,${data.qrData}^FS
^FO100,20^A0N,25,25^FD${data.assetId}^FS
^XZ
`
};

// ESC/P Commands für Brother
export const ESCP_COMMANDS = {
  init: '\x1B\x40',           // Initialize
  cut: '\x1B\x69\x41\x01',    // Auto-cut
  rasterMode: '\x1B\x69\x52\x01',
  compression: '\x1B\x69\x7A'
};
