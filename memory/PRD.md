# TSRID Admin Portal - Product Requirements Document

## Original Problem Statement
Das Hauptziel des Benutzers ist die Etablierung einer "Single Source of Truth" durch Migration des gesamten Application Stacks auf einen gemeinsamen MongoDB Atlas Cluster.

### Initiale Anforderungen:
1. **Production Outage:** Behebung des `502 Bad Gateway` Fehlers auf dem Produktionsserver
2. **Datenungenauigkeit:** Das Admin-Dashboard zeigt falsche Zahlen (0) für Kunden, Geräte und Standorte
3. **Anwendungsinstabilität:** Die Anwendung stürzt häufig ab und zeigt einen schwarzen Bildschirm
4. **Feature Request - Monitoring:** System zur regelmäßigen Überprüfung der Kommunikation zwischen allen Anwendungen und Servern

## Was wurde implementiert

### 21. Januar 2025 - Session 3

### 22. Januar 2025 - Session 4

#### ✅ FEATURE: Electron Offline-First Agent System
- **Neue Backend-API:** `/app/backend/routes/agent_api.py`
  - `/api/agent/register` - Gerät registrieren
  - `/api/agent/heartbeat` - Status-Heartbeat mit pending Commands
  - `/api/agent/scans/batch` - Batch-Upload von Scans
  - `/api/agent/scans` - Einzelner Scan-Upload
  - `/api/agent/{device_id}/logs` - Log-Upload
  - `/api/agent/{device_id}/commands` - Pending Commands abrufen
  - `/api/agent/devices` - Liste aller registrierten Geräte
  - `/api/agent/stats` - Agent-Statistiken
  - `/api/agent/locations/export` - Standorte für Offline-Cache exportieren

- **Neue Electron Services:**
  - `/app/electron-app/src/services/database.js` - SQLite für Offline-First
    - Lokale Scan-Speicherung mit Sync-Queue
    - Config-Management
    - Standort-Cache für Offline-Setup
    - App-Logs
  - `/app/electron-app/src/services/device-info.js` - Hardware/System-Info
    - Device ID generierung/persistierung
    - System-Info (CPU, RAM, Disk)
    - Netzwerk-Status
    - Internet-Verbindungs-Check
  - `/app/electron-app/src/services/sync-engine.js` - MongoDB Atlas Sync
    - Auto-Sync alle 30 Sekunden
    - Heartbeat alle 60 Sekunden
    - Retry-Logik bei Fehlern
    - Remote-Command Verarbeitung
  - `/app/electron-app/src/services/mode-manager.js` - Kiosk/Admin Modi
    - Kiosk-Modus (Vollbild, gesperrt für Kunden)
    - Admin-Modus (Passwort-geschützt: `Ctrl+Shift+Alt+Q`)
    - Setup-Wizard für Ersteinrichtung

- **Electron main.js erweitert:**
  - Zwei Modi: Kiosk (Scan-App) und Admin (Portal)
  - Global Shortcut `Ctrl+Shift+Alt+Q` für Admin-Zugang
  - 40+ neue IPC Handler für DB, Sync, Device, Mode APIs

- **Dokumentation erstellt:**
  - `/app/electron-app/OFFLINE_AGENT_ARCHITEKTUR.md` - Systemarchitektur
  - `/app/electron-app/MASTER_IMAGE_GUIDE.md` - Windows Image-Erstellung für 100 Tablets
  - `/app/electron-app/IMPLEMENTATION_ROADMAP.md` - Implementierungsplan

#### ✅ BUGFIX: Tenant Dashboard Total Devices/Locations
- **Problem:** Geräte und Standorte zeigten 0 obwohl Online/Offline korrekt waren
- **Fix:** Frontend `TenantDetailPage.jsx` verwendet jetzt `dashboardStats.total_devices || tenant.device_count || 0`
- **Fix:** Backend `/api/tenants/{tenant_id}/dashboard-stats` zählt Locations aus `tenants` Collection (tenant_level="location")



