"""
WebSocket Broadcasting Helper
Centralized utility for broadcasting real-time updates to all connected clients
"""
import asyncio
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


async def broadcast_update(
    tenant_id: str,
    message_type: str,
    data: Dict[str, Any],
    entity_id: Optional[str] = None
):
    """
    Broadcast an update to all clients in a tenant room
    
    Args:
        tenant_id: The tenant ID
        message_type: Type of update (device_update, location_update, etc.)
        data: The data to broadcast
        entity_id: Optional ID of the entity (device_id, location_id, etc.)
    """
    try:
        from websocket_manager import manager
        
        message = {
            "type": message_type,
            **data
        }
        
        if entity_id:
            message["id"] = entity_id
        
        print(f"[WebSocket Broadcast] {message_type} -> tenant {tenant_id}")
        asyncio.create_task(manager.broadcast_to_tenant(tenant_id, message))
        
    except Exception as e:
        logger.error(f"[WebSocket Broadcast] Error: {str(e)}")
        print(f"[WebSocket Broadcast] Error: {str(e)}")


def broadcast_sync(tenant_id: str, message_type: str, data: Dict[str, Any]):
    """
    Synchronous wrapper for broadcast_update
    Use this in non-async contexts
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcast_update(tenant_id, message_type, data))
        else:
            loop.run_until_complete(broadcast_update(tenant_id, message_type, data))
    except Exception as e:
        logger.error(f"[WebSocket Broadcast Sync] Error: {str(e)}")
