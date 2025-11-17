from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import uuid

router = APIRouter(prefix="/api/euroboxes", tags=["Euroboxes"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']

# Models
class Eurobox(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    eurobox_number: str
    description: Optional[str] = None
    status: str = "available"  # available, in_use, maintenance
    current_order_id: Optional[str] = None
    current_order_number: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EuroboxCreate(BaseModel):
    eurobox_number: Optional[str] = None  # Optional - will be auto-generated if not provided
    description: Optional[str] = None

class EuroboxUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None

# Optional token verification
async def verify_token_optional():
    return {"email": "system", "role": "admin"}

@router.get("/list")
async def list_euroboxes(status: Optional[str] = None, token_data: dict = Depends(verify_token_optional)):
    """Get all euroboxes, optionally filtered by status"""
    query = {}
    if status:
        query["status"] = status
    
    euroboxes = list(db.euroboxes.find(query, {"_id": 0}).sort("eurobox_number", 1))
    
    return {
        "success": True,
        "euroboxes": euroboxes,
        "count": len(euroboxes)
    }

def generate_eurobox_number():
    """Generate next Eurobox number in format EB-YYYYMMDD-XXXX"""
    today = datetime.now(timezone.utc)
    date_str = today.strftime("%Y%m%d")
    prefix = f"EB-{date_str}-"
    
    # Find all euroboxes created today
    today_euroboxes = list(db.euroboxes.find(
        {"eurobox_number": {"$regex": f"^{prefix}"}},
        {"eurobox_number": 1}
    ))
    
    if not today_euroboxes:
        return f"{prefix}0001"
    
    # Extract numbers and find the highest
    numbers = []
    for eb in today_euroboxes:
        try:
            num_str = eb["eurobox_number"].split("-")[-1]
            numbers.append(int(num_str))
        except (IndexError, ValueError):
            continue
    
    next_num = max(numbers) + 1 if numbers else 1
    return f"{prefix}{next_num:04d}"

@router.post("/create")
async def create_eurobox(eurobox_data: EuroboxCreate, token_data: dict = Depends(verify_token_optional)):
    """Create a new eurobox with auto-generated ID"""
    # Generate unique eurobox number
    eurobox_number = eurobox_data.eurobox_number if eurobox_data.eurobox_number else generate_eurobox_number()
    
    # Check if eurobox number already exists
    existing = db.euroboxes.find_one({"eurobox_number": eurobox_number})
    if existing:
        raise HTTPException(status_code=400, detail="Eurobox-Nummer bereits vorhanden")
    
    eurobox = Eurobox(
        eurobox_number=eurobox_number,
        description=eurobox_data.description
    )
    
    eurobox_dict = eurobox.dict()
    db.euroboxes.insert_one(eurobox_dict)
    
    # Remove MongoDB _id from response
    eurobox_dict.pop('_id', None)
    
    return {
        "success": True,
        "message": "Eurobox erstellt",
        "eurobox": eurobox_dict
    }

@router.put("/update/{eurobox_id}")
async def update_eurobox(eurobox_id: str, update_data: EuroboxUpdate, token_data: dict = Depends(verify_token_optional)):
    """Update eurobox"""
    eurobox = db.euroboxes.find_one({"id": eurobox_id})
    if not eurobox:
        raise HTTPException(status_code=404, detail="Eurobox nicht gefunden")
    
    update_fields = {}
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.status is not None:
        update_fields["status"] = update_data.status
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    db.euroboxes.update_one(
        {"id": eurobox_id},
        {"$set": update_fields}
    )
    
    return {
        "success": True,
        "message": "Eurobox aktualisiert"
    }

@router.delete("/delete/{eurobox_id}")
async def delete_eurobox(eurobox_id: str, token_data: dict = Depends(verify_token_optional)):
    """Delete eurobox"""
    eurobox = db.euroboxes.find_one({"id": eurobox_id})
    if not eurobox:
        raise HTTPException(status_code=404, detail="Eurobox nicht gefunden")
    
    if eurobox.get("status") == "in_use":
        raise HTTPException(status_code=400, detail="Eurobox ist in Verwendung und kann nicht gelöscht werden")
    
    db.euroboxes.delete_one({"id": eurobox_id})
    
    return {
        "success": True,
        "message": "Eurobox gelöscht"
    }

@router.get("/assignments")
async def get_eurobox_assignments(token_data: dict = Depends(verify_token_optional)):
    """Get all eurobox-order assignments"""
    # Get all orders with eurobox assignments
    orders = list(db.orders.find(
        {"eurobox_number": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ))
    
    # Get all euroboxes
    euroboxes = list(db.euroboxes.find({}, {"_id": 0}))
    
    # Create assignment map
    assignments = []
    for order in orders:
        assignments.append({
            "order_number": order.get("order_number"),
            "order_id": order.get("id"),
            "eurobox_number": order.get("eurobox_number"),
            "fulfillment_status": order.get("fulfillment_status"),
            "customer_company": order.get("customer_company"),
            "location_name": order.get("location_name"),
            "picked_at": order.get("picked_at"),
            "shipped_at": order.get("shipped_at")
        })
    
    return {
        "success": True,
        "assignments": assignments,
        "euroboxes": euroboxes
    }

@router.get("/by-number/{eurobox_number}")
async def get_eurobox_by_number(eurobox_number: str, token_data: dict = Depends(verify_token_optional)):
    """Get eurobox details and current assignment by eurobox number"""
    eurobox = db.euroboxes.find_one({"eurobox_number": eurobox_number}, {"_id": 0})
    
    # Find order with this eurobox
    order = db.orders.find_one(
        {"eurobox_number": eurobox_number, "fulfillment_status": {"$ne": "shipped"}},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "eurobox": eurobox,
        "current_order": order
    }

@router.post("/assign-to-order")
async def assign_eurobox_to_order(
    eurobox_number: str,
    order_id: str,
    token_data: dict = Depends(verify_token_optional)
):
    """Assign a Eurobox to an order (1 order = 1 Eurobox)"""
    # Check if eurobox exists
    eurobox = db.euroboxes.find_one({"eurobox_number": eurobox_number})
    if not eurobox:
        raise HTTPException(status_code=404, detail="Eurobox nicht gefunden")
    
    # Check if order exists
    order = db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    # Check if order already has a eurobox
    if order.get("eurobox_number"):
        raise HTTPException(
            status_code=400,
            detail=f"Bestellung ist bereits der Eurobox {order.get('eurobox_number')} zugewiesen"
        )
    
    # Check if eurobox is already in use with another order
    existing_order = db.orders.find_one({
        "eurobox_number": eurobox_number,
        "fulfillment_status": {"$nin": ["shipped", "cancelled"]}
    })
    if existing_order and existing_order.get("id") != order_id:
        raise HTTPException(
            status_code=400,
            detail=f"Eurobox ist bereits der Bestellung {existing_order.get('order_number')} zugewiesen"
        )
    
    # Assign eurobox to order
    db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "eurobox_number": eurobox_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update eurobox status
    db.euroboxes.update_one(
        {"eurobox_number": eurobox_number},
        {"$set": {
            "status": "in_use",
            "current_order_id": order_id,
            "current_order_number": order.get("order_number"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Eurobox {eurobox_number} wurde der Bestellung {order.get('order_number')} zugewiesen"
    }

@router.post("/unassign-from-order")
async def unassign_eurobox_from_order(
    order_id: str,
    token_data: dict = Depends(verify_token_optional)
):
    """Unassign Eurobox from an order"""
    order = db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    eurobox_number = order.get("eurobox_number")
    if not eurobox_number:
        raise HTTPException(status_code=400, detail="Bestellung hat keine zugewiesene Eurobox")
    
    # Remove eurobox from order
    db.orders.update_one(
        {"id": order_id},
        {"$unset": {"eurobox_number": ""},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update eurobox status to available
    db.euroboxes.update_one(
        {"eurobox_number": eurobox_number},
        {"$set": {
            "status": "available",
            "current_order_id": None,
            "current_order_number": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Eurobox {eurobox_number} wurde von der Bestellung entfernt"
    }
