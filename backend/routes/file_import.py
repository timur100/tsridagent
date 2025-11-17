"""
File Import Route für TeamViewer-IDs und andere Geräteinformationen
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import re
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(MONGO_URL)
db = client['tsrid_db']

def extract_device_id_from_filename(filename: str) -> str:
    """Extrahiert Device-ID aus Dateinamen (z.B. AAHC01-01.txt -> AAHC01-01)"""
    # Remove extension
    name_without_ext = filename.rsplit('.', 1)[0]
    return name_without_ext

def extract_tvid_from_content(content: str) -> str:
    """Extrahiert TeamViewer-ID aus Dateiinhalt"""
    # Suche nach Zahlenfolge (TeamViewer IDs sind typischerweise 9-10 Ziffern)
    matches = re.findall(r'\b\d{9,10}\b', content)
    if matches:
        return matches[0]
    return None

@router.post("/import-device-files")
async def import_device_files(files: List[UploadFile] = File(...)):
    """
    Importiert Geräteinformationen aus TXT-Dateien
    Aktualisiert nur fehlende Informationen
    """
    
    if len(files) > 200:
        raise HTTPException(status_code=400, detail="Maximal 200 Dateien erlaubt")
    
    results = {
        "total": len(files),
        "success": 0,
        "skipped": 0,
        "not_found": 0,
        "errors": 0,
        "details": []
    }
    
    try:
        for file in files:
            # Nur TXT-Dateien verarbeiten
            if not file.filename.endswith('.txt'):
                results["skipped"] += 1
                results["details"].append({
                    "file": file.filename,
                    "status": "skipped",
                    "reason": "Nicht .txt Datei"
                })
                continue
            
            try:
                # Device-ID aus Dateinamen extrahieren
                device_id = extract_device_id_from_filename(file.filename)
                
                # Dateiinhalt lesen
                content = await file.read()
                content_str = content.decode('utf-8', errors='ignore')
                
                # TVID extrahieren
                tvid = extract_tvid_from_content(content_str)
                
                if not tvid:
                    results["errors"] += 1
                    results["details"].append({
                        "file": file.filename,
                        "device_id": device_id,
                        "status": "error",
                        "reason": "Keine TVID gefunden"
                    })
                    continue
                
                # Gerät in DB suchen
                device = await db.europcar_devices.find_one({"device_id": device_id})
                
                if not device:
                    results["not_found"] += 1
                    results["details"].append({
                        "file": file.filename,
                        "device_id": device_id,
                        "status": "not_found",
                        "reason": "Gerät nicht in Datenbank"
                    })
                    continue
                
                # Prüfen ob TVID schon vorhanden ist
                if device.get('tvid') and device.get('tvid') != '':
                    results["skipped"] += 1
                    results["details"].append({
                        "file": file.filename,
                        "device_id": device_id,
                        "status": "skipped",
                        "reason": f"TVID bereits vorhanden: {device.get('tvid')}"
                    })
                    continue
                
                # Nur fehlende Informationen hinzufügen
                update_data = {}
                
                if not device.get('tvid') or device.get('tvid') == '':
                    update_data['tvid'] = tvid
                
                # Weitere Informationen können hier extrahiert werden
                # z.B. IP-Adresse, SW-Version, etc.
                
                if update_data:
                    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
                    
                    # Update durchführen
                    await db.europcar_devices.update_one(
                        {"device_id": device_id},
                        {"$set": update_data}
                    )
                    
                    results["success"] += 1
                    results["details"].append({
                        "file": file.filename,
                        "device_id": device_id,
                        "status": "success",
                        "tvid": tvid,
                        "updated_fields": list(update_data.keys())
                    })
                else:
                    results["skipped"] += 1
                    results["details"].append({
                        "file": file.filename,
                        "device_id": device_id,
                        "status": "skipped",
                        "reason": "Alle Informationen bereits vorhanden"
                    })
                    
            except Exception as e:
                results["errors"] += 1
                results["details"].append({
                    "file": file.filename,
                    "status": "error",
                    "reason": str(e)
                })
        
        return {
            "success": True,
            "message": f"Import abgeschlossen: {results['success']} erfolgreich, {results['skipped']} übersprungen, {results['not_found']} nicht gefunden, {results['errors']} Fehler",
            "data": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import-Fehler: {str(e)}")
