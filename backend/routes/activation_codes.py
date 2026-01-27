"""
Activation Code Management API
Ermöglicht die Generierung und Validierung von Aktivierungscodes für Geräte.
Jeder Tenant hat seine eigenen Codes.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import secrets
import string
import qrcode
import io
import base64
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/activation", tags=["activation"])

# Database connections
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client['tsrid_db']
multi_tenant_db = client['multi_tenant_admin']
portal_db = client['portal_db']


class ActivationCodeCreate(BaseModel):
    device_id: str
    location_code: str
    tenant_id: str = "europcar"


class ActivationCodeValidate(BaseModel):
    code: str


class ActivationCodeActivate(BaseModel):
    code: str


def generate_activation_code(tenant_prefix: str = "EC") -> str:
    """Generiert einen eindeutigen Aktivierungscode"""
    # Format: EC-XXXX-XXXX (10 Zeichen + Präfix)
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(secrets.choice(chars) for _ in range(4))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f"{tenant_prefix}-{part1}-{part2}"


def generate_qr_code_base64(data: str) -> str:
    """Generiert einen QR-Code als Base64-String"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


@router.post("/generate")
async def generate_activation_code_for_device(data: ActivationCodeCreate):
    """
    Generiert einen neuen Aktivierungscode für ein Gerät.
    Nur Admins können Codes generieren.
    """
    try:
        # Prüfe ob Gerät existiert
        device = await multi_tenant_db.europcar_devices.find_one(
            {"device_id": data.device_id},
            {"_id": 0}
        )
        
        if not device:
            raise HTTPException(status_code=404, detail=f"Gerät {data.device_id} nicht gefunden")
        
        # Hole Standort-Details
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{data.location_code}$", "$options": "i"}},
            {"_id": 0}
        )
        
        # Tenant-Präfix bestimmen
        tenant_prefix = "EC"  # Default für Europcar
        if data.tenant_id.lower() == "europcar":
            tenant_prefix = "EC"
        elif data.tenant_id.lower() == "sixt":
            tenant_prefix = "SX"
        else:
            tenant_prefix = data.tenant_id[:2].upper()
        
        # Generiere Code
        code = generate_activation_code(tenant_prefix)
        
        # Prüfe ob Code bereits existiert (sehr unwahrscheinlich)
        while await db.activation_codes.find_one({"code": code}):
            code = generate_activation_code(tenant_prefix)
        
        # QR-Code URL (zeigt auf die Aktivierungsseite)
        activation_url = f"https://activate.tsrid.de?code={code}"
        qr_code_base64 = generate_qr_code_base64(activation_url)
        
        # Speichere Aktivierungscode
        activation_record = {
            "code": code,
            "device_id": data.device_id,
            "location_code": data.location_code,
            "tenant_id": data.tenant_id,
            "qr_code_base64": qr_code_base64,
            "activation_url": activation_url,
            "status": "pending",  # pending, activated, expired
            "created_at": datetime.now(timezone.utc).isoformat(),
            "activated_at": None,
            "activated_by": None,
            # Kopiere Geräte- und Standortdaten für schnellen Zugriff
            "device_data": {
                "sn_pc": device.get("sn_pc", ""),
                "sn_sc": device.get("sn_sc", ""),
                "teamviewer_id": device.get("teamviewer_id", ""),
                "customer": device.get("customer", ""),
                "city": device.get("city", ""),
                "country": device.get("country", "")
            },
            "location_data": {
                "name": location.get("station_name", "") if location else "",
                "street": location.get("street", "") if location else "",
                "postal_code": location.get("postal_code", "") if location else "",
                "city": location.get("city", "") if location else "",
                "phone": location.get("phone", "") if location else "",
                "email": location.get("email", "") if location else "",
                "manager": location.get("manager", "") if location else ""
            }
        }
        
        await db.activation_codes.insert_one(activation_record)
        
        # Entferne MongoDB _id für Response
        activation_record.pop("_id", None)
        
        return {
            "success": True,
            "message": f"Aktivierungscode für {data.device_id} generiert",
            "activation_code": activation_record
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/{code}")
async def validate_activation_code(code: str):
    """
    Validiert einen Aktivierungscode und gibt alle Gerätedaten zurück.
    Dies wird aufgerufen wenn der QR-Code gescannt oder der Code eingegeben wird.
    """
    try:
        # Suche Aktivierungscode (case-insensitive)
        activation = await db.activation_codes.find_one(
            {"code": {"$regex": f"^{code}$", "$options": "i"}},
            {"_id": 0}
        )
        
        if not activation:
            return {
                "success": False,
                "valid": False,
                "message": "Ungültiger Aktivierungscode"
            }
        
        if activation.get("status") == "activated":
            return {
                "success": True,
                "valid": True,
                "already_activated": True,
                "message": "Dieser Code wurde bereits aktiviert",
                "activated_at": activation.get("activated_at"),
                "device_id": activation.get("device_id")
            }
        
        if activation.get("status") == "expired":
            return {
                "success": False,
                "valid": False,
                "message": "Dieser Aktivierungscode ist abgelaufen"
            }
        
        # Hole aktuelle Gerätedaten (für den Fall dass sie sich geändert haben)
        device = await multi_tenant_db.europcar_devices.find_one(
            {"device_id": activation.get("device_id")},
            {"_id": 0}
        )
        
        # Hole aktuelle Standortdaten
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{activation.get('location_code')}$", "$options": "i"}},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "valid": True,
            "already_activated": False,
            "message": "Aktivierungscode gültig",
            "activation_data": {
                "code": activation.get("code"),
                "tenant": {
                    "id": activation.get("tenant_id"),
                    "name": device.get("customer", "Europcar") if device else "Europcar"
                },
                "device": {
                    "device_id": activation.get("device_id"),
                    "sn_pc": device.get("sn_pc", "") if device else activation.get("device_data", {}).get("sn_pc", ""),
                    "sn_sc": device.get("sn_sc", "") if device else activation.get("device_data", {}).get("sn_sc", ""),
                    "teamviewer_id": device.get("teamviewer_id", "") if device else "",
                    "status": device.get("status", "unknown") if device else "unknown"
                },
                "location": {
                    "code": activation.get("location_code"),
                    "name": location.get("station_name", "") if location else activation.get("location_data", {}).get("name", ""),
                    "street": location.get("street", "") if location else activation.get("location_data", {}).get("street", ""),
                    "postal_code": location.get("postal_code", "") if location else activation.get("location_data", {}).get("postal_code", ""),
                    "city": location.get("city", "") if location else activation.get("location_data", {}).get("city", ""),
                    "country": device.get("country", "Germany") if device else "Germany",
                    "phone": location.get("phone", "") if location else activation.get("location_data", {}).get("phone", ""),
                    "email": location.get("email", "") if location else activation.get("location_data", {}).get("email", ""),
                    "manager": location.get("manager", "") if location else activation.get("location_data", {}).get("manager", "")
                },
                "license": {
                    "status": "active",  # TODO: Echte Lizenzprüfung
                    "valid_until": "2026-12-31"
                },
                "created_at": activation.get("created_at")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/activate")
async def activate_device_with_code(data: ActivationCodeActivate):
    """
    Aktiviert/Koppelt ein Gerät mit dem Aktivierungscode.
    Dies wird aufgerufen wenn der Benutzer auf "Aktivieren" klickt.
    """
    try:
        # Suche und validiere Code
        activation = await db.activation_codes.find_one(
            {"code": {"$regex": f"^{data.code}$", "$options": "i"}}
        )
        
        if not activation:
            raise HTTPException(status_code=404, detail="Ungültiger Aktivierungscode")
        
        if activation.get("status") == "activated":
            raise HTTPException(status_code=400, detail="Code bereits aktiviert")
        
        if activation.get("status") == "expired":
            raise HTTPException(status_code=400, detail="Code abgelaufen")
        
        # Hole vollständige Daten
        device = await multi_tenant_db.europcar_devices.find_one(
            {"device_id": activation.get("device_id")},
            {"_id": 0}
        )
        
        location = await portal_db.tenant_locations.find_one(
            {"location_code": {"$regex": f"^{activation.get('location_code')}$", "$options": "i"}},
            {"_id": 0}
        )
        
        # Update Aktivierungscode-Status
        await db.activation_codes.update_one(
            {"code": activation.get("code")},
            {
                "$set": {
                    "status": "activated",
                    "activated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update Gerätestatus in europcar_devices
        await multi_tenant_db.europcar_devices.update_one(
            {"device_id": activation.get("device_id")},
            {
                "$set": {
                    "status": "active",
                    "coupled_at": datetime.now(timezone.utc).isoformat(),
                    "activation_code": activation.get("code")
                }
            }
        )
        
        # Erstelle Konfiguration für localStorage (wird vom Frontend verwendet)
        device_config = {
            "device_id": activation.get("device_id"),
            "station_code": activation.get("location_code"),
            "location_name": location.get("station_name", "") if location else "",
            "street": location.get("street", "") if location else "",
            "zip": location.get("postal_code", "") if location else "",
            "city": location.get("city", "") if location else "",
            "country": device.get("country", "Germany") if device else "Germany",
            "phone": location.get("phone", "") if location else "",
            "email": location.get("email", "") if location else "",
            "manager": location.get("manager", "") if location else "",
            "customer": device.get("customer", "") if device else "",
            "tenant_id": activation.get("tenant_id"),
            "tvid": device.get("teamviewer_id", "") if device else "",
            "sn_pc": device.get("sn_pc", "") if device else "",
            "sn_sc": device.get("sn_sc", "") if device else "",
            "main_typ": location.get("main_type", "") if location else "",
            "activation_code": activation.get("code"),
            "status": "active",
            "coupled_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "success": True,
            "message": f"Gerät {activation.get('device_id')} erfolgreich aktiviert",
            "device_config": device_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_activation_codes(
    tenant_id: str = Query(None, description="Filter nach Tenant"),
    status: str = Query(None, description="Filter nach Status (pending, activated, expired)"),
    limit: int = Query(50, description="Max. Anzahl")
):
    """
    Listet alle Aktivierungscodes (für Admin-Übersicht).
    """
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = {"$regex": f"^{tenant_id}$", "$options": "i"}
        if status:
            query["status"] = status
        
        cursor = db.activation_codes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        codes = await cursor.to_list(length=limit)
        
        return {
            "success": True,
            "codes": codes,
            "total": len(codes)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{code}")
async def delete_activation_code(code: str):
    """Löscht einen Aktivierungscode (nur für Admins)."""
    try:
        result = await db.activation_codes.delete_one(
            {"code": {"$regex": f"^{code}$", "$options": "i"}}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Code nicht gefunden")
        
        return {
            "success": True,
            "message": f"Aktivierungscode {code} gelöscht"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
