from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import base64
import os
from datetime import datetime
from typing import Optional
import httpx
from regula.documentreader.webclient import DocumentReaderApi, ProcessRequest, ProcessParams, Scenario

router = APIRouter()

# Regula API endpoint (should be configured via env variable)
REGULA_API_URL = os.getenv('REGULA_API_URL', 'http://localhost:8080')

# Initialize Regula Document Reader API
try:
    regula_api = DocumentReaderApi(REGULA_API_URL)
    REGULA_AVAILABLE = True
except Exception as e:
    print(f"Warning: Regula API not available: {e}")
    REGULA_AVAILABLE = False

@router.post("/process")
async def process_document(image: UploadFile = File(...)):
    """
    Process document image using Regula Document Reader API
    """
    try:
        # Read the uploaded file
        contents = await image.read()
        
        # Check if Regula API is available
        if not REGULA_AVAILABLE:
            # Return mock data if Regula service is not running
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
                    "mock_mode": True
                }
            }
            return JSONResponse(content=mock_result)
        
        # REAL REGULA API INTEGRATION
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(contents).decode('utf-8')
            
            # Create process request
            request = ProcessRequest()
            request.process_param = ProcessParams()
            request.process_param.scenario = Scenario.FULL_PROCESS
            request.images = [image_base64]
            
            # Process the document
            response = regula_api.process(request)
            
            # Parse the response
            result = parse_regula_response(response)
            
            return JSONResponse(content={
                "success": True,
                "data": result
            })
            
        except Exception as regula_error:
            print(f"Regula API error: {regula_error}")
            # Fallback to mock data on error
            return JSONResponse(content={
                "success": True,
                "data": {
                    "overall_status": "ERROR",
                    "document_type": "Fehler beim Scannen",
                    "text_fields": {},
                    "error": str(regula_error),
                    "mock_mode": True
                }
            })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


def parse_regula_response(regula_data: dict) -> dict:
    """
    Parse Regula Document Reader API response into simplified format
    """
    try:
        # Extract status
        status = regula_data.get("status", {})
        overall_status = status.get("overallStatus", "ERROR")
        
        # Extract text fields
        text = regula_data.get("text", {})
        text_fields = {}
        
        # Map common field types
        field_mapping = {
            "Document Number": "document_number",
            "Surname": "last_name",
            "Given Names": "first_name",
            "Date of Birth": "birth_date",
            "Sex": "sex",
            "Nationality": "nationality",
            "Date of Expiry": "expiry_date"
        }
        
        for field in text.get("fieldList", []):
            field_type = field.get("fieldType")
            field_name = field.get("fieldName")
            value = field.get("value")
            validity = field.get("validity", {}).get("status") == "valid"
            
            if field_name in field_mapping:
                mapped_name = field_mapping[field_name]
                text_fields[mapped_name] = value
                text_fields[f"{mapped_name}_valid"] = validity
        
        # Extract document type
        doc_type = regula_data.get("documentType", "Unknown")
        
        return {
            "overall_status": overall_status,
            "document_type": doc_type,
            "text_fields": text_fields,
            "scanned_at": datetime.now().isoformat()
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
