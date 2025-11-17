from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str = "medium"  # low, medium, high, critical
    category: str  # technical, billing, general, hardware, software
    customer_email: Optional[str] = None  # If admin creates for customer
    location_id: Optional[str] = None
    device_id: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # open, in_progress, waiting, resolved, closed
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class TicketComment(BaseModel):
    comment: str
    internal: bool = False  # Internal notes only visible to admins

class TicketStatusUpdate(BaseModel):
    notes: Optional[str] = None
