/**
 * Bluetooth Printer Service for TSRID Mobile
 * Supports Zebra (ZPL) and Brother (ESC/P) printers via Bluetooth
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// Bluetooth Service UUIDs for printers
const ZEBRA_SERVICE_UUID = '38eb4a80-c570-11e3-9507-0002a5d5c51b';
const ZEBRA_WRITE_CHARACTERISTIC = '38eb4a82-c570-11e3-9507-0002a5d5c51b';

// Brother uses standard Serial Port Profile (SPP)
const BROTHER_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb';

// Known printer name patterns
const ZEBRA_PATTERNS = ['ZQ6', 'ZQ5', 'ZD', 'ZT', 'QLn', 'iMZ', 'Zebra'];
const BROTHER_PATTERNS = ['QL-', 'PT-', 'TD-', 'RJ-', 'Brother'];

class BluetoothPrinterService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.isScanning = false;
    this.discoveredPrinters = [];
    this.listeners = [];
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        // Android 12+
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          permissions['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
          permissions['android.permission.BLUETOOTH_CONNECT'] === 'granted' &&
          permissions['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
        );
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles permissions differently
  }

  /**
   * Check if Bluetooth is enabled
   */
  async checkBluetoothState() {
    const state = await this.manager.state();
    return state === State.PoweredOn;
  }

  /**
   * Enable Bluetooth (Android only)
   */
  async enableBluetooth() {
    try {
      await this.manager.enable();
      return true;
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
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
   */
  async startScan(onDeviceFound, onScanComplete, timeoutMs = 10000) {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth-Berechtigungen wurden nicht erteilt');
    }

    // Check Bluetooth state
    const isEnabled = await this.checkBluetoothState();
    if (!isEnabled) {
      throw new Error('Bluetooth ist deaktiviert. Bitte aktivieren Sie Bluetooth.');
    }

    this.isScanning = true;
    this.discoveredPrinters = [];

    console.log('Starting Bluetooth scan...');

    // Start scanning
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        this.isScanning = false;
        return;
      }

      if (device && device.name) {
        const printerType = this.identifyPrinterType(device.name);
        
        // Only add printers (Zebra or Brother)
        if (printerType !== 'unknown') {
          const exists = this.discoveredPrinters.some(p => p.id === device.id);
          
          if (!exists) {
            const printerInfo = {
              id: device.id,
              name: device.name,
              rssi: device.rssi,
              type: printerType,
              device: device,
            };
            
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found printer: ${device.name} (${printerType})`);
            
            if (onDeviceFound) {
              onDeviceFound(printerInfo);
            }
          }
        }
      }
    });

    // Stop after timeout
    setTimeout(() => {
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
      this.manager.stopDeviceScan();
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
      
      const device = await this.manager.connectToDevice(deviceId, {
        autoConnect: false,
        timeout: 10000,
      });

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = device;
      
      // Get printer info
      const printerType = this.identifyPrinterType(device.name);
      
      console.log(`Connected to ${device.name} (${printerType})`);
      
      return {
        success: true,
        device: {
          id: device.id,
          name: device.name,
          type: printerType,
        },
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
      try {
        await this.connectedDevice.cancelConnection();
        console.log('Disconnected from printer');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
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
    if (!this.connectedDevice) return null;
    
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      type: this.identifyPrinterType(this.connectedDevice.name),
    };
  }

  /**
   * Send data to printer
   */
  async sendData(data) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    try {
      const services = await this.connectedDevice.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            // Convert string to base64
            const base64Data = Buffer.from(data).toString('base64');
            
            if (char.isWritableWithResponse) {
              await char.writeWithResponse(base64Data);
            } else {
              await char.writeWithoutResponse(base64Data);
            }
            
            console.log('Data sent successfully');
            return { success: true };
          }
        }
      }
      
      throw new Error('Keine schreibbare Charakteristik gefunden');
    } catch (error) {
      console.error('Send data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print ZPL label (Zebra printers)
   */
  async printZPL(zplCode) {
    const device = this.getConnectedDevice();
    if (!device) {
      throw new Error('Kein Drucker verbunden');
    }
    
    if (device.type !== 'zebra') {
      throw new Error('Verbundener Drucker ist kein Zebra-Drucker');
    }

    return this.sendData(zplCode);
  }

  /**
   * Print test label
   */
  async printTestLabel() {
    const device = this.getConnectedDevice();
    if (!device) {
      throw new Error('Kein Drucker verbunden');
    }

    if (device.type === 'zebra') {
      // ZPL test label
      const zpl = `
^XA
^FO50,50^A0N,50,50^FDTSRID Mobile^FS
^FO50,120^A0N,30,30^FDTest Etikett^FS
^FO50,170^A0N,25,25^FD${new Date().toLocaleString('de-DE')}^FS
^FO50,220^BQN,2,5^FDQA,TSRID-TEST-001^FS
^XZ
      `.trim();
      
      return this.printZPL(zpl);
    } else if (device.type === 'brother') {
      // Brother ESC/P commands for simple text
      const escpCommands = [
        '\x1B@',           // Initialize printer
        '\x1BiS',          // Status request
        '\x1Bid\x00\x00',  // Print density
        'TSRID Mobile\n',
        'Test Etikett\n',
        new Date().toLocaleString('de-DE') + '\n',
        '\x0C',            // Form feed
      ].join('');
      
      return this.sendData(escpCommands);
    }
    
    throw new Error('Unbekannter Druckertyp');
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
^CF0,30
^FO30,30^FD${assetId}^FS
^CF0,20
^FO30,70^FDTyp: ${type}^FS
^FO30,100^FDHersteller: ${manufacturer}^FS
^FO30,130^FDSN: ${serialNumber}^FS
^FO30,170^BQN,2,4^FDQA,${assetId}^FS
^FO180,170^BY2^BCN,60,N,N,N^FD${serialNumber}^FS
^XZ
    `.trim();
  }

  /**
   * Print asset label
   */
  async printAssetLabel(asset) {
    const device = this.getConnectedDevice();
    if (!device) {
      throw new Error('Kein Drucker verbunden');
    }

    if (device.type === 'zebra') {
      const zpl = this.generateAssetLabelZPL(asset);
      return this.printZPL(zpl);
    } else if (device.type === 'brother') {
      // For Brother, we'd need to generate a raster image
      // This is a simplified text version
      const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
      const serialNumber = asset.manufacturer_sn || 'N/A';
      const type = asset.type_label || asset.type || 'N/A';
      
      const text = [
        '\x1B@',
        `${assetId}\n`,
        `Typ: ${type}\n`,
        `SN: ${serialNumber}\n`,
        '\x0C',
      ].join('');
      
      return this.sendData(text);
    }
    
    throw new Error('Unbekannter Druckertyp');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopScan();
    this.disconnect();
    this.manager.destroy();
  }
}

// Export singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
