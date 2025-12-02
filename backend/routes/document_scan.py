from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import base64
import os
from datetime import datetime
from typing import Optional
import httpx

router = APIRouter()

# Regula API endpoint (should be configured via env variable)
REGULA_API_URL = os.getenv('REGULA_API_URL', 'http://localhost:8080')

@router.post("/process")
async def process_document(image: UploadFile = File(...)):
    """
    Process document image using Regula Document Reader API
    """
    try:
        # Read the uploaded file
        contents = await image.read()
        
        # Try to connect to Regula API
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Test if Regula service is available
                health_check = await client.get(f"{REGULA_API_URL}/api/ping")
                
                if health_check.status_code == 200:
                    # Regula is available, make actual API call
                    image_base64 = base64.b64encode(contents).decode('utf-8')
                    
                    request_data = {
                        "processParam": {
                            "scenario": "FullProcess",
                            "resultTypeOutput": ["status", "text", "images"]
                        },
                        "List": [
                            {
                                "ImageData": {
                                    "image": image_base64
                                }
                            }
                        ]
                    }
                    
                    response = await client.post(
                        f"{REGULA_API_URL}/api/process",
                        json=request_data
                    )
                    
                    if response.status_code == 200:
                        regula_data = response.json()
                        result = parse_regula_response_http(regula_data)
                        
                        return JSONResponse(content={
                            "success": True,
                            "data": result
                        })
        
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            print(f"Regula service not available: {e}")
        
        # Fallback to mock data if Regula is not available
        mock_result = {
            "success": True,
            "data": {
                "overall_status": "OK",
                "document_type": "Deutscher Reisepass (Mock)",
                "text_fields": {
                    "document_number": "C01X00T47",
                    "document_number_valid": True,
                    "first_name": "MAX",
                    "last_name": "MUSTERMANN",
                    "birth_date": "12.08.1990",
                    "sex": "M",
                    "nationality": "DEUTSCH",
                    "expiry_date": "01.08.2030",
                    "expiry_date_valid": True
                },
                "scanned_at": datetime.now().isoformat(),
                "mock_mode": True,
                "note": "Regula Service nicht verfügbar - Mock-Daten werden verwendet"
            }
        }
        return JSONResponse(content=mock_result)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


def parse_regula_response_http(regula_data: dict) -> dict:
    """
    Parse Regula Document Reader API response into simplified format
    """
    try:
        text_fields = {}
        overall_status = "ERROR"
        doc_type = "Unknown"
        
        # Extract overall status
        if hasattr(response, 'status') and response.status:
            overall_status = response.status.overall_status if hasattr(response.status, 'overall_status') else "ERROR"
        
        # Extract document type
        if hasattr(response, 'document_type'):
            if isinstance(response.document_type, list) and len(response.document_type) > 0:
                doc_type = response.document_type[0].document_name if hasattr(response.document_type[0], 'document_name') else "Unknown"
        
        # Extract text fields
        if hasattr(response, 'text') and response.text:
            if hasattr(response.text, 'field_list') and response.text.field_list:
                for field in response.text.field_list:
                    field_type = field.field_type if hasattr(field, 'field_type') else None
                    value = field.value if hasattr(field, 'value') else None
                    
                    # Map field types to readable names
                    if field_type == 0:  # Document Number
                        text_fields['document_number'] = value
                        text_fields['document_number_valid'] = hasattr(field, 'validity') and field.validity == 0
                    elif field_type == 1:  # Surname
                        text_fields['last_name'] = value
                    elif field_type == 2:  # Given Names
                        text_fields['first_name'] = value
                    elif field_type == 5:  # Date of Birth
                        text_fields['birth_date'] = value
                    elif field_type == 3:  # Sex
                        text_fields['sex'] = value
                    elif field_type == 4:  # Nationality
                        text_fields['nationality'] = value
                    elif field_type == 6:  # Date of Expiry
                        text_fields['expiry_date'] = value
                        text_fields['expiry_date_valid'] = hasattr(field, 'validity') and field.validity == 0
        
        return {
            "overall_status": overall_status,
            "document_type": doc_type,
            "text_fields": text_fields,
            "scanned_at": datetime.now().isoformat(),
            "mock_mode": False
        }
        
    except Exception as e:
        raise Exception(f"Failed to parse Regula response: {str(e)}")


@router.get("/history")
async def get_scan_history():
    """
    Get document scan history (placeholder for future implementation)
    """
    return JSONResponse(content={
        "success": True,
        "data": {
            "scans": [],
            "total": 0
        }
    })


@router.get("/config")
async def get_scanner_config():
    """
    Get current scanner configuration
    """
    return JSONResponse(content={
        "success": True,
        "data": {
            "regula_api_url": REGULA_API_URL,
            "enabled": True,
            "version": "8.4.584"
        }
    })
