"""
Helpdesk API - Security Document Verification & Technical Support
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os
import uuid
import hashlib

from db.connection import get_mongo_client

router = APIRouter(prefix="/api/helpdesk", tags=["Helpdesk"])

# Get database
db = get_mongo_client()['multi_tenant_admin']

# Collections
security_requests_collection = db['security_requests']
technical_tickets_collection = db['technical_tickets']
helpdesk_users_collection = db['helpdesk_users']
ticket_categories_collection = db['ticket_categories']

# ============ MODELS ============

class SecurityRequestCreate(BaseModel):
    tenant_id: str
    tenant_name: str
    location_code: str
    location_name: str
    device_id: str
    scan_image_url: str
    ocr_data: dict = {}
    document_type: str = "unknown"
    predefined_question_id: Optional[str] = None
    predefined_question_text: Optional[str] = None

class SecurityRequestUpdate(BaseModel):
    status: str  # pending, in_progress, approved, rejected
    handler_id: Optional[str] = None
    handler_name: Optional[str] = None
    notes: Optional[str] = None

class TechnicalTicketCreate(BaseModel):
    tenant_id: str
    tenant_name: str
    location_code: Optional[str] = None
    location_name: Optional[str] = None
    device_id: Optional[str] = None
    category_id: str
    category_name: str
    priority: str = "medium"  # low, medium, high, critical
    subject: str
    description: str
    reporter_name: Optional[str] = None

class TechnicalTicketUpdate(BaseModel):
    status: Optional[str] = None  # open, in_progress, resolved, closed
    priority: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    resolution: Optional[str] = None

class HelpdeskUserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = None
    role: str = "agent"  # agent, supervisor, admin, tenant_security
    departments: List[str] = ["security", "technical"]
    tenant_id: Optional[str] = None  # For tenant_security role - restricts to own tenant
    tenant_name: Optional[str] = None

class HelpdeskUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    departments: Optional[List[str]] = None
    is_active: Optional[bool] = None
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None

class EscalationCreate(BaseModel):
    escalated_by_id: str
    escalated_by_name: str
    reason: Optional[str] = None

class DatabaseAdditionRequest(BaseModel):
    tenant_id: str
    tenant_name: str
    location_code: str
    location_name: str
    device_id: str
    scan_image_url: str
    ocr_data: dict = {}
    document_type: str = "unknown"
    scan_attempts: int = 2  # Number of times scanned before requesting addition

class TicketCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True

# ============ PREDEFINED QUESTIONS ============

PREDEFINED_QUESTIONS = [
    {"id": "q1", "text": "Dokument ist beschädigt oder unleserlich", "category": "quality"},
    {"id": "q2", "text": "Hologramm/Sicherheitsmerkmale nicht erkennbar", "category": "security"},
    {"id": "q3", "text": "Foto stimmt nicht mit Person überein", "category": "identity"},
    {"id": "q4", "text": "Dokument möglicherweise abgelaufen", "category": "validity"},
    {"id": "q5", "text": "Verdacht auf Fälschung", "category": "fraud"},
    {"id": "q6", "text": "Unbekannter Dokumenttyp", "category": "type"},
    {"id": "q7", "text": "Zusätzliche Prüfung erforderlich", "category": "general"},
    {"id": "q8", "text": "Daten nicht lesbar / OCR fehlgeschlagen", "category": "technical"},
]

@router.get("/predefined-questions")
async def get_predefined_questions():
    """Get list of predefined questions for security requests"""
    return {"success": True, "questions": PREDEFINED_QUESTIONS}

# ============ SECURITY REQUESTS ============

@router.post("/security/requests")
async def create_security_request(request: SecurityRequestCreate):
    """Create a new security verification request"""
    request_id = str(uuid.uuid4())
    
    doc = {
        "request_id": request_id,
        "tenant_id": request.tenant_id,
        "tenant_name": request.tenant_name,
        "location_code": request.location_code,
        "location_name": request.location_name,
        "device_id": request.device_id,
        "scan_image_url": request.scan_image_url,
        "ocr_data": request.ocr_data,
        "document_type": request.document_type,
        "predefined_question_id": request.predefined_question_id,
        "predefined_question_text": request.predefined_question_text,
        "status": "pending",
        "handler_id": None,
        "handler_name": None,
        "handler_tenant_id": None,  # Track which tenant is handling
        "notes": None,
        "result": None,  # approved, rejected
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "accepted_at": None,
        "resolved_at": None,
        # Escalation fields
        "is_escalated": False,
        "escalated_at": None,
        "escalated_by_id": None,
        "escalated_by_name": None,
        "escalation_reason": None
    }
    
    security_requests_collection.insert_one(doc)
    
    # Remove MongoDB _id for response
    doc.pop('_id', None)
    
    return {"success": True, "request_id": request_id, "request": doc}

@router.get("/security/requests")
async def get_security_requests(
    status: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """Get security requests with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    requests = list(security_requests_collection.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    
    # Count by status
    pending_count = security_requests_collection.count_documents({"status": "pending"})
    in_progress_count = security_requests_collection.count_documents({"status": "in_progress"})
    
    return {
        "success": True,
        "requests": requests,
        "total": len(requests),
        "pending_count": pending_count,
        "in_progress_count": in_progress_count
    }

@router.get("/security/requests/{request_id}")
async def get_security_request(request_id: str):
    """Get a specific security request"""
    request = security_requests_collection.find_one(
        {"request_id": request_id},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"success": True, "request": request}

@router.put("/security/requests/{request_id}")
async def update_security_request(request_id: str, update: SecurityRequestUpdate):
    """Update a security request (accept, approve, reject)"""
    request = security_requests_collection.find_one({"request_id": request_id})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_doc = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if update.handler_id:
        update_doc["handler_id"] = update.handler_id
        update_doc["handler_name"] = update.handler_name
    
    if update.notes:
        update_doc["notes"] = update.notes
    
    # Set timestamps based on status
    if update.status == "in_progress" and request.get("status") == "pending":
        update_doc["accepted_at"] = datetime.now(timezone.utc)
    
    if update.status in ["approved", "rejected"]:
        update_doc["result"] = update.status
        update_doc["resolved_at"] = datetime.now(timezone.utc)
    
    security_requests_collection.update_one(
        {"request_id": request_id},
        {"$set": update_doc}
    )
    
    updated_request = security_requests_collection.find_one(
        {"request_id": request_id},
        {"_id": 0}
    )
    
    return {"success": True, "request": updated_request}

# ============ TENANT-SPECIFIC SECURITY ============

@router.get("/security/tenant/{tenant_id}/requests")
async def get_tenant_security_requests(
    tenant_id: str,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """Get security requests for a specific tenant only"""
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    
    requests = list(security_requests_collection.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    
    # Count by status for this tenant
    base_query = {"tenant_id": tenant_id}
    pending_count = security_requests_collection.count_documents({**base_query, "status": "pending"})
    in_progress_count = security_requests_collection.count_documents({**base_query, "status": "in_progress"})
    escalated_count = security_requests_collection.count_documents({**base_query, "is_escalated": True, "status": {"$nin": ["approved", "rejected"]}})
    
    return {
        "success": True,
        "requests": requests,
        "total": len(requests),
        "pending_count": pending_count,
        "in_progress_count": in_progress_count,
        "escalated_count": escalated_count,
        "tenant_id": tenant_id
    }

@router.get("/security/tenant/{tenant_id}/wallboard")
async def get_tenant_wallboard_data(tenant_id: str):
    """Get wallboard data for a specific tenant"""
    base_query = {"tenant_id": tenant_id}
    
    # Get pending requests for this tenant
    pending = list(security_requests_collection.find(
        {**base_query, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20))
    
    # Get in-progress requests for this tenant
    in_progress = list(security_requests_collection.find(
        {**base_query, "status": "in_progress"},
        {"_id": 0}
    ).sort("accepted_at", -1).limit(10))
    
    # Statistics for this tenant
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_stats = {
        "total": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}}),
        "approved": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}, "result": "approved"}),
        "rejected": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}, "result": "rejected"}),
        "pending": security_requests_collection.count_documents({**base_query, "status": "pending"}),
        "in_progress": security_requests_collection.count_documents({**base_query, "status": "in_progress"}),
        "escalated": security_requests_collection.count_documents({**base_query, "is_escalated": True, "status": {"$nin": ["approved", "rejected"]}})
    }
    
    return {
        "success": True,
        "pending": pending,
        "in_progress": in_progress,
        "stats": today_stats,
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============ ESCALATION ============

@router.post("/security/requests/{request_id}/escalate")
async def escalate_security_request(request_id: str, escalation: EscalationCreate):
    """Escalate a security request to TSRID (service provider)"""
    request = security_requests_collection.find_one({"request_id": request_id})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("is_escalated"):
        raise HTTPException(status_code=400, detail="Request already escalated")
    
    update_doc = {
        "is_escalated": True,
        "escalated_at": datetime.now(timezone.utc),
        "escalated_by_id": escalation.escalated_by_id,
        "escalated_by_name": escalation.escalated_by_name,
        "escalation_reason": escalation.reason,
        "updated_at": datetime.now(timezone.utc)
    }
    
    security_requests_collection.update_one(
        {"request_id": request_id},
        {"$set": update_doc}
    )
    
    updated_request = security_requests_collection.find_one(
        {"request_id": request_id},
        {"_id": 0}
    )
    
    return {"success": True, "request": updated_request, "message": "Request escalated to TSRID"}

@router.get("/security/escalated")
async def get_escalated_requests(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """Get all escalated security requests (for TSRID service provider view)"""
    query = {"is_escalated": True}
    if status:
        query["status"] = status
    
    requests = list(security_requests_collection.find(
        query, 
        {"_id": 0}
    ).sort("escalated_at", -1).limit(limit))
    
    # Count escalated by status
    pending_escalated = security_requests_collection.count_documents({"is_escalated": True, "status": "pending"})
    in_progress_escalated = security_requests_collection.count_documents({"is_escalated": True, "status": "in_progress"})
    
    return {
        "success": True,
        "requests": requests,
        "total": len(requests),
        "pending_escalated": pending_escalated,
        "in_progress_escalated": in_progress_escalated
    }

@router.get("/security/wallboard")
async def get_wallboard_data(tenant_id: Optional[str] = None):
    """Get data for wallboard display - TSRID sees all, tenant sees own"""
    base_query = {}
    if tenant_id:
        base_query["tenant_id"] = tenant_id
    
    # Get pending requests (newest first)
    pending = list(security_requests_collection.find(
        {**base_query, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20))
    
    # Get in-progress requests
    in_progress = list(security_requests_collection.find(
        {**base_query, "status": "in_progress"},
        {"_id": 0}
    ).sort("accepted_at", -1).limit(10))
    
    # Get escalated requests (only for TSRID view - no tenant_id filter)
    escalated = []
    if not tenant_id:
        escalated = list(security_requests_collection.find(
            {"is_escalated": True, "status": {"$nin": ["approved", "rejected"]}},
            {"_id": 0}
        ).sort("escalated_at", -1).limit(10))
    
    # Get recent resolved (last hour)
    from datetime import timedelta
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_resolved = list(security_requests_collection.find(
        {
            **base_query,
            "status": {"$in": ["approved", "rejected"]},
            "resolved_at": {"$gte": one_hour_ago}
        },
        {"_id": 0}
    ).sort("resolved_at", -1).limit(10))
    
    # Statistics
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_stats = {
        "total": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}}),
        "approved": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}, "result": "approved"}),
        "rejected": security_requests_collection.count_documents({**base_query, "created_at": {"$gte": today_start}, "result": "rejected"}),
        "pending": security_requests_collection.count_documents({**base_query, "status": "pending"}),
        "in_progress": security_requests_collection.count_documents({**base_query, "status": "in_progress"}),
        "escalated": security_requests_collection.count_documents({"is_escalated": True, "status": {"$nin": ["approved", "rejected"]}}) if not tenant_id else 0
    }
    
    return {
        "success": True,
        "pending": pending,
        "in_progress": in_progress,
        "escalated": escalated,
        "recent_resolved": recent_resolved,
        "stats": today_stats,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============ TECHNICAL TICKETS ============

@router.post("/tickets")
async def create_technical_ticket(ticket: TechnicalTicketCreate):
    """Create a new technical support ticket"""
    ticket_id = str(uuid.uuid4())
    ticket_number = f"TKT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    doc = {
        "ticket_id": ticket_id,
        "ticket_number": ticket_number,
        "tenant_id": ticket.tenant_id,
        "tenant_name": ticket.tenant_name,
        "location_code": ticket.location_code,
        "location_name": ticket.location_name,
        "device_id": ticket.device_id,
        "category_id": ticket.category_id,
        "category_name": ticket.category_name,
        "priority": ticket.priority,
        "subject": ticket.subject,
        "description": ticket.description,
        "reporter_name": ticket.reporter_name,
        "status": "open",
        "assigned_to_id": None,
        "assigned_to_name": None,
        "resolution": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "resolved_at": None
    }
    
    technical_tickets_collection.insert_one(doc)
    doc.pop('_id', None)
    
    return {"success": True, "ticket_id": ticket_id, "ticket_number": ticket_number, "ticket": doc}

