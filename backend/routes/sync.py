from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import json
import asyncio

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/sync", tags=["Sync"])

class SyncUpdate(BaseModel):
    update_id: str
    type: str  # location, device, settings, banned_document
    action: str  # create, update, delete
    data: dict
    timestamp: str

# In-memory storage
sync_queue = []
connected_clients: Dict[str, WebSocket] = {}

# Sync mode: 'websocket', 'polling', 'manual'
sync_mode = "polling"

@router.get("/mode")
async def get_sync_mode(token_data: dict = Depends(verify_token)):
    """Get current sync mode"""
    return {
        "success": True,
        "mode": sync_mode
    }

@router.post("/mode")
async def set_sync_mode(mode: dict, token_data: dict = Depends(verify_token)):
    """Set sync mode (websocket, polling, manual)"""
    global sync_mode
    try:
        new_mode = mode.get("mode")
        if new_mode not in ["websocket", "polling", "manual"]:
            raise HTTPException(status_code=400, detail="Invalid sync mode")
        
        sync_mode = new_mode
        
        # Notify all connected devices
        await broadcast_update({
            "type": "sync_mode_change",
            "mode": sync_mode,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "mode": sync_mode
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue")
async def add_to_sync_queue(update: SyncUpdate):
    """Add update to sync queue (internal use)"""
    try:
        sync_queue.append(update.dict())
        
        # If websocket mode, broadcast immediately
        if sync_mode == "websocket":
            await broadcast_update(update.dict())
        
        return {
            "success": True,
            "message": "Update queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/updates")
async def get_updates(device_id: str, since: Optional[str] = None):
    """Get pending updates for a device (polling endpoint)"""
    try:
        # Filter updates since timestamp
        if since:
            updates = [
                u for u in sync_queue
                if u['timestamp'] > since
            ]
        else:
            updates = sync_queue[-10:]  # Last 10 updates
        
        return {
            "success": True,
            "updates": updates,
            "count": len(updates),
            "mode": sync_mode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    """WebSocket endpoint for real-time sync"""
    await websocket.accept()
    connected_clients[device_id] = websocket
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "device_id": device_id,
            "mode": sync_mode
        })
        
        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages from device
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif message.get("type") == "status_update":
                # Handle device status update
                pass
            
    except WebSocketDisconnect:
        print(f"Device {device_id} disconnected")
        if device_id in connected_clients:
            del connected_clients[device_id]
    except Exception as e:
        print(f"WebSocket error for device {device_id}: {e}")
        if device_id in connected_clients:
            del connected_clients[device_id]

async def broadcast_update(update: dict):
    """Broadcast update to all connected WebSocket clients"""
    disconnected_clients = []
    
    for device_id, websocket in connected_clients.items():
        try:
            await websocket.send_json(update)
        except Exception as e:
            print(f"Failed to send to {device_id}: {e}")
            disconnected_clients.append(device_id)
    
    # Remove disconnected clients
    for device_id in disconnected_clients:
        del connected_clients[device_id]

@router.post("/trigger")
async def trigger_manual_sync(device_id: Optional[str] = None, token_data: dict = Depends(verify_token)):
    """Trigger manual sync for device(s)"""
    try:
        update = {
            "type": "manual_sync",
            "device_id": device_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if device_id and device_id in connected_clients:
            # Send to specific device
            await connected_clients[device_id].send_json(update)
        else:
            # Broadcast to all
            await broadcast_update(update)
        
        return {
            "success": True,
            "message": "Sync triggered"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/queue")
async def clear_sync_queue(token_data: dict = Depends(verify_token)):
    """Clear sync queue"""
    global sync_queue
    sync_queue = []
    return {
        "success": True,
        "message": "Sync queue cleared"
    }
