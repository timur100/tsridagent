# Offline-First Electron Agent - PRD

## Original Problem Statement
Build a comprehensive "Offline-First Electron Agent" for Windows 11 tablets with:
- Electron-based agent with role-based access (User PIN: 3842, Admin PIN: 9988)
- USB scanner hardware access, background process with System Tray icon
- Multi-tenant support with MongoDB Atlas central database
- Local SQLite for offline data storage with sync capabilities
- Self-setup flow with manual selection and Activation Code methods
- Admin portal (`/portal/admin`) for managing tenants, locations, devices, activation codes
- One-click build script (`ONE_CLICK_BUILD.bat`)
- Custom branding/logo

## User Preferences
- **Language:** German (all communication in German)
- **Communication Style:** Direct, technical

## Core Requirements

### Authentication
- PIN-based access control
- User PIN: 3842
- Admin PIN: 9988

### Device Coupling
Two methods implemented:
1. **Manual Selection:** Continent → Country → City → Location → Device hierarchy
2. **Activation Code:** QR code scanning or manual code entry

### Admin Portal (`/portal/admin`)
- Tenant management
- Location management (with upcoming lifecycle status)
- Device management
- Activation code generation & management
- QR code display/download

### Footer UI
- 4 expandable panels: System, Location, Contact, Sonstiges (Misc)
- Status indicators: Scan, Portal (portalOnline currently MOCKED)
- Live clock
- License validity display

---

## Implementation Status

### ✅ Completed Features (January 31, 2025)

#### Import/Export & Column Settings System
Wiederverwendbare Komponenten für alle Datentabellen:
- **TableExportImport.jsx** - Export (CSV/Excel) und Import-Funktionalität
- **TableColumnSettings.jsx** - Spalten-Konfiguration (Anzeigen/Verbergen, Drag & Drop)
- **TableSelectionHeader.jsx** - Bulk-Auswahl-Anzeige

#### Performance-Optimierungen (January 31, 2025)
Umfassende Performance-Verbesserungen implementiert:
- **Datenbank-Indizes** (`/app/backend/utils/db_indexes.py`) - Automatische Index-Erstellung beim Server-Start
- **In-Memory Cache Service** (`/app/backend/utils/cache_service.py`) - TTL-basierter Cache für API-Responses
- **TablePagination.jsx** - Wiederverwendbare Pagination (25/50/100/200 pro Seite)
- **TableSkeleton.jsx** - Loading-Skeletons für bessere gefühlte Performance
- **VirtualizedTable.jsx** - Virtualisierte Tabellen für große Datenmengen (1000+ Einträge)
- **@tanstack/react-virtual** - Bibliothek für virtuelles Scrolling installiert

Integriert in folgende Komponenten:
- ✅ InventoryManagement (Artikel)
- ✅ OrdersManagement (Bestellungen)
- ✅ CustomerManagement (Kunden)
- ✅ AssetManagement (Assets)
- ✅ KitManager (Kit-Verwaltung)
- ✅ ActivationCodeManager (Aktivierungscodes)
- ✅ SupportManagement (Tickets)
- ✅ LicenseManagement (Lizenzen)
- ✅ DeviceManagement (bereits vorhanden)
- ✅ AllLocationsTab (bereits vorhanden)

#### Admin Portal Navigation Bug Fix
- Tab-Navigation funktioniert jetzt zuverlässig
- URL wird bei Tab-Wechsel korrekt aktualisiert
- Keine Konflikte mehr mit Sub-Routes

#### Device Coupling System
- Manual hierarchical selection (Continent → Country → City → Location → Device)
- Activation Code system with QR scanning
- Backend endpoints for code generation/validation/activation

#### Admin Portal
- Full "Activation Codes" management UI
- Tenant selector with filtering
- Integration with TenantContext

#### Footer
- 4-panel expandable view
- License validity in "Sonstiges" panel
- Dynamic device details display

#### Bug Fixes (Latest Session - Jan 2025)
- ✅ Fixed: "Fehler beim Laden der Kontinente" - Wrong API endpoints in `AdminPanel.jsx`
  - Changed `/api/locations/*` → `/api/unified-locations/*`

