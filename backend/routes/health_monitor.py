"""
Health Monitor API - Comprehensive system health checks with traffic light status
Green = OK, Yellow = Warning, Red = Critical/Error
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import time
import os
import logging
from typing import Dict, Any, List
from db.connection import get_mongo_client, get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])

# Thresholds for traffic light system
THRESHOLDS = {
    "mongodb_latency": {"green": 500, "yellow": 1500},  # ms
    "api_response": {"green": 200, "yellow": 1000},  # ms
    "collection_count": {"min": 1},  # minimum expected documents
}


def measure_time(func):
    """Measure execution time of a function"""
    start = time.time()
    try:
        result = func()
        elapsed = (time.time() - start) * 1000  # ms
        return result, elapsed, None
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return None, elapsed, str(e)


def get_status(value: float, thresholds: Dict[str, float]) -> str:
    """Get traffic light status based on value and thresholds"""
    if value <= thresholds.get("green", float('inf')):
        return "green"
    elif value <= thresholds.get("yellow", float('inf')):
        return "yellow"
    return "red"


@router.get("/check/mongodb")
async def check_mongodb():
    """Check MongoDB connection and latency"""
    try:
        client = get_mongo_client()
        
        # Ping test
        start = time.time()
        client.admin.command('ping')
        ping_latency = (time.time() - start) * 1000
        
        # Server info
        server_info = client.server_info()
        version = server_info.get('version', 'Unknown')
        
        # Connection pool stats
        try:
            pool_stats = client.admin.command('connPoolStats')
            total_connections = pool_stats.get('totalAvailable', 0) + pool_stats.get('totalInUse', 0)
        except:
            total_connections = "N/A"
        
        status = get_status(ping_latency, THRESHOLDS["mongodb_latency"])
        
        return {
            "name": "MongoDB Verbindung",
            "status": status,
            "latency_ms": round(ping_latency, 2),
            "version": version,
            "connections": total_connections,
            "message": f"Latenz: {round(ping_latency, 2)}ms" if status == "green" else f"Erhöhte Latenz: {round(ping_latency, 2)}ms",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return {
            "name": "MongoDB Verbindung",
            "status": "red",
            "latency_ms": None,
            "version": None,
            "connections": None,
            "message": f"Verbindungsfehler: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/check/databases")
async def check_databases():
    """Check all database collections"""
    results = []
    client = get_mongo_client()
    
    # Define expected databases and their critical collections
    db_checks = {
        "tsrid_db": ["tenants", "europcar_devices", "europcar_stations"],
        "portal_db": ["portal_users"],
        "multi_tenant_admin": ["devices", "locations"],
        "hardware_db": ["hardware_sets", "hardware_devices"],
        "customer_db": ["customers"],
    }
    
    for db_name, collections in db_checks.items():
        try:
            db = client[db_name]
            db_results = []
            
            for collection_name in collections:
                try:
                    start = time.time()
                    count = db[collection_name].count_documents({})
                    query_time = (time.time() - start) * 1000
                    
                    status = "green" if count > 0 else "yellow"
                    if query_time > THRESHOLDS["api_response"]["yellow"]:
                        status = "yellow" if status == "green" else status
                    
                    db_results.append({
                        "collection": collection_name,
                        "status": status,
                        "document_count": count,
                        "query_time_ms": round(query_time, 2),
                        "message": f"{count} Dokumente" if count > 0 else "Leer"
                    })
                except Exception as e:
                    db_results.append({
                        "collection": collection_name,
                        "status": "red",
                        "document_count": 0,
                        "query_time_ms": None,
                        "message": str(e)
                    })
            
            # Overall database status
            statuses = [r["status"] for r in db_results]
            overall_status = "red" if "red" in statuses else ("yellow" if "yellow" in statuses else "green")
            
            results.append({
                "database": db_name,
                "status": overall_status,
                "collections": db_results
            })
        except Exception as e:
            results.append({
                "database": db_name,
                "status": "red",
                "collections": [],
                "message": str(e)
            })
    
    return {
        "name": "Datenbank-Collections",
        "databases": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/check/api-endpoints")
async def check_api_endpoints():
    """Check critical API endpoints response times"""
    import httpx
    
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8001")
    
    endpoints = [
        {"path": "/api/tenants/", "name": "Tenants API"},
        {"path": "/api/portal/devices/list", "name": "Devices API"},
        {"path": "/api/portal/locations/list", "name": "Locations API"},
        {"path": "/api/tenants/stats", "name": "Tenant Stats API"},
        {"path": "/api/hardware/stats/dashboard", "name": "Hardware Stats API"},
        {"path": "/api/tickets/stats", "name": "Tickets Stats API"},
    ]
    
    results = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for endpoint in endpoints:
            try:
                start = time.time()
                response = await client.get(f"{backend_url}{endpoint['path']}")
                elapsed = (time.time() - start) * 1000
                
                if response.status_code == 200:
                    status = get_status(elapsed, THRESHOLDS["api_response"])
                elif response.status_code in [401, 403]:
                    status = "yellow"  # Auth required but endpoint reachable
                else:
                    status = "red"
                
                results.append({
                    "endpoint": endpoint["path"],
                    "name": endpoint["name"],
                    "status": status,
                    "response_time_ms": round(elapsed, 2),
                    "http_status": response.status_code,
                    "message": f"{round(elapsed, 2)}ms" if status == "green" else f"Langsam: {round(elapsed, 2)}ms"
                })
            except Exception as e:
                results.append({
                    "endpoint": endpoint["path"],
                    "name": endpoint["name"],
                    "status": "red",
                    "response_time_ms": None,
                    "http_status": None,
                    "message": str(e)
                })
    
    return {
        "name": "API Endpunkte",
        "endpoints": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/check/tenants")
async def check_tenants():
    """Check tenant data integrity"""
    try:
        db = get_db_connection()
        
        # Count tenants by level
        pipeline = [
            {"$group": {"_id": "$tenant_level", "count": {"$sum": 1}}}
        ]
        levels = list(db.tenants.aggregate(pipeline))
        level_counts = {item["_id"]: item["count"] for item in levels}
        
        # Check for organizations
        org_count = level_counts.get("organization", 0)
        location_count = level_counts.get("location", 0)
        
        # Check for orphaned tenants (no parent)
        orphans = db.tenants.count_documents({
            "parent_tenant_id": None,
            "tenant_level": {"$ne": "organization"}
        })
        
        status = "green"
        messages = []
        
        if org_count == 0:
            status = "red"
            messages.append("Keine Organisationen gefunden")
        elif org_count < 2:
            status = "yellow"
            messages.append(f"Nur {org_count} Organisation(en)")
        
        if orphans > 0:
            status = "yellow" if status == "green" else status
            messages.append(f"{orphans} verwaiste Tenants")
        
        if not messages:
            messages.append(f"{org_count} Organisationen, {location_count} Standorte")
        
        return {
            "name": "Tenant-Hierarchie",
            "status": status,
            "organizations": org_count,
            "locations": location_count,
            "levels": level_counts,
            "orphaned_tenants": orphans,
            "message": "; ".join(messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "name": "Tenant-Hierarchie",
            "status": "red",
            "message": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/check/devices")
async def check_devices():
    """Check device status distribution"""
    try:
        client = get_mongo_client()
        db = client["multi_tenant_admin"]
        
        total = db.europcar_devices.count_documents({})
        
        # Check for online devices - multiple possible fields/values
        online = db.europcar_devices.count_documents({
            "$or": [
                {"online": True},
                {"status": "online"},
                {"teamviewer_online": True}
            ]
        })
        offline = total - online
        
        # Check for devices without location
        no_location = db.europcar_devices.count_documents({
            "$and": [
                {"$or": [
                    {"location_code": None},
                    {"location_code": ""},
                    {"location_code": {"$exists": False}}
                ]},
                {"$or": [
                    {"locationcode": None},
                    {"locationcode": ""},
                    {"locationcode": {"$exists": False}}
                ]}
            ]
        })
        
        status = "green"
        messages = []
        
        if total == 0:
            status = "red"
            messages.append("Keine Geräte gefunden")
        else:
            offline_ratio = offline / total if total > 0 else 0
            if offline_ratio > 0.5:
                status = "red"
                messages.append(f"Mehr als 50% offline ({offline}/{total})")
            elif offline_ratio > 0.3:
                status = "yellow"
                messages.append(f"Viele Geräte offline ({offline}/{total})")
        
        if no_location > 0:
            status = "yellow" if status == "green" else status
            messages.append(f"{no_location} Geräte ohne Standort")
        
        if not messages:
            messages.append(f"{online}/{total} online")
        
        return {
            "name": "Geräte-Status",
            "status": status,
            "total": total,
            "online": online,
            "offline": offline,
            "no_location": no_location,
            "message": "; ".join(messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "name": "Geräte-Status",
            "status": "red",
            "message": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/check/users")
async def check_users():
    """Check user accounts status"""
    try:
        client = get_mongo_client()
        db = client["portal_db"]
        
        total = db.portal_users.count_documents({})
        admins = db.portal_users.count_documents({"role": "admin"})
        
        # Check for users without email
        no_email = db.portal_users.count_documents({
            "$or": [
                {"email": None},
                {"email": ""},
                {"email": {"$exists": False}}
            ]
        })
        
        status = "green"
        messages = []
        
        if total == 0:
            status = "red"
            messages.append("Keine Benutzer gefunden")
        elif admins == 0:
            status = "red"
            messages.append("Kein Admin-Benutzer")
        
        if no_email > 0:
            status = "yellow" if status == "green" else status
            messages.append(f"{no_email} Benutzer ohne E-Mail")
        
        if not messages:
            messages.append(f"{total} Benutzer ({admins} Admins)")
        
        return {
            "name": "Benutzer",
            "status": status,
            "total": total,
            "admins": admins,
            "no_email": no_email,
            "message": "; ".join(messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "name": "Benutzer",
            "status": "red",
            "message": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/check/hardware-sets")
async def check_hardware_sets():
    """Check hardware sets integrity"""
    try:
        client = get_mongo_client()
        db = client["hardware_db"]
        
        total_sets = db.hardware_sets.count_documents({})
        active_sets = db.hardware_sets.count_documents({"status": "aktiv"})
        total_devices = db.hardware_devices.count_documents({})
        
        # Check for sets without devices
        empty_sets = db.hardware_sets.count_documents({"device_count": 0})
        
        status = "green"
        messages = []
        
        if total_sets == 0:
            status = "yellow"
            messages.append("Keine Hardware-Sets")
        elif empty_sets > total_sets * 0.3:
            status = "yellow"
            messages.append(f"{empty_sets} leere Sets")
        
        if not messages:
            messages.append(f"{active_sets} aktive Sets, {total_devices} Geräte")
        
        return {
            "name": "Hardware-Sets",
            "status": status,
            "total_sets": total_sets,
            "active_sets": active_sets,
            "total_devices": total_devices,
            "empty_sets": empty_sets,
            "message": "; ".join(messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "name": "Hardware-Sets",
            "status": "red",
            "message": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/check/environment")
async def check_environment():
    """Check environment configuration"""
    env_vars = {
        "MONGO_URL": os.environ.get("MONGO_URL", ""),
        "DB_NAME": os.environ.get("DB_NAME", ""),
        "JWT_SECRET": os.environ.get("JWT_SECRET", ""),
    }
    
    status = "green"
    messages = []
    missing = []
    
    for var, value in env_vars.items():
        if not value:
            missing.append(var)
    
    if missing:
        status = "red"
        messages.append(f"Fehlend: {', '.join(missing)}")
    else:
        messages.append("Alle Umgebungsvariablen gesetzt")
    
    return {
        "name": "Umgebung",
        "status": status,
        "configured": [k for k, v in env_vars.items() if v],
        "missing": missing,
        "message": "; ".join(messages),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/full")
async def full_health_check():
    """Run all health checks and return comprehensive status"""
    results = {
        "overall_status": "green",
        "checks": [],
        "summary": {
            "green": 0,
            "yellow": 0,
            "red": 0
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Run all checks
    checks = [
        await check_mongodb(),
        await check_tenants(),
        await check_devices(),
        await check_users(),
        await check_hardware_sets(),
        await check_environment(),
    ]
    
    for check in checks:
        results["checks"].append(check)
        status = check.get("status", "red")
        results["summary"][status] = results["summary"].get(status, 0) + 1
    
    # Determine overall status
    if results["summary"]["red"] > 0:
        results["overall_status"] = "red"
    elif results["summary"]["yellow"] > 0:
        results["overall_status"] = "yellow"
    
    return results
