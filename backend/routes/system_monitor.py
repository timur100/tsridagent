"""
Umfassendes System-Monitoring für TSRID
Prüft regelmäßig alle Verbindungen und Funktionalitäten
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import os
import time
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from routes.portal_auth import verify_token
import logging
from db.connection import get_mongo_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/monitor", tags=["system-monitor"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')

# Store monitoring results
monitoring_results: Dict[str, Any] = {
    'last_check': None,
    'status': 'unknown',
    'checks': {}
}

class MonitoringResult(BaseModel):
    component: str
    status: str  # healthy, degraded, unhealthy
    latency_ms: Optional[int] = None
    message: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None

class SystemHealthReport(BaseModel):
    overall_status: str
    timestamp: str
    checks: List[MonitoringResult]
    summary: Dict[str, int]

async def check_mongodb_atlas() -> MonitoringResult:
    """Prüft die MongoDB Atlas Verbindung und führt Testoperationen durch"""
    start_time = time.time()
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        
        # Ping test
        await client.admin.command('ping')
        
        # Read test - check collections
        db = get_mongo_client()[DB_NAME]
        collections = await db.list_collection_names()
        
        # Count documents in key collections
        counts = {}
        test_collections = ['portal_users', 'tenants', 'portal_metadata', 'servers']
        for coll in test_collections:
            if coll in collections:
                counts[coll] = await db[coll].count_documents({})
        
        # Write test - save monitoring record
        await db.monitoring_logs.update_one(
            {'_id': 'last_check'},
            {'$set': {
                'timestamp': datetime.now(timezone.utc),
                'status': 'healthy',
                'collections_found': len(collections)
            }},
            upsert=True
        )
        
        latency = int((time.time() - start_time) * 1000)
        client.close()
        
        return MonitoringResult(
            component='MongoDB Atlas',
            status='healthy',
            latency_ms=latency,
            message=f'Verbindung erfolgreich. {len(collections)} Collections gefunden.',
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={
                'collections_count': len(collections),
                'document_counts': counts,
                'database': DB_NAME
            }
        )
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        logger.error(f"MongoDB Atlas check failed: {str(e)}")
        return MonitoringResult(
            component='MongoDB Atlas',
            status='unhealthy',
            latency_ms=latency,
            message=f'Verbindungsfehler: {str(e)[:100]}',
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={'error': str(e)}
        )

async def check_api_endpoint(name: str, path: str, method: str = 'GET', 
                              auth_token: str = None, expected_status: int = 200) -> MonitoringResult:
    """Prüft einen spezifischen API-Endpoint"""
    start_time = time.time()
    try:
        headers = {'Content-Type': 'application/json'}
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"http://localhost:8001{path}"
            
            if method == 'GET':
                response = await client.get(url, headers=headers)
            elif method == 'POST':
                response = await client.post(url, headers=headers, json={})
            else:
                response = await client.get(url, headers=headers)
            
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == expected_status:
                return MonitoringResult(
                    component=f'API: {name}',
                    status='healthy',
                    latency_ms=latency,
                    message=f'Endpoint erreichbar (Status {response.status_code})',
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    details={'status_code': response.status_code, 'path': path}
                )
            elif response.status_code in [401, 403]:
                return MonitoringResult(
                    component=f'API: {name}',
                    status='healthy',
                    latency_ms=latency,
                    message=f'Endpoint erreichbar, Auth erforderlich (Status {response.status_code})',
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    details={'status_code': response.status_code, 'path': path}
                )
            else:
                return MonitoringResult(
                    component=f'API: {name}',
                    status='degraded',
                    latency_ms=latency,
                    message=f'Unerwarteter Status: {response.status_code}',
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    details={'status_code': response.status_code, 'path': path}
                )
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return MonitoringResult(
            component=f'API: {name}',
            status='unhealthy',
            latency_ms=latency,
            message=f'Fehler: {str(e)[:100]}',
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={'error': str(e), 'path': path}
        )

async def check_authentication() -> MonitoringResult:
    """Prüft das Authentifizierungssystem"""
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Test login
            response = await client.post(
                'http://localhost:8001/api/portal/auth/login',
                json={'email': 'admin@tsrid.com', 'password': 'admin123'},
                headers={'Content-Type': 'application/json'}
            )
            
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('access_token'):
                    return MonitoringResult(
                        component='Authentication',
                        status='healthy',
                        latency_ms=latency,
                        message='Login erfolgreich, Token generiert',
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        details={'token_type': data.get('token_type', 'bearer')}
                    )
            
            return MonitoringResult(
                component='Authentication',
                status='unhealthy',
                latency_ms=latency,
                message=f'Login fehlgeschlagen (Status {response.status_code})',
                timestamp=datetime.now(timezone.utc).isoformat(),
                details={'status_code': response.status_code}
            )
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return MonitoringResult(
            component='Authentication',
            status='unhealthy',
            latency_ms=latency,
            message=f'Fehler: {str(e)[:100]}',
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={'error': str(e)}
        )

async def get_auth_token() -> Optional[str]:
    """Holt einen Auth-Token für weitere Tests"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                'http://localhost:8001/api/portal/auth/login',
                json={'email': 'admin@tsrid.com', 'password': 'admin123'},
                headers={'Content-Type': 'application/json'}
            )
            if response.status_code == 200:
                return response.json().get('access_token')
    except:
        pass
    return None

