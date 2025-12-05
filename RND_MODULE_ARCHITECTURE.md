# R&D Modul-Architektur & Migrations-Leitfaden

## Zweck von R&D
R&D dient als **Entwicklungs- und Testumgebung** für neue Features. Nach erfolgreichen Tests werden Module ins Hauptportal (TSRID Admin Portal) integriert oder als separate, verknüpfte Module deployed.

## Architektur-Prinzipien für R&D-Module

### 1. **Modularität**
- Jedes Modul ist eine **in sich geschlossene Einheit**
- Keine Hard-Dependencies zu anderen R&D-Modulen
- Klare API-Schnittstellen

### 2. **Unabhängigkeit**
- Separate Backend-Router
- Standalone Frontend-Komponenten
- Eigene Datenmodelle
- Eigene Mock-Daten-Generatoren

### 3. **Migrierbarkeit**
- Dokumentierte Schnittstellen
- Klare Verzeichnisstruktur
- Minimale Abhängigkeiten
- Testbare Endpunkte

---

## Aktuelle R&D-Module (Stand: Dezember 2024)

### ✅ **Produktions-reife Module**

#### 1. **Placetel Telephonie-Integration**
- **Status:** ✅ Vollständig implementiert & getestet
- **Backend:** `/app/backend/routes/placetel.py`, `placetel_webhooks.py`
- **Frontend:** `/app/frontend/src/components/PlacetelManagement.jsx`
- **Features:**
  - Rufnummern-Verwaltung (1100+ Nummern)
  - SIP-User-Verwaltung
  - Echtzeit-Webhook-Integration
  - Kontakt-CRUD (Create, Read, Update, Delete)
  - Call Center Management
- **3rd-Party APIs:** Placetel API v2
- **Datenbank:** Keine eigene DB (API-basiert)
- **Migrations-Komplexität:** 🟢 Niedrig
- **Empfehlung:** Sofort ins Hauptportal übernehmen

#### 2. **Hardware Asset Management**
- **Status:** ✅ Implementiert & stabil
- **Backend:** `/app/backend/routes/hardware.py`, `hardware_import.py`
- **Frontend:** `/app/frontend/src/components/HardwareSetsManagement.jsx`
- **Features:**
  - Hardware-Sets Verwaltung
  - Geräte-Tracking
  - Standort-Zuordnung
  - Global-Search
- **Datenbank:** MongoDB Collections: `hardware_sets`, `hardware_devices`
- **Migrations-Komplexität:** 🟡 Mittel (DB-Migration erforderlich)
- **Empfehlung:** Nach User-Testing übernehmen

### 🚧 **In Entwicklung**

#### 3. **Flottenmanagement (Autovermietung)**
- **Status:** 🚧 Backend fertig, Frontend in Arbeit
- **Backend:** `/app/backend/routes/fleet_management.py`
- **Frontend:** `/app/frontend/src/components/FleetManagement.jsx`
- **Features:**
  - Miet-Lifecycle-Management
  - Schadensdokumentation
  - km-Limit-System
  - Standort-basierte Verwaltung
  - Mock-Daten-Generator
- **Datenbank:** In-Memory (Mock) → später MongoDB
- **3rd-Party APIs:** Geplant: DKV Tankkarten, GPS-Provider
- **Migrations-Komplexität:** 🟡 Mittel
- **Empfehlung:** Nach Phase 1-4 Fertigstellung übernehmen
- **TODOs vor Migration:**
  - [ ] Frontend vervollständigen
  - [ ] Echtzeit-GPS-Integration
  - [ ] DKV-API Integration
  - [ ] Persistente Datenspeicherung (MongoDB)
  - [ ] Testing-Agent Volltest

#### 4. **Standorte-Verwaltung (Locations)**
- **Status:** ✅ Implementiert
- **Backend:** Integriert in Hardware-Routen
- **Frontend:** `/app/frontend/src/components/AllLocationsTab.jsx`
- **Features:**
  - Online/Offline-Filter
  - Sortierung nach Status
  - Standort-Suche
- **Migrations-Komplexität:** 🟢 Niedrig
- **Empfehlung:** Mit Hardware-Modul übernehmen

### 🔬 **Experimentell / Proof-of-Concept**

