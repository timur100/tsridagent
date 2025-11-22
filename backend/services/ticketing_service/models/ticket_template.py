from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum

class TemplateCategory(str, Enum):
    hardware = "hardware"
    software = "software"
    network = "network"
    access = "access"
    training = "training"
    other = "other"

class TicketTemplateCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    category: TemplateCategory
    default_title: str
    default_description: str
    default_priority: str = "medium"
    required_fields: Optional[List[str]] = Field(default_factory=list)
    auto_assign_to: Optional[str] = None
    estimated_resolution_time: Optional[int] = None  # in minutes

class TicketTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: TemplateCategory
    default_title: str
    default_description: str
    default_priority: str
    required_fields: List[str]
    auto_assign_to: Optional[str] = None
    auto_assign_to_name: Optional[str] = None
    estimated_resolution_time: Optional[int] = None
    usage_count: int
    created_at: str
    updated_at: Optional[str] = None
