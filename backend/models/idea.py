"""
Idea Model for Feature Requests and Improvements
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class Idea(BaseModel):
    """Idea/Feature Request Model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200, description="Idea title/theme")
    description: str = Field(..., min_length=1, description="Detailed description")
    menu_item: str = Field(default="Allgemein", min_length=1, max_length=200, description="Menu item/category")
    status: Literal['neu', 'in_entwicklung', 'erledigt'] = Field(default='neu', description="Idea status")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Creation timestamp")
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Last update timestamp")
    created_by: str = Field(default="admin", description="User who created the idea")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Verbesserte Suchfunktion",
                "description": "Die Suchfunktion sollte auch nach Datum filtern können...",
                "status": "neu",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "created_by": "admin"
            }
        }


class IdeaCreate(BaseModel):
    """Create Idea Request"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    menu_item: str = Field(default="Allgemein", min_length=1, max_length=200)


class IdeaUpdate(BaseModel):
    """Update Idea Request"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    menu_item: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[Literal['neu', 'in_entwicklung', 'erledigt']] = None
