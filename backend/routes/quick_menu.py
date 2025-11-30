from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4

router = APIRouter()

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid

# Pydantic Models
class QuickMenuTile(BaseModel):
    tile_id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    title: str
    description: Optional[str] = None
    icon: str = "Box"  # Lucide icon name
    color: str = "#c00000"  # Tile color
    target_url: str  # URL to navigate to
    target_type: str = "internal"  # internal, external
    order: int = 0  # Display order
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class QuickMenuConfig(BaseModel):
    config_id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    tenant_name: str
    logo_url: Optional[str] = None
    background_color: Optional[str] = "#1a1a1a"
    show_logo: bool = True
    title: str = "Schnellmenü"
    subtitle: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TileCreate(BaseModel):
    tenant_id: str
    title: str
    description: Optional[str] = None
    icon: str = "Box"
    color: str = "#c00000"
    target_url: str
    target_type: str = "internal"
    order: int = 0

class TileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    target_url: Optional[str] = None
    target_type: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class ConfigUpdate(BaseModel):
    logo_url: Optional[str] = None
    background_color: Optional[str] = None
    show_logo: Optional[bool] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    is_active: Optional[bool] = None

# ==================== TILES ENDPOINTS ====================

@router.get("/tiles/tenant/{tenant_id}")
async def get_tenant_tiles(tenant_id: str):
    """Get all tiles for a specific tenant"""
    try:
        tiles = await db.quick_menu_tiles.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("order", 1).to_list(100)
        
        return {
            "success": True,
            "tiles": tiles,
            "count": len(tiles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tiles/all")
async def get_all_tiles():
    """Get all tiles (for admin view)"""
    try:
        tiles = await db.quick_menu_tiles.find(
            {},
            {"_id": 0}
        ).sort([("tenant_id", 1), ("order", 1)]).to_list(1000)
        
        return {
            "success": True,
            "tiles": tiles,
            "count": len(tiles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tiles/create")
async def create_tile(tile: TileCreate):
    """Create a new quick menu tile"""
    try:
        new_tile = QuickMenuTile(
            **tile.dict(),
            tile_id=str(uuid4()),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await db.quick_menu_tiles.insert_one(new_tile.dict())
        
        return {
            "success": True,
            "message": "Kachel erfolgreich erstellt",
            "tile": new_tile.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tiles/update/{tile_id}")
async def update_tile(tile_id: str, tile_update: TileUpdate):
    """Update a tile"""
    try:
        update_data = {k: v for k, v in tile_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now()
        
        result = await db.quick_menu_tiles.update_one(
            {"tile_id": tile_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Kachel nicht gefunden")
        
        updated_tile = await db.quick_menu_tiles.find_one(
            {"tile_id": tile_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "message": "Kachel erfolgreich aktualisiert",
            "tile": updated_tile
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tiles/delete/{tile_id}")
async def delete_tile(tile_id: str):
    """Delete a tile"""
    try:
        result = await db.quick_menu_tiles.delete_one({"tile_id": tile_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Kachel nicht gefunden")
        
        return {
            "success": True,
            "message": "Kachel erfolgreich gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tiles/reorder")
async def reorder_tiles(tenant_id: str, tile_orders: List[dict]):
    """Update tile order: [{tile_id: string, order: number}]"""
    try:
        for item in tile_orders:
            await db.quick_menu_tiles.update_one(
                {"tile_id": item["tile_id"], "tenant_id": tenant_id},
                {"$set": {"order": item["order"], "updated_at": datetime.now()}}
            )
        
        return {
            "success": True,
            "message": "Reihenfolge erfolgreich aktualisiert"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CONFIG ENDPOINTS ====================

@router.get("/config/tenant/{tenant_id}")
async def get_tenant_config(tenant_id: str):
    """Get quick menu configuration for a tenant"""
    try:
        config = await db.quick_menu_configs.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not config:
            # Return default config if none exists
            return {
                "success": True,
                "config": {
                    "tenant_id": tenant_id,
                    "logo_url": None,
                    "background_color": "#1a1a1a",
                    "show_logo": True,
                    "title": "Schnellmenü",
                    "subtitle": None,
                    "is_active": True
                }
            }
        
        return {
            "success": True,
            "config": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config/create")
async def create_config(tenant_id: str, tenant_name: str):
    """Create quick menu config for a tenant"""
    try:
        # Check if config already exists
        existing = await db.quick_menu_configs.find_one({"tenant_id": tenant_id})
        if existing:
            raise HTTPException(status_code=400, detail="Konfiguration existiert bereits")
        
        new_config = QuickMenuConfig(
            config_id=str(uuid4()),
            tenant_id=tenant_id,
            tenant_name=tenant_name,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await db.quick_menu_configs.insert_one(new_config.dict())
        
        return {
            "success": True,
            "message": "Konfiguration erstellt",
            "config": new_config.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/config/update/{tenant_id}")
async def update_config(tenant_id: str, config_update: ConfigUpdate):
    """Update quick menu configuration"""
    try:
        update_data = {k: v for k, v in config_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now()
        
        result = await db.quick_menu_configs.update_one(
            {"tenant_id": tenant_id},
            {"$set": update_data},
            upsert=True
        )
        
        updated_config = await db.quick_menu_configs.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "message": "Konfiguration aktualisiert",
            "config": updated_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== UTILITY ENDPOINTS ====================

@router.get("/tenants/list")
async def get_available_tenants():
    """Get list of all tenants for quick menu configuration"""
    try:
        # Get all customers/tenants from MongoDB
        tenants = await db.customers.find(
            {"active": True},
            {"_id": 0, "id": 1, "name": 1, "domain": 1}
        ).to_list(1000)
        
        # If no customers found, return a default tenant
        if not tenants:
            tenants = [{
                "id": "default",
                "name": "Standard Tenant",
                "domain": "default"
            }]
        
        return {
            "success": True,
            "tenants": tenants
        }
    except Exception as e:
        # Return default tenant on error
        return {
            "success": True,
            "tenants": [{
                "id": "default",
                "name": "Standard Tenant",
                "domain": "default"
            }]
        }

@router.get("/preview/{tenant_id}")
async def get_quick_menu_preview(tenant_id: str):
    """Get complete quick menu data (config + tiles) for preview/display"""
    try:
        config = await db.quick_menu_configs.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        tiles = await db.quick_menu_tiles.find(
            {"tenant_id": tenant_id, "is_active": True},
            {"_id": 0}
        ).sort("order", 1).to_list(100)
        
        return {
            "success": True,
            "config": config,
            "tiles": tiles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_quick_menu_stats():
    """Get statistics about quick menus"""
    try:
        total_configs = await db.quick_menu_configs.count_documents({})
        active_configs = await db.quick_menu_configs.count_documents({"is_active": True})
        total_tiles = await db.quick_menu_tiles.count_documents({})
        active_tiles = await db.quick_menu_tiles.count_documents({"is_active": True})
        
        return {
            "success": True,
            "stats": {
                "total_configs": total_configs,
                "active_configs": active_configs,
                "total_tiles": total_tiles,
                "active_tiles": active_tiles
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
