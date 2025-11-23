from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests
import urllib3
from datetime import datetime, timezone
import base64
import logging

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

router = APIRouter(prefix="/api/scanner/regula", tags=["Regula Scanner"])

# Scanner service configuration
SCANNER_URLS = [
    "https://localhost/Regula.SDK.Api",  # Port 443 (default)
    "https://localhost:88/Regula.SDK.Api"  # Port 88 (fallback)
]
CURRENT_SCANNER_URL = None

logger = logging.getLogger(__name__)

class ScanRequest(BaseModel):
    auto_scan: bool = True
    capture_uv: bool = True
    capture_ir: bool = True
    enable_rfid: bool = True

class LEDControl(BaseModel):
    state: str  # "on", "off", "blink"
    color: str = "green"  # "green", "red", "yellow"
    duration: Optional[int] = None  # milliseconds for blink

def get_scanner_url():
    """Get the working scanner URL, testing all configured URLs"""
    global CURRENT_SCANNER_URL
    
    # If we already have a working URL, use it
    if CURRENT_SCANNER_URL:
        return CURRENT_SCANNER_URL
    
    # Test all URLs to find working one
    for url in SCANNER_URLS:
        try:
            response = requests.get(
                f"{url}/Methods/GetServiceVersion",
                timeout=2,
                verify=False  # Allow self-signed certificates
            )
            if response.status_code == 200:
                CURRENT_SCANNER_URL = url
                logger.info(f"Scanner connected at {url}")
                return url
        except Exception as e:
            logger.debug(f"Scanner not available at {url}: {str(e)}")
            continue
    
    return None

@router.get("/status")
async def get_scanner_status():
    """
    Check if scanner service is online and get service information
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            return {
                "success": False,
                "online": False,
                "message": "Scanner service not available on any configured port"
            }
        
        # Get service version
        version_response = requests.get(
            f"{scanner_url}/Methods/GetServiceVersion",
            timeout=5,
            verify=False
        )
        
        # Get system uptime
        uptime_response = requests.get(
            f"{scanner_url}/Methods/GetSystemUptime",
            timeout=5,
            verify=False
        )
        
        return {
            "success": True,
            "online": True,
            "url": scanner_url,
            "version": version_response.text if version_response.status_code == 200 else "Unknown",
            "uptime": uptime_response.text if uptime_response.status_code == 200 else "Unknown",
            "message": "Scanner service is online and ready"
        }
        
    except Exception as e:
        logger.error(f"Scanner status check error: {str(e)}")
        return {
            "success": False,
            "online": False,
            "message": f"Scanner service error: {str(e)}"
        }

@router.post("/scan")
async def scan_document(scan_request: ScanRequest):
    """
    Initiate document scan with all configured features
    Returns images and extracted data
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            raise HTTPException(
                status_code=503,
                detail="Scanner service not available"
            )
        
        # Set LED to yellow (processing)
        await control_led(LEDControl(state="on", color="yellow"))
        
        # Prepare scan parameters
        params = {
            "AutoScan": scan_request.auto_scan,
            "CaptureMode": "All"  # Capture all available light types
        }
        
        # Initiate scan
        scan_response = requests.get(
            f"{scanner_url}/Methods/GetImages",
            params=params,
            timeout=30,  # Scanning can take time
            verify=False
        )
        
        if scan_response.status_code != 200:
            # Set LED to red (error)
            await control_led(LEDControl(state="blink", color="red", duration=2000))
            raise HTTPException(
                status_code=scan_response.status_code,
                detail=f"Scanner error: {scan_response.text}"
            )
        
        # Parse response (assuming JSON format)
        scan_data = scan_response.json() if scan_response.text else {}
        
        # Process images
        images = []
        if "Images" in scan_data:
            for img in scan_data["Images"]:
                images.append({
                    "type": img.get("LightType", "Unknown"),
                    "data": img.get("ImageData", ""),
                    "format": img.get("Format", "jpeg")
                })
        
        # Extract document data
        document_data = {
            "document_type": scan_data.get("DocumentType", "Unknown"),
            "document_number": scan_data.get("DocumentNumber", ""),
            "first_name": scan_data.get("FirstName", ""),
            "last_name": scan_data.get("LastName", ""),
            "birth_date": scan_data.get("BirthDate", ""),
            "expiry_date": scan_data.get("ExpiryDate", ""),
            "nationality": scan_data.get("Nationality", ""),
            "sex": scan_data.get("Sex", ""),
            "issuing_country": scan_data.get("IssuingCountry", ""),
            "license_classes": scan_data.get("LicenseClasses", [])
        }
        
        # RFID data if available
        rfid_data = None
        if scan_request.enable_rfid and "RFID" in scan_data:
            rfid_data = scan_data.get("RFID", {})
        
        # Set LED to green (success)
        await control_led(LEDControl(state="on", color="green", duration=2000))
        
        # Prepare response
        scan_result = {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "images": images,
            "document_data": document_data,
            "rfid_data": rfid_data,
            "raw_response": scan_data,
            "message": "Document scanned successfully"
        }
        
        # INTEGRATION: Send scan to ID-Checks service
        try:
            await send_scan_to_id_checks(scan_result)
        except Exception as e:
            logger.warning(f"Failed to send scan to ID-Checks (non-critical): {str(e)}")
        
        return scan_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan error: {str(e)}")
        # Set LED to red (error)
        try:
            await control_led(LEDControl(state="blink", color="red", duration=3000))
        except:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Scan failed: {str(e)}"
        )

