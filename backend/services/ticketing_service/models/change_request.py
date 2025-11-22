from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ChangeRequestStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    rejected = "rejected"

class ChangeRequestPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class ChangeRequestCategory(str, Enum):
    location_change = "location_change"
    device_change = "device_change"
    configuration_change = "configuration_change"
    access_change = "access_change"
    other = "other"

class ChangeRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    category: ChangeRequestCategory
    priority: ChangeRequestPriority = Field(default=ChangeRequestPriority.medium)
    tenant_id: Optional[str] = None
    location_id: Optional[str] = None
    device_id: Optional[str] = None
    requested_date: Optional[str] = None  # When the change should be applied
    impact_description: Optional[str] = None

class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChangeRequestStatus] = None
    priority: Optional[ChangeRequestPriority] = None
    assigned_to: Optional[str] = None
    admin_notes: Optional[str] = None
    completed_date: Optional[str] = None

class ChangeRequestResponse(BaseModel):
    id: str
    title: str
    description: str
    category: ChangeRequestCategory
    status: ChangeRequestStatus
    priority: ChangeRequestPriority
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    requested_by_email: str
    requested_by_name: str
    requested_date: Optional[str] = None
    impact_description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    completed_date: Optional[str] = None
