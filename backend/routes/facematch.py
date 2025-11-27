"""
Facematch API Routes - Face comparison and verification
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/facematch", tags=["Facematch"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']


class FacematchRequest(BaseModel):
    """Facematch comparison request"""
    image: str  # Base64 encoded image


class FacematchResult(BaseModel):
    """Single facematch result"""
    scan_id: str
    name: str
    document_number: str
    document_image: str  # Base64 or URL
    confidence: float
    scanned_at: str


@router.post("/compare")
async def compare_face(
    request: FacematchRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Compare a face image with all portraits in the database
    
    NOTE: This is a placeholder implementation. In production, you would use:
    - Face recognition library (face_recognition, DeepFace, etc.)
    - AWS Rekognition
    - Azure Face API
    - Google Cloud Vision API
    """
    try:
        # Extract image data
        image_data = request.image
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # TODO: Implement actual face comparison logic
        # For now, return mock results for demonstration
        
        # Fetch all ID scans with portraits
        scans = await db.id_scans.find({
            'images': {
                '$elemMatch': {
                    'image_type': {'$in': ['front_portrait', 'portrait']}
                }
            }
        }).limit(50).to_list(length=50)
        
        print(f"[Facematch] Found {len(scans)} scans with portraits")
        
        matches = []
        
        # TODO: Replace with actual face comparison
        # This is a placeholder that returns mock confidence scores
        for scan in scans[:3]:  # Limit to 3 for demo
            # Find portrait image
            portrait_img = None
            for img in scan.get('images', []):
                if img.get('image_type') in ['front_portrait', 'portrait']:
                    portrait_img = img
                    break
            
            if not portrait_img:
                continue
            
            # Extract name and document info
            extracted = scan.get('extracted_data', {})
            name = f"{extracted.get('name', '')} {extracted.get('surname', '')}".strip() or 'Unbekannt'
            doc_number = extracted.get('document_number', 'N/A')
            
            # Mock confidence score (in production, this would come from face recognition)
            import random
            confidence = round(random.uniform(70, 95), 1)
            
            # Get image URL (in production, serve from backend)
            doc_image_url = f"/api/id-scans/{scan.get('id')}/images/{portrait_img.get('image_type')}"
            
            matches.append({
                'scan_id': scan.get('id'),
                'name': name,
                'document_number': doc_number,
                'document_image': doc_image_url,
                'confidence': confidence,
                'scanned_at': scan.get('created_at', '')
            })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        print(f"[Facematch] Returning {len(matches)} matches")
        
        return {
            "success": True,
            "data": {
                "matches": matches,
                "total": len(matches)
            }
        }
        
    except Exception as e:
        print(f"[Facematch] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
