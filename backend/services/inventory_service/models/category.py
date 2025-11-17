from pydantic import BaseModel
from typing import Optional

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    parent_id: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: str
    description: str = ""
    parent_id: Optional[str] = None

class CategoryVisibility(BaseModel):
    visible_in_shop: bool