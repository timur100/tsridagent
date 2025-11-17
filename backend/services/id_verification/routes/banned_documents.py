from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import datetime
import logging

from models.banned_document import (
    BannedDocument,
    BannedDocumentCreate,
    BannedCheckRequest,
    BannedCheckResponse
)
from utils.db import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banned-documents", tags=["banned-documents"])

db = get_database()


@router.post("", response_model=BannedDocument, status_code=201)
async def create_banned_document(banned_doc: BannedDocumentCreate):
    """Add document to banned list"""
    try:
        doc = BannedDocument(**banned_doc.model_dump())
        
        # Convert to dict and serialize datetime
        doc_dict = doc.model_dump()
        doc_dict['banned_at'] = doc_dict['banned_at'].isoformat()
        doc_dict['created_at'] = doc_dict['created_at'].isoformat()
        if doc_dict.get('expires_at'):
            doc_dict['expires_at'] = doc_dict['expires_at'].isoformat()
        
        await db.banned_documents.insert_one(doc_dict)
        
        logger.info(f"Banned document: {banned_doc.document_number}")
        return doc
        
    except Exception as e:
        logger.error(f"Error banning document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[BannedDocument])
async def get_banned_documents(
    limit: int = Query(100, le=1000),
    skip: int = Query(0, ge=0)
):
    """Get all banned documents"""
    try:
        docs = await db.banned_documents.find(
            {},
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(limit)
        
        # Convert timestamps
        for doc in docs:
            if isinstance(doc.get('banned_at'), str):
                doc['banned_at'] = datetime.fromisoformat(doc['banned_at'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            if doc.get('expires_at') and isinstance(doc['expires_at'], str):
                doc['expires_at'] = datetime.fromisoformat(doc['expires_at'])
        
        return [BannedDocument(**doc) for doc in docs]
        
    except Exception as e:
        logger.error(f"Error fetching banned documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check", response_model=BannedCheckResponse)
async def check_banned_document(request: BannedCheckRequest):
    """Check if a document is banned"""
    try:
        doc = await db.banned_documents.find_one(
            {"document_number": request.document_number},
            {"_id": 0}
        )
        
        if not doc:
            return BannedCheckResponse(is_banned=False)
        
        # Check if ban has expired
        if doc.get('expires_at'):
            expires_at = doc['expires_at']
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            
            if expires_at < datetime.now():
                return BannedCheckResponse(is_banned=False)
        
        # Convert timestamps
        banned_at = doc.get('banned_at')
        if isinstance(banned_at, str):
            banned_at = datetime.fromisoformat(banned_at)
        
        expires_at = doc.get('expires_at')
        if expires_at and isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        
        return BannedCheckResponse(
            is_banned=True,
            reason=doc.get('reason'),
            banned_at=banned_at,
            expires_at=expires_at
        )
        
    except Exception as e:
        logger.error(f"Error checking banned document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{banned_id}")
async def delete_banned_document(banned_id: str):
    """Remove document from banned list"""
    try:
        result = await db.banned_documents.delete_one({"banned_id": banned_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Banned document not found")
        
        logger.info(f"Removed banned document: {banned_id}")
        return {"message": "Document removed from banned list"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting banned document: {e}")
        raise HTTPException(status_code=500, detail=str(e))
