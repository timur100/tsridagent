from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ticketing-proxy"])

TICKETING_SERVICE_URL = "http://localhost:8103"

@router.api_route("/api/tickets/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/tickets/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/tickets", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_tickets(request: Request, path: str = ""):
    """
    Proxy all /api/tickets/* requests to Ticketing Service
    """
    try:
        logger.info(f"🎫 [Ticketing Proxy] {request.method} /api/tickets{path} - Forwarding to Ticketing Service")
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/tickets/"
        if clean_path:
            target_url += clean_path
        
        logger.info(f"🎯 [Ticketing Proxy] Target URL: {target_url}")
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
        logger.error("Cannot connect to Ticketing Service on port 8103")
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Ticketing Service: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")

@router.api_route("/api/sla/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/sla/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/sla", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_sla(request: Request, path: str = ""):
    """
    Proxy all /api/sla/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/sla/"
        if clean_path:
            target_url += clean_path
        
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
        logger.error("Cannot connect to Ticketing Service on port 8103")
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Ticketing Service: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")

@router.api_route("/api/staff/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/staff/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/staff", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_staff(request: Request, path: str = ""):
    """
    Proxy all /api/staff/* requests to Ticketing Service
    """
    try:
        # Remove trailing slash from path if present
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/staff/"
        if clean_path:
            target_url += clean_path
        
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
        logger.error("Cannot connect to Ticketing Service on port 8103")
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        logger.error(f"Error proxying to Ticketing Service: {e}")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


# Change Requests Proxy
@router.api_route("/api/change-requests/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/change-requests/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/change-requests", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_change_requests(request: Request, path: str = ""):
    """
    Proxy all /api/change-requests/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/change-requests/"
        if clean_path:
            target_url += clean_path
        
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
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


# Knowledge Base Proxy
@router.api_route("/api/knowledge-base/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/knowledge-base/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/knowledge-base", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_knowledge_base(request: Request, path: str = ""):
    """
    Proxy all /api/knowledge-base/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/knowledge-base/"
        if clean_path:
            target_url += clean_path
        
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
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


# Chat Messages Proxy
@router.api_route("/api/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/chat/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/chat", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_chat(request: Request, path: str = ""):
    """
    Proxy all /api/chat/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/chat/"
        if clean_path:
            target_url += clean_path
        
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
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


# Ticket Templates Proxy
@router.api_route("/api/templates/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/templates/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/templates", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_templates(request: Request, path: str = ""):
    """
    Proxy all /api/templates/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/templates/"
        if clean_path:
            target_url += clean_path
        
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
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


# Support Settings Proxy
@router.api_route("/api/support-settings/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/support-settings/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
@router.api_route("/api/support-settings", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy_support_settings(request: Request, path: str = ""):
    """
    Proxy all /api/support-settings/* requests to Ticketing Service
    """
    try:
        clean_path = path.rstrip('/') if path else ""
        target_url = f"{TICKETING_SERVICE_URL}/api/support-settings/"
        if clean_path:
            target_url += clean_path
        
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
        raise HTTPException(status_code=503, detail="Ticketing Service is not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
