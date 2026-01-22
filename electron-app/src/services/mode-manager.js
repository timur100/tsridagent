/**
 * TSRID App Mode Manager
 * Verwaltet Kiosk-Modus und Admin-Modus
 */

const crypto = require('crypto');
const database = require('./database');

// Standard Admin-Passwort (sollte bei erstem Setup geändert werden)
const DEFAULT_ADMIN_PASSWORD = 'tsrid2024!';

// Passwort-Hash für Vergleich
let passwordHash = null;

/**
 * Initialisiert den Mode Manager
 */
function init() {
    // Prüfe ob Passwort bereits gesetzt
    const storedHash = database.getConfig('admin_password_hash');
    
    if (!storedHash) {
        // Standard-Passwort setzen
        setAdminPassword(DEFAULT_ADMIN_PASSWORD);
        console.log('[ModeManager] Standard-Passwort gesetzt');
    } else {
        passwordHash = storedHash;
    }
}

/**
 * Hasht ein Passwort
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'tsrid-salt').digest('hex');
}

/**
 * Setzt das Admin-Passwort
 */
function setAdminPassword(password) {
    if (!password || password.length < 6) {
        throw new Error('Passwort muss mindestens 6 Zeichen haben');
    }
    
    passwordHash = hashPassword(password);
    database.setConfig('admin_password_hash', passwordHash);
    database.writeLog('info', 'security', 'Admin-Passwort geändert');
    
    return true;
}

/**
 * Verifiziert das Admin-Passwort
 */
function verifyAdminPassword(password) {
    if (!passwordHash) {
        init();
    }
    
    const inputHash = hashPassword(password);
    const isValid = inputHash === passwordHash;
    
    if (!isValid) {
        database.writeLog('warn', 'security', 'Fehlgeschlagener Admin-Login Versuch');
    }
    
    return isValid;
}

/**
 * Holt den aktuellen App-Modus
 */
function getCurrentMode() {
    return database.getConfig('app_mode', 'kiosk');
}

/**
 * Setzt den App-Modus
 */
function setMode(mode) {
    if (!['kiosk', 'admin', 'setup'].includes(mode)) {
        throw new Error('Ungültiger Modus: ' + mode);
    }
    
    database.setConfig('app_mode', mode);
    database.writeLog('info', 'mode', `App-Modus geändert zu: ${mode}`);
    
    return mode;
}

/**
 * Prüft ob Setup erforderlich ist
 */
function isSetupRequired() {
    const locationCode = database.getConfig('location_code');
    const deviceId = database.getConfig('device_id');
    const setupComplete = database.getConfig('setup_complete', false);
    
    return !setupComplete || !locationCode;
}

/**
 * Markiert Setup als abgeschlossen
 */
function completeSetup() {
    database.setConfig('setup_complete', true);
    database.setConfig('setup_completed_at', new Date().toISOString());
    setMode('kiosk');
    database.writeLog('info', 'setup', 'Setup abgeschlossen');
    
    return true;
}

/**
 * Holt Setup-Status
 */
function getSetupStatus() {
    return {
        setupComplete: database.getConfig('setup_complete', false),
        setupCompletedAt: database.getConfig('setup_completed_at'),
        locationCode: database.getConfig('location_code'),
        locationName: database.getConfig('location_name'),
        deviceId: database.getConfig('device_id'),
        registered: database.getConfig('registered', false),
        currentMode: getCurrentMode()
    };
}

/**
 * Speichert Setup-Daten
 */
function saveSetupData(data) {
    if (data.locationCode) {
        database.setConfig('location_code', data.locationCode);
    }
    if (data.locationName) {
        database.setConfig('location_name', data.locationName);
    }
    if (data.tenantId) {
        database.setConfig('tenant_id', data.tenantId);
    }
    if (data.tenantName) {
        database.setConfig('tenant_name', data.tenantName);
    }
    if (data.scannerType) {
        database.setConfig('scanner_type', data.scannerType);
    }
    if (data.printerName) {
        database.setConfig('printer_name', data.printerName);
    }
    
    database.writeLog('info', 'setup', 'Setup-Daten gespeichert', data);
    
    return true;
}

