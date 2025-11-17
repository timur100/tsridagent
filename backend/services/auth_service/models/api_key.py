from pydantic import BaseModel
from typing import Optional, List

class APIKeyBase(BaseModel):
    name: str
    description: Optional[str] = None
    
class APIKeyCreate(APIKeyBase):
    scopes: List[str] = []
    expires_in_days: Optional[int] = 365
    
class APIKeyResponse(APIKeyBase):
    api_key_id: str
    key: str
    scopes: List[str]
    enabled: bool
    created_at: str
    expires_at: Optional[str] = None
    last_used: Optional[str] = None
