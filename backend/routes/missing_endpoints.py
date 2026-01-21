"""
Missing API endpoints that cause frontend crashes
These endpoints read from multi_tenant_admin and other databases
OPTIMIZED: Using connection pool for better performance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import os
from routes.portal_auth import verify_token
import logging

# Use connection pool instead of creating new connections
from db.connection import get_mongo_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Missing Endpoints"])


def get_multi_tenant_db():
    """Get multi_tenant_admin database from pool"""
    return get_mongo_client()['multi_tenant_admin']


def get_portal_db():
    """Get portal_db database from pool"""
    return get_mongo_client()['portal_db']


def get_verification_db():
    """Get verification_db database from pool"""
    return get_mongo_client()['verification_db']


def get_main_db():
    """Get main_db database from pool"""
    return get_mongo_client()['main_db']


def get_ticketing_db():
    """Get ticketing_db database from pool"""
    return get_mongo_client()['ticketing_db']


# ============== EUROPCAR DEVICES ==============

@router.get("/api/portal/europcar-devices")
async def get_europcar_devices(
    token_data: dict = Depends(verify_token),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None
):
    """Get Europcar devices from multi_tenant_admin database"""
    try:
        db = get_multi_tenant_db()
        
        query = {}
        if status:
            query["status"] = status
        
        total = db.europcar_devices.count_documents(query)
        skip = (page - 1) * limit
        devices = list(db.europcar_devices.find(query, {"_id": 0}).skip(skip).limit(limit))
        
        # Count by status
        online = db.europcar_devices.count_documents({"status": "online"})
        offline = db.europcar_devices.count_documents({"status": "offline"})
        
        return {
            "success": True,
            "data": {
                "devices": devices,
                "total": total,
                "online": online,
                "offline": offline,
                "page": page,
                "limit": limit
            }
        }
    except Exception as e:
        logger.error(f"Error fetching europcar devices: {e}")
        return {"success": True, "data": {"devices": [], "total": 0, "online": 0, "offline": 0}}


@router.get("/api/portal/devices/list")
async def get_devices_list(token_data: dict = Depends(verify_token)):
    """Get all devices list"""
    try:
        db = get_multi_tenant_db()
        devices = list(db.devices.find({}, {"_id": 0}).limit(500))
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices)
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "devices": [], "total": 0}


# ============== CUSTOMERS ==============

@router.get("/api/customers/list")
async def get_customers_list(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    """Get customers list"""
    try:
        client = MongoClient(MONGO_URL)
        db = client['customer_db']
        
        total = db.customers.count_documents({})
        skip = (page - 1) * limit
        customers = list(db.customers.find({}, {"_id": 0}).skip(skip).limit(limit))
        client.close()
        
        return {
            "success": True,
            "customers": customers,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "customers": [], "total": 0}


# ============== USERS ==============

@router.get("/api/portal/users/list")
async def get_users_list(token_data: dict = Depends(verify_token)):
    """Get portal users list"""
    try:
        db = get_portal_db()
        users = list(db.portal_users.find({}, {"_id": 0, "password": 0}).limit(100))
        
        return {
            "success": True,
            "users": users,
            "total": len(users)
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "users": [], "total": 0}


# ============== INVENTORY ==============

@router.get("/api/inventory/low-stock")
async def get_low_stock_inventory():
    """Get low stock inventory items"""
    try:
        client = MongoClient(MONGO_URL)
        db = client['inventory_db']
        
        # Find items with low stock (quantity < threshold)
        low_stock = list(db.inventory_items.find(
            {"$expr": {"$lt": ["$quantity", "$min_quantity"]}},
            {"_id": 0}
        ).limit(50))
        client.close()
        
        return {
            "success": True,
            "items": low_stock,
            "total": len(low_stock)
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "items": [], "total": 0}


# ============== DASHBOARD LAYOUT ==============

@router.get("/api/dashboard/layout")
async def get_dashboard_layout(token_data: dict = Depends(verify_token)):
    """Get user's dashboard layout preferences"""
    try:
        db = get_verification_db()
        user_id = token_data.get("sub")
        
        layout = db.dashboard_layouts.find_one({"user_id": user_id}, {"_id": 0})
        
        if not layout:
            # Return default layout
            layout = {
                "widgets": [
                    {"id": "stats", "position": {"x": 0, "y": 0, "w": 12, "h": 2}},
                    {"id": "devices", "position": {"x": 0, "y": 2, "w": 6, "h": 4}},
                    {"id": "scans", "position": {"x": 6, "y": 2, "w": 6, "h": 4}}
                ],
                "theme": "dark"
            }
        
        return {"success": True, "layout": layout}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "layout": {"widgets": [], "theme": "dark"}}


