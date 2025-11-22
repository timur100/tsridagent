from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from models.support_settings import SupportSettings, SupportSettingsResponse
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/support-settings", tags=["Support Settings"])


@router.get("", response_model=dict)
@router.get("/", response_model=dict, include_in_schema=False)
async def get_support_settings(
    token_data: dict = Depends(verify_token)
):
    """
    Get current support settings
    """
    try:
        db = await get_database()
        settings_collection = db['support_settings']
        
        # Get settings (there should only be one document)
        settings_doc = await settings_collection.find_one({"_type": "support_settings"})
        
        if not settings_doc:
            # Create default settings
            default_settings = SupportSettings().dict()
            default_settings["_type"] = "support_settings"
            await settings_collection.insert_one(default_settings)
            settings_doc = default_settings
        
        # Remove MongoDB _id
        if '_id' in settings_doc:
            del settings_doc['_id']
        if '_type' in settings_doc:
            del settings_doc['_type']
        
        return {
            "success": True,
            "settings": settings_doc
        }
    
    except Exception as e:
        print(f"Error getting support settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("", response_model=dict)
@router.put("/", response_model=dict, include_in_schema=False)
async def update_support_settings(
    settings: SupportSettings,
    token_data: dict = Depends(verify_token)
):
    """
    Update support settings (Admin only)
    """
    try:
        # Verify admin role
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin-Berechtigung erforderlich")
        
        db = await get_database()
        settings_collection = db['support_settings']
        
        # Update settings
        settings_dict = settings.dict()
        settings_dict["updated_by"] = token_data.get("sub")
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings_dict["_type"] = "support_settings"
        
        # Upsert (update or insert)
        await settings_collection.update_one(
            {"_type": "support_settings"},
            {"$set": settings_dict},
            upsert=True
        )
        
        # Remove MongoDB _id and _type
        if '_id' in settings_dict:
            del settings_dict['_id']
        if '_type' in settings_dict:
            del settings_dict['_type']
        
        return {
            "success": True,
            "message": "Einstellungen aktualisiert",
            "settings": settings_dict
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating support settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
