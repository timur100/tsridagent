"""
Europcar Pricing API Routes
Modul 7: Preissysteme & Tariflogik
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/pricing", tags=["Europcar Pricing"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class PricingRule(BaseModel):
    id: str
    name: str
    type: str  # "daily", "weekly", "monthly", "hourly", "minute", "seasonal", "demand"
    vehicle_category: str  # "compact", "sedan", "suv", "luxury", "electric"
    base_price: float
    price_per_km: Optional[float] = 0.0
    weekend_multiplier: Optional[float] = 1.0
    seasonal_multiplier: Optional[float] = 1.0
    demand_multiplier: Optional[float] = 1.0
    min_rental_duration: Optional[int] = 1  # in days
    max_rental_duration: Optional[int] = None
    active: bool = True
    created_at: str
    updated_at: str


class PricingRuleCreate(BaseModel):
    name: str
    type: str
    vehicle_category: str
    base_price: float
    price_per_km: Optional[float] = 0.0
    weekend_multiplier: Optional[float] = 1.0
    seasonal_multiplier: Optional[float] = 1.0


class PriceCalculationRequest(BaseModel):
    vehicle_id: str
    start_date: str
    end_date: str
    customer_id: Optional[str] = None
    apply_ai_optimization: bool = False


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/rules/list", response_model=StandardResponse)
async def list_pricing_rules():
    """
    Liste alle Preisregeln
    """
    try:
        rules = await db.europcar_pricing_rules.find({}, {"_id": 0}).to_list(1000)
        return StandardResponse(
            success=True,
            message=f"{len(rules)} Preisregeln gefunden",
            data={"rules": rules}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rules/create", response_model=StandardResponse)
async def create_pricing_rule(rule_data: PricingRuleCreate):
    """
    Erstelle eine neue Preisregel
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        rule_id = str(uuid4())
        
        rule = PricingRule(
            id=rule_id,
            name=rule_data.name,
            type=rule_data.type,
            vehicle_category=rule_data.vehicle_category,
            base_price=rule_data.base_price,
            price_per_km=rule_data.price_per_km,
            weekend_multiplier=rule_data.weekend_multiplier,
            seasonal_multiplier=rule_data.seasonal_multiplier,
            created_at=now,
            updated_at=now
        )
        
        await db.europcar_pricing_rules.insert_one(rule.model_dump())
        
        return StandardResponse(
            success=True,
            message="Preisregel erfolgreich erstellt",
            data={"rule": rule.model_dump()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate", response_model=StandardResponse)
async def calculate_price(calc_request: PriceCalculationRequest):
    """
    Berechne Preis für eine Reservierung
    Basis-Berechnung + Optional: KI-basierte Optimierung (Phase 3)
    """
    try:
        # Get vehicle
        vehicle = await db.europcar_vehicles.find_one(
            {"id": calc_request.vehicle_id},
            {"_id": 0}
        )
        if not vehicle:
            raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
        
        # Calculate rental duration
        from datetime import datetime as dt
        start = dt.fromisoformat(calc_request.start_date)
        end = dt.fromisoformat(calc_request.end_date)
        days = (end - start).days + 1
        
        # Base pricing (simple for now - will be enhanced with AI in Phase 3)
        base_daily_rate = 50.0  # Default
        
        # Apply vehicle category multiplier
        category_multipliers = {
            "compact": 1.0,
            "sedan": 1.3,
            "suv": 1.6,
            "luxury": 2.5,
            "electric": 1.8
        }
        
        # Determine category based on vehicle type
        vehicle_category = "compact"  # Default
        if vehicle.get("marke") in ["BMW", "Mercedes", "Audi"]:
            vehicle_category = "luxury"
        elif vehicle.get("kraftstoff") == "elektro":
            vehicle_category = "electric"
        
        multiplier = category_multipliers.get(vehicle_category, 1.0)
        
        # Weekly discount
        if days >= 7:
            multiplier *= 0.85  # 15% discount for weekly rentals
        
        # Monthly discount
        if days >= 30:
            multiplier *= 0.70  # 30% discount for monthly rentals
        
        base_price = days * base_daily_rate * multiplier
        
        # Customer discount
        customer_discount = 0.0
        if calc_request.customer_id:
            customer = await db.europcar_customers.find_one(
                {"id": calc_request.customer_id},
                {"_id": 0}
            )
            if customer and customer.get("rabatt_prozent", 0) > 0:
                customer_discount = base_price * (customer["rabatt_prozent"] / 100)
        
        final_price = base_price - customer_discount
        
        # AI Optimization (Mock for Phase 2 - will be real in Phase 3)
        ai_optimized_price = final_price
        if calc_request.apply_ai_optimization:
            # Mock AI optimization: slightly adjust based on "demand"
            import random
            demand_factor = random.uniform(0.95, 1.10)  # ±10%
            ai_optimized_price = final_price * demand_factor
        
        return StandardResponse(
            success=True,
            message="Preis erfolgreich berechnet",
            data={
                "base_price": round(base_price, 2),
                "customer_discount": round(customer_discount, 2),
                "final_price": round(final_price, 2),
                "ai_optimized_price": round(ai_optimized_price, 2),
                "days": days,
                "daily_rate": round(base_daily_rate * multiplier, 2),
                "vehicle_category": vehicle_category
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
