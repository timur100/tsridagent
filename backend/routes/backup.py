from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import subprocess
import uuid
import shutil
import json
from routes.portal_auth import verify_token
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/backup", tags=["Backup"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

# Backup directory
BACKUP_DIR = "/app/backups"
os.makedirs(BACKUP_DIR, exist_ok=True)

class BackupConfig(BaseModel):
    auto_backup_enabled: bool = False
    backup_interval_hours: int = 6
    database_backup_enabled: bool = True
    full_backup_enabled: bool = False
    max_backups_to_keep: int = 10

class BackupRequest(BaseModel):
    backup_type: str  # "database", "full", "code"
    description: Optional[str] = ""

@router.get("/config")
async def get_backup_config(token_data: dict = Depends(verify_token)):
    """
    Get current backup configuration
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = db.backup_config.find_one({})
    if not config:
        # Return default config
        return BackupConfig().dict()
    
    if '_id' in config:
        del config['_id']
    
    return config

@router.post("/config")
async def update_backup_config(
    config: BackupConfig,
    token_data: dict = Depends(verify_token)
):
    """
    Update backup configuration
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db.backup_config.update_one(
        {},
        {"$set": config.dict()},
        upsert=True
    )
    
    return {"success": True, "message": "Backup-Konfiguration gespeichert"}

@router.get("/list")
async def list_backups(token_data: dict = Depends(verify_token)):
    """
    List all available backups
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backups = list(db.backups.find().sort("created_at", -1))
    
    for backup in backups:
        if '_id' in backup:
            del backup['_id']
        
        # Check if file still exists
        if backup.get('file_path'):
            backup['file_exists'] = os.path.exists(backup['file_path'])
        else:
            backup['file_exists'] = False
    
    return {
        "success": True,
        "backups": backups,
        "total": len(backups)
    }

@router.post("/create")
async def create_backup(
    request: BackupRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new backup
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    
    try:
        if request.backup_type == "database":
            # MongoDB Database Backup
            backup_name = f"db_backup_{timestamp}"
            backup_path = os.path.join(BACKUP_DIR, backup_name)
            
            # Use mongodump
            result = subprocess.run([
                'mongodump',
                '--uri', mongo_url,
                '--out', backup_path
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"mongodump failed: {result.stderr}")
            
            # Create tar archive
            archive_name = f"{backup_name}.tar.gz"
            archive_path = os.path.join(BACKUP_DIR, archive_name)
            
            subprocess.run([
                'tar', '-czf', archive_path, '-C', BACKUP_DIR, backup_name
            ], check=True)
            
            # Remove temporary directory
            shutil.rmtree(backup_path)
            
            file_size = os.path.getsize(archive_path)
            
        elif request.backup_type == "full":
            # Full Project Backup (Code + Database)
            backup_name = f"full_backup_{timestamp}"
            archive_name = f"{backup_name}.tar.gz"
            archive_path = os.path.join(BACKUP_DIR, archive_name)
            
            # Create tar archive of entire /app directory (excluding backups)
            subprocess.run([
                'tar', '-czf', archive_path,
                '--exclude', '/app/backups',
                '--exclude', '/app/node_modules',
                '--exclude', '/app/frontend/node_modules',
                '--exclude', '/app/frontend/build',
                '--exclude', '**/__pycache__',
                '--exclude', '**/*.pyc',
                '-C', '/', 'app'
            ], check=True)
            
            file_size = os.path.getsize(archive_path)
            
        else:
            raise HTTPException(status_code=400, detail="Invalid backup type")
        
        # Save backup metadata
        backup_doc = {
            "id": backup_id,
            "backup_type": request.backup_type,
            "description": request.description,
            "file_name": archive_name,
            "file_path": archive_path,
            "file_size": file_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("sub")
        }
        
        db.backups.insert_one(backup_doc)
        
        if '_id' in backup_doc:
            del backup_doc['_id']
        
        return {
            "success": True,
            "message": "Backup erfolgreich erstellt",
            "backup": backup_doc
        }
        
    except Exception as e:
        print(f"Backup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Backup fehlgeschlagen: {str(e)}")

@router.get("/download/{backup_id}")
async def download_backup(
    backup_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Download a backup file
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup = db.backups.find_one({"id": backup_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")
    
    file_path = backup.get('file_path')
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Backup-Datei nicht gefunden")
    
    return FileResponse(
        path=file_path,
        filename=backup.get('file_name'),
        media_type='application/gzip'
    )

@router.delete("/delete/{backup_id}")
async def delete_backup(
    backup_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a backup
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup = db.backups.find_one({"id": backup_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")
    
    # Delete file
    file_path = backup.get('file_path')
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    db.backups.delete_one({"id": backup_id})
    
    return {
        "success": True,
        "message": "Backup gelöscht"
    }

@router.post("/schedule/start")
async def start_scheduled_backups(token_data: dict = Depends(verify_token)):
    """
    Start scheduled backup service (placeholder for future implementation)
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "success": True,
        "message": "Automatische Backups werden in einer zukünftigen Version unterstützt"
    }

