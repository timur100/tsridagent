"""
Agent/Device Registration API
Ermöglicht die Selbstregistrierung von Geräten mit Stationscode und Gerätenummer
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid

# Load .env file first
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/api/agent", tags=["Agent Registration"])

# MongoDB connection (gleiche wie locations.py)
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
# Multi-tenant database for devices
multi_tenant_db = client['multi_tenant_admin']


class DeviceRegistration(BaseModel):
    station_code: str  # z.B. "BERN01"
    device_number: str  # z.B. "01", "02"
    device_id: Optional[str] = None
    hostname: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    pc_serial: Optional[str] = None
    scanner_serial: Optional[str] = None
    teamviewer_id: Optional[str] = None


class DeviceCoupling(BaseModel):
    device_id: str
    location_code: str
    location_name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    customer: Optional[str] = None


@router.post("/couple-device")
async def couple_device(coupling: DeviceCoupling):
    """
    Koppelt ein Gerät mit einem Standort und dem Admin-Portal.
    Speichert die Kopplung in der Datenbank.
    """
    try:
        # Prüfe ob Gerät existiert
        device = await multi_tenant_db.europcar_devices.find_one({
            "device_id": coupling.device_id
        })
        
        if not device:
            # Gerät nicht gefunden - trotzdem Kopplung erlauben für neue Geräte
            pass
        
        # Erstelle Kopplungs-Eintrag
        coupling_data = {
            "device_id": coupling.device_id,
            "location_code": coupling.location_code,
            "location_name": coupling.location_name,
            "city": coupling.city,
            "country": coupling.country,
            "customer": coupling.customer,
            "coupled_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "last_seen": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert in coupled_devices Collection
        await db.coupled_devices.update_one(
            {"device_id": coupling.device_id},
            {"$set": coupling_data},
            upsert=True
        )
        
        # Update Status im europcar_devices
        if device:
            await multi_tenant_db.europcar_devices.update_one(
                {"device_id": coupling.device_id},
                {"$set": {
                    "coupled": True,
                    "coupled_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "success": True,
            "message": f"Gerät {coupling.device_id} erfolgreich mit {coupling.location_code} gekoppelt",
            "coupling": coupling_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register_device(registration: DeviceRegistration):
    """
    Registriert ein Gerät mit Stationscode und Gerätenummer.
    Gibt die vollständigen Standortinformationen zurück.
    """
    try:
        # Suche zuerst in key_locations (primäre Standort-Collection)
        location = await db.key_locations.find_one({
            "$or": [
                {"location_id": registration.station_code},
                {"locationCode": registration.station_code},
                {"station_code": registration.station_code}
            ]
        })
        
        # Falls nicht gefunden, versuche in locations
        if not location:
            location = await db.locations.find_one({
                "locationCode": registration.station_code
            })
        
        if not location:
            raise HTTPException(
                status_code=404, 
                detail=f"Station '{registration.station_code}' nicht gefunden. Bitte prüfen Sie den Stationscode."
            )
        
        # Generiere eine eindeutige Geräte-ID falls nicht vorhanden
        device_id = registration.device_id or f"{registration.station_code}-{registration.device_number}-{uuid.uuid4().hex[:8]}"
        
        # Erstelle/Aktualisiere den Geräteeintrag
        device_data = {
            "device_id": device_id,
            "station_code": registration.station_code,
            "device_number": registration.device_number,
            "hostname": registration.hostname,
            "mac_address": registration.mac_address,
            "ip_address": registration.ip_address,
            "pc_serial": registration.pc_serial,
            "scanner_serial": registration.scanner_serial,
            "teamviewer_id": registration.teamviewer_id,
            "location_id": str(location.get("_id", "")),
            "location_name": location.get("locationName") or location.get("name", ""),
            "status": "active",
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "last_seen": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert das Gerät
        await db.registered_devices.update_one(
            {
                "station_code": registration.station_code,
                "device_number": registration.device_number
            },
            {"$set": device_data},
            upsert=True
        )
        
        # Baue die Standortinformationen für das Gerät
        station_info = {
            "success": True,
            "message": "Gerät erfolgreich registriert",
            "device_id": device_id,
            "station": {
                "station_code": registration.station_code,
                "device_number": registration.device_number,
                "location_name": location.get("locationName") or location.get("name", ""),
                "street": location.get("street", ""),
                "zip": location.get("zip", ""),
                "city": location.get("city", ""),
                "state": location.get("state", ""),
                "country": location.get("country", ""),
                "continent": location.get("continent", ""),
                "phone": location.get("phone", ""),
                "email": location.get("email", ""),
                "tvid": location.get("tvid", ""),
                "sn_station": location.get("snStation", ""),
                "sn_scanner": location.get("snScanner", "")
            },
            "settings": location.get("settings", {})
        }
        
        return station_info
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/station/{station_code}")
async def get_station_info(station_code: str, device_number: Optional[str] = None):
    """
    Gibt die Standortinformationen für einen Stationscode zurück.
    """
    try:
        # Suche zuerst in key_locations (primäre Standort-Collection)
        location = await db.key_locations.find_one({
            "$or": [
                {"location_id": station_code},
                {"locationCode": station_code},
                {"station_code": station_code}
            ]
        })
        
        # Falls nicht gefunden, versuche in locations
        if not location:
            location = await db.locations.find_one({"locationCode": station_code})
        
        if not location:
            raise HTTPException(status_code=404, detail=f"Station '{station_code}' nicht gefunden")
        
        # Extrahiere die Felder (key_locations hat andere Feldnamen)
        return {
            "success": True,
            "station": {
                "station_code": location.get("location_id") or location.get("locationCode") or station_code,
                "device_number": device_number or location.get("deviceNumber", "01"),
                "location_name": location.get("name") or location.get("locationName", ""),
                "street": location.get("street", ""),
                "zip": location.get("zip", ""),
                "city": location.get("city", ""),
                "state": location.get("state", ""),
                "country": location.get("country", ""),
                "continent": location.get("continent", ""),
                "phone": location.get("phone", ""),
                "email": location.get("email", ""),
                "tvid": location.get("tvid", ""),
                "sn_station": location.get("snStation", ""),
                "sn_scanner": location.get("snScanner", "")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stations")
async def list_all_stations():
    """
    Gibt alle verfügbaren Stationen zurück (für Offline-Cache).
    """
    try:
        # Hole alle Standorte
        cursor = db.locations.find({}, {"_id": 0})
        locations = await cursor.to_list(length=1000)
        
        # Hole auch aus key_locations
        cursor2 = db.key_locations.find({}, {"_id": 0})
        key_locations = await cursor2.to_list(length=1000)
        
        # Kombiniere und formatiere
        stations = []
        
        for loc in locations:
            stations.append({
                "station_code": loc.get("locationCode", ""),
                "location_name": loc.get("locationName", ""),
                "city": loc.get("city", ""),
                "state": loc.get("state", ""),
                "country": loc.get("country", ""),
                "continent": loc.get("continent", "")
            })
        
        for loc in key_locations:
            code = loc.get("location_id") or loc.get("locationCode") or loc.get("station_code")
            if code and not any(s["station_code"] == code for s in stations):
                stations.append({
                    "station_code": code,
                    "location_name": loc.get("name") or loc.get("locationName", ""),
                    "city": loc.get("city", ""),
                    "state": loc.get("state", ""),
                    "country": loc.get("country", ""),
                    "continent": loc.get("continent", "")
                })
        
        return {
            "success": True,
            "stations": stations,
            "total": len(stations),
            "sync_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices")
async def list_registered_devices():
    """
    Gibt alle registrierten Geräte zurück.
    """
    try:
        cursor = db.registered_devices.find({}, {"_id": 0})
        devices = await cursor.to_list(length=1000)
        
        return {
            "success": True,
            "devices": devices,
            "total": len(devices)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heartbeat")
async def device_heartbeat(data: dict):
    """
    Empfängt einen Heartbeat von einem registrierten Gerät.
    """
    try:
        device_id = data.get("device_id")
        station_code = data.get("station_code")
        
        if not device_id and not station_code:
            raise HTTPException(status_code=400, detail="device_id oder station_code erforderlich")
        
        query = {}
        if device_id:
            query["device_id"] = device_id
        elif station_code:
            query["station_code"] = station_code
            if data.get("device_number"):
                query["device_number"] = data["device_number"]
        
        update_data = {
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "status": "online"
        }
        
        # Aktualisiere optionale Felder
        if data.get("ip_address"):
            update_data["ip_address"] = data["ip_address"]
        if data.get("hostname"):
            update_data["hostname"] = data["hostname"]
        if data.get("scanner_status"):
            update_data["scanner_status"] = data["scanner_status"]
        if data.get("db_stats"):
            update_data["db_stats"] = data["db_stats"]
        
        result = await db.registered_devices.update_one(query, {"$set": update_data})
        
        if result.matched_count == 0:
            return {
                "success": False,
                "message": "Gerät nicht gefunden. Bitte registrieren."
            }
        
        return {
            "success": True,
            "message": "Heartbeat empfangen",
            "timestamp": update_data["last_seen"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/locations")
async def sync_locations(since: Optional[str] = None):
    """
    Gibt Standorte für die SQLite-Synchronisation zurück.
    Optional gefiltert nach Änderungsdatum.
    """
    try:
        query = {}
        if since:
            query["updated_at"] = {"$gte": since}
        
        cursor = db.locations.find(query, {"_id": 0})
        locations = await cursor.to_list(length=1000)
        
        return {
            "success": True,
            "locations": locations,
            "total": len(locations),
            "sync_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