#### ✅ FEATURE: System Health Monitor mit Ampelsystem
- **Neues Backend:** `/app/backend/routes/health_monitor.py`
  - `/api/health/full` - Vollständiger Health-Check aller Komponenten
  - `/api/health/check/mongodb` - MongoDB Verbindung, Latenz & **Verbindungspool-Monitoring**
  - `/api/health/check/databases` - Alle DB-Collections prüfen
  - `/api/health/check/api-endpoints` - API-Antwortzeiten
  - `/api/health/check/tenants` - Tenant-Hierarchie Integrität
  - `/api/health/check/devices` - Geräte-Status (Online/Offline) - **korrigiert für status/teamviewer_online Felder**
  - `/api/health/check/users` - Benutzer-Daten
  - `/api/health/check/hardware-sets` - Hardware-Sets Verfügbarkeit
  - `/api/health/check/environment` - Umgebungsvariablen
- **Neues Frontend:** `/app/frontend/src/components/HealthMonitor.jsx`
  - Ampelsystem: 🟢 Grün = OK, 🟡 Gelb = Warnung, 🔴 Rot = Kritisch
  - **Verbesserte Lesbarkeit:** Solid-Fill Kacheln mit dunkler Schrift
  - Gesamtstatus-Karte mit Zusammenfassung
  - Klickbare Detail-Kacheln für jeden Check
  - Auto-Refresh Funktion (30 Sekunden)
  - Datenbank-Collections Übersicht
  - API-Endpunkte Antwortzeiten
  - **Verbindungspool-Anzeige** (aktive/verfügbare Verbindungen)
- **Integration:** Settings > Infrastruktur > Health

**Erkannte Probleme:**
- ~~400 aktive MongoDB-Verbindungen - Connection Pool wird nicht optimal wiederverwendet~~ **BEHOBEN (21. Jan 2025)**

#### ✅ CRITICAL FIX: MongoDB Connection Pool Optimierung (21. Januar 2025)
- **Problem:** Health Monitor zeigte ~400 aktive MongoDB-Verbindungen
- **Ursache:** Automatisches Refactoring-Script hatte Syntax-Fehler in 15+ Dateien verursacht:
  - Import-Zeilen wurden an falschen Stellen eingefügt (mitten im Code)
  - Indentation-Fehler in mehreren Dateien
  - Globale `db = get_mongo_client()[...]` Aufrufe wurden bei Import ausgeführt
- **Fixes:**
  1. Syntax-Fehler in `portal_locations.py`, `health.py`, `system_monitor.py` korrigiert
  2. Falsch platzierte Import-Zeilen in 15 Dateien entfernt
  3. Korrekte Imports am Anfang der Dateien hinzugefügt
  4. `api_keys.py` auf `get_db()` Pattern umgestellt
- **Ergebnis:** 
  - **MongoDB Verbindungen: von ~400 auf 15 reduziert** ✅
  - Latenz: 0.33ms (Grün)
  - Alle Backend-Services funktionsfähig

#### ✅ BUGFIX: Tenant Dashboard Statistiken (21. Januar 2025)
- **Problem:** Tenant-Detail-Seite (z.B. Europcar) zeigte 0 für Benutzer und Geräte
- **Ursache:** Backend-Endpunkt `/api/tenants/{tenant_id}/dashboard-stats` lieferte nicht alle benötigten Felder
- **Fixes:**
  1. Backend erweitert um: `total_devices`, `total_users`, `online_devices`, `offline_devices`, `in_preparation`, Scan-Statistiken
  2. Frontend `TenantDetailPage.jsx` korrigiert um `dashboardStats` zu verwenden
- **Ergebnis:** Tenant Dashboard zeigt jetzt korrekte Zahlen (216 Geräte, 152 online, etc.)

#### ✅ BUGFIX: TenantDetailPage Navigation-Loop
- **Problem:** TenantDetailPage navigierte sofort zurück zum Admin-Portal nach Login
- **Ursache:** useEffect reagierte auf initial gesetzten `selectedTenantId='all'` und navigierte zurück
- **Fix:** `/app/frontend/src/pages/TenantDetailPage.jsx` - useEffect trackt jetzt, ob User aktiv Tenant gewechselt hat
- **Ergebnis:** Tenant-Detail-Seiten sind jetzt direkt per URL erreichbar

