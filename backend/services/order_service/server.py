from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Order Service",
    description="Microservice for order management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'order_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class OrderItem(BaseModel):
    """Order item model"""
    item_id: str
    item_name: str
    quantity: int
    unit_price: float
    total_price: float


class Order(BaseModel):
    """Order model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    tenant_id: Optional[str] = None  # Tenant association
    customer_email: str
    customer_name: Optional[str] = None
    location_code: Optional[str] = None
    items: List[OrderItem] = []
    subtotal: float = 0.0
    tax: float = 0.0
    shipping_cost: float = 0.0
    total_amount: float = 0.0
    status: str = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    payment_status: str = "unpaid"  # unpaid, paid, refunded
    shipping_address: Optional[Dict[str, str]] = {}
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderCreate(BaseModel):
    """Create order model"""
    tenant_id: Optional[str] = None  # Tenant association
    customer_email: str
    customer_name: Optional[str] = None
    location_code: Optional[str] = None
    items: List[OrderItem]
    subtotal: float
    tax: float = 0.0
    shipping_cost: float = 0.0
    total_amount: float
    shipping_address: Optional[Dict[str, str]] = {}
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}


class OrderUpdate(BaseModel):
    """Update order model"""
    status: Optional[str] = None
    payment_status: Optional[str] = None
    shipping_address: Optional[Dict[str, str]] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Order Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "Order Service",
        "version": "1.0.0",
        "description": "Microservice for order management",
        "endpoints": [
            "/health",
            "/info",
            "/api/orders",
            "/api/orders/{order_id}",
            "/api/orders/number/{order_number}",
            "/api/orders/customer/{customer_email}",
            "/api/orders/stats"
        ]
    }


# Order Routes - Specific routes first
@app.get("/api/orders/stats")
async def get_order_stats(tenant_id: Optional[str] = None):
    """Get order statistics"""
    try:
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
            
        total = await db.orders.count_documents(query)
        pending = await db.orders.count_documents({**query, "status": "pending"})
        confirmed = await db.orders.count_documents({"status": "confirmed"})
        processing = await db.orders.count_documents({"status": "processing"})
        shipped = await db.orders.count_documents({"status": "shipped"})
        delivered = await db.orders.count_documents({"status": "delivered"})
        cancelled = await db.orders.count_documents({"status": "cancelled"})
        
        # Payment status
        paid = await db.orders.count_documents({"payment_status": "paid"})
        unpaid = await db.orders.count_documents({"payment_status": "unpaid"})
        
        # Calculate total revenue (paid orders only)
        pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await db.orders.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]['total_revenue'] if revenue_result else 0.0
        
        return {
            "total": total,
            "by_status": {
                "pending": pending,
                "confirmed": confirmed,
                "processing": processing,
                "shipped": shipped,
                "delivered": delivered,
                "cancelled": cancelled
            },
            "by_payment_status": {
                "paid": paid,
                "unpaid": unpaid
            },
            "total_revenue": total_revenue
        }
    except Exception as e:
        logger.error(f"Error getting order stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/number/{order_number}", response_model=Order)
async def get_order_by_number(order_number: str):
    """Get a specific order by order number"""
    try:
        order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Parse datetime strings
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        
        return Order(**order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order by number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/customer/{customer_email}", response_model=List[Order])
async def get_orders_by_customer(customer_email: str):
    """Get all orders for a specific customer"""
    try:
        orders = await db.orders.find({"customer_email": customer_email}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        # Parse datetime strings
        for order in orders:
            if isinstance(order.get('created_at'), str):
                order['created_at'] = datetime.fromisoformat(order['created_at'])
            if isinstance(order.get('updated_at'), str):
                order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        
        return [Order(**order) for order in orders]
    except Exception as e:
        logger.error(f"Error getting orders by customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders", response_model=List[Order])
async def get_orders(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get all orders with optional filters"""
    try:
        query = {}
        if status:
            query['status'] = status
        if payment_status:
            query['payment_status'] = payment_status
        if customer_email:
            query['customer_email'] = customer_email
        
        orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Parse datetime strings
        for order in orders:
            if isinstance(order.get('created_at'), str):
                order['created_at'] = datetime.fromisoformat(order['created_at'])
            if isinstance(order.get('updated_at'), str):
                order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        
        return [Order(**order) for order in orders]
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orders", response_model=Order, status_code=201)
async def create_order(order: OrderCreate):
    """Create a new order"""
    try:
        # Generate order number (format: ORD-YYYYMMDD-XXXX)
        today = datetime.now(timezone.utc).strftime('%Y%m%d')
        
        # Find highest order number for today
        prefix = f"ORD-{today}-"
        pipeline = [
            {"$match": {"order_number": {"$regex": f"^{prefix}"}}},
            {"$project": {"order_number": 1}},
            {"$sort": {"order_number": -1}},
            {"$limit": 1}
        ]
        last_order = await db.orders.aggregate(pipeline).to_list(1)
        
        if last_order:
            last_num = int(last_order[0]['order_number'].split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        order_number = f"{prefix}{new_num:04d}"
        
        new_order = Order(**order.model_dump(), order_number=order_number)
        doc = new_order.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.orders.insert_one(doc)
        logger.info(f"Created order: {order_number}")
        
        return new_order
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get a specific order by ID"""
    try:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Parse datetime strings
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        
        return Order(**order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_update: OrderUpdate):
    """Update an order"""
    try:
        # Check if order exists
        existing = await db.orders.find_one({"id": order_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Prepare update data
        update_data = order_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        
        # Fetch updated order
        updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        
        logger.info(f"Updated order: {order_id}")
        return Order(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order"""
    try:
        result = await db.orders.delete_one({"id": order_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        logger.info(f"Deleted order: {order_id}")
        return {"success": True, "message": "Order deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8106))
    uvicorn.run(app, host="0.0.0.0", port=port)