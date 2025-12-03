"""
Hardware Asset Management Models
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime, timezone
import uuid


class HardwareSet(BaseModel):
    """Hardware Set Model - Group of devices at a location"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant ID")
    set_name: str = Field(..., min_length=1, max_length=200, description="Name of the hardware set")
    location_id: str = Field(..., description="Location/Standort ID")
    status: Literal['aktiv', 'archiviert', 'geschlossen'] = Field(default='aktiv')
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: Optional[str] = None
    notes: Optional[str] = None
    

class HardwareDevice(BaseModel):
    """Hardware Device Model - Individual device with full history"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant ID")
    serial_number: str = Field(..., min_length=1, max_length=100, description="Unique serial number")
    hardware_type: str = Field(..., min_length=1, max_length=100, description="Type: Tablet, Scanner, etc.")
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[str] = None
    warranty_until: Optional[str] = None
    warranty_reminder_days: int = Field(default=30, description="Days before warranty expiry to remind")
    current_status: Literal['aktiv', 'verfügbar_lager', 'defekt', 'in_reparatur', 'ausgemustert'] = Field(default='verfügbar_lager')
    current_location_id: Optional[str] = None
    current_set_id: Optional[str] = None
    barcode: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SetAssignment(BaseModel):
    """Device to Set Assignment"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    set_id: str
    assigned_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    removed_date: Optional[str] = None
    removal_reason: Optional[str] = None  # defekt, standort_geschlossen, upgrade, etc.
    assigned_by: str = Field(default="admin")
    active: bool = Field(default=True)


class DeviceHistory(BaseModel):
    """Device History/Audit Log"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    action_type: Literal[
        'created', 'assigned_to_set', 'removed_from_set', 
        'status_change', 'replaced', 'relocated', 'repaired',
        'warranty_updated', 'notes_updated'
    ]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    performed_by: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    set_id: Optional[str] = None
    location_id: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class DeviceReplacement(BaseModel):
    """Device Replacement Record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    defective_device_id: str
    replacement_device_id: str
    set_id: str
    location_id: str
    reason: str
    replaced_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    replaced_by: str


# Request/Response Models
class HardwareSetCreate(BaseModel):
    """Create Hardware Set Request"""
    tenant_id: str
    set_name: str = Field(..., min_length=1, max_length=200)
    location_id: str
    notes: Optional[str] = None


class HardwareSetUpdate(BaseModel):
    """Update Hardware Set Request"""
    set_name: Optional[str] = Field(None, min_length=1, max_length=200)
    location_id: Optional[str] = None
    status: Optional[Literal['aktiv', 'archiviert', 'geschlossen']] = None
    notes: Optional[str] = None


class HardwareDeviceCreate(BaseModel):
    """Create Hardware Device Request"""
    tenant_id: str
    serial_number: str = Field(..., min_length=1, max_length=100)
    hardware_type: str = Field(..., min_length=1, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[str] = None
    warranty_until: Optional[str] = None
    warranty_reminder_days: int = Field(default=30)
    notes: Optional[str] = None


class HardwareDeviceUpdate(BaseModel):
    """Update Hardware Device Request"""
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    hardware_type: Optional[str] = Field(None, min_length=1, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[str] = None
    warranty_until: Optional[str] = None
    warranty_reminder_days: Optional[int] = None
    current_status: Optional[Literal['aktiv', 'verfügbar_lager', 'defekt', 'in_reparatur', 'ausgemustert']] = None
    notes: Optional[str] = None


class AssignDeviceToSet(BaseModel):
    """Assign Device to Set Request"""
    device_id: str
    notes: Optional[str] = None


class RemoveDeviceFromSet(BaseModel):
    """Remove Device from Set Request"""
    device_id: str
    removal_reason: str


class ReplaceDeviceRequest(BaseModel):
    """Replace Device Request"""
    defective_device_id: str
    replacement_device_id: str
    reason: str
    notes: Optional[str] = None
