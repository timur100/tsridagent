from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routes
from routes import auth, users

# Get configuration from environment
SERVICE_PORT = int(os.environ.get('SERVICE_PORT', 8100))
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'Auth & Identity Service')

# Create FastAPI app
app = FastAPI(
    title=SERVICE_NAME,
    description="Keycloak-compatible Auth & Identity Microservice for Multi-Tenant SaaS",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": SERVICE_NAME,
        "status": "running",
        "version": "1.0.0",
        "keycloak_compatible": True,
        "realm": os.environ.get('KEYCLOAK_REALM', 'tsrid')
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": SERVICE_NAME
    }

@app.get("/realms/{realm}/.well-known/openid-configuration")
async def openid_configuration(realm: str):
    """
    OpenID Connect Discovery endpoint (Keycloak-compatible)
    This allows future Keycloak integration
    """
    base_url = f"http://localhost:{SERVICE_PORT}"
    return {
        "issuer": f"{base_url}/realms/{realm}",
        "authorization_endpoint": f"{base_url}/realms/{realm}/protocol/openid-connect/auth",
        "token_endpoint": f"{base_url}/api/auth/login",
        "userinfo_endpoint": f"{base_url}/api/auth/me",
        "end_session_endpoint": f"{base_url}/api/auth/logout",
        "jwks_uri": f"{base_url}/realms/{realm}/protocol/openid-connect/certs",
        "response_types_supported": ["code", "token", "id_token"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256", "HS256"],
        "scopes_supported": ["openid", "profile", "email", "roles"]
    }

# Bootstrap: Create default admin user and realm on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database with default data"""
    try:
        from utils.db import users_collection, realms_collection, roles_collection
        from utils.security import get_password_hash
        from utils.keycloak_adapter import KeycloakRealm
        from datetime import datetime, timezone
        import uuid
        
        # Create default realm
        default_realm = await realms_collection.find_one({"realm": "tsrid"})
        if not default_realm:
            realm_doc = KeycloakRealm.create_realm("tsrid", "TSRID Platform")
            await realms_collection.insert_one(realm_doc)
            print("✅ Default realm 'tsrid' created")
        
        # Create default roles
        default_roles = ["admin", "employee", "customer", "manager"]
        for role_name in default_roles:
            existing_role = await roles_collection.find_one({"name": role_name})
            if not existing_role:
                role_doc = {
                    "role_id": str(uuid.uuid4()),
                    "name": role_name,
                    "description": f"{role_name.title()} role",
                    "permissions": [],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await roles_collection.insert_one(role_doc)
                print(f"✅ Role '{role_name}' created")
        
        # Create default admin user if not exists
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@tsrid.com')
        admin = await users_collection.find_one({"email": admin_email})
        
        if not admin:
            admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
            admin_doc = {
                "user_id": str(uuid.uuid4()),
                "username": "admin",
                "email": admin_email,
                "first_name": "System",
                "last_name": "Administrator",
                "password_hash": get_password_hash(admin_password),
                "tenant_id": None,
                "user_type": "admin",
                "roles": ["admin"],
                "permissions": ["*"],
                "enabled": True,
                "email_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "last_login": None,
                "attributes": {},
                "required_actions": []
            }
            await users_collection.insert_one(admin_doc)
            print(f"✅ Default admin user created: {admin_email}")
        
        print(f"✅ {SERVICE_NAME} initialized successfully")
    
    except Exception as e:
        print(f"❌ Startup error: {str(e)}")

if __name__ == "__main__":
    print(f"Starting {SERVICE_NAME} on port {SERVICE_PORT}...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=False
    )