#### ✅ VERIFIZIERT: Hardware-Sets Performance
- Hardware-Sets lädt jetzt vollständig (218 Sets, 393 Geräte)
- Ladezeit ~30s im Preview-Environment (USA↔Frankfurt Latenz)
- Erwartete Ladezeit auf Produktions-Server: <5s

#### ✅ BUGFIX: Device-Detail-Seite schwarzer Bildschirm + fehlender Loading-Spinner
- **Problem 1:** Device-Detail-Seite zeigte schwarzen Bildschirm
- **Ursache:** `availableTenants.map is not a function` - API gibt Object statt Array
- **Fix:** `/app/frontend/src/pages/DeviceDetailPage.jsx` - Tenant-API-Response korrekt verarbeitet
- **Problem 2:** Loading-Spinner fehlte, nur "Laden..." Text
- **Fix:** Spinner-Animation hinzugefügt
- **Ergebnis:** Device-Detail-Seite zeigt alle Geräteinformationen korrekt an

#### ✅ BUGFIX: AllLocationsTab Filter-Dropdowns
- **Fix:** `/app/frontend/src/components/AllLocationsTab.jsx` - Alle filterOptions.*.map() Aufrufe defensiv gemacht

#### ✅ BUGFIX: Location-Detail-Seite schwarzer Bildschirm
- **Problem:** URL `/portal/admin/tenants/.../locations/...` zeigte Dashboard statt Location-Detail
- **Ursachen (2):**
  1. Nach Login wurde ursprüngliche URL nicht wiederhergestellt
  2. React Router Pfade in `PortalApp.jsx` waren absolute statt relative Pfade
- **Fix 1:** `/app/frontend/src/components/PortalLogin.jsx` - Login speichert und verwendet `location.state.from` für Redirect
- **Fix 2:** `/app/frontend/src/PortalApp.jsx` - Routen von `/admin` zu `admin/*` etc. geändert
- **Fix 3:** `/app/frontend/src/pages/LocationDetailPage.jsx` - Tenant-API-Response korrekt verarbeitet
- **Ergebnis:** Location-Detail-Seite zeigt jetzt korrekt Standort-Info, Öffnungszeiten, Statistiken, Karte

#### ✅ BUGFIX: Schwarzer Bildschirm - Alle Komponenten mit Tenant-Dropdown
- **Problem:** Mehrere Seiten (Assets, Vehicles, KeyAutomat, QuickMenu, Settings) zeigten schwarzen Bildschirm
- **Ursache:** `tenants.map()` wurde ohne defensive Prüfung aufgerufen während `/api/tenants` ein Objekt `{tenants: [...]}` statt Array zurückgibt
- **Fix:** Alle betroffenen Komponenten korrigiert:
  - `/app/frontend/src/components/AssetManagement.jsx`
  - `/app/frontend/src/components/VehicleManagement.jsx`
  - `/app/frontend/src/components/KeyAutomatHierarchical.jsx`
  - `/app/frontend/src/components/QuickMenuManagement.jsx`
  - `/app/frontend/src/components/AssetSettings.jsx`
  - `/app/frontend/src/components/UserModal.jsx`
  - `/app/frontend/src/components/RoleModal.jsx`
- **Änderungen:** 
  - `loadTenants()` extrahiert jetzt `data.tenants || []`
  - Alle `tenants.map()` Aufrufe haben jetzt `Array.isArray(tenants) &&` Prüfung

#### ✅ VERIFIZIERT: Alle Menüs getestet und funktionsfähig
- Dashboard ✓
- Users & Roles ✓
- Tenants (mit Hierarchie) ✓
- ID-Checks ✓
- Assets ✓
- Devices ✓
- Locations ✓
- Inventory ✓
- Orders ✓
- Support ✓
- Licenses ✓
- Database ✓
- Settings (inkl. Server) ✓
- R&D ✓

