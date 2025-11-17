from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from pymongo import MongoClient
import os
import uuid
import base64
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/branding", tags=["Branding"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['test_database']

# Logo directory
LOGO_DIR = "/app/uploads/logos"
os.makedirs(LOGO_DIR, exist_ok=True)

@router.get("/logo")
async def get_logo():
    """
    Get current company logos (dark and light mode)
    Public endpoint
    """
    branding = db.branding.find_one({})
    
    if not branding:
        return {
            "success": True,
            "logo_url_dark": None,
            "logo_url_light": None,
            "company_name": "TSRID"
        }
    
    return {
        "success": True,
        "logo_url_dark": branding.get('logo_url_dark') or branding.get('logo_url'),  # Fallback to old logo_url
        "logo_url_light": branding.get('logo_url_light'),
        "company_name": branding.get('company_name', 'TSRID')
    }

@router.post("/logo/upload")
async def upload_logo(
    file: UploadFile = File(...),
    logo_type: str = Form('dark'),  # 'dark' or 'light'
    token_data: dict = Depends(verify_token)
):
    """
    Upload company logo for dark or light mode
    Admin only
    logo_type: 'dark' for dark mode (red background), 'light' for light mode (white background)
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate logo_type
    if logo_type not in ['dark', 'light']:
        raise HTTPException(status_code=400, detail="logo_type must be 'dark' or 'light'")
    
    # Validate file type
    allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nur PNG, JPG und SVG Dateien erlaubt")
    
    # Read file
    contents = await file.read()
    
    # Validate file size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß (max 5MB)")
    
    # Generate filename
    file_extension = file.filename.split('.')[-1]
    filename = f"logo_{logo_type}_{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(LOGO_DIR, filename)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(contents)
    
    # Convert to base64 for storage
    logo_base64 = base64.b64encode(contents).decode('utf-8')
    logo_url = f"data:{file.content_type};base64,{logo_base64}"
    
    # Delete old logo file if exists
    old_branding = db.branding.find_one({})
    field_path = f'logo_path_{logo_type}'
    if old_branding and old_branding.get(field_path):
        old_path = old_branding.get(field_path)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Update database
    update_fields = {
        f"logo_url_{logo_type}": logo_url,
        f"logo_path_{logo_type}": file_path,
        f"logo_filename_{logo_type}": filename,
        "updated_by": token_data.get("sub")
    }
    
    db.branding.update_one(
        {},
        {"$set": update_fields},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Logo für {logo_type} Mode erfolgreich hochgeladen",
        "logo_url": logo_url,
        "logo_type": logo_type
    }

@router.post("/company-name")
async def update_company_name(
    data: dict,
    token_data: dict = Depends(verify_token)
):
    """
    Update company name
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company_name = data.get('company_name', 'TSRID')
    
    db.branding.update_one(
        {},
        {"$set": {"company_name": company_name}},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Firmenname aktualisiert",
        "company_name": company_name
    }

@router.delete("/logo")
async def delete_logo(logo_type: str = 'dark', token_data: dict = Depends(verify_token)):
    """
    Delete company logo for dark or light mode
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate logo_type
    if logo_type not in ['dark', 'light']:
        raise HTTPException(status_code=400, detail="logo_type must be 'dark' or 'light'")
    
    branding = db.branding.find_one({})
    field_path = f'logo_path_{logo_type}'
    if branding and branding.get(field_path):
        logo_path = branding.get(field_path)
        if os.path.exists(logo_path):
            os.remove(logo_path)
    
    db.branding.update_one(
        {},
        {
            "$unset": {
                f"logo_url_{logo_type}": "",
                f"logo_path_{logo_type}": "",
                f"logo_filename_{logo_type}": ""
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Logo für {logo_type} Mode gelöscht"
    }
