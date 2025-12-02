from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx
import base64
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import DESCENDING

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dhl", tags=["DHL Shipping"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'verification_db')
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Configuration
DHL_API_KEY = os.environ.get('DHL_API_KEY')
DHL_API_SECRET = os.environ.get('DHL_API_SECRET')
DHL_BASE_URL = os.environ.get('DHL_BASE_URL', os.environ.get('DHL_SANDBOX_BASE_URL'))
DHL_AUTH_API_URL = os.environ.get('DHL_AUTH_API_URL')

# GKP (Geschäftskundenportal) Credentials
# Check if we're using sandbox or production
is_sandbox = "sandbox" in DHL_BASE_URL if DHL_BASE_URL else False

# Use sandbox credentials for sandbox, real credentials for production
if is_sandbox:
    DHL_GKP_USERNAME = 'user-valid'
    DHL_GKP_PASSWORD = 'SandboxPasswort2023!'
    # Sandbox uses demo billing numbers
    DHL_EKP_NUMBER = '3333333333'
    DHL_BILLING_NUMBER = '333333333301'
    logger.info("Using Sandbox demo credentials and billing numbers")
else:
    DHL_GKP_USERNAME = os.environ.get('DHL_GKP_USERNAME', 'user-valid')
    DHL_GKP_PASSWORD = os.environ.get('DHL_GKP_PASSWORD', 'SandboxPasswort2023!')
    DHL_EKP_NUMBER = os.environ.get('DHL_EKP_NUMBER')
    DHL_BILLING_NUMBER = os.environ.get('DHL_BILLING_NUMBER')

if not all([DHL_API_KEY, DHL_API_SECRET, DHL_BASE_URL, DHL_AUTH_API_URL]):
    logger.warning("DHL credentials not fully configured. Some endpoints may not work.")

logger.info(f"DHL Config: Using GKP user '{DHL_GKP_USERNAME}' with EKP '{DHL_EKP_NUMBER}'")

# Token cache
token_cache = {
    'access_token': None,
    'expires_at': None
}

# Pydantic Models
class Contact(BaseModel):
    name: str
    phone: str
    email: str

class Address(BaseModel):
    street: str
    house_number: str
    postal_code: str
    city: str
    country_code: str = "DE"

class CreateShipmentRequest(BaseModel):
    reference_id: str = Field(..., description="Your internal reference ID")
    sender_name: str
    sender_phone: str
    sender_email: str
    sender_street: str
    sender_house_number: str
    sender_postal_code: str
    sender_city: str
    receiver_name: str
    receiver_phone: str
    receiver_email: str
    receiver_street: str
    receiver_house_number: str
    receiver_postal_code: str
    receiver_city: str
    receiver_country_code: str = "DE"
    package_weight_grams: int
    package_length_cm: int
    package_width_cm: int
    package_height_cm: int
    package_description: str
    service_type: str = "V01PAK"
    insurance_value_eur: Optional[float] = None

class ShipmentResponse(BaseModel):
    success: bool
    shipment_number: Optional[str] = None
    tracking_url: Optional[str] = None
    label_url: Optional[str] = None
    reference_id: str
    status: str
    created_at: datetime
    message: Optional[str] = None

# Helper Functions
def create_basic_auth_header() -> str:
    """Create Basic Authentication header from API Key and Secret"""
    credentials = f"{DHL_API_KEY}:{DHL_API_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

async def get_access_token() -> str:
    """
    Obtain a valid access token from DHL API using OAuth2 ROPC flow
    Returns cached token if still valid, otherwise requests new token
    
    Authentication follows DHL's OAuth2 Resource Owner Password Credentials flow:
    https://developer.dhl.com/api-reference/authentication-api-post-parcel-germany
    """
    import time
    
    # Check if token is still valid (with 5-minute buffer)
    if token_cache['access_token'] and token_cache['expires_at']:
        if time.time() < token_cache['expires_at'] - 300:  # 5-minute buffer
            logger.info("Using cached DHL access token")
            return token_cache['access_token']

    logger.info(f"Requesting new DHL access token via OAuth2 for user: {DHL_GKP_USERNAME}")
    
    # OAuth2 ROPC (Resource Owner Password Credentials) flow
    # Using customer GKP credentials
    auth_url = DHL_AUTH_API_URL
    
    # Form data for OAuth2 token request
    form_data = {
        "grant_type": "password",
        "username": DHL_GKP_USERNAME,
        "password": DHL_GKP_PASSWORD,
        "client_id": DHL_API_KEY,
        "client_secret": DHL_API_SECRET
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                auth_url,
                data=form_data,
                headers=headers
            )
            response.raise_for_status()
            
            data = response.json()
            token_cache['access_token'] = data.get("access_token")
            
            # Calculate expiry
            expires_in = data.get("expires_in", 3600)
            token_cache['expires_at'] = time.time() + expires_in
            
            logger.info(f"Successfully obtained DHL OAuth2 token, expires in {expires_in}s")
            return token_cache['access_token']
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to obtain DHL access token: {str(e)}")
            logger.error(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"DHL authentication failed: {str(e)}"
            )

