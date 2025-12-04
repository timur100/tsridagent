"""
Placetel Webhook Integration
Real-time call events via webhooks
"""
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional, List, Dict
import hmac
import hashlib
import os
from datetime import datetime
from collections import deque

router = APIRouter()

# In-memory store for recent call events (last 100)
call_events = deque(maxlen=100)

# SSE clients
sse_clients: List = []

PLACETEL_WEBHOOK_SECRET = os.environ.get("PLACETEL_WEBHOOK_SECRET", "")

def verify_placetel_signature(body: bytes, signature: str) -> bool:
    """Verify HMAC signature from Placetel webhook"""
    if not PLACETEL_WEBHOOK_SECRET:
        print("[Webhook] Warning: No webhook secret configured, skipping verification")
        return True  # Allow in dev mode
    
    computed = hmac.new(
        PLACETEL_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed, signature)

@router.post("/webhook")
async def placetel_webhook(
    request: Request,
    x_placetel_signature: Optional[str] = Header(None, alias="X-Placetel-Signature")
):
    """
    Receive webhook notifications from Placetel
    Events: incoming, outgoing, accepted, hangup
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        # Verify signature
        if x_placetel_signature:
            if not verify_placetel_signature(body, x_placetel_signature):
                print("[Webhook] Invalid signature")
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse form data
        form_data = await request.form()
        event_data = dict(form_data)
        
        # Add timestamp if not present
        if 'timestamp' not in event_data:
            event_data['timestamp'] = int(datetime.now().timestamp())
        
        # Add received time
        event_data['received_at'] = datetime.now().isoformat()
        
        print(f"[Webhook] Received {event_data.get('event')} event: {event_data.get('from')} → {event_data.get('to')}")
        
        # Store event
        call_events.append(event_data)
        
        # Notify SSE clients
        await notify_sse_clients(event_data)
        
        return {"success": True, "event": event_data.get('event')}
        
    except Exception as e:
        print(f"[Webhook] Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events")
async def get_recent_events():
    """Get recent call events from webhook store"""
    return {
        "success": True,
        "data": list(call_events),
        "count": len(call_events)
    }

async def notify_sse_clients(event_data: Dict):
    """Notify all connected SSE clients about new event"""
    disconnected = []
    for i, client in enumerate(sse_clients):
        try:
            await client.put(event_data)
        except:
            disconnected.append(i)
    
    # Remove disconnected clients
    for i in reversed(disconnected):
        sse_clients.pop(i)

@router.get("/stream")
async def event_stream(request: Request):
    """
    Server-Sent Events stream for real-time updates
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    from queue import Queue
    
    async def event_generator():
        # Create a queue for this client
        queue = asyncio.Queue()
        sse_clients.append(queue)
        
        try:
            # Send initial connection message
            yield f"data: {{'type': 'connected', 'message': 'Webhook stream active'}}\n\n"
            
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Wait for new event (with timeout)
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    import json
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
                    
        except Exception as e:
            print(f"[SSE] Client error: {e}")
        finally:
            # Remove client on disconnect
            if queue in sse_clients:
                sse_clients.remove(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
