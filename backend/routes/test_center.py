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
    licensed_serials: List[str] = []
    warehouse_serials: List[str] = []

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
    
    Strategy:
    - Try to match serial numbers to component patterns
    - If at least 2 main components (PC + Scanner) match, identify the set type
    """
    if not config or 'setTypes' not in config:
        return None, {}
    
    best_match = None
    best_match_count = 0
    
    for set_type in config['setTypes']:
        matched = {}
        match_score = 0
        
        for component in set_type['components']:
            pattern = component.get('pattern', '')
            if not pattern:
                continue
                
            comp_type = component['type']
            
            # Try to match any serial number against this pattern
            for sn in serial_numbers:
                if not sn:
                    continue
                sn_clean = str(sn).strip()
                try:
                    if re.match(pattern, sn_clean):
                        matched[comp_type] = sn_clean
                        # Higher score for PC and Scanner (main components)
                        if comp_type in ['PC', 'Scanner']:
                            match_score += 10
                        else:
                            match_score += 1
                        break
                except Exception as e:
                    print(f"[SetType] Pattern match error: {e}")
                    pass
        
        # Check if we have at least PC and Scanner matched
        has_pc = 'PC' in matched
        has_scanner = 'Scanner' in matched
        
        if (has_pc and has_scanner) and match_score > best_match_count:
            best_match = (set_type['id'], matched)
            best_match_count = match_score
    
    if best_match:
        print(f"[SetType] Identified: {best_match[0]} with {len(best_match[1])} components")
        return best_match
    
    return None, {}


async def calculate_device_statistics(results, config):
    """
    Calculate device statistics from validation results
    Returns counts of different device types and set completeness
    """
    stats = {
        'scanners': {'desko': 0, 'tsrid': 0, 'total': 0},
        'tablets': {'surface': 0, 'tsrid': 0, 'total': 0},
        'docking_stations': {'desko': 0, 'tsrid': 0, 'total': 0},
        'power_supplies': {'total': 0},
        'sets': {
            'complete': 0,
            'incomplete': 0,
            'total': 0
        }
    }
    
    # Group devices by device_id to analyze sets
    device_sets = {}
    all_items = []
    
    # Collect all items
    for category, items in results.items():
        all_items.extend(items)
    
    # Group by device_id (from notes field "Set: XXX")
    for item in all_items:
        notes = item.get('notes', '')
        if 'Set:' in notes:
            device_id = notes.replace('Set:', '').strip()
            if device_id not in device_sets:
                device_sets[device_id] = {
                    'items': [],
                    'has_pc': False,
                    'has_scanner': False,
                    'has_docking': False,
                    'has_power': False,
                    'set_id': item.get('set_id')
                }
            device_sets[device_id]['items'].append(item)
    
    # Analyze each set and count devices
    for device_id, set_data in device_sets.items():
        for item in set_data['items']:
            sn_pc = item.get('sn_pc', '')
            sn_scanner = item.get('sn_scanner', '')
            sn_docking = item.get('sn_docking', '')
            sn_power = item.get('sn_power', '')
            
            # Count PC/Tablets
            if sn_pc:
                set_data['has_pc'] = True
                # Detect type by pattern
                if re.match(r'^\d{12}$', sn_pc):
                    stats['tablets']['surface'] += 1
                elif re.match(r'^[A-Z0-9]{13}$', sn_pc):
                    stats['tablets']['tsrid'] += 1
                stats['tablets']['total'] += 1
            
            # Count Scanners
            if sn_scanner:
                set_data['has_scanner'] = True
                # Detect type by pattern
                if re.match(r'^\d{6}\s\d{5}$', sn_scanner):
                    stats['scanners']['desko'] += 1
                elif re.match(r'^[A-Z0-9]{13}$', sn_scanner):
                    stats['scanners']['tsrid'] += 1
                stats['scanners']['total'] += 1
            
            # Count Docking Stations
            if sn_docking:
                set_data['has_docking'] = True
                # Detect type by pattern
                if re.match(r'^\d{6}\s\d{5}$', sn_docking):
                    stats['docking_stations']['desko'] += 1
                elif re.match(r'^[A-Z0-9]{13}$', sn_docking):
                    stats['docking_stations']['tsrid'] += 1
                stats['docking_stations']['total'] += 1
            
            # Count Power Supplies
            if sn_power:
                set_data['has_power'] = True
                stats['power_supplies']['total'] += 1
    
    # Determine set completeness
    for device_id, set_data in device_sets.items():
        stats['sets']['total'] += 1
        
        # A complete set should have at least PC and Scanner
        is_complete = set_data['has_pc'] and set_data['has_scanner']
        
        if is_complete:
            stats['sets']['complete'] += 1
        else:
            stats['sets']['incomplete'] += 1
    
    return stats



def compare_serial_lists(main_serials, licensed_serials, warehouse_serials, results):
    """
    Compare three serial lists and return insights
    - Which devices have licenses
    - Which scanners are in warehouse vs. active
    - Missing items across lists
    """
    # Convert to sets for easy comparison
    main_set = set(sn.strip() for sn in main_serials if sn.strip())
    licensed_set = set(sn.strip() for sn in licensed_serials if sn.strip())
    warehouse_set = set(sn.strip() for sn in warehouse_serials if sn.strip())
    
    # Get all found devices from results
    found_devices = set()
    for category, items in results.items():
        for item in items:
            sn = item.get('serial_number', '').strip()
            if sn:
                found_devices.add(sn)
            # Also check component SNs
            for key in ['sn_pc', 'sn_scanner', 'sn_docking', 'sn_power']:
                comp_sn = item.get(key, '').strip()
                if comp_sn:
                    found_devices.add(comp_sn)
    
    comparison = {
        'licensed': {
            'total': len(licensed_set),
            'active': list(licensed_set & found_devices),
            'not_found': list(licensed_set - found_devices)
        },
        'warehouse': {
            'total': len(warehouse_set),
            'in_use': list(warehouse_set & found_devices),
            'available': list(warehouse_set - found_devices)
        },
        'cross_check': {
            'licensed_and_active': list(licensed_set & main_set),
            'licensed_but_not_active': list(licensed_set - main_set),
            'warehouse_but_active': list(warehouse_set & found_devices),
            'warehouse_and_not_in_main': list(warehouse_set - main_set)
        }
    }
    
    return comparison


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
                if device.get('sn_docking'):
                    device_serial_numbers.append(device['sn_docking'])
                if device.get('sn_power'):
                    device_serial_numbers.append(device['sn_power'])
                
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
                    'sn_docking': device.get('sn_docking', ''),
                    'sn_power': device.get('sn_power', ''),
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
        
        # Calculate device statistics
        device_stats = await calculate_device_statistics(results, setid_config)
        
        # Compare lists if additional lists provided
        comparison = None
        if request.licensed_serials or request.warehouse_serials:
            comparison = compare_serial_lists(
                request.serial_numbers,
                request.licensed_serials,
                request.warehouse_serials,
                results
            )
        
        return {
            'success': True,
            'data': {
                'summary': summary,
                'results': results,
                'device_stats': device_stats,
                'comparison': comparison,
                'total_checked': len(request.serial_numbers) + len(request.licensed_serials) + len(request.warehouse_serials),
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


@router.post("/ai-search")
async def ai_search(
    request: dict,
    token_data: dict = Depends(verify_token)
):
    """
    AI-powered natural language search for devices
    """
    try:
        query = request.get('query', '').lower()
        
        # Simple keyword-based search (can be enhanced with actual AI/NLP)
        search_keywords = {
            'surface': ['surface', 'microsoft', 'tablet'],
            'scanner': ['scanner', 'desko', 'tsrid'],
            'unvollständig': ['unvollständig', 'incomplete', 'fehlt'],
            'lizenz': ['lizenz', 'license', 'aktiviert'],
            'defekt': ['defekt', 'broken', 'kaputt'],
            'lager': ['lager', 'warehouse', 'verfügbar']
        }
        
        # Analyze query intent
        intent = []
        for category, keywords in search_keywords.items():
            if any(kw in query for kw in keywords):
                intent.append(category)
        
        # Get all devices for searching
        europcar_devices = await multi_tenant_db.europcar_devices.find(
            {},
            {'_id': 0}
        ).to_list(length=1000)
        
        # Filter based on intent
        filtered_results = []
        for device in europcar_devices:
            match = True
            
            if 'surface' in intent:
                sn_pc = device.get('sn_pc', '')
                if not (sn_pc and re.match(r'^\d{12}$', sn_pc)):
                    match = False
            
            if 'scanner' in intent:
                sn_sc = device.get('sn_sc', '')
                if not sn_sc:
                    match = False
            
            if 'unvollständig' in intent:
                has_pc = bool(device.get('sn_pc'))
                has_scanner = bool(device.get('sn_sc'))
                if has_pc and has_scanner:
                    match = False
            
            if match:
                filtered_results.append(device)
        
        # Generate interpretation
        interpretation_parts = []
        if 'surface' in intent:
            interpretation_parts.append("Surface-Geräte")
        if 'scanner' in intent:
            interpretation_parts.append("Scanner")
        if 'unvollständig' in intent:
            interpretation_parts.append("unvollständige Sets")
        
        interpretation = f"Suche nach: {', '.join(interpretation_parts) if interpretation_parts else 'alle Geräte'}"
        
        summary = f"Es wurden {len(filtered_results)} Geräte gefunden, die Ihren Kriterien entsprechen."
        
        return {
            'success': True,
            'data': {
                'interpretation': interpretation,
                'count': len(filtered_results),
                'summary': summary,
                'results': filtered_results[:50]  # Limit to 50 results
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-analysis")
async def ai_analysis(
    token_data: dict = Depends(verify_token)
):
    """
    Comprehensive AI-driven analysis of all devices and sets
    """
    try:
        # Get all devices
        europcar_devices = await multi_tenant_db.europcar_devices.find(
            {},
            {'_id': 0}
        ).to_list(length=None)
        
        hardware_devices = await tsrid_db.hardware.find(
            {},
            {'_id': 0}
        ).to_list(length=None)
        
        total_devices = len(europcar_devices) + len(hardware_devices)
        
        # Calculate health score
        complete_sets = 0
        incomplete_sets = 0
        
        for device in europcar_devices:
            has_pc = bool(device.get('sn_pc'))
            has_scanner = bool(device.get('sn_sc'))
            
            if has_pc and has_scanner:
                complete_sets += 1
            elif has_pc or has_scanner:
                incomplete_sets += 1
        
        total_sets = complete_sets + incomplete_sets
        health_score = int((complete_sets / total_sets * 100)) if total_sets > 0 else 0
        
        # Calculate optimization potential
        optimization_potential = int((incomplete_sets / total_sets * 100)) if total_sets > 0 else 0
        
        # Generate recommendations
        recommendations = []
        
        if incomplete_sets > 0:
            recommendations.append(f"{incomplete_sets} unvollständige Sets können durch Zuordnung fehlender Komponenten vervollständigt werden")
        
        if optimization_potential > 20:
            recommendations.append(f"Hohes Optimierungspotenzial: {optimization_potential}% der Sets sind unvollständig")
        
        # Check for devices without location
        no_location = sum(1 for d in europcar_devices if not d.get('locationcode'))
        if no_location > 0:
            recommendations.append(f"{no_location} Geräte haben keine Standort-Zuordnung")
        
        # Check for license optimization
        recommendations.append("Prüfen Sie, ob alle aktivierten Lizenzen tatsächlich genutzt werden")
        
        if not recommendations:
            recommendations.append("Ihre Geräteverwaltung ist optimal konfiguriert!")
        
        return {
            'success': True,
            'data': {
                'total_devices': total_devices,
                'health_score': health_score,
                'optimization_potential': optimization_potential,
                'complete_sets': complete_sets,
                'incomplete_sets': incomplete_sets,
                'recommendations': recommendations
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            'setTypes': [st.dict() for st in config.setTypes] if config.setTypes else [],
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': token_data.get('email', 'unknown'),
            'config_type': 'default'
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
                'format': 'LOCATIONCODE-SETNUMBER-SETTYPE',
                'parts': [
                    {'key': 'LOCATIONCODE', 'label': 'Standortcode', 'description': 'z.B. BERT01', 'example': 'BERT01'},
                    {'key': 'SETNUMBER', 'label': 'Set-Nummer', 'description': 'z.B. 01', 'example': '01'},
                    {'key': 'SETTYPE', 'label': 'Set-Typ', 'description': 'z.B. S1', 'example': 'S1'}
                ],
                'separator': '-',
                'setTypes': [
                    {
                        'id': 'S1',
                        'name': 'Microsoft Surface Set',
                        'description': 'Surface + Desko Scanner + Desko Dockingstation + Netzteile',
                        'components': [
                            {'type': 'PC', 'label': 'Microsoft Surface', 'pattern': '^\\d{12}$', 'example': '033341763753'},
                            {'type': 'Scanner', 'label': 'Desko Scanner', 'pattern': '^\\d{6}\\s\\d{5}$', 'example': '201743 00735'},
                            {'type': 'Dockingstation', 'label': 'Desko Dockingstation', 'pattern': '^\\d{6}\\s\\d{5}$', 'example': '201743 00736'},
                            {'type': 'Power_Surface', 'label': 'Netzteil Surface', 'pattern': '^\\d{12}$', 'example': '033341763754'},
                            {'type': 'Power_Scanner', 'label': 'Netzteil Desko Scanner', 'pattern': '^\\d{6}\\s\\d{5}$', 'example': '201743 00737'}
                        ]
                    },
                    {
                        'id': 'S2',
                        'name': 'TSRID Tablet Set',
                        'description': 'TSRID Tablet + TSRID Scanner + Dockingstation + Netzteile',
                        'components': [
                            {'type': 'PC', 'label': 'TSRID Tablet', 'pattern': '^[A-Z0-9]{13}$', 'example': '7E81054BA3550'},
                            {'type': 'Scanner', 'label': 'TSRID Scanner', 'pattern': '^[A-Z0-9]{13}$', 'example': '7E81054BA3559'},
                            {'type': 'Dockingstation', 'label': 'Dockingstation', 'pattern': '^[A-Z0-9]{13}$', 'example': '7E81054BA3560'},
                            {'type': 'Power_Tablet', 'label': 'Netzteil TSRID Tablet', 'pattern': '^[A-Z0-9]{13}$', 'example': '7E81054BA3561'},
                            {'type': 'Power_Scanner', 'label': 'Netzteil TSRID Scanner', 'pattern': '^[A-Z0-9]{13}$', 'example': '7E81054BA3562'}
                        ]
                    }
                ]
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