#### 5. **Europcar PKW-Vermietung**
- **Status:** 🔬 PoC
- **Backend:** `/app/backend/routes/europcar_api.py`
- **Frontend:** `/app/frontend/src/components/EuropcarManagement.jsx`
- **Empfehlung:** Evaluierung nach PoC-Phase

#### 6. **Document Scan (Regula)**
- **Status:** 🔬 PoC - BLOCKIERT (Hardware-abhängig)
- **Empfehlung:** Nicht übernehmen bis Hardware verfügbar

#### 7. **Time Tracking**
- **Status:** 🔬 Mockup
- **Empfehlung:** Evaluierung ausstehend

---

## Migrations-Checkliste für R&D → Hauptportal

### Phase 1: Vorbereitung (R&D)
- [ ] **Vollständige Tests** mit Testing-Agent
- [ ] **Dokumentation** der API-Endpoints
- [ ] **Mock-Daten entfernen** oder kennzeichnen
- [ ] **Environment-Variablen** dokumentieren
- [ ] **3rd-Party-API-Keys** erfassen
- [ ] **Datenbank-Schema** dokumentieren (falls vorhanden)

### Phase 2: Code-Review
- [ ] **Code-Qualität** prüfen (Linting)
- [ ] **Sicherheits-Review** (API-Keys, SQL-Injection, XSS)
- [ ] **Performance-Check** (API-Response-Zeiten)
- [ ] **Error-Handling** validieren
- [ ] **Abhängigkeiten** minimieren

### Phase 3: Backend-Migration
- [ ] Backend-Router aus `/app/backend/routes/` kopieren
- [ ] In `server.py` registrieren (falls noch nicht geschehen)
- [ ] API-Prefix beibehalten oder anpassen: `/api/[modul-name]/`
- [ ] Environment-Variablen in `.env` übertragen
- [ ] Datenbank-Migrationen ausführen (falls erforderlich)
- [ ] API-Endpoints testen

### Phase 4: Frontend-Migration
- [ ] Komponente aus `/app/frontend/src/components/` kopieren
- [ ] Aus R&D-Sidebar entfernen
- [ ] In Hauptmenü integrieren
- [ ] Routen in `AdminPortal.jsx` anpassen
- [ ] Design-Konsistenz prüfen (Theme, Icons, Layout)
- [ ] UI/UX-Tests

### Phase 5: Verknüpfung & Integration
- [ ] Daten-Verknüpfungen zu anderen Modulen herstellen
- [ ] Berechtigungen/Rollen konfigurieren
- [ ] Multi-Tenant-Support validieren
- [ ] Notifications/Webhooks integrieren

### Phase 6: Deployment & Monitoring
- [ ] Produktions-Environment-Variablen setzen
- [ ] Logging aktivieren
- [ ] Monitoring/Alerts konfigurieren
- [ ] User-Dokumentation erstellen
- [ ] Support-Team schulen

---

## Verzeichnisstruktur-Standard für R&D-Module

### Backend
```
/app/backend/routes/
├── [modul_name].py              # Haupt-Router
├── [modul_name]_webhooks.py     # Optional: Webhooks
├── [modul_name]_mock_data.py    # Optional: Mock-Daten-Generator
└── [modul_name]_utils.py        # Optional: Helper-Funktionen
```

**Naming Convention:**
- Lowercase mit Underscores
- Präfix mit Modulname
- Eindeutige, beschreibende Namen

### Frontend
```
/app/frontend/src/components/
├── [ModulName]Management.jsx    # Haupt-Komponente
├── [ModulName]Details.jsx       # Optional: Detail-Ansicht
└── [ModulName]Modal.jsx         # Optional: Modals
```

**Naming Convention:**
- PascalCase
- Suffix: Management, Details, Modal, etc.
- Selbsterklärend

### Datenbank (MongoDB)
```
Collections:
- [modul_name]_[entity]          # z.B. fleet_vehicles, fleet_rentals
```

**Naming Convention:**
- Lowercase mit Underscores
- Plural für Collections
- Modulname als Präfix (Namespace)

---

## API-Design-Standards

### URL-Struktur
```
/api/[modul-name]/[resource]
/api/[modul-name]/[resource]/{id}
/api/[modul-name]/[resource]/{id}/[sub-resource]
```

