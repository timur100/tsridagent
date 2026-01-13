from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/portal/devices", tags=["Portal Devices"])

# Use connection pool
from db.connection import get_multi_tenant_db

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

@router.get("/list")
async def list_devices(token_data: dict = Depends(verify_token)):
    """Get all registered devices from MongoDB - OPTIMIZED"""
    try:
        db = get_multi_tenant_db()
        # Use europcar_devices as the primary source (most complete data)
        devices_list = list(db.europcar_devices.find({}, {"_id": 0}).limit(1000))
        
        return {
            "success": True,
            "devices": devices_list,
            "total": len(devices_list)
        }
    except Exception as e:
        print(f"Error listing devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{device_id}")
async def get_device(device_id: str, token_data: dict = Depends(verify_token)):
    """Get device by ID"""
    try:
        # Try devices collection first
        device = db.devices.find_one({"device_id": device_id}, {"_id": 0})
        
        # Try europcar_devices if not found
        if not device:
            device = db.europcar_devices.find_one({"device_id": device_id}, {"_id": 0})
        
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
        existing = db.devices.find_one({"device_id": device.device_id})
        if existing:
            raise HTTPException(status_code=400, detail="Device already registered")
        
        device_dict = device.dict()
        device_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        device_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        db.devices.insert_one(device_dict)
        
        # Remove _id from response
        device_dict.pop('_id', None)
        
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
        existing = db.devices.find_one({"device_id": device_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Device not found")
        
        device_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        db.devices.update_one(
            {"device_id": device_id},
            {"$set": device_update}
        )
        
        updated = db.devices.find_one({"device_id": device_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Device updated successfully",
            "device": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{device_id}")
async def delete_device(device_id: str, token_data: dict = Depends(verify_token)):
    """Delete a device"""
    try:
        result = db.devices.delete_one({"device_id": device_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
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
        # Use europcar_devices as primary source
        location_devices = list(db.europcar_devices.find(
            {"location_id": location_id}, 
            {"_id": 0}
        ))
        
        return {
            "success": True,
            "devices": location_devices,
            "total": len(location_devices)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
