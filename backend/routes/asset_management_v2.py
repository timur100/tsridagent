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
# Multi-tenant DB für europcar_devices
multi_tenant_db = client['multi_tenant_admin']

# ============ ENUMS ============
LOCATION_STATUSES = ['active', 'inactive', 'planned', 'decommissioned']
SLOT_STATUSES = ['empty', 'installed', 'maintenance', 'reserved']
KIT_STATUSES = ['in_storage', 'deployed', 'in_transit', 'maintenance', 'retired']  # Renamed from BUNDLE_STATUSES

# Erweiterte Asset-Typen mit spezifischen Geräten
# Format: [typ]-[modell] z.B. TAB-SP4, SCA-TSR
ASSET_TYPES = [
    # Tablets
    'tab_sp4',      # Surface Pro 4
    'tab_sp6',      # Surface Pro 6
    'tab_tsr',      # TSRID Tablet
    # Scanner
    'sca_tsr',      # TSRID Scanner
    'sca_dsk',      # Desko Scanner
    # Tablet Docking Stations
    'tdo_qer',      # Quer Dock (für SP4/SP6)
    'tdo_tsr',      # TSRID Tablet Dock
    # Scanner Docking Stations
    'sdo_dsk',      # Desko Scanner Dock
    'sdo_tsr',      # TSRID Scanner Dock
    # Tablet Netzteile
    'tps_spx',      # Surface PSU (für SP4, SP6, etc.)
    'tps_tsr',      # TSRID Tablet/Dock PSU
    # Scanner Netzteile
    'sps_dsk',      # Desko Scanner PSU
    'sps_tsr',      # TSRID Scanner PSU
    # Extensions (ohne Modell-Suffix)
    'usb',          # USB Extension
    'lan',          # LAN Extension
    '12v',          # 12V Extension
    # Kabel - Typ A (Geräte mit Seriennummer-Tracking)
    'cab_usb_a',    # USB-A Kabel
    'cab_usb_c',    # USB-C Kabel
    'cab_lan',      # LAN-Kabel
    'cab_hdmi',     # HDMI-Kabel
    'cab_dp',       # DisplayPort-Kabel
    'cab_pwr',      # Stromkabel
    # Kabel - Typ B (Verbrauchsmaterial ohne SN-Tracking)
    'cns_usb_a',    # USB-A Kabel (Consumable)
    'cns_usb_c',    # USB-C Kabel (Consumable)
    'cns_lan',      # LAN-Kabel (Consumable)
    'cns_hdmi',     # HDMI-Kabel (Consumable)
    'cns_dp',       # DisplayPort-Kabel (Consumable)
    'cns_pwr',      # Stromkabel (Consumable)
    # Adapter
    'adp_usb_c',    # USB-C Adapter/Hub
    'adp_hdmi',     # HDMI Adapter
    'adp_dp',       # DisplayPort Adapter
    'adp_90',       # 90° Adapter
    # Netzleisten & Stromverteiler
    'pwr_strip',    # Netzleiste (Steckdosenleiste)
    'pwr_12v',      # 12V Verteiler
    # Kits
    'kit_sfd',      # Surface + Desko Kit
    'kit_tsr',      # TSRID Kit
    # Sonstiges
    'other'
]

