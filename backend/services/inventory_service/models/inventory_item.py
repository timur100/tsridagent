from pydantic import BaseModel
from typing import List, Optional

class InventoryItem(BaseModel):
    name: str
    category: str  # Hardware, Software, Zubehör, Ersatzteile
    description: Optional[str] = ""
    barcode: str
    serial_numbers: List[str] = []  # Liste von Seriennummern für Garantie-Tracking
    quantity_in_stock: int
    min_stock_level: int = 5
    unit: str = "Stück"
    image_url: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    quantity_in_stock: Optional[int] = None
    min_stock_level: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None

class ImageUpload(BaseModel):
    image_data: str  # Base64 encoded image

class GoodsReceiptItem(BaseModel):
    item_id: str
    quantity: int
    serial_numbers: Optional[List[str]] = []
    notes: Optional[str] = None

class LabelRequest(BaseModel):
    item_id: str
    quantity: int = 1
    serial_numbers: Optional[List[str]] = []