from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class TenantBase(BaseModel):
    name: str
    display_name: str
    domain: Optional[str] = None
    
class TenantCreate(TenantBase):
    admin_email: str
    admin_password: str
    settings: Optional[Dict[str, Any]] = {}
    
class TenantUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    domain: Optional[str] = None
    enabled: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    
class TenantResponse(TenantBase):
    tenant_id: str
    enabled: bool
    settings: Dict[str, Any]
    user_count: int
    created_at: str
    updated_at: str
