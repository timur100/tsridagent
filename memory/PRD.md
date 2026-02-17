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

### Session: 2025-02-17 (Current)

#### Bug Fixes
26. **Label-Druck abgeschnitten bei 62mm Endlosrolle (BUG FIX - 2025-02-17)**
    - **Problem**: Beim Drucken von Labels auf 62mm Endlosrollen wurde der Inhalt oben und unten abgeschnitten.
    - **Root Cause**: Die CSS `@page` Regel hatte eine feste Größe (`size: 62mm 29mm`), was bei einer Endlosrolle zu Abschneiden führte.
    - **Lösung**: 
      1. Neue wiederverwendbare `PrintableLabel.jsx` Komponente erstellt
      2. CSS geändert zu `@page { size: 62mm auto; }` - feste Breite, automatische Höhe
      3. Professionelleres Label-Layout mit QR-Code links, Info rechts, Barcode unten
      4. CDN-Libraries für QR-Code und Barcode im Druckfenster für maximale Kompatibilität
    - **Refactoring**: Duplizierte Print-Logik aus `GoodsReceiptWorkflow.jsx` und `AssetManagementV2.jsx` in eine zentrale Komponente konsolidiert
    - **Dateien**:
      - `/app/frontend/src/components/PrintableLabel.jsx` (NEU - exportiert printAssetLabel, LabelPreview, LabelPrintModal)
      - `/app/frontend/src/components/GoodsReceiptWorkflow.jsx` (Import Zeile 19, verwendet LabelPrintModal)
      - `/app/frontend/src/components/AssetManagementV2.jsx` (Import Zeile 26, verwendet LabelPrintModal)
    - **Druckhinweise im Modal**:
      - Brother QL-820NWB empfohlen
      - Papier: 62mm Endlosrolle (DK-22205)
      - Drucker auf "Automatische Größe" einstellen
    - **Test-Status**: ✅ 100% (Testing Agent verifiziert - iteration_31.json)

23. **Globale Suche Modal zeigt keine Daten (BUG FIX - 2025-02-17)**
    - **Problem**: Die globale Suche im Admin-Portal öffnete ein leeres Modal bei TSRID-Asset-Suche. Die Daten wurden korrekt an das Modal übergeben, aber nicht angezeigt.
    - **Root Cause**: CSS Layout-Bug in der Dialog-Komponente. Die Basis-Klasse verwendete `grid`, was dazu führte, dass innere `grid-cols-2` Elemente eine Höhe von 0 hatten.
    - **Lösung**:
      1. In `/app/frontend/src/components/ui/dialog.jsx`: `grid` zu `flex flex-col` geändert
      2. `isDark` Check zu `true` gesetzt (App verwendet immer Dark Mode)
      3. Alle Textfarben im Modal explizit auf `text-white`, `text-gray-300`, `text-gray-400` gesetzt
      4. Border zu allen Sektionen hinzugefügt (`border border-gray-700`)
    - **Dateien**:
      - `/app/frontend/src/components/ui/dialog.jsx` (Zeile 37: grid → flex flex-col)
      - `/app/frontend/src/pages/AdminPortal.jsx` (Modal CSS-Klassen aktualisiert)
    - **Verifizierte Funktionalität**:
      - Suche nach `TSRID-TAB-i7-0001` öffnet Modal
      - Alle Sektionen sichtbar: Identifikation, Produkt & Technische Daten, Kaufdaten & Garantie, Label-Vorschau
      - Status-Badge wird korrekt angezeigt (z.B. "Im Lager" grün)
      - QR-Code und Seriennummer-Barcode werden angezeigt
      - Buttons "Schließen" und "In Lagerverwaltung öffnen" funktionieren
    - **Test-Status**: ✅ 100% (Testing Agent verifiziert - iteration_30.json)

24. **Modal Layout optimiert (UI FIX - 2025-02-17)**
    - **Problem**: Modal war zu groß und erforderte Scrollen, um alle Inhalte zu sehen.
    - **Lösung**: Kompaktes 2x2 Grid-Layout mit kleineren Abständen und Schriftgrößen.
    - **Test-Status**: ✅ Visuell verifiziert

