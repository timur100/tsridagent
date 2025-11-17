from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portal/services", tags=["service-mongodb"])

# MongoDB connection for portal_db
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class CollectionInfo(BaseModel):
    """Collection information"""
    name: str
    document_count: int
    size_bytes: Optional[int] = None


class MongoDBInfo(BaseModel):
    """MongoDB information for a service"""
    connected: bool
    database_name: Optional[str] = None
    collections: List[CollectionInfo] = []
    total_documents: int = 0
    error: Optional[str] = None


async def get_mongodb_info_from_service(service_url: str) -> MongoDBInfo:
    """
    Try to get MongoDB info from the service itself
    This assumes the service has a /mongodb-info endpoint
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{service_url}/mongodb-info")
            if response.status_code == 200:
                data = response.json()
                return MongoDBInfo(**data)
    except Exception as e:
        logger.warning(f"Could not fetch MongoDB info from service: {e}")
    
    return None


async def get_mongodb_info_for_verification_db() -> MongoDBInfo:
    """Get MongoDB info for verification_db (ID Verification Service)"""
    try:
        # Connect to verification_db
        verification_db = client['verification_db']
        
        # Get collection names
        collection_names = await verification_db.list_collection_names()
        
        collections = []
        total_docs = 0
        
        for coll_name in collection_names:
            try:
                count = await verification_db[coll_name].count_documents({})
                total_docs += count
                
                collections.append(CollectionInfo(
                    name=coll_name,
                    document_count=count
                ))
            except Exception as e:
                logger.error(f"Error counting documents in {coll_name}: {e}")
        
        return MongoDBInfo(
            connected=True,
            database_name='verification_db',
            collections=collections,
            total_documents=total_docs
        )
        
    except Exception as e:
        logger.error(f"Error getting MongoDB info for verification_db: {e}")
        return MongoDBInfo(
            connected=False,
            error=str(e)
        )


async def get_mongodb_info_for_portal_db() -> MongoDBInfo:
    """Get MongoDB info for portal_db (current database)"""
    try:
        # Get collection names
        collection_names = await db.list_collection_names()
        
        collections = []
        total_docs = 0
        
        for coll_name in collection_names:
            try:
                count = await db[coll_name].count_documents({})
                total_docs += count
                
                collections.append(CollectionInfo(
                    name=coll_name,
                    document_count=count
                ))
            except Exception as e:
                logger.error(f"Error counting documents in {coll_name}: {e}")
        
        return MongoDBInfo(
            connected=True,
            database_name=os.environ.get('DB_NAME', 'portal_db'),
            collections=collections,
            total_documents=total_docs
        )
        
    except Exception as e:
        logger.error(f"Error getting MongoDB info for portal_db: {e}")
        return MongoDBInfo(
            connected=False,
            error=str(e)
        )


@router.get("/{service_id}/mongodb-info", response_model=MongoDBInfo)
async def get_service_mongodb_info(service_id: str):
    """Get MongoDB information for a specific service"""
    try:
        # Get service config
        service = await db.service_configs.find_one({"service_id": service_id}, {"_id": 0})
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        service_type = service.get('service_type')
        
        # Try to get info from service endpoint first
        base_url = service.get('base_url', '')
        mongodb_info = await get_mongodb_info_from_service(base_url)
        
        if mongodb_info:
            return mongodb_info
        
        # Fallback: Get info based on service type
        if service_type == 'id_verification':
            return await get_mongodb_info_for_verification_db()
        elif service_type == 'portal':
            return await get_mongodb_info_for_portal_db()
        else:
            # For unknown services, return basic info
            db_name = service.get('settings', {}).get('database_name', 'unknown')
            return MongoDBInfo(
                connected=False,
                database_name=db_name,
                error="MongoDB info not available for this service type"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MongoDB info for service {service_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mongodb-summary")
async def get_all_services_mongodb_summary():
    """Get MongoDB summary for all services"""
    try:
        services = await db.service_configs.find({}, {"_id": 0}).to_list(100)
        
        summary = []
        for service in services:
            try:
                info = await get_service_mongodb_info(service['service_id'])
                summary.append({
                    "service_id": service['service_id'],
                    "service_name": service['service_name'],
                    "mongodb_info": info.model_dump()
                })
            except Exception as e:
                logger.error(f"Error getting MongoDB info for {service['service_name']}: {e}")
                summary.append({
                    "service_id": service['service_id'],
                    "service_name": service['service_name'],
                    "mongodb_info": {
                        "connected": False,
                        "error": str(e)
                    }
                })
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting MongoDB summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
