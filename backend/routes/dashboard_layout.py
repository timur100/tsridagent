from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any
from pydantic import BaseModel, ValidationError
from datetime import datetime
from routes.portal_auth import verify_token
import os
import json
from pymongo import MongoClient

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

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
    
    # Get global layout (not user-specific)
    layout_doc = db.dashboard_layouts.find_one(
        {"type": "global"},
        {"_id": 0}
    )
    
    if layout_doc:
        return {
            "success": True,
            "data": {
                "layout": layout_doc.get("layout", [])
            }
        }
    
    # Return default layout if none exists
    return {
        "success": True,
        "data": {
            "layout": []  # Empty means use default positions
        }
    }

@router.post("/layout")
async def save_dashboard_layout(
    layout_data: DashboardLayout,
    user: dict = Depends(verify_token)
):
    """Save the global dashboard layout configuration"""
    
    # Debug logging
    print(f"[Dashboard Layout] Received layout data: {layout_data}")
    print(f"[Dashboard Layout] Layout items count: {len(layout_data.layout)}")
    for i, item in enumerate(layout_data.layout):
        print(f"[Dashboard Layout] Item {i}: i='{item.i}', x={item.x}, y={item.y}, w={item.w}, h={item.h}")
    
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
