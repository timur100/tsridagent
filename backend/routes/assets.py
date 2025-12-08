from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient

router = APIRouter(prefix="/api/assets", tags=["Assets"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'verification_db')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models
class AssetCategory(BaseModel):
    name: str
    short_code: str
    type: str  # hardware or software
    description: Optional[str] = ""
    icon: Optional[str] = ""

class AssetTemplate(BaseModel):
    name: str
    category_id: str
    fields: List[str]
    description: Optional[str] = ""

class AssetRule(BaseModel):
    name: str
    type: str  # warranty, maintenance, lifecycle, compliance
    condition: str
    action: str
    enabled: bool = True

class AssetIDConfig(BaseModel):
    prefix: str
    pattern: Optional[str] = ""
    start_number: int = 1
    padding: int = 5
    separator: str = "-"
    include_category: bool = True
    include_location: bool = False
    include_year: bool = False

class AssetIDRequest(BaseModel):
    category_id: Optional[str] = None
    location_id: Optional[str] = None

# ===== CATEGORIES =====
@router.get("/{tenant_id}/categories")
async def get_categories(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all asset categories for a tenant"""
    try:
        categories = list(db.asset_categories.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("name", 1))
        
        return {
            "success": True,
            "data": categories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/categories")
async def create_category(
    tenant_id: str,
    category: AssetCategory,
    token_data: dict = Depends(verify_token)
):
    """Create a new asset category"""
    try:
        import uuid
        
        category_data = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            **category.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("email")
        }
        
        result = db.asset_categories.insert_one(category_data)
        
        # Verify insertion
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to insert category")
        
        return {
            "success": True,
            "message": "Kategorie erstellt",
            "data": {k: v for k, v in category_data.items() if k != '_id'}
        }
    except Exception as e:
        print(f"[ERROR] Failed to create category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/categories/{category_id}")
async def update_category(
    tenant_id: str,
    category_id: str,
    category: AssetCategory,
    token_data: dict = Depends(verify_token)
):
    """Update an asset category"""
    try:
        result = db.asset_categories.update_one(
            {"id": category_id, "tenant_id": tenant_id},
            {
                "$set": {
                    **category.dict(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": token_data.get("email")
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        return {
            "success": True,
            "message": "Kategorie aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/categories/{category_id}")
async def delete_category(
    tenant_id: str,
    category_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete an asset category"""
    try:
        result = db.asset_categories.delete_one({
            "id": category_id,
            "tenant_id": tenant_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        return {
            "success": True,
            "message": "Kategorie gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== TEMPLATES =====
@router.get("/{tenant_id}/templates")
async def get_templates(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all asset templates for a tenant"""
    try:
        templates = list(db.asset_templates.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("name", 1))
        
        return {
            "success": True,
            "data": templates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/templates")
async def create_template(
    tenant_id: str,
    template: AssetTemplate,
    token_data: dict = Depends(verify_token)
):
    """Create a new asset template"""
    try:
        import uuid
        
        template_data = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            **template.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("email")
        }
        
        db.asset_templates.insert_one(template_data)
        
        return {
            "success": True,
            "message": "Vorlage erstellt",
            "data": {k: v for k, v in template_data.items() if k != '_id'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/templates/{template_id}")
async def update_template(
    tenant_id: str,
    template_id: str,
    template: AssetTemplate,
    token_data: dict = Depends(verify_token)
):
    """Update an asset template"""
    try:
        result = db.asset_templates.update_one(
            {"id": template_id, "tenant_id": tenant_id},
            {
                "$set": {
                    **template.dict(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": token_data.get("email")
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        return {
            "success": True,
            "message": "Vorlage aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/templates/{template_id}")
async def delete_template(
    tenant_id: str,
    template_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete an asset template"""
    try:
        result = db.asset_templates.delete_one({
            "id": template_id,
            "tenant_id": tenant_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        return {
            "success": True,
            "message": "Vorlage gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== RULES =====
@router.get("/{tenant_id}/rules")
async def get_rules(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all asset rules for a tenant"""
    try:
        rules = list(db.asset_rules.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("name", 1))
        
        return {
            "success": True,
            "data": rules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/rules")
async def create_rule(
    tenant_id: str,
    rule: AssetRule,
    token_data: dict = Depends(verify_token)
):
    """Create a new asset rule"""
    try:
        import uuid
        
        rule_data = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            **rule.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("email")
        }
        
        db.asset_rules.insert_one(rule_data)
        
        return {
            "success": True,
            "message": "Regel erstellt",
            "data": {k: v for k, v in rule_data.items() if k != '_id'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/rules/{rule_id}")
async def update_rule(
    tenant_id: str,
    rule_id: str,
    rule: AssetRule,
    token_data: dict = Depends(verify_token)
):
    """Update an asset rule"""
    try:
        result = db.asset_rules.update_one(
            {"id": rule_id, "tenant_id": tenant_id},
            {
                "$set": {
                    **rule.dict(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": token_data.get("email")
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Regel nicht gefunden")
        
        return {
            "success": True,
            "message": "Regel aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/rules/{rule_id}")
async def delete_rule(
    tenant_id: str,
    rule_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete an asset rule"""
    try:
        result = db.asset_rules.delete_one({
            "id": rule_id,
            "tenant_id": tenant_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Regel nicht gefunden")
        
        return {
            "success": True,
            "message": "Regel gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== ASSET ID CONFIG =====
@router.get("/{tenant_id}/config")
async def get_asset_config(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get asset ID configuration for a tenant"""
    try:
        config = db.asset_id_config.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not config:
            # Return default config
            config = {
                "tenant_id": tenant_id,
                "prefix": "ASSET",
                "pattern": "",
                "start_number": 1,
                "padding": 5,
                "separator": "-",
                "include_category": True,
                "include_location": False,
                "include_year": False
            }
        
        return {
            "success": True,
            "data": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/config")
async def save_asset_config(
    tenant_id: str,
    config: AssetIDConfig,
    token_data: dict = Depends(verify_token)
):
    """Save asset ID configuration for a tenant"""
    try:
        config_data = {
            "tenant_id": tenant_id,
            **config.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": token_data.get("email")
        }
        
        db.asset_id_config.update_one(
            {"tenant_id": tenant_id},
            {"$set": config_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Konfiguration gespeichert"

# ===== ASSET ID GENERATION =====
@router.post("/{tenant_id}/generate-id")
async def generate_asset_id(
    tenant_id: str,
    request: AssetIDRequest,
    token_data: dict = Depends(verify_token)
):
    """Generate a new Asset-ID based on tenant configuration"""
    try:
        # Get the configuration
        config = db.asset_id_config.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not config:
            # Use default config
            config = {
                "prefix": "ASSET",
                "start_number": 1,
                "padding": 5,
                "separator": "-",
                "include_category": True,
                "include_location": False,
                "include_year": False
            }
        
        # Build the Asset-ID
        parts = [config["prefix"]]
        separator = config["separator"]
        
        # Add year if configured
        if config.get("include_year"):
            parts.append(str(datetime.now().year))
        
        # Add category code if configured and provided
        if config.get("include_category") and request.category_id:
            category = db.asset_categories.find_one(
                {"id": request.category_id, "tenant_id": tenant_id},
                {"_id": 0, "short_code": 1}
            )
            if category:
                parts.append(category["short_code"])
        
        # Add location code if configured and provided
        if config.get("include_location") and request.location_id:
            # For now, use a placeholder. You can integrate with actual location data
            parts.append(request.location_id[:5].upper())
        
        # Get the next sequence number
        # Find the highest used number for this prefix pattern
        prefix_pattern = separator.join(parts)
        
        # Query existing asset IDs to find the highest number
        # This assumes asset IDs are stored somewhere - we'll use a counter collection
        counter_key = f"{tenant_id}:{prefix_pattern}"
        counter = db.asset_id_counters.find_one({"key": counter_key})
        
        if counter:
            next_number = counter["current"] + 1
        else:
            next_number = config.get("start_number", 1)
        
        # Update the counter
        db.asset_id_counters.update_one(
            {"key": counter_key},
            {"$set": {"current": next_number, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        # Add the padded number
        padding = config.get("padding", 5)
        parts.append(str(next_number).zfill(padding))
        
        # Generate the final Asset-ID
        asset_id = separator.join(parts)
        
        return {
            "success": True,
            "data": {
                "asset_id": asset_id,
                "components": {
                    "prefix": config["prefix"],
                    "year": str(datetime.now().year) if config.get("include_year") else None,
                    "category": parts[2] if config.get("include_category") and request.category_id else None,
                    "location": parts[-2] if config.get("include_location") and request.location_id else None,
                    "number": next_number
                }
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to generate asset ID: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/preview-id")
async def preview_asset_id(
    tenant_id: str,
    category_id: Optional[str] = None,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Preview what an Asset-ID would look like without generating it"""
    try:
        # Get the configuration
        config = db.asset_id_config.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not config:
            config = {
                "prefix": "ASSET",
                "start_number": 1,
                "padding": 5,
                "separator": "-",
                "include_category": True,
                "include_location": False,
                "include_year": False
            }
        
        # Build preview
        parts = [config["prefix"]]
        separator = config["separator"]
        
        if config.get("include_year"):
            parts.append(str(datetime.now().year))
        
        if config.get("include_category"):
            if category_id:
                category = db.asset_categories.find_one(
                    {"id": category_id, "tenant_id": tenant_id},
                    {"_id": 0, "short_code": 1}
                )
                if category:
                    parts.append(category["short_code"])
                else:
                    parts.append("CAT")
            else:
                parts.append("CAT")
        
        if config.get("include_location"):
            if location_id:
                parts.append(location_id[:5].upper())
            else:
                parts.append("LOC")
        
        # Use "XXXXX" as placeholder for number
        padding = config.get("padding", 5)
        parts.append("X" * padding)
        
        preview_id = separator.join(parts)
        
        return {
            "success": True,
            "data": {
                "preview": preview_id,
                "description": f"Nächste ID wird in diesem Format generiert (X = fortlaufende Nummer)"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
