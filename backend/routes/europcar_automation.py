"""
Europcar Automation API Routes
Modul 12: Workflow-Automation
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/automation", tags=["Europcar Automation"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class AutomationRule(BaseModel):
    id: str
    name: str
    type: str  # "reminder", "status_update", "notification", "invoice"
    trigger: str  # "reservation_confirmed", "return_overdue", "damage_reported", etc.
    action: dict  # {"type": "send_email", "template": "...", "to": "..."}
    conditions: Optional[dict] = None
    active: bool = True
    created_at: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/check-overdue-returns", response_model=StandardResponse)
async def check_overdue_returns():
    """
    Automatische Prüfung auf überfällige Rückgaben
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        # Find active reservations past end date
        overdue_reservations = await db.europcar_reservations.find(
            {
                "status": "active",
                "end_date": {"$lt": now}
            },
            {"_id": 0}
        ).to_list(1000)
        
        notifications_sent = 0
        for reservation in overdue_reservations:
            # Create notification/reminder (mock)
            notification = {
                "type": "overdue_return",
                "reservation_id": reservation["id"],
                "customer_id": reservation["customer_id"],
                "message": f"Fahrzeugrückgabe überfällig seit {reservation['end_date']}",
                "created_at": now
            }
            await db.europcar_notifications.insert_one(notification)
            notifications_sent += 1
        
        return StandardResponse(
            success=True,
            message=f"{notifications_sent} Benachrichtigungen gesendet",
            data={
                "overdue_count": len(overdue_reservations),
                "notifications_sent": notifications_sent
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-update-vehicle-status", response_model=StandardResponse)
async def auto_update_vehicle_status():
    """
    Automatische Fahrzeugstatus-Aktualisierung
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        updates_count = 0
        
        # Check vehicles in maintenance that are ready
        maintenance_vehicles = await db.europcar_vehicles.find(
            {"status": "maintenance"},
            {"_id": 0}
        ).to_list(1000)
        
        for vehicle in maintenance_vehicles:
            # Check if all repairs are completed
            pending_repairs = await db.europcar_damage_reports.count_documents({
                "vehicle_id": vehicle["id"],
                "repair_status": {"$ne": "completed"}
            })
            
            if pending_repairs == 0:
                # Update to available
                await db.europcar_vehicles.update_one(
                    {"id": vehicle["id"]},
                    {
                        "$set": {
                            "status": "available",
                            "verfuegbar": True,
                            "updated_at": now
                        }
                    }
                )
                updates_count += 1
        
        return StandardResponse(
            success=True,
            message=f"{updates_count} Fahrzeuge aktualisiert",
            data={"updated_vehicles": updates_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-invoice-generation", response_model=StandardResponse)
async def auto_invoice_generation():
    """
    Automatische Rechnungsstellung für abgeschlossene Reservierungen
    """
    try:
        # Find completed reservations without invoice
        completed_reservations = await db.europcar_reservations.find(
            {"status": "completed"},
            {"_id": 0}
        ).to_list(1000)
        
        invoices_generated = 0
        for reservation in completed_reservations:
            # Check if invoice already exists
            existing_invoice = await db.europcar_invoices.find_one(
                {"reservation_id": reservation["id"]},
                {"_id": 0}
            )
            
            if not existing_invoice:
                # Generate invoice (call payment route)
                from routes.europcar_payments import generate_invoice
                try:
                    await generate_invoice(reservation["id"])
                    invoices_generated += 1
                except:
                    pass
        
        return StandardResponse(
            success=True,
            message=f"{invoices_generated} Rechnungen erstellt",
            data={"invoices_generated": invoices_generated}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-maintenance-reminders", response_model=StandardResponse)
async def send_maintenance_reminders():
    """
    Sende Wartungserinnerungen für Fahrzeuge
    """
    try:
        vehicles = await db.europcar_vehicles.find({}, {"_id": 0}).to_list(1000)
        
        reminders_sent = 0
        for vehicle in vehicles:
            # Check if maintenance is due soon (within 1000 km)
            if vehicle["kilometerstand"] >= (vehicle["naechste_wartung_km"] - 1000):
                # Create reminder
                reminder = {
                    "type": "maintenance_due",
                    "vehicle_id": vehicle["id"],
                    "kennzeichen": vehicle["kennzeichen"],
                    "current_km": vehicle["kilometerstand"],
                    "maintenance_due_km": vehicle["naechste_wartung_km"],
                    "message": f"Wartung fällig in {vehicle['naechste_wartung_km'] - vehicle['kilometerstand']} km",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.europcar_notifications.insert_one(reminder)
                reminders_sent += 1
        
        return StandardResponse(
            success=True,
            message=f"{reminders_sent} Wartungserinnerungen gesendet",
            data={"reminders_sent": reminders_sent}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/list", response_model=StandardResponse)
async def list_notifications(limit: int = 50):
    """
    Liste alle Benachrichtigungen
    """
    try:
        notifications = await db.europcar_notifications.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return StandardResponse(
            success=True,
            message=f"{len(notifications)} Benachrichtigungen gefunden",
            data={"notifications": notifications}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
