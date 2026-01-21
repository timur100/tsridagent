"""
MongoDB Atlas Monitoring Service
Überwacht Cluster-Performance, Verbindungen, und Datenbank-Statistiken
"""
from fastapi import APIRouter, HTTPException, Depends
from db.connection import get_mongo_client
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure
import os
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/mongodb", tags=["MongoDB Monitoring"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')

def get_mongo_client():
    """Get MongoDB client with connection pooling"""
    return MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)

@router.get("/status")
async def get_cluster_status(token_data: dict = Depends(verify_token)):
    """Get MongoDB Atlas cluster status and basic info"""
    try:
        client = get_mongo_client()
        
        # Test connection
        start_time = datetime.now(timezone.utc)
        server_info = client.server_info()
        latency_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        
        # Get database list
        databases = client.list_database_names()
        
        return {
            "success": True,
            "status": "online",
            "latency_ms": round(latency_ms, 2),
            "mongodb_version": server_info.get("version", "unknown"),
            "databases": databases,
            "database_count": len(databases),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except ServerSelectionTimeoutError:
        return {
            "success": False,
            "status": "offline",
            "error": "Cluster nicht erreichbar",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@router.get("/stats")
async def get_database_stats(token_data: dict = Depends(verify_token)):
    """Get detailed statistics for all databases"""
    try:
        client = get_mongo_client()
        databases = client.list_database_names()
        
        db_stats = []
        total_size = 0
        total_collections = 0
        total_documents = 0
        
        for db_name in databases:
            if db_name in ['admin', 'local', 'config']:
                continue  # Skip system databases
                
            try:
                db = client[db_name]
                stats = db.command("dbStats")
                collections = db.list_collection_names()
                
                # Count documents in each collection
                doc_count = 0
                collection_details = []
                for coll_name in collections:
                    try:
                        count = db[coll_name].estimated_document_count()
                        doc_count += count
                        collection_details.append({
                            "name": coll_name,
                            "documents": count
                        })
                    except:
                        pass
                
                size_mb = stats.get("dataSize", 0) / (1024 * 1024)
                storage_mb = stats.get("storageSize", 0) / (1024 * 1024)
                
                db_stats.append({
                    "name": db_name,
                    "collections": len(collections),
                    "documents": doc_count,
                    "size_mb": round(size_mb, 2),
                    "storage_mb": round(storage_mb, 2),
                    "collection_details": sorted(collection_details, key=lambda x: x["documents"], reverse=True)[:10]
                })
                
                total_size += size_mb
                total_collections += len(collections)
                total_documents += doc_count
                
            except Exception as e:
                db_stats.append({
                    "name": db_name,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "summary": {
                "total_databases": len(db_stats),
                "total_collections": total_collections,
                "total_documents": total_documents,
                "total_size_mb": round(total_size, 2)
            },
            "databases": sorted(db_stats, key=lambda x: x.get("documents", 0), reverse=True),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/{db_name}")
async def get_collection_stats(db_name: str, token_data: dict = Depends(verify_token)):
    """Get detailed collection statistics for a specific database"""
    try:
        client = get_mongo_client()
        db = client[db_name]
        
        collections = db.list_collection_names()
        collection_stats = []
        
        for coll_name in collections:
            try:
                coll = db[coll_name]
                stats = db.command("collStats", coll_name)
                
                # Get sample document to show schema
                sample = coll.find_one({}, {"_id": 0})
                schema_fields = list(sample.keys()) if sample else []
                
                collection_stats.append({
                    "name": coll_name,
                    "documents": stats.get("count", 0),
                    "size_mb": round(stats.get("size", 0) / (1024 * 1024), 2),
                    "avg_doc_size_kb": round(stats.get("avgObjSize", 0) / 1024, 2),
                    "indexes": stats.get("nindexes", 0),
                    "schema_fields": schema_fields[:15]  # First 15 fields
                })
            except Exception as e:
                collection_stats.append({
                    "name": coll_name,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "database": db_name,
            "collections": sorted(collection_stats, key=lambda x: x.get("documents", 0), reverse=True),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health-history")
async def get_health_history(token_data: dict = Depends(verify_token)):
    """Get health check history (simulated for now, can be stored in MongoDB)"""
    try:
        client = get_mongo_client()
        
        # Perform multiple ping tests
        ping_results = []
        for i in range(5):
            try:
                start = datetime.now(timezone.utc)
                client.admin.command('ping')
                latency = (datetime.now(timezone.utc) - start).total_seconds() * 1000
                ping_results.append(round(latency, 2))
            except:
                ping_results.append(None)
        
        # Calculate stats
        valid_pings = [p for p in ping_results if p is not None]
        avg_latency = sum(valid_pings) / len(valid_pings) if valid_pings else None
        max_latency = max(valid_pings) if valid_pings else None
        min_latency = min(valid_pings) if valid_pings else None
        
        # Determine health status
        if not valid_pings:
            status = "critical"
            status_text = "Keine Verbindung möglich"
        elif avg_latency > 500:
            status = "warning"
            status_text = "Hohe Latenz erkannt"
        elif avg_latency > 200:
            status = "degraded"
            status_text = "Leicht erhöhte Latenz"
        else:
            status = "healthy"
            status_text = "Optimal"
        
        return {
            "success": True,
            "health_status": status,
            "status_text": status_text,
            "latency": {
                "current": ping_results[-1] if ping_results else None,
                "average": round(avg_latency, 2) if avg_latency else None,
                "min": round(min_latency, 2) if min_latency else None,
                "max": round(max_latency, 2) if max_latency else None,
                "samples": ping_results
            },
            "cluster_tier": "M10 (Dedicated)",
            "region": "AWS / Frankfurt (eu-central-1)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "health_status": "critical",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@router.get("/operations")
async def get_current_operations(token_data: dict = Depends(verify_token)):
    """Get current database operations (requires admin privileges)"""
    try:
        client = get_mongo_client()
        
        # Try to get current operations
        try:
            ops = client.admin.command("currentOp", {"active": True})
            active_ops = len(ops.get("inprog", []))
        except OperationFailure:
            active_ops = "N/A (Keine Admin-Rechte)"
        
        # Get connection pool info
        try:
            server_status = client.admin.command("serverStatus")
            connections = server_status.get("connections", {})
        except OperationFailure:
            connections = {"current": "N/A", "available": "N/A"}
        
        return {
            "success": True,
            "active_operations": active_ops,
            "connections": {
                "current": connections.get("current", "N/A"),
                "available": connections.get("available", "N/A"),
                "total_created": connections.get("totalCreated", "N/A")
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
