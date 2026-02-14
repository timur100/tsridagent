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

**Pagination integriert in:**
- ✅ InventoryManagement (Artikel)
- ✅ OrdersManagement (Bestellungen)
- ✅ CustomerManagement (Kunden)
- ✅ SupportManagement (Tickets)
- ✅ KitManager (Kit-Verwaltung)
- ✅ ActivationCodeManager (Aktivierungscodes)
- ✅ LicenseManagement (Lizenzen)
- ✅ DeviceManagement (bereits vorhanden)
- ✅ AllLocationsTab (bereits vorhanden)

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

#### P0 - Geräte-Verfügbarkeit für Kits (Feb 6, 2025) - ✅ BEHOBEN & GETESTET
- **Status:** BEHOBEN - 100% Backend (14/14) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_9.json`
- **Problem:** User konnte keine Geräte beim Kit-Erstellen auswählen. Der Workflow war unklar - Geräte mussten Status "Im Lager" haben und einem Tenant zugewiesen sein.
- **Lösung - 3-teilig:**
  1. ✅ **DeviceLifecycleManager Formular erweitert:**
     - Neues "Tenant (Kunde)" Dropdown-Feld (Pflichtfeld, oben angezeigt)
     - Neues "Status" Dropdown-Feld mit "Im Lager" als Standard
     - Hinweis: "✓ Geräte mit Status 'Im Lager' können zu Kits hinzugefügt werden"
  2. ✅ **Storage Overview als Sub-Tab in Lagerverwaltung:**
     - 3 Summary Cards: Gesamt im Lager, Verfügbar für Kits, In Kits zugewiesen
     - Gruppierung nach Tenant mit Aufklappfunktion
     - Filter: Tenant, Gerätetyp, "Nur verfügbar für Kits"
     - Gerätetabelle mit Pagination
  3. ✅ **Kit-Modal verbessert:**
     - Zeigt Storage Stats: "Gesamt im Lager: X, Verfügbar für Kits: Y"
     - Verfügbare Geräte werden korrekt angezeigt
     - Hinweis falls keine Geräte verfügbar mit Anleitung
- **Dateien:**
  - `/app/frontend/src/components/DeviceLifecycleManager.jsx`
  - `/app/frontend/src/components/StorageOverview.jsx`
  - `/app/frontend/src/components/KitManager.jsx`
  - `/app/frontend/src/pages/AdminPortal.jsx`
  - `/app/backend/routes/device_lifecycle.py`
- **API-Endpoint:** `GET /api/device-lifecycle/storage/overview` (mit optional `tenant_id` Filter)

#### Lagerverwaltung Konsolidierung & Kit-Vorlagen (Feb 6, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend (17/17) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_10.json`
- **Problem:** Doppeltes Menü (Lager vs Inventory) war verwirrend. User wollte alles in "Lagerverwaltung" zusammenführen und Kit-Vorlagen definieren können.
- **Lösung:**
  1. ✅ **Menü-Konsolidierung:**
     - Separater "Lager" Tab aus Hauptmenü entfernt
     - "Inventory" Tab umbenannt zu "Lagerverwaltung"
     - 4 Sub-Tabs: Inventar, Wareneingang, Geräte-Lager, Kit-Vorlagen
  2. ✅ **Geräte-Lager Sub-Tab (StorageOverview):**
     - Summary Cards: Gesamt, Verfügbar für Kits, In Kits zugewiesen
     - **NEU:** "Nach Gerätetyp" Übersicht mit Stückzahlen pro Typ
     - "Nach Tenant" Aufklappbare Gruppierung
  3. ✅ **Kit-Vorlagen Sub-Tab (KitTemplateManager) - NEU:**
     - CRUD für Kit-Vorlagen (Name, Beschreibung, Tenant)
     - Komponenten definieren: Gerätetyp + Menge pro Vorlage
     - **"X Kits möglich" Berechnung** basierend auf Lagerbeständen
     - Farbcodierte Verfügbarkeitsanzeige (grün/rot)
- **Neue Dateien:**
  - `/app/frontend/src/components/KitTemplateManager.jsx`
  - `/app/backend/routes/kit_templates.py`
- **Neue API-Endpoints:**
  - `GET /api/kit-templates/list`
  - `POST /api/kit-templates/create`
  - `GET /api/kit-templates/{id}`
  - `PUT /api/kit-templates/{id}`
  - `DELETE /api/kit-templates/{id}`
  - `GET /api/kit-templates/{id}/availability`
