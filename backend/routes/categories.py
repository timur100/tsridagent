from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import uuid
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/categories", tags=["Categories"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']

class CategoryCreate(BaseModel):
    id: str  # e.g., "airport", "mainstation"
    name: str  # Display name, e.g., "Airport / Wichtige Standorte"
    keywords: List[str]  # Keywords for auto-detection, e.g., ["FLUGHAFEN", "AIRPORT"]
    icon: Optional[str] = "📍"  # Optional icon/emoji
    color: Optional[str] = "#3b82f6"  # Optional color (hex)
    active: bool = True
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    keywords: Optional[List[str]] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None
    description: Optional[str] = None

class Category(BaseModel):
    id: str
    name: str
    keywords: List[str]
    icon: str = "📍"
    color: str = "#3b82f6"
    active: bool = True
    description: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None

@router.get("/list")
async def list_categories(active_only: bool = False):
    """
    Get all categories
    Public endpoint (no auth required for reading)
    """
    try:
        query = {"active": True} if active_only else {}
        categories = list(db.categories.find(query, {"_id": 0}))
        
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{category_id}")
async def get_category(category_id: str):
    """
    Get a specific category by ID
    """
    try:
        category = db.categories.find_one({"id": category_id}, {"_id": 0})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        return {
            "success": True,
            "category": category
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_category(category_data: CategoryCreate, token_data: dict = Depends(verify_token)):
    """
    Create a new category
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check if category ID already exists
        existing = db.categories.find_one({"id": category_data.id})
        if existing:
            raise HTTPException(status_code=400, detail="Kategorie-ID bereits vorhanden")
        
        # Create category
        now = datetime.now(timezone.utc).isoformat()
        category = {
            "id": category_data.id,
            "name": category_data.name,
            "keywords": category_data.keywords,
            "icon": category_data.icon,
            "color": category_data.color,
            "active": category_data.active,
            "description": category_data.description,
            "created_at": now,
            "updated_at": now,
            "created_by": token_data.get("email")
        }
        
        db.categories.insert_one(category)
        
        # Remove _id for response
        category.pop('_id', None)
        
        return {
            "success": True,
            "message": "Kategorie erstellt",
            "category": category
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{category_id}")
async def update_category(category_id: str, update_data: CategoryUpdate, token_data: dict = Depends(verify_token)):
    """
    Update a category
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check if category exists
        category = db.categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Prepare update data
        update_fields = {}
        if update_data.name is not None:
            update_fields["name"] = update_data.name
        if update_data.keywords is not None:
            update_fields["keywords"] = update_data.keywords
        if update_data.icon is not None:
            update_fields["icon"] = update_data.icon
        if update_data.color is not None:
            update_fields["color"] = update_data.color
        if update_data.active is not None:
            update_fields["active"] = update_data.active
        if update_data.description is not None:
            update_fields["description"] = update_data.description
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update category
        db.categories.update_one(
            {"id": category_id},
            {"$set": update_fields}
        )
        
        # Get updated category
        updated_category = db.categories.find_one({"id": category_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Kategorie aktualisiert",
            "category": updated_category
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{category_id}")
async def delete_category(category_id: str, token_data: dict = Depends(verify_token)):
    """
    Delete a category
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check if category exists
        category = db.categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Check if category is in use
        locations_with_category = db.europcar_stations.count_documents({
            "special_place_tags": category_id
        })
        
        if locations_with_category > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Kategorie wird von {locations_with_category} Standorten verwendet und kann nicht gelöscht werden"
            )
        
        # Delete category
        db.categories.delete_one({"id": category_id})
        
        return {
            "success": True,
            "message": "Kategorie gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize")
async def initialize_default_categories(token_data: dict = Depends(verify_token)):
    """
    Initialize default categories from code
    Admin only - should be run once for migration
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check if categories already exist
        existing_count = db.categories.count_documents({})
        if existing_count > 0:
            return {
                "success": False,
                "message": f"Kategorien bereits vorhanden ({existing_count} Kategorien). Migration nicht erforderlich."
            }
        
        # Default categories from geoFilters.js
        default_categories = [
            {
                "id": "airport",
                "name": "Airport / Wichtige Standorte",
                "keywords": ["FLUGHAFEN", "AIRPORT", "FLH", "TERMINAL", "-IKC-", "IKC"],
                "icon": "✈️",
                "color": "#ef4444",
                "active": True,
                "description": "Flughäfen und wichtige Verkehrsknotenpunkte",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            },
            {
                "id": "mainstation",
                "name": "Hauptbahnhof",
                "keywords": ["HAUPTBAHNHOF", "HBF", "CENTRAL STATION", "BAHNHOF", "TRAIN STATION"],
                "icon": "🚉",
                "color": "#3b82f6",
                "active": True,
                "description": "Hauptbahnhöfe und Bahnhöfe",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            },
            {
                "id": "24h",
                "name": "24h Location",
                "keywords": ["24H", "24 H", "24-STUNDEN", "24 STUNDEN", "24-H"],
                "icon": "🕐",
                "color": "#10b981",
                "active": True,
                "description": "24 Stunden geöffnete Standorte",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            },
            {
                "id": "hotspot",
                "name": "Hotspot",
                "keywords": ["ZENTRUM", "CITY", "CENTER", "EXPRESS", "HOTSPOT", "DOWNTOWN"],
                "icon": "🔥",
                "color": "#f59e0b",
                "active": True,
                "description": "Zentral gelegene Standorte mit hohem Kundenaufkommen",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            }
        ]
        
        # Insert default categories
        db.categories.insert_many(default_categories)
        
        # Remove _id from response
        for cat in default_categories:
            cat.pop('_id', None)
        
        return {
            "success": True,
            "message": f"{len(default_categories)} Standard-Kategorien wurden initialisiert",
            "categories": default_categories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/usage/{category_id}")
async def get_category_usage(category_id: str, token_data: dict = Depends(verify_token)):
    """
    Get usage statistics for a category
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Count locations using this category
        locations_count = db.europcar_stations.count_documents({
            "special_place_tags": category_id
        })
        
        # Get sample locations
        sample_locations = list(db.europcar_stations.find(
            {"special_place_tags": category_id},
            {"stationsname": 1, "city": 1, "_id": 0}
        ).limit(10))
        
        return {
            "success": True,
            "category_id": category_id,
            "locations_count": locations_count,
            "sample_locations": sample_locations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
