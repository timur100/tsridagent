"""
Europcar Contracts API Routes
Modul 4: Mietvertrag & Übergabeprozess
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.europcar_models import (
    Contract, ContractCreate, ContractSign, ContractStatus, StandardResponse
)

router = APIRouter(prefix="/api/europcar/contracts", tags=["Europcar Contracts"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


@router.get("/list", response_model=StandardResponse)
async def list_contracts():
    """
    Liste alle Mietverträge
    """
    try:
        contracts = await db.europcar_contracts.find({}, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(contracts)} Verträge gefunden",
            data={"contracts": contracts}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{contract_id}", response_model=StandardResponse)
async def get_contract(contract_id: str):
    """
    Hole einen spezifischen Mietvertrag
    """
    try:
        contract = await db.europcar_contracts.find_one(
            {"id": contract_id},
            {"_id": 0}
        )
        if not contract:
            raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Vertrag gefunden",
            data={"contract": contract}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_contract(contract_data: ContractCreate):
    """
    Erstelle einen neuen Mietvertrag (Übergabeprozess)
    """
    try:
        # Verify reservation exists
        reservation = await db.europcar_reservations.find_one(
            {"id": contract_data.reservation_id},
            {"_id": 0}
        )
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservierung nicht gefunden")
        
        # Verify vehicle exists
        vehicle = await db.europcar_vehicles.find_one(
            {"id": contract_data.vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Verify customer exists
        customer = await db.europcar_customers.find_one(
            {"id": contract_data.customer_id},
            {"_id": 0}
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        contract_id = str(uuid4())
        
        contract = Contract(
            id=contract_id,
            reservation_id=contract_data.reservation_id,
            customer_id=contract_data.customer_id,
            vehicle_id=contract_data.vehicle_id,
            uebergabe_datum=now,
            uebergabe_station_id=contract_data.uebergabe_station_id,
            uebergabe_mitarbeiter_id=contract_data.uebergabe_mitarbeiter_id,
            uebergabe_kilometerstand=contract_data.uebergabe_kilometerstand,
            uebergabe_tankstand=contract_data.uebergabe_tankstand,
            uebergabe_zustand=contract_data.uebergabe_zustand,
            status=ContractStatus.draft,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_contracts.insert_one(contract.model_dump())
        
        # Update reservation status to active
        await db.europcar_reservations.update_one(
            {"id": contract_data.reservation_id},
            {"$set": {"status": "active", "updated_at": now}}
        )
        
        # Update vehicle status to rented
        await db.europcar_vehicles.update_one(
            {"id": contract_data.vehicle_id},
            {
                "$set": {
                    "status": "rented",
                    "verfuegbar": False,
                    "updated_at": now
                }
            }
        )
        
        return StandardResponse(
            success=True,
            message="Mietvertrag erfolgreich erstellt",
            data={"contract": contract.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sign", response_model=StandardResponse)
async def sign_contract(sign_data: ContractSign):
    """
    Unterschreibe einen Mietvertrag (digitale Unterschrift)
    """
    try:
        contract = await db.europcar_contracts.find_one(
            {"id": sign_data.contract_id},
            {"_id": 0}
        )
        if not contract:
            raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_contracts.update_one(
            {"id": sign_data.contract_id},
            {
                "$set": {
                    "unterschrift_kunde": sign_data.unterschrift_kunde,
                    "unterschrift_datum": now,
                    "status": ContractStatus.active.value,
                    "updated_at": now
                }
            }
        )
        
        updated_contract = await db.europcar_contracts.find_one(
            {"id": sign_data.contract_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Vertrag erfolgreich unterschrieben",
            data={"contract": updated_contract}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{contract_id}/photos", response_model=StandardResponse)
async def add_photos(contract_id: str, photos: list[str]):
    """
    Füge Übergabefotos zum Vertrag hinzu
    """
    try:
        contract = await db.europcar_contracts.find_one(
            {"id": contract_id},
            {"_id": 0}
        )
        if not contract:
            raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
        
        await db.europcar_contracts.update_one(
            {"id": contract_id},
            {
                "$push": {"uebergabe_fotos": {"$each": photos}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        updated_contract = await db.europcar_contracts.find_one(
            {"id": contract_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Fotos erfolgreich hinzugefügt",
            data={"contract": updated_contract}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{contract_id}", response_model=StandardResponse)
async def delete_contract(contract_id: str):
    """
    Lösche einen Mietvertrag
    """
    try:
        result = await db.europcar_contracts.delete_one({"id": contract_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Vertrag erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
