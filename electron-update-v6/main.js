const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');

// Disable SSL certificate verification for self-signed certificates (Regula Scanner)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let mainWindow;

// Backend URL - change this to your deployed backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://job-portal-harmony.emergentagent.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow CORS for local scanner
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the React app
  const startUrl = path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(startUrl);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Scanner Communication
ipcMain.handle('scanner:check-status', async () => {
  return checkScannerStatus();
});

ipcMain.handle('scanner:scan', async (event, options) => {
  return performScan(options);
});

ipcMain.handle('scanner:led', async (event, ledOptions) => {
  return controlLED(ledOptions);
});

ipcMain.handle('get-backend-url', () => {
  return BACKEND_URL;
});

// Scanner Functions - Direct communication with local Regula service
async function checkScannerStatus() {
  const scannerUrls = [
    'https://localhost/Regula.SDK.Api',
    'https://localhost:88/Regula.SDK.Api'
  ];

  for (const url of scannerUrls) {
    try {
      const result = await makeRequest(`${url}/Methods/GetServiceVersion`);
      if (result) {
        return {
          success: true,
          online: true,
          url: url,
          version: result,
          message: 'Scanner online'
        };
      }
    } catch (error) {
      console.log(`Scanner not available at ${url}`);
    }
  }

  return {
    success: false,
    online: false,
    message: 'Scanner service not available'
  };
}

async function performScan(options) {
  console.log('[ELECTRON] performScan called with options:', options);
  const scannerStatus = await checkScannerStatus();
  
  if (!scannerStatus.online) {
    console.log('[ELECTRON] Scanner offline!');
    return {
      success: false,
      message: 'Scanner not available'
    };
  }

  console.log('[ELECTRON] Scanner online at:', scannerStatus.url);

  try {
    // Set LED to yellow
    console.log('[ELECTRON] Setting LED to yellow...');
    await controlLED({ state: 'on', color: 'yellow' });

    // Perform scan
    const scanUrl = `${scannerStatus.url}/Methods/GetImages?AutoScan=true&CaptureMode=All`;
    console.log('[ELECTRON] Starting scan at:', scanUrl);
    console.log('[ELECTRON] Please place document on scanner now...');
    
    const scanResult = await makeRequest(scanUrl);
    console.log('[ELECTRON] Scan result received:', scanResult ? 'Data received' : 'No data');

    if (scanResult) {
      // Set LED to green
      console.log('[ELECTRON] Scan successful! Setting LED to green...');
      await controlLED({ state: 'on', color: 'green', duration: 2000 });

      // Parse and structure the result
      const structuredResult = {
        success: true,
        timestamp: new Date().toISOString(),
        images: [],
        document_data: {},
        raw_response: scanResult,
        message: 'Scan successful'
      };

      // Try to extract images if present
      if (scanResult.Images && Array.isArray(scanResult.Images)) {
        console.log('[ELECTRON] Found', scanResult.Images.length, 'images');
        structuredResult.images = scanResult.Images.map(img => ({
          type: img.LightType || 'Unknown',
          data: img.ImageData || '',
          format: img.Format || 'jpeg'
        }));
      }

      // Try to extract document data
      if (scanResult.DocumentType || scanResult.DocumentNumber) {
        structuredResult.document_data = {
          document_type: scanResult.DocumentType || 'Unknown',
          document_number: scanResult.DocumentNumber || '',
          first_name: scanResult.FirstName || '',
          last_name: scanResult.LastName || '',
          birth_date: scanResult.BirthDate || '',
          expiry_date: scanResult.ExpiryDate || '',
          nationality: scanResult.Nationality || '',
          sex: scanResult.Sex || '',
          issuing_country: scanResult.IssuingCountry || ''
        };
      }

      console.log('[ELECTRON] Returning structured result');
      return structuredResult;
    } else {
      // Set LED to red
      console.log('[ELECTRON] Scan failed - no result!');
      await controlLED({ state: 'blink', color: 'red', duration: 3000 });
      
      return {
        success: false,
        message: 'Scan failed - no data received from scanner'
      };
    }
  } catch (error) {
    console.error('[ELECTRON] Scan error:', error);
    await controlLED({ state: 'blink', color: 'red', duration: 3000 });
    
    return {
      success: false,
      message: error.message || 'Scan error'
    };
  }
}

async function controlLED(ledOptions) {
  const scannerStatus = await checkScannerStatus();
  
  if (!scannerStatus.online) {
    return { success: false };
  }

  try {
    const colorMap = {
      green: 1,
      red: 2,
      yellow: 3
    };

    const ledParams = {
      State: ledOptions.state,
      Color: colorMap[ledOptions.color] || 1,
      Duration: ledOptions.duration || 0
    };

    const result = await makeRequest(
      `${scannerStatus.url}/Methods/LED`,
      'POST',
      ledParams
    );

    return { success: true };
  } catch (error) {
    console.error('LED control error:', error);
    return { success: false };
  }
}

// Helper function to make HTTPS requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      method: method,
      rejectUnauthorized: false, // Accept self-signed certificates
      timeout: 10000
    };

    if (data && method === 'POST') {
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      };
    }

    const req = client.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : body;
          resolve(result);
        } catch (error) {
          resolve(body); // Return as text if not JSON
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

console.log('Electron app started');
console.log('Backend URL:', BACKEND_URL);
console.log('Looking for Regula Scanner on localhost...');
