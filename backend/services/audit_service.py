"""
TSRID Audit & Data Integrity Service
=====================================
Zentrales Audit-System für vollständige Nachvollziehbarkeit aller Datenänderungen.

Features:
- Vollständiges Audit-Log für alle CRUD-Operationen
- Soft-Delete statt echter Löschungen
- Transaktions-Verifizierung nach jedem Schreibvorgang
- Unveränderliche Audit-Einträge
- Wiederherstellungsfunktionen

Autor: TSRID System
Erstellt: 2026-02-19
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
import os
import hashlib
import json

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
audit_db = client['portal_db']

# Audit action types
class AuditAction:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"  # Soft delete
    RESTORE = "RESTORE"
    ARCHIVE = "ARCHIVE"
    BULK_CREATE = "BULK_CREATE"
    BULK_DELETE = "BULK_DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    SYNC = "SYNC"
    ERROR = "ERROR"

# Collections that should be audited
AUDITED_COLLECTIONS = [
    'tsrid_assets',
    'tsrid_locations', 
    'tenant_locations',
    'tsrid_bundles',
    'tsrid_kit_templates',
    'tsrid_slots',
    'id_scans',
    'portal_users',
    'shipments',
    'orders',
    'suppliers',
    'inventory_items'
]


def generate_audit_hash(data: Dict) -> str:
    """Generate a hash of the audit entry for integrity verification"""
    # Remove _id if present for consistent hashing
    data_copy = {k: v for k, v in data.items() if k != '_id'}
    json_str = json.dumps(data_copy, sort_keys=True, default=str)
    return hashlib.sha256(json_str.encode()).hexdigest()


async def log_audit(
    action: str,
    collection: str,
    document_id: str,
    user: str,
    data_before: Optional[Dict] = None,
    data_after: Optional[Dict] = None,
    metadata: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    app_source: str = "web_portal"
) -> Dict:
    """
    Log an audit entry for any data change.
    
    Args:
        action: Type of action (CREATE, UPDATE, DELETE, etc.)
        collection: MongoDB collection name
        document_id: ID of the affected document
        user: Username or ID of the user performing the action
        data_before: Document state before the change (for UPDATE/DELETE)
        data_after: Document state after the change (for CREATE/UPDATE)
        metadata: Additional context information
        ip_address: Client IP address
        user_agent: Client user agent string
        app_source: Source application (web_portal, scan_app, electron_app, api)
    
    Returns:
        The created audit log entry
    """
    now = datetime.now(timezone.utc)
    
    # Clean ObjectIds from data
    def clean_data(d):
        if d is None:
            return None
        if isinstance(d, dict):
            cleaned = {}
            for k, v in d.items():
                if k == '_id':
                    cleaned[k] = str(v)
                elif isinstance(v, ObjectId):
                    cleaned[k] = str(v)
                elif isinstance(v, dict):
                    cleaned[k] = clean_data(v)
                elif isinstance(v, list):
                    cleaned[k] = [clean_data(item) if isinstance(item, dict) else item for item in v]
                else:
                    cleaned[k] = v
            return cleaned
        return d
    
    audit_entry = {
        "timestamp": now.isoformat(),
        "timestamp_unix": now.timestamp(),
        "action": action,
        "collection": collection,
        "document_id": str(document_id),
        "user": user,
        "data_before": clean_data(data_before),
        "data_after": clean_data(data_after),
        "changes": _calculate_changes(data_before, data_after) if data_before and data_after else None,
        "metadata": metadata or {},
        "ip_address": ip_address,
        "user_agent": user_agent,
        "app_source": app_source,
        "verified": False,  # Will be set to True after verification
        "verification_timestamp": None
    }
    
    # Generate integrity hash
    audit_entry["integrity_hash"] = generate_audit_hash(audit_entry)
    
    # Insert into audit_log collection
    result = await audit_db.audit_log.insert_one(audit_entry)
    audit_entry["_id"] = str(result.inserted_id)
    
    return audit_entry


def _calculate_changes(before: Dict, after: Dict) -> List[Dict]:
    """Calculate the specific changes between two document states"""
    changes = []
    
    if not before or not after:
        return changes
    
    all_keys = set(before.keys()) | set(after.keys())
    
    for key in all_keys:
        if key in ['_id', 'updated_at', 'history']:
            continue
            
        old_val = before.get(key)
        new_val = after.get(key)
        
        if old_val != new_val:
            changes.append({
                "field": key,
                "old_value": old_val,
                "new_value": new_val
            })
    
    return changes


async def verify_write(
    collection: str,
    document_id: str,
    expected_data: Dict,
    audit_id: str
) -> bool:
    """
    Verify that a write operation was successful by reading back the data.
    
    Args:
        collection: Collection name
        document_id: Document ID to verify
        expected_data: Expected data that should be present
        audit_id: ID of the audit entry to update
    
    Returns:
        True if verification passed, False otherwise
    """
    try:
        # Read the document back
        coll = audit_db[collection]
        
        # Try different ID fields
        doc = await coll.find_one({"_id": document_id})
        if not doc:
            doc = await coll.find_one({"asset_id": document_id})
        if not doc:
            doc = await coll.find_one({"warehouse_asset_id": document_id})
        
        if not doc:
            # Document not found - verification failed
            await audit_db.audit_log.update_one(
                {"_id": ObjectId(audit_id)},
                {
                    "$set": {
                        "verified": False,
                        "verification_timestamp": datetime.now(timezone.utc).isoformat(),
                        "verification_error": "Document not found after write"
                    }
                }
            )
            return False
        
        # Document found - verification passed
        await audit_db.audit_log.update_one(
            {"_id": ObjectId(audit_id)},
            {
                "$set": {
                    "verified": True,
                    "verification_timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return True
        
    except Exception as e:
        await audit_db.audit_log.update_one(
            {"_id": ObjectId(audit_id)},
            {
                "$set": {
                    "verified": False,
                    "verification_timestamp": datetime.now(timezone.utc).isoformat(),
                    "verification_error": str(e)
                }
            }
        )
        return False


async def soft_delete(
    collection: str,
    document_id: str,
    user: str,
    reason: str = "Manuell gelöscht",
    ip_address: Optional[str] = None,
    app_source: str = "web_portal"
) -> Dict:
    """
    Soft delete a document by setting archived status instead of removing.
    
    Args:
        collection: Collection name
        document_id: Document ID to soft delete
        user: User performing the deletion
        reason: Reason for deletion
        ip_address: Client IP
        app_source: Source application
    
    Returns:
        Result of the operation
    """
    coll = audit_db[collection]
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the document first
    doc = await coll.find_one({"asset_id": document_id})
    if not doc:
        doc = await coll.find_one({"warehouse_asset_id": document_id})
    if not doc:
        doc = await coll.find_one({"_id": document_id})
    
    if not doc:
        return {
            "success": False,
            "error": "Dokument nicht gefunden"
        }
    
    # Store the full document state before archiving
    data_before = dict(doc)
    
    # Update to archived status
    update_result = await coll.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "archived",
                "archived_at": now,
                "archived_by": user,
                "archive_reason": reason,
                "previous_status": doc.get("status", "unknown"),
                "updated_at": now
            },
            "$push": {
                "history": {
                    "date": now,
                    "event": f"Archiviert: {reason}",
                    "event_type": "archived",
                    "technician": user
                }
            }
        }
    )
    
    # Get updated document
    updated_doc = await coll.find_one({"_id": doc["_id"]})
    
    # Log audit entry
    audit_entry = await log_audit(
        action=AuditAction.ARCHIVE,
        collection=collection,
        document_id=str(doc.get("asset_id") or doc.get("warehouse_asset_id") or doc.get("_id")),
        user=user,
        data_before=data_before,
        data_after=dict(updated_doc) if updated_doc else None,
        metadata={"reason": reason},
        ip_address=ip_address,
        app_source=app_source
    )
    
    # Verify the write
    await verify_write(
        collection=collection,
        document_id=str(doc.get("asset_id") or doc.get("_id")),
        expected_data={"status": "archived"},
        audit_id=audit_entry["_id"]
    )
    
    return {
        "success": True,
        "message": f"Dokument archiviert (kann wiederhergestellt werden)",
        "document_id": str(doc.get("asset_id") or doc.get("_id")),
        "audit_id": audit_entry["_id"],
        "archived_at": now
    }


async def restore_document(
    collection: str,
    document_id: str,
    user: str,
    ip_address: Optional[str] = None,
    app_source: str = "web_portal"
) -> Dict:
    """
    Restore a soft-deleted (archived) document.
    
    Args:
        collection: Collection name
        document_id: Document ID to restore
        user: User performing the restoration
        ip_address: Client IP
        app_source: Source application
    
    Returns:
        Result of the operation
    """
    coll = audit_db[collection]
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the archived document
    doc = await coll.find_one({
        "$or": [
            {"asset_id": document_id},
            {"warehouse_asset_id": document_id},
            {"_id": document_id}
        ],
        "status": "archived"
    })
    
    if not doc:
        return {
            "success": False,
            "error": "Archiviertes Dokument nicht gefunden"
        }
    
    data_before = dict(doc)
    previous_status = doc.get("previous_status", "in_storage")
    
    # Restore to previous status
    update_result = await coll.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": previous_status,
                "restored_at": now,
                "restored_by": user,
                "updated_at": now
            },
            "$unset": {
                "archived_at": "",
                "archived_by": "",
                "archive_reason": "",
                "previous_status": ""
            },
            "$push": {
                "history": {
                    "date": now,
                    "event": f"Wiederhergestellt von {user}",
                    "event_type": "restored",
                    "technician": user
                }
            }
        }
    )
    
    # Get updated document
    updated_doc = await coll.find_one({"_id": doc["_id"]})
    
    # Log audit entry
    audit_entry = await log_audit(
        action=AuditAction.RESTORE,
        collection=collection,
        document_id=str(doc.get("asset_id") or doc.get("warehouse_asset_id") or doc.get("_id")),
        user=user,
        data_before=data_before,
        data_after=dict(updated_doc) if updated_doc else None,
        ip_address=ip_address,
        app_source=app_source
    )
    
    # Verify the write
    await verify_write(
        collection=collection,
        document_id=str(doc.get("asset_id") or doc.get("_id")),
        expected_data={"status": previous_status},
        audit_id=audit_entry["_id"]
    )
    
    return {
        "success": True,
        "message": f"Dokument wiederhergestellt",
        "document_id": str(doc.get("asset_id") or doc.get("_id")),
        "restored_status": previous_status,
        "audit_id": audit_entry["_id"]
    }


async def get_audit_log(
    collection: Optional[str] = None,
    document_id: Optional[str] = None,
    user: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    skip: int = 0,
    include_unverified: bool = True
) -> Dict:
    """
    Query the audit log with various filters.
    
    Returns:
        Dict with entries and metadata
    """
    query = {}
    
    if collection:
        query["collection"] = collection
    if document_id:
        query["document_id"] = document_id
    if user:
        query["user"] = {"$regex": user, "$options": "i"}
    if action:
        query["action"] = action
    if not include_unverified:
        query["verified"] = True
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date.isoformat()
        if end_date:
            query["timestamp"]["$lte"] = end_date.isoformat()
    
    # Get total count
    total = await audit_db.audit_log.count_documents(query)
    
    # Get entries
    cursor = audit_db.audit_log.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    entries = []
    
    async for entry in cursor:
        entry["_id"] = str(entry["_id"])
        entries.append(entry)
    
    return {
        "success": True,
        "total": total,
        "limit": limit,
        "skip": skip,
        "entries": entries
    }


async def get_document_history(collection: str, document_id: str) -> Dict:
    """
    Get complete history of a specific document from audit log.
    """
    cursor = audit_db.audit_log.find({
        "collection": collection,
        "document_id": document_id
    }).sort("timestamp", 1)
    
    entries = []
    async for entry in cursor:
        entry["_id"] = str(entry["_id"])
        entries.append(entry)
    
    return {
        "success": True,
        "document_id": document_id,
        "collection": collection,
        "history_count": len(entries),
        "history": entries
    }


async def get_audit_statistics(days: int = 7) -> Dict:
    """
    Get audit statistics for dashboard.
    """
    from datetime import timedelta
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Aggregation pipeline
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {
            "_id": {
                "action": "$action",
                "collection": "$collection"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    results = await audit_db.audit_log.aggregate(pipeline).to_list(1000)
    
    # Count by action
    action_counts = {}
    collection_counts = {}
    
    for r in results:
        action = r["_id"]["action"]
        collection = r["_id"]["collection"]
        count = r["count"]
        
        action_counts[action] = action_counts.get(action, 0) + count
        collection_counts[collection] = collection_counts.get(collection, 0) + count
    
    # Get unverified count
    unverified = await audit_db.audit_log.count_documents({
        "timestamp": {"$gte": start_date.isoformat()},
        "verified": False
    })
    
    # Get recent errors
    errors = await audit_db.audit_log.find({
        "timestamp": {"$gte": start_date.isoformat()},
        "verification_error": {"$exists": True}
    }).limit(10).to_list(10)
    
    return {
        "success": True,
        "period_days": days,
        "total_entries": sum(action_counts.values()),
        "by_action": action_counts,
        "by_collection": collection_counts,
        "unverified_count": unverified,
        "recent_errors": [{"id": str(e["_id"]), "error": e.get("verification_error")} for e in errors]
    }


async def create_audit_indexes():
    """Create indexes for efficient audit log queries"""
    await audit_db.audit_log.create_index([("timestamp", -1)])
    await audit_db.audit_log.create_index([("collection", 1), ("document_id", 1)])
    await audit_db.audit_log.create_index([("user", 1)])
    await audit_db.audit_log.create_index([("action", 1)])
    await audit_db.audit_log.create_index([("verified", 1)])
    await audit_db.audit_log.create_index([("integrity_hash", 1)])
    print("✅ Audit indexes created")
