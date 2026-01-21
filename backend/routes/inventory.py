from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

class InventoryItem(BaseModel):
    name: str
    category: str  # Hardware, Software, Zubehör, Ersatzteile
    description: Optional[str] = ""
    barcode: str
    serial_numbers: List[str] = []  # Liste von Seriennummern für Garantie-Tracking
    quantity_in_stock: int
    min_stock_level: int = 5
    unit: str = "Stück"
    image_url: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    quantity_in_stock: Optional[int] = None
    min_stock_level: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None

@router.get("/items")
async def get_inventory_items(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    token_data: dict = Depends(verify_token)
):
    """
    Get all inventory items with optional filtering
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {}
        
        if category:
            query['category'] = category
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'barcode': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get items
        items_cursor = db.inventory.find(query)
        items = []
        
        for item in items_cursor:
            # Remove MongoDB _id
            if '_id' in item:
                del item['_id']
            
            # Check if low stock
            is_low_stock = item.get('quantity_in_stock', 0) <= item.get('min_stock_level', 5)
            item['is_low_stock'] = is_low_stock
            
            # Filter by low stock if requested
            if low_stock_only and not is_low_stock:
                continue
            
            items.append(item)
        
        # Get summary statistics
        total_items = len(items)
        low_stock_count = sum(1 for item in items if item.get('is_low_stock', False))
        out_of_stock_count = sum(1 for item in items if item.get('quantity_in_stock', 0) == 0)
        
        return {
            "success": True,
            "items": items,
            "summary": {
                "total": total_items,
                "low_stock": low_stock_count,
                "out_of_stock": out_of_stock_count
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Inventory items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items/available")
async def get_available_items(
    category: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get available inventory items (for customer shop view)
    Admin and customers with shop access can view
    """
    try:
        # Build query - only items with stock > 0
        query = {'quantity_in_stock': {'$gt': 0}}
        
        if category:
            query['category'] = category
        
        # Get items
        items_cursor = db.inventory.find(query)
        items = []
        
        for item in items_cursor:
            # Remove MongoDB _id and sensitive data
            if '_id' in item:
                del item['_id']
            
            # Only return necessary fields for shop view
            shop_item = {
                'id': item.get('id'),
                'name': item.get('name'),
                'category': item.get('category'),
                'description': item.get('description'),
                'quantity_in_stock': item.get('quantity_in_stock'),
                'unit': item.get('unit', 'Stück'),
                'image_url': item.get('image_url')
            }
            items.append(shop_item)
        
        return {
            "success": True,
            "items": items
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Available items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items/{item_id}")
async def get_inventory_item(
    item_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get specific inventory item by ID
    Admin only for full details
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        item = db.inventory.find_one({"id": item_id})
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Remove MongoDB _id
        if '_id' in item:
            del item['_id']
        
        return {
            "success": True,
            "item": item
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get inventory item error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/items")
async def create_inventory_item(
    item: InventoryItem,
    token_data: dict = Depends(verify_token)
):
    """
    Create new inventory item
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if barcode already exists
        existing = db.inventory.find_one({"barcode": item.barcode})
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already exists")
        
        # Create item document
        item_doc = item.dict()
        item_doc['id'] = str(uuid.uuid4())
        item_doc['created_at'] = datetime.now(timezone.utc).isoformat()
        item_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Insert into database
        db.inventory.insert_one(item_doc)
        
        # Remove MongoDB _id
        if '_id' in item_doc:
            del item_doc['_id']
        
        return {
            "success": True,
            "message": "Artikel erfolgreich erstellt",
            "item": item_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create inventory item error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/items/{item_id}")
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update inventory item
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if item exists
        existing = db.inventory.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Build update document (only include fields that were provided)
        update_doc = {}
        for field, value in item_update.dict(exclude_unset=True).items():
            if value is not None:
                update_doc[field] = value
        
        # Add updated timestamp
        update_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update in database
        db.inventory.update_one(
            {"id": item_id},
            {"$set": update_doc}
        )
        
        # Get updated item
        updated_item = db.inventory.find_one({"id": item_id})
        if '_id' in updated_item:
            del updated_item['_id']
        
        return {
            "success": True,
            "message": "Artikel erfolgreich aktualisiert",
            "item": updated_item
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update inventory item error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/items/{item_id}")
async def delete_inventory_item(
    item_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete inventory item
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if item exists
        existing = db.inventory.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete from database
        db.inventory.delete_one({"id": item_id})
        
        return {
            "success": True,
            "message": "Artikel erfolgreich gelöscht"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete inventory item error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ImageUpload(BaseModel):
    image_data: str  # Base64 encoded image

@router.put("/items/{item_id}/image")
async def upload_item_image(
    item_id: str,
    image: ImageUpload,
    token_data: dict = Depends(verify_token)
):
    """
    Upload product image (base64)
    Admin only
    Max size: 10MB (validated on frontend)
    Formats: JPG, PNG
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if item exists
        existing = db.inventory.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Validate base64 image data format
        if not image.image_data.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Update item with image
        db.inventory.update_one(
            {"id": item_id},
            {
                "$set": {
                    "image_url": image.image_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Bild erfolgreich hochgeladen"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload image error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories(token_data: dict = Depends(verify_token)):
    """
    Get all available categories with hierarchy (from database)
    Returns categories with subcategories nested
    """
    try:
        categories_cursor = db.inventory_categories.find()
        all_categories = []
        
        for cat in categories_cursor:
            if '_id' in cat:
                del cat['_id']
            # Ensure visible_in_shop is set (default to True if not present)
            if 'visible_in_shop' not in cat:
                cat['visible_in_shop'] = True
            all_categories.append(cat)
        
        # If no categories exist, create default ones with subcategories
        if len(all_categories) == 0:
            hardware_id = str(uuid.uuid4())
            software_id = str(uuid.uuid4())
            zubehoer_id = str(uuid.uuid4())
            ersatzteile_id = str(uuid.uuid4())
            
            default_categories = [
                # Main categories
                {"id": hardware_id, "name": "Hardware", "description": "Tablets, Scanner, Computer", "parent_id": None, "display_order": 0, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": software_id, "name": "Software", "description": "Lizenzen und Software", "parent_id": None, "display_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": zubehoer_id, "name": "Zubehör", "description": "Kabel, Adapter, etc.", "parent_id": None, "display_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": ersatzteile_id, "name": "Ersatzteile", "description": "Ersatz- und Verschleißteile", "parent_id": None, "display_order": 3, "created_at": datetime.now(timezone.utc).isoformat()},
                
                # Hardware subcategories
                {"id": str(uuid.uuid4()), "name": "Tablets", "description": "Tablet-Computer", "parent_id": hardware_id, "display_order": 0, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "name": "Scanner", "description": "Dokumentenscanner", "parent_id": hardware_id, "display_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "name": "Computer", "description": "PCs und Laptops", "parent_id": hardware_id, "display_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
                
                # Software subcategories
                {"id": str(uuid.uuid4()), "name": "Betriebssysteme", "description": "Windows, Linux, etc.", "parent_id": software_id, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "name": "Anwendungen", "description": "Office, Tools, etc.", "parent_id": software_id, "created_at": datetime.now(timezone.utc).isoformat()},
                
                # Zubehör subcategories
                {"id": str(uuid.uuid4()), "name": "Kabel", "description": "USB, HDMI, etc.", "parent_id": zubehoer_id, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "name": "Adapter", "description": "Stromadapter, Netzteile", "parent_id": zubehoer_id, "created_at": datetime.now(timezone.utc).isoformat()},
                
                # Ersatzteile subcategories
                {"id": str(uuid.uuid4()), "name": "Displays", "description": "Bildschirme", "parent_id": ersatzteile_id, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "name": "Akkus", "description": "Batterien und Akkus", "parent_id": ersatzteile_id, "created_at": datetime.now(timezone.utc).isoformat()}
            ]
            db.inventory_categories.insert_many(default_categories)
            all_categories = default_categories
        
        # Build hierarchy: separate parent and child categories
        parent_categories = [cat for cat in all_categories if not cat.get('parent_id')]
        child_categories = [cat for cat in all_categories if cat.get('parent_id')]
        
        # Sort by display_order (default to 999 if not set)
        parent_categories.sort(key=lambda x: x.get('display_order', 999))
        
        # Attach subcategories to their parents
        for parent in parent_categories:
            subcats = [child for child in child_categories if child.get('parent_id') == parent['id']]
            subcats.sort(key=lambda x: x.get('display_order', 999))
            parent['subcategories'] = subcats
        
        return {
            "success": True,
            "categories": parent_categories,
            "all_categories": all_categories  # Also return flat list for backward compatibility
        }
    except Exception as e:
        print(f"Get categories error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories")
async def create_category(
    name: str,
    description: str = "",
    parent_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Create new category or subcategory
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # If parent_id is provided, verify parent exists
        if parent_id:
            parent = db.inventory_categories.find_one({"id": parent_id})
            if not parent:
                raise HTTPException(status_code=404, detail="Parent-Kategorie nicht gefunden")
            
            # Don't allow nested subcategories (only 2 levels)
            if parent.get('parent_id'):
                raise HTTPException(status_code=400, detail="Unterkategorien von Unterkategorien sind nicht erlaubt")
        
        # Check if category name already exists within same parent
        query = {"name": name, "parent_id": parent_id}
        existing = db.inventory_categories.find_one(query)
        if existing:
            raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
        
        # Create category
        category = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": description,
            "parent_id": parent_id,
            "visible_in_shop": True,  # Default: visible in shop
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.inventory_categories.insert_one(category)
        
        # Remove MongoDB _id
        if '_id' in category:
            del category['_id']
        
        return {
            "success": True,
            "message": "Kategorie erstellt",
            "category": category
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    name: str,
    description: str = "",
    parent_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Update category
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if category exists
        existing = db.inventory_categories.find_one({"id": category_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # If parent_id is provided, verify parent exists and prevent circular references
        if parent_id:
            parent = db.inventory_categories.find_one({"id": parent_id})
            if not parent:
                raise HTTPException(status_code=404, detail="Parent-Kategorie nicht gefunden")
            
            # Don't allow nested subcategories
            if parent.get('parent_id'):
                raise HTTPException(status_code=400, detail="Unterkategorien von Unterkategorien sind nicht erlaubt")
            
            # Can't set parent to self
            if parent_id == category_id:
                raise HTTPException(status_code=400, detail="Kategorie kann nicht ihre eigene Parent-Kategorie sein")
        
        # Check if new name conflicts with another category in the same level
        query = {"name": name, "id": {"$ne": category_id}, "parent_id": parent_id}
        name_conflict = db.inventory_categories.find_one(query)
        if name_conflict:
            raise HTTPException(status_code=400, detail="Kategoriename bereits vergeben")
        
        # Update category
        db.inventory_categories.update_one(
            {"id": category_id},
            {"$set": {
                "name": name,
                "description": description,
                "parent_id": parent_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Get updated category
        updated = db.inventory_categories.find_one({"id": category_id})
        if '_id' in updated:
            del updated['_id']
        
        return {
            "success": True,
            "message": "Kategorie aktualisiert",
            "category": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/categories/{category_id}/visibility")
async def toggle_category_visibility(
    category_id: str,
    visibility_data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Toggle category visibility in shop
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if category exists
        category = db.inventory_categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Update visibility
        visible_in_shop = visibility_data.get("visible_in_shop", True)
        db.inventory_categories.update_one(
            {"id": category_id},
            {"$set": {
                "visible_in_shop": visible_in_shop,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Sichtbarkeit aktualisiert",
            "visible_in_shop": visible_in_shop
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Toggle visibility error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete category
    Admin only - Cannot delete if items or subcategories exist
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if category exists
        category = db.inventory_categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Check if any subcategories exist
        subcategories_count = db.inventory_categories.count_documents({"parent_id": category_id})
        if subcategories_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Kategorie kann nicht gelöscht werden. {subcategories_count} Unterkategorien sind vorhanden."
            )
        
        # Check if any items use this category
        items_count = db.inventory.count_documents({"category": category["name"]})
        if items_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Kategorie kann nicht gelöscht werden. {items_count} Artikel verwenden diese Kategorie."
            )
        
        # Delete category
        db.inventory_categories.delete_one({"id": category_id})
        
        return {
            "success": True,
            "message": "Kategorie gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/categories/{category_id}/reorder")
async def reorder_category(
    category_id: str,
    direction: str,  # "up" or "down"
    token_data: dict = Depends(verify_token)
):
    """
    Move category up or down in display order
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get the category
        category = db.inventory_categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        current_order = category.get('display_order', 999)
        parent_id = category.get('parent_id')
        
        # Get all categories at the same level (same parent)
        query = {"parent_id": parent_id} if parent_id else {"parent_id": None}
        siblings = list(db.inventory_categories.find(query))
        siblings.sort(key=lambda x: x.get('display_order', 999))
        
        # Find current position
        current_index = next((i for i, cat in enumerate(siblings) if cat['id'] == category_id), -1)
        
        if current_index == -1:
            raise HTTPException(status_code=404, detail="Kategorie nicht in der Liste gefunden")
        
        # Determine new position
        if direction == "up":
            if current_index == 0:
                return {"success": True, "message": "Kategorie ist bereits ganz oben"}
            new_index = current_index - 1
        elif direction == "down":
            if current_index >= len(siblings) - 1:
                return {"success": True, "message": "Kategorie ist bereits ganz unten"}
            new_index = current_index + 1
        else:
            raise HTTPException(status_code=400, detail="Direction muss 'up' oder 'down' sein")
        
        # Swap display_order with the sibling
        sibling = siblings[new_index]
        
        db.inventory_categories.update_one(
            {"id": category_id},
            {"$set": {"display_order": new_index}}
        )
        
        db.inventory_categories.update_one(
            {"id": sibling['id']},
            {"$set": {"display_order": current_index}}
        )
        
        return {
            "success": True,
            "message": f"Kategorie nach {'oben' if direction == 'up' else 'unten'} verschoben"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reorder category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= WARENEINGANG & NACHBESTELLUNG =============

class GoodsReceiptItem(BaseModel):
    item_id: str
    quantity: int
    serial_numbers: Optional[List[str]] = []
    notes: Optional[str] = None

class LabelRequest(BaseModel):
    item_id: str
    quantity: int = 1
    serial_numbers: Optional[List[str]] = []

@router.get("/low-stock")
async def get_low_stock_items(token_data: dict = Depends(verify_token)):
    """
    Get items with stock below minimum level
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find items where quantity_in_stock <= min_stock_level
        pipeline = [
            {
                "$match": {
                    "$expr": {
                        "$lte": ["$quantity_in_stock", "$min_stock_level"]
                    }
                }
            },
            {
                "$sort": {
                    "quantity_in_stock": 1  # Sort by stock level (lowest first)
                }
            }
        ]
        
        items = list(db.inventory.aggregate(pipeline))
        
        # Remove MongoDB _id
        for item in items:
            if '_id' in item:
                del item['_id']
        
        return {
            "success": True,
            "count": len(items),
            "items": items
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get low stock items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/goods-receipt")
async def process_goods_receipt(
    receipt: GoodsReceiptItem,
    token_data: dict = Depends(verify_token)
):
    """
    Process goods receipt and update inventory
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get item
        item = db.inventory.find_one({"id": receipt.item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        # Update stock
        new_quantity = item.get('quantity_in_stock', 0) + receipt.quantity
        
        # Add serial numbers if provided
        existing_serials = item.get('serial_numbers', [])
        if receipt.serial_numbers:
            existing_serials.extend(receipt.serial_numbers)
        
        # Update item
        db.inventory.update_one(
            {"id": receipt.item_id},
            {
                "$set": {
                    "quantity_in_stock": new_quantity,
                    "serial_numbers": existing_serials,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create goods receipt history entry
        receipt_doc = {
            "id": str(uuid.uuid4()),
            "item_id": receipt.item_id,
            "item_name": item.get('name'),
            "quantity": receipt.quantity,
            "serial_numbers": receipt.serial_numbers or [],
            "notes": receipt.notes,
            "received_by": token_data.get("sub"),
            "received_at": datetime.now(timezone.utc).isoformat(),
            "old_stock": item.get('quantity_in_stock', 0),
            "new_stock": new_quantity
        }
        
        db.goods_receipts.insert_one(receipt_doc)
        
        return {
            "success": True,
            "message": f"Wareneingang erfolgreich gebucht: {receipt.quantity} {item.get('unit', 'Stück')}",
            "item_id": receipt.item_id,
            "old_stock": item.get('quantity_in_stock', 0),
            "new_stock": new_quantity,
            "receipt_id": receipt_doc['id']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Process goods receipt error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-labels")
async def generate_labels(
    label_request: LabelRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Generate PDF labels for items
    Admin only
    """
    try:
        import qrcode
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        from io import BytesIO
        import base64
        
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get item
        item = db.inventory.find_one({"id": label_request.item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        # Create PDF buffer
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        
        # Label dimensions (62x29mm for Dymo-compatible labels)
        label_width = 62 * mm
        label_height = 29 * mm
        margin = 5 * mm
        
        # Current date
        current_date = datetime.now(timezone.utc).strftime("%d.%m.%Y")
        
        # Generate labels
        labels_per_page = 10
        x_offset = 20
        y_offset = A4[1] - 40  # Start from top
        
        for i in range(label_request.quantity):
            # Generate QR code for barcode
            qr = qrcode.QRCode(version=1, box_size=10, border=0)
            qr.add_data(item.get('barcode', ''))
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert QR code to bytes
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            qr_reader = ImageReader(qr_buffer)
            
            # Draw label border
            c.rect(x_offset, y_offset - label_height, label_width, label_height)
            
            # Draw QR code
            qr_size = 20 * mm
            c.drawImage(qr_reader, x_offset + margin, y_offset - qr_size - margin, 
                       width=qr_size, height=qr_size, preserveAspectRatio=True)
            
            # Draw text information
            text_x = x_offset + qr_size + margin + 5
            text_y = y_offset - 10
            
            # Article name
            c.setFont("Helvetica-Bold", 10)
            c.drawString(text_x, text_y, item.get('name', '')[:30])
            
            # Article number / Barcode
            c.setFont("Helvetica", 8)
            c.drawString(text_x, text_y - 12, f"Art.Nr.: {item.get('barcode', '')}")
            
            # Date
            c.drawString(text_x, text_y - 20, f"Datum: {current_date}")
            
            # Serial number if provided
            if label_request.serial_numbers and i < len(label_request.serial_numbers):
                c.setFont("Helvetica-Bold", 7)
                c.drawString(text_x, text_y - 28, f"S/N: {label_request.serial_numbers[i]}")
            
            # Move to next label position
            y_offset -= (label_height + 5)
            
            # New page if needed
            if (i + 1) % labels_per_page == 0 and i < label_request.quantity - 1:
                c.showPage()
                y_offset = A4[1] - 40
        
        # Save PDF
        c.save()
        
        # Get PDF bytes
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.read()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "success": True,
            "message": f"{label_request.quantity} Etikett(en) generiert",
            "pdf_data": f"data:application/pdf;base64,{pdf_base64}",
            "filename": f"etiketten_{item.get('barcode')}_{current_date}.pdf"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Generate labels error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/goods-receipts")
async def get_goods_receipts(
    item_id: Optional[str] = None,
    limit: int = 50,
    token_data: dict = Depends(verify_token)
):
    """
    Get goods receipt history
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {}
        if item_id:
            query['item_id'] = item_id
        
        # Get receipts
        receipts = list(db.goods_receipts.find(query).sort("received_at", -1).limit(limit))
        
        # Remove MongoDB _id
        for receipt in receipts:
            if '_id' in receipt:
                del receipt['_id']
        
        return {
            "success": True,
            "count": len(receipts),
            "receipts": receipts
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get goods receipts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

