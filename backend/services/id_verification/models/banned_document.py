from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class BannedDocumentCreate(BaseModel):
    """Create banned document request"""
    document_number: str
    reason: str
    expires_at: Optional[datetime] = None


class BannedDocument(BaseModel):
    """Banned document model"""
    model_config = ConfigDict(extra="ignore")
    
    banned_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_number: str
    reason: str
    banned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BannedCheckRequest(BaseModel):
    """Check if document is banned"""
    document_number: str


class BannedCheckResponse(BaseModel):
    """Banned check response"""
    is_banned: bool
    reason: Optional[str] = None
    banned_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
