"""
Europcar Tracking API Routes
Modul 10: GPS-Tracking / Telematik (Mock)
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import random

router = APIRouter(prefix="/api/europcar/tracking", tags=["Europcar Tracking"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class GPSLocation(BaseModel):
    lat: float
    lng: float
    timestamp: str
    speed: Optional[float] = 0.0  # km/h
    heading: Optional[float] = 0.0  # degrees


class TelemetryData(BaseModel):
    vehicle_id: str
    timestamp: str
    location: GPSLocation
    engine_status: str  # "on", "off"
    fuel_level: int  # percent
    battery_level: Optional[int] = None  # percent (for electric)
    odometer: int  # km
    speed: float  # km/h
    rpm: Optional[int] = None
    engine_temperature: Optional[float] = None
    tire_pressure: Optional[dict] = None  # {"fl": 2.2, "fr": 2.2, "rl": 2.1, "rr": 2.1}
    diagnostics: Optional[dict] = None  # OBD-II codes


class Geofence(BaseModel):
    id: str
    name: str
    center_lat: float
    center_lng: float
    radius: float  # meters
    type: str  # "allowed", "restricted", "alert"
    active: bool = True
    created_at: str


class GeofenceCreate(BaseModel):
    name: str
    center_lat: float
    center_lng: float
    radius: float
    type: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/vehicle/{vehicle_id}/location", response_model=StandardResponse)
async def get_vehicle_location(vehicle_id: str):
    """
    Hole aktuelle GPS-Position des Fahrzeugs (Mock)
    """
    try:
        vehicle = await db.europcar_vehicles.find_one(
            {"id": vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Mock GPS location (simulate near Munich, Germany)
        mock_location = GPSLocation(
            lat=48.1351 + random.uniform(-0.1, 0.1),
            lng=11.5820 + random.uniform(-0.1, 0.1),
            timestamp=datetime.now(timezone.utc).isoformat(),
            speed=random.uniform(0, 120),
            heading=random.uniform(0, 360)
        )
        
        return StandardResponse(
            success=True,
            message="Position erfolgreich abgerufen",
            data={"location": mock_location.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle/{vehicle_id}/telemetry", response_model=StandardResponse)
async def get_vehicle_telemetry(vehicle_id: str):
    """
    Hole Telemetrie-Daten des Fahrzeugs (Mock)
    """
    try:
        vehicle = await db.europcar_vehicles.find_one(
            {"id": vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Mock telemetry data
        is_electric = vehicle.get("kraftstoff") == "elektro"
        
        telemetry = TelemetryData(
            vehicle_id=vehicle_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            location=GPSLocation(
                lat=48.1351 + random.uniform(-0.1, 0.1),
                lng=11.5820 + random.uniform(-0.1, 0.1),
                timestamp=datetime.now(timezone.utc).isoformat(),
                speed=random.uniform(0, 120),
                heading=random.uniform(0, 360)
            ),
            engine_status="on" if random.random() > 0.3 else "off",
            fuel_level=vehicle.get("tankstand", 100),
            battery_level=vehicle.get("ladestand") if is_electric else None,
            odometer=vehicle.get("kilometerstand", 0),
            speed=random.uniform(0, 120),
            rpm=random.randint(800, 4000) if not is_electric else None,
            engine_temperature=random.uniform(80, 95) if not is_electric else None,
            tire_pressure={
                "fl": round(random.uniform(2.0, 2.5), 1),
                "fr": round(random.uniform(2.0, 2.5), 1),
                "rl": round(random.uniform(2.0, 2.5), 1),
                "rr": round(random.uniform(2.0, 2.5), 1)
            },
            diagnostics={}
        )
        
        return StandardResponse(
            success=True,
            message="Telemetrie-Daten erfolgreich abgerufen",
            data={"telemetry": telemetry.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle/{vehicle_id}/history", response_model=StandardResponse)
async def get_vehicle_location_history(vehicle_id: str, hours: int = 24):
    """
    Hole GPS-Verlauf des Fahrzeugs (Mock)
    """
    try:
        vehicle = await db.europcar_vehicles.find_one(
            {"id": vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Mock location history (simulate route)
        history = []
        base_lat = 48.1351
        base_lng = 11.5820
        
        for i in range(min(hours, 50)):  # Limit to 50 points
            history.append({
                "lat": base_lat + random.uniform(-0.05, 0.05),
                "lng": base_lng + random.uniform(-0.05, 0.05),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "speed": random.uniform(0, 100)
            })
        
        return StandardResponse(
            success=True,
            message=f"{len(history)} GPS-Punkte gefunden",
            data={"history": history}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geofences/list", response_model=StandardResponse)
async def list_geofences():
    """
    Liste alle Geofences
    """
    try:
        geofences = await db.europcar_geofences.find({"active": True}, {"_id": 0}).to_list(1000)
        return StandardResponse(
            success=True,
            message=f"{len(geofences)} Geofences gefunden",
            data={"geofences": geofences}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/geofences/create", response_model=StandardResponse)
async def create_geofence(geofence_data: GeofenceCreate):
    """
    Erstelle einen neuen Geofence
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        geofence_id = str(uuid4())
        
        geofence = Geofence(
            id=geofence_id,
            name=geofence_data.name,
            center_lat=geofence_data.center_lat,
            center_lng=geofence_data.center_lng,
            radius=geofence_data.radius,
            type=geofence_data.type,
            created_at=now
        )
        
        await db.europcar_geofences.insert_one(geofence.model_dump())
        
        return StandardResponse(
            success=True,
            message="Geofence erfolgreich erstellt",
            data={"geofence": geofence.model_dump()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fleet/overview", response_model=StandardResponse)
async def fleet_tracking_overview():
    """
    Übersicht über alle Fahrzeuge mit GPS-Status
    """
    try:
        vehicles = await db.europcar_vehicles.find({}, {"_id": 0}).to_list(1000)
        
        fleet_data = []
        for vehicle in vehicles:
            # Mock current location
            fleet_data.append({
                "vehicle_id": vehicle["id"],
                "marke": vehicle["marke"],
                "modell": vehicle["modell"],
                "kennzeichen": vehicle["kennzeichen"],
                "status": vehicle["status"],
                "location": {
                    "lat": 48.1351 + random.uniform(-0.2, 0.2),
                    "lng": 11.5820 + random.uniform(-0.2, 0.2)
                },
                "speed": random.uniform(0, 80) if vehicle["status"] == "rented" else 0,
                "fuel_level": vehicle.get("tankstand", 100)
            })
        
        return StandardResponse(
            success=True,
            message=f"{len(fleet_data)} Fahrzeuge getrackt",
            data={"fleet": fleet_data}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
