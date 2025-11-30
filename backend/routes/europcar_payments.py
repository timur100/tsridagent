"""
Europcar Payments API Routes
Modul 8: Zahlung & Abrechnung (Mock-Payment)
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/payments", tags=["Europcar Payments"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class PaymentMethod(BaseModel):
    type: str  # "credit_card", "debit_card", "cash", "invoice"
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None  # "Visa", "Mastercard", etc.


class Payment(BaseModel):
    id: str
    reservation_id: str
    customer_id: str
    amount: float
    payment_method: PaymentMethod
    status: str  # "pending", "authorized", "captured", "failed", "refunded"
    transaction_id: Optional[str] = None
    authorization_code: Optional[str] = None
    created_at: str
    updated_at: str


class PaymentCreate(BaseModel):
    reservation_id: str
    customer_id: str
    amount: float
    payment_method: PaymentMethod


class Invoice(BaseModel):
    id: str
    reservation_id: str
    customer_id: str
    total_amount: float
    subtotal: float
    tax_amount: float
    tax_rate: float = 0.19  # 19% MwSt
    line_items: list
    status: str  # "draft", "sent", "paid", "overdue"
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    created_at: str
    updated_at: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/process", response_model=StandardResponse)
async def process_payment(payment_data: PaymentCreate):
    """
    Verarbeite Zahlung (Mock Payment für Phase 2)
    """
    try:
        # Mock payment processing
        now = datetime.now(timezone.utc).isoformat()
        payment_id = str(uuid4())
        transaction_id = f"MOCK-{str(uuid4())[:8].upper()}"
        
        # Simulate payment authorization
        import random
        success = random.random() > 0.05  # 95% success rate
        
        payment = Payment(
            id=payment_id,
            reservation_id=payment_data.reservation_id,
            customer_id=payment_data.customer_id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            status="authorized" if success else "failed",
            transaction_id=transaction_id if success else None,
            authorization_code=f"AUTH-{str(uuid4())[:6].upper()}" if success else None,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_payments.insert_one(payment.model_dump())
        
        if success:
            return StandardResponse(
                success=True,
                message="Zahlung erfolgreich autorisiert",
                data={"payment": payment.model_dump()}
            )
        else:
            return StandardResponse(
                success=False,
                message="Zahlung fehlgeschlagen",
                data={"payment": payment.model_dump()}
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/capture/{payment_id}", response_model=StandardResponse)
async def capture_payment(payment_id: str):
    """
    Erfasse autorisierte Zahlung
    """
    try:
        payment = await db.europcar_payments.find_one({"id": payment_id}, {"_id": 0})
        if not payment:
            raise HTTPException(status_code=404, detail="Zahlung nicht gefunden")
        
        if payment["status"] != "authorized":
            raise HTTPException(status_code=400, detail="Zahlung ist nicht autorisiert")
        
        await db.europcar_payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": "captured",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        updated = await db.europcar_payments.find_one({"id": payment_id}, {"_id": 0})
        
        return StandardResponse(
            success=True,
            message="Zahlung erfolgreich erfasst",
            data={"payment": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoice/generate", response_model=StandardResponse)
async def generate_invoice(reservation_id: str):
    """
    Generiere Rechnung für Reservierung
    """
    try:
        # Get reservation
        reservation = await db.europcar_reservations.find_one(
            {"id": reservation_id},
            {"_id": 0}
        )
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservierung nicht gefunden")
        
        # Get return data for additional charges
        vehicle_return = await db.europcar_returns.find_one(
            {"reservation_id": reservation_id},
            {"_id": 0}
        )
        
        # Calculate line items
        line_items = [
            {
                "description": "Fahrzeugmiete",
                "amount": reservation["base_price"]
            },
            {
                "description": "Zusatzoptionen",
                "amount": reservation["additional_options_price"]
            }
        ]
        
        if vehicle_return and vehicle_return.get("gesamtbetrag_zusatzkosten", 0) > 0:
            line_items.append({
                "description": "Zusätzliche Gebühren",
                "amount": vehicle_return["gesamtbetrag_zusatzkosten"]
            })
        
        subtotal = sum(item["amount"] for item in line_items)
        tax_rate = 0.19  # 19% MwSt
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + tax_amount
        
        now = datetime.now(timezone.utc).isoformat()
        invoice_id = str(uuid4())
        
        invoice = Invoice(
            id=invoice_id,
            reservation_id=reservation_id,
            customer_id=reservation["customer_id"],
            total_amount=round(total_amount, 2),
            subtotal=round(subtotal, 2),
            tax_amount=round(tax_amount, 2),
            line_items=line_items,
            status="draft",
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_invoices.insert_one(invoice.model_dump())
        
        return StandardResponse(
            success=True,
            message="Rechnung erfolgreich erstellt",
            data={"invoice": invoice.model_dump()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoice/{invoice_id}", response_model=StandardResponse)
async def get_invoice(invoice_id: str):
    """
    Hole Rechnung
    """
    try:
        invoice = await db.europcar_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
        
        return StandardResponse(
            success=True,
            message="Rechnung gefunden",
            data={"invoice": invoice}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
