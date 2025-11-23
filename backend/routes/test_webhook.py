"""
Test Webhook Endpoint
Simuliert einen Scan vom scan-verify-hub für Testing-Zwecke
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import requests
import os

router = APIRouter(tags=["Testing"], prefix="/test")

WEBHOOK_API_KEY = os.environ.get('WEBHOOK_API_KEY', 'G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg')
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://identity-checks.preview.emergentagent.com')


@router.post("/simulate-scan", response_model=dict)
async def simulate_scan():
    """
    Simuliert einen kompletten Scan und sendet ihn an den Webhook-Endpunkt
    
    Dieser Endpunkt testet die Webhook-Integration ohne echten Scanner
    """
    try:
        # Simulierte Scandaten
        scan_data = {
            "tenant_id": "1d3653db-86cb-4dd1-9ef5-0236b116def8",  # Europcar
            "tenant_name": "Europcar",
            "location_id": "LOC-BERLIN-HBF",
            "location_name": "Berlin Hauptbahnhof",
            "device_id": "DEVICE-TEST-001",
            "device_name": "Test Scanner Terminal",
            "scanner_id": "SCANNER-TEST-001",
            "scanner_name": "Test DESKO Scanner",
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
            "document_type": "Personalausweis",
            "ip_address": "192.168.1.100",
        }
        
        # Simulierte extrahierte Daten
        extracted_data = {
            "document_class": "Personalausweis",
            "country": "Deutschland",
            "document_number": "T220001293",
            "first_name": "Max",
            "last_name": "Mustermann",
            "date_of_birth": "1985-03-15",
            "place_of_birth": "Berlin",
            "nationality": "DEUTSCH",
            "valid_from": "2020-01-01",
            "valid_until": "2030-01-01",
            "address": "Musterstraße 123, 10115 Berlin",
            "issuing_authority": "Stadt Berlin"
        }
        
        # Simulierte Verification-Daten
        verification = {
            "confidence_score": 92,
            "status": "valid",
            "checks": {
                "mrz_valid": True,
                "document_authentic": True,
                "security_features": True,
                "hologram_present": True
            }
        }
        
        # Simulierte Bildpfade (würden im echten Scanner existieren)
        image_paths = [
            {"type": "front_original", "file_path": "/app/backend/test_images/front_original.jpg"},
            {"type": "front_ir", "file_path": "/app/backend/test_images/front_ir.jpg"},
            {"type": "front_uv", "file_path": "/app/backend/test_images/front_uv.jpg"},
            {"type": "back_original", "file_path": "/app/backend/test_images/back_original.jpg"},
            {"type": "back_ir", "file_path": "/app/backend/test_images/back_ir.jpg"},
            {"type": "back_uv", "file_path": "/app/backend/test_images/back_uv.jpg"},
            {"type": "portrait", "file_path": "/app/backend/test_images/portrait.jpg"}
        ]
        
        # Sende an Webhook-Endpunkt
        webhook_url = f"{BACKEND_URL}/api/webhooks/scan-completed"
        
        print(f"🧪 [Test] Sending simulated scan to webhook: {webhook_url}")
        
        # Prepare form data
        form_data = {
            "tenant_id": scan_data["tenant_id"],
            "tenant_name": scan_data["tenant_name"],
            "location_id": scan_data["location_id"],
            "location_name": scan_data["location_name"],
            "device_id": scan_data["device_id"],
            "device_name": scan_data["device_name"],
            "scanner_id": scan_data["scanner_id"],
            "scanner_name": scan_data["scanner_name"],
            "scan_timestamp": scan_data["scan_timestamp"],
            "document_type": scan_data["document_type"],
            "ip_address": scan_data["ip_address"],
            "extracted_data": str(extracted_data).replace("'", '"'),
            "verification": str(verification).replace("'", '"'),
            "image_paths": str(image_paths).replace("'", '"')
        }
        
        # Send request
        headers = {
            "X-API-Key": WEBHOOK_API_KEY
        }
        
        response = requests.post(
            webhook_url,
            data=form_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ [Test] Webhook successful!")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Status: {result.get('status')}")
            
            return {
                "success": True,
                "message": "Simulated scan sent successfully",
                "webhook_response": result,
                "scan_data": scan_data
            }
        else:
            error_text = response.text
            print(f"❌ [Test] Webhook failed: {response.status_code}")
            print(f"   Error: {error_text}")
            
            raise HTTPException(
                status_code=500,
                detail=f"Webhook request failed: {response.status_code} - {error_text}"
            )
    
    except requests.RequestException as e:
        print(f"❌ [Test] Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except Exception as e:
        print(f"❌ [Test] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhook-status", response_model=dict)
async def check_webhook_status():
    """
    Überprüft den Status des Webhook-Services
    """
    try:
        health_url = f"{BACKEND_URL}/api/webhooks/health"
        
        headers = {
            "X-API-Key": WEBHOOK_API_KEY
        }
        
        response = requests.get(health_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return {
                "success": True,
                "message": "Webhook service is operational",
                "webhook_url": f"{BACKEND_URL}/api/webhooks/scan-completed",
                "health_check": response.json()
            }
        else:
            return {
                "success": False,
                "message": "Webhook service not responding correctly",
                "status_code": response.status_code
            }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error checking webhook: {str(e)}"
        }