/**
 * Kiosk-Modus Konfiguration
 */
const kioskConfig = {
    // Tastenkombination zum Verlassen (Ctrl+Shift+Alt+Q)
    exitShortcut: {
        ctrl: true,
        shift: true,
        alt: true,
        key: 'Q'
    },
    
    // Vollbild-Modus
    fullscreen: true,
    
    // Menüleiste ausblenden
    hideMenu: true,
    
    // DevTools deaktivieren
    disableDevTools: true,
    
    // Kontextmenü deaktivieren
    disableContextMenu: true,
    
    // Navigation deaktivieren
    disableNavigation: true,
    
    // URL die im Kiosk-Modus geladen wird
    kioskUrl: '/', // Scan-App Root
    
    // PIN für Scan-App
    scanAppPin: '3842'
};

/**
 * Prüft ob Tastenkombination zum Verlassen gedrückt wurde
 */
function isExitShortcut(event) {
    return event.ctrlKey && 
           event.shiftKey && 
           event.altKey && 
           event.key.toUpperCase() === kioskConfig.exitShortcut.key;
}

/**
 * Holt Kiosk-Konfiguration
 */
function getKioskConfig() {
    return {
        ...kioskConfig,
        // Überschreibe mit gespeicherten Werten
        kioskUrl: database.getConfig('kiosk_url', kioskConfig.kioskUrl),
        scanAppPin: database.getConfig('scan_app_pin', kioskConfig.scanAppPin)
    };
}

/**
 * Admin-Menü Optionen
 */
const adminMenuOptions = [
    {
        id: 'location',
        label: 'Standort konfigurieren',
        icon: 'map-pin',
        description: 'Standort für dieses Gerät festlegen'
    },
    {
        id: 'scanner',
        label: 'Scanner',
        icon: 'scan',
        description: 'Scanner erkennen und testen'
    },
    {
        id: 'printer',
        label: 'Drucker',
        icon: 'printer',
        description: 'Drucker auswählen und testen'
    },
    {
        id: 'sync',
        label: 'Synchronisation',
        icon: 'refresh-cw',
        description: 'Sync-Status und manuelle Synchronisation'
    },
    {
        id: 'service',
        label: 'Windows-Dienst',
        icon: 'settings',
        description: 'Als Windows-Dienst installieren'
    },
    {
        id: 'logs',
        label: 'Logs',
        icon: 'file-text',
        description: 'App-Logs anzeigen'
    },
    {
        id: 'system',
        label: 'System-Info',
        icon: 'monitor',
        description: 'Hardware- und System-Informationen'
    },
    {
        id: 'network',
        label: 'Netzwerk',
        icon: 'wifi',
        description: 'Netzwerk-Diagnose'
    },
    {
        id: 'update',
        label: 'Updates',
        icon: 'download',
        description: 'App-Version und Updates'
    },
    {
        id: 'password',
        label: 'Passwort ändern',
        icon: 'key',
        description: 'Admin-Passwort ändern'
    },
    {
        id: 'exit',
        label: 'Beenden',
        icon: 'log-out',
        description: 'Zurück zum Kiosk-Modus'
    }
];

/**
 * Holt Admin-Menü Optionen
 */
function getAdminMenuOptions() {
    return adminMenuOptions;
}

module.exports = {
    init,
    
    // Passwort
    setAdminPassword,
    verifyAdminPassword,
    
    // Modi
    getCurrentMode,
    setMode,
    
    // Setup
    isSetupRequired,
    completeSetup,
    getSetupStatus,
    saveSetupData,
    
    // Kiosk
    getKioskConfig,
    isExitShortcut,
    
    // Admin
    getAdminMenuOptions
};
