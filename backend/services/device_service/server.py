from fastapi import FastAPI, HTTPException, Depends, Header
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
    title="Device Service",
    description="Microservice for device management",
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
db_name = os.environ.get('DB_NAME', 'device_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class Device(BaseModel):
    """Device model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str  # e.g., "BERN01-01"
    tenant_id: Optional[str] = None  # Tenant association
    location_code: Optional[str] = None
    device_type: str = "scanner"  # scanner, terminal, kiosk, etc.
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    status: str = "active"  # active, inactive, maintenance, offline
    last_seen: Optional[datetime] = None
    installed_date: Optional[datetime] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeviceCreate(BaseModel):
    """Create device model"""
    device_id: str
    tenant_id: Optional[str] = None  # Tenant association
    location_code: Optional[str] = None
    device_type: str = "scanner"
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    status: str = "active"
    installed_date: Optional[datetime] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}


class DeviceUpdate(BaseModel):
    """Update device model"""
    device_id: Optional[str] = None
    tenant_id: Optional[str] = None  # Tenant association
    location_code: Optional[str] = None
    device_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[str] = None
    last_seen: Optional[datetime] = None
    installed_date: Optional[datetime] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Device Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "Device Service",
        "version": "1.0.0",
        "description": "Microservice for device management",
        "endpoints": [
            "/health",
            "/info",
            "/api/devices",
            "/api/devices/{device_id}",
            "/api/devices/location/{location_code}",
            "/api/devices/stats"
        ]
    }


# Device Routes
@app.get("/api/devices/stats")
async def get_device_stats(tenant_id: Optional[str] = None):
    """Get device statistics"""
    try:
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
            
        total = await db.devices.count_documents(query)
        active = await db.devices.count_documents({**query, "status": "active"})
        inactive = await db.devices.count_documents({**query, "status": "inactive"})
        maintenance = await db.devices.count_documents({**query, "status": "maintenance"})
        offline = await db.devices.count_documents({**query, "status": "offline"})
        
        # Get device types breakdown
        pipeline = [
            {"$match": query} if query else {"$match": {}},
            {"$group": {"_id": "$device_type", "count": {"$sum": 1}}}
        ]
        types_result = await db.devices.aggregate(pipeline).to_list(100)
        by_type = {item['_id']: item['count'] for item in types_result if item['_id']}
        
        return {
            "total": total,
            "by_status": {
                "active": active,
                "inactive": inactive,
                "maintenance": maintenance,
                "offline": offline
            },
            "by_type": by_type
        }
    except Exception as e:
        logger.error(f"Error getting device stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/devices", response_model=List[Device])
async def get_devices(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    location_code: Optional[str] = None,
    device_type: Optional[str] = None
):
    """Get all devices with optional filters"""
    try:
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if status:
            query['status'] = status
        if location_code:
            query['location_code'] = location_code
        if device_type:
            query['device_type'] = device_type
        
        devices = await db.devices.find(query, {"_id": 0}).to_list(1000)
        
        # Parse datetime strings
        for device in devices:
            if isinstance(device.get('created_at'), str):
                device['created_at'] = datetime.fromisoformat(device['created_at'])
            if isinstance(device.get('updated_at'), str):
                device['updated_at'] = datetime.fromisoformat(device['updated_at'])
            if isinstance(device.get('last_seen'), str):
                device['last_seen'] = datetime.fromisoformat(device['last_seen'])
            if isinstance(device.get('installed_date'), str):
                device['installed_date'] = datetime.fromisoformat(device['installed_date'])
        
        return [Device(**device) for device in devices]
    except Exception as e:
        logger.error(f"Error getting devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/devices", response_model=Device, status_code=201)
async def create_device(device: DeviceCreate):
    """Create a new device"""
    try:
        # Check if device_id already exists
        existing = await db.devices.find_one({"device_id": device.device_id})
        if existing:
            raise HTTPException(status_code=400, detail="Device ID already exists")
        
        new_device = Device(**device.model_dump())
        doc = new_device.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        if doc.get('last_seen'):
            doc['last_seen'] = doc['last_seen'].isoformat()
        if doc.get('installed_date'):
            doc['installed_date'] = doc['installed_date'].isoformat()
        
        await db.devices.insert_one(doc)
        logger.info(f"Created device: {device.device_id}")
        
        return new_device
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    """Get a specific device by ID"""
    try:
        device = await db.devices.find_one({"id": device_id}, {"_id": 0})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Parse datetime strings
        if isinstance(device.get('created_at'), str):
            device['created_at'] = datetime.fromisoformat(device['created_at'])
        if isinstance(device.get('updated_at'), str):
            device['updated_at'] = datetime.fromisoformat(device['updated_at'])
        if isinstance(device.get('last_seen'), str):
            device['last_seen'] = datetime.fromisoformat(device['last_seen'])
        if isinstance(device.get('installed_date'), str):
            device['installed_date'] = datetime.fromisoformat(device['installed_date'])
        
        return Device(**device)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, device_update: DeviceUpdate):
    """Update a device"""
    try:
        # Check if device exists
        existing = await db.devices.find_one({"id": device_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Prepare update data
        update_data = device_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert datetime fields
        if update_data.get('last_seen'):
            update_data['last_seen'] = update_data['last_seen'].isoformat()
        if update_data.get('installed_date'):
            update_data['installed_date'] = update_data['installed_date'].isoformat()
        
        await db.devices.update_one({"id": device_id}, {"$set": update_data})
        
        # Fetch updated device
        updated = await db.devices.find_one({"id": device_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        if isinstance(updated.get('last_seen'), str):
            updated['last_seen'] = datetime.fromisoformat(updated['last_seen'])
        if isinstance(updated.get('installed_date'), str):
            updated['installed_date'] = datetime.fromisoformat(updated['installed_date'])
        
        logger.info(f"Updated device: {device_id}")
        return Device(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: str):
    """Delete a device"""
    try:
        result = await db.devices.delete_one({"id": device_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
        logger.info(f"Deleted device: {device_id}")
        return {"success": True, "message": "Device deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/devices/location/{location_code}", response_model=List[Device])
async def get_devices_by_location(location_code: str):
    """Get all devices at a specific location"""
    try:
        devices = await db.devices.find({"location_code": location_code}, {"_id": 0}).to_list(100)
        
        # Parse datetime strings
        for device in devices:
            if isinstance(device.get('created_at'), str):
                device['created_at'] = datetime.fromisoformat(device['created_at'])
            if isinstance(device.get('updated_at'), str):
                device['updated_at'] = datetime.fromisoformat(device['updated_at'])
            if isinstance(device.get('last_seen'), str):
                device['last_seen'] = datetime.fromisoformat(device['last_seen'])
            if isinstance(device.get('installed_date'), str):
                device['installed_date'] = datetime.fromisoformat(device['installed_date'])
        
        return [Device(**device) for device in devices]
    except Exception as e:
        logger.error(f"Error getting devices by location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8104))
    uvicorn.run(app, host="0.0.0.0", port=port)