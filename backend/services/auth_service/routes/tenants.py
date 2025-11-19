from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from models.tenant import (
    TenantCreate, 
    TenantUpdate, 
    TenantResponse, 
    TenantStats,
    SubscriptionLimits,
    TenantContact
)
from models.user import UserCreate
from utils.db import tenants_collection, users_collection
from utils.security import get_password_hash
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/tenants", tags=["Tenant Management"])

# MongoDB connection for device counting
def get_devices_db():
    """Get connection to multi_tenant_admin database for device counting"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
    client = AsyncIOMotorClient(mongo_url)
    return client['multi_tenant_admin']

async def count_tenant_devices(tenant_id: str) -> int:
    """Count total devices (online + offline) for a tenant"""
    try:
        devices_db = get_devices_db()
        count = await devices_db.europcar_devices.count_documents({
            "tenant_id": tenant_id
        })
        return count
    except Exception as e:
        print(f"Error counting devices for tenant {tenant_id}: {e}")
        return 0

async def count_tenant_online_devices(tenant_id: str) -> int:
    """Count online devices for a tenant"""
    try:
        devices_db = get_devices_db()
        count = await devices_db.europcar_devices.count_documents({
            "tenant_id": tenant_id,
            "status": "online"
        })
        return count
    except Exception as e:
        print(f"Error counting online devices for tenant {tenant_id}: {e}")
        return 0

async def count_tenant_offline_devices(tenant_id: str) -> int:
    """Count offline devices for a tenant"""
    try:
        devices_db = get_devices_db()
        count = await devices_db.europcar_devices.count_documents({
            "tenant_id": tenant_id,
            "status": "offline"
        })
        return count
    except Exception as e:
        print(f"Error counting offline devices for tenant {tenant_id}: {e}")
        return 0

async def count_tenant_locations(tenant_id: str) -> int:
    """Count locations for a tenant"""
    try:
        # Locations are in portal_db
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        client = AsyncIOMotorClient(mongo_url)
        portal_db = client['portal_db']
        
        count = await portal_db.tenant_locations.count_documents({
            "tenant_id": tenant_id
        })
        return count
    except Exception as e:
        print(f"Error counting locations for tenant {tenant_id}: {e}")
        return 0

@router.get("/stats", response_model=TenantStats)
async def get_tenant_stats():
    """Get overall tenant statistics"""
    try:
        total_tenants = await tenants_collection.count_documents({})
        active_tenants = await tenants_collection.count_documents({"status": "active"})
        trial_tenants = await tenants_collection.count_documents({"status": "trial"})
        suspended_tenants = await tenants_collection.count_documents({"status": "suspended"})
        
        # Count users across all tenants
        total_users = await users_collection.count_documents({"tenant_id": {"$ne": None}})
        
        return TenantStats(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            trial_tenants=trial_tenants,
            suspended_tenants=suspended_tenants,
            total_users=total_users,
            total_devices=0  # Will be populated when device service integration is ready
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tenant statistics: {str(e)}"
        )

@router.get("/search", response_model=List[TenantResponse])
async def search_tenants(
    query: str = Query(..., min_length=1, description="Search term for tenant name, domain, or email")
):
    """Search tenants by name, domain, or admin email"""
    try:
        search_filter = {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"display_name": {"$regex": query, "$options": "i"}},
                {"domain": {"$regex": query, "$options": "i"}},
                {"contact.admin_email": {"$regex": query, "$options": "i"}}
            ]
        }
        
        tenants = await tenants_collection.find(search_filter).to_list(length=100)
        
        result = []
        for tenant in tenants:
            # Count users for this tenant
            user_count = await users_collection.count_documents({"tenant_id": tenant["tenant_id"]})
            tenant["user_count"] = user_count
            
            # Count devices for this tenant (online + offline)
            device_count = await count_tenant_devices(tenant["tenant_id"])
            tenant["device_count"] = device_count
            
            # Count online and offline devices
            online_devices = await count_tenant_online_devices(tenant["tenant_id"])
            offline_devices = await count_tenant_offline_devices(tenant["tenant_id"])
            tenant["online_devices"] = online_devices
            tenant["offline_devices"] = offline_devices
            
            # Count locations for this tenant
            location_count = await count_tenant_locations(tenant["tenant_id"])
            tenant["location_count"] = location_count
            
            # Add default values for resource usage (will be updated with real data later)
            tenant.setdefault("storage_used_gb", 0.0)
            tenant.setdefault("api_calls_today", 0)
            tenant.setdefault("last_activity", None)
            
            result.append(TenantResponse(**tenant))
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching tenants: {str(e)}"
        )

@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, trial, suspended, inactive"),
    subscription_plan: Optional[str] = Query(None, description="Filter by plan: basic, pro, enterprise")
):
    """List all tenants with pagination and filtering"""
    try:
        query_filter = {}
        
        if status_filter:
            query_filter["status"] = status_filter
        
        if subscription_plan:
            query_filter["subscription_plan"] = subscription_plan
        
        tenants = await tenants_collection.find(query_filter).skip(skip).limit(limit).to_list(length=limit)
        
        result = []
        for tenant in tenants:
            # Count users for this tenant
            user_count = await users_collection.count_documents({"tenant_id": tenant["tenant_id"]})
            tenant["user_count"] = user_count
            
            # Count devices for this tenant (online + offline)
            device_count = await count_tenant_devices(tenant["tenant_id"])
            tenant["device_count"] = device_count
            
            # Count online and offline devices
            online_devices = await count_tenant_online_devices(tenant["tenant_id"])
            offline_devices = await count_tenant_offline_devices(tenant["tenant_id"])
            tenant["online_devices"] = online_devices
            tenant["offline_devices"] = offline_devices
            
            # Count locations for this tenant
            location_count = await count_tenant_locations(tenant["tenant_id"])
            tenant["location_count"] = location_count
            
            # Add default values for resource usage (will be updated with real data later)
            tenant.setdefault("storage_used_gb", 0.0)
            tenant.setdefault("api_calls_today", 0)
            tenant.setdefault("last_activity", None)
            
            result.append(TenantResponse(**tenant))
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tenants: {str(e)}"
        )

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str):
    """Get detailed information about a specific tenant"""
    try:
        tenant = await tenants_collection.find_one({"tenant_id": tenant_id})
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with ID {tenant_id} not found"
            )
        
        # Count users for this tenant
        user_count = await users_collection.count_documents({"tenant_id": tenant_id})
        tenant["user_count"] = user_count
        
        # Count devices for this tenant (online + offline)
        device_count = await count_tenant_devices(tenant_id)
        tenant["device_count"] = device_count
        
        # Count online and offline devices
        online_devices = await count_tenant_online_devices(tenant_id)
        offline_devices = await count_tenant_offline_devices(tenant_id)
        tenant["online_devices"] = online_devices
        tenant["offline_devices"] = offline_devices
        
        # Count locations for this tenant
        location_count = await count_tenant_locations(tenant_id)
        tenant["location_count"] = location_count
        
        # Add default values for resource usage
        tenant.setdefault("storage_used_gb", 0.0)
        tenant.setdefault("api_calls_today", 0)
        tenant.setdefault("last_activity", None)
        
        return TenantResponse(**tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tenant: {str(e)}"
        )

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant: TenantCreate):
    """Create a new tenant with admin user"""
    try:
        # Check if tenant with same name or domain exists
        existing = await tenants_collection.find_one({
            "$or": [
                {"name": tenant.name},
                {"domain": tenant.domain}
            ]
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this name or domain already exists"
            )
        
        # Check if admin email already exists
        existing_user = await users_collection.find_one({"email": tenant.contact.admin_email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin email already exists"
            )
        
        tenant_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Create tenant document
        tenant_doc = {
            "tenant_id": tenant_id,
            "name": tenant.name,
            "display_name": tenant.display_name,
            "domain": tenant.domain,
            "description": tenant.description,
            "enabled": True,
            "status": "trial",  # New tenants start as trial
            "contact": tenant.contact.dict(),
            "subscription_plan": tenant.subscription_plan,
            "limits": tenant.limits.dict() if tenant.limits else SubscriptionLimits().dict(),
            "settings": tenant.settings,
            "logo_url": tenant.logo_url,
            "created_at": now,
            "updated_at": now
        }
        
        await tenants_collection.insert_one(tenant_doc)
        
        # Create admin user for this tenant
        admin_user_doc = {
            "user_id": str(uuid.uuid4()),
            "username": f"{tenant.name}_admin",
            "email": tenant.contact.admin_email,
            "first_name": "Tenant",
            "last_name": "Admin",
            "password_hash": get_password_hash(tenant.admin_password),
            "tenant_id": tenant_id,
            "user_type": "tenant_admin",
            "roles": ["admin"],
            "permissions": ["tenant:*"],
            "enabled": True,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
            "attributes": {},
            "required_actions": ["verify_email"]
        }
        
        await users_collection.insert_one(admin_user_doc)
        
        # Fetch and return created tenant
        created_tenant = await tenants_collection.find_one({"tenant_id": tenant_id})
        created_tenant["user_count"] = 1  # We just created the admin user
        created_tenant["device_count"] = 0
        created_tenant["storage_used_gb"] = 0.0
        created_tenant["api_calls_today"] = 0
        created_tenant["last_activity"] = None
        
        return TenantResponse(**created_tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: str, tenant_update: TenantUpdate):
    """Update tenant information"""
    try:
        # Check if tenant exists
        existing_tenant = await tenants_collection.find_one({"tenant_id": tenant_id})
        if not existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with ID {tenant_id} not found"
            )
        
        # Prepare update document (only include fields that are provided)
        update_doc = {}
        if tenant_update.name is not None:
            update_doc["name"] = tenant_update.name
        if tenant_update.display_name is not None:
            update_doc["display_name"] = tenant_update.display_name
        if tenant_update.domain is not None:
            update_doc["domain"] = tenant_update.domain
        if tenant_update.description is not None:
            update_doc["description"] = tenant_update.description
        if tenant_update.enabled is not None:
            update_doc["enabled"] = tenant_update.enabled
        if tenant_update.status is not None:
            update_doc["status"] = tenant_update.status
        if tenant_update.contact is not None:
            update_doc["contact"] = tenant_update.contact.dict()
        if tenant_update.subscription_plan is not None:
            update_doc["subscription_plan"] = tenant_update.subscription_plan
        if tenant_update.limits is not None:
            update_doc["limits"] = tenant_update.limits.dict()
        if tenant_update.settings is not None:
            update_doc["settings"] = tenant_update.settings
        if tenant_update.logo_url is not None:
            update_doc["logo_url"] = tenant_update.logo_url
        
        update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update tenant
        await tenants_collection.update_one(
            {"tenant_id": tenant_id},
            {"$set": update_doc}
        )
        
        # Fetch and return updated tenant
        updated_tenant = await tenants_collection.find_one({"tenant_id": tenant_id})
        user_count = await users_collection.count_documents({"tenant_id": tenant_id})
        updated_tenant["user_count"] = user_count
        updated_tenant.setdefault("device_count", 0)
        updated_tenant.setdefault("storage_used_gb", 0.0)
        updated_tenant.setdefault("api_calls_today", 0)
        updated_tenant.setdefault("last_activity", None)
        
        return TenantResponse(**updated_tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating tenant: {str(e)}"
        )

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: str):
    """
    Delete a tenant and all associated users
    WARNING: This is a destructive operation
    """
    try:
        # Check if tenant exists
        tenant = await tenants_collection.find_one({"tenant_id": tenant_id})
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with ID {tenant_id} not found"
            )
        
        # Delete all users associated with this tenant
        await users_collection.delete_many({"tenant_id": tenant_id})
        
        # Delete tenant
        await tenants_collection.delete_one({"tenant_id": tenant_id})
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting tenant: {str(e)}"
        )
