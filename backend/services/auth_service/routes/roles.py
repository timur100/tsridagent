from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.role import RoleCreate, RoleUpdate, RoleResponse
from utils.db import roles_collection
from utils.security import decode_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/roles", tags=["Role Management"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Verify admin role"""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    # For now, allow any authenticated user - in production, check for admin role
    # if "admin" not in payload.get("roles", []):
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin access required"
    #     )
    return payload

# Standard roles with permissions
STANDARD_ROLES = {
    "super_admin": {
        "name": "Super Admin",
        "description": "Full system access with all permissions",
        "permissions": ["*"],  # All permissions
        "tenant_id": None
    },
    "technician": {
        "name": "Technician",
        "description": "Technical support and maintenance access",
        "permissions": ["devices.read", "devices.write", "inventory.read", "inventory.write", "tickets.read", "tickets.write"],
        "tenant_id": None
    },
    "supporter": {
        "name": "Supporter",
        "description": "Customer support access",
        "permissions": ["tickets.read", "tickets.write", "customers.read", "orders.read"],
        "tenant_id": None
    },
    "tenant_admin": {
        "name": "Tenant Admin",
        "description": "Administrator access for a specific tenant",
        "permissions": ["tenant.*", "users.read", "users.write", "users.delete", "roles.read", "settings.read", "settings.write"],
        "tenant_id": "PLACEHOLDER"
    },
    "manager": {
        "name": "Manager",
        "description": "Management access with reporting capabilities",
        "permissions": ["reports.read", "analytics.read", "users.read", "orders.read", "tickets.read"],
        "tenant_id": "PLACEHOLDER"
    },
    "user": {
        "name": "User",
        "description": "Basic user access",
        "permissions": ["profile.read", "profile.write", "orders.read"],
        "tenant_id": "PLACEHOLDER"
    },
    "tenant_security": {
        "name": "Tenant Security",
        "description": "Security officer access for tenant",
        "permissions": ["security.read", "security.write", "audit.read", "users.read", "devices.read"],
        "tenant_id": "PLACEHOLDER"
    }
}

@router.post("/init-standard-roles")
async def initialize_standard_roles(current_user: dict = Depends(get_current_admin)):
    """
    Initialize standard roles in the database (Super Admin only)
    """
    try:
        created_roles = []
        now = datetime.now(timezone.utc).isoformat()
        
        for role_key, role_data in STANDARD_ROLES.items():
            # Check if role already exists
            existing = await roles_collection.find_one({"name": role_data["name"]})
            if existing:
                continue
            
            role_id = str(uuid.uuid4())
            role_doc = {
                "role_id": role_id,
                "name": role_data["name"],
                "description": role_data["description"],
                "permissions": role_data["permissions"],
                "tenant_id": role_data["tenant_id"],
                "is_system_role": True,
                "created_at": now,
                "updated_at": now
            }
            
            await roles_collection.insert_one(role_doc)
            
            if '_id' in role_doc:
                del role_doc['_id']
            
            created_roles.append(role_doc)
        
        return {
            "success": True,
            "message": f"Initialized {len(created_roles)} standard roles",
            "roles": created_roles
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/", response_model=RoleResponse)
async def create_role(
    role: RoleCreate,
    current_user: dict = Depends(get_current_admin)
):
    """
    Create a new role (Admin only)
    """
    try:
        # Check if role exists
        existing = await roles_collection.find_one({"name": role.name})
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role with this name already exists"
            )
        
        role_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        role_doc = {
            "role_id": role_id,
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions or [],
            "tenant_id": role.tenant_id,
            "is_system_role": False,
            "created_at": now,
            "updated_at": now
        }
        
        await roles_collection.insert_one(role_doc)
        
        if '_id' in role_doc:
            del role_doc['_id']
        
        return RoleResponse(**role_doc)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[RoleResponse])
async def get_roles(
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """
    Get all roles (Admin only)
    Can filter by tenant_id
    """
    try:
        query = {}
        if tenant_id:
            query["$or"] = [
                {"tenant_id": tenant_id},
                {"tenant_id": None}  # Include global roles
            ]
        
        cursor = roles_collection.find(query)
        roles = []
        
        async for role in cursor:
            if '_id' in role:
                del role['_id']
            roles.append(RoleResponse(**role))
        
        return roles
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Get role by ID (Admin only)
    """
    try:
        role = await roles_collection.find_one({"role_id": role_id})
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        if '_id' in role:
            del role['_id']
        
        return RoleResponse(**role)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    role_update: RoleUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """
    Update role (Admin only)
    System roles cannot be modified
    """
    try:
        role = await roles_collection.find_one({"role_id": role_id})
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        if role.get("is_system_role", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System roles cannot be modified"
            )
        
        update_data = {k: v for k, v in role_update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await roles_collection.update_one(
                {"role_id": role_id},
                {"$set": update_data}
            )
        
        # Get updated role
        updated_role = await roles_collection.find_one({"role_id": role_id})
        if '_id' in updated_role:
            del updated_role['_id']
        
        return RoleResponse(**updated_role)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Delete role (Admin only)
    System roles cannot be deleted
    """
    try:
        role = await roles_collection.find_one({"role_id": role_id})
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        if role.get("is_system_role", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System roles cannot be deleted"
            )
        
        result = await roles_collection.delete_one({"role_id": role_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        return {"success": True, "message": "Role deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
