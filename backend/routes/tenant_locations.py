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
    country: Optional[str] = None  # Land
    continent: Optional[str] = None  # Kontinent
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
    country: Optional[str] = None
    continent: Optional[str] = None
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

# Special routes that don't use tenant_id pattern - must come BEFORE /{tenant_id} routes
@router.get("/by-id/{location_id}")
async def get_location_by_id(
    location_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a location by its ID (searches across all tenants)"""
    try:
        location = db.tenant_locations.find_one({"location_id": location_id})
        
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
    continent: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all locations for a tenant with optional filters and search"""
    try:
        # Build query
        query = {"tenant_id": tenant_id}
        if state:
            query["state"] = state
        if main_type:
            query["main_type"] = main_type
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        if city:
            query["city"] = city
        
        # Add search functionality
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"location_code": search_regex},
                {"station_name": search_regex},
                {"street": search_regex},
                {"city": search_regex},
                {"state": search_regex},
                {"postal_code": search_regex},
                {"manager": search_regex},
                {"email": search_regex},
                {"phone": search_regex},
                {"sn_pc": search_regex},
                {"sn_sc": search_regex},
                {"tv_id": search_regex}
            ]
        
        # Get locations
        locations = []
        cursor = db.tenant_locations.find(query).sort("location_code", 1)
        
        # Get devices for this tenant to calculate online status
        devices_db = mongo_client['multi_tenant_admin']
        devices = list(devices_db.europcar_devices.find({"tenant_id": tenant_id}))
        
        # Group devices by location code
        devices_by_location = {}
        for device in devices:
            locationcode = device.get('locationcode')
            if locationcode:
                if locationcode not in devices_by_location:
                    devices_by_location[locationcode] = []
                devices_by_location[locationcode].append(device)
        
        for loc in cursor:
            loc.pop('_id', None)
            
            # Add device count and online count for this location
            location_code = loc.get('location_code')
            location_devices = devices_by_location.get(location_code, [])
            
            loc['device_count'] = len(location_devices)
            loc['online_device_count'] = sum(
                1 for device in location_devices 
                if device.get('status', '').lower() == 'online' or device.get('teamviewer_online', False)
            )
            
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

# Opening Hours Models
class DayOpeningHours(BaseModel):
    day: str  # Monday, Tuesday, etc.
    is_open: bool = True
    open_time: Optional[str] = None  # e.g., "08:00"
    close_time: Optional[str] = None  # e.g., "18:00"
    is_24h: bool = False

class LocationOpeningHours(BaseModel):
    monday: Optional[DayOpeningHours] = None
    tuesday: Optional[DayOpeningHours] = None
    wednesday: Optional[DayOpeningHours] = None
    thursday: Optional[DayOpeningHours] = None
    friday: Optional[DayOpeningHours] = None
    saturday: Optional[DayOpeningHours] = None
    sunday: Optional[DayOpeningHours] = None
    manual_override: bool = False  # If true, ignore Google API data

@router.get("/details/{location_id}")
async def get_location_details(
    location_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed information for a single location including devices and opening hours"""
    try:
        # Get location by ID
        location = db.tenant_locations.find_one({"location_id": location_id})
        
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        location.pop('_id', None)
        tenant_id = location.get('tenant_id')
        location_code = location.get('location_code')
        
        # Get devices for this location
        devices_db = mongo_client['multi_tenant_admin']
        devices = list(devices_db.europcar_devices.find({
            "tenant_id": tenant_id,
            "locationcode": location_code
        }))
        
        # Format devices data
        device_list = []
        online_count = 0
        offline_count = 0
        
        for device in devices:
            is_online = device.get('status', '').lower() == 'online' or device.get('teamviewer_online', False)
            if is_online:
                online_count += 1
            else:
                offline_count += 1
            
            device_list.append({
                "device_id": device.get('device_id'),
                "device_name": device.get('device_name') or device.get('device_id'),
                "locationcode": device.get('locationcode'),
                "sn_pc": device.get('sn_pc', '-'),
                "sn_sc": device.get('sn_sc', '-'),
                "status": 'Online' if is_online else 'Offline',
                "is_online": is_online,
                "teamviewer_id": device.get('teamviewer_id', '-')
            })
        
        # Get opening hours from database (if manually set)
        opening_hours = location.get('opening_hours', None)
        
        return {
            "success": True,
            "location": location,
            "devices": device_list,
            "stats": {
                "total_devices": len(device_list),
                "online_devices": online_count,
                "offline_devices": offline_count
            },
            "opening_hours": opening_hours
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/details/{location_id}/opening-hours")
async def update_opening_hours(
    location_id: str,
    opening_hours: LocationOpeningHours,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update opening hours for a location (manual override)"""
    try:
        # Check if location exists
        location = db.tenant_locations.find_one({"location_id": location_id})
        
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Update opening hours
        update_data = {
            "opening_hours": opening_hours.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.tenant_locations.update_one(
            {"location_id": location_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Opening hours updated successfully",
            "opening_hours": opening_hours.dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/details/{location_id}/google-hours")
async def get_google_opening_hours(
    location_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get opening hours from Google Places API (Placeholder for now)"""
    try:
        # Check if location exists
        location = db.tenant_locations.find_one({"location_id": location_id})
        
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # TODO: Implement Google Places API call here
        # For now, return a placeholder message
        return {
            "success": True,
            "message": "Google Places API integration pending - API key required",
            "google_hours": None,
            "requires_api_key": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