- **Testdaten:** Standard-Scanner-Kit (europcar) mit 3 Komponenten (Tablet, Scanner Regula, Docking Station Typ 1)
- **Dateien:**
  - `/app/frontend/src/components/DeviceLifecycleManager.jsx`
  - `/app/frontend/src/components/StorageOverview.jsx`
  - `/app/frontend/src/components/KitManager.jsx`
  - `/app/frontend/src/pages/AdminPortal.jsx`
  - `/app/backend/routes/device_lifecycle.py`
- **API-Endpoint:** `GET /api/device-lifecycle/storage/overview` (mit optional `tenant_id` Filter)

#### Inventar-API & Kit-Vorlagen mit Inventar-Support (Feb 6, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend (21/21) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_11.json`
- **Problem:** 
  1. Inventar-API fehlte (Artikel konnten nicht angelegt werden)
  2. Kit-Vorlagen unterstützten nur Geräte mit Seriennummer, nicht Artikel wie Kabel/Adapter
- **Lösung:**
  1. ✅ **Inventar-API vollständig implementiert:**
     - CRUD für Artikel: GET/POST/PUT/DELETE `/api/inventory/items`
     - Kategorien-Verwaltung: `/api/inventory/categories`
     - Bestands-Update: PUT `/api/inventory/items/{id}/stock`
     - Auto-Erstellung von Standard-Kategorien: Hardware, Kabel, Adapter, Zubehör, Verbrauchsmaterial
  2. ✅ **Kit-Vorlagen erweitert für zwei Komponententypen:**
     - **Geräte (mit SN):** Aus Geräte-Lager (device_inventory), werden einzeln verfolgt
     - **Inventar-Artikel (ohne SN):** Aus Inventar (inventory_items), nur Stückzahlen
     - Zwei Tabs im "Neue Vorlage" Modal
     - Komponente hat `source: 'device'` oder `source: 'inventory'`
     - Verfügbarkeitsberechnung berücksichtigt beide Typen
- **Neue/Geänderte Dateien:**
  - `/app/backend/routes/inventory.py` - Komplett überarbeitet (async MongoDB)
  - `/app/backend/routes/kit_templates.py` - Erweitert für inventory components
  - `/app/frontend/src/components/KitTemplateManager.jsx` - Zwei Tabs für Geräte/Inventar
- **Testdaten:** 3 Inventar-Artikel (USB-C Kabel 50x, HDMI Adapter 25x, Displayport Kabel 30x)

#### Asset Management V2 - Multi-Level Rollout-Struktur (Feb 13, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend (34/34) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_12.json`
- **Problem:** Bestehende Asset-Verwaltung war zu flach. User benötigte eine 4-stufige Hierarchie für großflächige Hardware-Rollouts mit Trennung von physischen Geräten (Assets), Installationsplätzen (Slots) und Hardware-Kits (Bundles).
- **Lösung - Neue 4-Tier-Architektur:**
  1. ✅ **Locations (Standorte):** Physische Installationsorte
     - Felder: location_id, country, customer, city, address, zip_code, status, contacts
     - Status: active, inactive, planned, decommissioned
  2. ✅ **Slots (Installationsplätze):** Positionen an einem Standort
     - Felder: slot_id, location_id, bundle_id, teamviewer_alias, position_description, status
     - Status: empty, installed, maintenance, reserved
     - Relation: Slot → Location (many-to-one)
  3. ✅ **Bundles (Hardware-Kits):** Zusammengestellte Geräte-Sets
     - Felder: bundle_id, country, description, status
     - Status: in_storage, deployed, in_transit, maintenance, retired
     - Relation: Bundle → Slot (one-to-one when installed)
  4. ✅ **Assets (Physische Geräte):** Einzelne Hardwareteile mit Seriennummer
     - Felder: asset_id, type, manufacturer_sn, imei, mac, manufacturer, model, bundle_id, status, history[]
     - Typen: tablet, scanner, dock, psu, cable, switch, router, other
     - Status: in_storage, deployed, in_transit, maintenance, defective, retired
     - Relation: Asset → Bundle (many-to-one)
     - **Historie:** Automatische Event-Protokollierung (created, assigned, installed, etc.)
