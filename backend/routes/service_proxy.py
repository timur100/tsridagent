from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/services", tags=["service-proxy"])


@router.api_route("/{port:int}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_service(port: int, path: str, request: Request):
    """
    Proxy requests to internal microservices
    This allows external access to localhost services through the main backend
    
    Example: GET /api/services/8101/health -> GET http://localhost:8101/health
    """
    try:
        # Construct internal service URL
        target_url = f"http://localhost:{port}/{path}"
        
        # Get request body if present
        body = await request.body()
        
        # Forward the request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=dict(request.headers),
                content=body,
                params=dict(request.query_params)
            )
            
            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
            
    except httpx.ConnectError:
        logger.error(f"Cannot connect to service on port {port}")
        raise HTTPException(status_code=503, detail=f"Service on port {port} is not available")
    except Exception as e:
        logger.error(f"Error proxying to service on port {port}: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


@router.get("/{port:int}")
async def proxy_to_service_root(port: int, request: Request):
    """Proxy to service root"""
    return await proxy_to_service(port, "", request)
