/**
 * TSRID Background Agent Service
 * Läuft im Hintergrund, sammelt Daten und synchronisiert mit Backend
 */

const { app, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const systemInfoCollector = require('./system-info-collector');
const database = require('./database');

class BackgroundAgent {
  constructor() {
    this.tray = null;
    this.isRunning = false;
    this.heartbeatInterval = null;
    this.syncInterval = null;
    this.config = {
      serverUrl: 'https://tablet-fleet-sync.preview.emergentagent.com',
      heartbeatIntervalMs: 30000,  // 30 Sekunden
      fullSyncIntervalMs: 300000,  // 5 Minuten
      retryDelayMs: 10000          // 10 Sekunden bei Fehler
    };
    this.deviceId = null;
    this.lastHeartbeat = null;
    this.lastSync = null;
    this.status = 'initializing';
    this.errorCount = 0;
  }

  /**
   * Agent initialisieren
   */
  async init(mainWindow) {
    console.log('[BackgroundAgent] Initialisiere...');
    this.mainWindow = mainWindow;
    
    try {
      // Device ID laden oder generieren
      this.deviceId = database.getConfig('device_id');
      if (!this.deviceId) {
        this.deviceId = this.generateDeviceId();
        database.setConfig('device_id', this.deviceId);
      }
      
      console.log('[BackgroundAgent] Device ID:', this.deviceId);
      
      // System-Informationen sammeln
      const systemInfo = await systemInfoCollector.collectAll();
      console.log('[BackgroundAgent] System-Info gesammelt:', {
        hostname: systemInfo.hostname,
        pcSerial: systemInfo.pcSerial,
        teamviewerId: systemInfo.teamviewerId,
        macAddresses: systemInfo.macAddresses,
        hardwareHash: systemInfo.hardwareHash
      });
      
      // In lokale DB speichern
      this.saveSystemInfo(systemInfo);
      
      // Beim Server registrieren
      await this.registerDevice(systemInfo);
      
      // System Tray erstellen
      this.createTray();
      
      // Heartbeat starten
      this.startHeartbeat();
      
      // Sync starten
      this.startSync();
      
      this.isRunning = true;
      this.status = 'running';
      console.log('[BackgroundAgent] Erfolgreich gestartet');
      
    } catch (error) {
      console.error('[BackgroundAgent] Initialisierung fehlgeschlagen:', error);
      this.status = 'error';
      this.errorCount++;
    }
  }

  /**
   * Device ID generieren
   */
  generateDeviceId() {
    const { v4: uuidv4 } = require('uuid');
    return `TSRID-${uuidv4()}`;
  }

  /**
   * System Tray Icon erstellen
   */
  createTray() {
    try {
      // Icon erstellen (16x16 für Tray)
      const iconPath = path.join(__dirname, '../../assets/icon.png');
      
      // Fallback: Leeres Icon wenn Datei nicht existiert
      let icon;
      try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) {
          icon = this.createDefaultIcon();
        }
      } catch {
        icon = this.createDefaultIcon();
      }
      
      this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
      this.tray.setToolTip('TSRID Agent - Aktiv');
      
      this.updateTrayMenu();
      
      // Doppelklick öffnet Hauptfenster
      this.tray.on('double-click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
      
      console.log('[BackgroundAgent] System Tray erstellt');
    } catch (error) {
      console.error('[BackgroundAgent] Tray-Erstellung fehlgeschlagen:', error);
    }
  }

  /**
   * Default Icon erstellen
   */
  createDefaultIcon() {
    // Einfaches 16x16 farbiges Icon
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 192;     // R
      canvas[i * 4 + 1] = 0;   // G
      canvas[i * 4 + 2] = 0;   // B
      canvas[i * 4 + 3] = 255; // A
    }
    
    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }

  /**
   * Tray-Menü aktualisieren
   */
  updateTrayMenu() {
    if (!this.tray) return;
    
    const statusText = this.status === 'running' ? '● Online' : 
                       this.status === 'error' ? '● Fehler' : '○ Offline';
    
    const contextMenu = Menu.buildFromTemplate([
      { label: `TSRID Agent - ${statusText}`, enabled: false },
      { type: 'separator' },
      { label: `Device: ${this.deviceId?.substring(0, 20)}...`, enabled: false },
      { label: `Letzter Heartbeat: ${this.lastHeartbeat ? new Date(this.lastHeartbeat).toLocaleTimeString() : 'Nie'}`, enabled: false },
      { type: 'separator' },
      { 
        label: 'Scan App öffnen', 
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.loadURL(this.config.serverUrl);
            this.mainWindow.show();
          }
        }
      },
      { 
        label: 'Admin Portal öffnen', 
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.loadURL(`${this.config.serverUrl}/portal/admin`);
            this.mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Jetzt synchronisieren', 
        click: () => this.forceSync()
      },
      { 
        label: 'System-Info anzeigen', 
        click: () => this.showSystemInfo()
      },
      { type: 'separator' },
      { 
        label: 'Beenden', 
        click: () => {
          this.stop();
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * System-Info in Datenbank speichern
   */
  saveSystemInfo(info) {
    try {
      database.setConfig('system_info', JSON.stringify(info));
      database.setConfig('system_info_updated', new Date().toISOString());
      database.setConfig('hardware_hash', info.hardwareHash);
      
      // Wichtige Einzelwerte auch separat speichern
      if (info.teamviewerId) {
        database.setConfig('teamviewer_id', info.teamviewerId);
      }
      if (info.pcSerial) {
        database.setConfig('pc_serial', info.pcSerial);
      }
      if (info.macAddresses?.length > 0) {
        database.setConfig('mac_address', info.macAddresses[0]);
      }
      if (info.ipAddresses?.ipv4?.length > 0) {
        database.setConfig('ip_address', info.ipAddresses.ipv4[0]);
      }
      if (info.gpsCoordinates) {
        database.setConfig('gps_coordinates', JSON.stringify(info.gpsCoordinates));
      }
      
    } catch (error) {
      console.error('[BackgroundAgent] Fehler beim Speichern:', error);
    }
  }

  /**
   * Gerät beim Server registrieren
   */
  async registerDevice(systemInfo) {
    console.log('[BackgroundAgent] Registriere Gerät...');
    
    const payload = {
      device_id: this.deviceId,
      hostname: systemInfo.hostname,
      platform: systemInfo.platform,
      os_version: systemInfo.osVersion,
      hardware_hash: systemInfo.hardwareHash,
      
      // Seriennummern
      pc_serial: systemInfo.pcSerial,
      bios_serial: systemInfo.biosSerial,
      motherboard_serial: systemInfo.motherboardSerial,
      
      // TeamViewer
      teamviewer_id: systemInfo.teamviewerId,
      teamviewer_remote_id: systemInfo.teamviewerRemoteControlId,
      
      // Netzwerk
      mac_addresses: systemInfo.macAddresses,
      ip_addresses: systemInfo.ipAddresses,
      
      // Scanner
      connected_scanners: systemInfo.connectedScanners,
      
      // GPS
      gps_coordinates: systemInfo.gpsCoordinates,
      
      // Windows
      windows_product_id: systemInfo.windowsProductId,
      windows_version: systemInfo.windowsVersion,
      
      // Zusätzliche Hardware-Info
      cpu_model: systemInfo.cpuModel,
      cpu_cores: systemInfo.cpuCores,
      total_memory: systemInfo.totalMemory,
      
      // Meta
      agent_version: app.getVersion(),
      registered_at: new Date().toISOString()
    };
    
    try {
      const response = await this.httpPost('/api/agent/register-device', payload);
      console.log('[BackgroundAgent] Registrierung erfolgreich:', response);
      database.setConfig('registration_status', 'registered');
      database.setConfig('registration_date', new Date().toISOString());
      return response;
    } catch (error) {
      console.error('[BackgroundAgent] Registrierung fehlgeschlagen:', error);
      database.setConfig('registration_status', 'failed');
      throw error;
    }
  }

  /**
   * Heartbeat starten
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Sofort ersten Heartbeat senden
    this.sendHeartbeat();
    
    // Regelmäßigen Heartbeat starten
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);
    
    console.log('[BackgroundAgent] Heartbeat gestartet (alle', this.config.heartbeatIntervalMs / 1000, 'Sekunden)');
  }

  /**
   * Heartbeat senden
   */
  async sendHeartbeat() {
    const payload = {
      device_id: this.deviceId,
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      app_version: app.getVersion()
    };
    
    try {
      await this.httpPost('/api/agent/heartbeat', payload);
      this.lastHeartbeat = Date.now();
      this.errorCount = 0;
      this.status = 'running';
      this.updateTrayMenu();
    } catch (error) {
      console.error('[BackgroundAgent] Heartbeat fehlgeschlagen:', error.message);
      this.errorCount++;
      if (this.errorCount > 5) {
        this.status = 'error';
        this.updateTrayMenu();
      }
    }
  }

  /**
   * Sync starten
   */
  startSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Regelmäßigen Sync starten
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.config.fullSyncIntervalMs);
    
    console.log('[BackgroundAgent] Sync gestartet (alle', this.config.fullSyncIntervalMs / 60000, 'Minuten)');
  }

  /**
   * Vollständigen Sync durchführen
   */
  async performSync() {
    console.log('[BackgroundAgent] Starte Sync...');
    
    try {
      // Aktuelle System-Info sammeln
      const systemInfo = await systemInfoCollector.collectAll();
      
      // Mit Server synchronisieren
      const payload = {
        device_id: this.deviceId,
        system_info: systemInfo,
        local_scans: database.getUnsynced ? database.getUnsynced() : [],
        synced_at: new Date().toISOString()
      };
      
      const response = await this.httpPost('/api/agent/sync', payload);
      
      this.lastSync = Date.now();
      console.log('[BackgroundAgent] Sync erfolgreich');
      
      // Lokale Daten aktualisieren
      this.saveSystemInfo(systemInfo);
      
      return response;
    } catch (error) {
      console.error('[BackgroundAgent] Sync fehlgeschlagen:', error.message);
      throw error;
    }
  }

  /**
   * Sync erzwingen
   */
  async forceSync() {
    try {
      await this.performSync();
      this.showNotification('Sync erfolgreich', 'Alle Daten wurden synchronisiert.');
    } catch (error) {
      this.showNotification('Sync fehlgeschlagen', error.message);
    }
  }

  /**
   * System-Info Dialog anzeigen
   */
  async showSystemInfo() {
    const info = await systemInfoCollector.getCached();
    
    const message = `
TSRID Agent System-Informationen

Device ID: ${this.deviceId}
Hostname: ${info.hostname}
Hardware-Hash: ${info.hardwareHash?.substring(0, 16)}...

PC-Serial: ${info.pcSerial || 'N/A'}
TeamViewer-ID: ${info.teamviewerId || 'N/A'}
MAC-Adresse: ${info.macAddresses?.[0] || 'N/A'}
IP-Adresse: ${info.ipAddresses?.ipv4?.[0] || 'N/A'}

Scanner: ${info.connectedScanners?.length || 0} verbunden
GPS: ${info.gpsCoordinates ? `${info.gpsCoordinates.latitude}, ${info.gpsCoordinates.longitude}` : 'N/A'}

Status: ${this.status}
Letzter Heartbeat: ${this.lastHeartbeat ? new Date(this.lastHeartbeat).toLocaleString() : 'Nie'}
Letzter Sync: ${this.lastSync ? new Date(this.lastSync).toLocaleString() : 'Nie'}
    `.trim();
    
    const { dialog } = require('electron');
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'TSRID Agent - System-Info',
      message: 'System-Informationen',
      detail: message,
      buttons: ['OK', 'In Zwischenablage kopieren']
    }).then(result => {
      if (result.response === 1) {
        const { clipboard } = require('electron');
        clipboard.writeText(message);
      }
    });
  }

  /**
   * Benachrichtigung anzeigen
   */
  showNotification(title, body) {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }

  /**
   * HTTP POST Request
   */
  httpPost(endpoint, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.config.serverUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-Device-ID': this.deviceId,
          'X-Agent-Version': app.getVersion()
        },
        timeout: 10000
      };
      
      const req = lib.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  /**
   * Agent stoppen
   */
  stop() {
    console.log('[BackgroundAgent] Stoppe...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.tray) {
      this.tray.destroy();
    }
    
    this.isRunning = false;
    this.status = 'stopped';
    
    console.log('[BackgroundAgent] Gestoppt');
  }
}

module.exports = new BackgroundAgent();
