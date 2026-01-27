"""
Device Lifecycle Management API
Verwaltet alle Geräte: Scanner, Tablets, Drucker, Dockingstations
Mit vollständiger Historie und Lifecycle-Tracking
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

router = APIRouter(prefix="/api/device-lifecycle", tags=["device-lifecycle"])

# Database connections
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['portal_db']

# Device Status Definitions
DEVICE_STATUSES = {
    "active": {"label": "Aktiv", "color": "green", "description": "Gerät ist im Einsatz"},
    "in_storage": {"label": "Im Lager", "color": "blue", "description": "Nicht zugewiesen, verfügbar"},
    "defective": {"label": "Defekt / In Reparatur", "color": "yellow", "description": "Gerät ist defekt oder wird repariert"},
    "out_of_service": {"label": "Außer Betrieb", "color": "red", "description": "Entsorgt oder verkauft"}
}

# Device Type Definitions
DEVICE_TYPES = {
    "scanner_regula": {"label": "Scanner (Regula)", "category": "scanner", "icon": "scan"},
    "scanner_desko": {"label": "Scanner (Desko)", "category": "scanner", "icon": "scan"},
    "tablet": {"label": "Tablet/PC", "category": "computer", "icon": "tablet"},
    "printer": {"label": "Drucker", "category": "printer", "icon": "printer"},
    "docking_type1": {"label": "Dockingstation Typ 1", "category": "docking", "icon": "box"},
    "docking_type2": {"label": "Dockingstation Typ 2", "category": "docking", "icon": "box"},
    "docking_type3": {"label": "Dockingstation Typ 3", "category": "docking", "icon": "box"},
    "docking_type4": {"label": "Dockingstation Typ 4", "category": "docking", "icon": "box"},
    "switch": {"label": "Netzwerk-Switch", "category": "network", "icon": "network"},
    "router": {"label": "Router", "category": "network", "icon": "wifi"},
    "access_point": {"label": "Access Point", "category": "network", "icon": "wifi"},
    "cable": {"label": "Kabel/Adapter", "category": "accessory", "icon": "cable"},
    "other": {"label": "Sonstiges", "category": "other", "icon": "box"},
}

# Lifecycle Event Types
EVENT_TYPES = {
    "purchased": {"label": "Gekauft", "icon": "shopping-cart"},
    "activated": {"label": "Aktiviert", "icon": "power"},
    "assigned": {"label": "Standort zugewiesen", "icon": "map-pin"},
    "reassigned": {"label": "Standort gewechselt", "icon": "repeat"},
    "added_to_kit": {"label": "Zu Kit hinzugefügt", "icon": "package"},
    "removed_from_kit": {"label": "Aus Kit entfernt", "icon": "package-minus"},
    "kit_deployed": {"label": "Kit installiert", "icon": "check-circle"},
    "kit_returned": {"label": "Kit zurückgegeben", "icon": "undo"},
    "license_activated": {"label": "Lizenz aktiviert", "icon": "key"},
    "license_renewed": {"label": "Lizenz erneuert", "icon": "refresh-cw"},
    "software_updated": {"label": "Software aktualisiert", "icon": "download"},
    "repaired": {"label": "Repariert", "icon": "tool"},
    "decommissioned": {"label": "Außer Betrieb genommen", "icon": "x-circle"},
    "note_added": {"label": "Notiz hinzugefügt", "icon": "message-square"},
    "warranty_claimed": {"label": "Garantiefall", "icon": "shield"},
    "status_changed": {"label": "Status geändert", "icon": "refresh-cw"},
}


# Pydantic Models
class DeviceCreate(BaseModel):
    device_type: str
    serial_number: str
    manufacturer: Optional[str] = ""
    model: Optional[str] = ""
    qr_code: Optional[str] = ""
    inventory_number: Optional[str] = ""
    os_name: Optional[str] = ""
    os_version: Optional[str] = ""
    software_version: Optional[str] = ""
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    warranty_end: Optional[str] = None
    license_valid_until: Optional[str] = None
    assigned_location_code: Optional[str] = None
    assigned_location_name: Optional[str] = None
    responsible_technician: Optional[str] = ""
    notes: Optional[str] = ""
    status: str = "in_storage"
    tenant_id: Optional[str] = "europcar"
    custom_fields: Optional[Dict[str, Any]] = {}


class DeviceUpdate(BaseModel):
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    qr_code: Optional[str] = None
    inventory_number: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    software_version: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    warranty_end: Optional[str] = None
    license_valid_until: Optional[str] = None
    assigned_location_code: Optional[str] = None
    assigned_location_name: Optional[str] = None
    responsible_technician: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LifecycleEvent(BaseModel):
    event_type: str
    description: Optional[str] = ""
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    performed_by: Optional[str] = "System"
    metadata: Optional[Dict[str, Any]] = {}


class DeviceTypeCreate(BaseModel):
    type_key: str
    label: str
    category: str = "other"
    icon: str = "box"
    custom_fields_schema: Optional[List[Dict[str, Any]]] = []


# Kit/Set Models
class KitCreate(BaseModel):
    """Erstellt ein neues Hardware-Kit/Set"""
    kit_name: str  # z.B. "MUCC01-01-KIT"
    tenant_id: str
    location_code: str  # z.B. "MUCC01"
    device_number: int  # z.B. 1 für "01"
    description: Optional[str] = ""
    device_ids: Optional[List[str]] = []  # Liste von Geräte-IDs die zum Kit gehören


class KitUpdate(BaseModel):
    """Aktualisiert ein Kit"""
    description: Optional[str] = None
    status: Optional[str] = None  # "assembled", "deployed", "returned", "disassembled"
    assigned_location_code: Optional[str] = None
    assigned_location_name: Optional[str] = None


class KitAssignment(BaseModel):
    """Weist ein Kit einem Standort zu"""
    tenant_id: str
    location_code: str
    location_name: Optional[str] = ""
    notes: Optional[str] = ""


# API Endpoints

@router.get("/statuses")
async def get_device_statuses():
    """Gibt alle verfügbaren Geräte-Status zurück"""
    return {"success": True, "statuses": DEVICE_STATUSES}


@router.get("/types")
async def get_device_types():
    """Gibt alle Gerätetypen zurück (Standard + Custom)"""
    # Get custom types from DB
    cursor = db.device_types.find({}, {"_id": 0})
    custom_types = await cursor.to_list(length=100)
    
    # Merge with default types
    all_types = {**DEVICE_TYPES}
    for ct in custom_types:
        all_types[ct["type_key"]] = ct
    
    return {"success": True, "types": all_types}


@router.post("/types")
async def create_device_type(device_type: DeviceTypeCreate):
    """Erstellt einen neuen Gerätetyp"""
    # Check if type already exists
    existing = await db.device_types.find_one({"type_key": device_type.type_key})
    if existing or device_type.type_key in DEVICE_TYPES:
        raise HTTPException(status_code=400, detail="Gerätetyp existiert bereits")
    
    type_doc = device_type.dict()
    type_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.device_types.insert_one(type_doc)
    
    return {"success": True, "message": f"Gerätetyp '{device_type.label}' erstellt"}


@router.get("/event-types")
async def get_event_types():
    """Gibt alle Lifecycle-Event-Typen zurück"""
    return {"success": True, "event_types": EVENT_TYPES}


@router.get("/list")
async def list_devices(
    device_type: str = Query(None, description="Filter nach Gerätetyp"),
    status: str = Query(None, description="Filter nach Status"),
    location_code: str = Query(None, description="Filter nach Standort"),
    search: str = Query(None, description="Suche nach Seriennummer, Modell, etc."),
    tenant_id: str = Query(None, description="Filter nach Tenant"),
    limit: int = Query(100, description="Max. Anzahl"),
    skip: int = Query(0, description="Offset")
):
    """Listet alle Geräte mit Filteroptionen"""
    try:
        query = {}
        
        if device_type:
            query["device_type"] = device_type
        
        if status:
            query["status"] = status
        
        if location_code:
            query["assigned_location_code"] = location_code
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if search:
            query["$or"] = [
                {"serial_number": {"$regex": search, "$options": "i"}},
                {"model": {"$regex": search, "$options": "i"}},
                {"manufacturer": {"$regex": search, "$options": "i"}},
                {"inventory_number": {"$regex": search, "$options": "i"}},
                {"qr_code": {"$regex": search, "$options": "i"}},
            ]
        
        # Get total count
        total = await db.device_inventory.count_documents(query)
        
        # Get devices
        cursor = db.device_inventory.find(query).skip(skip).limit(limit).sort("created_at", -1)
        devices_raw = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        devices = []
        for d in devices_raw:
            d["id"] = str(d["_id"])
            del d["_id"]
            devices.append(d)
        
        return {
            "success": True,
            "devices": devices,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_device_stats(tenant_id: str = Query(None)):
    """Gibt Statistiken über alle Geräte zurück"""
    try:
        match_query = {}
        if tenant_id:
            match_query["tenant_id"] = tenant_id
        
        # Count by status
        status_pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_cursor = db.device_inventory.aggregate(status_pipeline)
        status_counts = {s["_id"]: s["count"] async for s in status_cursor}
        
        # Count by type
        type_pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$device_type", "count": {"$sum": 1}}}
        ]
        type_cursor = db.device_inventory.aggregate(type_pipeline)
        type_counts = {t["_id"]: t["count"] async for t in type_cursor}
        
        # Total count
        total = await db.device_inventory.count_documents(match_query)
        
        # Warranty expiring soon (next 30 days)
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=30)
        warranty_expiring = await db.device_inventory.count_documents({
            **match_query,
            "warranty_end": {
                "$gte": now.isoformat(),
                "$lte": soon.isoformat()
            }
        })
        
        # License expiring soon
        license_expiring = await db.device_inventory.count_documents({
            **match_query,
            "license_valid_until": {
                "$gte": now.isoformat(),
                "$lte": soon.isoformat()
            }
        })
        
        return {
            "success": True,
            "stats": {
                "total": total,
                "by_status": status_counts,
                "by_type": type_counts,
                "warranty_expiring_soon": warranty_expiring,
                "license_expiring_soon": license_expiring
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_device(device: DeviceCreate):
    """Erstellt ein neues Gerät"""
    try:
        # Check if serial number already exists
        existing = await db.device_inventory.find_one({"serial_number": device.serial_number})
        if existing:
            raise HTTPException(status_code=400, detail="Seriennummer existiert bereits")
        
        device_doc = device.dict()
        device_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        device_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.device_inventory.insert_one(device_doc)
        device_id = str(result.inserted_id)
        
        # Create initial lifecycle event
        event = {
            "device_id": device_id,
            "event_type": "purchased" if device.purchase_date else "activated",
            "description": f"Gerät im System erfasst",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "performed_by": "System",
            "metadata": {
                "device_type": device.device_type,
                "serial_number": device.serial_number
            }
        }
        await db.device_lifecycle_events.insert_one(event)
        
        # If assigned to location, create assignment event
        if device.assigned_location_code:
            assign_event = {
                "device_id": device_id,
                "event_type": "assigned",
                "description": f"Zugewiesen an {device.assigned_location_name or device.assigned_location_code}",
                "new_value": device.assigned_location_code,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "performed_by": "System"
            }
            await db.device_lifecycle_events.insert_one(assign_event)
        
        return {
            "success": True,
            "message": "Gerät erfolgreich erstellt",
            "device_id": device_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}")
async def get_device(device_id: str):
    """Gibt Details eines Geräts zurück"""
    try:
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        device["id"] = str(device["_id"])
        del device["_id"]
        
        return {"success": True, "device": device}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{device_id}")
async def update_device(device_id: str, update: DeviceUpdate):
    """Aktualisiert ein Gerät"""
    try:
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if not update_data:
            return {"success": True, "message": "Keine Änderungen"}
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Track important changes as lifecycle events
        events_to_create = []
        
        # Status change
        if "status" in update_data and update_data["status"] != device.get("status"):
            events_to_create.append({
                "device_id": device_id,
                "event_type": "status_changed",
                "description": f"Status geändert",
                "old_value": device.get("status"),
                "new_value": update_data["status"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "performed_by": "Admin"
            })
        
        # Location change
        if "assigned_location_code" in update_data:
            old_loc = device.get("assigned_location_code")
            new_loc = update_data["assigned_location_code"]
            if old_loc != new_loc:
                event_type = "reassigned" if old_loc else "assigned"
                events_to_create.append({
                    "device_id": device_id,
                    "event_type": event_type,
                    "description": f"Standort {'gewechselt' if old_loc else 'zugewiesen'}",
                    "old_value": old_loc,
                    "new_value": new_loc,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "performed_by": "Admin"
                })
        
        # Software update
        if "software_version" in update_data and update_data["software_version"] != device.get("software_version"):
            events_to_create.append({
                "device_id": device_id,
                "event_type": "software_updated",
                "description": f"Software aktualisiert",
                "old_value": device.get("software_version"),
                "new_value": update_data["software_version"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "performed_by": "Admin"
            })
        
        # License update
        if "license_valid_until" in update_data and update_data["license_valid_until"] != device.get("license_valid_until"):
            event_type = "license_renewed" if device.get("license_valid_until") else "license_activated"
            events_to_create.append({
                "device_id": device_id,
                "event_type": event_type,
                "description": f"Lizenz {'erneuert' if device.get('license_valid_until') else 'aktiviert'}",
                "old_value": device.get("license_valid_until"),
                "new_value": update_data["license_valid_until"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "performed_by": "Admin"
            })
        
        # Update device
        await db.device_inventory.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": update_data}
        )
        
        # Create lifecycle events
        if events_to_create:
            await db.device_lifecycle_events.insert_many(events_to_create)
        
        return {
            "success": True,
            "message": "Gerät aktualisiert",
            "events_created": len(events_to_create)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{device_id}")
async def delete_device(device_id: str):
    """Löscht ein Gerät und seine Historie"""
    try:
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        # Delete device
        await db.device_inventory.delete_one({"_id": ObjectId(device_id)})
        
        # Delete lifecycle events
        await db.device_lifecycle_events.delete_many({"device_id": device_id})
        
        return {
            "success": True,
            "message": f"Gerät {device.get('serial_number')} gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}/timeline")
async def get_device_timeline(device_id: str, limit: int = Query(50)):
    """Gibt die Lifecycle-Timeline eines Geräts zurück"""
    try:
        # Verify device exists
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        # Get events
        cursor = db.device_lifecycle_events.find(
            {"device_id": device_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        return {
            "success": True,
            "device_id": device_id,
            "events": events,
            "total": len(events)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{device_id}/event")
async def add_lifecycle_event(device_id: str, event: LifecycleEvent):
    """Fügt ein Lifecycle-Event hinzu"""
    try:
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        if event.event_type not in EVENT_TYPES:
            raise HTTPException(status_code=400, detail="Ungültiger Event-Typ")
        
        event_doc = {
            "device_id": device_id,
            "event_type": event.event_type,
            "description": event.description or EVENT_TYPES[event.event_type]["label"],
            "old_value": event.old_value,
            "new_value": event.new_value,
            "performed_by": event.performed_by or "Admin",
            "metadata": event.metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.device_lifecycle_events.insert_one(event_doc)
        
        return {
            "success": True,
            "message": "Event hinzugefügt",
            "event_type": event.event_type
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{device_id}/assign")
async def assign_device_to_location(
    device_id: str,
    location_code: str = Query(...),
    location_name: str = Query(None)
):
    """Weist ein Gerät einem Standort zu"""
    try:
        device = await db.device_inventory.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        old_location = device.get("assigned_location_code")
        
        # Update device
        await db.device_inventory.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "assigned_location_code": location_code,
                "assigned_location_name": location_name,
                "status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create event
        event_type = "reassigned" if old_location else "assigned"
        event = {
            "device_id": device_id,
            "event_type": event_type,
            "description": f"{'Standort gewechselt zu' if old_location else 'Zugewiesen an'} {location_name or location_code}",
            "old_value": old_location,
            "new_value": location_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "performed_by": "Admin"
        }
        await db.device_lifecycle_events.insert_one(event)
        
        return {
            "success": True,
            "message": f"Gerät {device.get('serial_number')} zugewiesen an {location_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
