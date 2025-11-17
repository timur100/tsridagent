from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class CustomerSettings(BaseModel):
    """Customer-specific settings"""
    branding: Optional[Dict] = Field(default_factory=dict)
    features_enabled: List[str] = Field(default_factory=lambda: ["tickets", "catalog", "devices"])
    portal_settings: Optional[Dict] = Field(default_factory=dict)

class Customer(BaseModel):
    """Customer/Tenant model"""
    id: str
    name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    settings: CustomerSettings = Field(default_factory=CustomerSettings)
    created_at: str
    updated_at: Optional[str] = None
    active: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "customer-uuid",
                "name": "Europcar Deutschland",
                "domain": "europcar.de",
                "active": True
            }
        }

class CustomerCreate(BaseModel):
    """Model for creating a new customer"""
    name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None

class CustomerUpdate(BaseModel):
    """Model for updating customer"""
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[CustomerSettings] = None
    active: Optional[bool] = None
