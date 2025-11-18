# Implementierungsplan: Globale Tenant-Filterung im Admin Portal

## Ziel
Vollständige Tenant-Isolation implementieren, bei der alle Daten im Admin Portal nach dem ausgewählten Tenant gefiltert werden.

## Anforderungen
1. **Globales Tenant-State-Management**: React Context für selectedTenantId
2. **Bidirektionale Synchronisation**: Tenant-Menü ↔ CustomerSwitcher
3. **Tenant-Filterung überall**: Alle Tabs filtern nach gewähltem Tenant
4. **Superadmin-Modus**: "Alle Kunden" nur für admin@tsrid.com sichtbar
5. **Microservices tenant-aware**: Alle Services akzeptieren tenant_id Parameter

## Aktuelle Situation

### Frontend
- ✅ `AdminPortal.jsx` hat bereits 2 separate States (`selectedTenantId`, `selectedTenantIdForLocations`)
- ✅ `CustomerSwitcher.jsx` hat `onTenantChange` callback
- ✅ `AllLocationsTab.jsx` filtert bereits nach `selectedTenantId`
- ❌ Kein globaler Context vorhanden
- ❌ Andere Tabs filtern noch nicht nach Tenant
- ❌ Keine Synchronisation zwischen Tenant-Menü und CustomerSwitcher

### Backend
- ✅ 10 Microservices existieren (Ports 8100-8109)
- ❌ Microservices sind noch nicht tenant-aware (kein tenant_id Parameter)
- ❌ Keine Tenant-Filterung in den APIs

### Daten
- ✅ Tenant "Europcar" hat Locations-Daten
- ❌ Andere Bereiche haben noch keine Tenant-spezifischen Daten

## Implementierungsphasen

### **Phase 1: Globales Tenant-State-Management (React Context)**

#### 1.1 TenantContext erstellen
**Datei**: `/app/frontend/src/contexts/TenantContext.jsx`
- State: `selectedTenantId` (null = "Alle Kunden")
- State: `selectedTenantName`
- Funktion: `setSelectedTenant(id, name)`
- Provider um gesamte App wrappen

#### 1.2 Context in App integrieren
**Datei**: `/app/frontend/src/pages/PortalApp.jsx`
- TenantProvider um AdminPortal wrappen

#### 1.3 AdminPortal.jsx refactorn
- Entferne lokale States (`selectedTenantId`, `selectedTenantIdForLocations`)
- Nutze `useTenant()` Context Hook
- CustomerSwitcher mit `useTenant()` verbinden

### **Phase 2: Bidirektionale Synchronisation**

#### 2.1 CustomerSwitcher → TenantContext
**Datei**: `/app/frontend/src/components/CustomerSwitcher.jsx`
- Ersetze lokalen State mit `useTenant()` Hook
- `setSelectedTenant()` bei Auswahl aufrufen
- Entferne `onTenantChange` prop (nicht mehr nötig)

#### 2.2 Tenant-Menü → TenantContext
**Datei**: `/app/frontend/src/pages/TenantsPage.jsx`
- Bei Klick auf Tenant-Card: `setSelectedTenant()` aufrufen
- Gleichzeitig zur `TenantDetailPage` navigieren

#### 2.3 Superadmin-Check
**Datei**: `/app/frontend/src/contexts/TenantContext.jsx`
- `isSuperAdmin` State hinzufügen
- Check: `user.email === 'admin@tsrid.com'`
- "Alle Kunden" Option nur für Superadmin anzeigen

### **Phase 3: Backend - Microservices tenant-aware machen**

Für jeden Microservice:

