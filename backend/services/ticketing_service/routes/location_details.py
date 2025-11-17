from fastapi import APIRouter, HTTPException, Depends
from utils.db import tickets_collection, db
from utils.auth import verify_token

router = APIRouter(prefix="/tickets", tags=["Location Details"])

@router.get("/{ticket_id}/location-details")
async def get_ticket_location_details(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get full location details for a ticket
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        location_id = ticket.get("location_id")
        if not location_id:
            return {
                "success": True,
                "location": None
            }
        
        # Get location details from main database
        main_db = db.client['test_database']
        location = await main_db.europcar_stations.find_one({"main_code": location_id})
        
        if not location:
            return {
                "success": True,
                "location": None
            }
        
        # Remove MongoDB _id
        if '_id' in location:
            del location['_id']
        
        # Get devices for this location
        cursor = main_db.europcar_devices.find({"locationcode": location_id})
        devices = []
        async for device in cursor:
            if '_id' in device:
                del device['_id']
            devices.append(device)
        
        location_data = {
            "main_code": location.get("main_code"),
            "stationsname": location.get("stationsname"),
            "str": location.get("str"),
            "plz": location.get("plz"),
            "ort": location.get("ort"),
            "bundesl": location.get("bundesl"),
            "land": location.get("land"),
            "kontinent": location.get("kontinent"),
            "telefon": location.get("telefon"),
            "email": location.get("email"),
            "mgr": location.get("mgr"),
            "opening_hours": location.get("opening_hours", "Nicht verfügbar"),
            "devices": devices,
            "device_count": len(devices)
        }
        
        return {
            "success": True,
            "location": location_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get location details error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