#### New Features
22. **Label-Verbesserungen: Asset-ID einzeilig + Seriennummer-Barcode (NEW FEATURE - 2025-02-17)**
    - **Feature**: Verbesserte Labels für Asset-Druck mit zwei neuen Elementen:
      1. Asset-ID wird jetzt auf einer einzigen Zeile angezeigt (kein Umbruch)
      2. Scannable Barcode für die Seriennummer wurde hinzugefügt
    - **Änderungen**:
      - `react-barcode` Library installiert (yarn add)
      - Label-Preview zeigt jetzt QR-Code links und Barcode für Seriennummer unten
      - CSS: `white-space: nowrap` für Asset-ID verhindert Zeilenumbruch
      - Print-Funktion extrahiert sowohl QR-Code als auch Barcode-SVG
    - **Dateien**:
      - `/app/frontend/src/components/GoodsReceiptWorkflow.jsx` (Import + Label-Preview + printLabel)
      - `/app/frontend/src/components/AssetManagementV2.jsx` (Import + Label-Preview + printLabel)
    - **Lucide-Icon Konflikt**: `Barcode` Icon in GoodsReceiptWorkflow.jsx zu `BarcodeIcon` umbenannt
    - **Test-Status**: ✅ 100% (Testing Agent verifiziert)

25. **CRUD-Funktionalität im globalen Suche-Modal (NEW FEATURE - 2025-02-17)**
    - **Feature**: Admin kann Asset-Daten direkt im Modal bearbeiten und speichern.
    - **Funktionalität**:
      - "Bearbeiten"-Button oben rechts im Modal
      - Editierbare Felder: Hersteller, Modell, IMEI, MAC-Adresse, Kaufdatum, Kaufpreis, Lieferant, Garantie bis, Notizen
      - "Speichern" und "Abbrechen" Buttons im Edit-Modus
      - Label-Vorschau wird durch Notizen-Feld im Edit-Modus ersetzt
    - **Nicht editierbare Felder** (Identifikation): Lager-ID, Asset-ID, Seriennummer, Status
    - **Backend-Endpoint**: `PUT /api/asset-mgmt/assets/update-by-identifier?identifier=...`
    - **Dateien**:
      - `/app/frontend/src/pages/AdminPortal.jsx` (State, Funktionen, Modal UI)
    - **Test-Status**: ✅ Manuell verifiziert (Speichern + Laden der Änderungen funktioniert)

---

### Session: 2025-02-16

#### Bug Fixes
20. **Asset-Detail-Modal öffnet sich nicht (BUG FIX - 2025-02-16)**
    - **Problem**: Beim Klicken auf Assets in der Assets-Tabelle öffnete sich kein Detail-Modal
    - **Root Cause**: `openDetailModal('asset', asset.asset_id)` funktionierte nicht für Assets mit `asset_id: null`
    - **Lösung**: 
      1. Neuer Backend-Endpoint `/api/asset-mgmt/assets/search-detail?q=<identifier>` erstellt
      2. Endpoint sucht nach `warehouse_asset_id`, `manufacturer_sn`, `imei`, `mac`, oder `asset_id`
      3. Frontend verwendet jetzt Fallback: `asset.asset_id || asset.warehouse_asset_id || asset.manufacturer_sn`
    - **Dateien**: 
      - `/app/backend/routes/asset_management_v2.py` (neuer Endpoint)
      - `/app/frontend/src/components/AssetManagementV2.jsx` (openDetailModal geändert)
    - **Test-Status**: ✅ Manuell getestet

