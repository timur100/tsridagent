from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/portal/sla-settings", tags=["sla-settings"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
db = get_mongo_client()[DB_NAME]

class SLASettings(BaseModel):
    priority: str  # high, medium, low
    acceptance_time_minutes: int  # Time to accept ticket
    first_response_minutes: int   # Time to first response
    resolution_time_hours: int    # Time to resolve

class SLASettingsUpdate(BaseModel):
    acceptance_time_minutes: Optional[int] = None
    first_response_minutes: Optional[int] = None
    resolution_time_hours: Optional[int] = None

# Default SLA settings
DEFAULT_SLA = {
    "high": {
        "acceptance_time_minutes": 15,
        "first_response_minutes": 60,
        "resolution_time_hours": 8
    },
    "medium": {
        "acceptance_time_minutes": 30,
        "first_response_minutes": 120,
        "resolution_time_hours": 24
    },
    "low": {
        "acceptance_time_minutes": 60,
        "first_response_minutes": 240,
        "resolution_time_hours": 48
    }
}

@router.get("")
async def get_sla_settings(token_data: dict = Depends(verify_token)):
    """
    Get all SLA settings
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch SLA settings from database
        sla_doc = db.sla_settings.find_one({"type": "ticket_sla"})
        
        if not sla_doc:
            # Initialize with defaults
            default_doc = {
                "type": "ticket_sla",
                "settings": DEFAULT_SLA,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            db.sla_settings.insert_one(default_doc)
            sla_settings = DEFAULT_SLA
        else:
            sla_settings = sla_doc.get("settings", DEFAULT_SLA)
        
        return {
            "success": True,
            "data": {
                "sla_settings": sla_settings
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching SLA settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{priority}")
async def update_sla_settings(
    priority: str,
    settings: SLASettingsUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update SLA settings for a specific priority
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate priority
        if priority not in ["high", "medium", "low"]:
            raise HTTPException(status_code=400, detail="Invalid priority. Must be high, medium, or low")
        
        # Get existing settings
        sla_doc = db.sla_settings.find_one({"type": "ticket_sla"})
        
        if not sla_doc:
            # Initialize with defaults
            current_settings = DEFAULT_SLA
        else:
            current_settings = sla_doc.get("settings", DEFAULT_SLA)
        
        # Update specific priority settings
        if priority in current_settings:
            if settings.acceptance_time_minutes is not None:
                current_settings[priority]["acceptance_time_minutes"] = settings.acceptance_time_minutes
            if settings.first_response_minutes is not None:
                current_settings[priority]["first_response_minutes"] = settings.first_response_minutes
            if settings.resolution_time_hours is not None:
                current_settings[priority]["resolution_time_hours"] = settings.resolution_time_hours
        
        # Upsert to database
        db.sla_settings.update_one(
            {"type": "ticket_sla"},
            {
                "$set": {
                    "settings": current_settings,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"SLA settings for {priority} priority updated",
            "data": {
                "sla_settings": current_settings
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating SLA settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_sla_settings(token_data: dict = Depends(verify_token)):
    """
    Reset SLA settings to defaults
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Reset to defaults
        db.sla_settings.update_one(
            {"type": "ticket_sla"},
            {
                "$set": {
                    "settings": DEFAULT_SLA,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "SLA settings reset to defaults",
            "data": {
                "sla_settings": DEFAULT_SLA
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resetting SLA settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
