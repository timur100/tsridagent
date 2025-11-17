"""
Banned Documents System - Zentrale Dokumentensperrung über alle Filialen
Verhindert Missbrauch gesperrter Dokumente an allen Standorten
"""

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import os
import uuid
import re

router = APIRouter(prefix="/banned-documents", tags=["banned-documents"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
banned_documents_collection = db['banned_documents']
ban_attempts_collection = db['ban_attempts']  # Für Tracking von wiederholten Versuchen


class PersonInfo(BaseModel):
    """Personendaten für zusätzliche Prüfung"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[str] = None


class BanDocumentRequest(BaseModel):
    """Request zum Sperren eines Dokuments"""
    document_number: str
    document_type: str  # Führerschein, Personalausweis, Reisepass
    issuing_country: str
    ban_reason: str
    ban_category: str  # fraud, stolen, fake, suspicious, other
    banned_by_user: str
    banned_by_user_id: str
    banned_by_station: str
    station_name: str
    additional_notes: Optional[str] = None
    evidence_images: Optional[List[str]] = []
    flagged_scan_id: Optional[str] = None
    person_info: Optional[PersonInfo] = None
    expires_at: Optional[str] = None  # ISO datetime string für temporäre Sperrung
    send_notifications: bool = True


class BannedDocumentResponse(BaseModel):
    """Response für gesperrtes Dokument"""
    id: str
    document_number: str
    document_type: str
    issuing_country: str
    ban_reason: str
    ban_category: str
    banned_at: str
    banned_by_user: str
    banned_by_station: str
    station_name: str
    status: str  # active, expired, lifted
    expires_at: Optional[str] = None
    lifted_at: Optional[str] = None
    lifted_by: Optional[str] = None
    additional_notes: Optional[str] = None
    person_info: Optional[PersonInfo] = None
    attempt_count: int = 0  # Wie oft wurde versucht, dieses Dokument zu nutzen


class CheckDocumentRequest(BaseModel):
    """Request zum Prüfen eines Dokuments"""
    document_number: str
    document_type: str
    issuing_country: str
    person_info: Optional[PersonInfo] = None  # Für zusätzliche Prüfung
    station_id: str
    station_name: str


class CheckDocumentResponse(BaseModel):
    """Response beim Check"""
    is_banned: bool
    ban_info: Optional[BannedDocumentResponse] = None
    match_type: Optional[str] = None  # exact, document_only, person_match
    alert_level: str  # critical, high, medium, low


class LiftBanRequest(BaseModel):
    """Request zum Aufheben einer Sperrung"""
    ban_id: str
    lifted_by_user: str
    lifted_by_user_id: str
    reason: str


class BanAttempt(BaseModel):
    """Tracking von Versuchen, gesperrtes Dokument zu nutzen"""
    ban_id: str
    document_number: str
    attempted_at: str
    station_id: str
    station_name: str
    person_info: Optional[PersonInfo] = None


def normalize_document_number(doc_number: str) -> str:
    """
    Normalisiert Dokumentennummer für Vergleich
    Entfernt Leerzeichen, Bindestriche, macht uppercase
    """
    return re.sub(r'[\s\-]', '', doc_number.upper())


def check_person_match(stored_person: Optional[PersonInfo], check_person: Optional[PersonInfo]) -> bool:
    """
    Prüft ob Personendaten übereinstimmen (zusätzliche Sicherheit)
    """
    if not stored_person or not check_person:
        return False
    
    name_match = (
        stored_person.first_name and check_person.first_name and
        stored_person.first_name.upper() == check_person.first_name.upper() and
        stored_person.last_name and check_person.last_name and
        stored_person.last_name.upper() == check_person.last_name.upper()
    )
    
    birth_match = (
        stored_person.birth_date and check_person.birth_date and
        stored_person.birth_date == check_person.birth_date
    )
    
    return name_match or birth_match


@router.post("/ban", response_model=Dict)
async def ban_document(request: BanDocumentRequest):
    """
    Sperrt ein Dokument zentral für alle Filialen
    """
    try:
        # Normalisiere Dokumentennummer
        normalized_doc_number = normalize_document_number(request.document_number)
        
        # Prüfe ob bereits gesperrt
        existing = await banned_documents_collection.find_one({
            "document_number_normalized": normalized_doc_number,
            "status": "active"
        })
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Dokument ist bereits gesperrt"
            )
        
        ban_id = str(uuid.uuid4())
        
        ban_doc = {
            "id": ban_id,
            "document_number": request.document_number,
            "document_number_normalized": normalized_doc_number,
            "document_type": request.document_type,
            "issuing_country": request.issuing_country,
            "ban_reason": request.ban_reason,
            "ban_category": request.ban_category,
            "banned_at": datetime.now(timezone.utc).isoformat(),
            "banned_by_user": request.banned_by_user,
            "banned_by_user_id": request.banned_by_user_id,
            "banned_by_station": request.banned_by_station,
            "station_name": request.station_name,
            "status": "active",
            "expires_at": request.expires_at,
            "lifted_at": None,
            "lifted_by": None,
            "additional_notes": request.additional_notes,
            "evidence_images": request.evidence_images,
            "flagged_scan_id": request.flagged_scan_id,
            "person_info": request.person_info.dict() if request.person_info else None,
            "attempt_count": 0
        }
        
        await banned_documents_collection.insert_one(ban_doc)
        
        # Benachrichtigungen versenden (später implementiert)
        if request.send_notifications:
            # TODO: Email/SMS an Zentrale
            pass
        
        return {
            "success": True,
            "ban_id": ban_id,
            "message": f"Dokument {request.document_number} erfolgreich gesperrt"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check", response_model=CheckDocumentResponse)
async def check_document(request: CheckDocumentRequest):
    """
    ECHTZEIT-CHECK: Prüft ob ein Dokument gesperrt ist
    Wird automatisch bei jedem Scan aufgerufen
    """
    try:
        normalized_doc_number = normalize_document_number(request.document_number)
        
        # Suche nach gesperrtem Dokument
        ban_doc = await banned_documents_collection.find_one({
            "document_number_normalized": normalized_doc_number,
            "status": "active"
        })
        
        if not ban_doc:
            # Nicht gesperrt
            return CheckDocumentResponse(
                is_banned=False,
                ban_info=None,
                match_type=None,
                alert_level="low"
            )
        
        # Prüfe ob Sperrung abgelaufen ist
        if ban_doc.get("expires_at"):
            expires_at = datetime.fromisoformat(ban_doc["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                # Sperrung abgelaufen - automatisch Status ändern
                await banned_documents_collection.update_one(
                    {"id": ban_doc["id"]},
                    {"$set": {"status": "expired"}}
                )
                return CheckDocumentResponse(
                    is_banned=False,
                    ban_info=None,
                    match_type=None,
                    alert_level="low"
                )
        
        # Dokument ist gesperrt! Tracking des Versuchs
        attempt_id = str(uuid.uuid4())
        attempt_doc = {
            "id": attempt_id,
            "ban_id": ban_doc["id"],
            "document_number": request.document_number,
            "attempted_at": datetime.now(timezone.utc).isoformat(),
            "station_id": request.station_id,
            "station_name": request.station_name,
            "person_info": request.person_info.dict() if request.person_info else None
        }
        
        await ban_attempts_collection.insert_one(attempt_doc)
        
        # Increment attempt counter
        await banned_documents_collection.update_one(
            {"id": ban_doc["id"]},
            {"$inc": {"attempt_count": 1}}
        )
        
        # Prüfe zusätzlich Personendaten
        match_type = "document_only"
        alert_level = "high"
        
        if request.person_info and ban_doc.get("person_info"):
            stored_person = PersonInfo(**ban_doc["person_info"])
            if check_person_match(stored_person, request.person_info):
                match_type = "exact"
                alert_level = "critical"
        
        # Erstelle Response
        ban_doc.pop('_id', None)
        ban_response = BannedDocumentResponse(**ban_doc)
        
        # Benachrichtigung versenden (Email/SMS an Zentrale)
        # TODO: Implementieren
        
        return CheckDocumentResponse(
            is_banned=True,
            ban_info=ban_response,
            match_type=match_type,
            alert_level=alert_level
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=List[BannedDocumentResponse])
async def list_banned_documents(
    status: Optional[str] = None,
    station_id: Optional[str] = None,
    limit: int = 100
):
    """
    Liste aller gesperrten Dokumente
    Nur für Security und Admin
    """
    try:
        query = {}
        if status:
            query["status"] = status
        if station_id:
            query["banned_by_station"] = station_id
        
        docs = await banned_documents_collection.find(query).sort("banned_at", -1).to_list(length=limit)
        
        result = []
        for doc in docs:
            doc.pop('_id', None)
            doc.pop('document_number_normalized', None)
            result.append(BannedDocumentResponse(**doc))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ban_id}", response_model=BannedDocumentResponse)
async def get_banned_document(ban_id: str):
    """
    Holt Details eines gesperrten Dokuments
    """
    try:
        doc = await banned_documents_collection.find_one({"id": ban_id})
        
        if not doc:
            raise HTTPException(status_code=404, detail="Gesperrtes Dokument nicht gefunden")
        
        doc.pop('_id', None)
        doc.pop('document_number_normalized', None)
        return BannedDocumentResponse(**doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lift", response_model=Dict)
async def lift_ban(request: LiftBanRequest):
    """
    Hebt eine Sperrung auf
    Nur für Admin und Security
    """
    try:
        doc = await banned_documents_collection.find_one({"id": request.ban_id})
        
        if not doc:
            raise HTTPException(status_code=404, detail="Sperrung nicht gefunden")
        
        if doc["status"] != "active":
            raise HTTPException(status_code=400, detail="Sperrung ist bereits inaktiv")
        
        await banned_documents_collection.update_one(
            {"id": request.ban_id},
            {"$set": {
                "status": "lifted",
                "lifted_at": datetime.now(timezone.utc).isoformat(),
                "lifted_by": request.lifted_by_user,
                "lift_reason": request.reason
            }}
        )
        
        return {
            "success": True,
            "message": f"Sperrung für Dokument {doc['document_number']} aufgehoben"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{ban_id}")
async def get_ban_attempts(ban_id: str):
    """
    Zeigt alle Versuche, ein gesperrtes Dokument zu nutzen
    """
    try:
        attempts = await ban_attempts_collection.find(
            {"ban_id": ban_id}
        ).sort("attempted_at", -1).to_list(length=100)
        
        result = []
        for attempt in attempts:
            attempt.pop('_id', None)
            result.append(attempt)
        
        return {
            "ban_id": ban_id,
            "total_attempts": len(result),
            "attempts": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/summary")
async def get_ban_statistics():
    """
    Statistiken über gesperrte Dokumente
    """
    try:
        total = await banned_documents_collection.count_documents({})
        active = await banned_documents_collection.count_documents({"status": "active"})
        expired = await banned_documents_collection.count_documents({"status": "expired"})
        lifted = await banned_documents_collection.count_documents({"status": "lifted"})
        
        # Kategorien
        fraud = await banned_documents_collection.count_documents({"ban_category": "fraud"})
        stolen = await banned_documents_collection.count_documents({"ban_category": "stolen"})
        fake = await banned_documents_collection.count_documents({"ban_category": "fake"})
        suspicious = await banned_documents_collection.count_documents({"ban_category": "suspicious"})
        
        # Gesamt-Versuche
        total_attempts = await ban_attempts_collection.count_documents({})
        
        return {
            "total_bans": total,
            "active_bans": active,
            "expired_bans": expired,
            "lifted_bans": lifted,
            "by_category": {
                "fraud": fraud,
                "stolen": stolen,
                "fake": fake,
                "suspicious": suspicious
            },
            "total_blocked_attempts": total_attempts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-ban-check")
async def check_auto_ban(
    document_number: str,
    document_type: str,
    issuing_country: str,
    threshold: int = 3
):
    """
    Prüft ob ein Dokument automatisch gesperrt werden sollte
    Basierend auf Anzahl der Ablehnungen
    """
    try:
        # Zähle Ablehnungen aus flagged_scans mit status "rejected"
        flagged_scans_collection = db['flagged_scans']
        
        normalized_doc = normalize_document_number(document_number)
        
        rejection_count = await flagged_scans_collection.count_documents({
            "document_number": {"$regex": normalized_doc, "$options": "i"},
            "status": "rejected"
        })
        
        should_ban = rejection_count >= threshold
        
        return {
            "should_ban": should_ban,
            "rejection_count": rejection_count,
            "threshold": threshold,
            "document_number": document_number
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
