const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const usb = require('usb');
const HID = require('node-hid');

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