- **Backend-Implementierung (`/app/backend/routes/asset_management_v2.py`):**
  - CRUD-Endpoints für alle 4 Collections
  - Beziehungs-Management:
    - `POST /api/asset-mgmt/slots/{slot_id}/install-bundle` - Bundle installieren
    - `POST /api/asset-mgmt/slots/{slot_id}/uninstall-bundle` - Bundle deinstallieren
    - `POST /api/asset-mgmt/assets/{asset_id}/assign-bundle` - Asset zu Bundle zuweisen
    - `POST /api/asset-mgmt/assets/{asset_id}/remove-from-bundle` - Asset entfernen
  - Statistik-Endpoint: `GET /api/asset-mgmt/stats`
  - Automatische DB-Index-Erstellung für Performance
- **Frontend-Implementierung (`/app/frontend/src/components/AssetManagementV2.jsx`):**
  - Neuer "Rollout Management" Sub-Tab unter Assets (Standard)
  - 4 Statistik-Cards: Locations, Slots, Bundles, Assets
  - 4 interne Tabs mit Tabellen und Filtern
  - Detail-Modals mit Beziehungsanzeige
  - Asset-Historie als Timeline mit farbcodierten Events
  - Create-Modals für alle Entitätstypen
  - Pagination und Such-/Filter-Funktionen
- **MongoDB Collections:**
  - `tsrid_locations`, `tsrid_slots`, `tsrid_bundles`, `tsrid_assets`
- **Testdaten erstellt:**
  - Location: BERE01 (Berlin, Europcar, aktiv)
  - Slot: BERE01-01 (installiert)
  - Bundle: BDL-DE-001 (deployed)
  - Assets: TAB-DE-001 (Tablet), SCN-DE-001 (Scanner)

#### Asset Management V2 - Erweiterte Felder (Feb 13, 2025) - ✅ COMPLETE
- **Status:** COMPLETE - Frontend & Backend erweitert
- **Neue Felder für Assets:**
  - **Kaufdaten:** Kaufdatum, Kaufpreis, Lieferant, Rechnungsnummer
  - **Garantie:** Garantie bis, Garantie-Typ (Standard, Erweitert, Vor-Ort, NBD)
  - **Installation:** Installationsdatum, Installiert von
  - **Lizenz:** Lizenzschlüssel, Lizenz-Typ (Dauer, Abo, OEM, Volumen), Aktivierungsdatum, Ablaufdatum
- **Erweiterte Gerätetypen:**
  - Tablets: Surface Pro 4/6/7, Surface Go, Tablet (allgemein)
  - Scanner: Desko Scanner, Regula Scanner
  - Docking: Desko Dock, Dock Quer, Surface Dock
  - Netzteile: Desko PSU, Surface PSU
  - Kabel & Adapter: USB Adapter 90°, USB Hub, HDMI/DP Adapter
  - Netzwerk: Switch, Router
- **Hersteller-Dropdown:** Microsoft, Desko, Regula, Samsung, Lenovo, HP, Dell, Anker, Belkin, Ugreen
- **Neue API:** `GET /api/asset-mgmt/metadata` - Liefert alle Typen, Hersteller, Status-Optionen
- **UI-Features:**
  - Asset-Formular mit scrollbaren Sektionen (Basis, Netzwerk, Kaufdaten, Garantie, Installation, Lizenz)
  - Gerätetyp-Dropdown mit Kategorien-Gruppierung
  - Garantie-Warnung in Tabelle (Rot = Abgelaufen, Gelb = Läuft bald ab, Grün = Gültig)
  - Lizenz-Warnung in Detailansicht
  - Farbcodierte Sektionen für abgelaufene Garantien/Lizenzen

#### Geräte-Asset Verknüpfung & Automatische Datumsberechnung (Feb 14, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend (18/18) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_13.json`
- **Problem:** 
  1. Bestehende Geräte aus dem "Devices" Bereich mussten mit Assets verknüpft werden können
  2. User wollte Garantie/Lizenz-Laufzeit in Monaten eingeben, nicht manuell Enddatum berechnen
  3. TSRID-spezifische Gerätetypen fehlten
