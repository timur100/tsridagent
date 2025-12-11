/**
 * Windows Printer Support via PowerShell
 * Keine nativen Module nötig - funktioniert sofort!
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Holt alle Windows-Drucker via WMIC (robusteste Methode)
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrintersViaWmic() {
  return new Promise((resolve, reject) => {
    const wmic = spawn('wmic', [
      'printer',
      'get',
      'Name,DriverName,PrinterStatus,Default',
      '/format:csv'
    ]);

    let output = '';
    let errorOutput = '';

    wmic.stdout.on('data', (data) => {
      output += data.toString();
    });

    wmic.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    wmic.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const lines = output.split('\n').filter(line => line.trim());
          
          // Erste 2 Zeilen überspringen (Header + leere Zeile)
          const dataLines = lines.slice(2);
          
          const printers = dataLines.map(line => {
            const parts = line.split(',');
            if (parts.length >= 4) {
              return {
                name: parts[2] || '',
                driver: parts[1] || 'Unknown',
                status: parts[3] || 'Unknown',
                isDefault: parts[0] === 'TRUE'
              };
            }
            return null;
          }).filter(p => p && p.name);
          
          console.log('[PRINTER-WMIC] Found', printers.length, 'printers');
          resolve(printers);
        } catch (e) {
          console.error('[PRINTER-WMIC] Parse error:', e.message);
          reject(e);
        }
      } else {
        console.error('[PRINTER-WMIC] Error:', errorOutput);
        reject(new Error('WMIC failed: ' + errorOutput));
      }
    });

    wmic.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Holt alle Windows-Drucker via PowerShell (Fallback)
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrintersViaPowerShell() {
  return new Promise((resolve, reject) => {
    // Einfacherer PowerShell-Befehl
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      'Get-WmiObject -Class Win32_Printer | Select-Object Name,DriverName,PrinterStatus,Default | ConvertTo-Json'
    ]);

    let output = '';
    let errorOutput = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          let printers = JSON.parse(output);
          
          if (!Array.isArray(printers)) {
            printers = [printers];
          }
          
          const result = printers.map(p => ({
            name: p.Name || '',
            driver: p.DriverName || 'Unknown',
            status: p.PrinterStatus ? p.PrinterStatus.toString() : 'Unknown',
            isDefault: p.Default || false
          }));
          
          console.log('[PRINTER-PS] Found', result.length, 'printers');
          resolve(result);
        } catch (e) {
          console.error('[PRINTER-PS] Parse error:', e.message, 'Output:', output.substring(0, 200));
          reject(e);
        }
      } else {
        console.error('[PRINTER-PS] Error. Code:', code, 'Stderr:', errorOutput);
        reject(new Error('PowerShell failed'));
      }
    });

    ps.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Holt alle Windows-Drucker via Registry (letzte Option)
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrintersViaReg() {
  return new Promise((resolve, reject) => {
    const reg = spawn('reg', [
      'query',
      'HKEY_CURRENT_USER\\Printers\\Connections',
      '/s'
    ]);

    let output = '';

    reg.stdout.on('data', (data) => {
      output += data.toString();
    });

    reg.on('close', (code) => {
      const printerNames = [];
      const lines = output.split('\n');
      
      lines.forEach(line => {
        if (line.includes('\\Connections\\')) {
          const match = line.match(/Connections\\(.+)/);
          if (match && match[1]) {
            const name = match[1].trim().replace(/,/g, ' ');
            printerNames.push({
              name: name,
              driver: 'Unknown',
              status: 'Unknown',
              isDefault: false
            });
          }
        }
      });
      
      console.log('[PRINTER-REG] Found', printerNames.length, 'printers');
      resolve(printerNames);
    });

    reg.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Lädt Drucker aus manueller Konfiguration (Fallback)
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrintersFromConfig() {
  return new Promise((resolve) => {
    try {
      const configPath = path.join(__dirname, 'printers-manual.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('[PRINTER-CONFIG] Loaded', config.printers.length, 'printers from config');
        resolve(config.printers || []);
      } else {
        console.log('[PRINTER-CONFIG] No config file found');
        resolve([]);
      }
    } catch (error) {
      console.error('[PRINTER-CONFIG] Error loading config:', error.message);
      resolve([]);
    }
  });
}

/**
 * Holt alle Windows-Drucker mit mehreren Methoden (Hauptfunktion)
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrinters() {
  console.log('[PRINTER] Starting printer detection...');
  
  // Versuch 1: WMIC (am robustesten)
  try {
    const printers = await getWindowsPrintersViaWmic();
    if (printers.length > 0) {
      console.log('[PRINTER] ✓ WMIC method successful:', printers.length, 'printers');
      return printers;
    }
  } catch (error) {
    console.warn('[PRINTER] WMIC method failed:', error.message);
  }
  
  // Versuch 2: PowerShell mit WMI
  try {
    const printers = await getWindowsPrintersViaPowerShell();
    if (printers.length > 0) {
      console.log('[PRINTER] ✓ PowerShell method successful:', printers.length, 'printers');
      return printers;
    }
  } catch (error) {
    console.warn('[PRINTER] PowerShell method failed:', error.message);
  }
  
  // Versuch 3: Registry
  try {
    const printers = await getWindowsPrintersViaReg();
    if (printers.length > 0) {
      console.log('[PRINTER] ✓ Registry method successful:', printers.length, 'printers');
      return printers;
    }
  } catch (error) {
    console.warn('[PRINTER] Registry method failed:', error.message);
  }
  
  // Versuch 4: Manuelle Konfiguration (FALLBACK)
  console.warn('[PRINTER] All automatic methods failed, trying manual config...');
  try {
    const printers = await getWindowsPrintersFromConfig();
    if (printers.length > 0) {
      console.log('[PRINTER] ✓ Manual config method successful:', printers.length, 'printers');
      console.log('[PRINTER] ⚠️  Using hardcoded printer list from printers-manual.json');
      return printers;
    }
  } catch (error) {
    console.warn('[PRINTER] Manual config method failed:', error.message);
  }
  
  console.error('[PRINTER] ✗ All methods failed!');
  console.error('[PRINTER] Please run: node test-printer-detection.js');
  console.error('[PRINTER] Or edit printers-manual.json with your printer names');
  return [];
}

/**
 * Druckt Text zu Windows-Drucker via PowerShell
 * @param {string} printerName - Name des Druckers
 * @param {string} text - Text zum Drucken
 * @returns {Promise<Object>} Ergebnis
 */
