from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
from models.category import CategoryCreate, CategoryUpdate, CategoryVisibility
from utils.db import categories_collection, inventory_collection

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("/")
async def get_categories():
    """
    Get all available categories with hierarchy (from database)
    Returns categories with subcategories nested
    """
    try:
        categories_cursor = categories_collection.find()
        all_categories = []
        
        async for cat in categories_cursor:
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
            await categories_collection.insert_many(default_categories)
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

@router.post("/")
async def create_category(category: CategoryCreate):
    """
    Create new category or subcategory
    """
    try:
        # If parent_id is provided, verify parent exists
        if category.parent_id:
            parent = await categories_collection.find_one({"id": category.parent_id})
            if not parent:
                raise HTTPException(status_code=404, detail="Parent-Kategorie nicht gefunden")
            
            # Don't allow nested subcategories (only 2 levels)
            if parent.get('parent_id'):
                raise HTTPException(status_code=400, detail="Unterkategorien von Unterkategorien sind nicht erlaubt")
        
        # Check if category name already exists within same parent
        query = {"name": category.name, "parent_id": category.parent_id}
        existing = await categories_collection.find_one(query)
        if existing:
            raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
        
        # Create category
        category_doc = {
            "id": str(uuid.uuid4()),
            "name": category.name,
            "description": category.description,
            "parent_id": category.parent_id,
            "visible_in_shop": True,  # Default: visible in shop
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await categories_collection.insert_one(category_doc)
        
        # Remove MongoDB _id
        if '_id' in category_doc:
            del category_doc['_id']
        
        return {
            "success": True,
            "message": "Kategorie erstellt",
            "category": category_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{category_id}")
async def update_category(category_id: str, category: CategoryUpdate):
    """
    Update category
    """
    try:
        # Check if category exists
        existing = await categories_collection.find_one({"id": category_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # If parent_id is provided, verify parent exists and prevent circular references
        if category.parent_id:
            parent = await categories_collection.find_one({"id": category.parent_id})
            if not parent:
                raise HTTPException(status_code=404, detail="Parent-Kategorie nicht gefunden")
            
            # Don't allow nested subcategories
            if parent.get('parent_id'):
                raise HTTPException(status_code=400, detail="Unterkategorien von Unterkategorien sind nicht erlaubt")
            
            # Can't set parent to self
            if category.parent_id == category_id:
                raise HTTPException(status_code=400, detail="Kategorie kann nicht ihre eigene Parent-Kategorie sein")
        
        # Check if new name conflicts with another category in the same level
        query = {"name": category.name, "id": {"$ne": category_id}, "parent_id": category.parent_id}
        name_conflict = await categories_collection.find_one(query)
        if name_conflict:
            raise HTTPException(status_code=400, detail="Kategoriename bereits vergeben")
        
        # Update category
        await categories_collection.update_one(
            {"id": category_id},
            {"$set": {
                "name": category.name,
                "description": category.description,
                "parent_id": category.parent_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Get updated category
        updated = await categories_collection.find_one({"id": category_id})
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

@router.patch("/{category_id}/visibility")
async def toggle_category_visibility(category_id: str, visibility_data: CategoryVisibility):
    """
    Toggle category visibility in shop
    """
    try:
        # Check if category exists
        category = await categories_collection.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Update visibility
        await categories_collection.update_one(
            {"id": category_id},
            {"$set": {
                "visible_in_shop": visibility_data.visible_in_shop,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Sichtbarkeit aktualisiert",
            "visible_in_shop": visibility_data.visible_in_shop
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Toggle visibility error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{category_id}")
async def delete_category(category_id: str):
    """
    Delete category
    Cannot delete if items or subcategories exist
    """
    try:
        # Check if category exists
        category = await categories_collection.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        # Check if any subcategories exist
        subcategories_count = await categories_collection.count_documents({"parent_id": category_id})
        if subcategories_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Kategorie kann nicht gelöscht werden. {subcategories_count} Unterkategorien sind vorhanden."
            )
        
        # Check if any items use this category
        items_count = await inventory_collection.count_documents({"category": category["name"]})
        if items_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Kategorie kann nicht gelöscht werden. {items_count} Artikel verwenden diese Kategorie."
            )
        
        # Delete category
        await categories_collection.delete_one({"id": category_id})
        
        return {
            "success": True,
            "message": "Kategorie gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete category error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{category_id}/reorder")
async def reorder_category(category_id: str, direction: str):
    """
    Move category up or down in display order
    direction: 'up' or 'down'
    """
    try:
        # Get the category
        category = await categories_collection.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
        
        current_order = category.get('display_order', 999)
        parent_id = category.get('parent_id')
        
        # Get all categories at the same level (same parent)
        query = {"parent_id": parent_id} if parent_id else {"parent_id": None}
        siblings_cursor = categories_collection.find(query)
        siblings = []
        async for sibling in siblings_cursor:
            siblings.append(sibling)
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
        
        await categories_collection.update_one(
            {"id": category_id},
            {"$set": {"display_order": new_index}}
        )
        
        await categories_collection.update_one(
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