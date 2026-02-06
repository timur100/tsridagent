"""
Kit Templates API
Verwaltet Kit-Vorlagen - definiert welche Gerätetypen und Artikel zu einem Kit gehören
Unterstützt zwei Arten von Komponenten:
1. Geräte (device_inventory) - mit Seriennummer, werden einzeln verfolgt
2. Inventar-Artikel (inventory_items) - ohne Seriennummer, nur Stückzahlen
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

router = APIRouter(prefix="/api/kit-templates", tags=["kit-templates"])

# Database connections
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['portal_db']


# Pydantic Models
class KitComponent(BaseModel):
    """
    Eine Komponente einer Kit-Vorlage
    - source: 'device' für Geräte mit Seriennummer, 'inventory' für Artikel ohne SN
    - device_type: Gerätetyp (nur wenn source='device')
    - inventory_item_id: Inventar-Artikel-ID (nur wenn source='inventory')
    - inventory_item_name: Name des Inventar-Artikels (für Anzeige)
    - quantity: Anzahl
    """
    source: Literal['device', 'inventory'] = 'device'
    device_type: Optional[str] = None  # Für Geräte (tablet, scanner_regula, etc.)
    inventory_item_id: Optional[str] = None  # Für Inventar-Artikel
    inventory_item_name: Optional[str] = None  # Name für Anzeige
    quantity: int = 1


class KitTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    tenant_id: str
    components: List[KitComponent]


class KitTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tenant_id: Optional[str] = None
    components: Optional[List[KitComponent]] = None


# API Endpoints

@router.get("/list")
async def list_templates(
    tenant_id: str = Query(None, description="Filter nach Tenant"),
    limit: int = Query(100, description="Max. Anzahl"),
    skip: int = Query(0, description="Offset")
):
    """Listet alle Kit-Vorlagen"""
    try:
        query = {}
        if tenant_id and tenant_id != "all":
            query["tenant_id"] = tenant_id
        
        cursor = db.kit_templates.find(query).skip(skip).limit(limit).sort("name", 1)
        templates_raw = await cursor.to_list(length=limit)
        
        templates = []
        for t in templates_raw:
            t["id"] = str(t["_id"])
            del t["_id"]
            templates.append(t)
        
        total = await db.kit_templates.count_documents(query)
        
        return {
            "success": True,
            "templates": templates,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Gibt Details einer Kit-Vorlage zurück"""
    try:
        template = await db.kit_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        template["id"] = str(template["_id"])
        del template["_id"]
        
        return {"success": True, "template": template}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_template(template: KitTemplateCreate):
    """Erstellt eine neue Kit-Vorlage"""
    try:
        # Check if template with same name exists for this tenant
        existing = await db.kit_templates.find_one({
            "name": template.name,
            "tenant_id": template.tenant_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Vorlage mit diesem Namen existiert bereits für diesen Tenant")
        
        template_doc = {
            "name": template.name,
            "description": template.description,
            "tenant_id": template.tenant_id,
            "components": [c.dict() for c in template.components],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.kit_templates.insert_one(template_doc)
        
        return {
            "success": True,
            "template_id": str(result.inserted_id),
            "message": f"Vorlage '{template.name}' erstellt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}")
async def update_template(template_id: str, update: KitTemplateUpdate):
    """Aktualisiert eine Kit-Vorlage"""
    try:
        template = await db.kit_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        update_data = {}
        if update.name is not None:
            update_data["name"] = update.name
        if update.description is not None:
            update_data["description"] = update.description
        if update.tenant_id is not None:
            update_data["tenant_id"] = update.tenant_id
        if update.components is not None:
            update_data["components"] = [c.dict() for c in update.components]
        
        if not update_data:
            return {"success": True, "message": "Keine Änderungen"}
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.kit_templates.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Vorlage aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Löscht eine Kit-Vorlage"""
    try:
        template = await db.kit_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        await db.kit_templates.delete_one({"_id": ObjectId(template_id)})
        
        return {
            "success": True,
            "message": f"Vorlage '{template.get('name')}' gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}/availability")
async def check_template_availability(template_id: str, tenant_id: str = Query(None)):
    """
    Prüft wie viele Kits mit dieser Vorlage erstellt werden können
    basierend auf aktuellen Lagerbeständen (Geräte und Inventar-Artikel)
    """
    try:
        template = await db.kit_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
        
        effective_tenant_id = tenant_id or template.get("tenant_id")
        
        # Get device storage stats
        device_match = {"status": "in_storage", "kit_id": {"$exists": False}}
        if effective_tenant_id:
            device_match["tenant_id"] = effective_tenant_id
        
        type_pipeline = [
            {"$match": device_match},
            {"$group": {"_id": "$device_type", "count": {"$sum": 1}}}
        ]
        type_cursor = db.device_inventory.aggregate(type_pipeline)
        device_type_counts = {item["_id"]: item["count"] async for item in type_cursor}
        
        # Get inventory item counts (by item_id)
        inventory_item_counts = {}
        inventory_cursor = db.inventory_items.find({"quantity_in_stock": {"$gt": 0}})
        async for item in inventory_cursor:
            inventory_item_counts[str(item["_id"])] = item.get("quantity_in_stock", 0)
        
        # Calculate possible kits
        components = template.get("components", [])
        min_kits = float('inf')
        component_availability = []
        
        for comp in components:
            source = comp.get("source", "device")
            required = comp.get("quantity", 1)
            
            if source == "device":
                # Gerät mit Seriennummer
                device_type = comp.get("device_type")
                available = device_type_counts.get(device_type, 0)
                possible = available // required
                
                component_availability.append({
                    "source": "device",
                    "device_type": device_type,
                    "name": device_type,
                    "required": required,
                    "available": available,
                    "possible_kits": possible
                })
            else:
                # Inventar-Artikel ohne Seriennummer
                item_id = comp.get("inventory_item_id")
                item_name = comp.get("inventory_item_name", "Unbekannt")
                available = inventory_item_counts.get(item_id, 0)
                possible = available // required
                
                component_availability.append({
                    "source": "inventory",
                    "inventory_item_id": item_id,
                    "name": item_name,
                    "required": required,
                    "available": available,
                    "possible_kits": possible
                })
            
            min_kits = min(min_kits, possible)
        
        if min_kits == float('inf'):
            min_kits = 0
        
        return {
            "success": True,
            "template_id": template_id,
            "template_name": template.get("name"),
            "possible_kits": min_kits,
            "component_availability": component_availability
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
