from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
import os
import uuid

router = APIRouter(prefix="/api/portal/auth", tags=["Portal Auth"])

# MongoDB connection - Use auth_db from auth service
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
auth_db = mongo_client['auth_db']  # Use auth_db for users
portal_db = mongo_client['portal_db']  # Keep for portal-specific data

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: str
    role: str = "customer"  # customer or admin

class ImpersonateRequest(BaseModel):
    customer_email: EmailStr

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """Register a new portal user"""
    try:
        # Check if user exists
        existing_user = auth_db.users.find_one({"email": request.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Hash password
        hashed_password = hash_password(request.password)
        
        # Create user
        user = {
            "id": str(uuid.uuid4()),
            "email": request.email,
            "hashed_password": hashed_password,
            "name": request.name,
            "company": request.company,
            "role": request.role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        
        # Store registration request in portal_db for admin approval
        registration = {
            "registration_id": str(uuid.uuid4()),
            "name": request.name,
            "email": request.email,
            "company": request.company,
            "phone": request.phone,
            "role": "user",  # Default role with minimal permissions
            "status": "pending",  # pending, approved, rejected
            "hashed_password": user["hashed_password"],  # Store for later user creation
            "created_at": user["created_at"],
            "approved_by": None,
            "approved_at": None
        }
        portal_db.registrations.insert_one(registration)
        
        # Create token with customer_id
        access_token = create_access_token(
            data={
                "sub": request.email, 
                "role": request.role,
                "customer_id": user.get("customer_id")
            }
        )
        
        # Remove password from response
        user_response = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "company": user["company"],
            "role": user["role"],
            "is_active": user["is_active"],
            "shop_enabled": user.get("shop_enabled", False)
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login to portal"""
    try:
        # Find user in MongoDB
        user = db.portal_users.find_one({"email": request.email})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not verify_password(request.password, user['hashed_password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is active
        if not user.get('is_active', True):
            raise HTTPException(status_code=401, detail="User account is deactivated")
        
        # Create token with customer_id
        access_token = create_access_token(
            data={
                "sub": request.email, 
                "role": user['role'],
                "customer_id": user.get('customer_id')  # Add customer_id to JWT
            }
        )
        
        # Prepare user response
        user_response = {
            "id": user.get("id"),
            "email": user["email"],
            "name": user["name"],
            "company": user["company"],
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "shop_enabled": user.get("shop_enabled", False)
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    """Get current user info"""
    try:
        email = token_data.get("sub")
        user = db.portal_users.find_one({"email": email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare user response
        user_response = {
            "id": user.get("id"),
            "email": user["email"],
            "name": user["name"],
            "company": user["company"],
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "shop_enabled": user.get("shop_enabled", False)
        }
        
        return {"success": True, "user": user_response}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(token_data: dict = Depends(verify_token)):
    """Logout (client should delete token)"""
    return {"success": True, "message": "Logged out successfully"}

@router.post("/impersonate", response_model=LoginResponse)
async def impersonate_customer(request: ImpersonateRequest, token_data: dict = Depends(verify_token)):
    """
    Admin can impersonate a customer
    Creates a token that looks like it's from the customer
    ⚠️ Only for admin role
    """
    try:
        # Verify admin role
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can impersonate customers")
        
        # Find customer
        customer = db.portal_users.find_one({"email": request.customer_email})
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        if customer.get("role") != "customer":
            raise HTTPException(status_code=400, detail="Can only impersonate customer accounts")
        
        # Create impersonation token
        # ⚠️ IMPORTANT: Token looks like it's from the customer
        # But contains hidden field for audit logging
        access_token = create_access_token(
            data={
                "sub": customer["email"],
                "role": customer["role"],
                "customer_id": customer.get("customer_id"),
                "impersonated_by": token_data.get("sub"),  # Hidden: admin email
                "is_impersonation": True  # Hidden flag
            }
        )
        
        # Prepare customer response
        customer_response = {
            "id": customer.get("id"),
            "email": customer["email"],
            "name": customer["name"],
            "company": customer["company"],
            "role": customer["role"],
            "is_active": customer.get("is_active", True),
            "shop_enabled": customer.get("shop_enabled", False)
        }
        
        # Log impersonation (only visible in admin logs)
        db.impersonation_logs.insert_one({
            "admin_email": token_data.get("sub"),
            "customer_email": customer["email"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "impersonation_started"
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": customer_response
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Impersonation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
