"""
MongoDB Connection Pool
Zentrale MongoDB-Verbindung mit Connection Pooling für bessere Performance
"""
from pymongo import MongoClient
import os

# Global connection pool - created once at startup
_client = None

def get_mongo_client():
    """Get MongoDB client with connection pooling"""
    global _client
    if _client is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        _client = MongoClient(
            mongo_url,
            maxPoolSize=50,  # Maximum connections in pool
            minPoolSize=10,  # Minimum connections to maintain
            maxIdleTimeMS=30000,  # Close idle connections after 30 seconds
            waitQueueTimeoutMS=10000,  # Wait max 10 seconds for connection
            serverSelectionTimeoutMS=5000,  # 5 second timeout for server selection
            connectTimeoutMS=10000,  # 10 second connection timeout
            socketTimeoutMS=30000,  # 30 second socket timeout
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
