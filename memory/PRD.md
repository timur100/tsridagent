# TSRID Offline-First Electron Agent - Product Requirements Document

## Original Problem Statement
Build an "Offline-First Electron Agent" with an expanded Asset Management module (V2).

## Core Requirements
- Full-stack asset management application
- React frontend + FastAPI backend + MongoDB
- Asset Management V2 with multi-level structure (Locations, Slots, Bundles, Assets)
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

### Session: 2025-02-14

#### Completed Features
1. **Enhanced Locations Table**
   - Added columns: Street (Straße), ZIP (PLZ), City (Stadt), State (Bundesland), Station Name
   - Added dropdown filters for City and State
   - Backend API updated in `asset_management_v2.py`

2. **Bug Fixes**
   - **Search Input Bug (FIXED)**: Changed `Filters` from inner function component to JSX variable to prevent remounting
   - **Tab Navigation Bug (FIXED)**: Removed unnecessary `navigate()` call that caused state reset
   - **Tenant Filter Bug (FIXED)**: Updated backend to filter by `tenant_name`, added missing Puma data to DB
   - **Soltau Data Correction (FIXED)**: Updated geographic data in database

#### Technical Changes
- `/app/frontend/src/components/AssetManagementV2.jsx`: 
  - Line 722-817: `const Filters = () =>` changed to `const filtersJSX = (...)`
  - Line 2337: `<Filters />` changed to `{filtersJSX}`
- `/app/frontend/src/pages/AdminPortal.jsx`:
  - Line 1013-1019: Added check for current pathname before navigate()

---

## Prioritized Backlog

### P0 - Critical (Current Session)
- [x] Search input bug in Locations tab
- [x] Tab navigation bug
- [ ] User verification of fixes pending

### P1 - High Priority
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
