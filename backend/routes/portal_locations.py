from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/portal/locations", tags=["Portal Locations"])

class Location(BaseModel):
    location_id: str
    location_name: str
    address: str
    city: str
    country: str
    customer_id: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

# In-memory storage (replace with MongoDB)
locations_db = {}

@router.get("/list")
async def list_locations(token_data: dict = Depends(verify_token)):
    """Get all locations"""
    try:
        # If customer, filter by customer_id
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        if user_role == "admin":
            locations_list = list(locations_db.values())
        else:
            # Filter by customer
            locations_list = [
                loc for loc in locations_db.values()
                if loc.get('customer_id') == user_email
            ]
        
        return {
            "success": True,
            "locations": locations_list,
            "total": len(locations_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{location_id}")
async def get_location(location_id: str, token_data: dict = Depends(verify_token)):
    """Get location by ID"""
    try:
        location = locations_db.get(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        return {
            "success": True,
            "location": location
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_location(location: Location, token_data: dict = Depends(verify_token)):
    """Create a new location"""
    try:
        # Check if location already exists
        if location.location_id in locations_db:
            raise HTTPException(status_code=400, detail="Location already exists")
        
        location_dict = location.dict()
        location_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        location_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        location_dict['created_by'] = token_data.get("sub")
        
        locations_db[location.location_id] = location_dict
        
        return {
            "success": True,
            "message": "Location created successfully",
            "location": location_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{location_id}")
async def update_location(location_id: str, location_update: dict, token_data: dict = Depends(verify_token)):
    """Update location information"""
    try:
        if location_id not in locations_db:
            raise HTTPException(status_code=404, detail="Location not found")
        
        location = locations_db[location_id]
        location.update(location_update)
        location['updated_at'] = datetime.now(timezone.utc).isoformat()
        location['updated_by'] = token_data.get("sub")
        
        locations_db[location_id] = location
        
        return {
            "success": True,
            "message": "Location updated successfully",
            "location": location
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{location_id}")
async def delete_location(location_id: str, token_data: dict = Depends(verify_token)):
    """Delete a location (admin only)"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if location_id not in locations_db:
            raise HTTPException(status_code=404, detail="Location not found")
        
        del locations_db[location_id]
        
        return {
            "success": True,
            "message": "Location deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
