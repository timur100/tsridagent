from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

class SubscriptionLimits(BaseModel):
    """Resource limits for tenant subscription"""
    max_users: Optional[int] = 100
    max_devices: Optional[int] = 1000
    max_storage_gb: Optional[int] = 50
    max_api_calls_per_day: Optional[int] = 10000
    max_locations: Optional[int] = 10

class TenantContact(BaseModel):
    """Contact information for tenant"""
    admin_email: EmailStr
    phone: Optional[str] = None
    support_email: Optional[str] = None
    fax: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

class TenantAddress(BaseModel):
    """Detailed address information for tenant"""
    street: Optional[str] = None
    additional: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

class ContactPerson(BaseModel):
    """Contact person details"""
    name: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class TenantContactPersons(BaseModel):
    """All contact persons for tenant"""
    primary: Optional[ContactPerson] = None
    technical: Optional[ContactPerson] = None
    billing: Optional[ContactPerson] = None

class TenantTax(BaseModel):
    """Tax information for tenant"""
    vat_id: Optional[str] = None
    tax_number: Optional[str] = None

class TenantContract(BaseModel):
    """Contract information for tenant"""
    number: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notice_period: Optional[str] = None

class TenantPayment(BaseModel):
    """Payment information for tenant"""
    method: Optional[str] = None
    interval: Optional[str] = None

class TenantSubscription(BaseModel):
    """Subscription details for tenant"""
    monthly_cost: Optional[str] = None
    next_billing: Optional[str] = None
    auto_renewal: Optional[bool] = True

class TenantBase(BaseModel):
    name: str
    display_name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    
class TenantCreate(TenantBase):
    contact: TenantContact
    admin_password: str
    subscription_plan: Optional[str] = "basic"  # basic, pro, enterprise
    limits: Optional[SubscriptionLimits] = SubscriptionLimits()
    settings: Optional[Dict[str, Any]] = {}
    logo_url: Optional[str] = None
    
class TenantUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    status: Optional[str] = None  # active, suspended, trial, inactive
    contact: Optional[TenantContact] = None
    subscription_plan: Optional[str] = None
    limits: Optional[SubscriptionLimits] = None
    settings: Optional[Dict[str, Any]] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[TenantAddress] = None
    contact_person: Optional[TenantContactPersons] = None
    tax: Optional[TenantTax] = None
    contract: Optional[TenantContract] = None
    payment: Optional[TenantPayment] = None
    subscription: Optional[TenantSubscription] = None
    notes: Optional[str] = None
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    server_region: Optional[str] = None
    
class TenantResponse(TenantBase):
    tenant_id: str
    enabled: bool
    status: str  # active, suspended, trial, inactive
    contact: TenantContact
    subscription_plan: str
    limits: SubscriptionLimits
    settings: Dict[str, Any]
    logo_url: Optional[str]
    user_count: int
    device_count: int
    online_devices: Optional[int] = 0
    offline_devices: Optional[int] = 0
    location_count: Optional[int] = 0
    storage_used_gb: float
    api_calls_today: int
    created_at: str
    updated_at: str
    last_activity: Optional[str]

class TenantStats(BaseModel):
    """Statistics for tenants overview"""
    total_tenants: int
    active_tenants: int
    trial_tenants: int
    suspended_tenants: int
    total_users: int
    total_devices: int
    total_locations: int = 0
    online_devices: int = 0
    offline_devices: int = 0
    in_preparation: int = 0
    total_scans: int = 0
    correct_scans: int = 0
    unknown_scans: int = 0
    failed_scans: int = 0
