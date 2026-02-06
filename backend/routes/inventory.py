"""
Inventory Management API
Verwaltet Artikel ohne Seriennummer (Kabel, Adapter, Zubehör, Verbrauchsmaterial)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['portal_db']


# Pydantic Models
class InventoryItemCreate(BaseModel):
    name: str
    category: str = "Zubehör"
    description: Optional[str] = ""
    barcode: Optional[str] = None
    quantity_in_stock: int = 0
    min_stock_level: int = 5
    unit: str = "Stück"
    image_url: Optional[str] = None
    tenant_id: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    quantity_in_stock: Optional[int] = None
    min_stock_level: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    tenant_id: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    parent_id: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visible: Optional[bool] = None


# Helper function to serialize ObjectId
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ============ ITEMS ENDPOINTS ============

@router.get("/items")
async def list_items(
    tenant_id: str = Query(None),
    category: str = Query(None),
    search: str = Query(None),
    low_stock_only: bool = Query(False),
    limit: int = Query(100),
    skip: int = Query(0)
):
    """Liste aller Inventar-Artikel"""
    try:
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if category and category != "all":
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"barcode": {"$regex": search, "$options": "i"}}
            ]
        
        # For summary, get all items first
        all_cursor = db.inventory_items.find({} if not tenant_id else {"tenant_id": tenant_id})
        all_items = await all_cursor.to_list(length=10000)
        
        total_items = len(all_items)
        low_stock = sum(1 for i in all_items if i.get("quantity_in_stock", 0) <= i.get("min_stock_level", 5))
        out_of_stock = sum(1 for i in all_items if i.get("quantity_in_stock", 0) == 0)
        
        # Apply low_stock filter if needed
        if low_stock_only:
            query["$expr"] = {"$lte": ["$quantity_in_stock", "$min_stock_level"]}
        
        cursor = db.inventory_items.find(query).skip(skip).limit(limit).sort("name", 1)
        items_raw = await cursor.to_list(length=limit)
        items = [serialize_doc(item) for item in items_raw]
        
        total = await db.inventory_items.count_documents(query)
        
        return {
            "success": True,
            "items": items,
            "total": total,
            "summary": {
                "total": total_items,
                "low_stock": low_stock,
                "out_of_stock": out_of_stock
            }
        }
    except Exception as e:
        print(f"Error listing inventory items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/{item_id}")
async def get_item(item_id: str):
    """Einzelnen Artikel abrufen"""
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        return {"success": True, "item": serialize_doc(item)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items")
async def create_item(item: InventoryItemCreate):
    """Neuen Artikel erstellen"""
    try:
        item_doc = {
            "name": item.name,
            "category": item.category,
            "description": item.description,
            "barcode": item.barcode,
            "quantity_in_stock": item.quantity_in_stock,
            "min_stock_level": item.min_stock_level,
            "unit": item.unit,
            "image_url": item.image_url,
            "tenant_id": item.tenant_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.inventory_items.insert_one(item_doc)
        
        return {
            "success": True,
            "item_id": str(result.inserted_id),
            "item": {
                "id": str(result.inserted_id),
                **{k: v for k, v in item_doc.items() if k != "_id"}
            },
            "message": f"Artikel '{item.name}' erstellt"
        }
    except Exception as e:
        print(f"Error creating inventory item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_item(item_id: str, update: InventoryItemUpdate):
    """Artikel aktualisieren"""
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            return {"success": True, "message": "Keine Änderungen"}
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.inventory_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": update_data}
        )
        
        # Get updated item
        updated_item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        
        return {
            "success": True, 
            "message": "Artikel aktualisiert",
            "item": serialize_doc(updated_item)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    """Artikel löschen"""
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        await db.inventory_items.delete_one({"_id": ObjectId(item_id)})
        
        return {"success": True, "message": f"Artikel '{item.get('name')}' gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}/stock")
async def update_stock(item_id: str, quantity_change: int = Query(..., description="Positive = Zugang, Negative = Abgang")):
    """Bestand ändern (Zugang/Abgang)"""
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        new_quantity = item.get("quantity_in_stock", 0) + quantity_change
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail="Bestand kann nicht negativ werden")
        
        await db.inventory_items.update_one(
            {"_id": ObjectId(item_id)},
            {
                "$set": {
                    "quantity_in_stock": new_quantity,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "new_quantity": new_quantity,
            "message": f"Bestand geändert: {'+' if quantity_change > 0 else ''}{quantity_change}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items/{item_id}/image")
async def update_item_image(item_id: str, image_url: str = Query(...)):
    """Artikel-Bild aktualisieren"""
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        await db.inventory_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"image_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"success": True, "message": "Bild aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ CATEGORIES ENDPOINTS ============

@router.get("/categories")
async def list_categories(tenant_id: str = Query(None)):
    """Liste aller Kategorien"""
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        cursor = db.inventory_categories.find(query).sort("order", 1)
        categories_raw = await cursor.to_list(length=100)
        categories = [serialize_doc(cat) for cat in categories_raw]
        
        # If no categories exist, create defaults
        if not categories:
            default_categories = [
                {"name": "Hardware", "description": "Computer und Geräte", "order": 1, "visible": True},
                {"name": "Kabel", "description": "Kabel und Verbindungen", "order": 2, "visible": True},
                {"name": "Adapter", "description": "Adapter und Konverter", "order": 3, "visible": True},
                {"name": "Zubehör", "description": "Diverses Zubehör", "order": 4, "visible": True},
                {"name": "Verbrauchsmaterial", "description": "Verbrauchsartikel", "order": 5, "visible": True},
            ]
            for cat in default_categories:
                cat["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.inventory_categories.insert_one(cat)
            
            cursor = db.inventory_categories.find({}).sort("order", 1)
            categories_raw = await cursor.to_list(length=100)
            categories = [serialize_doc(cat) for cat in categories_raw]
        
        return {"success": True, "categories": categories}
    except Exception as e:
        print(f"Error listing categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categories")
async def create_category(category: CategoryCreate, tenant_id: str = Query(None)):
    """Neue Kategorie erstellen"""
    try:
        # Get max order
        max_order_cat = await db.inventory_categories.find_one(sort=[("order", -1)])
        new_order = (max_order_cat.get("order", 0) if max_order_cat else 0) + 1
        
        cat_doc = {
            "name": category.name,
            "description": category.description,
            "parent_id": category.parent_id,
            "tenant_id": tenant_id,
            "order": new_order,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.inventory_categories.insert_one(cat_doc)
        
        return {
            "success": True,
            "category_id": str(result.inserted_id),
            "category": {
                "id": str(result.inserted_id),
                **{k: v for k, v in cat_doc.items() if k != "_id"}
            },
            "message": f"Kategorie '{category.name}' erstellt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{category_id}")
async def update_category(category_id: str, update: CategoryUpdate, tenant_id: str = Query(None)):
    """Kategorie aktualisieren"""
    try:
        cat = await db.inventory_categories.find_one({"_id": ObjectId(category_id)})
        if not cat:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if update_data:
            await db.inventory_categories.update_one(
                {"_id": ObjectId(category_id)},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Kategorie aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{category_id}/visibility")
async def toggle_category_visibility(category_id: str):
    """Kategorie-Sichtbarkeit umschalten"""
    try:
        cat = await db.inventory_categories.find_one({"_id": ObjectId(category_id)})
        if not cat:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        new_visible = not cat.get("visible", True)
        await db.inventory_categories.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": {"visible": new_visible}}
        )
        
        return {"success": True, "visible": new_visible}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{category_id}/reorder")
async def reorder_category(category_id: str, direction: str = Query(..., regex="^(up|down)$")):
    """Kategorie-Reihenfolge ändern"""
    try:
        cat = await db.inventory_categories.find_one({"_id": ObjectId(category_id)})
        if not cat:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        current_order = cat.get("order", 0)
        
        if direction == "up":
            swap_cat = await db.inventory_categories.find_one(
                {"order": {"$lt": current_order}},
                sort=[("order", -1)]
            )
        else:
            swap_cat = await db.inventory_categories.find_one(
                {"order": {"$gt": current_order}},
                sort=[("order", 1)]
            )
        
        if swap_cat:
            swap_order = swap_cat.get("order", 0)
            await db.inventory_categories.update_one(
                {"_id": ObjectId(category_id)},
                {"$set": {"order": swap_order}}
            )
            await db.inventory_categories.update_one(
                {"_id": swap_cat["_id"]},
                {"$set": {"order": current_order}}
            )
        
        return {"success": True, "message": "Reihenfolge geändert"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Kategorie löschen"""
    try:
        cat = await db.inventory_categories.find_one({"_id": ObjectId(category_id)})
        if not cat:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Check if category has items
        items_count = await db.inventory_items.count_documents({"category": cat.get("name")})
        if items_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Kategorie enthält {items_count} Artikel. Bitte zuerst Artikel verschieben oder löschen."
            )
        
        await db.inventory_categories.delete_one({"_id": ObjectId(category_id)})
        
        return {"success": True, "message": f"Kategorie '{cat.get('name')}' gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ FOR KIT TEMPLATES ============

@router.get("/for-kit-templates")
async def get_items_for_kit_templates(tenant_id: str = Query(None)):
    """
    Gibt Inventar-Artikel für Kit-Vorlagen zurück
    Gruppiert nach Kategorie mit Stückzahlen
    """
    try:
        query = {"quantity_in_stock": {"$gt": 0}}
        if tenant_id:
            query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": None},
                {"tenant_id": {"$exists": False}}
            ]
        
        cursor = db.inventory_items.find(query).sort("category", 1)
        items_raw = await cursor.to_list(length=1000)
        
        # Group by category
        by_category = {}
        for item in items_raw:
            cat = item.get("category", "Sonstiges")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append({
                "id": str(item["_id"]),
                "name": item.get("name"),
                "quantity_available": item.get("quantity_in_stock", 0),
                "unit": item.get("unit", "Stück")
            })
        
        return {
            "success": True,
            "by_category": by_category,
            "total_items": len(items_raw)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
