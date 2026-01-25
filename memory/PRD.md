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

### ✅ Completed Features

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

### ✅ Completed (Jan 25, 2025)

#### P0 - Standort-Lifecycle-Management System
- **Status:** COMPLETE
- **Files:** 
  - `/app/backend/routes/location_management.py` - Backend API
  - `/app/frontend/src/components/LocationLifecycleManager.jsx` - Frontend UI
- **Features Implemented:**
  1. ✅ Status-Dashboard with 4 clickable stat cards (Gesamt, Aktiv, In Vorbereitung, Deaktiviert)
  2. ✅ Location table with status badges, filters, and search
  3. ✅ Status change modal with reason field
  4. ✅ Backend APIs: GET /api/locations/statuses, POST /api/locations/statuses-bulk, PUT /api/locations/{code}/status
  5. ✅ New "Lifecycle" tab in Admin Portal navigation
- **Tested:** Status change verified via API and UI

### ⏳ Pending Issues

| Priority | Issue | Status |
|----------|-------|--------|
| P1 | Real-time Footer Status (`portalOnline` hardcoded) | NOT STARTED |
| P2 | "Single Source of Truth" Migration for `fleet_management.py` | NOT STARTED |
| P1 | Offline-First Electron Agent (Phases 2-4) | IN PROGRESS |
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

Last Updated: January 25, 2025
