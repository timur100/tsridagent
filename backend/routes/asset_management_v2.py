"""
Asset Management V2 API
Multi-level structure for TSRID rollout operations

Collections:
1. Locations - Physical locations for installations
2. Slots - Installation positions at locations  
3. Bundles - Grouped hardware kits
4. Assets - Physical devices with history tracking

Relations:
- Slot -> Location (many-to-one)
- Slot -> Bundle (one-to-one, optional)
- Asset -> Bundle (many-to-one)
- Asset.history -> Location, Slot references
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

router = APIRouter(prefix="/api/asset-mgmt", tags=["asset-management-v2"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['portal_db']

# ============ ENUMS ============
LOCATION_STATUSES = ['active', 'inactive', 'planned', 'decommissioned']
SLOT_STATUSES = ['empty', 'installed', 'maintenance', 'reserved']
BUNDLE_STATUSES = ['in_storage', 'deployed', 'in_transit', 'maintenance', 'retired']

# Erweiterte Asset-Typen mit spezifischen Geräten
ASSET_TYPES = [
    # Tablets
    'tablet', 'surface_pro_4', 'surface_pro_6', 'surface_pro_7', 'surface_go',
    # Scanner
    'scanner', 'scanner_desko', 'scanner_regula',
    # Docking Stations
    'dock', 'dock_desko', 'dock_quer', 'dock_surface',
    # Netzteile (PSU)
    'psu', 'psu_desko', 'psu_surface',
    # Kabel & Adapter
    'cable', 'usb_adapter_90', 'usb_hub', 'hdmi_adapter', 'displayport_adapter',
    # Netzwerk
    'switch', 'router',
    # Sonstiges
    'other'
]

# Hersteller-Liste
MANUFACTURERS = [
    'Microsoft', 'Desko', 'Regula', 'Samsung', 'Lenovo', 'HP', 'Dell', 
    'Anker', 'Belkin', 'Ugreen', 'Other'
]

ASSET_STATUSES = ['in_storage', 'deployed', 'in_transit', 'maintenance', 'defective', 'retired']
EVENT_TYPES = ['created', 'assigned_to_bundle', 'removed_from_bundle', 'installed', 'uninstalled', 'replaced', 'maintenance', 'status_change', 'license_activated', 'license_expired', 'note']


# ============ PYDANTIC MODELS ============

# Location Models
class LocationCreate(BaseModel):
    location_id: str
    country: str
    customer: str = "Europcar"
    address: Optional[str] = ""
    city: Optional[str] = ""
    zip_code: Optional[str] = ""
    status: str = "planned"
    contact_name: Optional[str] = ""
    contact_phone: Optional[str] = ""
    contact_email: Optional[str] = ""
    notes: Optional[str] = ""


class LocationUpdate(BaseModel):
    country: Optional[str] = None
    customer: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    status: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


# Slot Models
class SlotCreate(BaseModel):
    slot_id: str
    location_id: str
    bundle_id: Optional[str] = None
    teamviewer_alias: Optional[str] = ""
    position_description: Optional[str] = ""
    status: str = "empty"
    notes: Optional[str] = ""


class SlotUpdate(BaseModel):
    bundle_id: Optional[str] = None
    teamviewer_alias: Optional[str] = None
    position_description: Optional[str] = None
    status: Optional[str] = None
    installed_at: Optional[str] = None
    notes: Optional[str] = None


# Bundle Models
class BundleCreate(BaseModel):
    bundle_id: str
    country: str
    description: Optional[str] = ""
    status: str = "in_storage"
    notes: Optional[str] = ""


class BundleUpdate(BaseModel):
    country: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# Asset Models
class AssetHistoryEvent(BaseModel):
    date: str
    event: str
    event_type: str = "note"
    location_id: Optional[str] = None
    slot_id: Optional[str] = None
    bundle_id: Optional[str] = None
    technician: Optional[str] = ""
    notes: Optional[str] = ""


class AssetCreate(BaseModel):
    asset_id: str
    type: str
    manufacturer_sn: Optional[str] = ""
    imei: Optional[str] = ""
    mac: Optional[str] = ""
    manufacturer: Optional[str] = ""
    model: Optional[str] = ""
    bundle_id: Optional[str] = None
    status: str = "in_storage"
    country: Optional[str] = ""
    # Kaufdaten
    purchase_date: Optional[str] = ""
    purchase_price: Optional[float] = None
    supplier: Optional[str] = ""
    invoice_number: Optional[str] = ""
    # Garantie
    warranty_until: Optional[str] = ""
    warranty_type: Optional[str] = ""  # z.B. "Standard", "Extended", "On-Site"
    # Installation
    installation_date: Optional[str] = ""
    installed_by: Optional[str] = ""
    # Lizenz-Informationen
    license_key: Optional[str] = ""
    license_type: Optional[str] = ""  # z.B. "Perpetual", "Subscription", "OEM"
    license_activation_date: Optional[str] = ""
    license_expiry_date: Optional[str] = ""
    # Notizen
    notes: Optional[str] = ""


class AssetUpdate(BaseModel):
    type: Optional[str] = None
    manufacturer_sn: Optional[str] = None
    imei: Optional[str] = None
    mac: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    bundle_id: Optional[str] = None
    status: Optional[str] = None
    country: Optional[str] = None
    # Kaufdaten
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    # Garantie
    warranty_until: Optional[str] = None
    warranty_type: Optional[str] = None
    # Installation
    installation_date: Optional[str] = None
    installed_by: Optional[str] = None
    # Lizenz-Informationen
    license_key: Optional[str] = None
    license_type: Optional[str] = None
    license_activation_date: Optional[str] = None
    license_expiry_date: Optional[str] = None
    # Notizen
    notes: Optional[str] = None


# ============ HELPER FUNCTIONS ============

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def add_asset_history(asset_id: str, event_type: str, event: str, 
                           location_id: str = None, slot_id: str = None, 
                           bundle_id: str = None, technician: str = "", notes: str = ""):
    """Add a history event to an asset"""
    history_entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "event_type": event_type,
        "location_id": location_id,
        "slot_id": slot_id,
        "bundle_id": bundle_id,
        "technician": technician,
        "notes": notes
    }
    await db.tsrid_assets.update_one(
        {"asset_id": asset_id},
        {"$push": {"history": history_entry}}
    )


# ============ STARTUP - CREATE INDEXES ============

@router.on_event("startup")
async def create_indexes():
    """Create database indexes for scalability"""
    try:
        # Locations indexes
        await db.tsrid_locations.create_index("location_id", unique=True)
        await db.tsrid_locations.create_index("country")
        await db.tsrid_locations.create_index("customer")
        await db.tsrid_locations.create_index("status")
        
        # Slots indexes
        await db.tsrid_slots.create_index("slot_id", unique=True)
        await db.tsrid_slots.create_index("location_id")
        await db.tsrid_slots.create_index("bundle_id")
        await db.tsrid_slots.create_index("status")
        
        # Bundles indexes
        await db.tsrid_bundles.create_index("bundle_id", unique=True)
        await db.tsrid_bundles.create_index("country")
        await db.tsrid_bundles.create_index("status")
        
        # Assets indexes
        await db.tsrid_assets.create_index("asset_id", unique=True)
        await db.tsrid_assets.create_index("type")
        await db.tsrid_assets.create_index("bundle_id")
        await db.tsrid_assets.create_index("status")
        await db.tsrid_assets.create_index("manufacturer_sn")
        await db.tsrid_assets.create_index("country")
        
        print("[Asset Management V2] Database indexes created")
    except Exception as e:
        print(f"[Asset Management V2] Index creation error: {e}")


# ============ LOCATIONS ENDPOINTS ============

@router.get("/locations")
async def list_locations(
    country: str = Query(None),
    customer: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all locations with filters"""
    try:
        query = {}
        if country:
            query["country"] = country
        if customer:
            query["customer"] = customer
        if status and status != "all":
            query["status"] = status
        if search:
            query["$or"] = [
                {"location_id": {"$regex": search, "$options": "i"}},
                {"address": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.tsrid_locations.count_documents(query)
        cursor = db.tsrid_locations.find(query).skip(skip).limit(limit).sort("location_id", 1)
        locations = [serialize_doc(loc) async for loc in cursor]
        
        # Get slot counts for each location
        for loc in locations:
            loc["slot_count"] = await db.tsrid_slots.count_documents({"location_id": loc["location_id"]})
            loc["installed_count"] = await db.tsrid_slots.count_documents({
                "location_id": loc["location_id"], 
                "status": "installed"
            })
        
        # Get unique countries for filter
        countries = await db.tsrid_locations.distinct("country")
        customers = await db.tsrid_locations.distinct("customer")
        
        return {
            "success": True,
            "locations": locations,
            "total": total,
            "filters": {
                "countries": countries,
                "customers": customers,
                "statuses": LOCATION_STATUSES
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations/{location_id}")
async def get_location(location_id: str):
    """Get location details with related slots"""
    try:
        location = await db.tsrid_locations.find_one({"location_id": location_id})
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        location = serialize_doc(location)
        
        # Get all slots at this location
        slots_cursor = db.tsrid_slots.find({"location_id": location_id}).sort("slot_id", 1)
        slots = [serialize_doc(slot) async for slot in slots_cursor]
        
        location["slots"] = slots
        location["slot_count"] = len(slots)
        location["installed_count"] = sum(1 for s in slots if s.get("status") == "installed")
        
        return {"success": True, "location": location}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/locations")
async def create_location(location: LocationCreate):
    """Create a new location"""
    try:
        # Check if location_id already exists
        existing = await db.tsrid_locations.find_one({"location_id": location.location_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Location {location.location_id} existiert bereits")
        
        loc_doc = {
            **location.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.tsrid_locations.insert_one(loc_doc)
        
        return {
            "success": True,
            "location_id": location.location_id,
            "message": f"Location {location.location_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/locations/{location_id}")
async def update_location(location_id: str, update: LocationUpdate):
    """Update a location"""
    try:
        location = await db.tsrid_locations.find_one({"location_id": location_id})
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tsrid_locations.update_one(
                {"location_id": location_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Location aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/locations/{location_id}")
async def delete_location(location_id: str):
    """Delete a location (only if no slots exist)"""
    try:
        location = await db.tsrid_locations.find_one({"location_id": location_id})
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        # Check if slots exist
        slot_count = await db.tsrid_slots.count_documents({"location_id": location_id})
        if slot_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Location hat {slot_count} Slots. Bitte zuerst Slots löschen."
            )
        
        await db.tsrid_locations.delete_one({"location_id": location_id})
        
        return {"success": True, "message": f"Location {location_id} gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ SLOTS ENDPOINTS ============

@router.get("/slots")
async def list_slots(
    location_id: str = Query(None),
    status: str = Query(None),
    country: str = Query(None),
    has_bundle: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all slots with filters"""
    try:
        query = {}
        if location_id:
            query["location_id"] = location_id
        if status and status != "all":
            query["status"] = status
        if has_bundle == "yes":
            query["bundle_id"] = {"$ne": None, "$exists": True}
        elif has_bundle == "no":
            query["$or"] = [{"bundle_id": None}, {"bundle_id": {"$exists": False}}]
        if search:
            query["$or"] = [
                {"slot_id": {"$regex": search, "$options": "i"}},
                {"teamviewer_alias": {"$regex": search, "$options": "i"}}
            ]
        
        # Filter by country through location
        location_ids = None
        if country:
            loc_cursor = db.tsrid_locations.find({"country": country}, {"location_id": 1})
            location_ids = [loc["location_id"] async for loc in loc_cursor]
            if location_ids:
                if "location_id" in query:
                    query["location_id"] = {"$in": location_ids, "$eq": query["location_id"]}
                else:
                    query["location_id"] = {"$in": location_ids}
        
        total = await db.tsrid_slots.count_documents(query)
        cursor = db.tsrid_slots.find(query).skip(skip).limit(limit).sort("slot_id", 1)
        slots = [serialize_doc(slot) async for slot in cursor]
        
        # Enrich with location and bundle info
        for slot in slots:
            # Get location info
            loc = await db.tsrid_locations.find_one({"location_id": slot.get("location_id")}, {"country": 1, "city": 1, "customer": 1})
            if loc:
                slot["location_country"] = loc.get("country")
                slot["location_city"] = loc.get("city")
                slot["location_customer"] = loc.get("customer")
            
            # Get bundle info
            if slot.get("bundle_id"):
                bundle = await db.tsrid_bundles.find_one({"bundle_id": slot["bundle_id"]}, {"status": 1})
                if bundle:
                    slot["bundle_status"] = bundle.get("status")
        
        return {
            "success": True,
            "slots": slots,
            "total": total,
            "filters": {
                "statuses": SLOT_STATUSES
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slots/{slot_id}")
async def get_slot(slot_id: str):
    """Get slot details with related location and bundle"""
    try:
        slot = await db.tsrid_slots.find_one({"slot_id": slot_id})
        if not slot:
            raise HTTPException(status_code=404, detail="Slot nicht gefunden")
        
        slot = serialize_doc(slot)
        
        # Get location details
        if slot.get("location_id"):
            location = await db.tsrid_locations.find_one({"location_id": slot["location_id"]})
            slot["location"] = serialize_doc(location) if location else None
        
        # Get bundle details with assets
        if slot.get("bundle_id"):
            bundle = await db.tsrid_bundles.find_one({"bundle_id": slot["bundle_id"]})
            if bundle:
                bundle = serialize_doc(bundle)
                # Get assets in bundle
                assets_cursor = db.tsrid_assets.find({"bundle_id": slot["bundle_id"]})
                bundle["assets"] = [serialize_doc(a) async for a in assets_cursor]
                slot["bundle"] = bundle
        
        return {"success": True, "slot": slot}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slots")
async def create_slot(slot: SlotCreate):
    """Create a new slot"""
    try:
        # Check if slot_id already exists
        existing = await db.tsrid_slots.find_one({"slot_id": slot.slot_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Slot {slot.slot_id} existiert bereits")
        
        # Verify location exists
        location = await db.tsrid_locations.find_one({"location_id": slot.location_id})
        if not location:
            raise HTTPException(status_code=400, detail=f"Location {slot.location_id} nicht gefunden")
        
        slot_doc = {
            **slot.dict(),
            "installed_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.tsrid_slots.insert_one(slot_doc)
        
        return {
            "success": True,
            "slot_id": slot.slot_id,
            "message": f"Slot {slot.slot_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/slots/{slot_id}")
async def update_slot(slot_id: str, update: SlotUpdate):
    """Update a slot"""
    try:
        slot = await db.tsrid_slots.find_one({"slot_id": slot_id})
        if not slot:
            raise HTTPException(status_code=404, detail="Slot nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tsrid_slots.update_one(
                {"slot_id": slot_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Slot aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slots/{slot_id}/install-bundle")
async def install_bundle_to_slot(slot_id: str, bundle_id: str = Query(...), technician: str = Query("")):
    """Install a bundle into a slot"""
    try:
        slot = await db.tsrid_slots.find_one({"slot_id": slot_id})
        if not slot:
            raise HTTPException(status_code=404, detail="Slot nicht gefunden")
        
        bundle = await db.tsrid_bundles.find_one({"bundle_id": bundle_id})
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle nicht gefunden")
        
        # Check if slot already has a bundle
        if slot.get("bundle_id"):
            raise HTTPException(status_code=400, detail=f"Slot hat bereits Bundle {slot['bundle_id']} installiert")
        
        # Check if bundle is already installed elsewhere
        existing_slot = await db.tsrid_slots.find_one({"bundle_id": bundle_id})
        if existing_slot:
            raise HTTPException(status_code=400, detail=f"Bundle bereits installiert in Slot {existing_slot['slot_id']}")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update slot
        await db.tsrid_slots.update_one(
            {"slot_id": slot_id},
            {"$set": {
                "bundle_id": bundle_id,
                "status": "installed",
                "installed_at": now,
                "updated_at": now
            }}
        )
        
        # Update bundle status
        await db.tsrid_bundles.update_one(
            {"bundle_id": bundle_id},
            {"$set": {"status": "deployed", "updated_at": now}}
        )
        
        # Add history to all assets in bundle
        assets_cursor = db.tsrid_assets.find({"bundle_id": bundle_id})
        async for asset in assets_cursor:
            await add_asset_history(
                asset["asset_id"],
                "installed",
                f"Installiert in Slot {slot_id}",
                location_id=slot.get("location_id"),
                slot_id=slot_id,
                bundle_id=bundle_id,
                technician=technician
            )
        
        return {"success": True, "message": f"Bundle {bundle_id} in Slot {slot_id} installiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slots/{slot_id}/uninstall-bundle")
async def uninstall_bundle_from_slot(slot_id: str, technician: str = Query("")):
    """Uninstall bundle from a slot"""
    try:
        slot = await db.tsrid_slots.find_one({"slot_id": slot_id})
        if not slot:
            raise HTTPException(status_code=404, detail="Slot nicht gefunden")
        
        if not slot.get("bundle_id"):
            raise HTTPException(status_code=400, detail="Slot hat kein Bundle installiert")
        
        bundle_id = slot["bundle_id"]
        now = datetime.now(timezone.utc).isoformat()
        
        # Add history to all assets in bundle
        assets_cursor = db.tsrid_assets.find({"bundle_id": bundle_id})
        async for asset in assets_cursor:
            await add_asset_history(
                asset["asset_id"],
                "uninstalled",
                f"Deinstalliert von Slot {slot_id}",
                location_id=slot.get("location_id"),
                slot_id=slot_id,
                bundle_id=bundle_id,
                technician=technician
            )
        
        # Update slot
        await db.tsrid_slots.update_one(
            {"slot_id": slot_id},
            {"$set": {
                "bundle_id": None,
                "status": "empty",
                "installed_at": None,
                "updated_at": now
            }}
        )
        
        # Update bundle status
        await db.tsrid_bundles.update_one(
            {"bundle_id": bundle_id},
            {"$set": {"status": "in_storage", "updated_at": now}}
        )
        
        return {"success": True, "message": f"Bundle {bundle_id} von Slot {slot_id} deinstalliert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/slots/{slot_id}")
async def delete_slot(slot_id: str):
    """Delete a slot (only if empty)"""
    try:
        slot = await db.tsrid_slots.find_one({"slot_id": slot_id})
        if not slot:
            raise HTTPException(status_code=404, detail="Slot nicht gefunden")
        
        if slot.get("bundle_id"):
            raise HTTPException(status_code=400, detail="Slot hat noch ein Bundle installiert. Bitte zuerst deinstallieren.")
        
        await db.tsrid_slots.delete_one({"slot_id": slot_id})
        
        return {"success": True, "message": f"Slot {slot_id} gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ BUNDLES ENDPOINTS ============

@router.get("/bundles")
async def list_bundles(
    country: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all bundles with filters"""
    try:
        query = {}
        if country:
            query["country"] = country
        if status and status != "all":
            query["status"] = status
        if search:
            query["$or"] = [
                {"bundle_id": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.tsrid_bundles.count_documents(query)
        cursor = db.tsrid_bundles.find(query).skip(skip).limit(limit).sort("bundle_id", 1)
        bundles = [serialize_doc(b) async for b in cursor]
        
        # Enrich with asset count and slot info
        for bundle in bundles:
            bundle["asset_count"] = await db.tsrid_assets.count_documents({"bundle_id": bundle["bundle_id"]})
            
            # Check if installed in a slot
            slot = await db.tsrid_slots.find_one({"bundle_id": bundle["bundle_id"]})
            if slot:
                bundle["installed_slot"] = slot.get("slot_id")
                bundle["installed_location"] = slot.get("location_id")
        
        # Get unique countries
        countries = await db.tsrid_bundles.distinct("country")
        
        return {
            "success": True,
            "bundles": bundles,
            "total": total,
            "filters": {
                "countries": countries,
                "statuses": BUNDLE_STATUSES
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bundles/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Get bundle details with all assets"""
    try:
        bundle = await db.tsrid_bundles.find_one({"bundle_id": bundle_id})
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle nicht gefunden")
        
        bundle = serialize_doc(bundle)
        
        # Get all assets in this bundle
        assets_cursor = db.tsrid_assets.find({"bundle_id": bundle_id}).sort("type", 1)
        bundle["assets"] = [serialize_doc(a) async for a in assets_cursor]
        bundle["asset_count"] = len(bundle["assets"])
        
        # Check if installed in a slot
        slot = await db.tsrid_slots.find_one({"bundle_id": bundle_id})
        if slot:
            slot = serialize_doc(slot)
            # Get location info
            if slot.get("location_id"):
                location = await db.tsrid_locations.find_one({"location_id": slot["location_id"]})
                slot["location"] = serialize_doc(location) if location else None
            bundle["slot"] = slot
        
        return {"success": True, "bundle": bundle}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bundles")
async def create_bundle(bundle: BundleCreate):
    """Create a new bundle"""
    try:
        existing = await db.tsrid_bundles.find_one({"bundle_id": bundle.bundle_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Bundle {bundle.bundle_id} existiert bereits")
        
        bundle_doc = {
            **bundle.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.tsrid_bundles.insert_one(bundle_doc)
        
        return {
            "success": True,
            "bundle_id": bundle.bundle_id,
            "message": f"Bundle {bundle.bundle_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bundles/{bundle_id}")
async def update_bundle(bundle_id: str, update: BundleUpdate):
    """Update a bundle"""
    try:
        bundle = await db.tsrid_bundles.find_one({"bundle_id": bundle_id})
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tsrid_bundles.update_one(
                {"bundle_id": bundle_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Bundle aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str):
    """Delete a bundle (only if not installed and no assets)"""
    try:
        bundle = await db.tsrid_bundles.find_one({"bundle_id": bundle_id})
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle nicht gefunden")
        
        # Check if installed
        slot = await db.tsrid_slots.find_one({"bundle_id": bundle_id})
        if slot:
            raise HTTPException(status_code=400, detail=f"Bundle ist in Slot {slot['slot_id']} installiert")
        
        # Check if has assets
        asset_count = await db.tsrid_assets.count_documents({"bundle_id": bundle_id})
        if asset_count > 0:
            raise HTTPException(status_code=400, detail=f"Bundle hat {asset_count} Assets zugewiesen")
        
        await db.tsrid_bundles.delete_one({"bundle_id": bundle_id})
        
        return {"success": True, "message": f"Bundle {bundle_id} gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ ASSETS ENDPOINTS ============

@router.get("/assets")
async def list_assets(
    type: str = Query(None),
    status: str = Query(None),
    bundle_id: str = Query(None),
    country: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all assets with filters"""
    try:
        query = {}
        if type and type != "all":
            query["type"] = type
        if status and status != "all":
            query["status"] = status
        if bundle_id:
            query["bundle_id"] = bundle_id
        if country:
            query["country"] = country
        if search:
            query["$or"] = [
                {"asset_id": {"$regex": search, "$options": "i"}},
                {"manufacturer_sn": {"$regex": search, "$options": "i"}},
                {"imei": {"$regex": search, "$options": "i"}},
                {"mac": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.tsrid_assets.count_documents(query)
        cursor = db.tsrid_assets.find(query).skip(skip).limit(limit).sort("asset_id", 1)
        assets = [serialize_doc(a) async for a in cursor]
        
        # Enrich with bundle/slot/location info
        for asset in assets:
            if asset.get("bundle_id"):
                # Get bundle info
                bundle = await db.tsrid_bundles.find_one({"bundle_id": asset["bundle_id"]})
                if bundle:
                    asset["bundle_status"] = bundle.get("status")
                
                # Check if bundle is installed
                slot = await db.tsrid_slots.find_one({"bundle_id": asset["bundle_id"]})
                if slot:
                    asset["slot_id"] = slot.get("slot_id")
                    asset["location_id"] = slot.get("location_id")
        
        # Get filter options
        types = await db.tsrid_assets.distinct("type")
        countries = await db.tsrid_assets.distinct("country")
        
        return {
            "success": True,
            "assets": assets,
            "total": total,
            "filters": {
                "types": types or ASSET_TYPES,
                "statuses": ASSET_STATUSES,
                "countries": countries
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get asset details with full history and relations"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        asset = serialize_doc(asset)
        
        # Get bundle details
        if asset.get("bundle_id"):
            bundle = await db.tsrid_bundles.find_one({"bundle_id": asset["bundle_id"]})
            if bundle:
                asset["bundle"] = serialize_doc(bundle)
                
                # Check if bundle is installed
                slot = await db.tsrid_slots.find_one({"bundle_id": asset["bundle_id"]})
                if slot:
                    slot = serialize_doc(slot)
                    asset["slot"] = slot
                    
                    # Get location
                    if slot.get("location_id"):
                        location = await db.tsrid_locations.find_one({"location_id": slot["location_id"]})
                        asset["location"] = serialize_doc(location) if location else None
        
        # Sort history by date descending
        if asset.get("history"):
            asset["history"] = sorted(asset["history"], key=lambda x: x.get("date", ""), reverse=True)
        
        return {"success": True, "asset": asset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets")
async def create_asset(asset: AssetCreate):
    """Create a new asset"""
    try:
        existing = await db.tsrid_assets.find_one({"asset_id": asset.asset_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Asset {asset.asset_id} existiert bereits")
        
        # Verify bundle exists if provided
        if asset.bundle_id:
            bundle = await db.tsrid_bundles.find_one({"bundle_id": asset.bundle_id})
            if not bundle:
                raise HTTPException(status_code=400, detail=f"Bundle {asset.bundle_id} nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        asset_doc = {
            **asset.dict(),
            "history": [{
                "date": now,
                "event": "Asset erstellt",
                "event_type": "created",
                "bundle_id": asset.bundle_id,
                "technician": "",
                "notes": ""
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(asset_doc)
        
        return {
            "success": True,
            "asset_id": asset.asset_id,
            "message": f"Asset {asset.asset_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, update: AssetUpdate):
    """Update an asset"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tsrid_assets.update_one(
                {"asset_id": asset_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Asset aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets/{asset_id}/assign-bundle")
async def assign_asset_to_bundle(asset_id: str, bundle_id: str = Query(...), technician: str = Query("")):
    """Assign an asset to a bundle"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        bundle = await db.tsrid_bundles.find_one({"bundle_id": bundle_id})
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle nicht gefunden")
        
        old_bundle_id = asset.get("bundle_id")
        
        # Update asset
        await db.tsrid_assets.update_one(
            {"asset_id": asset_id},
            {"$set": {
                "bundle_id": bundle_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Add history
        await add_asset_history(
            asset_id,
            "assigned_to_bundle",
            f"Zu Bundle {bundle_id} zugewiesen" + (f" (vorher: {old_bundle_id})" if old_bundle_id else ""),
            bundle_id=bundle_id,
            technician=technician
        )
        
        return {"success": True, "message": f"Asset {asset_id} zu Bundle {bundle_id} zugewiesen"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets/{asset_id}/remove-from-bundle")
async def remove_asset_from_bundle(asset_id: str, technician: str = Query("")):
    """Remove an asset from its bundle"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        if not asset.get("bundle_id"):
            raise HTTPException(status_code=400, detail="Asset ist keinem Bundle zugewiesen")
        
        old_bundle_id = asset["bundle_id"]
        
        # Update asset
        await db.tsrid_assets.update_one(
            {"asset_id": asset_id},
            {"$set": {
                "bundle_id": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Add history
        await add_asset_history(
            asset_id,
            "removed_from_bundle",
            f"Von Bundle {old_bundle_id} entfernt",
            bundle_id=old_bundle_id,
            technician=technician
        )
        
        return {"success": True, "message": f"Asset {asset_id} von Bundle entfernt"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets/{asset_id}/add-history")
async def add_asset_history_event(asset_id: str, event: AssetHistoryEvent):
    """Add a custom history event to an asset"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        await add_asset_history(
            asset_id,
            event.event_type,
            event.event,
            location_id=event.location_id,
            slot_id=event.slot_id,
            bundle_id=event.bundle_id,
            technician=event.technician,
            notes=event.notes
        )
        
        return {"success": True, "message": "Historie hinzugefügt"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    """Delete an asset"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        await db.tsrid_assets.delete_one({"asset_id": asset_id})
        
        return {"success": True, "message": f"Asset {asset_id} gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ STATISTICS ENDPOINT ============

@router.get("/stats")
async def get_statistics():
    """Get overall statistics for dashboard"""
    try:
        stats = {
            "locations": {
                "total": await db.tsrid_locations.count_documents({}),
                "active": await db.tsrid_locations.count_documents({"status": "active"}),
                "planned": await db.tsrid_locations.count_documents({"status": "planned"})
            },
            "slots": {
                "total": await db.tsrid_slots.count_documents({}),
                "installed": await db.tsrid_slots.count_documents({"status": "installed"}),
                "empty": await db.tsrid_slots.count_documents({"status": "empty"})
            },
            "bundles": {
                "total": await db.tsrid_bundles.count_documents({}),
                "deployed": await db.tsrid_bundles.count_documents({"status": "deployed"}),
                "in_storage": await db.tsrid_bundles.count_documents({"status": "in_storage"})
            },
            "assets": {
                "total": await db.tsrid_assets.count_documents({}),
                "deployed": await db.tsrid_assets.count_documents({"status": "deployed"}),
                "in_storage": await db.tsrid_assets.count_documents({"status": "in_storage"})
            }
        }
        
        # Assets by type
        type_pipeline = [
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        type_cursor = db.tsrid_assets.aggregate(type_pipeline)
        stats["assets"]["by_type"] = {item["_id"]: item["count"] async for item in type_cursor}
        
        # Locations by country
        country_pipeline = [
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        country_cursor = db.tsrid_locations.aggregate(country_pipeline)
        stats["locations"]["by_country"] = {item["_id"]: item["count"] async for item in country_cursor}
        
        return {"success": True, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
