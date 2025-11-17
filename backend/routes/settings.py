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
settings_collection = db['settings_backups']

class SettingsBackup(BaseModel):
    backup_id: str
    device_id: str
    settings: Dict[str, Any]
    created_at: str
    description: Optional[str] = ""

class RestoreRequest(BaseModel):
    backup_id: str

@router.post("/backup")
async def create_backup(backup_data: Dict[str, Any]):
    """Create a backup of current settings"""
    try:
        backup_id = str(uuid.uuid4())
        backup = {
            "backup_id": backup_id,
            "device_id": backup_data.get("device_id", "unknown"),
            "settings": backup_data.get("settings", {}),
            "description": backup_data.get("description", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await settings_collection.insert_one(backup)
        
        return {
            "success": True,
            "backup_id": backup_id,
            "message": "Einstellungen erfolgreich gesichert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backup/history")
async def get_backup_history(device_id: Optional[str] = None):
    """Get backup history for a device or all devices"""
    try:
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        backups = await settings_collection.find(query).sort("created_at", -1).to_list(length=50)
        
        # Remove MongoDB _id from results
        for backup in backups:
            backup.pop('_id', None)
        
        return {
            "success": True,
            "backups": backups
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backup/{backup_id}")
async def get_backup(backup_id: str):
    """Get specific backup by ID"""
    try:
        backup = await settings_collection.find_one({"backup_id": backup_id})
        
        if not backup:
            raise HTTPException(status_code=404, detail="Backup nicht gefunden")
        
        backup.pop('_id', None)
        
        return {
            "success": True,
            "backup": backup
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restore")
async def restore_backup(request: RestoreRequest):
    """Restore settings from a backup"""
    try:
        backup = await settings_collection.find_one({"backup_id": request.backup_id})
        
        if not backup:
            raise HTTPException(status_code=404, detail="Backup nicht gefunden")
        
        return {
            "success": True,
            "settings": backup.get("settings", {}),
            "message": "Einstellungen erfolgreich wiederhergestellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/backup/{backup_id}")
async def delete_backup(backup_id: str):
    """Delete a backup"""
    try:
        result = await settings_collection.delete_one({"backup_id": backup_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Backup nicht gefunden")
        
        return {
            "success": True,
            "message": "Backup erfolgreich gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/default")
async def get_default_settings():
    """Get default settings"""
    default_settings = {
        "deviceId": "DEVICE-01",
        "stationName": "Station 1",
        "street": "",
        "city": "",
        "country": "Germany",
        "phone": "",
        "email": "",
        "location": "",
        "scannerBrightness": 80,
        "scannerResolution": "600",
        "networkMode": "DHCP",
        "ipAddress": "",
        "tvid": "",
        "snStation": "",
        "snScanner": "",
        "autoResetMinutes": 5,
        "datenschutzTage": 30,
        "maxUnknownAttempts": 3,
        "maxErrorAttempts": 5,
        "requireConfirmation": True,
        "unknownDocumentMessage": "Dokument unbekannt. Es wird zur Überprüfung der Datenbank an die IT gesendet.",
        "errorDocumentMessage": "Dokument fehlerhaft oder hat Auffälligkeiten. Es wird zur weiteren Überprüfung an die Security versendet.",
        "autoBanEnabled": True,
        "autoBanThreshold": 3,
        "autoBanDuration": "permanent",
        "autoBanEmailNotifications": True,
        "autoBanSmsNotifications": False,
        "simulationMode": False,
        "simulationStationId": "",
        "simulationStationName": "",
        "simulationDeviceNumber": "",
        "uploadEnabled": True
    }
    
    return {
        "success": True,
        "settings": default_settings
    }
