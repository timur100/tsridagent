from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
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
    title="License Service",
    description="Microservice for license and subscription management",
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
db_name = os.environ.get('DB_NAME', 'license_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class License(BaseModel):
    """License model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    license_key: str
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    product_name: str
    product_version: Optional[str] = None
    license_type: str = "subscription"  # subscription, perpetual, trial
    status: str = "active"  # active, expired, suspended, revoked
    max_users: Optional[int] = None
    max_devices: Optional[int] = None
    features: List[str] = []
    issue_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiry_date: Optional[datetime] = None
    last_check: Optional[datetime] = None
    activation_count: int = 0
    max_activations: Optional[int] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicenseCreate(BaseModel):
    """Create license model"""
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    product_name: str
    product_version: Optional[str] = None
    license_type: str = "subscription"
    max_users: Optional[int] = None
    max_devices: Optional[int] = None
    features: List[str] = []
    expiry_days: Optional[int] = 365  # Default 1 year
    max_activations: Optional[int] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}


class LicenseUpdate(BaseModel):
    """Update license model"""
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    product_version: Optional[str] = None
    status: Optional[str] = None
    max_users: Optional[int] = None
    max_devices: Optional[int] = None
    features: Optional[List[str]] = None
    expiry_date: Optional[datetime] = None
    max_activations: Optional[int] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LicenseValidation(BaseModel):
    """License validation response"""
    valid: bool
    status: str
    message: str
    license_info: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "License Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "License Service",
        "version": "1.0.0",
        "description": "Microservice for license and subscription management",
        "endpoints": [
            "/health",
            "/info",
            "/api/licenses",
            "/api/licenses/{license_id}",
            "/api/licenses/key/{license_key}",
            "/api/licenses/validate/{license_key}",
            "/api/licenses/customer/{customer_id}",
            "/api/licenses/stats"
        ]
    }


# License Routes - Specific routes first
@app.get("/api/licenses/stats")
async def get_license_stats():
    """Get license statistics"""
    try:
        total = await db.licenses.count_documents({})
        active = await db.licenses.count_documents({"status": "active"})
        expired = await db.licenses.count_documents({"status": "expired"})
        suspended = await db.licenses.count_documents({"status": "suspended"})
        revoked = await db.licenses.count_documents({"status": "revoked"})
        
        # License type breakdown
        subscription = await db.licenses.count_documents({"license_type": "subscription"})
        perpetual = await db.licenses.count_documents({"license_type": "perpetual"})
        trial = await db.licenses.count_documents({"license_type": "trial"})
        
        # Expiring soon (within 30 days)
        thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
        expiring_soon = await db.licenses.count_documents({
            "status": "active",
            "expiry_date": {"$lte": thirty_days_from_now.isoformat()}
        })
        
        return {
            "total": total,
            "by_status": {
                "active": active,
                "expired": expired,
                "suspended": suspended,
                "revoked": revoked
            },
            "by_type": {
                "subscription": subscription,
                "perpetual": perpetual,
                "trial": trial
            },
            "expiring_soon": expiring_soon
        }
    except Exception as e:
        logger.error(f"Error getting license stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/licenses/validate/{license_key}", response_model=LicenseValidation)
async def validate_license(license_key: str):
    """Validate a license key"""
    try:
        license_doc = await db.licenses.find_one({"license_key": license_key}, {"_id": 0})
        
        if not license_doc:
            return LicenseValidation(
                valid=False,
                status="not_found",
                message="License key not found"
            )
        
        # Parse datetime strings
        if isinstance(license_doc.get('expiry_date'), str):
            license_doc['expiry_date'] = datetime.fromisoformat(license_doc['expiry_date'])
        
        # Update last check time
        await db.licenses.update_one(
            {"license_key": license_key},
            {"$set": {"last_check": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Check status
        if license_doc['status'] != 'active':
            return LicenseValidation(
                valid=False,
                status=license_doc['status'],
                message=f"License is {license_doc['status']}",
                license_info={
                    "product_name": license_doc.get('product_name'),
                    "license_type": license_doc.get('license_type')
                }
            )
        
        # Check expiry
        if license_doc.get('expiry_date'):
            expiry = license_doc['expiry_date']
            if isinstance(expiry, str):
                expiry = datetime.fromisoformat(expiry)
            if expiry < datetime.now(timezone.utc):
                # Mark as expired
                await db.licenses.update_one(
                    {"license_key": license_key},
                    {"$set": {"status": "expired"}}
                )
                return LicenseValidation(
                    valid=False,
                    status="expired",
                    message="License has expired",
                    license_info={
                        "product_name": license_doc.get('product_name'),
                        "expiry_date": expiry.isoformat()
                    }
                )
        
        return LicenseValidation(
            valid=True,
            status="active",
            message="License is valid",
            license_info={
                "product_name": license_doc.get('product_name'),
                "product_version": license_doc.get('product_version'),
                "license_type": license_doc.get('license_type'),
                "features": license_doc.get('features', []),
                "max_users": license_doc.get('max_users'),
                "max_devices": license_doc.get('max_devices'),
                "expiry_date": license_doc.get('expiry_date').isoformat() if license_doc.get('expiry_date') else None
            }
        )
    except Exception as e:
        logger.error(f"Error validating license: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/licenses/key/{license_key}", response_model=License)
async def get_license_by_key(license_key: str):
    """Get a specific license by key"""
    try:
        license_doc = await db.licenses.find_one({"license_key": license_key}, {"_id": 0})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        # Parse datetime strings
        if isinstance(license_doc.get('created_at'), str):
            license_doc['created_at'] = datetime.fromisoformat(license_doc['created_at'])
        if isinstance(license_doc.get('updated_at'), str):
            license_doc['updated_at'] = datetime.fromisoformat(license_doc['updated_at'])
        if isinstance(license_doc.get('issue_date'), str):
            license_doc['issue_date'] = datetime.fromisoformat(license_doc['issue_date'])
        if isinstance(license_doc.get('expiry_date'), str):
            license_doc['expiry_date'] = datetime.fromisoformat(license_doc['expiry_date'])
        if isinstance(license_doc.get('last_check'), str):
            license_doc['last_check'] = datetime.fromisoformat(license_doc['last_check'])
        
        return License(**license_doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting license by key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/licenses/customer/{customer_id}", response_model=List[License])
async def get_licenses_by_customer(customer_id: str):
    """Get all licenses for a specific customer"""
    try:
        licenses = await db.licenses.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        # Parse datetime strings
        for license_doc in licenses:
            if isinstance(license_doc.get('created_at'), str):
                license_doc['created_at'] = datetime.fromisoformat(license_doc['created_at'])
            if isinstance(license_doc.get('updated_at'), str):
                license_doc['updated_at'] = datetime.fromisoformat(license_doc['updated_at'])
            if isinstance(license_doc.get('issue_date'), str):
                license_doc['issue_date'] = datetime.fromisoformat(license_doc['issue_date'])
            if isinstance(license_doc.get('expiry_date'), str):
                license_doc['expiry_date'] = datetime.fromisoformat(license_doc['expiry_date'])
            if isinstance(license_doc.get('last_check'), str):
                license_doc['last_check'] = datetime.fromisoformat(license_doc['last_check'])
        
        return [License(**license_doc) for license_doc in licenses]
    except Exception as e:
        logger.error(f"Error getting licenses by customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/licenses", response_model=List[License])
async def get_licenses(
    status: Optional[str] = None,
    license_type: Optional[str] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get all licenses with optional filters"""
    try:
        query = {}
        if status:
            query['status'] = status
        if license_type:
            query['license_type'] = license_type
        
        licenses = await db.licenses.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Parse datetime strings
        for license_doc in licenses:
            if isinstance(license_doc.get('created_at'), str):
                license_doc['created_at'] = datetime.fromisoformat(license_doc['created_at'])
            if isinstance(license_doc.get('updated_at'), str):
                license_doc['updated_at'] = datetime.fromisoformat(license_doc['updated_at'])
            if isinstance(license_doc.get('issue_date'), str):
                license_doc['issue_date'] = datetime.fromisoformat(license_doc['issue_date'])
            if isinstance(license_doc.get('expiry_date'), str):
                license_doc['expiry_date'] = datetime.fromisoformat(license_doc['expiry_date'])
            if isinstance(license_doc.get('last_check'), str):
                license_doc['last_check'] = datetime.fromisoformat(license_doc['last_check'])
        
        return [License(**license_doc) for license_doc in licenses]
    except Exception as e:
        logger.error(f"Error getting licenses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/licenses", response_model=License, status_code=201)
async def create_license(license_create: LicenseCreate):
    """Create a new license"""
    try:
        # Generate license key (format: LIC-XXXXXX-XXXXXX-XXXXXX)
        import random
        import string
        def generate_key_segment():
            return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        license_key = f"LIC-{generate_key_segment()}-{generate_key_segment()}-{generate_key_segment()}"
        
        # Check if key already exists (very unlikely but safety check)
        existing = await db.licenses.find_one({"license_key": license_key})
        if existing:
            # Generate new one
            license_key = f"LIC-{generate_key_segment()}-{generate_key_segment()}-{generate_key_segment()}"
        
        # Calculate expiry date
        expiry_date = None
        if license_create.expiry_days and license_create.license_type != 'perpetual':
            expiry_date = datetime.now(timezone.utc) + timedelta(days=license_create.expiry_days)
        
        new_license = License(
            **license_create.model_dump(exclude={'expiry_days'}),
            license_key=license_key,
            expiry_date=expiry_date
        )
        doc = new_license.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        doc['issue_date'] = doc['issue_date'].isoformat()
        if doc.get('expiry_date'):
            doc['expiry_date'] = doc['expiry_date'].isoformat()
        if doc.get('last_check'):
            doc['last_check'] = doc['last_check'].isoformat()
        
        await db.licenses.insert_one(doc)
        logger.info(f"Created license: {license_key}")
        
        return new_license
    except Exception as e:
        logger.error(f"Error creating license: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/licenses/{license_id}", response_model=License)
async def get_license(license_id: str):
    """Get a specific license by ID"""
    try:
        license_doc = await db.licenses.find_one({"id": license_id}, {"_id": 0})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        # Parse datetime strings
        if isinstance(license_doc.get('created_at'), str):
            license_doc['created_at'] = datetime.fromisoformat(license_doc['created_at'])
        if isinstance(license_doc.get('updated_at'), str):
            license_doc['updated_at'] = datetime.fromisoformat(license_doc['updated_at'])
        if isinstance(license_doc.get('issue_date'), str):
            license_doc['issue_date'] = datetime.fromisoformat(license_doc['issue_date'])
        if isinstance(license_doc.get('expiry_date'), str):
            license_doc['expiry_date'] = datetime.fromisoformat(license_doc['expiry_date'])
        if isinstance(license_doc.get('last_check'), str):
            license_doc['last_check'] = datetime.fromisoformat(license_doc['last_check'])
        
        return License(**license_doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting license: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/licenses/{license_id}", response_model=License)
async def update_license(license_id: str, license_update: LicenseUpdate):
    """Update a license"""
    try:
        # Check if license exists
        existing = await db.licenses.find_one({"id": license_id})
        if not existing:
            raise HTTPException(status_code=404, detail="License not found")
        
        # Prepare update data
        update_data = license_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert datetime fields
        if update_data.get('expiry_date'):
            update_data['expiry_date'] = update_data['expiry_date'].isoformat()
        
        await db.licenses.update_one({"id": license_id}, {"$set": update_data})
        
        # Fetch updated license
        updated = await db.licenses.find_one({"id": license_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        if isinstance(updated.get('issue_date'), str):
            updated['issue_date'] = datetime.fromisoformat(updated['issue_date'])
        if isinstance(updated.get('expiry_date'), str):
            updated['expiry_date'] = datetime.fromisoformat(updated['expiry_date'])
        if isinstance(updated.get('last_check'), str):
            updated['last_check'] = datetime.fromisoformat(updated['last_check'])
        
        logger.info(f"Updated license: {license_id}")
        return License(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating license: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/licenses/{license_id}")
async def delete_license(license_id: str):
    """Delete a license"""
    try:
        result = await db.licenses.delete_one({"id": license_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="License not found")
        
        logger.info(f"Deleted license: {license_id}")
        return {"success": True, "message": "License deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting license: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8108))
    uvicorn.run(app, host="0.0.0.0", port=port)