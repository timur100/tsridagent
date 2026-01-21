from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from routes.portal_auth import verify_token
from db.connection import get_mongo_client
import os
from cryptography.fernet import Fernet
import base64
import hashlib
import requests

router = APIRouter(prefix="/api/portal/api-keys", tags=["api-keys"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

def get_db():
    return get_mongo_client()[DB_NAME]

# Encryption setup
# Generate a key from a secret (in production, use environment variable)
SECRET_KEY = os.environ.get('API_KEY_SECRET', 'default-secret-key-change-in-production')
# Create Fernet key from secret
key = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest())
cipher = Fernet(key)

class APIKeyCreate(BaseModel):
    api_name: str
    api_key: str
    description: Optional[str] = None

class APIKeyUpdate(BaseModel):
    api_key: str
    description: Optional[str] = None

class APIKeyTest(BaseModel):
    api_name: str
    api_key: str

def encrypt_key(key_value: str) -> str:
    """Encrypt an API key"""
    return cipher.encrypt(key_value.encode()).decode()

def decrypt_key(encrypted_key: str) -> str:
    """Decrypt an API key"""
    return cipher.decrypt(encrypted_key.encode()).decode()

def mask_key(key_value: str) -> str:
    """Mask an API key for display"""
    if len(key_value) <= 8:
        return '•' * len(key_value)
    return key_value[:4] + '•' * (len(key_value) - 8) + key_value[-4:]

@router.get("")
async def get_api_keys(token_data: dict = Depends(verify_token)):
    """
    Get all API keys (masked)
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch all API keys
        api_keys = list(db.api_keys.find())
        
        # Mask the keys and remove _id
        result = []
        for key_doc in api_keys:
            doc = dict(key_doc)  # Make a copy
            if '_id' in doc:
                del doc['_id']
            
            # Handle both 'encrypted_key' and 'api_key' fields
            encrypted_value = doc.get('encrypted_key') or doc.get('api_key')
            
            if encrypted_value:
                try:
                    # Try to decrypt (if it's encrypted)
                    if encrypted_value.startswith('gAAAAAB'):
                        decrypted = decrypt_key(encrypted_value)
                        doc['masked_key'] = mask_key(decrypted)
                    else:
                        # Not encrypted, just mask it
                        doc['masked_key'] = mask_key(encrypted_value)
                except Exception as decrypt_error:
                    print(f"Error decrypting key {doc.get('api_name')}: {decrypt_error}")
                    doc['masked_key'] = '***'
                
                # Remove the encrypted/raw key from response
                if 'encrypted_key' in doc:
                    del doc['encrypted_key']
                if 'api_key' in doc:
                    del doc['api_key']
            else:
                doc['masked_key'] = '***'
            
            result.append(doc)
        
        print(f"[API Keys] Returning {len(result)} keys: {[k.get('api_name') for k in result]}")
        
        return {
            "success": True,
            "data": {
                "api_keys": result
            }
        }
    
    except Exception as e:
        print(f"Error fetching API keys: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{api_name}/reveal")
async def reveal_api_key(
    api_name: str,
    token_data: dict = Depends(verify_token)
):
    """
    Reveal the full decrypted API key
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find the API key
        key_doc = db.api_keys.find_one({"api_name": api_name})
        if not key_doc:
            raise HTTPException(status_code=404, detail=f"API key for {api_name} not found")
        
        # Get the encrypted value
        encrypted_value = key_doc.get('encrypted_key') or key_doc.get('api_key')
        
        if not encrypted_value:
            raise HTTPException(status_code=404, detail="No key value found")
        
        # Decrypt if necessary
        if encrypted_value.startswith('gAAAAAB'):
            full_key = decrypt_key(encrypted_value)
        else:
            full_key = encrypted_value
        
        return {
            "success": True,
            "data": {
                "api_name": api_name,
                "api_key": full_key
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error revealing API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_api_key(
    key_data: APIKeyCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new API key
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if API key with this name already exists
        existing = db.api_keys.find_one({"api_name": key_data.api_name})
        if existing:
            raise HTTPException(status_code=400, detail=f"API key for {key_data.api_name} already exists")
        
        # Encrypt the API key
        encrypted_key = encrypt_key(key_data.api_key)
        
        # Create document
        key_doc = {
            "api_name": key_data.api_name,
            "encrypted_key": encrypted_key,
            "description": key_data.description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": token_data.get("sub")
        }
        
        # Insert into database
        db.api_keys.insert_one(key_doc)
        
        # Return masked key
        if '_id' in key_doc:
            del key_doc['_id']
        key_doc['masked_key'] = mask_key(key_data.api_key)
        del key_doc['encrypted_key']
        
        return {
            "success": True,
            "message": f"API key for {key_data.api_name} created successfully",
            "data": key_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{api_name}")
async def update_api_key(
    api_name: str,
    key_data: APIKeyUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update an existing API key
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if API key exists
        existing = db.api_keys.find_one({"api_name": api_name})
        if not existing:
            raise HTTPException(status_code=404, detail=f"API key for {api_name} not found")
        
        # Encrypt the new API key
        encrypted_key = encrypt_key(key_data.api_key)
        
        # Update document
        update_data = {
            "encrypted_key": encrypted_key,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if key_data.description is not None:
            update_data["description"] = key_data.description
        
        # Update in database
        db.api_keys.update_one(
            {"api_name": api_name},
            {"$set": update_data}
        )
        
        # Return masked key
        result = db.api_keys.find_one({"api_name": api_name})
        if '_id' in result:
            del result['_id']
        result['masked_key'] = mask_key(key_data.api_key)
        del result['encrypted_key']
        
        return {
            "success": True,
            "message": f"API key for {api_name} updated successfully",
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{api_name}")
async def delete_api_key(
    api_name: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete an API key
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if API key exists
        existing = db.api_keys.find_one({"api_name": api_name})
        if not existing:
            raise HTTPException(status_code=404, detail=f"API key for {api_name} not found")
        
        # Delete from database
        db.api_keys.delete_one({"api_name": api_name})
        
        return {
            "success": True,
            "message": f"API key for {api_name} deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_api_key(
    test_data: APIKeyTest,
    token_data: dict = Depends(verify_token)
):
    """
    Test an API key
    Only accessible by admins
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        api_name = test_data.api_name.lower()
        api_key = test_data.api_key
        
        # Test based on API type
        if api_name == "google_places":
            # Test Google Places API
            test_url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
            params = {"input": "Berlin", "key": api_key}
            response = requests.get(test_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK":
                    return {"success": True, "message": "Google Places API key is valid", "data": {"status": "valid"}}
                else:
                    return {"success": False, "message": f"Error: {data.get('status')}", "data": {"status": "invalid"}}
            return {"success": False, "message": f"HTTP {response.status_code}", "data": {"status": "error"}}
        
        elif api_name == "hetzner_api":
            # Test Hetzner Cloud API
            headers = {"Authorization": f"Bearer {api_key}"}
            response = requests.get("https://api.hetzner.cloud/v1/servers", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                server_count = len(data.get("servers", []))
                return {"success": True, "message": f"Hetzner API valid - {server_count} Server gefunden", "data": {"status": "valid", "servers": server_count}}
            elif response.status_code == 401:
                return {"success": False, "message": "Ungültiger Hetzner API Token", "data": {"status": "invalid"}}
            return {"success": False, "message": f"HTTP {response.status_code}", "data": {"status": "error"}}
        
        elif api_name == "hetzner_dns":
            # Test Hetzner DNS API
            headers = {"Auth-API-Token": api_key}
            response = requests.get("https://dns.hetzner.com/api/v1/zones", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                zone_count = len(data.get("zones", []))
                return {"success": True, "message": f"Hetzner DNS valid - {zone_count} Zonen gefunden", "data": {"status": "valid", "zones": zone_count}}
            elif response.status_code == 401:
                return {"success": False, "message": "Ungültiger Hetzner DNS Token", "data": {"status": "invalid"}}
            return {"success": False, "message": f"HTTP {response.status_code}", "data": {"status": "error"}}
        
        elif api_name == "github_pat":
            # Test GitHub Personal Access Token
            headers = {"Authorization": f"token {api_key}", "Accept": "application/vnd.github.v3+json"}
            response = requests.get("https://api.github.com/user", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "message": f"GitHub Token valid - User: {data.get('login')}", "data": {"status": "valid", "user": data.get("login")}}
            elif response.status_code == 401:
                return {"success": False, "message": "Ungültiger GitHub Token", "data": {"status": "invalid"}}
            return {"success": False, "message": f"HTTP {response.status_code}", "data": {"status": "error"}}
        
        elif api_name == "mongodb_atlas":
            # Test MongoDB Atlas Connection
            try:
                from db.connection import get_mongo_client
                client = MongoClient(api_key, serverSelectionTimeoutMS=5000)
                client.admin.command('ping')
                db_names = client.list_database_names()
                return {"success": True, "message": f"MongoDB Atlas verbunden - {len(db_names)} Datenbanken", "data": {"status": "valid", "databases": len(db_names)}}
            except Exception as e:
                return {"success": False, "message": f"MongoDB Verbindung fehlgeschlagen: {str(e)}", "data": {"status": "invalid"}}
        
        elif api_name == "teamviewer":
            # Test TeamViewer API
            headers = {"Authorization": f"Bearer {api_key}"}
            response = requests.get("https://webapi.teamviewer.com/api/v1/ping", headers=headers, timeout=10)
            
            if response.status_code == 200:
                return {"success": True, "message": "TeamViewer API Token valid", "data": {"status": "valid"}}
            elif response.status_code == 401:
                return {"success": False, "message": "Ungültiger TeamViewer Token", "data": {"status": "invalid"}}
            return {"success": False, "message": f"HTTP {response.status_code}", "data": {"status": "error"}}
        
        else:
            # Unknown API type
            return {
                "success": False,
                "message": f"Testing für {api_name} ist noch nicht implementiert",
                "data": {"status": "not_implemented"}
            }
    
    except requests.RequestException as e:
        return {
            "success": False,
            "message": f"Network error: {str(e)}",
            "data": {
                "status": "network_error"
            }
        }
    except Exception as e:
        print(f"Error testing API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/retrieve/{api_name}")
async def retrieve_api_key(
    api_name: str,
    token_data: dict = Depends(verify_token)
):
    """
    Retrieve and decrypt a specific API key
    Only accessible by admins
    Used internally by backend services
    """
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch API key
        key_doc = db.api_keys.find_one({"api_name": api_name})
        
        if not key_doc:
            raise HTTPException(status_code=404, detail=f"API key for {api_name} not found")
        
        # Decrypt the key
        decrypted_key = decrypt_key(key_doc['encrypted_key'])
        
        return {
            "success": True,
            "data": {
                "api_name": api_name,
                "api_key": decrypted_key
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
