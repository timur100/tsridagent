# TSRID Admin Portal - Product Requirements Document

## Original Problem Statement
Das Hauptziel des Benutzers ist die Etablierung einer "Single Source of Truth" durch Migration des gesamten Application Stacks auf einen gemeinsamen MongoDB Atlas Cluster.

### Initiale Anforderungen:
1. **Production Outage:** Behebung des `502 Bad Gateway` Fehlers auf dem Produktionsserver
2. **Datenungenauigkeit:** Das Admin-Dashboard zeigt falsche Zahlen (0) für Kunden, Geräte und Standorte
3. **Anwendungsinstabilität:** Die Anwendung stürzt häufig ab und zeigt einen schwarzen Bildschirm
4. **Feature Request - Monitoring:** System zur regelmäßigen Überprüfung der Kommunikation zwischen allen Anwendungen und Servern

## Was wurde implementiert

### 13. Januar 2025 - Session 2
- ✅ **MongoDB Atlas M10 Upgrade:** Cluster erfolgreich von Free auf M10 (dediziert) aktualisiert
- ✅ **FIX: Schwarzer Bildschirm - Locations Tab:** 
  - `tenant_locations.py`: Korrigiert, um bei `tenant_id: "all"` alle Standorte abzurufen
  - `AllLocationsTab.jsx`: Vereinfachte Logik für direkten API-Aufruf zu `/api/tenant-locations/all`
  - Ergebnis: 215 Standorte werden korrekt angezeigt
- ✅ **FIX: Schwarzer Bildschirm - Devices Tab:**
  - `portal_devices.py`: Komplett umgeschrieben, um MongoDB statt In-Memory-Dictionary zu verwenden
  - Ergebnis: 216 Geräte werden korrekt angezeigt (141 Online, 74 Offline)
- ✅ **FIX: Portal Users API:**
  - `portal_users.py`: Korrigiert, um `portal_db` statt `test_database` zu verwenden
  - Ergebnis: 3 Benutzer werden korrekt angezeigt

### Frühere Sessions
- ✅ Production Server wiederhergestellt (502 Bad Gateway behoben)
- ✅ Dashboard-Statistiken korrigiert (Kunden: 2, Standorte: 207, Geräte: 29)
- ✅ System Monitoring Endpoint implementiert (`/api/monitor/comprehensive`)
- ✅ Health Dashboard UI verbessert

## Aktuelle API-Statistiken
| API Endpoint | Status | Daten |
|--------------|--------|-------|
| `/api/tenants/stats` | ✅ | Kunden: 2, Standorte: 207, Geräte: 29 |
| `/api/tenant-locations/all` | ✅ | 215 Standorte |
| `/api/tenant-devices/all/devices` | ✅ | 216 Geräte (141 Online, 74 Offline) |
| `/api/portal/devices/list` | ✅ | 431 Geräte |
| `/api/portal/users/list` | ✅ | 3 Benutzer |

## Priorisierter Backlog

### P0 - Kritisch (Abgeschlossen)
- [x] Schwarzer Bildschirm beheben - Locations Tab
- [x] Schwarzer Bildschirm beheben - Devices Tab
- [x] MongoDB Atlas Upgrade (Free → M10)

### P1 - Wichtig
- [ ] Vollständige Migration zur "Single Source of Truth" (devices.py, fleet_management.py)
- [ ] SSH Terminal Fenster vergrößern

### P2 - Mittel
- [ ] Produktions-Deployment-Workflow stabilisieren
- [ ] Hetzner Server via SSH konfigurieren

### P3 - Niedrig
- [ ] Electron App Drucker-Support debuggen
- [ ] Barcode Scanner Integration
- [ ] Webcam für Asset-Fotos

## Architektur

### Backend Routes (Geändert)
- `/app/backend/routes/portal_devices.py` - Neu: MongoDB-basiert
- `/app/backend/routes/portal_users.py` - Korrigiert: Richtige Datenbank
- `/app/backend/routes/tenant_locations.py` - Korrigiert: "all" Support
- `/app/backend/routes/missing_endpoints.py` - Neue fehlende APIs

### Frontend Komponenten (Geändert)
- `/app/frontend/src/components/AllLocationsTab.jsx` - Vereinfachte Logik

### MongoDB Datenbanken
- `tsrid_db`: Tenants, Users, Locations
- `multi_tenant_admin`: Devices, Europcar Devices
- `portal_db`: Portal Users, Tenant Locations

## Credentials
- **Admin Login:** admin@tsrid.com / admin123
- **Portal URL:** `/portal/admin`