async function printTextToWindows(printerName, text) {
  return new Promise((resolve, reject) => {
    // Temporäre Datei erstellen
    const tempFile = path.join(os.tmpdir(), `tsrid-print-${Date.now()}.txt`);
    
    try {
      fs.writeFileSync(tempFile, text, 'utf8');
    } catch (e) {
      return reject(new Error('Failed to create temp file: ' + e.message));
    }

    console.log('[PRINTER-WIN] Printing to:', printerName);
    console.log('[PRINTER-WIN] Temp file:', tempFile);

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Get-Content -Path "${tempFile}" | Out-Printer -Name "${printerName}"`
    ]);

    let errorOutput = '';

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ps.on('close', (code) => {
      // Temp-Datei löschen
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn('[PRINTER-WIN] Failed to delete temp file:', e.message);
      }

      if (code === 0) {
        console.log('[PRINTER-WIN] Print successful');
        resolve({ success: true, jobId: Date.now() });
      } else {
        console.error('[PRINTER-WIN] Print failed:', errorOutput);
        reject(new Error('Print failed: ' + errorOutput));
      }
    });

    ps.on('error', (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      reject(new Error('Failed to spawn PowerShell: ' + err.message));
    });
  });
}

/**
 * Druckt RAW Daten via PowerShell (funktioniert besser als copy /b)
 * @param {string} printerName - Name des Druckers
 * @param {Buffer|string} data - RAW Daten
 * @returns {Promise<Object>} Ergebnis
 */
async function printRawToWindows(printerName, data) {
  return new Promise((resolve, reject) => {
    // Temporäre Datei erstellen
    const tempFile = path.join(os.tmpdir(), `tsrid-print-raw-${Date.now()}.bin`);
    
    try {
      if (Buffer.isBuffer(data)) {
        fs.writeFileSync(tempFile, data);
      } else {
        fs.writeFileSync(tempFile, data, 'binary');
      }
    } catch (e) {
      return reject(new Error('Failed to create temp file: ' + e.message));
    }

    console.log('[PRINTER-WIN] Printing RAW to:', printerName);
    console.log('[PRINTER-WIN] Temp file:', tempFile);

    // Nutze PowerShell mit Get-Content -Raw für binäre Daten
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-Command',
      `$bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}"); ` +
      `$printer = Get-Printer -Name "${printerName}"; ` +
      `$port = $printer.PortName; ` +
      `Out-Printer -Name "${printerName}" -InputObject ([System.Text.Encoding]::Default.GetString($bytes))`
    ]);

    let output = '';
    let errorOutput = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ps.on('close', (code) => {
      // Temp-Datei löschen
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn('[PRINTER-WIN] Failed to delete temp file:', e.message);
      }

      if (code === 0) {
        console.log('[PRINTER-WIN] RAW print successful');
        resolve({ success: true, jobId: Date.now() });
      } else {
        console.error('[PRINTER-WIN] RAW print failed:', errorOutput || 'Unknown error');
        // Fallback zu Text-Druck wenn RAW fehlschlägt
        console.log('[PRINTER-WIN] Trying text print as fallback...');
        printTextToWindows(printerName, data.toString())
          .then(resolve)
          .catch(reject);
      }
    });

    ps.on('error', (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      reject(new Error('Failed to spawn PowerShell: ' + err.message));
    });
  });
}