- **Lösung - 3 Features:**

  **1. Geräte-Import Tab (NEU):**
  - Neuer Tab "Geräte-Import" in Asset Management V2
  - 3 Statistik-Cards: Gesamt Geräte, Mit Asset, Ohne Asset
  - Badge am Tab zeigt Anzahl unverknüpfter Geräte (z.B. "215")
  - Tabelle mit: Device-ID, Asset-ID (Link/Kein Asset), Location, Stadt, SN-PC, SN-SC, Status
  - Checkbox-Auswahl für Bulk-Operationen
  - Filter: "Alle Geräte", "Ohne Asset", "Mit Asset"
  - "+ Asset" Button pro Zeile öffnet Modal
  - Klick auf Asset-ID navigiert zum Assets-Tab
  - Bulk-Erstellung: Mehrere Devices auswählen → alle als Assets erstellen

  **2. Automatische Datumsberechnung:**
  - Garantie: Kaufdatum + Monate (12/24/36/48/60) = Garantie-Enddatum
  - Lizenz: Aktivierungsdatum + Monate (12/24/36/48/60/Unbegrenzt) = Lizenz-Enddatum
  - Dropdown-Auswahl für Monate statt manueller Datumseingabe
  - Bestätigungstext: "✓ Garantie-Ende berechnet: [Datum]"
  - Berechnetes Datum bleibt editierbar für Sonderfälle

  **3. TSRID Gerätetypen:**
  - `tsrid_tablet` - TSRID Tablet
  - `tsrid_scanner` - TSRID Scanner
  - Als erste Kategorie "TSRID" im Gerätetyp-Dropdown
  - Hersteller "TSRID" zur Auswahl hinzugefügt

- **Backend-Endpoints (NEU in `/app/backend/routes/asset_management_v2.py`):**
  - `GET /api/asset-mgmt/devices/all` - Alle Geräte mit Asset-Status & Stats
  - `GET /api/asset-mgmt/devices/unlinked` - Nur Geräte ohne Asset
  - `GET /api/asset-mgmt/devices/linked` - Nur Geräte mit Asset
  - `POST /api/asset-mgmt/devices/{device_id}/create-asset` - Asset aus Device erstellen
  - `POST /api/asset-mgmt/devices/{device_id}/link-asset` - Device mit bestehendem Asset verknüpfen
  - `POST /api/asset-mgmt/devices/{device_id}/unlink-asset` - Verknüpfung lösen
  - `POST /api/asset-mgmt/devices/bulk-create-assets` - Mehrere Assets auf einmal erstellen
  - `GET /api/asset-mgmt/assets/{asset_id}/with-device` - Asset mit Live-Device-Daten

- **Bi-direktionale Verknüpfung:**
  - Asset speichert: `linked_device_id` (Referenz auf europcar_devices.device_id)
  - Device speichert: `asset_id` (z.B. "AST-AAHC01-01")
  - Asset-ID Pattern: `AST-{device_id}`

- **MongoDB Collections:**
  - `europcar_devices` (multi_tenant_admin DB) - `asset_id` Feld hinzugefügt
  - `tsrid_assets` (portal_db) - `linked_device_id` Feld hinzugefügt

- **Dateien:**
  - `/app/backend/routes/asset_management_v2.py` - Device-Asset Endpoints (ab Zeile 1320)
  - `/app/frontend/src/components/AssetManagementV2.jsx` - Geräte-Import Tab & Modal

#### Asset-ID Format Implementierung (Feb 14, 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_15.json`
- **Neues Format:** `[device_id]-[TYP]-[MODELL]`
  - Beispiel: `AAHC01-01-TAB-SP4` (Surface Pro 4 Tablet)
  - Beispiel: `AAHC01-01-SCA-TSR` (TSRID Scanner)
  - Beispiel: `AAHC01-01-KIT-SFD` (Surface + Desko Kit)
- **Implementierte Asset-Typen und Suffixe:**
  | Kategorie | Asset-Typ | Suffix |
  |-----------|-----------|--------|
  | **Tablets** |
  | | Surface Pro 4 | TAB-SP4 |
  | | Surface Pro 6 | TAB-SP6 |
  | | TSRID Tablet | TAB-TSR |
  | **Scanner** |
  | | TSRID Scanner | SCA-TSR |
  | | Desko Scanner | SCA-DSK |
  | **Tablet Docks** |
  | | Quer Dock (Surface) | TDO-QER |
  | | TSRID Tablet Dock | TDO-TSR |
  | **Scanner Docks** |
  | | Desko Scanner Dock | SDO-DSK |
  | | TSRID Scanner Dock | SDO-TSR |
  | **Tablet PSU** |
  | | Surface Netzteil | TPS-SPX |
  | | TSRID Netzteil | TPS-TSR |
  | **Scanner PSU** |
  | | Desko Netzteil | SPS-DSK |
  | | TSRID Netzteil | SPS-TSR |
  | **Extensions** |
  | | USB Extension | USB |
  | | LAN Extension | LAN |
  | | 12V Extension | 12V |
  | **Kits** |
  | | Surface + Desko Kit | KIT-SFD |
  | | TSRID Kit | KIT-TSR |
