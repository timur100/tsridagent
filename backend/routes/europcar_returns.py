"""
Europcar Returns API Routes
Modul 5: Rückgabeprozess
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.europcar_models import (
    VehicleReturn, VehicleReturnCreate, VehicleReturnUpdate, StandardResponse
)

router = APIRouter(prefix="/api/europcar/returns", tags=["Europcar Returns"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


@router.get("/list", response_model=StandardResponse)
async def list_returns():
    """
    Liste alle Rückgaben
    """
    try:
        returns = await db.europcar_returns.find({}, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(returns)} Rückgaben gefunden",
            data={"returns": returns}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{return_id}", response_model=StandardResponse)
async def get_return(return_id: str):
    """
    Hole eine spezifische Rückgabe
    """
    try:
        vehicle_return = await db.europcar_returns.find_one(
            {"id": return_id},
            {"_id": 0}
        )
        if not vehicle_return:
            raise HTTPException(status_code=404, detail="Rückgabe nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Rückgabe gefunden",
            data={"return": vehicle_return}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_return(return_data: VehicleReturnCreate):
    """
    Erstelle eine neue Rückgabe
    """
    try:
        # Verify contract exists
        contract = await db.europcar_contracts.find_one(
            {"id": return_data.contract_id},
            {"_id": 0}
        )
        if not contract:
            raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
        
        reservation_id = contract["reservation_id"]
        customer_id = contract["customer_id"]
        vehicle_id = contract["vehicle_id"]
        
        # Calculate additional charges
        zusaetzliche_gebuehren = []
        gesamtbetrag = 0.0
        
        # Fuel charge if tank is not full
        if return_data.rueckgabe_tankstand < 100:
            fuel_charge_amount = (100 - return_data.rueckgabe_tankstand) * 2.0  # 2 EUR per percent
            zusaetzliche_gebuehren.append({
                "type": "fuel",
                "amount": fuel_charge_amount,
                "description": f"Tankfüllung fehlt: {100 - return_data.rueckgabe_tankstand}%"
            })
            gesamtbetrag += fuel_charge_amount
        
        # Cleaning charge
        if return_data.reinigung_erforderlich:
            cleaning_charge = 50.0
            zusaetzliche_gebuehren.append({
                "type": "cleaning",
                "amount": cleaning_charge,
                "description": "Reinigungsgebühr"
            })
            gesamtbetrag += cleaning_charge
        
        # Damage charges
        for damage in return_data.neue_schaeden:
            if damage.repair_cost:
                zusaetzliche_gebuehren.append({
                    "type": "damage",
                    "amount": damage.repair_cost,
                    "description": f"Schaden: {damage.description}"
                })
                gesamtbetrag += damage.repair_cost
        
        now = datetime.now(timezone.utc).isoformat()
        return_id = str(uuid4())
        
        vehicle_return = VehicleReturn(
            id=return_id,
            contract_id=return_data.contract_id,
            reservation_id=reservation_id,
            customer_id=customer_id,
            vehicle_id=vehicle_id,
            rueckgabe_datum=now,
            rueckgabe_station_id=return_data.rueckgabe_station_id,
            rueckgabe_mitarbeiter_id=return_data.rueckgabe_mitarbeiter_id,
            rueckgabe_kilometerstand=return_data.rueckgabe_kilometerstand,
            rueckgabe_tankstand=return_data.rueckgabe_tankstand,
            neue_schaeden=return_data.neue_schaeden,
            zusaetzliche_gebuehren=zusaetzliche_gebuehren,
            gesamtbetrag_zusatzkosten=gesamtbetrag,
            reinigung_erforderlich=return_data.reinigung_erforderlich,
            fahrzeug_bereit=not return_data.reinigung_erforderlich and len(return_data.neue_schaeden) == 0,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_returns.insert_one(vehicle_return.model_dump())
        
        # Update contract status to completed
        await db.europcar_contracts.update_one(
            {"id": return_data.contract_id},
            {"$set": {"status": "completed", "updated_at": now}}
        )
        
        # Update reservation status to completed
        await db.europcar_reservations.update_one(
            {"id": reservation_id},
            {"$set": {"status": "completed", "updated_at": now}}
        )
        
        # Update vehicle status
        vehicle_status = "available" if vehicle_return.fahrzeug_bereit else "maintenance"
        await db.europcar_vehicles.update_one(
            {"id": vehicle_id},
            {
                "$set": {
                    "status": vehicle_status,
                    "verfuegbar": vehicle_return.fahrzeug_bereit,
                    "kilometerstand": return_data.rueckgabe_kilometerstand,
                    "tankstand": return_data.rueckgabe_tankstand,
                    "updated_at": now
                }
            }
        )
        
        # Add damages to vehicle
        if return_data.neue_schaeden:
            await db.europcar_vehicles.update_one(
                {"id": vehicle_id},
                {"$push": {"schaeden": {"$each": [d.model_dump() for d in return_data.neue_schaeden]}}}
            )
        
        return StandardResponse(
            success=True,
            message="Rückgabe erfolgreich erstellt",
            data={"return": vehicle_return.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{return_id}", response_model=StandardResponse)
async def update_return(return_id: str, update_data: VehicleReturnUpdate):
    """
    Aktualisiere Rückgabedaten
    """
    try:
        vehicle_return = await db.europcar_returns.find_one(
            {"id": return_id},
            {"_id": 0}
        )
        if not vehicle_return:
            raise HTTPException(status_code=404, detail="Rückgabe nicht gefunden")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Recalculate total if zusaetzliche_gebuehren updated
        if "zusaetzliche_gebuehren" in update_dict:
            total = sum(charge["amount"] for charge in update_dict["zusaetzliche_gebuehren"])
            update_dict["gesamtbetrag_zusatzkosten"] = total
        
        await db.europcar_returns.update_one(
            {"id": return_id},
            {"$set": update_dict}
        )
        
        # If fahrzeug_bereit is updated, update vehicle status
        if "fahrzeug_bereit" in update_dict:
            vehicle_id = vehicle_return["vehicle_id"]
            vehicle_status = "available" if update_dict["fahrzeug_bereit"] else "maintenance"
            await db.europcar_vehicles.update_one(
                {"id": vehicle_id},
                {
                    "$set": {
                        "status": vehicle_status,
                        "verfuegbar": update_dict["fahrzeug_bereit"],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        updated = await db.europcar_returns.find_one(
            {"id": return_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Rückgabe erfolgreich aktualisiert",
            data={"return": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{return_id}", response_model=StandardResponse)
async def delete_return(return_id: str):
    """
    Lösche eine Rückgabe
    """
    try:
        result = await db.europcar_returns.delete_one({"id": return_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rückgabe nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Rückgabe erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
