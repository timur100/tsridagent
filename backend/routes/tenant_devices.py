from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient
from decorators.broadcast_decorator import broadcast_changes
from services.event_service import EventType

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
    print(f"🔍 enrich_devices_with_location_data called with {len(devices)} devices, tenant_id: {tenant_id}")
    
    # Get all locations for this tenant
    locations = {}
    for loc in portal_db.tenant_locations.find({"tenant_id": tenant_id}):
        location_code = loc.get('location_code')
        if location_code:
            locations[location_code] = {
                'street': loc.get('street', ''),
                'zip': loc.get('postal_code', '')
            }
    
    print(f"🔍 Found {len(locations)} locations in database")
    
    # Enrich each device with location data
    enriched_devices = []
    matched_count = 0
    for device in devices:
        locationcode = device.get('locationcode', '')
        if locationcode and locationcode in locations:
            device['street'] = locations[locationcode]['street']
            device['zip'] = locations[locationcode]['zip']
            matched_count += 1
        else:
            # Set empty values if no location match
            if 'street' not in device:
                device['street'] = ''
            if 'zip' not in device:
                device['zip'] = ''
        enriched_devices.append(device)
    
    print(f"🔍 Enriched {matched_count} devices with location data")
    if len(enriched_devices) > 0:
        first_device = enriched_devices[0]
        print(f"🔍 Sample device: {first_device.get('device_id')} - street: {first_device.get('street', 'NOT SET')}, zip: {first_device.get('zip', 'NOT SET')}")
    
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


@router.get("/device/{device_id}")
async def get_device_details(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get detailed information for a single device
    """
    try:
        print(f"🔍 get_device_details called with device_id: {device_id}")
        
        # Find device in europcar_devices
        device = db.europcar_devices.find_one({"device_id": device_id})
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Remove MongoDB _id field
        if '_id' in device:
            del device['_id']
        
        return {
            "success": True,
            "device": device
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/device/{device_id}")
async def update_device(
    device_id: str,
    device_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Update device information
    """
    try:
        print(f"🔍 update_device called with device_id: {device_id}")
        print(f"🔍 device_data: {device_data}")
        
        # Check if device exists
        existing_device = db.europcar_devices.find_one({"device_id": device_id})
        if not existing_device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        tenant_id = existing_device.get('tenant_id')
        
        # Update device
        from datetime import datetime, timezone
        device_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Check if device_id is being changed
        new_device_id = device_data.get('device_id', device_id)
        
        db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": device_data}
        )
        
        # Get updated device - use new device_id if it was changed
        updated_device = db.europcar_devices.find_one({"device_id": new_device_id})
        if '_id' in updated_device:
            del updated_device['_id']
        
        # Broadcast update via WebSocket
        print(f"📡 Broadcasting device update for {new_device_id}")
        try:
            from websocket_manager import manager
            import asyncio
            
            # If device_id was changed, broadcast delete for old ID
            if new_device_id != device_id:
                print(f"📡 [Device ID Changed] Broadcasting delete for old ID {device_id}")
                delete_message = {
                    "type": "device_deleted",
                    "device_id": device_id
                }
                if tenant_id:
                    asyncio.create_task(manager.broadcast_to_tenant(tenant_id, delete_message))
            
            # Broadcast update for new device_id
            message = {
                "type": "device_update",
                "device_id": new_device_id,
                "device": updated_device
            }
            
            if tenant_id:
                asyncio.create_task(manager.broadcast_to_tenant(tenant_id, message))
                print(f"✅ Broadcast sent to tenant {tenant_id}")
        except Exception as e:
            print(f"⚠️ Broadcast error: {str(e)}")
        
        return {
            "success": True,
            "message": "Device updated successfully",
            "device": updated_device
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/device/{device_id}")
async def delete_device(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a device
    """
    try:
        print(f"🔍 delete_device called with device_id: {device_id}")
        
        # Check if device exists
        device = db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        tenant_id = device.get('tenant_id')
        
        # Delete device
        db.europcar_devices.delete_one({"device_id": device_id})
        
        # Broadcast deletion via WebSocket
        print(f"📡 Broadcasting device deletion for {device_id}")
        try:
            from websocket_manager import manager
            import asyncio
            
            message = {
                "type": "device_deleted",
                "device_id": device_id
            }
            
            if tenant_id:
                asyncio.create_task(manager.broadcast_to_tenant(tenant_id, message))
                print(f"✅ Broadcast sent to tenant {tenant_id}")
        except Exception as e:
            print(f"⚠️ Broadcast error: {str(e)}")
        
        return {
            "success": True,
            "message": "Device deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/device/{device_id}/transfer")
async def transfer_device_to_tenant(
    device_id: str,
    transfer_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Transfer device to another tenant
    """
    try:
        new_tenant_id = transfer_data.get('tenant_id')
        if not new_tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id required")
        
        print(f"🔍 transfer_device called: {device_id} -> {new_tenant_id}")
        
        # Check if device exists
        device = db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        old_tenant_id = device.get('tenant_id')
        
        # Update tenant_id
        from datetime import datetime, timezone
        db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": {
                "tenant_id": new_tenant_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Get updated device
        updated_device = db.europcar_devices.find_one({"device_id": device_id})
        if '_id' in updated_device:
            del updated_device['_id']
        
        # Broadcast to both tenants
        print(f"📡 Broadcasting device transfer")
        try:
            from websocket_manager import manager
            import asyncio
            
            # Notify old tenant (device removed)
            if old_tenant_id:
                asyncio.create_task(manager.broadcast_to_tenant(old_tenant_id, {
                    "type": "device_deleted",
                    "device_id": device_id
                }))
            
            # Notify new tenant (device added)
            asyncio.create_task(manager.broadcast_to_tenant(new_tenant_id, {
                "type": "device_created",
                "device": updated_device
            }))
            
            print(f"✅ Broadcasts sent")
        except Exception as e:
            print(f"⚠️ Broadcast error: {str(e)}")
        
        return {
            "success": True,
            "message": f"Device transferred from {old_tenant_id} to {new_tenant_id}",
            "device": updated_device
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Transfer device error: {str(e)}")
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
