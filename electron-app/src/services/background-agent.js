/**
 * TSRID Background Agent Service - Simplified & Robust
 */

const { app, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const crypto = require('crypto');
const https = require('https');

class BackgroundAgent {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
    this.isRunning = false;
    this.heartbeatInterval = null;
    this.deviceId = null;
    this.systemInfo = null;
    this.lastHeartbeat = null;
    this.status = 'initializing';
    this.serverUrl = 'https://multitenantapp-4.preview.emergentagent.com';
  }

  /**
   * Agent initialisieren
   */
  async init(mainWindow) {
    console.log('[Agent] ========================================');
    console.log('[Agent] TSRID Background Agent wird gestartet...');
    console.log('[Agent] ========================================');
    
    this.mainWindow = mainWindow;
    
    try {
      // Device ID generieren
      this.deviceId = this.generateDeviceId();
      console.log('[Agent] Device ID:', this.deviceId);
      
      // System-Info sammeln
      console.log('[Agent] Sammle System-Informationen...');
      this.systemInfo = await this.collectSystemInfo();
      console.log('[Agent] System-Info gesammelt:', JSON.stringify(this.systemInfo, null, 2));
      
      // Tray erstellen
      console.log('[Agent] Erstelle System Tray...');
      this.createTray();
      
      // Heartbeat starten
      console.log('[Agent] Starte Heartbeat...');
      this.startHeartbeat();
      
      // Status anzeigen im Fenster
      this.showStatusInWindow();
      
      this.isRunning = true;
      this.status = 'running';
      console.log('[Agent] ✓ Agent erfolgreich gestartet!');
      
    } catch (error) {
      console.error('[Agent] ✗ Fehler beim Initialisieren:', error);
      this.status = 'error';
      
      // Zeige Fehlermeldung im Fenster
      if (this.mainWindow) {
        this.mainWindow.webContents.executeJavaScript(`
          console.error('TSRID Agent Fehler:', '${error.message}');
        `);
      }
    }
  }

  /**
   * Device ID generieren
   */
  generateDeviceId() {
    const hostname = os.hostname();
    const macs = this.getMacAddresses();
    const hash = crypto.createHash('md5')
      .update(hostname + macs.join(''))
      .digest('hex')
      .substring(0, 12);
    return `TSRID-${hash}`;
  }

  /**
   * MAC-Adressen sammeln
   */
  getMacAddresses() {
    const interfaces = os.networkInterfaces();
    const macs = [];
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs) {
        if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
          macs.push(addr.mac);
        }
      }
    }
    return [...new Set(macs)];
  }

  /**
   * IP-Adressen sammeln
   */
  getIPAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal && addr.family === 'IPv4') {
          ips.push(addr.address);
        }
      }
    }
    return ips;
  }

  /**
   * System-Informationen sammeln
   */
  async collectSystemInfo() {
    const info = {
      // Basis
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      osVersion: os.release(),
      
      // Netzwerk
      macAddresses: this.getMacAddresses(),
      ipAddresses: this.getIPAddresses(),
      
      // Hardware
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
      
      // User
      username: os.userInfo().username,
      
      // Timestamps
      collectedAt: new Date().toISOString()
    };

    // Windows-spezifische Infos
    if (process.platform === 'win32') {
      info.pcSerial = await this.getWmicValue('bios get serialnumber');
      info.motherboardSerial = await this.getWmicValue('baseboard get serialnumber');
      info.windowsProductId = await this.getWmicValue('os get serialnumber');
      info.teamviewerId = await this.getTeamViewerId();
    }

    // Hardware Hash
    info.hardwareHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        hostname: info.hostname,
        mac: info.macAddresses[0],
        pcSerial: info.pcSerial
      }))
      .digest('hex').substring(0, 16);

    return info;
  }

  /**
   * WMIC Wert auslesen
   */
  getWmicValue(command) {
    return new Promise((resolve) => {
      exec(`wmic ${command}`, { timeout: 5000 }, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split('\n');
        const value = lines[1]?.trim();
        resolve(value && value !== '' ? value : null);
      });
    });
  }

  /**
   * TeamViewer ID auslesen
   */
  getTeamViewerId() {
    return new Promise((resolve) => {
      const regPaths = [
        'HKLM\\SOFTWARE\\TeamViewer',
        'HKLM\\SOFTWARE\\WOW6432Node\\TeamViewer'
      ];
      
      const tryPath = (index) => {
        if (index >= regPaths.length) {
          resolve(null);
          return;
        }
        
        exec(`reg query "${regPaths[index]}" /v ClientID 2>nul`, { timeout: 3000 }, (error, stdout) => {
          if (!error && stdout.includes('ClientID')) {
            const match = stdout.match(/ClientID\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
            if (match) {
              resolve(parseInt(match[1], 16).toString());
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
   * System Tray erstellen
   */
  createTray() {
    try {
      // Erstelle ein einfaches Icon
      const icon = this.createIcon();
      
      this.tray = new Tray(icon);
      this.tray.setToolTip('TSRID Agent - Aktiv');
      
      // Kontextmenü
      this.updateTrayMenu();
      
      // Events
      this.tray.on('double-click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
      
      console.log('[Agent] ✓ System Tray erstellt');
      
    } catch (error) {
      console.error('[Agent] ✗ Tray Fehler:', error);
    }
  }

  /**
   * Icon erstellen
   */
  createIcon() {
    // Versuche verschiedene Icon-Pfade
    const iconPaths = [
      path.join(__dirname, '../../assets/tray-icon.png'),
      path.join(__dirname, '../../assets/tray-icon-32.png'),
      path.join(__dirname, '../../assets/icon.png'),
      path.join(__dirname, '../../assets/icon.ico')
    ];
    
    for (const iconPath of iconPaths) {
      try {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          console.log('[Agent] Icon geladen:', iconPath);
          return icon.resize({ width: 16, height: 16 });
        }
      } catch (e) {
        // Weiter zum nächsten
      }
    }
    
    console.log('[Agent] Kein Icon gefunden, erstelle Standard-Icon');
    
    // Fallback: Erstelle einfaches rotes Icon
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      buffer[i * 4] = 200;     // R
      buffer[i * 4 + 1] = 0;   // G
      buffer[i * 4 + 2] = 0;   // B
      buffer[i * 4 + 3] = 255; // A
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  /**
   * Tray-Menü aktualisieren
   */
  updateTrayMenu() {
    if (!this.tray) return;
    
    const statusIcon = this.status === 'running' ? '●' : '○';
    const statusText = this.status === 'running' ? 'Online' : 'Offline';
    
    const menu = Menu.buildFromTemplate([
      { label: `TSRID Agent ${statusIcon} ${statusText}`, enabled: false },
      { type: 'separator' },
      { label: `Device: ${this.deviceId}`, enabled: false },
      { label: `IP: ${this.systemInfo?.ipAddresses?.[0] || 'N/A'}`, enabled: false },
      { label: `TeamViewer: ${this.systemInfo?.teamviewerId || 'N/A'}`, enabled: false },
      { type: 'separator' },
      { 
        label: '📱 Scan App öffnen', 
        click: () => this.openUrl('/') 
      },
      { 
        label: '⚙️ Admin Portal öffnen', 
        click: () => this.openUrl('/portal/admin') 
      },
      { type: 'separator' },
      { 
        label: '🔄 Jetzt synchronisieren', 
        click: () => this.sendHeartbeat(true) 
      },
      { 
        label: 'ℹ️ System-Info anzeigen', 
        click: () => this.showSystemInfoDialog() 
      },
      { type: 'separator' },
      { 
        label: '❌ Beenden (Passwort erforderlich)', 
        click: () => this.exitWithPassword()
      }
    ]);
    
    this.tray.setContextMenu(menu);
  }

  /**
   * Beenden mit Passwort
   */
  exitWithPassword() {
    // Zeige Passwort-Dialog
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      
      this.mainWindow.webContents.executeJavaScript(`
        (function() {
          const password = prompt('Admin-Passwort zum Beenden eingeben:');
          if (password === 'tsrid2024!') {
            return 'VALID';
          } else if (password !== null) {
            alert('Falsches Passwort!');
            return 'INVALID';
          }
          return 'CANCELLED';
        })();
      `).then((result) => {
        if (result === 'VALID') {
          console.log('[Agent] Beenden mit gültigem Passwort');
          this.stop();
          app.isQuitting = true;
          app.quit();
        }
      });
    } else {
      // Fallback wenn kein Fenster
      this.stop();
      app.isQuitting = true;
      app.quit();
    }
  }

  /**
   * URL öffnen
   */
  openUrl(path) {
    if (this.mainWindow) {
      this.mainWindow.loadURL(this.serverUrl + path);
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * Status im Fenster anzeigen
   */
  showStatusInWindow() {
    if (!this.mainWindow) return;
    
    // Zeige kurze Benachrichtigung
    this.mainWindow.webContents.executeJavaScript(`
      (function() {
        const div = document.createElement('div');
        div.id = 'tsrid-agent-status';
        div.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#1a1a1a;color:#4ade80;padding:10px 15px;border-radius:8px;font-family:system-ui;font-size:12px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        div.innerHTML = '● TSRID Agent aktiv<br><small style="color:#888">Device: ${this.deviceId}</small>';
        document.body.appendChild(div);
        setTimeout(() => {
          div.style.transition = 'opacity 0.5s';
          div.style.opacity = '0';
          setTimeout(() => div.remove(), 500);
        }, 5000);
      })();
    `);
  }

  /**
   * System-Info Dialog
   */
  showSystemInfoDialog() {
    const info = this.systemInfo;
    const message = `
TSRID Agent System-Informationen
================================

Device ID: ${this.deviceId}
Status: ${this.status}
Letzter Heartbeat: ${this.lastHeartbeat || 'Nie'}

HARDWARE
--------
Hostname: ${info?.hostname || 'N/A'}
PC-Serial: ${info?.pcSerial || 'N/A'}
Motherboard: ${info?.motherboardSerial || 'N/A'}
CPU: ${info?.cpuModel || 'N/A'}
RAM: ${info?.totalMemory || 'N/A'}

NETZWERK
--------
MAC: ${info?.macAddresses?.[0] || 'N/A'}
IP: ${info?.ipAddresses?.join(', ') || 'N/A'}

SOFTWARE
--------
TeamViewer-ID: ${info?.teamviewerId || 'Nicht installiert'}
Windows-ID: ${info?.windowsProductId || 'N/A'}
OS: ${info?.platform || 'N/A'} ${info?.osVersion || ''}

Hash: ${info?.hardwareHash || 'N/A'}
    `.trim();
    
    dialog.showMessageBox({
      type: 'info',
      title: 'TSRID Agent',
      message: 'System-Informationen',
      detail: message,
      buttons: ['OK', 'Kopieren']
    }).then(result => {
      if (result.response === 1) {
        require('electron').clipboard.writeText(message);
      }
    });
  }

  /**
   * Heartbeat starten
   */
  startHeartbeat() {
    // Sofort ersten Heartbeat
    this.sendHeartbeat();
    
    // Alle 30 Sekunden
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    
    console.log('[Agent] ✓ Heartbeat gestartet (alle 30 Sek.)');
  }

  /**
   * Heartbeat senden
   */
  async sendHeartbeat(showNotification = false) {
    const data = {
      device_id: this.deviceId,
      timestamp: new Date().toISOString(),
      status: 'online',
      system_info: this.systemInfo,
      app_version: app.getVersion()
    };
    
    try {
      await this.httpPost('/api/agent/heartbeat', data);
      this.lastHeartbeat = new Date().toLocaleTimeString();
      this.status = 'running';
      this.updateTrayMenu();
      
      if (showNotification) {
        this.showNotification('Sync erfolgreich', 'Daten wurden synchronisiert');
      }
      
      console.log('[Agent] ✓ Heartbeat gesendet');
    } catch (error) {
      console.error('[Agent] ✗ Heartbeat Fehler:', error.message);
      
      if (showNotification) {
        this.showNotification('Sync Fehler', error.message);
      }
    }
  }

  /**
   * HTTP POST
   */
  httpPost(endpoint, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.serverUrl);
      const postData = JSON.stringify(data);
      
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  /**
   * Benachrichtigung
   */
  showNotification(title, body) {
    if (Notification.isSupported()) {
      new Notification({ title: `TSRID Agent: ${title}`, body }).show();
    }
  }

  /**
   * Agent stoppen
   */
  stop() {
    console.log('[Agent] Stoppe...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.tray) {
      this.tray.destroy();
    }
    
    this.isRunning = false;
    console.log('[Agent] Gestoppt');
  }
}

module.exports = new BackgroundAgent();
