from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

class Vehicle(BaseModel):
    id: Optional[str] = None
    license_plate: str = Field(..., description="Kennzeichen")
    tenant_id: str = Field(..., description="Tenant ID")
    tenant_name: Optional[str] = None
    brand: str = Field(..., description="Marke")
    model: str = Field(..., description="Modell")
    year: int = Field(..., description="Baujahr")
    mileage: int = Field(default=0, description="Kilometerstand")
    vin: Optional[str] = Field(None, description="Fahrzeug-Identifizierungsnummer")
    color: Optional[str] = Field(None, description="Farbe")
    fuel_type: Optional[str] = Field(None, description="Kraftstoffart")
    status: str = Field(default="active", description="Status: active, maintenance, inactive")
    location: Optional[str] = Field(None, description="Standort")
    notes: Optional[str] = Field(None, description="Notizen")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class VehicleCreate(BaseModel):
    license_plate: str
    tenant_id: str
    brand: str
    model: str
    year: int
    mileage: int = 0
    vin: Optional[str] = None
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    status: str = "active"
    location: Optional[str] = None
    notes: Optional[str] = None

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    mileage: Optional[int] = None
    vin: Optional[str] = None
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

@router.get("/vehicles")
async def get_vehicles(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    license_plate: Optional[str] = Query(None, description="Search by license plate"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    status: Optional[str] = Query(None, description="Filter by status"),
    year: Optional[int] = Query(None, description="Filter by year"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Get all vehicles with optional filters"""
    try:
        query = {}
        
        # Build filter query
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if license_plate:
            # Case-insensitive partial match
            query["license_plate"] = {"$regex": license_plate, "$options": "i"}
        
        if brand:
            query["brand"] = {"$regex": brand, "$options": "i"}
        
        if status:
            query["status"] = status
        
        if year:
            query["year"] = year
        
        # Get vehicles
        vehicles_cursor = db.vehicles.find(query, {"_id": 0}).skip(skip).limit(limit)
        vehicles = await vehicles_cursor.to_list(length=limit)
        
        # Get tenant names
        for vehicle in vehicles:
            if vehicle.get("tenant_id"):
                tenant = await db.tenants.find_one(
                    {"tenant_id": vehicle["tenant_id"]}, 
                    {"_id": 0, "name": 1}
                )
                if tenant:
                    vehicle["tenant_name"] = tenant.get("name", "Unknown")
        
        # Get total count
        total = await db.vehicles.count_documents(query)
        
        return {
            "success": True,
            "data": {
                "vehicles": vehicles,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Get a specific vehicle by ID"""
    try:
        vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Get tenant name
        if vehicle.get("tenant_id"):
            tenant = await db.tenants.find_one(
                {"tenant_id": vehicle["tenant_id"]}, 
                {"_id": 0, "name": 1}
            )
            if tenant:
                vehicle["tenant_name"] = tenant.get("name", "Unknown")
        
        return {
            "success": True,
            "data": vehicle
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate):
    """Create a new vehicle"""
    try:
        # Check if license plate already exists
        existing = await db.vehicles.find_one(
            {"license_plate": vehicle.license_plate.upper()}, 
            {"_id": 0}
        )
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Vehicle with this license plate already exists"
            )
        
        # Generate ID
        from uuid import uuid4
        vehicle_id = str(uuid4())
        
        # Create vehicle document
        vehicle_dict = vehicle.dict()
        vehicle_dict["id"] = vehicle_id
        vehicle_dict["license_plate"] = vehicle_dict["license_plate"].upper()
        vehicle_dict["created_at"] = datetime.utcnow()
        vehicle_dict["updated_at"] = datetime.utcnow()
        
        # Insert into database
        await db.vehicles.insert_one(vehicle_dict)
        
        # Return created vehicle
        created_vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Vehicle created successfully",
            "data": created_vehicle
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, vehicle_update: VehicleUpdate):
    """Update a vehicle"""
    try:
        # Check if vehicle exists
        existing = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Prepare update data
        update_data = {
            k: v for k, v in vehicle_update.dict(exclude_unset=True).items() 
            if v is not None
        }
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        # Uppercase license plate if provided
        if "license_plate" in update_data:
            update_data["license_plate"] = update_data["license_plate"].upper()
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update vehicle
        await db.vehicles.update_one(
            {"id": vehicle_id},
            {"$set": update_data}
        )
        
        # Return updated vehicle
        updated_vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Vehicle updated successfully",
            "data": updated_vehicle
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    """Delete a vehicle"""
    try:
        # Check if vehicle exists
        existing = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Delete vehicle
        await db.vehicles.delete_one({"id": vehicle_id})
        
        return {
            "success": True,
            "message": "Vehicle deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicles/stats/summary")
async def get_vehicle_stats():
    """Get vehicle statistics"""
    try:
        total = await db.vehicles.count_documents({})
        active = await db.vehicles.count_documents({"status": "active"})
        maintenance = await db.vehicles.count_documents({"status": "maintenance"})
        inactive = await db.vehicles.count_documents({"status": "inactive"})
        
        # Get vehicles by brand
        brands_pipeline = [
            {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        brands_cursor = db.vehicles.aggregate(brands_pipeline)
        brands = await brands_cursor.to_list(length=10)
        
        return {
            "success": True,
            "data": {
                "total": total,
                "active": active,
                "maintenance": maintenance,
                "inactive": inactive,
                "by_brand": brands
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
