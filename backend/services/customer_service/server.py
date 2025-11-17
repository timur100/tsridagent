from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Customer Service",
    description="Microservice for customer management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'customer_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Models
class Customer(BaseModel):
    """Customer model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_number: str
    email: EmailStr
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[Dict[str, str]] = {}
    billing_address: Optional[Dict[str, str]] = {}
    customer_type: str = "individual"  # individual, business
    status: str = "active"  # active, inactive, suspended, blocked
    language: str = "de"
    currency: str = "EUR"
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomerCreate(BaseModel):
    """Create customer model"""
    email: EmailStr
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[Dict[str, str]] = {}
    billing_address: Optional[Dict[str, str]] = {}
    customer_type: str = "individual"
    status: str = "active"
    language: str = "de"
    currency: str = "EUR"
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}


class CustomerUpdate(BaseModel):
    """Update customer model"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[Dict[str, str]] = None
    billing_address: Optional[Dict[str, str]] = None
    customer_type: Optional[str] = None
    status: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Customer Service"}


@app.get("/info")
async def service_info():
    """Service information endpoint"""
    return {
        "service_name": "Customer Service",
        "version": "1.0.0",
        "description": "Microservice for customer management",
        "endpoints": [
            "/health",
            "/info",
            "/api/customers",
            "/api/customers/{customer_id}",
            "/api/customers/number/{customer_number}",
            "/api/customers/email/{email}",
            "/api/customers/search",
            "/api/customers/stats"
        ]
    }


# Customer Routes - Specific routes first
@app.get("/api/customers/stats")
async def get_customer_stats():
    """Get customer statistics"""
    try:
        total = await db.customers.count_documents({})
        active = await db.customers.count_documents({"status": "active"})
        inactive = await db.customers.count_documents({"status": "inactive"})
        suspended = await db.customers.count_documents({"status": "suspended"})
        blocked = await db.customers.count_documents({"status": "blocked"})
        
        # Customer type breakdown
        individual = await db.customers.count_documents({"customer_type": "individual"})
        business = await db.customers.count_documents({"customer_type": "business"})
        
        return {
            "total": total,
            "by_status": {
                "active": active,
                "inactive": inactive,
                "suspended": suspended,
                "blocked": blocked
            },
            "by_type": {
                "individual": individual,
                "business": business
            }
        }
    except Exception as e:
        logger.error(f"Error getting customer stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers/search")
async def search_customers(
    query: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=100)
):
    """Search customers by name, email, or company"""
    try:
        search_query = {
            "$or": [
                {"first_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"company_name": {"$regex": query, "$options": "i"}},
                {"customer_number": {"$regex": query, "$options": "i"}}
            ]
        }
        
        customers = await db.customers.find(search_query, {"_id": 0}).limit(limit).to_list(limit)
        
        # Parse datetime strings
        for customer in customers:
            if isinstance(customer.get('created_at'), str):
                customer['created_at'] = datetime.fromisoformat(customer['created_at'])
            if isinstance(customer.get('updated_at'), str):
                customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        
        return [Customer(**customer) for customer in customers]
    except Exception as e:
        logger.error(f"Error searching customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers/number/{customer_number}", response_model=Customer)
async def get_customer_by_number(customer_number: str):
    """Get a specific customer by customer number"""
    try:
        customer = await db.customers.find_one({"customer_number": customer_number}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Parse datetime strings
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        if isinstance(customer.get('updated_at'), str):
            customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        
        return Customer(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer by number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers/email/{email}", response_model=Customer)
async def get_customer_by_email(email: str):
    """Get a specific customer by email"""
    try:
        customer = await db.customers.find_one({"email": email}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Parse datetime strings
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        if isinstance(customer.get('updated_at'), str):
            customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        
        return Customer(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer by email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers", response_model=List[Customer])
async def get_customers(
    status: Optional[str] = None,
    customer_type: Optional[str] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get all customers with optional filters"""
    try:
        query = {}
        if status:
            query['status'] = status
        if customer_type:
            query['customer_type'] = customer_type
        
        customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Parse datetime strings
        for customer in customers:
            if isinstance(customer.get('created_at'), str):
                customer['created_at'] = datetime.fromisoformat(customer['created_at'])
            if isinstance(customer.get('updated_at'), str):
                customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        
        return [Customer(**customer) for customer in customers]
    except Exception as e:
        logger.error(f"Error getting customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/customers", response_model=Customer, status_code=201)
async def create_customer(customer: CustomerCreate):
    """Create a new customer"""
    try:
        # Check if email already exists
        existing = await db.customers.find_one({"email": customer.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Generate customer number (format: CUST-YYYYMMDD-XXXX)
        today = datetime.now(timezone.utc).strftime('%Y%m%d')
        prefix = f"CUST-{today}-"
        
        # Find highest customer number for today
        pipeline = [
            {"$match": {"customer_number": {"$regex": f"^{prefix}"}}},
            {"$project": {"customer_number": 1}},
            {"$sort": {"customer_number": -1}},
            {"$limit": 1}
        ]
        last_customer = await db.customers.aggregate(pipeline).to_list(1)
        
        if last_customer:
            last_num = int(last_customer[0]['customer_number'].split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        customer_number = f"{prefix}{new_num:04d}"
        
        new_customer = Customer(**customer.model_dump(), customer_number=customer_number)
        doc = new_customer.model_dump()
        
        # Convert datetime to ISO string
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.customers.insert_one(doc)
        logger.info(f"Created customer: {customer_number}")
        
        return new_customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    """Get a specific customer by ID"""
    try:
        customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Parse datetime strings
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        if isinstance(customer.get('updated_at'), str):
            customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        
        return Customer(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_update: CustomerUpdate):
    """Update a customer"""
    try:
        # Check if customer exists
        existing = await db.customers.find_one({"id": customer_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Prepare update data
        update_data = customer_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.customers.update_one({"id": customer_id}, {"$set": update_data})
        
        # Fetch updated customer
        updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        
        # Parse datetime strings
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        
        logger.info(f"Updated customer: {customer_id}")
        return Customer(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer"""
    try:
        result = await db.customers.delete_one({"id": customer_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        logger.info(f"Deleted customer: {customer_id}")
        return {"success": True, "message": "Customer deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('SERVICE_PORT', 8107))
    uvicorn.run(app, host="0.0.0.0", port=port)