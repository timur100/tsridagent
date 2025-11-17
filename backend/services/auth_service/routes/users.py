from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.user import UserCreate, UserUpdate, UserResponse
from utils.db import users_collection, tenants_collection
from utils.security import get_password_hash, decode_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/users", tags=["User Management"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Verify admin role"""
    payload = decode_token(token)
    if not payload or "admin" not in payload.get("roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return payload

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user: dict = Depends(get_current_admin)
):
    """
    Create a new user (Admin only)
    """
    try:
        # Check if user exists
        existing = await users_collection.find_one({
            "$or": [
                {"email": user.email},
                {"username": user.username}
            ]
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user_doc = {
            "user_id": user_id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "password_hash": get_password_hash(user.password),
            "tenant_id": user.tenant_id,
            "user_type": user.user_type,
            "roles": user.roles or ["user"],
            "permissions": [],
            "enabled": True,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
            "attributes": {}
        }
        
        await users_collection.insert_one(user_doc)
        
        if '_id' in user_doc:
            del user_doc['_id']
        if 'password_hash' in user_doc:
            del user_doc['password_hash']
        
        return UserResponse(**user_doc)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[UserResponse])
async def get_users(
    tenant_id: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """
    Get all users (Admin only)
    """
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if user_type:
            query["user_type"] = user_type
        
        cursor = users_collection.find(query)
        users = []
        
        async for user in cursor:
            if '_id' in user:
                del user['_id']
            if 'password_hash' in user:
                del user['password_hash']
            users.append(UserResponse(**user))
        
        return users
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Get user by ID (Admin only)
    """
    try:
        user = await users_collection.find_one({"user_id": user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if '_id' in user:
            del user['_id']
        if 'password_hash' in user:
            del user['password_hash']
        
        return UserResponse(**user)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """
    Update user (Admin only)
    """
    try:
        user = await users_collection.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await users_collection.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
        
        # Get updated user
        updated_user = await users_collection.find_one({"user_id": user_id})
        if '_id' in updated_user:
            del updated_user['_id']
        if 'password_hash' in updated_user:
            del updated_user['password_hash']
        
        return UserResponse(**updated_user)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Delete user (Admin only)
    """
    try:
        result = await users_collection.delete_one({"user_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"success": True, "message": "User deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
