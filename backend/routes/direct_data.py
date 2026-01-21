"""
Direct MongoDB API routes for Tenants and Locations
These routes read directly from MongoDB Atlas without relying on microservices
OPTIMIZED: Using connection pool for better performance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import os
from routes.portal_auth import verify_token
import logging

# Use connection pool
from db.connection import get_db as get_pooled_db, get_mongo_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Direct Data Access"])

# MongoDB connection
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')


def get_db():
    """Get MongoDB database connection from pool"""
    return get_pooled_db(DB_NAME)


# ============== TENANTS ==============

@router.get("/api/tenants")
async def get_tenants(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None,
    include_all: bool = Query(False, description="Include all tenant levels, not just organizations")
):
    """
    Get tenants from MongoDB Atlas
    By default, only returns organizations (real customers like Europcar, Puma)
    Use include_all=true to get all tenant levels (for hierarchy views)
    """
    try:
        db = get_db()
        
        # Build query - default to only organizations (real customers)
        query = {}
        if not include_all:
            query["tenant_level"] = "organization"
        
        if search:
            search_query = {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"display_name": {"$regex": search, "$options": "i"}},
                    {"tenant_id": {"$regex": search, "$options": "i"}}
                ]
            }
            if query:
                query = {"$and": [query, search_query]}
            else:
                query = search_query
        
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
    search: Optional[str] = None,
    include_all: bool = Query(False)
):
    """Alias with trailing slash"""
    return await get_tenants(page, limit, skip, search, include_all)


# IMPORTANT: Specific routes must come BEFORE /{tenant_id} to avoid being caught
@router.get("/api/tenants/stats")
async def get_global_tenant_stats_route():
    """
    Get global statistics for the admin dashboard - OPTIMIZED
    Returns data directly (not wrapped in success/data structure)
    
    Kunden = tenant_level 'organization' (top-level customers)
    Standorte = tenant_level 'location' (actual locations)
    """
    try:
        from db.connection import get_db as get_pooled_db, get_multi_tenant_db
        
        db = get_pooled_db()
        multi_db = get_multi_tenant_db()
        
        # Single aggregation for tenant counts (much faster than multiple count_documents)
        tenant_pipeline = [
            {"$group": {
                "_id": "$tenant_level",
                "count": {"$sum": 1}
            }}
        ]
        tenant_counts = {doc["_id"]: doc["count"] for doc in db.tenants.aggregate(tenant_pipeline)}
        
        customers_count = tenant_counts.get("organization", 0)
        locations_count = tenant_counts.get("location", 0)
        all_tenants_count = sum(tenant_counts.values())
        
        # Get device count from multi_tenant_admin (single query)
        devices_count = multi_db.europcar_devices.estimated_document_count()
        
        # Get users count from portal_db (single query)
        from db.connection import get_portal_db
        portal_db = get_portal_db()
        users_count = portal_db.portal_users.estimated_document_count()
        
        # Return data directly for dashboard compatibility
        return {
            "total_tenants": customers_count,
            "total_customers": customers_count,
            "total_locations": locations_count,
            "total_devices": devices_count,
            "total_users": users_count,
            "online_devices": devices_count,
            "offline_devices": 0,
            "in_preparation": 0,
            "total_licenses": 0,
            "total_scans": 0,
            "correct_scans": 0,
            "unknown_scans": 0,
            "failed_scans": 0,
            "all_tenants_count": all_tenants_count,
            "customers_count": customers_count,
            "tenants_count": customers_count,
            "locations_count": locations_count,
            "devices_count": devices_count,
            "users_count": users_count,
            "total_assets": devices_count
        }
    except Exception as e:
        logger.error(f"Error fetching global stats: {e}")
        return {
            "total_tenants": 0,
            "total_customers": 0,
            "total_locations": 0,
            "total_devices": 0,
            "total_users": 0,
            "online_devices": 0,
            "offline_devices": 0,
            "in_preparation": 0,
            "total_licenses": 0,
            "total_scans": 0,
            "correct_scans": 0,
            "unknown_scans": 0,
            "failed_scans": 0
        }


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



# ============== TENANT HIERARCHY ==============

@router.get("/api/tenants-hierarchy/list")
async def get_tenants_hierarchy_list():
    """
    Get tenant hierarchy as a flat list with parent-child relationships
    Returns field names expected by frontend: tenant_id, tenant_level, parent_tenant_id
    """
    try:
        db = get_db()
        
        # Get all tenants
        tenants = list(db.tenants.find({}, {"_id": 0}))
        
        # Build hierarchy structure with field names expected by frontend
        hierarchy = []
        for tenant in tenants:
            hierarchy.append({
                "tenant_id": tenant.get("tenant_id") or tenant.get("id"),
                "name": tenant.get("name") or tenant.get("display_name"),
                "display_name": tenant.get("display_name") or tenant.get("name"),
                "parent_tenant_id": tenant.get("parent_tenant_id") or tenant.get("parent_id"),
                "tenant_level": tenant.get("tenant_level") or tenant.get("level"),
                "tenant_type": tenant.get("tenant_type") or tenant.get("type"),
                "country_code": tenant.get("country_code"),
                "enabled": tenant.get("enabled", True)
            })
        
        return {
            "success": True,
            "tenants": hierarchy,
            "total": len(hierarchy)
        }
    except Exception as e:
        logger.error(f"Error fetching tenant hierarchy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/tenants/{tenant_id}/hierarchy")
async def get_tenant_hierarchy(tenant_id: str):
    """
    Get hierarchy for a specific tenant
    """
    try:
        db = get_db()
        
        # Get the tenant
        tenant = db.tenants.find_one(
            {"$or": [{"tenant_id": tenant_id}, {"id": tenant_id}]},
            {"_id": 0}
        )
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get children
        children = list(db.tenants.find(
            {"parent_tenant_id": tenant_id},
            {"_id": 0}
        ))
        
        return {
            "success": True,
            "tenant": tenant,
            "children": children,
            "children_count": len(children)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant hierarchy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/tenants/{tenant_id}/siblings")
async def get_tenant_siblings(
    tenant_id: str,
    same_country_only: bool = False
):
    """
    Get sibling tenants (same parent)
    """
    try:
        db = get_db()
        
        # Get the tenant first
        tenant = db.tenants.find_one(
            {"$or": [{"tenant_id": tenant_id}, {"id": tenant_id}]},
            {"_id": 0}
        )
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Build query for siblings
        query = {"parent_tenant_id": tenant.get("parent_tenant_id")}
        if same_country_only and tenant.get("country_code"):
            query["country_code"] = tenant["country_code"]
        
        siblings = list(db.tenants.find(query, {"_id": 0}))
        
        # Remove self from siblings
        siblings = [s for s in siblings if s.get("tenant_id") != tenant_id and s.get("id") != tenant_id]
        
        return {
            "success": True,
            "siblings": siblings,
            "count": len(siblings)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant siblings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/tenants/{tenant_id}/dashboard-stats")
async def get_tenant_dashboard_stats(tenant_id: str):
    """
    Get dashboard statistics for a specific tenant
    Returns all stats needed for the tenant dashboard tiles
    """
    try:
        client = get_mongo_client()
        db = client[DB_NAME]
        multi_tenant_db = client["multi_tenant_admin"]
        portal_db = client["portal_db"]
        
        # Verify tenant exists
        tenant = db.tenants.find_one(
            {"$or": [{"tenant_id": tenant_id}, {"id": tenant_id}]},
            {"_id": 0, "name": 1, "display_name": 1}
        )
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get tenant name for filtering
        tenant_name = tenant.get("name", tenant.get("display_name", ""))
        
        # Count devices for this tenant (from europcar_devices)
        # Filter by tenant_id or customer field matching tenant name
        device_filter = {
            "$or": [
                {"tenant_id": tenant_id},
                {"customer": {"$regex": tenant_name, "$options": "i"}} if tenant_name else {"tenant_id": tenant_id}
            ]
        }
        
        total_devices = multi_tenant_db.europcar_devices.count_documents(device_filter)
        
        # Count online/offline devices
        online_filter = {
            **device_filter,
            "$or": [
                {"status": "online"},
                {"teamviewer_online": True},
                {"online": True}
            ]
        }
        online_devices = multi_tenant_db.europcar_devices.count_documents({
            "$and": [
                device_filter,
                {"$or": [
                    {"status": "online"},
                    {"teamviewer_online": True},
                    {"online": True}
                ]}
            ]
        })
        offline_devices = total_devices - online_devices
        
        # Count devices in preparation (status = 'preparation' or 'Vorbereitung')
        in_preparation = multi_tenant_db.europcar_devices.count_documents({
            **device_filter,
            "$or": [
                {"status": {"$in": ["preparation", "Vorbereitung", "in_preparation"]}},
                {"in_preparation": True}
            ]
        })
        
        # Count locations for this tenant
        location_filter = {
            "$or": [
                {"tenant_id": tenant_id},
                {"customer": {"$regex": tenant_name, "$options": "i"}} if tenant_name else {"tenant_id": tenant_id}
            ]
        }
        total_locations = multi_tenant_db.europcar_stations.count_documents(location_filter)
        if total_locations == 0:
            # Try key_locations as fallback
            total_locations = db.key_locations.count_documents({"tenant_id": tenant_id})
        
        # Count users for this tenant
        total_users = portal_db.portal_users.count_documents({
            "$or": [
                {"tenant_id": tenant_id},
                {"tenants": tenant_id}
            ]
        })
        
        # Get scan statistics (from scan_results or id_scans collection)
        scan_filter = {"tenant_id": tenant_id}
        total_scans = 0
        correct_scans = 0
        unknown_scans = 0
        failed_scans = 0
        
        try:
            if "scan_results" in db.list_collection_names():
                total_scans = db.scan_results.count_documents(scan_filter)
                correct_scans = db.scan_results.count_documents({**scan_filter, "status": "success"})
                unknown_scans = db.scan_results.count_documents({**scan_filter, "status": "unknown"})
                failed_scans = db.scan_results.count_documents({**scan_filter, "status": "failed"})
            elif "id_scans" in db.list_collection_names():
                total_scans = db.id_scans.count_documents(scan_filter)
                correct_scans = db.id_scans.count_documents({**scan_filter, "result": "valid"})
                failed_scans = db.id_scans.count_documents({**scan_filter, "result": "invalid"})
        except Exception as e:
            logger.warning(f"Error fetching scan stats: {e}")
        
        # Get open orders and tickets
        open_orders = 0
        open_tickets = 0
        try:
            if "orders" in db.list_collection_names():
                open_orders = db.orders.count_documents({
                    "tenant_id": tenant_id,
                    "status": {"$in": ["pending", "processing", "open"]}
                })
            if "tickets" in db.list_collection_names():
                open_tickets = db.tickets.count_documents({
                    "tenant_id": tenant_id,
                    "status": {"$in": ["open", "pending", "in_progress"]}
                })
        except Exception as e:
            logger.warning(f"Error fetching orders/tickets: {e}")
        
        return {
            "success": True,
            "total_users": total_users,
            "total_devices": total_devices,
            "total_locations": total_locations,
            "online_devices": online_devices,
            "offline_devices": offline_devices,
            "in_preparation": in_preparation,
            "total_scans": total_scans,
            "correct_scans": correct_scans,
            "unknown_scans": unknown_scans,
            "failed_scans": failed_scans,
            "open_orders": open_orders,
            "open_tickets": open_tickets,
            "data": {
                "tenant": tenant,
                "locations_count": total_locations,
                "devices_count": total_devices,
                "users_count": total_users
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/portal/locations/list")
async def get_portal_locations_list(token_data: dict = Depends(verify_token)):
    """
    Get locations list for portal dashboard
    """
    try:
        db = get_db()
        locations = list(db.key_locations.find({}, {"_id": 0}))
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations)
        }
    except Exception as e:
        logger.error(f"Error fetching portal locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Note: /api/tenants/stats is defined earlier in this file (before /{tenant_id})

@router.get("/api/scan-stats")
async def get_scan_stats(days: int = Query(30, ge=1, le=365)):
    """
    Get scan statistics for the dashboard
    """
    try:
        db = get_db()
        
        # Check various scan-related collections
        id_scans = db.id_scans.count_documents({}) if "id_scans" in db.list_collection_names() else 0
        document_scans = db.document_scans.count_documents({}) if "document_scans" in db.list_collection_names() else 0
        verification_scans = db.verification_scans.count_documents({}) if "verification_scans" in db.list_collection_names() else 0
        
        return {
            "success": True,
            "data": {
                "success": True,
                "data": {
                    "total_scans": id_scans + document_scans + verification_scans,
                    "id_scans": id_scans,
                    "document_scans": document_scans,
                    "verification_scans": verification_scans,
                    "days": days
                }
            }
        }
    except Exception as e:
        logger.error(f"Error fetching scan stats: {e}")
        return {
            "success": True,
            "data": {
                "success": True,
                "data": {
                    "total_scans": 0,
                    "id_scans": 0,
                    "document_scans": 0,
                    "verification_scans": 0,
                    "days": days
                }
            }
        }


@router.get("/api/tickets/stats")
async def get_tickets_stats():
    """
    Get ticket statistics - OPTIMIZED with aggregation
    """
    try:
        db = get_db()
        
        if "tickets" not in db.list_collection_names():
            return {
                "success": True,
                "data": {
                    "total": 0,
                    "open": 0,
                    "in_progress": 0,
                    "resolved": 0,
                    "closed": 0
                }
            }
        
        # Use aggregation for better performance (single query instead of 5)
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = {doc["_id"]: doc["count"] for doc in db.tickets.aggregate(pipeline)}
        total = sum(status_counts.values())
        
        return {
            "success": True,
            "data": {
                "total": total,
                "open": status_counts.get("open", 0),
                "in_progress": status_counts.get("in_progress", 0),
                "resolved": status_counts.get("resolved", 0),
                "closed": status_counts.get("closed", 0)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching ticket stats: {e}")
        return {
            "success": True,
            "data": {
                "total": 0,
                "open": 0,
                "in_progress": 0,
                "resolved": 0,
                "closed": 0
            }
        }


@router.get("/api/change-requests/stats/summary")
async def get_change_requests_stats(
    tenant_id: Optional[str] = None
):
    """
    Get change request statistics
    """
    try:
        db = get_db()
        
        if "change_requests" not in db.list_collection_names():
            return {
                "success": True,
                "data": {
                    "total": 0,
                    "pending": 0,
                    "approved": 0,
                    "rejected": 0,
                    "implemented": 0
                }
            }
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        total = db.change_requests.count_documents(query)
        pending = db.change_requests.count_documents({**query, "status": "pending"})
        approved = db.change_requests.count_documents({**query, "status": "approved"})
        rejected = db.change_requests.count_documents({**query, "status": "rejected"})
        implemented = db.change_requests.count_documents({**query, "status": "implemented"})
        
        return {
            "success": True,
            "data": {
                "total": total,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "implemented": implemented
            }
        }
    except Exception as e:
        logger.error(f"Error fetching change request stats: {e}")
        return {
            "success": True,
            "data": {
                "total": 0,
                "pending": 0,
                "approved": 0,
                "rejected": 0,
                "implemented": 0
            }
        }

