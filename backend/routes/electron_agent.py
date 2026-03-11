"""
Electron Agent Management API

Manages Electron app versions, updates, and device tracking.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pymongo import MongoClient
from pathlib import Path
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


# =====================================
# BUILD & DOWNLOAD MANAGEMENT
# =====================================

# Collection for builds
builds_collection = electron_db['builds']

class BuildCreate(BaseModel):
    version: str
    platform: str  # win, mac, linux
    artifact_url: str
    artifact_size: int = 0
    sha256: Optional[str] = None
    release_notes: str = ""
    is_stable: bool = True

class BuildNotify(BaseModel):
    version: str
    release_url: str
    artifacts: Dict[str, str]


@router.get("/builds")
async def get_builds(
    platform: Optional[str] = None,
    version: Optional[str] = None,
    limit: int = 20
):
    """Get available builds"""
    query = {}
    if platform and platform != 'all':
        query["platform"] = platform
    if version:
        query["version"] = version
    
    builds = list(builds_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit))
    
    return {
        "success": True,
        "builds": builds,
        "count": len(builds)
    }


@router.get("/builds/latest")
async def get_latest_builds():
    """Get latest build for each platform"""
    platforms = ["win", "mac", "linux"]
    latest = {}
    
    for platform in platforms:
        build = builds_collection.find_one(
            {"platform": platform, "is_stable": True},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        if build:
            latest[platform] = build
    
    return {
        "success": True,
        "builds": latest
    }


@router.get("/download/{platform}")
async def get_download_link(platform: str):
    """Get download link for a specific platform"""
    valid_platforms = {
        "win": ["win", "windows", "win32"],
        "mac": ["mac", "macos", "darwin"],
        "linux": ["linux"]
    }
    
    # Normalize platform
    normalized = None
    for key, aliases in valid_platforms.items():
        if platform.lower() in aliases:
            normalized = key
            break
    
    if not normalized:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    # Get latest stable build
    build = builds_collection.find_one(
        {"platform": normalized, "is_stable": True},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not build:
        # Return placeholder if no build exists yet
        return {
            "success": True,
            "available": False,
            "message": "Build nicht verfügbar. Build Pipeline muss eingerichtet werden.",
            "platform": normalized,
            "setup_instructions": {
                "step1": "GitHub Repository mit electron-agent/ Code erstellen",
                "step2": "GitHub Actions Workflow (.github/workflows/build.yml) pushen",
                "step3": "Tag erstellen (z.B. v1.0.0) um Build zu starten",
                "step4": "Build wird automatisch hier verfügbar sein"
            }
        }
    
    # Increment download counter
    builds_collection.update_one(
        {"build_id": build["build_id"]},
        {"$inc": {"download_count": 1}}
    )
    
    return {
        "success": True,
        "available": True,
        "platform": normalized,
        "version": build["version"],
        "download_url": build["artifact_url"],
        "file_size": build.get("artifact_size", 0),
        "sha256": build.get("sha256"),
        "release_notes": build.get("release_notes", ""),
        "created_at": build.get("created_at")
    }


@router.post("/builds")
async def create_build(build: BuildCreate):
    """Register a new build (called by CI/CD)"""
    doc = {
        "build_id": str(uuid.uuid4()),
        "version": build.version,
        "platform": build.platform,
        "artifact_url": build.artifact_url,
        "artifact_size": build.artifact_size,
        "sha256": build.sha256,
        "release_notes": build.release_notes,
        "is_stable": build.is_stable,
        "download_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "ci-pipeline"
    }
    
    builds_collection.insert_one(doc)
    
    logger.info(f"New build registered: {build.version} for {build.platform}")
    
    return {
        "success": True,
        "build": {k: v for k, v in doc.items() if k != "_id"}
    }


@router.post("/builds/notify")
async def notify_build_complete(notification: BuildNotify):
    """Receive notification from GitHub Actions when build completes"""
    created_builds = []
    
    for platform, filename in notification.artifacts.items():
        doc = {
            "build_id": str(uuid.uuid4()),
            "version": notification.version.lstrip('v'),
            "platform": platform,
            "artifact_url": f"{notification.release_url.replace('/tag/', '/download/')}/{filename}",
            "artifact_filename": filename,
            "release_url": notification.release_url,
            "is_stable": True,
            "download_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "github-actions"
        }
        
        builds_collection.insert_one(doc)
        created_builds.append({k: v for k, v in doc.items() if k != "_id"})
    
    # Also create a version entry if it doesn't exist
    version_num = notification.version.lstrip('v')
    existing = versions_collection.find_one({"version": version_num})
    if not existing:
        versions_collection.insert_one({
            "version_id": str(uuid.uuid4()),
            "version": version_num,
            "platform": "all",
            "release_notes": f"Auto-created from GitHub release {notification.version}",
            "is_mandatory": False,
            "is_preview": False,
            "download_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "github-actions"
        })
    
    logger.info(f"Build notification received for {notification.version}: {len(created_builds)} artifacts")
    
    return {
        "success": True,
        "builds": created_builds,
        "version": version_num
    }


@router.delete("/builds/{build_id}")
async def delete_build(build_id: str):
    """Delete a build"""
    result = builds_collection.delete_one({"build_id": build_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Build not found")
    
    return {
        "success": True,
        "message": "Build deleted"
    }


# Manual build registration for testing
@router.post("/builds/manual")
async def register_manual_build(
    version: str,
    platform: str,
    download_url: str,
    release_notes: str = ""
):
    """Manually register a build for testing purposes"""
    doc = {
        "build_id": str(uuid.uuid4()),
        "version": version,
        "platform": platform,
        "artifact_url": download_url,
        "release_notes": release_notes,
        "is_stable": True,
        "download_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "manual"
    }
    
    builds_collection.insert_one(doc)
    
    return {
        "success": True,
        "build": {k: v for k, v in doc.items() if k != "_id"}
    }


# =====================================
# DIRECT FILE DOWNLOAD ENDPOINT
# =====================================

@router.get("/file/{platform}")
async def download_file(platform: str):
    """Serve download file with proper headers to force download"""
    
    # Map platform to filename - use application/octet-stream to force download
    file_map = {
        "win": "TSRID.Agent.Setup.exe",
        "windows": "TSRID.Agent.Setup.exe",
        "mac": "TSRID.Agent.dmg",
        "macos": "TSRID.Agent.dmg",
        "linux": "TSRID.Agent.AppImage",
    }
    
    platform_lower = platform.lower()
    if platform_lower not in file_map:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    filename = file_map[platform_lower]
    
    # Path to the file - use latest version
    file_path = Path("/app/frontend/public/downloads/v1.0.3") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    
    # Use application/octet-stream to force browser to download instead of display
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Content-Type-Options": "nosniff"
        }
    )


from fastapi.responses import HTMLResponse

@router.get("/download-page/{platform}")
async def download_page(platform: str):
    """HTML page that auto-starts download - bypasses iframe sandbox"""
    
    file_map = {
        "win": ("TSRID.Agent.Setup.exe", "Windows"),
        "windows": ("TSRID.Agent.Setup.exe", "Windows"),
        "mac": ("TSRID.Agent.dmg", "macOS"),
        "macos": ("TSRID.Agent.dmg", "macOS"),
        "linux": ("TSRID.Agent.AppImage", "Linux"),
    }
    
    platform_lower = platform.lower()
    if platform_lower not in file_map:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    filename, platform_name = file_map[platform_lower]
    download_url = f"/api/electron-agent/file/{platform_lower}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TSRID Agent Download - {platform_name}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{
                text-align: center;
                padding: 40px;
                background: rgba(0,0,0,0.5);
                border-radius: 16px;
                border: 1px solid #333;
            }}
            h1 {{
                color: #d50c2d;
                margin-bottom: 20px;
            }}
            .filename {{
                font-family: monospace;
                background: #333;
                padding: 10px 20px;
                border-radius: 8px;
                margin: 20px 0;
                display: inline-block;
            }}
            .spinner {{
                width: 50px;
                height: 50px;
                border: 4px solid #333;
                border-top-color: #d50c2d;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                to {{ transform: rotate(360deg); }}
            }}
            .manual-link {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #333;
            }}
            a {{
                color: #4ade80;
                text-decoration: none;
            }}
            a:hover {{
                text-decoration: underline;
            }}
            .success {{
                color: #4ade80;
                font-size: 24px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>TSRID Agent Download</h1>
            <p>Plattform: <strong>{platform_name}</strong></p>
            <div class="filename">{filename}</div>
            <div class="spinner" id="spinner"></div>
            <p id="status">Download wird gestartet...</p>
            <div class="manual-link">
                <p>Falls der Download nicht automatisch startet:</p>
                <a href="{download_url}" download="{filename}" id="download-link">
                    Hier klicken zum manuellen Download
                </a>
            </div>
        </div>
        <script>
            // Auto-start download after page loads
            window.onload = function() {{
                setTimeout(function() {{
                    // Create invisible link and click it
                    var link = document.createElement('a');
                    link.href = '{download_url}';
                    link.download = '{filename}';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Update UI
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('status').innerHTML = '<span class="success">✓</span> Download gestartet!<br><small>Sie können dieses Fenster schließen.</small>';
                }}, 500);
            }};
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)
