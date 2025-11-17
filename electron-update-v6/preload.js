const { contextBridge, ipcRenderer } = require('electron');

// Expose scanner API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Scanner functions
  checkScannerStatus: () => ipcRenderer.invoke('scanner:check-status'),
  performScan: (options) => ipcRenderer.invoke('scanner:scan', options),
  controlLED: (ledOptions) => ipcRenderer.invoke('scanner:led', ledOptions),
  
  // Get backend URL
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // Platform info
  platform: process.platform,
  isElectron: true
});

console.log('Preload script loaded - Scanner API exposed');
