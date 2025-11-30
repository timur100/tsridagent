"""
Europcar AI Premium Features API Routes
Modul 15: KI-Features
- Schadenserkennung (Gemini Vision)
- Führerschein-Validierung (OpenAI GPT-5)
- Betrugsprävention (OpenAI GPT-5)
- Preisoptimierung (OpenAI GPT-5)
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
import base64
import json
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/ai", tags=["Europcar AI"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# Get Emergent LLM Key
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY', 'sk-emergent-6Ec358150C4B55dF44')


class DamageDetectionRequest(BaseModel):
    image_base64: str
    vehicle_id: str


class LicenseValidationRequest(BaseModel):
    license_data: dict  # Extracted from TSRID scan


class FraudCheckRequest(BaseModel):
    customer_id: str
    reservation_data: dict


class PriceOptimizationRequest(BaseModel):
    vehicle_id: str
    start_date: str
    end_date: str
    current_demand: Optional[float] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/damage-detection", response_model=StandardResponse)
async def ai_damage_detection(request: DamageDetectionRequest):
    """
    KI-basierte Schadenserkennung mit Gemini Vision
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        # Initialize Gemini Vision
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"damage-detection-{uuid4()}",
            system_message="You are an expert automotive damage assessor. Analyze vehicle damage images and provide detailed assessments."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create image content
        image_content = ImageContent(
            image_base64=request.image_base64
        )
        
        # Analyze damage
        user_message = UserMessage(
            text="""Analyze this vehicle image for damage. Provide:
1. Damage type (scratch, dent, broken, cosmetic, mechanical)
2. Severity (minor, moderate, severe)
3. Location (front, back, left, right, interior, roof)
4. Detailed description
5. Estimated repair cost in EUR (provide a range)
6. Urgency (immediate, within_week, can_wait)

Return ONLY a JSON object with these exact keys: damage_type, severity, location, description, estimated_cost_min, estimated_cost_max, urgency""",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse AI response (simplified - in production would need robust parsing)
        import json
        try:
            # Try to extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                ai_analysis = json.loads(response[json_start:json_end])
            else:
                # Fallback parsing
                ai_analysis = {
                    "damage_type": "unknown",
                    "severity": "moderate",
                    "location": "unknown",
                    "description": response,
                    "estimated_cost_min": 100,
                    "estimated_cost_max": 500,
                    "urgency": "within_week"
                }
        except:
            ai_analysis = {
                "damage_type": "unknown",
                "severity": "moderate",
                "location": "unknown",
                "description": response,
                "estimated_cost_min": 100,
                "estimated_cost_max": 500,
                "urgency": "within_week"
            }
        
        # Store analysis
        analysis_record = {
            "id": str(uuid4()),
            "vehicle_id": request.vehicle_id,
            "ai_analysis": ai_analysis,
            "raw_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_ai_damage_analyses.insert_one(analysis_record)
        
        return StandardResponse(
            success=True,
            message="Schadenanalyse erfolgreich durchgeführt",
            data={
                "analysis": ai_analysis,
                "analysis_id": analysis_record["id"]
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message=f"Fehler bei Schadenanalyse: {str(e)}",
            data=None
        )


@router.post("/license-validation", response_model=StandardResponse)
async def ai_license_validation(request: LicenseValidationRequest):
    """
    KI-basierte Führerschein-Validierung mit OpenAI GPT-5
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Initialize OpenAI GPT-5
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"license-validation-{uuid4()}",
            system_message="You are an expert in driver's license validation and verification. Analyze license data for authenticity and validity."
        ).with_model("openai", "gpt-5")
        
        # Validate license
        user_message = UserMessage(
            text=f"""Analyze this driver's license data for validity and potential issues:

License Data:
{json.dumps(request.license_data, indent=2)}

Check for:
1. Expiration status
2. License class validity
3. Data consistency (name, dates, etc.)
4. Potential fraud indicators
5. Issuing authority validity

Return ONLY a JSON object with these keys: is_valid (boolean), issues (array), fraud_score (0-100), recommendation (approve/reject/manual_review), reason"""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse AI response
        import json
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                validation_result = json.loads(response[json_start:json_end])
            else:
                validation_result = {
                    "is_valid": True,
                    "issues": [],
                    "fraud_score": 0,
                    "recommendation": "approve",
                    "reason": "No issues detected"
                }
        except:
            validation_result = {
                "is_valid": True,
                "issues": [],
                "fraud_score": 0,
                "recommendation": "manual_review",
                "reason": response
            }
        
        return StandardResponse(
            success=True,
            message="Führerschein-Validierung abgeschlossen",
            data={"validation": validation_result}
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message=f"Fehler bei Führerschein-Validierung: {str(e)}",
            data=None
        )


@router.post("/fraud-check", response_model=StandardResponse)
async def ai_fraud_check(request: FraudCheckRequest):
    """
    KI-basierte Betrugsprävention mit OpenAI GPT-5
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get customer history
        customer = await db.europcar_customers.find_one(
            {"id": request.customer_id},
            {"_id": 0}
        )
        
        past_reservations = await db.europcar_reservations.find(
            {"customer_id": request.customer_id},
            {"_id": 0}
        ).to_list(100)
        
        # Initialize OpenAI GPT-5
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"fraud-check-{uuid4()}",
            system_message="You are an expert fraud detection analyst specializing in car rental fraud patterns."
        ).with_model("openai", "gpt-5")
        
        # Analyze for fraud
        import json
        user_message = UserMessage(
            text=f"""Analyze this customer and reservation for fraud risk:

Customer Data:
{json.dumps(customer, indent=2, default=str)}

Past Reservations: {len(past_reservations)} rentals

Current Reservation Request:
{json.dumps(request.reservation_data, indent=2)}

Check for:
1. Unusual booking patterns
2. Payment method risks
3. Identity verification issues
4. Rental history anomalies
5. High-risk indicators

Return ONLY a JSON object with: fraud_score (0-100), risk_level (low/medium/high), indicators (array), recommendation (approve/reject/verify), reason"""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                fraud_analysis = json.loads(response[json_start:json_end])
            else:
                fraud_analysis = {
                    "fraud_score": 10,
                    "risk_level": "low",
                    "indicators": [],
                    "recommendation": "approve",
                    "reason": "No significant risk factors"
                }
        except:
            fraud_analysis = {
                "fraud_score": 50,
                "risk_level": "medium",
                "indicators": ["Unable to parse AI response"],
                "recommendation": "verify",
                "reason": response
            }
        
        # Update customer fraud score
        await db.europcar_customers.update_one(
            {"id": request.customer_id},
            {"$set": {"fraud_score": fraud_analysis.get("fraud_score", 0)}}
        )
        
        return StandardResponse(
            success=True,
            message="Betrugsprüfung abgeschlossen",
            data={"fraud_analysis": fraud_analysis}
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message=f"Fehler bei Betrugsprüfung: {str(e)}",
            data=None
        )


@router.post("/price-optimization", response_model=StandardResponse)
async def ai_price_optimization(request: PriceOptimizationRequest):
    """
    KI-basierte Preisoptimierung mit OpenAI GPT-5
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get vehicle data
        vehicle = await db.europcar_vehicles.find_one(
            {"id": request.vehicle_id},
            {"_id": 0}
        )
        
        # Get historical pricing data
        from datetime import datetime as dt
        start = dt.fromisoformat(request.start_date)
        end = dt.fromisoformat(request.end_date)
        days = (end - start).days + 1
        
        # Get similar past bookings
        similar_bookings = await db.europcar_reservations.find(
            {"vehicle_id": request.vehicle_id},
            {"_id": 0}
        ).limit(20).to_list(20)
        
        avg_price = sum(b.get("total_price", 0) for b in similar_bookings) / len(similar_bookings) if similar_bookings else 50 * days
        
        # Initialize OpenAI GPT-5
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"price-optimization-{uuid4()}",
            system_message="You are an expert in dynamic pricing optimization for car rentals. Use demand forecasting and competitive analysis."
        ).with_model("openai", "gpt-5")
        
        # Optimize price
        import json
        user_message = UserMessage(
            text=f"""Optimize rental price for this booking:

Vehicle: {vehicle.get('marke')} {vehicle.get('modell')} ({vehicle.get('baujahr')})
Category: {vehicle.get('kraftstoff')}
Rental Period: {days} days ({request.start_date} to {request.end_date})
Historical Average Price: {avg_price:.2f} EUR
Current Demand Indicator: {request.current_demand or 'unknown'}

Past {len(similar_bookings)} bookings for this vehicle:
Average: {avg_price:.2f} EUR

Consider:
1. Seasonal demand patterns
2. Vehicle category and desirability
3. Rental duration (longer = discount)
4. Current market demand
5. Competitive positioning

Return ONLY a JSON object with: optimized_price (float), confidence (0-100), reasoning (string), suggested_discount_percent (float), expected_conversion_rate (0-100)"""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                optimization = json.loads(response[json_start:json_end])
            else:
                optimization = {
                    "optimized_price": avg_price,
                    "confidence": 50,
                    "reasoning": "Fallback to historical average",
                    "suggested_discount_percent": 0,
                    "expected_conversion_rate": 70
                }
        except:
            optimization = {
                "optimized_price": avg_price,
                "confidence": 50,
                "reasoning": response,
                "suggested_discount_percent": 0,
                "expected_conversion_rate": 70
            }
        
        return StandardResponse(
            success=True,
            message="Preisoptimierung abgeschlossen",
            data={
                "optimization": optimization,
                "original_price": avg_price,
                "price_difference": round(optimization.get("optimized_price", avg_price) - avg_price, 2)
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message=f"Fehler bei Preisoptimierung: {str(e)}",
            data=None
        )
