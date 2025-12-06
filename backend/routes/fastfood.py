"""
Fastfood Ordering System API Routes
Multi-Tenant, Multi-Location Restaurant Ordering System
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from enum import Enum
import os
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/fastfood", tags=["Fastfood System"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['fastfood_db']


# ==================== ENUMS ====================

class OrderStatus(str, Enum):
    RECEIVED = "received"  # Eingegangen
    PREPARING = "preparing"  # In Zubereitung
    READY = "ready"  # Abholbereit
    COMPLETED = "completed"  # Abgeschlossen
    CANCELLED = "cancelled"  # Storniert


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE = "mobile"
    VOUCHER = "voucher"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class TerminalType(str, Enum):
    ORDER_KIOSK = "order_kiosk"  # Bestellterminal
    KITCHEN_DISPLAY = "kitchen_display"  # Küchendisplay
    CUSTOMER_DISPLAY = "customer_display"  # Kundendisplay
    ADMIN = "admin"  # Admin-Terminal


class OrderChannel(str, Enum):
    KIOSK = "kiosk"  # Kiosk-Bestellung
    DRIVE_IN = "drive_in"  # Drive-In
    PARKPLATZ = "parkplatz"  # Click & Collect Parkplatz
    MOBILE_APP = "mobile_app"  # Mobile App
    WEB = "web"  # Web-Bestellung
    COUNTER = "counter"  # Thekenbestellung



class DriverStatus(str, Enum):
    AVAILABLE = "available"  # Verfügbar
    BUSY = "busy"  # Beschäftigt (hat Bestellung)
    OFFLINE = "offline"  # Offline/Nicht verfügbar
    ON_BREAK = "on_break"  # Pause


class DeliveryStatus(str, Enum):
    PENDING = "pending"  # Ausstehend (noch nicht zugewiesen)
    ASSIGNED = "assigned"  # Fahrer zugewiesen
    PREPARING = "preparing"  # In Zubereitung
    READY = "ready"  # Bereit zur Abholung
    PICKED_UP = "picked_up"  # Vom Fahrer abgeholt
    ON_THE_WAY = "on_the_way"  # Unterwegs
    DELIVERED = "delivered"  # Zugestellt
    CANCELLED = "cancelled"  # Storniert

# ==================== PYDANTIC MODELS ====================

class CategoryModel(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    active: bool = True


class ProductModel(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    category_id: str
    price: float
    image_url: Optional[str] = None
    available: bool = True
    allergens: Optional[List[str]] = []
    nutritional_info: Optional[dict] = {}
    preparation_time: Optional[int] = 5  # minutes


class OrderItemModel(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    notes: Optional[str] = None


class CreateOrderModel(BaseModel):
    tenant_id: str
    location_id: str
    terminal_id: str
    items: List[OrderItemModel]
    payment_method: PaymentMethod
    language: str = "de"
    channel: OrderChannel = OrderChannel.KIOSK
    # Channel-specific fields
    drive_in_lane: Optional[str] = None  # Lane 1, Lane 2
    vehicle_number: Optional[str] = None  # Kennzeichen
    parking_spot: Optional[str] = None  # Parkplatz-Nr
    qr_code: Optional[str] = None  # QR-Code für Parkplatz


class StationModel(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: str = "#gray"
    display_order: int = 0
    active: bool = True
    category_ids: List[str] = []  # Welche Kategorien gehören zu dieser Station


class TerminalModel(BaseModel):
    location_id: str
    terminal_type: TerminalType
    name: str
    ip_address: Optional[str] = None
    printer_enabled: bool = False
    printer_ip: Optional[str] = None



# ==================== DELIVERY SERVICE MODELS ====================

class DeliveryZoneModel(BaseModel):
    name: str  # z.B. "Innenstadt", "Vorort Nord"
    description: Optional[str] = None
    center_lat: float  # Zentrum Breitengrad
    center_lng: float  # Zentrum Längengrad
    radius_km: float  # Lieferradius in km
    delivery_fee: float  # Liefergebühr in EUR
    min_order_value: float = 0.0  # Mindestbestellwert
    estimated_time_min: int = 30  # Geschätzte Lieferzeit in Minuten
    active: bool = True
    color: Optional[str] = "#3b82f6"  # Farbe für Karte


class DeliveryAddressModel(BaseModel):
    customer_name: str
    phone: str
    street: str
    house_number: str
    postal_code: str
    city: str
    additional_info: Optional[str] = None  # z.B. "Klingel: Müller", "2. Stock"
    lat: Optional[float] = None  # Für Entfernungsberechnung
    lng: Optional[float] = None


class DriverModel(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    vehicle_type: str  # Auto, Motorrad, Fahrrad
    vehicle_number: Optional[str] = None  # Kennzeichen
    status: DriverStatus = DriverStatus.OFFLINE
    active: bool = True


class DeliveryOrderModel(BaseModel):
    order_id: str  # Verknüpfung zur Hauptbestellung
    delivery_address: DeliveryAddressModel
    delivery_zone_id: Optional[str] = None
    driver_id: Optional[str] = None  # Zugewiesener Fahrer
    delivery_status: DeliveryStatus = DeliveryStatus.PENDING
    delivery_fee: float = 0.0
    estimated_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    customer_notes: Optional[str] = None
    driver_notes: Optional[str] = None


class TrackingUpdateModel(BaseModel):
    driver_lat: float
    driver_lng: float
    timestamp: Optional[datetime] = None


# ==================== CATEGORIES ====================

@router.post("/categories")
async def create_category(
    category: CategoryModel,
    tenant_id: str,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Create a new menu category"""
    try:
        category_doc = {
            'id': str(uuid4()),
            'tenant_id': tenant_id,
            'location_id': location_id,  # None = all locations
            **category.dict(),
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.categories.insert_one(category_doc)
        category_doc.pop('_id', None)
        
        return {'success': True, 'data': category_doc}
    except Exception as e:
        print(f"[Fastfood] Error creating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories(
    tenant_id: str,
    location_id: Optional[str] = None,
    active_only: bool = True,
    token_data: dict = Depends(verify_token)
):
    """Get all categories for a tenant/location"""
    try:
        query = {'tenant_id': tenant_id}
        
        # Categories can be global (location_id = None) or location-specific
        if location_id:
            query['$or'] = [
                {'location_id': location_id},
                {'location_id': None}
            ]
        
        if active_only:
            query['active'] = True
        
        categories = await db.categories.find(
            query,
            {'_id': 0}
        ).sort('display_order', 1).to_list(length=None)
        
        return {'success': True, 'data': categories}
    except Exception as e:
        print(f"[Fastfood] Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    category: CategoryModel,
    token_data: dict = Depends(verify_token)
):
    """Update a category"""
    try:
        result = await db.categories.update_one(
            {'id': category_id},
            {'$set': {
                **category.dict(),
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a category (soft delete)"""
    try:
        result = await db.categories.update_one(
            {'id': category_id},
            {'$set': {'active': False, 'updated_at': datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error deleting category: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRODUCTS ====================

@router.post("/products")
async def create_product(
    product: ProductModel,
    tenant_id: str,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Create a new product"""
    try:
        product_doc = {
            'id': str(uuid4()),
            'tenant_id': tenant_id,
            'location_id': location_id,
            **product.dict(),
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.products.insert_one(product_doc)
        product_doc.pop('_id', None)
        
        return {'success': True, 'data': product_doc}
    except Exception as e:
        print(f"[Fastfood] Error creating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products")
async def get_products(
    tenant_id: str,
    location_id: Optional[str] = None,
    category_id: Optional[str] = None,
    available_only: bool = True,
    token_data: dict = Depends(verify_token)
):
    """Get all products for a tenant/location"""
    try:
        query = {'tenant_id': tenant_id}
        
        if location_id:
            query['$or'] = [
                {'location_id': location_id},
                {'location_id': None}
            ]
        
        if category_id:
            query['category_id'] = category_id
        
        if available_only:
            query['available'] = True
        
        products = await db.products.find(
            query,
            {'_id': 0}
        ).to_list(length=None)
        
        return {'success': True, 'data': products}
    except Exception as e:
        print(f"[Fastfood] Error fetching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product: ProductModel,
    token_data: dict = Depends(verify_token)
):
    """Update a product"""
    try:
        result = await db.products.update_one(
            {'id': product_id},
            {'$set': {
                **product.dict(),
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a product (soft delete)"""
    try:
        result = await db.products.update_one(
            {'id': product_id},
            {'$set': {'available': False, 'updated_at': datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error deleting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ORDERS ====================

@router.post("/orders")
async def create_order(
    order: CreateOrderModel,
    token_data: dict = Depends(verify_token)
):
    """Create a new order"""
    try:
        # Generate order number (format: LOCATION-YYYYMMDD-###)
        today = datetime.now(timezone.utc)
        date_str = today.strftime('%Y%m%d')
        
        # Get today's order count for this location
        count = await db.orders.count_documents({
            'location_id': order.location_id,
            'created_at': {'$gte': today.replace(hour=0, minute=0, second=0, microsecond=0)}
        })
        
        order_number = f"{order.location_id[:4].upper()}-{date_str}-{count + 1:03d}"
        
        # Calculate total
        total = sum(item.total_price for item in order.items)
        
        order_doc = {
            'id': str(uuid4()),
            'order_number': order_number,
            'tenant_id': order.tenant_id,
            'location_id': order.location_id,
            'terminal_id': order.terminal_id,
            'items': [item.dict() for item in order.items],
            'total_amount': total,
            'payment_method': order.payment_method,
            'payment_status': PaymentStatus.PENDING,
            'status': OrderStatus.RECEIVED,
            'language': order.language,
            'channel': order.channel,
            'drive_in_lane': order.drive_in_lane,
            'vehicle_number': order.vehicle_number,
            'parking_spot': order.parking_spot,
            'qr_code': order.qr_code,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
            'status_history': [{
                'status': OrderStatus.RECEIVED,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }]
        }
        
        await db.orders.insert_one(order_doc)
        order_doc.pop('_id', None)
        
        return {'success': True, 'data': order_doc}
    except Exception as e:
        print(f"[Fastfood] Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def get_orders(
    tenant_id: str,
    location_id: Optional[str] = None,
    status: Optional[OrderStatus] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    token_data: dict = Depends(verify_token)
):
    """Get orders with filters"""
    try:
        query = {'tenant_id': tenant_id}
        
        if location_id:
            query['location_id'] = location_id
        
        if status:
            query['status'] = status
        
        if date_from:
            query['created_at'] = {'$gte': datetime.fromisoformat(date_from)}
        
        if date_to:
            if 'created_at' not in query:
                query['created_at'] = {}
            query['created_at']['$lte'] = datetime.fromisoformat(date_to)
        
        orders = await db.orders.find(
            query,
            {'_id': 0}
        ).sort('created_at', -1).limit(limit).to_list(length=None)
        
        return {'success': True, 'data': orders}
    except Exception as e:
        print(f"[Fastfood] Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific order"""
    try:
        order = await db.orders.find_one(
            {'id': order_id},
            {'_id': 0}
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {'success': True, 'data': order}
    except Exception as e:
        print(f"[Fastfood] Error fetching order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    token_data: dict = Depends(verify_token)
):
    """Update order status (Eingegangen → In Zubereitung → Abholbereit → Abgeschlossen)"""
    try:
        # Get current order
        order = await db.orders.find_one({'id': order_id}, {'_id': 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update status
        status_history = order.get('status_history', [])
        status_history.append({
            'status': status,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        result = await db.orders.update_one(
            {'id': order_id},
            {'$set': {
                'status': status,
                'status_history': status_history,
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating order status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/orders/{order_id}/payment")
async def update_payment_status(
    order_id: str,
    payment_status: PaymentStatus,
    token_data: dict = Depends(verify_token)
):
    """Update payment status"""
    try:
        result = await db.orders.update_one(
            {'id': order_id},
            {'$set': {
                'payment_status': payment_status,
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating payment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TERMINALS ====================

@router.post("/terminals")
async def register_terminal(
    terminal: TerminalModel,
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Register a new terminal (Kiosk, Kitchen Display, Customer Display)"""
    try:
        terminal_doc = {
            'id': str(uuid4()),
            'tenant_id': tenant_id,
            **terminal.dict(),
            'active': True,
            'last_seen': datetime.now(timezone.utc),
            'created_at': datetime.now(timezone.utc)
        }
        
        await db.terminals.insert_one(terminal_doc)
        terminal_doc.pop('_id', None)
        
        return {'success': True, 'data': terminal_doc}
    except Exception as e:
        print(f"[Fastfood] Error registering terminal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/terminals")
async def get_terminals(
    tenant_id: str,
    location_id: Optional[str] = None,
    terminal_type: Optional[TerminalType] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all terminals for a tenant/location"""
    try:
        query = {'tenant_id': tenant_id}
        
        if location_id:
            query['location_id'] = location_id
        
        if terminal_type:
            query['terminal_type'] = terminal_type
        
        terminals = await db.terminals.find(
            query,
            {'_id': 0}
        ).to_list(length=None)
        
        return {'success': True, 'data': terminals}
    except Exception as e:
        print(f"[Fastfood] Error fetching terminals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/terminals/{terminal_id}")
async def update_terminal(
    terminal_id: str,
    terminal: TerminalModel,
    token_data: dict = Depends(verify_token)
):
    """Update a terminal"""
    try:
        result = await db.terminals.update_one(
            {'id': terminal_id},
            {'$set': {
                **terminal.dict(),
                'last_seen': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Terminal not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating terminal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/terminals/{terminal_id}")
async def delete_terminal(
    terminal_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a terminal"""
    try:
        result = await db.terminals.update_one(
            {'id': terminal_id},
            {'$set': {'active': False}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Terminal not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error deleting terminal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STATIONS ====================

@router.post("/stations")
async def create_station(
    station: StationModel,
    tenant_id: str,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Create a new kitchen station"""
    try:
        station_doc = {
            'id': str(uuid4()),
            'tenant_id': tenant_id,
            'location_id': location_id,
            **station.dict(),
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.stations.insert_one(station_doc)
        station_doc.pop('_id', None)
        
        return {'success': True, 'data': station_doc}
    except Exception as e:
        print(f"[Fastfood] Error creating station: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stations")
async def get_stations(
    tenant_id: str,
    location_id: Optional[str] = None,
    active_only: bool = True,
    token_data: dict = Depends(verify_token)
):
    """Get all stations for a tenant/location"""
    try:
        query = {'tenant_id': tenant_id}
        
        if location_id:
            query['$or'] = [
                {'location_id': location_id},
                {'location_id': None}
            ]
        
        if active_only:
            query['active'] = True
        
        stations = await db.stations.find(
            query,
            {'_id': 0}
        ).sort('display_order', 1).to_list(length=None)
        
        return {'success': True, 'data': stations}
    except Exception as e:
        print(f"[Fastfood] Error fetching stations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/stations/{station_id}")
async def update_station(
    station_id: str,
    station: StationModel,
    token_data: dict = Depends(verify_token)
):
    """Update a station"""
    try:
        result = await db.stations.update_one(
            {'id': station_id},
            {'$set': {
                **station.dict(),
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Station not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error updating station: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/stations/{station_id}")
async def delete_station(
    station_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a station (soft delete)"""
    try:
        result = await db.stations.update_one(
            {'id': station_id},
            {'$set': {'active': False, 'updated_at': datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Station not found")
        
        return {'success': True}
    except Exception as e:
        print(f"[Fastfood] Error deleting station: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ANALYTICS ====================

@router.get("/analytics/sales")
async def get_sales_analytics(
    tenant_id: str,
    location_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get sales analytics"""
    try:
        query = {
            'tenant_id': tenant_id,
            'payment_status': PaymentStatus.COMPLETED
        }
        
        if location_id:
            query['location_id'] = location_id
        
        if date_from:
            query['created_at'] = {'$gte': datetime.fromisoformat(date_from)}
        
        if date_to:
            if 'created_at' not in query:
                query['created_at'] = {}
            query['created_at']['$lte'] = datetime.fromisoformat(date_to)
        
        # Get all orders
        orders = await db.orders.find(query, {'_id': 0}).to_list(length=None)
        
        # Calculate stats
        total_revenue = sum(order.get('total_amount', 0) for order in orders)
        total_orders = len(orders)
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Top products
        product_sales = {}
        for order in orders:
            for item in order.get('items', []):
                product_name = item.get('product_name')
                if product_name not in product_sales:
                    product_sales[product_name] = {
                        'name': product_name,
                        'quantity': 0,
                        'revenue': 0
                    }
                product_sales[product_name]['quantity'] += item.get('quantity', 0)
                product_sales[product_name]['revenue'] += item.get('total_price', 0)
        
        top_products = sorted(
            product_sales.values(),
            key=lambda x: x['revenue'],
            reverse=True
        )[:10]
        
        return {
            'success': True,
            'data': {
                'total_revenue': round(total_revenue, 2),
                'total_orders': total_orders,
                'avg_order_value': round(avg_order_value, 2),
                'top_products': top_products
            }
        }
    except Exception as e:
        print(f"[Fastfood] Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
