/**
 * Bluetooth Printer Service for TSRID Mobile
 * 
 * Supports:
 * - Bluetooth Low Energy (BLE) for Zebra printers
 * - Bluetooth Classic (SPP) for Brother printers
 * 
 * With configurable label formats and templates
 */

import { BleManager, State as BleState } from 'react-native-ble-plx';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BROTHER_LABEL_FORMATS,
  LABEL_TEMPLATES,
} from './BrotherPrinterConfig';
import {
  generateTestLabel as generateBrotherTestLabel,
  generateAssetLabel as generateBrotherAssetLabel,
} from './BrotherPrinterCommands';

// Storage keys
const STORAGE_KEYS = {
  LABEL_FORMAT: '@printer_label_format',
  LABEL_TEMPLATE: '@printer_label_template',
  LAST_PRINTER: '@printer_last_connected',
};

// Known printer name patterns
const ZEBRA_PATTERNS = ['ZQ6', 'ZQ5', 'ZD', 'ZT', 'QLn', 'iMZ', 'ZEBRA', 'Zebra'];
const BROTHER_PATTERNS = ['QL-', 'PT-', 'TD-', 'RJ-', 'BROTHER', 'Brother'];

class BluetoothPrinterService {
  constructor() {
    this.bleManager = new BleManager();
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.isScanning = false;
    this.discoveredPrinters = [];
    this.permissionsGranted = false;
    this.connectionSubscription = null;
    
    // Label settings (defaults for 62mm continuous)
    this.labelFormat = 'DK-22205';
    this.labelTemplate = 'asset-standard';
    this.autoCut = true;
    
    // Load saved settings
    this.loadSettings();
  }

