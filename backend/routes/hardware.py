"""
Hardware Asset Management API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient
try:
    import barcode
    from barcode.writer import SVGWriter
    BARCODE_AVAILABLE = True
except ImportError:
    BARCODE_AVAILABLE = False
from io import BytesIO
import base64

from models.hardware import (
    HardwareSet, HardwareSetCreate, HardwareSetUpdate,
    HardwareDevice, HardwareDeviceCreate, HardwareDeviceUpdate,
    SetAssignment, DeviceHistory, DeviceReplacement,
    AssignDeviceToSet, RemoveDeviceFromSet, ReplaceDeviceRequest
)
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/hardware", tags=["Hardware Management"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']
multi_tenant_db = client['multi_tenant_admin']


# Helper Functions
async def add_device_history(device_id: str, action_type: str, performed_by: str, 
                            old_value: str = None, new_value: str = None,
                            set_id: str = None, location_id: str = None,
                            notes: str = None, metadata: dict = None):
    """Add entry to device history"""
    history = DeviceHistory(
        device_id=device_id,
        action_type=action_type,
        performed_by=performed_by,
        old_value=old_value,
        new_value=new_value,
        set_id=set_id,
        location_id=location_id,
        notes=notes,
        metadata=metadata
    )
    await db.device_history.insert_one(history.model_dump())


def generate_barcode(serial_number: str) -> str:
    """Generate barcode as SVG string"""
    if not BARCODE_AVAILABLE:
        return None
    try:
        code128 = barcode.get_barcode_class('code128')
        barcode_instance = code128(serial_number, writer=SVGWriter())
        buffer = BytesIO()
        barcode_instance.write(buffer)
        buffer.seek(0)
        svg_content = buffer.read().decode('utf-8')
        return svg_content
    except Exception as e:
        print(f"[Hardware] Error generating barcode: {e}")
        return None


# ==================== HARDWARE SETS ====================

@router.get("/sets")
async def get_all_sets(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all hardware sets with optional filters, enriched with device count and location name"""
    try:
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if status:
            query['status'] = status
        if location_id:
            query['location_id'] = location_id
        
        sets = await db.hardware_sets.find(query, {"_id": 0}).sort('created_at', -1).to_list(length=None)
        
        # Load location names from tsrid_db.tenants
        tsrid_db = client['tsrid_db']
        locations_cursor = tsrid_db.tenants.find(
            {'tenant_level': 'location'},
            {'_id': 0, 'location_code': 1, 'display_name': 1, 'name': 1}
        )
        locations_list = await locations_cursor.to_list(length=None)
        location_map = {
            loc.get('location_code'): loc.get('display_name') or loc.get('name') 
            for loc in locations_list if loc.get('location_code')
        }
        
        # Enrich each set with device count and location name
        enriched_sets = []
        for hw_set in sets:
            # Get device count
            device_count = 0
            full_code = hw_set.get('full_code')
            
            # Check if this is an Europcar set
            if full_code:
                europcar_device = await multi_tenant_db.europcar_devices.find_one(
                    {'device_id': full_code},
                    {"_id": 0, 'sn_pc': 1, 'sn_sc': 1, 'imei_1': 1}
                )
                
                if europcar_device:
                    # Count components
                    if europcar_device.get('sn_pc'):
                        device_count += 1
                    if europcar_device.get('sn_sc'):
                        device_count += 1
                    if europcar_device.get('imei_1'):
                        device_count += 1
                else:
                    # Fallback to regular devices
                    device_count = await db.hardware_devices.count_documents({'current_set_id': hw_set.get('id')})
            else:
                # No full_code, use regular devices
                device_count = await db.hardware_devices.count_documents({'current_set_id': hw_set.get('id')})
            
            # Get location name
            location_name = None
            if hw_set.get('location_code'):
                location_name = location_map.get(hw_set['location_code'])
            
            # Add enriched fields
            enriched_set = {
                **hw_set,
                'device_count': device_count,
                'location_name': location_name
            }
            enriched_sets.append(enriched_set)
        
        return enriched_sets
    except Exception as e:
        print(f"[Hardware] Error fetching sets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sets/{set_id}", response_model=HardwareSet)