@router.post("/snapshot")
async def capture_snapshot(light_type: str = "White"):
    """
    Capture a single image with specified light type
    Options: White, UV, IR, etc.
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            raise HTTPException(
                status_code=503,
                detail="Scanner service not available"
            )
        
        # Capture snapshot
        response = requests.post(
            f"{scanner_url}/Methods/GetSnapshot",
            json={"ALight": light_type},
            timeout=10,
            verify=False
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Snapshot error: {response.text}"
            )
        
        snapshot_data = response.json() if response.text else {}
        
        return {
            "success": True,
            "light_type": light_type,
            "image_data": snapshot_data.get("ImageData", ""),
            "format": snapshot_data.get("Format", "jpeg"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Snapshot error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Snapshot failed: {str(e)}"
        )

@router.post("/led")
async def control_led(led_control: LEDControl):
    """
    Control scanner LED for user feedback
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            return {
                "success": False,
                "message": "Scanner not available"
            }
        
        # Map color names to LED codes (adjust based on actual scanner API)
        color_map = {
            "green": 1,
            "red": 2,
            "yellow": 3
        }
        
        led_params = {
            "State": led_control.state,
            "Color": color_map.get(led_control.color.lower(), 1),
            "Duration": led_control.duration if led_control.duration else 0
        }
        
        response = requests.post(
            f"{scanner_url}/Methods/LED",
            json=led_params,
            timeout=5,
            verify=False
        )
        
        return {
            "success": response.status_code == 200,
            "message": "LED control successful" if response.status_code == 200 else response.text
        }
        
    except Exception as e:
        logger.error(f"LED control error: {str(e)}")
        return {
            "success": False,
            "message": f"LED control failed: {str(e)}"
        }

@router.post("/rfid/cancel")
async def cancel_rfid_reading():
    """
    Cancel ongoing RFID chip reading
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            raise HTTPException(
                status_code=503,
                detail="Scanner service not available"
            )
        
        response = requests.post(
            f"{scanner_url}/Methods/RFIDCancelReading",
            timeout=5,
            verify=False
        )
        
        return {
            "success": response.status_code == 200,
            "message": "RFID reading cancelled" if response.status_code == 200 else response.text
        }
        
    except Exception as e:
        logger.error(f"RFID cancel error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"RFID cancel failed: {str(e)}"
        )

@router.post("/restart")
async def restart_scanner_service():
    """
    Restart the scanner SDK service
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            raise HTTPException(
                status_code=503,
                detail="Scanner service not available"
            )
        
        response = requests.post(
            f"{scanner_url}/Methods/RestartSDK",
            timeout=10,
            verify=False
        )
        
        # Clear cached URL so next request will re-detect
        global CURRENT_SCANNER_URL
        CURRENT_SCANNER_URL = None
        
        return {
            "success": response.status_code == 200,
            "message": "Scanner service restarted" if response.status_code == 200 else response.text
        }
        
    except Exception as e:
        logger.error(f"Scanner restart error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Scanner restart failed: {str(e)}"
        )

@router.get("/info")
async def get_scanner_info():
    """
    Get detailed scanner and system information
    """
    try:
        scanner_url = get_scanner_url()
        
        if not scanner_url:
            raise HTTPException(
                status_code=503,
                detail="Scanner service not available"
            )
        
        # Get various system info
        version = requests.get(f"{scanner_url}/Methods/GetServiceVersion", timeout=5, verify=False)
        datetime_info = requests.get(f"{scanner_url}/Methods/GetSystemDateTime", timeout=5, verify=False)
        uptime = requests.get(f"{scanner_url}/Methods/GetSystemUptime", timeout=5, verify=False)
        work_time = requests.get(f"{scanner_url}/Methods/GetSystemTotalWorkTime", timeout=5, verify=False)
        
        return {
            "success": True,
            "scanner_url": scanner_url,
            "version": version.text if version.status_code == 200 else "Unknown",
            "system_datetime": datetime_info.text if datetime_info.status_code == 200 else "Unknown",
            "uptime": uptime.text if uptime.status_code == 200 else "Unknown",
            "total_work_time": work_time.text if work_time.status_code == 200 else "Unknown"
        }
        
    except Exception as e:
        logger.error(f"Scanner info error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scanner info: {str(e)}"
        )


# ============================================================================
# ID-CHECKS INTEGRATION
# ============================================================================