# Asset-Typ zu Suffix Mapping für Asset-ID Generierung
# Format: asset_id = [device_id]-[TYP]-[MODELL]
# Beispiel: AAHC01-01-TAB-SP4 (Surface Pro 4 Tablet)
# Beispiel: AAHC01-01-SCA-TSR (TSRID Scanner)
ASSET_TYPE_SUFFIX_MAP = {
    # Tablets -> TAB-xxx
    'tab_sp4': 'TAB-SP4',       # Surface Pro 4
    'tab_sp6': 'TAB-SP6',       # Surface Pro 6
    'tab_tsr': 'TAB-TSR',       # TSRID Tablet
    # Scanner -> SCA-xxx
    'sca_tsr': 'SCA-TSR',       # TSRID Scanner
    'sca_dsk': 'SCA-DSK',       # Desko Scanner
    # Tablet Docking -> TDO-xxx
    'tdo_qer': 'TDO-QER',       # Quer Dock (SP4/SP6)
    'tdo_tsr': 'TDO-TSR',       # TSRID Tablet Dock
    # Scanner Docking -> SDO-xxx
    'sdo_dsk': 'SDO-DSK',       # Desko Scanner Dock
    'sdo_tsr': 'SDO-TSR',       # TSRID Scanner Dock
    # Tablet PSU -> TPS-xxx
    'tps_spx': 'TPS-SPX',       # Surface PSU
    'tps_tsr': 'TPS-TSR',       # TSRID PSU
    # Scanner PSU -> SPS-xxx
    'sps_dsk': 'SPS-DSK',       # Desko Scanner PSU
    'sps_tsr': 'SPS-TSR',       # TSRID Scanner PSU
    # Extensions (ohne Modell-Suffix)
    'usb': 'USB',
    'lan': 'LAN',
    '12v': '12V',
    # Kabel Typ A (mit SN-Tracking) -> CAB-xxx
    'cab_usb_a': 'CAB-USBA',    # USB-A Kabel
    'cab_usb_c': 'CAB-USBC',    # USB-C Kabel
    'cab_lan': 'CAB-LAN',       # LAN-Kabel
    'cab_hdmi': 'CAB-HDMI',     # HDMI-Kabel
    'cab_dp': 'CAB-DP',         # DisplayPort-Kabel
    'cab_pwr': 'CAB-PWR',       # Stromkabel
    # Kabel Typ B (Consumables ohne SN) -> CNS-xxx
    'cns_usb_a': 'CNS-USBA',    # USB-A Kabel (Consumable)
    'cns_usb_c': 'CNS-USBC',    # USB-C Kabel (Consumable)
    'cns_lan': 'CNS-LAN',       # LAN-Kabel (Consumable)
    'cns_hdmi': 'CNS-HDMI',     # HDMI-Kabel (Consumable)
    'cns_dp': 'CNS-DP',         # DisplayPort-Kabel (Consumable)
    'cns_pwr': 'CNS-PWR',       # Stromkabel (Consumable)
    # Adapter -> ADP-xxx
    'adp_usb_c': 'ADP-USBC',    # USB-C Adapter/Hub
    'adp_hdmi': 'ADP-HDMI',     # HDMI Adapter
    'adp_dp': 'ADP-DP',         # DisplayPort Adapter
    'adp_90': 'ADP-90',         # 90° Adapter
    # Stromverteiler -> PWR-xxx
    'pwr_strip': 'PWR-STRIP',   # Netzleiste
    'pwr_12v': 'PWR-12V',       # 12V Verteiler
    # Kits -> KIT-xxx
    'kit_sfd': 'KIT-SFD',       # Surface + Desko Kit
    'kit_tsr': 'KIT-TSR',       # TSRID Kit
    # Sonstiges
    'other': 'OTH'
}

# Asset-Typ Labels für UI (Deutsch)
ASSET_TYPE_LABELS = {
    'tab_sp4': 'Surface Pro 4',
    'tab_sp6': 'Surface Pro 6',
    'tab_tsr': 'TSRID Tablet',
    'sca_tsr': 'TSRID Scanner',
    'sca_dsk': 'Desko Scanner',
    'tdo_qer': 'Quer Dock (Surface)',
    'tdo_tsr': 'TSRID Tablet Dock',
    'sdo_dsk': 'Desko Scanner Dock',
    'sdo_tsr': 'TSRID Scanner Dock',
    'tps_spx': 'Surface Netzteil',
    'tps_tsr': 'TSRID Tablet Netzteil',
    'sps_dsk': 'Desko Scanner Netzteil',
    'sps_tsr': 'TSRID Scanner Netzteil',
    'usb': 'USB Extension',
    'lan': 'LAN Extension',
    '12v': '12V Extension',
    'kit_sfd': 'Surface + Desko Kit',
    'kit_tsr': 'TSRID Kit',
    'other': 'Sonstiges'
}

def get_asset_type_suffix(asset_type: str) -> str:
    """Get the suffix for an asset type for ID generation"""
    return ASSET_TYPE_SUFFIX_MAP.get(asset_type, 'OTH')

# Hersteller-Liste
MANUFACTURERS = [
    'Microsoft', 'Desko', 'Regula', 'Samsung', 'Lenovo', 'HP', 'Dell', 
    'Anker', 'Belkin', 'Ugreen', 'TSRID', 'Other'
]

ASSET_STATUSES = ['in_storage', 'deployed', 'in_transit', 'maintenance', 'defective', 'retired']
EVENT_TYPES = ['created', 'assigned_to_bundle', 'removed_from_bundle', 'installed', 'uninstalled', 'replaced', 'maintenance', 'status_change', 'license_activated', 'license_expired', 'note', 'linked_device', 'unlinked_device']


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
    # Verknüpfung mit europcar_devices
    linked_device_id: Optional[str] = None  # Referenz auf europcar_devices.device_id
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
    # Verknüpfung mit europcar_devices
    linked_device_id: Optional[str] = None
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


