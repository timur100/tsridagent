"""
Hardware Auto-Sync System
Automatically synchronizes hardware sets with tenant locations and devices
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/hardware/sync", tags=["Hardware Sync"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)

main_db = client['main_db']
portal_db = client['portal_db']
multi_tenant_db = client['multi_tenant_admin']


async def generate_barcode_svg(serial_number: str) -> Optional[str]:
    """Generate barcode SVG"""
    try:
        import barcode
        from barcode.writer import SVGWriter
        from io import BytesIO
        
        code128 = barcode.get_barcode_class('code128')
        barcode_instance = code128(serial_number, writer=SVGWriter())
        buffer = BytesIO()
        barcode_instance.write(buffer)
        buffer.seek(0)
        return buffer.read().decode('utf-8')
    except Exception as e:
        print(f"[Sync] Barcode generation error: {e}")
        return None


async def sync_tenant_hardware(tenant_id: str, user_email: str = "system_sync") -> Dict:
    """
    Automatically sync hardware sets with tenant locations
    - Creates new sets for new locations
    - Updates existing sets when serial numbers change
    - Updates set names when location names change
    - Adds/removes devices based on SN changes
    """
    try:
        sync_log = {
            "created_sets": [],
            "updated_sets": [],
            "created_devices": [],
            "updated_devices": [],
            "removed_devices": [],
            "errors": []
        }
        
        print(f"[Sync] Starting auto-sync for tenant {tenant_id}")
        
        # Step 1: Get all locations
        locations = await portal_db.tenant_locations.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).to_list(length=None)
        
        # Step 2: Group by location_code
        location_groups = {}
        for loc in locations:
            loc_code = loc.get('location_code')
            if loc_code:
                if loc_code not in location_groups:
                    location_groups[loc_code] = []
                location_groups[loc_code].append(loc)
        
        # Step 3: Sync each location
        for loc_code, loc_list in location_groups.items():
            for idx, location in enumerate(loc_list, start=1):
                try:
                    location_id = location.get('location_id')
                    if not location_id:
                        continue
                    
                    device_num = str(idx).zfill(2)
                    full_code = f"{loc_code}-{device_num}"
                    
                    # Check if set exists
                    existing_set = await main_db.hardware_sets.find_one({
                        'tenant_id': tenant_id,
                        'full_code': full_code
                    })
                    
                    station_name = location.get('station_name', location.get('name', loc_code))
                    set_name = f"{station_name} - Set {device_num}"
                    
                    if existing_set:
                        # UPDATE existing set
                        update_fields = {}
                        
                        # Update name if changed
                        if existing_set.get('set_name') != set_name:
                            update_fields['set_name'] = set_name
                        
                        # Update location if changed
                        if existing_set.get('location_id') != location_id:
                            update_fields['location_id'] = location_id
                        
                        if update_fields:
                            update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
                            await main_db.hardware_sets.update_one(
                                {'id': existing_set['id']},
                                {'$set': update_fields}
                            )
                            sync_log["updated_sets"].append(f"{full_code}: {', '.join(update_fields.keys())}")
                        
                        set_id = existing_set['id']
                    else:
                        # CREATE new set
                        new_set = {
                            'id': str(uuid.uuid4()),
                            'tenant_id': tenant_id,
                            'set_name': set_name,
                            'location_id': location_id,
                            'location_code': loc_code,
                            'device_number': device_num,
                            'full_code': full_code,
                            'status': 'aktiv',
                            'created_at': datetime.now(timezone.utc).isoformat(),
                            'closed_at': None,
                            'notes': f"Auto-synchronisiert"
                        }
                        
                        await main_db.hardware_sets.insert_one(new_set)
                        sync_log["created_sets"].append(full_code)
                        set_id = new_set['id']
                    
                    # Step 4: Sync devices (Tablet, Scanner, Dockingstation)
                    device_fields = {
                        'sn_pc': ('Tablet', location.get('sn_pc')),
                        'sn_sc': ('Scanner', location.get('sn_sc')),
                        'sn_dock': ('Dockingstation', location.get('sn_dock'))
                    }
                    
                    for field_name, (device_type, serial_number) in device_fields.items():
                        if serial_number and serial_number.strip():
                            # Check if device exists
                            existing_device = await main_db.hardware_devices.find_one({
                                'tenant_id': tenant_id,
                                'serial_number': serial_number
                            })
                            
                            if existing_device:
                                # UPDATE device if needed
                                update_fields = {}
                                
                                # Update set assignment if changed
                                if existing_device.get('current_set_id') != set_id:
                                    # Remove from old set
                                    if existing_device.get('current_set_id'):
                                        await main_db.set_assignments.update_many(
                                            {
                                                'device_id': existing_device['id'],
                                                'active': True
                                            },
                                            {
                                                '$set': {
                                                    'removed_date': datetime.now(timezone.utc).isoformat(),
                                                    'removal_reason': 'Auto-sync: Moved to new set',
                                                    'active': False
                                                }
                                            }
                                        )
                                    
                                    # Add to new set
                                    update_fields['current_set_id'] = set_id
                                    update_fields['current_location_id'] = location_id
                                    
                                    # Create new assignment
                                    await main_db.set_assignments.insert_one({
                                        'id': str(uuid.uuid4()),
                                        'device_id': existing_device['id'],
                                        'set_id': set_id,
                                        'assigned_date': datetime.now(timezone.utc).isoformat(),
                                        'removed_date': None,
                                        'removal_reason': None,
                                        'assigned_by': user_email,
                                        'active': True
                                    })
                                
                                # Update location if changed
                                if existing_device.get('current_location_id') != location_id:
                                    update_fields['current_location_id'] = location_id
                                
                                if update_fields:
                                    update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
                                    await main_db.hardware_devices.update_one(
                                        {'id': existing_device['id']},
                                        {'$set': update_fields}
                                    )
                                    sync_log["updated_devices"].append(f"{device_type} {serial_number}: Moved to {full_code}")
                            
                            else:
                                # CREATE new device
                                new_device = {
                                    'id': str(uuid.uuid4()),
                                    'tenant_id': tenant_id,
                                    'serial_number': serial_number,
                                    'hardware_type': device_type,
                                    'manufacturer': None,
                                    'model': None,
                                    'purchase_date': None,
                                    'warranty_until': None,
                                    'warranty_reminder_days': 30,
                                    'current_status': 'aktiv',
                                    'current_location_id': location_id,
                                    'current_set_id': set_id,
                                    'barcode': await generate_barcode_svg(serial_number),
                                    'notes': f"Auto-sync von {full_code}",
                                    'created_at': datetime.now(timezone.utc).isoformat(),
                                    'updated_at': datetime.now(timezone.utc).isoformat()
                                }
                                
                                await main_db.hardware_devices.insert_one(new_device)
                                
                                # Create assignment
                                await main_db.set_assignments.insert_one({
                                    'id': str(uuid.uuid4()),
                                    'device_id': new_device['id'],
                                    'set_id': set_id,
                                    'assigned_date': datetime.now(timezone.utc).isoformat(),
                                    'removed_date': None,
                                    'removal_reason': None,
                                    'assigned_by': user_email,
                                    'active': True
                                })
                                
                                # Add history
                                await main_db.device_history.insert_one({
                                    'id': str(uuid.uuid4()),
                                    'device_id': new_device['id'],
                                    'action_type': 'created',
                                    'timestamp': datetime.now(timezone.utc).isoformat(),
                                    'performed_by': user_email,
                                    'set_id': set_id,
                                    'location_id': location_id,
                                    'notes': f"Auto-sync: Neues Gerät erkannt und zu {full_code} hinzugefügt",
                                    'metadata': None
                                })
                                
                                sync_log["created_devices"].append(f"{device_type}: {serial_number}")
                        
                        else:
                            # Serial number is empty/removed - check if device should be removed from set
                            # Find devices of this type in this set that are no longer in location data
                            devices_in_set = await main_db.hardware_devices.find({
                                'tenant_id': tenant_id,
                                'current_set_id': set_id,
                                'hardware_type': device_type
                            }).to_list(length=None)
                            
                            # Check if any device in set is not in current location data
                            current_sns = [sn for _, sn in device_fields.values() if sn and sn.strip()]
                            
                            for device in devices_in_set:
                                if device['serial_number'] not in current_sns:
                                    # Remove from set (back to warehouse)
                                    await main_db.hardware_devices.update_one(
                                        {'id': device['id']},
                                        {
                                            '$set': {
                                                'current_set_id': None,
                                                'current_location_id': None,
                                                'current_status': 'verfügbar_lager',
                                                'updated_at': datetime.now(timezone.utc).isoformat()
                                            }
                                        }
                                    )
                                    
                                    # End assignment
                                    await main_db.set_assignments.update_many(
                                        {
                                            'device_id': device['id'],
                                            'set_id': set_id,
                                            'active': True
                                        },
                                        {
                                            '$set': {
                                                'removed_date': datetime.now(timezone.utc).isoformat(),
                                                'removal_reason': 'Auto-sync: Serial number removed from location',
                                                'active': False
                                            }
                                        }
                                    )
                                    
                                    sync_log["removed_devices"].append(f"{device_type} {device['serial_number']} from {full_code}")
                
                except Exception as e:
                    error_msg = f"Error syncing {loc_code}-{device_num}: {str(e)}"
                    print(f"[Sync] {error_msg}")
                    sync_log["errors"].append(error_msg)
        
        print(f"[Sync] Completed for tenant {tenant_id}")
        return sync_log
        
    except Exception as e:
        print(f"[Sync] Error: {e}")
        raise


@router.post("/tenant/{tenant_id}/auto")
async def trigger_auto_sync(
    tenant_id: str,
    background_tasks: BackgroundTasks,
    token_data: dict = Depends(verify_token)
):
    """
    Trigger automatic synchronization for a tenant
    This can be called manually or by a webhook/scheduler
    """
    try:
        user_email = token_data.get('email', 'system')
        
        # Run sync
        sync_log = await sync_tenant_hardware(tenant_id, user_email)
        
        # Save sync log
        await main_db.hardware_sync_logs.insert_one({
            'id': str(uuid.uuid4()),
            'tenant_id': tenant_id,
            'triggered_by': user_email,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'sync_log': sync_log
        })
        
        return {
            "success": True,
            "message": "Synchronisierung abgeschlossen",
            "sync_log": sync_log
        }
        
    except Exception as e:
        print(f"[Sync] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenant/{tenant_id}/status")
async def get_sync_status(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get last sync status for a tenant
    """
    try:
        last_sync = await main_db.hardware_sync_logs.find_one(
            {'tenant_id': tenant_id},
            {'_id': 0},
            sort=[('timestamp', -1)]
        )
        
        return {
            "success": True,
            "last_sync": last_sync
        }
        
    except Exception as e:
        print(f"[Sync] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
