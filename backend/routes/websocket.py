"""
WebSocket Routes for Real-Time Updates
Provides WebSocket endpoint for tenant-specific real-time data synchronization
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Optional
import jwt
import os
import logging
import asyncio
from websocket_manager import manager
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger(__name__)

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-keep-it-secret')


async def verify_token(token: str) -> dict:
    """Verify JWT token and return decoded data"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.websocket("/ws/{tenant_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    tenant_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time tenant data updates
    
    Usage:
    ws://localhost:8001/api/ws/{tenant_id}?token={jwt_token}
    
    Message Types (Server -> Client):
    - connection_established: Sent when connection is successful
    - location_update: Location data changed
    - device_update: Device status changed
    - dashboard_stats: Dashboard statistics updated
    - ping: Heartbeat message
    - error: Error message
    
    Message Types (Client -> Server):
    - pong: Response to ping (heartbeat)
    - subscribe: Subscribe to specific update types
    """
    
    # Validate authentication token
    if not token:
        await websocket.close(code=1008, reason="Token required")
        logger.warning(f"WebSocket connection rejected for tenant {tenant_id}: No token provided")
        return
    
    try:
        # Verify JWT token
        token_data = await verify_token(token)
        user_tenant_ids = token_data.get('tenant_ids', [])
        user_role = token_data.get('role', '')
        
        # Check if user has access to this tenant
        # Admin can access any tenant, tenant users only their own
        if user_role != 'admin' and tenant_id not in user_tenant_ids:
            await websocket.close(code=1008, reason="Unauthorized access to tenant")
            logger.warning(f"WebSocket connection rejected: User does not have access to tenant {tenant_id}")
            return
        
    except Exception as e:
        await websocket.close(code=1008, reason="Authentication failed")
        logger.error(f"WebSocket authentication failed for tenant {tenant_id}: {str(e)}")
        return
    
    # Accept connection and add to manager
    await manager.connect(websocket, tenant_id)
    
    try:
        # Heartbeat task
        async def heartbeat():
            while True:
                try:
                    await asyncio.sleep(30)  # Send ping every 30 seconds
                    await manager.send_heartbeat(websocket)
                except Exception as e:
                    logger.error(f"Heartbeat error: {str(e)}")
                    break
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat())
        
        # Listen for client messages
        while True:
            try:
                data = await websocket.receive_json()
                
                # Handle client messages
                message_type = data.get('type', '')
                
                if message_type == 'pong':
                    # Client responded to ping - connection is healthy
                    logger.debug(f"Pong received from client in tenant {tenant_id}")
                
                elif message_type == 'subscribe':
                    # Client wants to subscribe to specific update types
                    # For now, all clients get all updates - can be extended later
                    await manager.send_personal_message({
                        "type": "subscription_confirmed",
                        "subscriptions": data.get('types', [])
                    }, websocket)
                
                elif message_type == 'request_update':
                    # Client requests immediate data update
                    # This can be used to force-refresh data
                    await manager.send_personal_message({
                        "type": "update_requested",
                        "message": "Update will be sent shortly"
                    }, websocket)
                
                else:
                    logger.warning(f"Unknown message type from client: {message_type}")
            
            except WebSocketDisconnect:
                logger.info(f"Client disconnected from tenant {tenant_id}")
                break
            except Exception as e:
                logger.error(f"Error processing client message: {str(e)}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Error processing message"
                }, websocket)
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"WebSocket error for tenant {tenant_id}: {str(e)}")
    finally:
        # Cancel heartbeat task
        if 'heartbeat_task' in locals():
            heartbeat_task.cancel()
        
        # Remove from connection manager
        manager.disconnect(websocket)
        logger.info(f"WebSocket connection closed for tenant {tenant_id}")


@router.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics (for monitoring)"""
    return {
        "success": True,
        "total_connections": manager.get_total_connections(),
        "active_tenant_rooms": len(manager.active_connections),
        "tenant_connections": {
            tenant_id: manager.get_tenant_connection_count(tenant_id)
            for tenant_id in manager.active_connections.keys()
        }
    }


@router.post("/ws/broadcast")
async def broadcast_message(payload: dict):
    """
    Internal endpoint for microservices to broadcast messages to tenants
    
    Payload:
    {
        "tenant_id": "uuid",
        "message_type": "ticket_created|ticket_updated|...",
        "data": {...}
    }
    """
    try:
        tenant_id = payload.get("tenant_id")
        message_type = payload.get("message_type")
        data = payload.get("data", {})
        
        if not tenant_id or not message_type:
            raise HTTPException(status_code=400, detail="tenant_id and message_type are required")
        
        # Broadcast to tenant
        message = {
            "type": message_type,
            **data
        }
        
        await manager.broadcast_to_tenant(tenant_id, message)
        
        return {
            "success": True,
            "message": f"Broadcasted {message_type} to tenant {tenant_id}"
        }
    
    except Exception as e:
        logger.error(f"Broadcast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
