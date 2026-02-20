/**
 * Bluetooth Printer Service
 * 
 * Handles Bluetooth printer connectivity and label printing for:
 * - Zebra ZQ630 (ZPL II labels)
 * - Brother QL-820NWB (DK labels)
 * 
 * Uses Bluetooth Classic SPP (Serial Port Profile) for communication.
 */

import { Platform, NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';

// Printer types and their configurations
const PRINTER_CONFIGS = {
  'zebra_zq630': {
    name: 'Zebra ZQ630',
    labelLanguage: 'ZPL',
    defaultWidth: 50, // mm
    defaultDpi: 203,
    services: [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP UUID
    ],
  },
  'brother_ql820nwb': {
    name: 'Brother QL-820NWB',
    labelLanguage: 'Brother ESC/P',
    defaultWidth: 62, // mm
    defaultDpi: 300,
    services: [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP UUID
    ],
  },
};

// Printer status enum
const PRINTER_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  PRINTING: 'printing',
  ERROR: 'error',
  PAPER_LOW: 'paper_low',
  PAPER_OUT: 'paper_out',
  COVER_OPEN: 'cover_open',
};

class BluetoothPrinterService {
  constructor() {
    this.connectedPrinter = null;
    this.status = PRINTER_STATUS.DISCONNECTED;
    this.discoveredPrinters = [];
    this.isScanning = false;
    this.statusCallback = null;
    this.printQueue = [];
    this.isPrinting = false;
  }

  /**
   * Initialize Bluetooth printer service
   */
  async initialize(onStatusChange) {
    this.statusCallback = onStatusChange;

    // Request Bluetooth permissions on Android
    if (Platform.OS === 'android') {
      const granted = await this.requestBluetoothPermissions();
      if (!granted) {
        this.notifyStatus(PRINTER_STATUS.ERROR, 'Bluetooth-Berechtigungen fehlen');
        return false;
      }
    }

    this.notifyStatus(PRINTER_STATUS.DISCONNECTED, 'Bereit zum Verbinden');
    return true;
  }

