const { contextBridge, ipcRenderer } = require('electron');

// Expose USB API to web content
contextBridge.exposeInMainWorld('usbAPI', {
  // Get all USB devices
  getDevices: () => ipcRenderer.invoke('usb:getDevices'),
  
  // Get serial ports
  getSerialPorts: () => ipcRenderer.invoke('usb:getSerialPorts'),
  
  // Get HID devices
  getHIDDevices: () => ipcRenderer.invoke('usb:getHIDDevices')
});

// Expose Printer API
contextBridge.exposeInMainWorld('printerAPI', {
  // Print data to USB printer
  print: (port, data, encoding) => 
    ipcRenderer.invoke('printer:print', { port, data, encoding }),
  
  // Print ZPL label
  printZPL: (port, zpl) => 
    ipcRenderer.invoke('printer:printZPL', { port, zpl }),
  
  // Test printer connection
  test: (port) => 
    ipcRenderer.invoke('printer:test', { port }),
  
  // Get Windows System Printers (NEW!)
  getSystemPrinters: () => 
    ipcRenderer.invoke('printer:getSystemPrinters'),
  
  // Print to Windows Printer (NEW!)
  printToWindows: (printerName, data, type) => 
    ipcRenderer.invoke('printer:printToWindows', { printerName, data, type }),
  
  // Print Image/HTML to Windows Printer (NEW!)
  printImage: (printerName, imageData) => 
    ipcRenderer.invoke('printer:printImage', { printerName, imageData })
});

// Expose File Dialog API
contextBridge.exposeInMainWorld('dialogAPI', {
  showSave: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpen: (options) => ipcRenderer.invoke('dialog:showOpen', options)
});

// Expose App API
contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  reload: () => ipcRenderer.invoke('app:reload'),
  restart: () => ipcRenderer.invoke('app:restart'),
  getPaths: () => ipcRenderer.invoke('app:getPaths')
});

// Window Control API (für Fullscreen-Toggle)
contextBridge.exposeInMainWorld('windowAPI', {
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  setFullscreen: (flag) => ipcRenderer.invoke('window:setFullscreen', flag),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  restore: () => ipcRenderer.invoke('window:restore'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized')
});

// ===== NEUE APIs FÜR OFFLINE-AGENT =====

// Database API
contextBridge.exposeInMainWorld('tsridDB', {
  // Config
  getConfig: (key, defaultValue) => ipcRenderer.invoke('db:getConfig', key, defaultValue),
  setConfig: (key, value) => ipcRenderer.invoke('db:setConfig', key, value),
  getAllConfig: () => ipcRenderer.invoke('db:getAllConfig'),
  
  // Scans
  saveScan: (scanData) => ipcRenderer.invoke('db:saveScan', scanData),
  getPendingScans: (limit) => ipcRenderer.invoke('db:getPendingScans', limit),
  getScanStats: () => ipcRenderer.invoke('db:getScanStats'),
  
  // Locations
  searchLocations: (query, limit) => ipcRenderer.invoke('db:searchLocations', query, limit),
  getAllLocations: () => ipcRenderer.invoke('db:getAllLocations')
});

// Sync API
contextBridge.exposeInMainWorld('tsridSync', {
  forceSyncNow: () => ipcRenderer.invoke('sync:forceSyncNow'),
  getStatus: () => ipcRenderer.invoke('sync:getStatus'),
  registerDevice: () => ipcRenderer.invoke('sync:registerDevice')
});

// Device Info API
contextBridge.exposeInMainWorld('tsridDevice', {
  getInfo: () => ipcRenderer.invoke('device:getInfo'),
  getId: () => ipcRenderer.invoke('device:getId'),
  getHeartbeat: () => ipcRenderer.invoke('device:getHeartbeat')
});

// Mode Manager API
contextBridge.exposeInMainWorld('tsridMode', {
  getCurrent: () => ipcRenderer.invoke('mode:getCurrent'),
  getSetupStatus: () => ipcRenderer.invoke('mode:getSetupStatus'),
  saveSetupData: (data) => ipcRenderer.invoke('mode:saveSetupData', data),
  completeSetup: () => ipcRenderer.invoke('mode:completeSetup'),
  verifyPassword: (password) => ipcRenderer.invoke('mode:verifyPassword', password),
  changePassword: (newPassword) => ipcRenderer.invoke('mode:changePassword', newPassword),
  switchToKiosk: () => ipcRenderer.invoke('mode:switchToKiosk'),
  switchToAdmin: () => ipcRenderer.invoke('mode:switchToAdmin'),
  getAdminMenu: () => ipcRenderer.invoke('mode:getAdminMenu')
});

// Logs API
contextBridge.exposeInMainWorld('tsridLogs', {
  getRecent: (limit, level) => ipcRenderer.invoke('logs:getRecent', limit, level),
  write: (level, category, message, details) => 
    ipcRenderer.invoke('logs:write', level, category, message, details),
  
  // Convenience methods
  info: (category, message, details) => 
    ipcRenderer.invoke('logs:write', 'info', category, message, details),
  warn: (category, message, details) => 
    ipcRenderer.invoke('logs:write', 'warn', category, message, details),
  error: (category, message, details) => 
    ipcRenderer.invoke('logs:write', 'error', category, message, details)
});

// Admin Login Dialog Helper
window.tsridShowAdminLogin = null; // Will be set by frontend

// Expose electronAPI for admin login from main process
contextBridge.exposeInMainWorld('electronAPI', {
  verifyPassword: (password) => ipcRenderer.invoke('mode:verifyPassword', password)
});

console.log('[TSRID Desktop] Preload script loaded');
console.log('[TSRID Desktop] APIs exposed: usbAPI, printerAPI, dialogAPI, appAPI, tsridDB, tsridSync, tsridDevice, tsridMode, tsridLogs, electronAPI');