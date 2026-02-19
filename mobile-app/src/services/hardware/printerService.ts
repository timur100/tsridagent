/**
 * TSRID Mobile App - Bluetooth Printer Service
 * 
 * Unterstützt:
 * - Zebra ZQ630 (ZPL)
 * - Brother QL-820NWB (ESC/P)
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { SUPPORTED_PRINTERS, BLUETOOTH_UUIDS, ZPL_TEMPLATES, PrinterConfig } from '../../config/printers';

// Drucker-Status
export interface PrinterStatus {
  connected: boolean;
  device: Device | null;
  config: PrinterConfig | null;
  batteryLevel?: number;
  paperStatus?: 'ok' | 'low' | 'out';
}

// Label-Daten
export interface LabelData {
  assetId: string;
  serialNumber: string;
  type?: string;
  qrData?: string;
  additionalText?: string;
}

class PrinterService {
  private bleManager: BleManager;
  private connectedDevice: Device | null = null;
  private printerConfig: PrinterConfig | null = null;
  private isScanning: boolean = false;

  constructor() {
    this.bleManager = new BleManager();
  }

  /**
   * Bluetooth-Berechtigungen anfordern (Android)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('[Printer] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Bluetooth-Status prüfen
   */
  async checkBluetoothState(): Promise<State> {
    return this.bleManager.state();
  }

  /**
   * Nach Druckern scannen
   */
  async scanForPrinters(
    onDeviceFound: (device: Device, printerConfig?: PrinterConfig) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    if (this.isScanning) {
      console.warn('[Printer] Already scanning');
      return;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth-Berechtigungen fehlen');
    }

    const btState = await this.checkBluetoothState();
    if (btState !== State.PoweredOn) {
      throw new Error('Bluetooth ist nicht aktiviert');
    }

    this.isScanning = true;
    const foundDevices = new Set<string>();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.bleManager.stopDeviceScan();
        this.isScanning = false;
        resolve();
      }, timeoutMs);

      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          this.isScanning = false;
          reject(error);
          return;
        }

        if (device && device.name && !foundDevices.has(device.id)) {
          foundDevices.add(device.id);

          // Prüfen ob es ein unterstützter Drucker ist
          const printerConfig = this.identifyPrinter(device);
          
          if (printerConfig || this.isPotentialPrinter(device)) {
            onDeviceFound(device, printerConfig);
          }
        }
      });
    });
  }

  /**
   * Drucker identifizieren anhand des Namens
   */
  private identifyPrinter(device: Device): PrinterConfig | undefined {
    const name = device.name?.toUpperCase() || '';
    
    if (name.includes('ZQ630') || name.includes('ZEBRA')) {
      return SUPPORTED_PRINTERS.find(p => p.id === 'zebra_zq630');
    }
    
    if (name.includes('QL-820') || name.includes('BROTHER')) {
      return SUPPORTED_PRINTERS.find(p => p.id === 'brother_ql820nwb');
    }

    return undefined;
  }

  /**
   * Prüfen ob Gerät ein potenzieller Drucker ist
   */
  private isPotentialPrinter(device: Device): boolean {
    const name = device.name?.toUpperCase() || '';
    const printerKeywords = ['PRINTER', 'PRINT', 'ZQ', 'QL', 'ZD', 'ZEBRA', 'BROTHER', 'LABEL'];
    return printerKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * Mit Drucker verbinden
   */
  async connect(device: Device): Promise<boolean> {
    try {
      // Bestehende Verbindung trennen
      if (this.connectedDevice) {
        await this.disconnect();
      }

      console.log(`[Printer] Connecting to ${device.name}...`);
      
      const connectedDevice = await device.connect({
        timeout: 10000,
        autoConnect: false
      });

      // Services entdecken
      await connectedDevice.discoverAllServicesAndCharacteristics();

      this.connectedDevice = connectedDevice;
      this.printerConfig = this.identifyPrinter(device) || null;

      console.log(`[Printer] Connected to ${device.name}`);
      return true;
    } catch (error) {
      console.error('[Printer] Connection failed:', error);
      return false;
    }
  }

  /**
   * Verbindung trennen
   */
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (error) {
        console.warn('[Printer] Disconnect error:', error);
      }
      this.connectedDevice = null;
      this.printerConfig = null;
    }
  }

  /**
   * Label drucken
   */
  async printLabel(labelData: LabelData, templateId?: string): Promise<boolean> {
    if (!this.connectedDevice || !this.printerConfig) {
      throw new Error('Kein Drucker verbunden');
    }

    try {
      let printData: string;

      if (this.printerConfig.type === 'zebra') {
        printData = this.generateZPL(labelData, templateId);
      } else if (this.printerConfig.type === 'brother') {
        printData = this.generateBrotherData(labelData);
      } else {
        throw new Error(`Unbekannter Druckertyp: ${this.printerConfig.type}`);
      }

      await this.sendData(printData);
      console.log('[Printer] Label printed successfully');
      return true;
    } catch (error) {
      console.error('[Printer] Print failed:', error);
      return false;
    }
  }

  /**
   * ZPL für Zebra-Drucker generieren
   */
  private generateZPL(data: LabelData, templateId?: string): string {
    const qrData = data.qrData || data.assetId;
    
    // Standard-Template verwenden wenn kein spezifisches angegeben
    if (!templateId || templateId === 'default') {
      return ZPL_TEMPLATES.assetLabel({
        assetId: data.assetId,
        serialNumber: data.serialNumber,
        qrData: qrData
      });
    }

    // Kompakt-Template
    if (templateId === 'compact') {
      return ZPL_TEMPLATES.compactLabel({
        assetId: data.assetId,
        qrData: qrData
      });
    }

    // Fallback
    return ZPL_TEMPLATES.assetLabel({
      assetId: data.assetId,
      serialNumber: data.serialNumber,
      qrData: qrData
    });
  }

  /**
   * Brother-Druckdaten generieren
   * Hinweis: Brother verwendet ein komplexeres Raster-Format.
   * Für vollständige Unterstützung wird das Brother Print SDK benötigt.
   */
  private generateBrotherData(data: LabelData): string {
    // Vereinfachte ESC/P Implementation
    // Für produktive Nutzung: Brother SDK integrieren
    
    const commands = [
      '\x1B\x40',              // Initialize
      '\x1B\x69\x61\x01',      // Switch to raster mode
      '\x1B\x69\x7A',          // Print information command
      // ... weitere Commands für Raster-Daten
    ];

    console.warn('[Printer] Brother printing requires Brother SDK for full support');
    return commands.join('');
  }

  /**
   * Daten an Drucker senden
   */
  private async sendData(data: string): Promise<void> {
    if (!this.connectedDevice || !this.printerConfig) {
      throw new Error('Kein Drucker verbunden');
    }

    const serviceUUID = this.printerConfig.type === 'zebra' 
      ? BLUETOOTH_UUIDS.zebra.serviceUUID 
      : BLUETOOTH_UUIDS.brother.serviceUUID;

    const writeCharUUID = this.printerConfig.type === 'zebra'
      ? BLUETOOTH_UUIDS.zebra.writeCharUUID
      : null;

    if (!writeCharUUID) {
      // Brother verwendet SPP (Serial Port Profile)
      throw new Error('Brother-Druck erfordert SPP-Verbindung');
    }

    // Daten in Base64 konvertieren
    const base64Data = Buffer.from(data, 'utf-8').toString('base64');

    // In Chunks aufteilen (max 512 Bytes pro Write)
    const chunkSize = 512;
    for (let i = 0; i < base64Data.length; i += chunkSize) {
      const chunk = base64Data.substring(i, i + chunkSize);
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        serviceUUID,
        writeCharUUID,
        chunk
      );
    }
  }

  /**
   * Mehrere Labels drucken
   */
  async printMultipleLabels(labels: LabelData[], templateId?: string): Promise<{
    success: number;
    failed: number;
  }> {
    let success = 0;
    let failed = 0;

    for (const label of labels) {
      try {
        const result = await this.printLabel(label, templateId);
        if (result) {
          success++;
        } else {
          failed++;
        }
        // Kurze Pause zwischen den Drucken
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failed++;
        console.error(`[Printer] Failed to print label for ${label.assetId}:`, error);
      }
    }

    return { success, failed };
  }

  /**
   * Drucker-Status abrufen
   */
  getStatus(): PrinterStatus {
    return {
      connected: this.connectedDevice !== null,
      device: this.connectedDevice,
      config: this.printerConfig
    };
  }

  /**
   * Verbindungsstatus überwachen
   */
  onDisconnect(callback: () => void): () => void {
    if (!this.connectedDevice) return () => {};

    const subscription = this.connectedDevice.onDisconnected(() => {
      this.connectedDevice = null;
      this.printerConfig = null;
      callback();
    });

    return () => subscription.remove();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.disconnect();
    this.bleManager.destroy();
  }
}

// Singleton-Export
export const printerService = new PrinterService();
export default printerService;
