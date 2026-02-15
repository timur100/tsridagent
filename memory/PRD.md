# TSRID Offline-First Electron Agent - Product Requirements Document

## Original Problem Statement
Build an "Offline-First Electron Agent" with an expanded Asset Management module (V2) with comprehensive Kit Management.

## Core Requirements
- Full-stack asset management application
- React frontend + FastAPI backend + MongoDB
- Asset Management V2 with multi-level structure (Locations, Slots, KITs, Assets)
- Kit Management with sequential ID generation (TSRID-KIT-XXX)
- Offline-first capability via Electron
- Brother QL-820NWB printer integration
- Scanner integration (Regula & Desko USB)

## User Personas
- **Admin Users**: Full access to all modules, manage tenants, locations, assets
- **Scan App Users**: PIN-based login (3842), scanning and verification tasks
- **Admin App Users**: PIN-based login (9988), administrative tasks in scan environment

## Credentials
- **Web Portal Login:** admin@tsrid.com / admin123
- **Scan App User PIN:** 3842
- **Scan App Admin PIN:** 9988

---

## What's Been Implemented

### Session: 2025-02-15 (Current)

#### Bug Fixes
1. **Kit Assignment Modal Black Screen Bug (FIXED)**
   - **Problem**: Screen turned black when selecting a Tenant in the Kit Assignment modal
   - **Root Cause**: `getFilterOptions()` + empty string values in Select components
   - **Solution**: `useMemo` for filter options + `"__all__"`/`"__none__"` placeholder values

2. **Filter-Kaskade funktioniert nicht (FIXED)**
   - **Problem**: Wenn Bundesland "Berlin" ausgewählt wurde, zeigte der Stadt-Filter alle Städte statt nur Berlin
   - **Solution**: `filterOptions` nutzt jetzt kaskadierende Filter (Kontinent -> Land -> Bundesland -> Stadt)

3. **Location-Dropdown ohne Adresse/PLZ (FIXED)**
   - **Problem**: Im Location-Dropdown fehlten Adresse und Postleitzahl
   - **Solution**: Zweizeiliges Format mit Location-ID/Name oben, Adresse/PLZ/Stadt/Bundesland unten
   - **Fix**: `postal_code` statt `zip` verwendet (korrektes Datenbankfeld)

4. **"Neue Location" Button Logout-Bug (FIXED)**
   - **Problem**: Button navigierte zu ungültiger Route `/portal/locations` → Logout
   - **Solution**: Navigation zu `/portal/admin` mit `state: { activeTab: 'asset-management' }`

5. **Location-basierte Kit-ID Generierung (NEW FEATURE)**
   - **Format**: `{LOCATION_ID}-{SEQUENZ}-KIT` (z.B. MUCT01-01-KIT, MUCT01-02-KIT)
   - **Funktionen**:
     - Bestehende Kits bei Location-Auswahl anzeigen mit Status und Komponenten-Count
     - Sequenz-Nummern werden extrahiert und angezeigt
     - Nächste Kit-ID automatisch berechnet (höchste Sequenz + 1)
     - Location-Dropdown zeigt Slot-Count pro Location

#### Technical Changes
- `/app/frontend/src/components/KitDetailModal.jsx`:
  - Zeilen 258-316: `filterOptions` useMemo mit kaskadierenden Filtern
  - Zeilen 840-857: Location-Dropdown mit Adresse und `postal_code`
  - Zeilen 655-663, 706-710, 876-879: Navigation-Buttons mit korrektem Routing

### Session: 2025-02-14

#### Completed Features
1. **Kit Management UI Standardization**
   - Renamed all "Bundle" references to "KIT"
   - Button text changed from "Neu Bundle (kit)" to "Neues KIT"

2. **Kit Creation Workflow**
   - Clicking "Neues KIT" navigates to Kit-Zusammenstellung (Kit Assembly) view
   - Kits are created with status "Lager" (In Storage) without initial location assignment
   - Sequential Kit ID generation (TSRID-KIT-XXX) via `/api/asset-mgmt/kits/next-id`

3. **Kit Assignment Workflow (Enhanced)**
   - Tenant/Customer selection dropdown in Kit Detail Modal
   - Filtered locations based on selected tenant
   - Advanced location filtering (Continent, Country, State, City)
   - Searchable location dropdown
   - "+ Neuer Tenant" and "+ Neue Location" navigation buttons

4. **Enhanced Locations Table**
   - Added columns: Street (Straße), ZIP (PLZ), City (Stadt), State (Bundesland), Station Name
   - Added dropdown filters for City and State

5. **Bug Fixes**
   - **Search Input Bug (FIXED)**: Changed `Filters` from inner function component to JSX variable
   - **Tab Navigation Bug (FIXED)**: Removed unnecessary `navigate()` call
   - **Tenant Filter Bug (FIXED)**: Updated backend to filter by `tenant_name`

---

## Prioritized Backlog

### P0 - Critical (Completed)
- [x] Kit Assignment Modal black screen bug - **FIXED 2025-02-15**
- [x] Search input bug in Locations tab
- [x] Tab navigation bug

### P1 - High Priority
- [ ] Kit Management Phase 2: Component replacement logic, full history logging, component locking
- [ ] Kit Feature Phase 3 & 4: Connect QR-Code Label Generation to printer
- [ ] Full Scanner Integration (Regula & Desko USB)
- [ ] Sync Engine Activation (SQLite to MongoDB)

### P2 - Medium Priority
- [ ] Printer Integration (Frontend) - finalize
- [ ] Performance optimizations for all tables
- [ ] Agent Status Overview

### P3 - Lower Priority
- [ ] Complete "Single Source of Truth" Migration for fleet_management.py
- [ ] Debug and Finalize Printer Support in Electron App
- [ ] Webcam for Asset Photos
- [ ] ESP32 Integration

---

## Known Issues

### Recurring Issues
- **Electron app printer support**: Recurrence count 5+, NOT STARTED

### Mocked/Incomplete
- `/app/backend/routes/fleet_management.py`: Contains mock data needing migration

---

## Architecture

### Directory Structure
```
/app/
├── backend/
│   ├── routes/
│   │   └── asset_management_v2.py  # Asset mgmt V2 endpoints
│   └── server.py
└── frontend/
    └── src/
        ├── pages/
        │   └── AdminPortal.jsx      # Main admin portal
        └── components/
            └── AssetManagementV2.jsx # Asset mgmt V2 component
```

### Key API Endpoints
- `GET /api/asset-mgmt/locations` - Get locations with filters (city, state, customer)
- `GET /api/asset-mgmt/locations/filters` - Get filter options (cities, states)

### Database
- MongoDB Atlas (production)
- Collection: `tenant_locations` - Location data with tenant association