@router.get("/tickets")
async def get_technical_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    tenant_id: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """Get technical tickets with filters"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if tenant_id:
        query["tenant_id"] = tenant_id
    if category_id:
        query["category_id"] = category_id
    
    tickets = list(technical_tickets_collection.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    
    # Counts
    open_count = technical_tickets_collection.count_documents({"status": "open"})
    in_progress_count = technical_tickets_collection.count_documents({"status": "in_progress"})
    
    return {
        "success": True,
        "tickets": tickets,
        "total": len(tickets),
        "open_count": open_count,
        "in_progress_count": in_progress_count
    }

@router.get("/tickets/{ticket_id}")
async def get_technical_ticket(ticket_id: str):
    """Get a specific ticket"""
    ticket = technical_tickets_collection.find_one(
        {"ticket_id": ticket_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True, "ticket": ticket}

@router.put("/tickets/{ticket_id}")
async def update_technical_ticket(ticket_id: str, update: TechnicalTicketUpdate):
    """Update a technical ticket"""
    ticket = technical_tickets_collection.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_doc = {"updated_at": datetime.now(timezone.utc)}
    
    if update.status:
        update_doc["status"] = update.status
        if update.status in ["resolved", "closed"]:
            update_doc["resolved_at"] = datetime.now(timezone.utc)
    
    if update.priority:
        update_doc["priority"] = update.priority
    
    if update.assigned_to_id:
        update_doc["assigned_to_id"] = update.assigned_to_id
        update_doc["assigned_to_name"] = update.assigned_to_name
    
    if update.resolution:
        update_doc["resolution"] = update.resolution
    
    technical_tickets_collection.update_one(
        {"ticket_id": ticket_id},
        {"$set": update_doc}
    )
    
    updated_ticket = technical_tickets_collection.find_one(
        {"ticket_id": ticket_id},
        {"_id": 0}
    )
    
    return {"success": True, "ticket": updated_ticket}

# ============ HELPDESK USERS ============

def hash_password(password: str) -> str:
    """Hash password with SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/users")
