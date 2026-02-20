/**
 * Bluetooth Printer Service for TSRID Mobile
 * 
 * This service provides Bluetooth printer functionality.
 * Currently uses enhanced simulation with permission handling.
 * Ready for native SDK integration (Zebra Link-OS / Brother SDK) in future.
 * 
 * Supports:
 * - Zebra printers (ZPL format)
 * - Brother printers (ESC/P format)
 */

import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Buffer } from 'buffer';

// Known printer name patterns
const ZEBRA_PATTERNS = ['ZQ6', 'ZQ5', 'ZD', 'ZT', 'QLn', 'iMZ', 'Zebra'];
const BROTHER_PATTERNS = ['QL-', 'PT-', 'TD-', 'RJ-', 'Brother'];

// Simulated printers for demo (will be replaced with real discovery)
const DEMO_PRINTERS = [
  { 
    id: 'zebra-zq630-001', 
    name: 'Zebra ZQ630', 
    address: 'AC:23:3F:A5:12:01',
    type: 'zebra',
    rssi: -45,
    battery: 85,
    paperWidth: '72mm',
  },
  { 
    id: 'brother-ql820-001', 
    name: 'Brother QL-820NWB', 
    address: 'AC:23:3F:A5:12:02',
    type: 'brother',
    rssi: -62,
    battery: 100,
    paperWidth: '62mm',
  },
  { 
    id: 'zebra-zq520-001', 
    name: 'Zebra ZQ520', 
    address: 'AC:23:3F:A5:12:03',
    type: 'zebra',
    rssi: -78,
    battery: 45,
    paperWidth: '72mm',
  },
];