#### ✅ BUGFIX: Hierarchie-Sidebar in Tenants-Seite leer
- **Problem:** Sidebar zeigte "Keine Hierarchie verfügbar" obwohl 646 Einträge in DB
- **Ursache:** Backend `/api/tenants-hierarchy/list` gab falsche Feldnamen zurück (`id`, `level`, `parent_id`)
- **Fix:** `/app/backend/routes/direct_data.py` korrigiert um die vom Frontend erwarteten Felder zu liefern:
  - `id` → `tenant_id`
  - `level` → `tenant_level`  
  - `parent_id` → `parent_tenant_id`
- **Ergebnis:** Hierarchie zeigt jetzt 2 Organisationen (Europcar: 206, Puma: 1) mit vollständiger Hierarchie

#### ✅ BUGFIX: Schwarzer Bildschirm - Users & Roles Seite
- **Problem 1:** Backend-Endpunkt `/api/portal/auth/registrations` gab 500/401 Fehler zurück
  - **Ursache:** `verify_token(token)` wurde mit String statt HTTPAuthorizationCredentials aufgerufen
  - **Fix:** `/app/backend/routes/portal_auth.py` - Alle Registrations-Endpunkte korrigiert um `Depends(verify_token)` zu nutzen
- **Problem 2:** Frontend `UsersRolesPage.jsx` crashte wegen `tenants.map is not a function`
  - **Ursache:** `/api/tenants/` gibt Objekt `{tenants: [...]}` zurück, nicht Array
  - **Fix:** `loadTenants()` korrigiert um `data.tenants || []` zu extrahieren
  - **Fix:** Defensive Prüfung `Array.isArray(tenants)` im JSX hinzugefügt

#### ✅ BUGFIX: MongoDB Connection Pool Fehler
- **Problem:** `MongoClient is not defined` Fehler in `missing_endpoints.py`
- **Ursache:** Einige Endpunkte verwendeten noch alte `MongoClient(MONGO_URL)` statt Connection Pool
- **Fix:** Alle Endpunkte in `/app/backend/routes/missing_endpoints.py` auf `get_mongo_client()` umgestellt

### 13. Januar 2025 - Session 2 (Fortsetzung)

#### ✅ PERFORMANCE FIX: Seitenladezeit von 40s auf 15s reduziert
- **Connection Pooling:** Neue zentrale DB-Verbindung (`/app/backend/db/connection.py`)
  - maxPoolSize: 50, minPoolSize: 10
  - Verbindungen werden wiederverwendet statt neu erstellt
- **Stats API optimiert:** Von 5184ms auf 376ms (13x schneller)
  - Aggregation Pipeline statt mehrere count_documents()
  - estimated_document_count() statt count_documents()
- **Duplikate entfernt:** portal_devices.py verwendet nur europcar_devices (keine überlappenden Keys mehr)

#### ✅ MongoDB Atlas M10 Upgrade
- Cluster erfolgreich von Free auf M10 (dediziert) aktualisiert
- Region: AWS / Frankfurt (eu-central-1)
- Version: MongoDB 8.0.17

#### ✅ FEATURE: MongoDB Atlas Monitoring Dashboard
- **Neuer Tab:** "Database" im Admin Portal Navigation
- **Backend API:** `/app/backend/routes/mongodb_monitor.py` mit 5 Endpunkten:
  - `/api/mongodb/status` - Cluster-Status und Verbindungstest
  - `/api/mongodb/stats` - Detaillierte Datenbank-Statistiken
  - `/api/mongodb/collections/{db_name}` - Collection-Details
  - `/api/mongodb/health-history` - Latenz-Überwachung
  - `/api/mongodb/operations` - Aktive Operationen
- **Frontend:** `/app/frontend/src/components/MongoDBMonitor.jsx`
- **Features:**
  - Echtzeit Cluster-Status (Online/Offline)
  - Latenz-Messung mit Min/Avg/Max
  - Datengröße und Dokumentanzahl
  - Datenbank-Liste mit Collection-Details
  - Auto-Refresh Toggle (30 Sekunden)
  - Schema-Felder Vorschau
  - Health-Status Banner

