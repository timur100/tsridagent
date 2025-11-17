from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portal/services", tags=["services-config"])

# Import database
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class ServiceConfig(BaseModel):
    """Service configuration model"""
    model_config = ConfigDict(extra="ignore")
    
    service_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_name: str
    service_type: str  # "id_verification", "inventory", "portal", "tickets"
    base_url: str
    api_key: Optional[str] = None
    enabled: bool = True
    health_check_url: Optional[str] = None
    description: Optional[str] = None
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceConfigCreate(BaseModel):
    """Create service configuration"""
    service_name: str
    service_type: str
    base_url: str
    api_key: Optional[str] = None
    enabled: bool = True
    health_check_url: Optional[str] = None
    description: Optional[str] = None
    settings: Dict[str, Any] = {}


class ServiceHealthResponse(BaseModel):
    """Service health check response"""
    service_id: str
    service_name: str
    status: str  # "healthy", "unhealthy", "unknown"
    response_time_ms: Optional[float] = None
    last_checked: datetime
    error: Optional[str] = None


@router.post("", response_model=ServiceConfig, status_code=201)
async def create_service_config(config: ServiceConfigCreate):
    """Create a new service configuration"""
    try:
        service = ServiceConfig(**config.model_dump())
        
        doc = service.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.service_configs.insert_one(doc)
        
        logger.info(f"Created service config: {service.service_name}")
        return service
        
    except Exception as e:
        logger.error(f"Error creating service config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[ServiceConfig])
async def get_service_configs():
    """Get all service configurations"""
    try:
        configs = await db.service_configs.find({}, {"_id": 0}).to_list(100)
        
        for config in configs:
            if isinstance(config.get('created_at'), str):
                config['created_at'] = datetime.fromisoformat(config['created_at'])
            if isinstance(config.get('updated_at'), str):
                config['updated_at'] = datetime.fromisoformat(config['updated_at'])
        
        return [ServiceConfig(**config) for config in configs]
        
    except Exception as e:
        logger.error(f"Error fetching service configs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{service_id}", response_model=ServiceConfig)
async def get_service_config(service_id: str):
    """Get a single service configuration"""
    try:
        config = await db.service_configs.find_one({"service_id": service_id}, {"_id": 0})
        
        if not config:
            raise HTTPException(status_code=404, detail="Service not found")
        
        if isinstance(config.get('created_at'), str):
            config['created_at'] = datetime.fromisoformat(config['created_at'])
        if isinstance(config.get('updated_at'), str):
            config['updated_at'] = datetime.fromisoformat(config['updated_at'])
        
        return ServiceConfig(**config)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching service config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{service_id}", response_model=ServiceConfig)
async def update_service_config(service_id: str, config: ServiceConfigCreate):
    """Update a service configuration"""
    try:
        # Check if exists
        existing = await db.service_configs.find_one({"service_id": service_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Update
        update_doc = config.model_dump()
        update_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.service_configs.update_one(
            {"service_id": service_id},
            {"$set": update_doc}
        )
        
        # Fetch updated
        updated = await db.service_configs.find_one({"service_id": service_id}, {"_id": 0})
        
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        
        logger.info(f"Updated service config: {service_id}")
        return ServiceConfig(**updated)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating service config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{service_id}")
async def delete_service_config(service_id: str):
    """Delete a service configuration"""
    try:
        result = await db.service_configs.delete_one({"service_id": service_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Service not found")
        
        logger.info(f"Deleted service config: {service_id}")
        return {"message": "Service deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting service config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{service_id}/health", response_model=ServiceHealthResponse)
async def check_service_health(service_id: str):
    """Check health of a specific service"""
    try:
        config = await db.service_configs.find_one({"service_id": service_id}, {"_id": 0})
        
        if not config:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Perform health check
        health_url = config.get('health_check_url') or f"{config['base_url']}/health"
        
        start_time = datetime.now()
        status = "unknown"
        error = None
        response_time = None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_url)
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                if response.status_code == 200:
                    status = "healthy"
                else:
                    status = "unhealthy"
                    error = f"HTTP {response.status_code}"
        except Exception as e:
            status = "unhealthy"
            error = str(e)
            response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ServiceHealthResponse(
            service_id=service_id,
            service_name=config['service_name'],
            status=status,
            response_time_ms=response_time,
            last_checked=datetime.now(timezone.utc),
            error=error
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking service health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/all", response_model=List[ServiceHealthResponse])
async def check_all_services_health():
    """Check health of all services"""
    try:
        configs = await db.service_configs.find({}, {"_id": 0}).to_list(100)
        health_results = []
        
        for config in configs:
            if not config.get('enabled', True):
                continue
            
            health_url = config.get('health_check_url') or f"{config['base_url']}/health"
            
            start_time = datetime.now()
            status = "unknown"
            error = None
            response_time = None
            
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(health_url)
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    if response.status_code == 200:
                        status = "healthy"
                    else:
                        status = "unhealthy"
                        error = f"HTTP {response.status_code}"
            except Exception as e:
                status = "unhealthy"
                error = str(e)
                response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            health_results.append(
                ServiceHealthResponse(
                    service_id=config['service_id'],
                    service_name=config['service_name'],
                    status=status,
                    response_time_ms=response_time,
                    last_checked=datetime.now(timezone.utc),
                    error=error
                )
            )
        
        return health_results
        
    except Exception as e:
        logger.error(f"Error checking all services health: {e}")
        raise HTTPException(status_code=500, detail=str(e))
