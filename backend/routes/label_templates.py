"""
Label Templates API Routes
Manages custom label templates for asset printing
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/label-templates", tags=["Label Templates"])

# Database will be injected
db = None

def set_database(database):
    global db
    db = database


class LabelElement(BaseModel):
    id: str
    type: str
    config: dict = Field(default_factory=dict)


class LabelLayoutItem(BaseModel):
    i: str
    x: int
    y: int
    w: int
    h: int
    minW: Optional[int] = None
    minH: Optional[int] = None


class LabelTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_type: str = "all"
    is_default: bool = False
    label_height: int = 6
    elements: List[dict] = Field(default_factory=list)
    layout: List[dict] = Field(default_factory=list)
    logo_url: Optional[str] = None


class LabelTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    asset_type: Optional[str] = None
    is_default: Optional[bool] = None
    label_height: Optional[int] = None
    elements: Optional[List[dict]] = None
    layout: Optional[List[dict]] = None
    logo_url: Optional[str] = None


@router.get("")
async def list_templates(asset_type: Optional[str] = None):
    """List all label templates, optionally filtered by asset type"""
    try:
        query = {}
        if asset_type and asset_type != "all":
            query["$or"] = [
                {"asset_type": asset_type},
                {"asset_type": "all"}
            ]
        
        templates = await db.label_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "templates": templates,
            "count": len(templates)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/default")
async def get_default_template(asset_type: Optional[str] = None):
    """Get the default template for a specific asset type or globally"""
    try:
        # First try to find asset-type specific default
        if asset_type and asset_type != "all":
            template = await db.label_templates.find_one(
                {"is_default": True, "asset_type": asset_type},
                {"_id": 0}
            )
            if template:
                return {"success": True, "template": template}
        
        # Fall back to global default
        template = await db.label_templates.find_one(
            {"is_default": True, "asset_type": "all"},
            {"_id": 0}
        )
        
        if template:
            return {"success": True, "template": template}
        
        # Return first template if no default set
        template = await db.label_templates.find_one({}, {"_id": 0})
        
        return {
            "success": True,
            "template": template,
            "message": "No default template set" if not template else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Get a specific template by ID"""
    try:
        template = await db.label_templates.find_one(
            {"template_id": template_id},
            {"_id": 0}
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        return {"success": True, "template": template}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_template(template: LabelTemplateCreate):
    """Create a new label template"""
    try:
        template_id = f"LBL-{uuid.uuid4().hex[:8].upper()}"
        
        # If this is set as default, unset other defaults for same asset_type
        if template.is_default:
            await db.label_templates.update_many(
                {"asset_type": template.asset_type, "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        template_doc = {
            "template_id": template_id,
            "name": template.name,
            "description": template.description,
            "asset_type": template.asset_type,
            "is_default": template.is_default,
            "label_height": template.label_height,
            "elements": template.elements,
            "layout": template.layout,
            "logo_url": template.logo_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.label_templates.insert_one(template_doc)
        
        # Remove _id for response
        template_doc.pop("_id", None)
        
        return {
            "success": True,
            "template": template_doc,
            "message": f"Template '{template.name}' erstellt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}")
async def update_template(template_id: str, template: LabelTemplateUpdate):
    """Update an existing template"""
    try:
        existing = await db.label_templates.find_one({"template_id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        update_data = {k: v for k, v in template.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # If setting as default, unset other defaults
        if template.is_default:
            asset_type = template.asset_type or existing.get("asset_type", "all")
            await db.label_templates.update_many(
                {"asset_type": asset_type, "is_default": True, "template_id": {"$ne": template_id}},
                {"$set": {"is_default": False}}
            )
        
        await db.label_templates.update_one(
            {"template_id": template_id},
            {"$set": update_data}
        )
        
        updated = await db.label_templates.find_one({"template_id": template_id}, {"_id": 0})
        
        return {
            "success": True,
            "template": updated,
            "message": "Template aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a template"""
    try:
        result = await db.label_templates.delete_one({"template_id": template_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        return {
            "success": True,
            "message": "Template gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/duplicate")
async def duplicate_template(template_id: str, new_name: Optional[str] = None):
    """Duplicate an existing template"""
    try:
        original = await db.label_templates.find_one({"template_id": template_id})
        if not original:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        new_template_id = f"LBL-{uuid.uuid4().hex[:8].upper()}"
        
        duplicate = {
            **original,
            "template_id": new_template_id,
            "name": new_name or f"{original['name']} (Kopie)",
            "is_default": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        duplicate.pop("_id", None)
        
        await db.label_templates.insert_one(duplicate)
        duplicate.pop("_id", None)
        
        return {
            "success": True,
            "template": duplicate,
            "message": "Template dupliziert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
