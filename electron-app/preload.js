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
    ipcRenderer.invoke('printer:printToWindows', { printerName, data, type })
});

// Expose File Dialog API
contextBridge.exposeInMainWorld('dialogAPI', {
  showSave: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpen: (options) => ipcRenderer.invoke('dialog:showOpen', options)
});

// Expose App API
contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  reload: () => ipcRenderer.invoke('app:reload')
});

console.log('[TSRID Desktop] Preload script loaded');