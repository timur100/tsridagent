/**
 * TSRID Sync Engine
 * Synchronisiert lokale Daten mit MongoDB Atlas
 */

const https = require('https');
const http = require('http');
const database = require('./database');
const deviceInfo = require('./device-info');

// Konfiguration
const DEFAULT_SYNC_INTERVAL = 30000; // 30 Sekunden
const HEARTBEAT_INTERVAL = 60000; // 60 Sekunden
const MAX_BATCH_SIZE = 50; // Max Scans pro Sync

let syncInterval = null;
let heartbeatInterval = null;
let isRunning = false;

/**
 * Macht einen HTTP Request
 */
function makeRequest(url, method, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TSRID-Agent/1.0',
                ...headers
            },
            timeout: 30000
        };
        
        const req = lib.request(options, (res) => {
            let body = '';
            
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: json });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${json.message || body}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: body });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * Holt die Server-URL aus der Konfiguration
 */
function getServerUrl() {
    return database.getConfig('server_url', 'https://multitenantapp-4.preview.emergentagent.com');
}

/**
 * Holt das Auth-Token
 */
function getAuthToken() {
    return database.getConfig('auth_token', null);
}

/**
 * Synchronisiert pending Scans zum Server
 */
async function syncScans() {
    const serverUrl = getServerUrl();
    const authToken = getAuthToken();
    const deviceId = deviceInfo.getDeviceId();
    
    // Pending Scans holen
    const pendingScans = database.getPendingScans(MAX_BATCH_SIZE);
    
    if (pendingScans.length === 0) {
        console.log('[Sync] Keine pending Scans');
        return { synced: 0, errors: 0 };
    }
    
    console.log(`[Sync] Synchronisiere ${pendingScans.length} Scans...`);
    
    // Sync-Log starten
    const logId = database.logSyncStart('sync_scans', pendingScans.length);
    
    let synced = 0;
    let errors = 0;
    const syncedIds = [];
    
    try {
        // Batch-Upload versuchen
        const response = await makeRequest(
            `${serverUrl}/api/agent/scans/batch`,
            'POST',
            {
                device_id: deviceId,
                scans: pendingScans.map(scan => ({
                    ...scan,
                    // Konvertiere SQLite-Felder zu MongoDB-Format
                    result_details: scan.result_details ? JSON.parse(scan.result_details) : null,
                    raw_data: scan.raw_data ? JSON.parse(scan.raw_data) : null
                }))
            },
            authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        );
        
        if (response.data.success) {
            // Alle als synced markieren
            const ids = pendingScans.map(s => s.id);
            database.markScansSynced(ids);
            synced = ids.length;
            database.logSyncComplete(logId, 'success');
        } else {
            throw new Error(response.data.message || 'Batch sync failed');
        }
        
    } catch (batchError) {
        console.warn('[Sync] Batch-Sync fehlgeschlagen, versuche einzeln:', batchError.message);
        
        // Fallback: Einzeln synchronisieren
        for (const scan of pendingScans) {
            try {
                await makeRequest(
                    `${serverUrl}/api/agent/scans`,
                    'POST',
                    {
                        device_id: deviceId,
                        scan: {
                            ...scan,
                            result_details: scan.result_details ? JSON.parse(scan.result_details) : null,
                            raw_data: scan.raw_data ? JSON.parse(scan.raw_data) : null
                        }
                    },
                    authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                );
                
                syncedIds.push(scan.id);
                synced++;
                
            } catch (error) {
                console.error(`[Sync] Fehler bei Scan ${scan.id}:`, error.message);
                database.markScanError(scan.id, error.message);
                errors++;
            }
        }
        
        // Erfolgreiche markieren
        if (syncedIds.length > 0) {
            database.markScansSynced(syncedIds);
        }
        
        database.logSyncComplete(logId, errors > 0 ? 'partial' : 'success', 
            errors > 0 ? `${errors} Fehler` : null);
    }
    
    console.log(`[Sync] Abgeschlossen: ${synced} synced, ${errors} errors`);
    database.writeLog('info', 'sync', `Scans synchronisiert: ${synced} OK, ${errors} Fehler`);
    
    return { synced, errors };
}

/**
 * Sendet Heartbeat an Server
 */
async function sendHeartbeat() {
    const serverUrl = getServerUrl();
    const authToken = getAuthToken();
    
    try {
        const payload = await deviceInfo.getHeartbeatPayload();
        
        // Scan-Stats hinzufügen
        const scanStats = database.getScanStats();
        payload.scans = {
            total: scanStats.total,
            pending: scanStats.pending,
            synced: scanStats.synced,
            errors: scanStats.errors
        };
        
        // Location hinzufügen
        payload.location_code = database.getConfig('location_code');
        payload.app_version = database.getConfig('app_version', '1.0.0');
        
        const response = await makeRequest(
            `${serverUrl}/api/agent/heartbeat`,
            'POST',
            payload,
            authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        );
        
        console.log('[Heartbeat] Gesendet:', response.data.received ? 'OK' : 'Fehler');
        
        // Prüfe auf pending Commands
        if (response.data.commands && response.data.commands.length > 0) {
            await processCommands(response.data.commands);
        }
        
        return true;
        
    } catch (error) {
        console.error('[Heartbeat] Fehler:', error.message);
        database.writeLog('error', 'heartbeat', 'Heartbeat fehlgeschlagen', { error: error.message });
        return false;
    }
}

/**
 * Verarbeitet Remote-Befehle vom Server
 */
