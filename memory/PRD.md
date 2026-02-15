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

5. **Location-basierte Kit-ID Generierung (NEW FEATURE - COMPLETE)**
   - **Format**: `{LOCATION_ID}-{SEQUENZ}-KIT` (z.B. MUCT01-01-KIT, MUCT01-02-KIT)
   - **Frontend**:
     - Bestehende Kits werden mit Status-Badge und Komponenten-Count angezeigt
     - Sequenz-Nummern werden extrahiert und als Liste angezeigt (z.B. "Sequenz: 01, 02")
     - Nächste Kit-ID wird automatisch berechnet und prominent angezeigt
     - Location-Dropdown zeigt Slot-Count pro Location
   - **Backend** (bereits implementiert):
     - `/api/asset-mgmt/kits/{kit_id}/assign-location` generiert automatisch neue Kit-ID
     - Regex-basierte Sequenz-Berechnung für korrekte Inkrementierung
   - **Getestet**: E2E-Test bestätigt MUCT01-01-KIT → MUCT01-02-KIT → MUCT01-03-KIT

6. **Hybrid-Inventar-System für Kit-Erstellung (NEW FEATURE - IMPLEMENTED 2025-02-15)**
   - **Konzept**: Zwei Arten von Komponenten in einem Kit-Template:
     - **Assets MIT Seriennummer**: Tablets, Scanner, Docking Stations (einzeln getrackt)
     - **Komponenten OHNE Seriennummer**: Kabel, Adapter, Hubs (stückzahl-basiert aus Inventory)
   - **Backend-Änderungen** (`/app/backend/routes/asset_management_v2.py`):
     - Neues Pydantic Model: `KitTemplateInventoryComponent`
     - `GET /api/asset-mgmt/kit-templates`: Gibt `inventory_components`, `quantity_in_stock`, `stock_status`, `possible_kits` zurück
     - `GET /api/asset-mgmt/inventory-for-templates`: Liste aller Inventory-Artikel für Templates
     - `GET /api/asset-mgmt/asset-types`: Liste aller Asset-Typen für Template-Editor
     - `POST /api/asset-mgmt/kit-templates/{id}/add-inventory-component`: Fügt Inventory-Komponente hinzu
     - `DELETE /api/asset-mgmt/kit-templates/{id}/remove-inventory-component/{inv_id}`: Entfernt Komponente
     - `POST /api/asset-mgmt/kits/quick-assemble`: Bucht automatisch Inventory-Komponenten ab
     - Neue Funktion `calculate_possible_kits()`: Berechnet mögliche Kits aus Lagerbestand
   - **Frontend-Änderungen** (`/app/frontend/src/components/KitAssemblyWorkflow.jsx`):
     - Kit-Kacheln zeigen jetzt separate Sektionen:
       - "MIT SERIENNUMMER:" mit Verfügbarkeit
       - "OHNE SERIENNUMMER (Lager):" mit Stückzahl und Stock-Status
       - "BAUBARE KITS:" mit Count und limitierender Komponente
   - **Getestet**: Backend-API funktioniert, Inventory-Komponenten werden korrekt angezeigt

7. **Kit-Template-Management (NEW FEATURE - IMPLEMENTED 2025-02-15)**
   - **Frontend** (`/app/frontend/src/components/KitAssemblyWorkflow.jsx`):
     - "Neue Vorlage" Button zum Erstellen neuer Kit-Vorlagen
     - Bearbeiten-Button (Stift-Icon) auf jeder Kachel
     - Duplizieren-Button (Kopieren-Icon) auf jeder Kachel
     - Löschen-Button (Müll-Icon) auf jeder Kachel
     - Template-Editor-Modal mit:
       - Assets mit Seriennummer hinzufügen/entfernen
       - Lager-Komponenten (ohne SN) hinzufügen/entfernen
     - "Surface + Desko Kit" umbenannt zu "Surface Pro 4 + Desko Kit"
     - Neues Template "Surface Pro 6 + Desko Kit" (KIT-SP6D) erstellt
   - **Getestet**: Backend-API funktioniert

8. **Nachbestellungs-Funktion (NEW FEATURE - IMPLEMENTED 2025-02-15)**
   - **Frontend** (`/app/frontend/src/components/KitAssemblyWorkflow.jsx`):
     - "Nachbestellen" Button erscheint wenn Komponenten fehlen
     - Modal zeigt Nachbestellungsvorschläge:
       - Artikelname, aktueller Bestand, benötigte Menge für 10 Kits
     - Automatische Berechnung basierend auf Kit-Templates
   - **VERIFIZIERT**: Button zeigt "(15)" für 15 fehlende Komponenten
   - **VERIFIZIERT**: Modal listet alle Assets mit Nachbestellmenge

9. **TSRID KIT Templates (COMPLETED 2025-02-15)**
   - **TSRID KIT i7** (template_id: KIT-TSRi7) - TSRID Hardware-Kit mit i7 Prozessor
   - **TSRID KIT i5** (template_id: KIT-TSRi5) - TSRID Hardware-Kit mit i5 Prozessor
   - Beide Templates enthalten: TSRID Tablet, TSRID Scanner, TSRID Tablet Dock, TSRID Scanner Dock, TSRID Tablet Netzteil, TSRID Scanner Netzteil

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
- [x] Location-based Kit ID generation (MUCT01-01-KIT format) - **FIXED 2025-02-15**
- [x] TSRID KIT umbenennen zu "TSRID KIT i7" (KIT-TSRi7) - **DONE 2025-02-15**
- [x] TSRID KIT i5 Template erstellen (KIT-TSRi5) - **DONE 2025-02-15**

### P1 - High Priority
- [x] **Hybrid Inventory System for Kit-Zusammenstellung** - **IMPLEMENTED 2025-02-15**
  - Kit-Templates können jetzt Inventory-Komponenten (ohne SN) enthalten
  - Backend berechnet automatisch "Mögliche Kits" basierend auf Lagerbestand
  - Kit-Kacheln zeigen detailliert:
    - Assets MIT Seriennummer (mit Verfügbarkeit im Lager)
    - Komponenten OHNE Seriennummer (mit Lagerbestand und Status)
    - Anzahl baubarer Kits mit limitierender Komponente
  - Automatisches Abbuchen von Inventory bei Kit-Erstellung
- [ ] Kit Management Phase 2: Component replacement logic, full history logging, component locking
- [ ] Kit Feature Phase 3 & 4: Connect QR-Code Label Generation to printer
- [ ] Full Scanner Integration (Regula & Desko USB)
- [ ] Sync Engine Activation (SQLite to MongoDB)

### P2 - Medium Priority
- [ ] UI für Inventory-Komponenten zu Kit-Templates hinzufügen (Admin-UI)
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
- `GET /api/asset-mgmt/kit-templates` - Get all kit templates with inventory stock levels
- `GET /api/asset-mgmt/inventory-for-templates` - Get inventory items for template configuration
- `POST /api/asset-mgmt/kit-templates/{id}/add-inventory-component` - Add inventory component to template
- `DELETE /api/asset-mgmt/kit-templates/{id}/remove-inventory-component/{inv_id}` - Remove inventory component
- `POST /api/asset-mgmt/kits/quick-assemble` - Create kit and auto-deduct inventory

### Database
- MongoDB Atlas (production)
- Collection: `tenant_locations` - Location data with tenant association
- Collection: `inventory_items` - Inventory items ohne Seriennummer (Kabel, Adapter, etc.)
- Collection: `tsrid_kit_templates` - Kit templates with asset + inventory components
- Collection: `tsrid_assets` - Assets with serial numbers
- Collection: `tsrid_kits` - Assembled kits