#### P0 - Admin-Panel Schwarzer Bildschirm (Jan 27, 2025) - ✅ BEHOBEN & GETESTET
- **Status:** BEHOBEN - 100% Frontend-Tests bestanden
- **Test Report:** `/app/test_reports/iteration_4.json`
- **Bugs behoben:**
  1. ✅ **React Hooks Regelverstoß in `AdminPanel.jsx`:** 
     - Problem: `useState(getActiveCategory())` wurde NACH dem bedingten `return null` aufgerufen
     - Lösung: `useState` und `menuStructure` VOR das `if (!isOpen) return null;` verschoben
     - Ergebnis: Admin-Panel zeigt jetzt korrekt Tab/Sidebar-Navigation statt schwarzem Bildschirm
  2. ✅ **Fehlender Icon-Import in `DeviceLifecycleManager.jsx`:**
     - Problem: `Tool` Icon existiert nicht in `lucide-react`
     - Lösung: `Tool` durch `Wrench` ersetzt
     - Ergebnis: DeviceLifecycleManager Seite lädt ohne Kompilierfehler
- **Verifizierte Features:**
  - PIN 9988 Login → Admin-Panel öffnet direkt
  - Tab-Navigation: Übersicht, Konfiguration, Verwaltung
  - Sidebar-Navigation: Alle Untermenüpunkte funktionsfähig
  - DeviceLifecycleManager Seite vollständig funktional

#### P0 - Stadt-Dropdown falsche Daten (Jan 27, 2025) - ✅ BEHOBEN & GETESTET
- **Status:** BEHOBEN - 100% Backend & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_5.json`
- **Problem:** Stadt-Dropdown in DeviceSetup zeigte falsche/kleingeschriebene Städte aus `europcar_devices` statt `tenant_locations`
- **Lösung:**
  1. ✅ **Neuer Tenant-Selektor im Frontend (`DeviceSetup.jsx`):**
     - Pflichtfeld-Auswahl vor Kontinent/Land/Stadt
     - Zeigt alle verfügbaren Tenants (Europcar, Puma, etc.)
  2. ✅ **Backend APIs erweitert (`unified_locations.py`):**
     - `/cities` Endpoint unterstützt jetzt `tenant_id` Parameter
     - `/by-city` Endpoint unterstützt jetzt `tenant_id` Parameter
     - Daten kommen aus `tenant_locations` Collection (nicht mehr `europcar_devices`)
- **Ergebnis:**
  - 158 korrekte Städte in GROSSBUCHSTABEN für Europcar in Deutschland
  - Standorte werden nach Tenant gefiltert
  - UI fordert Tenant-Auswahl vor Standortsuche

#### P0 - Standort-Kacheln & Kit-Verwaltung (Jan 27, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_6.json`

**Feature 1: Standort-Kacheln (Grid-Layout)**
- **File:** `/app/frontend/src/components/DeviceSetup.jsx`
- **Änderung:** Liste ersetzt durch 3-spaltiges Grid mit Kacheln
- **Kachel-Felder:**
  - Station-Code (groß, font-mono)
  - Geräte-Badge (z.B. "2 Geräte")
  - Standortname
  - Adresse (Straße, PLZ, Stadt)
  - Manager + Telefon
  - Typ-Badge

**Feature 2: Kit-Verwaltung (Hardware-Sets)**
- **Files:**
  - `/app/backend/routes/device_lifecycle.py` - 10+ neue Kit-Endpoints
  - `/app/frontend/src/components/KitManager.jsx` - Neue Komponente
  - `/app/frontend/src/pages/AdminPortal.jsx` - Tab "Kit-Verwaltung" hinzugefügt
- **Collection:** `device_kits` (MongoDB)
- **Kit-Name-Format:** `{STATION}-{NR}-KIT` z.B. `MUCC01-01-KIT`
- **Workflow:**
  1. ✅ Kit erstellen (Tenant → Stadt → Standort → Geräte auswählen)
  2. ✅ Automatische Geräte-Nummer (nächste verfügbare für Standort)
  3. ✅ Kit installieren (Deploy an Standort)
  4. ✅ Kit zurückgeben (Return ins Lager)
  5. ✅ Deployment-Historie
