from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import os
import time
import httpx
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/health", tags=["health"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')

# Microservices configuration
MICROSERVICES = [
    {'name': 'Auth Service', 'port': 8100, 'path': '/api/health'},
    {'name': 'Inventory Service', 'port': 8101, 'path': '/api/health'},
    {'name': 'Device Service', 'port': 8102, 'path': '/api/health'},
    {'name': 'Ticketing Service', 'port': 8103, 'path': '/api/health'},
    {'name': 'Customer Service', 'port': 8104, 'path': '/api/health'},
    {'name': 'Location Service', 'port': 8105, 'path': '/api/health'},
    {'name': 'License Service', 'port': 8106, 'path': '/api/health'},
    {'name': 'Order Service', 'port': 8107, 'path': '/api/health'},
    {'name': 'Settings Service', 'port': 8108, 'path': '/api/health'},
    {'name': 'Verification Service', 'port': 8109, 'path': '/api/health'},
]

async def check_service_health(service: dict) -> dict:
    """Check if a microservice is healthy"""
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"http://localhost:{service['port']}{service['path']}"
            response = await client.get(url)
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                return {
                    'name': service['name'],
                    'port': service['port'],
                    'status': 'healthy',
                    'latency': latency,
                    'message': 'Service is running'
                }
            else:
                return {
                    'name': service['name'],
                    'port': service['port'],
                    'status': 'unhealthy',
                    'latency': latency,
                    'message': f'Status code: {response.status_code}'
                }
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return {
            'name': service['name'],
            'port': service['port'],
            'status': 'unhealthy',
            'latency': latency,
            'message': str(e)
        }

def check_database_health() -> dict:
    """Check MongoDB connection health"""
    start_time = time.time()
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        # Force a connection check
        client.admin.command('ping')
        latency = int((time.time() - start_time) * 1000)
        client.close()
        
        return {
            'status': 'healthy',
            'latency': latency,
            'message': 'Database connection successful'
        }
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return {
            'status': 'unhealthy',
            'latency': latency,
            'message': str(e)
        }

async def check_server_health(server: dict) -> dict:
    """Check external server health via SSH or ping"""
    # For now, just return the server info with status
    return {
        'name': server.get('name', 'Unknown'),
        'ip': server.get('host', server.get('ip', 'Unknown')),
        'status': 'unknown',
        'uptime': None,
        'message': 'Health check not implemented for external servers'
    }

@router.get("/status")
async def get_health_status(token_data: dict = Depends(verify_token)):
    """
    Get comprehensive health status of all services
    """
    try:
        # Check backend health (self)
        backend_health = {
            'status': 'healthy',
            'latency': 1,
            'message': 'Backend API is running'
        }
        
        # Check database health
        db_health = check_database_health()
        
        # Check microservices
        services_health = []
        for service in MICROSERVICES:
            health = await check_service_health(service)
            services_health.append(health)
        
        # Get configured servers from database
        servers_health = []
        try:
                        db = get_mongo_client()[DB_NAME]
            servers = list(db.servers.find({}, {'_id': 0}))
            for server in servers:
                server_health = await check_server_health(server)
                servers_health.append(server_health)
            client.close()
        except Exception as e:
            print(f"Error fetching servers: {e}")
        
        return {
            'success': True,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'backend': backend_health,
            'database': db_health,
            'services': services_health,
            'servers': servers_health
        }
    
    except Exception as e:
        print(f"Error in health check: {str(e)}")
        return {
            'success': False,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'backend': {'status': 'healthy', 'latency': 1, 'message': 'Backend is running'},
            'database': {'status': 'unknown', 'latency': None, 'message': 'Check failed'},
            'services': [],
            'servers': []
        }
