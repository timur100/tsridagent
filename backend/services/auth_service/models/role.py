from pydantic import BaseModel
from typing import Optional, List

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    
class RoleCreate(RoleBase):
    permissions: List[str] = []
    tenant_id: Optional[str] = None
    
class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    
class RoleResponse(RoleBase):
    role_id: str
    permissions: List[str]
    tenant_id: Optional[str] = None
    is_system_role: bool = False
    created_at: str
    updated_at: Optional[str] = None
