from pydantic import BaseModel
from typing import Optional, List

class SupportStaff(BaseModel):
    """Support staff member"""
    id: str
    email: str
    name: str
    role: str  # support_agent, support_manager, admin
    specialization: Optional[List[str]] = []  # technical, billing, hardware, software
    max_active_tickets: int = 10
    is_active: bool = True
    avatar_url: Optional[str] = None

class StaffCreate(BaseModel):
    email: str
    name: str
    role: str = "support_agent"
    specialization: Optional[List[str]] = []
    max_active_tickets: int = 10

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[List[str]] = None
    max_active_tickets: Optional[int] = None
    is_active: Optional[bool] = None

class TicketAssignment(BaseModel):
    """Assign ticket to staff"""
    staff_email: str
    notes: Optional[str] = None
