/**
 * TSRID SQLite Database Service
 * Offline-First Datenspeicherung für Scans und Konfiguration
 */

const path = require('path');
const fs = require('fs');

// Database wird lazy geladen (für Windows-Build mit better-sqlite3)
let Database;
let db = null;

// Pfade
const DATA_DIR = process.platform === 'win32' 
    ? path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'TSRID')
    : path.join(require('os').homedir(), '.tsrid');

const DB_PATH = path.join(DATA_DIR, 'database', 'tsrid.sqlite');
const OFFLINE_DATA_PATH = path.join(DATA_DIR, 'offline-data');

/**
 * Initialisiert die Datenbank
 */
function initDatabase() {
    if (db) return db;
    
    try {
        // Verzeichnisse erstellen
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        if (!fs.existsSync(OFFLINE_DATA_PATH)) {
            fs.mkdirSync(OFFLINE_DATA_PATH, { recursive: true });
        }
        
        // better-sqlite3 laden
        try {
            Database = require('better-sqlite3');
        } catch (e) {
            console.warn('[DB] better-sqlite3 nicht verfügbar, verwende sql.js Fallback');
            // Fallback für Entwicklung ohne native Module
            return initSqlJsFallback();
        }
        
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL'); // Write-Ahead Logging für bessere Performance
        
        console.log('[DB] SQLite Datenbank initialisiert:', DB_PATH);
        
        // Schema erstellen
        createSchema();
        
        return db;
    } catch (error) {
        console.error('[DB] Fehler beim Initialisieren:', error);
        throw error;
    }
}

/**
 * Fallback für Entwicklung ohne native Module
 */
function initSqlJsFallback() {
    console.log('[DB] SQL.js Fallback wird verwendet (nur für Entwicklung)');
    // In-Memory DB für Entwicklung
    return {
        prepare: () => ({ run: () => {}, all: () => [], get: () => null }),
        exec: () => {},
        pragma: () => {},
        _fallback: true
    };
}

/**
 * Erstellt das Datenbank-Schema
 */
function createSchema() {
    if (!db) return;
    
    db.exec(`
        -- Lokale Standort-Cache (für Offline-Setup)
        CREATE TABLE IF NOT EXISTS locations_cache (
            location_code TEXT PRIMARY KEY,
            name TEXT,
            display_name TEXT,
            address TEXT,
            city TEXT,
            country_code TEXT,
            tenant_id TEXT,
            tenant_name TEXT,
            parent_tenant_id TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        
        -- Geräte-Konfiguration
        CREATE TABLE IF NOT EXISTS device_config (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        
        -- Lokale Scans (Offline-Queue)
        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            scan_type TEXT,
            document_type TEXT,
            document_number TEXT,
            first_name TEXT,
            last_name TEXT,
            date_of_birth TEXT,
            nationality TEXT,
            expiry_date TEXT,
            issuing_country TEXT,
            mrz_line1 TEXT,
            mrz_line2 TEXT,
            mrz_line3 TEXT,
            face_image_path TEXT,
            document_front_path TEXT,
            document_back_path TEXT,
            result TEXT,
            result_details TEXT,
            confidence_score REAL,
            location_code TEXT,
            device_id TEXT,
            operator_id TEXT,
            scanner_type TEXT,
            scanned_at TEXT,
            synced_at TEXT,
            sync_status TEXT DEFAULT 'pending',
            sync_error TEXT,
            raw_data TEXT
        );
        
        -- Sync-Protokoll
        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            records_count INTEGER,
            status TEXT,
            error_message TEXT,
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );
        
        -- Pending Commands (vom Server)
        CREATE TABLE IF NOT EXISTS pending_commands (
            id TEXT PRIMARY KEY,
            command_type TEXT,
            command_data TEXT,
            received_at TEXT DEFAULT (datetime('now')),
            executed_at TEXT,
            status TEXT DEFAULT 'pending',
            result TEXT
        );
        
        -- App-Logs (lokale Aufzeichnung)
        CREATE TABLE IF NOT EXISTS app_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT,
            category TEXT,
            message TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        -- Indizes für Performance
        CREATE INDEX IF NOT EXISTS idx_scans_sync_status ON scans(sync_status);
        CREATE INDEX IF NOT EXISTS idx_scans_location ON scans(location_code);
        CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
        CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at);
        CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations_cache(tenant_id);
    `);
    
    console.log('[DB] Schema erstellt/aktualisiert');
}

