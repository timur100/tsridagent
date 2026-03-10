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
  
  // Scanner
  getScannerStatus: () => ipcRenderer.invoke('get-scanner-status'),
  triggerScan: (options) => ipcRenderer.invoke('trigger-scan', options),
  onScanResult: (callback) => {
    ipcRenderer.on('scan-result', (event, data) => callback(data));
  },
  
  // Agent
  registerDevice: (data) => ipcRenderer.invoke('register-device', data),
  sendHeartbeat: () => ipcRenderer.invoke('send-heartbeat'),
  
  // Platform info
  platform: process.platform,
  arch: process.arch
});

// Also expose for checking if running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
