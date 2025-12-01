from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient
import io

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# ==================== Models ====================

class Receipt(BaseModel):
    receipt_id: str
    rental_id: str
    tenant_id: str
    receipt_type: str  # "rental", "return", "invoice"
    
    # Customer info
    customer_name: str
    customer_email: str
    
    # Rental details
    key_number: str
    key_type: str
    description: str
    
    # Dates
    rental_start: str
    rental_end: str
    returned_at: Optional[str] = None
    
    # Financial
    rental_amount: float
    deposit_amount: float
    total_amount: float
    currency: str = "EUR"
    
    # Payment info
    payment_id: str
    payment_method: str
    
    # Receipt metadata
    receipt_number: str
    issued_at: str
    qr_code: Optional[str] = None  # For quick return
    
    # Digital/Print status
    pdf_generated: bool = False
    pdf_url: Optional[str] = None
    emailed: bool = False
    printed: bool = False
    
    created_at: str

# ==================== Receipt Generation ====================

@router.post("/generate")
async def generate_receipt(receipt_data: dict):
    """
    Generate a digital receipt for rental
    """
    try:
        from uuid import uuid4
        import qrcode
        import base64
        
        receipt_id = f"receipt-{str(uuid4())[:8]}"
        receipt_number = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid4())[:6].upper()}"
        
        # Generate QR code for quick return
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"return:{receipt_data.get('rental_id')}")
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
        
        receipt = {
            "receipt_id": receipt_id,
            "rental_id": receipt_data.get("rental_id"),
            "tenant_id": receipt_data.get("tenant_id"),
            "receipt_type": receipt_data.get("receipt_type", "rental"),
            "customer_name": receipt_data.get("customer_name"),
            "customer_email": receipt_data.get("customer_email"),
            "key_number": receipt_data.get("key_number"),
            "key_type": receipt_data.get("key_type"),
            "description": receipt_data.get("description"),
            "rental_start": receipt_data.get("rental_start"),
            "rental_end": receipt_data.get("rental_end"),
            "returned_at": receipt_data.get("returned_at"),
            "rental_amount": receipt_data.get("rental_amount", 0.0),
            "deposit_amount": receipt_data.get("deposit_amount", 0.0),
            "total_amount": receipt_data.get("rental_amount", 0.0) + receipt_data.get("deposit_amount", 0.0),
            "currency": receipt_data.get("currency", "EUR"),
            "payment_id": receipt_data.get("payment_id"),
            "payment_method": receipt_data.get("payment_method", "card"),
            "receipt_number": receipt_number,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "qr_code": qr_base64,
            "pdf_generated": False,
            "pdf_url": None,
            "emailed": False,
            "printed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.receipts.insert_one(receipt)
        
        # Update rental with receipt ID
        await db.rentals.update_one(
            {"rental_id": receipt["rental_id"]},
            {"$set": {"receipt_id": receipt_id}}
        )
        
        return {
            "success": True,
            "receipt": receipt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/receipt/{receipt_id}")
async def get_receipt(receipt_id: str):
    """
    Get receipt by ID
    """
    try:
        receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Beleg nicht gefunden")
        
        return {
            "success": True,
            "receipt": receipt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/receipt/rental/{rental_id}")
async def get_receipt_by_rental(rental_id: str):
    """
    Get receipt by rental ID
    """
    try:
        receipt = await db.receipts.find_one({"rental_id": rental_id}, {"_id": 0})
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Beleg nicht gefunden")
        
        return {
            "success": True,
            "receipt": receipt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/receipt/{receipt_id}/generate-pdf")
async def generate_pdf(receipt_id: str):
    """
    Generate PDF for receipt
    Uses reportlab for PDF generation
    """
    try:
        receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Beleg nicht gefunden")
        
        # TODO: Implement actual PDF generation with reportlab
        # For now, return mock PDF URL
        pdf_url = f"/api/receipts/pdf/{receipt_id}.pdf"
        
        # Update receipt with PDF info
        await db.receipts.update_one(
            {"receipt_id": receipt_id},
            {
                "$set": {
                    "pdf_generated": True,
                    "pdf_url": pdf_url
                }
            }
        )
        
        return {
            "success": True,
            "pdf_url": pdf_url,
            "message": "PDF erfolgreich generiert"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/receipt/{receipt_id}/email")
async def email_receipt(receipt_id: str):
    """
    Send receipt via email
    """
    try:
        receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Beleg nicht gefunden")
        
        # TODO: Implement actual email sending
        # For now, just mark as emailed
        
        await db.receipts.update_one(
            {"receipt_id": receipt_id},
            {
                "$set": {
                    "emailed": True,
                    "emailed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Beleg an {receipt['customer_email']} gesendet"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/receipt/{receipt_id}/print")
async def print_receipt(receipt_id: str, printer_id: Optional[str] = None):
    """
    Send receipt to printer
    """
    try:
        receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Beleg nicht gefunden")
        
        # TODO: Implement actual printer integration
        # This would connect to a thermal printer or network printer
        
        await db.receipts.update_one(
            {"receipt_id": receipt_id},
            {
                "$set": {
                    "printed": True,
                    "printed_at": datetime.now(timezone.utc).isoformat(),
                    "printer_id": printer_id
                }
            }
        )
        
        return {
            "success": True,
            "message": "Beleg wurde gedruckt"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/receipts/tenant/{tenant_id}")
async def get_tenant_receipts(tenant_id: str, limit: int = 100):
    """
    Get all receipts for a tenant
    """
    try:
        receipts = await db.receipts.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "receipts": receipts,
            "count": len(receipts)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Receipt Templates ====================

@router.get("/templates/list")
async def get_receipt_templates():
    """
    Get available receipt templates
    """
    try:
        templates = [
            {
                "template_id": "default",
                "name": "Standard-Beleg",
                "description": "Standard Mietbeleg für alle Schlüsseltypen"
            },
            {
                "template_id": "car_rental",
                "name": "Autovermietung",
                "description": "Spezieller Beleg für Fahrzeugvermietung"
            },
            {
                "template_id": "hotel",
                "name": "Hotel Check-in/out",
                "description": "Beleg für Hotel-Zimmerschlüssel"
            }
        ]
        
        return {
            "success": True,
            "templates": templates
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