async def get_auth_headers() -> dict:
    """Get headers for DHL API requests with valid access token"""
    token = await get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def build_shipment_payload(shipment: CreateShipmentRequest) -> Dict[str, Any]:
    """
    Build the DHL API request payload from shipment data
    Following DHL Parcel DE Shipping API v2 schema
    """
    total_weight = shipment.package_weight_grams / 1000  # Convert to kg

    payload = {
        "shipments": [
            {
                "profile": "STANDARD",
                "shipper": {
                    "name1": shipment.sender_name,
                    "streetAddress": shipment.sender_street,
                    "houseNumber": shipment.sender_house_number,
                    "postalCode": shipment.sender_postal_code,
                    "city": shipment.sender_city,
                    "countryCode": "DE",
                    "phone": shipment.sender_phone,
                    "email": shipment.sender_email,
                },
                "consignee": {
                    "name1": shipment.receiver_name,
                    "streetAddress": shipment.receiver_street,
                    "houseNumber": shipment.receiver_house_number,
                    "postalCode": shipment.receiver_postal_code,
                    "city": shipment.receiver_city,
                    "countryCode": shipment.receiver_country_code,
                    "phone": shipment.receiver_phone,
                    "email": shipment.receiver_email,
                },
                "details": {
                    "serviceType": shipment.service_type,
                    "weight": total_weight,
                    "contents": shipment.package_description,
                    "billingNumber": DHL_BILLING_NUMBER,
                },
                "references": [
                    {
                        "referenceNo": shipment.reference_id,
                        "referenceType": "CUSTOMER_REFERENCE"
                    }
                ]
            }
        ]
    }

    if shipment.insurance_value_eur:
        payload["shipments"][0]["details"]["insuranceAmount"] = shipment.insurance_value_eur

    return payload

# API Endpoints
@router.post("/shipments", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(request: CreateShipmentRequest):
    """
    Create a new DHL shipment
    
    This endpoint validates the shipment request, creates it via the DHL API,
    and returns shipment information including tracking number and label.
    """
    try:
        logger.info(f"Creating shipment for reference: {request.reference_id}")

        # Build DHL API payload
        payload = build_shipment_payload(request)
        headers = await get_auth_headers()

        # Create shipment via DHL API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{DHL_BASE_URL}/shipments",
                json=payload,
                headers=headers
            )

            if response.status_code not in [200, 201]:
                logger.error(f"DHL shipment creation failed: {response.text}")
                
                # Save failed shipment to database
                failed_shipment = {
                    "reference_id": request.reference_id,
                    "shipment_number": None,
                    "status": "failed",
                    "sender_name": request.sender_name,
                    "receiver_name": request.receiver_name,
                    "receiver_city": request.receiver_city,
                    "receiver_postal_code": request.receiver_postal_code,
                    "package_weight_grams": request.package_weight_grams,
                    "service_type": request.service_type,
                    "created_at": datetime.now(timezone.utc),
                    "error_message": response.text[:500],
                }
                await db.dhl_shipments.insert_one(failed_shipment)
                
                return ShipmentResponse(
                    success=False,
                    reference_id=request.reference_id,
                    status="failed",
                    created_at=datetime.now(timezone.utc),
                    message=f"DHL API error: {response.text[:200]}"
                )

            shipment_data = response.json()
            logger.info(f"Successfully created DHL shipment: {shipment_data}")

            # Extract shipment number
            shipment_number = None
            if "shipments" in shipment_data and len(shipment_data["shipments"]) > 0:
                shipment_number = shipment_data["shipments"][0].get("shipmentNumber")
            elif "shipmentNumber" in shipment_data:
                shipment_number = shipment_data["shipmentNumber"]

            label_url = None
            if "shipments" in shipment_data and len(shipment_data["shipments"]) > 0:
                label_url = shipment_data["shipments"][0].get("labelUrl")

            tracking_url = f"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={shipment_number}" if shipment_number else None
            
            # Save successful shipment to database
            shipment_record = {
                "reference_id": request.reference_id,
                "shipment_number": shipment_number,
                "tracking_url": tracking_url,
                "label_url": label_url,
                "status": "created",
                "sender_name": request.sender_name,
                "sender_city": request.sender_city,
                "sender_postal_code": request.sender_postal_code,
                "receiver_name": request.receiver_name,
                "receiver_city": request.receiver_city,
                "receiver_postal_code": request.receiver_postal_code,
                "receiver_country": request.receiver_country_code,
                "package_weight_grams": request.package_weight_grams,
                "service_type": request.service_type,
                "package_description": request.package_description,
                "created_at": datetime.now(timezone.utc),
                "estimated_delivery": None,
                "dhl_response": shipment_data,
            }
            await db.dhl_shipments.insert_one(shipment_record)
            logger.info(f"Saved shipment to database: {shipment_number}")

            return ShipmentResponse(
                success=True,
                shipment_number=shipment_number,
                tracking_url=tracking_url,
                label_url=label_url,
                reference_id=request.reference_id,
                status="created",
                created_at=datetime.now(timezone.utc),
                message="Shipment created successfully"
            )

    except httpx.HTTPError as e:
        logger.error(f"HTTP error during shipment creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create DHL shipment: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error creating shipment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/shipments/{shipment_number}/tracking")
