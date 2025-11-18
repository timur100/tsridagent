from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx
import os

router = APIRouter()

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8100')

@router.api_route("/api/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_users_service(path: str, request: Request):
    """
    Proxy all requests to the auth service users endpoint
    """
    try:
        # Get the request body
        body = await request.body()
        
        # Forward the request to the auth service
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=f"{AUTH_SERVICE_URL}/api/users/{path}",
                content=body,
                headers=dict(request.headers),
                params=dict(request.query_params),
                timeout=30.0
            )
            
            # Return the response from the auth service
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code,
                headers=dict(response.headers)
            )
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Users service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
