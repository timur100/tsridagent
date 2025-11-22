from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Header
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from models.id_scan import (
    IDScan, IDScanCreate, IDScanUpdate, ManualActionRequest,
    ScanStatus, ScanImage, ImageType, ManualAction
)

router = APIRouter(prefix="/id-scans", tags=["ID Scans"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client.get_database('main_db')

# JWT Auth
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here-change-in-production')
JWT_ALGORITHM = 'HS256'

# Upload directory for ID scan images
UPLOAD_DIR = "/app/backend/uploads/id_scans"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB per image


# Helper function for JWT verification
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    try:
        if authorization.startswith('Bearer '):
            token = authorization.split(' ')[1]
        else:
            token = authorization
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Helper function to get database
async def get_database():
    """Get the main database instance"""
    return mongo_db


@router.post("/", response_model=dict)
async def create_id_scan(
    tenant_id: str = Form(...),
    tenant_name: str = Form(...),
    location_id: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    device_name: Optional[str] = Form(None),
    scanned_by: Optional[str] = Form(None),
    operator_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    extracted_data: Optional[str] = Form(None),  # JSON string
    verification: Optional[str] = Form(None),  # JSON string
    ip_address: Optional[str] = Form(None),
    # Images
    front_original: Optional[UploadFile] = File(None),
    front_ir: Optional[UploadFile] = File(None),
    front_uv: Optional[UploadFile] = File(None),
    back_original: Optional[UploadFile] = File(None),
    back_ir: Optional[UploadFile] = File(None),
    back_uv: Optional[UploadFile] = File(None),
    token_data: dict = Depends(verify_token)
):
    """
    Create a new ID scan with images
    """
    try:
        import json
        
        db = await get_database()
        scans_collection = db['id_scans']
        
        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Parse JSON strings
        extracted_data_obj = json.loads(extracted_data) if extracted_data else None
        verification_obj = json.loads(verification) if verification else None
        
        # Determine initial status based on verification
        status = ScanStatus.pending
        if verification_obj:
            confidence = verification_obj.get('confidence_score', 0)
            if confidence >= 90:
                status = ScanStatus.validated
            elif confidence < 50:
                status = ScanStatus.rejected
            else:
                status = ScanStatus.unknown
        
        # Create scan document
        scan_data = {
            "id": scan_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "location_id": location_id,
            "location_name": location_name,
            "device_id": device_id,
            "device_name": device_name,
            "scan_timestamp": now,
            "status": status,
            "document_type": document_type,
            "scanned_by": scanned_by,
            "operator_id": operator_id,
            "images": [],
            "extracted_data": extracted_data_obj,
            "verification": verification_obj,
            "requires_manual_review": status == ScanStatus.unknown,
            "manual_actions": [],
            "created_at": now,
            "updated_at": now,
            "ip_address": ip_address,
            "notes": None,
            "tags": []
        }
        
        # Upload images
        image_files = [
            (front_original, ImageType.front_original),
            (front_ir, ImageType.front_ir),
            (front_uv, ImageType.front_uv),
            (back_original, ImageType.back_original),
            (back_ir, ImageType.back_ir),
            (back_uv, ImageType.back_uv)
        ]
        
        for image_file, image_type in image_files:
            if image_file:
                # Read and validate file
                content = await image_file.read()
                file_size = len(content)
                
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail=f"Image too large: {image_type}")
                
                # Generate unique filename
                ext = os.path.splitext(image_file.filename)[1] or '.jpg'
                filename = f"{scan_id}_{image_type}{ext}"
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                # Save file
                with open(file_path, 'wb') as f:
                    f.write(content)
                
                # Add to images array
                scan_data["images"].append({
                    "image_type": image_type,
                    "file_path": file_path,
                    "file_size": file_size,
                    "uploaded_at": now
                })
        
        # Save to database
        await scans_collection.insert_one(scan_data)
        
        # Remove _id from response
        if '_id' in scan_data:
            del scan_data['_id']
        
        # TODO: Broadcast WebSocket event for real-time updates
        
        return {
            "success": True,
            "message": "ID scan created successfully",
            "scan": scan_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating ID scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=dict)
async def get_id_scans(
    tenant_id: Optional[str] = None,
    location_id: Optional[str] = None,
    device_id: Optional[str] = None,
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    token_data: dict = Depends(verify_token)
):
    """
    Get ID scans with filters
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        # Build query
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        if location_id:
            query["location_id"] = location_id
        if device_id:
            query["device_id"] = device_id
        if status:
            query["status"] = status
        if document_type:
            query["document_type"] = document_type
        
        # Date range filter
        if from_date or to_date:
            query["scan_timestamp"] = {}
            if from_date:
                query["scan_timestamp"]["$gte"] = from_date
            if to_date:
                query["scan_timestamp"]["$lte"] = to_date
        
        # Get total count
        total = await scans_collection.count_documents(query)
        
        # Get scans
        cursor = scans_collection.find(query).sort("scan_timestamp", -1).skip(skip).limit(limit)
        scans = []
        
        async for scan in cursor:
            if '_id' in scan:
                del scan['_id']
            scans.append(scan)
        
        return {
            "success": True,
            "scans": scans,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        print(f"Error fetching ID scans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{scan_id}", response_model=dict)
async def get_id_scan(
    scan_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get single ID scan by ID
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        scan = await scans_collection.find_one({"id": scan_id})
        
        if not scan:
            raise HTTPException(status_code=404, detail="ID scan not found")
        
        if '_id' in scan:
            del scan['_id']
        
        return {
            "success": True,
            "scan": scan
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching ID scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{scan_id}", response_model=dict)
async def update_id_scan(
    scan_id: str,
    update_data: IDScanUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update ID scan
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        # Check if scan exists
        scan = await scans_collection.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="ID scan not found")
        
        # Build update dict
        update_dict = {}
        if update_data.status:
            update_dict["status"] = update_data.status
        if update_data.extracted_data:
            update_dict["extracted_data"] = update_data.extracted_data.dict()
        if update_data.verification:
            update_dict["verification"] = update_data.verification.dict()
        if update_data.notes:
            update_dict["notes"] = update_data.notes
        if update_data.tags is not None:
            update_dict["tags"] = update_data.tags
        
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update scan
        await scans_collection.update_one(
            {"id": scan_id},
            {"$set": update_dict}
        )
        
        # Get updated scan
        updated_scan = await scans_collection.find_one({"id": scan_id})
        if '_id' in updated_scan:
            del updated_scan['_id']
        
        return {
            "success": True,
            "message": "ID scan updated",
            "scan": updated_scan
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating ID scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{scan_id}/action", response_model=dict)
async def manual_action(
    scan_id: str,
    action_data: ManualActionRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Perform manual action on ID scan (approve, reject, ban)
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        # Check if scan exists
        scan = await scans_collection.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="ID scan not found")
        
        # Create action record
        action = {
            "action": action_data.action,
            "performed_by": token_data.get("sub"),
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "comment": action_data.comment,
            "reason": action_data.reason
        }
        
        # Determine new status
        new_status = ScanStatus.validated if action_data.action == "approved" else ScanStatus.rejected
        
        # Update scan
        await scans_collection.update_one(
            {"id": scan_id},
            {
                "$set": {
                    "status": new_status,
                    "requires_manual_review": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"manual_actions": action}
            }
        )
        
        # Get updated scan
        updated_scan = await scans_collection.find_one({"id": scan_id})
        if '_id' in updated_scan:
            del updated_scan['_id']
        
        return {
            "success": True,
            "message": f"Action '{action_data.action}' performed successfully",
            "scan": updated_scan
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error performing manual action: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{scan_id}/images/{image_type}", response_model=dict)
async def get_scan_image(
    scan_id: str,
    image_type: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get image file for a scan
    """
    try:
        from fastapi.responses import FileResponse
        
        db = await get_database()
        scans_collection = db['id_scans']
        
        scan = await scans_collection.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="ID scan not found")
        
        # Find image
        image = None
        for img in scan.get("images", []):
            if img["image_type"] == image_type:
                image = img
                break
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        file_path = image["file_path"]
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image file not found on disk")
        
        return FileResponse(
            path=file_path,
            media_type="image/jpeg",
            filename=os.path.basename(file_path)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary", response_model=dict)
async def get_scan_stats(
    tenant_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get statistics for ID scans
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        # Count by status
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = {}
        async for result in scans_collection.aggregate(pipeline):
            status_counts[result["_id"]] = result["count"]
        
        total = sum(status_counts.values())
        
        return {
            "success": True,
            "stats": {
                "total": total,
                "validated": status_counts.get("validated", 0),
                "rejected": status_counts.get("rejected", 0),
                "unknown": status_counts.get("unknown", 0),
                "pending": status_counts.get("pending", 0)
            }
        }
    
    except Exception as e:
        print(f"Error fetching scan stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