- **Backend:** Neue Asset-Typen (`tab_sp4`, `sca_tsr`, etc.) mit Suffix-Mapping
- **Frontend:** Modal mit Asset-ID Vorschau und Typ-Dropdown
- **Verifizierte Assets:** BERE01-01-TAB-SP4, BERE02-01-SCA-TSR, BERE03-01-SDO-DSK, BERL01-01-KIT-SFD, etc.

#### Kit/Bundle Feature Phase 1 (Feb 2025) - ✅ COMPLETE & TESTED
- **Status:** COMPLETE - 100% Backend (18/18) & Frontend Tests bestanden
- **Test Report:** `/app/test_reports/iteration_16.json`
- **Feature:** Erweiterte Asset-Typen und Kit-Template-System

**Neue Asset-Typen hinzugefügt:**
| Kategorie | Asset-Typ | Suffix | Beschreibung |
|-----------|-----------|--------|--------------|
| **Kabel Typ A (mit SN)** |
| | USB-A Kabel | CAB-USBA | Mit Seriennummer-Tracking |
| | USB-C Kabel | CAB-USBC | Mit Seriennummer-Tracking |
| | LAN-Kabel | CAB-LAN | Mit Seriennummer-Tracking |
| | HDMI-Kabel | CAB-HDMI | Mit Seriennummer-Tracking |
| | DisplayPort-Kabel | CAB-DP | Mit Seriennummer-Tracking |
| | Stromkabel | CAB-PWR | Mit Seriennummer-Tracking |
| **Kabel Typ B (Verbrauch)** |
| | USB-A Kabel | CNS-USBA | Ohne SN, Verbrauchsmaterial |
| | USB-C Kabel | CNS-USBC | Ohne SN, Verbrauchsmaterial |
| | LAN-Kabel | CNS-LAN | Ohne SN, Verbrauchsmaterial |
| | HDMI-Kabel | CNS-HDMI | Ohne SN, Verbrauchsmaterial |
| | DisplayPort-Kabel | CNS-DP | Ohne SN, Verbrauchsmaterial |
| | Stromkabel | CNS-PWR | Ohne SN, Verbrauchsmaterial |
| **Adapter** |
| | USB-C Adapter/Hub | ADP-USBC | |
| | HDMI Adapter | ADP-HDMI | |
| | DisplayPort Adapter | ADP-DP | |
| | 90° Adapter | ADP-90 | |
| **Stromverteiler** |
| | Netzleiste | PWR-STRIP | |
| | 12V Verteiler | PWR-12V | |

**Kit-Template System:**
- **Collection:** `tsrid_kit_templates`
- **Standard-Vorlagen erstellt:**
  - `KIT-SFD`: Surface + Desko Kit (8 Komponenten: Tablet, Scanner, 2x Docks, 2x Netzteile, 2x Kabel optional)
  - `KIT-TSR`: TSRID Kit (6 Komponenten: Tablet, Scanner, 2x Docks, 2x Netzteile)
- **API-Endpoints:**
  - `GET /api/asset-mgmt/kit-templates` - Liste aller Vorlagen
  - `GET /api/asset-mgmt/kit-templates/{id}` - Vorlage-Details mit Komponenten
  - `POST /api/asset-mgmt/kit-templates` - Neue Vorlage erstellen
  - `PUT /api/asset-mgmt/kit-templates/{id}` - Vorlage aktualisieren
  - `DELETE /api/asset-mgmt/kit-templates/{id}` - Vorlage löschen
  - `POST /api/asset-mgmt/kit-templates/seed-defaults` - Standard-Vorlagen erstellen

**Kit-Zusammenstellung (Assembly):**
- `POST /api/asset-mgmt/kits/assemble` - Kit aus Vorlage erstellen
- `GET /api/asset-mgmt/kits` - Liste aller Kits
- `GET /api/asset-mgmt/kits/{kit_id}` - Kit-Details mit Komponenten
- `POST /api/asset-mgmt/kits/{kit_id}/add-component` - Komponente hinzufügen (per Scan)
- `DELETE /api/asset-mgmt/kits/{kit_id}/remove-component/{comp_id}` - Komponente entfernen
- `POST /api/asset-mgmt/kits/{kit_id}/scan` - Kit/Komponente scannen (gibt Kit-Info zurück)