  /**
   * Request Bluetooth permissions on Android
   */
  async requestBluetoothPermissions() {
    if (Platform.OS !== 'android') return true;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      return Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('[BluetoothPrinter] Permission error:', error);
      return false;
    }
  }

  /**
   * Scan for nearby Bluetooth printers
   */
  async scanForPrinters(durationMs = 10000) {
    if (this.isScanning) {
      console.log('[BluetoothPrinter] Already scanning');
      return this.discoveredPrinters;
    }

    this.isScanning = true;
    this.discoveredPrinters = [];
    this.notifyStatus(PRINTER_STATUS.DISCONNECTED, 'Suche nach Druckern...');

    try {
      // In a real implementation, use react-native-bluetooth-classic or similar
      // For now, return mock printers after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock discovered printers
      this.discoveredPrinters = [
        {
          id: 'bt:aa:bb:cc:dd:ee:01',
          name: 'ZQ630-ABC123',
          type: 'zebra_zq630',
          address: 'AA:BB:CC:DD:EE:01',
          rssi: -45,
          paired: true,
          config: PRINTER_CONFIGS.zebra_zq630,
        },
        {
          id: 'bt:aa:bb:cc:dd:ee:02',
          name: 'QL-820NWB-XYZ',
          type: 'brother_ql820nwb',
          address: 'AA:BB:CC:DD:EE:02',
          rssi: -52,
          paired: false,
          config: PRINTER_CONFIGS.brother_ql820nwb,
        },
      ];

      this.notifyStatus(PRINTER_STATUS.DISCONNECTED, `${this.discoveredPrinters.length} Drucker gefunden`);
    } catch (error) {
      console.error('[BluetoothPrinter] Scan error:', error);
      this.notifyStatus(PRINTER_STATUS.ERROR, `Scan-Fehler: ${error.message}`);
    } finally {
      this.isScanning = false;
    }

    return this.discoveredPrinters;
  }

  /**
   * Connect to a specific printer
   */
  async connect(printer) {
    if (this.connectedPrinter) {
      await this.disconnect();
    }

    this.notifyStatus(PRINTER_STATUS.CONNECTING, `Verbinde mit ${printer.name}...`);

    try {
      // In a real implementation, establish Bluetooth SPP connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.connectedPrinter = {
        ...printer,
        connectedAt: new Date().toISOString(),
        batteryLevel: Math.floor(60 + Math.random() * 40), // Mock: 60-100%
        paperStatus: 'ok',
      };

      this.notifyStatus(PRINTER_STATUS.CONNECTED, `Verbunden mit ${printer.name}`);
      return true;
    } catch (error) {
      console.error('[BluetoothPrinter] Connection error:', error);
      this.notifyStatus(PRINTER_STATUS.ERROR, `Verbindungsfehler: ${error.message}`);
      return false;
    }
  }

  /**
   * Disconnect from current printer
   */
  async disconnect() {
    if (!this.connectedPrinter) return;

    const printerName = this.connectedPrinter.name;
    
    try {
      // In a real implementation, close Bluetooth connection
      this.connectedPrinter = null;
      this.notifyStatus(PRINTER_STATUS.DISCONNECTED, `Von ${printerName} getrennt`);
    } catch (error) {
      console.error('[BluetoothPrinter] Disconnect error:', error);
    }
  }

  /**
   * Print a label
   */
  async printLabel(labelData) {
    if (!this.connectedPrinter) {
      throw new Error('Kein Drucker verbunden');
    }

    // Add to queue
    const printJob = {
      id: `job_${Date.now()}`,
      data: labelData,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.printQueue.push(printJob);

    // Process queue if not already printing
    if (!this.isPrinting) {
      await this.processQueue();
    }

    return printJob.id;
  }

  /**
   * Process the print queue
   */
  async processQueue() {
    if (this.isPrinting || this.printQueue.length === 0) return;

    this.isPrinting = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue[0];
      
      try {
        this.notifyStatus(PRINTER_STATUS.PRINTING, 'Druckt...');
        job.status = 'printing';

        // Generate label command based on printer type
        const command = this.generatePrintCommand(job.data);
        
        // In a real implementation, send command via Bluetooth
        await this.sendToPrinter(command);
        
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
      } catch (error) {
        job.status = 'error';
        job.error = error.message;
        console.error('[BluetoothPrinter] Print error:', error);
      }

      // Remove from queue
      this.printQueue.shift();
    }

    this.isPrinting = false;
    this.notifyStatus(PRINTER_STATUS.CONNECTED, 'Bereit');
  }

  /**
   * Generate print command based on printer type and label data
   */
  generatePrintCommand(labelData) {
    if (!this.connectedPrinter) return '';

    const { type } = this.connectedPrinter;
    
    if (type === 'zebra_zq630') {
      return this.generateZPLCommand(labelData);
    } else if (type === 'brother_ql820nwb') {
      return this.generateBrotherCommand(labelData);
    }

    return '';
  }

  /**
   * Generate ZPL command for Zebra printers
   */
  generateZPLCommand(labelData) {
    const { title, barcode, text, copies = 1 } = labelData;
    
    // ZPL II command structure
    let zpl = '^XA\n'; // Start format
    zpl += '^PW400\n'; // Print width
    zpl += `^LH0,0\n`; // Label home
    
    // Title
    if (title) {
      zpl += `^FO20,20^A0N,40,40^FD${title}^FS\n`;
    }
    
    // Barcode
    if (barcode) {
      zpl += `^FO20,80^BY2\n`;
      zpl += `^BCN,80,Y,N,N\n`;
      zpl += `^FD${barcode}^FS\n`;
    }
    
    // Additional text
    if (text) {
      zpl += `^FO20,200^A0N,25,25^FD${text}^FS\n`;
    }
    
    zpl += `^PQ${copies}\n`; // Print quantity
    zpl += '^XZ\n'; // End format
    
    return zpl;
  }

  /**
   * Generate ESC/P command for Brother printers
   */
  generateBrotherCommand(labelData) {
    const { title, barcode, text } = labelData;
    
    // Brother ESC/P command (simplified)
    let cmd = '\x1B@'; // Initialize
    cmd += '\x1BiS'; // Status request
    cmd += `\x1BiM\x00`; // Set mode
    
    // This is a simplified example
    // Real implementation would need proper Brother raster commands
    if (title) {
      cmd += title + '\n';
    }
    if (barcode) {
      cmd += `[BARCODE:${barcode}]\n`;
    }
    if (text) {
      cmd += text + '\n';
    }
    
    cmd += '\x1BiA\x01'; // Print command
    
    return cmd;
  }

  /**
   * Send command to printer via Bluetooth
   */
  async sendToPrinter(command) {
    // In a real implementation, send via Bluetooth SPP
    console.log('[BluetoothPrinter] Would send:', command.substring(0, 100) + '...');
    
    // Simulate print time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return true;
  }

  /**
   * Get printer status
   */
  async getPrinterStatus() {
    if (!this.connectedPrinter) {
      return {
        connected: false,
        status: PRINTER_STATUS.DISCONNECTED,
      };
    }

    // In a real implementation, query printer status
    return {
      connected: true,
      status: this.status,
      printer: this.connectedPrinter,
      queueLength: this.printQueue.length,
    };
  }

  /**
   * Get battery level (for supported printers)
   */
  async getBatteryLevel() {
    if (!this.connectedPrinter) return null;
    
    // In a real implementation, query printer
    return this.connectedPrinter.batteryLevel;
  }

  /**
   * Notify status change
   */
  notifyStatus(status, message) {
    this.status = status;
    
    if (this.statusCallback) {
      this.statusCallback({
        status,
        message,
        printer: this.connectedPrinter,
        queueLength: this.printQueue.length,
      });
    }
  }

  /**
   * Get discovered printers
   */
  getDiscoveredPrinters() {
    return this.discoveredPrinters;
  }

  /**
   * Get connected printer
   */
  getConnectedPrinter() {
    return this.connectedPrinter;
  }

  /**
   * Get print queue
   */
  getPrintQueue() {
    return this.printQueue;
  }

  /**
   * Clear print queue
   */
  clearQueue() {
    this.printQueue = [];
  }

  /**
   * Print test label
   */
  async printTestLabel() {
    return this.printLabel({
      title: 'TSRID Test',
      barcode: 'TEST123456',
      text: `Gedruckt: ${new Date().toLocaleString('de-DE')}`,
      copies: 1,
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.disconnect();
    this.printQueue = [];
    this.statusCallback = null;
  }
}

// Export singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();

// Export class and constants
export { PRINTER_STATUS, PRINTER_CONFIGS };
export default BluetoothPrinterService;
