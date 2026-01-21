"""
Fleet Management System
Flottenmanagement mit MongoDB-Integration statt Mock-Daten
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from db.connection import get_mongo_client
from routes.portal_auth import verify_token
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ============== PYDANTIC MODELS ==============

class VehicleBase(BaseModel):
    license_plate: str
    vehicle_type: str
    model: str
    brand: str
    year: Optional[int] = None
    color: Optional[str] = None
    vin: Optional[str] = None
    fuel_type: Optional[str] = "Diesel"
    transmission: Optional[str] = "Automatik"
    seats: Optional[int] = 5
    home_location_id: Optional[str] = None
    current_location_id: Optional[str] = None
    status: str = "available"  # available, rented, maintenance, cleaning
    mileage_km: Optional[int] = 0
    daily_rate: Optional[float] = 0


class VehicleCreate(VehicleBase):
    tenant_id: str


class RentalBase(BaseModel):
    vehicle_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    pickup_location_id: str
    dropoff_location_id: str
    pickup_date: datetime
    dropoff_date: datetime
    status: str = "reserved"  # reserved, active, completed, cancelled


class RentalCreate(RentalBase):
    tenant_id: str


# ============== HELPER FUNCTIONS ==============

def get_fleet_db():
    """Get fleet database from connection pool"""
    return get_mongo_client()['fleet_db']


def get_tenant_db():
    """Get tenant database for locations"""
    return get_mongo_client()['tsrid_db']


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


# ============== FLEET STATISTICS ==============

@router.get("/api/fleet/stats")
async def get_fleet_stats(
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get fleet statistics for dashboard"""
    try:
        db = get_fleet_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        # Vehicle counts
        total_vehicles = db.vehicles.count_documents(query)
        available = db.vehicles.count_documents({**query, "status": "available"})
        rented = db.vehicles.count_documents({**query, "status": "rented"})
        maintenance = db.vehicles.count_documents({**query, "status": "maintenance"})
        cleaning = db.vehicles.count_documents({**query, "status": "cleaning"})
        
        # Rental counts
        active_rentals = db.rentals.count_documents({**query, "status": "active"})
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        pickups_today = db.rentals.count_documents({
            **query,
            "pickup_date": {"$gte": today, "$lt": today.replace(hour=23, minute=59)}
        })
        returns_today = db.rentals.count_documents({
            **query,
            "dropoff_date": {"$gte": today, "$lt": today.replace(hour=23, minute=59)}
        })
        
        # Vehicle types distribution
        pipeline = [
            {"$match": query} if query else {"$match": {}},
            {"$group": {"_id": "$vehicle_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        type_distribution = list(db.vehicles.aggregate(pipeline))
        
        return {
            "success": True,
            "stats": {
                "total_vehicles": total_vehicles,
                "available": available,
                "rented": rented,
                "maintenance": maintenance,
                "cleaning": cleaning,
                "utilization_rate": round((rented / total_vehicles * 100) if total_vehicles > 0 else 0, 1),
                "active_rentals": active_rentals,
                "pickups_today": pickups_today,
                "returns_today": returns_today,
                "vehicle_types": [{"type": t["_id"], "count": t["count"]} for t in type_distribution]
            }
        }
    except Exception as e:
        logger.error(f"Error getting fleet stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== VEHICLES ==============

@router.get("/api/fleet/vehicles")
async def get_vehicles(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    location_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    token_data: dict = Depends(verify_token)
):
    """Get list of vehicles with filters"""
    try:
        db = get_fleet_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status
        if vehicle_type:
            query["vehicle_type"] = vehicle_type
        if location_id:
            query["$or"] = [
                {"home_location_id": location_id},
                {"current_location_id": location_id}
            ]
        if search:
            query["$or"] = [
                {"license_plate": {"$regex": search, "$options": "i"}},
                {"model": {"$regex": search, "$options": "i"}},
                {"brand": {"$regex": search, "$options": "i"}}
            ]
        
        total = db.vehicles.count_documents(query)
        skip = (page - 1) * limit
        
        vehicles = list(db.vehicles.find(query, {"_id": 0}).skip(skip).limit(limit).sort("license_plate", 1))
        
        return {
            "success": True,
            "vehicles": vehicles,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    except Exception as e:
        logger.error(f"Error getting vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/fleet/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, token_data: dict = Depends(verify_token)):
    """Get single vehicle details"""
    try:
        db = get_fleet_db()
        vehicle = db.vehicles.find_one({"vehicle_id": vehicle_id}, {"_id": 0})
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Get rental history
        rentals = list(db.rentals.find(
            {"vehicle_id": vehicle_id}, 
            {"_id": 0}
        ).sort("pickup_date", -1).limit(10))
        
        # Get maintenance history
        maintenance = list(db.maintenance.find(
            {"vehicle_id": vehicle_id},
            {"_id": 0}
        ).sort("date", -1).limit(10))
        
        return {
            "success": True,
            "vehicle": vehicle,
            "rental_history": rentals,
            "maintenance_history": maintenance
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fleet/vehicles")
async def create_vehicle(vehicle: VehicleCreate, token_data: dict = Depends(verify_token)):
    """Create a new vehicle"""
    try:
        db = get_fleet_db()
        
        # Generate vehicle ID
        count = db.vehicles.count_documents({"tenant_id": vehicle.tenant_id})
        vehicle_id = f"VEH-{vehicle.tenant_id[:8]}-{count + 1:04d}"
        
        vehicle_doc = {
            "vehicle_id": vehicle_id,
            **vehicle.dict(),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        db.vehicles.insert_one(vehicle_doc)
        del vehicle_doc["_id"]
        
        return {"success": True, "vehicle": vehicle_doc}
    except Exception as e:
        logger.error(f"Error creating vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/fleet/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str, 
    updates: dict,
    token_data: dict = Depends(verify_token)
):
    """Update vehicle"""
    try:
        db = get_fleet_db()
        
        updates["updated_at"] = datetime.now(timezone.utc)
        
        result = db.vehicles.update_one(
            {"vehicle_id": vehicle_id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        vehicle = db.vehicles.find_one({"vehicle_id": vehicle_id}, {"_id": 0})
        return {"success": True, "vehicle": vehicle}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/fleet/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, token_data: dict = Depends(verify_token)):
    """Delete vehicle"""
    try:
        db = get_fleet_db()
        
        # Check for active rentals
        active_rental = db.rentals.find_one({
            "vehicle_id": vehicle_id,
            "status": {"$in": ["reserved", "active"]}
        })
        
        if active_rental:
            raise HTTPException(
                status_code=400, 
                detail="Fahrzeug hat aktive Buchungen und kann nicht gelöscht werden"
            )
        
        result = db.vehicles.delete_one({"vehicle_id": vehicle_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        return {"success": True, "message": "Fahrzeug gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== RENTALS ==============

@router.get("/api/fleet/rentals")
async def get_rentals(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    token_data: dict = Depends(verify_token)
):
    """Get list of rentals with filters"""
    try:
        db = get_fleet_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status
        if vehicle_id:
            query["vehicle_id"] = vehicle_id
        if from_date:
            query["pickup_date"] = {"$gte": datetime.fromisoformat(from_date)}
        if to_date:
            if "pickup_date" in query:
                query["pickup_date"]["$lte"] = datetime.fromisoformat(to_date)
            else:
                query["pickup_date"] = {"$lte": datetime.fromisoformat(to_date)}
        
        total = db.rentals.count_documents(query)
        skip = (page - 1) * limit
        
        rentals = list(db.rentals.find(query, {"_id": 0}).skip(skip).limit(limit).sort("pickup_date", -1))
        
        return {
            "success": True,
            "rentals": rentals,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    except Exception as e:
        logger.error(f"Error getting rentals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fleet/rentals")
async def create_rental(rental: RentalCreate, token_data: dict = Depends(verify_token)):
    """Create a new rental"""
    try:
        db = get_fleet_db()
        
        # Check vehicle availability
        vehicle = db.vehicles.find_one({"vehicle_id": rental.vehicle_id})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        if vehicle.get("status") != "available":
            raise HTTPException(status_code=400, detail="Fahrzeug ist nicht verfügbar")
        
        # Generate rental ID
        count = db.rentals.count_documents({})
        rental_id = f"RNT-{count + 1:06d}"
        
        rental_doc = {
            "rental_id": rental_id,
            **rental.dict(),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Update vehicle status
        db.vehicles.update_one(
            {"vehicle_id": rental.vehicle_id},
            {"$set": {"status": "rented", "current_location_id": rental.pickup_location_id}}
        )
        
        db.rentals.insert_one(rental_doc)
        del rental_doc["_id"]
        
        return {"success": True, "rental": rental_doc}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating rental: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/fleet/rentals/{rental_id}/complete")
async def complete_rental(
    rental_id: str,
    dropoff_mileage: Optional[int] = None,
    token_data: dict = Depends(verify_token)
):
    """Complete a rental"""
    try:
        db = get_fleet_db()
        
        rental = db.rentals.find_one({"rental_id": rental_id})
        if not rental:
            raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
        
        # Update rental
        db.rentals.update_one(
            {"rental_id": rental_id},
            {
                "$set": {
                    "status": "completed",
                    "actual_dropoff_date": datetime.now(timezone.utc),
                    "dropoff_mileage": dropoff_mileage,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update vehicle
        db.vehicles.update_one(
            {"vehicle_id": rental["vehicle_id"]},
            {
                "$set": {
                    "status": "cleaning",  # Nach Rückgabe erstmal reinigen
                    "current_location_id": rental["dropoff_location_id"],
                    "mileage_km": dropoff_mileage or rental.get("mileage_km", 0)
                }
            }
        )
        
        return {"success": True, "message": "Buchung abgeschlossen"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing rental {rental_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== LOCATIONS ==============

@router.get("/api/fleet/locations")
async def get_fleet_locations(
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all rental locations with vehicle counts"""
    try:
        db = get_fleet_db()
        tenant_db = get_tenant_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        # Get locations from tenant hierarchy
        locations = list(tenant_db.tenants.find(
            {"tenant_level": "location", **query},
            {"_id": 0, "tenant_id": 1, "display_name": 1, "name": 1, "city": 1, "address": 1}
        ).limit(100))
        
        # Add vehicle counts
        for loc in locations:
            loc_id = loc.get("tenant_id")
            loc["vehicle_count"] = db.vehicles.count_documents({
                "$or": [
                    {"home_location_id": loc_id},
                    {"current_location_id": loc_id}
                ]
            })
            loc["available_count"] = db.vehicles.count_documents({
                "current_location_id": loc_id,
                "status": "available"
            })
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations)
        }
    except Exception as e:
        logger.error(f"Error getting fleet locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== MAINTENANCE ==============

@router.get("/api/fleet/maintenance")
async def get_maintenance_records(
    tenant_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    token_data: dict = Depends(verify_token)
):
    """Get maintenance records"""
    try:
        db = get_fleet_db()
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if vehicle_id:
            query["vehicle_id"] = vehicle_id
        if status:
            query["status"] = status
        
        total = db.maintenance.count_documents(query)
        skip = (page - 1) * limit
        
        records = list(db.maintenance.find(query, {"_id": 0}).skip(skip).limit(limit).sort("date", -1))
        
        return {
            "success": True,
            "maintenance": records,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting maintenance records: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fleet/maintenance")
async def create_maintenance_record(
    vehicle_id: str,
    maintenance_type: str,
    description: str,
    cost: Optional[float] = None,
    token_data: dict = Depends(verify_token)
):
    """Create maintenance record"""
    try:
        db = get_fleet_db()
        
        # Get vehicle
        vehicle = db.vehicles.find_one({"vehicle_id": vehicle_id})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Create record
        record = {
            "maintenance_id": f"MNT-{db.maintenance.count_documents({}) + 1:06d}",
            "vehicle_id": vehicle_id,
            "tenant_id": vehicle.get("tenant_id"),
            "maintenance_type": maintenance_type,
            "description": description,
            "cost": cost,
            "status": "scheduled",
            "date": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        db.maintenance.insert_one(record)
        del record["_id"]
        
        # Update vehicle status
        db.vehicles.update_one(
            {"vehicle_id": vehicle_id},
            {"$set": {"status": "maintenance"}}
        )
        
        return {"success": True, "maintenance": record}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating maintenance record: {e}")
        raise HTTPException(status_code=500, detail=str(e))
