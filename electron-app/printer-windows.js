/**
 * Windows Printer Support via PowerShell
 * Keine nativen Module nötig - funktioniert sofort!
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Holt alle Windows-Drucker via PowerShell
 * @returns {Promise<Array>} Liste der Drucker
 */
async function getWindowsPrinters() {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-Command',
      'Get-Printer | Select-Object Name,DriverName,PrinterStatus,ComputerName,@{Name="IsDefault";Expression={$_.Name -eq (Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Default=$true").Name}} | ConvertTo-Json'
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
      if (code === 0 && output) {
        try {
          let printers = JSON.parse(output);
          
          // Sicherstellen, dass es ein Array ist
          if (!Array.isArray(printers)) {
            printers = [printers];
          }
          
          const result = printers.map(p => ({
            name: p.Name || '',
            driver: p.DriverName || 'Unknown',
            status: p.PrinterStatus || 'Unknown',
            computer: p.ComputerName || os.hostname(),
            isDefault: p.IsDefault || false
          }));
          
          console.log('[PRINTER-WIN] Found', result.length, 'printers');
          resolve(result);
        } catch (e) {
          console.error('[PRINTER-WIN] Parse error:', e.message);
          reject(new Error('Failed to parse printer list: ' + e.message));
        }
      } else {
        console.error('[PRINTER-WIN] PowerShell error:', errorOutput);
        reject(new Error('Failed to get printers: ' + errorOutput));
      }
    });

    ps.on('error', (err) => {
      reject(new Error('Failed to spawn PowerShell: ' + err.message));
    });
  });
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
 * Druckt RAW Daten (für Brother QL, Zebra, etc.)
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

    // Nutze copy /b für RAW-Druck (binär)
    const cmd = spawn('cmd.exe', [
      '/c',
      `copy /b "${tempFile}" "\\\\${os.hostname()}\\${printerName}"`
    ]);

    let errorOutput = '';

    cmd.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    cmd.on('close', (code) => {
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
        console.error('[PRINTER-WIN] RAW print failed:', errorOutput);
        reject(new Error('RAW print failed: ' + errorOutput));
      }
    });

    cmd.on('error', (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      reject(new Error('Failed to print RAW: ' + err.message));
    });
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
