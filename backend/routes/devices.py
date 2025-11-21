from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient
from decorators.broadcast_decorator import broadcast_changes

router = APIRouter(prefix="/api/portal/europcar-devices", tags=["europcar-devices"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client['multi_tenant_admin']  # Use multi_tenant_admin database for europcar_devices
portal_db = client['portal_db']  # For tenant_locations


def enrich_devices_with_location_data(devices, tenant_id):
    """
    Enrich device data with street and zip from tenant_locations
    Same function as in tenant_devices.py to ensure data consistency
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


@router.get("")
async def get_devices(
    customer_email: str = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all devices, optionally filtered by customer email
    Admins: Can see all devices or filter by customer
    Customers: Can only see their own company's devices
    """
    try:
        # Check if user is admin
        is_admin = token_data.get("role") == "admin"
        user_email = token_data.get("sub")
        
        # Build query filter
        query = {}
        
        if is_admin:
            # Admin can filter by customer_email parameter
            if customer_email and customer_email != 'all':
                # Find the customer by email to get their company name
                customer = db.portal_users.find_one({"email": customer_email})
                if customer and customer.get("company"):
                    company_name = customer.get("company")
                    # Try exact match first, then partial match
                    # e.g., "Europcar Autovermietung GmbH" should match devices with customer="Europcar"
                    query['$or'] = [
                        {'customer': company_name},  # Exact match
                        {'customer': {'$regex': company_name.split()[0], '$options': 'i'}}  # First word match (case-insensitive)
                    ]
        else:
            # Customer can only see their own tenant's devices
            # Check if user has tenant_ids in token
            tenant_ids = token_data.get("tenant_ids", [])
            
            if tenant_ids:
                # User has tenant_ids - filter by tenant_id
                query['tenant_id'] = {'$in': tenant_ids}
            else:
                # Fallback: Try to find user in portal_users
                customer = db.portal_users.find_one({"email": user_email})
                
                if not customer:
                    # If not found in portal_users, return empty (for security)
                    return {
                        "success": True,
                        "data": {
                            "summary": {
                                "total": 0,
                                "online": 0,
                                "offline": 0,
                                "in_vorbereitung": 0
                            },
                            "devices": []
                        }
                    }
                
                if customer.get("status") != "Aktiv":
                    raise HTTPException(status_code=403, detail="Customer account is not active")
                
                # Filter by customer's company
                if customer.get("company"):
                    company_name = customer.get("company")
                    # Try exact match first, then partial match
                    query['$or'] = [
                        {'customer': company_name},  # Exact match
                        {'customer': {'$regex': company_name.split()[0], '$options': 'i'}}  # First word match (case-insensitive)
                    ]
                else:
                    # If no company, return empty list
                    return {
                        "success": True,
                        "data": {
                            "summary": {
                                "total": 0,
                                "online": 0,
                                "offline": 0,
                                "in_vorbereitung": 0
                            },
                            "devices": []
                        }
                    }
        
        # Fetch devices from MongoDB
        devices_cursor = db.europcar_devices.find(query)
        devices = []
        
        for device in devices_cursor:
            # Remove MongoDB _id field
            if '_id' in device:
                del device['_id']
            devices.append(device)
        
        # Enrich devices with location data (street, zip) from tenant_locations
        # Get tenant_id from token for enrichment
        tenant_ids = token_data.get('tenant_ids', [])
        if tenant_ids:
            tenant_id = tenant_ids[0]
            devices = enrich_devices_with_location_data(devices, tenant_id)
        
        # Calculate summary statistics
        total = len(devices)
        online_count = sum(1 for d in devices if d.get('status', '').lower() == 'online')
        offline_count = sum(1 for d in devices if d.get('status', '').lower() == 'offline')
        in_prep_count = sum(1 for d in devices if d.get('status', '').lower() == 'in_vorbereitung')
        
        return {
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
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Devices error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}")
async def get_device(device_id: str, token_data: dict = Depends(verify_token)):
    """
    Get a specific device by device_id
    """
    try:
        # Check access permissions (same as get_devices)
        is_admin = token_data.get("role") == "admin"
        
        if not is_admin:
            user_email = token_data.get("sub")
            customer = db.portal_users.find_one({"email": user_email})
            
            # Check if customer's company contains "Europcar" (case-insensitive)
            if not customer or not (customer.get("company") and "europcar" in customer.get("company", "").lower()):
                raise HTTPException(status_code=403, detail="Access denied")
            
            if customer.get("status") != "Aktiv":
                raise HTTPException(status_code=403, detail="Access denied: Customer account is not active")
        
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
        print(f"Get device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{device_id}")
async def update_device(
    device_id: str,
    device_update: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Update device information
    Only accessible to admin or active Europcar customer
    """
    try:
        # Check access permissions
        is_admin = token_data.get("role") == "admin"
        
        if not is_admin:
            user_email = token_data.get("sub")
            customer = db.portal_users.find_one({"email": user_email})
            
            # Check if customer's company contains "Europcar" (case-insensitive)
            if not customer or not (customer.get("company") and "europcar" in customer.get("company", "").lower()):
                raise HTTPException(status_code=403, detail="Access denied")
            
            if customer.get("status") != "Aktiv":
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Find device
        device = db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Add updated timestamp and user info
        device_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        device_update['updated_by'] = token_data.get("sub")
        
        # Check if device_id is being changed
        new_device_id = device_update.get('device_id', device_id)
        
        # Update device in MongoDB
        db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": device_update}
        )
        
        # Fetch updated device (exclude _id) - use new device_id if it was changed
        updated_device = db.europcar_devices.find_one({"device_id": new_device_id}, {'_id': 0})
        
        # Broadcast device update via WebSocket
        tenant_id = updated_device.get('tenant_id')
        if tenant_id:
            print(f"📡 [Device Update] Broadcasting update for {new_device_id} to tenant {tenant_id}")
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
                    asyncio.create_task(manager.broadcast_to_tenant(tenant_id, delete_message))
                
                # Broadcast update/create for new device_id
                message = {
                    "type": "device_update",
                    "device_id": new_device_id,
                    "device": updated_device
                }
                
                asyncio.create_task(manager.broadcast_to_tenant(tenant_id, message))
                print(f"✅ [Device Update] Broadcast sent to tenant {tenant_id}")
            except Exception as e:
                print(f"⚠️ [Device Update] Broadcast error: {str(e)}")
        else:
            print(f"⚠️ [Device Update] No tenant_id for device {new_device_id}, skipping broadcast")
        
        return {
            "success": True,
            "message": "Device updated successfully",
            "device": updated_device
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_device(
    device_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new device
    Admin: Can create any device
    Customer: Can only create devices for their company
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Check if device_id already exists
        existing = db.europcar_devices.find_one({"device_id": device_data.get("device_id")})
        if existing:
            raise HTTPException(status_code=400, detail="Device ID already exists")
        
        # For customers, ensure they can only create devices for their own company
        if user_role == "customer":
            # Get user's company from portal_users
            user_doc = db.portal_users.find_one({"email": user_email})
            if user_doc:
                device_data['customer'] = user_doc.get('company', 'Europcar Autovermietung GmbH')
        else:
            # Admin can set any customer
            device_data['customer'] = device_data.get('customer', 'Europcar Autovermietung GmbH')
        
        # Add metadata
        device_data['created_at'] = datetime.now(timezone.utc).isoformat()
        device_data['created_by'] = user_email
        device_data['active'] = True
        device_data['teamviewer_online'] = False  # Default to offline
        device_data['status'] = device_data.get('status', 'in_vorbereitung')
        
        # Insert into MongoDB
        db.europcar_devices.insert_one(device_data)
        
        # Return device without _id
        device_data.pop('_id', None)
        
        # Broadcast device creation via WebSocket
        tenant_id = device_data.get('tenant_id')
        if tenant_id:
            print(f"📡 [Device Create] Broadcasting new device {device_data.get('device_id')} to tenant {tenant_id}")
            try:
                from websocket_manager import manager
                import asyncio
                
                message = {
                    "type": "device_created",
                    "device": device_data
                }
                
                asyncio.create_task(manager.broadcast_to_tenant(tenant_id, message))
                print(f"✅ [Device Create] Broadcast sent to tenant {tenant_id}")
            except Exception as e:
                print(f"⚠️ [Device Create] Broadcast error: {str(e)}")
        else:
            print(f"⚠️ [Device Create] No tenant_id for device {device_data.get('device_id')}, skipping broadcast")
        
        return {
            "success": True,
            "message": "Device created successfully",
            "data": {
                "device": device_data
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{device_id}")
async def delete_device(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a device (admin only)
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find device
        device = db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Delete from MongoDB
        db.europcar_devices.delete_one({"device_id": device_id})
        
        return {
            "success": True,
            "message": "Device deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete device error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{device_id}/toggle-active")
async def toggle_device_active(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Toggle device active status (admin only)
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find device
        device = db.europcar_devices.find_one({"device_id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Toggle active status
        new_active = not device.get('active', True)
        
        db.europcar_devices.update_one(
            {"device_id": device_id},
            {"$set": {
                "active": new_active,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": token_data.get("sub")
            }}
        )
        
        return {
            "success": True,
            "message": f"Device {'activated' if new_active else 'deactivated'} successfully",
            "active": new_active
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Toggle device active error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}/location-info")
async def get_device_location_info(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get location information and other devices at the same location for a specific device
    """
    try:
        # Check access permissions (same as get_devices)
        is_admin = token_data.get("role") == "admin"
        
        if not is_admin:
            user_email = token_data.get("sub")
            customer = db.portal_users.find_one({"email": user_email})
            
            # Check if customer's company contains "Europcar" (case-insensitive)
            if not customer or not (customer.get("company") and "europcar" in customer.get("company", "").lower()):
                raise HTTPException(status_code=403, detail="Access denied")
            
            if customer.get("status") != "Aktiv":
                raise HTTPException(status_code=403, detail="Access denied: Customer account is not active")
        
        # Find device in MongoDB
        device = db.europcar_devices.find_one({"device_id": device_id}, {'_id': 0})
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        locationcode = device.get('locationcode')
        
        if not locationcode:
            return {
                "success": True,
                "location": None,
                "devices": [],
                "device_count": 0
            }
        
        # Find location/station information
        location = db.europcar_stations.find_one({"main_code": locationcode}, {'_id': 0})
        
        # Find all devices at the same location (excluding the current device)
        other_devices_cursor = db.europcar_devices.find(
            {
                "locationcode": locationcode,
                "device_id": {"$ne": device_id}
            },
            {'_id': 0}
        )
        
        other_devices = list(other_devices_cursor)
        
        # Count total devices at this location (including current device)
        total_device_count = db.europcar_devices.count_documents({"locationcode": locationcode})
        
        return {
            "success": True,
            "location": location,
            "devices": other_devices,
            "device_count": total_device_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get device location info error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
