from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
class UserCreate(UserBase):
    password: str
    tenant_ids: Optional[List[str]] = []  # Support multiple tenants
    user_type: str = "employee"  # employee, customer, admin
    roles: Optional[List[str]] = []
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    status: str = "active"  # active, inactive
    
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    enabled: Optional[bool] = None
    roles: Optional[List[str]] = None
    attributes: Optional[Dict[str, Any]] = None

class UserResponse(UserBase):
    user_id: str
    tenant_id: Optional[str] = None
    user_type: str
    enabled: bool
    email_verified: bool
    roles: List[str]
    permissions: List[str]
    created_at: str
    last_login: Optional[str] = None
    
class UserLogin(BaseModel):
    username: str
    password: str
    tenant_id: Optional[str] = None
