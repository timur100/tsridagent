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
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://europcar-rental.preview.emergentagent.com')


@router.post("/simulate-scan", response_model=dict)
async def simulate_scan():
    """
    Simuliert einen kompletten Scan und fügt ihn direkt in die Datenbank ein
    
    Dieser Endpunkt testet die Scan-Integration ohne echten Scanner
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import uuid
        import json
        
        # MongoDB connection
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        mongo_client = AsyncIOMotorClient(mongo_url)
        mongo_db = mongo_client.get_database('main_db')
        scans_collection = mongo_db['id_scans']
        
        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Simulierte Scandaten
        scan_data = {
            "id": scan_id,
            "tenant_id": "1d3653db-86cb-4dd1-9ef5-0236b116def8",  # Europcar
            "tenant_name": "Europcar",
            "location_id": "LOC-BERLIN-HBF",
            "location_name": "Berlin Hauptbahnhof",
            "device_id": "DEVICE-TEST-001",
            "device_name": "Test Scanner Terminal",
            "scanner_id": "SCANNER-TEST-001",
            "scanner_name": "Test DESKO Scanner",
            "scan_timestamp": now,
            "status": "validated",
            "document_type": "Personalausweis",
            "scanned_by": None,
            "operator_id": None,
            "images": [],
            "extracted_data": {
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
            },
            "verification": {
                "confidence_score": 92,
                "status": "valid",
                "checks": {
                    "mrz_valid": True,
                    "document_authentic": True,
                    "security_features": True,
                    "hologram_present": True
                }
            },
            "requires_manual_review": False,
            "manual_actions": [],
            "created_at": now,
            "updated_at": now,
            "ip_address": "192.168.1.100",
            "notes": "Simulierter Test-Scan",
            "tags": ["test", "simulated"],
            "source": "test-endpoint"
        }
        
        print(f"🧪 [Test] Creating simulated scan: {scan_id}")
        
        # Save to database
        await scans_collection.insert_one(scan_data)
        
        # Remove _id from response
        if '_id' in scan_data:
            del scan_data['_id']
        
        print(f"✅ [Test] Scan created successfully!")
        print(f"   Scan ID: {scan_id}")
        print(f"   Tenant: {scan_data['tenant_name']}")
        print(f"   Location: {scan_data['location_name']}")
        print(f"   Status: {scan_data['status']}")
        
        return {
            "success": True,
            "message": "Simulated scan created successfully",
            "scan_id": scan_id,
            "scan_data": scan_data,
            "view_url": f"/portal/admin/id-checks/{scan_id}"
        }
    
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
