from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# Import after db setup to avoid circular imports
try:
    from middleware.auth import get_current_user, get_current_tenant_id
except:
    # Fallback for direct import
    def get_current_user():
        pass
    def get_current_tenant_id():
        pass

router = APIRouter()

class TenantHierarchyNode(BaseModel):
    tenant_id: str
    name: str
    display_name: str
    tenant_type: str
    country_code: Optional[str] = None
    allow_cross_location_search: bool = False
    children: List['TenantHierarchyNode'] = []
    parent_tenant_id: Optional[str] = None

class TenantChild(BaseModel):
    tenant_id: str
    name: str
    display_name: str
    tenant_type: str
    country_code: Optional[str] = None
    user_count: int
    status: str

@router.get("/tenants/{tenant_id}/children")
async def get_tenant_children(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all direct child tenants"""
    try:
        # Find all tenants with this parent
        children = await db.tenants.find(
            {"parent_tenant_id": tenant_id},
            {"_id": 0}
        ).to_list(1000)
        
        result = []
        for child in children:
            # Get user count
            user_count = await db.users.count_documents({"tenant_id": child["tenant_id"]})
            
            result.append({
                "tenant_id": child["tenant_id"],
                "name": child["name"],
                "display_name": child["display_name"],
                "tenant_type": child.get("tenant_type", "location"),
                "country_code": child.get("country_code"),
                "user_count": user_count,
                "status": child.get("status", "active")
            })
        
        return {"success": True, "children": result}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenants/{tenant_id}/hierarchy")
async def get_tenant_hierarchy(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full tenant hierarchy tree"""
    try:
        async def build_tree(tid: str) -> TenantHierarchyNode:
            tenant = await db.tenants.find_one(
                {"tenant_id": tid},
                {"_id": 0}
            )
            
            if not tenant:
                raise HTTPException(status_code=404, detail="Tenant not found")
            
            # Get children
            children_docs = await db.tenants.find(
                {"parent_tenant_id": tid},
                {"_id": 0}
            ).to_list(1000)
            
            children = []
            for child_doc in children_docs:
                child_tree = await build_tree(child_doc["tenant_id"])
                children.append(child_tree)
            
            return TenantHierarchyNode(
                tenant_id=tenant["tenant_id"],
                name=tenant["name"],
                display_name=tenant["display_name"],
                tenant_type=tenant.get("tenant_type", "location"),
                country_code=tenant.get("country_code"),
                allow_cross_location_search=tenant.get("allow_cross_location_search", False),
                children=children,
                parent_tenant_id=tenant.get("parent_tenant_id")
            )
        
        tree = await build_tree(tenant_id)
        return {"success": True, "hierarchy": tree}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenants/{tenant_id}/siblings")
async def get_tenant_siblings(
    tenant_id: str,
    same_country_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get sibling tenants (same parent, optionally same country)"""
    try:
        # Get current tenant
        tenant = await db.tenants.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Build query
        query = {}
        if tenant.get("parent_tenant_id"):
            query["parent_tenant_id"] = tenant["parent_tenant_id"]
            query["tenant_id"] = {"$ne": tenant_id}
        else:
            # No parent, no siblings
            return {"success": True, "siblings": []}
        
        if same_country_only and tenant.get("country_code"):
            query["country_code"] = tenant["country_code"]
        
        # Find siblings
        siblings = await db.tenants.find(query, {"_id": 0}).to_list(1000)
        
        result = []
        for sibling in siblings:
            user_count = await db.users.count_documents({"tenant_id": sibling["tenant_id"]})
            
            result.append({
                "tenant_id": sibling["tenant_id"],
                "name": sibling["name"],
                "display_name": sibling["display_name"],
                "tenant_type": sibling.get("tenant_type", "location"),
                "country_code": sibling.get("country_code"),
                "allow_cross_location_search": sibling.get("allow_cross_location_search", False),
                "user_count": user_count,
                "status": sibling.get("status", "active")
            })
        
        return {"success": True, "siblings": result}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenants/{tenant_id}/root")
async def get_root_tenant(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get the root (top-level) tenant in hierarchy"""
    try:
        current = await db.tenants.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not current:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Traverse up to find root
        while current.get("parent_tenant_id"):
            parent = await db.tenants.find_one(
                {"tenant_id": current["parent_tenant_id"]},
                {"_id": 0}
            )
            if not parent:
                break
            current = parent
        
        return {
            "success": True,
            "root": {
                "tenant_id": current["tenant_id"],
                "name": current["name"],
                "display_name": current["display_name"],
                "tenant_type": current.get("tenant_type", "organization")
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenants/{tenant_id}/path")
async def get_tenant_path(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get path from root to current tenant (breadcrumbs)"""
    try:
        path = []
        current = await db.tenants.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not current:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Add current tenant
        path.insert(0, {
            "tenant_id": current["tenant_id"],
            "name": current["name"],
            "display_name": current["display_name"],
            "tenant_type": current.get("tenant_type", "location")
        })
        
        # Traverse up to root
        while current.get("parent_tenant_id"):
            parent = await db.tenants.find_one(
                {"tenant_id": current["parent_tenant_id"]},
                {"_id": 0}
            )
            if not parent:
                break
            
            path.insert(0, {
                "tenant_id": parent["tenant_id"],
                "name": parent["name"],
                "display_name": parent["display_name"],
                "tenant_type": parent.get("tenant_type", "organization")
            })
            current = parent
        
        return {"success": True, "path": path}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
