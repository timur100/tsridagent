const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const ini = require('ini');
const { exec, spawn } = require('child_process');
const Store = require('electron-store');
const chokidar = require('chokidar');

// Setup logging to file
const logFile = path.join(app.getPath('userData'), 'electron-scanner.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  const logLine = `[${timestamp}] ${message}\n`;
  
  // Write to file
  logStream.write(logLine);
  
  // Also write to console
  console.log(...args);
  
  // Send to renderer for display
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('main-log', message);
  }
}

console.log('[INIT] Logging to:', logFile);

// Disable SSL certificate verification for self-signed certificates (Regula Scanner)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let mainWindow = null;
let regulaConfig = null;
let readerDemoProcess = null;
let resultsWatcher = null;
let lastScanTime = null;

// Backend URL - change this to your deployed backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://job-portal-harmony.emergentagent.com';

// Electron Store for persistent settings
const store = new Store();

// Regula Settings
let regulaSettings = null;
const REGULA_INI_PATH = path.join(
  process.env.LOCALAPPDATA || process.env.APPDATA,
  'Regula',
  'Document Reader SDK (x64)',
  'RegulaReader.ini'
);
const READER_DEMO_PATH = 'C:\\Program Files\\Regula\\Document Reader SDK\\READERDEMO.exe';

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

  // Always open DevTools to see errors
  mainWindow.webContents.openDevTools();
  
  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]:`, message, 'at', sourceId, 'line', line);
  });

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

// Settings Management
ipcMain.handle('settings:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('settings:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('settings:get-regula-config', () => {
  return getRegulaSettings();
});

// Process Management
ipcMain.handle('process:check-reader-demo', () => {
  return checkReaderDemoRunning();
});

ipcMain.handle('process:start-reader-demo', () => {
  return startReaderDemo();
});

ipcMain.handle('process:show-reader-demo', () => {
  return showReaderDemo();
});

ipcMain.handle('process:hide-reader-demo', () => {
  return hideReaderDemo();
});

// PIN Verification
ipcMain.handle('pin:verify', (event, enteredPin) => {
  const storedPin = store.get('scanner.pin', '1234');
  return enteredPin === storedPin;
});

// Get log file content
ipcMain.handle('get-logs', () => {
  try {
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf-8');
      // Return last 5000 characters
      return logs.slice(-5000);
    }
    return 'No logs yet';
  } catch (error) {
    return `Error reading logs: ${error.message}`;
  }
});

// Hybrid Mode Helper Functions
function getRegulaScanResultsPath() {
  // Common paths where Regula stores scan results
  const possiblePaths = [
    path.join(process.env.APPDATA || '', 'Regula', 'Document Reader', 'Results'),
    path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Regula', 'Results'),
    path.join(process.env.USERPROFILE || '', 'Documents', 'Regula', 'Results'),
    'C:\\Regula\\Results'
  ];
  
  // Find first existing path
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      log('[ELECTRON] Found results path:', p);
      return p;
    }
  }
  
  // Default fallback
  const defaultPath = possiblePaths[0];
  log('[ELECTRON] No existing results path found, using:', defaultPath);
  
  // Try to create directory
  try {
    fs.mkdirSync(defaultPath, { recursive: true });
  } catch (error) {
    log('[ELECTRON] Warning: Could not create results directory:', error.message);
  }
  
  return defaultPath;
}

async function startReaderDemoBackground() {
  log('[ELECTRON] Starting ReaderDemo.exe in background...');
  
  const settings = getRegulaSettings();
  const readerDemoPath = settings.readerDemoPath || 'C:\\Program Files\\Regula\\Document Reader SDK\\ReaderDemo.exe';
  
  if (!fs.existsSync(readerDemoPath)) {
    log('[ELECTRON] ReaderDemo.exe not found at:', readerDemoPath);
    return false;
  }
  
  try {
    // Start minimized using Windows command
    const { exec } = require('child_process');
    exec(`start /min "" "${readerDemoPath}"`, (error) => {
      if (error) {
        log('[ELECTRON] Error starting ReaderDemo.exe:', error);
      } else {
        log('[ELECTRON] ✓ ReaderDemo.exe started in background');
      }
    });
    
    // Wait a bit for it to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    log('[ELECTRON] Failed to start ReaderDemo.exe:', error);
    return false;
  }
}

async function readScanResults(filePath) {
  log('[ELECTRON] Reading scan results from:', filePath);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let resultData;
    
    if (filePath.endsWith('.json')) {
      resultData = JSON.parse(fileContent);
    } else if (filePath.endsWith('.xml')) {
      // For XML, we'd need to parse it - for now just return raw
      resultData = { xml: fileContent };
    }
    
    log('[ELECTRON] ✓ Results parsed successfully');
    
    // Extract key data
    const structuredResult = {
      transaction_id: Date.now(),
      images: [],
      document_data: {}
    };
    
    // Try to extract images and data from result
    if (resultData.Images && Array.isArray(resultData.Images)) {
      structuredResult.images = resultData.Images;
      log('[ELECTRON] Found', resultData.Images.length, 'images');
    }
    
    // Extract document data from ContainerList
    if (resultData.ContainerList && resultData.ContainerList.List) {
      const container = resultData.ContainerList.List[0];
      if (container && container.Text) {
        const textData = container.Text;
        structuredResult.document_data = {
          document_type: textData.fieldType || 'Unknown',
          document_number: textData.DocNumber || '',
          first_name: textData.GivenNames || '',
          last_name: textData.Surname || '',
          birth_date: textData.DateOfBirth || '',
          expiry_date: textData.DateOfExpiry || '',
          nationality: textData.Nationality || '',
          sex: textData.Sex || '',
          issuing_country: textData.IssuingStateCode || ''
        };
        log('[ELECTRON] ✓ Document data extracted');
      }
    }
    
    await controlLED({ state: 'on', color: 'green', duration: 2000 });
    
    return {
      success: true,
      message: 'Scan completed successfully',
      data: structuredResult,
      source: 'hybrid_readerdemo'
    };
    
  } catch (error) {
    log('[ELECTRON] Error reading scan results:', error);
    return {
      success: false,
      message: 'Error parsing scan results: ' + error.message
    };
  }
}

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

// Hybrid approach: Use ReaderDemo.exe and poll API for results
async function performScanHybrid(options) {
  log('[ELECTRON] performScanHybrid called - using ReaderDemo.exe backend with API polling');
  
  // Ensure ReaderDemo.exe is running in background
  const readerDemoStatus = await checkReaderDemoStatus();
  if (!readerDemoStatus.running) {
    log('[ELECTRON] ReaderDemo.exe not running, starting it...');
    const started = await startReaderDemoBackground();
    if (!started) {
      return {
        success: false,
        message: 'Failed to start ReaderDemo.exe'
      };
    }
  }
  
  log('[ELECTRON] ReaderDemo.exe is running in background');
  
  // Get scanner API URL
  const scannerStatus = await checkScannerStatus();
  if (!scannerStatus.online) {
    log('[ELECTRON] Scanner API offline!');
    return {
      success: false,
      message: 'Scanner API not available'
    };
  }
  
  log('[ELECTRON] Scanner API online at:', scannerStatus.url);
  log('[ELECTRON] Waiting for scan in ReaderDemo.exe...');
  log('[ELECTRON] Please scan document now (ReaderDemo.exe is running in background)');
  
  // Poll the API for new results
  return new Promise(async (resolve) => {
    let pollCount = 0;
    const maxPolls = 60; // 60 seconds total
    const pollInterval = 1000; // Check every second
    
    // Get initial result count to detect new scans
    let initialResultCount = 0;
    try {
      const checkUrl = `${scannerStatus.url}/Methods/IsReaderResultTypeAvailable?AType=15`;
      const initialCheck = await makeRequest(checkUrl, 'GET');
      initialResultCount = typeof initialCheck === 'number' ? initialCheck : 0;
      log('[ELECTRON] Initial result count:', initialResultCount);
    } catch (error) {
      log('[ELECTRON] Could not get initial result count:', error.message);
    }
    
    const pollForResults = async () => {
      pollCount++;
      
      try {
        // Check if new results are available
        const checkUrl = `${scannerStatus.url}/Methods/IsReaderResultTypeAvailable?AType=15`;
        const resultCount = await makeRequest(checkUrl, 'GET');
        
        log(`[ELECTRON] Poll ${pollCount}/${maxPolls} - Result count: ${resultCount}`);
        
        // New scan detected!
        if (typeof resultCount === 'number' && resultCount > initialResultCount) {
          log('[ELECTRON] ✓ New scan detected! Fetching results...');
          
          // Get the latest result (index 0 is most recent)
          const resultsUrl = `${scannerStatus.url}/Methods/CheckReaderResultJSON?AType=15&AIdx=0`;
          const scanData = await makeRequest(resultsUrl, 'GET');
          
          if (scanData) {
            log('[ELECTRON] ✓ Scan results retrieved from API');
            
            // Process and structure the results
            const structuredResult = await processApiResults(scanData);
            resolve(structuredResult);
            return;
          }
        }
        
        // Continue polling if not done
        if (pollCount < maxPolls) {
          setTimeout(pollForResults, pollInterval);
        } else {
          log('[ELECTRON] ⚠️ Polling timeout - no new scan detected in 60 seconds');
          resolve({
            success: false,
            message: 'No scan detected. Please scan a document in ReaderDemo.exe and try again.'
          });
        }
        
      } catch (error) {
        log('[ELECTRON] Error polling for results:', error.message);
        
        // Continue polling even on error
        if (pollCount < maxPolls) {
          setTimeout(pollForResults, pollInterval);
        } else {
          resolve({
            success: false,
            message: 'Error checking for scan results: ' + error.message
          });
        }
      }
    };
    
    // Start polling
    pollForResults();
  });
}

// Process API results into structured format
async function processApiResults(scanData) {
  log('[ELECTRON] Processing API results...');
  
  const structuredResult = {
    transaction_id: Date.now(),
    images: [],
    document_data: {}
  };
  
  try {
    // Extract images
    if (scanData.Images && Array.isArray(scanData.Images)) {
      structuredResult.images = scanData.Images;
      log('[ELECTRON] Found', scanData.Images.length, 'images');
    }
    
    // Extract document data from ContainerList
    if (scanData.ContainerList && scanData.ContainerList.List) {
      const container = scanData.ContainerList.List[0];
      if (container && container.Text) {
        const textData = container.Text;
        structuredResult.document_data = {
          document_type: textData.fieldType || 'Unknown',
          document_number: textData.DocNumber || textData.docNumber || '',
          first_name: textData.GivenNames || textData.givenNames || '',
          last_name: textData.Surname || textData.surname || '',
          birth_date: textData.DateOfBirth || textData.dateOfBirth || '',
          expiry_date: textData.DateOfExpiry || textData.dateOfExpiry || '',
          nationality: textData.Nationality || textData.nationality || '',
          sex: textData.Sex || textData.sex || '',
          issuing_country: textData.IssuingStateCode || textData.issuingStateCode || ''
        };
        log('[ELECTRON] ✓ Document data extracted:', structuredResult.document_data);
      }
    }
    
    // Set LED to green on success
    await controlLED({ state: 'on', color: 'green', duration: 2000 });
    
    return {
      success: true,
      message: 'Scan completed successfully via ReaderDemo.exe',
      data: structuredResult,
      source: 'hybrid_api_polling'
    };
    
  } catch (error) {
    log('[ELECTRON] Error processing API results:', error);
    return {
      success: false,
      message: 'Error processing scan results: ' + error.message
    };
  }
}

async function performScan(options) {
  log('[ELECTRON] performScan called with options:', options);
  
  // Check if we should use hybrid mode
  const settings = store.get('scanner_settings', {});
  if (settings.use_hybrid_mode !== false) { // Default to hybrid mode
    log('[ELECTRON] Using hybrid mode (ReaderDemo.exe backend)');
    return await performScanHybrid(options);
  }
  
  // Fallback to direct API mode
  log('[ELECTRON] Using direct API mode');
  const scannerStatus = await checkScannerStatus();
  
  if (!scannerStatus.online) {
    log('[ELECTRON] Scanner offline!');
    return {
      success: false,
      message: 'Scanner not available'
    };
  }

  log('[ELECTRON] Scanner online at:', scannerStatus.url);

  try {
    // Get Regula settings
    const settings = getRegulaSettings();
    log('[ELECTRON] Using Regula settings:', {
      probabilityThreshold: settings.probabilityThreshold || 85,
      doRFID: settings.doRFID || false,
      doAuthenticity: settings.doAuthenticity || 0
    });

    // Set LED to yellow
    log('[ELECTRON] Setting LED to yellow...');
    await controlLED({ state: 'on', color: 'yellow' });

    // Use the correct Regula SDK GetImages endpoint
    log('[ELECTRON] Using Regula SDK GetImages method');
    log('[ELECTRON] Starting document scan - place document on scanner...');
    
    // GetImages is a GET request (not POST!) that triggers scanning
    // Build query parameters for GetImages
    const getImagesParams = new URLSearchParams({
      AutoScan: 'true',           // Auto-detect document
      CaptureMode: 'All',         // Capture all available images
      ImageFormat: 'JPEG',        // Image format
      Light: settings.doAuthenticity ? '6143' : '1',  // Light types (6143 = all lights)
      Timeout: '30000'            // 30 second timeout
    });
    
    const getImagesUrl = `${scannerStatus.url}/Methods/GetImages?${getImagesParams.toString()}`;
    
    log('[ELECTRON] API URL:', getImagesUrl);
    log('[ELECTRON] Waiting for document (up to 30 seconds)...');
    
    // Call GetImages - this is a GET request that waits for document
    const scanResult = await makeRequest(getImagesUrl, 'GET');
    log('[ELECTRON] Scan completed. Processing result...');
    log('[ELECTRON] Raw result type:', typeof scanResult);
    
    // GetImages returns a transaction ID (number) on success
    if (typeof scanResult === 'number') {
      log('[ELECTRON] ✓ Scan transaction ID:', scanResult);
      
      // Now fetch the actual results using the transaction ID
      if (scanResult > 0) {
        log('[ELECTRON] Fetching scan results...');
        
        // Get JSON results
        const resultsUrl = `${scannerStatus.url}/Methods/CheckReaderResultJSON?AType=15&AIdx=0`;
        const results = await makeRequest(resultsUrl, 'GET');
        
        if (results) {
          log('[ELECTRON] ✓ Results retrieved successfully');
          scanResult = results;
        }
      } else {
        log('[ELECTRON] ⚠️ Invalid transaction ID:', scanResult);
      }
    } else if (scanResult && typeof scanResult === 'object') {
      log('[ELECTRON] Raw result keys:', Object.keys(scanResult).join(', '));
      
      // Check for error messages
      if (scanResult.Message || scanResult.MessageDetail) {
        log('[ELECTRON] ⚠️ API returned error message:');
        log('[ELECTRON]   Message:', scanResult.Message);
        log('[ELECTRON]   MessageDetail:', scanResult.MessageDetail);
      }
    }

    if (!scanResult) {
      log('[ELECTRON] ⚠️ No result from scanner API');
      await controlLED({ state: 'blink', color: 'red', duration: 3000 });
      return {
        success: false,
        message: 'Scanner did not return any data'
      };
    }

    // Check for errors in the response
    if (scanResult.error || scanResult.Error) {
      const errorMsg = scanResult.error || scanResult.Error || 'Unknown scanner error';
      log('[ELECTRON] Scanner returned error:', errorMsg);
      await controlLED({ state: 'blink', color: 'red', duration: 3000 });
      return {
        success: false,
        message: `Scanner error: ${errorMsg}`
      };
    }

    // Check if we got actual scan data
    // GetImages + CheckReaderResultJSON returns structured data
    const hasImages = scanResult.Images && Array.isArray(scanResult.Images) && scanResult.Images.length > 0;
    const hasContainerList = scanResult.ContainerList && scanResult.ContainerList.List && scanResult.ContainerList.List.length > 0;
    const hasStatus = scanResult.Status === 1 || scanResult.status === 1;
    const hasProcessingFinished = scanResult.ProcessingFinished === 1 || scanResult.processingFinished === 1;
    const hasTransactionInfo = scanResult.TransactionInfo || scanResult.transactionInfo;
    
    log('[ELECTRON] Scan result analysis:');
    log('[ELECTRON]   - Transaction ID:', typeof scanResult === 'number' ? scanResult : 'N/A');
    log('[ELECTRON]   - Status:', scanResult.Status || scanResult.status || 'undefined');
    log('[ELECTRON]   - Processing Finished:', hasProcessingFinished);
    log('[ELECTRON]   - Has Images:', hasImages);
    log('[ELECTRON]   - Image count:', scanResult.Images ? scanResult.Images.length : 0);
    log('[ELECTRON]   - Has ContainerList:', hasContainerList);
    log('[ELECTRON]   - Has TransactionInfo:', hasTransactionInfo);
    if (typeof scanResult === 'object') {
      log('[ELECTRON]   - Result keys:', Object.keys(scanResult).join(', '));
    }
    
    // Check if we got valid data
    if (typeof scanResult === 'number' && scanResult <= 0) {
      log('[ELECTRON] ⚠️ Scanner returned invalid transaction ID');
      await controlLED({ state: 'blink', color: 'red', duration: 3000 });
      
      return {
        success: false,
        message: 'No document detected. Please place document on scanner and try again.',
        debug: {
          transactionId: scanResult,
          message: 'Invalid transaction ID from GetImages'
        }
      };
    }
    
    if (typeof scanResult === 'object' && !hasStatus && !hasProcessingFinished && !hasImages && !hasContainerList) {
      log('[ELECTRON] ⚠️ Scanner returned empty or invalid result');
      log('[ELECTRON] ⚠️ This suggests:');
      log('[ELECTRON]   1. No document placed on scanner');
      log('[ELECTRON]   2. Document not detected properly');
      log('[ELECTRON]   3. ReaderDemo.exe might be blocking scanner');
      await controlLED({ state: 'blink', color: 'red', duration: 3000 });
      
      return {
        success: false,
        message: 'No document detected. Please place document on scanner and try again.',
        debug: {
          status: scanResult.Status || scanResult.status,
          processingFinished: hasProcessingFinished,
          keys: typeof scanResult === 'object' ? Object.keys(scanResult) : [],
          hasImages,
          hasContainerList,
          rawResult: JSON.stringify(scanResult).substring(0, 500)
        }
      };
    }

    // Success! Process the data
    log('[ELECTRON] ✓ Document detected! Processing...');
    await controlLED({ state: 'on', color: 'green', duration: 2000 });

    // Structure the result
    const structuredResult = {
      success: true,
      timestamp: new Date().toISOString(),
      images: [],
      document_data: {},
      raw_response: scanResult,
      message: 'Scan successful'
    };

    // Extract images
    if (hasImages) {
      log('[ELECTRON] Processing', scanResult.Images.length, 'images');
      structuredResult.images = scanResult.Images.map((img, idx) => {
        const imageData = {
          type: img.LightType || img.lightType || 'Unknown',
          data: img.ImageData || img.imageData || '',
          format: img.Format || img.format || 'jpeg',
          fieldType: img.FieldType || img.fieldType || 0
        };
        log(`[ELECTRON]   Image ${idx + 1}: ${imageData.type}, size: ${imageData.data.length} bytes`);
        return imageData;
      });
    }

    // Extract document data from ContainerList (standard Process API response)
    if (hasContainerList) {
      log('[ELECTRON] Processing document data from ContainerList');
      const container = scanResult.ContainerList.List[0];
      
      if (container && container.Text) {
        const textData = container.Text;
        structuredResult.document_data = {
          document_type: textData.fieldType || 'Unknown',
          document_number: textData.DocNumber || textData.docNumber || '',
          first_name: textData.GivenNames || textData.givenNames || '',
          last_name: textData.Surname || textData.surname || '',
          birth_date: textData.DateOfBirth || textData.dateOfBirth || '',
          expiry_date: textData.DateOfExpiry || textData.dateOfExpiry || '',
          nationality: textData.Nationality || textData.nationality || '',
          sex: textData.Sex || textData.sex || '',
          issuing_country: textData.IssuingStateCode || textData.issuingStateCode || ''
        };
        
        log('[ELECTRON] Document data extracted from ContainerList:', {
          type: structuredResult.document_data.document_type,
          number: structuredResult.document_data.document_number,
          name: `${structuredResult.document_data.first_name} ${structuredResult.document_data.last_name}`
        });
      }
    }

    log('[ELECTRON] ✓ Scan complete and processed successfully');
    return structuredResult;

  } catch (error) {
    log('[ELECTRON] Scan error:', error.message);
    log('[ELECTRON] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack ? error.stack.substring(0, 200) : 'No stack'
    });
    await controlLED({ state: 'blink', color: 'red', duration: 3000 });
    
    return {
      success: false,
      message: `Scan error: ${error.message || 'Unknown error'}`
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

// Load Regula Settings from INI file
function getRegulaSettings() {
  if (regulaSettings) {
    return regulaSettings;
  }

  try {
    if (fs.existsSync(REGULA_INI_PATH)) {
      console.log('[SETTINGS] Loading Regula settings from:', REGULA_INI_PATH);
      const iniContent = fs.readFileSync(REGULA_INI_PATH, 'utf-8');
      const config = ini.parse(iniContent);
      
      // Extract critical settings
      regulaSettings = {
        probabilityThreshold: parseInt(config.Settings?.ProbabilityThreshold || 85),
        doRFID: parseInt(config.Settings?.DoRFID || 1) === 1,
        doAuthenticity: parseInt(config.Settings?.DoAuthenticity || 98307),
        autoScan: parseInt(config.Settings?.AutoScan || 1) === 1,
        glareCompensation: parseInt(config.Settings?.GlareCompensation || 1) === 1,
        graphicsCompressionRatio: parseInt(config.Settings?.GraphicsCompressionRatio || 2),
        doMRZOCR: parseInt(config['Device operations']?.DoMRZOCR || 1) === 1,
        doVisualOCR: parseInt(config['Device operations']?.DoVisualOCR || 1) === 1,
        doBarcode: parseInt(config['Device operations']?.DoBARCODE || 1) === 1,
        saveImages: parseInt(config.Settings?.SaveImages || 1) === 1,
        language: config.Settings?.Language || '1031', // German
        rfidDataGroups: parseInt(config.Settings?.RFIDDataGroups || 93187),
        fullConfig: config
      };
      
      console.log('[SETTINGS] Loaded Regula settings:', {
        probabilityThreshold: regulaSettings.probabilityThreshold,
        doRFID: regulaSettings.doRFID,
        doAuthenticity: regulaSettings.doAuthenticity,
        autoScan: regulaSettings.autoScan
      });
      
      return regulaSettings;
    } else {
      console.warn('[SETTINGS] RegulaReader.ini not found at:', REGULA_INI_PATH);
      return {
        message: 'RegulaReader.ini not found',
        path: REGULA_INI_PATH,
        exists: false
      };
    }
  } catch (error) {
    console.error('[SETTINGS] Error loading Regula settings:', error);
    return {
      error: error.message,
      exists: false
    };
  }
}

// Check if ReaderDemo.exe is running
function checkReaderDemoRunning() {
  return new Promise((resolve) => {
    exec('tasklist', (error, stdout) => {
      if (error) {
        resolve({ running: false, error: error.message });
        return;
      }
      
      const isRunning = stdout.toLowerCase().includes('readerdemo.exe');
      resolve({
        running: isRunning,
        message: isRunning ? 'ReaderDemo.exe is running' : 'ReaderDemo.exe is not running'
      });
    });
  });
}

// Alias for hybrid mode
async function checkReaderDemoStatus() {
  return await checkReaderDemoRunning();
}

// Bring ReaderDemo.exe to foreground
function showReaderDemo() {
  return new Promise((resolve) => {
    const powerShellCmd = `
      $proc = Get-Process READERDEMO -ErrorAction SilentlyContinue
      if ($proc) {
        $sig = '[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr hWnd);[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'
        $type = Add-Type -MemberDefinition $sig -Name WindowAPI -PassThru
        $type::ShowWindow($proc.MainWindowHandle, 9)
        $type::SetForegroundWindow($proc.MainWindowHandle)
        Write-Output "success"
      } else {
        Write-Output "not_running"
      }
    `;
    
    exec(`powershell -command "${powerShellCmd.replace(/\n/g, ' ')}"`, (error, stdout) => {
      if (error || stdout.trim() === 'not_running') {
        resolve({
          success: false,
          message: 'ReaderDemo.exe is not running'
        });
        return;
      }
      
      resolve({
        success: true,
        message: 'ReaderDemo.exe brought to foreground'
      });
    });
  });
}

// Minimize ReaderDemo.exe
function hideReaderDemo() {
  return new Promise((resolve) => {
    const powerShellCmd = `
      $proc = Get-Process READERDEMO -ErrorAction SilentlyContinue
      if ($proc) {
        $sig = '[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'
        $type = Add-Type -MemberDefinition $sig -Name WindowAPI -PassThru
        $type::ShowWindow($proc.MainWindowHandle, 6)
        Write-Output "success"
      } else {
        Write-Output "not_running"
      }
    `;
    
    exec(`powershell -command "${powerShellCmd.replace(/\n/g, ' ')}"`, (error, stdout) => {
      if (error || stdout.trim() === 'not_running') {
        resolve({
          success: false,
          message: 'ReaderDemo.exe is not running'
        });
        return;
      }
      
      resolve({
        success: true,
        message: 'ReaderDemo.exe minimized'
      });
    });
  });
}

// Start ReaderDemo.exe
function startReaderDemo() {
  return new Promise((resolve) => {
    if (!fs.existsSync(READER_DEMO_PATH)) {
      resolve({
        success: false,
        message: `ReaderDemo.exe not found at: ${READER_DEMO_PATH}`
      });
      return;
    }

    try {
      // Check if already running
      checkReaderDemoRunning().then((status) => {
        if (status.running) {
          // Bring existing window to front
          exec(`powershell -command "(Get-Process READERDEMO).MainWindowHandle | ForEach-Object { $sig = '[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);'; $type = Add-Type -MemberDefinition $sig -Name WindowAPI -PassThru; $type::SetForegroundWindow($_) }"`, (error) => {
            if (error) {
              console.warn('[PROCESS] Could not bring ReaderDemo to front:', error.message);
            }
          });
          
          resolve({
            success: true,
            alreadyRunning: true,
            message: 'ReaderDemo.exe was already running - brought to foreground'
          });
          return;
        }

        // Start new process
        const process = spawn(READER_DEMO_PATH, [], {
          detached: true,
          stdio: 'ignore'
        });
        
        process.unref();
        
        console.log('[PROCESS] Started ReaderDemo.exe');
        resolve({
          success: true,
          alreadyRunning: false,
          message: 'ReaderDemo.exe started successfully'
        });
      });
    } catch (error) {
      console.error('[PROCESS] Error starting ReaderDemo:', error);
      resolve({
        success: false,
        message: error.message
      });
    }
  });
}

console.log('Electron app started');
console.log('Backend URL:', BACKEND_URL);
console.log('Looking for Regula Scanner on localhost...');
console.log('RegulaReader.ini path:', REGULA_INI_PATH);
console.log('ReaderDemo.exe path:', READER_DEMO_PATH);

// Load settings on startup
getRegulaSettings();
