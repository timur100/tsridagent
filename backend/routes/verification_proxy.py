from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import Response
import httpx
import os

router = APIRouter()

VERIFICATION_SERVICE_URL = "http://localhost:8104"

@router.api_route("/api/id-scans/{path:path}", methods=["GET", "POST", "PATCH", "DELETE", "PUT"])
async def proxy_id_scans(path: str, request: Request):
    """
    Proxy requests to verification service
    """
    try:
        # Forward request to verification service
        url = f"{VERIFICATION_SERVICE_URL}/api/id-scans/{path}"
        
        # Get headers
        headers = dict(request.headers)
        headers.pop('host', None)
        
        # Get body for POST/PUT/PATCH
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=dict(request.query_params)
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
    
    except Exception as e:
        print(f"Verification proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.api_route("/api/id-scans", methods=["GET", "POST"])
async def proxy_id_scans_root(request: Request):
    """
    Proxy root requests to verification service
    """
    try:
        url = f"{VERIFICATION_SERVICE_URL}/api/id-scans"
        
        headers = dict(request.headers)
        headers.pop('host', None)
        
        body = None
        if request.method == "POST":
            body = await request.body()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=dict(request.query_params)
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
    
    except Exception as e:
        print(f"Verification proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
