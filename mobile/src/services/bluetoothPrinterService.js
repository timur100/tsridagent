// Bluetooth Printer Service
// Supports Zebra ZQ630 and Brother QL-820NWB

import { Platform, PermissionsAndroid, NativeModules, NativeEventEmitter } from 'react-native';

// Printer types and their configurations
const PRINTER_CONFIGS = {
  ZEBRA_ZQ630: {
    name: 'Zebra ZQ630',
    type: 'zebra',
    protocol: 'ZPL', // Zebra Programming Language
    labelWidth: 72, // mm
    labelHeight: 30, // mm
    dpi: 203,
    bluetoothPrefix: 'ZQ630',
  },
  BROTHER_QL820NWB: {
    name: 'Brother QL-820NWB',
    type: 'brother',
    protocol: 'ESC/P', // Brother uses ESC/P
    labelWidth: 62, // mm max
    labelHeight: 29, // mm (DK-22205 continuous)
    dpi: 300,
    bluetoothPrefix: 'QL-820NWB',
  },
};

// ZPL Label Templates
const ZPL_TEMPLATES = {
  // Asset Label Template (50x30mm)
  assetLabel: (asset) => `
^XA
^PW400
^LL240
^FO20,20^A0N,30,30^FD${asset.warehouse_asset_id || asset.asset_id}^FS
^FO20,60^A0N,20,20^FD${asset.type_label || asset.type || ''}^FS
^FO20,90^A0N,18,18^FD${asset.manufacturer || ''} ${asset.model || ''}^FS
^FO20,120^A0N,16,16^FDSN: ${asset.manufacturer_sn || '-'}^FS
^FO280,20^BQN,2,4^FDQA,${asset.warehouse_asset_id || asset.asset_id}^FS
^FO20,180^BY2^BCN,50,Y,N,N^FD${asset.warehouse_asset_id || asset.asset_id}^FS
^XZ
`.trim(),

  // Small QR Label (30x20mm)
  qrLabel: (data, label) => `
^XA
^PW240
^LL160
^FO10,10^A0N,24,24^FD${label}^FS
^FO160,10^BQN,2,3^FDQA,${data}^FS
^XZ
`.trim(),

  // Inventory Label
  inventoryLabel: (item) => `
^XA
^PW400
^LL200
^FO20,20^A0N,28,28^FD${item.name}^FS
^FO20,55^A0N,20,20^FDMenge: ${item.quantity} ${item.unit || 'Stk'}^FS
^FO20,85^A0N,18,18^FDLager: ${item.location || '-'}^FS
^FO280,20^BQN,2,4^FDQA,INV-${item.id}^FS
^XZ
`.trim(),
};

// Brother ESC/P Commands (simplified)
const BROTHER_COMMANDS = {
  init: '\x1B\x40', // Initialize printer
  cut: '\x1B\x69\x43\x01', // Cut tape
  printMode: '\x1B\x69\x4D\x40', // Set print mode
  
  // Generate label data for Brother printer
  generateLabel: (asset) => {
    const text = [
      asset.warehouse_asset_id || asset.asset_id,
      `${asset.type_label || asset.type || ''}`,
      `${asset.manufacturer || ''} ${asset.model || ''}`,
      `SN: ${asset.manufacturer_sn || '-'}`,
    ].join('\n');
    
    return text;
  },
};

class BluetoothPrinterService {
  constructor() {
    this.connectedPrinter = null;
    this.availablePrinters = [];
    this.isScanning = false;
    this.printerType = null;
  }

