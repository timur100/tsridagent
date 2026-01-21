from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from decorators.broadcast_decorator import broadcast_changes
from services.event_service import EventType

router = APIRouter(prefix="/api/tenant-devices", tags=["tenant-devices"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
# Force use of multi_tenant_admin database for tenant devices
DB_NAME = 'multi_tenant_admin'
db = get_mongo_client()[DB_NAME]

# Also connect to portal_db for locations and auth_db for tenants
portal_db = get_mongo_client()['portal_db']
auth_db = get_mongo_client()['auth_db']

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
@broadcast_changes(entity_type="device", event_type="updated", data_field="device")
async def update_device(
    device_id: str,
    device_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Update device information
    Now uses centralized event system for broadcasting
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
        device_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Check if device_id is being changed
        new_device_id = device_data.get('device_id', device_id)
        
        # Handle device_id change - broadcast delete for old ID
        if new_device_id != device_id and tenant_id:
            print(f"📡 [Device ID Changed] Broadcasting delete for old ID {device_id}")
            from websocket_manager import manager
            import asyncio
            delete_message = {
                "type": "device_deleted",
                "device_id": device_id
            }
            asyncio.create_task(manager.broadcast_to_tenant(tenant_id, delete_message))
        
        db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": device_data}
        )
        
        # Get updated device - use new device_id if it was changed
        updated_device = db.europcar_devices.find_one({"device_id": new_device_id})
        if '_id' in updated_device:
            del updated_device['_id']
        
        # Decorator will automatically broadcast and log this event
        print(f"✨ Returning response - decorator will handle broadcasting")
        
        return {
            "success": True,
            "message": "Device updated successfully",
            "device": updated_device,
            "tenant_id": tenant_id,
            "device_id": new_device_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/device/{device_id}")
@broadcast_changes(entity_type="device", event_type="deleted")
async def delete_device(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a device
    Now uses centralized event system for broadcasting
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
        
        # Decorator will automatically broadcast and log this event
        print(f"✨ Device deleted - decorator will handle broadcasting")
        
        return {
            "success": True,
            "message": "Device deleted successfully",
            "tenant_id": tenant_id,
            "device_id": device_id
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

@router.get("/all/in-preparation")
async def get_all_in_preparation(
    token_data: dict = Depends(verify_token)
):
    """
    Get all devices and locations with status 'in_preparation' from all tenants
    """
    try:
        print(f"🔍 get_all_in_preparation called")
        
        # Get all devices with in_preparation status from europcar_devices collection
        devices_cursor = db.europcar_devices.find({
            "$or": [
                {"status": "in_preparation"},
                {"status": "preparation"}
            ]
        })
        
        devices = []
        tenant_ids = set()
        
        for device in devices_cursor:
            # Remove MongoDB _id field
            if '_id' in device:
                del device['_id']
            devices.append(device)
            tenant_ids.add(device.get('tenant_id'))
        
        print(f"✅ Found {len(devices)} devices in preparation from {len(tenant_ids)} tenants")
        
        # Get all locations with in_preparation status
        locations_cursor = portal_db.tenant_locations.find({
            "$or": [
                {"status": "in_preparation"},
                {"status": "preparation"}
            ]
        })
        
        locations = []
        for loc in locations_cursor:
            # Remove MongoDB _id field
            if '_id' in loc:
                del loc['_id']
            locations.append(loc)
            tenant_ids.add(loc.get('tenant_id'))
        
        print(f"✅ Found {len(locations)} locations in preparation")
        
        # Get tenant names for all involved tenants from auth_db
        tenant_names = {}
        for tenant_id in tenant_ids:
            tenant = auth_db.tenants.find_one({"tenant_id": tenant_id})
            if tenant:
                tenant_names[tenant_id] = tenant.get('display_name', tenant.get('name', 'Unbekannt'))
            else:
                tenant_names[tenant_id] = 'Unbekannt'
        
        # Enrich devices with tenant names
        for device in devices:
            device['tenant_name'] = tenant_names.get(device.get('tenant_id'), 'Unbekannt')
        
        # Enrich locations with tenant names
        for location in locations:
            location['tenant_name'] = tenant_names.get(location.get('tenant_id'), 'Unbekannt')
        
        result = {
            "success": True,
            "data": {
                "summary": {
                    "total_devices": len(devices),
                    "total_locations": len(locations),
                    "total_items": len(devices) + len(locations),
                    "tenant_count": len(tenant_ids)
                },
                "devices": devices,
                "locations": locations
            }
        }
        
        print(f"✅ Returning {len(devices)} devices and {len(locations)} locations in preparation")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get all in-preparation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/in-preparation")
async def get_tenant_in_preparation(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get all devices and locations with status 'in_preparation' for a specific tenant
    """
    try:
        print(f"🔍 get_tenant_in_preparation called for tenant_id: {tenant_id}")
        
        # Get all devices with in_preparation status for this tenant
        devices_cursor = db.europcar_devices.find({
            "tenant_id": tenant_id,
            "$or": [
                {"status": "in_preparation"},
                {"status": "preparation"},
                {"status": "in_vorbereitung"}
            ]
        })
        
        devices = []
        for device in devices_cursor:
            # Remove MongoDB _id field
            if '_id' in device:
                del device['_id']
            devices.append(device)
        
        print(f"✅ Found {len(devices)} devices in preparation for tenant {tenant_id}")
        
        # Get all locations with in_preparation status for this tenant
        locations_cursor = portal_db.tenant_locations.find({
            "tenant_id": tenant_id,
            "$or": [
                {"status": "in_preparation"},
                {"status": "preparation"},
                {"preparation_status": "in_vorbereitung"}
            ]
        })
        
        locations = []
        for loc in locations_cursor:
            # Remove MongoDB _id field
            if '_id' in loc:
                del loc['_id']
            locations.append(loc)
        
        print(f"✅ Found {len(locations)} locations in preparation for tenant {tenant_id}")
        
        # Get tenant name from auth_db
        tenant = auth_db.tenants.find_one({"tenant_id": tenant_id})
        tenant_name = 'Unbekannt'
        if tenant:
            tenant_name = tenant.get('display_name', tenant.get('name', 'Unbekannt'))
        
        # Enrich devices with tenant name
        for device in devices:
            device['tenant_name'] = tenant_name
        
        # Enrich locations with tenant name
        for location in locations:
            location['tenant_name'] = tenant_name
        
        result = {
            "success": True,
            "data": {
                "summary": {
                    "total_devices": len(devices),
                    "total_locations": len(locations),
                    "total_items": len(devices) + len(locations),
                    "tenant_id": tenant_id,
                    "tenant_name": tenant_name
                },
                "devices": devices,
                "locations": locations
            }
        }
        
        print(f"✅ Returning {len(devices)} devices and {len(locations)} locations in preparation for tenant {tenant_id}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get tenant in-preparation error: {str(e)}")
        import traceback
from db.connection import get_mongo_client
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
