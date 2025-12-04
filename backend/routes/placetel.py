"""
Placetel API Integration Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import httpx
import os
from datetime import datetime

from routes.portal_auth import verify_token

router = APIRouter()

PLACETEL_API_URL = "https://api.placetel.de/v2"
PLACETEL_API_KEY = "de1636b285181b054e5871e25aae99d9ac24c018c177d504010246e964a2b327d20a416f598ecf78525605cf19d281a8c12819c82ae1913935a4a90217aa33aa"

def get_placetel_headers():
    return {
        "Authorization": f"Bearer {PLACETEL_API_KEY}",
        "Content-Type": "application/json"
    }

# Numbers / Rufnummern
@router.get("/numbers")
async def get_numbers(
    load_all: bool = Query(False),
    token_data: dict = Depends(verify_token)
):
    """Get all Placetel numbers - if load_all=True, fetches all pages"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if load_all:
                # Fetch all pages
                all_numbers = []
                page = 1
                per_page = 100
                
                while True:
                    response = await client.get(
                        f"{PLACETEL_API_URL}/numbers",
                        headers=get_placetel_headers(),
                        params={"page": page, "per_page": per_page}
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    if not data:
                        break
                    
                    all_numbers.extend(data)
                    print(f"[Placetel] Loaded page {page}: {len(data)} numbers, total: {len(all_numbers)}")
                    
                    # Check if there are more pages via Link header
                    link_header = response.headers.get('link', '')
                    if 'rel="next"' not in link_header:
                        break
                    
                    page += 1
                    
                    # Safety limit
                    if page > 50:
                        break
                
                print(f"[Placetel] Total numbers loaded: {len(all_numbers)}")
                return {"success": True, "data": all_numbers, "total": len(all_numbers)}
            else:
                # Fetch first page only
                response = await client.get(
                    f"{PLACETEL_API_URL}/numbers",
                    headers=get_placetel_headers(),
                    params={"page": 1, "per_page": 100}
                )
                response.raise_for_status()
                data = response.json()
                return {"success": True, "data": data}
    except httpx.HTTPStatusError as e:
        print(f"[Placetel] HTTP Error fetching numbers: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        print(f"[Placetel] Error fetching numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/numbers/{number_id}/activate")
async def activate_number(
    number_id: str,
    token_data: dict = Depends(verify_token)
):
    """Activate a number"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PLACETEL_API_URL}/numbers/{number_id}/activate",
                headers=get_placetel_headers()
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[Placetel] Error activating number: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Calls / Anrufe
@router.get("/calls")
async def get_calls(
    date: Optional[str] = Query(None),
    filter_type: Optional[str] = Query(None, alias="filter[type]"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all calls"""
    try:
        params = {"page": page, "per_page": per_page}
        if date:
            params["filter[date]"] = date
        if filter_type:
            params["filter[type]"] = filter_type
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/calls",
                headers=get_placetel_headers(),
                params=params
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except httpx.HTTPStatusError as e:
        print(f"[Placetel] HTTP Error fetching calls: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        print(f"[Placetel] Error fetching calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls")
async def initiate_call(
    sipuid: str,
    target: str,
    from_name: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Initiate a call"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PLACETEL_API_URL}/calls",
                headers=get_placetel_headers(),
                json={"sipuid": sipuid, "target": target, "from_name": from_name}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[Placetel] Error initiating call: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Contacts / Kontakte
@router.get("/contacts")
async def get_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search_number: Optional[str] = Query(None, alias="search[number]"),
    token_data: dict = Depends(verify_token)
):
    """Get all contacts"""
    try:
        params = {"page": page, "per_page": per_page}
        if search_number:
            params["search[number]"] = search_number
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/contacts",
                headers=get_placetel_headers(),
                params=params
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except httpx.HTTPStatusError as e:
        print(f"[Placetel] HTTP Error fetching contacts: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        print(f"[Placetel] Error fetching contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/contacts")
async def create_contact(
    contact_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Create a contact"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PLACETEL_API_URL}/contacts",
                headers=get_placetel_headers(),
                json=contact_data
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[Placetel] Error creating contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/contacts/{contact_id}")
async def update_contact(
    contact_id: int,
    contact_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Update a contact"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{PLACETEL_API_URL}/contacts/{contact_id}",
                headers=get_placetel_headers(),
                json=contact_data
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[Placetel] Error updating contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    token_data: dict = Depends(verify_token)
):
    """Delete a contact"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{PLACETEL_API_URL}/contacts/{contact_id}",
                headers=get_placetel_headers()
            )
            response.raise_for_status()
            return {"success": True}
    except Exception as e:
        print(f"[Placetel] Error deleting contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Call Center
@router.get("/call_center_agents")
async def get_call_center_agents(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all call center agents"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/call_center_agents",
                headers=get_placetel_headers(),
                params={"page": page, "per_page": per_page}
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except Exception as e:
        print(f"[Placetel] Error fetching agents: {e}")
        return {"success": True, "data": []}

@router.get("/call_center_queues")
async def get_call_center_queues(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all call center queues"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/call_center_queues",
                headers=get_placetel_headers(),
                params={"page": page, "per_page": per_page}
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except Exception as e:
        print(f"[Placetel] Error fetching queues: {e}")
        return {"success": True, "data": []}

# Faxes
@router.get("/faxes")
async def get_faxes(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all faxes"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/faxes",
                headers=get_placetel_headers(),
                params={"page": page, "per_page": per_page}
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except Exception as e:
        print(f"[Placetel] Error fetching faxes: {e}")
        return {"success": True, "data": []}

# SIP Users
@router.get("/sip_users")
async def get_sip_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all SIP users"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/sip_users",
                headers=get_placetel_headers(),
                params={"page": page, "per_page": per_page}
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except Exception as e:
        print(f"[Placetel] Error fetching SIP users: {e}")
        return {"success": True, "data": []}

# Routing Plans
@router.get("/routing_plans")
async def get_routing_plans(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    token_data: dict = Depends(verify_token)
):
    """Get all routing plans"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{PLACETEL_API_URL}/routing_plans",
                headers=get_placetel_headers(),
                params={"page": page, "per_page": per_page}
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "data": data}
    except Exception as e:
        print(f"[Placetel] Error fetching routing plans: {e}")
        return {"success": True, "data": []}