- **Kit-Status:** assembled, deployed, returned, disassembled
- **API-Endpoints:**
  - GET `/api/device-lifecycle/kits/list`
  - POST `/api/device-lifecycle/kits/create`
  - GET `/api/device-lifecycle/kits/{id}`
  - POST `/api/device-lifecycle/kits/{id}/add-device/{device_id}`
  - DELETE `/api/device-lifecycle/kits/{id}/remove-device/{device_id}`
  - POST `/api/device-lifecycle/kits/{id}/deploy`
  - POST `/api/device-lifecycle/kits/{id}/return`
  - DELETE `/api/device-lifecycle/kits/{id}`
  - GET `/api/device-lifecycle/locations/{code}/next-device-number`

#### Devices Tab - Checkboxes & Spalten-Einstellungen (Jan 27, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_7.json`
- **File:** `/app/frontend/src/components/DeviceManagement.jsx`
- **Features (gleich wie Locations Tab):**
  1. ✅ Checkbox-Spalte für Bulk-Auswahl (Header + jede Zeile)
  2. ✅ "X von Y Geräten ausgewählt" Anzeige
  3. ✅ Zahnrad-Icon für Spalteneinstellungen
  4. ✅ 14 konfigurierbare Spalten (ein/ausblenden)
  5. ✅ Spalten per Drag & Drop neuanordnen
  6. ✅ Zurücksetzen-Button für Standard-Konfiguration
  7. ✅ localStorage-Persistenz (`deviceManagementColumns`)
- **Sichtbare Spalten (Standard):** Device-ID, Status, Kunde, Location, Straße, PLZ, Stadt, Land, SN-PC, SN-SC, Set
- **Ausgeblendete Spalten (Standard):** TVID, IP, Version

#### P0 - Geräte-Lifecycle-Management System (Jan 25, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Tests bestanden
- **Test Report:** `/app/test_reports/iteration_3.json`
- **Files:** 
  - `/app/backend/routes/device_lifecycle.py` - Backend API (15+ endpoints)
  - `/app/frontend/src/components/DeviceLifecycleManager.jsx` - Frontend UI
- **Features Implemented:**
  1. ✅ Status-Dashboard with 5 stat cards (Gesamt, Aktiv, Im Lager, Defekt, Außer Betrieb)
  2. ✅ Device table with type, serial, model, location, status, warranty, license columns
  3. ✅ Device creation/edit modal with all fields
  4. ✅ Device detail modal with full info display
  5. ✅ Timeline with automatic events (purchase, assign) and manual events (repair, SW update, etc.)
  6. ✅ Edit and Delete functionality with confirmation dialog
  7. ✅ "+ Event" button to add manual timeline events
  8. ✅ Color-coded warranty/license expiration warnings (red/yellow)
  9. ✅ Backend APIs: GET /list, POST /create, PUT /{id}, DELETE /{id}, GET /{id}/timeline, POST /{id}/event
  10. ✅ Device types: Scanner (Regula/Desko), Tablet/PC, Printer, 4x Docking Stations
- **Existing Devices:** DESKO-SCN-001 (Scanner, MUCC01), TSRID-TAB-001 (Tablet, BERE01)
- **Test Coverage:** Backend 16/16 tests, Frontend UI fully validated

#### P0 - Admin Portal Navigation Bug (Jan 31, 2025) - ✅ BEHOBEN & GETESTET
- **Status:** BEHOBEN - 100% Frontend-Tests bestanden (19/19 Tab-Klicks erfolgreich)
- **Test Report:** `/app/test_reports/iteration_8.json`
- **Problem:** Die Tabs im Admin Portal reagierten nach einigen Klicks nicht mehr. Die URL wurde nicht aktualisiert, was zu Konflikten mit Sub-Routes führte.
- **Lösung:** Tab-Klick Handler aktualisiert - jetzt wird `navigate('/portal/admin', { replace: true })` aufgerufen, bevor `setActiveTab(tab.id)` gesetzt wird
- **Datei:** `/app/frontend/src/pages/AdminPortal.jsx` (Zeilen ~1010-1030)
- **Verifizierte Features:**
  - 14 verschiedene Tab-Klicks erfolgreich
  - Schnelle aufeinanderfolgende Klicks funktionieren
  - Rückkehr von Sub-Routes (z.B. ID-Checks) funktioniert
  - URL bleibt konsistent bei `/portal/admin`

