from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SLAConfig(BaseModel):
    """SLA Configuration for different priority levels"""
    priority: str  # low, medium, high, critical
    response_time_hours: int  # Time to first response
    resolution_time_hours: int  # Time to resolution
    escalation_time_hours: Optional[int] = None  # Time before escalation

class SLAStatus(BaseModel):
    """Current SLA status for a ticket"""
    ticket_id: str
    priority: str
    created_at: str
    first_response_at: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    
    # SLA Times
    response_due_at: str
    resolution_due_at: str
    escalation_due_at: Optional[str] = None
    
    # Status
    response_breached: bool = False
    resolution_breached: bool = False
    needs_escalation: bool = False
    
    # Time remaining (in hours, negative means breached)
    response_time_remaining: Optional[float] = None
    resolution_time_remaining: Optional[float] = None

# Default SLA configurations
DEFAULT_SLA_CONFIGS = {
    "critical": SLAConfig(
        priority="critical",
        response_time_hours=1,
        resolution_time_hours=4,
        escalation_time_hours=2
    ),
    "high": SLAConfig(
        priority="high",
        response_time_hours=4,
        resolution_time_hours=24,
        escalation_time_hours=12
    ),
    "medium": SLAConfig(
        priority="medium",
        response_time_hours=8,
        resolution_time_hours=72,
        escalation_time_hours=36
    ),
    "low": SLAConfig(
        priority="low",
        response_time_hours=24,
        resolution_time_hours=168,  # 7 days
        escalation_time_hours=None
    )
}
