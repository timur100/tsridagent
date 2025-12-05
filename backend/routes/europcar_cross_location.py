"""
Europcar Cross-Location Vehicle Search
Standortübergreifende Fahrzeugsuche innerhalb eines Landes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from middleware.auth import get_current_user, get_current_tenant_id

router = APIRouter(prefix="/api/europcar/cross-location", tags=["Europcar Cross-Location"])

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

class CrossLocationVehicle(BaseModel):
    id: str
    tenant_id: str
    tenant_name: str
    tenant_display_name: str
    make: str
    model: str
    year: int
    category: str
    status: str
    daily_rate: float
    distance_km: Optional[float] = None

class VehicleTransferRequest(BaseModel):
    vehicle_id: str
    from_tenant_id: str
    to_tenant_id: str
    requested_date: str
    return_date: str
    notes: Optional[str] = None

@router.get("/available-vehicles")
async def get_available_vehicles_in_country(
    current_tenant_id: str = Depends(get_current_tenant_id),
    current_user: dict = Depends(get_current_user)
):
    """
    Zeigt verfügbare Fahrzeuge bei anderen Standorten im gleichen Land
    Nur verfügbar wenn allow_cross_location_search aktiviert ist
    """
    try:
        # Get current tenant info
        current_tenant = await db.tenants.find_one(
            {"tenant_id": current_tenant_id},
            {"_id": 0}
        )
        
        if not current_tenant:
            raise HTTPException(status_code=404, detail="Standort nicht gefunden")
        
        # Check if cross-location search is enabled
        if not current_tenant.get("allow_cross_location_search", False):
            return {
                "success": False,
                "message": "Standortübergreifende Suche ist für diesen Standort nicht aktiviert",
                "data": {"vehicles": [], "enabled": False}
            }
        
        country_code = current_tenant.get("country_code")
        if not country_code:
            raise HTTPException(
                status_code=400,
                detail="Kein Land für diesen Standort konfiguriert"
            )
        
        # Find all sibling tenants in same country (excluding current tenant)
        sibling_tenants = await db.tenants.find(
            {
                "country_code": country_code,
                "tenant_id": {"$ne": current_tenant_id},
                "status": "active"
            },
            {"_id": 0}
        ).to_list(1000)
        
        sibling_tenant_ids = [t["tenant_id"] for t in sibling_tenants]
        
        if not sibling_tenant_ids:
            return {
                "success": True,
                "message": "Keine anderen Standorte in diesem Land gefunden",
                "data": {"vehicles": [], "enabled": True}
            }
        
        # Find available vehicles at sibling locations
        # Status "available" means not currently rented
        vehicles = await db.europcar_vehicles.find(
            {
                "station_id": {"$in": sibling_tenant_ids},
                "status": "available"
            },
            {"_id": 0}
        ).to_list(1000)
        
        # Enrich with tenant information
        result_vehicles = []
        tenant_map = {t["tenant_id"]: t for t in sibling_tenants}
        
        for vehicle in vehicles:
            tenant_id = vehicle.get("station_id")
            tenant_info = tenant_map.get(tenant_id, {})
            
            result_vehicles.append({
                "id": vehicle.get("id"),
                "tenant_id": tenant_id,
                "tenant_name": tenant_info.get("name", "Unknown"),
                "tenant_display_name": tenant_info.get("display_name", "Unknown Location"),
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "year": vehicle.get("year"),
                "category": vehicle.get("category"),
                "license_plate": vehicle.get("license_plate"),
                "status": vehicle.get("status"),
                "daily_rate": vehicle.get("pricing", {}).get("daily_rate", 0),
                "vin": vehicle.get("vin"),
                "fuel_type": vehicle.get("fuel_type"),
                "transmission": vehicle.get("transmission"),
                "seats": vehicle.get("seats"),
                "color": vehicle.get("color")
            })
        
        return {
            "success": True,
            "message": f"{len(result_vehicles)} verfügbare Fahrzeuge in {len(sibling_tenant_ids)} Standorten gefunden",
            "data": {
                "vehicles": result_vehicles,
                "enabled": True,
                "country_code": country_code,
                "location_count": len(sibling_tenant_ids)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/request-vehicle")
async def request_vehicle_transfer(
    request_data: VehicleTransferRequest,
    current_tenant_id: str = Depends(get_current_tenant_id),
    current_user: dict = Depends(get_current_user)
):
    """
    Fordere ein Fahrzeug von einem anderen Standort an
    Erstellt eine Transferanfrage, die vom anderen Standort bestätigt werden muss
    """
    try:
        # Validate current tenant has permission
        current_tenant = await db.tenants.find_one(
            {"tenant_id": current_tenant_id},
            {"_id": 0}
        )
        
        if not current_tenant or not current_tenant.get("allow_cross_location_search", False):
            raise HTTPException(
                status_code=403,
                detail="Standortübergreifende Anfragen sind nicht aktiviert"
            )
        
        # Validate vehicle exists and is available
        vehicle = await db.europcar_vehicles.find_one(
            {"id": request_data.vehicle_id},
            {"_id": 0}
        )
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        if vehicle.get("status") != "available":
            raise HTTPException(
                status_code=400,
                detail="Fahrzeug ist nicht verfügbar"
            )
        
        # Validate both tenants are in same country
        from_tenant = await db.tenants.find_one(
            {"tenant_id": request_data.from_tenant_id},
            {"_id": 0}
        )
        
        if not from_tenant:
            raise HTTPException(status_code=404, detail="Quellstandort nicht gefunden")
        
        if from_tenant.get("country_code") != current_tenant.get("country_code"):
            raise HTTPException(
                status_code=400,
                detail="Fahrzeugtransfer nur innerhalb desselben Landes möglich"
            )
        
        # Create transfer request
        transfer_request = {
            "id": str(uuid4()),
            "vehicle_id": request_data.vehicle_id,
            "vehicle_info": {
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "license_plate": vehicle.get("license_plate")
            },
            "from_tenant_id": request_data.from_tenant_id,
            "from_tenant_name": from_tenant.get("display_name"),
            "to_tenant_id": request_data.to_tenant_id,
            "to_tenant_name": current_tenant.get("display_name"),
            "requested_by": current_user.get("email"),
            "requested_date": request_data.requested_date,
            "return_date": request_data.return_date,
            "notes": request_data.notes,
            "status": "pending",  # pending, approved, rejected
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.europcar_transfer_requests.insert_one(transfer_request)
        
        return {
            "success": True,
            "message": "Transferanfrage erfolgreich erstellt",
            "data": {"request_id": transfer_request["id"]}
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transfer-requests")
async def get_transfer_requests(
    current_tenant_id: str = Depends(get_current_tenant_id),
    current_user: dict = Depends(get_current_user),
    direction: str = "both"  # incoming, outgoing, both
):
    """
    Hole alle Transferanfragen für diesen Standort
    - incoming: Anfragen von anderen Standorten (wollen Fahrzeug von uns)
    - outgoing: Unsere Anfragen an andere Standorte
    - both: Alle
    """
    try:
        query = {}
        
        if direction == "incoming":
            query["from_tenant_id"] = current_tenant_id
        elif direction == "outgoing":
            query["to_tenant_id"] = current_tenant_id
        else:  # both
            query["$or"] = [
                {"from_tenant_id": current_tenant_id},
                {"to_tenant_id": current_tenant_id}
            ]
        
        requests = await db.europcar_transfer_requests.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        
        return {
            "success": True,
            "message": f"{len(requests)} Anfragen gefunden",
            "data": {"requests": requests}
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/transfer-requests/{request_id}/status")
async def update_transfer_request_status(
    request_id: str,
    status: str,  # approved, rejected
    current_tenant_id: str = Depends(get_current_tenant_id),
    current_user: dict = Depends(get_current_user)
):
    """
    Akzeptiere oder lehne eine Transferanfrage ab
    Nur der Quellstandort (from_tenant) kann dies tun
    """
    try:
        if status not in ["approved", "rejected"]:
            raise HTTPException(
                status_code=400,
                detail="Status muss 'approved' oder 'rejected' sein"
            )
        
        # Get request
        request = await db.europcar_transfer_requests.find_one(
            {"id": request_id},
            {"_id": 0}
        )
        
        if not request:
            raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
        
        # Only from_tenant can approve/reject
        if request["from_tenant_id"] != current_tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Nur der Quellstandort kann diese Anfrage bearbeiten"
            )
        
        # Update request status
        await db.europcar_transfer_requests.update_one(
            {"id": request_id},
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "reviewed_by": current_user.get("email")
                }
            }
        )
        
        # If approved, could trigger vehicle status update or reservation
        # This can be extended later
        
        return {
            "success": True,
            "message": f"Anfrage {status}",
            "data": {"request_id": request_id, "status": status}
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
