"""
Tenant Context Middleware
Automatically adds customer_id filtering to all database queries
"""
from fastapi import Request, HTTPException
from typing import Optional
import jwt
import os

MULTI_TENANCY_ENABLED = os.getenv('MULTI_TENANCY_ENABLED', 'false').lower() == 'true'

class TenantContext:
    """Thread-local tenant context"""
    _customer_id: Optional[str] = None
    _role: Optional[str] = None
    _is_super_admin: bool = False
    
    @classmethod
    def set_context(cls, customer_id: Optional[str], role: str):
        cls._customer_id = customer_id
        cls._role = role
        cls._is_super_admin = (role == 'super_admin')
    
    @classmethod
    def get_customer_id(cls) -> Optional[str]:
        """Get current customer_id, None for super_admin"""
        if cls._is_super_admin:
            return None  # Super admin sees all
        return cls._customer_id
    
    @classmethod
    def is_super_admin(cls) -> bool:
        return cls._is_super_admin
    
    @classmethod
    def clear(cls):
        cls._customer_id = None
        cls._role = None
        cls._is_super_admin = False

def get_tenant_filter() -> dict:
    """
    Get MongoDB filter for current tenant
    Returns empty dict for super_admin or when multi-tenancy disabled
    """
    if not MULTI_TENANCY_ENABLED:
        return {}
    
    customer_id = TenantContext.get_customer_id()
    if customer_id is None:
        # Super admin or no context
        return {}
    
    return {"customer_id": customer_id}

def add_tenant_id(data: dict) -> dict:
    """
    Add customer_id to data for insert/update operations
    """
    if not MULTI_TENANCY_ENABLED:
        return data
    
    customer_id = TenantContext.get_customer_id()
    if customer_id:
        data["customer_id"] = customer_id
    
    return data

async def tenant_middleware(request: Request, call_next):
    """
    Middleware to extract tenant context from JWT token
    """
    try:
        # Extract JWT from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            # Decode token (simplified - use your actual JWT secret)
            try:
                payload = jwt.decode(
                    token, 
                    os.getenv('JWT_SECRET_KEY', 'your-secret-key'),
                    algorithms=['HS256']
                )
                
                customer_id = payload.get('customer_id')
                role = payload.get('role', 'employee')
                
                TenantContext.set_context(customer_id, role)
            except:
                # Invalid token, clear context
                TenantContext.clear()
        else:
            # No token, clear context
            TenantContext.clear()
        
        response = await call_next(request)
        return response
    
    finally:
        # Always clear context after request
        TenantContext.clear()

# Helper functions for routes
def require_customer_context():
    """Decorator to require customer context"""
    customer_id = TenantContext.get_customer_id()
    if customer_id is None and not TenantContext.is_super_admin():
        raise HTTPException(status_code=403, detail="Customer context required")
    return customer_id

def get_current_customer_id() -> Optional[str]:
    """Get current customer ID or None for super admin"""
    return TenantContext.get_customer_id()
