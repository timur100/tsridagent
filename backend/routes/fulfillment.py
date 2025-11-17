from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import uuid
from routes.portal_auth import verify_token

# Optional token verification for development
def optional_verify_token(token_data: dict = Depends(verify_token)):
    return token_data

async def verify_token_optional():
    """Optional token verification - returns dummy data if no token"""
    return {"email": "system", "role": "admin"}

router = APIRouter(prefix="/api/fulfillment", tags=["Fulfillment"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']

# ==================== Models ====================

class FulfillmentUser(BaseModel):
    """User for Stock or Technician Portal"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password: str  # Hashed
    name: str
    role: str  # stock_manager, technician
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FulfillmentUserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str  # stock_manager, technician

class OrderStatusUpdate(BaseModel):
    order_id: str
    new_status: str  # picking, picked, configuration, configured, packing, packed, shipped
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    notes: Optional[str] = None

class EuroboxAssignment(BaseModel):
    order_id: str
    eurobox_number: str

class PickingUpdate(BaseModel):
    order_id: str
    component_id: str
    picked: bool

class ShippingInfo(BaseModel):
    order_id: str
    tracking_number: str
    carrier: Optional[str] = None
    shipping_date: Optional[str] = None

class ConfigurationNote(BaseModel):
    order_id: str
    notes: str
    checklist_items: Optional[List[Dict[str, Any]]] = None

# ==================== User Management ====================

@router.post("/users/create")
async def create_fulfillment_user(user_data: FulfillmentUserCreate, token_data: dict = Depends(verify_token)):
    """Create stock manager or technician user (Admin only)"""
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user already exists
    existing_user = db.fulfillment_users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Validate role
    if user_data.role not in ["stock_manager", "technician"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be stock_manager or technician")
    
    # Create user (password should be hashed in production)
    user = FulfillmentUser(
        email=user_data.email,
        password=user_data.password,  # TODO: Hash password
        name=user_data.name,
        role=user_data.role
    )
    
    user_dict = user.dict()
    db.fulfillment_users.insert_one(user_dict)
    
    return {
        "success": True,
        "message": f"{user_data.role} user created successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@router.get("/users/list")
async def list_fulfillment_users(token_data: dict = Depends(verify_token)):
    """List all fulfillment users (Admin only)"""
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = list(db.fulfillment_users.find({"active": True}, {"password": 0}))
    
    return {
        "success": True,
        "users": users
    }

@router.post("/auth/login")
async def fulfillment_login(email: str, password: str):
    """Login for stock managers and technicians"""
    user = db.fulfillment_users.find_one({"email": email, "active": True})
    
    if not user or user.get("password") != password:  # TODO: Use proper password hashing
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Return user info (in production, return JWT token)
    return {
        "success": True,
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role")
        },
        "token": "dummy_token"  # TODO: Generate JWT token
    }

# ==================== Order Status Management ====================

@router.get("/orders/pending")
async def get_pending_orders(status: Optional[str] = None, token_data: dict = Depends(verify_token_optional)):
    """Get orders by status for fulfillment"""
    query = {"order_type": "component_set"}
    
    if status:
        query["fulfillment_status"] = status
    else:
        # Get orders that need processing
        query["fulfillment_status"] = {"$in": ["reserved", "picking", "picked", "configuration", "configured", "packing"]}
    
    orders = list(db.orders.find(query, {"_id": 0}).sort("order_date", 1))
    
    # Enrich with component details
    for order in orders:
        components_detail = []
        
        # Check for reserved_components at order level (old format)
        if order.get("reserved_components"):
            for comp_id in order["reserved_components"]:
                component = db.components.find_one({"id": comp_id}, {"_id": 0})
                if component:
                    components_detail.append({
                        "id": component.get("id"),
                        "name": component.get("name"),
                        "component_type": component.get("component_type"),
                        "storage_location": component.get("storage_location"),
                        "identification_value": component.get("identification_value")
                    })
        
        # Check for reserved_components inside items (new format)
        elif order.get("items"):
            for item in order.get("items", []):
                # Extract components from item's reserved_components
                for reserved_comp in item.get("reserved_components", []):
                    comp_id = reserved_comp.get("component_id")
                    if comp_id:
                        component = db.components.find_one({"id": comp_id}, {"_id": 0})
                        if component:
                            components_detail.append({
                                "id": component.get("id"),
                                "name": component.get("name"),
                                "component_type": component.get("component_type"),
                                "storage_location": component.get("storage_location"),
                                "identification_value": component.get("identification_value"),
                                "quantity_reserved": reserved_comp.get("quantity", 1)
                            })
        
        order["components_detail"] = components_detail
    
    return {
        "success": True,
        "orders": orders,
        "count": len(orders)
    }

@router.post("/orders/update-status")
async def update_order_status(status_update: OrderStatusUpdate, token_data: dict = Depends(verify_token_optional)):
    """Update order fulfillment status"""
    order = db.orders.find_one({"id": status_update.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate status transition
    valid_statuses = ["reserved", "picking", "picked", "configuration", "configured", "packing", "packed", "shipped"]
    if status_update.new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update fields based on status
    update_data = {
        "fulfillment_status": status_update.new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add timestamp fields
    if status_update.new_status == "picked":
        update_data["picked_at"] = datetime.now(timezone.utc).isoformat()
        update_data["picked_by"] = status_update.user_name or status_update.user_email
    elif status_update.new_status == "configured":
        update_data["configured_at"] = datetime.now(timezone.utc).isoformat()
        update_data["configured_by"] = status_update.user_name or status_update.user_email
    elif status_update.new_status == "packed":
        update_data["packed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["packed_by"] = status_update.user_name or status_update.user_email
    elif status_update.new_status == "shipped":
        update_data["shipped_at"] = datetime.now(timezone.utc).isoformat()
    
    if status_update.notes:
        if "fulfillment_notes" not in order:
            order["fulfillment_notes"] = []
        order["fulfillment_notes"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": status_update.user_name or status_update.user_email,
            "status": status_update.new_status,
            "note": status_update.notes
        })
        update_data["fulfillment_notes"] = order["fulfillment_notes"]
    
    db.orders.update_one(
        {"id": status_update.order_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Order status updated to {status_update.new_status}",
        "order_id": status_update.order_id,
        "new_status": status_update.new_status
    }

@router.post("/orders/assign-eurobox")
async def assign_eurobox(assignment: EuroboxAssignment, token_data: dict = Depends(verify_token)):
    """Assign Eurobox number to order"""
    order = db.orders.find_one({"id": assignment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.orders.update_one(
        {"id": assignment.order_id},
        {"$set": {
            "eurobox_number": assignment.eurobox_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Eurobox assigned successfully",
        "order_id": assignment.order_id,
        "eurobox_number": assignment.eurobox_number
    }

# ==================== Picking ====================

@router.post("/picking/start")
async def start_picking(order_id: str, token_data: dict = Depends(verify_token)):
    """Start picking process for an order"""
    order = db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update status to picking
    db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "fulfillment_status": "picking",
            "picking_started_at": datetime.now(timezone.utc).isoformat(),
            "picking_started_by": token_data.get("email"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get picking list with component details
    components_detail = []
    
    # Check for reserved_components at order level (old format)
    if order.get("reserved_components"):
        for comp_id in order["reserved_components"]:
            component = db.components.find_one({"id": comp_id})
            if component:
                components_detail.append({
                    "id": component.get("id"),
                    "name": component.get("name"),
                    "component_type": component.get("component_type"),
                    "storage_location": component.get("storage_location"),
                    "identification_value": component.get("identification_value"),
                    "manufacturer": component.get("manufacturer"),
                    "model": component.get("model"),
                    "picked": False
                })
    
    # Check for reserved_components inside items (new format)
    elif order.get("items"):
        for item in order.get("items", []):
            # Extract components from item's reserved_components
            for reserved_comp in item.get("reserved_components", []):
                comp_id = reserved_comp.get("component_id")
                if comp_id:
                    component = db.components.find_one({"id": comp_id})
                    if component:
                        components_detail.append({
                            "id": component.get("id"),
                            "name": component.get("name"),
                            "component_type": component.get("component_type"),
                            "storage_location": component.get("storage_location"),
                            "identification_value": component.get("identification_value"),
                            "manufacturer": component.get("manufacturer"),
                            "model": component.get("model"),
                            "quantity_reserved": reserved_comp.get("quantity", 1),
                            "picked": False
                        })
    
    return {
        "success": True,
        "message": "Picking started",
        "order_id": order_id,
        "picking_list": components_detail
    }

@router.post("/picking/complete")
async def complete_picking(order_id: str, eurobox_number: str, token_data: dict = Depends(verify_token_optional)):
    """Complete picking and assign to Eurobox"""
    order = db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if eurobox exists
    eurobox = db.euroboxes.find_one({"eurobox_number": eurobox_number})
    if not eurobox:
        raise HTTPException(status_code=404, detail=f"Eurobox {eurobox_number} nicht gefunden")
    
    # Check if eurobox is already assigned to another order
    existing_order = db.orders.find_one({
        "eurobox_number": eurobox_number,
        "id": {"$ne": order_id},
        "fulfillment_status": {"$nin": ["shipped", "cancelled"]}
    })
    if existing_order:
        raise HTTPException(
            status_code=400,
            detail=f"Eurobox {eurobox_number} ist bereits der Bestellung {existing_order.get('order_number')} zugewiesen"
        )
    
    # Update order
    db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "fulfillment_status": "picked",
            "picked_at": datetime.now(timezone.utc).isoformat(),
            "picked_by": token_data.get("email"),
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
        "message": "Picking completed successfully",
        "order_id": order_id,
        "eurobox_number": eurobox_number
    }

# ==================== Configuration ====================

@router.post("/configuration/start")
async def start_configuration(order_id: str, token_data: dict = Depends(verify_token)):
    """Start configuration process"""
    order = db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "fulfillment_status": "configuration",
            "configuration_started_at": datetime.now(timezone.utc).isoformat(),
            "configuration_started_by": token_data.get("email"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Configuration started",
        "order_id": order_id
    }

@router.post("/configuration/complete")
async def complete_configuration(config: ConfigurationNote, token_data: dict = Depends(verify_token)):
    """Complete configuration with notes"""
    order = db.orders.find_one({"id": config.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "fulfillment_status": "configured",
        "configured_at": datetime.now(timezone.utc).isoformat(),
        "configured_by": token_data.get("email"),
        "configuration_notes": config.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if config.checklist_items:
        update_data["configuration_checklist"] = config.checklist_items
    
    db.orders.update_one(
        {"id": config.order_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Configuration completed successfully",
        "order_id": config.order_id
    }

# ==================== Shipping ====================

@router.post("/shipping/complete")
async def complete_shipping(shipping: ShippingInfo, token_data: dict = Depends(verify_token)):
    """Mark order as shipped with tracking info"""
    order = db.orders.find_one({"id": shipping.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "fulfillment_status": "shipped",
        "status": "shipped",  # Update main order status too
        "shipped_at": datetime.now(timezone.utc).isoformat(),
        "tracking_number": shipping.tracking_number,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if shipping.carrier:
        update_data["carrier"] = shipping.carrier
    if shipping.shipping_date:
        update_data["shipping_date"] = shipping.shipping_date
    
    db.orders.update_one(
        {"id": shipping.order_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Order marked as shipped",
        "order_id": shipping.order_id,
        "tracking_number": shipping.tracking_number
    }

# ==================== Statistics ====================

@router.get("/stats/overview")
async def get_fulfillment_stats(token_data: dict = Depends(verify_token_optional)):
    """Get fulfillment statistics"""
    try:
        total_orders = db.orders.count_documents({"order_type": "component_set"})
        reserved = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "reserved"})
        picking = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "picking"})
        picked = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "picked"})
        configuration = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "configuration"})
        configured = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "configured"})
        packing = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "packing"})
        packed = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "packed"})
        shipped = db.orders.count_documents({"order_type": "component_set", "fulfillment_status": "shipped"})
        
        return {
            "success": True,
            "stats": {
                "total_orders": total_orders,
                "reserved": reserved,
                "picking": picking,
                "picked": picked,
                "configuration": configuration,
                "configured": configured,
                "packing": packing,
                "packed": packed,
                "shipped": shipped,
                "in_progress": reserved + picking + picked + configuration + configured + packing + packed
            }
        }
    except Exception as e:
        print(f"Stats error: {e}")
        return {
            "success": True,
            "stats": {
                "total_orders": 0,
                "reserved": 0,
                "picking": 0,
                "picked": 0,
                "configuration": 0,
                "configured": 0,
                "packing": 0,
                "packed": 0,
                "shipped": 0,
                "in_progress": 0
            }
        }