**Beispiele:**
```
GET    /api/fleet/vehicles
GET    /api/fleet/vehicles/{vehicle_id}
GET    /api/fleet/vehicles/{vehicle_id}/rental-history
POST   /api/fleet/rentals
PUT    /api/fleet/rentals/{rental_id}
DELETE /api/fleet/rentals/{rental_id}
```

### Response-Format (Standard)
```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "total": 123,           // Optional: Bei Listen
  "message": "...",       // Optional: Bei Erfolg
  "error": "..."          // Optional: Bei Fehler
}
```

### Error-Response (Standard)
```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error information",
  "status_code": 400
}
```

---

## Dependency-Management

### Backend-Dependencies
**Vor Migration prüfen:**
- Welche Packages sind spezifisch für dieses Modul?
- Sind sie bereits in `requirements.txt`?
- Gibt es Versions-Konflikte?

**Dokumentieren in Modul-README:**
```markdown
## Dependencies
- httpx >= 0.24.0 (für API-Calls)
- pydantic >= 2.0.0 (für Datenmodelle)
```

### Frontend-Dependencies
**Vor Migration prüfen:**
- Welche NPM-Packages sind spezifisch?
- Sind sie in `package.json`?
- Bundle-Size-Impact?

**Dokumentieren:**
```markdown
## Dependencies
- sonner (Toast-Notifications)
- lucide-react (Icons)
```

---

## Testing-Protokoll

### Vor Migration MUSS getestet sein:
1. **Unit-Tests:** Einzelne Funktionen
2. **Integration-Tests:** API-Endpoints
3. **E2E-Tests:** Vollständige User-Flows
4. **Performance-Tests:** Lasttests bei >1000 Einträgen
5. **Security-Tests:** Auth, XSS, SQL-Injection
6. **Browser-Tests:** Chrome, Firefox, Safari

### Testing-Tools
- Backend: pytest, curl, Testing-Agent
- Frontend: Playwright, Testing-Agent
- Performance: Apache Bench, Lighthouse

---

## Rollback-Plan

### Falls Migration fehlschlägt:
1. **Backend:** Router aus `server.py` entfernen
2. **Frontend:** Komponente deaktivieren
3. **Database:** Rollback-Script ausführen
4. **Logs:** Fehleranalyse durchführen
5. **R&D:** Modul zurück in R&D-Bereich

### Backup vor Migration:
- Database-Dump erstellen
- Git-Branch für Migration
- Rollback-Scripts vorbereiten

---

## Module-Lifecycle

```
R&D (Entwicklung)
    ↓
Testing (mit Testing-Agent)
    ↓
Code-Review
    ↓
Staging (Beta-Test mit ausgewählten Usern)
    ↓
Migrations-Entscheidung
    ├─→ Hauptportal-Integration
    ├─→ Separates Modul (mit API-Verknüpfung)
    └─→ Ablehnung (im R&D belassen / archivieren)
```

---

## Kontakt & Support

**Bei Fragen zur Migration:**
- Dokumentation lesen: `/app/RND_MODULE_ARCHITECTURE.md`
- Testing-Agent verwenden für E2E-Tests
- Code-Review durch Senior Dev

**Migrations-Verantwortlicher:** Development Lead
**Letzte Aktualisierung:** 2024-12-05

---

## Appendix: Modul-spezifische Migrations-Guides

### A. Placetel-Modul
- **API-Keys:** `PLACETEL_API_KEY` in `.env`
- **Webhook-Secret:** `PLACETEL_WEBHOOK_SECRET` in `.env`
- **Webhook-URL:** Muss in Placetel-Portal konfiguriert werden
- **SSE-Support:** Server-Sent Events für Live-Updates

### B. Flottenmanagement-Modul
- **Mock-Daten:** In-Memory, muss durch MongoDB ersetzt werden
- **Collections:** `fleet_vehicles`, `fleet_rentals`, `fleet_damages`, `fleet_fuel`
- **3rd-Party:** DKV-API-Integration vorbereitet aber nicht implementiert
- **GPS-Provider:** Noch nicht integriert

### C. Hardware-Asset-Management
- **Collections:** `hardware_sets`, `hardware_devices`
- **APIs:** `/api/tenant-locations`, `/api/tenant-devices` (für Auto-Sync)
- **Dependencies:** Keine externen APIs
- **Features:** Global Search, QR-Code-Generation geplant

---

*Dieses Dokument wird kontinuierlich aktualisiert.*
