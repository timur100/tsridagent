from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient
from bson import ObjectId
import base64
import pytesseract
from PIL import Image
import cv2
import numpy as np
import io
import re

router = APIRouter(prefix="/api/parking", tags=["parking"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'verification_db')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models
class ParkingEntry(BaseModel):
    license_plate: str
    entry_image: Optional[str] = None  # Base64 encoded image
    zone: str = "default"
    notes: Optional[str] = None

class ParkingExit(BaseModel):
    license_plate: str
    exit_image: Optional[str] = None  # Base64 encoded image
    notes: Optional[str] = None

class ParkingConfig(BaseModel):
    max_free_duration_minutes: int = 120  # 2 hours default
    penalty_per_hour: float = 20.0  # €20 per hour
    enabled: bool = True

class WhitelistEntry(BaseModel):
    license_plate: str
    reason: str
    valid_until: Optional[str] = None

# Helper Functions
def calculate_duration_minutes(entry_time: datetime, exit_time: datetime) -> int:
    """Calculate duration in minutes"""
    delta = exit_time - entry_time
    return int(delta.total_seconds() / 60)

def calculate_penalty(duration_minutes: int, max_free_minutes: int, penalty_per_hour: float) -> float:
    """Calculate penalty amount"""
    if duration_minutes <= max_free_minutes:
        return 0.0
    
    overstay_minutes = duration_minutes - max_free_minutes
    overstay_hours = overstay_minutes / 60.0


def preprocess_image_for_ocr(image_data: bytes) -> np.ndarray:
    """
    Preprocess image for better OCR accuracy
    - Convert to grayscale
    - Apply thresholding
    - Noise reduction
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply bilateral filter to reduce noise while keeping edges sharp
    denoised = cv2.bilateralFilter(gray, 11, 17, 17)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    return thresh

def extract_license_plate_from_image(image_data: bytes) -> dict:
    """
    Extract license plate from image using Tesseract OCR
    Returns dict with detected text and confidence
    """
    try:
        # Preprocess image
        processed_img = preprocess_image_for_ocr(image_data)
        
        # Convert to PIL Image
        pil_img = Image.fromarray(processed_img)
        
        # Configure Tesseract for better license plate recognition
        custom_config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
        
        # Extract text
        text = pytesseract.image_to_string(pil_img, config=custom_config, lang='deu+eng')
        
        # Clean up the text
        text = text.strip().upper()
        text = re.sub(r'[^A-Z0-9-]', '', text)
        
        # Get detailed data with confidence
        data = pytesseract.image_to_data(pil_img, config=custom_config, lang='deu+eng', output_type=pytesseract.Output.DICT)
        
        # Calculate average confidence
        confidences = [int(conf) for conf in data['conf'] if conf != '-1']
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'success': True,
            'license_plate': text,
            'confidence': round(avg_confidence, 2),
            'raw_text': pytesseract.image_to_string(pil_img, lang='deu+eng')
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'license_plate': '',
            'confidence': 0
        }

    
    # Round up to next full hour
    import math
    overstay_hours_rounded = math.ceil(overstay_hours)
    
    return overstay_hours_rounded * penalty_per_hour

# Configuration Endpoints
@router.get("/config")
async def get_parking_config(user: dict = Depends(verify_token)):
    """Get parking system configuration"""
    config = db.parking_config.find_one({"type": "global"}, {"_id": 0})
    
    if not config:
        # Return default config
        return {
            "success": True,
            "data": {
                "max_free_duration_minutes": 120,
                "penalty_per_hour": 20.0,
                "enabled": True
            }
        }
    
    return {
        "success": True,
        "data": {
            "max_free_duration_minutes": config.get("max_free_duration_minutes", 120),
            "penalty_per_hour": config.get("penalty_per_hour", 20.0),
            "enabled": config.get("enabled", True)
        }
    }

@router.put("/config")
async def update_parking_config(
    config_data: ParkingConfig,
    user: dict = Depends(verify_token)
):
    """Update parking system configuration"""
    
    # Only admins can update config
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update configuration")
    
    db.parking_config.update_one(
        {"type": "global"},
        {
            "$set": {
                "type": "global",
                "max_free_duration_minutes": config_data.max_free_duration_minutes,
                "penalty_per_hour": config_data.penalty_per_hour,
                "enabled": config_data.enabled,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.get("email")
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Configuration updated successfully"
    }

# Entry/Exit Endpoints
@router.post("/entry")
async def register_entry(
    entry_data: ParkingEntry,
    user: dict = Depends(verify_token)
):
    """Register vehicle entry"""
    
    license_plate = entry_data.license_plate.upper().strip()
    
    # Check if vehicle is already parked (no exit recorded)
    existing_session = db.parking_sessions.find_one({
        "license_plate": license_plate,
        "exit_time": None,
        "status": "active"
    })
    
    if existing_session:
        # Multiple entry without exit - create violation
        violation = {
            "violation_id": f"VIO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{license_plate}",
            "license_plate": license_plate,
            "violation_type": "multiple_entry",
            "description": "Mehrfache Einfahrt ohne Ausfahrt",
            "entry_time": existing_session["entry_time"],
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "penalty_amount": 50.0,  # Fixed penalty for this type
            "status": "pending",
            "evidence_images": [entry_data.entry_image] if entry_data.entry_image else [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.parking_violations.insert_one(violation)
        
        return {
            "success": False,
            "message": "Verstoß erkannt: Mehrfache Einfahrt ohne Ausfahrt",
            "violation": {
                "violation_id": violation["violation_id"],
                "penalty_amount": violation["penalty_amount"]
            }
        }
    
    # Check whitelist
    whitelist_entry = db.parking_whitelist.find_one({"license_plate": license_plate})
    is_whitelisted = False
    
    if whitelist_entry:
        # Check if still valid
        if whitelist_entry.get("valid_until"):
            valid_until = datetime.fromisoformat(whitelist_entry["valid_until"])
            if valid_until > datetime.now(timezone.utc):
                is_whitelisted = True
        else:
            is_whitelisted = True
    
    # Create new parking session
    session = {
        "session_id": f"PARK-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{license_plate}",
        "license_plate": license_plate,
        "entry_time": datetime.now(timezone.utc).isoformat(),
        "exit_time": None,
        "duration_minutes": None,
        "status": "active",
        "zone": entry_data.zone,
        "is_whitelisted": is_whitelisted,
        "entry_image": entry_data.entry_image,
        "exit_image": None,
        "notes": entry_data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email")
    }
    
    db.parking_sessions.insert_one(session)
    
    return {
        "success": True,
        "message": "Einfahrt erfolgreich registriert",
        "data": {
            "session_id": session["session_id"],
            "license_plate": license_plate,
            "entry_time": session["entry_time"],
            "is_whitelisted": is_whitelisted
        }
    }

@router.post("/exit")
async def register_exit(
    exit_data: ParkingExit,
    user: dict = Depends(verify_token)
):
    """Register vehicle exit and calculate penalties"""
    
    license_plate = exit_data.license_plate.upper().strip()
    
    # Find active session
    session = db.parking_sessions.find_one({
        "license_plate": license_plate,
        "status": "active",
        "exit_time": None
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Keine aktive Parksession für dieses Kennzeichen gefunden")
    
    # Calculate duration
    entry_time = datetime.fromisoformat(session["entry_time"])
    exit_time = datetime.now(timezone.utc)
    duration_minutes = calculate_duration_minutes(entry_time, exit_time)
    
    # Get configuration
    config = db.parking_config.find_one({"type": "global"})
    max_free_minutes = config.get("max_free_duration_minutes", 120) if config else 120
    penalty_per_hour = config.get("penalty_per_hour", 20.0) if config else 20.0
    
    # Calculate penalty (skip if whitelisted)
    penalty_amount = 0.0
    violation_created = False
    
    if not session.get("is_whitelisted", False):
        penalty_amount = calculate_penalty(duration_minutes, max_free_minutes, penalty_per_hour)
        
        if penalty_amount > 0:
            # Create violation
            violation = {
                "violation_id": f"VIO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{license_plate}",
                "session_id": session["session_id"],
                "license_plate": license_plate,
                "violation_type": "overstay",
                "description": f"Parkzeitüberschreitung um {duration_minutes - max_free_minutes} Minuten",
                "entry_time": session["entry_time"],
                "exit_time": exit_time.isoformat(),
                "duration_minutes": duration_minutes,
                "max_allowed_minutes": max_free_minutes,
                "overstay_minutes": duration_minutes - max_free_minutes,
                "penalty_amount": penalty_amount,
                "status": "pending",
                "evidence_images": [
                    session.get("entry_image"),
                    exit_data.exit_image
                ],
                "vehicle_data": {
                    "license_plate": license_plate,
                    "needs_holder_lookup": True
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Remove None values from evidence_images
            violation["evidence_images"] = [img for img in violation["evidence_images"] if img]
            
            db.parking_violations.insert_one(violation)
            violation_created = True
    
    # Update session
    db.parking_sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "exit_time": exit_time.isoformat(),
                "duration_minutes": duration_minutes,
                "status": "completed",
                "exit_image": exit_data.exit_image,
                "penalty_amount": penalty_amount,
                "violation_created": violation_created,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Ausfahrt erfolgreich registriert",
        "data": {
            "session_id": session["session_id"],
            "license_plate": license_plate,
            "entry_time": session["entry_time"],
            "exit_time": exit_time.isoformat(),
            "duration_minutes": duration_minutes,
            "max_allowed_minutes": max_free_minutes,
            "overstay_minutes": max(0, duration_minutes - max_free_minutes),
            "penalty_amount": penalty_amount,
            "violation_created": violation_created
        }
    }

# Active Sessions
@router.get("/active")
async def get_active_sessions(user: dict = Depends(verify_token)):
    """Get currently active parking sessions"""
    
    sessions = list(db.parking_sessions.find(
        {"status": "active", "exit_time": None},
        {"_id": 0}
    ).sort("entry_time", -1))
    
    # Calculate current duration for each
    now = datetime.now(timezone.utc)
    for session in sessions:
        entry_time = datetime.fromisoformat(session["entry_time"])
        session["current_duration_minutes"] = calculate_duration_minutes(entry_time, now)
    
    return {
        "success": True,
        "data": {
            "active_count": len(sessions),
            "sessions": sessions
        }
    }

# History
@router.get("/sessions")
async def get_parking_sessions(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Get parking session history"""
    
    query = {}
    if status:
        query["status"] = status
    
    total = db.parking_sessions.count_documents(query)
    sessions = list(db.parking_sessions.find(
        query,
        {"_id": 0}
    ).sort("entry_time", -1).skip(offset).limit(limit))
    
    return {
        "success": True,
        "data": {
            "total": total,
            "sessions": sessions
        }
    }

# Violations
@router.get("/violations")
async def get_violations(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Get parking violations"""
    
    query = {}
    if status:
        query["status"] = status
    
    total = db.parking_violations.count_documents(query)
    violations = list(db.parking_violations.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit))
    
    return {
        "success": True,
        "data": {
            "total": total,
            "violations": violations
        }
    }

# Statistics
@router.get("/stats")
async def get_parking_stats(user: dict = Depends(verify_token)):
    """Get parking statistics"""
    
    active_count = db.parking_sessions.count_documents({"status": "active"})
    total_sessions_today = db.parking_sessions.count_documents({
        "entry_time": {
            "$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
        }
    })
    total_violations = db.parking_violations.count_documents({})
    pending_violations = db.parking_violations.count_documents({"status": "pending"})
    
    # Calculate total penalty amount
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$penalty_amount"}}}
    ]
    penalty_result = list(db.parking_violations.aggregate(pipeline))
    total_penalty_amount = penalty_result[0]["total"] if penalty_result and penalty_result[0]["total"] is not None else 0.0
    
    return {
        "success": True,
        "data": {
            "active_sessions": active_count,
            "sessions_today": total_sessions_today,
            "total_violations": total_violations,
            "pending_violations": pending_violations,
            "total_penalty_amount": total_penalty_amount
        }
    }

# Whitelist Management
@router.get("/whitelist")
async def get_whitelist(user: dict = Depends(verify_token)):
    """Get whitelist entries"""
    
    entries = list(db.parking_whitelist.find({}, {"_id": 0}))
    
    return {
        "success": True,
        "data": {
            "entries": entries
        }
    }

@router.post("/whitelist")
async def add_whitelist_entry(
    entry: WhitelistEntry,
    user: dict = Depends(verify_token)
):
    """Add entry to whitelist"""
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify whitelist")
    
    license_plate = entry.license_plate.upper().strip()
    
    # Check if already exists
    existing = db.parking_whitelist.find_one({"license_plate": license_plate})
    if existing:
        raise HTTPException(status_code=400, detail="Kennzeichen bereits in Whitelist")
    
    whitelist_entry = {
        "license_plate": license_plate,
        "reason": entry.reason,
        "valid_until": entry.valid_until,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email")
    }
    
    db.parking_whitelist.insert_one(whitelist_entry)
    
    return {
        "success": True,
        "message": "Whitelist-Eintrag hinzugefügt"
    }

@router.delete("/whitelist/{license_plate}")
async def remove_whitelist_entry(
    license_plate: str,
    user: dict = Depends(verify_token)
):
    """Remove entry from whitelist"""
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify whitelist")
    
    license_plate = license_plate.upper().strip()
    
    result = db.parking_whitelist.delete_one({"license_plate": license_plate})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kennzeichen nicht in Whitelist gefunden")
    
    return {
        "success": True,
        "message": "Whitelist-Eintrag entfernt"
    }