#### 3.1 Device Service (Port 8104)
**Datei**: `/app/backend/services/device_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Alle GET-Endpoints: `?tenant_id=...` Query Parameter
- Alle POST-Endpoints: `tenant_id` in Request Body
- Filter in DB-Queries: `{"tenant_id": tenant_id}` wenn vorhanden

#### 3.2 Location Service (Port 8105)
**Datei**: `/app/backend/services/location_service/server.py`
- Bereits teilweise implementiert via `/api/tenant-locations/{tenant_id}`
- Überprüfen ob alle Endpoints tenant-aware sind

#### 3.3 Inventory Service (Port 8102)
**Datei**: `/app/backend/services/inventory_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.4 Order Service (Port 8106)
**Datei**: `/app/backend/services/order_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.5 Support/Ticketing Service (Port 8103)
**Datei**: `/app/backend/services/ticketing_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.6 Customer Service (Port 8107)
**Datei**: `/app/backend/services/customer_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.7 License Service (Port 8108)
**Datei**: `/app/backend/services/license_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.8 ID Verification Service (Port 8101)
**Datei**: `/app/backend/services/id_verification/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

#### 3.9 Settings Service (Port 8109)
**Datei**: `/app/backend/services/settings_service/server.py`
- Model erweitern: `tenant_id: Optional[str] = None`
- Endpoints anpassen

### **Phase 4: Frontend - Alle Tabs anpassen**

Für jedes Tab die tenant_id beim API-Call mitschicken:

#### 4.1 Dashboard
**Datei**: `/app/frontend/src/pages/AdminPortal.jsx`
- Stats-Berechnung: nur für gewählten Tenant
- Geräte-Liste: nur für gewählten Tenant
- API-Calls mit `?tenant_id=...` Parameter

#### 4.2 Users & Roles
**Datei**: `/app/frontend/src/pages/UsersRolesPage.jsx`
- User-Liste filtern nach tenant_id
- API: `/api/users?tenant_id=...`

#### 4.3 Devices
**Datei**: `/app/frontend/src/components/DeviceManagement.jsx`
- API-Calls mit tenant_id Parameter erweitern
- `/api/devices?tenant_id=...`

#### 4.4 Locations
**Datei**: `/app/frontend/src/components/AllLocationsTab.jsx`
- ✅ Bereits implementiert
- Nutzt bereits `selectedTenantId` prop

#### 4.5 Inventory
**Datei**: `/app/frontend/src/components/InventoryManagement.jsx`
- API-Calls mit tenant_id Parameter
- `/api/services/inventory/items?tenant_id=...`

#### 4.6 Orders
**Datei**: `/app/frontend/src/components/OrdersManagement.jsx`
- API-Calls mit tenant_id Parameter
- `/api/services/orders?tenant_id=...`

#### 4.7 Support
**Datei**: `/app/frontend/src/components/SupportManagement.jsx`
- API-Calls mit tenant_id Parameter
- `/api/services/tickets?tenant_id=...`

#### 4.8 Licenses
**Datei**: `/app/frontend/src/components/LicenseManagement.jsx`
- API-Calls mit tenant_id Parameter

#### 4.9 ID-Checks
- Platzhalter-Komponente anpassen

#### 4.10 Settings
**Datei**: `/app/frontend/src/components/BrandingSettings.jsx` etc.
- Tenant-spezifische Einstellungen
- API-Calls mit tenant_id Parameter

### **Phase 5: Testing & Validation**

#### 5.1 Backend Testing
- Jeder Microservice einzeln testen
- Mit und ohne tenant_id Parameter
- Sicherstellen, dass Filterung korrekt funktioniert

#### 5.2 Frontend Testing
- CustomerSwitcher testen
- Tenant-Menü → CustomerSwitcher Synchronisation
- Jedes Tab einzeln testen
- "Alle Kunden" vs. spezifischer Tenant

#### 5.3 End-to-End Testing
- Als Superadmin einloggen
- "Alle Kunden" auswählen → alle Daten sichtbar
- "Europcar" auswählen → nur Europcar-Daten
- Vom Tenant-Menü einen Tenant auswählen → CustomerSwitcher aktualisiert
- Vom CustomerSwitcher einen Tenant wählen → Dashboard zeigt nur diese Daten

## Reihenfolge der Implementierung

1. **Schritt 1**: TenantContext erstellen (Phase 1.1)
2. **Schritt 2**: Context in App integrieren (Phase 1.2)
3. **Schritt 3**: AdminPortal refactorn (Phase 1.3)
4. **Schritt 4**: CustomerSwitcher anpassen (Phase 2.1)
5. **Schritt 5**: Tenant-Menü anpassen (Phase 2.2)
6. **Schritt 6**: Superadmin-Check (Phase 2.3)
7. **Schritt 7**: Backend Microservices anpassen (Phase 3.1 - 3.9)
   - Parallel für alle Services
8. **Schritt 8**: Frontend Tabs anpassen (Phase 4.1 - 4.10)
   - Nacheinander, beginnend mit Dashboard
9. **Schritt 9**: Testing (Phase 5)

## Geschätzte Komplexität

- **Phase 1-2** (Frontend Context): ~2-3 Stunden
- **Phase 3** (Backend Microservices): ~4-6 Stunden (alle 9 Services)
- **Phase 4** (Frontend Tabs): ~3-4 Stunden
- **Phase 5** (Testing): ~2 Stunden

**Total**: ~11-15 Stunden reine Entwicklungszeit

## Risiken & Herausforderungen

1. **Daten-Migration**: Bestehende Daten haben noch kein `tenant_id` Feld
   - **Lösung**: Migration-Script um Europcar-Daten mit tenant_id zu versehen
   
2. **Breaking Changes**: Microservices ändern ihre API-Signatur
   - **Lösung**: Backward-compatible machen (`tenant_id` optional)
   
3. **Performance**: Viele API-Calls mit zusätzlichem Filter
   - **Lösung**: MongoDB Indizes auf `tenant_id` setzen

4. **Komplexität**: Viele Dateien müssen angepasst werden
   - **Lösung**: Schrittweise vorgehen, nach jedem Schritt testen

## Nächste Schritte

1. User-Bestätigung für diesen Plan einholen
2. Mit Phase 1 beginnen (TenantContext)
3. Nach jeder Phase kurz testen
4. Bei Problemen troubleshoot_agent nutzen
