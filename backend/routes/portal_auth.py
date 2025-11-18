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
        
        return {
            "success": True,
            "message": "Registrierung erfolgreich eingereicht. Bitte warten Sie auf die Genehmigung durch einen Administrator.",
            "status": "pending"
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
        user = auth_db.users.find_one({"email": request.email})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password - support both password_hash and hashed_password
        password_field = user.get('password_hash') or user.get('hashed_password')
        if not password_field or not verify_password(request.password, password_field):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is active
        if not user.get('enabled', True) and not user.get('is_active', True):
            raise HTTPException(status_code=401, detail="User account is deactivated")
        
        # Create token with customer_id
        access_token = create_access_token(
            data={
                "sub": request.email, 
                "role": user['role'],
                "customer_id": user.get('customer_id')  # Add customer_id to JWT
            }
        )
        
        # Prepare user response - support both auth_db and portal_db formats
        user_response = {
            "id": user.get("id") or user.get("user_id"),
            "email": user["email"],
            "name": user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user["email"],
            "company": user.get("company") or user.get("attributes", {}).get("company"),
            "role": user.get("role") or (user.get("roles", ["user"])[0] if user.get("roles") else "user"),
            "is_active": user.get("is_active") or user.get("enabled", True),
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
        user = auth_db.users.find_one({"email": email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare user response - support both auth_db and portal_db formats
        user_response = {
            "id": user.get("id") or user.get("user_id"),
            "email": user["email"],
            "name": user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user["email"],
            "company": user.get("company") or user.get("attributes", {}).get("company"),
            "role": user.get("role") or (user.get("roles", ["user"])[0] if user.get("roles") else "user"),
            "is_active": user.get("is_active") or user.get("enabled", True),
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
        customer = auth_db.users.find_one({"email": request.customer_email})
        
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


# Registration management endpoints
@router.get("/registrations")
async def get_registrations(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all pending registrations (Admin only)"""
    try:
        token = credentials.credentials
        token_data = verify_token(token)
        
        # Get all registrations
        registrations = list(portal_db.registrations.find({}, {"_id": 0}))
        
        return registrations
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching registrations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ApproveRegistrationRequest(BaseModel):
    registration_id: str
    tenant_id: str  # Assign user to a tenant

@router.post("/registrations/approve")
async def approve_registration(
    request: ApproveRegistrationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve a registration and create user account (Admin only)"""
    try:
        token = credentials.credentials
        token_data = verify_token(token)
        admin_email = token_data.get("sub")
        
        # Get registration
        registration = portal_db.registrations.find_one(
            {"registration_id": request.registration_id, "status": "pending"}
        )
        
        if not registration:
            raise HTTPException(status_code=404, detail="Registration not found or already processed")
        
        # Create user in auth_db
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        new_user = {
            "user_id": user_id,
            "username": registration["email"].split("@")[0],
            "email": registration["email"],
            "first_name": registration["name"].split()[0] if registration["name"] else "",
            "last_name": " ".join(registration["name"].split()[1:]) if len(registration["name"].split()) > 1 else "",
            "password_hash": registration["hashed_password"],
            "tenant_ids": [request.tenant_id],
            "user_type": "customer",
            "roles": ["user"],  # Minimal permissions
            "permissions": ["profile.read", "profile.write", "orders.read"],
            "phone": registration.get("phone"),
            "position": None,
            "department": None,
            "status": "active",
            "enabled": True,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
            "attributes": {
                "company": registration.get("company")
            }
        }
        
        auth_db.users.insert_one(new_user)
        
        # Update registration status
        portal_db.registrations.update_one(
            {"registration_id": request.registration_id},
            {
                "$set": {
                    "status": "approved",
                    "approved_by": admin_email,
                    "approved_at": now,
                    "user_id": user_id
                }
            }
        )
        
        # TODO: Send email notification to user
        # send_email(
        #     to=registration["email"],
        #     subject="Ihr Account wurde genehmigt",
        #     body=f"Hallo {registration['name']},\n\nIhr Account wurde genehmigt. Sie können sich jetzt einloggen."
        # )
        
        return {
            "success": True,
            "message": "Registrierung genehmigt und Benutzer erstellt",
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error approving registration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class RejectRegistrationRequest(BaseModel):
    registration_id: str
    reason: Optional[str] = None

@router.post("/registrations/reject")
async def reject_registration(
    request: RejectRegistrationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reject a registration (Admin only)"""
    try:
        token = credentials.credentials
        token_data = verify_token(token)
        admin_email = token_data.get("sub")
        
        # Get registration
        registration = portal_db.registrations.find_one(
            {"registration_id": request.registration_id, "status": "pending"}
        )
        
        if not registration:
            raise HTTPException(status_code=404, detail="Registration not found or already processed")
        
        # Update registration status
        now = datetime.now(timezone.utc).isoformat()
        portal_db.registrations.update_one(
            {"registration_id": request.registration_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_by": admin_email,
                    "rejected_at": now,
                    "rejection_reason": request.reason
                }
            }
        )
        
        # TODO: Send email notification to user
        # send_email(
        #     to=registration["email"],
        #     subject="Ihre Registrierung wurde abgelehnt",
        #     body=f"Hallo {registration['name']},\n\nLeider wurde Ihre Registrierung abgelehnt."
        # )
        
        return {
            "success": True,
            "message": "Registrierung abgelehnt"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error rejecting registration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

