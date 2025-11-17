from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# Import Desko hardware integration
try:
    from desko_integration import get_scanner as get_desko_scanner
    DESKO_AVAILABLE = True
except ImportError:
    DESKO_AVAILABLE = False
    print("⚠️ Desko integration not available - using simulation only")

# Check for remote scanner service
SCANNER_SERVICE_URL = os.environ.get('SCANNER_SERVICE_URL')
if SCANNER_SERVICE_URL:
    print(f"✅ Remote Scanner Service configured: {SCANNER_SERVICE_URL}")

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['test_database']
scanner_config_collection = db['scanner_config']
scanner_logs_collection = db['scanner_logs']

# Available scanner types
SCANNER_TYPES = {
    "desko": {
        "name": "Desko Pentascanner",
        "manufacturer": "Desko GmbH",
        "model": "PENTA Scanner",
        "supported_resolutions": [300, 600],
        "features": ["auto_crop", "auto_deskew", "uv_light", "ir_light"]
    },
    "regula": {
        "name": "Regula 7028M",
        "manufacturer": "Regula Forensics",
        "model": "7028M",
        "supported_resolutions": [300, 600, 1200],
        "features": ["auto_crop", "auto_deskew", "uv_light", "ir_light", "multi_spectrum"]
    },
    "generic": {
        "name": "Generic Scanner",
        "manufacturer": "Generic",
        "model": "Standard",
        "supported_resolutions": [300, 600],
        "features": ["auto_crop"]
    }
}

class ScannerConfig(BaseModel):
    scanner_type: str
    brightness: int = 80
    resolution: int = 600
    color_mode: str = "color"
    auto_crop: bool = True
    auto_deskew: bool = True

class ScannerTest(BaseModel):
    test_type: str = "basic"  # basic, full, calibration

@router.get("/types")
async def get_scanner_types():
    """Get list of supported scanner types"""
    return {
        "success": True,
        "types": SCANNER_TYPES
    }

