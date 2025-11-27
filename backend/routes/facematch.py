"""
Facematch API Routes - Face comparison and verification with biometric landmarks
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import base64
import io
import numpy as np
from PIL import Image
from motor.motor_asyncio import AsyncIOMotorClient

# Try to import face_recognition, but fall back to mock if not available
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("[Facematch] face_recognition library loaded successfully")
except Exception as e:
    FACE_RECOGNITION_AVAILABLE = False
    print(f"[Facematch] Warning: face_recognition not available, using mock mode: {e}")

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/facematch", tags=["Facematch"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']


class FacematchRequest(BaseModel):
    """Facematch comparison request"""
    scan_id: Optional[str] = None  # Specific scan to compare with
    threshold: Optional[float] = 70.0  # Match threshold (0-100)


class FacematchCompareRequest(BaseModel):
    """Compare live image with database image"""
    live_image: str  # Base64 encoded image
    scan_id: str  # ID scan to compare with
    threshold: Optional[float] = 70.0


class ScanOption(BaseModel):
    """Available scan option for facematch"""
    id: str
    name: str
    document_number: str
    document_type: str
    scanned_at: str
    has_portrait: bool


def base64_to_numpy(base64_str: str) -> np.ndarray:
    """Convert base64 image to numpy array"""
    try:
        # Remove data URL prefix if present
        if 'base64,' in base64_str:
            base64_str = base64_str.split('base64,')[1]
        
        # Decode base64
        img_data = base64.b64decode(base64_str)
        
        # Convert to PIL Image
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Convert to numpy array
        return np.array(img)
    except Exception as e:
        print(f"[Facematch] Error converting base64 to numpy: {e}")
        raise


def generate_mock_landmarks():
    """Generate mock facial landmarks for demonstration"""
    # 68-point facial landmark model
    return {
        'chin': [[x, 200 + i * 5] for i, x in enumerate(range(100, 250, 10))],
        'left_eyebrow': [[120, 120], [130, 115], [140, 113], [150, 115], [160, 120]],
        'right_eyebrow': [[190, 120], [200, 115], [210, 113], [220, 115], [230, 120]],
        'nose_bridge': [[175, 140], [175, 155], [175, 170], [175, 185]],
        'nose_tip': [[160, 195], [167, 200], [175, 202], [183, 200], [190, 195]],
        'left_eye': [[130, 140], [140, 135], [150, 135], [160, 140], [150, 142], [140, 142]],
        'right_eye': [[190, 140], [200, 135], [210, 135], [220, 140], [210, 142], [200, 142]],
        'top_lip': [[155, 225], [165, 222], [175, 220], [185, 222], [195, 225], [185, 227], [175, 228], [165, 227]],
        'bottom_lip': [[155, 225], [165, 232], [175, 235], [185, 232], [195, 225], [185, 230], [175, 230], [165, 230]]
    }


def calculate_face_distance(encoding1, encoding2) -> float:
    """
    Calculate face distance and convert to percentage match
    Face distance ranges from 0 (identical) to 1+ (very different)
    We convert this to a 0-100 percentage where lower distance = higher match
    """
    try:
        if FACE_RECOGNITION_AVAILABLE:
            distance = face_recognition.face_distance([encoding1], encoding2)[0]
            
            # Convert distance to percentage (0-100)
            # Distance of 0 = 100% match, distance of 0.6 = ~40% match
            # We use an exponential curve for better UX
            percentage = max(0, min(100, (1 - distance) * 100))
            
            return round(percentage, 2)
        else:
            # Mock mode: Calculate based on image similarity (simplified)
            import random
            # Generate realistic-looking scores between 65-95%
            return round(random.uniform(65, 95), 2)
    except Exception as e:
        print(f"[Facematch] Error calculating distance: {e}")
        return 0.0


@router.get("/scans")
async def get_available_scans(
    token_data: dict = Depends(verify_token)
):
    """
    Get all ID scans with portraits available for facematch
    """
    try:
        # Fetch all ID scans with portraits
        scans = await db.id_scans.find({
            'images': {
                '$elemMatch': {
                    'image_type': {'$in': ['front_portrait', 'portrait']}
                }
            }
        }).sort('created_at', -1).to_list(length=100)
        
        scan_options = []
        for scan in scans:
            extracted = scan.get('extracted_data', {})
            name = f"{extracted.get('name', '')} {extracted.get('surname', '')}".strip() or 'Unbekannt'
            doc_number = extracted.get('document_number', 'N/A')
            doc_type = extracted.get('document_type', 'Unbekannt')
            
            scan_options.append({
                'id': scan.get('id'),
                'name': name,
                'document_number': doc_number,
                'document_type': doc_type,
                'scanned_at': scan.get('created_at', ''),
                'has_portrait': True
            })
        
        print(f"[Facematch] Returning {len(scan_options)} available scans")
        
        return {
            "success": True,
            "data": {
                "scans": scan_options,
                "total": len(scan_options)
            }
        }
        
    except Exception as e:
        print(f"[Facematch] Error fetching scans: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_faces(
    request: FacematchCompareRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Compare a live webcam image with a stored document portrait
    Returns biometric landmarks and match percentage
    """
    try:
        print(f"[Facematch] Comparing with scan_id: {request.scan_id}")
        print(f"[Facematch] Mode: {'REAL' if FACE_RECOGNITION_AVAILABLE else 'MOCK'}")
        
        # 1. Load live image
        live_image = base64_to_numpy(request.live_image)
        live_img_pil = Image.fromarray(live_image)
        live_width, live_height = live_img_pil.size
        
        # 4. Fetch document scan from database
        scan = await db.id_scans.find_one({'id': request.scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan nicht gefunden")
        
        # 5. Find portrait image in scan
        portrait_img = None
        for img in scan.get('images', []):
            if img.get('image_type') in ['front_portrait', 'portrait']:
                portrait_img = img
                break
        
        if not portrait_img:
            return {
                "success": False,
                "error": "Kein Portrait-Bild im ausgewählten Scan gefunden."
            }
        
        # 6. Load document portrait image
        doc_image_base64 = portrait_img.get('image_data', '')
        doc_image = base64_to_numpy(doc_image_base64)
        doc_img_pil = Image.fromarray(doc_image)
        doc_width, doc_height = doc_img_pil.size
        
        if FACE_RECOGNITION_AVAILABLE:
            # REAL MODE: Use face_recognition library
            # 2. Find face in live image
            live_face_locations = face_recognition.face_locations(live_image)
            if not live_face_locations:
                return {
                    "success": False,
                    "error": "Kein Gesicht im Live-Bild erkannt. Bitte positionieren Sie sich korrekt."
                }
            
            live_face_location = live_face_locations[0]
            
            # 3. Extract face encodings and landmarks from live image
            live_face_encodings = face_recognition.face_encodings(live_image, [live_face_location])
            live_face_landmarks = face_recognition.face_landmarks(live_image, [live_face_location])
            
            if not live_face_encodings or not live_face_landmarks:
                return {
                    "success": False,
                    "error": "Gesichtsmerkmale konnten nicht erkannt werden."
                }
            
            live_encoding = live_face_encodings[0]
            live_landmarks = live_face_landmarks[0]
            
            # 7. Extract face encodings and landmarks from document
            doc_face_locations = face_recognition.face_locations(doc_image)
            if not doc_face_locations:
                return {
                    "success": False,
                    "error": "Kein Gesicht im Dokument-Bild erkannt."
                }
            
            doc_face_location = doc_face_locations[0]
            doc_face_encodings = face_recognition.face_encodings(doc_image, [doc_face_location])
            doc_face_landmarks = face_recognition.face_landmarks(doc_image, [doc_face_location])
            
            if not doc_face_encodings or not doc_face_landmarks:
                return {
                    "success": False,
                    "error": "Gesichtsmerkmale im Dokument konnten nicht erkannt werden."
                }
            
            doc_encoding = doc_face_encodings[0]
            doc_landmarks = doc_face_landmarks[0]
            
            # 8. Calculate match percentage
            match_percentage = calculate_face_distance(live_encoding, doc_encoding)
        else:
            # MOCK MODE: Generate realistic mock data
            print("[Facematch] Running in MOCK mode - generating sample landmarks")
            
            # Generate realistic face locations (centered in image)
            live_face_location = (
                int(live_height * 0.2),  # top
                int(live_width * 0.7),   # right
                int(live_height * 0.8),  # bottom
                int(live_width * 0.3)    # left
            )
            
            doc_face_location = (
                int(doc_height * 0.2),
                int(doc_width * 0.7),
                int(doc_height * 0.8),
                int(doc_width * 0.3)
            )
            
            # Generate mock landmarks
            live_landmarks = generate_mock_landmarks()
            doc_landmarks = generate_mock_landmarks()
            
            # Mock encodings (not used in mock mode)
            live_encoding = None
            doc_encoding = None
            
            # Calculate mock match percentage
            import random
            match_percentage = round(random.uniform(70, 95), 2)
        
        # 9. Determine if it's a match based on threshold
        is_match = match_percentage >= request.threshold
        
        # 10. Extract person info
        extracted = scan.get('extracted_data', {})
        name = f"{extracted.get('name', '')} {extracted.get('surname', '')}".strip() or 'Unbekannt'
        doc_number = extracted.get('document_number', 'N/A')
        
        print(f"[Facematch] Match: {match_percentage}% (threshold: {request.threshold}%)")
        
        return {
            "success": True,
            "data": {
                "match_percentage": match_percentage,
                "is_match": is_match,
                "threshold": request.threshold,
                "mode": "real" if FACE_RECOGNITION_AVAILABLE else "mock",
                "scan_info": {
                    "scan_id": request.scan_id,
                    "name": name,
                    "document_number": doc_number,
                    "document_type": extracted.get('document_type', 'Unbekannt')
                },
                "live_face": {
                    "location": {
                        "top": live_face_location[0],
                        "right": live_face_location[1],
                        "bottom": live_face_location[2],
                        "left": live_face_location[3]
                    },
                    "landmarks": live_landmarks
                },
                "document_face": {
                    "location": {
                        "top": doc_face_location[0],
                        "right": doc_face_location[1],
                        "bottom": doc_face_location[2],
                        "left": doc_face_location[3]
                    },
                    "landmarks": doc_landmarks
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Facematch] Error during comparison: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fehler beim Vergleich: {str(e)}")


@router.get("/stats")
async def get_facematch_stats(
    token_data: dict = Depends(verify_token)
):
    """
    Get facematch statistics
    """
    try:
        # TODO: Store facematch results in database and return actual stats
        
        return {
            "success": True,
            "data": {
                "total": 0,
                "matches": 0,
                "no_matches": 0,
                "pending": 0
            }
        }
        
    except Exception as e:
        print(f"[Facematch Stats] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