  // Request Bluetooth permissions (Android)
  async requestPermissions() {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(
        (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Scan for available Bluetooth printers
  async scanForPrinters(timeout = 10000) {
    if (this.isScanning) return this.availablePrinters;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    this.isScanning = true;
    this.availablePrinters = [];

    return new Promise((resolve, reject) => {
      // Simulated printer discovery for preview
      // In real implementation, use react-native-bluetooth-serial or similar
      
      setTimeout(() => {
        // Mock discovered printers for development
        this.availablePrinters = [
          {
            id: 'mock-zebra-1',
            name: 'ZQ630-ABC123',
            address: 'AA:BB:CC:DD:EE:FF',
            type: 'ZEBRA_ZQ630',
            config: PRINTER_CONFIGS.ZEBRA_ZQ630,
            rssi: -45,
          },
          {
            id: 'mock-brother-1',
            name: 'QL-820NWB-XYZ789',
            address: '11:22:33:44:55:66',
            type: 'BROTHER_QL820NWB',
            config: PRINTER_CONFIGS.BROTHER_QL820NWB,
            rssi: -52,
          },
        ];
        
        this.isScanning = false;
        resolve(this.availablePrinters);
      }, 2000);

      setTimeout(() => {
        if (this.isScanning) {
          this.isScanning = false;
          resolve(this.availablePrinters);
        }
      }, timeout);
    });
  }

  // Connect to a specific printer
  async connect(printerId) {
    const printer = this.availablePrinters.find((p) => p.id === printerId);
    if (!printer) {
      throw new Error('Printer not found');
    }

    // In real implementation, establish Bluetooth connection
    console.log('Connecting to printer:', printer.name);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectedPrinter = printer;
        this.printerType = printer.type;
        console.log('Connected to:', printer.name);
        resolve(true);
      }, 1000);
    });
  }

  // Disconnect from current printer
  async disconnect() {
    if (this.connectedPrinter) {
      console.log('Disconnecting from:', this.connectedPrinter.name);
      this.connectedPrinter = null;
      this.printerType = null;
    }
    return true;
  }

  // Get connection status
  isConnected() {
    return this.connectedPrinter !== null;
  }

  // Get connected printer info
  getConnectedPrinter() {
    return this.connectedPrinter;
  }

  // Print an asset label
  async printAssetLabel(asset, copies = 1) {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    const { type, config } = this.connectedPrinter;
    let labelData;

    if (type === 'ZEBRA_ZQ630') {
      labelData = ZPL_TEMPLATES.assetLabel(asset);
    } else if (type === 'BROTHER_QL820NWB') {
      labelData = BROTHER_COMMANDS.generateLabel(asset);
    } else {
      throw new Error('Unsupported printer type');
    }

    console.log('Printing label:', labelData);

    // In real implementation, send data via Bluetooth
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Printed ${copies} label(s) for asset:`, asset.warehouse_asset_id);
        resolve({
          success: true,
          copies,
          printer: this.connectedPrinter.name,
          asset: asset.warehouse_asset_id || asset.asset_id,
        });
      }, 500 * copies);
    });
  }

  // Print multiple labels (batch)
  async printBatch(assets, copiesPerAsset = 1) {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    const results = [];
    for (const asset of assets) {
      try {
        const result = await this.printAssetLabel(asset, copiesPerAsset);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          asset: asset.warehouse_asset_id || asset.asset_id,
        });
      }
    }

    return {
      total: assets.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // Print a QR code label
  async printQRLabel(data, label, copies = 1) {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    if (this.connectedPrinter.type !== 'ZEBRA_ZQ630') {
      throw new Error('QR labels only supported on Zebra printers');
    }

    const labelData = ZPL_TEMPLATES.qrLabel(data, label);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Printed QR label: ${label}`);
        resolve({ success: true, copies, data, label });
      }, 500);
    });
  }

  // Print inventory label
  async printInventoryLabel(item, copies = 1) {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    if (this.connectedPrinter.type !== 'ZEBRA_ZQ630') {
      throw new Error('Inventory labels only supported on Zebra printers');
    }

    const labelData = ZPL_TEMPLATES.inventoryLabel(item);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Printed inventory label: ${item.name}`);
        resolve({ success: true, copies, item: item.name });
      }, 500);
    });
  }

  // Test print (printer self-test)
  async testPrint() {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    const testAsset = {
      warehouse_asset_id: 'TEST-001',
      type_label: 'Test Label',
      manufacturer: 'TSRID',
      model: 'Test',
      manufacturer_sn: 'SN-TEST-12345',
    };

    return this.printAssetLabel(testAsset, 1);
  }

  // Get printer status
  async getStatus() {
    if (!this.connectedPrinter) {
      return {
        connected: false,
        status: 'disconnected',
      };
    }

    // In real implementation, query printer status
    return {
      connected: true,
      printer: this.connectedPrinter.name,
      type: this.connectedPrinter.type,
      status: 'ready',
      paperLevel: 'ok',
      batteryLevel: 85,
    };
  }
}

// Singleton instance
const bluetoothPrinterService = new BluetoothPrinterService();

export default bluetoothPrinterService;
export { BluetoothPrinterService, PRINTER_CONFIGS, ZPL_TEMPLATES };
