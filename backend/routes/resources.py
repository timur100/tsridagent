from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import List, Optional
import dropbox
from dropbox.exceptions import ApiError
import os
from datetime import datetime

router = APIRouter()

# Get Dropbox access token from environment
DROPBOX_ACCESS_TOKEN = os.getenv('DROPBOX_ACCESS_TOKEN')

# Categories for file organization
CATEGORIES = {
    "anleitungen": "Anleitungen",
    "treiber": "Treiber",
    "tools": "Tools",
    "troubleshooting": "Troubleshooting"
}

class ResourceItem(BaseModel):
    name: str
    path: str
    url: str
    download_url: str
    size: Optional[int] = None
    modified: Optional[str] = None
    category: str

class CategoryContents(BaseModel):
    category: str
    display_name: str
    files: List[ResourceItem]
    count: int

def get_dropbox_client():
    """Get Dropbox client instance."""
    if not DROPBOX_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Dropbox access token not configured")
    return dropbox.Dropbox(DROPBOX_ACCESS_TOKEN)

@router.get("/verify-connection")
async def verify_dropbox_connection():
    """Verify Dropbox connection and credentials."""
    try:
        dbx = get_dropbox_client()
        account = dbx.users_get_current_account()
        return {
            "status": "connected",
            "user": account.name.display_name,
            "email": account.email
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Dropbox connection failed: {str(e)}")

@router.post("/init-categories")
async def initialize_categories():
    """Create category folders in Dropbox if they don't exist."""
    try:
        dbx = get_dropbox_client()
        created_folders = {}
        
        for category_id, category_name in CATEGORIES.items():
            folder_path = f"/{category_id}"
            try:
                dbx.files_create_folder_v2(folder_path)
                created_folders[category_id] = {
                    "path": folder_path,
                    "name": category_name,
                    "status": "created"
                }
            except ApiError as e:
                # Folder might already exist
                if e.error.is_path() and e.error.get_path().is_conflict():
                    created_folders[category_id] = {
                        "path": folder_path,
                        "name": category_name,
                        "status": "already_exists"
                    }
                else:
                    raise
        
        return {
            "success": True,
            "message": "Category folders initialized",
            "folders": created_folders
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/categories")
async def get_all_categories():
    """Get all category folders with their contents."""
    try:
        dbx = get_dropbox_client()
        categories_data = []
        
        for category_id, category_name in CATEGORIES.items():
            folder_path = f"/{category_id}"
            try:
                # List files in category folder
                result = dbx.files_list_folder(folder_path, recursive=False)
                files = []
                
                for entry in result.entries:
                    if isinstance(entry, dropbox.files.FileMetadata):
                        # Create shared link if it doesn't exist
                        try:
                            links = dbx.sharing_list_shared_links(path=entry.path_lower)
                            if links.links:
                                url = links.links[0].url
                            else:
                                link = dbx.sharing_create_shared_link_with_settings(entry.path_lower)
                                url = link.url
                            
                            download_url = url.replace('?dl=0', '?dl=1') if '?dl=0' in url else url + '?dl=1'
                            
                            files.append({
                                "name": entry.name,
                                "path": entry.path_lower,
                                "url": url,
                                "download_url": download_url,
                                "size": entry.size,
                                "modified": entry.server_modified.isoformat() if entry.server_modified else None,
                                "category": category_id
                            })
                        except Exception as link_error:
                            print(f"Error creating link for {entry.name}: {link_error}")
                
                categories_data.append({
                    "category": category_id,
                    "display_name": category_name,
                    "files": files,
                    "count": len(files)
                })
            
            except ApiError as e:
                # Category folder doesn't exist
                categories_data.append({
                    "category": category_id,
                    "display_name": category_name,
                    "files": [],
                    "count": 0
                })
        
        return {
            "success": True,
            "categories": categories_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/category/{category_id}")
async def get_category_contents(category_id: str):
    """Get contents of a specific category."""
    if category_id not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Category not found")
    
    try:
        dbx = get_dropbox_client()
        folder_path = f"/{category_id}"
        
        result = dbx.files_list_folder(folder_path, recursive=False)
        files = []
        
        for entry in result.entries:
            if isinstance(entry, dropbox.files.FileMetadata):
                # Get or create shared link
                try:
                    links = dbx.sharing_list_shared_links(path=entry.path_lower)
                    if links.links:
                        url = links.links[0].url
                    else:
                        link = dbx.sharing_create_shared_link_with_settings(entry.path_lower)
                        url = link.url
                    
                    download_url = url.replace('?dl=0', '?dl=1') if '?dl=0' in url else url + '?dl=1'
                    
                    files.append({
                        "name": entry.name,
                        "path": entry.path_lower,
                        "url": url,
                        "download_url": download_url,
                        "size": entry.size,
                        "modified": entry.server_modified.isoformat() if entry.server_modified else None,
                        "category": category_id
                    })
                except Exception:
                    pass
        
        return {
            "success": True,
            "category": category_id,
            "display_name": CATEGORIES[category_id],
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.options("/upload")
async def upload_options():
    """Handle OPTIONS request for upload endpoint."""
    return {"message": "OK"}

@router.post("/upload")
async def upload_resource(
    file: UploadFile = File(...),
    category: str = Form(None)
):
    """Upload a file to Dropbox in specified category."""
    if category and category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    try:
        dbx = get_dropbox_client()
        
        # Determine target path
        if category:
            target_path = f"/{category}/{file.filename}"
        else:
            target_path = f"/{file.filename}"
        
        # Read file content
        content = await file.read()
        
        # Upload to Dropbox
        metadata = dbx.files_upload(
            content,
            target_path,
            mode=dropbox.files.WriteMode.add,
            autorename=True
        )
        
        # Create shared link
        try:
            link = dbx.sharing_create_shared_link_with_settings(metadata.path_lower)
            url = link.url
        except ApiError:
            # Link might already exist
            links = dbx.sharing_list_shared_links(path=metadata.path_lower)
            url = links.links[0].url if links.links else None
        
        download_url = url.replace('?dl=0', '?dl=1') if url and '?dl=0' in url else (url + '?dl=1' if url else None)
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "file": {
                "name": metadata.name,
                "path": metadata.path_lower,
                "url": url,
                "download_url": download_url,
                "size": metadata.size,
                "modified": metadata.server_modified.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/file")
async def delete_resource(file_path: str):
    """Delete a file from Dropbox."""
    try:
        dbx = get_dropbox_client()
        dbx.files_delete_v2(file_path)
        
        return {
            "success": True,
            "message": "File deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
