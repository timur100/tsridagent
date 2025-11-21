"""
Broadcast Decorator for automatic WebSocket event broadcasting
Provides fire-and-forget event broadcasting for API endpoints
"""
import asyncio
import logging
from functools import wraps
from typing import Callable, Optional
from services.event_service import event_service, EventType, EntityType

logger = logging.getLogger(__name__)


def broadcast_changes(
    entity_type: str,
    event_type: Optional[str] = None,
    tenant_id_field: str = "tenant_id",
    entity_id_field: Optional[str] = None,
    data_field: Optional[str] = None
):
    """
    Decorator that automatically broadcasts changes via WebSocket and logs to MongoDB
    
    Usage examples:
    
    @broadcast_changes(entity_type="device", event_type="updated")
    async def update_device(device_id: str, device_update: dict):
        # ... update logic ...
        return {"success": True, "device": updated_device, "tenant_id": tenant_id}
    
    @broadcast_changes(entity_type="location", event_type="created", data_field="location")
    async def create_location(location_data: dict):
        # ... create logic ...
        return {"success": True, "location": new_location, "tenant_id": tenant_id}
    
    Args:
        entity_type: Type of entity (device, location, tenant, etc.)
        event_type: Type of event (created, updated, deleted). If None, will try to infer from function name
        tenant_id_field: Field name in response containing tenant_id (default: "tenant_id")
        entity_id_field: Field name in response containing entity_id (default: "{entity_type}_id")
        data_field: Field name in response containing entity data (default: entity_type)
    """
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute the original function
            result = await func(*args, **kwargs)
            
            # Try to broadcast the changes (fire-and-forget)
            try:
                # Determine event type
                determined_event_type = event_type
                if not determined_event_type:
                    # Try to infer from function name
                    func_name = func.__name__.lower()
                    if 'create' in func_name:
                        determined_event_type = 'created'
                    elif 'update' in func_name:
                        determined_event_type = 'updated'
                    elif 'delete' in func_name:
                        determined_event_type = 'deleted'
                    else:
                        determined_event_type = 'updated'  # Default
                
                # Parse the entity type enum
                entity_type_enum = EntityType(entity_type)
                event_type_enum = EventType(determined_event_type)
                
                # Extract tenant_id from response
                tenant_id = None
                if isinstance(result, dict):
                    tenant_id = result.get(tenant_id_field)
                    
                    # Try nested structures
                    if not tenant_id:
                        # Check in data field
                        data_obj = result.get(data_field or entity_type, {})
                        if isinstance(data_obj, dict):
                            tenant_id = data_obj.get(tenant_id_field)
                
                if not tenant_id:
                    logger.warning(
                        f"Could not extract tenant_id from response for {entity_type} "
                        f"{determined_event_type}. Skipping broadcast."
                    )
                    return result
                
                # Extract entity_id
                entity_id = None
                if entity_id_field:
                    if isinstance(result, dict):
                        entity_id = result.get(entity_id_field)
                else:
                    # Default: {entity_type}_id
                    default_id_field = f"{entity_type}_id"
                    if isinstance(result, dict):
                        entity_id = result.get(default_id_field)
                        
                        # Try nested structures
                        if not entity_id:
                            data_obj = result.get(data_field or entity_type, {})
                            if isinstance(data_obj, dict):
                                entity_id = data_obj.get(default_id_field) or data_obj.get('id')
                
                # Extract entity data
                entity_data = {}
                if isinstance(result, dict):
                    entity_data = result.get(data_field or entity_type, {})
                
                # Extract user email from kwargs (usually from token_data)
                user_email = None
                token_data = kwargs.get('token_data', {})
                if token_data:
                    user_email = token_data.get('sub') or token_data.get('email')
                
                # Fire-and-forget: Schedule the event processing
                asyncio.create_task(
                    event_service.process_event(
                        event_type=event_type_enum,
                        entity_type=entity_type_enum,
                        entity_id=entity_id or "unknown",
                        entity_data=entity_data,
                        tenant_id=tenant_id,
                        user_email=user_email
                    )
                )
                
                logger.info(
                    f"✨ Scheduled broadcast for {entity_type} {determined_event_type} "
                    f"(tenant: {tenant_id}, entity: {entity_id})"
                )
                
            except Exception as e:
                # Log the error but don't let it break the main operation
                logger.error(f"Error in broadcast decorator: {str(e)}")
            
            # Always return the original result
            return result
        
        return wrapper
    return decorator


def broadcast_on_success(
    entity_type: str,
    event_type: str = "updated",
    success_field: str = "success"
):
    """
    Decorator that only broadcasts if the operation was successful
    Checks for a success flag in the response
    
    Usage:
    @broadcast_on_success(entity_type="device", event_type="deleted")
    async def delete_device(device_id: str):
        # ... delete logic ...
        return {"success": True, "message": "Deleted", "tenant_id": tenant_id}
    """
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Only broadcast if operation was successful
            if isinstance(result, dict) and result.get(success_field) is True:
                try:
                    entity_type_enum = EntityType(entity_type)
                    event_type_enum = EventType(event_type)
                    
                    tenant_id = result.get("tenant_id")
                    entity_id = result.get(f"{entity_type}_id", "unknown")
                    
                    if tenant_id:
                        asyncio.create_task(
                            event_service.process_event(
                                event_type=event_type_enum,
                                entity_type=entity_type_enum,
                                entity_id=entity_id,
                                entity_data={},
                                tenant_id=tenant_id
                            )
                        )
                        
                        logger.info(
                            f"✨ Scheduled broadcast for successful {entity_type} {event_type}"
                        )
                
                except Exception as e:
                    logger.error(f"Error in broadcast_on_success decorator: {str(e)}")
            
            return result
        
        return wrapper
    return decorator