#### New Features
21. **Scan-to-Detail Feature & Asset-Detail-Modal für Wareneingang (NEW FEATURE - 2025-02-16)**
    - **Feature**: Komplettes Asset-Detail-Modal mit allen Informationen, Historie UND BEARBEITUNGSFUNKTION
    - **Funktionen**:
      - Klicken auf Asset-Zeile öffnet Detail-Modal
      - Suchfeld akzeptiert Lager-ID / Seriennummer / IMEI (Scan-to-Detail)
      - Bei Enter-Taste wird direkt das Detail-Modal geöffnet
      - **NEU:** "Bearbeiten" Button im Modal öffnet Edit-Modus
      - **NEU:** Editierbare Felder: Hersteller, Modell, IMEI, MAC, Kaufdatum, Kaufpreis, Lieferant, Garantie bis, Garantie-Art, Notizen
      - **NEU:** Änderungen werden mit Historie-Eintrag gespeichert
    - **Details angezeigt**:
      - Identifikation (Lager-ID, Asset-ID, Seriennummer, Status) - nur Anzeige
      - Produkt (Typ, Hersteller, Modell, IMEI, MAC) - editierbar
      - Kaufdaten & Garantie - editierbar
      - Wareneingang (Datum, Empfänger, Lieferschein) - nur Anzeige
      - Notizen - editierbar
      - Historie (Timeline aller Ereignisse inkl. Updates) - nur Anzeige
    - **Backend-Endpoints**:
      - `GET /api/asset-mgmt/assets/search-detail?q=<id>` - Suche nach Asset
      - `PUT /api/asset-mgmt/assets/update-by-identifier?identifier=<id>` - Update Asset
    - **Dateien**:
      - `/app/frontend/src/components/GoodsReceiptWorkflow.jsx` (Modal + Edit-Modus)
      - `/app/backend/routes/asset_management_v2.py` (search-detail + update-by-identifier Endpoints)
    - **Test-Status**: ✅ API-Tests + Screenshots bestanden

19. **Asset erscheint nicht in "Nicht zugewiesen"-Liste (BUG FIX - 2025-02-16)**
    - **Problem**: "gescannte Lager-ID erscheint nicht bei 'Nicht zugewiesen' - ganzer datensatz fehlt" - Neu erstellte Assets erschienen nicht sofort in der Unassigned-Liste
    - **Root Cause**: Frontend `GoodsReceiptWorkflow.jsx` rief `fetchUnassignedAssets()` nicht nach erfolgreicher Asset-Erstellung auf
    - **Lösung**: 
      1. `fetchUnassignedAssets()` wird jetzt nach `submitIntake()` aufgerufen (Zeile 537)
      2. `fetchUnassignedAssets()` wird jetzt nach `submitBulkIntake()` aufgerufen (Zeile 437)
      3. `receivedBy` wird nicht mehr geleert, da es mit dem eingeloggten User auto-befüllt wird
      4. Initial `useEffect` lädt jetzt unassigned count unabhängig vom aktiven Tab
    - **Dateien**: `/app/frontend/src/components/GoodsReceiptWorkflow.jsx`
    - **Test-Status**: ✅ 100% (8/8 Backend + Frontend UI Tests)

#### New Features
18. **Asset-ID Konfiguration Admin-UI (NEW FEATURE - IMPLEMENTED 2025-02-16)**
    - **Feature**: Vollständiges Admin-UI zur Konfiguration der automatischen Asset-ID-Generierung
    - **Zugang**: Settings → System → Asset-ID Konfig
    - **UI-Komponente**: `/app/frontend/src/components/AssetIdConfigManager.jsx`
    - **3 Tabs**:
      - **Präfix**: Lager-ID Präfix ändern (z.B. "TSRID")
      - **Zähler**: Zeigt alle Sequenz-Zähler pro Gerätetyp mit "Anpassen"-Button
      - **Formate**: Zeigt alle ID-Formate nach Gerätetyp mit Lager-ID und Standort-ID Beispielen
    - **Backend-Endpoints**:
      - `GET /api/asset-mgmt/asset-id-config` - Konfiguration abrufen
      - `PUT /api/asset-mgmt/asset-id-config` - Präfix aktualisieren
      - `GET /api/asset-mgmt/asset-id-config/next-id` - Nächste ID für Typ abrufen
      - `POST /api/asset-mgmt/asset-id-config/reset-counter` - Zähler-Info mit Warnung
    - **Wichtig**: Zähler werden automatisch aus existierenden Assets berechnet (kein separater Counter)
    - **Test-Status**: ✅ 100% (9/9 Backend + Frontend)

---

### Session: 2025-02-15

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

10. **Asset Type Split: TSRID Tablet i5/i7 (COMPLETED 2025-02-15)**
    - Alten Asset-Typ `tab_tsr` (TSRID Tablet) aufgeteilt in:
      - `tab_tsr_i5` (TSRID Tablet i5)
      - `tab_tsr_i7` (TSRID Tablet i7)
    - Kit-Templates in DB aktualisiert um neue Typen zu nutzen

