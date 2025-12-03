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


async def generate_barcode_svg(serial_number: str) -> str:
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
        print(f"[Import] Barcode generation error: {e}")
        return None


@router.post("/tenant/{tenant_id}/from-existing")
async def import_from_existing_data(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Import hardware from existing tenant devices and locations
    Creates hardware devices and sets based on existing data
    
    Data sources:
    - Locations from portal_db.tenant_locations (location_code, sn_pc, sn_sc)
    - Devices from multi_tenant_admin.europcar_devices (device_id, locationcode)
    """
    try:
        imported_devices = []
        imported_sets = []
        skipped = []
        errors = []
        
        print(f"[Hardware Import] Starting import for tenant {tenant_id}")
        
        # Step 1: Get all locations for this tenant
        locations = await portal_db.tenant_locations.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).to_list(length=None)
        
        print(f"[Hardware Import] Found {len(locations)} locations")
        
        # Step 2: Get all devices for this tenant
        devices = await multi_tenant_db.europcar_devices.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).to_list(length=None)
        
        print(f"[Hardware Import] Found {len(devices)} devices in multi_tenant_admin")
        
        # Step 3: Group locations by location_code to handle multiple sets per location
        location_groups = {}
        for loc in locations:
            loc_code = loc.get('location_code')
            if loc_code:
                if loc_code not in location_groups:
                    location_groups[loc_code] = []
                location_groups[loc_code].append(loc)
        
        # Step 4: Import devices and create sets
        for loc_code, loc_list in location_groups.items():
            # For locations with multiple entries (e.g., MUCT01 with different device numbers)
            for idx, location in enumerate(loc_list, start=1):
                try:
                    location_id = location.get('location_id')
                    sn_pc = location.get('sn_pc')  # ECHTE Tablet-Seriennummer
                    sn_sc = location.get('sn_sc')  # ECHTE Scanner-Seriennummer
                    sn_dock = location.get('sn_dock')  # ECHTE Dockingstation-Seriennummer
                    
                    if not location_id:
                        skipped.append(f"Location {loc_code}: No location_id")
                        continue
                    
                    # Determine device number
                    # If there's only one location with this code, use "01"
                    # Otherwise, use sequential numbers
                    device_num = str(idx).zfill(2)
                    set_name = f"{location.get('station_name', loc_code)} - Set {device_num}"
                    full_code = f"{loc_code}-{device_num}"
                    
                    # Check if set already exists
                    existing_set = await main_db.hardware_sets.find_one({
                        'tenant_id': tenant_id,
                        'full_code': full_code
                    })
                    
                    if existing_set:
                        print(f"[Hardware Import] Set {full_code} already exists, skipping")
                        skipped.append(f"Set {full_code} already exists")
                        continue
                    
                    # Create hardware set
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
                        'notes': f"Automatisch importiert aus bestehenden Daten"
                    }
                    
                    await main_db.hardware_sets.insert_one(new_set)
                    imported_sets.append(full_code)
                    
                    # Import Tablet/PC (SN-PC) - VERWENDE ECHTE SERIENNUMMER
                    if sn_pc and sn_pc.strip():
                        existing_device = await main_db.hardware_devices.find_one({
                            'tenant_id': tenant_id,
                            'serial_number': sn_pc
                        })
                        
                        if not existing_device:
                            tablet = {
                                'id': str(uuid.uuid4()),
                                'tenant_id': tenant_id,
                                'serial_number': sn_pc,  # ECHTE Seriennummer aus SN-PC
                                'hardware_type': 'Tablet',
                                'manufacturer': None,
                                'model': None,
                                'purchase_date': None,
                                'warranty_until': None,
                                'warranty_reminder_days': 30,
                                'current_status': 'aktiv',
                                'current_location_id': location_id,
                                'current_set_id': new_set['id'],
                                'barcode': await generate_barcode_svg(sn_pc),
                                'notes': f"Importiert von Location {full_code}",
                                'created_at': datetime.now(timezone.utc).isoformat(),
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }
                            
                            await main_db.hardware_devices.insert_one(tablet)
                            
                            # Add to set assignment
                            await main_db.set_assignments.insert_one({
                                'id': str(uuid.uuid4()),
                                'device_id': tablet['id'],
                                'set_id': new_set['id'],
                                'assigned_date': datetime.now(timezone.utc).isoformat(),
                                'removed_date': None,
                                'removal_reason': None,
                                'assigned_by': token_data.get('email', 'system'),
                                'active': True
                            })
                            
                            imported_devices.append(f"Tablet: {sn_pc}")
                        else:
                            skipped.append(f"Tablet {sn_pc} existiert bereits")
                    
                    # Import Scanner (SN-SC)
                    if sn_sc:
                        existing_device = await main_db.hardware_devices.find_one({
                            'tenant_id': tenant_id,
                            'serial_number': sn_sc
                        })
                        
                        if not existing_device:
                            scanner = {
                                'id': str(uuid.uuid4()),
                                'tenant_id': tenant_id,
                                'serial_number': sn_sc,
                                'hardware_type': 'Scanner',
                                'manufacturer': None,
                                'model': None,
                                'purchase_date': None,
                                'warranty_until': None,
                                'warranty_reminder_days': 30,
                                'current_status': 'aktiv',
                                'current_location_id': location_id,
                                'current_set_id': new_set['id'],
                                'barcode': generate_barcode_svg(sn_sc),
                                'notes': f"Importiert von Location {full_code}",
                                'created_at': datetime.now(timezone.utc).isoformat(),
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }
                            
                            await main_db.hardware_devices.insert_one(scanner)
                            
                            # Add to set assignment
                            await main_db.set_assignments.insert_one({
                                'id': str(uuid.uuid4()),
                                'device_id': scanner['id'],
                                'set_id': new_set['id'],
                                'assigned_date': datetime.now(timezone.utc).isoformat(),
                                'removed_date': None,
                                'removal_reason': None,
                                'assigned_by': token_data.get('email', 'system'),
                                'active': True
                            })
                            
                            imported_devices.append(f"Scanner: {sn_sc}")
                    
                    # Add device history entries
                    for device in [d async for d in main_db.hardware_devices.find({'current_set_id': new_set['id']})]:
                        await main_db.device_history.insert_one({
                            'id': str(uuid.uuid4()),
                            'device_id': device['id'],
                            'action_type': 'created',
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'performed_by': 'system_import',
                            'old_value': None,
                            'new_value': None,
                            'set_id': new_set['id'],
                            'location_id': location_id,
                            'notes': f"Automatisch importiert und zu Set {full_code} hinzugefügt",
                            'metadata': None
                        })
                
                except Exception as e:
                    error_msg = f"Location {loc_code}-{device_num}: {str(e)}"
                    print(f"[Hardware Import] Error: {error_msg}")
                    errors.append(error_msg)
        
        print(f"[Hardware Import] Completed: {len(imported_sets)} sets, {len(imported_devices)} devices")
        
        return {
            "success": True,
            "message": f"Import abgeschlossen",
            "imported_sets_count": len(imported_sets),
            "imported_devices_count": len(imported_devices),
            "skipped_count": len(skipped),
            "errors_count": len(errors),
            "details": {
                "imported_sets": imported_sets,
                "imported_devices": imported_devices,
                "skipped": skipped,
                "errors": errors
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
        
        # Get all locations
        locations = await portal_db.tenant_locations.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "location_code": 1, "station_name": 1, "sn_pc": 1, "sn_sc": 1, "location_id": 1}
        ).to_list(length=None)
        
        # Get all devices
        devices = await multi_tenant_db.europcar_devices.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "device_id": 1, "locationcode": 1, "status": 1}
        ).to_list(length=None)
        
        # Calculate what will be imported
        preview_sets = []
        preview_devices = []
        
        location_groups = {}
        for loc in locations:
            loc_code = loc.get('location_code')
            if loc_code:
                if loc_code not in location_groups:
                    location_groups[loc_code] = []
                location_groups[loc_code].append(loc)
        
        for loc_code, loc_list in location_groups.items():
            for idx, location in enumerate(loc_list, start=1):
                device_num = str(idx).zfill(2)
                full_code = f"{loc_code}-{device_num}"
                
                set_preview = {
                    "full_code": full_code,
                    "location_code": loc_code,
                    "device_number": device_num,
                    "station_name": location.get('station_name'),
                    "devices_will_be_imported": []
                }
                
                if location.get('sn_pc'):
                    set_preview["devices_will_be_imported"].append({
                        "type": "Tablet",
                        "serial_number": location.get('sn_pc')
                    })
                    preview_devices.append(f"Tablet: {location.get('sn_pc')}")
                
                if location.get('sn_sc'):
                    set_preview["devices_will_be_imported"].append({
                        "type": "Scanner",
                        "serial_number": location.get('sn_sc')
                    })
                    preview_devices.append(f"Scanner: {location.get('sn_sc')}")
                
                preview_sets.append(set_preview)
        
        return {
            "success": True,
            "message": "Preview erstellt",
            "preview": {
                "sets_to_import": len(preview_sets),
                "devices_to_import": len(preview_devices),
                "locations_found": len(locations),
                "devices_found_in_system": len(devices),
                "sets": preview_sets
            }
        }
        
    except Exception as e:
        print(f"[Hardware Import] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
