const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, globalShortcut } = require('electron');
const path = require('path');
let SerialPort, usb, HID;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) { console.log('[TSRID] SerialPort nicht verfügbar'); }
try {
  usb = require('usb');
} catch (e) { console.log('[TSRID] USB nicht verfügbar'); }
try {
  HID = require('node-hid');
} catch (e) { console.log('[TSRID] HID nicht verfügbar'); }

const printerWindows = require('./printer-windows');

// Neue Services für Offline-First Agent
const database = require('./src/services/database');
const deviceInfo = require('./src/services/device-info');
const syncEngine = require('./src/services/sync-engine');
const modeManager = require('./src/services/mode-manager');
const backgroundAgent = require('./src/services/background-agent');

// Configuration
const PREVIEW_URL = 'https://device-portal-4.preview.emergentagent.com';
const ADMIN_URL = PREVIEW_URL + '/portal/admin';
const SCAN_URL = PREVIEW_URL + '/'; // Root = Scan App
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;
let currentMode = 'kiosk'; // 'kiosk', 'admin', 'setup'

// Initialisiere Services beim Start
function initializeServices() {
  console.log('[TSRID] Initialisiere Services...');
  
  try {
    // Datenbank initialisieren
    database.initDatabase();
    console.log('[TSRID] Datenbank initialisiert');
    
    // Device ID generieren/laden
    const deviceId = deviceInfo.getDeviceId();
    database.setConfig('device_id', deviceId);
    console.log('[TSRID] Device ID:', deviceId);
    
    // App-Version speichern
    database.setConfig('app_version', app.getVersion());
    
    // Mode Manager initialisieren
    modeManager.init();
    
    // Offline-Standorte importieren (falls vorhanden)
    const importedLocations = database.importLocationsFromFile();
    if (importedLocations > 0) {
      console.log(`[TSRID] ${importedLocations} Standorte importiert`);
    }
    
    // IMMER im Kiosk-Modus starten (Scan-App mit PIN 3842)
    currentMode = 'kiosk';
    console.log('[TSRID] Starte im Kiosk-Modus (Scan-App)');
    
    // Sync-Service starten
    try {
      syncEngine.startSyncService();
      console.log('[TSRID] Sync-Service gestartet');
    } catch (e) {
      console.log('[TSRID] Sync-Service konnte nicht gestartet werden:', e.message);
    }
    
  } catch (error) {
    console.error('[TSRID] Fehler beim Initialisieren:', error);
  }
}

