from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tenants", tags=["tenants"])

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_tenants(path: str, request: Request):
    """
    Proxy all /api/tenants/* requests to Auth & Identity Service (port 8100)
    Provides access to tenant management APIs
    """
    try:
        target_url = f"http://localhost:8100/api/tenants/{path}"
        body = await request.body()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=dict(request.headers),
                content=body,
                params=dict(request.query_params)
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
    except httpx.ConnectError:
        logger.error(f"Cannot connect to Auth & Identity Service on port 8100")
        raise HTTPException(status_code=503, detail="Auth & Identity Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Auth & Identity Service tenants API: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")

@router.get("", include_in_schema=False)
async def proxy_to_tenants_root(request: Request):
    """Proxy to tenant stats endpoint"""
    return await proxy_to_tenants("", request)
