from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from models.verification import VerificationHistory, VerificationResult
from utils.db import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/verification", tags=["verification"])

db = get_database()


@router.post("/history")
async def create_verification_record(history: VerificationHistory):
    """Create verification history record"""
    try:
        doc = history.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.verification_history.insert_one(doc)
        
        logger.info(f"Created verification record: {history.verification_id}")
        return {"success": True, "verification_id": history.verification_id}
        
    except Exception as e:
        logger.error(f"Error creating verification record: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{scan_id}")
async def get_verification_history(scan_id: str):
    """Get verification history for a scan"""
    try:
        history = await db.verification_history.find(
            {"scan_id": scan_id},
            {"_id": 0}
        ).to_list(100)
        
        # Convert timestamps
        for record in history:
            if isinstance(record.get('timestamp'), str):
                record['timestamp'] = datetime.fromisoformat(record['timestamp'])
            if isinstance(record.get('created_at'), str):
                record['created_at'] = datetime.fromisoformat(record['created_at'])
        
        return history
        
    except Exception as e:
        logger.error(f"Error fetching verification history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
