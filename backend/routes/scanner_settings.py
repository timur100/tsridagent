"""
Scanner Settings API
Manages scanner configuration and PIN settings for Regula integration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import hashlib
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.europcar_verification
settings_collection = db.scanner_settings

class PinSettings(BaseModel):
    pin: str
    updated_at: Optional[str] = None

class ScannerSettings(BaseModel):
    pin_hash: Optional[str] = None
    hide_conflict_warning: Optional[bool] = False
    auto_start_reader_demo: Optional[bool] = False
    settings: Optional[Dict[str, Any]] = None

def hash_pin(pin: str) -> str:
    """Hash PIN for secure storage"""
    return hashlib.sha256(pin.encode()).hexdigest()

@router.get("/api/scanner/settings")
async def get_scanner_settings():
    """Get current scanner settings"""
    try:
        settings = await settings_collection.find_one({"_id": "scanner_config"})
        if not settings:
            # Return default settings
            return {
                "pin_configured": False,
                "hide_conflict_warning": False,
                "auto_start_reader_demo": False,
                "settings": {}
            }
        
        return {
            "pin_configured": "pin_hash" in settings and settings["pin_hash"] is not None,
            "hide_conflict_warning": settings.get("hide_conflict_warning", False),
            "auto_start_reader_demo": settings.get("auto_start_reader_demo", False),
            "settings": settings.get("settings", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving settings: {str(e)}")

@router.post("/api/scanner/settings/pin")
async def set_pin(pin_settings: PinSettings):
    """Set or update scanner PIN"""
    try:
        if not pin_settings.pin or len(pin_settings.pin) != 4 or not pin_settings.pin.isdigit():
            raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")
        
        pin_hash = hash_pin(pin_settings.pin)
        
        await settings_collection.update_one(
            {"_id": "scanner_config"},
            {
                "$set": {
                    "pin_hash": pin_hash,
                    "updated_at": datetime.now().isoformat()
                }
            },
            upsert=True
        )
        
        return {"success": True, "message": "PIN updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting PIN: {str(e)}")

@router.post("/api/scanner/settings/verify-pin")
async def verify_pin(pin_settings: PinSettings):
    """Verify entered PIN"""
    try:
        settings = await settings_collection.find_one({"_id": "scanner_config"})
        
        if not settings or "pin_hash" not in settings:
            # Default PIN is 1234
            default_pin_hash = hash_pin("1234")
            return {"valid": hash_pin(pin_settings.pin) == default_pin_hash}
        
        pin_hash = hash_pin(pin_settings.pin)
        return {"valid": pin_hash == settings["pin_hash"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying PIN: {str(e)}")

@router.put("/api/scanner/settings")
async def update_scanner_settings(settings: ScannerSettings):
    """Update scanner settings"""
    try:
        update_data = {}
        
        if settings.hide_conflict_warning is not None:
            update_data["hide_conflict_warning"] = settings.hide_conflict_warning
        
        if settings.auto_start_reader_demo is not None:
            update_data["auto_start_reader_demo"] = settings.auto_start_reader_demo
        
        if settings.settings is not None:
            update_data["settings"] = settings.settings
        
        if settings.pin_hash is not None:
            update_data["pin_hash"] = settings.pin_hash
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        await settings_collection.update_one(
            {"_id": "scanner_config"},
            {"$set": update_data},
            upsert=True
        )
        
        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

@router.get("/api/scanner/status")
async def get_scanner_status():
    """Get scanner connection status"""
    return {
        "connected": False,
        "message": "Scanner status check must be performed from Electron app",
        "note": "This endpoint is for web compatibility only"
    }
