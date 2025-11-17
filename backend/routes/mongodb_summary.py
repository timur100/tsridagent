from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portal", tags=["mongodb-summary"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.get("/mongodb-summary")
async def get_all_services_mongodb_summary():
    """Get MongoDB summary for all services"""
    try:
        services = await db.service_configs.find({}, {"_id": 0}).to_list(100)
        
        summary = []
        for service in services:
            try:
                service_id = service['service_id']
                service_type = service.get('service_type')
                
                # Get MongoDB info based on service type
                mongodb_info = {"connected": False}
                
                if service_type == 'id_verification':
                    # Get verification_db info
                    verification_db = client['verification_db']
                    collection_names = await verification_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await verification_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "verification_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'auth':
                    # Get auth_db info
                    auth_db = client['auth_db']
                    collection_names = await auth_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await auth_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "auth_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'inventory':
                    # Get inventory_db info
                    inventory_db = client['inventory_db']
                    collection_names = await inventory_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await inventory_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "inventory_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'support' or service_type == 'ticketing':
                    # Get ticketing_db info
                    ticketing_db = client['ticketing_db']
                    collection_names = await ticketing_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await ticketing_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "ticketing_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'device':
                    # Get device_db info
                    device_db = client['device_db']
                    collection_names = await device_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await device_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "device_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'location':
                    # Get location_db info
                    location_db = client['location_db']
                    collection_names = await location_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await location_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "location_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'order':
                    # Get order_db info
                    order_db = client['order_db']
                    collection_names = await order_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await order_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "order_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'customer':
                    # Get customer_db info
                    customer_db = client['customer_db']
                    collection_names = await customer_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await customer_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "customer_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'license':
                    # Get license_db info
                    license_db = client['license_db']
                    collection_names = await license_db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await license_db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": "license_db",
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                elif service_type == 'portal':
                    # Get portal_db info
                    collection_names = await db.list_collection_names()
                    
                    collections = []
                    total_docs = 0
                    
                    for coll_name in collection_names:
                        count = await db[coll_name].count_documents({})
                        total_docs += count
                        collections.append({
                            "name": coll_name,
                            "document_count": count
                        })
                    
                    mongodb_info = {
                        "connected": True,
                        "database_name": os.environ.get('DB_NAME', 'portal_db'),
                        "collections": collections,
                        "total_documents": total_docs,
                        "error": None
                    }
                
                summary.append({
                    "service_id": service_id,
                    "service_name": service['service_name'],
                    "mongodb_info": mongodb_info
                })
                
            except Exception as e:
                logger.error(f"Error getting MongoDB info for {service.get('service_name')}: {e}")
                summary.append({
                    "service_id": service.get('service_id'),
                    "service_name": service.get('service_name'),
                    "mongodb_info": {
                        "connected": False,
                        "error": str(e)
                    }
                })
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting MongoDB summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
