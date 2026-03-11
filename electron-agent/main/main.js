const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen, powerSaveBlocker } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');

// Configuration store
const store = new Store({
  defaults: {
    serverUrl: 'https://agent-control-desk-2.preview.emergentagent.com',
    appUrl: 'https://agent-control-desk-2.preview.emergentagent.com/id-verification',
    deviceId: null,
    tenantId: null,
    locationCode: null,
    autoUpdate: true,
    lastVersion: '1.0.0',
    kioskMode: true,  // Start in kiosk mode by default
    // New settings for PIN and screensaver
    stationPin: '',  // Station PIN for unlocking
    requirePinOnStart: false,  // Require PIN on app start
    screensaverEnabled: true,  // Enable screensaver
    screensaverTimeout: 5,  // Minutes of inactivity before screensaver
    autoStartEnabled: true  // Auto-start with Windows
  }
});

let mainWindow;
let isDev = process.argv.includes('--dev');
let isKioskMode = store.get('kioskMode', true);
let powerSaveId = null;

// Disable security warnings in dev mode
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'TSRID Agent',
    autoHideMenuBar: true,
    // Kiosk mode settings
    fullscreen: isKioskMode,
    kiosk: isKioskMode,
    frame: !isKioskMode,  // Hide window frame in kiosk mode
    alwaysOnTop: isKioskMode,
    skipTaskbar: isKioskMode
  });

  // Load the web app URL
  const appUrl = store.get('appUrl');
  console.log(`Loading app URL: ${appUrl}`);
  console.log(`Kiosk mode: ${isKioskMode}`);
  mainWindow.loadURL(appUrl);

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Prevent Alt+F4 and other close shortcuts in kiosk mode
  mainWindow.on('close', (e) => {
    if (isKioskMode && !app.isQuitting) {
      e.preventDefault();
      return false;
    }
  });
}

// =====================================
// AUTO UPDATER
// =====================================
function setupAutoUpdater() {
  if (isDev) {
    console.log('Auto-updater disabled in dev mode');
    return;
  }

  autoUpdater.autoDownload = store.get('autoUpdate');
  
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-status', { 
      status: 'available', 
      version: info.version,
      releaseNotes: info.releaseNotes 
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-status', { 
      status: 'downloading', 
      progress: progress.percent 
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update-status', { 
      status: 'downloaded', 
      version: info.version 
    });
    
    // Show dialog to user
    dialog.showMessageBox({
      type: 'info',
      title: 'Update verfügbar',
      message: `Version ${info.version} wurde heruntergeladen.`,
      buttons: ['Jetzt neu starten', 'Später'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('update-status', { 
      status: 'error', 
      error: err.message 
    });
  });
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// =====================================
// IPC HANDLERS
// =====================================

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    deviceId: store.get('deviceId'),
    tenantId: store.get('tenantId'),
    locationCode: store.get('locationCode'),
    serverUrl: store.get('serverUrl'),
    kioskMode: isKioskMode
  };
});

// Toggle kiosk mode (hidden button trigger)
ipcMain.handle('toggle-kiosk-mode', () => {
  isKioskMode = !isKioskMode;
  store.set('kioskMode', isKioskMode);
  
  if (mainWindow) {
    if (isKioskMode) {
      // Enter kiosk mode
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setSkipTaskbar(true);
      console.log('Kiosk mode activated');
    } else {
      // Exit kiosk mode
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setSkipTaskbar(false);
      console.log('Kiosk mode deactivated');
    }
  }
  
  return { kioskMode: isKioskMode };
});

// Get kiosk mode status
ipcMain.handle('get-kiosk-mode', () => {
  return { kioskMode: isKioskMode };
});

// =====================================
// STATION PIN & SCREENSAVER HANDLERS
// =====================================

