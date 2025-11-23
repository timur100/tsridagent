"""
API Key Authentication Middleware
Provides API key-based authentication for webhook endpoints
"""
from fastapi import Header, HTTPException, status
from typing import Optional
import os

# API Key from environment
WEBHOOK_API_KEY = os.environ.get('WEBHOOK_API_KEY', 'change-this-in-production-use-strong-key')


async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """
    Verify API key from X-API-Key header
    
    Args:
        x_api_key: API key from request header
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If API key is missing or invalid
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Include X-API-Key header"
        )
    
    if x_api_key != WEBHOOK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    
    return True