class BluetoothPrinterService {
  constructor() {
    this.connectedDevice = null;
    this.isScanning = false;
    this.discoveredPrinters = [];
    this.permissionsGranted = false;
    this.printQueue = [];
    this.isNativeMode = false; // Will be true when native SDKs are integrated
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestPermissions() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        // Android 12+
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        const allGranted = 
          permissions['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          permissions['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          permissions['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!allGranted) {
          // Check if we should show rationale
          const shouldShowRationale = await PermissionsAndroid.shouldShowRequestPermissionRationale(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
          );
          
          if (!shouldShowRationale) {
            // User denied permanently, show settings alert
            Alert.alert(
              'Bluetooth-Berechtigung erforderlich',
              'Bitte erlauben Sie Bluetooth in den App-Einstellungen, um Drucker zu finden.',
              [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Einstellungen', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return false;
        }
        
        this.permissionsGranted = true;
        return true;
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Standort-Berechtigung',
            message: 'TSRID Mobile benötigt Standort-Zugriff, um Bluetooth-Drucker zu finden.',
            buttonNeutral: 'Später fragen',
            buttonNegative: 'Ablehnen',
            buttonPositive: 'Erlauben',
          }
        );
        
        this.permissionsGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.permissionsGranted;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Identify printer type from device name
   */
  identifyPrinterType(deviceName) {
    if (!deviceName) return 'unknown';
    
    const upperName = deviceName.toUpperCase();
    
    if (ZEBRA_PATTERNS.some(p => upperName.includes(p.toUpperCase()))) {
      return 'zebra';
    }
    if (BROTHER_PATTERNS.some(p => upperName.includes(p.toUpperCase()))) {
      return 'brother';
    }
    return 'unknown';
  }

  /**
   * Start scanning for Bluetooth printers
   * Currently uses enhanced simulation, ready for native SDK integration
   */
  async startScan(onDeviceFound, onScanComplete, timeoutMs = 10000) {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth-Berechtigungen wurden nicht erteilt. Bitte erlauben Sie Bluetooth in den Einstellungen.');
    }

    this.isScanning = true;
    this.discoveredPrinters = [];

    console.log('Starting Bluetooth printer scan (simulation mode)...');

    // Simulate progressive device discovery
    let discoveryIndex = 0;
    const discoveryInterval = setInterval(() => {
      if (discoveryIndex < DEMO_PRINTERS.length) {
        const printer = { ...DEMO_PRINTERS[discoveryIndex] };
        // Add some randomness to RSSI for realism
        printer.rssi = printer.rssi + Math.floor(Math.random() * 10) - 5;
        
        this.discoveredPrinters.push(printer);
        
        if (onDeviceFound) {
          onDeviceFound(printer);
        }
        
        console.log(`Found printer: ${printer.name} (${printer.type})`);
        discoveryIndex++;
      }
    }, 1500); // Discover a new printer every 1.5 seconds

    // Stop after timeout
    setTimeout(() => {
      clearInterval(discoveryInterval);
      this.stopScan();
      
      if (onScanComplete) {
        onScanComplete(this.discoveredPrinters);
      }
    }, timeoutMs);
  }

  /**
   * Stop scanning
   */
  stopScan() {
    if (this.isScanning) {
      this.isScanning = false;
      console.log('Scan stopped');
    }
  }

  /**
   * Connect to a printer
   */
  async connect(deviceId) {
    try {
      // Disconnect existing connection
      if (this.connectedDevice) {
        await this.disconnect();
      }

      console.log(`Connecting to device: ${deviceId}`);
      
      // Find the printer in discovered list or demo list
      const printer = this.discoveredPrinters.find(p => p.id === deviceId) ||
                      DEMO_PRINTERS.find(p => p.id === deviceId);
      
      if (!printer) {
        return {
          success: false,
          error: 'Drucker nicht gefunden',
        };
      }

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.connectedDevice = {
        ...printer,
        connected: true,
        connectionTime: new Date(),
      };
      
      console.log(`Connected to ${printer.name} (${printer.type})`);
      
      return {
        success: true,
        device: this.connectedDevice,
      };
    } catch (error) {
      console.error('Connection failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    if (this.connectedDevice) {
      console.log(`Disconnecting from ${this.connectedDevice.name}`);
      this.connectedDevice = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectedDevice !== null;
  }

  /**
   * Get connected device info
   */
  getConnectedDevice() {
    return this.connectedDevice;
  }

  /**
   * Generate ZPL for test label
   */
  generateTestLabelZPL() {
    const timestamp = new Date().toLocaleString('de-DE');
    return `
^XA
^CF0,40
^FO50,30^FDTSRID Mobile^FS
^CF0,25
^FO50,80^FDTest-Etikett^FS
^FO50,115^FD${timestamp}^FS
^FO50,160^BQN,2,5^FDQA,TSRID-TEST-${Date.now()}^FS
^FO220,160^BY2^BCN,50,N,N,N^FD123456789^FS
^XZ
    `.trim();
  }

  /**
   * Generate Brother ESC/P commands for test label
   */
  generateTestLabelBrother() {
    const timestamp = new Date().toLocaleString('de-DE');
    return [
      '\x1B@',           // Initialize
      '\x1BiS',          // Status info request
      '\x1BiD',          // Select compression mode
      '\x1BiaH\x00',     // Enable auto cut
      'TSRID Mobile\n',
      'Test-Etikett\n',
      timestamp + '\n',
      '\x0C',            // Form feed
    ].join('');
  }

  /**
   * Print test label
   */
  async printTestLabel() {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing test label on ${this.connectedDevice.name}...`);

    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In simulation mode, just log the data
    if (this.connectedDevice.type === 'zebra') {
      const zpl = this.generateTestLabelZPL();
      console.log('ZPL Data:', zpl.substring(0, 100) + '...');
    } else {
      const escp = this.generateTestLabelBrother();
      console.log('Brother ESC/P Data length:', escp.length);
    }

    // Simulate success
    return { 
      success: true, 
      message: 'Test-Etikett wurde an den Drucker gesendet (Simulation)',
      printedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate ZPL for asset label
   */
  generateAssetLabelZPL(asset) {
    const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
    const serialNumber = asset.manufacturer_sn || 'N/A';
    const type = asset.type_label || asset.type || 'N/A';
    const manufacturer = asset.manufacturer || 'N/A';
    
    return `
^XA
^CF0,35
^FO30,20^FD${assetId}^FS
^CF0,22
^FO30,60^FDTyp: ${type}^FS
^FO30,88^FDHersteller: ${manufacturer}^FS
^FO30,116^FDSN: ${serialNumber}^FS
^FO30,155^BQN,2,4^FDQA,${assetId}^FS
^FO170,155^BY2^BCN,50,N,N,N^FD${serialNumber}^FS
^XZ
    `.trim();
  }

  /**
   * Print asset label
   */
  async printAssetLabel(asset) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing asset label for ${asset.warehouse_asset_id || asset.asset_id}...`);

    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (this.connectedDevice.type === 'zebra') {
      const zpl = this.generateAssetLabelZPL(asset);
      console.log('Asset ZPL Data:', zpl.substring(0, 100) + '...');
    }

    return { 
      success: true, 
      message: 'Asset-Etikett wurde gedruckt (Simulation)',
      asset: asset.warehouse_asset_id || asset.asset_id,
    };
  }

  /**
   * Add to print queue
   */
  addToPrintQueue(item) {
    this.printQueue.push({
      ...item,
      id: Date.now().toString(),
      status: 'pending',
      addedAt: new Date().toISOString(),
    });
    return this.printQueue;
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
  clearPrintQueue() {
    this.printQueue = [];
  }

  /**
   * Process print queue
   */
  async processPrintQueue() {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    const results = [];
    
    for (const item of this.printQueue) {
      try {
        item.status = 'printing';
        await new Promise(resolve => setTimeout(resolve, 1000));
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
        results.push({ success: true, item });
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        results.push({ success: false, item, error: error.message });
      }
    }

    // Clear completed items
    this.printQueue = this.printQueue.filter(item => item.status !== 'completed');
    
    return results;
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      version: '1.1.0',
      mode: this.isNativeMode ? 'native' : 'simulation',
      permissionsGranted: this.permissionsGranted,
      connectedDevice: this.connectedDevice,
      queueLength: this.printQueue.length,
      supportedPrinters: {
        zebra: ['ZQ630', 'ZQ620', 'ZQ520', 'ZD420', 'ZT230'],
        brother: ['QL-820NWB', 'QL-1110NWB', 'RJ-4250WB'],
      },
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopScan();
    this.disconnect();
    this.printQueue = [];
  }
}

// Export singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
