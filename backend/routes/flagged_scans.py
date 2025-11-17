"""
Flagged Scans API
Handles storage and management of flagged/problematic document scans
"""

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid

router = APIRouter(prefix="/flagged-scans", tags=["flagged-scans"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
flagged_scans_collection = db['flagged_scans']


# Pydantic Models
class DocumentImage(BaseModel):
    type: str  # front, back, ir, uv
    url: str


class FlaggedScanCreate(BaseModel):
    scan_type: str  # "unknown" or "error"
    document_class: Optional[str] = ""
    document_number: Optional[str] = ""
    station_id: str
    station_name: str
    operator_name: Optional[str] = ""
    attempts: int  # How many times it was scanned
    images: List[DocumentImage]
    extracted_data: Optional[dict] = {}
    reason: Optional[str] = ""


class FlaggedScanResponse(BaseModel):
    id: str
    scan_type: str
    document_class: Optional[str]
    document_number: Optional[str]
    station_id: str
    station_name: str
    operator_name: Optional[str]
    attempts: int
    images: List[DocumentImage]
    extracted_data: Optional[dict]
    reason: Optional[str]
    status: str  # "pending", "approved", "rejected"
    created_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None


class ReviewAction(BaseModel):
    action: str  # "approve" or "reject"
    reviewer_name: str
    reviewer_id: str
    notes: Optional[str] = ""


@router.post("/create")
async def create_flagged_scan(scan: FlaggedScanCreate):
    """
    Create a new flagged scan entry
    """
    try:
        scan_id = str(uuid.uuid4())
        
        scan_doc = {
            "id": scan_id,
            "scan_type": scan.scan_type,
            "document_class": scan.document_class,
            "document_number": scan.document_number,
            "station_id": scan.station_id,
            "station_name": scan.station_name,
            "operator_name": scan.operator_name,
            "attempts": scan.attempts,
            "images": [img.dict() for img in scan.images],
            "extracted_data": scan.extracted_data,
            "reason": scan.reason,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": None,
            "reviewed_at": None,
            "review_notes": None
        }
        
        await flagged_scans_collection.insert_one(scan_doc)
        
        return {
            "success": True,
            "scan_id": scan_id,
            "message": "Scan erfolgreich gemeldet"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=List[FlaggedScanResponse])
async def get_pending_scans():
    """
    Get all pending flagged scans for security review
    """
    try:
        scans = await flagged_scans_collection.find(
            {"status": "pending"}
        ).sort("created_at", -1).to_list(length=100)
        
        result = []
        for scan in scans:
            scan.pop('_id', None)  # Remove MongoDB _id
            result.append(FlaggedScanResponse(**scan))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all", response_model=List[FlaggedScanResponse])
async def get_all_scans(status: Optional[str] = None):
    """
    Get all flagged scans, optionally filtered by status
    """
    try:
        query = {}
        if status:
            query["status"] = status
        
        scans = await flagged_scans_collection.find(query).sort("created_at", -1).to_list(length=200)
        
        result = []
        for scan in scans:
            scan.pop('_id', None)
            result.append(FlaggedScanResponse(**scan))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{scan_id}", response_model=FlaggedScanResponse)
async def get_scan_by_id(scan_id: str):
    """
    Get a specific flagged scan by ID
    """
    try:
        scan = await flagged_scans_collection.find_one({"id": scan_id})
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan nicht gefunden")
        
        scan.pop('_id', None)
        return FlaggedScanResponse(**scan)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{scan_id}/review")
async def review_scan(scan_id: str, review: ReviewAction):
    """
    Approve or reject a flagged scan
    """
    try:
        scan = await flagged_scans_collection.find_one({"id": scan_id})
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan nicht gefunden")
        
        if scan["status"] != "pending":
            raise HTTPException(status_code=400, detail="Scan wurde bereits überprüft")
        
        new_status = "approved" if review.action == "approve" else "rejected"
        
        update_data = {
            "status": new_status,
            "reviewed_by": review.reviewer_name,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "review_notes": review.notes
        }
        
        await flagged_scans_collection.update_one(
            {"id": scan_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "scan_id": scan_id,
            "action": review.action,
            "message": f"Scan wurde {new_status}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/summary")
async def get_statistics():
    """
    Get statistics about flagged scans
    """
    try:
        total = await flagged_scans_collection.count_documents({})
        pending = await flagged_scans_collection.count_documents({"status": "pending"})
        approved = await flagged_scans_collection.count_documents({"status": "approved"})
        rejected = await flagged_scans_collection.count_documents({"status": "rejected"})
        
        unknown_count = await flagged_scans_collection.count_documents({"scan_type": "unknown"})
        error_count = await flagged_scans_collection.count_documents({"scan_type": "error"})
        
        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "by_type": {
                "unknown": unknown_count,
                "error": error_count
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str):
    """
    Delete a flagged scan (admin only)
    """
    try:
        result = await flagged_scans_collection.delete_one({"id": scan_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Scan nicht gefunden")
        
        return {
            "success": True,
            "message": "Scan gelöscht"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
