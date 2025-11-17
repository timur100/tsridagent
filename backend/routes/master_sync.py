from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['test_database']
master_config_collection = db['master_config']
device_registry_collection = db['device_registry']
sync_history_collection = db['sync_history']
global_settings_collection = db['global_settings']

class MasterConfig(BaseModel):
    master_device_id: str
    auto_sync_enabled: bool = False
    sync_interval_minutes: int = 5

class DeviceInfo(BaseModel):
    device_id: str
    device_name: str
    location: Optional[str] = ""

class SyncPush(BaseModel):
    settings: Dict[str, Any]
    description: Optional[str] = ""

class AutoSyncConfig(BaseModel):
    enabled: bool
    interval_minutes: int = 5

@router.post("/set-master")
async def set_master_device(config: MasterConfig):
    """Set a device as the master device"""
    try:
        # Check if master already exists
        existing = await master_config_collection.find_one({})
        
        master_data = {
            "master_device_id": config.master_device_id,
            "auto_sync_enabled": config.auto_sync_enabled,
            "sync_interval_minutes": config.sync_interval_minutes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await master_config_collection.update_one(
                {},
                {"$set": master_data}
            )
        else:
            master_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await master_config_collection.insert_one(master_data)
        
        return {
            "success": True,
            "message": f"Gerät {config.master_device_id} als Master festgelegt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/master")
async def get_master_device():
    """Get current master device configuration"""
    try:
        master = await master_config_collection.find_one({})
        
        if not master:
            return {
                "success": True,
                "has_master": False,
                "message": "Kein Master-Gerät konfiguriert"
            }
        
        master.pop('_id', None)
        
        return {
            "success": True,
            "has_master": True,
            "master": master
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register-device")
async def register_device(device: DeviceInfo):
    """Register a device in the system"""
    try:
        device_data = {
            "device_id": device.device_id,
            "device_name": device.device_name,
            "location": device.location,
            "last_sync": None,
            "sync_status": "never_synced",
            "registered_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if device already registered
        existing = await device_registry_collection.find_one({"device_id": device.device_id})
        
        if existing:
            await device_registry_collection.update_one(
                {"device_id": device.device_id},
                {"$set": {
                    "device_name": device.device_name,
                    "location": device.location
                }}
            )
        else:
            await device_registry_collection.insert_one(device_data)
        
        return {
            "success": True,
            "message": "Gerät registriert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices")
async def get_all_devices():
    """Get list of all registered devices with sync status"""
    try:
        devices = await device_registry_collection.find().to_list(length=1000)
        
        # Remove MongoDB _id
        for device in devices:
            device.pop('_id', None)
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/push")
async def push_settings_to_devices(push: SyncPush):
    """Push settings from master to all devices"""
    try:
        # Check if master is configured
        master = await master_config_collection.find_one({})
        if not master:
            raise HTTPException(status_code=400, detail="Kein Master-Gerät konfiguriert")
        
        # Get all devices
        devices = await device_registry_collection.find().to_list(length=1000)
        
        # Store settings in global_settings collection
        global_settings = {
            "settings_id": str(uuid.uuid4()),
            "settings": push.settings,
            "pushed_by": master["master_device_id"],
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "description": push.description
        }
        await global_settings_collection.insert_one(global_settings)
        
        # Update device sync status
        success_count = 0
        failed_count = 0
        target_devices = []
        
        for device in devices:
            try:
                # Update last_sync timestamp for all devices
                await device_registry_collection.update_one(
                    {"device_id": device["device_id"]},
                    {"$set": {
                        "last_sync": datetime.now(timezone.utc).isoformat(),
                        "sync_status": "synced",
                        "last_settings_id": global_settings["settings_id"]
                    }}
                )
                success_count += 1
                target_devices.append(device["device_id"])
            except Exception as e:
                failed_count += 1
                await device_registry_collection.update_one(
                    {"device_id": device["device_id"]},
                    {"$set": {
                        "sync_status": "failed",
                        "last_error": str(e)
                    }}
                )
        
        # Log sync history
        history_entry = {
            "sync_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "master_device_id": master["master_device_id"],
            "target_devices": target_devices,
            "settings_id": global_settings["settings_id"],
            "success_count": success_count,
            "failed_count": failed_count,
            "description": push.description
        }
        await sync_history_collection.insert_one(history_entry)
        
        return {
            "success": True,
            "message": f"Einstellungen an {success_count} Geräte übertragen",
            "settings_id": global_settings["settings_id"],
            "success_count": success_count,
            "failed_count": failed_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{device_id}")
async def get_device_sync_status(device_id: str):
    """Get sync status for a specific device"""
    try:
        device = await device_registry_collection.find_one({"device_id": device_id})
        
        if not device:
            return {
                "success": True,
                "found": False,
                "message": "Gerät nicht registriert"
            }
        
        device.pop('_id', None)
        
        return {
            "success": True,
            "found": True,
            "device": device
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_sync_history(limit: int = 50):
    """Get sync history"""
    try:
        history = await sync_history_collection.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
        
        # Remove MongoDB _id
        for entry in history:
            entry.pop('_id', None)
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-sync")
async def configure_auto_sync(config: AutoSyncConfig):
    """Configure automatic synchronization"""
    try:
        master = await master_config_collection.find_one({})
        
        if not master:
            raise HTTPException(status_code=400, detail="Kein Master-Gerät konfiguriert")
        
        await master_config_collection.update_one(
            {},
            {"$set": {
                "auto_sync_enabled": config.enabled,
                "sync_interval_minutes": config.interval_minutes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"Automatische Synchronisation {'aktiviert' if config.enabled else 'deaktiviert'}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pull/{device_id}")
async def pull_latest_settings(device_id: str):
    """Pull latest settings for a device"""
    try:
        # Get latest global settings
        latest = await global_settings_collection.find_one(
            sort=[("pushed_at", -1)]
        )
        
        if not latest:
            return {
                "success": True,
                "has_settings": False,
                "message": "Keine globalen Einstellungen verfügbar"
            }
        
        latest.pop('_id', None)
        
        # Update device sync status
        await device_registry_collection.update_one(
            {"device_id": device_id},
            {"$set": {
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "sync_status": "synced",
                "last_settings_id": latest["settings_id"]
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "has_settings": True,
            "settings": latest["settings"],
            "settings_id": latest["settings_id"],
            "pushed_at": latest["pushed_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
