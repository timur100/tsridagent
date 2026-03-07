"""
TSRID Device Agent API
Backend-Endpunkte für PowerShell/Windows Agent Kommunikation
Ermöglicht Geräteregistrierung, Status-Updates und Konfigurationsabruf
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/device-agent", tags=["Device Agent"])

# MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ==================== MODELS ====================

class DeviceInfo(BaseModel):
    device_id: str
    computername: str
    location_code: Optional[str] = None
    device_number: Optional[str] = None
    
    # Hardware IDs
    uuid: Optional[str] = None
    bios_serial: Optional[str] = None
    mainboard_serial: Optional[str] = None
    teamviewer_id: Optional[str] = None
    
    # Process Status
    teamviewer_status: Optional[str] = None
    tsrid_status: Optional[str] = None
    
    # Hardware Info
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    cpu: Optional[str] = None
    cpu_cores: Optional[int] = None
    cpu_threads: Optional[int] = None
    ram_gb: Optional[float] = None
    
    # Network
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    
    # OS
    windows_version: Optional[str] = None
    windows_build: Optional[str] = None
    
    # Storage
    disks: Optional[str] = None
    
    # Timestamp
    timestamp: Optional[str] = None


class DeviceAssignment(BaseModel):
    device_id: str
    location_code: str
    location_name: Optional[str] = None
    device_number: Optional[str] = None
    assigned_by: Optional[str] = None


class DeviceConfig(BaseModel):
    location_code: str
    location_name: str
    device_number: str
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    scanner_config: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, bool]] = None


# ==================== WEBSOCKET CONNECTIONS ====================

connected_devices: Dict[str, WebSocket] = {}
admin_connections: List[WebSocket] = []


async def broadcast_to_admins(message: dict):
    """Sendet eine Nachricht an alle verbundenen Admin-Clients"""
    disconnected = []
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except:
            disconnected.append(ws)
    for ws in disconnected:
        admin_connections.remove(ws)


# ==================== ENDPOINTS ====================

@router.post("/register")
async def register_device(device: DeviceInfo):
    """
    Registriert ein Gerät oder aktualisiert dessen Daten.
    Das Gerät sendet alle Hardwareinformationen beim Start.
    """
    # Using global db
    
    # Prüfe ob bereits eine Zuweisung existiert
    existing = await db.device_assignments.find_one({
        "$or": [
            {"device_id": device.device_id},
            {"hardware_ids.uuid": device.uuid},
            {"hardware_ids.bios_serial": device.bios_serial}
        ]
    })
    
    # Speichere Gerätedaten
    device_data = {
        "device_id": device.device_id,
        "computername": device.computername,
        "hardware_ids": {
            "uuid": device.uuid,
            "bios_serial": device.bios_serial,
            "mainboard_serial": device.mainboard_serial
        },
        "teamviewer_id": device.teamviewer_id,
        "hardware": {
            "manufacturer": device.manufacturer,
            "model": device.model,
            "cpu": device.cpu,
            "cpu_cores": device.cpu_cores,
            "cpu_threads": device.cpu_threads,
            "ram_gb": device.ram_gb,
            "disks": device.disks
        },
        "network": {
            "mac_address": device.mac_address,
            "ip_address": device.ip_address
        },
        "os": {
            "windows_version": device.windows_version,
            "windows_build": device.windows_build
        },
        "process_status": {
            "teamviewer": device.teamviewer_status,
            "tsrid": device.tsrid_status
        },
        "status": "online",
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "registered_at": datetime.now(timezone.utc).isoformat() if not existing else existing.get("registered_at"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Wenn Zuweisung existiert, füge Location hinzu
    if existing and existing.get("location_code"):
        device_data["location_code"] = existing["location_code"]
        device_data["location_name"] = existing.get("location_name")
        device_data["device_number"] = existing.get("device_number")
        device_data["assigned"] = True
    else:
        device_data["assigned"] = False
        device_data["location_code"] = device.location_code
        device_data["device_number"] = device.device_number
    
    # Upsert in devices collection
    await db.registered_devices.update_one(
        {"device_id": device.device_id},
        {"$set": device_data},
        upsert=True
    )
    
    # Broadcast an Admins
    await broadcast_to_admins({
        "type": "device_registered",
        "device": device_data
    })
    
    # Hole Konfiguration wenn zugewiesen
    config = None
    if device_data.get("assigned") and device_data.get("location_code"):
        location = await db.unified_locations.find_one(
            {"location_code": device_data["location_code"]},
            {"_id": 0}
        )
        if location:
            config = {
                "location_code": device_data["location_code"],
                "location_name": device_data.get("location_name") or location.get("location_name"),
                "device_number": device_data.get("device_number"),
                "tenant_id": location.get("tenant_id"),
                "tenant_name": location.get("tenant_name"),
                "city": location.get("city"),
                "country": location.get("country")
            }
    
    return {
        "success": True,
        "device_id": device.device_id,
        "assigned": device_data.get("assigned", False),
        "config": config,
        "message": "Gerät erfolgreich registriert" if not existing else "Gerätedaten aktualisiert"
    }


@router.post("/heartbeat")
async def device_heartbeat(device: DeviceInfo):
    """
    Empfängt regelmäßige Status-Updates vom Gerät (alle 30 Sekunden).
    """
    # Using global db
    
    update_data = {
        "status": "online",
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "process_status": {
            "teamviewer": device.teamviewer_status,
            "tsrid": device.tsrid_status
        },
        "network.ip_address": device.ip_address
    }
    
    result = await db.registered_devices.update_one(
        {"device_id": device.device_id},
        {"$set": update_data}
    )
    
    # Broadcast an Admins
    await broadcast_to_admins({
        "type": "device_heartbeat",
        "device_id": device.device_id,
        "status": "online",
        "process_status": update_data["process_status"],
        "timestamp": update_data["last_seen"]
    })
    
    # Hole aktuelle Konfiguration
    device_doc = await db.registered_devices.find_one(
        {"device_id": device.device_id},
        {"_id": 0, "location_code": 1, "location_name": 1, "device_number": 1, "assigned": 1, "pending_config": 1}
    )
    
    # Hole ausstehende Remote-Befehle aus der Datenbank
    commands = []
    cursor = db.remote_commands.find({
        "target_devices": device.device_id,
        "status": "pending"
    }, {"_id": 0})
    pending_cmds = await cursor.to_list(length=50)
    
    for cmd in pending_cmds:
        commands.append({
            "command_id": cmd.get("command_id"),
            "command": cmd.get("command"),
            "params": cmd.get("params", {}),
            "created_at": cmd.get("created_at")
        })
        
        # Markiere als dispatched
        await db.remote_commands.update_one(
            {"command_id": cmd.get("command_id")},
            {"$set": {
                "status": "dispatched",
                "dispatched_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    if commands:
        logger.info(f"Sending {len(commands)} commands to device {device.device_id}")
    
    # Lösche pending_config nach dem Senden
    if device_doc and device_doc.get("pending_config"):
        await db.registered_devices.update_one(
            {"device_id": device.device_id},
            {"$unset": {"pending_config": ""}}
        )
    
    return {
        "success": True,
        "config": device_doc if device_doc else None,
        "commands": commands,
        "pending_config": device_doc.get("pending_config") if device_doc else None
    }


@router.get("/config/{device_id}")
async def get_device_config(device_id: str):
    """
    Gibt die aktuelle Konfiguration für ein Gerät zurück.
    Das Gerät kann diese abrufen, um seine Station zu kennen.
    """
    # Using global db
    
    device = await db.registered_devices.find_one(
        {"device_id": device_id},
        {"_id": 0}
    )
    
    if not device:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
    
    if not device.get("assigned") or not device.get("location_code"):
        return {
            "success": True,
            "assigned": False,
            "message": "Gerät ist noch keiner Station zugewiesen"
        }
    
    # Hole Location-Details
    location = await db.unified_locations.find_one(
        {"location_code": device["location_code"]},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "assigned": True,
        "config": {
            "location_code": device["location_code"],
            "location_name": device.get("location_name") or (location.get("location_name") if location else None),
            "device_number": device.get("device_number"),
            "tenant_id": location.get("tenant_id") if location else None,
            "tenant_name": location.get("tenant_name") if location else None,
            "city": location.get("city") if location else None,
            "country": location.get("country") if location else None
        }
    }


@router.post("/assign")
async def assign_device(assignment: DeviceAssignment):
    """
    Weist ein Gerät einer Station zu (Admin-Funktion).
    """
    # Using global db
    
    # Prüfe ob Gerät existiert
    device = await db.registered_devices.find_one({"device_id": assignment.device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
    
    # Hole Location-Name wenn nicht angegeben
    location_name = assignment.location_name
    if not location_name:
        location = await db.unified_locations.find_one(
            {"location_code": assignment.location_code},
            {"_id": 0, "location_name": 1}
        )
        if location:
            location_name = location.get("location_name")
    
    # Update Gerät
    update_data = {
        "location_code": assignment.location_code,
        "location_name": location_name,
        "device_number": assignment.device_number,
        "assigned": True,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": assignment.assigned_by
    }
    
    await db.registered_devices.update_one(
        {"device_id": assignment.device_id},
        {"$set": update_data}
    )
    
    # Speichere auch in assignments collection für Historie
    await db.device_assignments.update_one(
        {"device_id": assignment.device_id},
        {"$set": {
            **update_data,
            "hardware_ids": device.get("hardware_ids", {})
        }},
        upsert=True
    )
    
    # Broadcast an Admins und Gerät
    await broadcast_to_admins({
        "type": "device_assigned",
        "device_id": assignment.device_id,
        "location_code": assignment.location_code,
        "location_name": location_name,
        "device_number": assignment.device_number
    })
    
    # Sende Konfiguration an Gerät wenn verbunden
    if assignment.device_id in connected_devices:
        try:
            await connected_devices[assignment.device_id].send_json({
                "type": "config_update",
                "config": {
                    "location_code": assignment.location_code,
                    "location_name": location_name,
                    "device_number": assignment.device_number
                }
            })
        except:
            pass
    
    return {
        "success": True,
        "message": f"Gerät {assignment.device_id} wurde {assignment.location_code}-{assignment.device_number} zugewiesen"
    }


@router.delete("/unassign/{device_id}")
async def unassign_device(device_id: str):
    """
    Entfernt die Stationszuweisung eines Geräts.
    """
    # Using global db
    
    await db.registered_devices.update_one(
        {"device_id": device_id},
        {"$set": {
            "assigned": False,
            "location_code": None,
            "location_name": None,
            "device_number": None,
            "unassigned_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await broadcast_to_admins({
        "type": "device_unassigned",
        "device_id": device_id
    })
    
    return {"success": True, "message": "Gerätezuweisung entfernt"}


@router.get("/locations")
async def get_locations():
    """
    Gibt alle verfügbaren Standorte für Gerätezuweisung zurück.
    Kombiniert Daten aus key_locations und unified_locations.
    """
    locations = []
    
    # Aus key_locations
    cursor = db.key_locations.find({}, {"_id": 0})
    key_locs = await cursor.to_list(length=500)
    for loc in key_locs:
        code = loc.get("location_id") or loc.get("name", "").replace(" ", "-").upper()[:10]
        locations.append({
            "location_code": code,
            "location_name": loc.get("name", "Unbekannt"),
            "city": loc.get("city", ""),
            "address": loc.get("address", "")
        })
    
    # Aus unified_locations
    cursor = db.unified_locations.find({}, {"_id": 0})
    unified_locs = await cursor.to_list(length=500)
    for loc in unified_locs:
        code = loc.get("station_code") or loc.get("name", "").replace(" ", "-").upper()[:10]
        # Nur hinzufügen wenn nicht bereits vorhanden
        if not any(l["location_code"] == code for l in locations):
            locations.append({
                "location_code": code,
                "location_name": loc.get("name", "Unbekannt"),
                "city": loc.get("city", ""),
                "address": loc.get("street", "")
            })
    
    # Sortieren nach Name
    locations.sort(key=lambda x: x.get("location_name", ""))
    
    return {
        "success": True,
        "locations": locations,
        "count": len(locations)
    }


@router.get("/devices")
async def list_devices(
    status: Optional[str] = None,
    assigned: Optional[bool] = None,
    location_code: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """
    Listet registrierte Geräte mit Pagination auf.
    - page: Seitennummer (ab 1)
    - limit: Anzahl pro Seite (max 100)
    """
    # Using global db
    
    # Limit begrenzen
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    # Query aufbauen
    query = {}
    
    # Status-Filter basierend auf last_seen Zeit
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(seconds=90)
    threshold_str = threshold.isoformat()
    
    if status == "online":
        query["last_seen"] = {"$gte": threshold_str}
    elif status == "offline":
        query["$or"] = [
            {"last_seen": {"$lt": threshold_str}},
            {"last_seen": None},
            {"last_seen": {"$exists": False}}
        ]
    
    if assigned is not None:
        query["assigned"] = assigned
    if location_code:
        query["location_code"] = location_code
    
    # Suche in mehreren Feldern
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        search_or = [
            {"computername": search_regex},
            {"location_code": search_regex},
            {"teamviewer_id": search_regex},
            {"network.ip_address": search_regex},
            {"hardware.manufacturer": search_regex},
            {"hardware.model": search_regex}
        ]
        # Combine with existing $or if present
        if "$or" in query:
            query = {"$and": [query, {"$or": search_or}]}
        else:
            query["$or"] = search_or
    
    # Gesamtanzahl für Pagination
    total_count = await db.registered_devices.count_documents(query)
    
    # Geräte abrufen mit Pagination
    cursor = db.registered_devices.find(
        query,
        {"_id": 0}
    ).sort("last_seen", -1).skip(skip).limit(limit)
    devices = await cursor.to_list(length=limit)
    
    # Markiere Geräte als offline wenn länger als 90 Sekunden nicht gesehen (schnellere Erkennung)
    now = datetime.now(timezone.utc)
    online_count = 0
    assigned_count = 0
    
    for device in devices:
        if device.get("last_seen"):
            try:
                last_seen = datetime.fromisoformat(device["last_seen"].replace("Z", "+00:00"))
                seconds_ago = (now - last_seen).total_seconds()
                if seconds_ago > 90:  # 90 Sekunden statt 120 für schnellere Offline-Erkennung
                    device["status"] = "offline"
                else:
                    device["status"] = "online"
                    online_count += 1
                device["seconds_since_seen"] = int(seconds_ago)
            except:
                device["status"] = "offline"
        else:
            device["status"] = "offline"
        if device.get("assigned"):
            assigned_count += 1
    
    # Gesamtstatistiken (für alle Geräte)
    total_stats = await db.registered_devices.aggregate([
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "assigned": {"$sum": {"$cond": ["$assigned", 1, 0]}}
        }}
    ]).to_list(length=1)
    
    stats = total_stats[0] if total_stats else {"total": 0, "assigned": 0}
    
    return {
        "success": True,
        "devices": devices,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
            "has_next": page * limit < total_count,
            "has_prev": page > 1
        },
        "total": stats.get("total", 0),
        "online": online_count,
        "offline": len(devices) - online_count,
        "assigned": stats.get("assigned", 0),
        "unassigned": stats.get("total", 0) - stats.get("assigned", 0)
    }


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    """
    Gibt Details zu einem spezifischen Gerät zurück.
    """
    # Using global db
    
    device = await db.registered_devices.find_one(
        {"device_id": device_id},
        {"_id": 0}
    )
    
    if not device:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")
    
    return {
        "success": True,
        "device": device
    }


@router.websocket("/ws/device/{device_id}")
async def device_websocket(websocket: WebSocket, device_id: str):
    """
    WebSocket-Verbindung für Echtzeit-Kommunikation mit einem Gerät.
    """
    await websocket.accept()
    connected_devices[device_id] = websocket
    
    # Using global db
    
    # Markiere Gerät als online
    await db.registered_devices.update_one(
        {"device_id": device_id},
        {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc).isoformat()}}
    )
    
    await broadcast_to_admins({
        "type": "device_connected",
        "device_id": device_id
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "heartbeat":
                # Update last_seen
                await db.registered_devices.update_one(
                    {"device_id": device_id},
                    {"$set": {
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "process_status": data.get("process_status", {})
                    }}
                )
                
                # Sende Bestätigung mit eventueller Konfig-Änderung
                device = await db.registered_devices.find_one(
                    {"device_id": device_id},
                    {"_id": 0, "location_code": 1, "location_name": 1, "device_number": 1}
                )
                
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "config": device
                })
                
                await broadcast_to_admins({
                    "type": "device_heartbeat",
                    "device_id": device_id,
                    "process_status": data.get("process_status", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            elif data.get("type") == "status_update":
                await broadcast_to_admins({
                    "type": "device_status",
                    "device_id": device_id,
                    "data": data
                })
    
    except WebSocketDisconnect:
        pass
    finally:
        if device_id in connected_devices:
            del connected_devices[device_id]
        
        await db.registered_devices.update_one(
            {"device_id": device_id},
            {"$set": {"status": "offline", "last_seen": datetime.now(timezone.utc).isoformat()}}
        )
        
        await broadcast_to_admins({
            "type": "device_disconnected",
            "device_id": device_id
        })


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    """
    WebSocket-Verbindung für Admin-Dashboard zur Echtzeit-Überwachung.
    """
    await websocket.accept()
    admin_connections.append(websocket)
    
    # Using global db
    
    # Sende initiale Geräteliste
    devices = await db.registered_devices.find({}, {"_id": 0}).to_list(length=500)
    await websocket.send_json({
        "type": "initial_devices",
        "devices": devices,
        "connected_device_ids": list(connected_devices.keys())
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Admin kann Befehle an Geräte senden
            if data.get("type") == "send_to_device":
                target_device_id = data.get("device_id")
                if target_device_id in connected_devices:
                    await connected_devices[target_device_id].send_json(data.get("payload", {}))
    
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in admin_connections:
            admin_connections.remove(websocket)


# ==========================================
# Remote Management API
# ==========================================

# Speicher für ausstehende Befehle
pending_commands = {}  # device_id -> list of commands

class RemoteCommand(BaseModel):
    """Remote-Befehl für Geräte"""
    command: str  # restart_agent, restart_pc, update_config, run_script, screenshot
    params: Optional[Dict[str, Any]] = None
    target_devices: List[str] = []  # Leere Liste = alle Geräte
    scheduled_at: Optional[str] = None  # ISO timestamp für geplante Ausführung


@router.post("/remote/command")
async def send_remote_command(cmd: RemoteCommand):
    """
    Sendet einen Remote-Befehl an ein oder mehrere Geräte.
    
    Verfügbare Befehle:
    - restart_agent: Agent-Dienst neu starten
    - restart_pc: Computer neu starten
    - shutdown_pc: Computer herunterfahren
    - update_config: Konfiguration aktualisieren (heartbeat_interval, api_url)
    - run_script: PowerShell-Script ausführen
    - message: Nachricht auf Gerät anzeigen
    """
    command_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    
    # Zielgeräte ermitteln
    if cmd.target_devices:
        target_ids = cmd.target_devices
    else:
        # Alle Online-Geräte
        threshold = datetime.now(timezone.utc) - timedelta(seconds=90)
        cursor = db.registered_devices.find(
            {"last_seen": {"$gte": threshold.isoformat()}},
            {"device_id": 1, "_id": 0}
        )
        docs = await cursor.to_list(length=1000)
        target_ids = [d["device_id"] for d in docs]
    
    if not target_ids:
        return {"success": False, "error": "Keine Zielgeräte gefunden"}
    
    # In DB speichern (nicht mehr In-Memory)
    await db.remote_commands.insert_one({
        "command_id": command_id,
        "command": cmd.command,
        "params": cmd.params,
        "target_devices": target_ids,
        "target_count": len(target_ids),
        "created_at": now,
        "scheduled_at": cmd.scheduled_at,
        "status": "pending",
        "results": {}
    })
    
    logger.info(f"Remote command '{cmd.command}' queued for {len(target_ids)} device(s)")
    
    return {
        "success": True,
        "command_id": command_id,
        "target_count": len(target_ids),
        "target_devices": target_ids,
        "message": f"Befehl '{cmd.command}' an {len(target_ids)} Gerät(e) gesendet"
    }


@router.get("/remote/commands/{device_id}")
async def get_pending_commands(device_id: str):
    """
    Gibt ausstehende Befehle für ein Gerät zurück.
    Wird vom Agent alle 5 Sekunden abgefragt für Echtzeit-Befehle.
    """
    # Hole pending Befehle aus der Datenbank
    cursor = db.remote_commands.find({
        "target_devices": device_id,
        "status": "pending"
    }, {"_id": 0})
    pending_cmds = await cursor.to_list(length=50)
    
    commands = []
    for cmd in pending_cmds:
        commands.append({
            "command_id": cmd.get("command_id"),
            "command": cmd.get("command"),
            "params": cmd.get("params", {}),
            "created_at": cmd.get("created_at")
        })
        
        # Markiere als dispatched
        await db.remote_commands.update_one(
            {"command_id": cmd.get("command_id")},
            {"$set": {
                "status": "dispatched",
                "dispatched_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "device_id": device_id,
        "commands": commands,
        "count": len(commands)
    }


@router.post("/remote/result")
async def report_command_result(result: Dict[str, Any]):
    """
    Meldet das Ergebnis eines ausgeführten Befehls.
    """
    device_id = result.get("device_id")
    command_id = result.get("command_id")
    success = result.get("success", False)
    output = result.get("output", "")
    error = result.get("error", "")
    
    # Befehl als ausgeführt markieren
    if device_id in pending_commands:
        for cmd in pending_commands[device_id]:
            if cmd.get("command_id") == command_id:
                cmd["status"] = "completed" if success else "failed"
                cmd["result"] = {"success": success, "output": output, "error": error}
                cmd["completed_at"] = datetime.now(timezone.utc).isoformat()
                break
    
    # In DB aktualisieren
    await db.remote_commands.update_one(
        {"command_id": command_id},
        {"$set": {
            f"results.{device_id}": {
                "success": success,
                "output": output,
                "error": error,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    # Admin benachrichtigen
    await broadcast_to_admins({
        "type": "command_result",
        "command_id": command_id,
        "device_id": device_id,
        "success": success,
        "output": output
    })
    
    return {"success": True, "message": "Ergebnis gespeichert"}


@router.get("/remote/history")
async def get_command_history(limit: int = 50):
    """
    Gibt die letzten Remote-Befehle zurück.
    """
    cursor = db.remote_commands.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    
    commands = await cursor.to_list(length=limit)
    
    return {
        "success": True,
        "commands": commands,
        "count": len(commands)
    }


@router.post("/remote/config/update")
async def update_device_config(config: Dict[str, Any]):
    """
    Aktualisiert die Konfiguration für Geräte.
    Die Geräte holen sich die neue Config beim nächsten Heartbeat.
    """
    target_devices = config.get("target_devices", [])
    new_config = config.get("config", {})
    
    # Wenn keine spezifischen Geräte, alle aktualisieren
    if target_devices:
        query = {"device_id": {"$in": target_devices}}
    else:
        query = {}
    
    result = await db.registered_devices.update_many(
        query,
        {"$set": {"pending_config": new_config}}
    )
    
    return {
        "success": True,
        "updated_count": result.modified_count,
        "config": new_config
    }

