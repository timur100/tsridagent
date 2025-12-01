from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# ==================== Models ====================

class KioskVerificationRequest(BaseModel):
    scan_id: str
    kiosk_id: str
    tenant_id: str
    verification_type: str  # "id_only", "id_and_license"

class KioskVerificationResult(BaseModel):
    verification_id: str
    status: str  # "verified", "failed", "pending"
    
    # Minimal customer data (GDPR-compliant)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    
    # Document validity
    id_document_valid: bool = False
    id_document_expiry: Optional[str] = None
    
    # License validity (for car rentals)
    license_valid: bool = False
    license_expiry: Optional[str] = None
    license_categories: Optional[list] = []
    
    # Verification timestamp
    verified_at: str
    
    # Error message if failed
    error_message: Optional[str] = None

# ==================== Kiosk Verification ====================

@router.post("/verify")
async def kiosk_verification(request: KioskVerificationRequest):
    """
    Simplified TSRID verification for kiosk display
    Returns only essential information (GDPR-compliant)
    """
    try:
        from uuid import uuid4
        
        # Get scan data from existing TSRID system
        scan = await db.scans.find_one({"scan_id": request.scan_id}, {"_id": 0})
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan nicht gefunden")
        
        # Extract minimal required data
        document_data = scan.get("document_data", {})
        face_match = scan.get("face_match", {})
        
        # Validate ID document
        id_valid = (
            document_data.get("document_valid", False) and
            face_match.get("match", False) and
            face_match.get("confidence", 0) >= 0.8
        )
        
        # Check document expiry
        expiry_date = document_data.get("expiry_date")
        id_expired = False
        if expiry_date:
            try:
                exp_date = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
                id_expired = exp_date < datetime.now(timezone.utc)
            except:
                pass
        
        id_document_valid = id_valid and not id_expired
        
        # Validate driver's license (if required)
        license_valid = False
        license_categories = []
        license_expiry = None
        
        if request.verification_type == "id_and_license":
            license_data = scan.get("license_data", {})
            license_valid = license_data.get("valid", False)
            license_expiry = license_data.get("expiry_date")
            license_categories = license_data.get("categories", [])
            
            # Check license expiry
            if license_expiry:
                try:
                    lic_exp_date = datetime.fromisoformat(license_expiry.replace("Z", "+00:00"))
                    if lic_exp_date < datetime.now(timezone.utc):
                        license_valid = False
                except:
                    pass
        
        # Determine overall status
        if request.verification_type == "id_and_license":
            overall_status = "verified" if (id_document_valid and license_valid) else "failed"
        else:
            overall_status = "verified" if id_document_valid else "failed"
        
        # Create verification result (minimal data for kiosk display)
        verification = {
            "verification_id": f"verify-{str(uuid4())[:8]}",
            "scan_id": request.scan_id,
            "kiosk_id": request.kiosk_id,
            "tenant_id": request.tenant_id,
            "verification_type": request.verification_type,
            "status": overall_status,
            
            # Minimal personal data (only what's needed for display)
            "first_name": document_data.get("first_name"),
            "last_name": document_data.get("last_name"),
            "date_of_birth": document_data.get("date_of_birth"),
            
            # Document validity
            "id_document_valid": id_document_valid,
            "id_document_expiry": expiry_date,
            
            # License validity
            "license_valid": license_valid,
            "license_expiry": license_expiry,
            "license_categories": license_categories,
            
            # Verification metadata
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None if overall_status == "verified" else "Dokumente nicht gültig oder abgelaufen",
            
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store verification result
        await db.kiosk_verifications.insert_one(verification)
        
        return {
            "success": True,
            "verification": verification
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{verification_id}")
async def get_verification(verification_id: str):
    """
    Retrieve verification result by ID
    """
    try:
        verification = await db.kiosk_verifications.find_one(
            {"verification_id": verification_id},
            {"_id": 0}
        )
        
        if not verification:
            raise HTTPException(status_code=404, detail="Verification nicht gefunden")
        
        return {
            "success": True,
            "verification": verification
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/kiosk/{kiosk_id}")
async def get_kiosk_verifications(kiosk_id: str, limit: int = 50):
    """
    Get recent verifications for a specific kiosk
    """
    try:
        verifications = await db.kiosk_verifications.find(
            {"kiosk_id": kiosk_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "verifications": verifications,
            "count": len(verifications)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Available Vehicles for Rental ====================

@router.get("/available-vehicles")
async def get_available_vehicles(
    tenant_id: str,
    location_id: str,
    start_date: str,
    end_date: str
):
    """
    Get available vehicles for a specific time period
    """
    try:
        # Find all car keys at location
        car_keys = await db.keys.find({
            "tenant_id": tenant_id,
            "location_id": location_id,
            "key_type": "car",
            "status": "available"
        }, {"_id": 0}).to_list(1000)
        
        # Filter out vehicles with overlapping rentals
        available_vehicles = []
        
        for key in car_keys:
            # Check for overlapping rentals
            overlapping = await db.rentals.count_documents({
                "key_id": key["key_id"],
                "status": {"$in": ["active", "reserved"]},
                "$or": [
                    {
                        "rented_at": {"$lte": end_date},
                        "due_back": {"$gte": start_date}
                    }
                ]
            })
            
            if overlapping == 0:
                available_vehicles.append({
                    "key_id": key["key_id"],
                    "key_number": key["key_number"],
                    "vehicle_id": key.get("vehicle_id"),
                    "make": key.get("vehicle_make"),
                    "model": key.get("vehicle_model"),
                    "plate": key.get("vehicle_plate"),
                    "description": key.get("description")
                })
        
        return {
            "success": True,
            "vehicles": available_vehicles,
            "count": len(available_vehicles)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Payment Authorization ====================

@router.post("/payment/authorize")
async def authorize_payment(payment_data: dict):
    """
    Authorize payment via credit card terminal
    This is a placeholder - needs integration with actual payment terminal
    """
    try:
        from uuid import uuid4
        
        payment = {
            "payment_id": f"pay-{str(uuid4())[:8]}",
            "rental_id": payment_data.get("rental_id"),
            "amount": payment_data.get("amount"),
            "deposit_amount": payment_data.get("deposit_amount", 0.0),
            "currency": payment_data.get("currency", "EUR"),
            "payment_method": "card_terminal",
            "terminal_id": payment_data.get("terminal_id"),
            "status": "authorized",  # In real implementation, this comes from terminal
            "transaction_id": f"txn-{str(uuid4())[:12]}",
            "authorized_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payments.insert_one(payment)
        
        return {
            "success": True,
            "payment": payment
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment/capture/{payment_id}")
async def capture_payment(payment_id: str):
    """
    Capture authorized payment
    """
    try:
        payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
        
        if not payment:
            raise HTTPException(status_code=404, detail="Zahlung nicht gefunden")
        
        if payment["status"] != "authorized":
            raise HTTPException(status_code=400, detail="Zahlung nicht autorisiert")
        
        # Update payment status
        await db.payments.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "status": "captured",
                    "captured_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Zahlung erfolgreich erfasst"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment/refund/{payment_id}")
async def refund_payment(payment_id: str, amount: Optional[float] = None):
    """
    Refund payment (full or partial)
    """
    try:
        payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
        
        if not payment:
            raise HTTPException(status_code=404, detail="Zahlung nicht gefunden")
        
        if payment["status"] not in ["captured", "authorized"]:
            raise HTTPException(status_code=400, detail="Zahlung kann nicht erstattet werden")
        
        refund_amount = amount if amount else payment["amount"]
        
        # Create refund record
        from uuid import uuid4
        refund = {
            "refund_id": f"refund-{str(uuid4())[:8]}",
            "payment_id": payment_id,
            "amount": refund_amount,
            "status": "completed",
            "refunded_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.refunds.insert_one(refund)
        
        # Update payment status
        await db.payments.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "status": "refunded",
                    "refund_id": refund["refund_id"]
                }
            }
        )
        
        return {
            "success": True,
            "refund": refund
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
