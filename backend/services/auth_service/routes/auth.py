from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from models.user import UserLogin, UserCreate, UserResponse
from models.token import Token, TokenData
from utils.db import users_collection, sessions_collection, tenants_collection
from utils.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    decode_token
)
from utils.keycloak_adapter import KeycloakToken

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    """
    Register a new user (Keycloak-compatible)
    """
    try:
        # Check if user exists
        existing_user = await users_collection.find_one({
            "$or": [
                {"email": user.email},
                {"username": user.username}
            ]
        })
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Verify tenant if provided
        if user.tenant_id:
            tenant = await tenants_collection.find_one({"tenant_id": user.tenant_id})
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant not found"
                )
        
        # Create user
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
            "attributes": {},
            "required_actions": []
        }
        
        await users_collection.insert_one(user_doc)
        
        # Remove sensitive data
        if '_id' in user_doc:
            del user_doc['_id']
        if 'password_hash' in user_doc:
            del user_doc['password_hash']
        
        return UserResponse(**user_doc)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible login (Keycloak-compatible)
    """
    try:
        # Find user
        user = await users_collection.find_one({
            "$or": [
                {"username": form_data.username},
                {"email": form_data.username}
            ]
        })
        
        if not user or not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.get("enabled", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        # Create tokens
        token_data = {
            "sub": user["email"],
            "user_id": user["user_id"],
            "username": user["username"],
            "tenant_id": user.get("tenant_id"),
            "roles": user.get("roles", []),
            "permissions": user.get("permissions", []),
            "preferred_username": user["username"],
            "email": user["email"],
            "email_verified": user.get("email_verified", False)
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"user_id": user["user_id"]})
        
        # Update last login
        await users_collection.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Create session
        session_id = str(uuid.uuid4())
        await sessions_collection.insert_one({
            "session_id": session_id,
            "user_id": user["user_id"],
            "access_token": access_token,
            "refresh_token": refresh_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
            "active": True
        })
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=900,  # 15 minutes
            refresh_token=refresh_token,
            scope="profile email"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """
    Logout user and invalidate session
    """
    try:
        # Decode token to get user info
        payload = decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Deactivate session
        await sessions_collection.update_many(
            {"user_id": payload.get("user_id"), "access_token": token},
            {"$set": {"active": False}}
        )
        
        return {"success": True, "message": "Logged out successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return {"success": True, "message": "Logged out"}  # Always return success for logout

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token
    """
    try:
        payload = decode_token(refresh_token)
        if not payload or payload.get("typ") != "Refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        user = await users_collection.find_one({"user_id": payload.get("user_id")})
        if not user or not user.get("enabled", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or disabled"
            )
        
        # Create new tokens
        token_data = {
            "sub": user["email"],
            "user_id": user["user_id"],
            "username": user["username"],
            "tenant_id": user.get("tenant_id"),
            "roles": user.get("roles", []),
            "permissions": user.get("permissions", [])
        }
        
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token({"user_id": user["user_id"]})
        
        return Token(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=900,
            refresh_token=new_refresh_token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Refresh token error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Get current authenticated user info
    """
    try:
        payload = decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = await users_collection.find_one({"user_id": payload.get("user_id")})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Remove sensitive data
        if '_id' in user:
            del user['_id']
        if 'password_hash' in user:
            del user['password_hash']
        
        return UserResponse(**user)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
