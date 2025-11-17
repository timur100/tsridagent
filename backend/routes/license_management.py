from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
from .portal_auth import verify_token
import os
from pymongo import MongoClient

router = APIRouter(prefix="/api/licenses", tags=["licenses"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']


class LicenseAssignment(BaseModel):
    license_key: str
    device_id: str


class LicenseCreate(BaseModel):
    customer_email: str
    package_id: str
    quantity: int = 1
    start_date: Optional[str] = None
    duration_months: int = 12
    reminder_days: int = 30


class LicenseExtend(BaseModel):
    license_key: str
    duration_months: int = 12



# Available features
AVAILABLE_FEATURES = [
    {"key": "document_upload", "name": "Dokumenten-Upload", "description": "Upload von Dokumenten zur Verifizierung"},
    {"key": "flagged_scans", "name": "Fehlerhafte Dokumente System", "description": "System zur Verwaltung fehlerhafter Scans"},
    {"key": "driver_license_classes", "name": "Führerscheinklassen-Erkennung", "description": "Erkennung von Führerscheinklassen"},
    {"key": "document_blacklist", "name": "Dokumenten-Sperrsystem", "description": "Blacklist-System für gesperrte Dokumente"},
    {"key": "master_sync", "name": "Master-Geräte-Synchronisation", "description": "Synchronisation zwischen Master- und Client-Geräten"},
    {"key": "scanner_management", "name": "Scanner-Verwaltung", "description": "Verwaltung und Konfiguration von Scannern"},
    {"key": "update_management", "name": "Update-Verwaltung", "description": "Software-Update-Verwaltung"},
    {"key": "multi_station", "name": "Multi-Station Simulation", "description": "Simulation mehrerer Standorte"},
    {"key": "security_dashboard", "name": "Security Dashboard", "description": "Sicherheits-Dashboard für Überwachung"},
    {"key": "backup_restore", "name": "Backup & Restore", "description": "Backup und Wiederherstellung von Einstellungen"}
]


@router.get("/features")
async def get_available_features(
    token_data: dict = Depends(verify_token)
):
    """
    Get list of all available features for license packages
    """
    return {
        "success": True,
        "data": {
            "features": AVAILABLE_FEATURES
        }
    }



@router.get("/overview")
async def get_license_overview(
    customer_email: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get license overview for admin or specific customer
    Shows: total licenses, assigned, unassigned, active, expired
    """
    try:
        role = token_data.get("role")
        user_email = token_data.get("sub")
        
        if role == "customer":
            # Customers can only see their own licenses
            customer_email = user_email
        elif role == "admin" and customer_email:
            # Admin can filter by customer
            pass
        
        # Get all licenses (optionally filtered by customer)
        licenses = list(db.licenses.find())
        
        # Get all devices to map customer ownership
        devices = list(db.europcar_devices.find())
        device_customer_map = {}
        for device in devices:
            # Get customer from device data
            customer = db.portal_users.find_one({"company": device.get("customer_name")})
            if customer:
                device_customer_map[device['device_id']] = customer['email']
        
        # Filter licenses by customer if specified
        if customer_email:
            filtered_licenses = []
            for lic in licenses:
                if lic.get('device_id'):
                    if device_customer_map.get(lic['device_id']) == customer_email:
                        filtered_licenses.append(lic)
                else:
                    # Unassigned licenses - check if purchased by customer
                    if lic.get('customer_email') == customer_email:
                        filtered_licenses.append(lic)
            licenses = filtered_licenses
        
        # Calculate statistics
        now = datetime.now(timezone.utc)
        total_licenses = len(licenses)
        active_licenses = len([lic for lic in licenses if lic.get('is_active', False)])
        assigned_licenses = len([lic for lic in licenses if lic.get('device_id')])
        unassigned_licenses = total_licenses - assigned_licenses
        
        # Count expired licenses (handle both timezone-aware and naive datetimes)
        expired_licenses = 0
        for lic in licenses:
            if lic.get('expires_at'):
                try:
                    expires_dt = datetime.fromisoformat(str(lic['expires_at']))
                    # If datetime is naive, make it timezone-aware (assume UTC)
                    if expires_dt.tzinfo is None:
                        expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                    if expires_dt < now:
                        expired_licenses += 1
                except (ValueError, AttributeError):
                    pass
        
        # Get unassigned but active licenses
        unassigned_active = [
            {
                "license_key": lic['license_key'],
                "package_id": lic.get('package_id'),
                "features": lic.get('features', []),
                "activated_at": lic.get('activated_at'),
                "expires_at": lic.get('expires_at')
            }
            for lic in licenses 
            if not lic.get('device_id') and lic.get('is_active', False)
        ]
        
        # Get assigned licenses with device info
        assigned_licenses_list = []
        for lic in licenses:
            if lic.get('device_id'):
                device = db.europcar_devices.find_one({"device_id": lic['device_id']})
                assigned_licenses_list.append({
                    "license_key": lic['license_key'],
                    "device_id": lic['device_id'],
                    "device_name": device.get('station_name') if device else None,
                    "location_code": device.get('locationcode') if device else None,
                    "package_id": lic.get('package_id'),
                    "features": lic.get('features', []),
                    "activated_at": lic.get('activated_at'),
                    "expires_at": lic.get('expires_at'),
                    "is_active": lic.get('is_active', False)
                })
        
        return {
            "success": True,
            "data": {
                "statistics": {
                    "total": total_licenses,
                    "active": active_licenses,
                    "assigned": assigned_licenses,
                    "unassigned": unassigned_licenses,
                    "expired": expired_licenses
                },
                "unassigned_active": unassigned_active,
                "assigned_licenses": assigned_licenses_list,
                "customer_email": customer_email
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assign")
async def assign_license(
    assignment: LicenseAssignment,
    token_data: dict = Depends(verify_token)
):
    """
    Assign a license to a device
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can assign licenses")
        
        # Check if license exists and is unassigned
        license_doc = db.licenses.find_one({"license_key": assignment.license_key})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        if license_doc.get('device_id'):
            raise HTTPException(status_code=400, detail="License already assigned to another device")
        
        # Check if device exists
        device = db.europcar_devices.find_one({"device_id": assignment.device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Assign license
        result = db.licenses.update_one(
            {"license_key": assignment.license_key},
            {
                "$set": {
                    "device_id": assignment.device_id,
                    "assigned_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to assign license")
        
        return {
            "success": True,
            "message": f"License {assignment.license_key} assigned to device {assignment.device_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unassign/{license_key}")
async def unassign_license(
    license_key: str,
    token_data: dict = Depends(verify_token)
):
    """
    Unassign a license from a device
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can unassign licenses")
        
        # Check if license exists
        license_doc = db.licenses.find_one({"license_key": license_key})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        if not license_doc.get('device_id'):
            raise HTTPException(status_code=400, detail="License is not assigned to any device")
        
        # Unassign license
        result = db.licenses.update_one(
            {"license_key": license_key},
            {
                "$unset": {"device_id": "", "assigned_at": ""}
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to unassign license")
        
        return {
            "success": True,
            "message": f"License {license_key} unassigned successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/packages")
async def get_license_packages(
    token_data: dict = Depends(verify_token)
):
    """
    Get all available license packages
    """
    try:
        packages = list(db.license_packages.find())
        
        # Remove MongoDB _id
        for package in packages:
            if '_id' in package:
                del package['_id']
        
        return {
            "success": True,
            "data": {
                "packages": packages
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    features: List[str]
    duration_months: int = 12
    price: float = 0.0


@router.post("/packages")
async def create_license_package(
    package_data: PackageCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new license package
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create packages")
        
        # Validate features
        valid_feature_keys = [f['key'] for f in AVAILABLE_FEATURES]
        invalid_features = [f for f in package_data.features if f not in valid_feature_keys]
        if invalid_features:
            raise HTTPException(status_code=400, detail=f"Invalid features: {', '.join(invalid_features)}")
        
        package_id = str(uuid.uuid4())
        package_doc = {
            "package_id": package_id,
            "name": package_data.name,
            "description": package_data.description,
            "features": package_data.features,
            "duration_months": package_data.duration_months,
            "price": package_data.price,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.license_packages.insert_one(package_doc)
        
        # Remove _id for response
        del package_doc['_id']
        
        return {
            "success": True,
            "message": "Package created successfully",
            "data": {
                "package": package_doc
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/packages/{package_id}")
async def delete_license_package(
    package_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a license package
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete packages")
        
        # Check if package exists
        package = db.license_packages.find_one({"package_id": package_id})
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Check if package is used by any active licenses
        licenses_count = db.licenses.count_documents({"package_id": package_id, "is_active": True})
        if licenses_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete package. It is currently used by {licenses_count} active license(s)"
            )
        
        # Delete package
        db.license_packages.delete_one({"package_id": package_id})
        
        return {
            "success": True,
            "message": "Package deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/customer/{customer_email}")
async def get_customer_licenses(
    customer_email: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get detailed license information for a specific customer
    """
    try:
        role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Customers can only view their own licenses
        if role == "customer" and user_email != customer_email:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get customer's devices
        customer = db.portal_users.find_one({"email": customer_email})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        devices = list(db.europcar_devices.find({"customer_name": customer.get('company')}))
        device_ids = [d['device_id'] for d in devices]
        
        # Get licenses assigned to these devices
        assigned_licenses = list(db.licenses.find({"device_id": {"$in": device_ids}}))
        
        # Enhance with device info
        licenses_with_devices = []
        for lic in assigned_licenses:
            device = next((d for d in devices if d['device_id'] == lic.get('device_id')), None)
            licenses_with_devices.append({
                "license_key": lic['license_key'],
                "device_id": lic.get('device_id'),
                "device_name": device.get('station_name') if device else None,
                "location_code": device.get('locationcode') if device else None,
                "package_id": lic.get('package_id'),
                "features": lic.get('features', []),
                "activated_at": lic.get('activated_at'),
                "expires_at": lic.get('expires_at'),
                "is_active": lic.get('is_active', False)
            })
        
        return {
            "success": True,
            "data": {
                "customer_email": customer_email,
                "customer_company": customer.get('company'),
                "total_devices": len(devices),
                "licensed_devices": len(assigned_licenses),
                "licenses": licenses_with_devices
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extend")
async def extend_license(
    extension: LicenseExtend,
    token_data: dict = Depends(verify_token)
):
    """
    Extend an existing active license
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can extend licenses")
        
        # Check if license exists
        license_doc = db.licenses.find_one({"license_key": extension.license_key})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        if not license_doc.get('is_active'):
            raise HTTPException(status_code=400, detail="Cannot extend inactive license")
        
        # Calculate new expiry date
        current_expires = datetime.fromisoformat(str(license_doc['expires_at']))
        # Make timezone-aware if naive
        if current_expires.tzinfo is None:
            current_expires = current_expires.replace(tzinfo=timezone.utc)
        new_expires = current_expires + timedelta(days=extension.duration_months * 30)
        
        # Update license
        result = db.licenses.update_one(
            {"license_key": extension.license_key},
            {
                "$set": {
                    "expires_at": new_expires.isoformat(),
                    "extended_at": datetime.now(timezone.utc).isoformat(),
                    "extension_duration_months": extension.duration_months
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to extend license")
        
        return {
            "success": True,
            "message": f"License {extension.license_key} extended by {extension.duration_months} months",
            "new_expiry": new_expires.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring-soon")
async def get_expiring_licenses(
    days: int = 30,
    token_data: dict = Depends(verify_token)
):
    """
    Get licenses expiring within specified days
    """
    try:
        role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Calculate threshold date
        threshold_date = datetime.now(timezone.utc) + timedelta(days=days)
        
        # Get all active licenses
        all_licenses = list(db.licenses.find({"is_active": True}))
        
        # Filter by expiry date
        expiring_licenses = []
        for lic in all_licenses:
            if lic.get('expires_at'):
                expires_at = datetime.fromisoformat(str(lic['expires_at']))
                # Make timezone-aware if naive
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at <= threshold_date:
                    # Get device info if assigned
                    device_info = None
                    if lic.get('device_id'):
                        device = db.europcar_devices.find_one({"device_id": lic['device_id']})
                        if device:
                            device_info = {
                                "device_id": device['device_id'],
                                "station_name": device.get('station_name'),
                                "locationcode": device.get('locationcode'),
                                "customer_name": device.get('customer_name')
                            }
                    
                    days_until_expiry = (expires_at - datetime.now(timezone.utc)).days
                    
                    expiring_licenses.append({
                        "license_key": lic['license_key'],
                        "expires_at": lic['expires_at'],
                        "days_until_expiry": days_until_expiry,
                        "package_id": lic.get('package_id'),
                        "device": device_info,
                        "reminder_days": lic.get('reminder_days', 30)
                    })
        
        # Filter for customer if not admin
        if role == "customer":
            customer = db.portal_users.find_one({"email": user_email})
            if customer:
                company = customer.get('company')
                expiring_licenses = [
                    lic for lic in expiring_licenses 
                    if lic.get('device') and lic['device'].get('customer_name') == company
                ]
        
        return {
            "success": True,
            "data": {
                "licenses": expiring_licenses,
                "count": len(expiring_licenses),
                "threshold_days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_license(
    license_data: LicenseCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create new license(s) with custom start date and duration
    Admin only
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create licenses")
        
        # Get package
        package = db.license_packages.find_one({"package_id": license_data.package_id})
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Verify customer exists
        customer = db.portal_users.find_one({"email": license_data.customer_email})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Parse start date or use now
        if license_data.start_date:
            start_date = datetime.fromisoformat(license_data.start_date)
        else:
            start_date = datetime.now(timezone.utc)
        
        # Calculate expiry date
        expires_at = start_date + timedelta(days=license_data.duration_months * 30)
        
        created_licenses = []
        for i in range(license_data.quantity):
            license_key = f"TSRID-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}".upper()
            
            license_doc = {
                "license_key": license_key,
                "package_id": package['package_id'],
                "features": package.get('features', []),
                "customer_email": license_data.customer_email,
                "activated_at": start_date.isoformat(),
                "expires_at": expires_at.isoformat(),
                "is_active": True,
                "duration_months": license_data.duration_months,
                "reminder_days": license_data.reminder_days,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            db.licenses.insert_one(license_doc)
            created_licenses.append(license_key)
        
        return {
            "success": True,
            "message": f"{license_data.quantity} license(s) created successfully",
            "licenses": created_licenses,
            "expires_at": expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validation")
async def validate_assignments(
    token_data: dict = Depends(verify_token)
):
    """
    Validate license assignments and find issues
    Returns: correctly assigned, wrongly assigned, unassigned devices
    """
    try:
        # Get all licenses
        all_licenses = list(db.licenses.find())
        assigned_licenses = [lic for lic in all_licenses if lic.get('device_id')]
        
        # Get all devices
        all_devices = list(db.europcar_devices.find())
        
        # Find wrongly assigned (device doesn't exist)
        wrongly_assigned = []
        for lic in assigned_licenses:
            device = next((d for d in all_devices if d['device_id'] == lic['device_id']), None)
            if not device:
                wrongly_assigned.append({
                    "license_key": lic['license_key'],
                    "device_id": lic['device_id'],
                    "reason": "Device not found",
                    "package_id": lic.get('package_id')
                })
        
        # Find devices without licenses
        licensed_device_ids = [lic['device_id'] for lic in assigned_licenses if lic.get('device_id')]
        unlicensed_devices = []
        for device in all_devices:
            if device['device_id'] not in licensed_device_ids:
                unlicensed_devices.append({
                    "device_id": device['device_id'],
                    "station_name": device.get('station_name'),
                    "locationcode": device.get('locationcode'),
                    "customer_name": device.get('customer_name')
                })
        
        # Correctly assigned
        correctly_assigned = len(assigned_licenses) - len(wrongly_assigned)
        
        return {
            "success": True,
            "data": {
                "summary": {
                    "total_licenses": len(all_licenses),
                    "assigned_licenses": len(assigned_licenses),
                    "correctly_assigned": correctly_assigned,
                    "wrongly_assigned": len(wrongly_assigned),
                    "total_devices": len(all_devices),
                    "unlicensed_devices": len(unlicensed_devices)
                },
                "wrongly_assigned": wrongly_assigned,
                "unlicensed_devices": unlicensed_devices[:100]  # Limit to first 100
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
