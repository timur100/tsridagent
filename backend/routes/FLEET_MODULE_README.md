# Flottenmanagement-Modul (Autovermietung)

## Status
🚧 **In Entwicklung** - Backend fertig, Frontend 70% complete

## Übersicht
Umfassendes Flottenmanagement-System spezialisiert auf **Autovermietung** (Europcar-spezifisch). 

## Features

### ✅ Implementiert (Backend)
- **Miet-Lifecycle-Management:** Vollständige Historie jedes Fahrzeugs
- **Standort-Management:** Mehrere Standorte pro Stadt
- **km-Limit-System:** Automatische Warnungen bei 90% Auslastung
- **Schadensdokumentation:** Vor- und Rückgabe-Schäden
- **Mock-Daten-Generator:** Realistische Test-Daten
- **Standort-basierte Filterung:** Statistiken pro Standort

### 🚧 In Arbeit (Frontend)
- Miet-Historie-Ansicht
- Schadensmeldungen-Tab
- km-Limit-Warnungen prominent
- Standort-Dropdown mit Adressen

### 📋 Geplant (Phase 2-4)
- Echtzeit-GPS-Tracking mit Karte
- Routenplanung & Optimierung
- Fahrer-Verhalten-Analyse
- DKV Tankkarten-Integration
- Wartungs-Workflows
- TCO-Analysen

## Architektur

### Backend-Dateien
```
/app/backend/routes/
└── fleet_management.py          # Haupt-Router (950 Zeilen)
```

### Frontend-Dateien
```
/app/frontend/src/components/
└── FleetManagement.jsx          # Haupt-Komponente (700 Zeilen)
```

### Datenbank
**Aktuell:** In-Memory Mock-Daten (Dictionary)
**Geplant:** MongoDB Collections

Geplante Collections:
```
- fleet_vehicles
- fleet_rentals
- fleet_damages
- fleet_fuel_records
- fleet_locations
```

## API-Endpoints

### Locations
```
GET /api/fleet/{tenant_id}/locations
```
Liefert alle Standorte mit Fahrzeugzahlen

### Vehicles
```
GET /api/fleet/{tenant_id}/vehicles
    ?location={location_id}           # Filter nach Standort
    &status={available|rented|...}    # Filter nach Status
    &km_limit_warning=true            # Nur Fahrzeuge nahe Austausch
```

### Rentals (Mietvorgänge)
```
GET /api/fleet/{tenant_id}/rentals
    ?location={location_id}
    &vehicle_id={vehicle_id}
    &status={active|completed}

GET /api/fleet/{tenant_id}/vehicle/{vehicle_id}/rental-history
```
Lifecycle: Komplette Miet-Historie eines Fahrzeugs

### Damages (Schäden)
```
GET /api/fleet/{tenant_id}/damages
    ?location={location_id}
    &vehicle_id={vehicle_id}
    &severity={minor|moderate|severe}
```

### Fuel Records
```
GET /api/fleet/{tenant_id}/fuel
    ?location={location_id}
    &vehicle_id={vehicle_id}
    &suspicious_only=true
```

### Statistics
```
GET /api/fleet/{tenant_id}/statistics
    ?location={location_id|all}
```
Liefert aggregierte Statistiken

### Mock-Daten-Verwaltung
```
POST   /api/fleet/{tenant_id}/regenerate    # Neu generieren
DELETE /api/fleet/{tenant_id}/reset         # Löschen (für echte Daten)
```

## Datenmodelle

### Vehicle (Fahrzeug)
```json
{
  "vehicle_id": "VEH-tenant-EC0001",
  "license_plate": "HH-EC-1234",
  "type": "Kompaktklasse",
  "model": "VW Golf",
  "year": 2023,
  "status": "available|rented|maintenance|cleaning",
  "home_location": {
    "location_id": "hamburg-airport",
    "name": "Hamburg Flughafen",
    "city": "Hamburg",
    "address": "Flughafenstraße, 22335 Hamburg"
  },
  "current_location": { ... },
  "odometer": 45000,
  "initial_odometer": 5000,
  "km_limit": 120000,
  "km_until_limit": 75000,
  "km_limit_percentage": 37.5,
  "fuel_level": 85,
  "current_rental": { ... } | null,
  "total_rentals": 150
}
```

### Rental (Mietvorgang)
```json
{
  "rental_id": "RENT-xxx",
  "vehicle_id": "VEH-xxx",
  "customer_name": "Michael Schneider",
  "customer_id": "CUST-12345",
  "booking_reference": "EC123456",
  "pickup_time": "2024-11-20T10:00:00",
  "return_time": "2024-11-25T15:00:00",
  "rental_days": 5,
  "pickup_location": { ... },
  "return_location": { ... },
  "pickup_odometer": 44500,
  "return_odometer": 45100,
  "km_driven": 600,
  "pickup_fuel_level": 95,
  "return_fuel_level": 45,
  "status": "active|completed",
  "daily_rate": 65.00,
  "total_cost": 325.00,
  "has_damage": false,
  "pre_existing_damages": 1,
  "insurance_type": "Vollkasko"
}
```

### Damage Report
```json
{
  "damage_id": "DMG-1234",
  "rental_id": "RENT-xxx",
  "vehicle_id": "VEH-xxx",
  "reported_at": "2024-11-25T15:30:00",
  "damage_type": "Kratzer an der Stoßstange",
  "severity": "minor|moderate|severe",
  "estimated_cost": 450.00,
  "reported_by": "Station Staff",
  "customer_liable": true,
  "insurance_claim": false,
  "repair_status": "pending|in_progress|completed"
}
```

