"""
Europcar Stations API Routes
Modul 6: Stationen / Filialmanagement
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/stations", tags=["Europcar Stations"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class Station(BaseModel):
    id: str
    name: str
    adresse: str
    stadt: str
    plz: str
    land: str = "Deutschland"
    telefon: str
    email: str
    oeffnungszeiten: dict  # {"montag": "08:00-18:00", etc.}
    mitarbeiter_ids: List[str] = []
    fahrzeuge_count: int = 0
    kapazitaet: int
    status: str = "active"  # active, inactive, maintenance
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: str
    updated_at: str


class StationCreate(BaseModel):
    name: str
    adresse: str
    stadt: str
    plz: str
    telefon: str
    email: str
    oeffnungszeiten: dict
    kapazitaet: int
    lat: Optional[float] = None
    lng: Optional[float] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/list", response_model=StandardResponse)
async def list_stations(status: Optional[str] = None):
    """
    Liste alle Stationen
    """
    try:
        query = {}
        if status:
            query["status"] = status
        
        stations = await db.europcar_stations.find(query, {"_id": 0}).to_list(1000)
        
        # Count vehicles at each station
        for station in stations:
            vehicle_count = await db.europcar_vehicles.count_documents({"station_id": station["id"]})
            station["fahrzeuge_count"] = vehicle_count
        
        return StandardResponse(
            success=True,
            message=f"{len(stations)} Stationen gefunden",
            data={"stations": stations}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{station_id}", response_model=StandardResponse)
async def get_station(station_id: str):
    """
    Hole eine spezifische Station
    """
    try:
        station = await db.europcar_stations.find_one({"id": station_id}, {"_id": 0})
        if not station:
            raise HTTPException(status_code=404, detail="Station nicht gefunden")
        
        # Count vehicles
        vehicle_count = await db.europcar_vehicles.count_documents({"station_id": station_id})
        station["fahrzeuge_count"] = vehicle_count
        
        return StandardResponse(
            success=True,
            message="Station gefunden",
            data={"station": station}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_station(station_data: StationCreate):
    """
    Erstelle eine neue Station
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        station_id = str(uuid4())
        
        station = Station(
            id=station_id,
            name=station_data.name,
            adresse=station_data.adresse,
            stadt=station_data.stadt,
            plz=station_data.plz,
            telefon=station_data.telefon,
            email=station_data.email,
            oeffnungszeiten=station_data.oeffnungszeiten,
            kapazitaet=station_data.kapazitaet,
            lat=station_data.lat,
            lng=station_data.lng,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_stations.insert_one(station.model_dump())
        
        return StandardResponse(
            success=True,
            message="Station erfolgreich erstellt",
            data={"station": station.model_dump()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{station_id}", response_model=StandardResponse)
async def delete_station(station_id: str):
    """
    Lösche eine Station
    """
    try:
        # Check if station has vehicles
        vehicle_count = await db.europcar_vehicles.count_documents({"station_id": station_id})
        if vehicle_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Station hat noch {vehicle_count} Fahrzeuge und kann nicht gelöscht werden"
            )
        
        result = await db.europcar_stations.delete_one({"id": station_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Station nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Station erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
