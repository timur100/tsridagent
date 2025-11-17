from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/electron", tags=["Electron Integration"])

class DeviceRegistration(BaseModel):
    device_id: str
    location_id: Optional[str] = None
    hostname: str
    os_version: str
    app_version: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None

class StatusUpdate(BaseModel):
    device_id: str
    status: str  # online, offline, error, busy
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    last_scan_time: Optional[str] = None
    error_message: Optional[str] = None

class SyncRequest(BaseModel):
    device_id: str
    last_sync: Optional[str] = None
    current_version: Optional[str] = None

# Storage
electron_devices = {}
device_status = {}

@router.post("/register")
async def register_electron_device(registration: DeviceRegistration):
    """Register an Electron app device"""
    try:
        device_id = registration.device_id
        
        # Check if device exists
        if device_id in electron_devices:
            # Update existing device
            electron_devices[device_id].update(registration.dict())
            electron_devices[device_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
            message = "Device re-registered"
        else:
            # New device
            device_dict = registration.dict()
            device_dict['registered_at'] = datetime.now(timezone.utc).isoformat()
            device_dict['last_seen'] = datetime.now(timezone.utc).isoformat()
            device_dict['sync_token'] = str(uuid.uuid4())
            electron_devices[device_id] = device_dict
            message = "Device registered successfully"
        
        # Also update in portal devices
        from routes.portal_devices import devices_db
        if device_id not in devices_db:
            devices_db[device_id] = {
                'device_id': device_id,
                'location_id': registration.location_id or 'unassigned',
                'location_name': 'Unassigned',
                'station_name': registration.hostname,
                'status': 'online',
                'last_seen': datetime.now(timezone.utc).isoformat(),
                'ip_address': registration.ip_address,
                'os_version': registration.os_version,
                'app_version': registration.app_version,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "success": True,
            "message": message,
            "device_id": device_id,
            "sync_token": electron_devices[device_id]['sync_token'],
            "sync_mode": "polling",  # Will be updated from sync settings
            "poll_interval": 30  # seconds
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/status")
async def update_device_status(status: StatusUpdate):
    """Update device status (heartbeat)"""
    try:
        device_id = status.device_id
        
        if device_id not in electron_devices:
            raise HTTPException(status_code=404, detail="Device not registered")
        
        # Update status
        status_dict = status.dict()
        status_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
        device_status[device_id] = status_dict
        
        # Update last_seen
        electron_devices[device_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
        
        # Update in portal devices
        from routes.portal_devices import devices_db
        if device_id in devices_db:
            devices_db[device_id]['status'] = status.status
            devices_db[device_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
        
        return {
            "success": True,
            "message": "Status updated"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_device_data(sync_request: SyncRequest):
    """Get updates for Electron device"""
    try:
        device_id = sync_request.device_id
        
        if device_id not in electron_devices:
            raise HTTPException(status_code=404, detail="Device not registered. Please register first.")
        
        # Get pending updates from sync queue
        from routes.sync import sync_queue, sync_mode
        
        # Filter updates for this device or global updates
        last_sync = sync_request.last_sync or "1970-01-01T00:00:00+00:00"
        
        relevant_updates = [
            update for update in sync_queue
            if update['timestamp'] > last_sync
        ]
        
        # Get current settings for this device
        from routes.portal_settings import global_settings
        device_settings = global_settings.get(device_id, global_settings.get("default"))
        
        # Get location info if assigned
        location_info = None
        device_data = electron_devices[device_id]
        if device_data.get('location_id'):
            from routes.portal_locations import locations_db
            location_info = locations_db.get(device_data['location_id'])
        
        # Get banned documents
        from routes.banned_documents import banned_docs_db
        banned_documents = list(banned_docs_db.values())
        
        return {
            "success": True,
            "device_id": device_id,
            "sync_mode": sync_mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "updates": relevant_updates,
            "settings": device_settings,
            "location": location_info,
            "banned_documents": banned_documents,
            "has_updates": len(relevant_updates) > 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config/{device_id}")
async def get_device_config(device_id: str):
    """Get complete configuration for Electron device"""
    try:
        if device_id not in electron_devices:
            raise HTTPException(status_code=404, detail="Device not registered")
        
        # Get all configuration data
        from routes.portal_settings import global_settings
        from routes.portal_locations import locations_db
        from routes.banned_documents import banned_docs_db
        
        device_data = electron_devices[device_id]
        device_settings = global_settings.get(device_id, global_settings.get("default"))
        
        location_info = None
        if device_data.get('location_id'):
            location_info = locations_db.get(device_data['location_id'])
        
        return {
            "success": True,
            "device_id": device_id,
            "device": device_data,
            "settings": device_settings,
            "location": location_info,
            "banned_documents": list(banned_docs_db.values()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/heartbeat/{device_id}")
async def device_heartbeat(device_id: str):
    """Simple heartbeat to keep device online"""
    try:
        if device_id not in electron_devices:
            raise HTTPException(status_code=404, detail="Device not registered")
        
        electron_devices[device_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
        
        # Update in portal devices
        from routes.portal_devices import devices_db
        if device_id in devices_db:
            devices_db[device_id]['status'] = 'online'
            devices_db[device_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices")
async def list_electron_devices():
    """List all registered Electron devices"""
    try:
        devices_list = list(electron_devices.values())
        
        # Add current status
        for device in devices_list:
            device_id = device['device_id']
            if device_id in device_status:
                device['current_status'] = device_status[device_id]
        
        return {
            "success": True,
            "devices": devices_list,
            "total": len(devices_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{device_id}")
async def unregister_device(device_id: str):
    """Unregister Electron device"""
    try:
        if device_id not in electron_devices:
            raise HTTPException(status_code=404, detail="Device not registered")
        
        del electron_devices[device_id]
        
        if device_id in device_status:
            del device_status[device_id]
        
        return {
            "success": True,
            "message": "Device unregistered"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
