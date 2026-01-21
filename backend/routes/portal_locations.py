from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os

from routes.portal_auth import verify_token
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/portal/locations", tags=["Portal Locations"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')

def get_db():
    """Get MongoDB database connection"""
    return get_mongo_client()[DB_NAME]

class Location(BaseModel):
    location_id: Optional[str] = None
    name: str
    address: str
    city: str
    country: str
    tenant_id: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/list")
async def list_locations(token_data: dict = Depends(verify_token)):
    """Get all locations from MongoDB"""
    try:
        db = get_db()
        
        # Get locations from key_locations collection
        locations_list = list(db.key_locations.find({}, {"_id": 0}))
        
        return {
            "success": True,
            "locations": locations_list,
            "total": len(locations_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_all_locations(
    token_data: dict = Depends(verify_token),
    tenant_id: Optional[str] = None
):
    """Get all locations, optionally filtered by tenant"""
    try:
        db = get_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        locations_list = list(db.key_locations.find(query, {"_id": 0}))
        
        return {
            "success": True,
            "data": {
                "locations": locations_list,
                "total": len(locations_list)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{location_id}")
async def get_location(location_id: str, token_data: dict = Depends(verify_token)):
    """Get location by ID"""
    try:
        db = get_db()
        
        location = db.key_locations.find_one(
            {"location_id": location_id},
            {"_id": 0}
        )
        
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
        db = get_db()
        
        # Generate location_id if not provided
        location_id = location.location_id or f"loc-{uuid.uuid4().hex[:8]}"
        
        # Check if location already exists
        existing = db.key_locations.find_one({"location_id": location_id})
        if existing:
            raise HTTPException(status_code=400, detail="Location already exists")
        
        location_dict = location.dict()
        location_dict['location_id'] = location_id
        location_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        location_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        location_dict['created_by'] = token_data.get("sub")
        
        db.key_locations.insert_one(location_dict)
        
        # Remove MongoDB _id for response
        location_dict.pop('_id', None)
        
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
        db = get_db()
        
        existing = db.key_locations.find_one({"location_id": location_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")
        
        location_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        location_update['updated_by'] = token_data.get("sub")
        
        db.key_locations.update_one(
            {"location_id": location_id},
            {"$set": location_update}
        )
        
        updated = db.key_locations.find_one({"location_id": location_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Location updated successfully",
            "location": updated
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
        
        db = get_db()
        
        existing = db.key_locations.find_one({"location_id": location_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")
        
        db.key_locations.delete_one({"location_id": location_id})
        
        return {
            "success": True,
            "message": "Location deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
