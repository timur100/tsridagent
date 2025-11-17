from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from datetime import datetime
import uuid
from typing import List, Optional
from models.customer import Customer, CustomerCreate, CustomerUpdate
from middleware.tenant_context import TenantContext

router = APIRouter(prefix="/api/customers", tags=["customers"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(mongo_url)
db = client['test_database']

def require_super_admin():
    """Check if current user is super admin"""
    if not TenantContext.is_super_admin():
        raise HTTPException(
            status_code=403, 
            detail="Super admin access required"
        )

@router.get("/list")
async def list_customers():
    """
    List all customers (super admin only)
    """
    require_super_admin()
    
    try:
        customers = list(db.customers.find({}, {"_id": 0}))
        return {
            "success": True,
            "customers": customers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_customer(customer_data: CustomerCreate):
    """
    Create a new customer (super admin only)
    """
    require_super_admin()
    
    try:
        # Check if customer with same name already exists
        existing = db.customers.find_one({"name": customer_data.name})
        if existing:
            raise HTTPException(status_code=400, detail="Customer with this name already exists")
        
        # Create customer
        customer = {
            "id": str(uuid.uuid4()),
            "name": customer_data.name,
            "domain": customer_data.domain,
            "logo_url": customer_data.logo_url,
            "settings": {
                "branding": {},
                "features_enabled": ["tickets", "catalog", "devices"],
                "portal_settings": {}
            },
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": None,
            "active": True
        }
        
        db.customers.insert_one(customer)
        
        return {
            "success": True,
            "message": "Customer created successfully",
            "customer": customer
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    """
    Get customer details (super admin only)
    """
    require_super_admin()
    
    try:
        customer = db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "success": True,
            "customer": customer
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{customer_id}")
async def update_customer(customer_id: str, update_data: CustomerUpdate):
    """
    Update customer (super admin only)
    """
    require_super_admin()
    
    try:
        # Build update dict
        update_dict = {}
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.domain is not None:
            update_dict["domain"] = update_data.domain
        if update_data.logo_url is not None:
            update_dict["logo_url"] = update_data.logo_url
        if update_data.settings is not None:
            update_dict["settings"] = update_data.settings.dict()
        if update_data.active is not None:
            update_dict["active"] = update_data.active
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        result = db.customers.update_one(
            {"id": customer_id},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Get updated customer
        customer = db.customers.find_one({"id": customer_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Customer updated successfully",
            "customer": customer
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current/info")
async def get_current_customer():
    """
    Get current customer info (for customer admins)
    """
    customer_id = TenantContext.get_customer_id()
    
    if not customer_id:
        # Super admin or no context
        return {
            "success": True,
            "customer": None,
            "is_super_admin": TenantContext.is_super_admin()
        }
    
    try:
        customer = db.customers.find_one({"id": customer_id}, {"_id": 0})
        return {
            "success": True,
            "customer": customer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
