# TSRID Offline-First Agent Architektur

## 🎯 Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TSRID ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐         ┌──────────────────────────────────┐  │
│  │   ADMIN PORTAL   │         │        CUSTOMER PORTAL           │  │
│  │   (Web App)      │◄────────►       (Web App)                  │  │
│  │                  │         │                                   │  │
│  │ - Alle Tenants   │         │ - Nur eigene Standorte           │  │
│  │ - Alle Geräte    │         │ - Scan-Übersicht                 │  │
│  │ - Remote Config  │         │ - Statistiken                    │  │
│  │ - Agent Updates  │         │                                   │  │
│  └────────┬─────────┘         └───────────────┬──────────────────┘  │
│           │                                    │                     │
│           │         ┌──────────────────┐      │                     │
│           └────────►│  MongoDB Atlas   │◄─────┘                     │
│                     │  (Cloud DB)      │                            │
│                     │                  │                            │
│                     │ - Scans          │                            │
│                     │ - Devices        │                            │
│                     │ - Users          │                            │
│                     │ - Sync Status    │                            │
│                     └────────┬─────────┘                            │
│                              │                                       │
│                              │ Real-time Sync                        │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ELECTRON AGENT (Pro Tablet/PC)              │  │
│  │                                                                 │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │  │
│  │  │  KIOSK MODE     │  │  ADMIN MODE     │  │  BACKGROUND    │  │  │
│  │  │  (Kunde sieht)  │  │  (Passwort)     │  │  SERVICE       │  │  │
│  │  │                 │  │                 │  │                │  │  │
│  │  │ - ID Scanner    │  │ - Standort      │  │ - Sync Engine  │  │  │
│  │  │ - Verification  │  │ - Service Inst. │  │ - Heartbeat    │  │  │
│  │  │ - Status        │  │ - SQLite Setup  │  │ - Auto-Update  │  │  │
│  │  │                 │  │ - Remote Access │  │ - Logs         │  │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘  │  │
│  │                              │                                  │  │
│  │                              ▼                                  │  │
│  │                     ┌─────────────────┐                        │  │
│  │                     │    SQLite DB    │                        │  │
│  │                     │   (Offline)     │                        │  │
│  │                     │                 │                        │  │
│  │                     │ - Scans Queue   │                        │  │
│  │                     │ - Config Cache  │                        │  │
│  │                     │ - Sync Log      │                        │  │
│  │                     └─────────────────┘                        │  │
│  │                                                                 │  │
│  │  Hardware Access:                                               │  │
│  │  ├── USB ID Scanner (Regula, ARH, etc.)                        │  │
│  │  ├── Barcode Scanner                                           │  │
│  │  ├── Drucker                                                   │  │
│  │  └── System Info (CPU, RAM, Disk, Network)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 📦 Module-Struktur

```
/electron-app/
├── main.js                    # Hauptprozess
├── preload.js                 # Bridge zu Renderer
├── package.json
│
├── /src/
│   ├── /modes/
│   │   ├── kiosk-mode.js      # Kundenansicht (Vollbild, gesperrt)
│   │   └── admin-mode.js      # Admin-Bereich (Passwort-geschützt)
│   │
│   ├── /services/
│   │   ├── sqlite-service.js  # Lokale DB-Verwaltung
│   │   ├── sync-engine.js     # MongoDB Atlas Sync
│   │   ├── scanner-service.js # USB ID Scanner
│   │   ├── update-service.js  # Auto-Updates
│   │   └── heartbeat.js       # Status an Server
│   │
│   ├── /database/
│   │   ├── schema.sql         # SQLite Schema
│   │   └── migrations/        # DB Migrationen
│   │
│   └── /ui/
│       ├── kiosk/             # Kunden-UI (React)
│       └── admin/             # Admin-UI (React)
│
├── /renderer/                 # Frontend Build
└── /dist/                     # Compiled App
```

## 🔐 Zwei Modi

### 1. KIOSK MODE (Standard)
- **Vollbild, kein Escape möglich**
- Kunde sieht nur: ID-Scanner Interface
- Nach Scan: Ergebnis (✅ Verified / ❌ Failed)
- Kein Zugriff auf System, Taskbar, etc.
- Tastenkombination zum Verlassen: `Ctrl+Shift+Alt+Q` (dann Passwort)

### 2. ADMIN MODE (Passwort-geschützt)
Nach Eingabe von `Ctrl+Shift+Alt+Q` + Passwort:
- **Standort festlegen** (Location Code)
- **SQLite einrichten** (Sync aktivieren)
- **Service installieren** (Windows-Dienst/Linux-Daemon)
- **Logs einsehen**
- **Remote-Zugriff aktivieren**
- **App-Version & Updates**
- **Netzwerk-Diagnose**

