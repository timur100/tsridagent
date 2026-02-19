/**
 * TSRID Mobile App - Zebra DataWedge Service
 * 
 * Integration mit Zebra DataWedge für Hardware-Scanning auf TC78.
 * 
 * DataWedge muss auf dem Gerät konfiguriert sein:
 * - Profil: TSRID
 * - Intent Output: Aktiviert
 * - Intent Action: com.tsrid.mobile.SCAN
 */

import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

// Intent-Konfiguration
const DATAWEDGE_INTENT_ACTION = 'com.tsrid.mobile.SCAN';
const DATAWEDGE_INTENT_CATEGORY = 'android.intent.category.DEFAULT';

// DataWedge API Intents
const DW_API = {
  // Scanner Control
  SOFT_SCAN_TRIGGER: 'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER',
  SCANNER_INPUT_PLUGIN: 'com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN',
  
  // Profile Management
  SET_CONFIG: 'com.symbol.datawedge.api.SET_CONFIG',
  GET_ACTIVE_PROFILE: 'com.symbol.datawedge.api.GET_ACTIVE_PROFILE',
  SWITCH_TO_PROFILE: 'com.symbol.datawedge.api.SWITCH_TO_PROFILE',
  
  // DataWedge Control
  ENABLE_DATAWEDGE: 'com.symbol.datawedge.api.ENABLE_DATAWEDGE',
  
  // Result Actions
  RESULT_ACTION: 'com.symbol.datawedge.api.RESULT_ACTION',
  RESULT_CATEGORY: 'android.intent.category.DEFAULT'
};

// Scan-Ergebnis Typ
export interface ScanResult {
  data: string;           // Gescannter Inhalt
  labelType: string;      // Barcode-Typ (z.B. CODE128, QR_CODE)
  source: string;         // Scanner-Quelle
  timestamp: number;      // Zeitstempel
}

// Event Listener Typ
type ScanListener = (result: ScanResult) => void;

class DataWedgeService {
  private listeners: ScanListener[] = [];
  private isInitialized: boolean = false;
  private activeProfile: string = '';

  /**
   * DataWedge initialisieren
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('[DataWedge] Only available on Android');
      return false;
    }

    try {
      // Event-Listener für Scan-Ergebnisse registrieren
      DeviceEventEmitter.addListener(DATAWEDGE_INTENT_ACTION, (intent: any) => {
        this.handleScanIntent(intent);
      });

      // DataWedge aktivieren
      await this.sendCommand(DW_API.ENABLE_DATAWEDGE, { enable: true });
      
      // TSRID-Profil aktivieren (falls vorhanden)
      await this.switchToProfile('TSRID');
      
      this.isInitialized = true;
      console.log('[DataWedge] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[DataWedge] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Scan-Intent verarbeiten
   */
  private handleScanIntent(intent: any) {
    try {
      const scanResult: ScanResult = {
        data: intent.data || intent['com.symbol.datawedge.data_string'] || '',
        labelType: intent.labelType || intent['com.symbol.datawedge.label_type'] || 'UNKNOWN',
        source: intent.source || 'SCANNER',
        timestamp: Date.now()
      };

      console.log('[DataWedge] Scan received:', scanResult.data);

      // Alle Listener benachrichtigen
      this.listeners.forEach(listener => {
        try {
          listener(scanResult);
        } catch (error) {
          console.error('[DataWedge] Listener error:', error);
        }
      });
    } catch (error) {
      console.error('[DataWedge] Error handling scan intent:', error);
    }
  }