// ==================== CONFIG FUNCTIONS ====================

/**
 * Speichert einen Konfigurationswert
 */
function setConfig(key, value) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        INSERT INTO device_config (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            updated_at = datetime('now')
    `);
    
    stmt.run(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    console.log('[DB] Config gesetzt:', key);
}

/**
 * Liest einen Konfigurationswert
 */
function getConfig(key, defaultValue = null) {
    if (!db) initDatabase();
    
    const stmt = db.prepare('SELECT value FROM device_config WHERE key = ?');
    const row = stmt.get(key);
    
    if (!row) return defaultValue;
    
    // Versuche JSON zu parsen
    try {
        return JSON.parse(row.value);
    } catch {
        return row.value;
    }
}

/**
 * Holt alle Konfigurationswerte
 */
function getAllConfig() {
    if (!db) initDatabase();
    
    const stmt = db.prepare('SELECT key, value, updated_at FROM device_config');
    const rows = stmt.all();
    
    const config = {};
    for (const row of rows) {
        try {
            config[row.key] = JSON.parse(row.value);
        } catch {
            config[row.key] = row.value;
        }
    }
    
    return config;
}

// ==================== SCAN FUNCTIONS ====================

/**
 * Speichert einen Scan lokal
 */
function saveScan(scanData) {
    if (!db) initDatabase();
    
    const id = scanData.id || require('crypto').randomUUID();
    
    const stmt = db.prepare(`
        INSERT INTO scans (
            id, scan_type, document_type, document_number,
            first_name, last_name, date_of_birth, nationality,
            expiry_date, issuing_country, mrz_line1, mrz_line2, mrz_line3,
            face_image_path, document_front_path, document_back_path,
            result, result_details, confidence_score,
            location_code, device_id, operator_id, scanner_type,
            scanned_at, sync_status, raw_data
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `);
    
    stmt.run(
        id,
        scanData.scan_type || 'id_document',
        scanData.document_type,
        scanData.document_number,
        scanData.first_name,
        scanData.last_name,
        scanData.date_of_birth,
        scanData.nationality,
        scanData.expiry_date,
        scanData.issuing_country,
        scanData.mrz_line1,
        scanData.mrz_line2,
        scanData.mrz_line3,
        scanData.face_image_path,
        scanData.document_front_path,
        scanData.document_back_path,
        scanData.result,
        scanData.result_details ? JSON.stringify(scanData.result_details) : null,
        scanData.confidence_score,
        scanData.location_code || getConfig('location_code'),
        scanData.device_id || getConfig('device_id'),
        scanData.operator_id,
        scanData.scanner_type,
        scanData.scanned_at || new Date().toISOString(),
        'pending',
        scanData.raw_data ? JSON.stringify(scanData.raw_data) : null
    );
    
    console.log('[DB] Scan gespeichert:', id);
    return id;
}

/**
 * Holt alle unsynced Scans
 */
function getPendingScans(limit = 100) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        SELECT * FROM scans 
        WHERE sync_status = 'pending' OR sync_status = 'error'
        ORDER BY scanned_at ASC
        LIMIT ?
    `);
    
    return stmt.all(limit);
}

/**
 * Markiert Scans als synchronisiert
 */
function markScansSynced(ids) {
    if (!db) initDatabase();
    if (!ids || ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
        UPDATE scans 
        SET sync_status = 'synced', synced_at = datetime('now'), sync_error = NULL
        WHERE id IN (${placeholders})
    `);
    
    stmt.run(...ids);
    console.log('[DB] Scans als synced markiert:', ids.length);
}

/**
 * Markiert Scan als Fehler
 */
function markScanError(id, errorMessage) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        UPDATE scans 
        SET sync_status = 'error', sync_error = ?
        WHERE id = ?
    `);
    
    stmt.run(errorMessage, id);
}

/**
 * Holt Scan-Statistiken
 */
