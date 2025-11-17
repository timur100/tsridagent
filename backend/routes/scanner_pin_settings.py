from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scanner-pin", tags=["scanner-pin"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class ScannerPinSettings(BaseModel):
    """Scanner PIN settings model"""
    enabled: bool = False
    pin: str = "1234"


class ScannerPinCheck(BaseModel):
    """PIN check request"""
    pin: str


@router.get("/settings", response_model=ScannerPinSettings)
async def get_scanner_pin_settings():
    """Get scanner PIN settings"""
    try:
        settings = await db.scanner_pin_settings.find_one({}, {"_id": 0})
        
        if not settings:
            # Return default settings
            return ScannerPinSettings(enabled=False, pin="1234")
        
        return ScannerPinSettings(**settings)
        
    except Exception as e:
        logger.error(f"Error fetching scanner PIN settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings", response_model=ScannerPinSettings)
async def update_scanner_pin_settings(settings: ScannerPinSettings):
    """Update scanner PIN settings"""
    try:
        # Validate PIN (4 digits)
        if len(settings.pin) != 4 or not settings.pin.isdigit():
            raise HTTPException(status_code=400, detail="PIN muss 4 Ziffern sein")
        
        # Delete existing settings
        await db.scanner_pin_settings.delete_many({})
        
        # Insert new settings
        doc = settings.model_dump()
        await db.scanner_pin_settings.insert_one(doc)
        
        logger.info(f"Scanner PIN settings updated: enabled={settings.enabled}")
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scanner PIN settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check")
async def check_scanner_pin(check: ScannerPinCheck):
    """Check if provided PIN is correct"""
    try:
        settings = await db.scanner_pin_settings.find_one({}, {"_id": 0})
        
        if not settings:
            # No settings = disabled = always allow
            return {"valid": True}
        
        # If disabled, always allow
        if not settings.get("enabled", False):
            return {"valid": True}
        
        # Check PIN
        correct_pin = settings.get("pin", "1234")
        is_valid = check.pin == correct_pin
        
        return {"valid": is_valid}
        
    except Exception as e:
        logger.error(f"Error checking PIN: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/enabled")
async def is_pin_enabled():
    """Check if PIN protection is enabled"""
    try:
        settings = await db.scanner_pin_settings.find_one({}, {"_id": 0})
        
        if not settings:
            return {"enabled": False}
        
        return {"enabled": settings.get("enabled", False)}
        
    except Exception as e:
        logger.error(f"Error checking PIN status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