async function processCommands(commands) {
    console.log(`[Commands] Verarbeite ${commands.length} Befehle...`);
    
    for (const cmd of commands) {
        console.log(`[Command] ${cmd.type}:`, cmd.data);
        
        try {
            switch (cmd.type) {
                case 'update_config':
                    // Konfiguration aktualisieren
                    if (cmd.data) {
                        for (const [key, value] of Object.entries(cmd.data)) {
                            database.setConfig(key, value);
                        }
                    }
                    break;
                    
                case 'restart':
                    // App neu starten
                    console.log('[Command] Restart angefordert...');
                    database.writeLog('info', 'command', 'Restart-Befehl erhalten');
                    // Wird vom Main-Prozess behandelt
                    if (global.mainWindow) {
                        const { app } = require('electron');
                        app.relaunch();
                        app.exit();
                    }
                    break;
                    
                case 'get_logs':
                    // Logs zum Server senden
                    await uploadLogs();
                    break;
                    
                case 'force_sync':
                    // Sofortige Synchronisation
                    await syncScans();
                    break;
                    
                case 'clear_errors':
                    // Error-Scans zurücksetzen
                    // TODO: Implementieren
                    break;
                    
                default:
                    console.warn('[Command] Unbekannter Befehl:', cmd.type);
            }
            
            // Befehl als ausgeführt markieren
            // await acknowledgeCommand(cmd.id);
            
        } catch (error) {
            console.error(`[Command] Fehler bei ${cmd.type}:`, error);
            database.writeLog('error', 'command', `Befehl fehlgeschlagen: ${cmd.type}`, { error: error.message });
        }
    }
}

/**
 * Lädt Logs zum Server hoch
 */
async function uploadLogs() {
    const serverUrl = getServerUrl();
    const authToken = getAuthToken();
    const deviceId = deviceInfo.getDeviceId();
    
    try {
        const logs = database.getRecentLogs(500);
        const syncLogs = database.getRecentSyncLogs(50);
        
        await makeRequest(
            `${serverUrl}/api/agent/${deviceId}/logs`,
            'POST',
            {
                device_id: deviceId,
                app_logs: logs,
                sync_logs: syncLogs,
                system_info: await deviceInfo.getFullDeviceInfo()
            },
            authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        );
        
        console.log('[Logs] Hochgeladen');
        return true;
        
    } catch (error) {
        console.error('[Logs] Upload fehlgeschlagen:', error.message);
        return false;
    }
}

/**
 * Registriert das Gerät beim Server
 */
async function registerDevice() {
    const serverUrl = getServerUrl();
    const authToken = getAuthToken();
    
    try {
        const fullInfo = await deviceInfo.getFullDeviceInfo();
        const locationCode = database.getConfig('location_code');
        
        const response = await makeRequest(
            `${serverUrl}/api/agent/register`,
            'POST',
            {
                device_id: fullInfo.deviceId,
                location_code: locationCode,
                device_info: fullInfo,
                app_version: database.getConfig('app_version', '1.0.0'),
                registered_at: new Date().toISOString()
            },
            authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        );
        
        if (response.data.success) {
            console.log('[Register] Gerät registriert');
            database.setConfig('registered', true);
            database.setConfig('registration_date', new Date().toISOString());
            
            // Token speichern falls vom Server gesendet
            if (response.data.token) {
                database.setConfig('auth_token', response.data.token);
            }
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('[Register] Fehler:', error.message);
        database.writeLog('error', 'register', 'Registrierung fehlgeschlagen', { error: error.message });
        return false;
    }
}

/**
 * Startet den Sync-Service
 */
function startSyncService(options = {}) {
    if (isRunning) {
        console.log('[SyncService] Bereits gestartet');
        return;
    }
    
    const syncIntervalMs = options.syncInterval || DEFAULT_SYNC_INTERVAL;
    const heartbeatIntervalMs = options.heartbeatInterval || HEARTBEAT_INTERVAL;
    
    console.log(`[SyncService] Starte (Sync: ${syncIntervalMs}ms, Heartbeat: ${heartbeatIntervalMs}ms)`);
    
    isRunning = true;
    
    // Initiale Synchronisation nach kurzer Verzögerung
    setTimeout(() => {
        syncScans().catch(console.error);
        sendHeartbeat().catch(console.error);
    }, 5000);
    
    // Sync-Interval
    syncInterval = setInterval(() => {
        syncScans().catch(console.error);
    }, syncIntervalMs);
    
    // Heartbeat-Interval
    heartbeatInterval = setInterval(() => {
        sendHeartbeat().catch(console.error);
    }, heartbeatIntervalMs);
    
    database.writeLog('info', 'sync_service', 'Sync-Service gestartet');
}

/**
 * Stoppt den Sync-Service
 */
function stopSyncService() {
    if (!isRunning) return;
    
    console.log('[SyncService] Stoppe...');
    
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    
    isRunning = false;
    database.writeLog('info', 'sync_service', 'Sync-Service gestoppt');
}

/**
 * Prüft ob der Service läuft
 */
function isServiceRunning() {
    return isRunning;
}

/**
 * Erzwingt sofortige Synchronisation
 */
async function forceSyncNow() {
    console.log('[SyncService] Force Sync...');
    const result = await syncScans();
    await sendHeartbeat();
    return result;
}

module.exports = {
    // Service Control
    startSyncService,
    stopSyncService,
    isServiceRunning,
    forceSyncNow,
    
    // Individual Operations
    syncScans,
    sendHeartbeat,
    registerDevice,
    uploadLogs,
    processCommands,
    
    // Helpers
    makeRequest,
    getServerUrl
};
