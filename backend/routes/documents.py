from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import os
import uuid
import shutil
from pathlib import Path

router = APIRouter(prefix="/api/documents", tags=["Documents"])
security = HTTPBearer()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection
from pymongo import MongoClient
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

class DocumentResponse(BaseModel):
    document_id: str
    tenant_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    category: str  # contract, invoice, other
    description: Optional[str] = None
    uploaded_by: str
    uploaded_at: str
    file_url: str

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    tenant_id: str = None,
    category: str = "contract",
    description: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload a document (PDF, images, etc.)
    Max size: 20MB
    """
    try:
        # Validate file size (20MB)
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        
        # Save file
        document_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        new_filename = f"{document_id}{file_extension}"
        file_path = UPLOAD_DIR / new_filename
        
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(chunk_size):
                file_size += len(chunk)
                if file_size > 20 * 1024 * 1024:  # 20MB limit
                    os.remove(file_path)
                    raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")
                buffer.write(chunk)
        
        # Get user from token
        # For now, use a placeholder
        uploaded_by = "admin@example.com"
        
        # Store metadata in database
        document_doc = {
            "document_id": document_id,
            "tenant_id": tenant_id,
            "filename": new_filename,
            "original_filename": file.filename,
            "file_type": file.content_type,
            "file_size": file_size,
            "category": category,
            "description": description,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "file_path": str(file_path)
        }
        
        db.documents.insert_one(document_doc)
        
        return {
            "success": True,
            "document_id": document_id,
            "filename": new_filename,
            "file_size": file_size,
            "message": "Document uploaded successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenant/{tenant_id}", response_model=List[DocumentResponse])
async def get_tenant_documents(
    tenant_id: str,
    category: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all documents for a tenant"""
    try:
        query = {"tenant_id": tenant_id}
        if category:
            query["category"] = category
        
        documents = []
        cursor = db.documents.find(query).sort("uploaded_at", -1)
        
        async for doc in cursor:
            if '_id' in doc:
                del doc['_id']
            doc['file_url'] = f"/api/documents/download/{doc['document_id']}"
            documents.append(DocumentResponse(**doc))
        
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{document_id}")
async def download_document(
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Download a document"""
    try:
        doc = db.documents.find_one({"document_id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = Path(doc["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        return FileResponse(
            path=file_path,
            filename=doc["original_filename"],
            media_type=doc["file_type"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a document"""
    try:
        doc = db.documents.find_one({"document_id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file from disk
        file_path = Path(doc["file_path"])
        if file_path.exists():
            os.remove(file_path)
        
        # Delete from database
        db.documents.delete_one({"document_id": document_id})
        
        return {"success": True, "message": "Document deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
