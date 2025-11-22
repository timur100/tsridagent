from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ScanStatus(str, Enum):
    validated = "validated"  # Green
    rejected = "rejected"    # Red
    unknown = "unknown"      # Yellow
    pending = "pending"      # Grey - initial state

class DocumentType(str, Enum):
    passport = "passport"
    id_card = "id_card"
    drivers_license = "drivers_license"
    residence_permit = "residence_permit"
    other = "other"

class ImageType(str, Enum):
    front_original = "front_original"
    front_ir = "front_ir"
    front_uv = "front_uv"
    back_original = "back_original"
    back_ir = "back_ir"
    back_uv = "back_uv"

class ScanImage(BaseModel):
    image_type: ImageType
    file_path: str
    file_size: int
    uploaded_at: str

class ExtractedData(BaseModel):
    # Personal Information
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    sex: Optional[str] = None
    
    # Document Information
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_country: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    
    # Additional Fields
    mrz_line1: Optional[str] = None
    mrz_line2: Optional[str] = None
    mrz_line3: Optional[str] = None
    
    # Raw data from Regula
    raw_data: Optional[Dict[str, Any]] = None

class VerificationDetails(BaseModel):
    # Overall scores
    confidence_score: Optional[float] = None  # 0-100
    authenticity_score: Optional[float] = None
    document_validity: Optional[bool] = None
    
    # Security features detected
    security_features: Optional[List[str]] = None
    
    # Verification checks
    mrz_check: Optional[bool] = None
    photo_check: Optional[bool] = None
    expiry_check: Optional[bool] = None
    hologram_check: Optional[bool] = None
    
    # Detailed results from Regula
    regula_response: Optional[Dict[str, Any]] = None
    
    # Warnings/Errors
    warnings: Optional[List[str]] = None
    errors: Optional[List[str]] = None

class ManualAction(BaseModel):
    action: str  # "approved", "rejected", "banned"
    performed_by: str  # Email of admin
    performed_at: str
    comment: Optional[str] = None
    reason: Optional[str] = None

class IDScan(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    
    # Tenant/Location/Device Info
    tenant_id: str
    tenant_name: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    
    # Scan Info
    scan_timestamp: str
    status: ScanStatus = ScanStatus.pending
    document_type: Optional[DocumentType] = None
    
    # Operator/Scanner Info
    scanned_by: Optional[str] = None  # Email or name of operator
    operator_id: Optional[str] = None
    scan_duration_seconds: Optional[float] = None
    
    # Images
    images: List[ScanImage] = []
    
    # Extracted Data
    extracted_data: Optional[ExtractedData] = None
    
    # Verification Results
    verification: Optional[VerificationDetails] = None
    
    # Manual Review
    requires_manual_review: bool = False
    manual_actions: List[ManualAction] = []
    
    # Metadata
    created_at: str
    updated_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Notes/Comments
    notes: Optional[str] = None
    tags: List[str] = []

class IDScanCreate(BaseModel):
    tenant_id: str
    tenant_name: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    scanned_by: Optional[str] = None
    operator_id: Optional[str] = None
    document_type: Optional[DocumentType] = None
    extracted_data: Optional[ExtractedData] = None
    verification: Optional[VerificationDetails] = None
    ip_address: Optional[str] = None

class IDScanUpdate(BaseModel):
    status: Optional[ScanStatus] = None
    extracted_data: Optional[ExtractedData] = None
    verification: Optional[VerificationDetails] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class ManualActionRequest(BaseModel):
    action: str  # "approved", "rejected", "banned"
    comment: Optional[str] = None
    reason: Optional[str] = None