async def run_comprehensive_check() -> SystemHealthReport:
    """Führt alle Monitoring-Checks durch"""
    checks: List[MonitoringResult] = []
    
    # 1. MongoDB Atlas Check
    checks.append(await check_mongodb_atlas())
    
    # 2. Authentication Check
    checks.append(await check_authentication())
    
    # Get auth token for authenticated endpoints
    token = await get_auth_token()
    
    # 3. Core API Endpoints
    core_endpoints = [
        ('Health', '/api/health', 'GET', False),
        ('Portal Metadata (Public)', '/api/portal/metadata/public', 'GET', False),
        ('Global Search', '/api/search/global?query=test', 'GET', True),
        ('Tenants', '/api/tenants', 'GET', True),
        ('API Keys', '/api/portal/api-keys', 'GET', True),
        ('Portal Settings', '/api/portal/settings', 'GET', True),
        ('Servers', '/api/portal/servers', 'GET', True),
    ]
    
    for name, path, method, requires_auth in core_endpoints:
        auth = token if requires_auth else None
        checks.append(await check_api_endpoint(name, path, method, auth))
    
    # Calculate summary
    status_counts = {'healthy': 0, 'degraded': 0, 'unhealthy': 0}
    for check in checks:
        status_counts[check.status] = status_counts.get(check.status, 0) + 1
    
    # Determine overall status
    if status_counts['unhealthy'] > 0:
        overall_status = 'unhealthy'
    elif status_counts['degraded'] > 0:
        overall_status = 'degraded'
    else:
        overall_status = 'healthy'
    
    return SystemHealthReport(
        overall_status=overall_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        checks=checks,
        summary=status_counts
    )

@router.get("/comprehensive")
async def get_comprehensive_health(token_data: dict = Depends(verify_token)):
    """
    Führt einen umfassenden Gesundheitscheck aller Systemkomponenten durch.
    
    Prüft:
    - MongoDB Atlas Verbindung
    - Authentifizierungssystem
    - Alle kritischen API-Endpoints
    - Datenbankoperationen (Lesen/Schreiben)
    """
    try:
        report = await run_comprehensive_check()
        
        # Save to database for history
        try:
                        db = get_mongo_client()[DB_NAME]
            db.monitoring_history.insert_one({
                'timestamp': datetime.now(timezone.utc),
                'overall_status': report.overall_status,
                'summary': report.summary,
                'checks_count': len(report.checks)
            })
            # Keep only last 1000 records
            db.monitoring_history.delete_many({
                '_id': {'$nin': list(db.monitoring_history.find().sort('timestamp', -1).limit(1000).distinct('_id'))}
            })
            client.close()
        except Exception as e:
            logger.warning(f"Could not save monitoring history: {e}")
        
        return {
            'success': True,
            'data': report.dict()
        }
    except Exception as e:
        logger.error(f"Comprehensive health check failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': {
                'overall_status': 'error',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'checks': [],
                'summary': {'error': 1}
            }
        }

@router.get("/quick")
async def get_quick_health():
    """
    Schneller Gesundheitscheck ohne Authentifizierung.
    Prüft nur grundlegende Funktionalität.
    """
    checks = []
    
    # MongoDB check
    checks.append(await check_mongodb_atlas())
    
    # Auth system check
    checks.append(await check_authentication())
    
    # Basic API check
    checks.append(await check_api_endpoint('Health', '/api/health'))
    
    status_counts = {'healthy': 0, 'degraded': 0, 'unhealthy': 0}
    for check in checks:
        status_counts[check.status] = status_counts.get(check.status, 0) + 1
    
    if status_counts['unhealthy'] > 0:
        overall_status = 'unhealthy'
    elif status_counts['degraded'] > 0:
        overall_status = 'degraded'
    else:
        overall_status = 'healthy'
    
    return {
        'status': overall_status,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'checks': [c.dict() for c in checks],
        'summary': status_counts
    }

@router.get("/history")
async def get_monitoring_history(
    limit: int = 100,
    token_data: dict = Depends(verify_token)
):
    """
    Gibt die Historie der Monitoring-Ergebnisse zurück.
    """
    try:
                db = get_mongo_client()[DB_NAME]
        
        history = list(db.monitoring_history.find(
            {},
            {'_id': 0}
        ).sort('timestamp', -1).limit(limit))
        
        client.close()
        
        return {
            'success': True,
            'data': {
                'history': history,
                'count': len(history)
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': {'history': [], 'count': 0}
        }

@router.post("/test-write")
async def test_database_write(token_data: dict = Depends(verify_token)):
    """
    Testet explizit die Schreibfähigkeit in MongoDB Atlas.
    """
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = get_mongo_client()[DB_NAME]
        
        test_doc = {
            'test_id': f'write_test_{int(time.time())}',
            'timestamp': datetime.now(timezone.utc),
            'source': 'monitoring_write_test'
        }
        
        # Insert
        result = await db.monitoring_write_tests.insert_one(test_doc)
        inserted_id = result.inserted_id
        
        # Read back
        read_doc = await db.monitoring_write_tests.find_one({'_id': inserted_id})
        
        # Delete
        await db.monitoring_write_tests.delete_one({'_id': inserted_id})
        
        client.close()
        
        return {
            'success': True,
            'message': 'Schreib-/Lesetest erfolgreich',
            'data': {
                'insert': 'success',
                'read': 'success' if read_doc else 'failed',
                'delete': 'success'
            }
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Schreibtest fehlgeschlagen: {str(e)}',
            'data': {'error': str(e)}
        }