## 💾 SQLite Schema

```sql
-- Lokale Scans (Offline-Queue)
CREATE TABLE scans (
    id TEXT PRIMARY KEY,
    scan_type TEXT,              -- 'id_document', 'barcode', 'qr'
    scan_data TEXT,              -- JSON mit allen Scan-Daten
    result TEXT,                 -- 'valid', 'invalid', 'unknown'
    location_code TEXT,
    device_id TEXT,
    scanned_at DATETIME,
    synced_at DATETIME,          -- NULL = nicht synchronisiert
    sync_status TEXT DEFAULT 'pending'  -- 'pending', 'synced', 'error'
);

-- Gerätekonfiguration
CREATE TABLE device_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME
);

-- Sync-Log
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    status TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Sync-Engine

```javascript
// Pseudo-Code für Sync
class SyncEngine {
    async syncToAtlas() {
        // 1. Hole alle unsynced Scans
        const pendingScans = await sqlite.query(
            "SELECT * FROM scans WHERE sync_status = 'pending'"
        );
        
        // 2. Batch-Upload zu MongoDB Atlas
        for (const scan of pendingScans) {
            try {
                await mongoAtlas.collection('scans').insertOne(scan);
                await sqlite.query(
                    "UPDATE scans SET sync_status = 'synced', synced_at = ? WHERE id = ?",
                    [new Date(), scan.id]
                );
            } catch (error) {
                // Bei Fehler: Später erneut versuchen
                await sqlite.query(
                    "UPDATE scans SET sync_status = 'error' WHERE id = ?",
                    [scan.id]
                );
            }
        }
    }
    
    // Läuft alle 30 Sekunden
    startAutoSync() {
        setInterval(() => this.syncToAtlas(), 30000);
    }
}
```

## 🚀 Remote Updates

1. **Update-Server im Backend:**
   - `/api/agent/version` - Aktuelle Version
   - `/api/agent/download` - Neue Version herunterladen

2. **Electron Auto-Updater:**
   ```javascript
   const { autoUpdater } = require('electron-updater');
   
   autoUpdater.setFeedURL({
       provider: 'generic',
       url: 'https://your-server.com/api/agent/updates'
   });
   
   autoUpdater.checkForUpdatesAndNotify();
   ```

## 📡 Remote-Konfiguration

Admin Portal kann über API:
- Standort ändern
- Kiosk-Modus ein/ausschalten
- App neu starten
- Logs abrufen
- Screenshot machen (Debug)

```javascript
// Agent pollt alle 60 Sekunden
async function checkRemoteCommands() {
    const response = await fetch(`${API_URL}/api/agent/${DEVICE_ID}/commands`);
    const commands = await response.json();
    
    for (const cmd of commands) {
        switch(cmd.action) {
            case 'restart': app.relaunch(); app.exit(); break;
            case 'update_config': updateConfig(cmd.data); break;
            case 'screenshot': takeScreenshot(); break;
            case 'get_logs': sendLogs(); break;
        }
    }
}
```

## 🛠️ Implementierungs-Reihenfolge

### Phase 1: Basis (1-2 Tage)
- [ ] SQLite Integration
- [ ] Kiosk-Mode UI
- [ ] Admin-Mode mit Passwort
- [ ] Standort-Konfiguration

### Phase 2: Scanner (1-2 Tage)
- [ ] USB Scanner Integration
- [ ] Scan-Ergebnis lokal speichern
- [ ] Basis-UI für Scans

### Phase 3: Sync (1-2 Tage)
- [ ] Sync-Engine zu MongoDB Atlas
- [ ] Offline-Queue
- [ ] Retry-Logik

### Phase 4: Service & Updates (1 Tag)
- [ ] Windows-Service Installation
- [ ] Auto-Update Mechanismus
- [ ] Remote-Befehle

### Phase 5: Admin Portal Integration (1 Tag)
- [ ] API Endpoints für Agent
- [ ] Agent-Übersicht im Portal
- [ ] Remote-Konfiguration

## ❓ Offene Fragen

1. Welcher ID-Scanner wird verwendet? (Hersteller/Modell)
2. Soll der Sync bidirektional sein? (Atlas → SQLite auch?)
3. Windows 10/11 oder auch Linux?
4. Sollen Screenshots/Logs automatisch oder nur auf Anfrage gesendet werden?
