from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Settings Service",
    description="Microservice for application settings and configuration management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'settings_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class Setting(BaseModel):
    """Setting model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str  # e.g., "app.theme", "email.smtp_host"
    value: Union[str, int, float, bool, Dict, List]
    value_type: str = "string"  # string, int, float, bool, json
    category: str = "general"  # general, email, notification, security, integration, etc.
    scope: str = "global"  # global, tenant, user
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    description: Optional[str] = None
    is_sensitive: bool = False
    is_readonly: bool = False
    default_value: Optional[Union[str, int, float, bool, Dict, List]] = None
    validation_rules: Optional[Dict[str, Any]] = {}
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SettingCreate(BaseModel):
    """Create setting model"""
    key: str
    value: Union[str, int, float, bool, Dict, List]
    value_type: str = "string"
    category: str = "general"
    scope: str = "global"
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    description: Optional[str] = None
    is_sensitive: bool = False
    is_readonly: bool = False
    default_value: Optional[Union[str, int, float, bool, Dict, List]] = None
    validation_rules: Optional[Dict[str, Any]] = {}
    metadata: Dict[str, Any] = {}


class SettingUpdate(BaseModel):
    """Update setting model"""
    value: Optional[Union[str, int, float, bool, Dict, List]] = None
    description: Optional[str] = None
    is_sensitive: Optional[bool] = None
    is_readonly: Optional[bool] = None
    validation_rules: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Settings Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "Settings Service",
        "version": "1.0.0",
        "description": "Microservice for application settings and configuration management",
        "endpoints": [
            "/health",
            "/info",
            "/api/settings",
            "/api/settings/{setting_id}",
            "/api/settings/key/{key}",
            "/api/settings/category/{category}",
            "/api/settings/bulk",
            "/api/settings/stats"
        ]
    }


# Settings Routes - Specific routes first
@app.get("/api/settings/stats")
async def get_settings_stats():
    """Get settings statistics"""
    try:
        total = await db.settings.count_documents({})
        
        # By category
        pipeline_category = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        category_result = await db.settings.aggregate(pipeline_category).to_list(100)
        by_category = {item['_id']: item['count'] for item in category_result if item['_id']}
        
        # By scope
        pipeline_scope = [
            {"$group": {"_id": "$scope", "count": {"$sum": 1}}}
        ]
        scope_result = await db.settings.aggregate(pipeline_scope).to_list(100)
        by_scope = {item['_id']: item['count'] for item in scope_result if item['_id']}
        
        # Sensitive and readonly counts
        sensitive = await db.settings.count_documents({"is_sensitive": True})
        readonly = await db.settings.count_documents({"is_readonly": True})
        
        return {
            "total": total,
            "by_category": by_category,
            "by_scope": by_scope,
            "sensitive": sensitive,
            "readonly": readonly
        }
    except Exception as e:
        logger.error(f"Error getting settings stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/settings/bulk", response_model=List[Setting])
async def bulk_create_settings(settings: List[SettingCreate]):
    """Create multiple settings at once"""
    try:
        created_settings = []
        
        for setting_create in settings:
            # Check if key already exists
            existing = await db.settings.find_one({"key": setting_create.key})
            if existing:
                # Skip or update existing
                continue
            
            new_setting = Setting(**setting_create.model_dump())
            doc = new_setting.model_dump()
            
            # Convert datetime to ISO string
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            await db.settings.insert_one(doc)
            created_settings.append(new_setting)
            logger.info(f"Created setting: {setting_create.key}")
        
        return created_settings
    except Exception as e:
        logger.error(f"Error bulk creating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings/key/{key}", response_model=Setting)
async def get_setting_by_key(key: str, tenant_id: Optional[str] = None, user_id: Optional[str] = None):
    """Get a specific setting by key"""
    try:
        query = {"key": key}
        
        # Scope-based lookup: user > tenant > global
        if user_id:
            query["user_id"] = user_id
        elif tenant_id:
            query["tenant_id"] = tenant_id
        else:
            query["scope"] = "global"
        
        setting = await db.settings.find_one(query, {"_id": 0})
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Parse datetime strings
        if isinstance(setting.get('created_at'), str):
            setting['created_at'] = datetime.fromisoformat(setting['created_at'])
        if isinstance(setting.get('updated_at'), str):
            setting['updated_at'] = datetime.fromisoformat(setting['updated_at'])
        
        return Setting(**setting)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting setting by key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings/category/{category}", response_model=List[Setting])
async def get_settings_by_category(category: str):
    """Get all settings in a specific category"""
    try:
        settings = await db.settings.find({"category": category}, {"_id": 0}).to_list(100)
        
        # Parse datetime strings
        for setting in settings:
            if isinstance(setting.get('created_at'), str):
                setting['created_at'] = datetime.fromisoformat(setting['created_at'])
            if isinstance(setting.get('updated_at'), str):
                setting['updated_at'] = datetime.fromisoformat(setting['updated_at'])
        
        return [Setting(**setting) for setting in settings]
    except Exception as e:
        logger.error(f"Error getting settings by category: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings", response_model=List[Setting])
async def get_settings(
    category: Optional[str] = None,
    scope: Optional[str] = None,
    is_sensitive: Optional[bool] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get all settings with optional filters"""
    try:
        query = {}
        if category:
            query['category'] = category
        if scope:
            query['scope'] = scope
        if is_sensitive is not None:
            query['is_sensitive'] = is_sensitive
        
        settings = await db.settings.find(query, {"_id": 0}).to_list(limit)
        
        # Parse datetime strings
        for setting in settings:
            if isinstance(setting.get('created_at'), str):
                setting['created_at'] = datetime.fromisoformat(setting['created_at'])
            if isinstance(setting.get('updated_at'), str):
                setting['updated_at'] = datetime.fromisoformat(setting['updated_at'])
        
        return [Setting(**setting) for setting in settings]
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/settings", response_model=Setting, status_code=201)
async def create_setting(setting: SettingCreate):
    """Create a new setting"""
    try:
        # Check if key already exists
        existing = await db.settings.find_one({"key": setting.key})
        if existing:
            raise HTTPException(status_code=400, detail="Setting key already exists")
        
        new_setting = Setting(**setting.model_dump())
        doc = new_setting.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.settings.insert_one(doc)
        logger.info(f"Created setting: {setting.key}")
        
        return new_setting
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings/{setting_id}", response_model=Setting)
async def get_setting(setting_id: str):
    """Get a specific setting by ID"""
    try:
        setting = await db.settings.find_one({"id": setting_id}, {"_id": 0})
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Parse datetime strings
        if isinstance(setting.get('created_at'), str):
            setting['created_at'] = datetime.fromisoformat(setting['created_at'])
        if isinstance(setting.get('updated_at'), str):
            setting['updated_at'] = datetime.fromisoformat(setting['updated_at'])
        
        return Setting(**setting)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/settings/{setting_id}", response_model=Setting)
async def update_setting(setting_id: str, setting_update: SettingUpdate):
    """Update a setting"""
    try:
        # Check if setting exists
        existing = await db.settings.find_one({"id": setting_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Check if readonly
        if existing.get('is_readonly'):
            raise HTTPException(status_code=403, detail="Cannot update readonly setting")
        
        # Prepare update data
        update_data = setting_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.settings.update_one({"id": setting_id}, {"$set": update_data})
        
        # Fetch updated setting
        updated = await db.settings.find_one({"id": setting_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        
        logger.info(f"Updated setting: {setting_id}")
        return Setting(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/settings/{setting_id}")
async def delete_setting(setting_id: str):
    """Delete a setting"""
    try:
        # Check if readonly
        existing = await db.settings.find_one({"id": setting_id})
        if existing and existing.get('is_readonly'):
            raise HTTPException(status_code=403, detail="Cannot delete readonly setting")
        
        result = await db.settings.delete_one({"id": setting_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        logger.info(f"Deleted setting: {setting_id}")
        return {"success": True, "message": "Setting deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8109))
    uvicorn.run(app, host="0.0.0.0", port=port)