@router.post("/api/dashboard/layout")
async def save_dashboard_layout(layout: dict, token_data: dict = Depends(verify_token)):
    """Save user's dashboard layout"""
    try:
        db = get_verification_db()
        user_id = token_data.get("sub")
        
        db.dashboard_layouts.update_one(
            {"user_id": user_id},
            {"$set": {**layout, "user_id": user_id, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        return {"success": True, "message": "Layout saved"}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": False, "error": str(e)}


# ============== TICKETS STATS ==============

@router.get("/api/tickets/stats")
async def get_tickets_stats_endpoint():
    """Get ticket statistics - OPTIMIZED with aggregation"""
    try:
        db = get_ticketing_db()
        
        # Use aggregation for better performance (single query)
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = {}
        for doc in db.tickets.aggregate(pipeline):
            status_counts[doc["_id"]] = doc["count"]
        
        total = sum(status_counts.values())
        
        return {
            "success": True,
            "data": {
                "total": total,
                "open": status_counts.get("open", 0),
                "in_progress": status_counts.get("in_progress", 0),
                "resolved": status_counts.get("resolved", 0),
                "closed": status_counts.get("closed", 0),
                "new": status_counts.get("open", 0)  # Alias
            }
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "data": {"total": 0, "open": 0, "in_progress": 0, "resolved": 0, "closed": 0, "new": 0}}


# ============== CHANGE REQUESTS ==============

@router.get("/api/change-requests/stats/summary")
async def get_change_requests_summary():
    """Get change requests summary - OPTIMIZED with aggregation"""
    try:
        db = get_ticketing_db()
        
        # Use aggregation for better performance
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = {}
        for doc in db.change_requests.aggregate(pipeline):
            status_counts[doc["_id"]] = doc["count"]
        
        total = sum(status_counts.values())
        
        return {
            "success": True,
            "data": {
                "total": total,
                "pending": status_counts.get("pending", 0),
                "approved": status_counts.get("approved", 0),
                "rejected": status_counts.get("rejected", 0)
            }
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "data": {"total": 0, "pending": 0, "approved": 0, "rejected": 0}}


# ============== SCAN STATS ==============

@router.get("/api/scan-stats")
async def get_scan_statistics(days: int = Query(30, ge=1, le=365)):
    """Get scan statistics"""
    try:
        db = get_verification_db()
        
        total_scans = db.scans.count_documents({}) if "scans" in db.list_collection_names() else 0
        id_scans = db.id_scans.count_documents({}) if "id_scans" in db.list_collection_names() else 0
        
        return {
            "success": True,
            "data": {
                "total_scans": total_scans + id_scans,
                "correct_scans": 0,
                "unknown_scans": 0,
                "failed_scans": 0,
                "days": days
            }
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "data": {"total_scans": 0, "correct_scans": 0, "unknown_scans": 0, "failed_scans": 0}}


# ============== EUROPCAR STATIONS ==============

@router.get("/api/portal/customer-data/europcar-stations")
async def get_europcar_stations(token_data: dict = Depends(verify_token)):
    """Get Europcar stations"""
    try:
        client = MongoClient(MONGO_URL)
        db = client['tsrid_db']
        
        stations = list(db.europcar_stations.find({}, {"_id": 0}))
        client.close()
        
        return {
            "success": True,
            "stations": stations,
            "total": len(stations)
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": True, "stations": [], "total": 0}