# ==================== Selective Backup & Data Management ====================

class SelectiveBackupRequest(BaseModel):
    collections: List[str]  # List of collection names to backup
    description: Optional[str] = "Selektives Backup"

class DataDeletionRequest(BaseModel):
    collections: List[str]  # List of collection names to delete
    confirm: bool = False  # Must be True to proceed

class RestoreRequest(BaseModel):
    backup_id: str
    collections: Optional[List[str]] = None  # If None, restore all

@router.post("/selective/create")
async def create_selective_backup(request: SelectiveBackupRequest, token_data: dict = Depends(verify_token)):
    """
    Create a selective backup of specific collections
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        backup_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        backup_path = os.path.join(BACKUP_DIR, f"selective_{backup_id}")
        os.makedirs(backup_path, exist_ok=True)
        
        # Available collections with descriptions
        collection_map = {
            "orders": "Bestellungen",
            "inventory": "Inventar",
            "tickets": "Tickets",
            "euroboxes": "Euroboxen",
            "components": "Komponenten",
            "component_templates": "Komponenten-Vorlagen",
            "component_sets": "Komponenten-Sets",
            "portal_users": "Portal-Benutzer",
            "customers": "Kunden",
            "flagged_scans": "Markierte Scans",
            "licenses": "Lizenzen"
        }
        
        backed_up_collections = []
        total_documents = 0
        
        for collection_name in request.collections:
            if collection_name not in collection_map:
                continue
                
            collection = db[collection_name]
            documents = list(collection.find({}))
            
            if documents:
                # Remove MongoDB _id for JSON serialization
                for doc in documents:
                    if '_id' in doc:
                        doc.pop('_id')
                
                # Save to file
                file_path = os.path.join(backup_path, f"{collection_name}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(documents, f, ensure_ascii=False, indent=2, default=str)
                
                backed_up_collections.append({
                    "name": collection_name,
                    "display_name": collection_map[collection_name],
                    "count": len(documents)
                })
                total_documents += len(documents)
        
        # Create metadata file
        metadata = {
            "backup_id": backup_id,
            "backup_type": "selective",
            "collections": backed_up_collections,
            "total_documents": total_documents,
            "description": request.description,
            "created_at": timestamp,
            "created_by": token_data.get("email")
        }
        
        metadata_path = os.path.join(backup_path, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        # Store backup info in database
        db.backups.insert_one({
            "backup_id": backup_id,
            "backup_type": "selective",
            "collections": backed_up_collections,
            "total_documents": total_documents,
            "description": request.description,
            "created_at": timestamp,
            "created_by": token_data.get("email"),
            "size_mb": sum(os.path.getsize(os.path.join(backup_path, f)) 
                          for f in os.listdir(backup_path)) / (1024 * 1024)
        })
        
        return {
            "success": True,
            "message": f"Selektives Backup erstellt ({total_documents} Dokumente)",
            "backup_id": backup_id,
            "collections": backed_up_collections,
            "total_documents": total_documents
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup-Fehler: {str(e)}")

@router.post("/selective/restore")
async def restore_selective_backup(request: RestoreRequest, token_data: dict = Depends(verify_token)):
    """
    Restore data from a selective backup
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Find backup
        backup_info = db.backups.find_one({"backup_id": request.backup_id})
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup nicht gefunden")
        
        backup_path = os.path.join(BACKUP_DIR, f"selective_{request.backup_id}")
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail="Backup-Dateien nicht gefunden")
        
        # Determine which collections to restore
        collections_to_restore = request.collections if request.collections else [
            col["name"] for col in backup_info.get("collections", [])
        ]
        
        restored_collections = []
        total_restored = 0
        
        for collection_name in collections_to_restore:
            file_path = os.path.join(backup_path, f"{collection_name}.json")
            if not os.path.exists(file_path):
                continue
            
            with open(file_path, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            
            if documents:
                collection = db[collection_name]
                
                # Clear existing data
                collection.delete_many({})
                
                # Insert restored data
                collection.insert_many(documents)
                
                restored_collections.append({
                    "name": collection_name,
                    "count": len(documents)
                })
                total_restored += len(documents)
        
        return {
            "success": True,
            "message": f"Backup wiederhergestellt ({total_restored} Dokumente)",
            "collections": restored_collections,
            "total_restored": total_restored
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wiederherstellungs-Fehler: {str(e)}")

@router.post("/data/delete")
async def delete_test_data(request: DataDeletionRequest, token_data: dict = Depends(verify_token)):
    """
    Delete test data from specific collections
    Admin only - requires confirmation
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not request.confirm:
        raise HTTPException(status_code=400, detail="Bestätigung erforderlich")
    
    try:
        deleted_collections = []
        total_deleted = 0
        
        # Protected collections that should not be deleted
        protected = ["portal_users", "backup_config", "backups", "branding"]
        
        for collection_name in request.collections:
            if collection_name in protected:
                continue
            
            collection = db[collection_name]
            count = collection.count_documents({})
            
            if count > 0:
                result = collection.delete_many({})
                deleted_collections.append({
                    "name": collection_name,
                    "deleted_count": result.deleted_count
                })
                total_deleted += result.deleted_count
        
        return {
            "success": True,
            "message": f"Testdaten gelöscht ({total_deleted} Dokumente)",
            "collections": deleted_collections,
            "total_deleted": total_deleted
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lösch-Fehler: {str(e)}")

@router.get("/collections/info")
async def get_collections_info(token_data: dict = Depends(verify_token)):
    """
    Get information about all collections (document counts)
    Admin only
    """
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        collections_info = {
            "test_data": [
                {"id": "orders", "name": "Bestellungen", "count": db.orders.count_documents({}), "deletable": True},
                {"id": "inventory", "name": "Inventar", "count": db.inventory.count_documents({}), "deletable": True},
                {"id": "tickets", "name": "Tickets", "count": db.tickets.count_documents({}), "deletable": True},
                {"id": "euroboxes", "name": "Euroboxen", "count": db.euroboxes.count_documents({}), "deletable": True},
                {"id": "components", "name": "Komponenten", "count": db.components.count_documents({}), "deletable": True},
                {"id": "component_templates", "name": "Komponenten-Vorlagen", "count": db.component_templates.count_documents({}), "deletable": True},
                {"id": "component_sets", "name": "Komponenten-Sets", "count": db.component_sets.count_documents({}), "deletable": True},
                {"id": "flagged_scans", "name": "Markierte Scans", "count": db.flagged_scans.count_documents({}), "deletable": True},
            ],
            "system_data": [
                {"id": "europcar_stations", "name": "Standorte", "count": db.europcar_stations.count_documents({}), "deletable": False},
                {"id": "europcar_devices", "name": "Geräte", "count": db.europcar_devices.count_documents({}), "deletable": False},
                {"id": "portal_devices", "name": "Portal Geräte", "count": db.portal_devices.count_documents({}), "deletable": False},
                {"id": "customers", "name": "Kunden", "count": db.customers.count_documents({}), "deletable": False},
                {"id": "portal_users", "name": "Portal-Benutzer", "count": db.portal_users.count_documents({}), "deletable": False},
            ],
            "sensitive_data": [
                {"id": "licenses", "name": "Lizenzen", "count": db.licenses.count_documents({}), "deletable": True},
            ]
        }
        
        return {
            "success": True,
            "collections": collections_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")

