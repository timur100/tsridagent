/**
 * TSRID System Information Collector
 * Sammelt alle relevanten Hardware- und System-Informationen
 */

const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SystemInfoCollector {
  constructor() {
    this.cache = {};
    this.cacheTimeout = 60000; // 1 Minute Cache
    this.lastCollection = null;
  }

  /**
   * Sammelt alle System-Informationen
   */
  async collectAll() {
    console.log('[SystemInfo] Sammle System-Informationen...');
    
    const info = {
      // Basis-System
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      osVersion: os.release(),
      osType: os.type(),
      
      // Hardware
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      
      // Netzwerk
      networkInterfaces: this.getNetworkInfo(),
      macAddresses: this.getMacAddresses(),
      ipAddresses: this.getIPAddresses(),
      
      // Identifikation
      pcSerial: await this.getPCSerial(),
      biosSerial: await this.getBIOSSerial(),
      motherboardSerial: await this.getMotherboardSerial(),
      hardwareHash: null, // Wird unten berechnet
      
      // TeamViewer
      teamviewerId: await this.getTeamViewerID(),
      teamviewerRemoteControlId: await this.getTeamViewerRemoteControlID(),
      
      // Scanner
      connectedScanners: await this.getConnectedScanners(),
      usbDevices: await this.getUSBDevices(),
      
      // GPS/Location (falls verfügbar)
      gpsCoordinates: await this.getGPSCoordinates(),
      
      // Zusätzliche Infos
      windowsProductId: await this.getWindowsProductID(),
      windowsVersion: await this.getWindowsVersion(),
      userName: os.userInfo().username,
      userHome: os.userInfo().homedir,
      uptime: os.uptime(),
      
      // Zeitstempel
      collectedAt: new Date().toISOString()
    };
    
    // Hardware-Hash aus eindeutigen Werten generieren
    info.hardwareHash = this.generateHardwareHash(info);
    
    this.cache = info;
    this.lastCollection = Date.now();
    
    console.log('[SystemInfo] Sammlung abgeschlossen');
    return info;
  }

  /**
   * Netzwerk-Informationen sammeln
   */
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const result = [];
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal) {
          result.push({
            interface: name,
            address: addr.address,
            family: addr.family,
            mac: addr.mac,
            netmask: addr.netmask
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Alle MAC-Adressen sammeln
   */
  getMacAddresses() {
    const interfaces = os.networkInterfaces();
    const macs = new Set();
    
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs) {
        if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
          macs.add(addr.mac);
        }
      }
    }
    
    return Array.from(macs);
  }

  /**
   * Alle IP-Adressen sammeln
   */
  getIPAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = { ipv4: [], ipv6: [] };
    
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal) {
          if (addr.family === 'IPv4') {
            ips.ipv4.push(addr.address);
          } else if (addr.family === 'IPv6') {
            ips.ipv6.push(addr.address);
          }
        }
      }
    }
    
    return ips;
  }

  /**
   * PC/Tablet Seriennummer (Windows)
   */
  async getPCSerial() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      exec('wmic bios get serialnumber', (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split('\n');
        const serial = lines[1]?.trim();
        resolve(serial && serial !== '' ? serial : null);
      });
    });
  }

  /**
   * BIOS Seriennummer
   */
  async getBIOSSerial() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      exec('wmic bios get serialnumber', (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split('\n');
        const serial = lines[1]?.trim();
        resolve(serial && serial !== '' ? serial : null);
      });
    });
  }

  /**
   * Motherboard Seriennummer
   */
  async getMotherboardSerial() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      exec('wmic baseboard get serialnumber', (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split('\n');
        const serial = lines[1]?.trim();
        resolve(serial && serial !== '' ? serial : null);
      });
    });
  }

  /**
   * TeamViewer ID auslesen
   */
  async getTeamViewerID() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      // Versuche verschiedene Registry-Pfade
      const regPaths = [
        'HKLM\\SOFTWARE\\TeamViewer',
        'HKLM\\SOFTWARE\\WOW6432Node\\TeamViewer',
        'HKCU\\SOFTWARE\\TeamViewer'
      ];
      
      const tryPath = (index) => {
        if (index >= regPaths.length) {
          resolve(null);
          return;
        }
        
        exec(`reg query "${regPaths[index]}" /v ClientID 2>nul`, (error, stdout) => {
          if (!error && stdout.includes('ClientID')) {
            const match = stdout.match(/ClientID\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
            if (match) {
              const id = parseInt(match[1], 16).toString();
              resolve(id);
              return;
            }
          }
          tryPath(index + 1);
        });
      };
      
      tryPath(0);
    });
  }

  /**
   * TeamViewer RemoteControl ID
   */
  async getTeamViewerRemoteControlID() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      // TeamViewer speichert die Remote Control ID in verschiedenen Locations
      const configPaths = [
        path.join(process.env.APPDATA || '', 'TeamViewer', 'TeamViewer15_Logfile.log'),
        path.join(process.env.PROGRAMDATA || '', 'TeamViewer', 'TeamViewer15_Logfile.log'),
        'C:\\Program Files\\TeamViewer\\TeamViewer15_Logfile.log',
        'C:\\Program Files (x86)\\TeamViewer\\TeamViewer15_Logfile.log'
      ];
      
      // Alternativ: Aus Registry lesen
      exec('reg query "HKLM\\SOFTWARE\\TeamViewer" /v ClientID 2>nul', (error, stdout) => {
        if (!error && stdout.includes('ClientID')) {
          const match = stdout.match(/ClientID\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
          if (match) {
            resolve(parseInt(match[1], 16).toString());
            return;
          }
        }
        resolve(null);
      });
    });
  }

  /**
   * Verbundene Scanner erkennen (Regula, Desko, etc.)
   */
  async getConnectedScanners() {
    const scanners = [];
    
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(scanners);
        return;
      }
      
      // USB-Geräte nach bekannten Scanner-Herstellern durchsuchen
      exec('wmic path Win32_PnPEntity where "Caption like \'%Scanner%\' or Caption like \'%Regula%\' or Caption like \'%Desko%\' or Caption like \'%Document%Reader%\'" get Caption,DeviceID,Manufacturer,PNPDeviceID /format:csv', (error, stdout) => {
        if (error) {
          resolve(scanners);
          return;
        }
        
        const lines = stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 4) {
            scanners.push({
              caption: parts[1]?.trim(),
              deviceId: parts[2]?.trim(),
              manufacturer: parts[3]?.trim(),
              pnpDeviceId: parts[4]?.trim(),
              serial: this.extractSerialFromPnP(parts[4])
            });
          }
        }
        
        resolve(scanners);
      });
    });
  }

  /**
   * Alle USB-Geräte auflisten
   */
  async getUSBDevices() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve([]);
        return;
      }
      
      exec('wmic path Win32_USBControllerDevice get Dependent /format:csv', (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        
        const devices = [];
        const lines = stdout.trim().split('\n').slice(1);
        
        for (const line of lines) {
          if (line.includes('USB')) {
            const match = line.match(/DeviceID="([^"]+)"/);
            if (match) {
              devices.push({
                deviceId: match[1],
                serial: this.extractSerialFromPnP(match[1])
              });
            }
          }
        }
        
        resolve(devices);
      });
    });
  }

  /**
   * Serial aus PnP Device ID extrahieren
   */
  extractSerialFromPnP(pnpId) {
    if (!pnpId) return null;
    // Format: USB\VID_xxxx&PID_xxxx\SERIAL
    const parts = pnpId.split('\\');
    if (parts.length >= 3) {
      return parts[2];
    }
    return null;
  }

  /**
   * GPS-Koordinaten (falls verfügbar)
   */
  async getGPSCoordinates() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      // Windows Location API via PowerShell
      const psScript = `
        Add-Type -AssemblyName System.Device
        $watcher = New-Object System.Device.Location.GeoCoordinateWatcher
        $watcher.Start()
        $timeout = 0
        while (($watcher.Status -ne 'Ready') -and ($timeout -lt 10)) {
          Start-Sleep -Milliseconds 500
          $timeout++
        }
        if ($watcher.Status -eq 'Ready') {
          $coord = $watcher.Position.Location
          Write-Output "$($coord.Latitude),$($coord.Longitude),$($coord.Altitude)"
        }
        $watcher.Stop()
      `;
      
      exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 15000 }, (error, stdout) => {
        if (error || !stdout.trim()) {
          // Fallback: IP-basierte Geolocation könnte hier implementiert werden
          resolve(null);
          return;
        }
        
        const parts = stdout.trim().split(',');
        if (parts.length >= 2) {
          resolve({
            latitude: parseFloat(parts[0]),
            longitude: parseFloat(parts[1]),
            altitude: parts[2] ? parseFloat(parts[2]) : null,
            source: 'windows_location_api'
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Windows Product ID
   */
  async getWindowsProductID() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      exec('wmic os get SerialNumber', (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split('\n');
        resolve(lines[1]?.trim() || null);
      });
    });
  }

  /**
   * Windows Version Details
   */
  async getWindowsVersion() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      
      exec('wmic os get Caption,Version,BuildNumber /format:csv', (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        
        const lines = stdout.trim().split('\n').slice(1);
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          resolve({
            buildNumber: parts[1]?.trim(),
            caption: parts[2]?.trim(),
            version: parts[3]?.trim()
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Hardware-Hash generieren (eindeutiger Fingerprint)
   */
  generateHardwareHash(info) {
    const components = [
      info.pcSerial,
      info.biosSerial,
      info.motherboardSerial,
      info.macAddresses?.[0],
      info.hostname,
      info.windowsProductId
    ].filter(Boolean).join('|');
    
    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Gecachte Daten zurückgeben oder neu sammeln
   */
  async getCached() {
    if (this.lastCollection && (Date.now() - this.lastCollection < this.cacheTimeout)) {
      return this.cache;
    }
    return this.collectAll();
  }

  /**
   * Nur geänderte Daten zurückgeben (für effizientes Sync)
   */
  async getChanges(previousHash) {
    const current = await this.collectAll();
    
    if (current.hardwareHash === previousHash) {
      return { changed: false, hash: current.hardwareHash };
    }
    
    return { changed: true, data: current, hash: current.hardwareHash };
  }
}

module.exports = new SystemInfoCollector();
