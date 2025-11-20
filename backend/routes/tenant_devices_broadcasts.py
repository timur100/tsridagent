"""
WebSocket Broadcasts for Tenant Devices
Adds real-time updates to device operations
"""
from websocket_helper import broadcast_update
import asyncio


async def broadcast_device_created(tenant_id: str, device: dict):
    """Broadcast when a new device is created"""
    await broadcast_update(
        tenant_id=tenant_id,
        message_type="device_created",
        data={"device": device}
    )


async def broadcast_device_updated(tenant_id: str, device_id: str, device: dict):
    """Broadcast when a device is updated"""
    await broadcast_update(
        tenant_id=tenant_id,
        message_type="device_update",
        data={
            "device_id": device_id,
            "device": device
        }
    )


async def broadcast_device_deleted(tenant_id: str, device_id: str):
    """Broadcast when a device is deleted"""
    await broadcast_update(
        tenant_id=tenant_id,
        message_type="device_deleted",
        data={"device_id": device_id}
    )


async def broadcast_device_status(tenant_id: str, device_id: str, status: str, last_seen: str = None):
    """Broadcast when device status changes"""
    await broadcast_update(
        tenant_id=tenant_id,
        message_type="device_status_update",
        data={
            "device_id": device_id,
            "status": status,
            "last_seen": last_seen
        }
    )
