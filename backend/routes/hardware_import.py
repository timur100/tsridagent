"""
Hardware Import from existing Tenant Devices and Locations
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

from routes.portal_auth import verify_token
from models.hardware import HardwareDevice, HardwareSet

router = APIRouter(prefix="/api/hardware/import", tags=["Hardware Import"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)

# Connect to multiple databases
main_db = client['main_db']
portal_db = client['portal_db']
multi_tenant_db = client['multi_tenant_admin']


@router.post("/tenant/{tenant_id}/from-existing")
async def import_from_existing_data(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Import hardware from existing tenant devices and locations
    Creates hardware devices and sets based on existing data
    """
    try:
        imported_devices = []
        imported_sets = []
        
        # TODO: Query existing tenant devices from device management system
        # This will be implemented based on the actual API endpoints
        
        print(f"[Hardware Import] Starting import for tenant {tenant_id}")
        
        # For now, return sample structure
        return {
            "success": True,
            "message": "Import vorbereitet",
            "imported_devices": len(imported_devices),
            "imported_sets": len(imported_sets),
            "details": {
                "devices": imported_devices,
                "sets": imported_sets
            }
        }
        
    except Exception as e:
        print(f"[Hardware Import] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenant/{tenant_id}/preview")
async def preview_import_data(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Preview data that will be imported
    Shows existing devices and locations without actually importing
    """
    try:
        print(f"[Hardware Import] Preview for tenant {tenant_id}")
        
        # TODO: Query and return preview of existing data
        
        return {
            "success": True,
            "message": "Preview erstellt",
            "preview": {
                "devices_found": 0,
                "locations_found": 0,
                "devices": [],
                "locations": []
            }
        }
        
    except Exception as e:
        print(f"[Hardware Import] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
