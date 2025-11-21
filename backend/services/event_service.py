"""
Centralized Event Service for Real-Time Updates
Provides abstracted event logging and broadcasting functionality
"""
import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from enum import Enum
from pymongo import MongoClient

# Import the global WebSocket manager
from websocket_manager import manager

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Supported event types for the system"""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    STATUS_CHANGED = "status_changed"


class EntityType(str, Enum):
    """Supported entity types in the system"""
    DEVICE = "device"
    LOCATION = "location"
    TENANT = "tenant"
    USER = "user"
    DOCUMENT = "document"
    OPENING_HOURS = "opening_hours"


class EventService:
    """
    Centralized service for event logging and broadcasting
    Provides a unified interface for real-time updates across the system
    """
    
    def __init__(self):
        """Initialize the event service with MongoDB connection"""
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        self.client = MongoClient(mongo_url)
        self.db = self.client['portal_db']
        self.event_log_collection = self.db['event_log']
        
        # Create index on tenant_id and timestamp for efficient queries
        self.event_log_collection.create_index([
            ("tenant_id", 1),
            ("timestamp", -1)
        ])
        self.event_log_collection.create_index([
            ("entity_type", 1),
            ("entity_id", 1)
        ])
        
        logger.info("EventService initialized successfully")
    
    async def log_event(
        self,
        event_type: EventType,
        entity_type: EntityType,
        entity_id: str,
        tenant_id: str,
        user_email: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log an event to MongoDB for audit trail
        
        Args:
            event_type: Type of event (CREATED, UPDATED, DELETED, etc.)
            entity_type: Type of entity affected (DEVICE, LOCATION, etc.)
            entity_id: ID of the affected entity
            tenant_id: Tenant ID for isolation
            user_email: Email of user who triggered the event
            changes: Dictionary with 'before' and 'after' states (for UPDATED events)
            metadata: Additional metadata about the event
            
        Returns:
            event_id: UUID of the created event log entry
        """
        try:
            event_id = str(uuid.uuid4())
            
            event_doc = {
                "event_id": event_id,
                "event_type": event_type.value,
                "entity_type": entity_type.value,
                "entity_id": entity_id,
                "tenant_id": tenant_id,
                "user_email": user_email,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "changes": changes or {},
                "metadata": metadata or {}
            }
            
            # Log to MongoDB asynchronously (run in thread pool to avoid blocking)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self.event_log_collection.insert_one,
                event_doc
            )
            
            logger.info(
                f"Event logged: {event_type.value} {entity_type.value} "
                f"{entity_id} for tenant {tenant_id}"
            )
            
            return event_id
            
        except Exception as e:
            logger.error(f"Error logging event: {str(e)}")
            # Don't raise - logging failure shouldn't break the main operation
            return ""
    
    async def broadcast_event(
        self,
        tenant_id: str,
        event_type: EventType,
        entity_type: EntityType,
        entity_data: Dict[str, Any],
        entity_id: Optional[str] = None
    ):
        """
        Broadcast an event via WebSocket to all connected clients in the tenant room
        
        Args:
            tenant_id: Tenant ID to broadcast to
            event_type: Type of event
            entity_type: Type of entity
            entity_data: The entity data to broadcast
            entity_id: Optional entity ID (for updates/deletes)
        """
        try:
            # Construct WebSocket message based on entity type
            message = {
                "type": f"{entity_type.value}_{event_type.value}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Add entity-specific fields
            if event_type == EventType.DELETED:
                message[f"{entity_type.value}_id"] = entity_id
            else:
                message[entity_type.value] = entity_data
                if entity_id:
                    message[f"{entity_type.value}_id"] = entity_id
            
            # Broadcast to tenant room
            await manager.broadcast_to_tenant(tenant_id, message)
            
            logger.info(
                f"Event broadcasted: {event_type.value} {entity_type.value} "
                f"to tenant {tenant_id}"
            )
            
        except Exception as e:
            logger.error(f"Error broadcasting event: {str(e)}")
            # Don't raise - broadcasting failure shouldn't break the main operation
    
    async def process_event(
        self,
        event_type: EventType,
        entity_type: EntityType,
        entity_id: str,
        entity_data: Dict[str, Any],
        tenant_id: str,
        user_email: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Complete event processing: Log to MongoDB and broadcast via WebSocket
        This is the main method to use for fire-and-forget event handling
        
        Args:
            event_type: Type of event
            entity_type: Type of entity
            entity_id: ID of the entity
            entity_data: The entity data
            tenant_id: Tenant ID
            user_email: User who triggered the event
            changes: Before/after changes (for updates)
            metadata: Additional metadata
        """
        try:
            # Run both operations concurrently
            await asyncio.gather(
                self.log_event(
                    event_type=event_type,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    tenant_id=tenant_id,
                    user_email=user_email,
                    changes=changes,
                    metadata=metadata
                ),
                self.broadcast_event(
                    tenant_id=tenant_id,
                    event_type=event_type,
                    entity_type=entity_type,
                    entity_data=entity_data,
                    entity_id=entity_id
                ),
                return_exceptions=True  # Don't let one failure break the other
            )
            
        except Exception as e:
            logger.error(f"Error processing event: {str(e)}")
            # Silently fail - event processing errors shouldn't break main operations
    
    async def get_event_history(
        self,
        tenant_id: str,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve event history for a tenant
        
        Args:
            tenant_id: Tenant ID to filter by
            entity_type: Optional entity type filter
            entity_id: Optional specific entity ID
            limit: Maximum number of events to return
            
        Returns:
            List of event documents
        """
        try:
            query = {"tenant_id": tenant_id}
            
            if entity_type:
                query["entity_type"] = entity_type.value
            
            if entity_id:
                query["entity_id"] = entity_id
            
            loop = asyncio.get_event_loop()
            cursor = await loop.run_in_executor(
                None,
                lambda: self.event_log_collection.find(query).sort("timestamp", -1).limit(limit)
            )
            
            events = []
            for event in cursor:
                # Remove MongoDB _id field
                if '_id' in event:
                    del event['_id']
                events.append(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Error retrieving event history: {str(e)}")
            return []


# Global singleton instance
event_service = EventService()


# Convenience functions for common operations
async def log_device_event(
    event_type: EventType,
    device_id: str,
    device_data: Dict[str, Any],
    tenant_id: str,
    user_email: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None
):
    """Convenience function for device events"""
    await event_service.process_event(
        event_type=event_type,
        entity_type=EntityType.DEVICE,
        entity_id=device_id,
        entity_data=device_data,
        tenant_id=tenant_id,
        user_email=user_email,
        changes=changes
    )


async def log_location_event(
    event_type: EventType,
    location_id: str,
    location_data: Dict[str, Any],
    tenant_id: str,
    user_email: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None
):
    """Convenience function for location events"""
    await event_service.process_event(
        event_type=event_type,
        entity_type=EntityType.LOCATION,
        entity_id=location_id,
        entity_data=location_data,
        tenant_id=tenant_id,
        user_email=user_email,
        changes=changes
    )


async def log_tenant_event(
    event_type: EventType,
    tenant_id: str,
    tenant_data: Dict[str, Any],
    user_email: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None
):
    """Convenience function for tenant events"""
    await event_service.process_event(
        event_type=event_type,
        entity_type=EntityType.TENANT,
        entity_id=tenant_id,
        entity_data=tenant_data,
        tenant_id=tenant_id,
        user_email=user_email,
        changes=changes
    )
