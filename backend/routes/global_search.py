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
main_db = mongo_client['main_db']
tsrid_db = mongo_client['tsrid_db']
verification_db = mongo_client['verification_db']

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
        id_checks_results = []
        vehicles_results = []
        assets_results = []
        
        # 1. Search Devices (HIGH PRIORITY) - Search ALL fields
        device_query = {
            "$or": [
                {"device_id": search_regex},
                {"locationcode": search_regex},
                {"sn_pc": search_regex},
                {"sn_sc": search_regex},
                {"device_name": search_regex},
                {"status": search_regex},
                {"city": search_regex},
                {"country": search_regex},
                {"manager": search_regex},
                {"teamviewer_id": search_regex},
                {"tvid": search_regex}
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
        

        # 1.5. Search Assets (HIGH PRIORITY) - Search asset_id, name, serial_number
        asset_query = {
            "$or": [
                {"asset_id": search_regex},
                {"name": search_regex},
                {"serial_number": search_regex},
                {"device_id": search_regex},
                {"location": search_regex}
            ]
        }
        
        assets = []
        if user_role == "admin":
            # Admin: search all assets
            print(f"[Global Search] Admin search - all assets")
            assets = list(verification_db.assets.find(asset_query, {"_id": 0}).limit(50))
        elif user_tenant_ids:
            # Customer: only their tenant's assets
            asset_query["tenant_id"] = {"$in": user_tenant_ids}
            print(f"[Global Search] Customer search - tenant assets: {user_tenant_ids}")
            assets = list(verification_db.assets.find(asset_query, {"_id": 0}).limit(50))
        
        print(f"[Global Search] Found {len(assets)} assets")
        
        # Process asset results
        for asset in assets:
            asset_id = asset.get('asset_id')
            if asset_id:
                assets_results.append({
                    "type": "asset",
                    "id": asset_id,
                    "title": asset_id,
                    "subtitle": f"{asset.get('name', 'N/A')} | SN: {asset.get('serial_number', 'N/A')}",
                    "status": asset.get('status'),
                    "tenant_id": asset.get('tenant_id'),
                    "data": asset
                })

        # 2. Search Locations (HIGH PRIORITY) - Search ALL fields
        location_query = {
            "$or": [
                {"location_code": search_regex},
                {"station_name": search_regex},
                {"location_name": search_regex},
                {"city": search_regex},
                {"zip": search_term},
                {"location_id": search_regex},
                {"street": search_regex},
                {"country": search_regex},
                {"manager": search_regex},
                {"contact_name": search_regex},
                {"contact_email": search_regex},
                {"contact_phone": search_regex}
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
        
        # 3. Search Vehicles (R&D - Fahrzeugverwaltung) - Search ALL fields
        vehicles_query = {
            "$or": [
                {"license_plate": search_regex},
                {"brand": search_regex},
                {"model": search_regex},
                {"tenant_id": search_regex},
                {"vin": search_regex},
                {"color": search_regex},
                {"fuel_type": search_regex},
                {"status": search_regex},
                {"location": search_regex},
                {"notes": search_regex}
            ]
        }
        
        vehicles = []
        if user_role == "admin":
            # Admin: search all vehicles across all tenants
            print(f"[Global Search] Admin search - all vehicles")
            vehicles = list(tsrid_db.vehicles.find(vehicles_query).sort('created_at', -1).limit(50))
        
        print(f"[Global Search] Found {len(vehicles)} vehicles")
        
        # Process vehicle results
        for vehicle in vehicles:
            if '_id' in vehicle:
                del vehicle['_id']
            
            license_plate = vehicle.get('license_plate', 'N/A')
            brand = vehicle.get('brand', 'N/A')
            model = vehicle.get('model', 'N/A')
            year = vehicle.get('year', 'N/A')
            tenant_id = vehicle.get('tenant_id', 'N/A')
            
            vehicles_results.append({
                "type": "vehicle",
                "id": vehicle.get('id'),
                "title": f"{license_plate}",
                "subtitle": f"{brand} {model} ({year}) | Tenant: {tenant_id}",
                "status": vehicle.get('status', 'active'),
                "tenant_id": tenant_id,
                "license_plate": license_plate,
                "data": vehicle
            })
        
        # 4. Search ID-Checks - Search ALL fields
        id_checks_query = {
            "$or": [
                {"id": search_regex},
                {"tenant_name": search_regex},
                {"extracted_data.name": search_regex},
                {"extracted_data.surname": search_regex},
                {"extracted_data.document_number": search_regex},
                {"extracted_data.document_type": search_regex},
                {"extracted_data.nationality": search_regex},
                {"extracted_data.address": search_regex},
                {"extracted_data.city": search_regex},
                {"extracted_data.country": search_regex},
                {"status": search_regex},
                {"location_code": search_regex}
            ]
        }
        
        id_checks = []
        if user_role == "admin":
            # Admin: search all ID checks
            print(f"[Global Search] Admin search - all ID checks")
            id_checks = list(main_db.id_scans.find(id_checks_query).sort('created_at', -1).limit(50))
        
        print(f"[Global Search] Found {len(id_checks)} ID checks")
        
        # Process ID check results
        for check in id_checks:
            if '_id' in check:
                del check['_id']
            
            extracted = check.get('extracted_data', {})
            name = f"{extracted.get('name', '')} {extracted.get('surname', '')}".strip() or 'N/A'
            doc_type = extracted.get('document_type', 'Unbekannt')
            doc_number = extracted.get('document_number', 'N/A')
            
            id_checks_results.append({
                "type": "id-check",
                "id": check.get('id'),
                "title": f"{name} - {doc_type}",
                "subtitle": f"Dokumentennr: {doc_number} | Tenant: {check.get('tenant_name', 'N/A')}",
                "status": check.get('status', 'completed'),
                "created_at": check.get('created_at'),
                "data": check
            })
        
        # Calculate total results
        total_results = len(assets_results) + len(vehicles_results) + len(geraete_results) + len(standorte_results) + len(id_checks_results)
        
        print(f"[Global Search] Total results: {total_results} (Assets: {len(assets_results)}, Devices: {len(geraete_results)}, Locations: {len(standorte_results)}, Vehicles: {len(vehicles_results)}, ID-Checks: {len(id_checks_results)})")
        
        # Priority match: try to determine the single best match
        priority_match = None
        if assets_results:
            priority_match = assets_results[0]
        elif vehicles_results:
            priority_match = vehicles_results[0]
        elif geraete_results:
            priority_match = geraete_results[0]
        elif standorte_results:
            priority_match = standorte_results[0]
        
        return {
            "success": True,
            "query": search_term,
            "total": total_results,
            "priority_match": priority_match,
            "results": {
                "assets": assets_results[:25],  # Limit to 25
                "vehicles": vehicles_results[:25],  # Limit to 25
                "geraete": geraete_results[:25],  # Limit to 25
                "standorte": standorte_results[:25],  # Limit to 25
                "id_checks": id_checks_results[:25],  # Limit to 25
                "bestellungen": []  # Placeholder for future
            }
        }
    
    except Exception as e:
        print(f"[Global Search] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
