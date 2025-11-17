from fastapi import HTTPException, Header
from typing import Optional
import jwt
import os

# JWT Secret (should match main backend)
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here-change-in-production')
JWT_ALGORITHM = 'HS256'

async def verify_token(authorization: Optional[str] = Header(None)):
    """
    Verify JWT token from Authorization header
    Optional auth - if no token provided, returns None
    """
    if not authorization:
        return None
    
    try:
        # Extract token from "Bearer <token>"
        if authorization.startswith('Bearer '):
            token = authorization.split(' ')[1]
        else:
            token = authorization
        
        # Decode token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
