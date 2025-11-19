"""
TeamViewer API Integration Service
Fetches device online status from TeamViewer API and updates device records
"""

import asyncio
import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TeamViewerAPIClient:
    """Client for TeamViewer API operations"""
    
    def __init__(self, api_token: str, rate_limit_semaphore: asyncio.Semaphore):
        self.api_token = api_token
        self.base_url = "https://webapi.teamviewer.com/api/v1"
        self.rate_limit_semaphore = rate_limit_semaphore
        self.session: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """Initialize HTTP session with authentication"""
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        self.session = httpx.AsyncClient(
            headers=headers,
            timeout=30.0
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
    
    async def fetch_devices(self, offset: int = 0, limit: int = 100) -> Dict:
        """Fetch paginated list of devices from TeamViewer API"""
        async with self.rate_limit_semaphore:
            url = f"{self.base_url}/devices"
            params = {"offset": offset, "limit": limit}
            
            try:
                response = await self.session.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                logger.info(f"Fetched {len(data.get('devices', []))} devices (offset={offset})")
                return data
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    logger.warning("Rate limit exceeded")
                    raise
                logger.error(f"API error: {e.response.status_code} - {e.response.text}")
                raise
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                raise
    
    async def fetch_all_devices(self) -> List[Dict]:
        """Fetch all devices with pagination"""
        all_devices = []
        offset = 0
        limit = 100
        
        while True:
            try:
                response = await self.fetch_devices(offset=offset, limit=limit)
                devices = response.get("devices", [])
                
                if not devices:
                    break
                
                all_devices.extend(devices)
                
                # Check pagination
                pagination = response.get("pagination", {})
                total = pagination.get("total", len(all_devices))
                
                if len(all_devices) >= total:
                    break
                
                offset += limit
                await asyncio.sleep(0.5)  # Small delay between pages
                
            except Exception as e:
                logger.error(f"Error fetching devices page (offset={offset}): {e}")
                break
        
        logger.info(f"Total devices fetched: {len(all_devices)}")
        return all_devices
    
    def parse_device_status(self, device: Dict) -> Dict:
        """Parse TeamViewer device data into standardized format"""
        # TeamViewer API returns 'remotecontrol_id' as the device ID
        teamviewer_id = device.get("remotecontrol_id", "") or device.get("teamviewer_id", "")
        online_state = device.get("online_state", "Offline")
        
        # Log first device for debugging
        if not hasattr(self, '_logged_first_device'):
            logger.info(f"[DEBUG] Sample device fields: {list(device.keys())[:10]}")
            logger.info(f"[DEBUG] remotecontrol_id: {device.get('remotecontrol_id')}")
            logger.info(f"[DEBUG] online_state: {device.get('online_state')}")
            self._logged_first_device = True
        
        return {
            "teamviewer_id": str(teamviewer_id) if teamviewer_id else "",
            "online_state": online_state,
            "is_online": online_state.lower() == "online",
            "last_seen": device.get("last_seen"),
            "alias": device.get("alias", ""),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