  /**
   * Load saved settings from AsyncStorage
   */
  async loadSettings() {
    try {
      const [format, template] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LABEL_FORMAT),
        AsyncStorage.getItem(STORAGE_KEYS.LABEL_TEMPLATE),
      ]);
      
      if (format) this.labelFormat = format;
      if (template) this.labelTemplate = template;
      
      console.log(`Loaded settings: Format=${this.labelFormat}, Template=${this.labelTemplate}`);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings to AsyncStorage
   */
  async saveSettings() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LABEL_FORMAT, this.labelFormat),
        AsyncStorage.setItem(STORAGE_KEYS.LABEL_TEMPLATE, this.labelTemplate),
      ]);
      console.log('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Get available label formats
   */
  getLabelFormats() {
    return Object.values(BROTHER_LABEL_FORMATS);
  }

  /**
   * Get available label templates
   */
  getLabelTemplates() {
    return Object.values(LABEL_TEMPLATES);
  }

  /**
   * Set label format
   */
  async setLabelFormat(formatId) {
    if (BROTHER_LABEL_FORMATS[formatId]) {
      this.labelFormat = formatId;
      await this.saveSettings();
      console.log(`Label format set to: ${formatId}`);
      return true;
    }
    return false;
  }

  /**
   * Set label template
   */
  async setLabelTemplate(templateId) {
    if (LABEL_TEMPLATES[templateId]) {
      this.labelTemplate = templateId;
      await this.saveSettings();
      console.log(`Label template set to: ${templateId}`);
      return true;
    }
    return false;
  }

  /**
   * Get current label format
   */
  getCurrentLabelFormat() {
    return BROTHER_LABEL_FORMATS[this.labelFormat] || BROTHER_LABEL_FORMATS['DK-22205'];
  }

  /**
   * Get current label template
   */
  getCurrentLabelTemplate() {
    return LABEL_TEMPLATES[this.labelTemplate] || LABEL_TEMPLATES['asset-standard'];
  }

  /**
   * Request all Bluetooth permissions
   */
  async requestPermissions() {
    if (Platform.OS !== 'android') {
      this.permissionsGranted = true;
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        const allGranted = 
          results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          results['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!allGranted) {
          Alert.alert(
            'Bluetooth-Berechtigung erforderlich',
            'Bitte erlauben Sie Bluetooth-Zugriff in den App-Einstellungen.',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Einstellungen', onPress: () => Linking.openSettings() }
            ]
          );
          return false;
        }
        
        this.permissionsGranted = true;
        return true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
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
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (error) {
      return false;
    }
  }

  /**
   * Request to enable Bluetooth
   */
  async requestBluetoothEnabled() {
    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch (error) {
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
      if (upperName.includes(pattern.toUpperCase())) return 'zebra';
    }
    for (const pattern of BROTHER_PATTERNS) {
      if (upperName.includes(pattern.toUpperCase())) return 'brother';
    }
    return 'generic';
  }

  /**
   * Start scanning for printers
   */
  async startScan(onDeviceFound, onScanComplete, timeoutMs = 15000) {
    if (this.isScanning) return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth-Berechtigungen wurden nicht erteilt.');
    }

    const btEnabled = await this.isBluetoothEnabled();
    if (!btEnabled) {
      const enabled = await this.requestBluetoothEnabled();
      if (!enabled) {
        throw new Error('Bluetooth ist deaktiviert.');
      }
    }

    this.isScanning = true;
    this.discoveredPrinters = [];

    console.log('Starting Bluetooth scan...');

    // Scan Bluetooth Classic (for Brother)
    try {
      // Get paired devices first
      const pairedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log(`Found ${pairedDevices.length} paired devices`);
      
      for (const device of pairedDevices) {
        const printerType = this.identifyPrinterType(device.name);
        if (printerType !== 'unknown') {
          const printerInfo = {
            id: device.address,
            name: device.name,
            address: device.address,
            rssi: -50,
            type: printerType,
            bluetoothType: 'classic',
            paired: true,
            device: device,
          };
          
          if (!this.discoveredPrinters.some(p => p.id === printerInfo.id)) {
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found paired: ${device.name} (${printerType})`);
            if (onDeviceFound) onDeviceFound(printerInfo);
          }
        }
      }

      // Discovery for unpaired
      const unpaired = await RNBluetoothClassic.startDiscovery();
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
          
          if (!this.discoveredPrinters.some(p => p.id === printerInfo.id)) {
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found: ${device.name} (${printerType})`);
            if (onDeviceFound) onDeviceFound(printerInfo);
          }
        }
      }
    } catch (error) {
      console.error('Classic scan error:', error);
    }

    // Scan BLE (for Zebra)
    try {
      this.bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) return;
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
            
            if (!this.discoveredPrinters.some(p => p.id === printerInfo.id)) {
              this.discoveredPrinters.push(printerInfo);
              console.log(`Found BLE: ${device.name} (${printerType})`);
              if (onDeviceFound) onDeviceFound(printerInfo);
            }
          }
        }
      });
    } catch (error) {
      console.error('BLE scan error:', error);
    }

    setTimeout(async () => {
      await this.stopScan();
      if (onScanComplete) onScanComplete(this.discoveredPrinters);
    }, timeoutMs);
  }

  /**
   * Stop scanning
   */
  async stopScan() {
    if (this.isScanning) {
      try { await RNBluetoothClassic.cancelDiscovery(); } catch (e) {}
      try { this.bleManager.stopDeviceScan(); } catch (e) {}
      this.isScanning = false;
    }
  }

  /**
   * Connect to printer
   */
  async connect(deviceId) {
    try {
      if (this.connectedDevice) await this.disconnect();

      const printer = this.discoveredPrinters.find(p => p.id === deviceId);
      if (!printer) {
        return { success: false, error: 'Drucker nicht gefunden.' };
      }

      console.log(`Connecting to ${printer.name}...`);

      if (printer.bluetoothType === 'classic') {
        return await this.connectClassic(printer);
      } else {
        return await this.connectBLE(printer);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect via Bluetooth Classic
   */
  async connectClassic(printer) {
    try {
      const device = await RNBluetoothClassic.connectToDevice(printer.address, {
        connectorType: 'rfcomm',
        delimiter: '\n',
        charset: 'utf-8',
      });

      this.connectedDevice = {
        id: printer.id,
        name: printer.name,
        address: printer.address,
        type: printer.type,
        bluetoothType: 'classic',
        device: device,
        connectedAt: new Date(),
      };

      // Save as last connected printer
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PRINTER, JSON.stringify({
        id: printer.id,
        name: printer.name,
        address: printer.address,
        type: printer.type,
      }));

      return { success: true, device: this.connectedDevice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect via BLE
   */
  async connectBLE(printer) {
    try {
      const device = await this.bleManager.connectToDevice(printer.id, {
        autoConnect: false,
        timeout: 15000,
      });

      await device.discoverAllServicesAndCharacteristics();

      const services = await device.services();
      let writeChar = null;

      for (const service of services) {
        const chars = await service.characteristics();
        for (const char of chars) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            if (!writeChar || char.uuid.toLowerCase().includes('38eb4a82')) {
              writeChar = char;
            }
          }
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

      return { success: true, device: this.connectedDevice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (!this.connectedDevice) return;

    try {
      if (this.connectedDevice.bluetoothType === 'classic') {
        await RNBluetoothClassic.disconnectFromDevice(this.connectedDevice.address);
      } else if (this.connectedDevice.device) {
        const isConnected = await this.connectedDevice.device.isConnected();
        if (isConnected) await this.connectedDevice.device.cancelConnection();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    this.connectedDevice = null;
    this.writeCharacteristic = null;
  }

  isConnected() {
    return this.connectedDevice !== null;
  }

  getConnectedDevice() {
    if (!this.connectedDevice) return null;
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      type: this.connectedDevice.type,
      bluetoothType: this.connectedDevice.bluetoothType,
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
        // Brother: Send as raw bytes
        await RNBluetoothClassic.writeToDevice(this.connectedDevice.address, data, 'utf-8');
        return { success: true };
      } else {
        // Zebra: Send via BLE
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
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Print test label
   */
  async printTestLabel() {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing test label on ${this.connectedDevice.name}...`);
    console.log(`Format: ${this.labelFormat}, Template: ${this.labelTemplate}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      // Brother with proper binary commands
      data = generateBrotherTestLabel();
      console.log('Brother test label generated, length:', data.length);
    } else {
      // Zebra ZPL
      const timestamp = new Date().toLocaleString('de-DE');
      data = `^XA
^CF0,40
^FO50,30^FDTSRID Mobile^FS
^CF0,25
^FO50,80^FDTest-Etikett^FS
^FO50,115^FD${timestamp}^FS
^FO50,160^BQN,2,5^FDQA,TEST-${Date.now()}^FS
^XZ`;
    }

    const result = await this.sendData(data);
    if (result.success) {
      return { success: true, message: 'Test-Etikett wurde gedruckt' };
    } else {
      throw new Error(result.error || 'Druck fehlgeschlagen');
    }
  }

  /**
   * Print asset label
   */
  async printAssetLabel(asset) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    console.log(`Printing asset label for ${asset.warehouse_asset_id || asset.asset_id}...`);
    console.log(`Format: ${this.labelFormat}, Template: ${this.labelTemplate}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      data = generateBrotherAssetLabel(asset, this.labelTemplate);
      console.log('Brother asset label generated, length:', data.length);
    } else {
      // Zebra ZPL
      const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
      const serialNumber = asset.manufacturer_sn || 'N/A';
      const type = asset.type_label || asset.type || 'N/A';
      
      data = `^XA
^CF0,35
^FO30,20^FD${assetId}^FS
^CF0,22
^FO30,60^FDTyp: ${type}^FS
^FO30,88^FDSN: ${serialNumber}^FS
^FO30,130^BQN,2,4^FDQA,${assetId}^FS
^XZ`;
    }

    const result = await this.sendData(data);
    if (result.success) {
      return { success: true, message: 'Asset-Etikett wurde gedruckt' };
    } else {
      throw new Error(result.error || 'Druck fehlgeschlagen');
    }
  }

  /**
   * Get service status
   */
  async getStatus() {
    let btEnabled = false;
    try { btEnabled = await this.isBluetoothEnabled(); } catch (e) {}
    
    return {
      version: '2.2.0',
      bluetoothEnabled: btEnabled,
      permissionsGranted: this.permissionsGranted,
      isScanning: this.isScanning,
      connectedDevice: this.getConnectedDevice(),
      labelFormat: this.getCurrentLabelFormat(),
      labelTemplate: this.getCurrentLabelTemplate(),
    };
  }

  destroy() {
    this.stopScan();
    this.disconnect();
    if (this.bleManager) this.bleManager.destroy();
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