// Create main window
function createWindow() {
  const kioskConfig = modeManager.getKioskConfig();
  const isKiosk = currentMode === 'kiosk';
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    fullscreen: isKiosk && kioskConfig.fullscreen,
    kiosk: false, // NICHT im Kiosk-Modus starten (erlaubt Minimieren/Bewegen)
    frame: true,  // IMMER Fensterrahmen anzeigen
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    closable: true, // Wird durch Event-Handler kontrolliert
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: true,
      devTools: true
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
    title: 'TSRID Agent',
    backgroundColor: '#1a1a1a'
  });
  
  // URL basierend auf Modus laden
  let loadUrl = SCAN_URL; // Standard: Scan-App (Root mit PIN 3842)
  
  if (currentMode === 'admin') {
    loadUrl = ADMIN_URL;
  }
  
  console.log('[TSRID] Lade URL:', loadUrl, '(Modus:', currentMode + ')');
  mainWindow.loadURL(loadUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  // Verhindere Schließen ohne Passwort (minimiert stattdessen ins Tray)
  mainWindow.on('close', (event) => {
    // Wenn nicht gerade beendet wird, ins Tray minimieren
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Zeige Hinweis
      if (backgroundAgent && backgroundAgent.showNotification) {
        backgroundAgent.showNotification('Minimiert', 'Agent läuft weiter im Hintergrund. Beenden über Tray-Icon.');
      }
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Inject USB API availability notification
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      console.log('[TSRID Desktop] USB Device API loaded');
      window.isDesktopApp = true;
      window.desktopVersion = '${app.getVersion()}';
    `);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ===== USB DEVICE HANDLERS =====

// Get all USB devices
ipcMain.handle('usb:getDevices', async () => {
  try {
    const devices = usb.getDeviceList();
    return devices.map(device => ({
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct
    }));
  } catch (error) {
    console.error('[USB] Error:', error);
    return [];
  }
});

// Get serial ports
ipcMain.handle('usb:getSerialPorts', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('[USB] Error:', error);
    return [];
  }
});

// Get HID devices
ipcMain.handle('usb:getHIDDevices', async () => {
  try {
    const devices = HID.devices();
    return devices.map(device => ({
      vendorId: device.vendorId,
      productId: device.productId,
      manufacturer: device.manufacturer,
      product: device.product,
      serialNumber: device.serialNumber,
      path: device.path
    }));
  } catch (error) {
    console.error('[HID] Error:', error);
    return [];
  }
});

// Get Windows Printers via PowerShell (NEW!)
ipcMain.handle('printer:getSystemPrinters', async () => {
  try {
    const printers = await printerWindows.getWindowsPrinters();
    console.log('[PRINTER] Found system printers:', printers.length);
    return printers;
  } catch (error) {
    console.error('[PRINTER] Error:', error);
    return [];
  }
});

// Print to Windows Printer via PowerShell (NEW!)
ipcMain.handle('printer:printToWindows', async (event, { printerName, data, type }) => {
  try {
    console.log('[PRINTER] Printing to:', printerName, 'Type:', type || 'TEXT');
    console.log('[PRINTER] Data length:', data.length, 'bytes');
    
    // Brother QL und andere Label-Drucker arbeiten am besten mit Text-Druck
    // Windows Print Spooler konvertiert automatisch
    const result = await printerWindows.printTextToWindows(printerName, data);
    return result;
  } catch (error) {
    console.error('[PRINTER] Print error:', error);
    return { success: false, error: error.message };
  }
});

// Print Image to Windows Printer (NEW!)
ipcMain.handle('printer:printImage', async (event, { printerName, imageData }) => {
  try {
    console.log('[PRINTER] Printing image to:', printerName);
    
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Save base64 image to temp file
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const tempFile = path.join(os.tmpdir(), `tsrid-label-${Date.now()}.png`);
    
    fs.writeFileSync(tempFile, buffer);
    console.log('[PRINTER] Temp image saved:', tempFile);
    
    // Use Windows default image printer
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      
      // Use mspaint to print (works on all Windows versions)
      const print = spawn('rundll32.exe', [
        'C:\\Windows\\System32\\shimgvw.dll,ImageView_PrintTo',
        tempFile,
        printerName
      ]);
      
      print.on('close', (code) => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        
        if (code === 0) {
          console.log('[PRINTER] Image printed successfully');
          resolve({ success: true });
        } else {
          reject(new Error('Print failed with code: ' + code));
        }
      });
      
      print.on('error', (err) => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        reject(err);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        print.kill();
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        reject(new Error('Print timeout'));
      }, 30000);
    });
    
  } catch (error) {
    console.error('[PRINTER] Image print error:', error);
    return { success: false, error: error.message };
  }
});

// ===== WINDOW CONTROL API =====
ipcMain.handle('window:toggleFullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

ipcMain.handle('window:setFullscreen', (event, flag) => {
  if (mainWindow) {
    mainWindow.setFullScreen(flag);
    return flag;
  }
  return false;
});

ipcMain.handle('window:isFullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:restore', () => {
  if (mainWindow) mainWindow.restore();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// ===== AGENT INFO API =====
ipcMain.handle('agent:getSystemInfo', () => {
  if (backgroundAgent && backgroundAgent.systemInfo) {
    return backgroundAgent.systemInfo;
  }
  return null;
});

ipcMain.handle('agent:getDeviceId', () => {
  if (backgroundAgent && backgroundAgent.deviceId) {
    return backgroundAgent.deviceId;
  }
  return null;
});

ipcMain.handle('agent:getStatus', () => {
  if (backgroundAgent) {
    return {
      status: backgroundAgent.status,
      isRunning: backgroundAgent.isRunning,
      lastHeartbeat: backgroundAgent.lastHeartbeat,
      deviceId: backgroundAgent.deviceId
    };
  }
  return null;
});

ipcMain.handle('agent:getDatabaseStats', () => {
  try {
    return database.getDatabaseStats();
  } catch (e) {
    console.error('[TSRID] DB Stats Fehler:', e);
    return null;
  }
});

ipcMain.handle('agent:getSyncLogs', () => {
  try {
    return database.getRecentSyncLogs(10);
  } catch (e) {
    return [];
  }
});

// Kiosk-Modus mit Admin-PIN 9988
ipcMain.handle('agent:enableKioskMode', (event, pin) => {
  if (pin === '9988') {
    if (mainWindow) {
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      return { success: true, message: 'Kiosk-Modus aktiviert' };
    }
  }
  return { success: false, message: 'Falscher PIN' };
});

ipcMain.handle('agent:disableKioskMode', (event, pin) => {
  if (pin === '9988') {
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      return { success: true, message: 'Kiosk-Modus deaktiviert' };
    }
  }
  return { success: false, message: 'Falscher PIN' };
});

// Neue Handler für Geräteeinrichtung
ipcMain.handle('agent:getDeviceConfig', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'device-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    }
    return null;
  } catch (e) {
    console.error('Error reading device config:', e);
    return null;
  }
});

ipcMain.handle('agent:saveDeviceConfig', async (event, config) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'device-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (e) {
    console.error('Error saving device config:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('agent:syncLocations', async (event, locations) => {
  try {
    // Speichere Standorte in SQLite für Offline-Zugriff
    if (db && db.syncLocations) {
      db.syncLocations(locations);
    }
    // Speichere auch als JSON-Backup
    const locationsPath = path.join(app.getPath('userData'), 'locations-cache.json');
    fs.writeFileSync(locationsPath, JSON.stringify({
      locations,
      synced_at: new Date().toISOString()
    }, null, 2));
    return { success: true, count: locations.length };
  } catch (e) {
    console.error('Error syncing locations:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('agent:getCachedLocations', async () => {
  try {
    // Versuche zuerst SQLite
    if (db && db.getCachedLocations) {
      const locations = db.getCachedLocations();
      if (locations && locations.length > 0) {
        return locations;
      }
    }
    
    // Fallback auf JSON-Cache
    const locationsPath = path.join(app.getPath('userData'), 'locations-cache.json');
    if (fs.existsSync(locationsPath)) {
      const data = JSON.parse(fs.readFileSync(locationsPath, 'utf-8'));
      return data.locations || [];
    }
    
    return [];
  } catch (e) {
    console.error('Error getting cached locations:', e);
    return [];
  }
});

ipcMain.handle('agent:quitApp', async () => {
  try {
    app.quit();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Print to USB printer
ipcMain.handle('printer:print', async (event, { port, data }) => {
  try {
    return new Promise((resolve, reject) => {
      const serialPort = new SerialPort({
        path: port,
        baudRate: 9600
      });

      serialPort.on('open', () => {
        serialPort.write(data, (err) => {
          if (err) {
            serialPort.close();
            reject(err);
          } else {
            serialPort.drain(() => {
              serialPort.close();
              resolve({ success: true });
            });
          }
        });
      });

      serialPort.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print ZPL label to printer
ipcMain.handle('printer:printZPL', async (event, { port, zpl }) => {
  try {
    return new Promise((resolve, reject) => {
      const serialPort = new SerialPort({
        path: port,
        baudRate: 9600
      });

      serialPort.on('open', () => {
        serialPort.write(zpl, (err) => {
          if (err) {
            serialPort.close();
            reject(err);
          } else {
            serialPort.drain(() => {
              serialPort.close();
              resolve({ success: true });
            });
          }
        });
      });

      serialPort.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Test printer connection
ipcMain.handle('printer:test', async (event, { port }) => {
  try {
    return new Promise((resolve, reject) => {
      const serialPort = new SerialPort({
        path: port,
        baudRate: 9600
      });

      serialPort.on('open', () => {
        serialPort.close();
        resolve({ success: true });
      });

      serialPort.on('error', (err) => {
        reject(err);
      });

      setTimeout(() => {
        try {
          serialPort.close();
          reject(new Error('Connection timeout'));
        } catch (e) {
          reject(e);
        }
      }, 5000);
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Services initialisieren
  initializeServices();
  
  // Fenster erstellen
  createWindow();
  
  // Background Agent starten
  try {
    await backgroundAgent.init(mainWindow);
    console.log('[TSRID] Background Agent gestartet');
  } catch (error) {
    console.error('[TSRID] Background Agent Fehler:', error);
  }
  
  // Shortcut-Handler Funktion
  const handleAdminShortcut = () => {
    console.log('[TSRID] Admin-Shortcut gedrückt, aktueller Modus:', currentMode);
    
    if (currentMode === 'kiosk') {
      // Zeige Passwort-Dialog
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const password = prompt('Admin-Passwort eingeben:');
          if (password === 'tsrid2024!') {
            alert('Admin-Modus wird aktiviert...');
            return 'VALID';
          } else if (password !== null) {
            alert('Falsches Passwort!');
            return 'INVALID';
          }
          return 'CANCELLED';
        })();
      `).then((result) => {
        console.log('[TSRID] Passwort-Ergebnis:', result);
        if (result === 'VALID') {
          switchToAdminMode();
        }
      });
    } else {
      // Zurück zum Kiosk-Modus - mit Bestätigung
      mainWindow.webContents.executeJavaScript(`
        confirm('Zurück zum Kiosk-Modus?');
      `).then((confirmed) => {
        if (confirmed) {
          switchToKioskMode();
        }
      });
    }
  };
  
  // Registriere mehrere Shortcuts als Fallback
  const shortcuts = [
    'Ctrl+Shift+Alt+Q',
    'Ctrl+Shift+F12',
    'F10'
  ];
  
  shortcuts.forEach(shortcut => {
    const success = globalShortcut.register(shortcut, handleAdminShortcut);
    if (success) {
      console.log('[TSRID] Shortcut registriert:', shortcut);
    } else {
      console.log('[TSRID] Shortcut FEHLGESCHLAGEN:', shortcut);
    }
  });
  
  // Zeige registrierte Shortcuts
  console.log('[TSRID] Alle Shortcuts:', globalShortcut.isRegistered('Ctrl+Shift+Alt+Q'), 
              globalShortcut.isRegistered('Ctrl+Shift+F12'),
              globalShortcut.isRegistered('F10'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Modus wechseln
function switchToAdminMode() {
  console.log('[TSRID] Wechsle zu Admin-Modus');
  currentMode = 'admin';
  modeManager.setMode('admin');
  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  mainWindow.loadURL(ADMIN_URL);
}

function switchToKioskMode() {
  console.log('[TSRID] Wechsle zu Kiosk-Modus');
  currentMode = 'kiosk';
  modeManager.setMode('kiosk');
  mainWindow.loadURL(SCAN_URL);
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
}

// Globale Referenz für Sync-Engine
global.mainWindow = mainWindow;

app.on('window-all-closed', () => {
  // Sync-Service stoppen
  syncEngine.stopSyncService();
  
  // Shortcuts deregistrieren
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ===== NEUE IPC HANDLERS FÜR OFFLINE-AGENT =====

// Database Config
ipcMain.handle('db:getConfig', async (event, key, defaultValue) => {
  return database.getConfig(key, defaultValue);
});

ipcMain.handle('db:setConfig', async (event, key, value) => {
  database.setConfig(key, value);
  return true;
});

ipcMain.handle('db:getAllConfig', async () => {
  return database.getAllConfig();
});

// Scans
ipcMain.handle('db:saveScan', async (event, scanData) => {
  return database.saveScan(scanData);
});

ipcMain.handle('db:getPendingScans', async (event, limit) => {
  return database.getPendingScans(limit);
});

ipcMain.handle('db:getScanStats', async () => {
  return database.getScanStats();
});

// Locations
ipcMain.handle('db:searchLocations', async (event, query, limit) => {
  return database.searchLocations(query, limit);
});

ipcMain.handle('db:getAllLocations', async () => {
  return database.getAllLocations();
});

// Sync
ipcMain.handle('sync:forceSyncNow', async () => {
  return await syncEngine.forceSyncNow();
});

ipcMain.handle('sync:getStatus', async () => {
  return {
    isRunning: syncEngine.isServiceRunning(),
    scanStats: database.getScanStats(),
    recentSyncLogs: database.getRecentSyncLogs(10)
  };
});

ipcMain.handle('sync:registerDevice', async () => {
  return await syncEngine.registerDevice();
});

// Device Info
ipcMain.handle('device:getInfo', async () => {
  return await deviceInfo.getFullDeviceInfo();
});

ipcMain.handle('device:getId', async () => {
  return deviceInfo.getDeviceId();
});

ipcMain.handle('device:getHeartbeat', async () => {
  return await deviceInfo.getHeartbeatPayload();
});

// Mode Manager
ipcMain.handle('mode:getCurrent', async () => {
  return modeManager.getCurrentMode();
});

ipcMain.handle('mode:getSetupStatus', async () => {
  return modeManager.getSetupStatus();
});

ipcMain.handle('mode:saveSetupData', async (event, data) => {
  return modeManager.saveSetupData(data);
});

ipcMain.handle('mode:completeSetup', async () => {
  modeManager.completeSetup();
  // Sync-Service starten nach Setup
  syncEngine.startSyncService();
  switchToKioskMode();
  return true;
});

ipcMain.handle('mode:verifyPassword', async (event, password) => {
  const isValid = modeManager.verifyAdminPassword(password);
  if (isValid) {
    switchToAdminMode();
  }
  return isValid;
});

ipcMain.handle('mode:changePassword', async (event, newPassword) => {
  return modeManager.setAdminPassword(newPassword);
});

ipcMain.handle('mode:switchToKiosk', async () => {
  switchToKioskMode();
  return true;
});

ipcMain.handle('mode:switchToAdmin', async () => {
  switchToAdminMode();
  return true;
});

ipcMain.handle('mode:getAdminMenu', async () => {
  return modeManager.getAdminMenuOptions();
});

// Logs
ipcMain.handle('logs:getRecent', async (event, limit, level) => {
  return database.getRecentLogs(limit, level);
});

ipcMain.handle('logs:write', async (event, level, category, message, details) => {
  database.writeLog(level, category, message, details);
  return true;
});

// App Control
ipcMain.handle('app:restart', async () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

ipcMain.handle('app:getPaths', async () => {
  return {
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
    temp: app.getPath('temp'),
    logs: app.getPath('logs'),
    database: database.DB_PATH,
    offlineData: database.OFFLINE_DATA_PATH
  };
});

console.log('[TSRID Desktop] App started');
console.log(`[TSRID Desktop] Loading: ${PREVIEW_URL}`);