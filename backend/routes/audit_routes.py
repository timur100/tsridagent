"""
TSRID Audit & Data Integrity API Routes
========================================
REST API für das Audit-System und Datenintegrität.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os

# Import audit service
from services.audit_service import (
    log_audit, verify_write, soft_delete, restore_document,
    get_audit_log, get_document_history, get_audit_statistics,
    create_audit_indexes, AuditAction
)

router = APIRouter(prefix="/api/audit", tags=["audit"])


class SoftDeleteRequest(BaseModel):
    collection: str
    document_id: str
    reason: str = "Manuell gelöscht"


class RestoreRequest(BaseModel):
    collection: str
    document_id: str


class AuditLogQuery(BaseModel):
    collection: Optional[str] = None
    document_id: Optional[str] = None
    user: Optional[str] = None
    action: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 100
    skip: int = 0


# ============ SOFT DELETE & RESTORE ============

@router.post("/soft-delete")
async def api_soft_delete(request: Request, data: SoftDeleteRequest):
    """
    Archiviert ein Dokument (Soft Delete).
    Das Dokument bleibt in der Datenbank und kann wiederhergestellt werden.
    """
    # Get user from request (you may want to integrate with your auth system)
    user = request.headers.get("X-User", "system")
    ip_address = request.client.host if request.client else None
    
    result = await soft_delete(
        collection=data.collection,
        document_id=data.document_id,
        user=user,
        reason=data.reason,
        ip_address=ip_address,
        app_source="web_portal"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/restore")
async def api_restore(request: Request, data: RestoreRequest):
    """
    Stellt ein archiviertes Dokument wieder her.
    """
    user = request.headers.get("X-User", "system")
    ip_address = request.client.host if request.client else None
    
    result = await restore_document(
        collection=data.collection,
        document_id=data.document_id,
        user=user,
        ip_address=ip_address,
        app_source="web_portal"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


# ============ AUDIT LOG QUERIES ============

@router.get("/log")
async def api_get_audit_log(
    collection: Optional[str] = None,
    document_id: Optional[str] = None,
    user: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = Query(default=0, ge=0)
):
    """
    Abfrage des Audit-Logs mit verschiedenen Filtern.
    """
    start_dt = None
    end_dt = None
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            pass
    
    return await get_audit_log(
        collection=collection,
        document_id=document_id,
        user=user,
        action=action,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit,
        skip=skip
    )


@router.get("/document/{collection}/{document_id}")
async def api_get_document_history(collection: str, document_id: str):
    """
    Vollständige Historie eines einzelnen Dokuments.
    """
    return await get_document_history(collection, document_id)


@router.get("/statistics")
async def api_get_audit_statistics(days: int = Query(default=7, le=90)):
    """
    Audit-Statistiken für das Dashboard.
    """
    return await get_audit_statistics(days=days)


# ============ ARCHIVED DOCUMENTS ============

@router.get("/archived")
async def api_get_archived_documents(
    collection: str = Query(..., description="Collection name"),
    limit: int = Query(default=50, le=200),
    skip: int = Query(default=0, ge=0)
):
    """
    Liste aller archivierten Dokumente einer Collection.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
    client = AsyncIOMotorClient(mongo_url)
    db = client['portal_db']
    
    coll = db[collection]
    
    # Get total count
    total = await coll.count_documents({"status": "archived"})
    
    # Get documents
    cursor = coll.find({"status": "archived"}).sort("archived_at", -1).skip(skip).limit(limit)
    
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        documents.append({
            "id": doc.get("asset_id") or doc.get("warehouse_asset_id") or str(doc["_id"]),
            "type": doc.get("type", "unknown"),
            "archived_at": doc.get("archived_at"),
            "archived_by": doc.get("archived_by"),
            "archive_reason": doc.get("archive_reason"),
            "previous_status": doc.get("previous_status")
        })
    
    return {
        "success": True,
        "total": total,
        "documents": documents
    }


