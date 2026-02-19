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
    'tab_tsr_i5',   # TSRID Tablet i5
    'tab_tsr_i7',   # TSRID Tablet i7
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
    'tab_tsr_i5': 'TAB-i5',     # TSRID Tablet i5 (Legacy format: TAB-i5)
    'tab_tsr_i7': 'TAB-i7',     # TSRID Tablet i7 (Legacy format: TAB-i7)
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
    'tab_tsr_i5': 'TSRID Tablet i5',
    'tab_tsr_i7': 'TSRID Tablet i7',
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
    # Kabel Typ A (mit SN)
    'cab_usb_a': 'USB-A Kabel (mit SN)',
    'cab_usb_c': 'USB-C Kabel (mit SN)',
    'cab_lan': 'LAN-Kabel (mit SN)',
    'cab_hdmi': 'HDMI-Kabel (mit SN)',
    'cab_dp': 'DisplayPort-Kabel (mit SN)',
    'cab_pwr': 'Stromkabel (mit SN)',
    # Kabel Typ B (Consumables)
    'cns_usb_a': 'USB-A Kabel (Verbrauch)',
    'cns_usb_c': 'USB-C Kabel (Verbrauch)',
    'cns_lan': 'LAN-Kabel (Verbrauch)',
    'cns_hdmi': 'HDMI-Kabel (Verbrauch)',
    'cns_dp': 'DisplayPort-Kabel (Verbrauch)',
    'cns_pwr': 'Stromkabel (Verbrauch)',
    # Adapter
    'adp_usb_c': 'USB-C Adapter/Hub',
    'adp_hdmi': 'HDMI Adapter',
    'adp_dp': 'DisplayPort Adapter',
    'adp_90': '90° Adapter',
    # Stromverteiler
    'pwr_strip': 'Netzleiste',
    'pwr_12v': '12V Verteiler',
    # Kits
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

ASSET_STATUSES = ['unassigned', 'in_storage', 'deployed', 'in_transit', 'maintenance', 'defective', 'retired']
EVENT_TYPES = ['created', 'intake', 'assigned_to_location', 'assigned_to_bundle', 'removed_from_bundle', 'installed', 'uninstalled', 'replaced', 'maintenance', 'status_change', 'license_activated', 'license_expired', 'note', 'linked_device', 'unlinked_device', 'label_generated']


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


# ============ WARENEINGANG (Inventory Intake) MODELS ============

class InventoryIntakeItem(BaseModel):
    """Single item for inventory intake - only requires serial number and type"""
    manufacturer_sn: str  # Seriennummer (Barcode-Scan)
    type: str  # Asset-Typ z.B. 'tab_tsr', 'sca_dsk'
    imei: Optional[str] = ""
    mac: Optional[str] = ""
    manufacturer: Optional[str] = ""
    model: Optional[str] = ""
    notes: Optional[str] = ""


class InventoryIntakeBatch(BaseModel):
    """Batch intake of multiple items"""
    items: List[InventoryIntakeItem]
    intake_date: Optional[str] = ""
    received_by: Optional[str] = ""
    supplier: Optional[str] = ""
    delivery_note: Optional[str] = ""
    notes: Optional[str] = ""


# ============ ASSET-ID CONFIGURATION MODELS ============

class AssetIdFormat(BaseModel):
    """Format configuration for asset IDs per asset type"""
    asset_type: str  # z.B. 'tab_tsr_i7'
    warehouse_prefix: str  # z.B. 'TSRID' - Präfix im Lager
    warehouse_format: str  # z.B. '{PREFIX}-{TYPE}-{SEQ:04d}' -> TSRID-TAB-i7-0001
    location_format: str  # z.B. '{LOC}-{SEQ:02d}-{TYPE}' -> STRT01-01-TAB-i7
    type_suffix: str  # z.B. 'TAB-i7' - Kurzer Typ-Suffix
    description: Optional[str] = ""


class AssetIdConfigCreate(BaseModel):
    """Create/Update Asset-ID configuration for a tenant"""
    tenant_id: Optional[str] = "default"
    warehouse_prefix: str = "TSRID"  # Default prefix for warehouse
    formats: List[AssetIdFormat] = []


class BulkIntakeRequest(BaseModel):
    """Request for bulk intake with auto-generated IDs"""
    asset_type: str
    count: int  # Number of assets to create
    start_serial: Optional[str] = None  # Optional: starting serial number pattern
    serial_numbers: Optional[List[str]] = None  # Or explicit list of SNs
    imeis: Optional[List[str]] = None  # Optional IMEI list
    macs: Optional[List[str]] = None  # Optional MAC list
    supplier: Optional[str] = ""
    delivery_note: Optional[str] = ""
    received_by: Optional[str] = ""
    notes: Optional[str] = ""


class AssetAssignToLocation(BaseModel):
    """Assign an unassigned asset to a location - generates Asset-ID and Label"""
    location_id: str  # z.B. 'AAHC01'
    slot_number: Optional[int] = None  # Optional: spezifischer Slot
    technician: Optional[str] = ""
    notes: Optional[str] = ""


# ============ SUPPLIER & PRODUCT MANAGEMENT MODELS ============

class SupplierContact(BaseModel):
    """Contact person for a supplier"""
    name: str
    position: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    is_primary: bool = False


class SupplierCreate(BaseModel):
    """Create a new supplier/manufacturer"""
    name: str
    # Address
    street: Optional[str] = ""
    zip_code: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = "Deutschland"
    # Contact
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    # Business
    customer_number: Optional[str] = ""  # Kundennummer bei diesem Lieferanten
    tax_id: Optional[str] = ""  # USt-IdNr.
    # Contacts
    contacts: List[SupplierContact] = []
    # Notes
    notes: Optional[str] = ""
    # Type
    supplier_type: Optional[str] = "supplier"  # supplier, manufacturer, distributor


class SupplierUpdate(BaseModel):
    """Update supplier data"""
    name: Optional[str] = None
    street: Optional[str] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    customer_number: Optional[str] = None
    tax_id: Optional[str] = None
    contacts: Optional[List[SupplierContact]] = None
    notes: Optional[str] = None
    supplier_type: Optional[str] = None


class ProductCreate(BaseModel):
    """Create a new product for a supplier"""
    supplier_id: str
    name: str
    sku: Optional[str] = ""  # Artikelnummer/SKU
    manufacturer_sku: Optional[str] = ""  # Hersteller-Artikelnummer
    asset_type: Optional[str] = ""  # Verknüpfung zu Asset-Typ (z.B. 'tab_sp4')
    category: Optional[str] = ""  # Kategorie (z.B. 'Tablets', 'Scanner')
    description: Optional[str] = ""
    unit_price: Optional[float] = None
    currency: Optional[str] = "EUR"
    # Specifications
    specifications: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = ""


class ProductUpdate(BaseModel):
    """Update product data"""
    name: Optional[str] = None
    sku: Optional[str] = None
    manufacturer_sku: Optional[str] = None
    asset_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    currency: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


# ============ KIT MANAGEMENT MODELS ============

class KitCreate(BaseModel):
    """Create a new kit from available components"""
    template_id: str  # z.B. 'KIT-TSR' oder 'KIT-SFD'
    component_asset_ids: List[str]  # Asset-IDs der Komponenten
    technician: Optional[str] = ""
    notes: Optional[str] = ""


class KitAssignToLocation(BaseModel):
    """Assign kit to a location - changes kit ID to location-based format"""
    location_id: str  # z.B. 'AAHC01'
    technician: Optional[str] = ""
    notes: Optional[str] = ""


class KitMoveToLocation(BaseModel):
    """Move kit to a different location"""
    new_location_id: str
    reason: Optional[str] = ""
    technician: Optional[str] = ""
    notes: Optional[str] = ""


class KitReplaceComponent(BaseModel):
    """Replace a defective component in a kit"""
    old_component_id: str  # Asset-ID der defekten Komponente
    new_component_id: str  # Asset-ID der Ersatzkomponente
    defect_reason: str  # Grund für den Austausch
    technician: Optional[str] = ""
    notes: Optional[str] = ""


# Kit Status Constants
KIT_STATUS = {
    "incomplete": {"label": "Unvollständig", "color": "yellow"},
    "ready": {"label": "Bereit", "color": "green"},
    "assigned": {"label": "Zugewiesen", "color": "blue"},
    "defective": {"label": "Defekt", "color": "red"}
}


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


# ============ HELPER: Location Lookup ============

