from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import os
from pymongo import MongoClient
from cryptography.fernet import Fernet
import base64
import hashlib
import requests

router = APIRouter(prefix="/api/portal/api-keys", tags=["api-keys"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

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
            if '_id' in key_doc:
                del key_doc['_id']
            
            # Decrypt and mask the key
            if 'encrypted_key' in key_doc:
                decrypted = decrypt_key(key_doc['encrypted_key'])
                key_doc['masked_key'] = mask_key(decrypted)
                del key_doc['encrypted_key']
            
            result.append(key_doc)
        
        return {
            "success": True,
            "data": {
                "api_keys": result
            }
        }
    
    except Exception as e:
        print(f"Error fetching API keys: {str(e)}")
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
            params = {
                "input": "Berlin",
                "key": api_key
            }
            
            response = requests.get(test_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK":
                    return {
                        "success": True,
                        "message": "Google Places API key is valid and working",
                        "data": {
                            "status": "valid",
                            "api_name": "Google Places API"
                        }
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Google Places API returned error: {data.get('status')}",
                        "data": {
                            "status": "invalid",
                            "error": data.get("error_message", "Unknown error")
                        }
                    }
            else:
                return {
                    "success": False,
                    "message": f"HTTP Error {response.status_code}",
                    "data": {
                        "status": "error",
                        "http_status": response.status_code
                    }
                }
        
        else:
            # Unknown API type
            return {
                "success": False,
                "message": f"Testing for {api_name} is not yet implemented",
                "data": {
                    "status": "not_implemented"
                }
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
