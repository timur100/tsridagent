const { contextBridge, ipcRenderer } = require('electron');

// Expose scanner API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Scanner functions
  checkScannerStatus: () => ipcRenderer.invoke('scanner:check-status'),
  performScan: (options) => ipcRenderer.invoke('scanner:scan', options),
  controlLED: (ledOptions) => ipcRenderer.invoke('scanner:led', ledOptions),
  
  // Settings management
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getRegulaConfig: () => ipcRenderer.invoke('settings:get-regula-config'),
  
  // Process management
  checkReaderDemo: () => ipcRenderer.invoke('process:check-reader-demo'),
  startReaderDemo: () => ipcRenderer.invoke('process:start-reader-demo'),
  showReaderDemo: () => ipcRenderer.invoke('process:show-reader-demo'),
  hideReaderDemo: () => ipcRenderer.invoke('process:hide-reader-demo'),
  
  // PIN verification
  verifyPin: (pin) => ipcRenderer.invoke('pin:verify', pin),
  
  // Get logs
  getLogs: () => ipcRenderer.invoke('get-logs'),
  
  // Get backend URL
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // Platform info
  platform: process.platform,
  isElectron: true
});

console.log('Preload script loaded - Scanner API exposed');
