/**
 * Real Bluetooth Printer Service for TSRID Mobile
 * Uses react-native-ble-plx for actual Bluetooth Low Energy communication
 * 
 * Supports:
 * - Zebra printers (ZPL format) - ZQ630, ZQ620, ZQ520, ZD series
 * - Brother printers (ESC/P format) - QL-820NWB, QL-1110NWB
 */

import { BleManager, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Buffer } from 'buffer';

// Zebra printer service UUIDs (Link-OS)
const ZEBRA_WRITE_SERVICE = '38eb4a80-c570-11e3-9507-0002a5d5c51b';
const ZEBRA_WRITE_CHARACTERISTIC = '38eb4a82-c570-11e3-9507-0002a5d5c51b';
const ZEBRA_READ_CHARACTERISTIC = '38eb4a81-c570-11e3-9507-0002a5d5c51b';

// Standard Serial Port Profile UUID (used by many printers)
const SPP_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb';

// Known printer name patterns
const ZEBRA_PATTERNS = ['ZQ6', 'ZQ5', 'ZD', 'ZT', 'QLn', 'iMZ', 'ZEBRA', 'Zebra'];
const BROTHER_PATTERNS = ['QL-', 'PT-', 'TD-', 'RJ-', 'BROTHER', 'Brother'];

class BluetoothPrinterService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.isScanning = false;
    this.discoveredPrinters = [];
    this.permissionsGranted = false;
    this.printQueue = [];
    this.connectionSubscription = null;
  }

  /**
   * Initialize the BLE manager and check state
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const subscription = this.manager.onStateChange((state) => {
        if (state === State.PoweredOn) {
          subscription.remove();
          resolve(true);
        } else if (state === State.PoweredOff) {
          subscription.remove();
          reject(new Error('Bluetooth ist ausgeschaltet. Bitte aktivieren Sie Bluetooth.'));
        } else if (state === State.Unauthorized) {
          subscription.remove();
          reject(new Error('Bluetooth-Berechtigung wurde nicht erteilt.'));
        }
      }, true);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        subscription.remove();
        reject(new Error('Bluetooth-Initialisierung Timeout'));
      }, 10000);
    });
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestPermissions() {
    if (Platform.OS !== 'android') {
      this.permissionsGranted = true;
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      console.log(`Android API Level: ${apiLevel}`);
      
      if (apiLevel >= 31) {
        // Android 12+ requires new Bluetooth permissions
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        console.log('Permission results:', results);
        
        const allGranted = 
          results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          results['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!allGranted) {
          const neverAskAgain = 
            results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
            results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
          
          if (neverAskAgain) {
            Alert.alert(
              'Bluetooth-Berechtigung erforderlich',
              'Bitte erlauben Sie Bluetooth-Zugriff in den App-Einstellungen.',
              [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Einstellungen öffnen', onPress: () => Linking.openSettings() }
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
            buttonNeutral: 'Später',
            buttonNegative: 'Ablehnen',
            buttonPositive: 'Erlauben',
          }
        );
        
        this.permissionsGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.permissionsGranted;
      }
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }

  /**
   * Identify printer type from device name
   */
  identifyPrinterType(deviceName) {
    if (!deviceName) return 'unknown';
    
    const upperName = deviceName.toUpperCase();
    
    for (const pattern of ZEBRA_PATTERNS) {
      if (upperName.includes(pattern.toUpperCase())) {
        return 'zebra';
      }
    }
    
    for (const pattern of BROTHER_PATTERNS) {
      if (upperName.includes(pattern.toUpperCase())) {
        return 'brother';
      }
    }
    
    return 'generic';
  }

  /**
   * Start scanning for Bluetooth printers
   */
  async startScan(onDeviceFound, onScanComplete, timeoutMs = 15000) {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth-Berechtigungen wurden nicht erteilt.');
    }

    // Initialize BLE
    try {
      await this.initialize();
    } catch (error) {
      throw error;
    }

    this.isScanning = true;
    this.discoveredPrinters = [];

    console.log('Starting real Bluetooth scan...');

    // Start scanning for all devices
    this.manager.startDeviceScan(
      null, // Scan for all services
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }

        if (device && device.name) {
          const printerType = this.identifyPrinterType(device.name);
          
          // Accept all printer types (zebra, brother, generic)
          if (printerType !== 'unknown') {
            const exists = this.discoveredPrinters.some(p => p.id === device.id);
            
            if (!exists) {
              const printerInfo = {
                id: device.id,
                name: device.name,
                localName: device.localName,
                rssi: device.rssi,
                type: printerType,
                manufacturerData: device.manufacturerData,
                serviceUUIDs: device.serviceUUIDs,
                device: device,
              };
              
              this.discoveredPrinters.push(printerInfo);
              console.log(`Found printer: ${device.name} (${printerType}) RSSI: ${device.rssi}`);
              
              if (onDeviceFound) {
                onDeviceFound(printerInfo);
              }
            }
          }
        }
      }
    );

    // Stop after timeout
    setTimeout(() => {
      this.stopScan();
      console.log(`Scan complete. Found ${this.discoveredPrinters.length} printers.`);
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
      console.log('Bluetooth scan stopped');
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

      // Connect to device
      const device = await this.manager.connectToDevice(deviceId, {
        autoConnect: false,
        timeout: 15000,
      });

      console.log(`Connected to ${device.name}, discovering services...`);

      // Discover all services and characteristics
      await device.discoverAllServicesAndCharacteristics();

      // Find writable characteristic
      const services = await device.services();
      let writeChar = null;

      for (const service of services) {
        const characteristics = await service.characteristics();
        console.log(`Service: ${service.uuid}, Characteristics: ${characteristics.length}`);
        
        for (const char of characteristics) {
          console.log(`  Characteristic: ${char.uuid}, Writable: ${char.isWritableWithResponse || char.isWritableWithoutResponse}`);
          
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            // Prefer Zebra-specific characteristic
            if (char.uuid.toLowerCase().includes('38eb4a82')) {
              writeChar = char;
              console.log('Found Zebra write characteristic');
              break;
            }
            // Otherwise use first writable characteristic
            if (!writeChar) {
              writeChar = char;
            }
          }
        }
        
        if (writeChar && writeChar.uuid.toLowerCase().includes('38eb4a82')) {
          break;
        }
      }

      if (!writeChar) {
        throw new Error('Keine schreibbare Charakteristik gefunden. Drucker möglicherweise nicht kompatibel.');
      }

      this.writeCharacteristic = writeChar;
      this.connectedDevice = {
        id: device.id,
        name: device.name,
        type: this.identifyPrinterType(device.name),
        device: device,
        writeCharacteristic: writeChar,
        connectedAt: new Date(),
      };

      // Monitor connection state
      this.connectionSubscription = device.onDisconnected((error, disconnectedDevice) => {
        console.log(`Device ${disconnectedDevice?.name} disconnected`);
        this.connectedDevice = null;
        this.writeCharacteristic = null;
      });

      console.log(`Successfully connected to ${device.name}`);

      return {
        success: true,
        device: this.connectedDevice,
      };
    } catch (error) {
      console.error('Connection failed:', error);
      return {
        success: false,
        error: error.message || 'Verbindung fehlgeschlagen',
      };
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    if (this.connectionSubscription) {
      this.connectionSubscription.remove();
      this.connectionSubscription = null;
    }

    if (this.connectedDevice?.device) {
      try {
        const isConnected = await this.connectedDevice.device.isConnected();
        if (isConnected) {
          await this.connectedDevice.device.cancelConnection();
        }
        console.log('Disconnected from printer');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }

    this.connectedDevice = null;
    this.writeCharacteristic = null;
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
      type: this.connectedDevice.type,
      connectedAt: this.connectedDevice.connectedAt,
    };
  }

  /**
   * Send raw data to printer
   */
  async sendData(data) {
    if (!this.connectedDevice || !this.writeCharacteristic) {
      throw new Error('Kein Drucker verbunden');
    }

    try {
      // Convert string to base64
      const base64Data = Buffer.from(data, 'utf-8').toString('base64');
      
      // Send in chunks if data is large (BLE MTU is typically 20-512 bytes)
      const chunkSize = 200; // Safe chunk size
      const chunks = [];
      
      for (let i = 0; i < base64Data.length; i += chunkSize) {
        chunks.push(base64Data.slice(i, i + chunkSize));
      }

      console.log(`Sending ${chunks.length} chunks to printer...`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        if (this.writeCharacteristic.isWritableWithResponse) {
          await this.writeCharacteristic.writeWithResponse(chunk);
        } else {
          await this.writeCharacteristic.writeWithoutResponse(chunk);
        }
        
        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('Data sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Send data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate ZPL for test label
   */
  generateTestLabelZPL() {
    const timestamp = new Date().toLocaleString('de-DE');
    return `^XA
^CF0,40
^FO50,30^FDTSRID Mobile^FS
^CF0,25
^FO50,80^FDTest-Etikett^FS
^FO50,115^FD${timestamp}^FS
^FO50,160^BQN,2,5^FDQA,TSRID-TEST-${Date.now()}^FS
^FO220,160^BY2^BCN,50,N,N,N^FD123456789^FS
^XZ`;
  }

  /**
   * Generate Brother ESC/P commands for test label
   */
  generateTestLabelBrother() {
    const timestamp = new Date().toLocaleString('de-DE');
    // Brother QL printers use raster commands, simplified text version
    return `\x1B@\x1BiS\x1Bid\x00\x00TSRID Mobile\nTest-Etikett\n${timestamp}\n\x0C`;
  }

  /**
   * Print test label
   */
  async printTestLabel() {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing test label on ${this.connectedDevice.name}...`);

    let data;
    if (this.connectedDevice.type === 'zebra') {
      data = this.generateTestLabelZPL();
    } else if (this.connectedDevice.type === 'brother') {
      data = this.generateTestLabelBrother();
    } else {
      // Generic: try ZPL
      data = this.generateTestLabelZPL();
    }

    const result = await this.sendData(data);
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Test-Etikett wurde gedruckt',
        printedAt: new Date().toISOString(),
      };
    } else {
      throw new Error(result.error || 'Druck fehlgeschlagen');
    }
  }

  /**
   * Generate ZPL for asset label
   */
  generateAssetLabelZPL(asset) {
    const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
    const serialNumber = asset.manufacturer_sn || 'N/A';
    const type = asset.type_label || asset.type || 'N/A';
    const manufacturer = asset.manufacturer || 'N/A';
    
    return `^XA
^CF0,35
^FO30,20^FD${assetId}^FS
^CF0,22
^FO30,60^FDTyp: ${type}^FS
^FO30,88^FDHersteller: ${manufacturer}^FS
^FO30,116^FDSN: ${serialNumber}^FS
^FO30,155^BQN,2,4^FDQA,${assetId}^FS
^FO170,155^BY2^BCN,50,N,N,N^FD${serialNumber}^FS
^XZ`;
  }

  /**
   * Print asset label
   */
  async printAssetLabel(asset) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing asset label for ${asset.warehouse_asset_id || asset.asset_id}...`);

    const zpl = this.generateAssetLabelZPL(asset);
    const result = await this.sendData(zpl);
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Asset-Etikett wurde gedruckt',
        asset: asset.warehouse_asset_id || asset.asset_id,
      };
    } else {
      throw new Error(result.error || 'Druck fehlgeschlagen');
    }
  }

  /**
   * Print multiple labels
   */
  async printMultipleLabels(assets) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    const results = [];
    
    for (const asset of assets) {
      try {
        const result = await this.printAssetLabel(asset);
        results.push({ success: true, asset: asset.warehouse_asset_id || asset.asset_id });
        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({ success: false, asset: asset.warehouse_asset_id || asset.asset_id, error: error.message });
      }
    }

    return {
      total: assets.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Get service status
   */
  async getStatus() {
    const bleState = await this.manager.state();
    
    return {
      version: '2.0.0',
      mode: 'native',
      bleState: bleState,
      permissionsGranted: this.permissionsGranted,
      isScanning: this.isScanning,
      connectedDevice: this.getConnectedDevice(),
      discoveredPrinters: this.discoveredPrinters.length,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopScan();
    this.disconnect();
    if (this.manager) {
      this.manager.destroy();
    }
  }
}

// Export singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
