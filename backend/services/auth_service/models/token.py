from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    scope: Optional[str] = None
    
class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    roles: list = []
    permissions: list = []
