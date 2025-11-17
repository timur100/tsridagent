from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/pdf-documents", tags=["PDF Documents"])

# PDF storage directory
PDF_DIR = "/app/backend/static/pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.scanner_db

# In-memory storage for PDF metadata (in production, use MongoDB)
pdf_metadata = {}

class PDFDocument(BaseModel):
    id: str
    name: str
    display_name: str
    file_path: str
    uploaded_at: str
    file_size: int

@router.get("/list")
async def list_pdfs():
    """Get list of all available PDFs"""
    try:
        pdfs = []
        for filename in os.listdir(PDF_DIR):
            if filename.endswith('.pdf'):
                file_path = os.path.join(PDF_DIR, filename)
                file_stat = os.stat(file_path)
                
                pdf_id = filename.replace('.pdf', '')
                if pdf_id in pdf_metadata:
                    metadata = pdf_metadata[pdf_id]
                else:
                    metadata = {
                        'display_name': filename.replace('.pdf', '').replace('_', ' '),
                        'uploaded_at': datetime.fromtimestamp(file_stat.st_mtime, tz=timezone.utc).isoformat()
                    }
                
                pdfs.append({
                    'id': pdf_id,
                    'name': filename,
                    'display_name': metadata['display_name'],
                    'file_path': f'/api/pdf-documents/view/{pdf_id}',
                    'uploaded_at': metadata['uploaded_at'],
                    'file_size': file_stat.st_size
                })
        
        return {
            'success': True,
            'pdfs': pdfs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.head("/view/{pdf_id}")
@router.get("/view/{pdf_id}")
async def view_pdf(pdf_id: str):
    """Serve a PDF file for inline viewing in browser"""
    try:
        pdf_path = os.path.join(PDF_DIR, f"{pdf_id}.pdf")
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF nicht gefunden")
        
        # Use FileResponse which handles range requests better
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=document.pdf",
                "Cache-Control": "public, max-age=3600",
                "X-Content-Type-Options": "nosniff",
                "Accept-Ranges": "bytes",
                "X-Frame-Options": "SAMEORIGIN",  # Allow iframe in same origin
                "Access-Control-Allow-Origin": "*",  # Allow CORS
                "Cross-Origin-Resource-Policy": "cross-origin"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    display_name: Optional[str] = None
):
    """Upload a new PDF"""
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Nur PDF-Dateien erlaubt")
        
        # Generate unique ID
        pdf_id = str(uuid.uuid4())[:8]
        
        # Save file
        file_path = os.path.join(PDF_DIR, f"{pdf_id}.pdf")
        
        content = await file.read()
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Store metadata
        pdf_metadata[pdf_id] = {
            'display_name': display_name or file.filename.replace('.pdf', ''),
            'uploaded_at': datetime.now(timezone.utc).isoformat(),
            'original_filename': file.filename
        }
        
        return {
            'success': True,
            'message': 'PDF erfolgreich hochgeladen',
            'pdf_id': pdf_id,
            'display_name': pdf_metadata[pdf_id]['display_name']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{pdf_id}")
async def update_pdf_metadata(pdf_id: str, display_name: str):
    """Update PDF metadata"""
    try:
        pdf_path = os.path.join(PDF_DIR, f"{pdf_id}.pdf")
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF nicht gefunden")
        
        if pdf_id in pdf_metadata:
            pdf_metadata[pdf_id]['display_name'] = display_name
        else:
            pdf_metadata[pdf_id] = {
                'display_name': display_name,
                'uploaded_at': datetime.now(timezone.utc).isoformat()
            }
        
        return {
            'success': True,
            'message': 'PDF-Metadaten aktualisiert'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{pdf_id}")
async def delete_pdf(pdf_id: str):
    """Delete a PDF"""
    try:
        pdf_path = os.path.join(PDF_DIR, f"{pdf_id}.pdf")
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF nicht gefunden")
        
        # Delete file
        os.remove(pdf_path)
        
        # Remove metadata
        if pdf_id in pdf_metadata:
            del pdf_metadata[pdf_id]
        
        return {
            'success': True,
            'message': 'PDF erfolgreich gelöscht'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mappings")
async def get_pdf_mappings():
    """Get PDF button mappings"""
    try:
        # Get mappings from database
        mapping_doc = await db.pdf_mappings.find_one({'_id': 'default'})
        
        if mapping_doc and 'mappings' in mapping_doc:
            return {
                'success': True,
                'mappings': mapping_doc['mappings']
            }
        
        # Return defaults if no mappings found
        return {
            'success': True,
            'mappings': {
                'frei1': None,
                'frei2': None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mappings")
async def update_pdf_mappings(mappings: dict):
    """Update PDF button mappings"""
    try:
        # Store in database
        await db.pdf_mappings.update_one(
            {'_id': 'default'},
            {'$set': {'mappings': mappings}},
            upsert=True
        )
        
        return {
            'success': True,
            'message': 'Zuordnungen aktualisiert',
            'mappings': mappings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
