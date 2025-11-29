"""
Europcar Customers API Routes
Modul 3: Kundenverwaltung / CRM
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.europcar_models import (
    Customer, CustomerCreate, CustomerUpdate, StandardResponse
)

router = APIRouter(prefix="/api/europcar/customers", tags=["Europcar Customers"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


@router.get("/list", response_model=StandardResponse)
async def list_customers(
    customer_type: Optional[str] = None,
    blacklist: Optional[bool] = None
):
    """
    Liste alle Kunden
    """
    try:
        query = {}
        if customer_type:
            query["customer_type"] = customer_type
        if blacklist is not None:
            query["blacklist"] = blacklist
        
        customers = await db.europcar_customers.find(query, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(customers)} Kunden gefunden",
            data={"customers": customers}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}", response_model=StandardResponse)
async def get_customer(customer_id: str):
    """
    Hole einen spezifischen Kunden
    """
    try:
        customer = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Kunde gefunden",
            data={"customer": customer}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse)
async def create_customer(customer_data: CustomerCreate):
    """
    Erstelle einen neuen Kunden
    """
    try:
        # Check if customer with email already exists
        existing = await db.europcar_customers.find_one(
            {"email": customer_data.email},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Kunde mit dieser E-Mail existiert bereits"
            )
        
        now = datetime.now(timezone.utc).isoformat()
        customer_id = str(uuid4())
        
        customer = Customer(
            id=customer_id,
            customer_type=customer_data.customer_type,
            vorname=customer_data.vorname,
            nachname=customer_data.nachname,
            email=customer_data.email,
            telefon=customer_data.telefon,
            geburtsdatum=customer_data.geburtsdatum,
            strasse=customer_data.strasse,
            plz=customer_data.plz,
            stadt=customer_data.stadt,
            ausweis_nummer=customer_data.ausweis_nummer,
            ausweis_typ=customer_data.ausweis_typ,
            ausweis_ablaufdatum=customer_data.ausweis_ablaufdatum,
            fuehrerschein=customer_data.fuehrerschein,
            firma=customer_data.firma,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_customers.insert_one(customer.model_dump())
        
        return StandardResponse(
            success=True,
            message="Kunde erfolgreich erstellt",
            data={"customer": customer.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{customer_id}", response_model=StandardResponse)
async def update_customer(customer_id: str, update_data: CustomerUpdate):
    """
    Aktualisiere Kundendaten
    """
    try:
        customer = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_customers.update_one(
            {"id": customer_id},
            {"$set": update_dict}
        )
        
        updated = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Kunde erfolgreich aktualisiert",
            data={"customer": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{customer_id}", response_model=StandardResponse)
async def delete_customer(customer_id: str):
    """
    Lösche einen Kunden
    """
    try:
        # Check if customer has active reservations
        active_reservations = await db.europcar_reservations.count_documents(
            {
                "customer_id": customer_id,
                "status": {"$in": ["confirmed", "active"]}
            }
        )
        
        if active_reservations > 0:
            raise HTTPException(
                status_code=400,
                detail="Kunde hat aktive Reservierungen und kann nicht gelöscht werden"
            )
        
        result = await db.europcar_customers.delete_one({"id": customer_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Kunde erfolgreich gelöscht",
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{customer_id}/tsrid-verify", response_model=StandardResponse)
async def verify_customer_with_tsrid(customer_id: str, scan_id: str, scan_data: dict):
    """
    Verifiziere Kunden mit TSRID Ausweis-Scan
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_customers.update_one(
            {"id": customer_id},
            {
                "$set": {
                    "tsrid_scan_id": scan_id,
                    "ausweis_verifiziert": True,
                    "ausweis_verifiziert_am": now,
                    "updated_at": now
                }
            }
        )
        
        customer = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Kunde erfolgreich mit TSRID verifiziert",
            data={"customer": customer}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{customer_id}/blacklist", response_model=StandardResponse)
async def blacklist_customer(customer_id: str, grund: str):
    """
    Setze Kunden auf Blacklist
    """
    try:
        await db.europcar_customers.update_one(
            {"id": customer_id},
            {
                "$set": {
                    "blacklist": True,
                    "blacklist_grund": grund,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        customer = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Kunde auf Blacklist gesetzt",
            data={"customer": customer}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{customer_id}/remove-blacklist", response_model=StandardResponse)
async def remove_blacklist(customer_id: str):
    """
    Entferne Kunden von Blacklist
    """
    try:
        await db.europcar_customers.update_one(
            {"id": customer_id},
            {
                "$set": {
                    "blacklist": False,
                    "blacklist_grund": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        customer = await db.europcar_customers.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Kunde von Blacklist entfernt",
            data={"customer": customer}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
