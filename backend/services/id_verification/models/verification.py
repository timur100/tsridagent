from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class VerificationResult(BaseModel):
    """Verification result data"""
    verified: bool
    confidence: float
    checks_passed: Dict[str, bool]
    warnings: list[str] = []
    errors: list[str] = []


class VerificationHistory(BaseModel):
    """Verification history record"""
    model_config = ConfigDict(extra="ignore")
    
    verification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scan_id: str
    verification_type: str  # "document", "face", "authenticity"
    result: VerificationResult
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