### ⏳ Pending Issues

| Priority | Issue | Status |
|----------|-------|--------|
| P0 | Kit Feature Phase 2: Frontend UI für Kit-Zusammenstellung | NEXT |
| P0 | Kit Feature Phase 3: QR-Code Label-Generierung | PLANNED |
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
│   ├── location_management.py    # Location lifecycle
│   ├── unified_locations.py      # Hierarchical locations API
│   ├── agent_registration.py     # Device registration
│   ├── device_lifecycle.py       # Device lifecycle & Kit management
│   ├── inventory.py              # Inventory management (non-serialized items)
│   ├── kit_templates.py          # Kit template definitions
│   └── asset_management_v2.py    # NEW: 4-tier asset management system
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

Last Updated: February 2025

---

## Wareneingang-Workflow (Neu implementiert Feb 2025)

### Workflow-Ablauf:
1. **Wareneingang**: Geräte mit Seriennummer (Barcode-Scan) erfassen
   - Status: `unassigned`
   - Keine Asset-ID (nur Seriennummer)
2. **Zuweisung zu Standort**: 
   - Asset-ID wird automatisch generiert (z.B. `AAHC01-01-TAB-TSR`)
   - Label-Daten für QR-Code werden bereitgestellt
   - Status wechselt zu `in_storage`

### API-Endpoints:
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/asset-mgmt/inventory/intake` | POST | Einzelnes Gerät erfassen |
| `/api/asset-mgmt/inventory/intake/batch` | POST | Mehrere Geräte erfassen |
| `/api/asset-mgmt/inventory/unassigned` | GET | Liste nicht zugewiesener Geräte |
| `/api/asset-mgmt/inventory/assign/{sn}` | POST | Gerät zuweisen → Asset-ID generieren |
| `/api/asset-mgmt/inventory/bulk-assign` | POST | Mehrere Geräte zuweisen |
| `/api/asset-mgmt/inventory/by-sn/{sn}` | GET | Gerät per Seriennummer finden |
| `/api/asset-mgmt/inventory/label/{asset_id}` | GET | Label-Daten abrufen |

### Beispiel:
```
# Wareneingang (35 Tablets)
POST /api/asset-mgmt/inventory/intake/batch
{
  "items": [
    {"manufacturer_sn": "SN001", "type": "tab_tsr"},
    {"manufacturer_sn": "SN002", "type": "tab_tsr"},
    ...
  ],
  "received_by": "Lager-Team",
  "supplier": "TSRID GmbH"
}

# Zuweisung
POST /api/asset-mgmt/inventory/assign/SN001
{"location_id": "AAHC01"}

# Ergebnis:
{
  "asset_id": "AAHC01-01-TAB-TSR",
  "print_label": true,
  "qr_code_content": "AAHC01-01-TAB-TSR"
}
```

---

## Test Reports
| Date | Feature | Result | Report |
|------|---------|--------|--------|
| Feb 2025 | Kit/Bundle Feature Phase 1 - Asset-Typen & Templates | ✅ 100% PASS | `/app/test_reports/iteration_16.json` |
| Feb 14, 2025 | Asset-ID Format mit TYP-MODELL Suffixen | ✅ 100% PASS | `/app/test_reports/iteration_15.json` |
| Feb 14, 2025 | Asset-ID Format mit Typ-Suffixen (v1) | ✅ 100% PASS | `/app/test_reports/iteration_14.json` |
| Jan 31, 2025 | Admin Portal Navigation Bug Fix | ✅ 100% PASS | `/app/test_reports/iteration_8.json` |
| Jan 27, 2025 | Devices Tab Checkboxes & Spalten | ✅ 100% PASS | `/app/test_reports/iteration_7.json` |
| Jan 27, 2025 | Standort-Kacheln & Kit-Verwaltung | ✅ 100% PASS | `/app/test_reports/iteration_6.json` |
| Jan 27, 2025 | Stadt-Dropdown Tenant-Filter | ✅ 100% PASS | `/app/test_reports/iteration_5.json` |
| Jan 27, 2025 | Admin-Panel Schwarzer Bildschirm | ✅ 100% PASS | `/app/test_reports/iteration_4.json` |
| Jan 26, 2025 | Geräte-Lifecycle-Management | ✅ 100% PASS | `/app/test_reports/iteration_3.json` |