@router.get("/status")
async def get_scanner_status():
    """Get current scanner status"""
    try:
        # Get current config from DB
        config = await scanner_config_collection.find_one({})
        
        if not config:
            # Return default disconnected state
            return {
                "success": True,
                "connected": False,
                "scanner_type": None,
                "message": "Kein Scanner konfiguriert"
            }
        
        config.pop('_id', None)
        
        # Simulate scanner status (in production, this would check actual hardware)
        status = {
            "success": True,
            "connected": config.get("connected", False),
            "scanner_type": config.get("scanner_type"),
            "scanner_info": SCANNER_TYPES.get(config.get("scanner_type"), {}),
            "firmware_version": config.get("firmware_version", "N/A"),
            "driver_version": config.get("driver_version", "N/A"),
            "last_scan": config.get("last_scan"),
            "scan_count": config.get("scan_count", 0),
            "configuration": {
                "brightness": config.get("brightness", 80),
                "resolution": config.get("resolution", 600),
                "color_mode": config.get("color_mode", "color"),
                "auto_crop": config.get("auto_crop", True),
                "auto_deskew": config.get("auto_deskew", True)
            }
        }
        
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/configure")
async def configure_scanner(config: ScannerConfig):
    """Configure scanner settings"""
    try:
        # Validate scanner type
        if config.scanner_type not in SCANNER_TYPES:
            raise HTTPException(status_code=400, detail="Ungültiger Scanner-Typ")
        
        # Validate resolution
        supported_resolutions = SCANNER_TYPES[config.scanner_type]["supported_resolutions"]
        if config.resolution not in supported_resolutions:
            raise HTTPException(
                status_code=400, 
                detail=f"Auflösung {config.resolution} nicht unterstützt. Unterstützt: {supported_resolutions}"
            )
        
        # Check if config exists
        existing = await scanner_config_collection.find_one({})
        
        config_data = {
            "scanner_type": config.scanner_type,
            "brightness": config.brightness,
            "resolution": config.resolution,
            "color_mode": config.color_mode,
            "auto_crop": config.auto_crop,
            "auto_deskew": config.auto_deskew,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            # Preserve connection status and stats
            config_data["connected"] = existing.get("connected", False)
            config_data["scan_count"] = existing.get("scan_count", 0)
            config_data["last_scan"] = existing.get("last_scan")
            config_data["firmware_version"] = existing.get("firmware_version", "N/A")
            config_data["driver_version"] = existing.get("driver_version", "N/A")
            
            await scanner_config_collection.update_one({}, {"$set": config_data})
        else:
            config_data["connected"] = False
            config_data["scan_count"] = 0
            config_data["last_scan"] = None
            config_data["firmware_version"] = "N/A"
            config_data["driver_version"] = "N/A"
            config_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await scanner_config_collection.insert_one(config_data)
        
        return {
            "success": True,
            "message": "Scanner erfolgreich konfiguriert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connect")
async def connect_scanner():
    """Connect to scanner"""
    try:
        config = await scanner_config_collection.find_one({})
        
        if not config:
            raise HTTPException(status_code=400, detail="Kein Scanner konfiguriert")
        
        scanner_type = config["scanner_type"]
        
        # Try remote scanner service first (for Windows PC with real hardware)
        if scanner_type == "desko" and SCANNER_SERVICE_URL:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(f"{SCANNER_SERVICE_URL}/connect")
                    data = response.json()
                    
                    if data.get("success"):
                        await scanner_config_collection.update_one(
                            {},
                            {"$set": {
                                "connected": True,
                                "firmware_version": data.get("firmware_version", "N/A"),
                                "driver_version": data.get("driver_version", "N/A"),
                                "hardware_mode": data.get("mode") == "hardware",
                                "remote_service": True,
                                "connected_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        await scanner_logs_collection.insert_one({
                            "log_id": str(uuid.uuid4()),
                            "event": "connect",
                            "scanner_type": scanner_type,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "status": "success",
                            "hardware_mode": data.get("mode") == "hardware",
                            "remote_service": True
                        })
                        
                        return {
                            "success": True,
                            "message": f"{data.get('message')} (Remote Service)",
                            "hardware_mode": data.get("mode") == "hardware",
                            "remote_service": True,
                            "firmware": data.get("firmware_version"),
                            "driver": data.get("driver_version")
                        }
            except Exception as e:
                print(f"⚠️ Remote scanner service error: {e}")
                # Continue with local fallback
        
        # Try local hardware for Desko scanner
        if scanner_type == "desko" and DESKO_AVAILABLE:
            desko = get_desko_scanner()
            hw_result = desko.connect()
            
            if hw_result["success"]:
                await scanner_config_collection.update_one(
                    {},
                    {"$set": {
                        "connected": True,
                        "firmware_version": hw_result.get("firmware_version", "N/A"),
                        "driver_version": hw_result.get("driver_version", "N/A"),
                        "hardware_mode": not desko.simulation_mode,
                        "remote_service": False,
                        "connected_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await scanner_logs_collection.insert_one({
                    "log_id": str(uuid.uuid4()),
                    "event": "connect",
                    "scanner_type": scanner_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "success",
                    "hardware_mode": not desko.simulation_mode,
                    "remote_service": False
                })
                
                mode = "Hardware" if not desko.simulation_mode else "Simulation"
                return {
                    "success": True,
                    "message": f"Scanner verbunden ({mode})",
                    "hardware_mode": not desko.simulation_mode,
                    "remote_service": False,
                    "firmware": hw_result.get("firmware_version"),
                    "driver": hw_result.get("driver_version")
                }
            else:
                raise HTTPException(status_code=500, detail=hw_result.get("message", "Verbindung fehlgeschlagen"))
        
        # Fallback to simulation for other scanner types
        firmware_versions = {
            "desko": "v2.4.1",
            "regula": "v3.1.5",
            "generic": "v1.0.0"
        }
        
        driver_versions = {
            "desko": "v5.2.3",
            "regula": "v4.8.1",
            "generic": "v2.1.0"
        }
        
        await scanner_config_collection.update_one(
            {},
            {"$set": {
                "connected": True,
                "firmware_version": firmware_versions.get(scanner_type, "N/A"),
                "driver_version": driver_versions.get(scanner_type, "N/A"),
                "hardware_mode": False,
                "remote_service": False,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log connection
        await scanner_logs_collection.insert_one({
            "log_id": str(uuid.uuid4()),
            "event": "connect",
            "scanner_type": scanner_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "hardware_mode": False,
            "remote_service": False
        })
        
        return {
            "success": True,
            "message": f"Scanner {SCANNER_TYPES[scanner_type]['name']} verbunden (Simulation)",
            "hardware_mode": False,
            "remote_service": False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect")
async def disconnect_scanner():
    """Disconnect from scanner"""
    try:
        config = await scanner_config_collection.find_one({})
        
        if not config:
            raise HTTPException(status_code=400, detail="Kein Scanner konfiguriert")
        
        if not config.get("connected", False):
            raise HTTPException(status_code=400, detail="Scanner ist nicht verbunden")
        
        await scanner_config_collection.update_one(
            {},
            {"$set": {
                "connected": False,
                "disconnected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log disconnection
        await scanner_logs_collection.insert_one({
            "log_id": str(uuid.uuid4()),
            "event": "disconnect",
            "scanner_type": config["scanner_type"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success"
        })
        
        return {
            "success": True,
            "message": "Scanner getrennt"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_scanner(test: ScannerTest):
    """Test scanner functionality"""
    try:
        config = await scanner_config_collection.find_one({})
        
        if not config:
            raise HTTPException(status_code=400, detail="Kein Scanner konfiguriert")
        
        if not config.get("connected", False):
            raise HTTPException(status_code=400, detail="Scanner ist nicht verbunden")
        
        scanner_type = config["scanner_type"]
        
        # Try to use real hardware for Desko scanner
        if scanner_type == "desko" and DESKO_AVAILABLE:
            desko = get_desko_scanner()
            hw_result = desko.test_scanner(test.test_type)
            
            if hw_result["success"]:
                test_results = {
                    "test_type": test.test_type,
                    "scanner_type": scanner_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "results": hw_result["results"],
                    "duration_ms": hw_result.get("duration_ms", 0),
                    "hardware_mode": hw_result["results"].get("hardware_detected", False)
                }
                
                await scanner_logs_collection.insert_one({
                    "log_id": str(uuid.uuid4()),
                    "event": "test",
                    "scanner_type": scanner_type,
                    "test_type": test.test_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "success",
                    "results": hw_result["results"],
                    "hardware_mode": hw_result["results"].get("hardware_detected", False)
                })
                
                await scanner_config_collection.update_one(
                    {},
                    {"$set": {"last_scan": datetime.now(timezone.utc).isoformat()}}
                )
                
                mode = "Hardware" if hw_result["results"].get("hardware_detected") else "Simulation"
                return {
                    "success": True,
                    "message": f"Scanner-Test erfolgreich ({mode})",
                    "test_results": test_results
                }
        
        # Fallback to simulation
        test_results = {
            "test_type": test.test_type,
            "scanner_type": scanner_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": {
                "connection": "OK",
                "lamp": "OK",
                "sensor": "OK",
                "motor": "OK",
                "calibration": "OK" if test.test_type == "full" else "Skipped",
                "hardware_detected": False
            },
            "duration_ms": 1250 if test.test_type == "full" else 450,
            "hardware_mode": False
        }
        
        # Log test
        await scanner_logs_collection.insert_one({
            "log_id": str(uuid.uuid4()),
            "event": "test",
            "scanner_type": scanner_type,
            "test_type": test.test_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "results": test_results["results"],
            "hardware_mode": False
        })
        
        # Update last scan
        await scanner_config_collection.update_one(
            {},
            {"$set": {"last_scan": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": "Scanner-Test erfolgreich (Simulation)",
            "test_results": test_results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_scanner_logs(limit: int = 50):
    """Get scanner event logs"""
    try:
        logs = await scanner_logs_collection.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
        
        # Remove MongoDB _id
        for log in logs:
            log.pop('_id', None)
        
        return {
            "success": True,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/firmware")
async def get_firmware_info():
    """Get scanner firmware information"""
    try:
        config = await scanner_config_collection.find_one({})
        
        if not config:
            return {
                "success": True,
                "has_scanner": False,
                "message": "Kein Scanner konfiguriert"
            }
        
        scanner_type = config.get("scanner_type")
        scanner_info = SCANNER_TYPES.get(scanner_type, {})
        
        return {
            "success": True,
            "has_scanner": True,
            "scanner_type": scanner_type,
            "scanner_name": scanner_info.get("name"),
            "manufacturer": scanner_info.get("manufacturer"),
            "model": scanner_info.get("model"),
            "firmware_version": config.get("firmware_version", "N/A"),
            "driver_version": config.get("driver_version", "N/A"),
            "features": scanner_info.get("features", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
