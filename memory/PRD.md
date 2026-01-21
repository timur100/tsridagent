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