async def get_shipment_tracking(shipment_number: str):
    """
    Retrieve tracking information for a shipment.
    First checks our database, then optionally fetches live data from DHL API.
    """
    try:
        logger.info(f"Fetching tracking for shipment: {shipment_number}")
        
        # First, try to get shipment from our database
        shipment = await db.shipments.find_one(
            {"shipment_number": shipment_number},
            {"_id": 0}
        )
        
        if not shipment:
            logger.warning(f"Shipment {shipment_number} not found in database")
            return {
                "success": False,
                "message": "Sendung nicht gefunden"
            }
        
        # Try to fetch live tracking from DHL API (if credentials available)
        if DHL_API_KEY:
            tracking_url = f"https://api-eu.dhl.com/track/shipments"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    headers = {
                        "DHL-API-Key": DHL_API_KEY
                    }
                    
                    response = await client.get(
                        tracking_url,
                        params={"trackingNumber": shipment_number},
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        tracking_data = response.json()
                        
                        # Extract status from tracking data
                        status_desc = shipment["status"]
                        delivered_at = shipment.get("delivered_at")
                        
                        if "shipments" in tracking_data and len(tracking_data["shipments"]) > 0:
                            shipment_info = tracking_data["shipments"][0]
                            status_code = shipment_info.get("status", {}).get("statusCode", "")
                            
                            # Map DHL status codes to our status
                            if status_code in ["delivered", "DELIVERED"]:
                                status_desc = "delivered"
                                # Try to extract delivery timestamp
                                events = shipment_info.get("events", [])
                                for event in events:
                                    if event.get("statusCode") in ["delivered", "DELIVERED"]:
                                        delivered_at = event.get("timestamp")
                                        break
                            elif status_code in ["transit", "TRANSIT"]:
                                status_desc = "in_transit"
                            elif status_code in ["failure", "FAILURE"]:
                                status_desc = "failed"
                        
                        # Update database with live data
                        update_data = {"status": status_desc}
                        if delivered_at and isinstance(delivered_at, str):
                            update_data["delivered_at"] = datetime.fromisoformat(delivered_at.replace('Z', '+00:00'))
                        
                        await db.shipments.update_one(
                            {"shipment_number": shipment_number},
                            {"$set": update_data}
                        )
                        
                        # Update shipment dict with new data
                        shipment["status"] = status_desc
                        if delivered_at:
                            shipment["delivered_at"] = delivered_at
                        
                        logger.info(f"Updated shipment {shipment_number} with live tracking data")
                        
                except Exception as e:
                    logger.warning(f"DHL Tracking API not available: {str(e)}")
        
        # Return shipment data from database (with or without live update)
        return {
            "success": True,
            "tracking": shipment,
            "message": "Sendungsinformationen abgerufen"
        }

    except Exception as e:
        logger.error(f"Error fetching tracking information: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tracking information: {str(e)}"
        )

@router.get("/shipments")
async def get_all_shipments(limit: int = 100, skip: int = 0, status_filter: Optional[str] = None):
    """
    Get all shipments from database with pagination
    
    Query parameters:
    - limit: Maximum number of shipments to return (default: 100)
    - skip: Number of shipments to skip for pagination (default: 0)
    - status_filter: Filter by status (created, failed, delivered, in_transit, etc.)
    """
    try:
        # Build query
        query = {}
        if status_filter:
            query["status"] = status_filter
        
        # Get total count
        total = await db.dhl_shipments.count_documents(query)
        
        # Get shipments with pagination
        cursor = db.dhl_shipments.find(query, {"_id": 0, "dhl_response": 0}).sort("created_at", DESCENDING).skip(skip).limit(limit)
        shipments = await cursor.to_list(length=limit)
        
        # Format dates as strings
        for shipment in shipments:
            if "created_at" in shipment and shipment["created_at"]:
                shipment["created_at"] = shipment["created_at"].isoformat()
            if "estimated_delivery" in shipment and shipment["estimated_delivery"]:
                shipment["estimated_delivery"] = shipment["estimated_delivery"].isoformat()
        
        return {
            "success": True,
            "total": total,
            "count": len(shipments),
            "shipments": shipments,
            "pagination": {
                "limit": limit,
                "skip": skip,
                "has_more": (skip + len(shipments)) < total
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching shipments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shipments: {str(e)}"
        )

@router.get("/shipments/{shipment_number}")
async def get_shipment_details(shipment_number: str):
    """
    Get detailed information about a specific shipment
    """
    try:
        shipment = await db.dhl_shipments.find_one(
            {"shipment_number": shipment_number},
            {"_id": 0}
        )
        
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shipment {shipment_number} not found in database"
            )
        
        # Format dates
        if "created_at" in shipment and shipment["created_at"]:
            shipment["created_at"] = shipment["created_at"].isoformat()
        if "estimated_delivery" in shipment and shipment["estimated_delivery"]:
            shipment["estimated_delivery"] = shipment["estimated_delivery"].isoformat()
        
        return {
            "success": True,
            "shipment": shipment
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shipment details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shipment details: {str(e)}"
        )

@router.get("/shipments/stats/summary")
async def get_shipment_statistics():
    """
    Get statistics about all shipments
    """
    try:
        total = await db.dhl_shipments.count_documents({})
        created = await db.dhl_shipments.count_documents({"status": "created"})
        failed = await db.dhl_shipments.count_documents({"status": "failed"})
        in_transit = await db.dhl_shipments.count_documents({"status": "in_transit"})
        delivered = await db.dhl_shipments.count_documents({"status": "delivered"})
        imported = await db.dhl_shipments.count_documents({"status": "imported"})
        pending = await db.dhl_shipments.count_documents({"status": "pending"})
        
        return {
            "success": True,
            "statistics": {
                "total": total,
                "created": created,
                "failed": failed,
                "in_transit": in_transit,
                "delivered": delivered,
                "imported": imported,
                "pending": pending
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )

@router.post("/shipments/import")
async def import_shipments_from_dhl(days_back: int = 30):
    """
    Import existing shipments from DHL API
    
    This endpoint retrieves shipments that were created via DHL (e.g., through GKP portal)
    and imports them into our database.
    
    Query parameters:
    - days_back: Number of days to look back for shipments (default: 30)
    """
    try:
        logger.info(f"Starting import of DHL shipments from last {days_back} days")
        
        headers = await get_auth_headers()
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        # DHL API doesn't have a direct "list all shipments" endpoint
        # Instead, we need to use the manifest or tracking API
        # For now, return a message explaining the limitation
        
        return {
            "success": True,
            "message": "DHL API-Import ist derzeit begrenzt",
            "explanation": {
                "limitation": "Die DHL Parcel DE Shipping API v2 bietet keinen direkten 'list all shipments' Endpoint.",
                "alternatives": [
                    "Sendungen können über GET /orders/{shipmentNumber} einzeln abgerufen werden",
                    "Manifest-Berichte (GET /manifests) zeigen Sendungen eines Tagesabschlusses",
                    "Tracking-API kann verwendet werden, wenn Sendungsnummern bekannt sind"
                ],
                "recommendation": "Wenn Sie Sendungsnummern haben, können Sie diese einzeln importieren"
            },
            "imported": 0,
            "skipped": 0,
            "errors": 0
        }
        
    except Exception as e:
        logger.error(f"Error during import: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )

@router.post("/shipments/import/{shipment_number}")
async def import_single_shipment(shipment_number: str):
    """
    Import a specific shipment by shipment number from DHL API
    
    This retrieves the shipment details from DHL and saves it to our database.
    """
    try:
        logger.info(f"Importing shipment: {shipment_number}")
        
        # Check if already in database
        existing = await db.dhl_shipments.find_one({"shipment_number": shipment_number})
        if existing:
            return {
                "success": True,
                "message": f"Sendung {shipment_number} existiert bereits in der Datenbank",
                "already_exists": True
            }
        
        headers = await get_auth_headers()
        
        # Get shipment details from DHL
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{DHL_BASE_URL}/orders/{shipment_number}",
                headers=headers
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Sendung {shipment_number} nicht bei DHL gefunden"
                )
            
            response.raise_for_status()
            shipment_data = response.json()
            
            # Extract relevant information
            shipment_record = {
                "shipment_number": shipment_number,
                "reference_id": shipment_data.get("referenceNo", shipment_number),
                "status": "imported",
                "sender_name": shipment_data.get("shipper", {}).get("name1", "Unbekannt"),
                "sender_city": shipment_data.get("shipper", {}).get("city", ""),
                "sender_postal_code": shipment_data.get("shipper", {}).get("postalCode", ""),
                "receiver_name": shipment_data.get("consignee", {}).get("name1", "Unbekannt"),
                "receiver_city": shipment_data.get("consignee", {}).get("city", ""),
                "receiver_postal_code": shipment_data.get("consignee", {}).get("postalCode", ""),
                "receiver_country": shipment_data.get("consignee", {}).get("countryCode", "DE"),
                "package_weight_grams": int(shipment_data.get("details", {}).get("weight", 0) * 1000),
                "service_type": shipment_data.get("details", {}).get("serviceType", "V01PAK"),
                "package_description": shipment_data.get("details", {}).get("contents", ""),
                "tracking_url": f"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={shipment_number}",
                "created_at": datetime.now(timezone.utc),
                "imported_at": datetime.now(timezone.utc),
                "dhl_response": shipment_data,
            }
            
            # Save to database
            await db.dhl_shipments.insert_one(shipment_record)
            logger.info(f"Successfully imported shipment: {shipment_number}")
            
            return {
                "success": True,
                "message": f"Sendung {shipment_number} erfolgreich importiert",
                "shipment": {
                    "shipment_number": shipment_number,
                    "receiver_name": shipment_record["receiver_name"],
                    "receiver_city": shipment_record["receiver_city"],
                    "status": shipment_record["status"]
                }
            }
    
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"HTTP error during import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen von DHL: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error importing shipment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import fehlgeschlagen: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Check DHL API connection health"""
    try:
        # Try to get a token to verify credentials
        token = await get_access_token()
        return {
            "success": True,
            "message": "DHL API connection healthy - using live API",
            "has_token": bool(token),
            "mode": "live"
        }
    except Exception as e:
        logger.warning(f"DHL API not available, using mock mode: {str(e)}")
        return {
            "success": True,
            "message": "DHL API in mock mode - provide valid credentials for live integration",
            "has_token": False,
            "mode": "mock"
        }

@router.get("/shipments/mock")
async def get_mock_shipments():
    """Get mocked shipment data for testing"""
    return {
        "success": True,
        "shipments": [
            {
                "id": "MOCK001234567",
                "shipment_number": "DHL001234567",
                "reference_id": "REF-2024-001",
                "recipient": "Max Mustermann",
                "address": "Hauptstraße 123, 10115 Berlin",
                "status": "in_transit",
                "created": "2024-12-01T10:30:00",
                "estimated_delivery": "2024-12-03T16:00:00",
                "weight": "2.5 kg",
                "service": "DHL Paket"
            },
            {
                "id": "MOCK001234568",
                "shipment_number": "DHL001234568",
                "reference_id": "REF-2024-002",
                "recipient": "Anna Schmidt",
                "address": "Marienplatz 5, 80331 München",
                "status": "delivered",
                "created": "2024-11-30T14:20:00",
                "delivered": "2024-12-01T11:45:00",
                "weight": "1.2 kg",
                "service": "DHL Express"
            },
            {
                "id": "MOCK001234569",
                "shipment_number": "DHL001234569",
                "reference_id": "REF-2024-003",
                "recipient": "Thomas Weber",
                "address": "Reeperbahn 45, 20359 Hamburg",
                "status": "pending",
                "created": "2024-12-01T15:00:00",
                "estimated_delivery": "2024-12-04T14:00:00",
                "weight": "0.8 kg",
                "service": "DHL Paket"
            }
        ],
        "total": 3,
        "mode": "mock"
    }
