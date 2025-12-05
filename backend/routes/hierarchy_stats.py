"""
Hierarchy Statistics API
Provides aggregated statistics for any level of the tenant hierarchy
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/hierarchy-stats", tags=["hierarchy-stats"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
tsrid_db = client['tsrid_db']
portal_db = client['portal_db']
auth_db = client['auth_db']
device_db = client['device_db']
multi_tenant_admin = client['multi_tenant_admin']

async def get_all_child_tenant_ids(parent_tenant_id: Optional[str] = None):
    """
    Get all tenant IDs that are children/descendants of the given tenant
    If parent_tenant_id is None, returns all organization-level tenants
    """
    if parent_tenant_id is None:
        # Get all organizations
        orgs = await tsrid_db.tenants.find({
            'tenant_level': 'organization'
        }, {'_id': 0, 'tenant_id': 1}).to_list(1000)
        return [org['tenant_id'] for org in orgs]
    
    # Get the parent tenant to check if it exists
    parent = await tsrid_db.tenants.find_one({'tenant_id': parent_tenant_id})
    if not parent:
        return []
    
    # If parent is a location (leaf node), return just itself
    if parent.get('tenant_level') == 'location':
        return [parent_tenant_id]
    
    # Get all descendants recursively
    all_ids = [parent_tenant_id]
    children = await tsrid_db.tenants.find({
        'parent_tenant_id': parent_tenant_id
    }, {'_id': 0, 'tenant_id': 1}).to_list(1000)
    
    for child in children:
        child_ids = await get_all_child_tenant_ids(child['tenant_id'])
        all_ids.extend(child_ids)
    
    return all_ids

@router.get("/{tenant_id}")
async def get_hierarchy_stats(tenant_id: str):
    """
    Get aggregated statistics for a specific tenant and all its children
    If tenant_id is 'all', returns stats for all organizations
    """
    try:
        # Get all relevant tenant IDs
        if tenant_id == 'all':
            tenant_ids = await get_all_child_tenant_ids(None)
        else:
            tenant_ids = await get_all_child_tenant_ids(tenant_id)
        
        if not tenant_ids:
            return {
                'success': False,
                'message': 'Tenant not found'
            }
        
        # Get tenant info
        if tenant_id != 'all':
            tenant_info = await tsrid_db.tenants.find_one({
                'tenant_id': tenant_id
            }, {'_id': 0})
        else:
            tenant_info = {
                'tenant_id': 'all',
                'name': 'Alle Tenants',
                'tenant_level': 'all'
            }
        
        # Count organizations
        org_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'organization'
        })
        
        # Count continents
        continent_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'continent'
        })
        
        # Count countries
        country_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'country'
        })
        
        # Count states/regions
        state_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'state'
        })
        
        # Count cities
        city_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'city'
        })
        
        # Count locations (actual locations in hierarchy)
        location_count = await tsrid_db.tenants.count_documents({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'location'
        })
        
        # Count actual physical locations in portal_db
        # Need to find the root organization to count physical locations
        # Get all organizations from the tenant_ids
        org_ids = []
        for tid in tenant_ids:
            # Find the tenant
            tenant = await tsrid_db.tenants.find_one({'tenant_id': tid})
            if tenant:
                # Traverse up to find organization
                current = tenant
                while current and current.get('parent_tenant_id'):
                    parent = await tsrid_db.tenants.find_one({'tenant_id': current['parent_tenant_id']})
                    if parent:
                        current = parent
                    else:
                        break
                
                # current is now the root (organization)
                if current.get('tenant_level') == 'organization' and current['tenant_id'] not in org_ids:
                    org_ids.append(current['tenant_id'])
        
        # If no org found, use the tenant_ids directly (they might be orgs)
        if not org_ids:
            org_ids = [tid for tid in tenant_ids]
        
        # Determine if we're looking at the org level or a sub-level
        is_org_level = any(
            tenant_ids[0] == oid for oid in org_ids
        ) if tenant_ids and org_ids else False
        
        # Physical locations logic:
        # - If at organization level: count all locations for that org
        # - If at sub-level (continent/country/state/city): use hierarchy location count
        if is_org_level and org_ids:
            physical_locations = await portal_db.tenant_locations.count_documents({
                'tenant_id': {'$in': org_ids}
            })
        else:
            # For sub-levels, use the hierarchy location count
            physical_locations = location_count
        
        # Count devices from multiple sources
        device_count = 0
        
        # Get all location codes from the selected hierarchy
        location_tenants = await tsrid_db.tenants.find({
            'tenant_id': {'$in': tenant_ids},
            'tenant_level': 'location'
        }, {'_id': 0, 'location_code': 1}).to_list(1000)
        
        location_codes = [lt.get('location_code') for lt in location_tenants if lt.get('location_code')]
        
        # 1. Count devices from multi_tenant_admin.europcar_devices (main source)
        # This has devices in format: AAHC01-01, AAHC01-02, etc.
        # Field is 'locationcode' (lowercase, one word)
        
        # Device counting logic:
        # - If at organization level: count all devices for that org
        # - If at sub-level with locations: count devices for those specific locations
        # - If at sub-level WITHOUT locations: 0 devices
        
        if location_codes:
            # For specific locations, count devices with matching locationcode
            devices_by_location = await multi_tenant_admin.europcar_devices.count_documents({
                'locationcode': {'$in': location_codes}
            })
            device_count = devices_by_location
        elif is_org_level and org_ids:
            # Only at organization level, count all devices with that tenant_id
            devices_europcar = await multi_tenant_admin.europcar_devices.count_documents({
                'tenant_id': {'$in': org_ids}
            })
            device_count = devices_europcar
        else:
            # Sub-level without locations = 0 devices
            device_count = 0
        
        # 2. Fallback: Count from portal_db.tenant_devices (legacy)
        if device_count == 0 and org_ids:
            devices_portal = await portal_db.tenant_devices.count_documents({
                'tenant_id': {'$in': org_ids}
            })
            device_count += devices_portal
        
        # 3. Fallback: Count from device_db.devices (legacy)
        if device_count == 0 and location_codes:
            devices_location = await device_db.devices.count_documents({
                'location_code': {'$in': location_codes}
            })
            device_count += devices_location
        
        # Count users from auth_db
        # Users are typically stored at organization level, so use org_ids
        user_count = 0
        if org_ids:
            for oid in org_ids:
                users = await auth_db.users.count_documents({
                    'tenant_id': oid
                })
                user_count += users
        else:
            # Fallback to tenant_ids
            for tid in tenant_ids:
                users = await auth_db.users.count_documents({
                    'tenant_id': tid
                })
                user_count += users
        
        return {
            'success': True,
            'data': {
                'tenant_info': tenant_info,
                'hierarchy': {
                    'organizations': org_count,
                    'continents': continent_count,
                    'countries': country_count,
                    'states': state_count,
                    'cities': city_count,
                    'locations': location_count
                },
                'physical_assets': {
                    'physical_locations': physical_locations,
                    'devices': device_count,
                    'users': user_count
                },
                'scope': {
                    'tenant_ids_count': len(tenant_ids),
                    'selected_level': tenant_info.get('tenant_level', 'all')
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