# ============ METADATA ENDPOINTS ============

@router.get("/metadata")
async def get_metadata():
    """Get available asset types, manufacturers, and other metadata including ID suffixes"""
    # Asset-Typ-Kategorien mit deutschen Labels und ID-Suffixen
    # Neues Format: [device_id]-[TYP]-[MODELL] z.B. AAHC01-01-TAB-SP4
    asset_type_categories = {
        "Tablets": [
            {"value": "tab_sp4", "label": "Surface Pro 4", "suffix": "TAB-SP4"},
            {"value": "tab_sp6", "label": "Surface Pro 6", "suffix": "TAB-SP6"},
            {"value": "tab_tsr", "label": "TSRID Tablet", "suffix": "TAB-TSR"},
        ],
        "Scanner": [
            {"value": "sca_tsr", "label": "TSRID Scanner", "suffix": "SCA-TSR"},
            {"value": "sca_dsk", "label": "Desko Scanner", "suffix": "SCA-DSK"},
        ],
        "Tablet Docks": [
            {"value": "tdo_qer", "label": "Quer Dock (Surface)", "suffix": "TDO-QER"},
            {"value": "tdo_tsr", "label": "TSRID Tablet Dock", "suffix": "TDO-TSR"},
        ],
        "Scanner Docks": [
            {"value": "sdo_dsk", "label": "Desko Scanner Dock", "suffix": "SDO-DSK"},
            {"value": "sdo_tsr", "label": "TSRID Scanner Dock", "suffix": "SDO-TSR"},
        ],
        "Tablet Netzteile": [
            {"value": "tps_spx", "label": "Surface Netzteil", "suffix": "TPS-SPX"},
            {"value": "tps_tsr", "label": "TSRID Tablet Netzteil", "suffix": "TPS-TSR"},
        ],
        "Scanner Netzteile": [
            {"value": "sps_dsk", "label": "Desko Scanner Netzteil", "suffix": "SPS-DSK"},
            {"value": "sps_tsr", "label": "TSRID Scanner Netzteil", "suffix": "SPS-TSR"},
        ],
        "Extensions": [
            {"value": "usb", "label": "USB Extension", "suffix": "USB"},
            {"value": "lan", "label": "LAN Extension", "suffix": "LAN"},
            {"value": "12v", "label": "12V Extension", "suffix": "12V"},
        ],
        "Kits": [
            {"value": "kit_sfd", "label": "Surface + Desko Kit", "suffix": "KIT-SFD"},
            {"value": "kit_tsr", "label": "TSRID Kit", "suffix": "KIT-TSR"},
        ],
        "Sonstiges": [
            {"value": "other", "label": "Sonstiges", "suffix": "OTH"},
        ]
    }
    
    manufacturers = [
        {"value": "Microsoft", "label": "Microsoft"},
        {"value": "Desko", "label": "Desko"},
        {"value": "TSRID", "label": "TSRID"},
        {"value": "Other", "label": "Sonstiger Hersteller"},
    ]
    
    warranty_types = [
        {"value": "standard", "label": "Standard-Garantie"},
        {"value": "extended", "label": "Erweiterte Garantie"},
        {"value": "on_site", "label": "Vor-Ort-Service"},
        {"value": "next_business_day", "label": "Next Business Day"},
        {"value": "none", "label": "Keine Garantie"},
    ]
    
    license_types = [
        {"value": "perpetual", "label": "Dauerlizenz"},
        {"value": "subscription", "label": "Abo-Lizenz"},
        {"value": "oem", "label": "OEM-Lizenz"},
        {"value": "volume", "label": "Volumenlizenz"},
        {"value": "trial", "label": "Testlizenz"},
        {"value": "none", "label": "Keine Lizenz erforderlich"},
    ]
    
    return {
        "success": True,
        "asset_types": ASSET_TYPES,
        "asset_type_categories": asset_type_categories,
        "asset_type_labels": ASSET_TYPE_LABELS,
        "asset_type_suffix_map": ASSET_TYPE_SUFFIX_MAP,
        "manufacturers": manufacturers,
        "warranty_types": warranty_types,
        "license_types": license_types,
        "statuses": ASSET_STATUSES,
        "location_statuses": LOCATION_STATUSES,
        "slot_statuses": SLOT_STATUSES,
        "kit_statuses": KIT_STATUSES
    }


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



