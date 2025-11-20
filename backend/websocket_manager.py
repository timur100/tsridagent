"""
WebSocket Connection Manager for Real-Time Updates
Manages WebSocket connections with room-based broadcasting per tenant
"""
from typing import Dict, List, Set
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Dictionary of tenant_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Dictionary of WebSocket -> tenant_id for reverse lookup
        self.connection_tenant_map: Dict[WebSocket, str] = {}
        
    async def connect(self, websocket: WebSocket, tenant_id: str):
        """Accept a new WebSocket connection and add to tenant room"""
        await websocket.accept()
        
        # Add to tenant room
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = set()
        
        self.active_connections[tenant_id].add(websocket)
        self.connection_tenant_map[websocket] = tenant_id
        
        logger.info(f"Client connected to tenant room: {tenant_id}. Total connections in room: {len(self.active_connections[tenant_id])}")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "tenant_id": tenant_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection from its tenant room"""
        tenant_id = self.connection_tenant_map.get(websocket)
        
        if tenant_id and tenant_id in self.active_connections:
            self.active_connections[tenant_id].discard(websocket)
            
            # Clean up empty rooms
            if len(self.active_connections[tenant_id]) == 0:
                del self.active_connections[tenant_id]
            
            logger.info(f"Client disconnected from tenant room: {tenant_id}")
        
        # Remove from reverse map
        if websocket in self.connection_tenant_map:
            del self.connection_tenant_map[websocket]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")
            self.disconnect(websocket)
    
    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Broadcast a message to all clients in a tenant room"""
        if tenant_id not in self.active_connections:
            logger.debug(f"No active connections for tenant: {tenant_id}")
            return
        
        # Add timestamp if not present
        if "timestamp" not in message:
            message["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        # Create a copy of the set to avoid modification during iteration
        connections = self.active_connections[tenant_id].copy()
        
        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client in tenant {tenant_id}: {str(e)}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
        
        logger.info(f"Broadcasted message to {len(connections) - len(disconnected)} clients in tenant room: {tenant_id}")
    
    async def broadcast_location_update(self, tenant_id: str, location_data: dict):
        """Broadcast location update to all clients in tenant room"""
        message = {
            "type": "location_update",
            "data": location_data
        }
        await self.broadcast_to_tenant(tenant_id, message)
    
    async def broadcast_device_update(self, tenant_id: str, device_data: dict):
        """Broadcast device update to all clients in tenant room"""
        message = {
            "type": "device_update",
            "data": device_data
        }
        await self.broadcast_to_tenant(tenant_id, message)
    
    async def broadcast_dashboard_stats(self, tenant_id: str, stats_data: dict):
        """Broadcast dashboard statistics update to all clients in tenant room"""
        message = {
            "type": "dashboard_stats",
            "data": stats_data
        }
        await self.broadcast_to_tenant(tenant_id, message)
    
    async def send_heartbeat(self, websocket: WebSocket):
        """Send a heartbeat/ping message to check connection health"""
        try:
            await websocket.send_json({
                "type": "ping",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending heartbeat: {str(e)}")
            self.disconnect(websocket)
    
    def get_tenant_connection_count(self, tenant_id: str) -> int:
        """Get the number of active connections for a tenant"""
        return len(self.active_connections.get(tenant_id, set()))
    
    def get_total_connections(self) -> int:
        """Get the total number of active connections across all tenants"""
        return sum(len(connections) for connections in self.active_connections.values())


# Global instance
manager = ConnectionManager()
