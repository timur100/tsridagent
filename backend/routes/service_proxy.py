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


# Direct microservice proxies (for cleaner API paths)

@router.api_route("/inventory/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_to_inventory_service(path: str, request: Request):
    """
    Proxy all /api/services/inventory/* requests to Inventory Service (port 8102)
    This provides a cleaner API path than using port numbers
    """
    try:
        target_url = f"http://localhost:8102/api/inventory/{path}"
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
        logger.error(f"Cannot connect to Inventory Service on port 8102")
        raise HTTPException(status_code=503, detail="Inventory Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Inventory Service: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


@router.api_route("/tickets/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_to_ticketing_service(path: str, request: Request):
    """
    Proxy all /api/services/tickets/* requests to Ticketing Service (port 8103)
    This provides a cleaner API path than using port numbers
    """
    try:
        target_url = f"http://localhost:8103/api/tickets/{path}"
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
        logger.error(f"Cannot connect to Ticketing Service on port 8103")
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Ticketing Service: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
