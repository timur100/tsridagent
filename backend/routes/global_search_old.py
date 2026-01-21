from fastapi import APIRouter, HTTPException, Depends
from db.connection import get_mongo_client
from typing import List, Dict, Any
import os
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/search", tags=["Global Search"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
# Use the correct databases
admin_db = get_mongo_client()['multi_tenant_admin']
portal_db = get_mongo_client()['portal_db']

@router.get("/global")
async def global_search(
    query: str,
    token_data: dict = Depends(verify_token)
):
    """
    Global search across inventory items, devices, and locations
    Priority: Artikel > Geräte > Standorte
    Returns the first high-priority match or all results
    """
    try:
        if not query or len(query.strip()) == 0:
            return {
                "success": True,
                "query": query,
                "results": {
                    "artikel": [],
                    "geraete": [],
                    "standorte": []
                },
                "total": 0,
                "priority_match": None
            }
        
        search_term = query.strip()
        search_regex = {"$regex": search_term, "$options": "i"}  # Case-insensitive
        
        # Get user info for role-based filtering
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        user_company = None
        
        if user_role == "customer":
            # Get user company from database
            user_record = portal_db.portal_users.find_one({"email": user_email})
            if user_record:
                user_company = user_record.get("company")
        
        # Search results containers
        artikel_results = []
        bestellungen_results = []
        geraete_results = []
        standorte_results = []
        priority_match = None
        
        # 1. Search Inventory Items (HIGHEST PRIORITY)
        # Search by: name, barcode, description, id
        inventory_query = {
            "$or": [
                {"name": search_regex},
                {"barcode": search_regex},  # Also check barcode with regex
                {"description": search_regex},
                {"id": search_regex}  # Also check ID with regex
            ]
        }
        
        inventory_items = list(portal_db.inventory.find(inventory_query).limit(10))
        for item in inventory_items:
            if '_id' in item:
                del item['_id']
            artikel_results.append({
                "type": "artikel",
                "id": item.get('id'),
                "title": item.get('name'),
                "subtitle": f"Kategorie: {item.get('category', 'N/A')} | Bestand: {item.get('quantity_in_stock', 0)} {item.get('unit', '')}",
                "barcode": item.get('barcode'),
                "image_url": item.get('image_url'),
                "data": item
            })
        
        # If we found artikel, set first as priority match
        if artikel_results:
            priority_match = artikel_results[0]
        
        # 2. Search Orders (HIGH PRIORITY)
        # Search by: order_number, customer_name, location_code
        order_query = {
            "$or": [
                {"order_number": search_regex},
                {"customer_name": search_regex},
                {"customer_email": search_regex},
                {"location_code": search_regex},
                {"id": search_regex}
            ]
        }
        
        # Filter orders by customer if user is customer
        if user_role == "customer" and user_email:
            order_query["customer_email"] = user_email
        
        orders = list(portal_db.orders.find(order_query).limit(10))
        for order in orders:
            if '_id' in order:
                del order['_id']
            
            # Format order date
            order_date = order.get('order_date', '')
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%d.%m.%Y')
            except:
                formatted_date = order_date
            
            bestellungen_results.append({
                "type": "bestellung",
                "id": order.get('id'),
                "title": order.get('order_number', f"#{order.get('id', '')[:8]}"),
                "subtitle": f"{order.get('customer_company', 'N/A')} | {order.get('location_code', 'N/A')} | {formatted_date}",
                "status": order.get('status', 'pending'),
                "data": order
            })
        
        # If no artikel found but order number matches exactly, set as priority
        if not priority_match and bestellungen_results and search_term.upper().startswith('BE.'):
            priority_match = bestellungen_results[0]
        
        # 2. Search Devices (MEDIUM PRIORITY)
        # Search by: device_id, locationcode, ip_address, sn_sc, sn_pc, serial numbers
        device_query = {
            "$or": [
                {"device_id": search_regex},
                {"locationcode": search_regex},
                {"ip_address": search_term},
                {"sn_sc": search_regex},  # Scanner Serial Number
                {"sn_pc": search_regex},  # PC Serial Number
                {"serial_number": search_regex},  # General serial number
                {"barcode": search_regex}  # Device barcode
            ]
        }
        
        # Search both portal_devices and europcar_devices collections
        devices = []
        
        # Get user's tenant_ids to filter devices
        user_tenant_ids = token_data.get("tenant_ids", [])
        
        # Search europcar_devices collection (main devices collection)
        if user_role == "customer" and user_tenant_ids:
            # Customer: only show devices from their tenant(s)
            europcar_device_query = device_query.copy()
            europcar_device_query["tenant_id"] = {"$in": user_tenant_ids}
            devices.extend(list(admin_db.europcar_devices.find(europcar_device_query).limit(50)))
        elif user_role == "admin":
            # Admin: show all devices from all tenants
            devices.extend(list(admin_db.europcar_devices.find(device_query).limit(50)))
        
        # Also search portal_devices if it exists
        try:
            portal_devices = list(portal_db.tenant_devices.find(device_query).limit(50))
            devices.extend(portal_devices)
        except:
            pass
        
        # Remove duplicates based on device_id
        seen_device_ids = set()
        unique_devices = []
        for device in devices:
            device_id = device.get('device_id')
            if device_id and device_id not in seen_device_ids:
                seen_device_ids.add(device_id)
                unique_devices.append(device)
        
        for device in unique_devices[:50]:  # Limit to 50 results
            if '_id' in device:
                del device['_id']
            geraete_results.append({
                "type": "geraet",
                "id": device.get('device_id'),
                "title": device.get('device_id'),
                "subtitle": f"Standort: {device.get('locationcode', 'N/A')} | Status: {device.get('status', 'Unbekannt')}",
                "status": device.get('status'),
                "tenant_id": device.get('tenant_id'),
                "data": device
            })
        
        # If no artikel found but devices found, set first device as priority
        if not priority_match and geraete_results:
            priority_match = geraete_results[0]
        
        # 3. Search Locations (LOWEST PRIORITY)
        # Search by: location_code, station_name, city, zip
        location_query = {
            "$or": [
                {"location_code": search_regex},
                {"station_name": search_regex},
                {"city": search_regex},
                {"zip": search_term},
                {"location_id": search_regex}
            ]
        }
        
        # Search tenant_locations (main locations collection)
        if user_role == "customer" and user_tenant_ids:
            # Customer: only show locations from their tenant(s)
            location_query_with_tenant = location_query.copy()
            location_query_with_tenant["tenant_id"] = {"$in": user_tenant_ids}
            locations = list(portal_db.tenant_locations.find(location_query_with_tenant).limit(50))
        elif user_role == "admin":
            # Admin: show all locations from all tenants
            locations = list(portal_db.tenant_locations.find(location_query).limit(50))
        for location in locations:
            if '_id' in location:
                del location['_id']
            standorte_results.append({
                "type": "standort",
                "id": location.get('location_id'),
                "title": location.get('station_name', 'N/A'),
                "subtitle": f"{location.get('city', 'N/A')} | {location.get('location_code', 'N/A')}",
                "status": location.get('status'),
                "tenant_id": location.get('tenant_id'),
                "data": location
            })
        
        # If no artikel or devices found but locations found, set first location as priority
        if not priority_match and standorte_results:
            priority_match = standorte_results[0]
        
        # 4. Search Tickets (LOWEST PRIORITY)
        # Search by: ticket_number, subject, description, device_id, location_code
        tickets_results = []
        ticket_query = {
            "$or": [
                {"ticket_number": search_regex},
                {"subject": search_regex},
                {"description": search_regex},
                {"device_id": search_regex},
                {"location_code": search_regex}
            ]
        }
        
        # Check if user is customer
        if user_role == "customer":
            ticket_query["customer_company"] = user_company
        
        tickets = list(portal_db.tickets.find(ticket_query).limit(10))
        for ticket in tickets:
            if '_id' in ticket:
                del ticket['_id']
            tickets_results.append({
                "type": "ticket",
                "id": ticket.get('ticket_number'),
                "title": f"Ticket #{ticket.get('ticket_number', 'N/A')}",
                "subtitle": f"{ticket.get('subject', 'N/A')} | Status: {ticket.get('status', 'N/A')}",
                "status": ticket.get('status'),
                "data": ticket
            })
        
        # If no other results found but tickets found, set first ticket as priority
        if not priority_match and tickets_results:
            priority_match = tickets_results[0]
        
        # 5. Search Euroboxes (Admin only)
        euroboxes_results = []
        if user_role == "admin":
            eurobox_query = {
                "$or": [
                    {"eurobox_number": search_regex},
                    {"description": search_regex},
                    {"current_order_number": search_regex}
                ]
            }
            
            euroboxes = list(portal_db.euroboxes.find(eurobox_query).limit(10))
            for eurobox in euroboxes:
                if '_id' in eurobox:
                    del eurobox['_id']
                
                # Get status badge info
                status_label = {
                    "available": "Verfügbar",
                    "in_use": "In Verwendung",
                    "maintenance": "Wartung"
                }.get(eurobox.get('status', 'available'), eurobox.get('status', 'Verfügbar'))
                
                subtitle_parts = [f"Status: {status_label}"]
                if eurobox.get('current_order_number'):
                    subtitle_parts.append(f"Bestellung: {eurobox.get('current_order_number')}")
                
                euroboxes_results.append({
                    "type": "eurobox",
                    "id": eurobox.get('id'),
                    "title": eurobox.get('eurobox_number', 'N/A'),
                    "subtitle": " | ".join(subtitle_parts),
                    "status": eurobox.get('status'),
                    "data": eurobox
                })
            
            # If no other results found but euroboxes found, set first eurobox as priority
            if not priority_match and euroboxes_results:
                priority_match = euroboxes_results[0]
        
        # 6. Search Tenants (Admin only)
        tenants_results = []
        if user_role == "admin":
            tenant_query = {
                "$or": [
                    {"name": search_regex},
                    {"display_name": search_regex},
                    {"domain": search_regex},
                    {"contact.admin_email": search_regex}
                ]
            }
            
            portal_db = get_mongo_client()['portal_db']
            tenants = list(portal_db.tenants.find(tenant_query).limit(10))
            for tenant in tenants:
                if '_id' in tenant:
                    del tenant['_id']
                
                tenants_results.append({
                    "type": "tenant",
                    "id": tenant.get('tenant_id'),
                    "title": tenant.get('display_name', tenant.get('name', 'N/A')),
                    "subtitle": f"Domain: {tenant.get('domain', 'N/A')} | Status: {tenant.get('status', 'N/A')}",
                    "status": tenant.get('status'),
                    "data": tenant
                })
            
            # If no other results found but tenants found, set first tenant as priority
            if not priority_match and tenants_results:
                priority_match = tenants_results[0]
        
        # 7. Search Tenant Locations (Admin only)
        tenant_locations_results = []
        if user_role == "admin":
            tenant_location_query = {
                "$or": [
                    {"location_code": search_regex},
                    {"station_name": search_regex},
                    {"city": search_regex},
                    {"postal_code": search_regex},
                    {"manager": search_regex},
                    {"email": search_regex}
                ]
            }
            
            portal_db = get_mongo_client()['portal_db']
            tenant_locations = list(portal_db.tenant_locations.find(tenant_location_query).limit(10))
            for location in tenant_locations:
                if '_id' in location:
                    del location['_id']
                
                tenant_locations_results.append({
                    "type": "tenant_location",
                    "id": location.get('location_id'),
                    "title": f"{location.get('location_code', 'N/A')} - {location.get('station_name', 'N/A')}",
                    "subtitle": f"{location.get('city', 'N/A')}, {location.get('state', 'N/A')}",
                    "tenant_id": location.get('tenant_id'),
                    "data": location
                })
        
        total_results = len(artikel_results) + len(bestellungen_results) + len(geraete_results) + len(standorte_results) + len(tickets_results) + len(euroboxes_results) + len(tenants_results) + len(tenant_locations_results)
        
        return {
            "success": True,
            "query": search_term,
            "results": {
                "artikel": artikel_results,
                "bestellungen": bestellungen_results,
                "geraete": geraete_results,
                "standorte": standorte_results,
                "tickets": tickets_results,
                "euroboxes": euroboxes_results,
                "tenants": tenants_results,
                "tenant_locations": tenant_locations_results
            },
            "total": total_results,
            "priority_match": priority_match  # First match based on priority: Artikel > Bestellungen > Geräte > Standorte > Tickets > Euroboxes > Tenants > Tenant Locations
        }
    
    except Exception as e:
        print(f"Global search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