async def send_scan_to_id_checks(scan_result: dict):
    """
    Sendet Scandaten an den ID-Checks Service (Webhook)
    
    Diese Funktion wird nach jedem erfolgreichen Scan aufgerufen und
    übermittelt alle Daten an das ID-Checks Dashboard.
    """
    try:
        import os
        import json
        from motor.motor_asyncio import AsyncIOMotorClient
        import uuid
        
        # MongoDB connection
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        mongo_client = AsyncIOMotorClient(mongo_url)
        mongo_db = mongo_client.get_database('main_db')
        scans_collection = mongo_db['id_scans']
        
        # Hole Device-Informationen aus der Umgebung oder Konfiguration
        # TODO: Diese Werte sollten aus der Device-Konfiguration kommen
        device_id = os.environ.get('DEVICE_ID', 'BERN01-01')
        device_name = os.environ.get('DEVICE_NAME', device_id)
        location_id = os.environ.get('LOCATION_ID', 'LOC-BERLIN-REINICKENDORF')
        location_name = os.environ.get('LOCATION_NAME', 'Berlin North Reinickendorf -IKC-')
        tenant_id = os.environ.get('TENANT_ID', '1d3653db-86cb-4dd1-9ef5-0236b116def8')
        tenant_name = os.environ.get('TENANT_NAME', 'Europcar')
        scanner_id = os.environ.get('SCANNER_ID', device_id)
        scanner_name = os.environ.get('SCANNER_NAME', 'Regula Scanner')
        
        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Extrahiere Dokumentdaten
        doc_data = scan_result.get('document_data', {})
        
        # Erstelle extracted_data aus den Scanner-Daten
        extracted_data = {
            "document_class": doc_data.get('document_type', 'Unknown'),
            "country": doc_data.get('issuing_country', ''),
            "document_number": doc_data.get('document_number', ''),
            "first_name": doc_data.get('first_name', ''),
            "last_name": doc_data.get('last_name', ''),
            "date_of_birth": doc_data.get('birth_date', ''),
            "nationality": doc_data.get('nationality', ''),
            "sex": doc_data.get('sex', ''),
            "expiry_date": doc_data.get('expiry_date', ''),
            "license_classes": doc_data.get('license_classes', [])
        }
        
        # Bestimme Status basierend auf Scan-Erfolg
        # TODO: Hier könnte eine echte Verification-Logik implementiert werden
        status = "validated" if scan_result.get('success') else "rejected"
        
        # Erstelle Verification-Objekt
        verification = {
            "confidence_score": 95 if scan_result.get('success') else 50,
            "status": "valid" if scan_result.get('success') else "invalid",
            "checks": {
                "document_scanned": scan_result.get('success', False),
                "images_captured": len(scan_result.get('images', [])) > 0,
                "data_extracted": bool(extracted_data.get('document_number'))
            }
        }
        
        # Verarbeite Bilder
        # TODO: Bilder sollten gespeichert und Pfade hier eingefügt werden
        images_array = []
        for img in scan_result.get('images', []):
            img_type = img.get('type', 'unknown').lower()
            # Map Scanner light types to our naming convention
            if 'white' in img_type or 'visible' in img_type:
                img_type = 'front_original'
            elif 'uv' in img_type:
                img_type = 'front_uv'
            elif 'ir' in img_type:
                img_type = 'front_ir'
            
            images_array.append({
                "image_type": img_type,
                "image_data": img.get('data', ''),  # Base64 encoded
                "format": img.get('format', 'jpeg'),
                "uploaded_at": now
            })
        
        # Erstelle Scan-Dokument
        scan_data = {
            "id": scan_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "location_id": location_id,
            "location_name": location_name,
            "device_id": device_id,
            "device_name": device_name,
            "scanner_id": scanner_id,
            "scanner_name": scanner_name,
            "scan_timestamp": scan_result.get('timestamp', now),
            "status": status,
            "document_type": doc_data.get('document_type', 'Unknown'),
            "scanned_by": None,  # TODO: Operator-Info wenn verfügbar
            "operator_id": None,
            "images": images_array,
            "extracted_data": extracted_data,
            "verification": verification,
            "rfid_data": scan_result.get('rfid_data'),
            "requires_manual_review": False,
            "manual_actions": [],
            "created_at": now,
            "updated_at": now,
            "ip_address": None,  # TODO: IP-Adresse des Scanners
            "notes": None,
            "tags": ["regula", "automated"],
            "source": "regula-scanner",
            "raw_scanner_data": scan_result.get('raw_response')  # Original-Antwort für Debugging
        }
        
        # Speichere in MongoDB
        await scans_collection.insert_one(scan_data)
        
        logger.info(f"✅ [ID-Checks] Scan {scan_id} successfully sent to ID-Checks")
        logger.info(f"   Device: {device_name} ({device_id})")
        logger.info(f"   Location: {location_name}")
        logger.info(f"   Document: {extracted_data.get('document_class')}")
        logger.info(f"   Holder: {extracted_data.get('first_name')} {extracted_data.get('last_name')}")
        
        return scan_id
        
    except Exception as e:
        logger.error(f"❌ [ID-Checks] Failed to send scan to ID-Checks: {str(e)}")
        raise
