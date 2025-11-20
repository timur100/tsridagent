from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
from pymongo import MongoClient
import uuid
import os

from routes.portal_auth import verify_token, hash_password

router = APIRouter(prefix="/api/portal/users", tags=["Portal Users"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']

class User(BaseModel):
    email: EmailStr
    name: str
    company: str
    role: str = "customer"  # customer, employee, admin
    active: bool = True

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: str
    role: str = "customer"

@router.get("/list")
async def list_users(token_data: dict = Depends(verify_token)):
    """Get all users (admin only)"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all users from MongoDB
        users_cursor = db.portal_users.find({}, {'_id': 0, 'hashed_password': 0})
        users_list = list(users_cursor)
        
        return {
            "success": True,
            "users": users_list,
            "total": len(users_list)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"List users error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{email}")
async def get_user(email: str, token_data: dict = Depends(verify_token)):
    """Get user by email"""
    try:
        # Check if admin or requesting own data
        if token_data.get("role") != "admin" and token_data.get("sub") != email:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": email}, {'_id': 0, 'hashed_password': 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_user(user_request: CreateUserRequest, token_data: dict = Depends(verify_token)):
    """Create a new user (admin only)"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if user exists in MongoDB
        existing_user = db.portal_users.find_one({"email": user_request.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Hash password
        hashed_password = hash_password(user_request.password)
        
        # Create user document
        user_doc = {
            "email": user_request.email,
            "hashed_password": hashed_password,
            "name": user_request.name,
            "company": user_request.company,
            "role": user_request.role,
            "active": True,
            "status": "Aktiv",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("sub")
        }
        
        # Insert into MongoDB
        db.portal_users.insert_one(user_doc)
        
        # Return user without sensitive data
        user_response = {k: v for k, v in user_doc.items() if k not in ['_id', 'hashed_password']}
        
        # Broadcast user creation in real-time
        print(f"[User Create] Broadcasting new user {user_request.email}")
        try:
            from websocket_manager import manager
            import asyncio
            
            # Broadcast to all admins (we'll use a global admin tenant for now)
            message = {
                "type": "user_created",
                "user": user_response
            }
            
            # Broadcast to user's company/tenant if they have one
            if user_request.company:
                asyncio.create_task(manager.broadcast_to_tenant("admin", message))
            
            print(f"[User Create] Broadcast sent")
        except Exception as e:
            print(f"[User Create] Broadcast error: {str(e)}")
        
        return {
            "success": True,
            "message": "User created successfully",
            "user": user_response
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{email}")
async def update_user(email: str, user_update: dict, token_data: dict = Depends(verify_token)):
    """Update user information"""
    try:
        # Check if admin or updating own data
        if token_data.get("role") != "admin" and token_data.get("sub") != email:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Don't allow non-admins to change role
        if token_data.get("role") != "admin" and 'role' in user_update:
            del user_update['role']
        
        # Prepare update data
        user_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update user in MongoDB
        db.portal_users.update_one(
            {"email": email},
            {"$set": user_update}
        )
        
        # Fetch updated user (exclude sensitive fields)
        updated_user = db.portal_users.find_one({"email": email}, {'_id': 0, 'hashed_password': 0})
        
        # Broadcast user update in real-time
        print(f"[User Update] Broadcasting update for user {email}")
        try:
            from websocket_manager import manager
            import asyncio
            
            message = {
                "type": "user_updated",
                "email": email,
                "user": updated_user
            }
            
            asyncio.create_task(manager.broadcast_to_tenant("admin", message))
            print(f"[User Update] Broadcast sent")
        except Exception as e:
            print(f"[User Update] Broadcast error: {str(e)}")
        
        return {
            "success": True,
            "message": "User updated successfully",
            "user": updated_user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{email}")
async def delete_user(email: str, token_data: dict = Depends(verify_token)):
    """Delete a user (admin only)"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting self
        if email == token_data.get("sub"):
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Delete from MongoDB
        db.portal_users.delete_one({"email": email})
        
        return {
            "success": True,
            "message": "User deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email}/activate")
async def activate_user(email: str, token_data: dict = Depends(verify_token)):
    """Activate a user (admin only)"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user status in MongoDB
        db.portal_users.update_one(
            {"email": email},
            {
                "$set": {
                    "active": True,
                    "status": "Aktiv",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "User activated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email}/deactivate")
async def deactivate_user(email: str, token_data: dict = Depends(verify_token)):
    """Deactivate a user (admin only)"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deactivating self
        if email == token_data.get("sub"):
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
        # Update user status in MongoDB
        db.portal_users.update_one(
            {"email": email},
            {
                "$set": {
                    "active": False,
                    "status": "Inaktiv",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "User deactivated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