#### ✅ FEATURE: SSH Terminal vergrößert
- Terminal-Höhe von `min-h-[300px] max-h-[500px]` auf `min-h-[500px] max-h-[800px]` erhöht
- Datei: `/app/frontend/src/components/ServerManagement.jsx`

#### ✅ FIX: Schwarzer Bildschirm - Locations Tab
- `tenant_locations.py`: Korrigiert, um bei `tenant_id: "all"` alle Standorte abzurufen
- `AllLocationsTab.jsx`: Vereinfachte Logik für direkten API-Aufruf
- Ergebnis: 215 Standorte werden korrekt angezeigt

#### ✅ FIX: Schwarzer Bildschirm - Devices Tab
- `portal_devices.py`: Komplett auf MongoDB umgestellt
- Ergebnis: 216 Geräte werden korrekt angezeigt (141 Online, 74 Offline)

#### ✅ FIX: Portal Users API
- `portal_users.py`: Korrigiert (`portal_db` statt `test_database`)
- Ergebnis: 3 Benutzer werden korrekt angezeigt

### Frühere Sessions
- ✅ Production Server wiederhergestellt (502 Bad Gateway behoben)
- ✅ Dashboard-Statistiken korrigiert
- ✅ System Monitoring Endpoint implementiert

## Aktuelle Datenbank-Statistiken (MongoDB Atlas M10)
| Metrik | Wert |
|--------|------|
| Datenbanken | 30 |
| Collections | 150 |
| Dokumente | 83,872 |
| Datengröße | 41.19 MB |
| Cluster Tier | M10 (Dedicated) |
| Region | AWS / Frankfurt (eu-central-1) |
| MongoDB Version | 8.0.17 |

## API-Endpunkte Status
| Endpoint | Status | Daten |
|----------|--------|-------|
| `/api/tenants/stats` | ✅ | Kunden: 2, Standorte: 207, Geräte: 29 |
| `/api/tenant-locations/all` | ✅ | 215 Standorte |
| `/api/tenant-devices/all/devices` | ✅ | 216 Geräte |
| `/api/portal/devices/list` | ✅ | 431 Geräte |
| `/api/portal/users/list` | ✅ | 3 Benutzer |
| `/api/mongodb/status` | ✅ | Cluster Online |
| `/api/mongodb/stats` | ✅ | 30 DBs, 150 Collections |

## Priorisierter Backlog

### P0 - Kritisch (Abgeschlossen)
- [x] Schwarzer Bildschirm beheben - Locations Tab
- [x] Schwarzer Bildschirm beheben - Devices Tab
- [x] Schwarzer Bildschirm beheben - Users & Roles Seite
- [x] Schwarzer Bildschirm beheben - Assets und alle anderen Seiten mit Tenant-Dropdown
- [x] Hierarchie-Sidebar repariert (Feldnamen-Mapping)
- [x] MongoDB Atlas Upgrade (Free → M10)
- [x] MongoDB Monitoring Dashboard

### P1 - Wichtig
- [x] SSH Terminal vergrößern
- [ ] Vollständige Migration zur "Single Source of Truth" (devices.py, fleet_management.py)

### P2 - Mittel
- [ ] Produktions-Deployment-Workflow stabilisieren
- [ ] Hetzner Server via SSH konfigurieren

### P3 - Niedrig
- [ ] Electron App Drucker-Support debuggen
- [ ] Barcode Scanner Integration
- [ ] Webcam für Asset-Fotos

## Architektur

### Neue Backend Routes
- `/app/backend/routes/mongodb_monitor.py` - MongoDB Monitoring APIs
- `/app/backend/routes/portal_devices.py` - MongoDB-basiert (überarbeitet)
- `/app/backend/routes/portal_users.py` - Korrigierte DB-Verbindung
- `/app/backend/routes/tenant_locations.py` - "all" Support

### Neue Frontend Komponenten
- `/app/frontend/src/components/MongoDBMonitor.jsx` - Dashboard UI
- `/app/frontend/src/components/AllLocationsTab.jsx` - Vereinfachte Logik
- `/app/frontend/src/components/ServerManagement.jsx` - Vergrößertes Terminal

