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
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "images": images,
            "document_data": document_data,
            "rfid_data": rfid_data,
            "raw_response": scan_data,
            "message": "Document scanned successfully"
        }
        
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