11. **Wareneingang IMEI/MAC Felder (COMPLETED 2025-02-15)**
    - Neue Eingabefelder für IMEI und MAC-Adresse im Wareneingang-Formular
    - Werte werden in der Intake-Liste angezeigt
    - Backend unterstützt bereits die Speicherung dieser Werte

12. **Barcode-Scanner Bug Fix (FIXED 2025-02-15)**
    - **Problem**: Barcode-Scanner sendet automatisch "Enter" nach dem Scannen, was das Formular sofort abschickte. Benutzer konnte keine IMEI/MAC eingeben.
    - **Lösung**: Enter-Taste verschiebt jetzt den Fokus zum nächsten Feld statt sofort hinzuzufügen
    - **Workflow**: SN + Enter → IMEI → Enter → MAC → Enter → Eintrag hinzufügen
    - **Dateien**: `/app/frontend/src/components/GoodsReceiptWorkflow.jsx`
      - `handleSNKeyDown()`: Fokus zu IMEI
      - `handleIMEIKeyDown()`: Fokus zu MAC  
      - `handleMACKeyDown()`: addIntakeItem()
    - **Test-Status**: ✅ Alle 5 Tests bestanden (100%)

13. **Löschen nicht zugewiesener Geräte (COMPLETED 2025-02-15)**
    - **Feature**: Nicht zugewiesene Geräte können jetzt gelöscht werden
    - **UI**: Roter Mülleimer-Button in jeder Zeile + Bulk-Löschen bei Mehrfachauswahl
    - **Modal**: Bestätigungs-Dialog mit Geräte-Details vor dem Löschen
    - **Backend**: 
      - `DELETE /api/asset-mgmt/inventory/unassigned/{sn}` - Einzelnes Gerät
      - `DELETE /api/asset-mgmt/inventory/unassigned/bulk` - Mehrere Geräte
    - **Test-Status**: ✅ Funktioniert

14. **Lieferant-Dropdown im Wareneingang (COMPLETED 2025-02-15)**
    - **Feature**: Lieferant ist jetzt ein Dropdown statt freies Textfeld
    - **Backend**: `GET /api/asset-mgmt/suppliers` - Kombiniert Default-Lieferanten + DB-Werte
    - **UI**: Select-Komponente mit allen verfügbaren Lieferanten
    - **Lieferanten**: Apple, Bechtle AG, Brother, Dell, Desko, HP, Lenovo, Microsoft, Regula, Samsung, TSRID GmbH, etc.
    - **Test-Status**: ✅ Funktioniert

15. **Lieferanten & Hersteller Management (COMPLETED 2025-02-15)**
    - **Feature**: Vollständiges CRUD für Lieferanten und Produkte
    - **Navigation**: Neuer "Lieferanten" Tab in der Haupt-Navigation
    - **UI Komponente**: `/app/frontend/src/components/SupplierManagement.jsx`
    - **Lieferanten-Felder**:
      - Name (Pflicht)
      - Typ (Lieferant/Hersteller/Distributor)
      - Adresse (Straße, PLZ, Stadt, Land)
      - Kontakt (Telefon, E-Mail, Website)
      - Kundennummer, USt-IdNr.
      - Ansprechpartner (mehrere möglich)
      - Notizen
    - **Produkte-Felder**:
      - Name, SKU, Hersteller-SKU
      - Kategorie, Asset-Typ-Verknüpfung
      - Preis (Netto), Währung
      - Beschreibung, Notizen
    - **Backend-Endpoints**:
      - `GET/POST /api/asset-mgmt/suppliers` - Liste & Anlegen
      - `GET/PUT/DELETE /api/asset-mgmt/suppliers/{id}` - Details, Bearbeiten, Löschen
      - `GET/POST /api/asset-mgmt/products` - Liste & Anlegen
      - `GET/PUT/DELETE /api/asset-mgmt/products/{id}` - Details, Bearbeiten, Löschen
    - **Quick-Add**: "+ Neuer Lieferant..." Option im Wareneingang-Dropdown
    - **Test-Status**: ✅ Funktioniert

