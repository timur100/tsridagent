"""
TSRID Agent API
Backend-Endpunkte für die Electron Agent Kommunikation
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import logging

from db.connection import get_mongo_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent", tags=["agent"])

# MongoDB
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')

def get_db():
    return get_mongo_client()[DB_NAME]


# ==================== MODELS ====================

class DeviceRegistration(BaseModel):
    device_id: str
    location_code: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    app_version: Optional[str] = None
    registered_at: Optional[str] = None


class HeartbeatPayload(BaseModel):
    device_id: str
    hostname: Optional[str] = None
    platform: Optional[str] = None
    osVersion: Optional[str] = None
    status: Optional[str] = 'online'
    memory: Optional[Dict[str, Any]] = None
    network: Optional[Dict[str, Any]] = None
    uptime: Optional[float] = None
    scans: Optional[Dict[str, int]] = None
    location_code: Optional[str] = None
    app_version: Optional[str] = None
    timestamp: Optional[str] = None


class ScanData(BaseModel):
    id: str
    scan_type: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_country: Optional[str] = None
    mrz_line1: Optional[str] = None
    mrz_line2: Optional[str] = None
    mrz_line3: Optional[str] = None
    result: Optional[str] = None
    result_details: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    location_code: Optional[str] = None
    device_id: Optional[str] = None
    operator_id: Optional[str] = None
    scanner_type: Optional[str] = None
    scanned_at: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class ScanBatchRequest(BaseModel):
    device_id: str
    scans: List[ScanData]


class SingleScanRequest(BaseModel):
    device_id: str
    scan: ScanData


class LogUpload(BaseModel):
    device_id: str
    app_logs: Optional[List[Dict[str, Any]]] = None
    sync_logs: Optional[List[Dict[str, Any]]] = None
    system_info: Optional[Dict[str, Any]] = None


# ==================== ENDPOINTS ====================

@router.post("/register")
async def register_device(registration: DeviceRegistration):
    """
    Registriert ein neues Gerät oder aktualisiert ein existierendes
    """
    try:
        db = get_db()
        
        device_doc = {
            "device_id": registration.device_id,
            "location_code": registration.location_code,
            "device_info": registration.device_info,
            "app_version": registration.app_version,
            "status": "online",
            "registered_at": registration.registered_at or datetime.now(timezone.utc).isoformat(),
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert - erstellen oder aktualisieren
        result = db.agent_devices.update_one(
            {"device_id": registration.device_id},
            {"$set": device_doc},
            upsert=True
        )
        
        logger.info(f"Device registered: {registration.device_id}")
        
        return {
            "success": True,
            "device_id": registration.device_id,
            "message": "Device registered successfully",
            "is_new": result.upserted_id is not None
        }
        
    except Exception as e:
        logger.error(f"Error registering device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heartbeat")
async def receive_heartbeat(payload: HeartbeatPayload):
    """
    Empfängt Heartbeat von einem Gerät und gibt pending Commands zurück
    """
    try:
        db = get_db()
        
        # Gerät aktualisieren
        update_doc = {
            "status": payload.status or "online",
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "last_heartbeat": payload.dict()
        }
        
        if payload.location_code:
            update_doc["location_code"] = payload.location_code
        if payload.app_version:
            update_doc["app_version"] = payload.app_version
        
        db.agent_devices.update_one(
            {"device_id": payload.device_id},
            {"$set": update_doc}
        )
        
        # Pending Commands für dieses Gerät abrufen
        commands = list(db.agent_commands.find(
            {
                "device_id": payload.device_id,
                "status": "pending"
            },
            {"_id": 0}
        ))
        
        # Commands als "sent" markieren
        if commands:
            command_ids = [cmd.get("id") or cmd.get("command_id") for cmd in commands]
            db.agent_commands.update_many(
                {"device_id": payload.device_id, "status": "pending"},
                {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {
            "received": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "commands": commands
        }
        
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scans/batch")
async def receive_scans_batch(request: ScanBatchRequest):
    """
    Empfängt mehrere Scans auf einmal (Batch-Upload)
    """
    try:
        db = get_db()
        
        if not request.scans:
            return {"success": True, "synced": 0}
        
        # Scans vorbereiten
        scan_docs = []
        for scan in request.scans:
            scan_doc = scan.dict()
            scan_doc["source_device_id"] = request.device_id
            scan_doc["synced_at"] = datetime.now(timezone.utc).isoformat()
            scan_doc["sync_source"] = "agent_batch"
            scan_docs.append(scan_doc)
        
        # Bulk Insert
        result = db.id_scans.insert_many(scan_docs, ordered=False)
        
        logger.info(f"Batch sync: {len(result.inserted_ids)} scans from {request.device_id}")
        
        return {
            "success": True,
            "synced": len(result.inserted_ids),
            "device_id": request.device_id
        }
        
    except Exception as e:
        logger.error(f"Error in batch sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scans")
async def receive_single_scan(request: SingleScanRequest):
    """
    Empfängt einen einzelnen Scan
    """
    try:
        db = get_db()
        
        scan_doc = request.scan.dict()
        scan_doc["source_device_id"] = request.device_id
        scan_doc["synced_at"] = datetime.now(timezone.utc).isoformat()
        scan_doc["sync_source"] = "agent_single"
        
        result = db.id_scans.insert_one(scan_doc)
        
        logger.info(f"Single scan synced: {request.scan.id} from {request.device_id}")
        
        return {
            "success": True,
            "scan_id": request.scan.id,
            "device_id": request.device_id
        }
        
    except Exception as e:
        logger.error(f"Error syncing scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{device_id}/logs")
async def receive_logs(device_id: str, logs: LogUpload):
    """
    Empfängt Logs von einem Gerät
    """
    try:
        db = get_db()
        
        log_doc = {
            "device_id": device_id,
            "app_logs": logs.app_logs,
            "sync_logs": logs.sync_logs,
            "system_info": logs.system_info,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.agent_logs.insert_one(log_doc)
        
        logger.info(f"Logs received from {device_id}")
        
        return {"success": True, "device_id": device_id}
        
    except Exception as e:
        logger.error(f"Error receiving logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}/commands")
async def get_pending_commands(device_id: str):
    """
    Holt pending Commands für ein Gerät
    """
    try:
        db = get_db()
        
        commands = list(db.agent_commands.find(
            {"device_id": device_id, "status": "pending"},
            {"_id": 0}
        ))
        
        return {"commands": commands}
        
    except Exception as e:
        logger.error(f"Error getting commands: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{device_id}/command")
async def send_command(device_id: str, command: Dict[str, Any]):
    """
    Sendet einen Befehl an ein Gerät
    """
    try:
        db = get_db()
        
        import uuid
        command_doc = {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "type": command.get("type"),
            "data": command.get("data"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.agent_commands.insert_one(command_doc)
        
        logger.info(f"Command sent to {device_id}: {command.get('type')}")
        
        return {"success": True, "command_id": command_doc["id"]}
        
    except Exception as e:
        logger.error(f"Error sending command: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices")
async def list_devices():
    """
    Listet alle registrierten Geräte
    """
    try:
        db = get_db()
        
        devices = list(db.agent_devices.find({}, {"_id": 0}))
        
        # Berechne Online-Status (online wenn last_seen < 2 Minuten)
        now = datetime.now(timezone.utc)
        for device in devices:
            last_seen = device.get("last_seen")
            if last_seen:
                try:
                    last_seen_dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                    diff = (now - last_seen_dt).total_seconds()
                    device["is_online"] = diff < 120  # 2 Minuten
                    device["seconds_since_seen"] = int(diff)
                except:
                    device["is_online"] = False
            else:
                device["is_online"] = False
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices),
            "online": sum(1 for d in devices if d.get("is_online"))
        }
        
    except Exception as e:
        logger.error(f"Error listing devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    """
    Holt Details zu einem Gerät
    """
    try:
        db = get_db()
        
        device = db.agent_devices.find_one({"device_id": device_id}, {"_id": 0})
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Letzte Scans
        recent_scans = list(db.id_scans.find(
            {"source_device_id": device_id},
            {"_id": 0}
        ).sort("scanned_at", -1).limit(10))
        
        # Letzte Logs
        recent_logs = db.agent_logs.find_one(
            {"device_id": device_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "device": device,
            "recent_scans": recent_scans,
            "recent_logs": recent_logs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scans")
async def list_scans(
    location_code: Optional[str] = None,
    device_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Listet Scans mit optionalen Filtern
    """
    try:
        db = get_db()
        
        query = {}
        if location_code:
            query["location_code"] = location_code
        if device_id:
            query["source_device_id"] = device_id
        
        total = db.id_scans.count_documents(query)
        
        scans = list(db.id_scans.find(
            query,
            {"_id": 0}
        ).sort("scanned_at", -1).skip(offset).limit(limit))
        
        return {
            "success": True,
            "scans": scans,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error listing scans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_agent_stats():
    """
    Holt Statistiken über alle Agents
    """
    try:
        db = get_db()
        
        total_devices = db.agent_devices.count_documents({})
        total_scans = db.id_scans.count_documents({})
        
        # Online Devices (last_seen < 2 min)
        two_min_ago = datetime.now(timezone.utc).isoformat()
        # Vereinfacht - zähle alle mit status=online
        online_devices = db.agent_devices.count_documents({"status": "online"})
        
        # Scans heute
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        scans_today = db.id_scans.count_documents({
            "scanned_at": {"$gte": today_start.isoformat()}
        })
        
        # Scans nach Ergebnis
        valid_scans = db.id_scans.count_documents({"result": "valid"})
        invalid_scans = db.id_scans.count_documents({"result": "invalid"})
        
        return {
            "success": True,
            "stats": {
                "total_devices": total_devices,
                "online_devices": online_devices,
                "total_scans": total_scans,
                "scans_today": scans_today,
                "valid_scans": valid_scans,
                "invalid_scans": invalid_scans
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LOCATIONS EXPORT ====================

@router.get("/locations/export")
async def export_locations_for_offline():
    """
    Exportiert alle Standorte für Offline-Cache auf Agents
    """
    try:
        db = get_db()
        
        # Locations aus tenants Collection
        locations = list(db.tenants.find(
            {"tenant_level": "location"},
            {
                "_id": 0,
                "location_code": 1,
                "name": 1,
                "display_name": 1,
                "address": 1,
                "city": 1,
                "country_code": 1,
                "tenant_id": 1,
                "parent_tenant_id": 1
            }
        ))
        
        return {
            "success": True,
            "locations": locations,
            "count": len(locations),
            "exported_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error exporting locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
