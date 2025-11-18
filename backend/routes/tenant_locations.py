from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
import httpx

router = APIRouter(prefix="/api/tenant-locations", tags=["Tenant Locations"])
security = HTTPBearer()

# MongoDB connection
from pymongo import MongoClient
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

class TenantLocationCreate(BaseModel):
    location_code: str  # Main Code (e.g., BERN03)
    station_name: str  # Stationsname
    postal_code: str  # PLZ
    city: str  # ORT
    street: str  # STR
    state: str  # Bundesland (BB, BE, etc.)
    manager: Optional[str] = None  # Manager
    phone: Optional[str] = None  # Telefon
    phone_internal: Optional[str] = None  # Telefon Intern
    email: Optional[str] = None  # E Mail
    main_type: Optional[str] = None  # Main Typ (A, C, CAP, CSS, CRR)
    id_checker: Optional[int] = None  # ID Checker
    switch_info: Optional[str] = None  # Switch
    port: Optional[str] = None  # Port
    it_comment: Optional[str] = None  # IT Kommentar
    tsr_remarks: Optional[str] = None  # TSR REMARKS
    sn_pc: Optional[str] = None  # SN-PC
    sn_sc: Optional[str] = None  # SN-SC
    tv_id: Optional[str] = None  # TV-ID
    latitude: Optional[float] = None  # GPS Latitude
    longitude: Optional[float] = None  # GPS Longitude

class TenantLocationUpdate(BaseModel):
    location_code: Optional[str] = None
    station_name: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    state: Optional[str] = None
    manager: Optional[str] = None
    phone: Optional[str] = None
    phone_internal: Optional[str] = None
    email: Optional[str] = None
    main_type: Optional[str] = None
    id_checker: Optional[int] = None
    switch_info: Optional[str] = None
    port: Optional[str] = None
    it_comment: Optional[str] = None
    tsr_remarks: Optional[str] = None
    sn_pc: Optional[str] = None
    sn_sc: Optional[str] = None
    tv_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/{tenant_id}")
async def create_tenant_location(
    tenant_id: str,
    location: TenantLocationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new location for a tenant"""
    try:
        # Validate tenant exists by calling Auth service
        async with httpx.AsyncClient() as client:
            tenant_response = await client.get(f"http://localhost:8100/api/tenants/{tenant_id}")
            if tenant_response.status_code == 404:
                raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Check if location code already exists for this tenant
        existing = db.tenant_locations.find_one({
            "tenant_id": tenant_id,
            "location_code": location.location_code
        })
        if existing:
            raise HTTPException(status_code=400, detail="Location code already exists for this tenant")
        
        # Create location
        location_id = str(uuid.uuid4())
        location_doc = {
            "location_id": location_id,
            "tenant_id": tenant_id,
            **location.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "admin@example.com"  # TODO: Get from token
        }
        
        db.tenant_locations.insert_one(location_doc)
        
        # Remove MongoDB _id from response
        location_doc.pop('_id', None)
        
        return {
            "success": True,
            "message": "Location created successfully",
            "location": location_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}")
async def get_tenant_locations(
    tenant_id: str,
    state: Optional[str] = None,
    main_type: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all locations for a tenant with optional filters"""
    try:
        # Build query
        query = {"tenant_id": tenant_id}
        if state:
            query["state"] = state
        if main_type:
            query["main_type"] = main_type
        
        # Get locations
        locations = []
        cursor = db.tenant_locations.find(query).sort("location_code", 1)
        
        for loc in cursor:
            loc.pop('_id', None)
            locations.append(loc)
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/{location_id}")
async def get_tenant_location(
    tenant_id: str,
    location_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific location"""
    try:
        location = db.tenant_locations.find_one({
            "tenant_id": tenant_id,
            "location_id": location_id
        })
        
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        location.pop('_id', None)
        
        return {
            "success": True,
            "location": location
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/{location_id}")
async def update_tenant_location(
    tenant_id: str,
    location_id: str,
    location_update: TenantLocationUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a location"""
    try:
        # Check if location exists
        existing = db.tenant_locations.find_one({
            "tenant_id": tenant_id,
            "location_id": location_id
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Build update data (only include non-None fields)
        update_data = {k: v for k, v in location_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update location
        db.tenant_locations.update_one(
            {"tenant_id": tenant_id, "location_id": location_id},
            {"$set": update_data}
        )
        
        # Get updated location
        updated_location = db.tenant_locations.find_one({
            "tenant_id": tenant_id,
            "location_id": location_id
        })
        updated_location.pop('_id', None)
        
        return {
            "success": True,
            "message": "Location updated successfully",
            "location": updated_location
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/{location_id}")
async def delete_tenant_location(
    tenant_id: str,
    location_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a location"""
    try:
        # Check if location exists
        existing = db.tenant_locations.find_one({
            "tenant_id": tenant_id,
            "location_id": location_id
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Delete location
        db.tenant_locations.delete_one({
            "tenant_id": tenant_id,
            "location_id": location_id
        })
        
        return {
            "success": True,
            "message": "Location deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/filters/continents")
async def get_continents(
    tenant_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get unique continents for a tenant's locations"""
    try:
        continents = db.tenant_locations.distinct("continent", {"tenant_id": tenant_id})
        return {
            "success": True,
            "continents": [c for c in continents if c]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/filters/countries")
async def get_countries(
    tenant_id: str,
    continent: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get unique countries for a tenant's locations"""
    try:
        query = {"tenant_id": tenant_id}
        if continent:
            query["continent"] = continent
        
        countries = db.tenant_locations.distinct("country", query)
        return {
            "success": True,
            "countries": [c for c in countries if c]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/filters/states")
async def get_states(
    tenant_id: str,
    continent: Optional[str] = None,
    country: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get unique states for a tenant's locations"""
    try:
        query = {"tenant_id": tenant_id}
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        
        states = db.tenant_locations.distinct("state", query)
        return {
            "success": True,
            "states": [s for s in states if s]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/filters/cities")
async def get_cities(
    tenant_id: str,
    continent: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get unique cities for a tenant's locations"""
    try:
        query = {"tenant_id": tenant_id}
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        if state:
            query["state"] = state
        
        cities = db.tenant_locations.distinct("city", query)
        return {
            "success": True,
            "cities": [c for c in cities if c]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/stats/summary")
async def get_locations_stats(
    tenant_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get location statistics for a tenant"""
    try:
        # Get all locations
        locations = list(db.tenant_locations.find({"tenant_id": tenant_id}))
        
        # Calculate stats
        total = len(locations)
        by_state = {}
        by_type = {}
        
        for loc in locations:
            # Count by state
            state = loc.get("state", "Unknown")
            by_state[state] = by_state.get(state, 0) + 1
            
            # Count by type
            main_type = loc.get("main_type", "Unknown")
            by_type[main_type] = by_type.get(main_type, 0) + 1
        
        return {
            "success": True,
            "stats": {
                "total_locations": total,
                "by_state": by_state,
                "by_type": by_type
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
