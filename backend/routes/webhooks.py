"""
Webhook Endpoints for External Integrations
Handles incoming webhook data from external services like scan-verify-hub
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import aiofiles
import base64
from middleware.api_key_auth import verify_api_key
from models.id_scan import ScanStatus

router = APIRouter(tags=["Webhooks"], prefix="/webhooks")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client.get_database('main_db')

# Upload directory for ID scan images
UPLOAD_DIR = "/app/backend/uploads/id_scans"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB per image


async def get_database():
    """Get the main database instance"""
    return mongo_db


@router.post("/scan-completed", response_model=dict)
async def scan_completed_webhook(
    # Scan metadata
    tenant_id: str = Form(...),
    tenant_name: str = Form(...),
    location_id: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    device_name: Optional[str] = Form(None),
    scanner_id: Optional[str] = Form(None),
    scanner_name: Optional[str] = Form(None),
    scan_timestamp: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    extracted_data: Optional[str] = Form(None),  # JSON string
    verification: Optional[str] = Form(None),  # JSON string
    ip_address: Optional[str] = Form(None),
    # Image file paths (relative to scan service)
    image_paths: Optional[str] = Form(None),  # JSON string with array of {type, path}
    # Verification for API Key
    api_key_valid: bool = Depends(verify_api_key)
):
    """
    Webhook endpoint to receive completed scans from scan-verify-hub
    
    Accepts scan metadata and image file paths.
    Images will be fetched separately via follow-up requests.
    
    Required headers:
        X-API-Key: API key for authentication
    """
    try:
        import json
        import requests
        
        db = await get_database()
        scans_collection = db['id_scans']
        
        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Use provided scan_timestamp or current time
        scan_ts = scan_timestamp if scan_timestamp else now
        
        # Parse JSON strings
        extracted_data_obj = json.loads(extracted_data) if extracted_data else None
        verification_obj = json.loads(verification) if verification else None
        image_paths_list = json.loads(image_paths) if image_paths else []
        
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
            "scanner_id": scanner_id,
            "scanner_name": scanner_name,
            "scan_timestamp": scan_ts,
            "status": status,
            "document_type": document_type,
            "scanned_by": None,
            "operator_id": None,
            "images": [],
            "extracted_data": extracted_data_obj,
            "verification": verification_obj,
            "requires_manual_review": status == ScanStatus.unknown,
            "manual_actions": [],
            "created_at": now,
            "updated_at": now,
            "ip_address": ip_address,
            "notes": None,
            "tags": [],
            "image_paths": image_paths_list,  # Store for reference
            "source": "scan-verify-hub"  # Track source of scan
        }
        
        # Save to database
        await scans_collection.insert_one(scan_data)
        
        # Remove _id from response
        if '_id' in scan_data:
            del scan_data['_id']
        
        print(f"✅ [Webhook] Scan {scan_id} received from scan-verify-hub")
        print(f"   Tenant: {tenant_name} ({tenant_id})")
        print(f"   Location: {location_name}")
        print(f"   Device: {device_name}")
        print(f"   Status: {status}")
        print(f"   Images: {len(image_paths_list)} image paths received")
        
        return {
            "success": True,
            "message": "Scan received successfully",
            "scan_id": scan_id,
            "status": status,
            "images_pending": len(image_paths_list)
        }
    
    except json.JSONDecodeError as e:
        print(f"❌ [Webhook] JSON parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")
    except Exception as e:
        print(f"❌ [Webhook] Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-completed/upload-images", response_model=dict)
async def upload_scan_images(
    scan_id: str = Form(...),
    # Multiple image files
    front_original: Optional[UploadFile] = File(None),
    front_ir: Optional[UploadFile] = File(None),
    front_uv: Optional[UploadFile] = File(None),
    back_original: Optional[UploadFile] = File(None),
    back_ir: Optional[UploadFile] = File(None),
    back_uv: Optional[UploadFile] = File(None),
    portrait: Optional[UploadFile] = File(None),
    # Verification for API Key
    api_key_valid: bool = Depends(verify_api_key)
):
    """
    Upload images for a previously received scan
    
    This is a follow-up endpoint after /scan-completed webhook.
    Accepts actual image files and associates them with the scan.
    
    Required headers:
        X-API-Key: API key for authentication
    """
    try:
        db = await get_database()
        scans_collection = db['id_scans']
        
        # Check if scan exists
        scan = await scans_collection.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Map of image types
        image_files = {
            "front_original": front_original,
            "front_ir": front_ir,
            "front_uv": front_uv,
            "back_original": back_original,
            "back_ir": back_ir,
            "back_uv": back_uv,
            "portrait": portrait
        }
        
        images_array = scan.get("images", [])
        uploaded_count = 0
        
        # Process each image
        for image_type, image_file in image_files.items():
            if image_file and image_file.filename:
                # Read file content
                content = await image_file.read()
                file_size = len(content)
                
                if file_size > MAX_FILE_SIZE:
                    print(f"⚠️  [Webhook] Image {image_type} too large: {file_size} bytes")
                    continue
                
                # Generate unique filename
                ext = os.path.splitext(image_file.filename)[1] or '.jpg'
                filename = f"{scan_id}_{image_type}{ext}"
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                # Save file using aiofiles for async
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                
                # Add to images array
                images_array.append({
                    "image_type": image_type,
                    "file_path": file_path,
                    "file_size": file_size,
                    "uploaded_at": now
                })
                
                uploaded_count += 1
                print(f"✅ [Webhook] Image uploaded: {image_type} ({file_size} bytes)")
        
        # Update scan document with images
        await scans_collection.update_one(
            {"id": scan_id},
            {
                "$set": {
                    "images": images_array,
                    "updated_at": now
                }
            }
        )
        
        print(f"✅ [Webhook] {uploaded_count} images uploaded for scan {scan_id}")
        
        return {
            "success": True,
            "message": f"{uploaded_count} images uploaded successfully",
            "scan_id": scan_id,
            "images_uploaded": uploaded_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Webhook] Error uploading images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regula-scan", response_model=dict)
async def regula_scan_webhook(
    scan_data: dict,
    api_key_valid: bool = Depends(verify_api_key)
):
    """
    Webhook endpoint to receive completed scans from Regula scanner
    
    Accepts a comprehensive JSON object containing:
    - Graphics_Data (with Base64 images)
    - Text_Data (with extracted personal information)
    - ChoosenDoctype_Data (with document type and metadata)
    - SecurityChecks_Data
    - IR, UV, WHITE light images
    - And other Regula data files
    
    Required headers:
        X-API-Key: API key for authentication
    
    Example payload:
    {
        "Graphics_Data": {...},
        "Text_Data": {...},
        "ChoosenDoctype_Data": {...},
        "SecurityChecks_Data": {...},
        "IR": {...},
        "UV": {...},
        "WHITE": {...},
        "customer_id": "optional-customer-id",
        "location": "optional-location-name"
    }
    """
    try:
        import json
        import sys
        sys.path.append('/app/backend')
        from utils.regula_parser import RegulaParser, create_idscan_from_regula
        
        db = await get_database()
        scans_collection = db['id_scans']
        
        # Initialize parser
        parser = RegulaParser()
        
        # Parse all Regula data
        print(f"📄 [Regula Webhook] Parsing incoming scan data...")
        parsed_data = parser.parse_all_data(scan_data)
        
        # Extract tenant/location/device info from request
        tenant_id = scan_data.get('tenant_id', 'default')
        tenant_name = scan_data.get('tenant_name', 'Default Tenant')
        location_id = scan_data.get('location_id')
        location_name = scan_data.get('location_name')
        device_id = scan_data.get('device_id')
        device_name = scan_data.get('device_name')
        
        # Convert to IDScan format
        idscan_data = create_idscan_from_regula(
            parsed_data, 
            tenant_id=tenant_id,
            tenant_name=tenant_name,
            location_id=location_id,
            location_name=location_name,
            device_id=device_id,
            device_name=device_name
        )
        scan_id = idscan_data['id']
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Save images to disk
        images_saved = []
        images_array = []
        images = parsed_data.get('images', {})
        
        # Map image types for IDScan model
        image_type_mapping = {
            'front': 'front_original',
            'back': 'back_original',
            'portrait': 'portrait',
            'ir': 'front_ir',
            'uv': 'front_uv',
            'white': 'front_white'
        }
        
        for image_type, base64_data in images.items():
            if base64_data and len(base64_data) > 100:
                try:
                    # Decode Base64
                    image_bytes = parser.decode_base64_image(base64_data)
                    if image_bytes:
                        # Generate filename
                        filename = f"{scan_id}_{image_type}.jpg"
                        file_path = os.path.join(UPLOAD_DIR, filename)
                        
                        # Save to disk
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(image_bytes)
                        
                        # Get standardized image type for IDScan model
                        std_image_type = image_type_mapping.get(image_type, image_type)
                        
                        # Add to images array
                        images_array.append({
                            "image_type": std_image_type,
                            "file_path": file_path,
                            "file_size": len(image_bytes),
                            "uploaded_at": now
                        })
                        
                        images_saved.append({
                            "type": image_type,
                            "path": file_path,
                            "size": len(image_bytes)
                        })
                        
                        print(f"✅ [Regula Webhook] Saved {image_type} image ({len(image_bytes)} bytes)")
                except Exception as img_error:
                    print(f"⚠️  [Regula Webhook] Failed to save {image_type} image: {img_error}")
        
        # Update images array in IDScan data
        idscan_data['images'] = images_array
        
        # Add additional metadata
        idscan_data['source'] = 'regula-scanner'
        idscan_data['images_info'] = images_saved
        idscan_data['raw_security_checks'] = parsed_data.get('security_checks', {})
        idscan_data['created_at'] = now
        idscan_data['updated_at'] = now
        
        # Save to database
        await scans_collection.insert_one(idscan_data)
        
        # Remove _id from response
        if '_id' in idscan_data:
            del idscan_data['_id']
        
        print(f"✅ [Regula Webhook] Scan {scan_id} processed successfully")
        print(f"   Name: {idscan_data.get('first_name')} {idscan_data.get('last_name')}")
        print(f"   Document: {idscan_data.get('document_type')}")
        print(f"   Number: {idscan_data.get('document_number')}")
        print(f"   Images: {len(images_saved)} saved")
        
        return {
            "success": True,
            "message": "Regula scan processed successfully",
            "scan_id": scan_id,
            "images_saved": len(images_saved),
            "personal_data": {
                "name": f"{idscan_data.get('first_name')} {idscan_data.get('last_name')}",
                "document_number": idscan_data.get('document_number'),
                "document_type": idscan_data.get('document_type')
            }
        }
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ [Regula Webhook] Error processing scan: {str(e)}")
        print(error_details)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=dict)
async def webhook_health():
    """Health check endpoint for webhook service"""
    return {
        "success": True,
        "service": "Webhook Service",
        "status": "operational"
    }
