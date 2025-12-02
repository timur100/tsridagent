from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import httpx
import base64
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dhl", tags=["DHL Shipping"])

# Configuration
DHL_API_KEY = os.environ.get('DHL_API_KEY')
DHL_API_SECRET = os.environ.get('DHL_API_SECRET')
DHL_BASE_URL = os.environ.get('DHL_BASE_URL', os.environ.get('DHL_SANDBOX_BASE_URL'))
DHL_AUTH_API_URL = os.environ.get('DHL_AUTH_API_URL')

# GKP (Geschäftskundenportal) Credentials
DHL_GKP_USERNAME = os.environ.get('DHL_GKP_USERNAME', 'user-valid')
DHL_GKP_PASSWORD = os.environ.get('DHL_GKP_PASSWORD', 'SandboxPasswort2023!')
DHL_EKP_NUMBER = os.environ.get('DHL_EKP_NUMBER')
DHL_BILLING_NUMBER = os.environ.get('DHL_BILLING_NUMBER')

if not all([DHL_API_KEY, DHL_API_SECRET, DHL_SANDBOX_BASE_URL, DHL_AUTH_API_URL]):
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
    auth_url = "https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token"
    
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
                f"{DHL_SANDBOX_BASE_URL}/shipments",
                json=payload,
                headers=headers
            )

            if response.status_code not in [200, 201]:
                logger.error(f"DHL shipment creation failed: {response.text}")
                return ShipmentResponse(
                    success=False,
                    reference_id=request.reference_id,
                    status="failed",
                    created_at=datetime.utcnow(),
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

            return ShipmentResponse(
                success=True,
                shipment_number=shipment_number,
                tracking_url=f"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={shipment_number}" if shipment_number else None,
                label_url=label_url,
                reference_id=request.reference_id,
                status="created",
                created_at=datetime.utcnow(),
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
    Retrieve real-time tracking information for a shipment
    """
    try:
        logger.info(f"Fetching tracking for shipment: {shipment_number}")
        headers = await get_auth_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{DHL_SANDBOX_BASE_URL}/shipments/{shipment_number}/tracking",
                headers=headers
            )

            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Shipment {shipment_number} not found"
                )

            response.raise_for_status()
            return {
                "success": True,
                "shipment_number": shipment_number,
                "tracking_data": response.json()
            }

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"Error fetching tracking information: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tracking information: {str(e)}"
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
