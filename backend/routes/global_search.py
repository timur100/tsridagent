from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pymongo import MongoClient
import os
from routes.portal_auth import verify_token
import re

router = APIRouter(prefix="/api/search", tags=["Global Search"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
admin_db = mongo_client['multi_tenant_admin']
portal_db = mongo_client['portal_db']

@router.get("/global")
async def global_search(
    query: str,
    token_data: dict = Depends(verify_token)
):
    """
    Global search across devices, locations, and other entities
    Supports multi-tenant search for admins
    """
    try:
        print(f"[Global Search] Query: {query}")
        
        search_term = query.strip()
        if not search_term or len(search_term) < 2:
            return {
                "success": True,
                "query": search_term,
                "total": 0,
                "results": {
                    "geraete": [],
                    "standorte": [],
                    "bestellungen": []
                }
            }
        
        # Get user info from token
        user_role = token_data.get("role", "customer")
        user_tenant_ids = token_data.get("tenant_ids", [])
        
        print(f"[Global Search] User role: {user_role}, Tenant IDs: {user_tenant_ids}")
        
        # Create regex for partial matching
        search_regex = {"$regex": search_term, "$options": "i"}
        
        # Initialize results
        geraete_results = []
        standorte_results = []
        
        # 1. Search Devices (HIGH PRIORITY)
        device_query = {
            "$or": [
                {"device_id": search_regex},
                {"locationcode": search_regex},
                {"sn_pc": search_regex},
                {"sn_sc": search_regex}
            ]
        }
        
        devices = []
        if user_role == "admin":
            # Admin: search all devices across all tenants
            print(f"[Global Search] Admin search - all devices")
            devices = list(admin_db.europcar_devices.find(device_query).limit(50))
        elif user_tenant_ids:
            # Customer: only their tenant's devices
            device_query["tenant_id"] = {"$in": user_tenant_ids}
            print(f"[Global Search] Customer search - tenant devices: {user_tenant_ids}")
            devices = list(admin_db.europcar_devices.find(device_query).limit(50))
        
        print(f"[Global Search] Found {len(devices)} devices")
        
        # Process device results
        seen_device_ids = set()
        for device in devices:
            device_id = device.get('device_id')
            if device_id and device_id not in seen_device_ids:
                seen_device_ids.add(device_id)
                if '_id' in device:
                    del device['_id']
                geraete_results.append({
                    "type": "geraet",
                    "id": device_id,
                    "title": device_id,
                    "subtitle": f"Standort: {device.get('locationcode', 'N/A')} | Status: {device.get('status', 'Unbekannt')}",
                    "status": device.get('status'),
                    "tenant_id": device.get('tenant_id'),
                    "data": device
                })
        
        # 2. Search Locations (HIGH PRIORITY)
        location_query = {
            "$or": [
                {"location_code": search_regex},
                {"station_name": search_regex},
                {"city": search_regex},
                {"zip": search_term},
                {"location_id": search_regex}
            ]
        }
        
        locations = []
        if user_role == "admin":
            # Admin: search all locations across all tenants
            print(f"[Global Search] Admin search - all locations")
            locations = list(portal_db.tenant_locations.find(location_query).limit(50))
        elif user_tenant_ids:
            # Customer: only their tenant's locations
            location_query["tenant_id"] = {"$in": user_tenant_ids}
            print(f"[Global Search] Customer search - tenant locations: {user_tenant_ids}")
            locations = list(portal_db.tenant_locations.find(location_query).limit(50))
        
        print(f"[Global Search] Found {len(locations)} locations")
        
        # Process location results
        for location in locations:
            if '_id' in location:
                del location['_id']
            standorte_results.append({
                "type": "standort",
                "id": location.get('location_id'),
                "title": location.get('station_name', location.get('location_code', 'N/A')),
                "subtitle": f"{location.get('city', 'N/A')} | {location.get('location_code', 'N/A')}",
                "status": location.get('status'),
                "tenant_id": location.get('tenant_id'),
                "data": location
            })
        
        # Calculate total
        total_results = len(geraete_results) + len(standorte_results)
        
        print(f"[Global Search] Total results: {total_results} (Devices: {len(geraete_results)}, Locations: {len(standorte_results)})")
        
        return {
            "success": True,
            "query": search_term,
            "total": total_results,
            "results": {
                "geraete": geraete_results[:25],  # Limit to 25
                "standorte": standorte_results[:25],  # Limit to 25
                "bestellungen": []  # Placeholder for future
            }
        }
    
    except Exception as e:
        print(f"[Global Search] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
