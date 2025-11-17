from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import logging

from models.scan import Scan, ScanCreate, ScanResponse
from utils.db import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scans", tags=["scans"])

db = get_database()


@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(scan_data: ScanCreate):
    """Create a new scan"""
    try:
        scan = Scan(**scan_data.model_dump())
        
        # Convert to dict and serialize datetime to ISO string for MongoDB
        doc = scan.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        if doc.get('offline_scan_timestamp'):
            doc['offline_scan_timestamp'] = doc['offline_scan_timestamp'].isoformat()
        
        # Insert into MongoDB
        result = await db.scans.insert_one(doc)
        
        logger.info(f"Created scan: {scan.scan_id}")
        
        return ScanResponse(
            scan_id=scan.scan_id,
            device_id=scan.device_id,
            location_id=scan.location_id,
            timestamp=scan.timestamp,
            document_data=scan.document_data,
            verification_status=scan.verification_status,
            synced_from_offline=scan.synced_from_offline,
            created_at=scan.created_at
        )
        
    except Exception as e:
        logger.error(f"Error creating scan: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating scan: {str(e)}")


@router.get("", response_model=List[ScanResponse])
async def get_scans(
    device_id: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    skip: int = Query(0, ge=0)
):
    """Get all scans with optional filters"""
    try:
        query = {}
        if device_id:
            query['device_id'] = device_id
        if location_id:
            query['location_id'] = location_id
        
        scans = await db.scans.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        
        # Convert ISO string timestamps back to datetime objects
        for scan in scans:
            if isinstance(scan.get('timestamp'), str):
                scan['timestamp'] = datetime.fromisoformat(scan['timestamp'])
            if isinstance(scan.get('created_at'), str):
                scan['created_at'] = datetime.fromisoformat(scan['created_at'])
            if isinstance(scan.get('updated_at'), str):
                scan['updated_at'] = datetime.fromisoformat(scan['updated_at'])
            if scan.get('offline_scan_timestamp') and isinstance(scan['offline_scan_timestamp'], str):
                scan['offline_scan_timestamp'] = datetime.fromisoformat(scan['offline_scan_timestamp'])
        
        return [
            ScanResponse(
                scan_id=scan['scan_id'],
                device_id=scan['device_id'],
                location_id=scan.get('location_id'),
                timestamp=scan['timestamp'],
                document_data=scan['document_data'],
                verification_status=scan['verification_status'],
                synced_from_offline=scan['synced_from_offline'],
                created_at=scan['created_at']
            )
            for scan in scans
        ]
        
    except Exception as e:
        logger.error(f"Error fetching scans: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching scans: {str(e)}")


@router.get("/{scan_id}", response_model=Scan)
async def get_scan(scan_id: str):
    """Get a single scan by ID"""
    try:
        scan = await db.scans.find_one({"scan_id": scan_id}, {"_id": 0})
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        # Convert ISO string timestamps back to datetime objects
        if isinstance(scan.get('timestamp'), str):
            scan['timestamp'] = datetime.fromisoformat(scan['timestamp'])
        if isinstance(scan.get('created_at'), str):
            scan['created_at'] = datetime.fromisoformat(scan['created_at'])
        if isinstance(scan.get('updated_at'), str):
            scan['updated_at'] = datetime.fromisoformat(scan['updated_at'])
        if scan.get('offline_scan_timestamp') and isinstance(scan['offline_scan_timestamp'], str):
            scan['offline_scan_timestamp'] = datetime.fromisoformat(scan['offline_scan_timestamp'])
        
        return Scan(**scan)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching scan: {str(e)}")


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str):
    """Delete a scan"""
    try:
        result = await db.scans.delete_one({"scan_id": scan_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        logger.info(f"Deleted scan: {scan_id}")
        return {"message": "Scan deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting scan: {str(e)}")
