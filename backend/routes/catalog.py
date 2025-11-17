from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
from routes.portal_auth import verify_token
import os
import uuid
import shutil

router = APIRouter(prefix="/api/catalog", tags=["Document Catalog"])

# MongoDB connection (imported from server.py context)
from server import db

# Pydantic Models
class CatalogDocument(BaseModel):
    id: str
    document_type: str  # Führerschein, Personalausweis, Reisepass, Aufenthaltstitel, Visum, Krankenkasse
    country: str
    country_code: str  # ISO code (DE, US, FR, etc.)
    
    # Image paths - Front side
    front_original: Optional[str] = None
    front_ir: Optional[str] = None
    front_uv: Optional[str] = None
    
    # Image paths - Back side (not for passport)
    back_original: Optional[str] = None
    back_ir: Optional[str] = None
    back_uv: Optional[str] = None
    
    # Metadata
    issue_year: Optional[int] = None
    document_number: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    
    # System fields
    created_at: str
    created_by: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class CatalogDocumentCreate(BaseModel):
    document_type: str
    country: str
    country_code: str
    issue_year: Optional[int] = None
    document_number: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []


# Upload directory
UPLOAD_DIR = "/app/uploads/catalog"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/documents")
async def create_document(
    document_type: str = Form(...),
    country: str = Form(...),
    country_code: str = Form(...),
    issue_year: Optional[int] = Form(None),
    document_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated
    
    front_original: Optional[UploadFile] = File(None),
    front_ir: Optional[UploadFile] = File(None),
    front_uv: Optional[UploadFile] = File(None),
    back_original: Optional[UploadFile] = File(None),
    back_ir: Optional[UploadFile] = File(None),
    back_uv: Optional[UploadFile] = File(None),
    
    token_data: dict = Depends(verify_token)
):
    """
    Create a new catalog document with images
    Admin and authorized users only
    """
    try:
        # Validate document type
        valid_types = ['Führerschein', 'Personalausweis', 'Reisepass', 'Aufenthaltstitel', 'Visum', 'Krankenkasse']
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {valid_types}")
        
        # Generate unique ID
        doc_id = str(uuid.uuid4())
        
        # Parse tags
        tag_list = [t.strip() for t in tags.split(',')] if tags else []
        
        # Save uploaded files
        image_paths = {}
        
        async def save_file(file: UploadFile, field_name: str) -> Optional[str]:
            if not file:
                return None
            
            # Generate unique filename
            ext = os.path.splitext(file.filename)[1]
            filename = f"{doc_id}_{field_name}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            
            # Save file
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            return f"/uploads/catalog/{filename}"
        
        # Save all images
        image_paths['front_original'] = await save_file(front_original, 'front_original')
        image_paths['front_ir'] = await save_file(front_ir, 'front_ir')
        image_paths['front_uv'] = await save_file(front_uv, 'front_uv')
        
        # Back side images (not for passport)
        if document_type != 'Reisepass':
            image_paths['back_original'] = await save_file(back_original, 'back_original')
            image_paths['back_ir'] = await save_file(back_ir, 'back_ir')
            image_paths['back_uv'] = await save_file(back_uv, 'back_uv')
        
        # Create document
        document = {
            "id": doc_id,
            "document_type": document_type,
            "country": country,
            "country_code": country_code.upper(),
            "front_original": image_paths.get('front_original'),
            "front_ir": image_paths.get('front_ir'),
            "front_uv": image_paths.get('front_uv'),
            "back_original": image_paths.get('back_original'),
            "back_ir": image_paths.get('back_ir'),
            "back_uv": image_paths.get('back_uv'),
            "issue_year": issue_year,
            "document_number": document_number,
            "notes": notes,
            "tags": tag_list,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("sub"),
            "updated_at": None,
            "updated_by": None
        }
        
        # Insert into database
        db.catalog_documents.insert_one(document)
        
        # Remove MongoDB _id for response
        document.pop('_id', None)
        
        return {
            "success": True,
            "message": "Document created successfully",
            "document": document
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create catalog document error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def get_documents(
    country_code: Optional[str] = None,
    document_type: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all catalog documents with optional filtering
    """
    try:
        query = {}
        
        if country_code:
            query['country_code'] = country_code.upper()
        
        if document_type:
            query['document_type'] = document_type
        
        # Get documents
        documents = list(db.catalog_documents.find(query).sort("created_at", -1))
        
        # Remove MongoDB _id
        for doc in documents:
            doc.pop('_id', None)
        
        return {
            "success": True,
            "count": len(documents),
            "documents": documents
        }
    
    except Exception as e:
        print(f"Get catalog documents error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific catalog document
    """
    try:
        document = db.catalog_documents.find_one({"id": document_id})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document.pop('_id', None)
        
        return {
            "success": True,
            "document": document
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get catalog document error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a catalog document
    Admin only
    """
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get document to find image paths
        document = db.catalog_documents.find_one({"id": document_id})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete image files
        image_fields = ['front_original', 'front_ir', 'front_uv', 'back_original', 'back_ir', 'back_uv']
        for field in image_fields:
            if document.get(field):
                filepath = document[field].replace('/uploads/catalog/', '')
                full_path = os.path.join(UPLOAD_DIR, filepath)
                if os.path.exists(full_path):
                    os.remove(full_path)
        
        # Delete from database
        db.catalog_documents.delete_one({"id": document_id})
        
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete catalog document error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def get_countries(token_data: dict = Depends(verify_token)):
    """
    Get list of available countries in catalog
    """
    try:
        # Get distinct countries
        countries = db.catalog_documents.distinct("country")
        country_codes = db.catalog_documents.distinct("country_code")
        
        return {
            "success": True,
            "countries": sorted(countries),
            "country_codes": sorted(country_codes)
        }
    
    except Exception as e:
        print(f"Get countries error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_statistics(token_data: dict = Depends(verify_token)):
    """
    Get catalog statistics
    """
    try:
        total = db.catalog_documents.count_documents({})
        
        # Count by document type
        by_type = {}
        types = ['Führerschein', 'Personalausweis', 'Reisepass', 'Aufenthaltstitel', 'Visum', 'Krankenkasse']
        for doc_type in types:
            count = db.catalog_documents.count_documents({"document_type": doc_type})
            by_type[doc_type] = count
        
        # Count by country
        countries = db.catalog_documents.distinct("country")
        by_country = {}
        for country in countries:
            count = db.catalog_documents.count_documents({"country": country})
            by_country[country] = count
        
        return {
            "success": True,
            "statistics": {
                "total": total,
                "by_type": by_type,
                "by_country": by_country,
                "total_countries": len(countries)
            }
        }
    
    except Exception as e:
        print(f"Get statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
