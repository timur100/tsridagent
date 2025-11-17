from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/portal/settings", tags=["Portal Settings"])

class GlobalSettings(BaseModel):
    auto_reset_minutes: int = 3
    datenschutz_tage: int = 90
    max_unknown_attempts: int = 3
    max_error_attempts: int = 3
    require_confirmation: bool = True
    upload_enabled: bool = True
    auto_ban_enabled: bool = False
    auto_ban_threshold: int = 3
    auto_ban_duration: str = "permanent"

# In-memory storage
global_settings = {
    "default": GlobalSettings().dict()
}


# Get database connection
def get_db():
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    return client['test_database']

@router.get("")
async def get_portal_settings(token_data: dict = Depends(verify_token)):
    """Get portal feature settings"""
    try:
        db = get_db()
        # Get settings from database
        settings_doc = await db.portal_settings.find_one({"setting_type": "customer_permissions"})
        
        if settings_doc:
            # Ensure boolean values
            allow_device = settings_doc.get("allow_customer_add_device", False)
            allow_location = settings_doc.get("allow_customer_add_location", False)
            
            # Convert to boolean if string
            if isinstance(allow_device, str):
                allow_device = allow_device.lower() == 'true'
            if isinstance(allow_location, str):
                allow_location = allow_location.lower() == 'true'
            
            return {
                "success": True,
                "data": {
                    "allow_customer_add_device": bool(allow_device),
                    "allow_customer_add_location": bool(allow_location)
                }
            }
        else:
            # Return default settings
            return {
                "success": True,
                "data": {
                    "allow_customer_add_device": False,
                    "allow_customer_add_location": False
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("")
async def update_portal_settings(settings: dict, token_data: dict = Depends(verify_token)):
    """Update portal feature settings - Admin only"""
    try:
        # Check if user is admin
        if token_data.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update portal settings")
        
        db = get_db()
        
        # Prepare settings document
        settings_doc = {
            "setting_type": "customer_permissions",
            "allow_customer_add_device": settings.get("allow_customer_add_device", False),
            "allow_customer_add_location": settings.get("allow_customer_add_location", False),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": token_data.get('sub')
        }
        
        # Update or insert settings in database
        await db.portal_settings.update_one(
            {"setting_type": "customer_permissions"},
            {"$set": settings_doc},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Portal settings updated",
            "data": {
                "allow_customer_add_device": settings_doc["allow_customer_add_device"],
                "allow_customer_add_location": settings_doc["allow_customer_add_location"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/global")
async def get_global_settings(token_data: dict = Depends(verify_token)):
    """Get global settings"""
    try:
        return {
            "success": True,
            "settings": global_settings.get("default")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/global")
async def update_global_settings(settings: dict, token_data: dict = Depends(verify_token)):
    """Update global settings (applies to all devices)"""
    try:
        # Check if user is admin
        if token_data.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update global settings")
        
        global_settings["default"].update(settings)
        global_settings["default"]["updated_at"] = datetime.now(timezone.utc).isoformat()
        global_settings["default"]["updated_by"] = token_data.get('sub')
        
        # Add to sync queue to push to all devices
        from routes.sync import add_to_sync_queue, SyncUpdate
        await add_to_sync_queue(SyncUpdate(
            update_id=str(uuid.uuid4()),
            type="settings",
            action="update",
            data=global_settings["default"],
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
        return {
            "success": True,
            "message": "Global settings updated. Changes will sync to all devices.",
            "settings": global_settings["default"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/device/{device_id}")
async def get_device_settings(device_id: str, token_data: dict = Depends(verify_token)):
    """Get settings for a specific device"""
    try:
        # Check if device has custom settings, otherwise return global
        device_settings = global_settings.get(device_id, global_settings["default"])
        
        return {
            "success": True,
            "device_id": device_id,
            "settings": device_settings,
            "is_custom": device_id in global_settings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/device/{device_id}")
async def update_device_settings(device_id: str, settings: dict, token_data: dict = Depends(verify_token)):
    """Update settings for a specific device (overrides global)"""
    try:
        if device_id not in global_settings:
            # Create custom settings based on global
            global_settings[device_id] = global_settings["default"].copy()
        
        global_settings[device_id].update(settings)
        global_settings[device_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
        global_settings[device_id]["updated_by"] = token_data.get('sub')
        
        # Add to sync queue for this specific device
        from routes.sync import add_to_sync_queue, SyncUpdate
        await add_to_sync_queue(SyncUpdate(
            update_id=str(uuid.uuid4()),
            type="settings",
            action="update",
            data={
                "device_id": device_id,
                "settings": global_settings[device_id]
            },
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
        return {
            "success": True,
            "message": f"Settings updated for device {device_id}",
            "settings": global_settings[device_id]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/device/{device_id}")
async def reset_device_settings(device_id: str, token_data: dict = Depends(verify_token)):
    """Reset device to global settings"""
    try:
        if device_id in global_settings and device_id != "default":
            del global_settings[device_id]
            
            # Notify device to sync global settings
            from routes.sync import add_to_sync_queue, SyncUpdate
            await add_to_sync_queue(SyncUpdate(
                update_id=str(uuid.uuid4()),
                type="settings",
                action="reset",
                data={
                    "device_id": device_id,
                    "settings": global_settings["default"]
                },
                timestamp=datetime.now(timezone.utc).isoformat()
            ))
        
        return {
            "success": True,
            "message": f"Device {device_id} reset to global settings"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/push-to-all")
async def push_settings_to_all_devices(settings: dict, token_data: dict = Depends(verify_token)):
    """Push specific settings to all devices"""
    try:
        # Check if user is admin
        if token_data.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can push to all devices")
        
        # Update global settings
        global_settings["default"].update(settings)
        
        # Clear all device-specific settings (force global)
        device_ids = [k for k in global_settings.keys() if k != "default"]
        for device_id in device_ids:
            del global_settings[device_id]
        
        # Add to sync queue for broadcast
        from routes.sync import add_to_sync_queue, SyncUpdate
        await add_to_sync_queue(SyncUpdate(
            update_id=str(uuid.uuid4()),
            type="settings",
            action="push_all",
            data=global_settings["default"],
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
        return {
            "success": True,
            "message": "Settings pushed to all devices",
            "settings": global_settings["default"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
