/**
 * Zebra DataWedge Integration Service
 * 
 * This service handles communication with Zebra DataWedge on TC78 and similar devices.
 * DataWedge provides a system-level barcode scanning capability that works across all apps.
 * 
 * For non-Zebra devices or development, it falls back to the camera-based scanner.
 */

import { Platform, NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

// DataWedge Intent Actions
const DATAWEDGE_INTENTS = {
  // DataWedge API calls
  API_ACTION: 'com.symbol.datawedge.api.ACTION',
  API_RESULT_ACTION: 'com.symbol.datawedge.api.RESULT_ACTION',
  
  // Scan result
  NOTIFICATION_ACTION: 'com.symbol.datawedge.api.NOTIFICATION_ACTION',
  SCAN_RESULT: 'com.symbol.datawedge.DATA_STRING',
  SCAN_RESULT_TYPE: 'com.symbol.datawedge.LABEL_TYPE',
  
  // API Commands
  CREATE_PROFILE: 'com.symbol.datawedge.api.CREATE_PROFILE',
  SET_CONFIG: 'com.symbol.datawedge.api.SET_CONFIG',
  SOFT_SCAN_TRIGGER: 'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER',
  GET_VERSION_INFO: 'com.symbol.datawedge.api.GET_VERSION_INFO',
  SWITCH_TO_PROFILE: 'com.symbol.datawedge.api.SWITCH_TO_PROFILE',
  GET_ACTIVE_PROFILE: 'com.symbol.datawedge.api.GET_ACTIVE_PROFILE',
};

// App Profile Name
const PROFILE_NAME = 'TSRID_Mobile';
const PACKAGE_NAME = 'com.tsrid.mobile';

class DataWedgeService {
  constructor() {
    this.isZebraDevice = false;
    this.isInitialized = false;
    this.dataWedgeVersion = null;
    this.activeProfile = null;
    this.scanCallback = null;
    this.statusCallback = null;
    this.eventEmitter = null;
    this.subscriptions = [];
  }

  /**
   * Initialize DataWedge service
   * @param {Function} onScanResult - Callback for scan results
   * @param {Function} onStatusChange - Callback for status changes
   */
  async initialize(onScanResult, onStatusChange) {
    this.scanCallback = onScanResult;
    this.statusCallback = onStatusChange;

    // Only works on Android devices
    if (Platform.OS !== 'android') {
      console.log('[DataWedge] Not an Android device, skipping initialization');
      this.notifyStatus('unavailable', 'DataWedge nur auf Android verfügbar');
      return false;
    }

    try {
      // Check if we're on a Zebra device by trying to communicate with DataWedge
      this.setupEventListeners();
      
      // Try to get DataWedge version - if this succeeds, we're on a Zebra device
      const hasDataWedge = await this.checkDataWedgeAvailable();
      
      if (hasDataWedge) {
        this.isZebraDevice = true;
        await this.configureProfile();
        this.isInitialized = true;
        this.notifyStatus('connected', 'DataWedge verbunden');
        return true;
      } else {
        this.notifyStatus('unavailable', 'Kein Zebra-Gerät erkannt');
        return false;
      }
    } catch (error) {
      console.error('[DataWedge] Initialization error:', error);
      this.notifyStatus('error', `Fehler: ${error.message}`);
      return false;
    }
  }

  /**
   * Set up event listeners for DataWedge intents
   */
  setupEventListeners() {
    // Use DeviceEventEmitter for Android intent broadcast receivers
    if (Platform.OS === 'android') {
      // Listen for scan results from DataWedge
      const scanSubscription = DeviceEventEmitter.addListener(
        'datawedge_scan',
        this.handleScanResult.bind(this)
      );
      this.subscriptions.push(scanSubscription);

      // Listen for DataWedge status/API results
      const statusSubscription = DeviceEventEmitter.addListener(
        'datawedge_status',
        this.handleStatusResult.bind(this)
      );
      this.subscriptions.push(statusSubscription);
    }
  }

  /**
   * Handle incoming scan results from DataWedge
   */
  handleScanResult(event) {
    if (!event) return;

    const scanData = {
      code: event.data || event.barcode,
      type: event.labelType || event.symbology || 'unknown',
      source: 'datawedge',
      timestamp: new Date().toISOString(),
      raw: event,
    };

    console.log('[DataWedge] Scan result:', scanData);

    if (this.scanCallback) {
      this.scanCallback(scanData);
    }
  }

  /**
   * Handle DataWedge status/API results
   */
  handleStatusResult(event) {
    console.log('[DataWedge] Status result:', event);
    
    if (event?.command === 'GET_VERSION_INFO' && event?.version) {
      this.dataWedgeVersion = event.version;
    }
    
    if (event?.command === 'GET_ACTIVE_PROFILE' && event?.profile) {
      this.activeProfile = event.profile;
    }
  }

  /**
   * Check if DataWedge is available on this device
   */
  async checkDataWedgeAvailable() {
    return new Promise((resolve) => {
      // Set a timeout - if we don't get a response, DataWedge isn't available
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

      // Listen for version info response
      const versionListener = DeviceEventEmitter.addListener(
        'datawedge_version',
        (version) => {
          clearTimeout(timeout);
          this.dataWedgeVersion = version;
          versionListener.remove();
          resolve(true);
        }
      );

      // Request DataWedge version
      this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
        [DATAWEDGE_INTENTS.GET_VERSION_INFO]: ''
      });
    });
  }

  /**
   * Configure DataWedge profile for the app
   */
  async configureProfile() {
    // Create profile if it doesn't exist
    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.CREATE_PROFILE]: PROFILE_NAME
    });

    // Configure profile settings
    const profileConfig = {
      PROFILE_NAME: PROFILE_NAME,
      PROFILE_ENABLED: 'true',
      CONFIG_MODE: 'UPDATE',
      PLUGIN_CONFIG: {
        PLUGIN_NAME: 'BARCODE',
        RESET_CONFIG: 'true',
        PARAM_LIST: {
          scanner_selection: 'auto',
          // Enable common barcode types
          decoder_code128: 'true',
          decoder_code39: 'true',
          decoder_ean13: 'true',
          decoder_ean8: 'true',
          decoder_qrcode: 'true',
          decoder_datamatrix: 'true',
          decoder_upca: 'true',
          decoder_upce: 'true',
          decoder_i2of5: 'true',
          // Scanning behavior
          decode_haptic_feedback: 'true',
          decode_audio_feedback_uri: 'Scan successful',
          beam_timer: '5000',
        }
      },
      APP_LIST: [{
        PACKAGE_NAME: PACKAGE_NAME,
        ACTIVITY_LIST: ['*']
      }]
    };

    // Intent output configuration
    const intentConfig = {
      PROFILE_NAME: PROFILE_NAME,
      PROFILE_ENABLED: 'true',
      CONFIG_MODE: 'UPDATE',
      PLUGIN_CONFIG: {
        PLUGIN_NAME: 'INTENT',
        RESET_CONFIG: 'true',
        PARAM_LIST: {
          intent_output_enabled: 'true',
          intent_action: 'com.tsrid.mobile.SCAN',
          intent_delivery: '2' // Broadcast
        }
      }
    };

    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SET_CONFIG]: profileConfig
    });

    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SET_CONFIG]: intentConfig
    });

    // Switch to our profile
    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SWITCH_TO_PROFILE]: PROFILE_NAME
    });
  }

  /**
   * Trigger a soft scan (software-initiated scan)
   */
  triggerScan() {
    if (!this.isInitialized || !this.isZebraDevice) {
      console.log('[DataWedge] Cannot trigger scan - not initialized or not a Zebra device');
      return false;
    }

    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SOFT_SCAN_TRIGGER]: 'START_SCANNING'
    });

    return true;
  }

  /**
   * Stop an ongoing scan
   */
  stopScan() {
    if (!this.isInitialized || !this.isZebraDevice) return;

    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SOFT_SCAN_TRIGGER]: 'STOP_SCANNING'
    });
  }

  /**
   * Toggle scan (start if stopped, stop if scanning)
   */
  toggleScan() {
    if (!this.isInitialized || !this.isZebraDevice) return false;

    this.sendIntent(DATAWEDGE_INTENTS.API_ACTION, {
      [DATAWEDGE_INTENTS.SOFT_SCAN_TRIGGER]: 'TOGGLE_SCANNING'
    });

    return true;
  }

  /**
   * Send an intent to DataWedge
   */
  sendIntent(action, extras) {
    if (Platform.OS !== 'android') return;

    try {
      // Use NativeModules to send intents
      // This requires a native module to be implemented
      // For now, we log what would be sent
      console.log('[DataWedge] Would send intent:', { action, extras });
      
      // In a real implementation, you would use:
      // NativeModules.DataWedgeModule.sendIntent(action, JSON.stringify(extras));
    } catch (error) {
      console.error('[DataWedge] Error sending intent:', error);
    }
  }

  /**
   * Notify status change
   */
  notifyStatus(status, message) {
    if (this.statusCallback) {
      this.statusCallback({ status, message });
    }
  }

  /**
   * Get current DataWedge status
   */
  getStatus() {
    return {
      isZebraDevice: this.isZebraDevice,
      isInitialized: this.isInitialized,
      version: this.dataWedgeVersion,
      profile: this.activeProfile || PROFILE_NAME,
    };
  }

  /**
   * Cleanup - remove event listeners
   */
  cleanup() {
    this.subscriptions.forEach(sub => {
      if (sub && sub.remove) {
        sub.remove();
      }
    });
    this.subscriptions = [];
    this.isInitialized = false;
    this.scanCallback = null;
    this.statusCallback = null;
  }
}

// Export singleton instance
export const dataWedgeService = new DataWedgeService();

// Export class for testing
export default DataWedgeService;
