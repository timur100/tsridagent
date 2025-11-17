from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
from models.inventory_item import InventoryItem, InventoryItemUpdate, ImageUpload
from utils.db import inventory_collection

router = APIRouter(prefix="/items", tags=["Items"])

@router.get("/")
async def get_inventory_items(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False
):
    """
    Get all inventory items with optional filtering
    """
    try:
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
        items_cursor = inventory_collection.find(query)
        items = []
        
        async for item in items_cursor:
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
    
    except Exception as e:
        print(f"Inventory items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_items(category: Optional[str] = None):
    """
    Get available inventory items (for customer shop view)
    """
    try:
        # Build query - only items with stock > 0
        query = {'quantity_in_stock': {'$gt': 0}}
        
        if category:
            query['category'] = category
        
        # Get items
        items_cursor = inventory_collection.find(query)
        items = []
        
        async for item in items_cursor:
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
    
    except Exception as e:
        print(f"Available items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{item_id}")
async def get_inventory_item(item_id: str):
    """
    Get specific inventory item by ID
    """
    try:
        item = await inventory_collection.find_one({"id": item_id})
        
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

@router.post("/")
async def create_inventory_item(item: InventoryItem):
    """
    Create new inventory item
    """
    try:
        # Check if barcode already exists
        existing = await inventory_collection.find_one({"barcode": item.barcode})
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already exists")
        
        # Create item document
        item_doc = item.dict()
        item_doc['id'] = str(uuid.uuid4())
        item_doc['created_at'] = datetime.now(timezone.utc).isoformat()
        item_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Insert into database
        await inventory_collection.insert_one(item_doc)
        
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

@router.put("/{item_id}")
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate
):
    """
    Update inventory item
    """
    try:
        # Check if item exists
        existing = await inventory_collection.find_one({"id": item_id})
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
        await inventory_collection.update_one(
            {"id": item_id},
            {"$set": update_doc}
        )
        
        # Get updated item
        updated_item = await inventory_collection.find_one({"id": item_id})
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

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str):
    """
    Delete inventory item
    """
    try:
        # Check if item exists
        existing = await inventory_collection.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete from database
        await inventory_collection.delete_one({"id": item_id})
        
        return {
            "success": True,
            "message": "Artikel erfolgreich gelöscht"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete inventory item error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{item_id}/image")
async def upload_item_image(item_id: str, image: ImageUpload):
    """
    Upload product image (base64)
    Max size: 10MB (validated on frontend)
    Formats: JPG, PNG
    """
    try:
        # Check if item exists
        existing = await inventory_collection.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Validate base64 image data format
        if not image.image_data.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Update item with image
        await inventory_collection.update_one(
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