"""
Backend API für Batch-Upload von Gerätedateien
Verarbeitet mehrere TXT-Dateien und extrahiert TeamViewer IDs
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import re
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

from routes.portal_auth import verify_token

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/api/portal/device-files", tags=["Device File Upload"])

# MongoDB connection - defer initialization
mongo_url = os.environ.get('MONGO_URL')


def get_db():
    """Get database connection"""
    if not mongo_url:
        raise HTTPException(status_code=500, detail="Database configuration error")
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.environ.get('DB_NAME', 'test_database')
    return client[db_name]


def extract_tvid_from_content(content: str) -> Optional[str]:
    """
    Extrahiert TeamViewer-ID aus Dateiinhalt
    TeamViewer IDs sind typischerweise 9-10 Ziffern
    """
    matches = re.findall(r'\b\d{9,10}\b', content)
    if matches:
        return matches[0]
    return None


def extract_device_id_from_filename(filename: str) -> str:
    """
    Extrahiert Device-ID aus Dateinamen
    Beispiel: AAHC01-01.txt -> AAHC01-01
    """
    # Entferne die Dateiendung
    return filename.rsplit('.', 1)[0] if '.' in filename else filename


@router.post("/batch-upload")
async def batch_upload_device_files(
    files: List[UploadFile] = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Batch-Upload von Gerätedateien mit TeamViewer IDs
    - Akzeptiert bis zu 200 TXT-Dateien
    - Extrahiert TeamViewer IDs aus den Dateien
    - Updated nur leere Felder (überschreibt nicht existierende Daten)
    """
    
    # Check role - only admins can upload device files
    if token_data.get('role') != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Nur Administratoren können Gerätedateien hochladen"
        )
    
    # Validate file count
    if len(files) > 200:
        raise HTTPException(
            status_code=400,
            detail=f"Zu viele Dateien. Maximum: 200, erhalten: {len(files)}"
        )
    
    db = get_db()
    
    results = {
        'total': len(files),
        'success': 0,
        'skipped': 0,
        'not_found': 0,
        'error': 0,
        'details': []
    }
    
    for file in files:
        try:
            # Validate file extension
            if not file.filename.endswith('.txt'):
                results['error'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': None,
                    'status': 'error',
                    'message': 'Nur .txt Dateien erlaubt'
                })
                continue
            
            # Extract device ID from filename
            device_id = extract_device_id_from_filename(file.filename)
            
            # Read file content
            content = await file.read()
            content_str = content.decode('utf-8', errors='ignore')
            
            # Extract TeamViewer ID
            tvid = extract_tvid_from_content(content_str)
            
            if not tvid:
                results['error'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': device_id,
                    'status': 'error',
                    'message': 'Keine TeamViewer-ID gefunden'
                })
                continue
            
            # Check if device exists in database
            device = await db.europcar_devices.find_one(
                {"device_id": device_id},
                {"device_id": 1, "tvid": 1}
            )
            
            if not device:
                results['not_found'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': device_id,
                    'status': 'not_found',
                    'message': 'Gerät nicht in Datenbank gefunden'
                })
                continue
            
            # Check if tvid already exists (skip if it does)
            if device.get('tvid') and device.get('tvid').strip():
                results['skipped'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': device_id,
                    'status': 'skipped',
                    'message': f'TVID bereits vorhanden: {device.get("tvid")}',
                    'existing_tvid': device.get('tvid')
                })
                continue
            
            # Update device with new TVID
            update_result = await db.europcar_devices.update_one(
                {"device_id": device_id},
                {
                    "$set": {
                        "tvid": tvid,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "updated_by": token_data.get('sub')
                    }
                }
            )
            
            if update_result.modified_count > 0:
                results['success'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': device_id,
                    'status': 'success',
                    'message': f'TVID {tvid} erfolgreich hinzugefügt',
                    'new_tvid': tvid
                })
            else:
                results['error'] += 1
                results['details'].append({
                    'filename': file.filename,
                    'device_id': device_id,
                    'status': 'error',
                    'message': 'Datenbankupdate fehlgeschlagen'
                })
                
        except Exception as e:
            results['error'] += 1
            results['details'].append({
                'filename': file.filename,
                'device_id': device_id if 'device_id' in locals() else None,
                'status': 'error',
                'message': f'Fehler: {str(e)}'
            })
    
    return {
        'success': True,
        'message': f'{results["success"]} von {results["total"]} Dateien erfolgreich verarbeitet',
        'results': results
    }


@router.get("/upload-stats")
async def get_upload_stats(token_data: dict = Depends(verify_token)):
    """
    Statistiken über Geräte mit/ohne TeamViewer IDs
    """
    
    # Check role - only admins can access upload stats
    if token_data.get('role') != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Nur Administratoren können Upload-Statistiken einsehen"
        )
    
    try:
        db = get_db()
        
        # Count devices with TVID
        devices_with_tvid = await db.europcar_devices.count_documents({
            "$and": [
                {"tvid": {"$exists": True}},
                {"tvid": {"$ne": None}},
                {"tvid": {"$ne": ""}}
            ]
        })
        
        # Count devices without TVID
        devices_without_tvid = await db.europcar_devices.count_documents({
            "$or": [
                {"tvid": {"$exists": False}},
                {"tvid": None},
                {"tvid": ""}
            ]
        })
        
        # Total devices
        total_devices = await db.europcar_devices.count_documents({})
        
        return {
            'success': True,
            'stats': {
                'total': total_devices,
                'with_tvid': devices_with_tvid,
                'without_tvid': devices_without_tvid,
                'coverage_percentage': round((devices_with_tvid / total_devices * 100), 2) if total_devices > 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
