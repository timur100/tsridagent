"""
Broadcast Service for WebSocket Updates
Helper functions to broadcast data changes to connected clients
"""
import asyncio
from websocket_manager import manager
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


async def broadcast_location_change(tenant_id: str, location_data: Dict[str, Any]):
    """
    Broadcast location data change to all clients subscribed to the tenant
    
    Args:
        tenant_id: The tenant ID
        location_data: The location data to broadcast
    """
    try:
        await manager.broadcast_location_update(tenant_id, location_data)
        logger.info(f"Broadcasted location update for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error broadcasting location change: {str(e)}")


async def broadcast_device_change(tenant_id: str, device_data: Dict[str, Any]):
    """
    Broadcast device data change to all clients subscribed to the tenant
    
    Args:
        tenant_id: The tenant ID
        device_data: The device data to broadcast
    """
    try:
        await manager.broadcast_device_update(tenant_id, device_data)
        logger.info(f"Broadcasted device update for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error broadcasting device change: {str(e)}")


async def broadcast_dashboard_update(tenant_id: str, stats_data: Dict[str, Any]):
    """
    Broadcast dashboard statistics update to all clients subscribed to the tenant
    
    Args:
        tenant_id: The tenant ID
        stats_data: The dashboard statistics to broadcast
    """
    try:
        await manager.broadcast_dashboard_stats(tenant_id, stats_data)
        logger.info(f"Broadcasted dashboard stats for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error broadcasting dashboard update: {str(e)}")


async def broadcast_opening_hours_update(tenant_id: str, location_id: str, opening_hours: Dict[str, Any]):
    """
    Broadcast opening hours update to all clients subscribed to the tenant
    
    Args:
        tenant_id: The tenant ID
        location_id: The location ID that was updated
        opening_hours: The updated opening hours data
    """
    try:
        await manager.broadcast_to_tenant(tenant_id, {
            "type": "opening_hours_update",
            "location_id": location_id,
            "opening_hours": opening_hours
        })
        logger.info(f"Broadcasted opening hours update for location {location_id} in tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error broadcasting opening hours update: {str(e)}")


async def trigger_full_refresh(tenant_id: str):
    """
    Trigger a full data refresh for all clients in a tenant room
    This tells clients to re-fetch all data
    
    Args:
        tenant_id: The tenant ID
    """
    try:
        await manager.broadcast_to_tenant(tenant_id, {
            "type": "refresh_all",
            "message": "Full data refresh requested"
        })
        logger.info(f"Triggered full refresh for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error triggering full refresh: {str(e)}")


# Helper function to be called from API routes after data mutations
def schedule_broadcast(tenant_id: str, message_type: str, data: Dict[str, Any]):
    """
    Schedule a broadcast to be sent asynchronously
    This can be called from synchronous code
    
    Args:
        tenant_id: The tenant ID
        message_type: Type of message ('location_update', 'device_update', 'dashboard_stats')
        data: The data to broadcast
    """
    try:
        loop = asyncio.get_event_loop()
        
        if message_type == "location_update":
            loop.create_task(broadcast_location_change(tenant_id, data))
        elif message_type == "device_update":
            loop.create_task(broadcast_device_change(tenant_id, data))
        elif message_type == "dashboard_stats":
            loop.create_task(broadcast_dashboard_update(tenant_id, data))
        elif message_type == "opening_hours_update":
            location_id = data.get('location_id')
            opening_hours = data.get('opening_hours')
            loop.create_task(broadcast_opening_hours_update(tenant_id, location_id, opening_hours))
        elif message_type == "refresh_all":
            loop.create_task(trigger_full_refresh(tenant_id))
        else:
            logger.warning(f"Unknown message type: {message_type}")
    
    except RuntimeError:
        # No event loop - this is likely during testing or startup
        logger.warning("No event loop available for broadcast scheduling")
    except Exception as e:
        logger.error(f"Error scheduling broadcast: {str(e)}")