### ⏳ Pending Issues

| Priority | Issue | Status |
|----------|-------|--------|
| P1 | Agent Status Overview (Heartbeat-Mechanismus) | NOT STARTED |
| P1 | Real-time Footer Status (`portalOnline` hardcoded) | NOT STARTED |
| P2 | "Single Source of Truth" Migration for `fleet_management.py` | NOT STARTED |
| P3 | Printer Support in Electron App | NOT STARTED (Recurring) |

### 📋 Backlog/Future Tasks
- Full Scanner Integration (Regula/Desko)
- Sync Engine Activation (SQLite-to-MongoDB)
- Webcam for Asset Photos
- ESP32 Integration
- Production deployment verification

---

## Technical Architecture

### Backend Structure
```
/app/backend/
├── routes/
│   ├── activation_codes.py       # Activation code management
│   ├── location_management.py    # Location lifecycle (NEW)
│   ├── unified_locations.py      # Hierarchical locations API
│   └── agent_registration.py     # Device registration
└── server.py                     # Main FastAPI app
```

### Frontend Structure
```
/app/frontend/src/
├── components/
│   ├── ActivationCodeManager.jsx  # Admin code management
│   ├── ActivationCodeEntry.jsx    # User code entry/scan
│   ├── DeviceSetup.jsx            # Setup flow with tabs
│   ├── FooterInfo.jsx             # Footer with 4 panels
│   ├── AdminPanel.jsx             # Admin area (FIXED)
│   └── CustomerSwitcher.jsx       # Tenant selector
└── pages/
    └── AdminPortal.jsx            # Web-based admin portal
```

### Key API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/unified-locations/continents` | Get continents |
| `GET /api/unified-locations/countries` | Get countries by continent |
| `GET /api/unified-locations/cities` | Get cities by country |
| `GET /api/unified-locations/by-city` | Get locations by city |
| `POST /api/activation/generate` | Generate activation code |
| `GET /api/activation/validate/{code}` | Validate code |
| `POST /api/activation/activate` | Activate device with code |

### Database Schema
- **`portal_db.tenant_locations`**: Location data (will add `status` field)
- **`multi_tenant_admin.activation_codes`**: Activation codes
- **`multi_tenant_admin.europcar_devices`**: Device info

---

## Credentials
| Purpose | Value |
|---------|-------|
| Web Portal Login | admin@tsrid.com / admin123 |
| Scan App User PIN | 3842 |
| Scan App Admin PIN | 9988 |

---

## Mocked/Incomplete Features
⚠️ **MOCKED:** `portalOnline` status in footer is hardcoded to `true`
⚠️ **MOCKED:** Several routes in `fleet_management.py` use mock data

---

Last Updated: January 31, 2025

---

## Test Reports
| Date | Feature | Result | Report |
|------|---------|--------|--------|
| Jan 31, 2025 | Admin Portal Navigation Bug Fix | ✅ 100% PASS | `/app/test_reports/iteration_8.json` |
| Jan 27, 2025 | Devices Tab Checkboxes & Spalten | ✅ 100% PASS | `/app/test_reports/iteration_7.json` |
| Jan 27, 2025 | Standort-Kacheln & Kit-Verwaltung | ✅ 100% PASS | `/app/test_reports/iteration_6.json` |
| Jan 27, 2025 | Stadt-Dropdown Tenant-Filter | ✅ 100% PASS | `/app/test_reports/iteration_5.json` |
| Jan 27, 2025 | Admin-Panel Schwarzer Bildschirm | ✅ 100% PASS | `/app/test_reports/iteration_4.json` |
| Jan 26, 2025 | Geräte-Lifecycle-Management | ✅ 100% PASS | `/app/test_reports/iteration_3.json` |
