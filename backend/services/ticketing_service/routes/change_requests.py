from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from models.change_request import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    ChangeRequestResponse,
    ChangeRequestStatus
)
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/change-requests", tags=["Change Requests"])


@router.post("/", response_model=dict)
@router.post("", response_model=dict, include_in_schema=False)
async def create_change_request(
    change_request: ChangeRequestCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new change request
    """
    try:
        db = await get_database()
        change_requests_collection = db['change_requests']
        
        # Get user info
        user_email = token_data.get("sub")
        user_role = token_data.get("role")
        tenant_ids = token_data.get("tenant_ids", [])
        
        # Get user details from main database
        main_db = db.client['portal_db']
        user = await main_db.portal_users.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_name = user.get("name", user_email)
        
        # If tenant_id not provided, use user's first tenant
        tenant_id = change_request.tenant_id or (tenant_ids[0] if tenant_ids else None)
        
        # Create change request document
        cr_id = str(uuid.uuid4())
        cr_doc = {
            "id": cr_id,
            "title": change_request.title,
            "description": change_request.description,
            "category": change_request.category,
            "status": ChangeRequestStatus.open,
            "priority": change_request.priority,
            "tenant_id": tenant_id,
            "location_id": change_request.location_id,
            "device_id": change_request.device_id,
            "requested_by_email": user_email,
            "requested_by_name": user_name,
            "requested_date": change_request.requested_date,
            "impact_description": change_request.impact_description,
            "assigned_to": None,
            "admin_notes": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "completed_date": None
        }
        
        await change_requests_collection.insert_one(cr_doc)
        
        # Remove MongoDB _id
        if '_id' in cr_doc:
            del cr_doc['_id']
        
        # Broadcast change request creation via WebSocket
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Broadcast to customer's tenant
                if tenant_id:
                    await client.post(
                        "http://localhost:8001/api/ws/broadcast",
                        json={
                            "tenant_id": tenant_id,
                            "message_type": "change_request_created",
                            "data": {
                                "change_request": cr_doc
                            }
                        }
                    )
                    print(f"📨 [Change Request Created] Broadcasted to tenant {tenant_id}")
                
                # Also broadcast to admin room
                await client.post(
                    "http://localhost:8001/api/ws/broadcast",
                    json={
                        "tenant_id": "all",
                        "message_type": "change_request_created",
                        "data": {
                            "change_request": cr_doc
                        }
                    }
                )
                print(f"📨 [Change Request Created] Broadcasted to admin room 'all'")
        except Exception as e:
            print(f"⚠️ [Change Request Created] Broadcast failed: {str(e)}")
        
        return {
            "success": True,
            "message": "Change Request erfolgreich erstellt",
            "change_request": cr_doc
        }
    
    except Exception as e:
        print(f"Error creating change request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=dict)
@router.get("", response_model=dict, include_in_schema=False)
async def get_change_requests(
    status: Optional[str] = None,
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all change requests (filtered by status and tenant)
    """
    try:
        db = await get_database()
        change_requests_collection = db['change_requests']
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        user_tenant_ids = token_data.get("tenant_ids", [])
        
        # Build query
        query = {}
        
        # Non-admin users can only see their own tenant's change requests
        if user_role != 'admin':
            if user_tenant_ids:
                query["tenant_id"] = {"$in": user_tenant_ids}
            else:
                query["requested_by_email"] = user_email
        elif tenant_id and tenant_id != 'all':
            query["tenant_id"] = tenant_id
        
        if status:
            query["status"] = status
        
        # Get change requests
        change_requests = []
        async for cr in change_requests_collection.find(query).sort("created_at", -1):
            if '_id' in cr:
                del cr['_id']
            change_requests.append(cr)
        
        return {
            "success": True,
            "count": len(change_requests),
            "change_requests": change_requests
        }
    
    except Exception as e:
        print(f"Error getting change requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cr_id}", response_model=dict)
async def get_change_request(
    cr_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific change request by ID
    """
    try:
        db = await get_database()
        change_requests_collection = db['change_requests']
        
        cr = await change_requests_collection.find_one({"id": cr_id})
        
        if not cr:
            raise HTTPException(status_code=404, detail="Change Request not found")
        
        if '_id' in cr:
            del cr['_id']
        
        return {
            "success": True,
            "change_request": cr
        }
    
    except Exception as e:
        print(f"Error getting change request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{cr_id}", response_model=dict)
async def update_change_request(
    cr_id: str,
    update_data: ChangeRequestUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update a change request (admin only)
    """
    try:
        user_role = token_data.get("role")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update change requests")
        
        db = await get_database()
        change_requests_collection = db['change_requests']
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if update_data.title:
            update_doc["title"] = update_data.title
        if update_data.description:
            update_doc["description"] = update_data.description
        if update_data.status:
            update_doc["status"] = update_data.status
            if update_data.status == ChangeRequestStatus.completed:
                update_doc["completed_date"] = datetime.now(timezone.utc).isoformat()
        if update_data.priority:
            update_doc["priority"] = update_data.priority
        if update_data.assigned_to:
            update_doc["assigned_to"] = update_data.assigned_to
        if update_data.admin_notes:
            update_doc["admin_notes"] = update_data.admin_notes
        if update_data.completed_date:
            update_doc["completed_date"] = update_data.completed_date
        
        result = await change_requests_collection.update_one(
            {"id": cr_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Change Request not found")
        
        # Get updated CR for broadcasting
        updated_cr = await change_requests_collection.find_one({"id": cr_id})
        if updated_cr and '_id' in updated_cr:
            del updated_cr['_id']
        
        # Broadcast update via WebSocket
        if updated_cr:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=5.0) as client:
                    tenant_id = updated_cr.get("tenant_id")
                    
                    # Broadcast to customer's tenant
                    if tenant_id:
                        await client.post(
                            "http://localhost:8001/api/ws/broadcast",
                            json={
                                "tenant_id": tenant_id,
                                "message_type": "change_request_updated",
                                "data": {
                                    "change_request": updated_cr
                                }
                            }
                        )
                    
                    # Also broadcast to admin room
                    await client.post(
                        "http://localhost:8001/api/ws/broadcast",
                        json={
                            "tenant_id": "all",
                            "message_type": "change_request_updated",
                            "data": {
                                "change_request": updated_cr
                            }
                        }
                    )
            except Exception as e:
                print(f"⚠️ [Change Request Updated] Broadcast failed: {str(e)}")
        
        return {
            "success": True,
            "message": "Change Request aktualisiert"
        }
    
    except Exception as e:
        print(f"Error updating change request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary", response_model=dict)
async def get_change_request_stats(
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get change request statistics
    """
    try:
        db = await get_database()
        change_requests_collection = db['change_requests']
        
        user_role = token_data.get("role")
        user_tenant_ids = token_data.get("tenant_ids", [])
        
        # Build query
        query = {}
        if user_role != 'admin':
            if user_tenant_ids:
                query["tenant_id"] = {"$in": user_tenant_ids}
        elif tenant_id and tenant_id != 'all':
            query["tenant_id"] = tenant_id
        
        # Count by status
        stats = {
            "total": 0,
            "open": 0,
            "in_progress": 0,
            "completed": 0,
            "rejected": 0
        }
        
        async for cr in change_requests_collection.find(query):
            stats["total"] += 1
            status = cr.get("status", "open")
            if status in stats:
                stats[status] += 1
        
        return {
            "success": True,
            "stats": stats
        }
    
    except Exception as e:
        print(f"Error getting change request stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
