"""
TeamViewer Auto-Sync Service
Automatically syncs device status from TeamViewer API every 30 seconds
Can be enabled/disabled via admin settings
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from teamviewer_service import TeamViewerAPIClient

logger = logging.getLogger(__name__)

# Global state
auto_sync_enabled = True
auto_sync_task = None
rate_limit_semaphore = asyncio.Semaphore(3)


class TeamViewerAutoSync:
    def __init__(self):
        self.enabled = True
        self.interval = 30  # seconds
        self.task = None
        self.mongo_url = os.environ.get('MONGO_URL')
        self.api_token = os.getenv("TEAMVIEWER_API_TOKEN")
        
    def get_db(self):
        """Get database connection"""
        if not self.mongo_url:
            raise Exception("MONGO_URL not configured")
        client = AsyncIOMotorClient(self.mongo_url)
        return client['multi_tenant_admin']
    
    async def perform_sync(self):
        """Perform a single sync operation"""
        if not self.api_token:
            logger.warning("TEAMVIEWER_API_TOKEN not configured, skipping sync")
            return
        
        db = self.get_db()
        
        try:
            logger.info("[Auto-Sync] Starting TeamViewer status sync")
            
            async with TeamViewerAPIClient(
                api_token=self.api_token,
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
                
                logger.info(f"[Auto-Sync] Fetched {len(tv_devices_map)} devices from TeamViewer")
                
                # Log first 3 TeamViewer IDs for debugging
                if tv_devices_map:
                    sample_tv_ids = list(tv_devices_map.keys())[:3]
                    logger.info(f"[Auto-Sync] Sample TV IDs: {sample_tv_ids}")
                
                # Update devices in database
                devices_collection = db.europcar_devices
                updated_count = 0
                online_count = 0
                offline_count = 0
                
                # Get all devices from DB that have TVID
                cursor = devices_collection.find({
                    "tvid": {"$exists": True, "$ne": None, "$ne": ""}
                })
                
                # Get device count for debugging
                db_device_count = await devices_collection.count_documents({
                    "tvid": {"$exists": True, "$ne": None, "$ne": ""}
                })
                logger.info(f"[Auto-Sync] DB devices with TVID: {db_device_count}")
                
                checked_count = 0
                async for db_device in cursor:
                    tvid = db_device.get("tvid", "").strip()
                    checked_count += 1
                    
                    # Log first device for debugging
                    if checked_count == 1:
                        logger.info(f"[Auto-Sync] First DB device TVID: {tvid}")
                    
                    # Try both formats: with and without 'r' prefix
                    tvid_with_r = f"r{tvid}" if tvid and not tvid.startswith('r') else tvid
                    tvid_without_r = tvid.lstrip('r') if tvid and tvid.startswith('r') else tvid
                    
                    # Try to find device in map
                    tv_status = None
                    if tvid_with_r in tv_devices_map:
                        tv_status = tv_devices_map[tvid_with_r]
                        if checked_count <= 3:
                            logger.info(f"[Auto-Sync] Match found with r-prefix: {tvid} -> {tvid_with_r}")
                    elif tvid_without_r in tv_devices_map:
                        tv_status = tv_devices_map[tvid_without_r]
                        if checked_count <= 3:
                            logger.info(f"[Auto-Sync] Match found without r-prefix: {tvid} -> {tvid_without_r}")
                    elif tvid in tv_devices_map:
                        tv_status = tv_devices_map[tvid]
                        if checked_count <= 3:
                            logger.info(f"[Auto-Sync] Match found exact: {tvid}")
                    
                    if tv_status:
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
                    "status": "success",
                    "sync_type": "auto"
                }
                
                await db.teamviewer_sync.insert_one(sync_result)
                
                logger.info(
                    f"[Auto-Sync] Complete: {updated_count} devices updated "
                    f"({online_count} online, {offline_count} offline)"
                )
                
        except Exception as e:
            logger.error(f"[Auto-Sync] Error: {e}", exc_info=True)
            
            # Save error status
            try:
                await db.teamviewer_sync.insert_one({
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "status": "error",
                    "error": str(e),
                    "sync_type": "auto"
                })
            except:
                pass
    
    async def sync_loop(self):
        """Main sync loop that runs every 30 seconds"""
        logger.info(f"[Auto-Sync] Started with {self.interval}s interval")
        
        # Perform initial sync immediately
        await self.perform_sync()
        
        while self.enabled:
            try:
                await asyncio.sleep(self.interval)
                
                if self.enabled:
                    await self.perform_sync()
                    
            except asyncio.CancelledError:
                logger.info("[Auto-Sync] Task cancelled")
                break
            except Exception as e:
                logger.error(f"[Auto-Sync] Loop error: {e}", exc_info=True)
                # Continue running even if one sync fails
                await asyncio.sleep(self.interval)
    
    async def start(self):
        """Start the auto-sync task"""
        if self.task is None or self.task.done():
            self.enabled = True
            self.task = asyncio.create_task(self.sync_loop())
            logger.info("[Auto-Sync] Service started")
        else:
            logger.warning("[Auto-Sync] Service already running")
    
    async def stop(self):
        """Stop the auto-sync task"""
        self.enabled = False
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            logger.info("[Auto-Sync] Service stopped")
    
    def is_running(self):
        """Check if auto-sync is running"""
        return self.enabled and self.task and not self.task.done()


# Global instance
auto_sync_service = TeamViewerAutoSync()


async def start_auto_sync():
    """Start the auto-sync service"""
    await auto_sync_service.start()


async def stop_auto_sync():
    """Stop the auto-sync service"""
    await auto_sync_service.stop()


def is_auto_sync_running():
    """Check if auto-sync is running"""
    return auto_sync_service.is_running()
