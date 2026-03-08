"""
MongoDB Connection Pool
Zentrale MongoDB-Verbindung mit Connection Pooling für bessere Performance
WICHTIG: Verwendet IMMER die MONGO_URL aus der Umgebung - KEIN localhost Fallback!
"""
from pymongo import MongoClient
import os

# Global connection pool - created once at startup
_client = None

def get_mongo_client():
    """Get MongoDB client with connection pooling - NO FALLBACK TO LOCALHOST"""
    global _client
    if _client is None:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            raise RuntimeError(
                "MONGO_URL environment variable is NOT SET! "
                "All database connections MUST use the Atlas MongoDB. "
                "Set MONGO_URL in /app/backend/.env"
            )
        if 'localhost' in mongo_url or '127.0.0.1' in mongo_url:
            import warnings
            warnings.warn(
                "WARNING: Using localhost MongoDB! This should only happen in development. "
                "Production MUST use Atlas MongoDB!"
            )
        _client = MongoClient(
            mongo_url,
            maxPoolSize=50,
            minPoolSize=10,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=10000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=30000,
        )
    return _client

def get_db(db_name: str = None):
    """Get database from connection pool"""
    client = get_mongo_client()
    if db_name:
        return client[db_name]
    return client[os.environ.get('DB_NAME', 'tsrid_db')]

# Alias for backward compatibility
def get_db_connection():
    """Get tsrid_db database from connection pool (alias for get_db)"""
    return get_db()

def get_multi_tenant_db():
    """Get multi_tenant_admin database"""
    return get_mongo_client()['multi_tenant_admin']

def get_portal_db():
    """Get portal_db database"""
    return get_mongo_client()['portal_db']

def close_connection():
    """Close MongoDB connection (for cleanup)"""
    global _client
    if _client:
        _client.close()
        _client = None
