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
    title="Location Service",
    description="Microservice for location/station management",
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
db_name = os.environ.get('DB_NAME', 'location_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class Location(BaseModel):
    """Location model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_code: str  # e.g., "BERN01"
    location_name: str
    address: Optional[Dict[str, str]] = {}  # street, postal_code, city, country
    coordinates: Optional[Dict[str, float]] = {}  # latitude, longitude
    contact: Optional[Dict[str, str]] = {}  # phone, email
    status: str = "active"  # active, inactive, temporarily_closed
    opening_hours: Optional[Dict[str, Any]] = {}
    location_type: str = "station"  # station, office, warehouse, etc.
    parent_location_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LocationCreate(BaseModel):
    """Create location model"""
    location_code: str
    location_name: str
    address: Optional[Dict[str, str]] = {}
    coordinates: Optional[Dict[str, float]] = {}
    contact: Optional[Dict[str, str]] = {}
    status: str = "active"
    opening_hours: Optional[Dict[str, Any]] = {}
    location_type: str = "station"
    parent_location_id: Optional[str] = None
    metadata: Dict[str, Any] = {}


class LocationUpdate(BaseModel):
    """Update location model"""
    location_code: Optional[str] = None
    location_name: Optional[str] = None
    address: Optional[Dict[str, str]] = None
    coordinates: Optional[Dict[str, float]] = None
    contact: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    opening_hours: Optional[Dict[str, Any]] = None
    location_type: Optional[str] = None
    parent_location_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Location Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "Location Service",
        "version": "1.0.0",
        "description": "Microservice for location and station management",
        "endpoints": [
            "/health",
            "/info",
            "/api/locations",
            "/api/locations/{location_id}",
            "/api/locations/code/{location_code}",
            "/api/locations/search",
            "/api/locations/stats"
        ]
    }


# Location Routes - Specific routes first
@app.get("/api/locations/stats")
async def get_location_stats():
    """Get location statistics"""
    try:
        total = await db.locations.count_documents({})
        active = await db.locations.count_documents({"status": "active"})
        inactive = await db.locations.count_documents({"status": "inactive"})
        temp_closed = await db.locations.count_documents({"status": "temporarily_closed"})
        
        # Get location types breakdown
        pipeline = [
            {"$group": {"_id": "$location_type", "count": {"$sum": 1}}}
        ]
        types_result = await db.locations.aggregate(pipeline).to_list(100)
        by_type = {item['_id']: item['count'] for item in types_result if item['_id']}
        
        return {
            "total": total,
            "by_status": {
                "active": active,
                "inactive": inactive,
                "temporarily_closed": temp_closed
            },
            "by_type": by_type
        }
    except Exception as e:
        logger.error(f"Error getting location stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/locations", response_model=List[Location])
async def get_locations(
    status: Optional[str] = None,
    location_type: Optional[str] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get all locations with optional filters"""
    try:
        query = {}
        if status:
            query['status'] = status
        if location_type:
            query['location_type'] = location_type
        
        locations = await db.locations.find(query, {"_id": 0}).to_list(limit)
        
        # Parse datetime strings
        for location in locations:
            if isinstance(location.get('created_at'), str):
                location['created_at'] = datetime.fromisoformat(location['created_at'])
            if isinstance(location.get('updated_at'), str):
                location['updated_at'] = datetime.fromisoformat(location['updated_at'])
        
        return [Location(**location) for location in locations]
    except Exception as e:
        logger.error(f"Error getting locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/locations", response_model=Location, status_code=201)
async def create_location(location: LocationCreate):
    """Create a new location"""
    try:
        # Check if location_code already exists
        existing = await db.locations.find_one({"location_code": location.location_code})
        if existing:
            raise HTTPException(status_code=400, detail="Location code already exists")
        
        new_location = Location(**location.model_dump())
        doc = new_location.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.locations.insert_one(doc)
        logger.info(f"Created location: {location.location_code}")
        
        return new_location
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/locations/{location_id}", response_model=Location)
async def get_location(location_id: str):
    """Get a specific location by ID"""
    try:
        location = await db.locations.find_one({"id": location_id}, {"_id": 0})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Parse datetime strings
        if isinstance(location.get('created_at'), str):
            location['created_at'] = datetime.fromisoformat(location['created_at'])
        if isinstance(location.get('updated_at'), str):
            location['updated_at'] = datetime.fromisoformat(location['updated_at'])
        
        return Location(**location)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/locations/code/{location_code}", response_model=Location)
async def get_location_by_code(location_code: str):
    """Get a specific location by location code"""
    try:
        location = await db.locations.find_one({"location_code": location_code}, {"_id": 0})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Parse datetime strings
        if isinstance(location.get('created_at'), str):
            location['created_at'] = datetime.fromisoformat(location['created_at'])
        if isinstance(location.get('updated_at'), str):
            location['updated_at'] = datetime.fromisoformat(location['updated_at'])
        
        return Location(**location)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting location by code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/locations/{location_id}", response_model=Location)
async def update_location(location_id: str, location_update: LocationUpdate):
    """Update a location"""
    try:
        # Check if location exists
        existing = await db.locations.find_one({"id": location_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Prepare update data
        update_data = location_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.locations.update_one({"id": location_id}, {"$set": update_data})
        
        # Fetch updated location
        updated = await db.locations.find_one({"id": location_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        
        logger.info(f"Updated location: {location_id}")
        return Location(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/locations/{location_id}")
async def delete_location(location_id: str):
    """Delete a location"""
    try:
        result = await db.locations.delete_one({"id": location_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Location not found")
        
        logger.info(f"Deleted location: {location_id}")
        return {"success": True, "message": "Location deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/locations/search")
async def search_locations(
    query: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=100)
):
    """Search locations by name, code, or address"""
    try:
        # Search in location_code, location_name, and address fields
        search_query = {
            "$or": [
                {"location_code": {"$regex": query, "$options": "i"}},
                {"location_name": {"$regex": query, "$options": "i"}},
                {"address.city": {"$regex": query, "$options": "i"}},
                {"address.street": {"$regex": query, "$options": "i"}}
            ]
        }
        
        locations = await db.locations.find(search_query, {"_id": 0}).limit(limit).to_list(limit)
        
        # Parse datetime strings
        for location in locations:
            if isinstance(location.get('created_at'), str):
                location['created_at'] = datetime.fromisoformat(location['created_at'])
            if isinstance(location.get('updated_at'), str):
                location['updated_at'] = datetime.fromisoformat(location['updated_at'])
        
        return [Location(**location) for location in locations]
    except Exception as e:
        logger.error(f"Error searching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8105))
    uvicorn.run(app, host="0.0.0.0", port=port)