function getScanStats() {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
            SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as errors,
            SUM(CASE WHEN result = 'valid' THEN 1 ELSE 0 END) as valid_scans,
            SUM(CASE WHEN result = 'invalid' THEN 1 ELSE 0 END) as invalid_scans
        FROM scans
    `);
    
    return stmt.get();
}

// ==================== LOCATION FUNCTIONS ====================

/**
 * Importiert Standorte aus JSON-Datei (für Offline-Setup)
 */
function importLocationsFromFile() {
    if (!db) initDatabase();
    
    const filePath = path.join(OFFLINE_DATA_PATH, 'locations_cache.json');
    
    if (!fs.existsSync(filePath)) {
        console.log('[DB] Keine Offline-Standortdatei gefunden');
        return 0;
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const locations = Array.isArray(data) ? data : data.locations || [];
        
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO locations_cache (
                location_code, name, display_name, address, city,
                country_code, tenant_id, tenant_name, parent_tenant_id, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        const insertMany = db.transaction((locs) => {
            for (const loc of locs) {
                stmt.run(
                    loc.location_code,
                    loc.name,
                    loc.display_name,
                    loc.address,
                    loc.city,
                    loc.country_code,
                    loc.tenant_id,
                    loc.tenant_name,
                    loc.parent_tenant_id
                );
            }
        });
        
        insertMany(locations);
        console.log('[DB] Standorte importiert:', locations.length);
        return locations.length;
    } catch (error) {
        console.error('[DB] Fehler beim Importieren der Standorte:', error);
        return 0;
    }
}

/**
 * Sucht Standorte (für Offline-Setup)
 */
function searchLocations(query, limit = 50) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        SELECT * FROM locations_cache
        WHERE location_code LIKE ? 
           OR name LIKE ? 
           OR city LIKE ?
           OR display_name LIKE ?
        ORDER BY name
        LIMIT ?
    `);
    
    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern, pattern, pattern, limit);
}

/**
 * Holt alle Standorte
 */
function getAllLocations() {
    if (!db) initDatabase();
    
    const stmt = db.prepare('SELECT * FROM locations_cache ORDER BY name');
    return stmt.all();
}

// ==================== SYNC LOG FUNCTIONS ====================

/**
 * Erstellt einen Sync-Log Eintrag
 */
function logSyncStart(action, recordsCount) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        INSERT INTO sync_log (action, records_count, status)
        VALUES (?, ?, 'started')
    `);
    
    const result = stmt.run(action, recordsCount);
    return result.lastInsertRowid;
}

/**
 * Aktualisiert Sync-Log nach Abschluss
 */
function logSyncComplete(logId, status, errorMessage = null) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        UPDATE sync_log 
        SET status = ?, error_message = ?, completed_at = datetime('now')
        WHERE id = ?
    `);
    
    stmt.run(status, errorMessage, logId);
}

/**
 * Holt letzte Sync-Logs
 */
function getRecentSyncLogs(limit = 20) {
    if (!db) initDatabase();
    
    const stmt = db.prepare(`
        SELECT * FROM sync_log
        ORDER BY started_at DESC
        LIMIT ?
    `);
    
    return stmt.all(limit);
}

// ==================== APP LOG FUNCTIONS ====================

/**
 * Schreibt einen App-Log
 */
function writeLog(level, category, message, details = null) {
    if (!db) initDatabase();
    
    try {
        const stmt = db.prepare(`
            INSERT INTO app_logs (level, category, message, details)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run(level, category, message, details ? JSON.stringify(details) : null);
    } catch (error) {
        console.error('[DB] Fehler beim Schreiben des Logs:', error);
    }
}

/**
 * Holt letzte Logs
 */
function getRecentLogs(limit = 100, level = null) {
    if (!db) initDatabase();
    
    let query = 'SELECT * FROM app_logs';
    const params = [];
    
    if (level) {
        query += ' WHERE level = ?';
        params.push(level);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
}

// ==================== EXPORT ====================

module.exports = {
    // Initialisierung
    initDatabase,
    
    // Pfade
    DATA_DIR,
    DB_PATH,
    OFFLINE_DATA_PATH,
    
    // Config
    setConfig,
    getConfig,
    getAllConfig,
    
    // Scans
    saveScan,
    getPendingScans,
    markScansSynced,
    markScanError,
    getScanStats,
    
    // Locations
    importLocationsFromFile,
    searchLocations,
    getAllLocations,
    
    // Sync Log
    logSyncStart,
    logSyncComplete,
    getRecentSyncLogs,
    
    // App Logs
    writeLog,
    getRecentLogs
};
