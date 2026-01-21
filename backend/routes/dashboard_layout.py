from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any
from pydantic import BaseModel, ValidationError
from datetime import datetime
from routes.portal_auth import verify_token
import os
import json
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'verification_db')
db = get_mongo_client()[DB_NAME]

class LayoutItem(BaseModel):
    i: str  # Unique identifier for the grid item
    x: int  # X position in grid units
    y: int  # Y position in grid units
    w: int  # Width in grid units
    h: int  # Height in grid units

class DashboardLayout(BaseModel):
    layout: List[LayoutItem]

@router.get("/layout")
async def get_dashboard_layout(user: dict = Depends(verify_token)):
    """Get the global dashboard layout configuration"""
    
    print(f"[Dashboard Layout GET] User: {user.get('email')}")
    
    # Get global layout (not user-specific)
    layout_doc = db.dashboard_layouts.find_one(
        {"type": "global"},
        {"_id": 0}
    )
    
    print(f"[Dashboard Layout GET] Found layout doc: {layout_doc is not None}")
    
    if layout_doc:
        layout_items = layout_doc.get("layout", [])
        print(f"[Dashboard Layout GET] Layout items count: {len(layout_items)}")
        dummy_items = [item for item in layout_items if item.get('i', '').startswith('dummy-')]
        print(f"[Dashboard Layout GET] Dummy items count: {len(dummy_items)}")
        for dummy in dummy_items:
            print(f"[Dashboard Layout GET] Dummy item: {dummy.get('i')}")
        
        return {
            "success": True,
            "data": {
                "layout": layout_items
            }
        }
    
    # Return default layout if none exists
    print("[Dashboard Layout GET] No layout found, returning empty")
    return {
        "success": True,
        "data": {
            "layout": []  # Empty means use default positions
        }
    }

@router.post("/layout")
async def save_dashboard_layout(
    request: Request,
    user: dict = Depends(verify_token)
):
    """Save the global dashboard layout configuration"""
    
    try:
        # Get raw request body for debugging
        raw_body = await request.body()
        print(f"[Dashboard Layout] Raw request body: {raw_body.decode()}")
        
        # Parse JSON manually
        request_data = json.loads(raw_body.decode())
        print(f"[Dashboard Layout] Parsed JSON: {request_data}")
        
        # Validate the data
        layout_data = DashboardLayout(**request_data)
        print(f"[Dashboard Layout] Validated layout data: {layout_data}")
        print(f"[Dashboard Layout] Layout items count: {len(layout_data.layout)}")
        for i, item in enumerate(layout_data.layout):
            print(f"[Dashboard Layout] Item {i}: i='{item.i}', x={item.x}, y={item.y}, w={item.w}, h={item.h}")
        
    except ValidationError as e:
        print(f"[Dashboard Layout] Validation error: {e}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except Exception as e:
        print(f"[Dashboard Layout] General error: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing request: {str(e)}")
    
    # Only admins can save global layout
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify global layout")
    
    # Save or update global layout
    result = db.dashboard_layouts.update_one(
        {"type": "global"},
        {
            "$set": {
                "type": "global",
                "layout": [item.dict() for item in layout_data.layout],
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": user.get("email")
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Dashboard layout saved successfully"
    }

@router.post("/layout/reset")
async def reset_dashboard_layout(user: dict = Depends(verify_token)):
    """Reset dashboard layout to default"""
    
    # Only admins can reset global layout
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset global layout")
    
    # Delete the global layout to reset to default
    db.dashboard_layouts.delete_one({"type": "global"})
    
    return {
        "success": True,
        "message": "Dashboard layout reset to default"
    }
