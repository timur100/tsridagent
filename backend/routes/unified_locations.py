"""
Unified Locations API - Single Point of Truth
Konsolidiert alle Standortdaten aus verschiedenen Collections in Atlas
und synchronisiert sie mit dem Agent (SQLite)
Unterstützt Multi-Tenant-Filterung
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid

# Load .env
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/api/unified-locations", tags=["Unified Locations"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
# Multi-tenant database for devices
multi_tenant_db = client['multi_tenant_admin']


class LocationCreate(BaseModel):
    station_code: str
    name: str
    street: Optional[str] = ""
    zip: Optional[str] = ""
    city: str
    state: Optional[str] = ""
    country: str = "Germany"
    continent: Optional[str] = "Europe"
    phone: Optional[str] = ""
    email: Optional[str] = ""
    tvid: Optional[str] = ""
    sn_station: Optional[str] = ""
    sn_scanner: Optional[str] = ""


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tvid: Optional[str] = None
    sn_station: Optional[str] = None
    sn_scanner: Optional[str] = None


def normalize_location(doc: dict, source: str = "unified") -> dict:
    """Normalisiert Standortdaten aus verschiedenen Quellen in ein einheitliches Format"""
    return {
        "station_code": doc.get("station_code") or doc.get("stationCode") or doc.get("locationCode") or doc.get("location_id") or doc.get("id", ""),
        "name": doc.get("name") or doc.get("locationName") or "",
        "street": doc.get("street") or doc.get("address") or doc.get("adresse") or "",
        "zip": doc.get("zip") or doc.get("plz") or "",
        "city": doc.get("city") or doc.get("stadt") or "",
        "state": doc.get("state") or doc.get("bundesland") or "",
        "country": doc.get("country") or doc.get("land") or "Germany",
        "continent": doc.get("continent") or "Europe",
        "phone": doc.get("phone") or doc.get("telefon") or "",
        "email": doc.get("email") or "",
        "tvid": doc.get("tvid") or doc.get("teamviewer_id") or "",
        "sn_station": doc.get("sn_station") or doc.get("snStation") or "",
        "sn_scanner": doc.get("sn_scanner") or doc.get("snScanner") or "",
        "latitude": doc.get("latitude") or doc.get("lat"),
        "longitude": doc.get("longitude") or doc.get("lng"),
        "tenant_id": doc.get("tenant_id") or "",
        "source": source,
        "updated_at": doc.get("updated_at") or datetime.now(timezone.utc).isoformat()
    }


# =====================
# HIERARCHISCHE LOCATION ENDPOINTS
# =====================

@router.get("/countries")
async def get_countries():
    """Holt alle verfügbaren Länder aus den Geräte-Daten"""
    try:
        # Aus europcar_devices in multi_tenant_admin
        countries = await multi_tenant_db.europcar_devices.distinct("country")
        # Filtere leere Werte und normalisiere
        countries = [c for c in countries if c]
        countries = list(set([c.title() if c.isupper() else c for c in countries]))
        countries.sort()
        
        return {
            "success": True,
            "countries": countries,
            "total": len(countries)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cities")
async def get_cities(country: str = Query(..., description="Land")):
    """Holt alle Städte für ein bestimmtes Land"""
    try:
        # Suche case-insensitive
        cities = await multi_tenant_db.europcar_devices.distinct(
            "city",
            {"country": {"$regex": f"^{country}$", "$options": "i"}}
        )
        cities = [c for c in cities if c]
        cities.sort()
        
        return {
            "success": True,
            "cities": cities,
            "total": len(cities),
            "country": country
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-city")
async def get_locations_by_city(
    city: str = Query(..., description="Stadt"),
    country: str = Query(None, description="Land (optional)")
):
    """Holt alle Standorte in einer bestimmten Stadt"""
    try:
        query = {"city": {"$regex": f"^{city}$", "$options": "i"}}
        if country:
            query["country"] = {"$regex": f"^{country}$", "$options": "i"}
        
        # Gruppiere nach locationcode um eindeutige Standorte zu bekommen
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$locationcode",
                "station_code": {"$first": "$locationcode"},
                "name": {"$first": {"$concat": ["$customer", " ", "$locationcode"]}},
                "city": {"$first": "$city"},
                "country": {"$first": "$country"},
                "street": {"$first": "$street"},
                "zip": {"$first": "$plz"},
                "customer": {"$first": "$customer"},
                "device_count": {"$sum": 1}
            }},
            {"$sort": {"station_code": 1}}
        ]
        
        cursor = multi_tenant_db.europcar_devices.aggregate(pipeline)
        locations = await cursor.to_list(length=500)
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations),
            "city": city
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices")
async def get_devices_at_location(
    location_code: str = Query(..., description="Standort-Code (locationcode)")
):
    """Holt alle Geräte an einem bestimmten Standort"""
    try:
        cursor = multi_tenant_db.europcar_devices.find(
            {"locationcode": {"$regex": f"^{location_code}$", "$options": "i"}},
            {"_id": 0}
        )
        devices = await cursor.to_list(length=100)
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices),
            "location_code": location_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenants")
async def get_all_tenants(
    level: Optional[str] = Query(None, description="Filter by tenant_level (e.g., 'station', 'country', 'continent')"),
    parent_id: Optional[str] = Query(None, description="Filter by parent_tenant_id")
):
    """
    Holt alle verfügbaren Tenants aus der tenants Collection.
    Kann nach Level (station, country, continent) oder Parent gefiltert werden.
    """
    try:
        query = {}
        if level:
            query["tenant_level"] = level
        if parent_id:
            query["parent_tenant_id"] = parent_id
            
        cursor = db.tenants.find(query, {"_id": 0})
        tenants = await cursor.to_list(length=1000)
        
        # Sortiere nach Name
        tenants.sort(key=lambda x: x.get("name", ""))
        
        return {
            "success": True,
            "tenants": tenants,
            "total": len(tenants)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenants/hierarchy")
async def get_tenant_hierarchy():
    """
    Gibt eine hierarchische Struktur der Tenants zurück (Kontinent -> Land -> Station).
    Nützlich für verschachtelte Dropdown-Menüs.
    """
    try:
        cursor = db.tenants.find({}, {"_id": 0})
        all_tenants = await cursor.to_list(length=1000)
        
        # Gruppiere nach Level
        hierarchy = {
            "continents": [],
            "countries": [],
            "stations": []
        }
        
        for tenant in all_tenants:
            level = tenant.get("tenant_level", "")
            if level == "continent":
                hierarchy["continents"].append(tenant)
            elif level == "country":
                hierarchy["countries"].append(tenant)
            else:
                hierarchy["stations"].append(tenant)
        
        # Sortiere jede Ebene
        for key in hierarchy:
            hierarchy[key].sort(key=lambda x: x.get("name", ""))
        
        return {
            "success": True,
            "hierarchy": hierarchy,
            "total": len(all_tenants)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenants/top-level")
async def get_top_level_tenants():
    """
    Holt nur die obersten Tenants (Organisationen wie Europcar, Puma).
    Ideal für das Haupt-Dropdown.
    """
    try:
        # Finde Root-Organisationen (tenant_level: organization oder ohne parent)
        cursor = db.tenants.find(
            {"$or": [
                {"tenant_level": "organization"},
                {"parent_tenant_id": {"$exists": False}},
                {"parent_tenant_id": None},
                {"parent_tenant_id": ""}
            ]},
            {"_id": 0}
        )
        tenants = await cursor.to_list(length=100)
        
        # Filter auf echte Organisationen (nicht Kontinente oder Länder)
        org_tenants = [t for t in tenants if t.get("tenant_level") == "organization" or not t.get("tenant_level")]
        
        # Falls keine gefunden, extrahiere aus allen Tenants
        if not org_tenants:
            cursor = db.tenants.find({}, {"_id": 0, "tenant_id": 1, "name": 1, "display_name": 1})
            all_tenants = await cursor.to_list(length=1000)
            # Extrahiere eindeutige Root-IDs (vor dem ersten Bindestrich mit Suffix)
            seen_roots = set()
            org_tenants = []
            for t in all_tenants:
                tid = t.get("tenant_id", "")
                # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                # Root tenant hat nur die UUID, Kinder haben UUID-suffix
                parts = tid.split("-")
                if len(parts) == 5:  # Reine UUID = Root Organisation
                    if tid not in seen_roots:
                        seen_roots.add(tid)
                        org_tenants.append(t)
        
        org_tenants.sort(key=lambda x: x.get("name", ""))
        
        return {
            "success": True,
            "tenants": org_tenants,
            "total": len(org_tenants)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_locations(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant_id")
):
    """
    Holt ALLE Standorte aus allen relevanten Collections und normalisiert sie.
    Dies ist der Single-Point-of-Truth für den Agent.
    Optional kann nach tenant_id gefiltert werden.
    """
    try:
        all_locations = []
        seen_codes = set()
        
        # 1. HAUPTQUELLE: Europcar Devices aus multi_tenant_admin DB
        # Diese enthalten die echten 200+ Standorte
        device_query = {}
        if tenant_id:
            device_query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": {"$regex": f"^{tenant_id}", "$options": "i"}}
            ]
        
        cursor = multi_tenant_db.europcar_devices.find(device_query)
        async for doc in cursor:
            # Extrahiere Standort aus Device
            location_code = doc.get("locationcode", "")
            if location_code and location_code not in seen_codes:
                loc = {
                    "station_code": location_code,
                    "name": f"{doc.get('customer', 'Europcar')} {location_code}",
                    "street": doc.get("street", doc.get("strasse", "")),
                    "zip": doc.get("plz", ""),
                    "city": doc.get("city", ""),
                    "state": doc.get("bundesland", ""),
                    "country": doc.get("country", "Deutschland"),
                    "continent": "Europe",
                    "phone": doc.get("phone", doc.get("telefon", "")),
                    "email": doc.get("email", ""),
                    "tvid": doc.get("tvid", ""),
                    "sn_station": doc.get("sn_pc", ""),
                    "sn_scanner": doc.get("sn_sc", ""),
                    "latitude": doc.get("latitude"),
                    "longitude": doc.get("longitude"),
                    "tenant_id": doc.get("tenant_id", ""),
                    "customer": doc.get("customer", ""),
                    "source": "europcar_devices",
                    "updated_at": doc.get("updated_at") or datetime.now(timezone.utc).isoformat()
                }
                all_locations.append(loc)
                seen_codes.add(location_code)
        
        # 2. Unified Locations (sekundäre Quelle)
        query = {}
        if tenant_id:
            query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": {"$regex": f"^{tenant_id}", "$options": "i"}}
            ]
        cursor = db.unified_locations.find(query)
        async for doc in cursor:
            loc = normalize_location(doc, "unified")
            if loc["station_code"] and loc["station_code"] not in seen_codes:
                all_locations.append(loc)
                seen_codes.add(loc["station_code"])
        
        # 3. Key Locations
        key_query = {}
        if tenant_id:
            key_query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": {"$regex": f"^{tenant_id}", "$options": "i"}}
            ]
        cursor = db.key_locations.find(key_query)
        async for doc in cursor:
            loc = normalize_location(doc, "key_locations")
            code = loc["station_code"]
            if code and code not in seen_codes:
                all_locations.append(loc)
                seen_codes.add(code)
        
        # 4. Europcar Stations (nur wenn kein tenant_id oder tenant_id enthält 'europcar')
        if not tenant_id or "europcar" in tenant_id.lower():
            cursor = db.europcar_stations.find({})
            async for doc in cursor:
                loc = normalize_location(doc, "europcar_stations")
                code = loc["station_code"] or doc.get("name", "").replace(" ", "_")[:20]
                if code and code not in seen_codes:
                    loc["station_code"] = code
                    if not loc.get("tenant_id"):
                        loc["tenant_id"] = "europcar"
                    all_locations.append(loc)
                    seen_codes.add(code)
        
        # 5. Legacy Locations
        legacy_query = {}
        if tenant_id:
            legacy_query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": {"$regex": f"^{tenant_id}", "$options": "i"}}
            ]
        cursor = db.locations.find(legacy_query)
        async for doc in cursor:
            loc = normalize_location(doc, "locations")
            if loc["station_code"] and loc["station_code"] not in seen_codes:
                all_locations.append(loc)
                seen_codes.add(loc["station_code"])
        
        # Nach Name sortieren
        all_locations.sort(key=lambda x: x.get("name", ""))
        
        return {
            "success": True,
            "locations": all_locations,
            "total": len(all_locations),
            "filtered_by_tenant": tenant_id,
            "sync_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_locations(q: Optional[str] = None, city: Optional[str] = None, country: Optional[str] = None):
    """Sucht nach Standorten"""
    try:
        result = await get_all_locations()
        locations = result["locations"]
        
        if q:
            q_lower = q.lower()
            locations = [l for l in locations if 
                q_lower in l.get("name", "").lower() or 
                q_lower in l.get("station_code", "").lower() or
                q_lower in l.get("city", "").lower()]
        
        if city:
            locations = [l for l in locations if city.lower() in l.get("city", "").lower()]
        
        if country:
            locations = [l for l in locations if country.lower() in l.get("country", "").lower()]
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/station/{station_code}")
async def get_station(station_code: str):
    """Holt einen einzelnen Standort nach Stationscode"""
    try:
        # Suche in unified_locations zuerst
        location = await db.unified_locations.find_one({"station_code": station_code})
        
        if not location:
            location = await db.key_locations.find_one({
                "$or": [
                    {"location_id": station_code},
                    {"station_code": station_code}
                ]
            })
        
        if not location:
            location = await db.europcar_stations.find_one({
                "$or": [
                    {"stationCode": station_code},
                    {"id": station_code}
                ]
            })
        
        if not location:
            location = await db.locations.find_one({"locationCode": station_code})
        
        if not location:
            raise HTTPException(status_code=404, detail=f"Station '{station_code}' nicht gefunden")
        
        return {
            "success": True,
            "station": normalize_location(location)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_location(location: LocationCreate):
    """Erstellt einen neuen Standort in der unified_locations Collection"""
    try:
        # Prüfe ob bereits existiert
        existing = await db.unified_locations.find_one({"station_code": location.station_code})
        if existing:
            raise HTTPException(status_code=400, detail=f"Station '{location.station_code}' existiert bereits")
        
        doc = {
            **location.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.unified_locations.insert_one(doc)
        
        return {
            "success": True,
            "message": "Standort erstellt",
            "station_code": location.station_code,
            "id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update/{station_code}")
async def update_location(station_code: str, update: LocationUpdate):
    """Aktualisiert einen Standort"""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Versuche in unified_locations zu aktualisieren
        result = await db.unified_locations.update_one(
            {"station_code": station_code},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            # Falls nicht in unified_locations, kopiere von anderer Quelle und aktualisiere
            existing = await get_station(station_code)
            if existing.get("success"):
                station_data = existing["station"]
                station_data.update(update_data)
                station_data["station_code"] = station_code
                await db.unified_locations.insert_one(station_data)
                return {"success": True, "message": "Standort in unified_locations kopiert und aktualisiert"}
        
        return {
            "success": True,
            "message": "Standort aktualisiert"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete/{station_code}")
async def delete_location(station_code: str):
    """Löscht einen Standort aus unified_locations"""
    try:
        result = await db.unified_locations.delete_one({"station_code": station_code})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Standort nicht gefunden")
        
        return {
            "success": True,
            "message": "Standort gelöscht"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/migrate-to-unified")
async def migrate_all_to_unified():
    """
    Migriert alle Standorte aus allen Quellen in die unified_locations Collection.
    Dies stellt sicher, dass Atlas die Single-Point-of-Truth ist.
    """
    try:
        migrated = 0
        skipped = 0
        
        # Hole alle normalisierten Standorte
        result = await get_all_locations()
        
        for loc in result["locations"]:
            # Prüfe ob bereits in unified_locations
            existing = await db.unified_locations.find_one({"station_code": loc["station_code"]})
            
            if not existing:
                loc["migrated_at"] = datetime.now(timezone.utc).isoformat()
                await db.unified_locations.insert_one(loc)
                migrated += 1
            else:
                skipped += 1
        
        return {
            "success": True,
            "message": f"Migration abgeschlossen",
            "migrated": migrated,
            "skipped": skipped,
            "total": migrated + skipped
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync-package")
async def get_sync_package():
    """
    Erstellt ein komplettes Sync-Paket für den Agent.
    Enthält alle Daten, die für den Offline-Betrieb benötigt werden.
    """
    try:
        # Alle Standorte
        locations_result = await get_all_locations()
        
        # Registrierte Geräte
        devices_cursor = db.registered_devices.find({}, {"_id": 0})
        devices = await devices_cursor.to_list(length=1000)
        
        # Scanner/Device Konfigurationen
        configs_cursor = db.device_configs.find({}, {"_id": 0})
        configs = await configs_cursor.to_list(length=1000)
        
        return {
            "success": True,
            "package": {
                "locations": locations_result["locations"],
                "devices": devices,
                "configs": configs,
                "version": datetime.now(timezone.utc).isoformat(),
                "checksum": str(hash(str(locations_result["total"]) + str(len(devices))))
            },
            "sync_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