/**
 * Druckt Daten direkt an Drucker-Port (für Brother QL)
 * @param {string} printerName - Name des Druckers
 * @param {Buffer|string} data - Daten
 * @returns {Promise<Object>} Ergebnis
 */
async function printDirectToPort(printerName, data) {
  return new Promise(async (resolve, reject) => {
    try {
      // Erst Port-Name des Druckers finden
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        `(Get-Printer -Name "${printerName}").PortName`
      ]);

      let portName = '';
      ps.stdout.on('data', (d) => {
        portName += d.toString().trim();
      });

      ps.on('close', (code) => {
        if (code === 0 && portName) {
          console.log('[PRINTER-WIN] Port found:', portName);
          
          // Wenn es ein USB-Port ist, nutze Text-Druck
          if (portName.startsWith('USB') || portName.startsWith('WSD')) {
            console.log('[PRINTER-WIN] USB/WSD port detected, using text print');
            printTextToWindows(printerName, data.toString())
              .then(resolve)
              .catch(reject);
          } else {
            // Für Netzwerk-Ports versuche direkte Verbindung
            printTextToWindows(printerName, data.toString())
              .then(resolve)
              .catch(reject);
          }
        } else {
          reject(new Error('Failed to get printer port'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Testet Drucker-Verbindung
 * @param {string} printerName - Name des Druckers
 * @returns {Promise<Object>} Status
 */
async function testPrinter(printerName) {
  try {
    const printers = await getWindowsPrinters();
    const printer = printers.find(p => p.name === printerName);
    
    if (!printer) {
      return { success: false, error: 'Printer not found' };
    }
    
    return {
      success: true,
      name: printer.name,
      driver: printer.driver,
      status: printer.status
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getWindowsPrinters,
  printTextToWindows,
  printRawToWindows,
  testPrinter
};
