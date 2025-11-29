"""
Europcar Reservations API Routes
Modul 2: Reservierungen & Buchungssystem
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.europcar_models import (
    Reservation, ReservationCreate, ReservationUpdate,
    ReservationStatus, StandardResponse
)

router = APIRouter(prefix="/api/europcar/reservations", tags=["Europcar Reservations"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


@router.get("/list", response_model=StandardResponse)
async def list_reservations(
    customer_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Liste alle Reservierungen mit optionalen Filtern
    """
    try:
        query = {}
        if customer_id:
            query["customer_id"] = customer_id
        if vehicle_id:
            query["vehicle_id"] = vehicle_id
        if status:
            query["status"] = status
        
        reservations = await db.europcar_reservations.find(query, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(reservations)} Reservierungen gefunden",
            data={"reservations": reservations}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{reservation_id}", response_model=StandardResponse)
async def get_reservation(reservation_id: str):
    """
    Hole eine spezifische Reservierung
    """
    try:
        reservation = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservierung nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Reservierung gefunden",
            data={"reservation": reservation}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_reservation(reservation_data: ReservationCreate, created_by: str):
    """
    Erstelle eine neue Reservierung
    """
    try:
        # Check if vehicle exists and is available
        vehicle = await db.europcar_vehicles.find_one(
            {"id": reservation_data.vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        if not vehicle.get("verfuegbar"):
            raise HTTPException(status_code=400, detail="Fahrzeug ist nicht verfügbar")
        
        # Check if customer exists
        customer = await db.europcar_customers.find_one(
            {"id": reservation_data.customer_id},
            {"_id": 0}
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        # Calculate price (simple mock calculation for Phase 1)
        # Phase 2 will have dynamic pricing with KI
        from datetime import datetime as dt
        start = dt.fromisoformat(reservation_data.start_date)
        end = dt.fromisoformat(reservation_data.end_date)
        days = (end - start).days + 1
        
        base_daily_rate = 50.0  # Mock base rate
        base_price = days * base_daily_rate
        
        # Additional options pricing
        additional_price = 0.0
        if reservation_data.optionen.gps:
            additional_price += days * 5
        if reservation_data.optionen.kindersitz > 0:
            additional_price += reservation_data.optionen.kindersitz * days * 3
        if reservation_data.optionen.lte_hotspot:
            additional_price += days * 4
        if reservation_data.optionen.tablet_scanner:
            additional_price += days * 10
        
        total_price = base_price + additional_price
        
        now = datetime.now(timezone.utc).isoformat()
        reservation_id = str(uuid4())
        
        reservation = Reservation(
            id=reservation_id,
            customer_id=reservation_data.customer_id,
            vehicle_id=reservation_data.vehicle_id,
            start_date=reservation_data.start_date,
            end_date=reservation_data.end_date,
            start_station_id=reservation_data.start_station_id,
            end_station_id=reservation_data.end_station_id,
            base_price=base_price,
            additional_options_price=additional_price,
            total_price=total_price,
            optionen=reservation_data.optionen,
            status=ReservationStatus.pending,
            buchungstyp=reservation_data.buchungstyp,
            created_at=now,
            updated_at=now,
            created_by=created_by
        )
        
        await db.europcar_reservations.insert_one(reservation.model_dump())
        
        return StandardResponse(
            success=True,
            message="Reservierung erfolgreich erstellt",
            data={"reservation": reservation.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{reservation_id}", response_model=StandardResponse)
async def update_reservation(reservation_id: str, update_data: ReservationUpdate):
    """
    Aktualisiere eine Reservierung
    """
    try:
        reservation = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservierung nicht gefunden")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_reservations.update_one(
            {"id": reservation_id},
            {"$set": update_dict}
        )
        
        updated = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Reservierung erfolgreich aktualisiert",
            data={"reservation": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{reservation_id}/confirm", response_model=StandardResponse)
async def confirm_reservation(reservation_id: str):
    """
    Bestätige eine Reservierung
    """
    try:
        await db.europcar_reservations.update_one(
            {"id": reservation_id},
            {
                "$set": {
                    "status": ReservationStatus.confirmed.value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        reservation = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Reservierung bestätigt",
            data={"reservation": reservation}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{reservation_id}/cancel", response_model=StandardResponse)
async def cancel_reservation(reservation_id: str, grund: Optional[str] = None):
    """
    Storniere eine Reservierung
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_reservations.update_one(
            {"id": reservation_id},
            {
                "$set": {
                    "status": ReservationStatus.cancelled.value,
                    "storniert_am": now,
                    "stornierungsgrund": grund,
                    "updated_at": now
                }
            }
        )
        
        reservation = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Reservierung storniert",
            data={"reservation": reservation}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{reservation_id}", response_model=StandardResponse)
async def delete_reservation(reservation_id: str):
    """
    Lösche eine Reservierung
    """
    try:
        result = await db.europcar_reservations.delete_one({"id": reservation_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Reservierung nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Reservierung erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
