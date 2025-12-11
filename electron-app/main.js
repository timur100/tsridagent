const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const usb = require('usb');
const HID = require('node-hid');
// const printer = require('printer'); // Ersetzt durch PowerShell-Lösung
const printerWindows = require('./printer-windows');

// Configuration
const PREVIEW_URL = 'https://desk-manager-2.preview.emergentagent.com/portal/admin';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'TSRID Admin Portal',
    backgroundColor: '#1a1a1a'
  });

  // Load the preview URL
  mainWindow.loadURL(PREVIEW_URL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

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

console.log('[TSRID Desktop] App started');
console.log(`[TSRID Desktop] Loading: ${PREVIEW_URL}`);