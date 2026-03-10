/**
 * Regula 7028M.111 Scanner Integration
 * 
 * Kommuniziert mit dem Regula SDK Service über HTTPS
 * Unterstützt auch direkte USB HID Kommunikation für Hardware-Status
 */

const axios = require('axios');
const https = require('https');

// Disable SSL verification for local Regula SDK (self-signed cert)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Scanner endpoints - Regula SDK runs locally
const SCANNER_URLS = [
  'https://localhost/Regula.SDK.Api',      // Port 443 (default)
  'https://localhost:88/Regula.SDK.Api'    // Port 88 (fallback)
];

let activeUrl = null;
let scannerInfo = null;

/**
 * Find working scanner URL
 */
async function findScannerUrl() {
  for (const url of SCANNER_URLS) {
    try {
      const response = await axios.get(`${url}/Methods/GetServiceVersion`, {
        httpsAgent,
        timeout: 2000
      });
      if (response.status === 200) {
        activeUrl = url;
        console.log(`Scanner found at: ${url}`);
        return url;
      }
    } catch (err) {
      // Try next URL
    }
  }
  return null;
}

/**
 * Get scanner status
 */
async function getStatus() {
  try {
    const url = activeUrl || await findScannerUrl();
    
    if (!url) {
      return {
        online: false,
        error: 'Scanner service not found',
        model: 'Regula 7028M.111',
        serialNumber: null
      };
    }

    // Get service version
    const versionRes = await axios.get(`${url}/Methods/GetServiceVersion`, {
      httpsAgent,
      timeout: 5000
    });

    // Get reader list
    const readersRes = await axios.get(`${url}/Methods/GetReaderList`, {
      httpsAgent,
      timeout: 5000
    });

    const readers = readersRes.data || [];
    const hasReader = readers.length > 0;
    
    // Get device info if reader connected
    let deviceInfo = null;
    if (hasReader) {
      try {
        const infoRes = await axios.get(`${url}/Methods/GetDeviceInfo`, {
          httpsAgent,
          timeout: 5000
        });
        deviceInfo = infoRes.data;
      } catch (e) {
        // Device info optional
      }
    }

    scannerInfo = {
      online: true,
      serviceVersion: versionRes.data,
      hasReader,
      readers,
      deviceInfo,
      model: deviceInfo?.Model || 'Regula 7028M.111',
      serialNumber: deviceInfo?.SerialNumber || null,
      firmwareVersion: deviceInfo?.FirmwareVersion || null
    };

    return scannerInfo;

  } catch (error) {
    return {
      online: false,
      error: error.message,
      model: 'Regula 7028M.111',
      serialNumber: null
    };
  }
}

/**
 * Trigger document scan
 */
async function triggerScan(options = {}) {
  try {
    const url = activeUrl || await findScannerUrl();
    
    if (!url) {
      return {
        success: false,
        error: 'Scanner service not available'
      };
    }

    // Scan configuration for Regula 7028M.111
    const scanConfig = {
      Light: 6,           // White light
      Format: 1,          // JPEG
      DPI: 300,           // Resolution
      CaptureUV: options.captureUv !== false,
      CaptureIR: options.captureIr !== false,
      RFID: options.enableRfid !== false,
      ...options
    };

    // Start the scan
    const response = await axios.post(
      `${url}/Methods/ProcessDocument`,
      scanConfig,
      {
        httpsAgent,
        timeout: 30000,  // 30 second timeout for scan
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      error: 'No scan data received'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Control scanner LED
 */
async function setLED(state, color = 'green') {
  try {
    const url = activeUrl || await findScannerUrl();
    if (!url) return { success: false, error: 'Scanner not found' };

    // Map color to LED index
    const ledMap = {
      green: 1,
      red: 2,
      yellow: 3
    };

    const response = await axios.post(
      `${url}/Methods/SetLED`,
      {
        LED: ledMap[color] || 1,
        State: state === 'on' ? 1 : 0
      },
      { httpsAgent, timeout: 2000 }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Play scanner beep
 */
async function beep(type = 'success') {
  try {
    const url = activeUrl || await findScannerUrl();
    if (!url) return { success: false, error: 'Scanner not found' };

    const beepMap = {
      success: 1,
      error: 2,
      warning: 3
    };

    await axios.post(
      `${url}/Methods/Beep`,
      { Type: beepMap[type] || 1 },
      { httpsAgent, timeout: 2000 }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getStatus,
  triggerScan,
  setLED,
  beep,
  findScannerUrl
};
