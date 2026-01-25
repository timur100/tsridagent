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
        "latitude": doc.get("latitude"),
        "longitude": doc.get("longitude"),
        "source": source,
        "updated_at": doc.get("updated_at") or datetime.now(timezone.utc).isoformat()
    }


@router.get("/all")
async def get_all_locations():
    """
    Holt ALLE Standorte aus allen relevanten Collections und normalisiert sie.
    Dies ist der Single-Point-of-Truth für den Agent.
    """
    try:
        all_locations = []
        seen_codes = set()
        
        # 1. Unified Locations (primäre Quelle)
        cursor = db.unified_locations.find({})
        async for doc in cursor:
            loc = normalize_location(doc, "unified")
            if loc["station_code"] and loc["station_code"] not in seen_codes:
                all_locations.append(loc)
                seen_codes.add(loc["station_code"])
        
        # 2. Key Locations
        cursor = db.key_locations.find({})
        async for doc in cursor:
            loc = normalize_location(doc, "key_locations")
            code = loc["station_code"]
            if code and code not in seen_codes:
                all_locations.append(loc)
                seen_codes.add(code)
        
        # 3. Europcar Stations
        cursor = db.europcar_stations.find({})
        async for doc in cursor:
            loc = normalize_location(doc, "europcar_stations")
            code = loc["station_code"] or doc.get("name", "").replace(" ", "_")[:20]
            if code and code not in seen_codes:
                loc["station_code"] = code
                all_locations.append(loc)
                seen_codes.add(code)
        
        # 4. Legacy Locations
        cursor = db.locations.find({})
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