  /**
   * Scan-Listener hinzufügen
   */
  addListener(listener: ScanListener): () => void {
    this.listeners.push(listener);
    
    // Cleanup-Funktion zurückgeben
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Alle Listener entfernen
   */
  removeAllListeners() {
    this.listeners = [];
  }

  /**
   * Software-Trigger auslösen (simuliert Hardware-Button)
   */
  async triggerScan(): Promise<void> {
    await this.sendCommand(DW_API.SOFT_SCAN_TRIGGER, {
      'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER': 'START_SCANNING'
    });
  }

  /**
   * Scan stoppen
   */
  async stopScan(): Promise<void> {
    await this.sendCommand(DW_API.SOFT_SCAN_TRIGGER, {
      'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER': 'STOP_SCANNING'
    });
  }

  /**
   * Scanner aktivieren/deaktivieren
   */
  async setScanner(enabled: boolean): Promise<void> {
    await this.sendCommand(DW_API.SCANNER_INPUT_PLUGIN, {
      'com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN': enabled ? 'ENABLE_PLUGIN' : 'DISABLE_PLUGIN'
    });
  }

  /**
   * Zu Profil wechseln
   */
  async switchToProfile(profileName: string): Promise<void> {
    await this.sendCommand(DW_API.SWITCH_TO_PROFILE, {
      'com.symbol.datawedge.api.SWITCH_TO_PROFILE': profileName
    });
    this.activeProfile = profileName;
  }

  /**
   * DataWedge-Profil konfigurieren
   */
  async configureProfile(config: {
    profileName: string;
    packageName: string;
    activityList?: string[];
    intentDelivery?: 'broadcast' | 'activity' | 'service';
  }): Promise<void> {
    const profileConfig = {
      PROFILE_NAME: config.profileName,
      PROFILE_ENABLED: 'true',
      CONFIG_MODE: 'UPDATE',
      PLUGIN_CONFIG: {
        PLUGIN_NAME: 'INTENT',
        RESET_CONFIG: 'true',
        PARAM_LIST: {
          intent_output_enabled: 'true',
          intent_action: DATAWEDGE_INTENT_ACTION,
          intent_delivery: config.intentDelivery || 'broadcast'
        }
      },
      APP_LIST: [{
        PACKAGE_NAME: config.packageName,
        ACTIVITY_LIST: config.activityList || ['*']
      }]
    };

    await this.sendCommand(DW_API.SET_CONFIG, {
      'com.symbol.datawedge.api.SET_CONFIG': profileConfig
    });
  }

  /**
   * Intent an DataWedge senden
   */
  private async sendCommand(action: string, extras: Record<string, any>): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { DataWedgeModule } = NativeModules;
      
      if (DataWedgeModule && DataWedgeModule.sendBroadcast) {
        await DataWedgeModule.sendBroadcast(action, extras);
      } else {
        // Fallback: Intent über React Native Bridge
        console.warn('[DataWedge] Native module not available, using fallback');
      }
    } catch (error) {
      console.error('[DataWedge] Error sending command:', error);
      throw error;
    }
  }

  /**
   * Barcode-Typ zu lesbarem Namen
   */
  getLabelTypeName(labelType: string): string {
    const typeNames: Record<string, string> = {
      'LABEL-TYPE-CODE128': 'Code 128',
      'LABEL-TYPE-CODE39': 'Code 39',
      'LABEL-TYPE-EAN13': 'EAN-13',
      'LABEL-TYPE-EAN8': 'EAN-8',
      'LABEL-TYPE-UPCA': 'UPC-A',
      'LABEL-TYPE-UPCE': 'UPC-E',
      'LABEL-TYPE-QRCODE': 'QR Code',
      'LABEL-TYPE-DATAMATRIX': 'Data Matrix',
      'LABEL-TYPE-PDF417': 'PDF417',
      'LABEL-TYPE-AZTEC': 'Aztec',
      'LABEL-TYPE-I2OF5': 'Interleaved 2 of 5',
      'LABEL-TYPE-CODE93': 'Code 93'
    };

    return typeNames[labelType] || labelType;
  }

  /**
   * Prüfen ob es eine Asset-ID ist
   */
  isAssetId(data: string): boolean {
    // TSRID Asset-ID Format: TSRID-XXX-XXX-XXXX
    return /^TSRID-[A-Z]{2,3}-[A-Z0-9]{2,5}-\d{4}$/.test(data);
  }

  /**
   * Prüfen ob es eine Seriennummer ist
   */
  isSerialNumber(data: string): boolean {
    // Typische SN-Formate (alphanumerisch, 8+ Zeichen)
    return /^[A-Z0-9]{8,}$/i.test(data);
  }

  /**
   * Status abrufen
   */
  getStatus(): { initialized: boolean; activeProfile: string } {
    return {
      initialized: this.isInitialized,
      activeProfile: this.activeProfile
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.removeAllListeners();
    DeviceEventEmitter.removeAllListeners(DATAWEDGE_INTENT_ACTION);
    this.isInitialized = false;
  }
}

// Singleton-Export
export const dataWedgeService = new DataWedgeService();
export default dataWedgeService;
