from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import uuid
import csv
import io
import re
from routes.portal_auth import verify_token
from db.connection import get_mongo_client

# Get database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

router = APIRouter(prefix="/api/hardware-licenses", tags=["hardware_licenses"])

class HardwareLicenseImport(BaseModel):
    serial_number: str
    status: str
    batch_number: int
    activation_date: str

class HardwareLicenseRenewal(BaseModel):
    serial_number: str
    months: int = 12

def detect_scanner_type(serial_number: str) -> str:
    """
    Detect scanner type based on serial number format
    Desko: "XXXXXX XXXXX" (6 digits, space, 5 digits)
    TSRID (Regula): Any other format
    """
    # Remove extra whitespace
    serial = serial_number.strip()
    
    # Check for Desko format: 6 digits, space, 5 digits
    desko_pattern = r'^\d{6}\s\d{5}$'
    if re.match(desko_pattern, serial):
        return "Desko"
    else:
        return "TSRID"

@router.post("/import")
async def import_hardware_licenses(
    file: Optional[UploadFile] = File(None),
    text_data: Optional[str] = Form(None),
    activation_date: str = Form(...),
    token_data: dict = Depends(verify_token)
):
    """
    Import hardware licenses from CSV/Excel/Text
    Format: NO., DESKO SERIAL, STATUS, PART
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can import licenses")
        
        # Parse activation date
        try:
            activation_dt = datetime.fromisoformat(activation_date)
            if activation_dt.tzinfo is None:
                activation_dt = activation_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid activation date format. Use ISO format (YYYY-MM-DD)")
        
        # Calculate expiry date (12 months from activation - yearly renewal)
        # Contract is 36 months total, but licenses must be renewed every 12 months
        expiry_dt = activation_dt + timedelta(days=12*30)
        
        # Next renewal is same as expiry for yearly renewals
        next_renewal_dt = expiry_dt
        
        licenses_data = []
        
        # Parse input data
        if file:
            # Read file content
            content = await file.read()
            text_content = content.decode('utf-8')
        elif text_data:
            text_content = text_data
        else:
            raise HTTPException(status_code=400, detail="No file or text data provided")
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(text_content))
        
        for row in csv_reader:
            # Handle different possible column names
            serial = row.get('DESKO SERIAL') or row.get('SERIAL') or row.get('serial_number') or ''
            status = row.get('STATUS') or row.get('status') or 'ACTIVE'
            part = row.get('PART') or row.get('part') or row.get('batch') or '1'
            
            if serial.strip():
                licenses_data.append({
                    'serial_number': serial.strip(),
                    'status': status.strip().upper(),
                    'batch_number': int(part)
                })
        
        # Process each license
        assigned = []
        not_found = []
        duplicates = []
        
        for lic_data in licenses_data:
            serial = lic_data['serial_number']
            
            # Check if license already exists
            existing = db.hardware_licenses.find_one({"serial_number": serial})
            if existing:
                duplicates.append({
                    "serial_number": serial,
                    "reason": "License already exists in database"
                })
                continue
            
            # Detect scanner type
            scanner_type = detect_scanner_type(serial)
            
            # Try to find matching device by SN-SC
            device = db.europcar_devices.find_one({"sn_sc": serial})
            
            license_doc = {
                "license_id": str(uuid.uuid4()),
                "serial_number": serial,
                "scanner_type": scanner_type,
                "device_id": device.get('device_id') if device else None,
                "station_name": device.get('station_name') if device else None,
                "locationcode": device.get('locationcode') if device else None,
                "batch_number": lic_data['batch_number'],
                "status": lic_data['status'],
                "activation_date": activation_dt.isoformat(),
                "expiry_date": expiry_dt.isoformat(),
                "next_renewal_date": next_renewal_dt.isoformat(),
                "renewal_history": [],
                "supplier": "Desko" if scanner_type == "Desko" else "TSRID",
                "customer": "Europcar",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": token_data.get("sub")
            }
            
            # Insert license
            db.hardware_licenses.insert_one(license_doc)
            
            # Add to results
            if device:
                assigned.append({
                    "serial_number": serial,
                    "scanner_type": scanner_type,
                    "device_id": device.get('device_id'),
                    "station_name": device.get('station_name'),
                    "locationcode": device.get('locationcode')
                })
            else:
                not_found.append({
                    "serial_number": serial,
                    "scanner_type": scanner_type,
                    "batch_number": lic_data['batch_number'],
                    "reason": "No device found with this SN-SC"
                })
        
        return {
            "success": True,
            "message": f"Import completed: {len(assigned)} assigned, {len(not_found)} not found, {len(duplicates)} duplicates",
            "data": {
                "total_imported": len(licenses_data),
                "assigned": assigned,
                "not_found": not_found,
                "duplicates": duplicates,
                "activation_date": activation_dt.isoformat(),
                "expiry_date": expiry_dt.isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview")
async def get_hardware_licenses_overview(
    token_data: dict = Depends(verify_token)
):
    """
    Get overview of all hardware licenses
    """
    try:
        # Get all licenses
        all_licenses = list(db.hardware_licenses.find())
        
        # Calculate statistics
        now = datetime.now(timezone.utc)
        
        total = len(all_licenses)
        active = len([lic for lic in all_licenses if lic.get('status') == 'ACTIVE'])
        assigned = len([lic for lic in all_licenses if lic.get('device_id')])
        unassigned = total - assigned
        
        # Count expired and expiring soon
        expired = 0
        expiring_soon = 0  # Within 30 days
        
        for lic in all_licenses:
            if lic.get('expiry_date'):
                expiry_dt = datetime.fromisoformat(str(lic['expiry_date']))
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                
                if expiry_dt < now:
                    expired += 1
                elif (expiry_dt - now).days <= 30:
                    expiring_soon += 1
        
        # Count by scanner type
        desko_count = len([lic for lic in all_licenses if lic.get('scanner_type') == 'Desko'])
        tsrid_count = len([lic for lic in all_licenses if lic.get('scanner_type') == 'TSRID'])
        
        # Get recent licenses
        recent_licenses = []
        for lic in sorted(all_licenses, key=lambda x: x.get('created_at', ''), reverse=True)[:10]:
            recent_licenses.append({
                "license_id": lic.get('license_id'),
                "serial_number": lic.get('serial_number'),
                "scanner_type": lic.get('scanner_type'),
                "device_id": lic.get('device_id'),
                "station_name": lic.get('station_name'),
                "locationcode": lic.get('locationcode'),
                "status": lic.get('status'),
                "expiry_date": lic.get('expiry_date'),
                "next_renewal_date": lic.get('next_renewal_date')
            })
        
        return {
            "success": True,
            "data": {
                "statistics": {
                    "total": total,
                    "active": active,
                    "assigned": assigned,
                    "unassigned": unassigned,
                    "expired": expired,
                    "expiring_soon": expiring_soon,
                    "desko": desko_count,
                    "tsrid": tsrid_count
                },
                "recent_licenses": recent_licenses
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validation")
async def validate_hardware_licenses(
    token_data: dict = Depends(verify_token)
):
    """
    Validate hardware licenses against devices
    Check which devices have licenses and which don't
    """
    try:
        # Get all devices with SN-SC
        all_devices = list(db.europcar_devices.find({"sn_sc": {"$exists": True, "$nin": [None, ""]}}))
        
        # Get all hardware licenses
        all_licenses = list(db.hardware_licenses.find())
        
        # Create lookup maps
        license_map = {lic.get('serial_number'): lic for lic in all_licenses}
        
        devices_with_license = []
        devices_without_license = []
        
        for device in all_devices:
            sn_sc = device.get('sn_sc')
            
            if sn_sc and sn_sc in license_map:
                license = license_map[sn_sc]
                devices_with_license.append({
                    "device_id": device.get('device_id'),
                    "station_name": device.get('station_name'),
                    "locationcode": device.get('locationcode'),
                    "sn_sc": sn_sc,
                    "scanner_type": license.get('scanner_type'),
                    "status": license.get('status'),
                    "expiry_date": license.get('expiry_date')
                })
            else:
                devices_without_license.append({
                    "device_id": device.get('device_id'),
                    "station_name": device.get('station_name'),
                    "locationcode": device.get('locationcode'),
                    "sn_sc": sn_sc
                })
        
        return {
            "success": True,
            "data": {
                "total_devices": len(all_devices),
                "with_license": len(devices_with_license),
                "without_license": len(devices_without_license),
                "devices_with_license": devices_with_license[:100],  # Limit to first 100
                "devices_without_license": devices_without_license[:100]  # Limit to first 100
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_hardware_licenses(
    scanner_type: Optional[str] = None,
    status: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    List all hardware licenses with optional filters
    """
    try:
        # Build query
        query = {}
        if scanner_type:
            query['scanner_type'] = scanner_type
        if status:
            query['status'] = status.upper()
        
        licenses = list(db.hardware_licenses.find(query))
        
        # Remove _id and format for response
        result = []
        for lic in licenses:
            del lic['_id']
            result.append(lic)
        
        return {
            "success": True,
            "data": {
                "licenses": result,
                "count": len(result)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/renew")
async def renew_hardware_license(
    renewal: HardwareLicenseRenewal,
    token_data: dict = Depends(verify_token)
):
    """
    Renew a hardware license (extend by 12 months)
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can renew licenses")
        
        # Find license
        license_doc = db.hardware_licenses.find_one({"serial_number": renewal.serial_number})
        if not license_doc:
            raise HTTPException(status_code=404, detail="License not found")
        
        # Calculate new dates
        current_expiry = datetime.fromisoformat(str(license_doc['expiry_date']))
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
        
        new_expiry = current_expiry + timedelta(days=renewal.months * 30)
        new_next_renewal = current_expiry + timedelta(days=12 * 30)
        
        # Add to renewal history
        renewal_entry = {
            "renewed_at": datetime.now(timezone.utc).isoformat(),
            "renewed_by": token_data.get("sub"),
            "months_added": renewal.months,
            "previous_expiry": current_expiry.isoformat(),
            "new_expiry": new_expiry.isoformat()
        }
        
        # Update license
        result = db.hardware_licenses.update_one(
            {"serial_number": renewal.serial_number},
            {
                "$set": {
                    "expiry_date": new_expiry.isoformat(),
                    "next_renewal_date": new_next_renewal.isoformat(),
                    "status": "ACTIVE"
                },
                "$push": {
                    "renewal_history": renewal_entry
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to renew license")
        
        return {
            "success": True,
            "message": f"License renewed for {renewal.months} months",
            "data": {
                "serial_number": renewal.serial_number,
                "new_expiry_date": new_expiry.isoformat(),
                "next_renewal_date": new_next_renewal.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export_hardware_licenses(
    scanner_type: Optional[str] = None,
    status: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Export hardware licenses to Excel format for manufacturer activation
    """
    try:
        # Build query
        query = {}
        if scanner_type:
            query['scanner_type'] = scanner_type
        if status:
            query['status'] = status.upper()
        
        licenses = list(db.hardware_licenses.find(query))
        
        # Create CSV in memory (Excel-compatible)
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'NO.',
            'SERIAL NUMBER',
            'SCANNER TYPE',
            'DEVICE ID',
            'STATION NAME',
            'LOCATION CODE',
            'STATUS',
            'ACTIVATION DATE',
            'EXPIRY DATE',
            'BATCH',
            'SUPPLIER'
        ])
        
        # Write data
        for idx, lic in enumerate(licenses, start=1):
            activation_date = ''
            expiry_date = ''
            
            if lic.get('activation_date'):
                try:
                    dt = datetime.fromisoformat(str(lic['activation_date']))
                    activation_date = dt.strftime('%Y-%m-%d')
                except:
                    activation_date = str(lic.get('activation_date', ''))
            
            if lic.get('expiry_date'):
                try:
                    dt = datetime.fromisoformat(str(lic['expiry_date']))
                    expiry_date = dt.strftime('%Y-%m-%d')
                except:
                    expiry_date = str(lic.get('expiry_date', ''))
            
            writer.writerow([
                idx,
                lic.get('serial_number', ''),
                lic.get('scanner_type', ''),
                lic.get('device_id', ''),
                lic.get('station_name', ''),
                lic.get('locationcode', ''),
                lic.get('status', ''),
                activation_date,
                expiry_date,
                lic.get('batch_number', ''),
                lic.get('supplier', '')
            ])
        
        # Prepare response
        output.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'hardware_licenses_{timestamp}.csv'
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),  # UTF-8 with BOM for Excel
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{serial_number}")
async def delete_hardware_license(
    serial_number: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a hardware license
    """
    try:
        role = token_data.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete licenses")
        
        result = db.hardware_licenses.delete_one({"serial_number": serial_number})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="License not found")
        
        return {
            "success": True,
            "message": "License deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
