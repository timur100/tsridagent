from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# ==================== Models ====================

class KeyType(BaseModel):
    type_id: str
    name: str  # "car", "office", "hotel"
    display_name: str  # "Autoschlüssel", "Büroschlüssel", "Hotelzimmerschlüssel"
    requires_vehicle: bool = False
    requires_room: bool = False
    requires_license: bool = False

class Location(BaseModel):
    location_id: str
    name: str
    address: str
    city: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tenant_id: str

class KeyAutomat(BaseModel):
    automat_id: str
    name: str
    location_id: str
    kiosk_ids: List[str] = []  # Multiple kiosks can be assigned
    tenant_id: str
    status: str  # "online", "offline", "maintenance"
    total_slots: int
    occupied_slots: int = 0
    ip_address: Optional[str] = None
    created_at: str
    updated_at: str

class Key(BaseModel):
    key_id: str
    key_number: str
    key_type: str  # "car", "office", "hotel"
    description: str
    location_id: str
    automat_id: str
    tenant_id: str
    status: str  # "available", "rented", "maintenance", "reserved"
    
    # Optional fields for different key types
    vehicle_id: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = None
    
    room_number: Optional[str] = None
    floor: Optional[str] = None
    
    current_rental_id: Optional[str] = None
    created_at: str
    updated_at: str

class Rental(BaseModel):
    rental_id: str
    key_id: str
    key_number: str
    key_type: str
    tenant_id: str
    location_id: str
    
    # User information
    user_id: str
    user_name: str
    user_email: str
    
    # TSRID Verification
    verification_id: Optional[str] = None
    verification_status: str  # "pending", "verified", "failed"
    id_document_valid: bool = False
    license_valid: bool = False  # For car rentals
    
    # Payment
    payment_id: Optional[str] = None
    payment_status: str  # "pending", "authorized", "captured", "failed"
    deposit_amount: float = 0.0
    rental_amount: float = 0.0
    
    # Rental details
    rented_at: str
    due_back: str
    returned_at: Optional[str] = None
    status: str  # "active", "returned", "overdue", "cancelled"
    
    # Receipt
    receipt_id: Optional[str] = None
    receipt_printed: bool = False
    receipt_emailed: bool = False
    
    created_at: str
    updated_at: str

# ==================== Locations ====================