16. **Produkte-Tab Schwarzer Bildschirm Bug (FIXED 2025-02-15)**
    - **Problem**: Beim Klicken auf den "Produkte"-Tab in der Lieferanten-Verwaltung erschien ein schwarzer Bildschirm
    - **Root Cause 1**: `SelectItem` mit `value=""` (leerer String) - Radix UI erlaubt keine leeren Strings
    - **Root Cause 2**: Backend `distinct()` in `list_products` wurde nicht korrekt awaited
    - **Root Cause 3**: HTML Nesting-Fehler - `<Badge>` (div) in `<p>` Element
    - **Lösung**:
      1. SelectItem `value=""` zu `value="all"` bzw. `value="none"` geändert (2 Stellen)
      2. Backend `categories_cursor = db.products.distinct()` zu `categories = await db.products.distinct()` korrigiert
      3. `<p>Typ: <Badge>...</Badge></p>` zu `<div>...<Badge>...</Badge></div>` geändert
    - **Dateien**:
      - `/app/frontend/src/components/SupplierManagement.jsx` (Zeilen 673-683, 1073-1086, 610-613)
      - `/app/backend/routes/asset_management_v2.py` (Zeile 3779-3780)
    - **Test-Status**: ✅ Verifiziert mit Testing Agent (100% Backend + Frontend)

17. **Automatische Asset-ID Generierung (NEW FEATURE - IMPLEMENTED 2025-02-15)**
    - **Feature**: Automatische fortlaufende Asset-IDs im Wareneingang
    - **Phase 1 - Lager-ID**:
      - Format: `{PREFIX}-{TYP}-{SEQ:04d}` (z.B. TSRID-TAB-i7-0001)
      - Präfix konfigurierbar pro Tenant (Standard: "TSRID")
      - Automatische Sequenz-Generierung pro Gerätetyp
    - **Phase 2 - Location-ID**:
      - Format: `{LOC}-{SEQ:02d}-{TYP}` (z.B. STRT01-01-TAB-i7)
      - Bei Location-Zuweisung wird Lager-ID zu Location-ID umbenannt
      - Bei Entfernung von Location wird ursprüngliche Lager-ID wiederhergestellt
    - **UI-Features**:
      - Grünes Banner zeigt nächste Asset-ID an
      - Vorschau der Location-ID nach Zuweisung
      - Bulk-Button für Mehrfach-Erstellung
      - Bulk-Modal mit Anzahl-Eingabe und ID-Vorschau
    - **Backend-Endpoints**:
      - `GET /api/asset-mgmt/asset-id-config` - Konfiguration abrufen
      - `PUT /api/asset-mgmt/asset-id-config` - Konfiguration aktualisieren
      - `GET /api/asset-mgmt/asset-id-config/next-id?asset_type=X` - Nächste ID abrufen
      - `POST /api/asset-mgmt/inventory/intake-with-auto-id` - Einzelnes Gerät mit Auto-ID
      - `POST /api/asset-mgmt/inventory/intake-bulk` - Mehrere Geräte auf einmal erstellen
      - `POST /api/asset-mgmt/inventory/assign-to-location/{sn}` - Location zuweisen
      - `POST /api/asset-mgmt/inventory/remove-from-location/{sn}` - Von Location entfernen
    - **Dateien**:
      - `/app/backend/routes/asset_management_v2.py` (Neue Endpoints ab Zeile 3540)
      - `/app/frontend/src/components/GoodsReceiptWorkflow.jsx` (UI-Änderungen)
    - **Test-Status**: ✅ 16/16 Backend-Tests + Frontend verifiziert

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
- [x] **Label-Verbesserungen: Asset-ID einzeilig + Seriennummer-Barcode** - **DONE 2025-02-17**

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

### Pending Issues
1. **P1 - Seriennummer-Scanning funktioniert nicht in Wareneingang** - NOT STARTED
2. **P2 - Datenmigration bestehender "TSRID Tablet" Assets zu i5/i7 Typen** - NOT STARTED (benötigt User-Input für Mapping)
3. **P3 - Duplikate Legacy-Router für Kit-Templates** - NOT STARTED
4. **P4 - Drucker-Unterstützung in Electron App** - RECURRING (5+ mal versucht)

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
