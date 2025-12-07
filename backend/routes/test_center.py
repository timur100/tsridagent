"""
Test Center API Routes - Data Validation and Testing
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/test-center", tags=["Test Center"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']
multi_tenant_db = client['multi_tenant_admin']
tsrid_db = client['tsrid_db']


class DataCheckRequest(BaseModel):
    serial_numbers: List[str]

class SetIDConfigPart(BaseModel):
    key: str
    label: str
    description: str
    example: str

class SetTypeComponent(BaseModel):
    type: str
    label: str
    pattern: str
    example: str

class SetType(BaseModel):
    id: str
    name: str
    description: str
    components: List[SetTypeComponent]

class SetIDConfig(BaseModel):
    format: str

import re

async def get_set_id_config():
    """Get Set-ID configuration from database"""
    config = await db.setid_config.find_one(
        {'config_type': 'default'},
        {'_id': 0}
    )
    return config

async def identify_set_type(serial_numbers, config):
    """
    Identify set type based on serial number patterns
    Returns: (set_type_id, matched_components) or (None, {})
    """
    if not config or 'setTypes' not in config:
        return None, {}
    
    for set_type in config['setTypes']:
        matched = {}
        for component in set_type['components']:
            pattern = component['pattern']
            comp_type = component['type']
            
            # Try to match any serial number against this pattern
            for sn in serial_numbers:
                sn_clean = sn.strip()
                try:
                    if re.match(pattern, sn_clean):
                        matched[comp_type] = sn_clean
                        break
                except:
                    pass
        
        # If we matched all required components, return this set type
        required_types = set(comp['type'] for comp in set_type['components'])
        if matched and set(matched.keys()) == required_types:
            return set_type['id'], matched
    
    return None, {}

async def generate_set_id(location_code, set_number, set_type_id, config):
    """
    Generate Set-ID based on configuration
    Example: BERT01-01-S1
    """
    if not config:
        return None
    
    separator = config.get('separator', '-')
    parts = config.get('parts', [])
    
    # Build Set-ID from parts
    id_parts = []
    for part in parts:
        key = part.get('key', '')
        if key == 'LOCATIONCODE':
            id_parts.append(location_code)
        elif key == 'SETNUMBER':
            id_parts.append(set_number)
        elif key == 'SETTYPE':
            id_parts.append(set_type_id or '')
    
    return separator.join(filter(None, id_parts))

    parts: List[SetIDConfigPart]
    separator: str
    setTypes: List[SetType] = []



@router.post("/data-check")
async def run_data_check(
    request: DataCheckRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Validate device and location data, check serial numbers
    
    Categories:
    - correct: Valid data, correct assignments
    - incorrect: Invalid data, incorrect assignments
    - unused: Serial number not found in database
    - closed_location: Device at closed location
    - defective: Device marked as defective
    - in_warehouse: Device in warehouse/storage
    """
    try:
        results = {
            'correct': [],
            'incorrect': [],
            'unused': [],
            'closed_location': [],
            'defective': [],
            'in_warehouse': []
        }
        
        # Get Set-ID configuration
        setid_config = await get_set_id_config()
        
        # Get all locations to check if closed
        locations = await tsrid_db.tenants.find(
            {'tenant_level': 'location'},
            {'_id': 0, 'location_code': 1, 'status': 1, 'display_name': 1, 'name': 1}
        ).to_list(length=None)
        
        location_map = {
            loc['location_code']: {
                'status': loc.get('status', 'unknown'),
                'name': loc.get('display_name') or loc.get('name')
            }
            for loc in locations if loc.get('location_code')
        }
        
        # Group serial numbers by device (to identify sets)
        # This will be used to identify which serials belong to same set
        device_groups = {}
        
        # Process each serial number
        for serial_number in request.serial_numbers:
            sn_clean = serial_number.strip()
            if not sn_clean:
                continue
            
            found_in_europcar = False
            found_in_hardware = False
            
            # Check in Europcar devices FIRST (priority)
            europcar_devices = await multi_tenant_db.europcar_devices.find(
                {
                    '$or': [
                        {'sn_pc': {'$regex': sn_clean, '$options': 'i'}},
                        {'sn_sc': {'$regex': sn_clean, '$options': 'i'}},
                        {'imei_1': {'$regex': sn_clean, '$options': 'i'}}
                    ]
                },
                {'_id': 0}
            ).to_list(length=None)
            
            # Process Europcar devices
            for device in europcar_devices:
                found_in_europcar = True
                device_id = device.get('device_id')
                locationcode = device.get('locationcode')
                status = device.get('status', 'unknown')
                
                # Determine device type
                device_type = None
                if device.get('sn_pc') and sn_clean.lower() in device['sn_pc'].lower():
                    device_type = 'PC'
                elif device.get('sn_sc') and sn_clean.lower() in device['sn_sc'].lower():
                    device_type = 'Scanner'
                elif device.get('imei_1') and sn_clean.lower() in device['imei_1'].lower():
                    device_type = 'Mobile Device'
                
                # Get all serial numbers for this device (for Set-ID generation)
                device_serial_numbers = []
                if device.get('sn_pc'):
                    device_serial_numbers.append(device['sn_pc'])
                if device.get('sn_sc'):
                    device_serial_numbers.append(device['sn_sc'])
                
                # Identify set type and generate Set-ID
                set_type_id, matched_components = await identify_set_type(device_serial_numbers, setid_config)
                
                # Extract set number from device_id (e.g., "BERT01-01" -> "01")
                set_number = device_id.split('-')[-1] if device_id and '-' in device_id else '01'
                
                # Generate Set-ID
                set_id = await generate_set_id(locationcode, set_number, set_type_id, setid_config) if set_type_id else None
                
                result_entry = {
                    'serial_number': sn_clean,
                    'sn_scanner': device.get('sn_sc', ''),
                    'sn_pc': device.get('sn_pc', ''),
                    'set_id': set_id,
                    'device_type': device_type,
                    'location': f"{locationcode} - {location_map.get(locationcode, {}).get('name', 'Unknown')}",
                    'status': status,
                    'notes': f"Set: {device_id}"
                }
                
                # Categorize with improved logic
                location_info = location_map.get(locationcode, {})
                location_status = location_info.get('status', 'unknown')
                
                if status in ['defekt', 'defective']:
                    results['defective'].append(result_entry.copy())
                elif location_status in ['closed', 'inactive', 'geschlossen']:
                    results['closed_location'].append(result_entry.copy())
                elif status in ['verfügbar_lager', 'warehouse', 'lager']:
                    results['in_warehouse'].append(result_entry.copy())
                elif locationcode and device_id:
                    # Device has location and device_id = CORRECT (even if offline)
                    results['correct'].append(result_entry.copy())
                else:
                    results['incorrect'].append({
                        **result_entry,
                        'notes': f"Fehlende Zuordnung"
                    })
            
            # Only check hardware_devices if NOT found in Europcar (avoid duplicates)
            if not found_in_europcar:
                hardware_devices = await db.hardware_devices.find(
                    {'serial_number': {'$regex': sn_clean, '$options': 'i'}},
                    {'_id': 0}
                ).to_list(length=None)
                
                for device in hardware_devices:
                    found_in_hardware = True
                    device_type = device.get('hardware_type') or device.get('device_type')
                    location_id = device.get('current_location_id')
                    status = device.get('current_status', 'unknown')
                    
                    # Get location name
                    location_name = None
                    location_status = 'unknown'
                    if location_id:
                        location = await tsrid_db.tenants.find_one(
                            {'id': location_id},
                            {'_id': 0, 'display_name': 1, 'name': 1, 'location_code': 1, 'status': 1}
                        )
                        if location:
                            location_name = f"{location.get('location_code')} - {location.get('display_name') or location.get('name')}"
                            location_status = location.get('status', 'unknown')
                    
                    result_entry = {
                        'serial_number': sn_clean,
                        'device_type': device_type,
                        'location': location_name or 'Keine Zuordnung',
                        'status': status,
                        'notes': 'Aus Hardware-DB'
                    }
                    
                    # Categorize
                    if status in ['defekt', 'defective']:
                        results['defective'].append(result_entry.copy())
                    elif location_status in ['closed', 'inactive', 'geschlossen']:
                        results['closed_location'].append(result_entry.copy())
                    elif status in ['verfügbar_lager', 'warehouse', 'lager']:
                        results['in_warehouse'].append(result_entry.copy())
                    elif status in ['aktiv', 'active', 'im_einsatz'] and location_name:
                        results['correct'].append(result_entry.copy())
                    else:
                        results['incorrect'].append({
                            **result_entry,
                            'notes': 'Unvollständige Daten oder fehlende Standortzuordnung'
                        })
            
            # If not found anywhere
            if not found_in_europcar and not found_in_hardware:
                results['unused'].append({
                    'serial_number': sn_clean,
                    'device_type': None,
                    'location': None,
                    'status': 'Nicht gefunden',
                    'notes': 'Seriennummer existiert nicht in der Datenbank'
                })
        
        # Calculate summary
        summary = {
            'correct': len(results['correct']),
            'incorrect': len(results['incorrect']),
            'unused': len(results['unused']),
            'closed_location': len(results['closed_location']),
            'defective': len(results['defective']),
            'in_warehouse': len(results['in_warehouse'])
        }
        
        return {
            'success': True,
            'data': {
                'summary': summary,
                'results': results,
                'total_checked': len(request.serial_numbers),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        }
        
    except Exception as e:
        print(f"[TestCenter] Error in data check: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validation-stats")
async def get_validation_stats(
    token_data: dict = Depends(verify_token)
):
    """Get overall data validation statistics"""
    try:
        # Count devices by status
        europcar_total = await multi_tenant_db.europcar_devices.count_documents({})
        hardware_total = await db.hardware_devices.count_documents({})
        
        # Count locations
        active_locations = await tsrid_db.tenants.count_documents({
            'tenant_level': 'location',
            'status': {'$ne': 'closed'}
        })
        closed_locations = await tsrid_db.tenants.count_documents({
            'tenant_level': 'location',
            'status': 'closed'
        })
        
        # Count devices with issues
        defective_europcar = await multi_tenant_db.europcar_devices.count_documents({
            'status': {'$in': ['defekt', 'defective']}
        })
        defective_hardware = await db.hardware_devices.count_documents({
            'current_status': {'$in': ['defekt', 'defective']}
        })
        
        return {
            'success': True,
            'data': {
                'total_devices': {
                    'europcar': europcar_total,
                    'hardware': hardware_total,
                    'total': europcar_total + hardware_total
                },
                'locations': {
                    'active': active_locations,
                    'closed': closed_locations,
                    'total': active_locations + closed_locations
                },
                'issues': {
                    'defective_devices': defective_europcar + defective_hardware,
                    'closed_locations': closed_locations
                }
            }
        }
    except Exception as e:
        print(f"[TestCenter] Error getting validation stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/setid-config")
async def save_setid_config(
    config: SetIDConfig,
    token_data: dict = Depends(verify_token)
):
    """Save Set-ID format configuration"""
    try:
        config_data = {
            'format': config.format,
            'parts': [part.dict() for part in config.parts],
            'separator': config.separator,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': token_data.get('email', 'unknown')
        }
        
        # Upsert configuration (only one config document)
        await db.setid_config.update_one(
            {'config_type': 'default'},
            {'$set': config_data},
            upsert=True
        )
        
        return {
            'success': True,
            'message': 'Set-ID Konfiguration gespeichert',
            'data': config_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/setid-config")
async def get_setid_config(
    token_data: dict = Depends(verify_token)
):
    """Get Set-ID format configuration"""
    try:
        config = await db.setid_config.find_one(
            {'config_type': 'default'},
            {'_id': 0}
        )
        
        if not config:
            # Return default configuration
            default_config = {
                'format': 'LOCATIONCODE-SETNUMBER-SERIALNUMBER',
                'parts': [
                    {'key': 'LOCATIONCODE', 'label': 'Standortcode', 'description': 'z.B. BERT01', 'example': 'BERT01'},
                    {'key': 'SETNUMBER', 'label': 'Set-Nummer', 'description': 'z.B. 01', 'example': '01'},
                    {'key': 'SERIALNUMBER', 'label': 'Seriennummer', 'description': 'z.B. S1', 'example': 'S1'}
                ],
                'separator': '-'
            }
            return {
                'success': True,
                'data': default_config
            }
        
        return {
            'success': True,
            'data': config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

