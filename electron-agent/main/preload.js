const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App Info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },
  
  // Scanner (Regula)
  getScannerStatus: () => ipcRenderer.invoke('get-scanner-status'),
  connectScanner: () => ipcRenderer.invoke('connect-scanner'),
  disconnectScanner: () => ipcRenderer.invoke('disconnect-scanner'),
  triggerScan: (options) => ipcRenderer.invoke('trigger-scan', options),
  getScanResult: () => ipcRenderer.invoke('get-scan-result'),
  getScanImages: () => ipcRenderer.invoke('get-scan-images'),
  onScanResult: (callback) => {
    ipcRenderer.on('scan-result', (event, data) => callback(data));
  },
  
  // Agent
  registerDevice: (data) => ipcRenderer.invoke('register-device', data),
  sendHeartbeat: () => ipcRenderer.invoke('send-heartbeat'),
  
  // Kiosk Mode
  toggleKioskMode: () => ipcRenderer.invoke('toggle-kiosk-mode'),
  getKioskMode: () => ipcRenderer.invoke('get-kiosk-mode'),
  
  // Station PIN & Screensaver
  getStationSettings: () => ipcRenderer.invoke('get-station-settings'),
  setStationSettings: (settings) => ipcRenderer.invoke('set-station-settings', settings),
  verifyStationPin: (pin) => ipcRenderer.invoke('verify-station-pin', pin),
  checkPinRequired: () => ipcRenderer.invoke('check-pin-required'),
  
  // Platform info
  platform: process.platform,
  arch: process.arch
});

// Also expose for checking if running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
