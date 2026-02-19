// Zebra DataWedge Integration Service
// For Zebra TC78 and similar Android Enterprise devices

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const DATAWEDGE_API = {
  // Intent actions
  ACTION_SOFTSCANTRIGGER: 'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER',
  ACTION_SCANNERINPUTPLUGIN: 'com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN',
  ACTION_ENUMERATESCANNERS: 'com.symbol.datawedge.api.ENUMERATE_SCANNERS',
  ACTION_SETDEFAULTPROFILE: 'com.symbol.datawedge.api.SET_DEFAULT_PROFILE',
  ACTION_RESETDEFAULTPROFILE: 'com.symbol.datawedge.api.RESET_DEFAULT_PROFILE',
  ACTION_SWITCHTOPROFILE: 'com.symbol.datawedge.api.SWITCH_TO_PROFILE',
  ACTION_CREATEPROFILE: 'com.symbol.datawedge.api.CREATE_PROFILE',
  ACTION_DELETEPROFILE: 'com.symbol.datawedge.api.DELETE_PROFILE',
  ACTION_SETCONFIG: 'com.symbol.datawedge.api.SET_CONFIG',
  ACTION_GETACTIVEPROFILE: 'com.symbol.datawedge.api.GET_ACTIVE_PROFILE',
  
  // Result actions
  RESULT_ACTION: 'com.symbol.datawedge.api.RESULT_ACTION',
  RESULT_CATEGORY: 'android.intent.category.DEFAULT',
  
  // Scan result
  DATA_STRING_TAG: 'com.symbol.datawedge.data_string',
  LABEL_TYPE_TAG: 'com.symbol.datawedge.label_type',
  SOURCE_TAG: 'com.symbol.datawedge.source',
};

class DataWedgeService {
  constructor() {
    this.listeners = [];
    this.isInitialized = false;
    this.activeProfile = null;
    this.scanCallback = null;
  }

  // Initialize DataWedge integration
  async initialize(profileName = 'TSRIDMobile') {
    if (Platform.OS !== 'android') {
      console.warn('DataWedge is only available on Android/Zebra devices');
      return false;
    }

    try {
      // Create or update profile for our app
      await this.createProfile(profileName);
      await this.configureProfile(profileName);
      this.activeProfile = profileName;
      this.isInitialized = true;
      console.log('DataWedge initialized with profile:', profileName);
      return true;
    } catch (error) {
      console.error('DataWedge initialization failed:', error);
      return false;
    }
  }

  // Create a new DataWedge profile
  async createProfile(profileName) {
    if (!NativeModules.DataWedgeIntents) {
      console.warn('DataWedgeIntents module not available');
      return;
    }

    const profileConfig = {
      PROFILE_NAME: profileName,
      PROFILE_ENABLED: 'true',
      CONFIG_MODE: 'CREATE_IF_NOT_EXIST',
      PLUGIN_CONFIG: {
        PLUGIN_NAME: 'BARCODE',
        RESET_CONFIG: 'true',
        PARAM_LIST: {
          scanner_selection: 'auto',
          scanner_input_enabled: 'true',
          decoder_ean13: 'true',
          decoder_ean8: 'true',
          decoder_code128: 'true',
          decoder_code39: 'true',
          decoder_qrcode: 'true',
          decoder_datamatrix: 'true',
          decoder_upca: 'true',
          decoder_upce: 'true',
          decoder_i2of5: 'true',
        },
      },
      APP_LIST: [
        {
          PACKAGE_NAME: 'com.tsrid.mobile',
          ACTIVITY_LIST: ['*'],
        },
      ],
    };

    try {
      await NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.SET_CONFIG': JSON.stringify(profileConfig),
        },
      });
    } catch (error) {
      console.error('Failed to create DataWedge profile:', error);
    }
  }

  // Configure the profile for intent output
  async configureProfile(profileName) {
    if (!NativeModules.DataWedgeIntents) return;

    const intentConfig = {
      PROFILE_NAME: profileName,
      PROFILE_ENABLED: 'true',
      CONFIG_MODE: 'UPDATE',
      PLUGIN_CONFIG: {
        PLUGIN_NAME: 'INTENT',
        RESET_CONFIG: 'true',
        PARAM_LIST: {
          intent_output_enabled: 'true',
          intent_action: 'com.tsrid.mobile.SCAN',
          intent_delivery: '2', // Broadcast intent
        },
      },
    };

    try {
      await NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.SET_CONFIG': JSON.stringify(intentConfig),
        },
      });
    } catch (error) {
      console.error('Failed to configure DataWedge profile:', error);
    }
  }

  // Register callback for scan results
  onScan(callback) {
    this.scanCallback = callback;
    
    // Listen for scan intents
    if (NativeModules.DataWedgeIntents) {
      const eventEmitter = new NativeEventEmitter(NativeModules.DataWedgeIntents);
      const subscription = eventEmitter.addListener('scanResult', (event) => {
        if (this.scanCallback) {
          this.scanCallback({
            data: event.data || event[DATAWEDGE_API.DATA_STRING_TAG],
            labelType: event.labelType || event[DATAWEDGE_API.LABEL_TYPE_TAG],
            source: event.source || event[DATAWEDGE_API.SOURCE_TAG] || 'scanner',
            timestamp: new Date(),
          });
        }
      });
      this.listeners.push(subscription);
    }
  }

  // Trigger a soft scan (press scanner button programmatically)
  async triggerScan() {
    if (!NativeModules.DataWedgeIntents) {
      console.warn('DataWedgeIntents module not available');
      return;
    }

    try {
      await NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER': 'START_SCANNING',
        },
      });
    } catch (error) {
      console.error('Failed to trigger scan:', error);
    }
  }

  // Stop scanning
  async stopScan() {
    if (!NativeModules.DataWedgeIntents) return;

    try {
      await NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER': 'STOP_SCANNING',
        },
      });
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  }

  // Enable/disable scanner
  async setScanner(enabled) {
    if (!NativeModules.DataWedgeIntents) return;

    try {
      await NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN': enabled ? 'ENABLE_PLUGIN' : 'DISABLE_PLUGIN',
        },
      });
    } catch (error) {
      console.error('Failed to set scanner state:', error);
    }
  }

  // Get list of available scanners
  async enumerateScanners() {
    if (!NativeModules.DataWedgeIntents) return [];

    return new Promise((resolve) => {
      const eventEmitter = new NativeEventEmitter(NativeModules.DataWedgeIntents);
      const subscription = eventEmitter.addListener('enumerateScanners', (scanners) => {
        subscription.remove();
        resolve(scanners);
      });

      NativeModules.DataWedgeIntents.sendBroadcastWithExtras({
        action: 'com.symbol.datawedge.api.ACTION',
        extras: {
          'com.symbol.datawedge.api.ENUMERATE_SCANNERS': '',
        },
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        subscription.remove();
        resolve([]);
      }, 5000);
    });
  }

  // Clean up listeners
  cleanup() {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
    this.scanCallback = null;
    this.isInitialized = false;
  }
}

// Singleton instance
const dataWedgeService = new DataWedgeService();

export default dataWedgeService;
export { DataWedgeService, DATAWEDGE_API };
