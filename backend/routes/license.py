from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['test_database']
licenses_collection = db['licenses']
packages_collection = db['license_packages']

# Available features that can be licensed
AVAILABLE_FEATURES = [
    {"id": "document_upload", "name": "Dokumenten-Upload", "description": "Hochladen von Dokumentenbildern"},
    {"id": "flagged_scans", "name": "Fehlerhafte Dokumente System", "description": "Meldungen für auffällige Dokumente"},
    {"id": "license_class_recognition", "name": "Führerscheinklassen-Erkennung", "description": "Erkennung und Prüfung von Führerscheinklassen"},
    {"id": "banned_documents", "name": "Dokumenten-Sperrsystem", "description": "Dezentrales Sperrsystem für Dokumente"},
    {"id": "master_sync", "name": "Master-Geräte-Synchronisation", "description": "Zentrale Einstellungsverteilung"},
    {"id": "scanner_management", "name": "Scanner-Verwaltung", "description": "Scanner-Konfiguration und Status"},
    {"id": "update_management", "name": "Update-Verwaltung", "description": "Software-Updates verwalten"},
    {"id": "multi_station_sim", "name": "Multi-Station Simulation", "description": "Testing-Modus für mehrere Standorte"},
    {"id": "security_dashboard", "name": "Security Dashboard", "description": "Übersicht für Sicherheitspersonal"},
    {"id": "backup_restore", "name": "Backup & Restore", "description": "Einstellungen sichern und wiederherstellen"},
]

class LicensePackage(BaseModel):
    package_id: str
    name: str
    description: str
    features: List[str]
    duration_days: Optional[int] = 365
    price: Optional[float] = 0.0
    created_at: str

class License(BaseModel):
    license_key: str
    device_id: str
    package_id: str
    features: List[str]
    activated_at: str
    expires_at: str
    is_active: bool

class LicenseActivation(BaseModel):
    license_key: str
    device_id: str

class PackageCreate(BaseModel):
    name: str
    description: str
    features: List[str]
    duration_days: Optional[int] = 365
    price: Optional[float] = 0.0

@router.get("/features")
async def get_available_features():
    """Get list of all available features that can be licensed"""
    return {
        "success": True,
        "features": AVAILABLE_FEATURES
    }

@router.get("/packages")
async def get_packages():
    """Get all available license packages"""
    try:
        packages = await packages_collection.find().to_list(length=100)
        
        # Remove MongoDB _id
        for pkg in packages:
            pkg.pop('_id', None)
        
        return {
            "success": True,
            "packages": packages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/packages/create")
async def create_package(package: PackageCreate):
    """Create a new license package (Admin only)"""
    try:
        package_id = str(uuid.uuid4())
        
        package_data = {
            "package_id": package_id,
            "name": package.name,
            "description": package.description,
            "features": package.features,
            "duration_days": package.duration_days,
            "price": package.price,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await packages_collection.insert_one(package_data)
        
        return {
            "success": True,
            "package_id": package_id,
            "message": "Paket erfolgreich erstellt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/packages/{package_id}")
async def update_package(package_id: str, package: PackageCreate):
    """Update an existing license package"""
    try:
        result = await packages_collection.update_one(
            {"package_id": package_id},
            {"$set": {
                "name": package.name,
                "description": package.description,
                "features": package.features,
                "duration_days": package.duration_days,
                "price": package.price
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Paket nicht gefunden")
        
        return {
            "success": True,
            "message": "Paket aktualisiert"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/packages/{package_id}")
async def delete_package(package_id: str):
    """Delete a license package"""
    try:
        result = await packages_collection.delete_one({"package_id": package_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Paket nicht gefunden")
        
        return {
            "success": True,
            "message": "Paket gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activate")
async def activate_license(activation: LicenseActivation):
    """Activate a license key for a device"""
    try:
        # In production: validate against license server
        # For now: simple local validation
        
        # Generate license hash (simple demo - in production use proper crypto)
        expected_hash = hashlib.sha256(f"{activation.device_id}".encode()).hexdigest()[:16]
        
        # Check if license key format is valid
        if len(activation.license_key) < 16:
            raise HTTPException(status_code=400, detail="Ungültiger Lizenzschlüssel")
        
        # For demo: accept any key that starts with "TSRID-"
        if not activation.license_key.startswith("TSRID-"):
            raise HTTPException(status_code=400, detail="Ungültiger Lizenzschlüssel-Format")
        
        # Check if license already exists for this device
        existing = await licenses_collection.find_one({"device_id": activation.device_id})
        
        # Get package info (for demo, use a default package)
        # In production: decode package from license key
        package = await packages_collection.find_one({"name": "Standard"})
        if not package:
            # Create default package if none exists
            default_package = {
                "package_id": str(uuid.uuid4()),
                "name": "Standard",
                "description": "Standard-Paket mit Basis-Funktionen",
                "features": ["document_upload", "flagged_scans", "backup_restore"],
                "duration_days": 365,
                "price": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await packages_collection.insert_one(default_package)
            package = default_package
        else:
            # Remove MongoDB _id field
            package.pop('_id', None)
        
        # Create or update license
        license_data = {
            "license_key": activation.license_key,
            "device_id": activation.device_id,
            "package_id": package["package_id"],
            "features": package["features"],
            "activated_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=package["duration_days"])).isoformat(),
            "is_active": True
        }
        
        if existing:
            await licenses_collection.update_one(
                {"device_id": activation.device_id},
                {"$set": license_data}
            )
        else:
            await licenses_collection.insert_one(license_data)
        
        return {
            "success": True,
            "message": "Lizenz erfolgreich aktiviert",
            "license": license_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current/{device_id}")
async def get_current_license(device_id: str):
    """Get current license for a device"""
    try:
        license_data = await licenses_collection.find_one({"device_id": device_id})
        
        if not license_data:
            return {
                "success": True,
                "licensed": False,
                "message": "Keine Lizenz gefunden"
            }
        
        license_data.pop('_id', None)
        
        # Check if expired
        expires_at = datetime.fromisoformat(license_data["expires_at"])
        is_expired = expires_at < datetime.now(timezone.utc)
        
        if is_expired:
            license_data["is_active"] = False
            await licenses_collection.update_one(
                {"device_id": device_id},
                {"$set": {"is_active": False}}
            )
        
        return {
            "success": True,
            "licensed": not is_expired,
            "license": license_data,
            "expires_in_days": (expires_at - datetime.now(timezone.utc)).days if not is_expired else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate")
async def validate_license(device_id: str, feature_id: str):
    """Validate if a device has access to a specific feature"""
    try:
        license_data = await licenses_collection.find_one({"device_id": device_id})
        
        if not license_data:
            return {
                "success": True,
                "valid": False,
                "message": "Keine Lizenz gefunden"
            }
        
        # Check expiry
        expires_at = datetime.fromisoformat(license_data["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            return {
                "success": True,
                "valid": False,
                "message": "Lizenz abgelaufen"
            }
        
        # Check feature
        has_feature = feature_id in license_data.get("features", [])
        
        return {
            "success": True,
            "valid": has_feature,
            "message": "Feature verfügbar" if has_feature else "Feature nicht in Lizenz enthalten"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
