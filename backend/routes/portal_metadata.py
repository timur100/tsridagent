from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/portal/metadata", tags=["portal-metadata"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
db = get_mongo_client()[DB_NAME]

class PortalMetadataUpdate(BaseModel):
    portal: str
    browserTitle: str
    metaDescription: str
    faviconUrl: Optional[str] = ''
    logoUrl: Optional[str] = ''
    primaryColor: Optional[str] = '#c00000'

class AllMetadataUpdate(BaseModel):
    metadata: Dict[str, Any]

# Default metadata values
DEFAULT_METADATA = {
    'verification': {
        'browserTitle': 'TSRID | Verifizierung',
        'metaDescription': 'ID Verifizierungs-System',
        'faviconUrl': '',
        'logoUrl': '',
        'primaryColor': '#c00000'
    },
    'admin': {
        'browserTitle': 'TSRID | Admin Portal',
        'metaDescription': 'Administrator Dashboard',
        'faviconUrl': '',
        'logoUrl': '',
        'primaryColor': '#c00000'
    },
    'customer': {
        'browserTitle': 'TSRID | Kundenportal',
        'metaDescription': 'Kunden Self-Service Portal',
        'faviconUrl': '',
        'logoUrl': '',
        'primaryColor': '#c00000'
    }
}

@router.get("/public")
async def get_public_portal_metadata():
    """
    Get all portal metadata - PUBLIC endpoint (no auth required)
    Used for setting browser tab titles, favicons, etc.
    """
    try:
        # Fetch from database
        stored_metadata = db.portal_metadata.find_one({'_id': 'metadata'})
        
        if stored_metadata:
            del stored_metadata['_id']
            # Merge with defaults to ensure all fields exist
            metadata = {**DEFAULT_METADATA}
            for portal_id, values in stored_metadata.items():
                if portal_id in metadata:
                    metadata[portal_id] = {**metadata[portal_id], **values}
        else:
            metadata = DEFAULT_METADATA
        
        return {
            'success': True,
            'data': {
                'metadata': metadata
            }
        }
    
    except Exception as e:
        print(f"Error fetching public portal metadata: {str(e)}")
        return {
            'success': True,
            'data': {
                'metadata': DEFAULT_METADATA
            }
        }

@router.get("")
async def get_portal_metadata(token_data: dict = Depends(verify_token)):
    """
    Get all portal metadata
    """
    try:
        # Fetch from database
        stored_metadata = db.portal_metadata.find_one({'_id': 'metadata'})
        
        if stored_metadata:
            del stored_metadata['_id']
            # Merge with defaults to ensure all fields exist
            metadata = {**DEFAULT_METADATA}
            for portal_id, values in stored_metadata.items():
                if portal_id in metadata:
                    metadata[portal_id] = {**metadata[portal_id], **values}
        else:
            metadata = DEFAULT_METADATA
        
        return {
            'success': True,
            'data': {
                'metadata': metadata
            }
        }
    
    except Exception as e:
        print(f"Error fetching portal metadata: {str(e)}")
        return {
            'success': True,
            'data': {
                'metadata': DEFAULT_METADATA
            }
        }

@router.put("")
async def update_portal_metadata(
    data: PortalMetadataUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update metadata for a specific portal
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        portal_id = data.portal
        if portal_id not in ['verification', 'admin', 'customer']:
            raise HTTPException(status_code=400, detail="Invalid portal ID")
        
        # Prepare update data
        update_data = {
            f"{portal_id}.browserTitle": data.browserTitle,
            f"{portal_id}.metaDescription": data.metaDescription,
            f"{portal_id}.faviconUrl": data.faviconUrl,
            f"{portal_id}.logoUrl": data.logoUrl,
            f"{portal_id}.primaryColor": data.primaryColor,
            f"{portal_id}.updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert the metadata document
        db.portal_metadata.update_one(
            {'_id': 'metadata'},
            {'$set': update_data},
            upsert=True
        )
        
        return {
            'success': True,
            'message': f'Metadaten für {portal_id} gespeichert'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating portal metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/all")
async def update_all_metadata(
    data: AllMetadataUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update metadata for all portals at once
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Prepare the complete metadata document
        metadata_doc = {'_id': 'metadata'}
        
        for portal_id, values in data.metadata.items():
            if portal_id in ['verification', 'admin', 'customer']:
                metadata_doc[portal_id] = {
                    **values,
                    'updatedAt': datetime.now(timezone.utc).isoformat()
                }
        
        # Replace the entire document
        db.portal_metadata.replace_one(
            {'_id': 'metadata'},
            metadata_doc,
            upsert=True
        )
        
        return {
            'success': True,
            'message': 'Alle Metadaten gespeichert'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating all portal metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