async def get_set(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get single hardware set by ID"""
    try:
        hw_set = await db.hardware_sets.find_one({'id': set_id}, {"_id": 0})
        if not hw_set:
            raise HTTPException(status_code=404, detail="Hardware-Set nicht gefunden")
        return hw_set
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error fetching set {set_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sets", response_model=HardwareSet)
async def create_set(
    set_data: HardwareSetCreate,
    token_data: dict = Depends(verify_token)
):
    """Create new hardware set"""
    try:
        # Generate full_code if location_code and device_number provided
        full_code = None
        if set_data.location_code and set_data.device_number:
            full_code = f"{set_data.location_code}-{set_data.device_number}"
        
        new_set = HardwareSet(
            tenant_id=set_data.tenant_id,
            set_name=set_data.set_name,
            location_id=set_data.location_id,
            location_code=set_data.location_code,
            device_number=set_data.device_number,
            full_code=full_code,
            notes=set_data.notes
        )
        
        await db.hardware_sets.insert_one(new_set.model_dump())
        print(f"[Hardware] Created set: {new_set.id} - {new_set.set_name} ({full_code or 'no code'})")
        
        return new_set
    except Exception as e:
        print(f"[Hardware] Error creating set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sets/{set_id}", response_model=HardwareSet)
async def update_set(
    set_id: str,
    update_data: HardwareSetUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update hardware set"""
    try:
        existing_set = await db.hardware_sets.find_one({'id': set_id})
        if not existing_set:
            raise HTTPException(status_code=404, detail="Hardware-Set nicht gefunden")
        
        update_dict = {}
        if update_data.set_name is not None:
            update_dict['set_name'] = update_data.set_name
        if update_data.location_id is not None:
            update_dict['location_id'] = update_data.location_id
        if update_data.status is not None:
            update_dict['status'] = update_data.status
            if update_data.status == 'geschlossen' and not existing_set.get('closed_at'):
                update_dict['closed_at'] = datetime.now(timezone.utc).isoformat()
        if update_data.notes is not None:
            update_dict['notes'] = update_data.notes
        
        await db.hardware_sets.update_one({'id': set_id}, {'$set': update_dict})
        
        updated_set = await db.hardware_sets.find_one({'id': set_id}, {"_id": 0})
        print(f"[Hardware] Updated set: {set_id}")
        
        return updated_set
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error updating set {set_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sets/{set_id}")
async def delete_set(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete hardware set (only if no active devices)"""
    try:
        # Check if set has active devices
        active_assignments = await db.set_assignments.count_documents({
            'set_id': set_id,
            'active': True
        })
        
        if active_assignments > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Set hat noch {active_assignments} aktive Geräte. Bitte zuerst entfernen."
            )
        
        result = await db.hardware_sets.delete_one({'id': set_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Hardware-Set nicht gefunden")
        
        print(f"[Hardware] Deleted set: {set_id}")
        return {"success": True, "message": "Hardware-Set gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error deleting set {set_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sets/{set_id}/assignments")
async def get_set_assignments(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all device assignments for a hardware set"""
    try:
        # First, get the set details to check if it's an Europcar set
        hardware_set = await db.hardware_sets.find_one({'id': set_id}, {"_id": 0})
        
        if not hardware_set:
            return {"success": True, "data": []}
        
        # Check if this is an Europcar set by looking for the device in europcar_devices
        full_code = hardware_set.get('full_code') or hardware_set.get('device_number')
        europcar_device = None
        
        if full_code:
            europcar_device = await multi_tenant_db.europcar_devices.find_one(
                {'device_id': full_code},
                {"_id": 0}
            )
        
        # If we found europcar device data, extract components from it
        if europcar_device:
            components = []
            
            # Extract PC component
            if europcar_device.get('sn_pc'):
                components.append({
                    'id': f"{europcar_device['device_id']}_PC",
                    'device_id': f"{europcar_device['device_id']}_PC",
                    'device_type': 'PC',
                    'serial_number': europcar_device['sn_pc'],
                    'manufacturer': 'PC',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'notes': '',
                    'active': True,
                    'set_id': set_id
                })
            
            # Extract Scanner component
            if europcar_device.get('sn_sc'):
                components.append({
                    'id': f"{europcar_device['device_id']}_SC",
                    'device_id': f"{europcar_device['device_id']}_SC",
                    'device_type': 'Scanner',
                    'serial_number': europcar_device['sn_sc'],
                    'manufacturer': 'Scanner',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'notes': '',
                    'active': True,
                    'set_id': set_id
                })
            
            # Extract IMEI if exists
            if europcar_device.get('imei_1'):
                components.append({
                    'id': f"{europcar_device['device_id']}_IMEI1",
                    'device_id': f"{europcar_device['device_id']}_IMEI1",
                    'device_type': 'Mobile Device',
                    'serial_number': europcar_device['imei_1'],
                    'manufacturer': 'Mobile',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'notes': '',
                    'active': True,
                    'set_id': set_id
                })
            
            return {"success": True, "data": components}
        
        # Fallback to regular assignments if not Europcar
        assignments = await db.set_assignments.find(
            {'set_id': set_id, 'active': True},
            {"_id": 0}
        ).to_list(length=None)
        
        # Enrich with device details
        enriched_assignments = []
        for assignment in assignments:
            device = await db.hardware_devices.find_one(
                {'id': assignment['device_id']},
                {"_id": 0}
            )
            if device:
                enriched_assignments.append({
                    **assignment,
                    **device
                })
        
        return {"success": True, "data": enriched_assignments}
    except Exception as e:
        print(f"[Hardware] Error fetching assignments for set {set_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== HARDWARE DEVICES ====================

@router.get("/devices", response_model=List[HardwareDevice])
async def get_all_devices(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    hardware_type: Optional[str] = None,
    set_id: Optional[str] = None,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all hardware devices with optional filters"""
    try:
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if status:
            query['current_status'] = status
        if hardware_type:
            query['hardware_type'] = hardware_type
        if set_id:
            query['current_set_id'] = set_id
        if location_id:
            query['current_location_id'] = location_id
        
        devices = await db.hardware_devices.find(query, {"_id": 0}).sort('created_at', -1).to_list(length=None)
        return devices
    except Exception as e:
        print(f"[Hardware] Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def global_search(
    query: str,
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Global search across sets, devices, locations, and serial numbers"""
    try:
        if not query or len(query) < 2:
            return {
                "sets": [],
                "devices": [],
                "locations": [],
                "total_results": 0
            }
        
        search_pattern = {"$regex": query, "$options": "i"}
        base_query = {}
        if tenant_id:
            base_query['tenant_id'] = tenant_id
        
        # Search in hardware sets
        set_query = {**base_query, "$or": [
            {"set_name": search_pattern},
            {"full_code": search_pattern},
            {"location_code": search_pattern},
            {"notes": search_pattern}
        ]}
        sets = await db.hardware_sets.find(set_query, {"_id": 0}).limit(20).to_list(length=None)
        
        # Search in devices
        device_query = {**base_query, "$or": [
            {"serial_number": search_pattern},
            {"hardware_type": search_pattern},
            {"manufacturer": search_pattern},
            {"model": search_pattern},
            {"notes": search_pattern}
        ]}
        devices = await db.hardware_devices.find(device_query, {"_id": 0}).limit(20).to_list(length=None)
        
        # Search in locations (from tenant_locations collection)
        location_query = {}
        if tenant_id:
            location_query['tenant_id'] = tenant_id
        location_query["$or"] = [
            {"location_code": search_pattern},
            {"station_name": search_pattern},
            {"city": search_pattern},
            {"postal_code": search_pattern},
            {"street": search_pattern}
        ]
        locations = await db.tenant_locations.find(location_query, {"_id": 0}).limit(20).to_list(length=None)
        
        total_results = len(sets) + len(devices) + len(locations)
        
        return {
            "sets": sets,
            "devices": devices,
            "locations": locations,
            "total_results": total_results,
            "query": query
        }
    except Exception as e:
        print(f"[Hardware] Error in global search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/search/{serial_number}")
async def search_device_by_serial(
    serial_number: str,
    token_data: dict = Depends(verify_token)
):
    """Search device by serial number"""
    try:
        device = await db.hardware_devices.find_one(
            {'serial_number': serial_number},
            {"_id": 0}
        )
        
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        # Get set info if assigned
        set_info = None
        if device.get('current_set_id'):
            set_info = await db.hardware_sets.find_one(
                {'id': device['current_set_id']},
                {"_id": 0}
            )
        
        return {
            "device": device,
            "set": set_info
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error searching device {serial_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/{device_id}", response_model=HardwareDevice)
async def get_device(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get single hardware device by ID"""
    try:
        device = await db.hardware_devices.find_one({'id': device_id}, {"_id": 0})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        return device
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error fetching device {device_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/devices", response_model=HardwareDevice)
async def create_device(
    device_data: HardwareDeviceCreate,
    token_data: dict = Depends(verify_token)
):
    """Create new hardware device"""
    try:
        # Check if serial number already exists for this tenant
        existing = await db.hardware_devices.find_one({
            'tenant_id': device_data.tenant_id,
            'serial_number': device_data.serial_number
        })
        if existing:
            raise HTTPException(status_code=400, detail="Seriennummer bereits vorhanden")
        
        # Generate barcode
        barcode_data = generate_barcode(device_data.serial_number)
        
        new_device = HardwareDevice(
            tenant_id=device_data.tenant_id,
            serial_number=device_data.serial_number,
            hardware_type=device_data.hardware_type,
            manufacturer=device_data.manufacturer,
            model=device_data.model,
            purchase_date=device_data.purchase_date,
            warranty_until=device_data.warranty_until,
            warranty_reminder_days=device_data.warranty_reminder_days,
            notes=device_data.notes,
            barcode=barcode_data
        )
        
        await db.hardware_devices.insert_one(new_device.model_dump())
        
        # Add history entry
        await add_device_history(
            device_id=new_device.id,
            action_type='created',
            performed_by=token_data.get('email', 'admin'),
            notes=f"Gerät erstellt: {device_data.hardware_type}"
        )
        
        print(f"[Hardware] Created device: {new_device.id} - {new_device.serial_number}")
        
        return new_device
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error creating device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/devices/{device_id}", response_model=HardwareDevice)
async def update_device(
    device_id: str,
    update_data: HardwareDeviceUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update hardware device"""
    try:
        existing_device = await db.hardware_devices.find_one({'id': device_id})
        if not existing_device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        update_dict = {'updated_at': datetime.now(timezone.utc).isoformat()}
        
        # Track changes for history
        changes = []
        
        if update_data.serial_number is not None and update_data.serial_number != existing_device.get('serial_number'):
            # Check if new serial number exists
            existing_sn = await db.hardware_devices.find_one({'serial_number': update_data.serial_number})
            if existing_sn and existing_sn['id'] != device_id:
                raise HTTPException(status_code=400, detail="Seriennummer bereits vorhanden")
            update_dict['serial_number'] = update_data.serial_number
            update_dict['barcode'] = generate_barcode(update_data.serial_number)
            changes.append(f"Seriennummer: {existing_device.get('serial_number')} → {update_data.serial_number}")
        
        if update_data.hardware_type is not None:
            update_dict['hardware_type'] = update_data.hardware_type
        if update_data.manufacturer is not None:
            update_dict['manufacturer'] = update_data.manufacturer
        if update_data.model is not None:
            update_dict['model'] = update_data.model
        if update_data.purchase_date is not None:
            update_dict['purchase_date'] = update_data.purchase_date
        if update_data.warranty_until is not None:
            update_dict['warranty_until'] = update_data.warranty_until
            await add_device_history(
                device_id=device_id,
                action_type='warranty_updated',
                performed_by=token_data.get('email', 'admin'),
                old_value=existing_device.get('warranty_until'),
                new_value=update_data.warranty_until
            )
        if update_data.warranty_reminder_days is not None:
            update_dict['warranty_reminder_days'] = update_data.warranty_reminder_days
        if update_data.current_status is not None and update_data.current_status != existing_device.get('current_status'):
            old_status = existing_device.get('current_status')
            update_dict['current_status'] = update_data.current_status
            await add_device_history(
                device_id=device_id,
                action_type='status_change',
                performed_by=token_data.get('email', 'admin'),
                old_value=old_status,
                new_value=update_data.current_status
            )
        if update_data.notes is not None:
            update_dict['notes'] = update_data.notes
        
        await db.hardware_devices.update_one({'id': device_id}, {'$set': update_dict})
        
        if changes:
            await add_device_history(
                device_id=device_id,
                action_type='notes_updated',
                performed_by=token_data.get('email', 'admin'),
                notes=", ".join(changes)
            )
        
        updated_device = await db.hardware_devices.find_one({'id': device_id}, {"_id": 0})
        print(f"[Hardware] Updated device: {device_id}")
        
        return updated_device
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error updating device {device_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete hardware device (only if not in active set)"""
    try:
        device = await db.hardware_devices.find_one({'id': device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        if device.get('current_set_id'):
            raise HTTPException(
                status_code=400,
                detail="Gerät ist einem aktiven Set zugeordnet. Bitte zuerst entfernen."
            )
        
        result = await db.hardware_devices.delete_one({'id': device_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        # Delete history
        await db.device_history.delete_many({'device_id': device_id})
        
        print(f"[Hardware] Deleted device: {device_id}")
        return {"success": True, "message": "Gerät gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error deleting device {device_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SET ASSIGNMENTS ====================

@router.post("/sets/{set_id}/assign")
async def assign_device_to_set(
    set_id: str,
    assign_data: AssignDeviceToSet,
    token_data: dict = Depends(verify_token)
):
    """Assign device to a set"""
    try:
        # Verify set exists
        hw_set = await db.hardware_sets.find_one({'id': set_id})
        if not hw_set:
            raise HTTPException(status_code=404, detail="Hardware-Set nicht gefunden")
        
        # Verify device exists
        device = await db.hardware_devices.find_one({'id': assign_data.device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
        
        # Check if device is already in a set
        if device.get('current_set_id'):
            raise HTTPException(
                status_code=400,
                detail=f"Gerät ist bereits Set {device.get('current_set_id')} zugeordnet"
            )
        
        # Create assignment
        assignment = SetAssignment(
            device_id=assign_data.device_id,
            set_id=set_id,
            assigned_by=token_data.get('email', 'admin')
        )
        await db.set_assignments.insert_one(assignment.model_dump())
        
        # Update device
        await db.hardware_devices.update_one(
            {'id': assign_data.device_id},
            {
                '$set': {
                    'current_set_id': set_id,
                    'current_location_id': hw_set['location_id'],
                    'current_status': 'aktiv',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Add history
        await add_device_history(
            device_id=assign_data.device_id,
            action_type='assigned_to_set',
            performed_by=token_data.get('email', 'admin'),
            set_id=set_id,
            location_id=hw_set['location_id'],
            notes=assign_data.notes
        )
        
        print(f"[Hardware] Assigned device {assign_data.device_id} to set {set_id}")
        
        return {"success": True, "message": "Gerät erfolgreich zugeordnet"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error assigning device to set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sets/{set_id}/remove")
async def remove_device_from_set(
    set_id: str,
    remove_data: RemoveDeviceFromSet,
    token_data: dict = Depends(verify_token)
):
    """Remove device from a set"""
    try:
        # Find active assignment
        assignment = await db.set_assignments.find_one({
            'set_id': set_id,
            'device_id': remove_data.device_id,
            'active': True
        })
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Zuordnung nicht gefunden")
        
        # Update assignment
        await db.set_assignments.update_one(
            {'id': assignment['id']},
            {
                '$set': {
                    'removed_date': datetime.now(timezone.utc).isoformat(),
                    'removal_reason': remove_data.removal_reason,
                    'active': False
                }
            }
        )
        
        # Update device (back to warehouse)
        await db.hardware_devices.update_one(
            {'id': remove_data.device_id},
            {
                '$set': {
                    'current_set_id': None,
                    'current_location_id': None,
                    'current_status': 'verfügbar_lager',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Add history
        await add_device_history(
            device_id=remove_data.device_id,
            action_type='removed_from_set',
            performed_by=token_data.get('email', 'admin'),
            set_id=set_id,
            notes=f"Entfernt: {remove_data.removal_reason}"
        )
        
        print(f"[Hardware] Removed device {remove_data.device_id} from set {set_id}")
        
        return {"success": True, "message": "Gerät erfolgreich entfernt"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error removing device from set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sets/{set_id}/devices")
async def get_set_devices(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all devices in a set"""
    try:
        # First check if this is an Europcar set
        hardware_set = await db.hardware_sets.find_one({'id': set_id}, {"_id": 0})
        
        if not hardware_set:
            return []
        
        # Check if this is an Europcar set by looking for the device in europcar_devices
        full_code = hardware_set.get('full_code') or hardware_set.get('device_number')
        europcar_device = None
        
        if full_code:
            europcar_device = await multi_tenant_db.europcar_devices.find_one(
                {'device_id': full_code},
                {"_id": 0}
            )
        
        # If we found europcar device data, extract components from it
        if europcar_device:
            components = []
            
            # Extract PC component
            if europcar_device.get('sn_pc'):
                components.append({
                    'id': f"{europcar_device['device_id']}_PC",
                    'device_id': f"{europcar_device['device_id']}_PC",
                    'device_type': 'PC',
                    'hardware_type': 'PC',
                    'serial_number': europcar_device['sn_pc'],
                    'manufacturer': 'PC',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'current_set_id': set_id,
                    'notes': ''
                })
            
            # Extract Scanner component
            if europcar_device.get('sn_sc'):
                components.append({
                    'id': f"{europcar_device['device_id']}_SC",
                    'device_id': f"{europcar_device['device_id']}_SC",
                    'device_type': 'Scanner',
                    'hardware_type': 'Scanner',
                    'serial_number': europcar_device['sn_sc'],
                    'manufacturer': 'Scanner',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'current_set_id': set_id,
                    'notes': ''
                })
            
            # Extract IMEI if exists
            if europcar_device.get('imei_1'):
                components.append({
                    'id': f"{europcar_device['device_id']}_IMEI1",
                    'device_id': f"{europcar_device['device_id']}_IMEI1",
                    'device_type': 'Mobile Device',
                    'hardware_type': 'Mobile',
                    'serial_number': europcar_device['imei_1'],
                    'manufacturer': 'Mobile',
                    'model': '',
                    'status': europcar_device.get('status', 'unbekannt'),
                    'current_status': europcar_device.get('status', 'unbekannt'),
                    'current_set_id': set_id,
                    'notes': ''
                })
            
            return components
        
        # Fallback to regular devices if not Europcar
        devices = await db.hardware_devices.find(
            {'current_set_id': set_id},
            {"_id": 0}
        ).to_list(length=None)
        
        return devices
    except Exception as e:
        print(f"[Hardware] Error fetching set devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DEVICE REPLACEMENT ====================

@router.post("/replace")
async def replace_device(
    replace_data: ReplaceDeviceRequest,
    token_data: dict = Depends(verify_token)
):
    """Replace a defective device with a new one"""
    try:
        # Verify both devices exist
        defective = await db.hardware_devices.find_one({'id': replace_data.defective_device_id})
        replacement = await db.hardware_devices.find_one({'id': replace_data.replacement_device_id})
        
        if not defective:
            raise HTTPException(status_code=404, detail="Defektes Gerät nicht gefunden")
        if not replacement:
            raise HTTPException(status_code=404, detail="Ersatzgerät nicht gefunden")
        
        if not defective.get('current_set_id'):
            raise HTTPException(status_code=400, detail="Defektes Gerät ist keinem Set zugeordnet")
        
        if replacement.get('current_set_id'):
            raise HTTPException(status_code=400, detail="Ersatzgerät ist bereits einem Set zugeordnet")
        
        set_id = defective['current_set_id']
        location_id = defective['current_location_id']
        
        # Create replacement record
        replacement_record = DeviceReplacement(
            defective_device_id=replace_data.defective_device_id,
            replacement_device_id=replace_data.replacement_device_id,
            set_id=set_id,
            location_id=location_id,
            reason=replace_data.reason,
            replaced_by=token_data.get('email', 'admin')
        )
        await db.device_replacements.insert_one(replacement_record.model_dump())
        
        # End assignment of defective device
        await db.set_assignments.update_one(
            {
                'device_id': replace_data.defective_device_id,
                'set_id': set_id,
                'active': True
            },
            {
                '$set': {
                    'removed_date': datetime.now(timezone.utc).isoformat(),
                    'removal_reason': f"Defekt: {replace_data.reason}",
                    'active': False
                }
            }
        )
        
        # Create new assignment for replacement
        new_assignment = SetAssignment(
            device_id=replace_data.replacement_device_id,
            set_id=set_id,
            assigned_by=token_data.get('email', 'admin')
        )
        await db.set_assignments.insert_one(new_assignment.model_dump())
        
        # Update defective device
        await db.hardware_devices.update_one(
            {'id': replace_data.defective_device_id},
            {
                '$set': {
                    'current_set_id': None,
                    'current_location_id': None,
                    'current_status': 'defekt',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update replacement device
        await db.hardware_devices.update_one(
            {'id': replace_data.replacement_device_id},
            {
                '$set': {
                    'current_set_id': set_id,
                    'current_location_id': location_id,
                    'current_status': 'aktiv',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Add history for both devices
        await add_device_history(
            device_id=replace_data.defective_device_id,
            action_type='replaced',
            performed_by=token_data.get('email', 'admin'),
            set_id=set_id,
            location_id=location_id,
            notes=f"Ersetzt durch {replacement['serial_number']}: {replace_data.reason}",
            metadata={'replacement_device_id': replace_data.replacement_device_id}
        )
        
        await add_device_history(
            device_id=replace_data.replacement_device_id,
            action_type='assigned_to_set',
            performed_by=token_data.get('email', 'admin'),
            set_id=set_id,
            location_id=location_id,
            notes=f"Ersatz für {defective['serial_number']}: {replace_data.reason}",
            metadata={'replaced_device_id': replace_data.defective_device_id}
        )
        
        print(f"[Hardware] Replaced device {replace_data.defective_device_id} with {replace_data.replacement_device_id}")
        
        return {"success": True, "message": "Gerät erfolgreich ausgetauscht"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hardware] Error replacing device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DEVICE HISTORY ====================

@router.get("/devices/{device_id}/history")
async def get_device_history(
    device_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get complete history for a device"""
    try:
        history = await db.device_history.find(
            {'device_id': device_id},
            {"_id": 0}
        ).sort('timestamp', -1).to_list(length=None)
        
        return history
    except Exception as e:
        print(f"[Hardware] Error fetching device history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STATISTICS & DASHBOARD ====================

@router.get("/stats/dashboard")
async def get_dashboard_stats(
    token_data: dict = Depends(verify_token)
):
    """Get dashboard statistics"""
    try:
        total_sets = await db.hardware_sets.count_documents({})
        active_sets = await db.hardware_sets.count_documents({'status': 'aktiv'})
        
        total_devices = await db.hardware_devices.count_documents({})
        active_devices = await db.hardware_devices.count_documents({'current_status': 'aktiv'})
        warehouse_devices = await db.hardware_devices.count_documents({'current_status': 'verfügbar_lager'})
        defective_devices = await db.hardware_devices.count_documents({'current_status': 'defekt'})
        
        # Devices by type
        pipeline = [
            {"$group": {"_id": "$hardware_type", "count": {"$sum": 1}}}
        ]
        devices_by_type = await db.hardware_devices.aggregate(pipeline).to_list(length=None)
        
        return {
            "total_sets": total_sets,
            "active_sets": active_sets,
            "total_devices": total_devices,
            "active_devices": active_devices,
            "warehouse_devices": warehouse_devices,
            "defective_devices": defective_devices,
            "devices_by_type": devices_by_type
        }
    except Exception as e:
        print(f"[Hardware] Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
