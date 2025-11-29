"""
Europcar Vehicles API Routes
Modul 1: Fahrzeugverwaltung (Flottenmanagement)
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.europcar_models import (
    Vehicle, VehicleCreate, VehicleUpdate, VehicleDamageRecord,
    VehicleMaintenanceRecord, VehicleStatus, StandardResponse
)

router = APIRouter(prefix="/api/europcar/vehicles", tags=["Europcar Vehicles"])

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


@router.get("/list", response_model=StandardResponse)
async def list_vehicles(station_id: Optional[str] = None, status: Optional[str] = None):
    """
    Liste alle Fahrzeuge (mit optionalem Filter nach Station und Status)
    """
    try:
        query = {}
        if station_id:
            query["station_id"] = station_id
        if status:
            query["status"] = status
        
        vehicles = await db.europcar_vehicles.find(query, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(vehicles)} Fahrzeuge gefunden",
            data={"vehicles": vehicles}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vehicle_id}", response_model=StandardResponse)
async def get_vehicle(vehicle_id: str):
    """
    Hole ein spezifisches Fahrzeug nach ID
    """
    try:
        vehicle = await db.europcar_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Fahrzeug gefunden",
            data={"vehicle": vehicle}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_vehicle(vehicle_data: VehicleCreate):
    """
    Erstelle ein neues Fahrzeug
    """
    try:
        # Check if vehicle with VIN already exists
        existing = await db.europcar_vehicles.find_one({"vin": vehicle_data.vin}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Fahrzeug mit dieser VIN existiert bereits")
        
        now = datetime.now(timezone.utc).isoformat()
        vehicle_id = str(uuid4())
        
        vehicle = Vehicle(
            id=vehicle_id,
            marke=vehicle_data.marke,
            modell=vehicle_data.modell,
            baujahr=vehicle_data.baujahr,
            kraftstoff=vehicle_data.kraftstoff,
            getriebe=vehicle_data.getriebe,
            vin=vehicle_data.vin,
            kennzeichen=vehicle_data.kennzeichen,
            zulassung=vehicle_data.zulassung,
            kilometerstand=vehicle_data.kilometerstand,
            tankstand=vehicle_data.tankstand,
            status=VehicleStatus.available,
            verfuegbar=True,
            wartungsintervall_km=vehicle_data.wartungsintervall_km,
            naechste_wartung_km=vehicle_data.kilometerstand + vehicle_data.wartungsintervall_km,
            reifenstatus=vehicle_data.reifenstatus,
            station_id=vehicle_data.station_id,
            zusatzausstattung=vehicle_data.zusatzausstattung,
            batterie_kapazitaet=vehicle_data.batterie_kapazitaet,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_vehicles.insert_one(vehicle.model_dump())
        
        return StandardResponse(
            success=True,
            message="Fahrzeug erfolgreich erstellt",
            data={"vehicle": vehicle.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{vehicle_id}", response_model=StandardResponse)
async def update_vehicle(vehicle_id: str, update_data: VehicleUpdate):
    """
    Aktualisiere Fahrzeugdaten
    """
    try:
        vehicle = await db.europcar_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_vehicles.update_one(
            {"id": vehicle_id},
            {"$set": update_dict}
        )
        
        updated_vehicle = await db.europcar_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        
        return StandardResponse(
            success=True,
            message="Fahrzeug erfolgreich aktualisiert",
            data={"vehicle": updated_vehicle}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{vehicle_id}", response_model=StandardResponse)
async def delete_vehicle(vehicle_id: str):
    """
    Lösche ein Fahrzeug
    """
    try:
        result = await db.europcar_vehicles.delete_one({"id": vehicle_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Fahrzeug erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{vehicle_id}/damage", response_model=StandardResponse)
async def add_damage(vehicle_id: str, damage: VehicleDamageRecord):
    """
    Füge einen Schaden zum Fahrzeug hinzu
    """
    try:
        vehicle = await db.europcar_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        await db.europcar_vehicles.update_one(
            {"id": vehicle_id},
            {
                "$push": {"schaeden": damage.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return StandardResponse(
            success=True,
            message="Schaden erfolgreich hinzugefügt",
            data={"damage": damage.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{vehicle_id}/maintenance", response_model=StandardResponse)
async def add_maintenance(vehicle_id: str, maintenance: VehicleMaintenanceRecord):
    """
    Füge einen Wartungseintrag hinzu
    """
    try:
        vehicle = await db.europcar_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        await db.europcar_vehicles.update_one(
            {"id": vehicle_id},
            {
                "$push": {"wartungshistorie": maintenance.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return StandardResponse(
            success=True,
            message="Wartungseintrag erfolgreich hinzugefügt",
            data={"maintenance": maintenance.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/availability/check", response_model=StandardResponse)
async def check_availability(start_date: str, end_date: str, station_id: Optional[str] = None):
    """
    Prüfe Verfügbarkeit von Fahrzeugen für einen Zeitraum
    """
    try:
        # Query für verfügbare Fahrzeuge
        query = {"verfuegbar": True, "status": VehicleStatus.available.value}
        if station_id:
            query["station_id"] = station_id
        
        available_vehicles = await db.europcar_vehicles.find(query, {"_id": 0}).to_list(1000)
        
        # Prüfe Reservierungen für diesen Zeitraum
        reservations = await db.europcar_reservations.find(
            {
                "start_date": {"$lte": end_date},
                "end_date": {"$gte": start_date},
                "status": {"$in": ["confirmed", "active"]}
            },
            {"_id": 0}
        ).to_list(1000)
        
        reserved_vehicle_ids = {r["vehicle_id"] for r in reservations}
        truly_available = [v for v in available_vehicles if v["id"] not in reserved_vehicle_ids]
        
        return StandardResponse(
            success=True,
            message=f"{len(truly_available)} Fahrzeuge verfügbar",
            data={
                "available_vehicles": truly_available,
                "count": len(truly_available)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
