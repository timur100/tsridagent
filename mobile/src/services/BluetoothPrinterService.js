/**
 * Bluetooth Printer Service for TSRID Mobile
 * 
 * Supports:
 * - Bluetooth Low Energy (BLE) for Zebra printers
 * - Bluetooth Classic (SPP) for Brother printers (if available)
 * 
 * With configurable label formats and templates
 */

import { BleManager, State as BleState } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BROTHER_LABEL_FORMATS,
  LABEL_TEMPLATES,
} from './BrotherPrinterConfig';
import {
  createTestLabel as createBrotherTestLabel,
  createAssetLabel as createBrotherAssetLabel,
  createLocationLabel as createBrotherLocationLabel,
  createDeviceLabel as createBrotherDeviceLabel,
} from './BrotherRasterGenerator';

// Try to import Bluetooth Classic (optional)
let RNBluetoothClassic = null;
try {
  const BluetoothClassicModule = require('react-native-bluetooth-classic');
  RNBluetoothClassic = BluetoothClassicModule.default || BluetoothClassicModule;
  console.log('Bluetooth Classic module loaded successfully');
} catch (e) {
  console.log('Bluetooth Classic not available, using BLE only:', e.message);
}

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
      // Try Bluetooth Classic first if available
      if (RNBluetoothClassic) {
        const enabled = await RNBluetoothClassic.isBluetoothEnabled();
        return enabled;
      }
      
      // Fallback to BLE state check
      const state = await this.bleManager.state();
      return state === BleState.PoweredOn;
    } catch (error) {
      console.log('Bluetooth check error:', error.message);
      // Try BLE as fallback
      try {
        const state = await this.bleManager.state();
        return state === BleState.PoweredOn;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * Request to enable Bluetooth
   */
  async requestBluetoothEnabled() {
    try {
      if (RNBluetoothClassic) {
        return await RNBluetoothClassic.requestBluetoothEnabled();
      }
      // For BLE, we can't programmatically enable, just check state
      const state = await this.bleManager.state();
      return state === BleState.PoweredOn;
    } catch (error) {
      console.log('Request BT enable error:', error.message);
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
        throw new Error('Bluetooth ist deaktiviert. Bitte aktivieren Sie Bluetooth in den Android-Einstellungen.');
      }
    }

    this.isScanning = true;
    this.discoveredPrinters = [];
    
    // Track paired device addresses
    const pairedAddresses = new Set();

    console.log('Starting Bluetooth scan...');

    // Scan Bluetooth Classic (for Brother) - only if available
    if (RNBluetoothClassic) {
      try {
        // Get paired devices first
        const pairedDevices = await RNBluetoothClassic.getBondedDevices();
        console.log(`Found ${pairedDevices.length} bonded devices`);
      
      for (const device of pairedDevices) {
        pairedAddresses.add(device.address);
        const printerType = this.identifyPrinterType(device.name);
        if (printerType !== 'unknown') {
          const printerInfo = {
            id: device.address,
            name: device.name,
            address: device.address,
            rssi: -50,
            type: printerType,
            bluetoothType: 'classic',
            bonded: true, // Actually bonded in Android settings
            device: device,
          };
          
          if (!this.discoveredPrinters.some(p => p.id === printerInfo.id)) {
            this.discoveredPrinters.push(printerInfo);
            console.log(`Found bonded: ${device.name} (${printerType})`);
            if (onDeviceFound) onDeviceFound(printerInfo);
          }
        }
      }

        // Discovery for new devices (skip already bonded)
        console.log('Starting discovery for new devices...');
        const discovered = await RNBluetoothClassic.startDiscovery();
        for (const device of discovered) {
          // Skip if already in bonded list
          if (pairedAddresses.has(device.address)) continue;
          
          const printerType = this.identifyPrinterType(device.name);
          if (printerType !== 'unknown') {
            const printerInfo = {
              id: device.address,
              name: device.name,
              address: device.address,
              rssi: device.rssi || -60,
              type: printerType,
              bluetoothType: 'classic',
              bonded: false,
              device: device,
            };
            
            if (!this.discoveredPrinters.some(p => p.id === printerInfo.id)) {
              this.discoveredPrinters.push(printerInfo);
              console.log(`Found new: ${device.name} (${printerType})`);
              if (onDeviceFound) onDeviceFound(printerInfo);
            }
          }
        }
      } catch (error) {
        console.error('Classic scan error:', error);
      }
    } // End of RNBluetoothClassic check

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
      if (RNBluetoothClassic) {
        try { await RNBluetoothClassic.cancelDiscovery(); } catch (e) {}
      }
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
   * Connect via Bluetooth Classic with retry logic
   */
  async connectClassic(printer) {
    if (!RNBluetoothClassic) {
      return { success: false, error: 'Bluetooth Classic ist nicht verfügbar.' };
    }
    
    try {
      console.log(`Connecting to Classic device: ${printer.address}`);
      
      // First, check if already connected and disconnect
      try {
        const isConnected = await RNBluetoothClassic.isDeviceConnected(printer.address);
        if (isConnected) {
          console.log('Device already connected, disconnecting first...');
          await RNBluetoothClassic.disconnectFromDevice(printer.address);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        console.log('Pre-connection check:', e.message);
      }

      // Connection options to try
      const connectionOptions = [
        // Option 1: Standard RFCOMM
        {
          connectorType: 'rfcomm',
          delimiter: '\n',
          charset: 'latin1',
        },
        // Option 2: RFCOMM with different settings
        {
          connectorType: 'rfcomm',
          delimiter: '',
          charset: 'ascii',
        },
        // Option 3: Default connection
        {},
      ];

      let device = null;
      let lastError = null;

      for (let i = 0; i < connectionOptions.length; i++) {
        const options = connectionOptions[i];
        console.log(`Connection attempt ${i + 1}/${connectionOptions.length}...`);
        
        try {
          // Small delay between attempts
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          device = await RNBluetoothClassic.connectToDevice(printer.address, options);
          
          if (device) {
            console.log(`Connected successfully with option ${i + 1}`);
            break;
          }
        } catch (error) {
          console.log(`Attempt ${i + 1} failed:`, error.message);
          lastError = error;
          
          // If socket error, wait longer before retry
          if (error.message.includes('socket') || error.message.includes('timeout')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!device) {
        // Final fallback: Try to pair first if not bonded
        if (!printer.bonded) {
          return { 
            success: false, 
            error: 'Verbindung fehlgeschlagen. Bitte koppeln Sie den Drucker zuerst in den Android Bluetooth-Einstellungen und versuchen Sie es erneut.' 
          };
        }
        throw lastError || new Error('Verbindung konnte nicht hergestellt werden.');
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

      // Set up disconnect listener
      this.setupDisconnectListener();

      // Save as last connected printer
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PRINTER, JSON.stringify({
        id: printer.id,
        name: printer.name,
        address: printer.address,
        type: printer.type,
      }));

      console.log(`Connected to ${printer.name}`);
      return { success: true, device: this.connectedDevice };
    } catch (error) {
      console.error('Classic connection error:', error);
      this.connectedDevice = null;
      
      // Provide helpful error message
      let errorMessage = error.message;
      if (error.message.includes('socket') || error.message.includes('read failed')) {
        errorMessage = 'Bluetooth-Verbindungsfehler. Bitte:\n1. Öffnen Sie Android Bluetooth-Einstellungen\n2. Entkoppeln Sie den Drucker\n3. Koppeln Sie ihn erneut\n4. Versuchen Sie es dann nochmal';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Setup disconnect listener for Classic Bluetooth
   */
  setupDisconnectListener() {
    if (this.disconnectSubscription) {
      try {
        this.disconnectSubscription.remove();
      } catch (e) {
        console.log('Error removing disconnect subscription:', e);
      }
      this.disconnectSubscription = null;
    }
    
    if (this.connectedDevice?.address && RNBluetoothClassic) {
      try {
        // react-native-bluetooth-classic uses a different API
        // The callback should be the only argument for the subscription
        this.disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(
          (event) => {
            console.log('Device disconnected event:', event);
            if (event?.device?.address === this.connectedDevice?.address) {
              console.log(`Device ${event?.device?.name || 'unknown'} disconnected`);
              // Don't clear connectedDevice immediately - allow reconnection
            }
          }
        );
      } catch (e) {
        console.log('Error setting up disconnect listener:', e);
        // Continue without listener - not critical
      }
    }
  }

  /**
   * Check if currently connected and reconnect if needed
   */
  async ensureConnected() {
    if (!this.connectedDevice) {
      return false;
    }
    
    try {
      if (this.connectedDevice.bluetoothType === 'classic' && RNBluetoothClassic) {
        const isConnected = await RNBluetoothClassic.isDeviceConnected(this.connectedDevice.address);
        if (!isConnected) {
          console.log('Connection lost, attempting to reconnect...');
          const result = await this.connectClassic(this.connectedDevice);
          return result.success;
        }
        return true;
      }
      return true;
    } catch (error) {
      console.error('ensureConnected error:', error);
      return false;
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
      if (this.connectedDevice.bluetoothType === 'classic' && RNBluetoothClassic) {
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

    // Ensure connection is still active (with retry)
    let isConnected = await this.ensureConnected();
    if (!isConnected) {
      // Try one more time after a short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      isConnected = await this.ensureConnected();
      if (!isConnected) {
        throw new Error('Verbindung zum Drucker verloren. Bitte erneut verbinden.');
      }
    }

    try {
      if (this.connectedDevice.bluetoothType === 'classic') {
        // Brother: Send binary raster data
        console.log('Sending to Brother via Classic BT, data length:', data.length);
        
        // Convert Uint8Array to string for sending
        let dataStr;
        if (data instanceof Uint8Array) {
          // Convert binary to latin1 string
          dataStr = '';
          for (let i = 0; i < data.length; i++) {
            dataStr += String.fromCharCode(data[i]);
          }
        } else {
          dataStr = data;
        }
        
        // Ensure RNBluetoothClassic is available
        if (!RNBluetoothClassic) {
          throw new Error('Bluetooth Classic ist nicht verfügbar.');
        }
        
        // Send data using the device object if available
        if (this.connectedDevice.device && typeof this.connectedDevice.device.write === 'function') {
          // Use device.write() method
          console.log('Using device.write() method');
          await this.connectedDevice.device.write(dataStr, 'latin1');
        } else {
          // Fallback to writeToDevice
          console.log('Using writeToDevice() method');
          
          // Send in chunks with proper pacing for Brother
          const chunkSize = 512; // Smaller chunks for better stability
          for (let i = 0; i < dataStr.length; i += chunkSize) {
            const chunk = dataStr.slice(i, i + chunkSize);
            
            try {
              await RNBluetoothClassic.writeToDevice(this.connectedDevice.address, chunk, 'latin1');
            } catch (writeError) {
              console.log('Write error, retrying...', writeError.message);
              // Wait and retry once
              await new Promise(resolve => setTimeout(resolve, 200));
              await RNBluetoothClassic.writeToDevice(this.connectedDevice.address, chunk, 'latin1');
            }
            
            // Delay between chunks for printer to process
            if (i + chunkSize < dataStr.length) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }
        
        // Wait for printer to finish processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('Data sent successfully to Brother printer');
        return { success: true };
      } else {
        // Zebra: Send via BLE
        console.log('Sending to Zebra via BLE, data length:', data.length);
        
        let dataToSend = data;
        if (data instanceof Uint8Array) {
          dataToSend = new TextDecoder('latin1').decode(data);
        }
        
        const base64Data = Buffer.from(dataToSend, 'latin1').toString('base64');
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
        console.log('Data sent successfully to Zebra');
        return { success: true };
      }
    } catch (error) {
      console.error('Send data error:', error);
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
    console.log(`Printer type: ${this.connectedDevice.type}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      // Brother: Generate raster graphics data with real QR code
      data = await createBrotherTestLabel();
      console.log('Brother raster test label generated, length:', data.length, 'bytes');
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
   * Print asset label (TSRID Standard Format)
   */
  async printAssetLabel(asset) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
    console.log(`Printing asset label for ${assetId}...`);
    console.log(`Printer type: ${this.connectedDevice.type}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      // Brother: Generate raster graphics with real QR code
      data = await createBrotherAssetLabel(asset);
      console.log('Brother raster asset label generated, length:', data.length, 'bytes');
    } else {
      // Zebra ZPL
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
   * Print location/station label
   * Contains station code as barcode for scanning to navigate to the station
   */
  async printLocationLabel(location) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    const locationCode = location.location_code || 'N/A';
    console.log(`Printing location label for ${locationCode}...`);
    console.log(`Printer type: ${this.connectedDevice.type}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      // Brother: Generate raster graphics with barcode
      data = await createBrotherLocationLabel(location);
      console.log('Brother raster location label generated, length:', data.length, 'bytes');
    } else {
      // Zebra ZPL for location label
      const stationName = (location.station_name || 'N/A').substring(0, 30);
      const street = (location.street || '-').substring(0, 35);
      const cityLine = `${location.postal_code || ''} ${location.city || '-'}`.substring(0, 35);
      const phone = location.phone || '-';
      const manager = (location.manager || '-').substring(0, 25);
      
      data = `^XA
^CF0,40
^FO30,20^FD${locationCode}^FS
^CF0,25
^FO30,70^FD${stationName}^FS
^FO30,100^FD${street}^FS
^FO30,130^FD${cityLine}^FS
^CF0,20
^FO30,165^FDTel: ${phone}^FS
^FO30,190^FDManager: ${manager}^FS
^FO30,230^BY2^BCN,60,Y,N,N^FD${locationCode}^FS
^XZ`;
    }

    const result = await this.sendData(data);
    if (result.success) {
      return { success: true, message: 'Standort-Etikett wurde gedruckt' };
    } else {
      throw new Error(result.error || 'Druck fehlgeschlagen');
    }
  }

  /**
   * Print device label
   * Contains device_id as barcode for scanning
   */
  async printDeviceLabel(device) {
    if (!this.connectedDevice) {
      throw new Error('Kein Drucker verbunden');
    }

    const deviceId = device.device_id || 'N/A';
    console.log(`Printing device label for ${deviceId}...`);
    console.log(`Printer type: ${this.connectedDevice.type}`);

    let data;
    
    if (this.connectedDevice.type === 'brother') {
      // Brother: Generate raster graphics with barcode
      data = await createBrotherDeviceLabel(device);
      console.log('Brother raster device label generated, length:', data.length, 'bytes');
    } else {
      // Zebra ZPL for device label
      const locationCode = device.locationcode || device.location_code || '-';
      const street = (device.street || '-').substring(0, 35);
      const cityLine = `${device.zip || ''} ${device.city || '-'}`.substring(0, 35);
      const phone = device.phone || device.telefon || '-';
      const snPc = device.sn_pc || '-';
      const snSc = device.sn_sc || '-';
      const status = device.status || '-';
      
      data = `^XA
^CF0,40
^FO30,20^FD${deviceId}^FS
^CF0,22
^FO30,65^FDSTATUS: ${status.toUpperCase()}^FS
^FO30,90^FDSTANDORT: ${locationCode}^FS
^CF0,18
^FO30,120^FD${street}^FS
^FO30,142^FD${cityLine}^FS
^FO30,165^FDTEL: ${phone}^FS
^FO30,188^FDSN-PC: ${snPc}  SN-SC: ${snSc}^FS
^FO30,220^BY2^BCN,50,Y,N,N^FD${deviceId}^FS
^XZ`;
    }

    const result = await this.sendData(data);
    if (result.success) {
      return { success: true, message: 'Geräte-Etikett wurde gedruckt' };
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
