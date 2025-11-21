from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/sla", tags=["SLA"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']
tickets_collection = db.tickets

# SLA Configurations
DEFAULT_SLA_CONFIGS = {
    "critical": {
        "response_time_hours": 1,
        "resolution_time_hours": 4,
        "escalation_time_hours": 2
    },
    "high": {
        "response_time_hours": 4,
        "resolution_time_hours": 24,
        "escalation_time_hours": 12
    },
    "medium": {
        "response_time_hours": 8,
        "resolution_time_hours": 72,
        "escalation_time_hours": 36
    },
    "low": {
        "response_time_hours": 24,
        "resolution_time_hours": 168,
        "escalation_time_hours": None
    }
}

def calculate_sla_status(ticket: dict) -> dict:
    """Calculate SLA status for a ticket"""
    priority = ticket.get("priority", "medium")
    sla_config = DEFAULT_SLA_CONFIGS.get(priority, DEFAULT_SLA_CONFIGS["medium"])
    
    created_at = datetime.fromisoformat(ticket["created_at"])
    current_time = datetime.now(timezone.utc)
    
    # Calculate due times
    response_due = created_at + timedelta(hours=sla_config["response_time_hours"])
    resolution_due = created_at + timedelta(hours=sla_config["resolution_time_hours"])
    escalation_due = None
    if sla_config["escalation_time_hours"]:
        escalation_due = created_at + timedelta(hours=sla_config["escalation_time_hours"])
    
    # Get first response time
    first_response_at = None
    comments = ticket.get("comments", [])
    if comments:
        for comment in comments:
            if comment.get("created_by_role") in ["admin", "support_agent", "support_manager"]:
                first_response_at = comment.get("created_at")
                break
    
    resolved_at = ticket.get("resolved_at")
    closed_at = ticket.get("closed_at")
    
    # Check breaches
    response_breached = False
    if not first_response_at and current_time > response_due:
        response_breached = True
    elif first_response_at:
        first_response_time = datetime.fromisoformat(first_response_at)
        if first_response_time > response_due:
            response_breached = True
    
    resolution_breached = False
    if ticket.get("status") in ["resolved", "closed"]:
        resolution_time = datetime.fromisoformat(resolved_at or closed_at)
        if resolution_time > resolution_due:
            resolution_breached = True
    elif current_time > resolution_due and ticket.get("status") not in ["resolved", "closed"]:
        resolution_breached = True
    
    needs_escalation = False
    if escalation_due and not ticket.get("assigned_to") and current_time > escalation_due:
        needs_escalation = True
    
    # Calculate time remaining
    response_time_remaining = None
    if not first_response_at:
        response_time_remaining = (response_due - current_time).total_seconds() / 3600
    
    resolution_time_remaining = None
    if ticket.get("status") not in ["resolved", "closed"]:
        resolution_time_remaining = (resolution_due - current_time).total_seconds() / 3600
    
    return {
        "ticket_id": ticket["id"],
        "ticket_number": ticket.get("ticket_number"),
        "priority": priority,
        "created_at": ticket["created_at"],
        "first_response_at": first_response_at,
        "resolved_at": resolved_at,
        "closed_at": closed_at,
        "response_due_at": response_due.isoformat(),
        "resolution_due_at": resolution_due.isoformat(),
        "escalation_due_at": escalation_due.isoformat() if escalation_due else None,
        "response_breached": response_breached,
        "resolution_breached": resolution_breached,
        "needs_escalation": needs_escalation,
        "response_time_remaining": round(response_time_remaining, 1) if response_time_remaining else None,
        "resolution_time_remaining": round(resolution_time_remaining, 1) if resolution_time_remaining else None
    }

@router.get("/warnings")
def get_sla_warnings(token_data: dict = Depends(verify_token)):
    """
    Get all tickets with SLA warnings/breaches
    Admin only
    """
    try:
        if not token_data or token_data.get("role") not in ["admin", "support_manager"]:
            raise HTTPException(status_code=403, detail="Admin/Manager access required")
        
        # Get all open tickets
        cursor = tickets_collection.find({
            "status": {"$nin": ["resolved", "closed"]}
        })
        
        warnings = {
            "critical": [],
            "breached": [],
            "at_risk": []
        }
        
        for ticket in cursor:
            sla_status = calculate_sla_status(ticket)
            
            # Remove MongoDB _id
            if '_id' in ticket:
                del ticket['_id']
            
            # Critical priority tickets
            if sla_status["priority"] == "critical":
                warnings["critical"].append({
                    "ticket": ticket,
                    "sla": sla_status
                })
            
            # Breached tickets
            if sla_status["response_breached"] or sla_status["resolution_breached"]:
                warnings["breached"].append({
                    "ticket": ticket,
                    "sla": sla_status
                })
            
            # At risk (less than 2 hours remaining)
            if sla_status["resolution_time_remaining"] and sla_status["resolution_time_remaining"] < 2:
                warnings["at_risk"].append({
                    "ticket": ticket,
                    "sla": sla_status
                })
        
        return {
            "success": True,
            "data": {
                "critical_count": len(warnings["critical"]),
                "breached_count": len(warnings["breached"]),
                "at_risk_count": len(warnings["at_risk"]),
                "warnings": warnings
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get SLA warnings error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{ticket_id}")
def get_ticket_sla(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get SLA status for a specific ticket
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        ticket = tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        sla_status = calculate_sla_status(ticket)
        
        return {
            "success": True,
            "sla": sla_status
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get ticket SLA error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
