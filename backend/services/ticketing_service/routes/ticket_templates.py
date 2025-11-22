from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from models.ticket_template import TicketTemplateCreate, TicketTemplateResponse
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/templates", tags=["Ticket Templates"])


@router.post("/", response_model=dict)
@router.post("", response_model=dict, include_in_schema=False)
async def create_template(
    template: TicketTemplateCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new ticket template (admin only)
    """
    try:
        user_role = token_data.get("role")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can create templates")
        
        db = await get_database()
        templates_collection = db['ticket_templates']
        
        # Create template document
        template_id = str(uuid.uuid4())
        template_doc = {
            "id": template_id,
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "default_title": template.default_title,
            "default_description": template.default_description,
            "default_priority": template.default_priority,
            "required_fields": template.required_fields,
            "auto_assign_to": template.auto_assign_to,
            "estimated_resolution_time": template.estimated_resolution_time,
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
        
        await templates_collection.insert_one(template_doc)
        
        if '_id' in template_doc:
            del template_doc['_id']
        
        return {
            "success": True,
            "message": "Vorlage erfolgreich erstellt",
            "template": template_doc
        }
    
    except Exception as e:
        print(f"Error creating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=dict)
@router.get("", response_model=dict, include_in_schema=False)
async def get_templates(
    category: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all ticket templates
    """
    try:
        db = await get_database()
        templates_collection = db['ticket_templates']
        
        # Build query
        query = {}
        if category:
            query["category"] = category
        
        # Get templates
        templates = []
        async for template in templates_collection.find(query).sort("name", 1):
            if '_id' in template:
                del template['_id']
            templates.append(template)
        
        return {
            "success": True,
            "count": len(templates),
            "templates": templates
        }
    
    except Exception as e:
        print(f"Error getting templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}", response_model=dict)
async def get_template(
    template_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific template by ID
    """
    try:
        db = await get_database()
        templates_collection = db['ticket_templates']
        
        template = await templates_collection.find_one({"id": template_id})
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if '_id' in template:
            del template['_id']
        
        return {
            "success": True,
            "template": template
        }
    
    except Exception as e:
        print(f"Error getting template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}", response_model=dict)
async def update_template(
    template_id: str,
    update_data: TicketTemplateCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Update a template (admin only)
    """
    try:
        user_role = token_data.get("role")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update templates")
        
        db = await get_database()
        templates_collection = db['ticket_templates']
        
        update_doc = {
            "name": update_data.name,
            "description": update_data.description,
            "category": update_data.category,
            "default_title": update_data.default_title,
            "default_description": update_data.default_description,
            "default_priority": update_data.default_priority,
            "required_fields": update_data.required_fields,
            "auto_assign_to": update_data.auto_assign_to,
            "estimated_resolution_time": update_data.estimated_resolution_time,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await templates_collection.update_one(
            {"id": template_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "message": "Vorlage aktualisiert"
        }
    
    except Exception as e:
        print(f"Error updating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}", response_model=dict)
async def delete_template(
    template_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a template (admin only)
    """
    try:
        user_role = token_data.get("role")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can delete templates")
        
        db = await get_database()
        templates_collection = db['ticket_templates']
        
        result = await templates_collection.delete_one({"id": template_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "message": "Vorlage gelöscht"
        }
    
    except Exception as e:
        print(f"Error deleting template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
