from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/portal/devices", tags=["Portal Devices"])

class Device(BaseModel):
    device_id: str
    location_id: str
    location_name: str
    station_name: str
    status: str = "offline"  # online, offline, error
    last_seen: Optional[str] = None
    ip_address: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    scanner_type: Optional[str] = None
    settings: Optional[dict] = None

# In-memory storage (replace with MongoDB)
devices_db = {}

@router.get("/list")
async def list_devices(token_data: dict = Depends(verify_token)):
    """Get all registered devices"""
    try:
        devices_list = list(devices_db.values())
        return {
            "success": True,
            "devices": devices_list,
            "total": len(devices_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{device_id}")
async def get_device(device_id: str, token_data: dict = Depends(verify_token)):
    """Get device by ID"""
    try:
        device = devices_db.get(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {
            "success": True,
            "device": device
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register_device(device: Device, token_data: dict = Depends(verify_token)):
    """Register a new device"""
    try:
        # Check if device already exists
        if device.device_id in devices_db:
            raise HTTPException(status_code=400, detail="Device already registered")
        
        device_dict = device.dict()
        device_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        device_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        devices_db[device.device_id] = device_dict
        
        return {
            "success": True,
            "message": "Device registered successfully",
            "device": device_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{device_id}")
async def update_device(device_id: str, device_update: dict, token_data: dict = Depends(verify_token)):
    """Update device information"""
    try:
        if device_id not in devices_db:
            raise HTTPException(status_code=404, detail="Device not found")
        
        device = devices_db[device_id]
        device.update(device_update)
        device['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        devices_db[device_id] = device
        
        return {
            "success": True,
            "message": "Device updated successfully",
            "device": device
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{device_id}")
async def delete_device(device_id: str, token_data: dict = Depends(verify_token)):
    """Delete a device"""
    try:
        if device_id not in devices_db:
            raise HTTPException(status_code=404, detail="Device not found")
        
        del devices_db[device_id]
        
        return {
            "success": True,
            "message": "Device deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/location/{location_id}")
async def get_devices_by_location(location_id: str, token_data: dict = Depends(verify_token)):
    """Get all devices for a specific location"""
    try:
        location_devices = [
            device for device in devices_db.values()
            if device.get('location_id') == location_id
        ]
        
        return {
            "success": True,
            "devices": location_devices,
            "total": len(location_devices)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
