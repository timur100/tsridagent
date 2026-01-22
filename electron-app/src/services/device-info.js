/**
 * TSRID Device Info Service
 * Sammelt Hardware- und System-Informationen
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// Cache für Device ID
let cachedDeviceId = null;

/**
 * Generiert oder liest die persistente Device ID
 */
function getDeviceId() {
    if (cachedDeviceId) return cachedDeviceId;
    
    const dataDir = process.platform === 'win32' 
        ? path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'TSRID', 'config')
        : path.join(os.homedir(), '.tsrid', 'config');
    
    const deviceIdFile = path.join(dataDir, 'device-id.txt');
    
    // Prüfen ob Device ID existiert
    if (fs.existsSync(deviceIdFile)) {
        cachedDeviceId = fs.readFileSync(deviceIdFile, 'utf8').trim();
        return cachedDeviceId;
    }
    
    // Verzeichnis erstellen falls nicht vorhanden
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Neue Device ID generieren (basierend auf Hardware)
    const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}-${getMACAddress()}`;
    cachedDeviceId = crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 32);
    
    // Speichern
    fs.writeFileSync(deviceIdFile, cachedDeviceId);
    console.log('[DeviceInfo] Neue Device ID generiert:', cachedDeviceId);
    
    return cachedDeviceId;
}

/**
 * Holt die erste MAC-Adresse
 */
function getMACAddress() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                return iface.mac;
            }
        }
    }
    
    return 'unknown-mac';
}

/**
 * Sammelt System-Informationen
 */
function getSystemInfo() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
        deviceId: getDeviceId(),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        osVersion: os.release(),
        osType: os.type(),
        
        // CPU
        cpuModel: cpus[0]?.model || 'Unknown',
        cpuCores: cpus.length,
        cpuSpeed: cpus[0]?.speed || 0,
        
        // Memory
        totalMemoryGB: Math.round(totalMemory / (1024 * 1024 * 1024) * 100) / 100,
        freeMemoryGB: Math.round(freeMemory / (1024 * 1024 * 1024) * 100) / 100,
        usedMemoryPercent: Math.round((1 - freeMemory / totalMemory) * 100),
        
        // Network
        networkInterfaces: Object.keys(os.networkInterfaces()),
        macAddress: getMACAddress(),
        
        // Uptime
        uptimeHours: Math.round(os.uptime() / 3600 * 10) / 10,
        
        // User
        username: os.userInfo().username,
        homeDir: os.homedir(),
        
        // Timestamps
        collectedAt: new Date().toISOString()
    };
}

/**
 * Holt Disk-Informationen (Windows)
 */
async function getDiskInfo() {
    return new Promise((resolve) => {
        if (process.platform !== 'win32') {
            // Linux/Mac
            exec('df -h / | tail -1', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message });
                    return;
                }
                
                const parts = stdout.trim().split(/\s+/);
                resolve({
                    device: parts[0],
                    total: parts[1],
                    used: parts[2],
                    available: parts[3],
                    usedPercent: parseInt(parts[4])
                });
            });
        } else {
            // Windows
            exec('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message });
                    return;
                }
                
                const lines = stdout.trim().split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    resolve({ error: 'Could not parse disk info' });
                    return;
                }
                
                const parts = lines[1].split(',');
                const freeSpace = parseInt(parts[1]) || 0;
                const totalSize = parseInt(parts[2]) || 0;
                const usedSpace = totalSize - freeSpace;
                
                resolve({
                    device: 'C:',
                    totalGB: Math.round(totalSize / (1024 * 1024 * 1024) * 10) / 10,
                    usedGB: Math.round(usedSpace / (1024 * 1024 * 1024) * 10) / 10,
                    freeGB: Math.round(freeSpace / (1024 * 1024 * 1024) * 10) / 10,
                    usedPercent: totalSize > 0 ? Math.round(usedSpace / totalSize * 100) : 0
                });
            });
        }
    });
}

/**
 * Holt Netzwerk-Status
 */
function getNetworkStatus() {
    const interfaces = os.networkInterfaces();
    const result = {
        connected: false,
        interfaces: []
    };
    
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            if (!addr.internal) {
                result.interfaces.push({
                    name,
                    address: addr.address,
                    family: addr.family,
                    mac: addr.mac
                });
                
                if (addr.family === 'IPv4') {
                    result.connected = true;
                }
            }
        }
    }
    
    return result;
}

/**
 * Prüft Internet-Verbindung
 */
async function checkInternetConnection(testUrl = 'https://www.google.com') {
    return new Promise((resolve) => {
        const https = require('https');
        const url = new URL(testUrl);
        
        const req = https.request({
            hostname: url.hostname,
            port: 443,
            method: 'HEAD',
            timeout: 5000
        }, (res) => {
            resolve({
                connected: true,
                statusCode: res.statusCode,
                latencyMs: Date.now() - startTime
            });
        });
        
        const startTime = Date.now();
        
        req.on('error', () => {
            resolve({
                connected: false,
                error: 'Connection failed'
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                connected: false,
                error: 'Connection timeout'
            });
        });
        
        req.end();
    });
}

/**
 * Holt Windows-spezifische Infos (Seriennummer, BIOS, etc.)
 */
async function getWindowsInfo() {
    if (process.platform !== 'win32') {
        return null;
    }
    
    return new Promise((resolve) => {
        const commands = [
            'wmic bios get SerialNumber /format:csv',
            'wmic computersystem get Manufacturer,Model /format:csv',
            'wmic os get Caption,Version /format:csv'
        ];
        
        const results = {};
        let completed = 0;
        
        commands.forEach((cmd, index) => {
            exec(cmd, (error, stdout) => {
                if (!error) {
                    const lines = stdout.trim().split('\n').filter(l => l.trim());
                    if (lines.length >= 2) {
                        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                        const values = lines[1].split(',').map(v => v.trim());
                        
                        headers.forEach((header, i) => {
                            if (header && values[i]) {
                                results[header] = values[i];
                            }
                        });
                    }
                }
                
                completed++;
                if (completed === commands.length) {
                    resolve({
                        serialNumber: results.serialnumber || 'Unknown',
                        manufacturer: results.manufacturer || 'Unknown',
                        model: results.model || 'Unknown',
                        osCaption: results.caption || 'Unknown',
                        osVersion: results.version || 'Unknown'
                    });
                }
            });
        });
    });
}

/**
 * Sammelt alle Geräteinformationen
 */
async function getFullDeviceInfo() {
    const [diskInfo, internetStatus, windowsInfo] = await Promise.all([
        getDiskInfo(),
        checkInternetConnection(),
        getWindowsInfo()
    ]);
    
    return {
        ...getSystemInfo(),
        disk: diskInfo,
        network: {
            ...getNetworkStatus(),
            internet: internetStatus
        },
        windows: windowsInfo
    };
}

/**
 * Generiert einen Heartbeat-Payload
 */
async function getHeartbeatPayload() {
    const systemInfo = getSystemInfo();
    const networkStatus = getNetworkStatus();
    
    return {
        deviceId: systemInfo.deviceId,
        hostname: systemInfo.hostname,
        platform: systemInfo.platform,
        osVersion: systemInfo.osVersion,
        
        status: 'online',
        
        memory: {
            usedPercent: systemInfo.usedMemoryPercent,
            freeGB: systemInfo.freeMemoryGB
        },
        
        network: {
            connected: networkStatus.connected,
            interfaces: networkStatus.interfaces.length
        },
        
        uptime: systemInfo.uptimeHours,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    getDeviceId,
    getMACAddress,
    getSystemInfo,
    getDiskInfo,
    getNetworkStatus,
    checkInternetConnection,
    getWindowsInfo,
    getFullDeviceInfo,
    getHeartbeatPayload
};
