from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

def generate_order_number() -> str:
    """
    Generate order number in format: BE.YYYYMMDD.XXX
    Example: BE.20251105.001, BE.20251105.002
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime('%Y%m%d')
    prefix = f"BE.{date_str}"
    
    # Find the last order for today
    last_order = db.orders.find_one(
        {"order_number": {"$regex": f"^{prefix}"}},
        sort=[("order_number", -1)]
    )
    
    if last_order and "order_number" in last_order:
        # Extract the sequence number from the last order
        try:
            last_seq = int(last_order["order_number"].split(".")[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1
    
    # Format: BE.20251105.001
    return f"{prefix}.{new_seq:03d}"

class OrderItem(BaseModel):
    article_id: str
    article_name: str
    category: str
    quantity: int
    unit: str = "Stück"
    item_type: str = "inventory"  # inventory, component, template
    template_id: Optional[str] = None  # For component set orders
    reserved_components: Optional[List[dict]] = []  # List of {component_id, quantity, reserved}
    backorder_components: Optional[List[dict]] = []  # List of missing components

class CreateOrder(BaseModel):
    location_code: str
    location_name: str
    items: List[OrderItem]
    notes: Optional[str] = ""
    auto_fulfill: bool = True  # Auto-fulfill when components available

class UpdateOrderStatus(BaseModel):
    status: str  # pending, processing, shipped, delivered, cancelled
    admin_notes: Optional[str] = ""

@router.get("/list")
async def get_orders(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    location_code: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get orders with optional filtering
    Admin sees all orders, customers see only their orders
    """
    try:
        is_admin = token_data.get("role") == "admin"
        user_email = token_data.get("sub")
        
        # Build query
        query = {}
        
        # Customers can only see their own orders
        if not is_admin:
            query['customer_email'] = user_email
        elif customer_email:
            # Admin can filter by customer
            query['customer_email'] = customer_email
        
        if status:
            query['status'] = status
        
        if location_code:
            query['location_code'] = location_code
        
        # Get orders sorted by date (newest first)
        orders_cursor = db.orders.find(query).sort('order_date', -1)
        orders = []
        
        for order in orders_cursor:
            # Remove MongoDB _id
            if '_id' in order:
                del order['_id']
            
            orders.append(order)
        
        # Calculate summary statistics
        total_orders = len(orders)
        pending_count = sum(1 for o in orders if o.get('status') == 'pending')
        processing_count = sum(1 for o in orders if o.get('status') == 'processing')
        shipped_count = sum(1 for o in orders if o.get('status') == 'shipped')
        delivered_count = sum(1 for o in orders if o.get('status') == 'delivered')
        
        return {
            "success": True,
            "orders": orders,
            "summary": {
                "total": total_orders,
                "pending": pending_count,
                "processing": processing_count,
                "shipped": shipped_count,
                "delivered": delivered_count
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get orders error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{order_id}")
async def get_order(
    order_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get specific order by ID
    Admin sees all orders, customers only their own
    """
    try:
        is_admin = token_data.get("role") == "admin"
        user_email = token_data.get("sub")
        
        order = db.orders.find_one({"id": order_id})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check access rights
        if not is_admin and order.get('customer_email') != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Remove MongoDB _id
        if '_id' in order:
            del order['_id']
        
        return {
            "success": True,
            "order": order
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get order error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_order(
    order: CreateOrder,
    token_data: dict = Depends(verify_token)
):
    """
    Create new order
    Customer must have shop access enabled
    """
    try:
        user_email = token_data.get("sub")
        is_admin = token_data.get("role") == "admin"
        
        # Get user info
        user = db.portal_users.find_one({"email": user_email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has shop access (unless admin)
        if not is_admin and not user.get('shop_enabled', False):
            raise HTTPException(status_code=403, detail="Shop access not enabled for this customer")
        
        # Validate items and check stock availability
        insufficient_stock = []
        items_with_details = []
        
        for item in order.items:
            # Get inventory item
            inventory_item = db.inventory.find_one({"id": item.article_id})
            
            if not inventory_item:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Article {item.article_name} not found in inventory"
                )
            
            # Check if enough stock
            available_stock = inventory_item.get('quantity_in_stock', 0)
            if available_stock < item.quantity:
                insufficient_stock.append({
                    "article": item.article_name,
                    "requested": item.quantity,
                    "available": available_stock
                })
            
            # Add item with full details
            items_with_details.append({
                "article_id": item.article_id,
                "article_name": item.article_name,
                "category": item.category,
                "quantity": item.quantity,
                "unit": item.unit,
                "barcode": inventory_item.get('barcode')
            })
        
        # If insufficient stock, return error
        if insufficient_stock:
            return {
                "success": False,
                "error": "insufficient_stock",
                "message": "Nicht genügend Bestand verfügbar",
                "insufficient_items": insufficient_stock
            }
        
        # Generate order number
        order_number = generate_order_number()
        
        # Get full location details from europcar_stations collection
        location = db.europcar_stations.find_one({"main_code": order.location_code})
        
        shipping_address = {}
        if location:
            shipping_address = {
                "company": user.get('company', ''),
                "location_code": location.get('main_code', ''),
                "street": location.get('str', ''),
                "postal_code": location.get('plz', ''),
                "city": location.get('ort', ''),
                "country": location.get('land', 'Deutschland')
            }
        
        # Create order document
        order_doc = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "customer_email": user_email,
            "customer_name": user.get('name'),
            "customer_company": user.get('company'),
            "location_code": order.location_code,
            "location_name": order.location_name,
            "shipping_address": shipping_address,
            "items": items_with_details,
            "status": "pending",
            "notes": order.notes,
            "admin_notes": "",
            "order_date": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status_history": [
                {
                    "status": "pending",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "user": user_email
                }
            ]
        }
        
        # Insert order
        db.orders.insert_one(order_doc)
        
        # Reduce stock quantities automatically
        for item in order.items:
            db.inventory.update_one(
                {"id": item.article_id},
                {"$inc": {"quantity_in_stock": -item.quantity}}
            )
        
        # Remove MongoDB _id
        if '_id' in order_doc:
            del order_doc['_id']
        
        return {
            "success": True,
            "message": "Bestellung erfolgreich erstellt",
            "order": order_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create order error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: UpdateOrderStatus,
    token_data: dict = Depends(verify_token)
):
    """
    Update order status
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        
        # Valid statuses
        valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        if status_update.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        # Get order
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        old_status = order.get('status')
        
        # Add status to history
        status_history = order.get('status_history', [])
        status_history.append({
            "status": status_update.status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": user_email,
            "notes": status_update.admin_notes
        })
        
        # Update order
        update_doc = {
            "status": status_update.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status_history": status_history
        }
        
        if status_update.admin_notes:
            update_doc['admin_notes'] = status_update.admin_notes
        
        db.orders.update_one(
            {"id": order_id},
            {"$set": update_doc}
        )
        
        # If order is cancelled, restore stock
        if status_update.status == "cancelled" and old_status != "cancelled":
            for item in order.get('items', []):
                db.inventory.update_one(
                    {"id": item['article_id']},
                    {"$inc": {"quantity_in_stock": item['quantity']}}
                )
        
        # Get updated order
        updated_order = db.orders.find_one({"id": order_id})
        if '_id' in updated_order:
            del updated_order['_id']
        
        return {
            "success": True,
            "message": "Bestellstatus aktualisiert",
            "order": updated_order
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update order status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete order (admin only)
    Note: Stock is not restored automatically, must be done manually if needed
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if order exists
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Delete order
        db.orders.delete_one({"id": order_id})
        
        return {
            "success": True,
            "message": "Bestellung gelöscht"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete order error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics/summary")
async def get_order_statistics(token_data: dict = Depends(verify_token)):
    """
    Get order statistics
    Admin only
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all orders
        all_orders = list(db.orders.find())
        
        total_orders = len(all_orders)
        pending = sum(1 for o in all_orders if o.get('status') == 'pending')
        processing = sum(1 for o in all_orders if o.get('status') == 'processing')
        shipped = sum(1 for o in all_orders if o.get('status') == 'shipped')
        delivered = sum(1 for o in all_orders if o.get('status') == 'delivered')
        cancelled = sum(1 for o in all_orders if o.get('status') == 'cancelled')
        
        # Count NEW orders: status is 'pending' or 'Offen' AND fulfillment NOT started
        new_orders = sum(1 for o in all_orders 
                        if (o.get('status', '').lower() in ['pending', 'offen']) 
                        and not o.get('fulfillment_status'))
        
        # Get most ordered items
        item_counts = {}
        for order in all_orders:
            for item in order.get('items', []):
                article_name = item.get('article_name')
                if article_name in item_counts:
                    item_counts[article_name] += item.get('quantity', 0)
                else:
                    item_counts[article_name] = item.get('quantity', 0)
        
        # Sort by count
        top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "success": True,
            "statistics": {
                "total_orders": total_orders,
                "pending": pending,
                "processing": processing,
                "shipped": shipped,
                "delivered": delivered,
                "cancelled": cancelled,
                "new_orders": new_orders,
                "top_ordered_items": [{"name": name, "total_quantity": count} for name, count in top_items]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Order statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Component Set Orders with Reservation ====================

class ComponentSetOrderItem(BaseModel):
    item_type: str  # "template" or "component"
    item_id: str  # template_id or component_id
    item_name: str
    quantity: int

class CreateComponentSetOrder(BaseModel):
    location_code: str
    location_name: str
    items: List[ComponentSetOrderItem]
    notes: Optional[str] = ""
    auto_fulfill: bool = True

@router.post("/create-with-reservation")
async def create_order_with_reservation(
    order: CreateComponentSetOrder,
    token_data: dict = Depends(verify_token)
):
    """
    Create order for component sets with reservation system
    - Reserves available components immediately
    - Creates backorder for missing components
    - Auto-fulfills when components become available (if enabled)
    """
    try:
        user_email = token_data.get("sub")
        is_admin = token_data.get("role") == "admin"
        
        # Get user info
        user = db.portal_users.find_one({"email": user_email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check shop access
        if not is_admin and not user.get('shop_enabled', False):
            raise HTTPException(status_code=403, detail="Shop access not enabled")
        
        # Process each item and check availability
        order_items = []
        has_backorder = False
        all_components_available = True
        
        for item in order.items:
            if item.item_type == "template":
                # Process template order
                template = db.component_templates.find_one({"id": item.item_id})
                if not template:
                    raise HTTPException(status_code=404, detail=f"Template {item.item_name} not found")
                
                # Check each component in template
                reserved_components = []
                backorder_components = []
                
                for comp_ref in template.get('components', []):
                    component = db.components.find_one({"id": comp_ref.get('component_id')})
                    if not component:
                        continue
                    
                    required_qty = comp_ref.get('quantity', 1) * item.quantity
                    available_qty = component.get('quantity_in_stock', 0)
                    
                    if available_qty >= required_qty:
                        # Reserve full amount
                        reserved_components.append({
                            "component_id": component.get('id'),
                            "component_name": component.get('name'),
                            "quantity": required_qty,
                            "reserved": True
                        })
                        
                        # Update stock (reduce by reserved amount)
                        db.components.update_one(
                            {"id": component.get('id')},
                            {
                                "$set": {
                                    "quantity_in_stock": available_qty - required_qty,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    else:
                        # Partial reservation
                        has_backorder = True
                        all_components_available = False
                        shortage = required_qty - available_qty
                        
                        if available_qty > 0:
                            # Reserve what's available
                            reserved_components.append({
                                "component_id": component.get('id'),
                                "component_name": component.get('name'),
                                "quantity": available_qty,
                                "reserved": True
                            })
                            
                            # Update stock to 0
                            db.components.update_one(
                                {"id": component.get('id')},
                                {
                                    "$set": {
                                        "quantity_in_stock": 0,
                                        "updated_at": datetime.now(timezone.utc).isoformat()
                                    }
                                }
                            )
                        
                        # Add to backorder
                        backorder_components.append({
                            "component_id": component.get('id'),
                            "component_name": component.get('name'),
                            "quantity_needed": shortage,
                            "reserved": False
                        })
                
                # Generate Set-ID with location code
                from routes.components import generate_set_id
                set_id = generate_set_id(order.location_code)
                
                order_items.append({
                    "item_type": "template",
                    "template_id": item.item_id,
                    "template_name": item.item_name,
                    "quantity": item.quantity,
                    "set_id": set_id,  # Add generated Set-ID
                    "reserved_components": reserved_components,
                    "backorder_components": backorder_components
                })
            
            elif item.item_type == "component":
                # Process individual component order
                component = db.components.find_one({"id": item.item_id})
                if not component:
                    raise HTTPException(status_code=404, detail=f"Component {item.item_name} not found")
                
                available_qty = component.get('quantity_in_stock', 0)
                
                if available_qty >= item.quantity:
                    # Reserve full amount
                    order_items.append({
                        "item_type": "component",
                        "component_id": item.item_id,
                        "component_name": item.item_name,
                        "quantity": item.quantity,
                        "reserved": True,
                        "backorder": False
                    })
                    
                    # Update stock
                    db.components.update_one(
                        {"id": item.item_id},
                        {
                            "$set": {
                                "quantity_in_stock": available_qty - item.quantity,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                else:
                    # Partial or no reservation
                    has_backorder = True
                    all_components_available = False
                    
                    reserved_qty = available_qty
                    shortage = item.quantity - available_qty
                    
                    order_items.append({
                        "item_type": "component",
                        "component_id": item.item_id,
                        "component_name": item.item_name,
                        "quantity": item.quantity,
                        "reserved_quantity": reserved_qty,
                        "backorder_quantity": shortage,
                        "reserved": reserved_qty > 0,
                        "backorder": True
                    })
                    
                    if reserved_qty > 0:
                        # Update stock to 0
                        db.components.update_one(
                            {"id": item.item_id},
                            {
                                "$set": {
                                    "quantity_in_stock": 0,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
        
        # Determine order status
        if all_components_available:
            order_status = "reserved"  # All components reserved, ready to process
        else:
            order_status = "backorder"  # Some components missing
        
        # Generate order number
        order_number = generate_order_number()
        
        # Get location details
        location = db.europcar_stations.find_one({"main_code": order.location_code})
        
        shipping_address = {}
        if location:
            shipping_address = {
                "company": user.get('company', ''),
                "location_code": location.get('main_code', ''),
                "street": location.get('str', ''),
                "postal_code": location.get('plz', ''),
                "city": location.get('ort', ''),
                "country": location.get('land', 'Deutschland')
            }
        
        # Create order document
        order_doc = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "order_type": "component_set",  # New order type
            "customer_email": user_email,
            "customer_name": user.get('name', ''),
            "customer_company": user.get('company', ''),
            "location_code": order.location_code,
            "location_name": order.location_name,
            "shipping_address": shipping_address,
            "items": order_items,
            "status": order_status,
            "fulfillment_status": "reserved" if all_components_available else "backorder",  # Initial fulfillment status
            "auto_fulfill": order.auto_fulfill,
            "has_backorder": has_backorder,
            "notes": order.notes,
            "order_date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user_email
        }
        
        # Insert order
        db.orders.insert_one(order_doc)
        
        # Remove MongoDB _id
        if '_id' in order_doc:
            del order_doc['_id']
        
        return {
            "success": True,
            "order_number": order_number,
            "order_id": order_doc['id'],
            "status": order_status,
            "has_backorder": has_backorder,
            "message": "Bestellung erfolgreich aufgegeben" if all_components_available else "Bestellung aufgegeben. Einige Komponenten sind im Rückstand.",
            "order": order_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Order creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{order_id}/check-fulfillment")
async def check_order_fulfillment(
    order_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Check if a backorder can now be fulfilled
    Called after goods receipt or manually by admin
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get order
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.get('status') not in ['backorder', 'reserved']:
            return {
                "success": True,
                "can_fulfill": False,
                "message": f"Order status is {order.get('status')}, not eligible for fulfillment check"
            }
        
        # Check if all backorder items are now available
        can_fulfill = True
        updated_items = []
        
        for item in order.get('items', []):
            if item.get('item_type') == 'template':
                # Check backorder components
                backorder_comps = item.get('backorder_components', [])
                still_backordered = []
                newly_reserved = []
                
                for bo_comp in backorder_comps:
                    component = db.components.find_one({"id": bo_comp.get('component_id')})
                    if component:
                        available = component.get('quantity_in_stock', 0)
                        needed = bo_comp.get('quantity_needed', 0)
                        
                        if available >= needed:
                            # Can now reserve this component
                            newly_reserved.append(bo_comp)
                            
                            # Update stock
                            db.components.update_one(
                                {"id": bo_comp.get('component_id')},
                                {
                                    "$set": {
                                        "quantity_in_stock": available - needed,
                                        "updated_at": datetime.now(timezone.utc).isoformat()
                                    }
                                }
                            )
                        else:
                            still_backordered.append(bo_comp)
                            can_fulfill = False
                
                # Update item with new reservation status
                if newly_reserved:
                    item['reserved_components'].extend([
                        {**comp, "reserved": True, "newly_reserved": True}
                        for comp in newly_reserved
                    ])
                    item['backorder_components'] = still_backordered
                
                updated_items.append(item)
            
            elif item.get('item_type') == 'component' and item.get('backorder'):
                component = db.components.find_one({"id": item.get('component_id')})
                if component:
                    available = component.get('quantity_in_stock', 0)
                    needed = item.get('backorder_quantity', 0)
                    
                    if available >= needed:
                        # Can now reserve
                        item['reserved_quantity'] = item.get('quantity')
                        item['backorder_quantity'] = 0
                        item['backorder'] = False
                        item['reserved'] = True
                        
                        # Update stock
                        db.components.update_one(
                            {"id": item.get('component_id')},
                            {
                                "$set": {
                                    "quantity_in_stock": available - needed,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    else:
                        can_fulfill = False
                
                updated_items.append(item)
            else:
                updated_items.append(item)
        
        # Update order if status changed
        new_status = order.get('status')
        if can_fulfill and order.get('status') == 'backorder':
            new_status = 'in_progress' if order.get('auto_fulfill') else 'reserved'
        
        db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "items": updated_items,
                    "status": new_status,
                    "has_backorder": not can_fulfill,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "can_fulfill": can_fulfill,
            "new_status": new_status,
            "message": "Order can now be fulfilled" if can_fulfill else "Some components still on backorder"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Fulfillment check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