## Dependencies

### Backend
```python
# Bereits in requirements.txt:
httpx >= 0.24.0          # Für zukünftige API-Calls (DKV, GPS)
fastapi >= 0.104.0
pydantic >= 2.0.0
pymongo >= 4.5.0         # Für MongoDB (wenn implementiert)
```

### Frontend
```json
{
  "sonner": "^1.x",           # Toast-Notifications
  "lucide-react": "^0.x",     # Icons
  "react": "^18.x"
}
```

## Environment-Variablen

### Aktuell keine erforderlich (Mock-Daten)

### Für Produktion geplant:
```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=verifica

# DKV Tankkarten-API (optional)
DKV_API_KEY=xxx
DKV_API_URL=https://api.dkv-euroservice.com

# GPS-Provider (optional)
GPS_PROVIDER=geotab|verizon|teltonika
GPS_API_KEY=xxx
```

## Migration zu MongoDB

### Schritt 1: Collections erstellen
```python
# In backend/db/init_fleet_collections.py
async def init_fleet_collections(db):
    await db.create_collection("fleet_vehicles")
    await db.create_collection("fleet_rentals")
    await db.create_collection("fleet_damages")
    await db.create_collection("fleet_fuel_records")
    
    # Indexes
    await db.fleet_vehicles.create_index([("tenant_id", 1), ("license_plate", 1)])
    await db.fleet_rentals.create_index([("vehicle_id", 1), ("pickup_time", -1)])
    await db.fleet_damages.create_index([("rental_id", 1)])
```

### Schritt 2: Mock-Daten-Store ersetzen
```python
# Von:
fleet_data_store = {}  # In-Memory

# Zu:
from db.database import get_database
db = get_database()
vehicles = await db.fleet_vehicles.find({"tenant_id": tenant_id}).to_list()
```

### Schritt 3: CRUD-Operationen implementieren
```python
# Create
await db.fleet_vehicles.insert_one(vehicle_data)

# Read
vehicles = await db.fleet_vehicles.find({"tenant_id": tenant_id}).to_list(1000)

# Update
await db.fleet_vehicles.update_one(
    {"vehicle_id": vehicle_id},
    {"$set": updates}
)

# Delete
await db.fleet_vehicles.delete_one({"vehicle_id": vehicle_id})
```

## Testing

### Backend-Tests (curl)
```bash
TOKEN="your-jwt-token"
TENANT="1d3653db-86cb-4dd1-9ef5-0236b116def8"

# Test Locations
curl "http://localhost:8001/api/fleet/$TENANT/locations" \
  -H "Authorization: Bearer $TOKEN"

# Test Vehicles
curl "http://localhost:8001/api/fleet/$TENANT/vehicles?location=hamburg-airport" \
  -H "Authorization: Bearer $TOKEN"

# Test Rentals
curl "http://localhost:8001/api/fleet/$TENANT/rentals?status=active" \
  -H "Authorization: Bearer $TOKEN"

# Test Statistics
curl "http://localhost:8001/api/fleet/$TENANT/statistics?location=all" \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend-Tests
Mit Testing-Agent:
```
Test Flottenmanagement Module:
1. Login as admin@tsrid.com
2. Select Europcar tenant
3. Navigate to R&D -> Flottenmanagement
4. Verify statistics cards load
5. Test location dropdown (select Hamburg)
6. Verify vehicles table updates
7. Test status filters (Verfügbar, Vermietet)
```

## Migration-Checkliste

### Vor Migration ins Hauptportal:
- [ ] Frontend vervollständigen (Miet-Historie, Schäden-Tab)
- [ ] MongoDB-Integration implementieren
- [ ] Mock-Daten-Generator entfernen
- [ ] Testing-Agent E2E-Tests (alle Flows)
- [ ] Performance-Tests (>1000 Fahrzeuge, >10000 Rentals)
- [ ] Security-Review (Auth, Input-Validation)
- [ ] API-Dokumentation (OpenAPI/Swagger)
- [ ] User-Dokumentation erstellen

### Migrations-Komplexität: 🟡 Mittel
- Backend ist produktions-bereit
- Frontend braucht noch Arbeit
- Datenbank-Migration erforderlich
- Keine kritischen 3rd-Party-Dependencies

### Geschätzte Migrations-Dauer: 3-5 Tage
- Tag 1: MongoDB-Integration
- Tag 2: Frontend-Fertigstellung
- Tag 3: Testing & Bugfixes
- Tag 4: Integration ins Hauptportal
- Tag 5: User-Testing & Refinement

## Bekannte Einschränkungen

### Aktuelle Einschränkungen:
1. **Mock-Daten:** Daten werden bei Server-Neustart gelöscht
2. **Keine Persistenz:** Änderungen werden nicht gespeichert
3. **GPS-Tracking:** Nur statische Mock-Positionen
4. **Tankkarten:** DKV-Integration vorbereitet aber nicht implementiert

### Geplante Verbesserungen:
1. Echtzeit-GPS mit Live-Karte (Leaflet/MapBox)
2. Automatische Routenplanung
3. KI-basierte Schadensschätzung (Bildanalyse)
4. Predictive Maintenance (ML-Modell)
5. Mobile App (React Native)

## Kontakt
**Modul-Verantwortlicher:** Development Team
**Letzte Aktualisierung:** 2024-12-05
**Status-Review:** Wöchentlich

---

*Für allgemeine Migrations-Guidelines siehe `/app/RND_MODULE_ARCHITECTURE.md`*
