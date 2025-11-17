from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import logging

from models.scan import Scan, OfflineScanBatch
from utils.db import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])

db = get_database()


@router.post("/offline-scans")
async def sync_offline_scans(batch: OfflineScanBatch):
    """Sync offline scans from Electron app (SQLite → MongoDB)"""
    try:
        synced_count = 0
        failed_scans = []
        synced_scan_ids = []
        
        logger.info(f"Syncing {len(batch.scans)} offline scans from device {batch.device_id}")
        
        for scan_data in batch.scans:
            try:
                # Create Scan object
                scan = Scan(**scan_data.model_dump())
                scan.synced_from_offline = True
                
                # Check if scan already exists
                existing = await db.scans.find_one({"scan_id": scan.scan_id})
                if existing:
                    logger.warning(f"Scan {scan.scan_id} already exists, skipping")
                    synced_scan_ids.append(scan.scan_id)
                    continue
                
                # Convert to dict and serialize datetime to ISO string
                doc = scan.model_dump()
                doc['timestamp'] = doc['timestamp'].isoformat()
                doc['created_at'] = doc['created_at'].isoformat()
                doc['updated_at'] = doc['updated_at'].isoformat()
                if doc.get('offline_scan_timestamp'):
                    doc['offline_scan_timestamp'] = doc['offline_scan_timestamp'].isoformat()
                
                # Insert into MongoDB
                await db.scans.insert_one(doc)
                synced_count += 1
                synced_scan_ids.append(scan.scan_id)
                
                logger.info(f"Synced offline scan: {scan.scan_id}")
                
            except Exception as e:
                logger.error(f"Error syncing scan {scan_data.document_data.document_number}: {e}")
                failed_scans.append({
                    "scan_id": getattr(scan_data, 'scan_id', 'unknown'),
                    "error": str(e)
                })
        
        return {
            "success": True,
            "synced_count": synced_count,
            "failed_count": len(failed_scans),
            "synced_scan_ids": synced_scan_ids,
            "failed_scans": failed_scans,
            "message": f"Synced {synced_count} of {len(batch.scans)} scans"
        }
        
    except Exception as e:
        logger.error(f"Error syncing offline scans: {e}")
        raise HTTPException(status_code=500, detail=f"Error syncing scans: {str(e)}")


@router.get("/device-data/{device_id}")
async def get_device_sync_data(device_id: str):
    """Get device configuration data for offline storage"""
    try:
        # This would call Portal Service in production
        # For now, return minimal data
        
        logger.info(f"Fetching sync data for device: {device_id}")
        
        # TODO: Call Portal Service API
        # device_info = await call_portal_service(f'/devices/{device_id}')
        
        return {
            "device_id": device_id,
            "location_id": "default-location",
            "location_name": "Default Location",
            "settings": {
                "pin": "1234",
                "max_offline_scans": 100,
                "auto_sync_interval": 30
            },
            "last_sync": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching device sync data: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching device data: {str(e)}")


@router.get("/stats/{device_id}")
async def get_sync_stats(device_id: str):
    """Get sync statistics for a device"""
    try:
        total_scans = await db.scans.count_documents({"device_id": device_id})
        offline_synced = await db.scans.count_documents({
            "device_id": device_id,
            "synced_from_offline": True
        })
        
        # Get last sync time
        last_scan = await db.scans.find_one(
            {"device_id": device_id, "synced_from_offline": True},
            sort=[("created_at", -1)]
        )
        
        last_sync_time = None
        if last_scan and last_scan.get('created_at'):
            last_sync_time = last_scan['created_at']
            if isinstance(last_sync_time, str):
                last_sync_time = datetime.fromisoformat(last_sync_time)
        
        return {
            "device_id": device_id,
            "total_scans": total_scans,
            "offline_synced_scans": offline_synced,
            "online_scans": total_scans - offline_synced,
            "last_sync_time": last_sync_time.isoformat() if last_sync_time else None
        }
        
    except Exception as e:
        logger.error(f"Error fetching sync stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching sync stats: {str(e)}")