# ============ DATA INTEGRITY CHECK ============

@router.get("/integrity-check")
async def api_integrity_check(collection: str = Query(default="tsrid_assets")):
    """
    Führt eine Integritätsprüfung durch.
    Prüft auf:
    - Dokumente ohne Audit-Einträge
    - Unbestätigte Schreibvorgänge
    - Fehlende Pflichtfelder
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
    client = AsyncIOMotorClient(mongo_url)
    db = client['portal_db']
    
    issues = []
    
    # Check for documents without audit entries (created before audit system)
    coll = db[collection]
    audit_coll = db['audit_log']
    
    # Get all document IDs
    doc_ids = set()
    async for doc in coll.find({}, {"asset_id": 1, "warehouse_asset_id": 1}):
        doc_id = doc.get("asset_id") or doc.get("warehouse_asset_id")
        if doc_id:
            doc_ids.add(doc_id)
    
    # Get all audited document IDs
    audited_ids = set()
    async for entry in audit_coll.find({"collection": collection}, {"document_id": 1}):
        audited_ids.add(entry.get("document_id"))
    
    # Find documents without audit entries
    unaudited = doc_ids - audited_ids
    if unaudited:
        issues.append({
            "type": "unaudited_documents",
            "severity": "warning",
            "count": len(unaudited),
            "sample": list(unaudited)[:10],
            "message": f"{len(unaudited)} Dokumente ohne Audit-Einträge (vor Audit-System erstellt)"
        })
    
    # Check for unverified writes in the last 24h
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    unverified_count = await audit_coll.count_documents({
        "timestamp": {"$gte": yesterday},
        "verified": False,
        "action": {"$in": ["CREATE", "UPDATE"]}
    })
    
    if unverified_count > 0:
        issues.append({
            "type": "unverified_writes",
            "severity": "critical",
            "count": unverified_count,
            "message": f"{unverified_count} unbestätigte Schreibvorgänge in den letzten 24h"
        })
    
    # Check for write errors
    error_count = await audit_coll.count_documents({
        "timestamp": {"$gte": yesterday},
        "verification_error": {"$exists": True}
    })
    
    if error_count > 0:
        issues.append({
            "type": "write_errors",
            "severity": "critical",
            "count": error_count,
            "message": f"{error_count} fehlgeschlagene Schreibvorgänge in den letzten 24h"
        })
    
    return {
        "success": True,
        "collection": collection,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "total_documents": len(doc_ids),
        "issues": issues,
        "status": "healthy" if not issues else ("critical" if any(i["severity"] == "critical" for i in issues) else "warning")
    }


# ============ INITIALIZATION ============

@router.post("/init-indexes")
async def api_init_indexes():
    """
    Erstellt die notwendigen Datenbank-Indizes für das Audit-System.
    """
    await create_audit_indexes()
    return {"success": True, "message": "Audit indexes created"}


# ============ EXPORT ============

@router.get("/export")
async def api_export_audit_log(
    collection: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    format: str = Query(default="json", enum=["json", "csv"])
):
    """
    Exportiert das Audit-Log für einen Zeitraum.
    """
    start_dt = None
    end_dt = None
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            pass
    
    result = await get_audit_log(
        collection=collection,
        start_date=start_dt,
        end_date=end_dt,
        limit=10000  # Higher limit for export
    )
    
    if format == "csv":
        import csv
        import io
        
        output = io.StringIO()
        if result["entries"]:
            writer = csv.DictWriter(output, fieldnames=result["entries"][0].keys())
            writer.writeheader()
            for entry in result["entries"]:
                # Flatten nested dicts for CSV
                flat_entry = {}
                for k, v in entry.items():
                    if isinstance(v, dict):
                        flat_entry[k] = str(v)
                    else:
                        flat_entry[k] = v
                writer.writerow(flat_entry)
        
        return {
            "success": True,
            "format": "csv",
            "content": output.getvalue(),
            "entry_count": len(result["entries"])
        }
    
    return result