# ============ DEVICE-ASSET LINKING ENDPOINTS ============

async def get_device_by_id(device_id: str):
    """Helper to fetch device from europcar_devices"""
    device = await multi_tenant_db.europcar_devices.find_one({"device_id": device_id})
    if device and "_id" in device:
        device["_id"] = str(device["_id"])
    return device


async def enrich_asset_with_device_data(asset: dict):
    """Enrich asset with live data from linked device"""
    if not asset.get("linked_device_id"):
        return asset
    
    device = await get_device_by_id(asset["linked_device_id"])
    if device:
        # Synchronisiere Device-Daten ins Asset
        asset["device_data"] = {
            "device_id": device.get("device_id"),
            "locationcode": device.get("locationcode"),
            "city": device.get("city"),
            "country": device.get("country"),
            "sn_pc": device.get("sn_pc"),
            "sn_sc": device.get("sn_sc"),
            "status": device.get("status"),
            "customer": device.get("customer"),
            "tvid": device.get("tvid"),
            "teamviewer_online": device.get("teamviewer_online"),
            "teamviewer_last_seen": device.get("teamviewer_last_seen"),
            "tenant_id": device.get("tenant_id")
        }
    return asset


@router.get("/devices/unlinked")
async def get_unlinked_devices(
    tenant_id: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get all devices from europcar_devices that don't have an asset_id yet"""
    try:
        query = {
            "$or": [
                {"asset_id": {"$exists": False}},
                {"asset_id": None},
                {"asset_id": ""}
            ]
        }
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if search:
            query["$and"] = query.get("$and", [])
            query["$and"].append({
                "$or": [
                    {"device_id": {"$regex": search, "$options": "i"}},
                    {"locationcode": {"$regex": search, "$options": "i"}},
                    {"city": {"$regex": search, "$options": "i"}},
                    {"sn_pc": {"$regex": search, "$options": "i"}},
                    {"sn_sc": {"$regex": search, "$options": "i"}}
                ]
            })
        
        total = await multi_tenant_db.europcar_devices.count_documents(query)
        cursor = multi_tenant_db.europcar_devices.find(query, {"_id": 0}).skip(skip).limit(limit).sort("device_id", 1)
        devices = [doc async for doc in cursor]
        
        # Get unique tenant_ids for filter
        tenant_ids = await multi_tenant_db.europcar_devices.distinct("tenant_id")
        
        return {
            "success": True,
            "devices": devices,
            "total": total,
            "filters": {
                "tenant_ids": tenant_ids
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/linked")
async def get_linked_devices(
    tenant_id: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get all devices that already have an asset_id"""
    try:
        query = {
            "asset_id": {"$exists": True, "$nin": [None, ""]}
        }
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if search:
            query["$and"] = query.get("$and", [])
            query["$and"].append({
                "$or": [
                    {"device_id": {"$regex": search, "$options": "i"}},
                    {"asset_id": {"$regex": search, "$options": "i"}},
                    {"locationcode": {"$regex": search, "$options": "i"}}
                ]
            })
        
        total = await multi_tenant_db.europcar_devices.count_documents(query)
        cursor = multi_tenant_db.europcar_devices.find(query, {"_id": 0}).skip(skip).limit(limit).sort("device_id", 1)
        devices = [doc async for doc in cursor]
        
        return {
            "success": True,
            "devices": devices,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/all")
async def get_all_devices_with_asset_status(
    tenant_id: str = Query(None),
    has_asset: str = Query(None),  # 'yes', 'no', or None for all
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get all devices with their asset linking status"""
    try:
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if has_asset == "yes":
            query["asset_id"] = {"$exists": True, "$nin": [None, ""]}
        elif has_asset == "no":
            query["$or"] = [
                {"asset_id": {"$exists": False}},
                {"asset_id": None},
                {"asset_id": ""}
            ]
        
        if search:
            search_query = {
                "$or": [
                    {"device_id": {"$regex": search, "$options": "i"}},
                    {"asset_id": {"$regex": search, "$options": "i"}},
                    {"locationcode": {"$regex": search, "$options": "i"}},
                    {"city": {"$regex": search, "$options": "i"}},
                    {"sn_pc": {"$regex": search, "$options": "i"}}
                ]
            }
            if query:
                query = {"$and": [query, search_query]}
            else:
                query = search_query
        
        total = await multi_tenant_db.europcar_devices.count_documents(query)
        cursor = multi_tenant_db.europcar_devices.find(query, {"_id": 0}).skip(skip).limit(limit).sort("device_id", 1)
        devices = [doc async for doc in cursor]
        
        # Stats
        total_all = await multi_tenant_db.europcar_devices.count_documents({} if not tenant_id else {"tenant_id": tenant_id})
        with_asset = await multi_tenant_db.europcar_devices.count_documents({
            "asset_id": {"$exists": True, "$nin": [None, ""]},
            **({"tenant_id": tenant_id} if tenant_id else {})
        })
        without_asset = total_all - with_asset
        
        # Get unique tenant_ids for filter
        tenant_ids = await multi_tenant_db.europcar_devices.distinct("tenant_id")
        
        return {
            "success": True,
            "devices": devices,
            "total": total,
            "stats": {
                "total_devices": total_all,
                "with_asset": with_asset,
                "without_asset": without_asset
            },
            "filters": {
                "tenant_ids": tenant_ids
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateAssetFromDeviceRequest(BaseModel):
    device_id: str
    asset_type: str = "tablet"
    additional_data: Optional[Dict[str, Any]] = {}


@router.post("/devices/{device_id}/create-asset")
async def create_asset_from_device(device_id: str, request: CreateAssetFromDeviceRequest):
    """Create a new asset from an existing device and link them.
    
    Asset-ID Format: [location_prefix]-[device_num]-[type_suffix]
    Example: AAHC01-01-TAB (Tablet), AAHC01-01-SCA (Scanner)
    """
    try:
        # Get the device
        device = await multi_tenant_db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail=f"Device {device_id} nicht gefunden")
        
        # Check if device already has an asset
        if device.get("asset_id"):
            raise HTTPException(status_code=400, detail=f"Device {device_id} hat bereits Asset {device['asset_id']}")
        
        # Generate asset_id with new format: [device_id]-[type_suffix]
        # E.g., device_id "AAHC01-01" + asset_type "tsrid_tablet" -> "AAHC01-01-TAB"
        type_suffix = get_asset_type_suffix(request.asset_type)
        asset_id = f"{device_id}-{type_suffix}"
        
        # Check if asset_id already exists
        existing_asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if existing_asset:
            raise HTTPException(status_code=400, detail=f"Asset {asset_id} existiert bereits")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Map device status to asset status
        device_status = device.get("status", "").lower()
        asset_status = "deployed" if device_status == "online" else "in_storage" if device_status == "in_vorbereitung" else "deployed"
        
        # Create asset document with device data
        asset_doc = {
            "asset_id": asset_id,
            "type": request.asset_type,
            "linked_device_id": device_id,
            "manufacturer_sn": device.get("sn_pc", ""),
            "country": device.get("country", ""),
            "status": asset_status,
            # Additional data from request
            **request.additional_data,
            # History
            "history": [{
                "date": now,
                "event": f"Asset erstellt aus Device {device_id}",
                "event_type": "created",
                "notes": f"Location: {device.get('locationcode', '')}, City: {device.get('city', '')}, Typ-Suffix: {type_suffix}"
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(asset_doc)
        
        # Update device with asset_id reference
        await multi_tenant_db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": {"asset_id": asset_id, "asset_updated_at": now}}
        )
        
        return {
            "success": True,
            "asset_id": asset_id,
            "device_id": device_id,
            "message": f"Asset {asset_id} erstellt und mit Device {device_id} verknüpft"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/devices/{device_id}/link-asset")
async def link_device_to_existing_asset(device_id: str, asset_id: str = Query(...)):
    """Link an existing device to an existing asset"""
    try:
        # Get the device
        device = await multi_tenant_db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail=f"Device {device_id} nicht gefunden")
        
        # Get the asset
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} nicht gefunden")
        
        # Check if device already has an asset
        if device.get("asset_id") and device.get("asset_id") != asset_id:
            raise HTTPException(status_code=400, detail=f"Device {device_id} ist bereits mit Asset {device['asset_id']} verknüpft")
        
        # Check if asset already has a different device
        if asset.get("linked_device_id") and asset.get("linked_device_id") != device_id:
            raise HTTPException(status_code=400, detail=f"Asset {asset_id} ist bereits mit Device {asset['linked_device_id']} verknüpft")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update device
        await multi_tenant_db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": {"asset_id": asset_id, "asset_updated_at": now}}
        )
        
        # Update asset
        await db.tsrid_assets.update_one(
            {"asset_id": asset_id},
            {
                "$set": {
                    "linked_device_id": device_id,
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event": f"Mit Device {device_id} verknüpft",
                        "event_type": "linked_device",
                        "notes": f"Location: {device.get('locationcode', '')}"
                    }
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Device {device_id} mit Asset {asset_id} verknüpft"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/devices/{device_id}/unlink-asset")
async def unlink_device_from_asset(device_id: str):
    """Remove the link between a device and its asset"""
    try:
        # Get the device
        device = await multi_tenant_db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail=f"Device {device_id} nicht gefunden")
        
        asset_id = device.get("asset_id")
        if not asset_id:
            raise HTTPException(status_code=400, detail=f"Device {device_id} hat kein verknüpftes Asset")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update device - remove asset_id
        await multi_tenant_db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$unset": {"asset_id": ""}, "$set": {"asset_updated_at": now}}
        )
        
        # Update asset - remove linked_device_id and add history
        await db.tsrid_assets.update_one(
            {"asset_id": asset_id},
            {
                "$unset": {"linked_device_id": ""},
                "$set": {"updated_at": now},
                "$push": {
                    "history": {
                        "date": now,
                        "event": f"Verknüpfung mit Device {device_id} entfernt",
                        "event_type": "unlinked_device",
                        "notes": ""
                    }
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Verknüpfung zwischen Device {device_id} und Asset {asset_id} entfernt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assets/{asset_id}/with-device")
async def get_asset_with_device_data(asset_id: str):
    """Get asset details with live device data"""
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset nicht gefunden")
        
        asset = serialize_doc(asset)
        
        # Enrich with live device data
        asset = await enrich_asset_with_device_data(asset)
        
        # Get bundle details if assigned
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


@router.post("/devices/bulk-create-assets")
async def bulk_create_assets_from_devices(device_ids: List[str], asset_type: str = Query("tablet")):
    """Create assets for multiple devices at once with new ID format.
    
    Asset-ID Format: [device_id]-[type_suffix]
    Example: AAHC01-01-TAB
    """
    try:
        results = []
        success_count = 0
        error_count = 0
        type_suffix = get_asset_type_suffix(asset_type)
        
        for device_id in device_ids:
            try:
                device = await multi_tenant_db.europcar_devices.find_one({"device_id": device_id})
                if not device:
                    results.append({"device_id": device_id, "success": False, "error": "Device nicht gefunden"})
                    error_count += 1
                    continue
                
                if device.get("asset_id"):
                    results.append({"device_id": device_id, "success": False, "error": f"Bereits verknüpft mit {device['asset_id']}"})
                    error_count += 1
                    continue
                
                # New format: [device_id]-[type_suffix]
                asset_id = f"{device_id}-{type_suffix}"
                
                existing_asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
                if existing_asset:
                    results.append({"device_id": device_id, "success": False, "error": f"Asset {asset_id} existiert bereits"})
                    error_count += 1
                    continue
                
                now = datetime.now(timezone.utc).isoformat()
                device_status = device.get("status", "").lower()
                asset_status = "deployed" if device_status == "online" else "in_storage"
                
                asset_doc = {
                    "asset_id": asset_id,
                    "type": asset_type,
                    "linked_device_id": device_id,
                    "manufacturer_sn": device.get("sn_pc", ""),
                    "country": device.get("country", ""),
                    "status": asset_status,
                    "history": [{
                        "date": now,
                        "event": f"Asset erstellt aus Device {device_id} (Bulk-Import)",
                        "event_type": "created",
                        "notes": f"Location: {device.get('locationcode', '')}, Typ-Suffix: {type_suffix}"
                    }],
                    "created_at": now,
                    "updated_at": now
                }
                
                await db.tsrid_assets.insert_one(asset_doc)
                
                await multi_tenant_db.europcar_devices.update_one(
                    {"device_id": device_id},
                    {"$set": {"asset_id": asset_id, "asset_updated_at": now}}
                )
                
                results.append({"device_id": device_id, "asset_id": asset_id, "success": True})
                success_count += 1
                
            except Exception as e:
                results.append({"device_id": device_id, "success": False, "error": str(e)})
                error_count += 1
        
        return {
            "success": True,
            "summary": {
                "total": len(device_ids),
                "success": success_count,
                "errors": error_count
            },
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