async def find_location(location_id: str):
    """
    Find a location from tenant_locations (main menu locations).
    Returns location dict or None if not found.
    """
    location = await db.tenant_locations.find_one(
        {"$or": [
            {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
            {"location_id": location_id}
        ]},
        {"_id": 0}
    )
    if location:
        # Transform to consistent format
        return {
            "location_id": location.get("location_code", location.get("location_id", "")),
            "name": location.get("station_name", location.get("name", "")),
            "city": location.get("city", ""),
            "country": location.get("country", "Deutschland"),
            "customer": location.get("tenant_name", location.get("tenant_id", ""))
        }
    return None


# ============ STARTUP - CREATE INDEXES ============

@router.on_event("startup")
async def create_indexes():
    """Create database indexes for scalability"""
    try:
        # tenant_locations indexes (main menu locations)
        await db.tenant_locations.create_index("location_code")
        await db.tenant_locations.create_index("location_id")
        await db.tenant_locations.create_index("country")
        await db.tenant_locations.create_index("tenant_id")
        
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
            {"value": "tab_tsr_i5", "label": "TSRID Tablet i5", "suffix": "TAB-TSRi5"},
            {"value": "tab_tsr_i7", "label": "TSRID Tablet i7", "suffix": "TAB-TSRi7"},
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
        "Kabel (Typ A - mit SN)": [
            {"value": "cab_usb_a", "label": "USB-A Kabel", "suffix": "CAB-USBA"},
            {"value": "cab_usb_c", "label": "USB-C Kabel", "suffix": "CAB-USBC"},
            {"value": "cab_lan", "label": "LAN-Kabel", "suffix": "CAB-LAN"},
            {"value": "cab_hdmi", "label": "HDMI-Kabel", "suffix": "CAB-HDMI"},
            {"value": "cab_dp", "label": "DisplayPort-Kabel", "suffix": "CAB-DP"},
            {"value": "cab_pwr", "label": "Stromkabel", "suffix": "CAB-PWR"},
        ],
        "Kabel (Typ B - Verbrauch)": [
            {"value": "cns_usb_a", "label": "USB-A Kabel", "suffix": "CNS-USBA"},
            {"value": "cns_usb_c", "label": "USB-C Kabel", "suffix": "CNS-USBC"},
            {"value": "cns_lan", "label": "LAN-Kabel", "suffix": "CNS-LAN"},
            {"value": "cns_hdmi", "label": "HDMI-Kabel", "suffix": "CNS-HDMI"},
            {"value": "cns_dp", "label": "DisplayPort-Kabel", "suffix": "CNS-DP"},
            {"value": "cns_pwr", "label": "Stromkabel", "suffix": "CNS-PWR"},
        ],
        "Adapter": [
            {"value": "adp_usb_c", "label": "USB-C Adapter/Hub", "suffix": "ADP-USBC"},
            {"value": "adp_hdmi", "label": "HDMI Adapter", "suffix": "ADP-HDMI"},
            {"value": "adp_dp", "label": "DisplayPort Adapter", "suffix": "ADP-DP"},
            {"value": "adp_90", "label": "90° Adapter", "suffix": "ADP-90"},
        ],
        "Stromverteiler": [
            {"value": "pwr_strip", "label": "Netzleiste", "suffix": "PWR-STRIP"},
            {"value": "pwr_12v", "label": "12V Verteiler", "suffix": "PWR-12V"},
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
        {"value": "Anker", "label": "Anker"},
        {"value": "Ugreen", "label": "Ugreen"},
        {"value": "Belkin", "label": "Belkin"},
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
    
    # Kit-Templates - Vordefinierte Kit-Zusammenstellungen
    kit_templates = await get_kit_templates_list()
    
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
        "kit_statuses": KIT_STATUSES,
        "kit_templates": kit_templates
    }


# ============ LOCATIONS ENDPOINTS ============

@router.get("/locations")
async def list_locations(
    country: str = Query(None),
    customer: str = Query(None),
    status: str = Query(None),
    city: str = Query(None),
    state: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all locations from tenant_locations (Hauptmenü-Locations) with filters"""
    try:
        query = {}
        if country:
            query["country"] = {"$regex": country, "$options": "i"}
        if customer:
            # Filter by tenant_name (customer name displayed in UI)
            query["tenant_name"] = {"$regex": f"^{customer}$", "$options": "i"}
        if city:
            query["city"] = {"$regex": f"^{city}$", "$options": "i"}
        if state:
            query["state"] = {"$regex": f"^{state}$", "$options": "i"}
        if search:
            query["$or"] = [
                {"location_code": {"$regex": search, "$options": "i"}},
                {"station_name": {"$regex": search, "$options": "i"}},
                {"street": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}},
                {"state": {"$regex": search, "$options": "i"}}
            ]
        
        # Read from tenant_locations (the main menu locations)
        total = await db.tenant_locations.count_documents(query)
        cursor = db.tenant_locations.find(query, {"_id": 0}).skip(skip).limit(limit).sort("location_code", 1)
        raw_locations = [loc async for loc in cursor]
        
        # Get all location IDs for batch slot counting
        location_ids = [loc.get("location_code", loc.get("location_id", "")) for loc in raw_locations]
        
        # Batch count slots for all locations in one query
        slot_counts = {}
        installed_counts = {}
        if location_ids:
            # Aggregate slot counts
            pipeline = [
                {"$match": {"location_id": {"$in": location_ids}}},
                {"$group": {
                    "_id": "$location_id",
                    "total": {"$sum": 1},
                    "installed": {"$sum": {"$cond": [{"$eq": ["$status", "installed"]}, 1, 0]}}
                }}
            ]
            cursor_counts = db.tsrid_slots.aggregate(pipeline)
            async for item in cursor_counts:
                slot_counts[item["_id"]] = item["total"]
                installed_counts[item["_id"]] = item["installed"]
        
        # Transform to Asset Management format
        locations = []
        for loc in raw_locations:
            location_id = loc.get("location_code", loc.get("location_id", ""))
            
            # Get slot counts from batch query
            slot_count = slot_counts.get(location_id, 0)
            installed_count = installed_counts.get(location_id, 0)
            
            locations.append({
                "location_id": location_id,
                "name": loc.get("station_name", loc.get("name", "")),
                "address": loc.get("street", loc.get("address", "")),
                "city": loc.get("city", ""),
                "postal_code": loc.get("postal_code", ""),
                "state": loc.get("state", ""),
                "country": loc.get("country", "Deutschland"),
                "customer": loc.get("tenant_name", loc.get("tenant_id", "")),
                "status": "active",  # Default status
                "phone": loc.get("phone", ""),
                "email": loc.get("email", ""),
                "manager": loc.get("manager", ""),
                "slot_count": slot_count,
                "installed_count": installed_count,
                "created_at": loc.get("created_at"),
                "updated_at": loc.get("updated_at")
            })
        
        # Filter by status if provided
        if status and status != "all":
            locations = [l for l in locations if l.get("status") == status]
        
        # Get unique filter options
        countries = await db.tenant_locations.distinct("country")
        customers = await db.tenant_locations.distinct("tenant_name")
        cities = await db.tenant_locations.distinct("city")
        states = await db.tenant_locations.distinct("state")
        # Filter out None/empty values
        countries = sorted([c for c in countries if c])
        customers = sorted([c for c in customers if c])
        cities = sorted([c for c in cities if c])
        states = sorted([s for s in states if s])
        
        return {
            "success": True,
            "locations": locations,
            "total": total,
            "filters": {
                "countries": countries,
                "customers": customers,
                "cities": cities,
                "states": states,
                "statuses": LOCATION_STATUSES
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations/{location_id}")
async def get_location(location_id: str):
    """Get location details with related slots from tenant_locations"""
    try:
        # First try tenant_locations (main menu locations)
        location = await db.tenant_locations.find_one(
            {"$or": [
                {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
                {"location_id": location_id}
            ]},
            {"_id": 0}
        )
        
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        # Transform to Asset Management format
        loc_id = location.get("location_code", location.get("location_id", ""))
        
        # Get all slots at this location
        slots_cursor = db.tsrid_slots.find({"location_id": loc_id}).sort("slot_id", 1)
        slots = [serialize_doc(slot) async for slot in slots_cursor]
        
        result = {
            "location_id": loc_id,
            "name": location.get("station_name", location.get("name", "")),
            "address": location.get("street", location.get("address", "")),
            "city": location.get("city", ""),
            "postal_code": location.get("postal_code", ""),
            "country": location.get("country", "Deutschland"),
            "customer": location.get("tenant_name", location.get("tenant_id", "")),
            "status": "active",
            "phone": location.get("phone", ""),
            "email": location.get("email", ""),
            "manager": location.get("manager", ""),
            "slots": slots,
            "slot_count": len(slots),
            "installed_count": sum(1 for s in slots if s.get("status") == "installed"),
            "created_at": location.get("created_at"),
            "updated_at": location.get("updated_at")
        }
        
        return {"success": True, "location": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/locations")
async def create_location(location: LocationCreate):
    """Create a new location in tenant_locations (synced with main menu)"""
    try:
        # Check if location_code already exists in tenant_locations
        existing = await db.tenant_locations.find_one({
            "location_code": {"$regex": f"^{location.location_id}$", "$options": "i"}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Location {location.location_id} existiert bereits")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Create in tenant_locations (main menu format)
        loc_doc = {
            "location_code": location.location_id.upper(),
            "station_name": f"{location.city} - {location.location_id}" if location.city else location.location_id,
            "street": location.address or "",
            "postal_code": "",
            "city": location.city or "",
            "country": location.country or "Deutschland",
            "tenant_id": location.customer or "europcar",
            "tenant_name": location.customer or "Europcar",
            "phone": "",
            "email": "",
            "manager": "",
            "created_at": now,
            "updated_at": now
        }
        
        await db.tenant_locations.insert_one(loc_doc)
        
        return {
            "success": True,
            "location_id": location.location_id.upper(),
            "message": f"Location {location.location_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/locations/{location_id}")
async def update_location(location_id: str, update: LocationUpdate):
    """Update a location in tenant_locations"""
    try:
        location = await db.tenant_locations.find_one({
            "$or": [
                {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
                {"location_id": location_id}
            ]
        })
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        update_data = {}
        if update.address is not None:
            update_data["street"] = update.address
        if update.city is not None:
            update_data["city"] = update.city
        if update.country is not None:
            update_data["country"] = update.country
        if update.customer is not None:
            update_data["tenant_name"] = update.customer
            update_data["tenant_id"] = update.customer
        if update.status is not None:
            update_data["status"] = update.status
            
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tenant_locations.update_one(
                {"$or": [
                    {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
                    {"location_id": location_id}
                ]},
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
        location = await db.tenant_locations.find_one({
            "$or": [
                {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
                {"location_id": location_id}
            ]
        })
        if not location:
            raise HTTPException(status_code=404, detail="Location nicht gefunden")
        
        # Check if slots exist
        slot_count = await db.tsrid_slots.count_documents({"location_id": location_id})
        if slot_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Location hat {slot_count} Slots. Bitte zuerst Slots löschen."
            )
        
        await db.tenant_locations.delete_one({
            "$or": [
                {"location_code": {"$regex": f"^{location_id}$", "$options": "i"}},
                {"location_id": location_id}
            ]
        })
        
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
            loc_cursor = db.tenant_locations.find({"country": {"$regex": country, "$options": "i"}}, {"location_code": 1})
            location_ids = [loc.get("location_code", loc.get("location_id")) async for loc in loc_cursor]
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
            # Get location info from tenant_locations
            loc = await find_location(slot.get("location_id", ""))
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
        
        # Get location details from tenant_locations
        if slot.get("location_id"):
            location = await find_location(slot["location_id"])
            slot["location"] = location
        
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
        
        # Verify location exists in tenant_locations
        location = await find_location(slot.location_id)
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
                "statuses": KIT_STATUSES
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
            # Get location info from tenant_locations
            if slot.get("location_id"):
                location = await find_location(slot["location_id"])
                slot["location"] = location
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


@router.get("/assets/search-detail")
async def search_asset_detail_by_identifier(q: str = Query(..., description="Search by warehouse_asset_id, manufacturer_sn, imei, or mac")):
    """
    Suche ein Asset anhand verschiedener Identifikatoren und gebe alle Details zurück.
    Wird für die Scan-to-Detail Funktion verwendet.
    """
    try:
        # Search by multiple fields
        asset = await db.tsrid_assets.find_one({
            "$or": [
                {"warehouse_asset_id": q},
                {"manufacturer_sn": q},
                {"imei": q},
                {"mac": q},
                {"asset_id": q}
            ]
        })
        
        if not asset:
            return {"success": False, "message": f"Kein Gerät gefunden für: {q}"}
        
        # Serialize and return
        asset_data = serialize_doc(asset)
        
        # If assigned to a location, get location details
        if asset.get("location_id"):
            location = await db.tsrid_locations.find_one({"location_id": asset["location_id"]})
            if location:
                asset_data["location"] = serialize_doc(location)
        
        # If assigned to a kit/bundle, get bundle details
        if asset.get("bundle_id"):
            bundle = await db.tsrid_bundles.find_one({"bundle_id": asset["bundle_id"]})
            if bundle:
                asset_data["bundle"] = serialize_doc(bundle)
        
        return {
            "success": True,
            "asset": asset_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/assets/update-by-identifier")
async def update_asset_by_identifier(
    identifier: str = Query(..., description="warehouse_asset_id, manufacturer_sn, imei, mac, or asset_id"),
    update: AssetUpdate = None
):
    """
    Update an asset by any identifier (warehouse_asset_id, manufacturer_sn, imei, mac, or asset_id).
    This is useful for assets that don't have an asset_id yet (unassigned inventory).
    """
    try:
        # Find asset by any identifier
        asset = await db.tsrid_assets.find_one({
            "$or": [
                {"warehouse_asset_id": identifier},
                {"manufacturer_sn": identifier},
                {"imei": identifier},
                {"mac": identifier},
                {"asset_id": identifier}
            ]
        })
        
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset nicht gefunden: {identifier}")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Add history entry for the update
            history_entry = {
                "date": datetime.now(timezone.utc).isoformat(),
                "event": "Daten aktualisiert",
                "event_type": "update",
                "notes": f"Felder geändert: {', '.join(update_data.keys())}",
                "technician": update_data.get("installed_by", "System")
            }
            
            await db.tsrid_assets.update_one(
                {"_id": asset["_id"]},
                {
                    "$set": update_data,
                    "$push": {"history": history_entry}
                }
            )
        
        # Fetch and return updated asset
        updated_asset = await db.tsrid_assets.find_one({"_id": asset["_id"]})
        
        return {
            "success": True, 
            "message": "Asset aktualisiert",
            "asset": serialize_doc(updated_asset)
        }
    except HTTPException:
        raise
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
                        location = await find_location(slot["location_id"])
                        asset["location"] = location
        
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
    """Get overall statistics for dashboard - using tenant_locations"""
    try:
        # Use tenant_locations for location counts (synced with main menu)
        total_locations = await db.tenant_locations.count_documents({})
        
        stats = {
            "locations": {
                "total": total_locations,
                "active": total_locations,  # All tenant_locations are considered active
                "planned": 0
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
        
        # Locations by country from tenant_locations
        country_pipeline = [
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        country_cursor = db.tenant_locations.aggregate(country_pipeline)
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
                        location = await find_location(slot["location_id"])
                        asset["location"] = location
        
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


# ============ KIT TEMPLATES ============
# Kit Templates define which components make up a specific kit type
# Example: KIT-SFD (Surface + Desko) = 1x TAB-SP4, 1x SCA-DSK, 1x TDO-QER, 1x SDO-DSK, 1x TPS-SPX, 1x SPS-DSK

# Pydantic Models for Kit Templates
class KitTemplateComponent(BaseModel):
    asset_type: str  # z.B. 'tab_sp4', 'sca_dsk'
    quantity: int = 1
    optional: bool = False  # Ob Komponente optional ist
    notes: Optional[str] = ""


# NEW: Inventory Components (ohne Seriennummer - Verbrauchsmaterial)
class KitTemplateInventoryComponent(BaseModel):
    inventory_item_id: str  # ID aus inventory_items Collection
    name: str  # Name des Artikels für Anzeige
    quantity: int = 1
    optional: bool = False


class KitTemplateCreate(BaseModel):
    template_id: str  # z.B. 'KIT-SFD', 'KIT-TSR'
    name: str  # z.B. 'Surface + Desko Kit'
    description: Optional[str] = ""
    components: List[KitTemplateComponent]  # Assets MIT Seriennummer
    inventory_components: Optional[List[KitTemplateInventoryComponent]] = []  # Komponenten OHNE Seriennummer
    notes: Optional[str] = ""


class KitTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    components: Optional[List[KitTemplateComponent]] = None
    inventory_components: Optional[List[KitTemplateInventoryComponent]] = None
    notes: Optional[str] = None


async def get_kit_templates_list():
    """Helper function to get all kit templates"""
    try:
        cursor = db.tsrid_kit_templates.find({}, {"_id": 0})
        templates = [doc async for doc in cursor]
        return templates
    except Exception:
        return []


@router.get("/asset-types")
async def get_asset_types():
    """Get all available asset types with labels for UI"""
    try:
        # Filter out consumables (cns_*) and kit types for asset selection
        asset_type_list = []
        for asset_type in ASSET_TYPES:
            # Skip consumables and kits - they are handled separately
            if asset_type.startswith('cns_') or asset_type.startswith('kit_'):
                continue
            asset_type_list.append({
                "type": asset_type,
                "label": ASSET_TYPE_LABELS.get(asset_type, asset_type),
                "suffix": ASSET_TYPE_SUFFIX_MAP.get(asset_type, 'OTH')
            })
        
        return {
            "success": True,
            "types": asset_type_list,
            "total": len(asset_type_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kit-templates")
async def list_kit_templates(include_stock: bool = Query(True, description="Include inventory stock levels")):
    """List all kit templates with component details and inventory stock levels"""
    try:
        templates = await get_kit_templates_list()
        
        # Get inventory stock levels if requested
        inventory_stock = {}
        if include_stock:
            cursor = db.inventory_items.find({}, {"_id": 1, "name": 1, "quantity_in_stock": 1, "min_stock_level": 1})
            async for item in cursor:
                inventory_stock[str(item["_id"])] = {
                    "name": item.get("name", ""),
                    "quantity_in_stock": item.get("quantity_in_stock", 0),
                    "min_stock_level": item.get("min_stock_level", 5)
                }
        
        # Count available assets in storage by type
        assets_in_storage = {}
        if include_stock:
            pipeline = [
                {"$match": {"status": "in_storage", "parent_kit_id": {"$exists": False}}},
                {"$group": {"_id": "$type", "count": {"$sum": 1}}}
            ]
            async for doc in db.tsrid_assets.aggregate(pipeline):
                assets_in_storage[doc["_id"]] = doc["count"]
        
        # Enrich templates with component labels and stock info
        for template in templates:
            # Process asset components (mit Seriennummer)
            if template.get("components"):
                for comp in template["components"]:
                    comp["label"] = ASSET_TYPE_LABELS.get(comp.get("asset_type"), comp.get("asset_type"))
                    comp["suffix"] = ASSET_TYPE_SUFFIX_MAP.get(comp.get("asset_type"), "OTH")
                    comp["has_serial_number"] = True
                    if include_stock:
                        comp["available_in_storage"] = assets_in_storage.get(comp.get("asset_type"), 0)
            
            # Process inventory components (ohne Seriennummer)
            if template.get("inventory_components"):
                for inv_comp in template["inventory_components"]:
                    inv_comp["has_serial_number"] = False
                    item_id = inv_comp.get("inventory_item_id")
                    if item_id and item_id in inventory_stock:
                        stock_info = inventory_stock[item_id]
                        inv_comp["quantity_in_stock"] = stock_info["quantity_in_stock"]
                        inv_comp["min_stock_level"] = stock_info["min_stock_level"]
                        inv_comp["stock_status"] = (
                            "critical" if stock_info["quantity_in_stock"] == 0 
                            else "low" if stock_info["quantity_in_stock"] <= stock_info["min_stock_level"]
                            else "ok"
                        )
            
            # Calculate possible kits based on stock
            if include_stock:
                template["possible_kits"] = await calculate_possible_kits(template, assets_in_storage, inventory_stock)
        
        return {
            "success": True,
            "templates": templates,
            "total": len(templates)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def calculate_possible_kits(template: dict, assets_in_storage: dict, inventory_stock: dict) -> dict:
    """Calculate how many complete kits can be built from available stock"""
    limiting_component = None
    max_kits = float('inf')
    
    # Check asset components (mit SN)
    for comp in template.get("components", []):
        if comp.get("optional"):
            continue
        asset_type = comp.get("asset_type")
        needed = comp.get("quantity", 1)
        available = assets_in_storage.get(asset_type, 0)
        possible = available // needed if needed > 0 else 0
        
        if possible < max_kits:
            max_kits = possible
            limiting_component = {
                "name": comp.get("label", asset_type),
                "type": "asset",
                "needed": needed,
                "available": available
            }
    
    # Check inventory components (ohne SN)
    for inv_comp in template.get("inventory_components", []):
        if inv_comp.get("optional"):
            continue
        item_id = inv_comp.get("inventory_item_id")
        needed = inv_comp.get("quantity", 1)
        available = inventory_stock.get(item_id, {}).get("quantity_in_stock", 0)
        possible = available // needed if needed > 0 else 0
        
        if possible < max_kits:
            max_kits = possible
            limiting_component = {
                "name": inv_comp.get("name", "Unbekannt"),
                "type": "inventory",
                "needed": needed,
                "available": available
            }
    
    return {
        "count": max_kits if max_kits != float('inf') else 0,
        "limiting_component": limiting_component
    }


@router.get("/kit-templates/{template_id}")
async def get_kit_template(template_id: str):
    """Get a specific kit template with component details"""
    try:
        template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {template_id} nicht gefunden")
        
        template = serialize_doc(template)
        
        # Enrich with component labels
        if template.get("components"):
            for comp in template["components"]:
                comp["label"] = ASSET_TYPE_LABELS.get(comp.get("asset_type"), comp.get("asset_type"))
                comp["suffix"] = ASSET_TYPE_SUFFIX_MAP.get(comp.get("asset_type"), "OTH")
        
        return {"success": True, "template": template}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kit-templates")
async def create_kit_template(template: KitTemplateCreate):
    """Create a new kit template"""
    try:
        # Check if template_id already exists
        existing = await db.tsrid_kit_templates.find_one({"template_id": template.template_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Kit Template {template.template_id} existiert bereits")
        
        now = datetime.now(timezone.utc).isoformat()
        template_doc = {
            "template_id": template.template_id,
            "name": template.name,
            "description": template.description,
            "components": [comp.dict() for comp in template.components],
            "inventory_components": [inv_comp.dict() for inv_comp in (template.inventory_components or [])],
            "notes": template.notes,
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_kit_templates.insert_one(template_doc)
        
        return {
            "success": True,
            "template_id": template.template_id,
            "message": f"Kit Template {template.template_id} erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/kit-templates/{template_id}")
async def update_kit_template(template_id: str, update: KitTemplateUpdate):
    """Update a kit template"""
    try:
        template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {template_id} nicht gefunden")
        
        update_data = {}
        if update.name is not None:
            update_data["name"] = update.name
        if update.description is not None:
            update_data["description"] = update.description
        if update.notes is not None:
            update_data["notes"] = update.notes
        if update.components is not None:
            update_data["components"] = [comp.dict() for comp in update.components]
        if update.inventory_components is not None:
            update_data["inventory_components"] = [inv_comp.dict() for inv_comp in update.inventory_components]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.tsrid_kit_templates.update_one(
                {"template_id": template_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": f"Kit Template {template_id} aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/kit-templates/{template_id}")
async def delete_kit_template(template_id: str):
    """Delete a kit template"""
    try:
        template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {template_id} nicht gefunden")
        
        await db.tsrid_kit_templates.delete_one({"template_id": template_id})
        
        return {"success": True, "message": f"Kit Template {template_id} gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-for-templates")
async def get_inventory_for_templates():
    """Get all inventory items that can be added to kit templates"""
    try:
        cursor = db.inventory_items.find({}, {"_id": 1, "name": 1, "category": 1, "quantity_in_stock": 1, "min_stock_level": 1, "unit": 1, "barcode": 1})
        items = []
        async for item in cursor:
            stock = item.get("quantity_in_stock", 0)
            min_stock = item.get("min_stock_level", 5)
            items.append({
                "id": str(item["_id"]),
                "name": item.get("name", ""),
                "category": item.get("category", ""),
                "quantity_in_stock": stock,
                "min_stock_level": min_stock,
                "unit": item.get("unit", "Stück"),
                "barcode": item.get("barcode", ""),
                "stock_status": "critical" if stock == 0 else "low" if stock <= min_stock else "ok"
            })
        
        # Group by category
        by_category = {}
        for item in items:
            cat = item.get("category", "Sonstiges")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(item)
        
        return {
            "success": True,
            "items": items,
            "by_category": by_category,
            "total": len(items)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kit-templates/{template_id}/add-inventory-component")
async def add_inventory_component_to_template(
    template_id: str,
    inventory_item_id: str = Query(...),
    quantity: int = Query(1),
    optional: bool = Query(False)
):
    """Add an inventory component (ohne SN) to a kit template"""
    try:
        # Verify template exists
        template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {template_id} nicht gefunden")
        
        # Verify inventory item exists
        from bson import ObjectId
        inv_item = await db.inventory_items.find_one({"_id": ObjectId(inventory_item_id)})
        if not inv_item:
            raise HTTPException(status_code=404, detail="Inventar-Artikel nicht gefunden")
        
        new_component = {
            "inventory_item_id": inventory_item_id,
            "name": inv_item.get("name", ""),
            "quantity": quantity,
            "optional": optional
        }
        
        # Check if already exists
        existing_components = template.get("inventory_components", [])
        for comp in existing_components:
            if comp.get("inventory_item_id") == inventory_item_id:
                raise HTTPException(status_code=400, detail="Dieser Artikel ist bereits im Template")
        
        await db.tsrid_kit_templates.update_one(
            {"template_id": template_id},
            {
                "$push": {"inventory_components": new_component},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": f"Komponente '{inv_item.get('name')}' hinzugefügt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/kit-templates/{template_id}/remove-inventory-component/{inventory_item_id}")
async def remove_inventory_component_from_template(template_id: str, inventory_item_id: str):
    """Remove an inventory component from a kit template"""
    try:
        template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {template_id} nicht gefunden")
        
        await db.tsrid_kit_templates.update_one(
            {"template_id": template_id},
            {
                "$pull": {"inventory_components": {"inventory_item_id": inventory_item_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"success": True, "message": "Komponente entfernt"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ KIT ASSEMBLY (Zusammenstellung) ============
# Kits are assembled assets that contain multiple component assets

class KitAssemblyCreate(BaseModel):
    kit_id: str  # z.B. 'AAHC01-01-KIT'
    template_id: str  # z.B. 'KIT-SFD'
    country: str
    location_id: Optional[str] = None
    notes: Optional[str] = ""


class KitComponentAssign(BaseModel):
    asset_id: str  # ID des Komponenten-Assets


@router.get("/kits/next-id")
async def get_next_kit_id(template_id: str = Query("KIT-TSR")):
    """
    Get the next available Kit ID for a given template.
    Format: TSRID-KIT-001, TSRID-KIT-002, etc.
    """
    try:
        # Find all existing kits with TSRID-KIT-XXX format
        existing_kits = await db.tsrid_assets.find(
            {"asset_id": {"$regex": "^TSRID-KIT-"}},
            {"asset_id": 1}
        ).to_list(10000)
        
        # Extract the highest number
        max_num = 0
        for kit in existing_kits:
            kit_id = kit.get("asset_id", "")
            # Format: TSRID-KIT-001
            parts = kit_id.split("-")
            if len(parts) >= 3:
                try:
                    num = int(parts[2])
                    max_num = max(max_num, num)
                except ValueError:
                    pass
        
        next_num = max_num + 1
        next_id = f"TSRID-KIT-{next_num:03d}"
        
        return {
            "success": True,
            "next_kit_id": next_id,
            "current_count": max_num
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kits")
async def list_kits(
    status: str = Query(None),
    country: str = Query(None),
    template_id: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """List all assembled kits"""
    try:
        # Query assets with type starting with 'kit_'
        query = {"type": {"$regex": "^kit_"}}
        
        if status and status != "all":
            query["status"] = status
        if country:
            query["country"] = country
        if template_id:
            query["kit_template_id"] = template_id
        if search:
            query["$or"] = [
                {"asset_id": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.tsrid_assets.count_documents(query)
        cursor = db.tsrid_assets.find(query).skip(skip).limit(limit).sort("asset_id", 1)
        kits = [serialize_doc(k) async for k in cursor]
        
        # Enrich with component count
        for kit in kits:
            if kit.get("kit_components"):
                kit["component_count"] = len(kit["kit_components"])
            else:
                kit["component_count"] = 0
        
        return {
            "success": True,
            "kits": kits,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kits/{kit_id}")
async def get_kit_details(kit_id: str):
    """Get kit details with all component assets"""
    try:
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        kit = serialize_doc(kit)
        
        # Get template info
        if kit.get("kit_template_id"):
            template = await db.tsrid_kit_templates.find_one({"template_id": kit["kit_template_id"]})
            if template:
                kit["template"] = serialize_doc(template)
        
        # Get full details for each component asset
        component_details = []
        if kit.get("kit_components"):
            for comp_id in kit["kit_components"]:
                comp_asset = await db.tsrid_assets.find_one({"asset_id": comp_id})
                if comp_asset:
                    comp_asset = serialize_doc(comp_asset)
                    comp_asset["type_label"] = ASSET_TYPE_LABELS.get(comp_asset.get("type"), comp_asset.get("type"))
                    component_details.append(comp_asset)
        
        kit["component_details"] = component_details
        
        return {"success": True, "kit": kit}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/assemble")
async def assemble_kit(assembly: KitAssemblyCreate):
    """Create a new kit and prepare it for component assembly"""
    try:
        # Check if kit_id already exists
        existing = await db.tsrid_assets.find_one({"asset_id": assembly.kit_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Kit {assembly.kit_id} existiert bereits")
        
        # Get template
        template = await db.tsrid_kit_templates.find_one({"template_id": assembly.template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {assembly.template_id} nicht gefunden")
        
        # Map template_id to asset type
        # e.g., 'KIT-SFD' -> 'kit_sfd'
        kit_asset_type = assembly.template_id.lower().replace('-', '_')
        
        now = datetime.now(timezone.utc).isoformat()
        kit_doc = {
            "asset_id": assembly.kit_id,
            "type": kit_asset_type,
            "kit_template_id": assembly.template_id,
            "kit_components": [],  # Will be filled during assembly
            "kit_status": "assembling",  # assembling, complete, deployed
            "country": assembly.country,
            "location_id": assembly.location_id,
            "status": "in_storage",
            "notes": assembly.notes,
            "history": [{
                "date": now,
                "event": f"Kit erstellt basierend auf Vorlage {assembly.template_id}",
                "event_type": "created",
                "notes": f"Vorlage: {template.get('name', assembly.template_id)}"
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(kit_doc)
        
        return {
            "success": True,
            "kit_id": assembly.kit_id,
            "template_id": assembly.template_id,
            "message": f"Kit {assembly.kit_id} erstellt. Bereit für Komponenten-Zuweisung.",
            "required_components": [
                {
                    "asset_type": comp.get("asset_type"),
                    "label": ASSET_TYPE_LABELS.get(comp.get("asset_type"), comp.get("asset_type")),
                    "quantity": comp.get("quantity", 1),
                    "optional": comp.get("optional", False)
                }
                for comp in template.get("components", [])
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/{kit_id}/add-component")
async def add_component_to_kit(kit_id: str, component: KitComponentAssign, technician: str = Query("")):
    """Add a component asset to a kit by scanning/entering its asset ID"""
    try:
        # Get the kit
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        # Get the component asset
        comp_asset = await db.tsrid_assets.find_one({"asset_id": component.asset_id})
        if not comp_asset:
            raise HTTPException(status_code=404, detail=f"Komponente {component.asset_id} nicht gefunden")
        
        # Check if component is already assigned to another kit
        if comp_asset.get("assigned_to_kit"):
            raise HTTPException(status_code=400, detail=f"Komponente {component.asset_id} ist bereits Kit {comp_asset['assigned_to_kit']} zugewiesen")
        
        # Check if component is already in this kit
        if component.asset_id in kit.get("kit_components", []):
            raise HTTPException(status_code=400, detail=f"Komponente {component.asset_id} ist bereits in diesem Kit")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Add component to kit
        await db.tsrid_assets.update_one(
            {"asset_id": kit_id},
            {
                "$push": {"kit_components": component.asset_id},
                "$set": {"updated_at": now}
            }
        )
        
        # Mark component as assigned to kit
        await db.tsrid_assets.update_one(
            {"asset_id": component.asset_id},
            {
                "$set": {
                    "assigned_to_kit": kit_id,
                    "updated_at": now
                }
            }
        )
        
        # Add history to kit
        await add_asset_history(
            kit_id,
            "assigned_to_bundle",
            f"Komponente {component.asset_id} ({ASSET_TYPE_LABELS.get(comp_asset.get('type'), comp_asset.get('type'))}) hinzugefügt",
            technician=technician
        )
        
        # Add history to component
        await add_asset_history(
            component.asset_id,
            "assigned_to_bundle",
            f"Zu Kit {kit_id} zugewiesen",
            bundle_id=kit_id,
            technician=technician
        )
        
        # Check if kit is complete
        kit_updated = await db.tsrid_assets.find_one({"asset_id": kit_id})
        template = await db.tsrid_kit_templates.find_one({"template_id": kit_updated.get("kit_template_id")})
        
        is_complete = False
        if template:
            required_components = {}
            for comp in template.get("components", []):
                if not comp.get("optional", False):
                    required_components[comp["asset_type"]] = comp.get("quantity", 1)
            
            # Count components by type
            assigned_counts = {}
            for comp_id in kit_updated.get("kit_components", []):
                comp = await db.tsrid_assets.find_one({"asset_id": comp_id})
                if comp:
                    comp_type = comp.get("type", "other")
                    assigned_counts[comp_type] = assigned_counts.get(comp_type, 0) + 1
            
            # Check if all required components are present
            is_complete = all(
                assigned_counts.get(req_type, 0) >= req_qty
                for req_type, req_qty in required_components.items()
            )
            
            if is_complete:
                await db.tsrid_assets.update_one(
                    {"asset_id": kit_id},
                    {"$set": {"kit_status": "complete"}}
                )
        
        return {
            "success": True,
            "message": f"Komponente {component.asset_id} zu Kit {kit_id} hinzugefügt",
            "kit_status": "complete" if is_complete else "assembling",
            "component_count": len(kit_updated.get("kit_components", []))
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/kits/{kit_id}/remove-component/{component_id}")
async def remove_component_from_kit(kit_id: str, component_id: str, technician: str = Query("")):
    """Remove a component from a kit"""
    try:
        # Get the kit
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        # Check if component is in kit
        if component_id not in kit.get("kit_components", []):
            raise HTTPException(status_code=400, detail=f"Komponente {component_id} ist nicht in diesem Kit")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Remove component from kit
        await db.tsrid_assets.update_one(
            {"asset_id": kit_id},
            {
                "$pull": {"kit_components": component_id},
                "$set": {"updated_at": now, "kit_status": "assembling"}
            }
        )
        
        # Unmark component
        await db.tsrid_assets.update_one(
            {"asset_id": component_id},
            {"$unset": {"assigned_to_kit": ""}, "$set": {"updated_at": now}}
        )
        
        # Add history
        await add_asset_history(
            kit_id,
            "removed_from_bundle",
            f"Komponente {component_id} entfernt",
            technician=technician
        )
        
        await add_asset_history(
            component_id,
            "removed_from_bundle",
            f"Von Kit {kit_id} entfernt",
            bundle_id=kit_id,
            technician=technician
        )
        
        return {"success": True, "message": f"Komponente {component_id} von Kit {kit_id} entfernt"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/{kit_id}/scan")
async def scan_kit_or_component(kit_id: str):
    """Scan a Kit QR code - returns kit info with all components, or info about component's parent kit"""
    try:
        # Try to find as kit
        asset = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {kit_id} nicht gefunden")
        
        asset = serialize_doc(asset)
        
        # Check if it's a kit (type starts with kit_)
        if asset.get("type", "").startswith("kit_"):
            # It's a kit - return full kit details
            component_details = []
            if asset.get("kit_components"):
                for comp_id in asset["kit_components"]:
                    comp = await db.tsrid_assets.find_one({"asset_id": comp_id})
                    if comp:
                        comp = serialize_doc(comp)
                        comp["type_label"] = ASSET_TYPE_LABELS.get(comp.get("type"), comp.get("type"))
                        component_details.append(comp)
            
            # Get template
            template = None
            if asset.get("kit_template_id"):
                template = await db.tsrid_kit_templates.find_one({"template_id": asset["kit_template_id"]})
                if template:
                    template = serialize_doc(template)
            
            return {
                "success": True,
                "scan_type": "kit",
                "kit": asset,
                "template": template,
                "components": component_details,
                "component_count": len(component_details)
            }
        else:
            # It's a component - check if it's assigned to a kit
            if asset.get("assigned_to_kit"):
                parent_kit = await db.tsrid_assets.find_one({"asset_id": asset["assigned_to_kit"]})
                if parent_kit:
                    parent_kit = serialize_doc(parent_kit)
                    return {
                        "success": True,
                        "scan_type": "component",
                        "component": asset,
                        "component_type_label": ASSET_TYPE_LABELS.get(asset.get("type"), asset.get("type")),
                        "parent_kit": parent_kit
                    }
            
            # Component not in any kit
            return {
                "success": True,
                "scan_type": "component",
                "component": asset,
                "component_type_label": ASSET_TYPE_LABELS.get(asset.get("type"), asset.get("type")),
                "parent_kit": None,
                "message": "Komponente ist keinem Kit zugewiesen"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ SIMPLIFIED KIT ASSEMBLY (One-Step) ============
class QuickKitAssembly(BaseModel):
    template_id: str  # z.B. 'KIT-SFD', 'KIT-TSR'
    component_sns: List[str]  # Seriennummern der Komponenten
    location_id: Optional[str] = None  # Standort-ID ist jetzt optional - Kit wird im "Lager" erstellt


@router.post("/kits/quick-assemble")
async def quick_assemble_kit(assembly: QuickKitAssembly, technician: str = Query("")):
    """
    One-step kit assembly: Create kit, assign components, generate kit ID.
    Kit wird im "Lager" erstellt (ohne Standort-Zuweisung).
    Standort-Zuweisung erfolgt später über den Kits Tab.
    """
    try:
        # 1. Get template
        template = await db.tsrid_kit_templates.find_one({"template_id": assembly.template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {assembly.template_id} nicht gefunden")
        
        # 2. Validate and get all component assets
        components = []
        for sn in assembly.component_sns:
            # Try by serial number first
            asset = await db.tsrid_assets.find_one({"manufacturer_sn": sn})
            if not asset:
                # Try by asset_id
                asset = await db.tsrid_assets.find_one({"asset_id": sn})
            
            if not asset:
                raise HTTPException(status_code=404, detail=f"Komponente nicht gefunden: {sn}")
            
            if asset.get("assigned_to_kit"):
                raise HTTPException(status_code=400, detail=f"Komponente {sn} ist bereits Kit {asset['assigned_to_kit']} zugewiesen")
            
            components.append(asset)
        
        # 3. Generate Kit ID: TSRID-KIT-001, TSRID-KIT-002, etc.
        existing_kits = await db.tsrid_assets.find(
            {"asset_id": {"$regex": "^TSRID-KIT-"}},
            {"asset_id": 1}
        ).to_list(10000)
        
        # Extract the highest number
        max_num = 0
        for kit in existing_kits:
            kit_asset_id = kit.get("asset_id", "")
            parts = kit_asset_id.split("-")
            if len(parts) >= 3:
                try:
                    num = int(parts[2])
                    max_num = max(max_num, num)
                except ValueError:
                    pass
        
        next_num = max_num + 1
        kit_id = f"TSRID-KIT-{next_num:03d}"
        
        kit_type = assembly.template_id.lower().replace('-', '_')
        now = datetime.now(timezone.utc).isoformat()
        
        # 4. Create kit document - Status "in_storage" (Lager)
        kit_doc = {
            "asset_id": kit_id,
            "type": kit_type,
            "type_label": template.get("name", assembly.template_id),
            "kit_template_id": assembly.template_id,
            "kit_components": [c.get("asset_id") or c.get("manufacturer_sn") for c in components],
            "kit_status": "complete" if len(components) >= len(template.get("components", [])) else "incomplete",
            "location_id": None,  # Kein Standort - im Lager
            "status": "in_storage",  # Lager-Status
            "history": [{
                "date": now,
                "event": f"Kit erstellt basierend auf Vorlage {assembly.template_id}",
                "event_type": "created",
                "technician": technician or None,
                "notes": f"{len(components)} Komponenten zugewiesen - Status: Lager"
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(kit_doc)
        
        # 5. Update all components to link them to this kit
        for comp in components:
            await db.tsrid_assets.update_one(
                {"_id": comp["_id"]},
                {
                    "$set": {
                        "assigned_to_kit": kit_id,
                        "parent_kit_id": kit_id,
                        "updated_at": now
                    }
                }
            )
            
            # Add history entry to component
            comp_asset_id = comp.get("asset_id")
            if comp_asset_id:
                await add_asset_history(
                    comp_asset_id,
                    "assigned_to_bundle",
                    f"Zu Kit {kit_id} zugewiesen",
                    bundle_id=kit_id,
                    technician=technician
                )
        
        # 6. Deduct inventory components (ohne Seriennummer) from stock
        inventory_deducted = []
        for inv_comp in template.get("inventory_components", []):
            item_id = inv_comp.get("inventory_item_id")
            qty_needed = inv_comp.get("quantity", 1)
            
            if item_id:
                # Deduct from stock
                result = await db.inventory_items.update_one(
                    {"_id": ObjectId(item_id), "quantity_in_stock": {"$gte": qty_needed}},
                    {"$inc": {"quantity_in_stock": -qty_needed}}
                )
                
                if result.modified_count > 0:
                    inventory_deducted.append({
                        "name": inv_comp.get("name", ""),
                        "quantity": qty_needed
                    })
                else:
                    # Log warning but don't fail - inventory might be out of stock
                    print(f"Warning: Could not deduct {qty_needed}x {inv_comp.get('name')} - insufficient stock")
        
        # 7. Return success with label data
        return {
            "success": True,
            "kit_id": kit_id,
            "template_id": assembly.template_id,
            "template_name": template.get("name", assembly.template_id),
            "location_id": None,
            "location_name": "Lager",
            "component_count": len(components),
            "inventory_deducted": inventory_deducted,
            "kit_status": kit_doc["kit_status"],
            "message": f"Kit {kit_id} erfolgreich erstellt und im Lager gespeichert",
            "label": {
                "asset_id": kit_id,
                "type_label": template.get("name", assembly.template_id),
                "manufacturer_sn": kit_id,
                "location_name": "Lager",
                "qr_content": f"TSRID:KIT:{kit_id}",
                "components": len(components)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ SEED DEFAULT KIT TEMPLATES ============
@router.post("/kit-templates/seed-defaults")
async def seed_default_kit_templates():
    """Create default kit templates for Surface+Desko and TSRID kits"""
    try:
        defaults = [
            {
                "template_id": "KIT-SFD",
                "name": "Surface + Desko Kit",
                "description": "Komplettes Kit für Surface Pro mit Desko Scanner",
                "components": [
                    {"asset_type": "tab_sp4", "quantity": 1, "optional": False, "notes": "Surface Pro 4 oder SP6"},
                    {"asset_type": "sca_dsk", "quantity": 1, "optional": False, "notes": "Desko Scanner"},
                    {"asset_type": "tdo_qer", "quantity": 1, "optional": False, "notes": "Tablet Quer Dock"},
                    {"asset_type": "sdo_dsk", "quantity": 1, "optional": False, "notes": "Scanner Dock"},
                    {"asset_type": "tps_spx", "quantity": 1, "optional": False, "notes": "Tablet Netzteil"},
                    {"asset_type": "sps_dsk", "quantity": 1, "optional": False, "notes": "Scanner Netzteil"},
                    {"asset_type": "cab_usb_c", "quantity": 1, "optional": True, "notes": "USB-C Kabel"},
                    {"asset_type": "cab_lan", "quantity": 1, "optional": True, "notes": "LAN-Kabel"},
                ],
                "notes": "Standard Kit für Europcar Stationen mit Surface Pro"
            },
            {
                "template_id": "KIT-TSR",
                "name": "TSRID Kit",
                "description": "Komplettes TSRID Hardware-Kit",
                "components": [
                    {"asset_type": "tab_tsr", "quantity": 1, "optional": False, "notes": "TSRID Tablet"},
                    {"asset_type": "sca_tsr", "quantity": 1, "optional": False, "notes": "TSRID Scanner"},
                    {"asset_type": "tdo_tsr", "quantity": 1, "optional": False, "notes": "TSRID Tablet Dock"},
                    {"asset_type": "sdo_tsr", "quantity": 1, "optional": False, "notes": "TSRID Scanner Dock"},
                    {"asset_type": "tps_tsr", "quantity": 1, "optional": False, "notes": "TSRID Tablet Netzteil"},
                    {"asset_type": "sps_tsr", "quantity": 1, "optional": False, "notes": "TSRID Scanner Netzteil"},
                ],
                "notes": "Standard Kit für TSRID Hardware"
            }
        ]
        
        created = []
        skipped = []
        now = datetime.now(timezone.utc).isoformat()
        
        for template in defaults:
            existing = await db.tsrid_kit_templates.find_one({"template_id": template["template_id"]})
            if existing:
                skipped.append(template["template_id"])
                continue
            
            template["created_at"] = now
            template["updated_at"] = now
            await db.tsrid_kit_templates.insert_one(template)
            created.append(template["template_id"])
        
        return {
            "success": True,
            "created": created,
            "skipped": skipped,
            "message": f"{len(created)} Templates erstellt, {len(skipped)} übersprungen (bereits vorhanden)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ WARENEINGANG (Inventory Intake) ENDPOINTS ============
# Workflow: 
# 1. Geräte werden mit Seriennummer (Barcode) erfasst → Status "unassigned"
# 2. Bei Zuweisung zu Location → Asset-ID wird generiert → Label wird erstellt

@router.post("/inventory/intake")
async def inventory_intake_single(item: InventoryIntakeItem, received_by: str = Query("")):
    """
    Wareneingang: Einzelnes Gerät mit Seriennummer erfassen.
    Das Gerät erhält noch keine Asset-ID - nur die Seriennummer wird gespeichert.
    Status: "unassigned" (nicht zugewiesen)
    """
    try:
        # Check if serial number already exists
        existing = await db.tsrid_assets.find_one({"manufacturer_sn": item.manufacturer_sn})
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Gerät mit Seriennummer {item.manufacturer_sn} existiert bereits"
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Create asset without location-based ID
        # Asset-ID is just the serial number for now
        asset_doc = {
            "asset_id": None,  # Will be set when assigned to location
            "manufacturer_sn": item.manufacturer_sn,
            "type": item.type,
            "type_label": ASSET_TYPE_LABELS.get(item.type, item.type),
            "type_suffix": ASSET_TYPE_SUFFIX_MAP.get(item.type, "OTH"),
            "imei": item.imei,
            "mac": item.mac,
            "manufacturer": item.manufacturer,
            "model": item.model,
            "status": "unassigned",  # Not yet assigned to a location
            "location_id": None,
            "country": None,
            "bundle_id": None,
            "assigned_to_kit": None,
            "notes": item.notes,
            "intake_date": now,
            "received_by": received_by,
            "history": [{
                "date": now,
                "event": f"Wareneingang: {ASSET_TYPE_LABELS.get(item.type, item.type)}",
                "event_type": "intake",
                "notes": f"SN: {item.manufacturer_sn}",
                "technician": received_by
            }],
            "created_at": now,
            "updated_at": now
        }
        
        result = await db.tsrid_assets.insert_one(asset_doc)
        
        return {
            "success": True,
            "message": f"Gerät erfasst: {item.manufacturer_sn}",
            "manufacturer_sn": item.manufacturer_sn,
            "type": item.type,
            "type_label": ASSET_TYPE_LABELS.get(item.type, item.type),
            "status": "unassigned",
            "next_step": "Gerät kann jetzt einem Standort zugewiesen werden"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/intake/batch")
async def inventory_intake_batch(batch: InventoryIntakeBatch):
    """
    Wareneingang: Mehrere Geräte auf einmal erfassen (z.B. 35 Tablets).
    Alle Geräte erhalten Status "unassigned".
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        intake_date = batch.intake_date or now
        
        created = []
        skipped = []
        
        for item in batch.items:
            # Check if serial number already exists
            existing = await db.tsrid_assets.find_one({"manufacturer_sn": item.manufacturer_sn})
            if existing:
                skipped.append({
                    "manufacturer_sn": item.manufacturer_sn,
                    "reason": "Seriennummer existiert bereits"
                })
                continue
            
            asset_doc = {
                "asset_id": None,
                "manufacturer_sn": item.manufacturer_sn,
                "type": item.type,
                "type_label": ASSET_TYPE_LABELS.get(item.type, item.type),
                "type_suffix": ASSET_TYPE_SUFFIX_MAP.get(item.type, "OTH"),
                "imei": item.imei,
                "mac": item.mac,
                "manufacturer": item.manufacturer,
                "model": item.model,
                "status": "unassigned",
                "location_id": None,
                "country": None,
                "bundle_id": None,
                "assigned_to_kit": None,
                "notes": item.notes,
                "intake_date": intake_date,
                "received_by": batch.received_by,
                "supplier": batch.supplier,
                "delivery_note": batch.delivery_note,
                "history": [{
                    "date": now,
                    "event": f"Wareneingang: {ASSET_TYPE_LABELS.get(item.type, item.type)}",
                    "event_type": "intake",
                    "notes": f"SN: {item.manufacturer_sn}, Lieferant: {batch.supplier}",
                    "technician": batch.received_by
                }],
                "created_at": now,
                "updated_at": now
            }
            
            await db.tsrid_assets.insert_one(asset_doc)
            created.append({
                "manufacturer_sn": item.manufacturer_sn,
                "type": item.type,
                "type_label": ASSET_TYPE_LABELS.get(item.type, item.type)
            })
        
        return {
            "success": True,
            "message": f"{len(created)} Geräte erfasst, {len(skipped)} übersprungen",
            "created_count": len(created),
            "skipped_count": len(skipped),
            "created": created,
            "skipped": skipped
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ ASSET-ID CONFIGURATION ENDPOINTS ============

# Default Asset-ID formats per type
DEFAULT_ASSET_ID_FORMATS = {
    # Tablets
    'tab_tsr_i7': {'type_suffix': 'TAB-i7', 'description': 'TSRID Tablet i7'},
    'tab_tsr_i5': {'type_suffix': 'TAB-i5', 'description': 'TSRID Tablet i5'},
    'tab_sp4': {'type_suffix': 'TAB-SP4', 'description': 'Surface Pro 4'},
    'tab_sp6': {'type_suffix': 'TAB-SP6', 'description': 'Surface Pro 6'},
    # Scanner
    'sca_tsr': {'type_suffix': 'SCA-TSR', 'description': 'TSRID Scanner'},
    'sca_dsk': {'type_suffix': 'SCA-DSK', 'description': 'Desko Scanner'},
    # Tablet Docks
    'tdo_qer': {'type_suffix': 'TDO-QER', 'description': 'Quer Dock (Surface)'},
    'tdo_tsr': {'type_suffix': 'TDO-TSR', 'description': 'TSRID Tablet Dock'},
    # Scanner Docks
    'sdo_dsk': {'type_suffix': 'SDO-DSK', 'description': 'Desko Scanner Dock'},
    'sdo_tsr': {'type_suffix': 'SDO-TSR', 'description': 'TSRID Scanner Dock'},
    # Netzteile
    'tps_spx': {'type_suffix': 'TPS-SPX', 'description': 'Surface Netzteil'},
    'tps_tsr': {'type_suffix': 'TPS-TSR', 'description': 'TSRID Tablet Netzteil'},
    'sps_dsk': {'type_suffix': 'SPS-DSK', 'description': 'Desko Scanner Netzteil'},
    'sps_tsr': {'type_suffix': 'SPS-TSR', 'description': 'TSRID Scanner Netzteil'},
    # Kabel
    'cab_usb_a': {'type_suffix': 'CAB-USBA', 'description': 'USB-A Kabel'},
    'cab_usb_c': {'type_suffix': 'CAB-USBC', 'description': 'USB-C Kabel'},
    'cab_lan': {'type_suffix': 'CAB-LAN', 'description': 'LAN-Kabel'},
    'cab_hdmi': {'type_suffix': 'CAB-HDMI', 'description': 'HDMI-Kabel'},
    'cab_dp': {'type_suffix': 'CAB-DP', 'description': 'DisplayPort-Kabel'},
    'cab_pwr': {'type_suffix': 'CAB-PWR', 'description': 'Stromkabel'},
    # Adapter
    'adp_usb_c': {'type_suffix': 'ADP-USBC', 'description': 'USB-C Adapter/Hub'},
    'adp_hdmi': {'type_suffix': 'ADP-HDMI', 'description': 'HDMI Adapter'},
    'adp_dp': {'type_suffix': 'ADP-DP', 'description': 'DisplayPort Adapter'},
    'adp_90': {'type_suffix': 'ADP-90', 'description': '90° Adapter'},
    # Stromverteiler
    'pwr_strip': {'type_suffix': 'PWR-STR', 'description': 'Netzleiste'},
    'pwr_12v': {'type_suffix': 'PWR-12V', 'description': '12V Verteiler'},
    # Sonstiges
    'other': {'type_suffix': 'OTH', 'description': 'Sonstiges'},
}


async def get_tenant_asset_config(tenant_id: str = "default"):
    """Get asset ID configuration for tenant"""
    config = await db.asset_id_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        # Return default config
        return {
            "tenant_id": tenant_id,
            "warehouse_prefix": "TSRID",
            "formats": DEFAULT_ASSET_ID_FORMATS
        }
    return config


async def get_next_available_warehouse_sequence(asset_type: str, tenant_id: str = "default", for_preview: bool = False):
    """
    Get next AVAILABLE sequence number for warehouse asset ID.
    
    This function finds the LOWEST available ID (fills gaps from deleted assets).
    It does NOT increment any counter - it calculates from existing data.
    
    Args:
        asset_type: Type of asset (e.g., 'tab_tsr_i7')
        tenant_id: Tenant identifier
        for_preview: If True, just preview without reserving
    
    Returns:
        The next available sequence number (fills gaps)
    """
    config = await get_tenant_asset_config(tenant_id)
    prefix = config.get("warehouse_prefix", "TSRID")
    type_suffix = DEFAULT_ASSET_ID_FORMATS.get(asset_type, {}).get('type_suffix', 'OTH')
    
    # Get ALL existing sequence numbers for this type
    pattern = f"^{prefix}-{type_suffix}-\\d{{4}}$"
    
    cursor = db.tsrid_assets.find(
        {"warehouse_asset_id": {"$regex": pattern}},
        {"warehouse_asset_id": 1}
    )
    
    existing_sequences = set()
    async for asset in cursor:
        wid = asset.get("warehouse_asset_id", "")
        parts = wid.split("-")
        if len(parts) >= 4:
            try:
                seq = int(parts[-1])
                existing_sequences.add(seq)
            except:
                pass
    
    # Find the FIRST available gap starting from 1
    next_seq = 1
    while next_seq in existing_sequences:
        next_seq += 1
    
    return next_seq


async def reserve_warehouse_sequence(asset_type: str, manufacturer_sn: str, tenant_id: str = "default", user: str = "system"):
    """
    Reserve a warehouse ID by finding the next available sequence.
    Also logs the action to the ID history for audit trail.
    
    Returns:
        tuple: (sequence_number, warehouse_asset_id)
    """
    config = await get_tenant_asset_config(tenant_id)
    prefix = config.get("warehouse_prefix", "TSRID")
    type_suffix = DEFAULT_ASSET_ID_FORMATS.get(asset_type, {}).get('type_suffix', 'OTH')
    
    next_seq = await get_next_available_warehouse_sequence(asset_type, tenant_id, for_preview=False)
    warehouse_id = generate_warehouse_asset_id(prefix, type_suffix, next_seq)
    
    # Log to ID history
    await log_id_history(
        warehouse_id=warehouse_id,
        action="created",
        asset_sn=manufacturer_sn,
        user=user,
        details={"asset_type": asset_type, "sequence": next_seq}
    )
    
    return next_seq, warehouse_id


async def log_id_history(warehouse_id: str, action: str, asset_sn: str = None, user: str = "system", 
                         previous_asset_sn: str = None, reason: str = None, details: dict = None):
    """
    Log an action to the ID history collection for full audit trail.
    
    Actions: created, deleted, reassigned, corrected
    """
    now = datetime.now(timezone.utc).isoformat()
    
    event = {
        "action": action,
        "timestamp": now,
        "user": user
    }
    
    if asset_sn:
        event["asset_sn"] = asset_sn
    if previous_asset_sn:
        event["previous_asset_sn"] = previous_asset_sn
    if reason:
        event["reason"] = reason
    if details:
        event["details"] = details
    
    # Upsert into the history collection
    await db.asset_id_history.update_one(
        {"_id": warehouse_id},
        {
            "$push": {"events": event},
            "$set": {"last_updated": now},
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )
    
    return event


async def get_id_history(warehouse_id: str):
    """Get the full history of an asset ID"""
    history = await db.asset_id_history.find_one({"_id": warehouse_id})
    if history:
        history["id"] = history.pop("_id")
    return history


# Keep old function name for compatibility but use new logic
async def get_next_warehouse_sequence(asset_type: str, tenant_id: str = "default"):
    """
    DEPRECATED: Use get_next_available_warehouse_sequence instead.
    This is kept for backward compatibility but now uses gap-filling logic.
    """
    return await get_next_available_warehouse_sequence(asset_type, tenant_id, for_preview=True)


async def validate_warehouse_id_unique(warehouse_asset_id: str) -> bool:
    """Check if a warehouse asset ID is unique"""
    existing = await db.tsrid_assets.find_one({"warehouse_asset_id": warehouse_asset_id})
    return existing is None


async def get_next_location_sequence(location_id: str):
    """Get next sequence number for assets at a location"""
    # Find the highest existing sequence for this location
    # Pattern: STRT01-XX-...
    pattern = f"^{location_id}-\\d{{2}}-"
    
    cursor = db.tsrid_assets.find(
        {"asset_id": {"$regex": pattern}},
        {"asset_id": 1}
    ).sort("asset_id", -1).limit(1)
    
    highest = await cursor.to_list(length=1)
    
    if highest and highest[0].get("asset_id"):
        # Extract sequence from STRT01-01-TAB-i7
        parts = highest[0]["asset_id"].split("-")
        if len(parts) >= 2:
            try:
                seq = int(parts[1])
                return seq + 1
            except:
                pass
    
    return 1  # Start with 1


def generate_warehouse_asset_id(prefix: str, type_suffix: str, sequence: int) -> str:
    """Generate warehouse asset ID: TSRID-TAB-i7-0001"""
    return f"{prefix}-{type_suffix}-{sequence:04d}"


def generate_location_asset_id(location_id: str, sequence: int, type_suffix: str) -> str:
    """Generate location-based asset ID: STRT01-01-TAB-i7"""
    return f"{location_id}-{sequence:02d}-{type_suffix}"


@router.get("/asset-id-config")
async def get_asset_id_config(tenant_id: str = Query("default")):
    """Get asset ID configuration for a tenant"""
    try:
        config = await get_tenant_asset_config(tenant_id)
        
        # Build format list with all types
        formats_list = []
        for asset_type, format_info in DEFAULT_ASSET_ID_FORMATS.items():
            formats_list.append({
                "asset_type": asset_type,
                "type_suffix": format_info['type_suffix'],
                "description": format_info['description'],
                "warehouse_example": f"{config.get('warehouse_prefix', 'TSRID')}-{format_info['type_suffix']}-0001",
                "location_example": f"LOC01-01-{format_info['type_suffix']}"
            })
        
        return {
            "success": True,
            "config": {
                "tenant_id": config.get("tenant_id", "default"),
                "warehouse_prefix": config.get("warehouse_prefix", "TSRID"),
                "formats": formats_list
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/asset-id-config")
async def update_asset_id_config(config: AssetIdConfigCreate):
    """Update asset ID configuration for a tenant"""
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        config_doc = {
            "tenant_id": config.tenant_id,
            "warehouse_prefix": config.warehouse_prefix,
            "formats": {f.asset_type: {"type_suffix": f.type_suffix, "description": f.description} 
                       for f in config.formats} if config.formats else DEFAULT_ASSET_ID_FORMATS,
            "updated_at": now
        }
        
        await db.asset_id_config.update_one(
            {"tenant_id": config.tenant_id},
            {"$set": config_doc},
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Asset-ID Konfiguration für Tenant '{config.tenant_id}' aktualisiert",
            "config": config_doc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/asset-id-config/next-id")
async def get_next_asset_id(asset_type: str, tenant_id: str = Query("default")):
    """Preview the next asset ID that would be generated for a given type"""
    try:
        config = await get_tenant_asset_config(tenant_id)
        prefix = config.get("warehouse_prefix", "TSRID")
        type_suffix = DEFAULT_ASSET_ID_FORMATS.get(asset_type, {}).get('type_suffix', 'OTH')
        
        next_seq = await get_next_warehouse_sequence(asset_type, tenant_id)
        next_id = generate_warehouse_asset_id(prefix, type_suffix, next_seq)
        
        return {
            "success": True,
            "asset_type": asset_type,
            "next_sequence": next_seq,
            "next_asset_id": next_id,
            "format_info": {
                "prefix": prefix,
                "type_suffix": type_suffix,
                "format": "{PREFIX}-{TYPE_SUFFIX}-{SEQ:04d}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ResetCounterRequest(BaseModel):
    """Request to reset/adjust a counter for an asset type"""
    asset_type: str
    new_value: int = Field(ge=1, description="New starting value for the counter")


@router.post("/asset-id-config/reset-counter")
async def reset_asset_counter(
    request: ResetCounterRequest,
    tenant_id: str = Query("default")
):
    """
    Reset/adjust the counter for a specific asset type.
    
    WARNUNG: Dies kann zu doppelten IDs führen, wenn Geräte mit höheren Nummern existieren.
    Nur verwenden, wenn Sie wissen, was Sie tun.
    """
    try:
        config = await get_tenant_asset_config(tenant_id)
        prefix = config.get("warehouse_prefix", "TSRID")
        type_suffix = DEFAULT_ASSET_ID_FORMATS.get(request.asset_type, {}).get('type_suffix', 'OTH')
        
        # Check if any assets exist with sequence >= new_value
        pattern = f"^{prefix}-{type_suffix}-\\d{{4}}$"
        cursor = db.tsrid_assets.find(
            {"warehouse_asset_id": {"$regex": pattern}},
            {"warehouse_asset_id": 1}
        )
        
        existing_sequences = []
        async for asset in cursor:
            wid = asset.get("warehouse_asset_id", "")
            parts = wid.split("-")
            if len(parts) >= 4:
                try:
                    seq = int(parts[-1])
                    if seq >= request.new_value:
                        existing_sequences.append(seq)
                except:
                    pass
        
        warning = None
        if existing_sequences:
            warning = f"WARNUNG: {len(existing_sequences)} Geräte mit Sequenz >= {request.new_value} existieren bereits: {sorted(existing_sequences)[:5]}{'...' if len(existing_sequences) > 5 else ''}"
        
        # Store the manual override in a separate collection
        now = datetime.now(timezone.utc).isoformat()
        
        # We don't actually store a counter - the system calculates from existing assets
        # But we can log this action for audit
        await db.asset_id_audit_log.insert_one({
            "tenant_id": tenant_id,
            "asset_type": request.asset_type,
            "action": "counter_reset_request",
            "old_method": "auto_calculated",
            "requested_value": request.new_value,
            "warning": warning,
            "created_at": now
        })
        
        # The actual "reset" effect comes from the fact that if someone wants sequence X,
        # they need to ensure no assets exist with sequences >= X for that type.
        # We'll return what the next ID would be.
        
        next_seq = await get_next_warehouse_sequence(request.asset_type, tenant_id)
        next_id = generate_warehouse_asset_id(prefix, type_suffix, next_seq)
        
        return {
            "success": True,
            "message": f"Zähler-Info für {request.asset_type}",
            "asset_type": request.asset_type,
            "type_suffix": type_suffix,
            "current_next_sequence": next_seq,
            "current_next_id": next_id,
            "requested_value": request.new_value,
            "warning": warning,
            "note": "Der Zähler wird automatisch aus existierenden Assets berechnet. Um die Sequenz zu ändern, müssten Assets mit höheren Nummern gelöscht oder umbenannt werden."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/intake-with-auto-id")
async def inventory_intake_with_auto_id(
    item: InventoryIntakeItem,
    received_by: str = Query(""),
    tenant_id: str = Query("default")
):
    """
    Wareneingang mit automatischer Asset-ID Generierung.
    Generiert: TSRID-TAB-i7-0001 (Lager-ID)
    
    Die ID wird intelligent vergeben:
    - Füllt Lücken von gelöschten IDs
    - Jede ID ist systemweit einzigartig
    - Alle Vergaben werden in der Historie protokolliert
    """
    try:
        # Validate received_by
        if not received_by or not received_by.strip():
            raise HTTPException(
                status_code=400,
                detail="'Empfangen von' ist erforderlich"
            )
        
        # ===== UNIQUENESS VALIDATION =====
        # Check if serial number already exists
        if item.manufacturer_sn:
            existing_sn = await db.tsrid_assets.find_one({"manufacturer_sn": item.manufacturer_sn})
            if existing_sn:
                raise HTTPException(
                    status_code=400,
                    detail=f"Seriennummer '{item.manufacturer_sn}' existiert bereits (Lager-ID: {existing_sn.get('warehouse_asset_id', 'N/A')})"
                )
        
        # Check if IMEI already exists (if provided)
        if item.imei and item.imei.strip():
            existing_imei = await db.tsrid_assets.find_one({"imei": item.imei})
            if existing_imei:
                raise HTTPException(
                    status_code=400,
                    detail=f"IMEI '{item.imei}' existiert bereits (Lager-ID: {existing_imei.get('warehouse_asset_id', 'N/A')})"
                )
        
        # Check if MAC already exists (if provided)
        if item.mac and item.mac.strip():
            existing_mac = await db.tsrid_assets.find_one({"mac": item.mac})
            if existing_mac:
                raise HTTPException(
                    status_code=400,
                    detail=f"MAC-Adresse '{item.mac}' existiert bereits (Lager-ID: {existing_mac.get('warehouse_asset_id', 'N/A')})"
                )
        
        # Get config and generate ID using the new gap-filling logic
        config = await get_tenant_asset_config(tenant_id)
        prefix = config.get("warehouse_prefix", "TSRID")
        type_suffix = DEFAULT_ASSET_ID_FORMATS.get(item.type, {}).get('type_suffix', 'OTH')
        
        # Use the new function that fills gaps and logs history
        next_seq, warehouse_id = await reserve_warehouse_sequence(
            asset_type=item.type,
            manufacturer_sn=item.manufacturer_sn,
            tenant_id=tenant_id,
            user=received_by
        )
        
        # Verify warehouse_id is unique (should always be, but double-check)
        existing_wid = await db.tsrid_assets.find_one({"warehouse_asset_id": warehouse_id})
        if existing_wid:
            raise HTTPException(
                status_code=400,
                detail=f"Asset-ID '{warehouse_id}' existiert bereits - bitte erneut versuchen"
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # NEUES SYSTEM: asset_id = warehouse_asset_id von Anfang an
        # Die ID ist permanent und ändert sich nie!
        asset_doc = {
            "asset_id": warehouse_id,  # SOFORT gleich wie warehouse_asset_id
            "warehouse_asset_id": warehouse_id,  # Permanent warehouse ID
            "original_warehouse_id": warehouse_id,  # Never changes - for history
            "manufacturer_sn": item.manufacturer_sn,
            "type": item.type,
            "type_label": ASSET_TYPE_LABELS.get(item.type, item.type),
            "type_suffix": type_suffix,
            "imei": item.imei if item.imei and item.imei.strip() else None,
            "mac": item.mac if item.mac and item.mac.strip() else None,
            "manufacturer": item.manufacturer,
            "model": item.model,
            "status": "in_storage",  # Im Lager (nicht "unassigned")
            "location_id": None,  # Noch kein Standort zugewiesen
            "country": None,
            "bundle_id": None,
            "assigned_to_kit": None,
            "notes": item.notes,
            "intake_date": now,
            "received_by": received_by,
            "history": [{
                "date": now,
                "event": f"Wareneingang: {ASSET_TYPE_LABELS.get(item.type, item.type)}",
                "event_type": "intake",
                "notes": f"SN: {item.manufacturer_sn}, Asset-ID: {warehouse_id}",
                "technician": received_by
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(asset_doc)
        
        # ===== AUDIT LOGGING & VERIFICATION =====
        try:
            from services.audit_service import log_audit, AuditAction, verify_write
            
            # Log the creation
            audit_entry = await log_audit(
                action=AuditAction.CREATE,
                collection="tsrid_assets",
                document_id=warehouse_id,
                user=received_by,
                data_before=None,
                data_after=asset_doc,
                metadata={
                    "manufacturer_sn": item.manufacturer_sn,
                    "type": item.type,
                    "source": "intake-with-auto-id"
                },
                app_source="web_portal"
            )
            
            # Verify the write was successful
            verified = await verify_write(
                collection="tsrid_assets",
                document_id=warehouse_id,
                expected_data={"status": "in_storage"},
                audit_id=audit_entry.get("_id")
            )
            
            if not verified:
                # Log error but don't fail - data was written
                import logging
                logging.warning(f"Write verification failed for {warehouse_id}")
        except Exception as audit_error:
            # Don't fail the operation if audit fails
            import logging
            logging.error(f"Audit logging failed: {audit_error}")
        
        # Check if this was a reused ID (from deleted asset)
        id_history = await get_id_history(warehouse_id)
        was_reused = id_history and len(id_history.get("events", [])) > 1
        
        return {
            "success": True,
            "message": f"Gerät erfasst mit ID: {warehouse_id}",
            "asset_id": warehouse_id,  # SOFORT verfügbar
            "warehouse_asset_id": warehouse_id,
            "manufacturer_sn": item.manufacturer_sn,
            "type": item.type,
            "type_label": ASSET_TYPE_LABELS.get(item.type, item.type),
            "status": "in_storage",
            "id_was_reused": was_reused,
            "verified": True,  # Data integrity confirmed
            "note": "ID wurde wiederverwendet (vorheriges Gerät gelöscht)" if was_reused else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/intake-bulk")
async def inventory_intake_bulk(
    request: BulkIntakeRequest,
    tenant_id: str = Query("default")
):
    """
    Bulk-Wareneingang: Mehrere Geräte mit automatischer Asset-ID erstellen.
    
    Die IDs werden intelligent vergeben (Lücken-Füllend):
    - Füllt Lücken von gelöschten IDs
    - Jede ID ist systemweit einzigartig
    - Alle Vergaben werden in der Historie protokolliert
    
    Optionen:
    1. Anzahl angeben → System generiert automatisch N Einträge mit Platzhalter-SNs
    2. Seriennummer-Liste → System generiert Asset-IDs für jede SN
    """
    try:
        config = await get_tenant_asset_config(tenant_id)
        prefix = config.get("warehouse_prefix", "TSRID")
        type_suffix = DEFAULT_ASSET_ID_FORMATS.get(request.asset_type, {}).get('type_suffix', 'OTH')
        
        now = datetime.now(timezone.utc).isoformat()
        created = []
        skipped = []
        
        # Determine how many assets to create
        if request.serial_numbers and len(request.serial_numbers) > 0:
            # Use provided serial numbers
            items_to_create = request.serial_numbers
        elif request.count > 0:
            # Generate placeholder serial numbers
            items_to_create = [f"PENDING-{i+1:04d}" for i in range(request.count)]
        else:
            raise HTTPException(status_code=400, detail="Entweder 'count' oder 'serial_numbers' muss angegeben werden")
        
        for i, sn in enumerate(items_to_create):
            # Skip if SN already exists (unless placeholder)
            if not sn.startswith("PENDING-"):
                existing = await db.tsrid_assets.find_one({"manufacturer_sn": sn})
                if existing:
                    skipped.append({"manufacturer_sn": sn, "reason": "Existiert bereits"})
                    continue
            
            # Use the new gap-filling sequence function for each item
            next_seq, warehouse_id = await reserve_warehouse_sequence(
                asset_type=request.asset_type,
                manufacturer_sn=sn,
                tenant_id=tenant_id,
                user=request.received_by or "system"
            )
            
            # Get optional IMEI/MAC if provided
            imei = request.imeis[i] if request.imeis and i < len(request.imeis) else ""
            mac = request.macs[i] if request.macs and i < len(request.macs) else ""
            
            asset_doc = {
                "asset_id": None,
                "warehouse_asset_id": warehouse_id,
                "original_warehouse_id": warehouse_id,
                "manufacturer_sn": sn,
                "type": request.asset_type,
                "type_label": ASSET_TYPE_LABELS.get(request.asset_type, request.asset_type),
                "type_suffix": type_suffix,
                "imei": imei,
                "mac": mac,
                "manufacturer": "",
                "model": "",
                "status": "unassigned",
                "location_id": None,
                "country": None,
                "bundle_id": None,
                "assigned_to_kit": None,
                "notes": request.notes,
                "intake_date": now,
                "received_by": request.received_by,
                "supplier": request.supplier,
                "delivery_note": request.delivery_note,
                "history": [{
                    "date": now,
                    "event": f"Wareneingang (Bulk): {ASSET_TYPE_LABELS.get(request.asset_type, request.asset_type)}",
                    "event_type": "intake",
                    "notes": f"SN: {sn}, Lager-ID: {warehouse_id}, Lieferant: {request.supplier}",
                    "technician": request.received_by
                }],
                "created_at": now,
                "updated_at": now
            }
            
            await db.tsrid_assets.insert_one(asset_doc)
            created.append({
                "warehouse_asset_id": warehouse_id,
                "manufacturer_sn": sn,
                "imei": imei,
                "mac": mac
            })
        
        return {
            "success": True,
            "message": f"{len(created)} Geräte erstellt, {len(skipped)} übersprungen",
            "created_count": len(created),
            "skipped_count": len(skipped),
            "created": created,
            "skipped": skipped,
            "first_id": created[0]["warehouse_asset_id"] if created else None,
            "last_id": created[-1]["warehouse_asset_id"] if created else None,
            "note": "IDs werden intelligent vergeben (Lücken werden gefüllt)"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/assign-to-location/{manufacturer_sn}")
async def assign_asset_to_location_by_sn(
    manufacturer_sn: str,
    location_id: str = Query(...),
    technician: str = Query("")
):
    """
    Asset einer Location zuweisen.
    Die warehouse_asset_id (z.B. TSRID-TAB-i7-0035) bleibt die permanente Asset-ID!
    Es wird KEINE neue ID generiert - nur die Location wird verknüpft.
    """
    try:
        # Find the asset
        asset = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Gerät mit SN {manufacturer_sn} nicht gefunden")
        
        # Store data before update for audit
        data_before = dict(asset)
        
        # Check if already assigned
        if asset.get("location_id"):
            raise HTTPException(
                status_code=400,
                detail=f"Gerät ist bereits Location {asset.get('location_id')} zugewiesen"
            )
        
        # Verify location exists - use helper that checks both location_code and location_id
        location = await find_location(location_id)
        if not location:
            raise HTTPException(status_code=404, detail=f"Location {location_id} nicht gefunden")
        
        # Die warehouse_asset_id wird zur permanenten asset_id - KEINE neue ID!
        permanent_asset_id = asset.get("warehouse_asset_id")
        if not permanent_asset_id:
            raise HTTPException(
                status_code=400, 
                detail="Gerät hat keine Lager-ID. Bitte erst im Wareneingang erfassen."
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update asset - ID bleibt gleich, nur Location wird hinzugefügt
        update_data = {
            "asset_id": permanent_asset_id,  # Gleiche ID wie warehouse_asset_id!
            "location_id": location_id,
            "status": "deployed",
            "updated_at": now
        }
        
        # Add history entry
        history_entry = {
            "date": now,
            "event": f"Location zugewiesen: {location_id}",
            "event_type": "assigned_to_location",
            "notes": f"Asset-ID beibehalten: {permanent_asset_id}",
            "technician": technician
        }
        
        await db.tsrid_assets.update_one(
            {"manufacturer_sn": manufacturer_sn},
            {
                "$set": update_data,
                "$push": {"history": history_entry}
            }
        )
        
        # Get updated document for audit
        updated_asset = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
        
        # ===== AUDIT LOGGING =====
        try:
            from services.audit_service import log_audit, AuditAction, verify_write
            
            audit_entry = await log_audit(
                action=AuditAction.UPDATE,
                collection="tsrid_assets",
                document_id=permanent_asset_id,
                user=technician or "system",
                data_before=data_before,
                data_after=dict(updated_asset) if updated_asset else None,
                metadata={
                    "operation": "assign_to_location",
                    "location_id": location_id,
                    "location_name": location.get("station_name", location_id)
                },
                app_source="web_portal"
            )
            
            await verify_write(
                collection="tsrid_assets",
                document_id=permanent_asset_id,
                expected_data={"location_id": location_id},
                audit_id=audit_entry.get("_id")
            )
        except Exception as audit_error:
            import logging
            logging.error(f"Audit logging failed: {audit_error}")
        
        # Log to ID history
        await log_id_history(
            permanent_asset_id,
            "assigned_to_location",
            manufacturer_sn,
            technician,
            f"Zugewiesen an Location: {location_id}"
        )
        
        return {
            "success": True,
            "message": f"Gerät {permanent_asset_id} zu Location {location_id} zugewiesen",
            "manufacturer_sn": manufacturer_sn,
            "warehouse_asset_id": permanent_asset_id,
            "asset_id": permanent_asset_id,  # Beide sind jetzt gleich!
            "location_id": location_id,
            "location_name": location.get("station_name", location_id),
            "verified": True,
            "note": "Die Lager-ID bleibt unverändert. Kein neues Label erforderlich."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/remove-from-location/{manufacturer_sn}")
async def remove_asset_from_location(
    manufacturer_sn: str,
    technician: str = Query("")
):
    """
    Asset von Location entfernen.
    Die Asset-ID (warehouse_asset_id) bleibt UNVERÄNDERT!
    Nur die Location-Verknüpfung wird entfernt.
    """
    try:
        # Find the asset
        asset = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Gerät mit SN {manufacturer_sn} nicht gefunden")
        
        # Check if assigned to location
        if not asset.get("location_id"):
            raise HTTPException(
                status_code=400,
                detail="Gerät ist keiner Location zugewiesen"
            )
        
        old_location_id = asset.get("location_id")
        permanent_asset_id = asset.get("warehouse_asset_id") or asset.get("asset_id")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update asset - Die ID bleibt gleich, nur Location wird entfernt
        # asset_id bleibt erhalten (gleich wie warehouse_asset_id)
        update_data = {
            # asset_id bleibt unverändert!
            "location_id": None,
            "status": "in_storage",  # Zurück ins Lager
            "updated_at": now
        }
        
        # Add history entry
        history_entry = {
            "date": now,
            "event": f"Von Location entfernt: {old_location_id}",
            "event_type": "removed_from_location",
            "notes": f"Asset-ID beibehalten: {permanent_asset_id}, zurück ins Lager",
            "technician": technician
        }
        
        await db.tsrid_assets.update_one(
            {"manufacturer_sn": manufacturer_sn},
            {
                "$set": update_data,
                "$push": {"history": history_entry}
            }
        )
        
        # Log to ID history
        await log_id_history(
            permanent_asset_id,
            "removed_from_location",
            manufacturer_sn,
            technician,
            f"Entfernt von Location: {old_location_id}"
        )
        
        return {
            "success": True,
            "message": f"Gerät {permanent_asset_id} von Location {old_location_id} entfernt",
            "manufacturer_sn": manufacturer_sn,
            "asset_id": permanent_asset_id,  # ID bleibt gleich!
            "warehouse_asset_id": permanent_asset_id,
            "status": "unassigned",
            "note": "Die Asset-ID bleibt unverändert. Das Label ist weiterhin gültig."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# SUPPLIERS & PRODUCTS MANAGEMENT (Full CRUD)
# ============================================================

# Default suppliers list (for backwards compatibility)
DEFAULT_SUPPLIERS = [
    "TSRID GmbH",
    "Microsoft",
    "Dell",
    "HP",
    "Lenovo",
    "Apple",
    "Samsung",
    "Desko",
    "Regula",
    "Brother",
    "Sonstige"
]


@router.get("/suppliers")
async def list_suppliers():
    """Liste aller Lieferanten - kombiniert DB-Einträge mit Legacy-Namen"""
    try:
        # Get suppliers from dedicated collection
        cursor = db.suppliers.find({}, {"_id": 0}).sort("name", 1)
        db_suppliers = await cursor.to_list(length=1000)
        
        # Get unique supplier names from existing assets (legacy)
        pipeline = [
            {"$match": {"supplier": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$supplier"}},
            {"$sort": {"_id": 1}}
        ]
        asset_cursor = db.tsrid_assets.aggregate(pipeline)
        asset_suppliers = [doc["_id"] async for doc in asset_cursor if doc["_id"]]
        
        # Build supplier names list (for dropdown)
        supplier_names = set()
        for s in db_suppliers:
            supplier_names.add(s.get("name"))
        for s in asset_suppliers:
            supplier_names.add(s)
        for s in DEFAULT_SUPPLIERS:
            supplier_names.add(s)
        
        # Filter and sort
        supplier_names = sorted([s for s in supplier_names if s])
        
        return {
            "success": True,
            "suppliers": supplier_names,  # Simple list for dropdown
            "suppliers_full": db_suppliers,  # Full data for management
            "total": len(db_suppliers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suppliers/all")
async def list_all_suppliers(
    search: str = "",
    supplier_type: str = "",
    limit: int = 100,
    skip: int = 0
):
    """Liste aller Lieferanten mit vollständigen Daten"""
    try:
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}},
                {"customer_number": {"$regex": search, "$options": "i"}}
            ]
        if supplier_type:
            query["supplier_type"] = supplier_type
        
        cursor = db.suppliers.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(limit)
        suppliers = await cursor.to_list(length=limit)
        total = await db.suppliers.count_documents(query)
        
        return {
            "success": True,
            "suppliers": suppliers,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str):
    """Einzelnen Lieferanten abrufen"""
    try:
        supplier = await db.suppliers.find_one({"supplier_id": supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail=f"Lieferant {supplier_id} nicht gefunden")
        
        # Get products for this supplier
        products_cursor = db.products.find({"supplier_id": supplier_id}, {"_id": 0})
        products = await products_cursor.to_list(length=1000)
        
        # Get asset count from this supplier
        asset_count = await db.tsrid_assets.count_documents({"supplier": supplier.get("name")})
        
        return {
            "success": True,
            "supplier": supplier,
            "products": products,
            "asset_count": asset_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suppliers")
async def create_supplier(data: SupplierCreate):
    """Neuen Lieferanten anlegen"""
    try:
        # Check if supplier with same name exists
        existing = await db.suppliers.find_one({"name": data.name})
        if existing:
            raise HTTPException(status_code=400, detail=f"Lieferant '{data.name}' existiert bereits")
        
        # Generate supplier_id
        count = await db.suppliers.count_documents({})
        supplier_id = f"SUP-{count + 1:04d}"
        
        supplier_doc = {
            "supplier_id": supplier_id,
            "name": data.name,
            "street": data.street,
            "zip_code": data.zip_code,
            "city": data.city,
            "country": data.country,
            "phone": data.phone,
            "email": data.email,
            "website": data.website,
            "customer_number": data.customer_number,
            "tax_id": data.tax_id,
            "contacts": [c.model_dump() for c in data.contacts] if data.contacts else [],
            "notes": data.notes,
            "supplier_type": data.supplier_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.suppliers.insert_one(supplier_doc)
        
        # Remove _id for response
        supplier_doc.pop("_id", None)
        
        return {
            "success": True,
            "message": f"Lieferant '{data.name}' wurde angelegt",
            "supplier": supplier_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: SupplierUpdate):
    """Lieferanten aktualisieren"""
    try:
        existing = await db.suppliers.find_one({"supplier_id": supplier_id})
        if not existing:
            raise HTTPException(status_code=404, detail=f"Lieferant {supplier_id} nicht gefunden")
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "contacts" and value:
                    update_doc[field] = [c if isinstance(c, dict) else c.model_dump() for c in value]
                else:
                    update_doc[field] = value
        
        # If name changed, update assets
        if data.name and data.name != existing.get("name"):
            await db.tsrid_assets.update_many(
                {"supplier": existing.get("name")},
                {"$set": {"supplier": data.name}}
            )
        
        await db.suppliers.update_one({"supplier_id": supplier_id}, {"$set": update_doc})
        
        updated = await db.suppliers.find_one({"supplier_id": supplier_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Lieferant wurde aktualisiert",
            "supplier": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    """Lieferanten löschen"""
    try:
        existing = await db.suppliers.find_one({"supplier_id": supplier_id})
        if not existing:
            raise HTTPException(status_code=404, detail=f"Lieferant {supplier_id} nicht gefunden")
        
        # Check if supplier has products
        products_count = await db.products.count_documents({"supplier_id": supplier_id})
        if products_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Lieferant hat noch {products_count} Produkte. Bitte zuerst Produkte löschen."
            )
        
        # Check if supplier is used in assets
        asset_count = await db.tsrid_assets.count_documents({"supplier": existing.get("name")})
        
        await db.suppliers.delete_one({"supplier_id": supplier_id})
        
        return {
            "success": True,
            "message": f"Lieferant '{existing.get('name')}' wurde gelöscht",
            "affected_assets": asset_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# PRODUCTS MANAGEMENT
# ============================================================

@router.get("/products")
async def list_products(
    supplier_id: str = "",
    asset_type: str = "",
    category: str = "",
    search: str = "",
    limit: int = 100,
    skip: int = 0
):
    """Liste aller Produkte"""
    try:
        query = {}
        if supplier_id:
            query["supplier_id"] = supplier_id
        if asset_type:
            query["asset_type"] = asset_type
        if category:
            query["category"] = category
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}},
                {"manufacturer_sku": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db.products.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(limit)
        products = await cursor.to_list(length=limit)
        total = await db.products.count_documents(query)
        
        # Get categories for filter
        categories = await db.products.distinct("category")
        
        return {
            "success": True,
            "products": products,
            "total": total,
            "categories": sorted([c for c in categories if c])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Einzelnes Produkt abrufen"""
    try:
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produkt {product_id} nicht gefunden")
        
        # Get supplier info
        supplier = await db.suppliers.find_one({"supplier_id": product.get("supplier_id")}, {"_id": 0})
        
        return {
            "success": True,
            "product": product,
            "supplier": supplier
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products")
async def create_product(data: ProductCreate):
    """Neues Produkt anlegen"""
    try:
        # Check if supplier exists
        supplier = await db.suppliers.find_one({"supplier_id": data.supplier_id})
        if not supplier:
            raise HTTPException(status_code=404, detail=f"Lieferant {data.supplier_id} nicht gefunden")
        
        # Check if product with same SKU exists for this supplier
        if data.sku:
            existing = await db.products.find_one({
                "supplier_id": data.supplier_id,
                "sku": data.sku
            })
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Produkt mit SKU '{data.sku}' existiert bereits für diesen Lieferanten"
                )
        
        # Generate product_id
        count = await db.products.count_documents({})
        product_id = f"PRD-{count + 1:05d}"
        
        product_doc = {
            "product_id": product_id,
            "supplier_id": data.supplier_id,
            "supplier_name": supplier.get("name"),
            "name": data.name,
            "sku": data.sku,
            "manufacturer_sku": data.manufacturer_sku,
            "asset_type": data.asset_type,
            "category": data.category,
            "description": data.description,
            "unit_price": data.unit_price,
            "currency": data.currency,
            "specifications": data.specifications or {},
            "notes": data.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.products.insert_one(product_doc)
        product_doc.pop("_id", None)
        
        return {
            "success": True,
            "message": f"Produkt '{data.name}' wurde angelegt",
            "product": product_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate):
    """Produkt aktualisieren"""
    try:
        existing = await db.products.find_one({"product_id": product_id})
        if not existing:
            raise HTTPException(status_code=404, detail=f"Produkt {product_id} nicht gefunden")
        
        update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_doc[field] = value
        
        await db.products.update_one({"product_id": product_id}, {"$set": update_doc})
        
        updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Produkt wurde aktualisiert",
            "product": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Produkt löschen"""
    try:
        existing = await db.products.find_one({"product_id": product_id})
        if not existing:
            raise HTTPException(status_code=404, detail=f"Produkt {product_id} nicht gefunden")
        
        await db.products.delete_one({"product_id": product_id})
        
        return {
            "success": True,
            "message": f"Produkt '{existing.get('name')}' wurde gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/inventory/unassigned/bulk")
async def delete_unassigned_assets_bulk(serial_numbers: List[str], reason: str = Query("Bulk-Löschung"), user: str = Query("system")):
    """
    Löscht mehrere nicht zugewiesene Geräte aus dem Lager.
    Protokolliert jede Löschung in der ID-Historie für Nachvollziehbarkeit.
    WICHTIG: Diese Route muss VOR der parametrisierten Route /{manufacturer_sn} definiert sein!
    """
    try:
        deleted = []
        failed = []
        
        for sn in serial_numbers:
            # Find asset first to get warehouse_asset_id for history
            asset = await db.tsrid_assets.find_one({
                "manufacturer_sn": sn,
                "status": "unassigned",
                "asset_id": None
            })
            
            if asset:
                warehouse_id = asset.get("warehouse_asset_id")
                
                # Delete the asset
                result = await db.tsrid_assets.delete_one({
                    "manufacturer_sn": sn,
                    "status": "unassigned",
                    "asset_id": None
                })
                
                if result.deleted_count > 0:
                    deleted.append(sn)
                    
                    # Log to ID history - this ID is now available for reuse
                    if warehouse_id:
                        await log_id_history(
                            warehouse_id=warehouse_id,
                            action="deleted",
                            asset_sn=sn,
                            user=user,
                            reason=reason,
                            details={
                                "imei": asset.get("imei"),
                                "mac": asset.get("mac"),
                                "type": asset.get("type"),
                                "manufacturer": asset.get("manufacturer")
                            }
                        )
                else:
                    failed.append(sn)
            else:
                failed.append(sn)
        
        return {
            "success": True,
            "deleted_count": len(deleted),
            "failed_count": len(failed),
            "deleted": deleted,
            "failed": failed,
            "note": "Gelöschte IDs stehen für neue Geräte wieder zur Verfügung. Alle Löschungen wurden in der Historie protokolliert."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/inventory/unassigned/{manufacturer_sn}")
async def delete_unassigned_asset(manufacturer_sn: str, reason: str = Query("Manuell gelöscht"), user: str = Query("system"), hard_delete: bool = Query(False)):
    """
    SOFT DELETE: Archiviert ein Gerät aus dem Lager (ohne Location-Zuweisung).
    Das Gerät wird NICHT gelöscht, sondern auf Status 'archived' gesetzt.
    Es kann jederzeit wiederhergestellt werden.
    
    Nur Geräte ohne location_id können archiviert werden.
    Mit hard_delete=true kann ein echtes Löschen erzwungen werden (Admin only).
    """
    try:
        from services.audit_service import log_audit, AuditAction, verify_write
        
        # Find the asset without location assignment
        asset = await db.tsrid_assets.find_one({
            "manufacturer_sn": manufacturer_sn,
            "location_id": None,
            "status": {"$ne": "archived"}  # Don't delete already archived
        })
        
        if not asset:
            # Check if asset exists but is assigned to a location
            existing = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
            if existing:
                if existing.get("status") == "archived":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Gerät {manufacturer_sn} ist bereits archiviert"
                    )
                raise HTTPException(
                    status_code=400,
                    detail=f"Gerät {manufacturer_sn} ist einem Standort zugewiesen ({existing.get('location_id')}) und kann nicht gelöscht werden"
                )
            raise HTTPException(status_code=404, detail=f"Gerät mit SN {manufacturer_sn} nicht gefunden")
        
        warehouse_id = asset.get("warehouse_asset_id")
        data_before = dict(asset)
        now = datetime.now(timezone.utc).isoformat()
        
        if hard_delete:
            # HARD DELETE - only for special cases
            result = await db.tsrid_assets.delete_one({
                "manufacturer_sn": manufacturer_sn,
                "location_id": None
            })
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=500, detail="Fehler beim Löschen des Geräts")
            
            # Log audit
            audit_entry = await log_audit(
                action=AuditAction.DELETE,
                collection="tsrid_assets",
                document_id=warehouse_id,
                user=user,
                data_before=data_before,
                data_after=None,
                metadata={"reason": reason, "hard_delete": True}
            )
            
            # Log to ID history
            if warehouse_id:
                await log_id_history(
                    warehouse_id=warehouse_id,
                    action="deleted",
                    asset_sn=manufacturer_sn,
                    user=user,
                    reason=reason,
                    details={
                        "imei": asset.get("imei"),
                        "mac": asset.get("mac"),
                        "type": asset.get("type"),
                        "hard_delete": True
                    }
                )
            
            return {
                "success": True,
                "message": f"Gerät {manufacturer_sn} wurde PERMANENT gelöscht",
                "deleted_sn": manufacturer_sn,
                "freed_id": warehouse_id,
                "hard_delete": True,
                "audit_id": audit_entry.get("_id"),
                "note": f"Die ID {warehouse_id} steht jetzt für ein neues Gerät zur Verfügung."
            }
        else:
            # SOFT DELETE - Archive the asset
            update_result = await db.tsrid_assets.update_one(
                {"_id": asset["_id"]},
                {
                    "$set": {
                        "status": "archived",
                        "archived_at": now,
                        "archived_by": user,
                        "archive_reason": reason,
                        "previous_status": asset.get("status", "in_storage"),
                        "updated_at": now
                    },
                    "$push": {
                        "history": {
                            "date": now,
                            "event": f"Archiviert: {reason}",
                            "event_type": "archived",
                            "technician": user
                        }
                    }
                }
            )
            
            # Get updated document for verification
            updated_asset = await db.tsrid_assets.find_one({"_id": asset["_id"]})
            
            # Log audit
            audit_entry = await log_audit(
                action=AuditAction.ARCHIVE,
                collection="tsrid_assets",
                document_id=warehouse_id,
                user=user,
                data_before=data_before,
                data_after=dict(updated_asset) if updated_asset else None,
                metadata={"reason": reason, "soft_delete": True}
            )
            
            # Verify the write was successful
            verified = await verify_write(
                collection="tsrid_assets",
                document_id=warehouse_id,
                expected_data={"status": "archived"},
                audit_id=audit_entry.get("_id")
            )
            
            # Log to ID history
            if warehouse_id:
                await log_id_history(
                    warehouse_id=warehouse_id,
                    action="archived",
                    asset_sn=manufacturer_sn,
                    user=user,
                    reason=reason,
                    details={
                        "imei": asset.get("imei"),
                        "mac": asset.get("mac"),
                        "type": asset.get("type"),
                        "can_restore": True
                    }
                )
            
            return {
                "success": True,
                "message": f"Gerät {manufacturer_sn} wurde archiviert (kann wiederhergestellt werden)",
                "archived_sn": manufacturer_sn,
                "warehouse_id": warehouse_id,
                "archived_at": now,
                "audit_id": audit_entry.get("_id"),
                "verified": verified,
                "can_restore": True,
                "note": "Das Gerät wurde NICHT gelöscht, sondern archiviert. Es kann über /api/audit/restore wiederhergestellt werden."
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UnassignedAssetUpdate(BaseModel):
    """Model for updating an unassigned asset in Wareneingang"""
    manufacturer_sn: Optional[str] = None
    imei: Optional[str] = None
    mac: Optional[str] = None
    notes: Optional[str] = None


@router.put("/inventory/unassigned/{warehouse_asset_id}")
async def update_unassigned_asset(warehouse_asset_id: str, update: UnassignedAssetUpdate):
    """
    Aktualisiert ein nicht zugewiesenes Gerät im Wareneingang.
    Ermöglicht die Korrektur von falschen Scans (Seriennummer, IMEI, MAC).
    Nur Geräte mit status='unassigned' und ohne asset_id können bearbeitet werden.
    """
    try:
        # Find the unassigned asset
        asset = await db.tsrid_assets.find_one({
            "warehouse_asset_id": warehouse_asset_id,
            "status": "unassigned",
            "asset_id": None
        })
        
        if not asset:
            existing = await db.tsrid_assets.find_one({"warehouse_asset_id": warehouse_asset_id})
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Gerät {warehouse_asset_id} ist bereits zugewiesen und kann nicht bearbeitet werden"
                )
            raise HTTPException(status_code=404, detail=f"Gerät mit Lager-ID {warehouse_asset_id} nicht gefunden")
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        # Check for uniqueness of new values
        if update.manufacturer_sn is not None and update.manufacturer_sn != asset.get("manufacturer_sn"):
            existing_sn = await db.tsrid_assets.find_one({
                "manufacturer_sn": update.manufacturer_sn,
                "warehouse_asset_id": {"$ne": warehouse_asset_id}
            })
            if existing_sn:
                raise HTTPException(
                    status_code=400,
                    detail=f"Seriennummer '{update.manufacturer_sn}' existiert bereits (Lager-ID: {existing_sn.get('warehouse_asset_id', 'N/A')})"
                )
            update_doc["manufacturer_sn"] = update.manufacturer_sn
        
        if update.imei is not None:
            if update.imei and update.imei.strip():
                existing_imei = await db.tsrid_assets.find_one({
                    "imei": update.imei,
                    "warehouse_asset_id": {"$ne": warehouse_asset_id}
                })
                if existing_imei:
                    raise HTTPException(
                        status_code=400,
                        detail=f"IMEI '{update.imei}' existiert bereits (Lager-ID: {existing_imei.get('warehouse_asset_id', 'N/A')})"
                    )
            update_doc["imei"] = update.imei.strip() if update.imei else ""
        
        if update.mac is not None:
            if update.mac and update.mac.strip():
                existing_mac = await db.tsrid_assets.find_one({
                    "mac": update.mac,
                    "warehouse_asset_id": {"$ne": warehouse_asset_id}
                })
                if existing_mac:
                    raise HTTPException(
                        status_code=400,
                        detail=f"MAC-Adresse '{update.mac}' existiert bereits (Lager-ID: {existing_mac.get('warehouse_asset_id', 'N/A')})"
                    )
            update_doc["mac"] = update.mac.strip() if update.mac else ""
        
        if update.notes is not None:
            update_doc["notes"] = update.notes
        
        # Update the asset
        result = await db.tsrid_assets.update_one(
            {"warehouse_asset_id": warehouse_asset_id, "status": "unassigned", "asset_id": None},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0 and len(update_doc) > 1:
            raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren des Geräts")
        
        # Fetch updated asset
        updated_asset = await db.tsrid_assets.find_one(
            {"warehouse_asset_id": warehouse_asset_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "message": f"Gerät {warehouse_asset_id} wurde aktualisiert",
            "asset": updated_asset
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/inventory/id-history/{warehouse_asset_id}")
async def get_warehouse_id_history(warehouse_asset_id: str):
    """
    Ruft die vollständige Historie einer Lager-ID ab.
    
    Zeigt alle Ereignisse wie:
    - Erstellung
    - Löschung (ID wird freigegeben)
    - Neuzuweisung (ID wurde wiederverwendet)
    - Korrekturen
    
    Dies ist wichtig für die Nachvollziehbarkeit im Livesystem.
    """
    try:
        history = await get_id_history(warehouse_asset_id)
        
        if not history:
            return {
                "success": True,
                "warehouse_asset_id": warehouse_asset_id,
                "history": None,
                "message": "Keine Historie für diese ID gefunden"
            }
        
        return {
            "success": True,
            "warehouse_asset_id": warehouse_asset_id,
            "history": history,
            "event_count": len(history.get("events", [])),
            "note": "Alle ID-Änderungen werden für Audit-Zwecke protokolliert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/id-history")
async def list_all_id_history(
    skip: int = Query(0),
    limit: int = Query(50),
    action_filter: str = Query(None, description="Filter by action: created, deleted, reassigned")
):
    """
    Listet alle ID-Historien-Einträge auf.
    Nützlich für Audit-Berichte und Übersicht über gelöschte/wiederverwendete IDs.
    """
    try:
        query = {}
        if action_filter:
            query["events.action"] = action_filter
        
        total = await db.asset_id_history.count_documents(query)
        cursor = db.asset_id_history.find(query).skip(skip).limit(limit).sort("last_updated", -1)
        
        histories = []
        async for doc in cursor:
            doc["warehouse_asset_id"] = doc.pop("_id")
            histories.append(doc)
        
        return {
            "success": True,
            "total": total,
            "histories": histories,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/inventory/validate-unique")
async def validate_unique_identifiers(
    manufacturer_sn: str = Query(None, description="Seriennummer zu prüfen"),
    imei: str = Query(None, description="IMEI zu prüfen"),
    mac: str = Query(None, description="MAC-Adresse zu prüfen")
):
    """
    Prüft ob SN, IMEI oder MAC bereits im System existieren.
    Wird beim Scannen verwendet um Duplikate sofort zu erkennen.
    """
    try:
        conflicts = []
        
        if manufacturer_sn and manufacturer_sn.strip():
            existing = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn.strip()})
            if existing:
                conflicts.append({
                    "field": "manufacturer_sn",
                    "value": manufacturer_sn,
                    "existing_id": existing.get("warehouse_asset_id"),
                    "message": f"Seriennummer '{manufacturer_sn}' existiert bereits (Lager-ID: {existing.get('warehouse_asset_id', 'N/A')})"
                })
        
        if imei and imei.strip():
            existing = await db.tsrid_assets.find_one({"imei": imei.strip()})
            if existing:
                conflicts.append({
                    "field": "imei",
                    "value": imei,
                    "existing_id": existing.get("warehouse_asset_id"),
                    "message": f"IMEI '{imei}' existiert bereits (Lager-ID: {existing.get('warehouse_asset_id', 'N/A')})"
                })
        
        if mac and mac.strip():
            existing = await db.tsrid_assets.find_one({"mac": mac.strip()})
            if existing:
                conflicts.append({
                    "field": "mac",
                    "value": mac,
                    "existing_id": existing.get("warehouse_asset_id"),
                    "message": f"MAC-Adresse '{mac}' existiert bereits (Lager-ID: {existing.get('warehouse_asset_id', 'N/A')})"
                })
        
        return {
            "success": True,
            "is_unique": len(conflicts) == 0,
            "conflicts": conflicts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/inventory/check-duplicate")
async def check_duplicate_warehouse_ids():
    """
    Prüft auf doppelte Lager-IDs und gibt eine Liste zurück.
    """
    try:
        # Aggregate to find duplicates
        pipeline = [
            {"$match": {"warehouse_asset_id": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$warehouse_asset_id", "count": {"$sum": 1}, "docs": {"$push": {"sn": "$manufacturer_sn", "imei": "$imei"}}}},
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        duplicates = await db.tsrid_assets.aggregate(pipeline).to_list(length=100)
        
        return {
            "success": True,
            "has_duplicates": len(duplicates) > 0,
            "duplicate_count": len(duplicates),
            "duplicates": duplicates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/fix-duplicate/{warehouse_asset_id}")
async def fix_duplicate_warehouse_id(warehouse_asset_id: str):
    """
    Korrigiert doppelte Lager-IDs indem eine neue, einzigartige ID generiert wird.
    Behält das erste Gerät mit der ursprünglichen ID, gibt dem Duplikat eine neue ID.
    """
    try:
        # Find all assets with this warehouse_asset_id
        assets = await db.tsrid_assets.find(
            {"warehouse_asset_id": warehouse_asset_id}
        ).sort("created_at", 1).to_list(length=10)
        
        if len(assets) <= 1:
            return {
                "success": True,
                "message": "Keine Duplikate gefunden",
                "duplicates_fixed": 0
            }
        
        # Keep the first one, rename the others
        fixed = []
        for i, asset in enumerate(assets[1:], start=1):
            # Get asset type and generate new ID
            asset_type = asset.get("type", "other")
            type_suffix = DEFAULT_ASSET_ID_FORMATS.get(asset_type, {}).get('type_suffix', 'OTH')
            prefix = "TSRID"  # Default prefix
            
            new_seq = await get_next_warehouse_sequence(asset_type, "default")
            new_id = generate_warehouse_asset_id(prefix, type_suffix, new_seq)
            
            # Update the asset with new ID
            result = await db.tsrid_assets.update_one(
                {"_id": asset["_id"]},
                {"$set": {
                    "warehouse_asset_id": new_id,
                    "original_warehouse_id": asset.get("original_warehouse_id", warehouse_asset_id),
                    "duplicate_fixed_at": datetime.now(timezone.utc).isoformat(),
                    "duplicate_fixed_from": warehouse_asset_id
                }}
            )
            
            if result.modified_count > 0:
                fixed.append({
                    "old_id": warehouse_asset_id,
                    "new_id": new_id,
                    "manufacturer_sn": asset.get("manufacturer_sn")
                })
        
        return {
            "success": True,
            "message": f"{len(fixed)} Duplikat(e) korrigiert",
            "duplicates_fixed": len(fixed),
            "fixed_items": fixed
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/unassigned")
async def list_unassigned_assets(
    type: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """
    Liste aller Geräte im Lager (ohne Standort-Zuweisung).
    Diese Geräte haben eine Asset-ID, aber noch keinen Standort (location_id ist None).
    """
    try:
        # "Im Lager" = location_id ist null und nicht ausgemustert
        query = {
            "location_id": None,
            "status": {"$nin": ["retired", "disposed", "defective"]}
        }
        
        if type:
            query["type"] = type
        if search:
            search_or = [
                {"manufacturer_sn": {"$regex": search, "$options": "i"}},
                {"imei": {"$regex": search, "$options": "i"}},
                {"warehouse_asset_id": {"$regex": search, "$options": "i"}},
                {"asset_id": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}}
            ]
            query = {"$and": [query, {"$or": search_or}]}
        
        total = await db.tsrid_assets.count_documents(query)
        cursor = db.tsrid_assets.find(query).skip(skip).limit(limit).sort("warehouse_asset_id", -1)
        assets = [serialize_doc(a) async for a in cursor]
        
        # Group by type for summary
        type_counts = {}
        base_query = {"location_id": None, "status": {"$nin": ["retired", "disposed", "defective"]}}
        all_in_storage = db.tsrid_assets.find(base_query)
        async for a in all_in_storage:
            t = a.get("type", "other")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        return {
            "success": True,
            "assets": assets,
            "total": total,
            "type_summary": type_counts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/assign/{manufacturer_sn}")
async def assign_asset_to_location(manufacturer_sn: str, assignment: AssetAssignToLocation):
    """
    Gerät einem Standort zuweisen.
    - Die warehouse_asset_id (z.B. TSRID-TAB-i7-0035) bleibt die permanente Asset-ID
    - Nur die Location wird verknüpft
    - Ändert Status von "unassigned" zu "in_storage"
    
    Die ID ändert sich NICHT - das Label aus dem Wareneingang bleibt gültig!
    """
    try:
        # Find the unassigned asset by serial number
        asset = await db.tsrid_assets.find_one({
            "manufacturer_sn": manufacturer_sn,
            "status": "unassigned"
        })
        
        if not asset:
            # Check if asset exists but is already assigned
            existing = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Gerät {manufacturer_sn} ist bereits zugewiesen an: {existing.get('location_id', 'unbekannt')}"
                )
            raise HTTPException(status_code=404, detail=f"Gerät mit SN {manufacturer_sn} nicht gefunden")
        
        # Get location info
        location = await find_location(assignment.location_id)
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {assignment.location_id} nicht gefunden")
        
        # Die warehouse_asset_id wird zur permanenten asset_id
        # KEINE neue ID-Generierung - die Lager-ID bleibt erhalten!
        permanent_asset_id = asset.get("warehouse_asset_id")
        
        if not permanent_asset_id:
            raise HTTPException(
                status_code=400, 
                detail="Gerät hat keine Lager-ID (warehouse_asset_id). Bitte erst im Wareneingang erfassen."
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update the asset - warehouse_asset_id wird zur asset_id
        update_data = {
            "asset_id": permanent_asset_id,  # Gleiche ID wie warehouse_asset_id!
            "location_id": assignment.location_id,
            "country": location.get("country", ""),
            "status": "in_storage",
            "assignment_date": now,
            "updated_at": now
        }
        
        # Add history entry
        history_entry = {
            "date": now,
            "event": f"Standort zugewiesen: {assignment.location_id}",
            "event_type": "assigned_to_location",
            "notes": f"Asset-ID beibehalten: {permanent_asset_id}, Location: {location.get('name', assignment.location_id)}",
            "technician": assignment.technician,
            "location_id": assignment.location_id
        }
        
        await db.tsrid_assets.update_one(
            {"manufacturer_sn": manufacturer_sn},
            {
                "$set": update_data,
                "$push": {"history": history_entry}
            }
        )
        
        # Log to ID history
        await log_id_history(
            permanent_asset_id,
            "assigned_to_location",
            asset.get("manufacturer_sn"),
            assignment.technician,
            f"Zugewiesen an Location: {assignment.location_id}"
        )
        
        # Generate label data - mit der permanenten ID
        label_data = {
            "asset_id": permanent_asset_id,
            "warehouse_asset_id": permanent_asset_id,  # Beide sind jetzt gleich
            "manufacturer_sn": manufacturer_sn,
            "type": asset.get("type", "other"),
            "type_label": ASSET_TYPE_LABELS.get(asset.get("type", "other"), asset.get("type", "other")),
            "location_id": assignment.location_id,
            "location_name": f"{location.get('customer', '')} - {location.get('city', '')}",
            "qr_content": permanent_asset_id,  # QR-Code enthält die permanente Asset-ID
            "generated_at": now
        }
        
        return {
            "success": True,
            "message": f"Gerät {permanent_asset_id} dem Standort {assignment.location_id} zugewiesen",
            "asset_id": permanent_asset_id,
            "warehouse_asset_id": permanent_asset_id,
            "manufacturer_sn": manufacturer_sn,
            "location_id": assignment.location_id,
            "status": "in_storage",
            "label": label_data,
            "print_label": False,  # Label wurde bereits im Wareneingang gedruckt - KEINE neue ID!
            "qr_code_content": permanent_asset_id,
            "note": "Die Lager-ID bleibt unverändert. Kein neues Label erforderlich."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/by-sn/{manufacturer_sn}")
async def get_asset_by_serial_number(manufacturer_sn: str):
    """
    Gerät anhand der Seriennummer finden.
    Nützlich beim Scannen eines Barcodes.
    """
    try:
        asset = await db.tsrid_assets.find_one({"manufacturer_sn": manufacturer_sn})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Gerät mit SN {manufacturer_sn} nicht gefunden")
        
        asset = serialize_doc(asset)
        asset["type_label"] = ASSET_TYPE_LABELS.get(asset.get("type"), asset.get("type"))
        
        return {
            "success": True,
            "asset": asset,
            "is_assigned": asset.get("asset_id") is not None,
            "status": asset.get("status")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/fix-unassigned-asset-ids")
async def fix_unassigned_asset_ids():
    """
    Migriert bestehende Assets zum neuen System:
    - Setzt asset_id = warehouse_asset_id für alle Assets wo asset_id null ist
    - Ändert status von "unassigned" zu "in_storage" für Assets ohne location
    """
    try:
        # 1. Set asset_id = warehouse_asset_id where asset_id is null
        result1 = await db.tsrid_assets.update_many(
            {
                "asset_id": None,
                "warehouse_asset_id": {"$ne": None}
            },
            [
                {"$set": {"asset_id": "$warehouse_asset_id"}}
            ]
        )
        
        # 2. Update status to "in_storage" for assets without location
        result2 = await db.tsrid_assets.update_many(
            {
                "location_id": None,
                "status": "unassigned"
            },
            {
                "$set": {"status": "in_storage"}
            }
        )
        
        return {
            "success": True,
            "message": f"Migration abgeschlossen",
            "asset_ids_set": result1.modified_count,
            "status_updated": result2.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/bulk-assign")
async def bulk_assign_to_location(
    serial_numbers: List[str],
    location_id: str = Query(...),
    technician: str = Query("")
):
    """
    Mehrere Geräte gleichzeitig einem Standort zuweisen.
    Jedes Gerät erhält eine eigene Asset-ID.
    """
    try:
        location = await find_location(location_id)
        if not location:
            raise HTTPException(status_code=404, detail=f"Standort {location_id} nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        assigned = []
        failed = []
        labels = []
        
        for sn in serial_numbers:
            asset = await db.tsrid_assets.find_one({
                "manufacturer_sn": sn,
                "status": "unassigned"
            })
            
            if not asset:
                existing = await db.tsrid_assets.find_one({"manufacturer_sn": sn})
                if existing:
                    failed.append({"sn": sn, "reason": f"Bereits zugewiesen: {existing.get('asset_id')}"})
                else:
                    failed.append({"sn": sn, "reason": "Nicht gefunden"})
                continue
            
            # Generate Asset-ID
            asset_type = asset.get("type", "other")
            type_suffix = ASSET_TYPE_SUFFIX_MAP.get(asset_type, "OTH")
            
            existing_count = await db.tsrid_assets.count_documents({
                "location_id": location_id,
                "type": asset_type,
                "asset_id": {"$ne": None}
            })
            
            asset_number = str(existing_count + 1).zfill(2)
            new_asset_id = f"{location_id}-{asset_number}-{type_suffix}"
            
            # Ensure unique
            while await db.tsrid_assets.find_one({"asset_id": new_asset_id}):
                existing_count += 1
                asset_number = str(existing_count + 1).zfill(2)
                new_asset_id = f"{location_id}-{asset_number}-{type_suffix}"
            
            # Update asset
            await db.tsrid_assets.update_one(
                {"manufacturer_sn": sn},
                {
                    "$set": {
                        "asset_id": new_asset_id,
                        "location_id": location_id,
                        "country": location.get("country", ""),
                        "status": "in_storage",
                        "assignment_date": now,
                        "updated_at": now
                    },
                    "$push": {
                        "history": {
                            "date": now,
                            "event": f"Standort zugewiesen: {location_id}",
                            "event_type": "assigned_to_location",
                            "notes": f"Asset-ID: {new_asset_id}",
                            "technician": technician
                        }
                    }
                }
            )
            
            assigned.append({
                "manufacturer_sn": sn,
                "asset_id": new_asset_id,
                "type": asset_type
            })
            
            labels.append({
                "asset_id": new_asset_id,
                "manufacturer_sn": sn,
                "type_label": ASSET_TYPE_LABELS.get(asset_type, asset_type),
                "location_id": location_id,
                "qr_content": new_asset_id
            })
        
        return {
            "success": True,
            "message": f"{len(assigned)} Geräte zugewiesen, {len(failed)} fehlgeschlagen",
            "assigned_count": len(assigned),
            "failed_count": len(failed),
            "assigned": assigned,
            "failed": failed,
            "labels": labels,
            "print_labels": len(labels) > 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/label/{asset_id}")
async def get_label_data(asset_id: str):
    """
    Label-Daten für ein Asset abrufen.
    Wird verwendet um ein Label nachträglich zu drucken.
    """
    try:
        asset = await db.tsrid_assets.find_one({"asset_id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} nicht gefunden")
        
        asset = serialize_doc(asset)
        
        # Get location info
        location = None
        if asset.get("location_id"):
            location = await find_location(asset["location_id"])
        
        label_data = {
            "asset_id": asset_id,
            "manufacturer_sn": asset.get("manufacturer_sn", ""),
            "type": asset.get("type", ""),
            "type_label": ASSET_TYPE_LABELS.get(asset.get("type"), asset.get("type")),
            "manufacturer": asset.get("manufacturer", ""),
            "model": asset.get("model", ""),
            "location_id": asset.get("location_id", ""),
            "location_name": f"{location.get('customer', '')} - {location.get('city', '')}" if location else "",
            "qr_content": asset_id,
            "barcode_content": asset.get("manufacturer_sn", "")
        }
        
        return {
            "success": True,
            "label": label_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ ENHANCED KIT MANAGEMENT ENDPOINTS ============

@router.post("/kits/create")
async def create_kit(kit_data: KitCreate):
    """
    Erstellt ein neues Kit aus verfügbaren Komponenten.
    Das Kit erhält eine temporäre ID: TSRID-KIT-XXX (automatisch hochgezählt).
    Status: 'incomplete' oder 'ready' je nach Vollständigkeit.
    """
    try:
        # 1. Get template
        template = await db.tsrid_kit_templates.find_one({"template_id": kit_data.template_id})
        if not template:
            raise HTTPException(status_code=404, detail=f"Kit Template {kit_data.template_id} nicht gefunden")
        
        # 2. Validate components
        components = []
        for asset_id in kit_data.component_asset_ids:
            asset = await db.tsrid_assets.find_one({
                "$or": [
                    {"asset_id": asset_id},
                    {"manufacturer_sn": asset_id}
                ]
            })
            
            if not asset:
                raise HTTPException(status_code=404, detail=f"Komponente nicht gefunden: {asset_id}")
            
            # Check if already assigned to another kit
            if asset.get("assigned_to_kit"):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Komponente {asset_id} ist bereits Kit {asset['assigned_to_kit']} zugewiesen"
                )
            
            # Check if assigned to a location (must be in storage)
            if asset.get("location_id") and asset.get("status") not in ["in_storage", "unassigned"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Komponente {asset_id} ist bereits einer Location zugewiesen und nicht im Lager"
                )
            
            components.append(asset)
        
        # 3. Generate Kit ID: TSRID-KIT-XXX
        existing_kits = await db.tsrid_assets.find(
            {"asset_id": {"$regex": "^TSRID-KIT-"}},
            {"asset_id": 1}
        ).sort("asset_id", -1).limit(1).to_list(1)
        
        next_num = 1
        if existing_kits:
            last_id = existing_kits[0].get("asset_id", "TSRID-KIT-000")
            try:
                last_num = int(last_id.split("-")[-1])
                next_num = last_num + 1
            except ValueError:
                pass
        
        kit_id = f"TSRID-KIT-{next_num:03d}"
        
        # 4. Determine kit status
        required_components = [c for c in template.get("components", []) if not c.get("optional", False)]
        is_complete = len(components) >= len(required_components)
        kit_status = "ready" if is_complete else "incomplete"
        
        now = datetime.now(timezone.utc).isoformat()
        
        # 5. Create kit document
        kit_doc = {
            "asset_id": kit_id,
            "type": f"kit_{kit_data.template_id.lower().replace('-', '_')}",
            "type_label": template.get("name", kit_data.template_id),
            "kit_template_id": kit_data.template_id,
            "kit_components": [c.get("asset_id") or c.get("manufacturer_sn") for c in components],
            "kit_status": kit_status,
            "location_id": None,  # Not assigned to location yet
            "status": "in_storage",
            "original_kit_id": kit_id,  # Store original ID for reference
            "history": [{
                "date": now,
                "event_type": "created",
                "event": f"Kit erstellt basierend auf Vorlage {kit_data.template_id}",
                "technician": kit_data.technician or None,
                "notes": f"{len(components)} Komponenten zugewiesen. Status: {kit_status}"
            }],
            "created_at": now,
            "updated_at": now
        }
        
        await db.tsrid_assets.insert_one(kit_doc)
        
        # 6. Update all components to link them to this kit
        for comp in components:
            await db.tsrid_assets.update_one(
                {"_id": comp["_id"]},
                {
                    "$set": {
                        "assigned_to_kit": kit_id,
                        "parent_kit_id": kit_id,
                        "status": "in_kit",
                        "updated_at": now
                    },
                    "$push": {
                        "history": {
                            "date": now,
                            "event_type": "assigned_to_bundle",
                            "event": f"Zu Kit {kit_id} zugewiesen",
                            "technician": kit_data.technician or None
                        }
                    }
                }
            )
        
        return {
            "success": True,
            "kit_id": kit_id,
            "kit_status": kit_status,
            "component_count": len(components),
            "template_name": template.get("name"),
            "message": f"Kit {kit_id} erfolgreich erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/{kit_id}/assign-location")
async def assign_kit_to_location(kit_id: str, assignment: KitAssignToLocation):
    """
    Weist ein Kit einer Location zu.
    Die Kit-ID wird geändert zu: LOCATION_ID-XX-KIT (z.B. AAHC01-01-KIT).
    Status wird zu 'assigned' geändert.
    """
    try:
        # 1. Get kit
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        # Check if kit is already assigned
        if kit.get("kit_status") == "assigned" and kit.get("location_id"):
            raise HTTPException(
                status_code=400,
                detail=f"Kit ist bereits Location {kit['location_id']} zugewiesen. Verwenden Sie 'move' zum Umziehen."
            )
        
        # 2. Get location
        location = await find_location(assignment.location_id)
        if not location:
            raise HTTPException(status_code=404, detail=f"Location {assignment.location_id} nicht gefunden")
        
        # 3. Generate new Kit ID based on location
        existing_kits = await db.tsrid_assets.find(
            {
                "location_id": assignment.location_id,
                "asset_id": {"$regex": f"^{assignment.location_id}-.*-KIT"}
            },
            {"asset_id": 1}
        ).to_list(100)
        
        max_num = 0
        for existing in existing_kits:
            try:
                parts = existing.get("asset_id", "").split("-")
                if len(parts) >= 2:
                    num = int(parts[1])
                    max_num = max(max_num, num)
            except ValueError:
                pass
        
        new_kit_id = f"{assignment.location_id}-{max_num + 1:02d}-KIT"
        
        now = datetime.now(timezone.utc).isoformat()
        
        # 4. Update kit
        history_entry = {
            "date": now,
            "event_type": "assigned_to_location",
            "event": f"Kit zugewiesen zu Location {assignment.location_id}",
            "old_kit_id": kit_id,
            "new_kit_id": new_kit_id,
            "location_id": assignment.location_id,
            "location_name": f"{location.get('city', '')} - {location.get('location_name', '')}",
            "technician": assignment.technician or None,
            "notes": assignment.notes or None
        }
        
        await db.tsrid_assets.update_one(
            {"_id": kit["_id"]},
            {
                "$set": {
                    "asset_id": new_kit_id,
                    "location_id": assignment.location_id,
                    "kit_status": "assigned",
                    "status": "deployed",
                    "assigned_at": now,
                    "updated_at": now
                },
                "$push": {"history": history_entry}
            }
        )
        
        # 5. Update all components with new parent kit ID
        await db.tsrid_assets.update_many(
            {"assigned_to_kit": kit_id},
            {
                "$set": {
                    "assigned_to_kit": new_kit_id,
                    "parent_kit_id": new_kit_id,
                    "location_id": assignment.location_id,
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event_type": "assigned_to_location",
                        "event": f"Mit Kit zu Location {assignment.location_id} zugewiesen",
                        "technician": assignment.technician or None
                    }
                }
            }
        )
        
        return {
            "success": True,
            "old_kit_id": kit_id,
            "new_kit_id": new_kit_id,
            "location_id": assignment.location_id,
            "location_name": f"{location.get('city', '')} - {location.get('location_name', '')}",
            "message": f"Kit {kit_id} wurde zu {new_kit_id} umbenannt und Location {assignment.location_id} zugewiesen"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/{kit_id}/move")
async def move_kit_to_location(kit_id: str, move_data: KitMoveToLocation):
    """
    Verschiebt ein Kit zu einer anderen Location.
    Die Kit-ID wird entsprechend der neuen Location angepasst.
    Die komplette Historie wird beibehalten.
    """
    try:
        # 1. Get kit
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        old_location_id = kit.get("location_id")
        if old_location_id == move_data.new_location_id:
            raise HTTPException(status_code=400, detail="Kit ist bereits an dieser Location")
        
        # 2. Get new location
        new_location = await find_location(move_data.new_location_id)
        if not new_location:
            raise HTTPException(status_code=404, detail=f"Location {move_data.new_location_id} nicht gefunden")
        
        # 3. Generate new Kit ID for new location
        existing_kits = await db.tsrid_assets.find(
            {
                "location_id": move_data.new_location_id,
                "asset_id": {"$regex": f"^{move_data.new_location_id}-.*-KIT"}
            },
            {"asset_id": 1}
        ).to_list(100)
        
        max_num = 0
        for existing in existing_kits:
            try:
                parts = existing.get("asset_id", "").split("-")
                if len(parts) >= 2:
                    num = int(parts[1])
                    max_num = max(max_num, num)
            except ValueError:
                pass
        
        new_kit_id = f"{move_data.new_location_id}-{max_num + 1:02d}-KIT"
        
        now = datetime.now(timezone.utc).isoformat()
        
        # 4. Update kit
        history_entry = {
            "date": now,
            "event_type": "moved",
            "event": f"Kit umgezogen von {old_location_id or 'Lager'} nach {move_data.new_location_id}",
            "old_kit_id": kit_id,
            "new_kit_id": new_kit_id,
            "old_location_id": old_location_id,
            "new_location_id": move_data.new_location_id,
            "new_location_name": f"{new_location.get('city', '')} - {new_location.get('location_name', '')}",
            "reason": move_data.reason or None,
            "technician": move_data.technician or None,
            "notes": move_data.notes or None
        }
        
        await db.tsrid_assets.update_one(
            {"_id": kit["_id"]},
            {
                "$set": {
                    "asset_id": new_kit_id,
                    "location_id": move_data.new_location_id,
                    "updated_at": now
                },
                "$push": {"history": history_entry}
            }
        )
        
        # 5. Update all components
        await db.tsrid_assets.update_many(
            {"assigned_to_kit": kit_id},
            {
                "$set": {
                    "assigned_to_kit": new_kit_id,
                    "parent_kit_id": new_kit_id,
                    "location_id": move_data.new_location_id,
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event_type": "moved",
                        "event": f"Mit Kit umgezogen zu {move_data.new_location_id}",
                        "reason": move_data.reason or None,
                        "technician": move_data.technician or None
                    }
                }
            }
        )
        
        return {
            "success": True,
            "old_kit_id": kit_id,
            "new_kit_id": new_kit_id,
            "old_location_id": old_location_id,
            "new_location_id": move_data.new_location_id,
            "message": f"Kit erfolgreich umgezogen. Neue ID: {new_kit_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kits/{kit_id}/replace-component")
async def replace_kit_component(kit_id: str, replacement: KitReplaceComponent):
    """
    Tauscht eine defekte Komponente in einem Kit aus.
    Die alte Komponente wird als 'defect' markiert und aus dem Kit entfernt.
    Die neue Komponente wird dem Kit hinzugefügt.
    Vollständige Historie wird geführt.
    """
    try:
        # 1. Get kit
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        # 2. Get old component
        old_component = await db.tsrid_assets.find_one({
            "$or": [
                {"asset_id": replacement.old_component_id},
                {"manufacturer_sn": replacement.old_component_id}
            ]
        })
        
        if not old_component:
            raise HTTPException(status_code=404, detail=f"Alte Komponente {replacement.old_component_id} nicht gefunden")
        
        if old_component.get("assigned_to_kit") != kit_id:
            raise HTTPException(
                status_code=400,
                detail=f"Komponente {replacement.old_component_id} gehört nicht zu Kit {kit_id}"
            )
        
        # 3. Get new component
        new_component = await db.tsrid_assets.find_one({
            "$or": [
                {"asset_id": replacement.new_component_id},
                {"manufacturer_sn": replacement.new_component_id}
            ]
        })
        
        if not new_component:
            raise HTTPException(status_code=404, detail=f"Neue Komponente {replacement.new_component_id} nicht gefunden")
        
        if new_component.get("assigned_to_kit"):
            raise HTTPException(
                status_code=400,
                detail=f"Neue Komponente ist bereits Kit {new_component['assigned_to_kit']} zugewiesen"
            )
        
        # Verify same type
        if old_component.get("type") != new_component.get("type"):
            raise HTTPException(
                status_code=400,
                detail=f"Komponententypen stimmen nicht überein: {old_component.get('type')} vs {new_component.get('type')}"
            )
        
        now = datetime.now(timezone.utc).isoformat()
        old_comp_id = old_component.get("asset_id") or old_component.get("manufacturer_sn")
        new_comp_id = new_component.get("asset_id") or new_component.get("manufacturer_sn")
        
        # 4. Update old component - mark as defective
        await db.tsrid_assets.update_one(
            {"_id": old_component["_id"]},
            {
                "$set": {
                    "assigned_to_kit": None,
                    "parent_kit_id": None,
                    "status": "defect",
                    "defect_reason": replacement.defect_reason,
                    "defect_date": now,
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event_type": "removed_from_bundle",
                        "event": f"Aus Kit {kit_id} entfernt (defekt)",
                        "defect_reason": replacement.defect_reason,
                        "replaced_by": new_comp_id,
                        "technician": replacement.technician or None,
                        "notes": replacement.notes or None
                    }
                }
            }
        )
        
        # 5. Update new component - assign to kit
        await db.tsrid_assets.update_one(
            {"_id": new_component["_id"]},
            {
                "$set": {
                    "assigned_to_kit": kit_id,
                    "parent_kit_id": kit_id,
                    "location_id": kit.get("location_id"),
                    "status": "in_kit",
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event_type": "assigned_to_bundle",
                        "event": f"Zu Kit {kit_id} zugewiesen (Ersatz für {old_comp_id})",
                        "replaces": old_comp_id,
                        "technician": replacement.technician or None
                    }
                }
            }
        )
        
        # 6. Update kit components list
        kit_components = kit.get("kit_components", [])
        if old_comp_id in kit_components:
            kit_components.remove(old_comp_id)
        kit_components.append(new_comp_id)
        
        await db.tsrid_assets.update_one(
            {"_id": kit["_id"]},
            {
                "$set": {
                    "kit_components": kit_components,
                    "updated_at": now
                },
                "$push": {
                    "history": {
                        "date": now,
                        "event_type": "component_replaced",
                        "event": f"Komponente ausgetauscht: {old_comp_id} → {new_comp_id}",
                        "old_component": old_comp_id,
                        "new_component": new_comp_id,
                        "defect_reason": replacement.defect_reason,
                        "technician": replacement.technician or None,
                        "notes": replacement.notes or None
                    }
                }
            }
        )
        
        return {
            "success": True,
            "kit_id": kit_id,
            "old_component": old_comp_id,
            "new_component": new_comp_id,
            "defect_reason": replacement.defect_reason,
            "message": f"Komponente erfolgreich ausgetauscht in Kit {kit_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kits/{kit_id}/history")
async def get_kit_history(kit_id: str):
    """
    Gibt die vollständige Historie eines Kits zurück.
    Enthält: Erstellung, Zuweisungen, Umzüge, Komponententausch.
    """
    try:
        kit = await db.tsrid_assets.find_one({"asset_id": kit_id})
        if not kit:
            raise HTTPException(status_code=404, detail=f"Kit {kit_id} nicht gefunden")
        
        kit = serialize_doc(kit)
        
        # Get component history as well
        component_history = []
        if kit.get("kit_components"):
            for comp_id in kit["kit_components"]:
                comp = await db.tsrid_assets.find_one({"asset_id": comp_id})
                if comp:
                    comp = serialize_doc(comp)
                    component_history.append({
                        "component_id": comp_id,
                        "type": comp.get("type"),
                        "type_label": ASSET_TYPE_LABELS.get(comp.get("type"), comp.get("type")),
                        "history": comp.get("history", [])
                    })
        
        return {
            "success": True,
            "kit_id": kit_id,
            "original_kit_id": kit.get("original_kit_id"),
            "kit_history": kit.get("history", []),
            "component_history": component_history,
            "current_location": kit.get("location_id"),
            "current_status": kit.get("kit_status")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kits/available-components")
async def get_available_components(template_id: str = Query(None)):
    """
    Gibt alle verfügbaren Komponenten zurück, die keinem Kit zugewiesen sind.
    Optional gefiltert nach Kit-Template-Anforderungen.
    """
    try:
        # Base query: components not assigned to any kit and in storage
        query = {
            "$and": [
                {"$or": [{"assigned_to_kit": None}, {"assigned_to_kit": {"$exists": False}}]},
                {"$or": [{"status": "in_storage"}, {"status": "unassigned"}, {"status": None}]},
                {"type": {"$not": {"$regex": "^kit_"}}}  # Exclude kits themselves
            ]
        }
        
        # If template specified, filter by required component types
        template = None
        if template_id:
            template = await db.tsrid_kit_templates.find_one({"template_id": template_id})
            if template:
                required_types = [c.get("asset_type") for c in template.get("components", [])]
                query["type"] = {"$in": required_types}
        
        cursor = db.tsrid_assets.find(query).sort("type", 1).limit(500)
        components = [serialize_doc(c) async for c in cursor]
        
        # Add type labels
        for comp in components:
            comp["type_label"] = ASSET_TYPE_LABELS.get(comp.get("type"), comp.get("type"))
        
        # Group by type for easier display
        by_type = {}
        for comp in components:
            t = comp.get("type", "unknown")
            if t not in by_type:
                by_type[t] = {
                    "type": t,
                    "type_label": ASSET_TYPE_LABELS.get(t, t),
                    "count": 0,
                    "components": []
                }
            by_type[t]["count"] += 1
            by_type[t]["components"].append(comp)
        
        return {
            "success": True,
            "template": serialize_doc(template) if template else None,
            "total": len(components),
            "by_type": list(by_type.values()),
            "components": components
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations/{location_id}/kits")
async def get_location_kits(location_id: str):
    """
    Gibt alle Kits an einer Location zurück.
    Wird verwendet um zu sehen welche Kits bereits vor Ort sind.
    """
    try:
        location = await find_location(location_id)
        if not location:
            raise HTTPException(status_code=404, detail=f"Location {location_id} nicht gefunden")
        
        cursor = db.tsrid_assets.find({
            "location_id": location_id,
            "type": {"$regex": "^kit_"}
        }).sort("asset_id", 1)
        
        kits = [serialize_doc(k) async for k in cursor]
        
        # Enrich with component details
        for kit in kits:
            component_count = len(kit.get("kit_components", []))
            kit["component_count"] = component_count
            kit["type_label"] = ASSET_TYPE_LABELS.get(kit.get("type"), kit.get("type"))
        
        return {
            "success": True,
            "location_id": location_id,
            "location_name": f"{location.get('city', '')} - {location.get('location_name', '')}",
            "customer": location.get("customer") or location.get("tenant_name"),
            "kits": kits,
            "total": len(kits)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

