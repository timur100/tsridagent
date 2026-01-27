"""
Location Lifecycle Management API
Verwaltet Standort-Status: Aktiv, In Vorbereitung, Deaktiviert
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/locations", tags=["locations"])

# Database connections
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['tsrid_db']
multi_tenant_db = client['multi_tenant_admin']
portal_db = client['portal_db']

# Status-Definitionen
LOCATION_STATUSES = {
    "active": {"label": "Aktiv", "color": "green", "description": "Standort ist in Betrieb"},
    "in_preparation": {"label": "In Vorbereitung", "color": "yellow", "description": "Neuer Standort wird eröffnet"},
    "deactivated": {"label": "Deaktiviert", "color": "red", "description": "Standort ist geschlossen"}
}


class LocationStatusUpdate(BaseModel):
    status: str  # active, in_preparation, deactivated
    reason: Optional[str] = None


class LocationCreate(BaseModel):
    location_code: str
    name: str
    street: Optional[str] = ""
    postal_code: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = "Deutschland"
    phone: Optional[str] = ""
    email: Optional[str] = ""
    manager: Optional[str] = ""
    tenant_id: str = "europcar"
    status: str = "in_preparation"


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager: Optional[str] = None
    main_type: Optional[str] = None


class BulkStatusRequest(BaseModel):
    location_codes: List[str]


@router.get("/statuses")
async def get_location_statuses():
    """Gibt alle verfügbaren Status-Typen zurück"""
    return {
        "success": True,
        "statuses": LOCATION_STATUSES
    }


@router.post("/statuses-bulk")
async def get_bulk_statuses(request: BulkStatusRequest):
    """Gibt Status-Information für mehrere Standorte auf einmal zurück"""
    try:
        if not request.location_codes:
            return {"success": True, "statuses": {}}
        
        # Hole alle Status-Einträge für die angegebenen Codes
        cursor = db.location_status.find(
            {"location_code": {"$in": request.location_codes}},
            {"_id": 0}
        )
        status_list = await cursor.to_list(length=len(request.location_codes))
        
        # Erstelle Map: location_code -> status_info
        statuses = {}
        for s in status_list:
            statuses[s["location_code"]] = {
                "status": s.get("status", "active"),
                "status_changed_at": s.get("status_changed_at"),
                "status_reason": s.get("status_reason")
            }
        
        return {
            "success": True,
            "statuses": statuses
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_locations(
    status: str = Query(None, description="Filter nach Status (active, in_preparation, deactivated)"),
    tenant_id: str = Query(None, description="Filter nach Tenant"),
    city: str = Query(None, description="Filter nach Stadt"),
    search: str = Query(None, description="Suche nach Code oder Name"),
    limit: int = Query(100, description="Max. Anzahl"),
    skip: int = Query(0, description="Offset")
):
    """
    Listet alle Standorte mit Status-Information.
    Kombiniert Daten aus tenant_locations und location_status Collection.
    """
    try:
        # Query aufbauen
        query = {}
        
        if tenant_id:
            query["tenant_id"] = {"$regex": f"^{tenant_id}$", "$options": "i"}
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        if search:
            query["$or"] = [
                {"location_code": {"$regex": search, "$options": "i"}},
                {"station_name": {"$regex": search, "$options": "i"}}
            ]
        
        # Hole Standorte aus tenant_locations
        cursor = portal_db.tenant_locations.find(query, {"_id": 0}).skip(skip).limit(limit)
        locations_raw = await cursor.to_list(length=limit)
        
        # Hole Status-Informationen aus location_status Collection
        location_codes = [loc.get("location_code") for loc in locations_raw if loc.get("location_code")]
        
        status_cursor = db.location_status.find(
            {"location_code": {"$in": location_codes}},
            {"_id": 0}
        )
        status_data = await status_cursor.to_list(length=len(location_codes))
        status_map = {s["location_code"]: s for s in status_data}
        
        # Hole Geräte-Anzahl pro Standort
        device_counts = {}
        for code in location_codes:
            count = await multi_tenant_db.europcar_devices.count_documents({"locationcode": code})
            device_counts[code] = count
        
        # Kombiniere Daten
        locations = []
        for loc in locations_raw:
            code = loc.get("location_code", "")
            status_info = status_map.get(code, {})
            
            location_data = {
                "location_code": code,
                "name": loc.get("station_name", ""),
                "street": loc.get("street", ""),
                "postal_code": loc.get("postal_code", ""),
                "city": loc.get("city", ""),
                "country": loc.get("country", "Deutschland"),
                "phone": loc.get("phone", ""),
                "email": loc.get("email", ""),
                "manager": loc.get("manager", ""),
                "main_type": loc.get("main_type", ""),
                "tenant_id": loc.get("tenant_id", "europcar"),
                "status": status_info.get("status", "active"),  # Default: active
                "status_changed_at": status_info.get("status_changed_at"),
                "status_changed_by": status_info.get("status_changed_by"),
                "status_reason": status_info.get("reason"),
                "device_count": device_counts.get(code, 0),
                "created_at": status_info.get("created_at"),
                "updated_at": status_info.get("updated_at")
            }
            
            # Filter nach Status wenn angegeben
            if status and location_data["status"] != status:
                continue
                
            locations.append(location_data)
        
        # Sortiere nach Status (in_preparation zuerst, dann active, dann deactivated)
        status_order = {"in_preparation": 0, "active": 1, "deactivated": 2}
        locations.sort(key=lambda x: (status_order.get(x["status"], 1), x["location_code"]))
        
        total = await portal_db.tenant_locations.count_documents(query)
        
        return {
            "success": True,
            "locations": locations,
            "total": total,
            "filtered": len(locations),
            "limit": limit,
            "skip": skip
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{location_code}")
async def get_location_details(location_code: str):
    """Holt detaillierte Informationen zu einem Standort"""
    try:
        # Standort-Basisdaten
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{location_code}$", "$options": "i"}},
            {"_id": 0}
        )
        
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {location_code} nicht gefunden")
        
        # Status-Informationen
        status_info = await db.location_status.find_one(
            {"location_code": location_code},
            {"_id": 0}
        )
        
        # Geräte am Standort
        devices_cursor = multi_tenant_db.europcar_devices.find(
            {"locationcode": {"$regex": f"^{location_code}$", "$options": "i"}},
            {"_id": 0}
        )
        devices = await devices_cursor.to_list(length=50)
        
        # Aktivierungscodes für diesen Standort
        codes_cursor = db.activation_codes.find(
            {"location_code": {"$regex": f"^{location_code}$", "$options": "i"}},
            {"_id": 0, "qr_code_base64": 0}  # QR-Code nicht mitladen (zu groß)
        )
        activation_codes = await codes_cursor.to_list(length=50)
        
        # Status-Historie
        history_cursor = db.location_status_history.find(
            {"location_code": location_code},
            {"_id": 0}
        ).sort("changed_at", -1).limit(10)
        status_history = await history_cursor.to_list(length=10)
        
        return {
            "success": True,
            "location": {
                "location_code": location.get("location_code"),
                "name": location.get("station_name", ""),
                "street": location.get("street", ""),
                "postal_code": location.get("postal_code", ""),
                "city": location.get("city", ""),
                "country": location.get("country", "Deutschland"),
                "phone": location.get("phone", ""),
                "email": location.get("email", ""),
                "manager": location.get("manager", ""),
                "main_type": location.get("main_type", ""),
                "tenant_id": location.get("tenant_id", "europcar"),
                "status": status_info.get("status", "active") if status_info else "active",
                "status_changed_at": status_info.get("status_changed_at") if status_info else None,
                "status_reason": status_info.get("reason") if status_info else None
            },
            "devices": devices,
            "device_count": len(devices),
            "activation_codes": activation_codes,
            "status_history": status_history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{location_code}/status")
async def update_location_status(location_code: str, data: LocationStatusUpdate):
    """
    Ändert den Status eines Standorts.
    Speichert auch die Historie.
    """
    try:
        if data.status not in LOCATION_STATUSES:
            raise HTTPException(
                status_code=400, 
                detail=f"Ungültiger Status. Erlaubt: {list(LOCATION_STATUSES.keys())}"
            )
        
        # Prüfe ob Standort existiert
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{location_code}$", "$options": "i"}}
        )
        
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {location_code} nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Hole aktuellen Status für Historie
        current_status = await db.location_status.find_one({"location_code": location_code})
        old_status = current_status.get("status", "active") if current_status else "active"
        
        # Update oder erstelle Status-Dokument
        await db.location_status.update_one(
            {"location_code": location_code},
            {
                "$set": {
                    "location_code": location_code,
                    "status": data.status,
                    "status_changed_at": now,
                    "reason": data.reason,
                    "updated_at": now
                },
                "$setOnInsert": {
                    "created_at": now
                }
            },
            upsert=True
        )
        
        # Speichere in Historie
        await db.location_status_history.insert_one({
            "location_code": location_code,
            "old_status": old_status,
            "new_status": data.status,
            "reason": data.reason,
            "changed_at": now
        })
        
        status_label = LOCATION_STATUSES[data.status]["label"]
        
        return {
            "success": True,
            "message": f"Status von {location_code} auf '{status_label}' geändert",
            "location_code": location_code,
            "status": data.status,
            "status_label": status_label,
            "changed_at": now
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{location_code}")
async def update_location(location_code: str, data: LocationUpdate):
    """Aktualisiert Standort-Daten"""
    try:
        # Prüfe ob Standort existiert
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{location_code}$", "$options": "i"}}
        )
        
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {location_code} nicht gefunden")
        
        # Baue Update-Dokument
        update_data = {}
        if data.name is not None:
            update_data["station_name"] = data.name
        if data.street is not None:
            update_data["street"] = data.street
        if data.postal_code is not None:
            update_data["postal_code"] = data.postal_code
        if data.city is not None:
            update_data["city"] = data.city
        if data.country is not None:
            update_data["country"] = data.country
        if data.phone is not None:
            update_data["phone"] = data.phone
        if data.email is not None:
            update_data["email"] = data.email
        if data.manager is not None:
            update_data["manager"] = data.manager
        if data.main_type is not None:
            update_data["main_type"] = data.main_type
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await portal_db.tenant_locations.update_one(
                {"location_code": location_code},
                {"$set": update_data}
            )
        
        return {
            "success": True,
            "message": f"Standort {location_code} aktualisiert",
            "updated_fields": list(update_data.keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_location(data: LocationCreate):
    """Erstellt einen neuen Standort (Status: In Vorbereitung)"""
    try:
        # Prüfe ob Standort bereits existiert
        existing = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{data.location_code}$", "$options": "i"}}
        )
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Standort {data.location_code} existiert bereits"
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Erstelle Standort in tenant_locations
        location_doc = {
            "location_code": data.location_code.upper(),
            "station_name": data.name,
            "street": data.street,
            "postal_code": data.postal_code,
            "city": data.city,
            "country": data.country,
            "phone": data.phone,
            "email": data.email or f"dest{data.location_code.upper()}@{data.tenant_id}.com",
            "manager": data.manager,
            "tenant_id": data.tenant_id,
            "created_at": now
        }
        
        await portal_db.tenant_locations.insert_one(location_doc)
        
        # Erstelle Status-Eintrag
        await db.location_status.insert_one({
            "location_code": data.location_code.upper(),
            "status": data.status,
            "status_changed_at": now,
            "reason": "Neuer Standort angelegt",
            "created_at": now,
            "updated_at": now
        })
        
        # Speichere in Historie
        await db.location_status_history.insert_one({
            "location_code": data.location_code.upper(),
            "old_status": None,
            "new_status": data.status,
            "reason": "Neuer Standort angelegt",
            "changed_at": now
        })
        
        return {
            "success": True,
            "message": f"Standort {data.location_code} erfolgreich angelegt",
            "location_code": data.location_code.upper(),
            "status": data.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{location_code}/devices")
async def get_location_devices(location_code: str):
    """Holt alle Geräte eines Standorts"""
    try:
        devices_cursor = multi_tenant_db.europcar_devices.find(
            {"locationcode": {"$regex": f"^{location_code}$", "$options": "i"}},
            {"_id": 0}
        )
        devices = await devices_cursor.to_list(length=100)
        
        # Hole Aktivierungscode-Status für jedes Gerät
        for device in devices:
            device_id = device.get("device_id")
            if device_id:
                code = await db.activation_codes.find_one(
                    {"device_id": device_id},
                    {"_id": 0, "code": 1, "status": 1}
                )
                device["activation_code"] = code.get("code") if code else None
                device["activation_status"] = code.get("status") if code else None
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices),
            "location_code": location_code
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{location_code}/devices/{device_id}/assign")
async def assign_device_to_location(location_code: str, device_id: str):
    """Weist ein Gerät einem Standort zu"""
    try:
        # Prüfe ob Standort existiert
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{location_code}$", "$options": "i"}}
        )
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {location_code} nicht gefunden")
        
        # Prüfe ob Gerät existiert
        device = await multi_tenant_db.europcar_devices.find_one(
            {"device_id": {"$regex": f"^{device_id}$", "$options": "i"}}
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        if device:
            # Update existierendes Gerät
            await multi_tenant_db.europcar_devices.update_one(
                {"device_id": device_id},
                {
                    "$set": {
                        "locationcode": location_code.upper(),
                        "city": location.get("city", ""),
                        "country": location.get("country", "Deutschland"),
                        "customer": location.get("tenant_id", "Europcar"),
                        "assigned_at": now
                    }
                }
            )
        else:
            # Erstelle neues Gerät
            await multi_tenant_db.europcar_devices.insert_one({
                "device_id": device_id.upper(),
                "locationcode": location_code.upper(),
                "city": location.get("city", ""),
                "country": location.get("country", "Deutschland"),
                "customer": location.get("tenant_id", "Europcar"),
                "status": "pending",
                "created_at": now,
                "assigned_at": now
            })
        
        return {
            "success": True,
            "message": f"Gerät {device_id} wurde Standort {location_code} zugewiesen",
            "device_id": device_id,
            "location_code": location_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