// Get station settings
ipcMain.handle('get-station-settings', () => {
  return {
    stationPin: store.get('stationPin', ''),
    requirePinOnStart: store.get('requirePinOnStart', false),
    screensaverEnabled: store.get('screensaverEnabled', true),
    screensaverTimeout: store.get('screensaverTimeout', 5),
    autoStartEnabled: store.get('autoStartEnabled', true),
    hasStationPin: !!store.get('stationPin', '')
  };
});

// Set station settings
ipcMain.handle('set-station-settings', (event, settings) => {
  if (settings.stationPin !== undefined) {
    store.set('stationPin', settings.stationPin);
  }
  if (settings.requirePinOnStart !== undefined) {
    store.set('requirePinOnStart', settings.requirePinOnStart);
  }
  if (settings.screensaverEnabled !== undefined) {
    store.set('screensaverEnabled', settings.screensaverEnabled);
  }
  if (settings.screensaverTimeout !== undefined) {
    store.set('screensaverTimeout', settings.screensaverTimeout);
  }
  if (settings.autoStartEnabled !== undefined) {
    store.set('autoStartEnabled', settings.autoStartEnabled);
    // Set Windows auto-start
    app.setLoginItemSettings({
      openAtLogin: settings.autoStartEnabled,
      path: app.getPath('exe'),
      args: []
    });
  }
  return { success: true };
});

// Verify station PIN
ipcMain.handle('verify-station-pin', (event, pin) => {
  const storedPin = store.get('stationPin', '');
  if (!storedPin) {
    return { valid: true, message: 'Keine PIN erforderlich' };
  }
  const isValid = pin === storedPin;
  return { 
    valid: isValid, 
    message: isValid ? 'PIN korrekt' : 'Falsche PIN'
  };
});

// Check if PIN is required on start
ipcMain.handle('check-pin-required', () => {
  const stationPin = store.get('stationPin', '');
  const requirePinOnStart = store.get('requirePinOnStart', false);
  return {
    required: requirePinOnStart && !!stationPin,
    hasPin: !!stationPin
  };
});

// Set configuration
ipcMain.handle('set-config', (event, config) => {
  Object.keys(config).forEach(key => {
    store.set(key, config[key]);
  });
  return { success: true };
});

// Check for updates manually
ipcMain.handle('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
  return { checking: !isDev };
});

// Download and install update
ipcMain.handle('install-update', () => {
  if (!isDev) {
    autoUpdater.quitAndInstall();
  }
});

// Get scanner status (will be implemented with Regula SDK)
ipcMain.handle('get-scanner-status', async () => {
  // This will call the Regula scanner module
  const regulaScanner = require('./scanner/regula');
  return await regulaScanner.getStatus();
});

// Trigger scan
ipcMain.handle('trigger-scan', async (event, options) => {
  const regulaScanner = require('./scanner/regula');
  return await regulaScanner.triggerScan(options);
});

// =====================================
// APP LIFECYCLE
// =====================================

// Flag for clean quit
app.isQuitting = false;

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  
  // Register secret keyboard shortcut to toggle kiosk mode (Ctrl+Shift+K)
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    isKioskMode = !isKioskMode;
    store.set('kioskMode', isKioskMode);
    
    if (mainWindow) {
      if (isKioskMode) {
        mainWindow.setKiosk(true);
        mainWindow.setFullScreen(true);
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setSkipTaskbar(true);
        console.log('Kiosk mode activated via shortcut');
      } else {
        mainWindow.setKiosk(false);
        mainWindow.setFullScreen(false);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setSkipTaskbar(false);
        console.log('Kiosk mode deactivated via shortcut');
      }
    }
  });
  
  // Register quit shortcut (Ctrl+Shift+Q) - only works when not in kiosk mode or with special sequence
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    if (!isKioskMode) {
      app.isQuitting = true;
      app.quit();
    }
  });

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Check for updates on startup (after 5 seconds)
  if (!isDev && store.get('autoUpdate')) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000);
  }
});

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (