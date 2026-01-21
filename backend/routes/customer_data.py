from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
from routes.portal_auth import verify_token
from europcar_data import EUROPCAR_DATA
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/portal/customer-data", tags=["Customer Data"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
multi_tenant_db = get_mongo_client()['multi_tenant_admin']  # For devices
portal_db = get_mongo_client()['portal_db']  # For locations/stations

@router.post("/import/{customer_email}")
async def import_customer_data(customer_email: str, token_data: dict = Depends(verify_token)):
    """
    Import customer data (locations, devices, employees, licenses) when customer is activated
    Only for admin role
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if customer exists
        customer = portal_db.portal_users.find_one({"email": customer_email})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Import data for Europcar
        if customer_email == "demo@customer.de":
            data = EUROPCAR_DATA
            
            # Clear existing data
            portal_db.customer_locations.delete_many({"customer_email": customer_email})
            portal_db.customer_devices.delete_many({"customer_email": customer_email})
            portal_db.customer_employees.delete_many({"customer_email": customer_email})
            portal_db.customer_licenses.delete_many({"customer_email": customer_email})
            
            # Import locations
            for location in data["locations"]:
                location["customer_email"] = customer_email
                location["created_at"] = datetime.now(timezone.utc).isoformat()
                portal_db.customer_locations.insert_one(location)
            
            # Import devices
            for device in data["devices"]:
                device["customer_email"] = customer_email
                device["created_at"] = datetime.now(timezone.utc).isoformat()
                portal_db.customer_devices.insert_one(device)
            
            # Import employees
            for employee in data["employees"]:
                employee["customer_email"] = customer_email
                employee["created_at"] = datetime.now(timezone.utc).isoformat()
                portal_db.customer_employees.insert_one(employee)
            
            # Import licenses
            for license_item in data["licenses"]:
                license_item["customer_email"] = customer_email
                license_item["created_at"] = datetime.now(timezone.utc).isoformat()
                portal_db.customer_licenses.insert_one(license_item)
            
            return {
                "success": True,
                "message": "Data imported successfully",
                "counts": {
                    "locations": len(data["locations"]),
                    "devices": len(data["devices"]),
                    "employees": len(data["employees"]),
                    "licenses": len(data["licenses"])
                }
            }
        else:
            return {
                "success": True,
                "message": "No data to import for this customer",
                "counts": {
                    "locations": 0,
                    "devices": 0,
                    "employees": 0,
                    "licenses": 0
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/{customer_email}")
async def clear_customer_data(customer_email: str, token_data: dict = Depends(verify_token)):
    """
    Clear customer data when customer is deactivated
    Only for admin role
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Clear all customer data
        portal_db.customer_locations.delete_many({"customer_email": customer_email})
        portal_db.customer_devices.delete_many({"customer_email": customer_email})
        portal_db.customer_employees.delete_many({"customer_email": customer_email})
        portal_db.customer_licenses.delete_many({"customer_email": customer_email})
        
        return {
            "success": True,
            "message": "Customer data cleared"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Clear error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/europcar-stations")
async def get_europcar_stations(
    customer_email: str = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all stations data, optionally filtered by customer email
    Only accessible to admin or active customer
    """
    try:
        # Check if user is admin
        is_admin = token_data.get("role") == "admin"
        
        # Determine which customer's data to fetch
        target_customer_company = None
        
        if is_admin:
            # Admin can filter by customer_email parameter
            if customer_email and customer_email != 'all':
                customer = portal_db.portal_users.find_one({"email": customer_email})
                if customer and customer.get("company"):
                    target_customer_company = customer.get("company")
        else:
            # Non-admin can only see their own data
            user_email = token_data.get("sub")
            tenant_ids = token_data.get("tenant_ids", [])
            
            # If user has tenant_ids, use that for filtering
            if tenant_ids:
                # User is a tenant admin - use tenant_id for filtering
                # For now, just use the first tenant_id
                # We'll filter devices by tenant_id instead of company
                target_customer_company = None  # Will use tenant_id instead
            else:
                # Fallback to portal_users lookup
                customer = portal_db.portal_users.find_one({"email": user_email})
                
                if not customer:
                    raise HTTPException(status_code=403, detail="Access denied")
                
                # Check if customer is active
                if customer.get("status") != "Aktiv":
                    raise HTTPException(status_code=403, detail="Access denied: Customer account is not active")
                
                target_customer_company = customer.get("company")
        
        # Build query filters
        station_query = {}
        device_query = {}
        
        # If user has tenant_ids, filter by tenant_id
        if not is_admin and tenant_ids:
            device_query['tenant_id'] = {'$in': tenant_ids}
        elif target_customer_company:
            # Flexible company name matching for data isolation
            # Try exact match first, then partial match (e.g., "Europcar" matches "Europcar Autovermietung GmbH")
            device_query['$or'] = [
                {'customer': target_customer_company},
                {'customer': {'$regex': target_customer_company.split()[0], '$options': 'i'}}
            ]
        
        # Check if this customer has any devices (to determine if we should show stations)
        # For customers without devices, return empty data
        if device_query:
            device_count = multi_tenant_db.europcar_devices.count_documents(device_query)
            if device_count == 0:
                # No devices for this customer, return empty stations
                return {
                    "success": True,
                    "summary": {
                        "total": 0,
                        "ready": 0,
                        "online": 0,
                        "offline": 0
                    },
                    "stations": []
                }
        
        # First, get devices for this customer to know which locations they have
        devices_by_location = {}
        devices_cursor = multi_tenant_db.europcar_devices.find(device_query)
        for device in devices_cursor:
            locationcode = device.get('locationcode')
            if locationcode:
                if locationcode not in devices_by_location:
                    devices_by_location[locationcode] = []
                devices_by_location[locationcode].append(device)
        
        # Get list of location codes that have devices from this customer
        customer_location_codes = list(devices_by_location.keys())
        
        # Build station query for tenant_locations collection
        if not is_admin and tenant_ids:
            # Filter by tenant_id for tenant admin users
            station_query['tenant_id'] = {'$in': tenant_ids}
        elif customer_location_codes:
            # Show stations that have devices from this customer
            station_query['location_code'] = {'$in': customer_location_codes}
        else:
            # For admin or when no specific filtering, show all locations
            pass
        
        # Fetch stations from portal_db.tenant_locations
        stations_cursor = portal_db.tenant_locations.find(station_query)
        stations = []
        
        for station in stations_cursor:
            # Remove MongoDB _id field
            if '_id' in station:
                del station['_id']
            
            # Map tenant_locations fields to frontend expected fields
            # Frontend expects specific German field names from the old system
            if 'location_code' in station:
                station['main_code'] = station['location_code']
            
            if 'station_name' in station:
                station['stationsname'] = station['station_name']
            
            if 'street' in station:
                station['str'] = station['street']
            
            if 'postal_code' in station:
                station['plz'] = station['postal_code']
            
            if 'city' in station:
                station['ort'] = station['city']
            
            if 'state' in station:
                station['bundesl'] = station['state']
            
            if 'country' in station:
                station['land'] = station['country']
            elif not station.get('land'):
                station['land'] = 'Deutschland'
            
            if 'continent' in station:
                station['kontinent'] = station['continent']
            elif not station.get('kontinent'):
                station['kontinent'] = 'Europa'
            
            if 'phone' in station:
                station['telefon'] = station['phone']
            
            if 'manager' in station:
                station['mgr'] = station['manager']
            
            # Calculate online status based on devices at this location
            station_code = station.get('location_code')  # Use location_code instead of main_code
            devices_at_location = devices_by_location.get(station_code, [])
            
            # A station is online if at least one device is online (teamviewer_online=True)
            has_online_device = any(
                device.get('teamviewer_online', False) or device.get('status', '').lower() == 'online' 
                for device in devices_at_location
            )
            station['online'] = has_online_device
            
            # Also store device count for this location
            station['device_count'] = len(devices_at_location)
            station['online_device_count'] = sum(
                1 for device in devices_at_location 
                if device.get('teamviewer_online', False) or device.get('status', '').lower() == 'online'
            )
                
            stations.append(station)
        
        # Calculate summary statistics
        total = len(stations)
        ready_count = sum(1 for s in stations if s.get('device_count', 0) > 0)  # Stations with devices are "ready"
        online_count = sum(1 for s in stations if s.get('online', False))
        offline_count = total - online_count
        in_vorbereitung_count = sum(1 for s in stations if s.get('device_count', 0) == 0)  # Stations without devices are "in preparation"
        
        return {
            "success": True,
            "summary": {
                "total": total,
                "ready": ready_count,
                "online": online_count,
                "offline": offline_count,
                "in_vorbereitung": in_vorbereitung_count
            },
            "stations": stations
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Europcar stations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/europcar-stations")
async def create_europcar_station(
    station_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Create new Europcar station
    Admin: Can create any station
    Customer: Can only create stations for their company
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Check if station main_code already exists
        existing = portal_db.tenant_locations.find_one({"location_code": station_data.get("location_code")})
        if existing:
            raise HTTPException(status_code=400, detail="Station code already exists")
        
        # For customers, ensure they can only create stations for their own company
        if user_role == "customer":
            # Get user's company from portal_users
            user_doc = portal_db.portal_users.find_one({"email": user_email})
            if user_doc:
                station_data['customer'] = user_doc.get('company', 'Europcar Autovermietung GmbH')
                
                # Verify customer has access (is Europcar customer and active)
                if not (user_doc.get("company") and "europcar" in user_doc.get("company", "").lower()):
                    raise HTTPException(status_code=403, detail="Access denied")
                if user_doc.get("status") != "Aktiv":
                    raise HTTPException(status_code=403, detail="Access denied: Customer account is not active")
                
                # Mark as "In Vorbereitung" when created by customer in shop
                station_data['preparation_status'] = 'in_vorbereitung'
        else:
            # Admin can set any customer
            station_data['customer'] = station_data.get('customer', 'Europcar Autovermietung GmbH')
            # Admin-created stations are ready (no preparation needed)
            station_data['preparation_status'] = 'ready'
        
        # Add metadata
        station_data['created_at'] = datetime.now(timezone.utc).isoformat()
        station_data['created_by'] = user_email
        station_data['online'] = False  # Default to offline
        station_data['device_count'] = 0  # Will be calculated dynamically
        station_data['online_device_count'] = 0  # Will be calculated dynamically
        
        # Set defaults for missing fields
        station_data.setdefault('land', 'Deutschland')
        station_data.setdefault('kontinent', 'Europa')
        station_data.setdefault('id_checker', 0)
        
        # Insert into MongoDB
        portal_db.tenant_locations.insert_one(station_data)
        
        # Return station without _id
        station_data.pop('_id', None)
        
        return {
            "success": True,
            "message": "Station created successfully",
            "data": {
                "station": station_data
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/europcar-stations/{station_code}/preparation-status")
async def update_preparation_status(
    station_code: str,
    status: str,
    token_data: dict = Depends(verify_token)
):
    """
    Update preparation status of a station
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Validate status
        valid_statuses = ['in_vorbereitung', 'ready']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        # Get the station first
        station = portal_db.tenant_locations.find_one({"location_code": station_code})
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
        
        # If transitioning to 'ready', validate all required fields are filled
        if status == 'ready':
            required_fields = ['stationsname', 'str', 'plz', 'ort', 'bundesl', 'telefon', 'email']
            missing_fields = []
            
            for field in required_fields:
                if not station.get(field) or str(station.get(field)).strip() == '':
                    missing_fields.append(field)
            
            if missing_fields:
                # Map field names to German labels
                field_labels = {
                    'stationsname': 'Stationsname',
                    'str': 'Straße',
                    'plz': 'PLZ',
                    'ort': 'Stadt',
                    'bundesl': 'Bundesland',
                    'telefon': 'Telefon',
                    'email': 'E-Mail'
                }
                missing_labels = [field_labels.get(f, f) for f in missing_fields]
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot mark as ready. Missing required fields: {', '.join(missing_labels)}"
                )
        
        # Update station
        result = portal_db.tenant_locations.update_one(
            {"location_code": station_code},
            {"$set": {
                "preparation_status": status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": token_data.get("sub")
            }}
        )
        
        return {
            "success": True,
            "message": f"Preparation status updated to '{status}'"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        raise
    except Exception as e:
        print(f"Create station error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/europcar-stations/{station_code}/deactivate")
async def deactivate_europcar_station(
    station_code: str,
    token_data: dict = Depends(verify_token)
):
    """
    Deactivate Europcar station (soft delete)
    Only accessible to admin
    """
    try:
        # Only admin can deactivate
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can deactivate stations")
        
        # Find station
        station = portal_db.tenant_locations.find_one({"location_code": station_code})
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
        
        # Update status to inactive
        portal_db.tenant_locations.update_one(
            {"location_code": station_code},
            {"$set": {
                "status": "inactive",
                "deactivated_at": datetime.now(timezone.utc).isoformat(),
                "deactivated_by": token_data.get("sub")
            }}
        )
        
        return {
            "success": True,
            "message": "Station deactivated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Deactivate station error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/europcar-stations/{station_code}")
async def delete_europcar_station(
    station_code: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete Europcar station (hard delete)
    Only accessible to admin
    """
    try:
        # Only admin can delete
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete stations")
        
        # Find station
        station = portal_db.tenant_locations.find_one({"location_code": station_code})
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
        
        # Delete station from database
        result = portal_db.tenant_locations.delete_one({"location_code": station_code})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Station not found or already deleted")
        
        return {
            "success": True,
            "message": "Station permanently deleted"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete station error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/europcar-stations/{station_code}")
async def update_europcar_station(
    station_code: str,
    station_update: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Update Europcar station data
    Only accessible to admin or active Europcar customer
    """
    try:
        # Check if user is admin
        is_admin = token_data.get("role") == "admin"
        
        # If not admin, check if user is the Europcar customer and if they're active
        if not is_admin:
            user_email = token_data.get("sub")
            customer = portal_db.portal_users.find_one({"email": user_email})
            
            # Check if customer's company contains "Europcar" (case-insensitive)
            if not customer or not (customer.get("company") and "europcar" in customer.get("company", "").lower()):
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Check if customer is active
            if customer.get("status") != "Aktiv":
                raise HTTPException(status_code=403, detail="Access denied: Customer account is not active")
        
        # Find station by location_code
        station = portal_db.tenant_locations.find_one({"location_code": station_code})
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
        
        # Add updated timestamp and user info
        station_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        station_update['updated_by'] = token_data.get("sub")
        
        # Update station in MongoDB
        portal_db.tenant_locations.update_one(
            {"location_code": station_code},
            {"$set": station_update}
        )
        
        # Fetch updated station (exclude _id)
        updated_station = portal_db.tenant_locations.find_one({"location_code": station_code}, {'_id': 0})
        
        return {
            "success": True,
            "message": "Station updated successfully",
            "station": updated_station
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update station error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_customer_data_stats(customer_email: str, token_data: dict = Depends(verify_token)):
    """
    Get customer data statistics
    """
    try:
        locations_count = portal_db.customer_locations.count_documents({"customer_email": customer_email})
        devices_count = portal_db.customer_devices.count_documents({"customer_email": customer_email})
        employees_count = portal_db.customer_employees.count_documents({"customer_email": customer_email})
        licenses_count = portal_db.customer_licenses.count_documents({"customer_email": customer_email})
        
        # Get devices online/offline
        devices_online = portal_db.customer_devices.count_documents({
            "customer_email": customer_email,
            "status": "online"
        })
        devices_offline = portal_db.customer_devices.count_documents({
            "customer_email": customer_email,
            "status": "offline"
        })
        
        return {
            "success": True,
            "stats": {
                "locations": locations_count,
                "devices": devices_count,
                "employees": employees_count,
                "licenses": licenses_count,
                "devices_online": devices_online,
                "devices_offline": devices_offline
            }
        }
    
    except Exception as e:
        print(f"Stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