async def create_helpdesk_user(user: HelpdeskUserCreate):
    """Create a new helpdesk user"""
    # Check if username exists
    existing = helpdesk_users_collection.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = str(uuid.uuid4())
    
    doc = {
        "user_id": user_id,
        "username": user.username,
        "password_hash": hash_password(user.password),
        "name": user.name,
        "email": user.email,
        "role": user.role,  # agent, supervisor, admin, tenant_security
        "departments": user.departments,
        "tenant_id": user.tenant_id,  # For tenant_security role
        "tenant_name": user.tenant_name,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    helpdesk_users_collection.insert_one(doc)
    doc.pop('_id', None)
    doc.pop('password_hash', None)
    
    return {"success": True, "user_id": user_id, "user": doc}

@router.get("/users")
async def get_helpdesk_users():
    """Get all helpdesk users"""
    users = list(helpdesk_users_collection.find(
        {},
        {"_id": 0, "password_hash": 0}
    ))
    
    return {"success": True, "users": users, "total": len(users)}

@router.get("/users/{user_id}")
async def get_helpdesk_user(user_id: str):
    """Get a specific helpdesk user"""
    user = helpdesk_users_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "user": user}

@router.put("/users/{user_id}")
async def update_helpdesk_user(user_id: str, update: HelpdeskUserUpdate):
    """Update a helpdesk user"""
    user = helpdesk_users_collection.find_one({"user_id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_doc = {}
    if update.name is not None:
        update_doc["name"] = update.name
    if update.email is not None:
        update_doc["email"] = update.email
    if update.role is not None:
        update_doc["role"] = update.role
    if update.departments is not None:
        update_doc["departments"] = update.departments
    if update.is_active is not None:
        update_doc["is_active"] = update.is_active
    
    if update_doc:
        helpdesk_users_collection.update_one(
            {"user_id": user_id},
            {"$set": update_doc}
        )
    
    updated_user = helpdesk_users_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    
    return {"success": True, "user": updated_user}

@router.delete("/users/{user_id}")
async def delete_helpdesk_user(user_id: str):
    """Delete a helpdesk user"""
    result = helpdesk_users_collection.delete_one({"user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User deleted"}

@router.post("/users/login")
async def helpdesk_login(username: str, password: str):
    """Login for helpdesk users"""
    user = helpdesk_users_collection.find_one({
        "username": username,
        "password_hash": hash_password(password),
        "is_active": True
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    helpdesk_users_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return {
        "success": True,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "departments": user["departments"],
            "tenant_id": user.get("tenant_id"),
            "tenant_name": user.get("tenant_name")
        }
    }

# ============ TICKET CATEGORIES ============

@router.post("/categories")
async def create_ticket_category(category: TicketCategoryCreate):
    """Create a new ticket category"""
    category_id = str(uuid.uuid4())
    
    doc = {
        "category_id": category_id,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "is_active": category.is_active,
        "created_at": datetime.now(timezone.utc)
    }
    
    ticket_categories_collection.insert_one(doc)
    doc.pop('_id', None)
    
    return {"success": True, "category_id": category_id, "category": doc}

@router.get("/categories")
async def get_ticket_categories():
    """Get all ticket categories"""
    categories = list(ticket_categories_collection.find(
        {"is_active": True},
        {"_id": 0}
    ))
    
    return {"success": True, "categories": categories, "total": len(categories)}

@router.put("/categories/{category_id}")
async def update_ticket_category(category_id: str, name: Optional[str] = None, description: Optional[str] = None, icon: Optional[str] = None, is_active: Optional[bool] = None):
    """Update a ticket category"""
    update_doc = {}
    if name is not None:
        update_doc["name"] = name
    if description is not None:
        update_doc["description"] = description
    if icon is not None:
        update_doc["icon"] = icon
    if is_active is not None:
        update_doc["is_active"] = is_active
    
    if update_doc:
        ticket_categories_collection.update_one(
            {"category_id": category_id},
            {"$set": update_doc}
        )
    
    updated_category = ticket_categories_collection.find_one(
        {"category_id": category_id},
        {"_id": 0}
    )
    
    return {"success": True, "category": updated_category}

@router.delete("/categories/{category_id}")
async def delete_ticket_category(category_id: str):
    """Delete a ticket category (soft delete)"""
    ticket_categories_collection.update_one(
        {"category_id": category_id},
        {"$set": {"is_active": False}}
    )
    
    return {"success": True, "message": "Category deactivated"}

# ============ SEED DEFAULT DATA ============

@router.post("/seed-defaults")
async def seed_default_data():
    """Seed default helpdesk users and categories"""
    
    # Default helpdesk user
    if helpdesk_users_collection.count_documents({}) == 0:
        default_user = {
            "user_id": str(uuid.uuid4()),
            "username": "helpdesk",
            "password_hash": hash_password("helpdesk123"),
            "name": "Helpdesk Agent",
            "email": "helpdesk@tsrid.com",
            "role": "agent",
            "departments": ["security", "technical"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        }
        helpdesk_users_collection.insert_one(default_user)
    
    # Default categories
    if ticket_categories_collection.count_documents({}) == 0:
        default_categories = [
            {"category_id": str(uuid.uuid4()), "name": "Hardware", "description": "Scanner, Drucker, Geräte", "icon": "monitor", "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"category_id": str(uuid.uuid4()), "name": "Software", "description": "App-Fehler, Login-Probleme", "icon": "code", "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"category_id": str(uuid.uuid4()), "name": "Netzwerk", "description": "Verbindungsprobleme", "icon": "wifi", "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"category_id": str(uuid.uuid4()), "name": "Sonstiges", "description": "Andere Anfragen", "icon": "help-circle", "is_active": True, "created_at": datetime.now(timezone.utc)},
        ]
        ticket_categories_collection.insert_many(default_categories)
    
    return {"success": True, "message": "Default data seeded"}
