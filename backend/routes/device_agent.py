"""
TSRID Device Agent API
Backend-Endpunkte für PowerShell/Windows Agent Kommunikation
Ermöglicht Geräteregistrierung, Status-Updates und Konfigurationsabruf
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import json
import asyncio

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
        {"_id": 0, "location_code": 1, "location_name": 1, "device_number": 1, "assigned": 1}
    )
    
    return {
        "success": True,
        "config": device_doc if device_doc else None
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


@router.get("/devices")
async def list_devices(
    status: Optional[str] = None,
    assigned: Optional[bool] = None,
    location_code: Optional[str] = None
):
    """
    Listet alle registrierten Geräte auf.
    """
    # Using global db
    
    query = {}
    if status:
        query["status"] = status
    if assigned is not None:
        query["assigned"] = assigned
    if location_code:
        query["location_code"] = location_code
    
    cursor = db.registered_devices.find(
        query,
        {"_id": 0}
    ).sort("last_seen", -1)
    devices = await cursor.to_list(length=500)
    
    # Markiere Geräte als offline wenn länger als 2 Minuten nicht gesehen
    now = datetime.now(timezone.utc)
    for device in devices:
        if device.get("last_seen"):
            last_seen = datetime.fromisoformat(device["last_seen"].replace("Z", "+00:00"))
            if (now - last_seen).total_seconds() > 120:
                device["status"] = "offline"
    
    # Statistiken
    online_count = len([d for d in devices if d.get("status") == "online"])
    assigned_count = len([d for d in devices if d.get("assigned")])
    
    return {
        "success": True,
        "devices": devices,
        "total": len(devices),
        "online": online_count,
        "offline": len(devices) - online_count,
        "assigned": assigned_count,
        "unassigned": len(devices) - assigned_count
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
