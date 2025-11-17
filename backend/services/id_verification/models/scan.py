from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class ImageData(BaseModel):
    """Image data model"""
    type: str
    data: str  # base64 encoded
    format: str = "jpeg"
    field_type: Optional[int] = None


class DocumentData(BaseModel):
    """Document data extracted from scan"""
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[str] = None
    expiry_date: Optional[str] = None
    nationality: Optional[str] = None
    sex: Optional[str] = None
    issuing_country: Optional[str] = None


class ScanCreate(BaseModel):
    """Create new scan request"""
    device_id: str
    location_id: Optional[str] = None
    document_data: DocumentData
    images: List[ImageData] = []
    verification_status: str = "pending"
    synced_from_offline: bool = False
    offline_scan_timestamp: Optional[datetime] = None


class Scan(BaseModel):
    """Scan model"""
    model_config = ConfigDict(extra="ignore")
    
    scan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    location_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    document_data: DocumentData
    images: List[ImageData] = []
    verification_status: str = "pending"
    synced_from_offline: bool = False
    offline_scan_timestamp: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScanResponse(BaseModel):
    """Scan response model"""
    scan_id: str
    device_id: str
    location_id: Optional[str] = None
    timestamp: datetime
    document_data: DocumentData
    verification_status: str
    synced_from_offline: bool
    created_at: datetime


class OfflineScanBatch(BaseModel):
    """Batch of offline scans to sync"""
    device_id: str
    scans: List[ScanCreate]
