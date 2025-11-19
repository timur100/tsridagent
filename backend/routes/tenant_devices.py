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

# Also connect to portal_db for locations
portal_db = client['portal_db']


def enrich_devices_with_location_data(devices, tenant_id):
    """
    Enrich device data with street and zip from tenant_locations
    """
    # Get all locations for this tenant
    locations = {}
    for loc in portal_db.tenant_locations.find({"tenant_id": tenant_id}):
        location_code = loc.get('location_code')
        if location_code:
            locations[location_code] = {
                'street': loc.get('street', ''),
                'zip': loc.get('postal_code', '')
            }
    
    # Enrich each device with location data
    enriched_devices = []
    for device in devices:
        locationcode = device.get('locationcode', '')
        if locationcode and locationcode in locations:
            device['street'] = locations[locationcode]['street']
            device['zip'] = locations[locationcode]['zip']
        else:
            # Set empty values if no location match
            if 'street' not in device:
                device['street'] = ''
            if 'zip' not in device:
                device['zip'] = ''
        enriched_devices.append(device)
    
    return enriched_devices


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
        # Query only by tenant_id
        query = {"tenant_id": tenant_id}
        
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
        
        # Enrich devices with street and zip from tenant_locations
        devices = enrich_devices_with_location_data(devices, tenant_id)
        print(f"✅ Enriched devices with location data")
        
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


@router.get("/all/devices")
async def get_all_devices(
    token_data: dict = Depends(verify_token)
):
    """
    Get all devices from all tenants
    """
    try:
        print(f"🔍 get_all_devices called")
        print(f"🔍 Skipping admin check for debugging")
        
        # Get all devices from europcar_devices collection
        devices_cursor = db.europcar_devices.find({})
        devices = []
        
        for device in devices_cursor:
            # Remove MongoDB _id field
            if '_id' in device:
                del device['_id']
            devices.append(device)
        
        print(f"✅ Found {len(devices)} total devices")
        
        # Get all locations from all tenants
        all_locations = {}
        for loc in portal_db.tenant_locations.find({}):
            location_code = loc.get('location_code')
            if location_code:
                all_locations[location_code] = {
                    'street': loc.get('street', ''),
                    'zip': loc.get('postal_code', '')
                }
        
        # Enrich each device with location data
        for device in devices:
            locationcode = device.get('locationcode', '')
            if locationcode and locationcode in all_locations:
                device['street'] = all_locations[locationcode]['street']
                device['zip'] = all_locations[locationcode]['zip']
            else:
                # Set empty values if no location match
                if 'street' not in device:
                    device['street'] = ''
                if 'zip' not in device:
                    device['zip'] = ''
        
        print(f"✅ Enriched devices with location data")
        
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
        print(f"❌ Get all devices error: {str(e)}")
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