@router.post("/locations/create")
async def create_location(location_data: dict):
    try:
        from uuid import uuid4
        
        location = {
            "location_id": f"loc-{str(uuid4())[:8]}",
            "name": location_data.get("name"),
            "address": location_data.get("address"),
            "city": location_data.get("city"),
            "country": location_data.get("country"),
            "latitude": location_data.get("latitude"),
            "longitude": location_data.get("longitude"),
            "tenant_id": location_data.get("tenant_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.key_locations.insert_one(location)
        # Remove _id from the response to avoid serialization issues
        location.pop('_id', None)
        
        return {
            "success": True,
            "message": "Standort erfolgreich erstellt",
            "location": location
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/locations/list")
async def list_locations(tenant_id: Optional[str] = None):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        locations = await db.key_locations.find(query, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "locations": locations,
            "count": len(locations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/locations/update/{location_id}")
async def update_location(location_id: str, location_data: dict):
    try:
        location_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.key_locations.update_one(
            {"location_id": location_id},
            {"$set": location_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Standort nicht gefunden")
        
        return {
            "success": True,
            "message": "Standort aktualisiert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/locations/delete/{location_id}")
async def delete_location(location_id: str):
    try:
        result = await db.key_locations.delete_one({"location_id": location_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Standort nicht gefunden")
        
        return {
            "success": True,
            "message": "Standort gelöscht"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Key Automats ====================

@router.post("/automats/create")
async def create_automat(automat_data: dict):
    try:
        from uuid import uuid4
        
        automat = {
            "automat_id": f"automat-{str(uuid4())[:8]}",
            "name": automat_data.get("name"),
            "location_id": automat_data.get("location_id"),
            "kiosk_ids": automat_data.get("kiosk_ids", []),
            "tenant_id": automat_data.get("tenant_id"),
            "status": automat_data.get("status", "offline"),
            "total_slots": automat_data.get("total_slots", 50),
            "occupied_slots": 0,
            "ip_address": automat_data.get("ip_address"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.key_automats.insert_one(automat)
        
        return {
            "success": True,
            "message": "Automat erfolgreich erstellt",
            "automat": automat
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/automats/list")
async def list_automats(tenant_id: Optional[str] = None, location_id: Optional[str] = None):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if location_id:
            query["location_id"] = location_id
        
        automats = await db.key_automats.find(query, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "automats": automats,
            "count": len(automats)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/automats/update/{automat_id}")
async def update_automat(automat_id: str, automat_data: dict):
    try:
        automat_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.key_automats.update_one(
            {"automat_id": automat_id},
            {"$set": automat_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Automat nicht gefunden")
        
        return {
            "success": True,
            "message": "Automat aktualisiert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/automats/delete/{automat_id}")
async def delete_automat(automat_id: str):
    try:
        result = await db.key_automats.delete_one({"automat_id": automat_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Automat nicht gefunden")
        
        return {
            "success": True,
            "message": "Automat gelöscht"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Keys ====================

@router.post("/keys/create")
async def create_key(key_data: dict):
    try:
        from uuid import uuid4
        
        key = {
            "key_id": f"key-{str(uuid4())[:8]}",
            "key_number": key_data.get("key_number"),
            "key_type": key_data.get("key_type", "office"),
            "description": key_data.get("description"),
            "location_id": key_data.get("location_id"),
            "automat_id": key_data.get("automat_id"),
            "tenant_id": key_data.get("tenant_id"),
            "status": key_data.get("status", "available"),
            "vehicle_id": key_data.get("vehicle_id"),
            "vehicle_make": key_data.get("vehicle_make"),
            "vehicle_model": key_data.get("vehicle_model"),
            "vehicle_plate": key_data.get("vehicle_plate"),
            "room_number": key_data.get("room_number"),
            "floor": key_data.get("floor"),
            "current_rental_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.keys.insert_one(key)
        
        # Update automat occupied slots
        if key["status"] != "available":
            await db.key_automats.update_one(
                {"automat_id": key["automat_id"]},
                {"$inc": {"occupied_slots": 1}}
            )
        
        return {
            "success": True,
            "message": "Schlüssel erfolgreich erstellt",
            "key": key
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/keys/list")
async def list_keys(
    tenant_id: Optional[str] = None,
    location_id: Optional[str] = None,
    key_type: Optional[str] = None,
    status: Optional[str] = None
):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if location_id:
            query["location_id"] = location_id
        if key_type:
            query["key_type"] = key_type
        if status:
            query["status"] = status
        
        keys = await db.keys.find(query, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "keys": keys,
            "count": len(keys)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/keys/{key_id}")
async def get_key(key_id: str):
    try:
        key = await db.keys.find_one({"key_id": key_id}, {"_id": 0})
        
        if not key:
            raise HTTPException(status_code=404, detail="Schlüssel nicht gefunden")
        
        return {
            "success": True,
            "key": key
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/keys/update/{key_id}")
async def update_key(key_id: str, key_data: dict):
    try:
        key_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.keys.update_one(
            {"key_id": key_id},
            {"$set": key_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Schlüssel nicht gefunden")
        
        return {
            "success": True,
            "message": "Schlüssel aktualisiert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/keys/delete/{key_id}")
async def delete_key(key_id: str):
    try:
        result = await db.keys.delete_one({"key_id": key_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Schlüssel nicht gefunden")
        
        return {
            "success": True,
            "message": "Schlüssel gelöscht"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Rentals ====================

@router.post("/rentals/create")
async def create_rental(rental_data: dict):
    try:
        from uuid import uuid4
        
        # Check if key is available
        key = await db.keys.find_one({"key_id": rental_data.get("key_id")}, {"_id": 0})
        if not key:
            raise HTTPException(status_code=404, detail="Schlüssel nicht gefunden")
        
        if key["status"] != "available":
            raise HTTPException(status_code=400, detail="Schlüssel ist nicht verfügbar")
        
        rental = {
            "rental_id": f"rental-{str(uuid4())[:8]}",
            "key_id": rental_data.get("key_id"),
            "key_number": key["key_number"],
            "key_type": key["key_type"],
            "tenant_id": key["tenant_id"],
            "location_id": key["location_id"],
            "user_id": rental_data.get("user_id"),
            "user_name": rental_data.get("user_name"),
            "user_email": rental_data.get("user_email"),
            "verification_id": rental_data.get("verification_id"),
            "verification_status": rental_data.get("verification_status", "pending"),
            "id_document_valid": rental_data.get("id_document_valid", False),
            "license_valid": rental_data.get("license_valid", False),
            "payment_id": rental_data.get("payment_id"),
            "payment_status": rental_data.get("payment_status", "pending"),
            "deposit_amount": rental_data.get("deposit_amount", 0.0),
            "rental_amount": rental_data.get("rental_amount", 0.0),
            "rented_at": datetime.now(timezone.utc).isoformat(),
            "due_back": rental_data.get("due_back"),
            "returned_at": None,
            "status": "active",
            "receipt_id": None,
            "receipt_printed": False,
            "receipt_emailed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.rentals.insert_one(rental)
        
        # Update key status
        await db.keys.update_one(
            {"key_id": rental["key_id"]},
            {
                "$set": {
                    "status": "rented",
                    "current_rental_id": rental["rental_id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Ausleihe erfolgreich erstellt",
            "rental": rental
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rentals/active")
async def get_active_rentals(tenant_id: Optional[str] = None):
    try:
        query = {"status": "active"}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        rentals = await db.rentals.find(query, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "rentals": rentals,
            "count": len(rentals)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rentals/return/{rental_id}")
async def return_rental(rental_id: str):
    try:
        rental = await db.rentals.find_one({"rental_id": rental_id}, {"_id": 0})
        
        if not rental:
            raise HTTPException(status_code=404, detail="Ausleihe nicht gefunden")
        
        if rental["status"] != "active":
            raise HTTPException(status_code=400, detail="Ausleihe ist nicht aktiv")
        
        # Update rental
        await db.rentals.update_one(
            {"rental_id": rental_id},
            {
                "$set": {
                    "status": "returned",
                    "returned_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update key status
        await db.keys.update_one(
            {"key_id": rental["key_id"]},
            {
                "$set": {
                    "status": "available",
                    "current_rental_id": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Schlüssel erfolgreich zurückgegeben"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rentals/history")
async def get_rental_history(tenant_id: Optional[str] = None, limit: int = 100):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        rentals = await db.rentals.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "rentals": rentals,
            "count": len(rentals)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Key Types ====================

@router.get("/key-types/list")
async def get_key_types():
    try:
        key_types = [
            {
                "type_id": "car",
                "name": "car",
                "display_name": "Autoschlüssel",
                "requires_vehicle": True,
                "requires_room": False,
                "requires_license": True
            },
            {
                "type_id": "office",
                "name": "office",
                "display_name": "Büroschlüssel",
                "requires_vehicle": False,
                "requires_room": False,
                "requires_license": False
            },
            {
                "type_id": "hotel",
                "name": "hotel",
                "display_name": "Hotelzimmerschlüssel",
                "requires_vehicle": False,
                "requires_room": True,
                "requires_license": False
            }
        ]
        
        return {
            "success": True,
            "key_types": key_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Statistics ====================

@router.get("/stats/overview")
async def get_stats(tenant_id: Optional[str] = None):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        total_keys = await db.keys.count_documents(query)
        available_keys = await db.keys.count_documents({**query, "status": "available"})
        rented_keys = await db.keys.count_documents({**query, "status": "rented"})
        maintenance_keys = await db.keys.count_documents({**query, "status": "maintenance"})
        
        active_rentals = await db.rentals.count_documents({**query, "status": "active"})
        total_automats = await db.key_automats.count_documents(query)
        online_automats = await db.key_automats.count_documents({**query, "status": "online"})
        
        return {
            "success": True,
            "stats": {
                "total_keys": total_keys,
                "available_keys": available_keys,
                "rented_keys": rented_keys,
                "maintenance_keys": maintenance_keys,
                "active_rentals": active_rentals,
                "total_automats": total_automats,
                "online_automats": online_automats
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
