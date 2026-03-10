"""
Electron Agent Management API

Manages Electron app versions, updates, and device tracking.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import uuid
import logging
import hashlib

router = APIRouter(prefix="/api/electron-agent", tags=["Electron Agent"])
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client['tsrid_db']
electron_db = client['electron_agent_db']

# Collections
versions_collection = electron_db['versions']
devices_collection = electron_db['devices']
updates_collection = electron_db['update_history']
features_collection = electron_db['features']


# =====================================
# MODELS
# =====================================

class VersionCreate(BaseModel):
    version: str
    platform: str  # win, mac, linux, all
    release_notes: str = ""
    min_version: Optional[str] = None
    features: List[str] = []
    is_mandatory: bool = False
    is_preview: bool = False

class DeviceRegistration(BaseModel):
    device_id: str
    tenant_id: str
    location_code: Optional[str] = None
    platform: str
    arch: str
    version: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    scanner_serial: Optional[str] = None
    features: List[str] = []

class DeviceHeartbeat(BaseModel):
    device_id: str
    version: str
    status: str = "online"
    scanner_status: Optional[Dict] = None
    last_scan: Optional[str] = None
    scan_count: int = 0

class UpdatePush(BaseModel):
    target_version: str
    tenant_ids: Optional[List[str]] = None  # None = all tenants
    device_ids: Optional[List[str]] = None  # Specific devices
    platform: Optional[str] = None  # Filter by platform
    force: bool = False


# =====================================
# VERSION MANAGEMENT
# =====================================

@router.get("/versions")
async def get_versions(
    platform: Optional[str] = None,
    include_preview: bool = False
):
    """Get all available versions"""
    query = {}
    if platform and platform != 'all':
        query["$or"] = [{"platform": platform}, {"platform": "all"}]
    if not include_preview:
        query["is_preview"] = {"$ne": True}
    
    versions = list(versions_collection.find(query, {"_id": 0}).sort("created_at", -1))
    
    return {
        "success": True,
        "versions": versions,
        "count": len(versions)
    }


@router.get("/versions/latest")
async def get_latest_version(platform: str = "all"):
    """Get the latest stable version for a platform"""
    query = {
        "is_preview": {"$ne": True},
        "$or": [{"platform": platform}, {"platform": "all"}]
    }
    
    version = versions_collection.find_one(
        query,
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not version:
        raise HTTPException(status_code=404, detail="No version found")
    
    return {
        "success": True,
        "version": version
    }


@router.post("/versions")
async def create_version(version_data: VersionCreate):
    """Create a new version entry"""
    # Check if version already exists
    existing = versions_collection.find_one({"version": version_data.version, "platform": version_data.platform})
    if existing:
        raise HTTPException(status_code=400, detail="Version already exists")
    
    doc = {
        "version_id": str(uuid.uuid4()),
        "version": version_data.version,
        "platform": version_data.platform,
        "release_notes": version_data.release_notes,
        "min_version": version_data.min_version,
        "features": version_data.features,
        "is_mandatory": version_data.is_mandatory,
        "is_preview": version_data.is_preview,
        "download_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin"
    }
    
    versions_collection.insert_one(doc)
    
    return {
        "success": True,
        "version": {k: v for k, v in doc.items() if k != "_id"}
    }


@router.delete("/versions/{version}")
async def delete_version(version: str, platform: str = "all"):
    """Delete a version"""
    result = versions_collection.delete_one({"version": version, "platform": platform})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {"success": True, "message": f"Version {version} deleted"}


# =====================================
# DEVICE MANAGEMENT
# =====================================

@router.post("/devices/register")
async def register_device(device: DeviceRegistration):
    """Register a new device or update existing"""
    existing = devices_collection.find_one({"device_id": device.device_id})
    
    doc = {
        "device_id": device.device_id,
        "tenant_id": device.tenant_id,
        "location_code": device.location_code,
        "platform": device.platform,
        "arch": device.arch,
        "version": device.version,
        "hostname": device.hostname,
        "ip_address": device.ip_address,
        "scanner_serial": device.scanner_serial,
        "features": device.features,
        "status": "online",
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "registered_at": existing.get("registered_at") if existing else datetime.now(timezone.utc).isoformat(),
        "update_available": None,
        "pending_update": None
    }
    
    if existing:
        devices_collection.update_one(
            {"device_id": device.device_id},
            {"$set": doc}
        )
    else:
        devices_collection.insert_one(doc)
    
    # Check if update available
    latest = versions_collection.find_one(
        {
            "is_preview": {"$ne": True},
            "$or": [{"platform": device.platform}, {"platform": "all"}]
        },
        sort=[("created_at", -1)]
    )
    
    update_available = None
    if latest and latest["version"] != device.version:
        update_available = latest["version"]
    
    return {
        "success": True,
        "device_id": device.device_id,
        "update_available": update_available,
        "pending_commands": []  # Future: Remote commands
    }


@router.post("/devices/heartbeat")
async def device_heartbeat(heartbeat: DeviceHeartbeat):
    """Update device status via heartbeat"""
    doc = {
        "status": heartbeat.status,
        "version": heartbeat.version,
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "scanner_status": heartbeat.scanner_status,
        "last_scan": heartbeat.last_scan,
        "scan_count": heartbeat.scan_count
    }
    
    result = devices_collection.update_one(
        {"device_id": heartbeat.device_id},
        {"$set": doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not registered")
    
    # Get device to check pending update
    device = devices_collection.find_one({"device_id": heartbeat.device_id})
    
    return {
        "success": True,
        "pending_update": device.get("pending_update"),
        "commands": []  # Future: Remote commands
    }


@router.get("/devices")
async def get_devices(
    tenant_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    version: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all registered devices with filters"""
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    if version:
        query["version"] = version
    
    total = devices_collection.count_documents(query)
    skip = (page - 1) * limit
    
    devices = list(devices_collection.find(query, {"_id": 0}).skip(skip).limit(limit))
    
    # Add tenant names
    for device in devices:
        tenant = db.tenants.find_one({"tenant_id": device.get("tenant_id")})
        device["tenant_name"] = tenant.get("name") if tenant else "Unbekannt"
    
    return {
        "success": True,
        "devices": devices,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    """Get a specific device"""
    device = devices_collection.find_one({"device_id": device_id}, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Add tenant name
    tenant = db.tenants.find_one({"tenant_id": device.get("tenant_id")})
    device["tenant_name"] = tenant.get("name") if tenant else "Unbekannt"
    
    return {
        "success": True,
        "device": device
    }


# =====================================
# UPDATE MANAGEMENT
# =====================================

@router.post("/updates/push")
async def push_update(update: UpdatePush, background_tasks: BackgroundTasks):
    """Push update to devices"""
    # Verify version exists
    version = versions_collection.find_one({"version": update.target_version})
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Build device query
    query = {}
    if update.tenant_ids:
        query["tenant_id"] = {"$in": update.tenant_ids}
    if update.device_ids:
        query["device_id"] = {"$in": update.device_ids}
    if update.platform:
        query["platform"] = update.platform
    
    # Don't update devices already on this version
    query["version"] = {"$ne": update.target_version}
    
    # Get affected devices
    affected_devices = list(devices_collection.find(query, {"device_id": 1, "tenant_id": 1, "version": 1}))
    
    if not affected_devices:
        return {
            "success": True,
            "message": "No devices need updating",
            "affected_count": 0
        }
    
    # Update devices with pending_update
    result = devices_collection.update_many(
        query,
        {"$set": {
            "pending_update": update.target_version,
            "update_pushed_at": datetime.now(timezone.utc).isoformat(),
            "update_forced": update.force
        }}
    )
    
    # Log update push
    update_log = {
        "update_id": str(uuid.uuid4()),
        "target_version": update.target_version,
        "tenant_ids": update.tenant_ids,
        "device_ids": update.device_ids,
        "platform": update.platform,
        "force": update.force,
        "affected_count": result.modified_count,
        "affected_devices": [d["device_id"] for d in affected_devices],
        "pushed_at": datetime.now(timezone.utc).isoformat(),
        "pushed_by": "admin"
    }
    updates_collection.insert_one(update_log)
    
    return {
        "success": True,
        "message": f"Update pushed to {result.modified_count} devices",
        "affected_count": result.modified_count,
        "update_id": update_log["update_id"]
    }


@router.get("/updates/history")
async def get_update_history(limit: int = 50):
    """Get update push history"""
    history = list(updates_collection.find({}, {"_id": 0}).sort("pushed_at", -1).limit(limit))
    
    return {
        "success": True,
        "history": history
    }


# =====================================
# STATISTICS & OVERVIEW
# =====================================

@router.get("/stats")
async def get_stats():
    """Get overall statistics"""
    # Total devices
    total_devices = devices_collection.count_documents({})
    online_devices = devices_collection.count_documents({"status": "online"})
    
    # Devices by platform
    by_platform = list(devices_collection.aggregate([
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]))
    
    # Devices by version
    by_version = list(devices_collection.aggregate([
        {"$group": {"_id": "$version", "count": {"$sum": 1}}}
    ]))
    
    # Devices by tenant
    by_tenant = list(devices_collection.aggregate([
        {"$group": {"_id": "$tenant_id", "count": {"$sum": 1}}}
    ]))
    
    # Add tenant names
    for item in by_tenant:
        tenant = db.tenants.find_one({"tenant_id": item["_id"]})
        item["tenant_name"] = tenant.get("name") if tenant else "Unbekannt"
    
    # Devices with pending updates
    pending_updates = devices_collection.count_documents({"pending_update": {"$ne": None}})
    
    # Latest version
    latest = versions_collection.find_one(
        {"is_preview": {"$ne": True}},
        sort=[("created_at", -1)]
    )
    
    return {
        "success": True,
        "stats": {
            "total_devices": total_devices,
            "online_devices": online_devices,
            "offline_devices": total_devices - online_devices,
            "pending_updates": pending_updates,
            "latest_version": latest["version"] if latest else None,
            "by_platform": {item["_id"]: item["count"] for item in by_platform},
            "by_version": {item["_id"]: item["count"] for item in by_version},
            "by_tenant": by_tenant
        }
    }


@router.get("/stats/version-matrix")
async def get_version_matrix():
    """Get detailed version distribution by tenant"""
    pipeline = [
        {
            "$group": {
                "_id": {
                    "tenant_id": "$tenant_id",
                    "version": "$version",
                    "platform": "$platform"
                },
                "count": {"$sum": 1},
                "online": {
                    "$sum": {"$cond": [{"$eq": ["$status", "online"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"_id.tenant_id": 1, "_id.version": -1}}
    ]
    
    results = list(devices_collection.aggregate(pipeline))
    
    # Restructure by tenant
    matrix = {}
    for r in results:
        tenant_id = r["_id"]["tenant_id"]
        if tenant_id not in matrix:
            tenant = db.tenants.find_one({"tenant_id": tenant_id})
            matrix[tenant_id] = {
                "tenant_id": tenant_id,
                "tenant_name": tenant.get("name") if tenant else "Unbekannt",
                "versions": {}
            }
        
        version = r["_id"]["version"]
        platform = r["_id"]["platform"]
        
        if version not in matrix[tenant_id]["versions"]:
            matrix[tenant_id]["versions"][version] = {}
        
        matrix[tenant_id]["versions"][version][platform] = {
            "count": r["count"],
            "online": r["online"]
        }
    
    return {
        "success": True,
        "matrix": list(matrix.values())
    }


# =====================================
# FEATURE FLAGS
# =====================================

@router.get("/features")
async def get_features():
    """Get all available features"""
    features = list(features_collection.find({}, {"_id": 0}))
    
    return {
        "success": True,
        "features": features
    }


@router.post("/features")
async def create_feature(feature: Dict[str, Any]):
    """Create a new feature flag"""
    doc = {
        "feature_id": str(uuid.uuid4()),
        "name": feature.get("name"),
        "description": feature.get("description", ""),
        "enabled": feature.get("enabled", False),
        "min_version": feature.get("min_version"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    features_collection.insert_one(doc)
    
    return {
        "success": True,
        "feature": {k: v for k, v in doc.items() if k != "_id"}
    }
