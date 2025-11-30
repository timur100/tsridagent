"""
Europcar Damage Management API Routes
Modul 9: Schadenmanagement
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/damage", tags=["Europcar Damage"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class DamageReport(BaseModel):
    id: str
    vehicle_id: str
    reported_by: str  # User ID
    reported_at: str
    damage_type: str  # "scratch", "dent", "broken", "mechanical", "cosmetic"
    severity: str  # "minor", "moderate", "severe"
    location: str  # "front", "back", "left", "right", "interior", "roof"
    description: str
    images: List[str] = []
    estimated_repair_cost: Optional[float] = None
    actual_repair_cost: Optional[float] = None
    insurance_claim_id: Optional[str] = None
    workshop_id: Optional[str] = None
    repair_status: str = "pending"  # "pending", "approved", "in_repair", "completed"
    repair_date: Optional[str] = None
    completion_date: Optional[str] = None
    ai_analysis: Optional[dict] = None  # KI-Schadenanalyse (Phase 3)
    created_at: str
    updated_at: str


class DamageReportCreate(BaseModel):
    vehicle_id: str
    reported_by: str
    damage_type: str
    severity: str
    location: str
    description: str
    estimated_repair_cost: Optional[float] = None


class DamageReportUpdate(BaseModel):
    repair_status: Optional[str] = None
    actual_repair_cost: Optional[float] = None
    workshop_id: Optional[str] = None
    repair_date: Optional[str] = None
    completion_date: Optional[str] = None


class Workshop(BaseModel):
    id: str
    name: str
    adresse: str
    telefon: str
    email: str
    spezialisierung: List[str] = []  # ["karosserie", "mechanik", "lack", etc.]
    bewertung: float = 0.0
    aktiv: bool = True
    created_at: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/reports/list", response_model=StandardResponse)
async def list_damage_reports(
    vehicle_id: Optional[str] = None,
    repair_status: Optional[str] = None
):
    """
    Liste alle Schadensberichte
    """
    try:
        query = {}
        if vehicle_id:
            query["vehicle_id"] = vehicle_id
        if repair_status:
            query["repair_status"] = repair_status
        
        reports = await db.europcar_damage_reports.find(query, {"_id": 0}).to_list(1000)
        
        return StandardResponse(
            success=True,
            message=f"{len(reports)} Schadensberichte gefunden",
            data={"reports": reports}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}", response_model=StandardResponse)
async def get_damage_report(report_id: str):
    """
    Hole einen spezifischen Schadensbericht
    """
    try:
        report = await db.europcar_damage_reports.find_one(
            {"id": report_id},
            {"_id": 0}
        )
        if not report:
            raise HTTPException(status_code=404, detail="Schadensbericht nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Schadensbericht gefunden",
            data={"report": report}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/create", response_model=StandardResponse)
async def create_damage_report(report_data: DamageReportCreate):
    """
    Erstelle einen neuen Schadensbericht
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        report_id = str(uuid4())
        
        report = DamageReport(
            id=report_id,
            vehicle_id=report_data.vehicle_id,
            reported_by=report_data.reported_by,
            reported_at=now,
            damage_type=report_data.damage_type,
            severity=report_data.severity,
            location=report_data.location,
            description=report_data.description,
            estimated_repair_cost=report_data.estimated_repair_cost,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_damage_reports.insert_one(report.model_dump())
        
        # Update vehicle status if severe damage
        if report_data.severity == "severe":
            await db.europcar_vehicles.update_one(
                {"id": report_data.vehicle_id},
                {
                    "$set": {
                        "status": "damaged",
                        "verfuegbar": False,
                        "updated_at": now
                    }
                }
            )
        
        return StandardResponse(
            success=True,
            message="Schadensbericht erfolgreich erstellt",
            data={"report": report.model_dump()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/reports/{report_id}", response_model=StandardResponse)
async def update_damage_report(report_id: str, update_data: DamageReportUpdate):
    """
    Aktualisiere Schadensbericht
    """
    try:
        report = await db.europcar_damage_reports.find_one(
            {"id": report_id},
            {"_id": 0}
        )
        if not report:
            raise HTTPException(status_code=404, detail="Schadensbericht nicht gefunden")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.europcar_damage_reports.update_one(
            {"id": report_id},
            {"$set": update_dict}
        )
        
        # If repair completed, update vehicle status
        if update_data.repair_status == "completed":
            await db.europcar_vehicles.update_one(
                {"id": report["vehicle_id"]},
                {
                    "$set": {
                        "status": "available",
                        "verfuegbar": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        updated = await db.europcar_damage_reports.find_one(
            {"id": report_id},
            {"_id": 0}
        )
        
        return StandardResponse(
            success=True,
            message="Schadensbericht erfolgreich aktualisiert",
            data={"report": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workshops/list", response_model=StandardResponse)
async def list_workshops():
    """
    Liste alle Werkstätten
    """
    try:
        workshops = await db.europcar_workshops.find({"aktiv": True}, {"_id": 0}).to_list(1000)
        return StandardResponse(
            success=True,
            message=f"{len(workshops)} Werkstätten gefunden",
            data={"workshops": workshops}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=StandardResponse)
async def damage_analytics():
    """
    Schadenanalyse & Statistiken
    """
    try:
        # Count by severity
        pipeline = [
            {
                "$group": {
                    "_id": "$severity",
                    "count": {"$sum": 1},
                    "total_cost": {"$sum": "$actual_repair_cost"}
                }
            }
        ]
        severity_stats = await db.europcar_damage_reports.aggregate(pipeline).to_list(100)
        
        # Count by damage type
        pipeline = [
            {
                "$group": {
                    "_id": "$damage_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        type_stats = await db.europcar_damage_reports.aggregate(pipeline).to_list(100)
        
        # Total damages
        total_damages = await db.europcar_damage_reports.count_documents({})
        
        return StandardResponse(
            success=True,
            message="Schadenanalyse erfolgreich",
            data={
                "total_damages": total_damages,
                "by_severity": severity_stats,
                "by_type": type_stats
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
