"""
Direct MongoDB API routes for Tenants and Locations
These routes read directly from MongoDB Atlas without relying on microservices
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import os
from pymongo import MongoClient
from routes.portal_auth import verify_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Direct Data Access"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')


def get_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


# ============== TENANTS ==============

@router.get("/api/tenants")
async def get_tenants(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """
    Get all tenants from MongoDB Atlas
    """
    try:
        db = get_db()
        
        # Build query
        query = {}
        if search:
            query = {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"display_name": {"$regex": search, "$options": "i"}},
                    {"tenant_id": {"$regex": search, "$options": "i"}}
                ]
            }
        
        # Get total count
        total = db.tenants.count_documents(query)
        
        # Use skip parameter if provided, otherwise calculate from page
        actual_skip = skip if skip > 0 else (page - 1) * limit
        tenants = list(db.tenants.find(query, {"_id": 0}).skip(actual_skip).limit(limit))
        
        return {
            "success": True,
            "tenants": tenants,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    except Exception as e:
        logger.error(f"Error fetching tenants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/tenants/")
async def get_tenants_trailing_slash(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """Alias with trailing slash"""
    return await get_tenants(page, limit, skip, search)


@router.get("/api/tenants/{tenant_id}")
async def get_tenant_by_id(tenant_id: str):
    """
    Get a specific tenant by ID
    """
    try:
        db = get_db()
        tenant = db.tenants.find_one(
            {"$or": [{"tenant_id": tenant_id}, {"id": tenant_id}]},
            {"_id": 0}
        )
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        return {"success": True, "tenant": tenant}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== LOCATIONS ==============

@router.get("/api/portal/locations")
async def get_locations(
    token_data: dict = Depends(verify_token),
    tenant_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get all locations from MongoDB Atlas
    """
    try:
        db = get_db()
        
        # Build query
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        # Get total count
        total = db.key_locations.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * limit
        locations = list(db.key_locations.find(query, {"_id": 0}).skip(skip).limit(limit))
        
        return {
            "success": True,
            "data": {
                "locations": locations,
                "total": total,
                "page": page,
                "limit": limit
            }
        }
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/locations")
async def get_all_locations(
    tenant_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get all locations (public endpoint for some use cases)
    """
    try:
        db = get_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        total = db.key_locations.count_documents(query)
        skip = (page - 1) * limit
        locations = list(db.key_locations.find(query, {"_id": 0}).skip(skip).limit(limit))
        
        return {
            "success": True,
            "locations": locations,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== VEHICLES ==============

@router.get("/api/vehicles")
async def get_vehicles(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Get all vehicles from MongoDB Atlas
    """
    try:
        db = get_db()
        
        total = db.vehicles.count_documents({})
        skip = (page - 1) * limit
        vehicles = list(db.vehicles.find({}, {"_id": 0}).skip(skip).limit(limit))
        
        return {
            "success": True,
            "vehicles": vehicles,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== CAMERAS ==============

@router.get("/api/cameras-list")
async def get_cameras(
    token_data: dict = Depends(verify_token)
):
    """
    Get all cameras from MongoDB Atlas
    """
    try:
        db = get_db()
        
        cameras = list(db.cameras.find({}, {"_id": 0}))
        
        return {
            "success": True,
            "cameras": cameras,
            "total": len(cameras)
        }
    except Exception as e:
        logger.error(f"Error fetching cameras: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== DEVICES ==============

@router.get("/api/portal/devices")
async def get_devices(
    token_data: dict = Depends(verify_token),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    tenant_id: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get devices - checks multiple possible collections
    """
    try:
        db = get_db()
        
        # Try different possible collection names
        devices = []
        total = 0
        
        for coll_name in ['devices', 'portal_devices', 'europcar_vehicles']:
            if coll_name in db.list_collection_names():
                query = {}
                if tenant_id:
                    query["tenant_id"] = tenant_id
                if search:
                    query["$or"] = [
                        {"name": {"$regex": search, "$options": "i"}},
                        {"serial_number": {"$regex": search, "$options": "i"}}
                    ]
                
                total += db[coll_name].count_documents(query)
                skip = (page - 1) * limit
                found = list(db[coll_name].find(query, {"_id": 0}).skip(skip).limit(limit))
                devices.extend(found)
                
                if devices:
                    break
        
        return {
            "success": True,
            "data": {
                "devices": devices[:limit],
                "total": total,
                "page": page,
                "limit": limit
            }
        }
    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== STATISTICS ==============

@router.get("/api/stats/overview")
async def get_stats_overview(token_data: dict = Depends(verify_token)):
    """
    Get overview statistics of all data
    """
    try:
        db = get_db()
        
        stats = {}
        for coll in db.list_collection_names():
            stats[coll] = db[coll].count_documents({})
        
        return {
            "success": True,
            "data": {
                "collections": stats,
                "tenants_count": stats.get('tenants', 0),
                "locations_count": stats.get('key_locations', 0),
                "vehicles_count": stats.get('vehicles', 0) + stats.get('europcar_vehicles', 0),
                "cameras_count": stats.get('cameras', 0),
                "users_count": stats.get('portal_users', 0)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
