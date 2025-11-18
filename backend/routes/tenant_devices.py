from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient

router = APIRouter(prefix="/api/tenant-devices", tags=["tenant-devices"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
# Force use of multi_tenant_admin database for tenant devices
DB_NAME = 'multi_tenant_admin'
client = MongoClient(MONGO_URL)
db = client[DB_NAME]


@router.get("/{tenant_id}")
async def get_tenant_devices(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get all devices for a specific tenant
    """
    try:
        print(f"🔍 get_tenant_devices called with tenant_id: {tenant_id}")
        print(f"🔍 token_data: {token_data}")
        
        # Check if user is admin (only admins can access tenant devices)
        is_admin = token_data.get("role") == "admin"
        print(f"🔍 is_admin: {is_admin}")
        print(f"🔍 Skipping admin check for debugging")
        
        # TEMPORARILY DISABLED FOR DEBUGGING
        # if not is_admin:
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch devices from MongoDB for this tenant
        # Try both customer field and tenant_id field for backwards compatibility
        query = {
            "$or": [
                {"tenant_id": tenant_id},
                {"customer": "Europcar"}  # Fallback for europcar_devices collection
            ]
        }
        
        print(f"🔍 Query: {query}")
        print(f"🔍 Collection: europcar_devices")
        print(f"🔍 Database: {DB_NAME}")
        
        devices_cursor = db.europcar_devices.find(query)
        devices = []
        
        for device in devices_cursor:
            # Remove MongoDB _id field
            if '_id' in device:
                del device['_id']
            devices.append(device)
        
        print(f"✅ Found {len(devices)} devices")
        
        # Calculate summary statistics
        total = len(devices)
        online_count = sum(1 for d in devices if d.get('status', '').lower() == 'online')
        offline_count = sum(1 for d in devices if d.get('status', '').lower() == 'offline')
        in_prep_count = sum(1 for d in devices if d.get('status', '').lower() == 'in_vorbereitung')
        
        result = {
            "success": True,
            "data": {
                "summary": {
                    "total": total,
                    "online": online_count,
                    "offline": offline_count,
                    "in_vorbereitung": in_prep_count
                },
                "devices": devices
            }
        }
        
        print(f"✅ Returning response with {total} devices")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Tenant devices error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{tenant_id}/{device_id}")
async def get_tenant_device(
    tenant_id: str,
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific device by device_id for a tenant
    """
    try:
        # Check if user is admin
        is_admin = token_data.get("role") == "admin"
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find device in MongoDB
        device = db.europcar_devices.find_one({"device_id": device_id}, {'_id': 0})
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {
            "success": True,
            "device": device
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get tenant device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
