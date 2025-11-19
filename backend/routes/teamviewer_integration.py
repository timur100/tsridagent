"""
TeamViewer Integration Routes
Endpoints for fetching and updating device status from TeamViewer
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import asyncio
import os
import logging

from routes.portal_auth import verify_token
from teamviewer_service import TeamViewerAPIClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portal/teamviewer", tags=["TeamViewer Integration"])

# Rate limiting semaphore (max 3 concurrent requests)
rate_limit_semaphore = asyncio.Semaphore(3)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')


def get_db():
    """Get database connection"""
    if not mongo_url:
        raise HTTPException(status_code=500, detail="Database configuration error")
    client = AsyncIOMotorClient(mongo_url)
    return client['multi_tenant_admin']


@router.post("/sync-status")
async def sync_device_status(
    background_tasks: BackgroundTasks,
    token_data: dict = Depends(verify_token)
):
    """
    Sync device online status from TeamViewer API
    - Fetches all devices from TeamViewer
    - Matches devices by TVID
    - Updates online status in database
    """
    
    # Only admins can trigger sync
    if token_data.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Nur Administratoren können Status-Synchronisierung starten"
        )
    
    # Add sync task to background
    background_tasks.add_task(perform_status_sync)
    
    return {
        "success": True,
        "message": "Status-Synchronisierung gestartet"
    }


@router.get("/sync-status")
async def get_sync_status(token_data: dict = Depends(verify_token)):
    """Get last sync status and statistics"""
    try:
        db = get_db()
        
        # Get sync metadata
        sync_meta = await db.teamviewer_sync.find_one(
            {},
            sort=[("last_sync", -1)]
        )
        
        if not sync_meta:
            return {
                "success": True,
                "last_sync": None,
                "status": "never_synced"
            }
        
        return {
            "success": True,
            "last_sync": sync_meta.get("last_sync"),
            "devices_synced": sync_meta.get("devices_synced", 0),
            "devices_online": sync_meta.get("devices_online", 0),
            "devices_offline": sync_meta.get("devices_offline", 0),
            "status": sync_meta.get("status", "unknown")
        }
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def perform_status_sync():
    """Background task to sync device status from TeamViewer"""
    api_token = os.getenv("TEAMVIEWER_API_TOKEN")
    
    if not api_token:
        logger.error("TEAMVIEWER_API_TOKEN not configured")
        return
    
    db = get_db()
    
    try:
        logger.info("Starting TeamViewer status sync")
        
        async with TeamViewerAPIClient(
            api_token=api_token,
            rate_limit_semaphore=rate_limit_semaphore
        ) as client:
            # Fetch all devices from TeamViewer
            tv_devices = await client.fetch_all_devices()
            
            # Create lookup map by TVID
            tv_devices_map = {}
            for device in tv_devices:
                parsed = client.parse_device_status(device)
                tv_id = parsed["teamviewer_id"]
                if tv_id:
                    tv_devices_map[tv_id] = parsed
            
            logger.info(f"Fetched {len(tv_devices_map)} devices from TeamViewer")
            
            # Update devices in database
            devices_collection = db.europcar_devices
            updated_count = 0
            online_count = 0
            offline_count = 0
            
            # Get all devices from DB that have TVID
            cursor = devices_collection.find({
                "tvid": {"$exists": True, "$ne": None, "$ne": ""}
            })
            
            async for db_device in cursor:
                tvid = db_device.get("tvid", "").strip()
                
                if tvid in tv_devices_map:
                    tv_status = tv_devices_map[tvid]
                    is_online = tv_status["is_online"]
                    
                    # Update device status
                    await devices_collection.update_one(
                        {"device_id": db_device["device_id"]},
                        {
                            "$set": {
                                "status": "online" if is_online else "offline",
                                "teamviewer_online": is_online,
                                "teamviewer_last_seen": tv_status.get("last_seen"),
                                "teamviewer_updated_at": tv_status["updated_at"]
                            }
                        }
                    )
                    
                    updated_count += 1
                    if is_online:
                        online_count += 1
                    else:
                        offline_count += 1
            
            # Save sync metadata
            sync_result = {
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "devices_synced": updated_count,
                "devices_online": online_count,
                "devices_offline": offline_count,
                "total_tv_devices": len(tv_devices_map),
                "status": "success"
            }
            
            await db.teamviewer_sync.insert_one(sync_result)
            
            logger.info(
                f"Sync complete: {updated_count} devices updated "
                f"({online_count} online, {offline_count} offline)"
            )
            
    except Exception as e:
        logger.error(f"Error in status sync: {e}")
        
        # Save error status
        try:
            await db.teamviewer_sync.insert_one({
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "status": "error",
                "error": str(e)
            })
        except:
            pass



@router.post("/auto-sync/start")
async def start_auto_sync_endpoint(token_data: dict = Depends(verify_token)):
    """
    Start automatic TeamViewer status synchronization (every 30 seconds)
    Admin only
    """
    # Only admins can control auto-sync
    if token_data.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Nur Administratoren können Auto-Sync starten"
        )
    
    try:
        from teamviewer_auto_sync import auto_sync_service
        
        if auto_sync_service.is_running():
            return {
                "success": True,
                "message": "Auto-Sync läuft bereits",
                "status": "running"
            }
        
        await auto_sync_service.start()
        
        return {
            "success": True,
            "message": "Auto-Sync gestartet (alle 30 Sekunden)",
            "status": "running",
            "interval_seconds": 30
        }
        
    except Exception as e:
        logger.error(f"Error starting auto-sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-sync/stop")
async def stop_auto_sync_endpoint(token_data: dict = Depends(verify_token)):
    """
    Stop automatic TeamViewer status synchronization
    Admin only
    """
    # Only admins can control auto-sync
    if token_data.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Nur Administratoren können Auto-Sync stoppen"
        )
    
    try:
        from teamviewer_auto_sync import auto_sync_service
        
        if not auto_sync_service.is_running():
            return {
                "success": True,
                "message": "Auto-Sync ist bereits gestoppt",
                "status": "stopped"
            }
        
        await auto_sync_service.stop()
        
        return {
            "success": True,
            "message": "Auto-Sync gestoppt",
            "status": "stopped"
        }
        
    except Exception as e:
        logger.error(f"Error stopping auto-sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-sync/status")
async def get_auto_sync_status_endpoint(token_data: dict = Depends(verify_token)):
    """
    Get current auto-sync status
    """
    try:
        from teamviewer_auto_sync import auto_sync_service
        
        is_running = auto_sync_service.is_running()
        
        return {
            "success": True,
            "status": "running" if is_running else "stopped",
            "enabled": is_running,
            "interval_seconds": auto_sync_service.interval if is_running else None
        }
        
    except Exception as e:
        logger.error(f"Error getting auto-sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
