const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');

// Configuration store
const store = new Store({
  defaults: {
    serverUrl: 'https://electron-regula-hub.preview.emergentagent.com',
    appUrl: 'https://electron-regula-hub.preview.emergentagent.com/id-verification',
    deviceId: null,
    tenantId: null,
    locationCode: null,
    autoUpdate: true,
    lastVersion: '1.0.0'
  }
});

let mainWindow;
let isDev = process.argv.includes('--dev');

// Disable security warnings in dev mode
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'TSRID Agent',
    autoHideMenuBar: true
  });

  // Load the web app URL
  const appUrl = store.get('appUrl');
  console.log(`Loading app URL: ${appUrl}`);
  mainWindow.loadURL(appUrl);

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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
    serverUrl: store.get('serverUrl')
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
app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

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
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

console.log(`TSRID Agent v${app.getVersion()} starting...`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Dev mode: ${isDev}`);
