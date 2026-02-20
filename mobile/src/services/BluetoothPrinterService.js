/**
 * Bluetooth Printer Service for TSRID Mobile
 * 
 * Supports BOTH:
 * - Bluetooth Low Energy (BLE) for Zebra printers via react-native-ble-plx
 * - Bluetooth Classic (SPP) for Brother printers via react-native-bluetooth-classic
 */

import { BleManager, State as BleState } from 'react-native-ble-plx';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Buffer } from 'buffer';

// Known printer name patterns
const ZEBRA_PATTERNS = ['ZQ6', 'ZQ5', 'ZD', 'ZT', 'QLn', 'iMZ', 'ZEBRA', 'Zebra'];
const BROTHER_PATTERNS = ['QL-', 'PT-', 'TD-', 'RJ-', 'BROTHER', 'Brother'];

class BluetoothPrinterService {
  constructor() {
    // BLE Manager for Zebra printers
    this.bleManager = new BleManager();
    
    // Connection state
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.isScanning = false;
    this.discoveredPrinters = [];
    this.permissionsGranted = false;
    this.connectionSubscription = null;
  }

  /**
   * Request all Bluetooth permissions (Android 12+)
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
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled() {
    try {
      // Check Classic Bluetooth
      const classicEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      return classicEnabled;
    } catch (error) {
      console.error('Bluetooth check error:', error);
      return false;
    }
  }

  /**
   * Request to enable Bluetooth
   */
  async requestBluetoothEnabled() {
    try {
      const enabled = await RNBluetoothClassic.requestBluetoothEnabled();
      return enabled;
    } catch (error) {
      console.error('Enable Bluetooth error:', error);
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
   * Determine Bluetooth type for printer
   * Brother uses Classic, Zebra uses BLE
   */
  getBluetoothType(printerType) {
    if (printerType === 'brother') {
      return 'classic';
    }
    return 'ble'; // Zebra and generic use BLE
  }

  /**
   * Start scanning for ALL Bluetooth printers (both BLE and Classic)
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

    // Check if Bluetooth is enabled
    const btEnabled = await this.isBluetoothEnabled();
    if (!btEnabled) {
      const enabled = await this.requestBluetoothEnabled();
      if (!enabled) {
        throw new Error('Bluetooth ist deaktiviert. Bitte aktivieren Sie Bluetooth.');
      }
    }

    this.isScanning = true;
    this.discoveredPrinters = [];

    console.log('Starting combined Bluetooth scan (BLE + Classic)...');

    // Scan for Bluetooth Classic devices (Brother printers)
    try {
      console.log('Scanning for Bluetooth Classic devices...');
      
      // Get already paired devices
      const pairedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log(`Found ${pairedDevices.length} paired Classic devices`);
      
      for (const device of pairedDevices) {
        const printerType = this.identifyPrinterType(device.name);
        if (printerType !== 'unknown') {
          const printerInfo = {
            id: device.address,
            name: device.name,
            address: device.address,
            rssi: -50, // Paired devices don't have RSSI
            type: printerType,
            bluetoothType: 'classic',
            paired: true,
            device: device,
          };
          
          const exists = this.discoveredPrinters.some(p => p.id === printerInfo.id);
          if (!exists) {
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found paired printer: ${device.name} (${printerType}) - Classic`);
            if (onDeviceFound) {
              onDeviceFound(printerInfo);
            }
          }
        }
      }

      // Start discovery for unpaired devices
      console.log('Starting Classic Bluetooth discovery...');
      const unpaired = await RNBluetoothClassic.startDiscovery();
      console.log(`Discovery found ${unpaired.length} devices`);
      
      for (const device of unpaired) {
        const printerType = this.identifyPrinterType(device.name);
        if (printerType !== 'unknown') {
          const printerInfo = {
            id: device.address,
            name: device.name,
            address: device.address,
            rssi: device.rssi || -60,
            type: printerType,
            bluetoothType: 'classic',
            paired: false,
            device: device,
          };
          
          const exists = this.discoveredPrinters.some(p => p.id === printerInfo.id);
          if (!exists) {
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found printer: ${device.name} (${printerType}) - Classic`);
            if (onDeviceFound) {
              onDeviceFound(printerInfo);
            }
          }
        }
      }
    } catch (classicError) {
      console.error('Classic Bluetooth scan error:', classicError);
    }

    // Also scan for BLE devices (Zebra printers)
    try {
      console.log('Scanning for BLE devices...');
      
      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('BLE scan error:', error);
            return;
          }

          if (device && device.name) {
            const printerType = this.identifyPrinterType(device.name);
            
            if (printerType !== 'unknown') {
              const printerInfo = {
                id: device.id,
                name: device.name,
                address: device.id,
                rssi: device.rssi,
                type: printerType,
                bluetoothType: 'ble',
                paired: false,
                device: device,
              };
              
              const exists = this.discoveredPrinters.some(p => p.id === printerInfo.id);
              if (!exists) {
                this.discoveredPrinters.push(printerInfo);
                console.log(`Found printer: ${device.name} (${printerType}) - BLE`);
                if (onDeviceFound) {
                  onDeviceFound(printerInfo);
                }
              }
            }
          }
        }
      );
    } catch (bleError) {
      console.error('BLE scan error:', bleError);
    }

    // Stop after timeout
    setTimeout(async () => {
      await this.stopScan();
      console.log(`Scan complete. Found ${this.discoveredPrinters.length} printers.`);
      if (onScanComplete) {
        onScanComplete(this.discoveredPrinters);
      }
    }, timeoutMs);
  }

  /**
   * Stop scanning
   */
  async stopScan() {
    if (this.isScanning) {
      try {
        // Stop Classic discovery
        await RNBluetoothClassic.cancelDiscovery();
      } catch (e) {
        console.log('Classic discovery stop:', e.message);
      }
      
      try {
        // Stop BLE scan
        this.bleManager.stopDeviceScan();
      } catch (e) {
        console.log('BLE scan stop:', e.message);
      }
      
      this.isScanning = false;
      console.log('Bluetooth scan stopped');
    }
  }

  /**
   * Connect to a printer (handles both Classic and BLE)
   */
  async connect(deviceId) {
    try {
      // Disconnect existing connection
      if (this.connectedDevice) {
        await this.disconnect();
      }

      // Find the printer in discovered list
      const printer = this.discoveredPrinters.find(p => p.id === deviceId);
      
      if (!printer) {
        return {
          success: false,
          error: 'Drucker nicht gefunden. Bitte erneut suchen.',
        };
      }

      console.log(`Connecting to ${printer.name} via ${printer.bluetoothType}...`);

      if (printer.bluetoothType === 'classic') {
        // Connect via Bluetooth Classic
        return await this.connectClassic(printer);
      } else {
        // Connect via BLE
        return await this.connectBLE(printer);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      return {
        success: false,
        error: error.message || 'Verbindung fehlgeschlagen',
      };
    }
  }

  /**
   * Connect via Bluetooth Classic (for Brother printers)
   */
  async connectClassic(printer) {
    try {
      console.log(`Connecting to Classic device: ${printer.address}`);
      
      // Connect to the device
      const device = await RNBluetoothClassic.connectToDevice(printer.address, {
        connectorType: 'rfcomm',
        delimiter: '\n',
        charset: 'utf-8',
      });

      if (!device) {
        throw new Error('Verbindung fehlgeschlagen');
      }

      this.connectedDevice = {
        id: printer.id,
        name: printer.name,
        address: printer.address,
        type: printer.type,
        bluetoothType: 'classic',
        device: device,
        connectedAt: new Date(),
      };

      console.log(`Connected to ${printer.name} via Bluetooth Classic`);

      return {
        success: true,
        device: this.connectedDevice,
      };
    } catch (error) {
      console.error('Classic connection error:', error);
      return {
        success: false,
        error: `Verbindung fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Connect via BLE (for Zebra printers)
   */
  async connectBLE(printer) {
    try {
      console.log(`Connecting to BLE device: ${printer.id}`);
      
      const device = await this.bleManager.connectToDevice(printer.id, {
        autoConnect: false,
        timeout: 15000,
      });

      await device.discoverAllServicesAndCharacteristics();

      // Find writable characteristic
      const services = await device.services();
      let writeChar = null;

      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            if (char.uuid.toLowerCase().includes('38eb4a82')) {
              writeChar = char;
              break;
            }
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
        throw new Error('Keine schreibbare Charakteristik gefunden');
      }

      this.writeCharacteristic = writeChar;
      this.connectedDevice = {
        id: printer.id,
        name: printer.name,
        address: printer.id,
        type: printer.type,
        bluetoothType: 'ble',
        device: device,
        writeCharacteristic: writeChar,
        connectedAt: new Date(),
      };

      console.log(`Connected to ${printer.name} via BLE`);

      return {
        success: true,
        device: this.connectedDevice,
      };
    } catch (error) {
      console.error('BLE connection error:', error);
      return {
        success: false,
        error: `Verbindung fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    if (!this.connectedDevice) return;

    try {
      if (this.connectedDevice.bluetoothType === 'classic') {
        await RNBluetoothClassic.disconnectFromDevice(this.connectedDevice.address);
      } else {
        if (this.connectedDevice.device) {
          const isConnected = await this.connectedDevice.device.isConnected();
          if (isConnected) {
            await this.connectedDevice.device.cancelConnection();
          }
        }
      }
      console.log('Disconnected from printer');
    } catch (error) {
      console.error('Disconnect error:', error);
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
      bluetoothType: this.connectedDevice.bluetoothType,
      connectedAt: this.connectedDevice.connectedAt,
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
      if (this.connectedDevice.bluetoothType === 'classic') {
        // Send via Bluetooth Classic
        await RNBluetoothClassic.writeToDevice(this.connectedDevice.address, data);
        console.log('Data sent via Classic Bluetooth');
        return { success: true };
      } else {
        // Send via BLE
        const base64Data = Buffer.from(data, 'utf-8').toString('base64');
        const chunkSize = 200;
        
        for (let i = 0; i < base64Data.length; i += chunkSize) {
          const chunk = base64Data.slice(i, i + chunkSize);
          
          if (this.writeCharacteristic.isWritableWithResponse) {
            await this.writeCharacteristic.writeWithResponse(chunk);
          } else {
            await this.writeCharacteristic.writeWithoutResponse(chunk);
          }
          
          if (i + chunkSize < base64Data.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        console.log('Data sent via BLE');
        return { success: true };
      }
    } catch (error) {
      console.error('Send data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate ZPL for test label (Zebra)
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
^XZ`;
  }

  /**
   * Generate ESC/P commands for Brother printers
   */
  generateTestLabelBrother() {
    const timestamp = new Date().toLocaleString('de-DE');
    // Brother QL uses ESC/P commands
    const ESC = '\x1B';
    const commands = [
      `${ESC}@`,              // Initialize
      `${ESC}iS`,             // Status info
      `TSRID Mobile\n`,
      `Test-Etikett\n`,
      `${timestamp}\n`,
      '\x0C',                 // Form feed / cut
    ];
    return commands.join('');
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
      // Default to ZPL for generic
      data = this.generateTestLabelZPL();
    }

    const result = await this.sendData(data);
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Test-Etikett wurde gedruckt',
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
^XZ`;
  }

  /**
   * Generate Brother ESC/P for asset label
   */
  generateAssetLabelBrother(asset) {
    const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
    const serialNumber = asset.manufacturer_sn || 'N/A';
    const type = asset.type_label || asset.type || 'N/A';
    const ESC = '\x1B';
    
    return [
      `${ESC}@`,
      `${assetId}\n`,
      `Typ: ${type}\n`,
      `SN: ${serialNumber}\n`,
      '\x0C',
    ].join('');
  }

  /**
   * Print asset label
   */
  async printAssetLabel(asset) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    let data;
    if (this.connectedDevice.type === 'zebra') {
      data = this.generateAssetLabelZPL(asset);
    } else if (this.connectedDevice.type === 'brother') {
      data = this.generateAssetLabelBrother(asset);
    } else {
      data = this.generateAssetLabelZPL(asset);
    }

    const result = await this.sendData(data);
    
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
   * Get service status
   */
  async getStatus() {
    let btEnabled = false;
    try {
      btEnabled = await this.isBluetoothEnabled();
    } catch (e) {}
    
    return {
      version: '2.1.0',
      mode: 'native-hybrid',
      bluetoothEnabled: btEnabled,
      permissionsGranted: this.permissionsGranted,
      isScanning: this.isScanning,
      connectedDevice: this.getConnectedDevice(),
      discoveredPrinters: this.discoveredPrinters.length,
      supportedTypes: {
        zebra: 'BLE (Bluetooth Low Energy)',
        brother: 'Classic (SPP)',
      },
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopScan();
    this.disconnect();
    if (this.bleManager) {
      this.bleManager.destroy();
    }
  }
}

// Export singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