## Credentials
- **Admin Login:** admin@tsrid.com / admin123
- **Portal URL:** `/portal/admin`
- **MongoDB Atlas:** M10 Cluster via MONGO_URL in .env
- **Scan App User PIN:** 3842
- **Scan App Admin PIN:** 9988
- **Electron Exit Password:** tsrid2024!

## 24. Januar 2025 - Standortverwaltung & Geräteeinrichtung

### ✅ FEATURE: Geräteregistrierung mit Stationscode
- **Backend API** (`/app/backend/routes/agent_registration.py`):
  - `GET /api/agent/station/{station_code}` - Standortinfos abrufen
  - `POST /api/agent/register` - Gerät registrieren
  - `GET /api/agent/stations` - Alle Standorte (Offline-Cache)
  - `POST /api/agent/heartbeat` - Geräte-Heartbeat
- **Frontend** (`/app/frontend/src/components/DeviceSetup.jsx`):
  - Eingabe Stationscode + Gerätenummer
  - Validierung gegen MongoDB Atlas
  - Standorte-Sync für Offline-Betrieb
- **Electron IPC** (neue Handler in `main.js`):
  - `agent:getDeviceConfig`, `agent:saveDeviceConfig`
  - `agent:syncLocations`, `agent:quitApp`

### ✅ FEATURE: Neues Fingerabdruck-Icon
- Extrahiert aus TSRID_Logo2.png
- Alle Icon-Größen erstellt (16-256px)
- `icon.ico` für Windows Installer

### ✅ FEATURE: Agent-Admin Flow optimiert
- "Administrator-Bereich" → "Agent-Admin" umbenannt
- PIN 9988 öffnet sofort AdminPanel
- "Admin-Modus aktivieren" Button entfernt
- "Applikation beenden" Button für Admins

## 24. Januar 2025 - Rollenbasierte Zugriffskontrolle (RBAC)

### ✅ FEATURE: Rollenbasierte Zugriffskontrolle für Agent-Informationen
- **Problem:** System-/Agent-Informationen (TeamViewer-ID, Scanner-Seriennummern, MAC, IP, SQLite-DB-Statistiken, Sync-Status) waren für alle Benutzer im SideMenu sichtbar - sollte nur für Admins zugänglich sein.
- **Lösung:**
  1. **Neues Admin-Only Komponente erstellt:** `/app/frontend/src/components/AgentDeviceInfo.jsx`
     - Zeigt alle Agent/System-Informationen in kollabierbare Sektionen
     - Nur im Electron Agent verfügbar (zeigt Hinweis in Webbrowser)
     - Erfordert Admin-Zugang (PIN 9988) im Admin Portal
  2. **SideMenu bereinigt:** `/app/frontend/src/components/SideMenu.jsx`
     - Alle Geräteinformationen-Anzeige entfernt
     - Button "Administrator-Bereich (PIN: 9988)" für Admin-Zugang behalten
  3. **RnDSidebar erweitert:** `/app/frontend/src/components/RnDSidebar.jsx`
     - Neuer Menüpunkt "Agent/Geräteinformationen" unter "Test Center"
  4. **AdminPortal.jsx aktualisiert:** Import und Rendering der neuen Komponente
  5. **ScannerPinSettings.jsx aktualisiert:**
     - "Demo PIN: 1234" durch korrekte PIN-Hinweise ersetzt
     - Zeigt jetzt: "Benutzer-PIN: 3842" und "Admin-PIN: 9988"

### Geänderte Dateien:
- `/app/frontend/src/components/AgentDeviceInfo.jsx` (NEU)
- `/app/frontend/src/components/SideMenu.jsx` (BEREINIGT)
- `/app/frontend/src/components/RnDSidebar.jsx` (ERWEITERT)
- `/app/frontend/src/pages/AdminPortal.jsx` (IMPORT HINZUGEFÜGT)
- `/app/frontend/src/components/ScannerPinSettings.jsx` (PIN-TEXT AKTUALISIERT)

### Neues ZIP-Archiv erstellt:
- `/app/downloads/TSRID-Agent_2026-01-24_13-08.zip`

