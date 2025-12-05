"""
Tenant Hierarchy List API
Direct MongoDB access for hierarchy visualization
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/tenants-hierarchy", tags=["tenants-hierarchy"])

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

@router.get("/list")
async def list_all_tenants_for_hierarchy():
    """
    Get ALL tenants from MongoDB for hierarchy display
    This bypasses the Auth Service and directly queries tsrid_db
    """
    try:
        tenants = await db.tenants.find(
            {},
            {
                "_id": 0,
                "tenant_id": 1,
                "name": 1,
                "display_name": 1,
                "tenant_level": 1,
                "tenant_type": 1,
                "parent_tenant_id": 1,
                "country_code": 1,
                "allow_cross_location_search": 1,
                "enabled": 1,
                "status": 1,
                "location_code": 1,
                "location_id": 1
            }
        ).to_list(10000)
        
        return {
            "success": True,
            "count": len(tenants),
            "tenants": tenants
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
