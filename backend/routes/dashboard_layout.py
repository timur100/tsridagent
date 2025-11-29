from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from auth import get_current_user
from database import get_database

router = APIRouter()

class LayoutItem(BaseModel):
    i: str  # Unique identifier for the grid item
    x: int  # X position in grid units
    y: int  # Y position in grid units
    w: int  # Width in grid units
    h: int  # Height in grid units

class DashboardLayout(BaseModel):
    layout: List[LayoutItem]

@router.get("/api/dashboard/layout")
async def get_dashboard_layout(current_user: dict = Depends(get_current_user)):
    """Get the global dashboard layout configuration"""
    db = await get_database()
    
    # Get global layout (not user-specific)
    layout_doc = await db.dashboard_layouts.find_one(
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

@router.post("/api/dashboard/layout")
async def save_dashboard_layout(
    layout_data: DashboardLayout,
    current_user: dict = Depends(get_current_user)
):
    """Save the global dashboard layout configuration"""
    
    # Only admins can save global layout
    if current_user.get("email") != "admin@tsrid.com" and current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can modify global layout")
    
    db = await get_database()
    
    # Save or update global layout
    result = await db.dashboard_layouts.update_one(
        {"type": "global"},
        {
            "$set": {
                "type": "global",
                "layout": [item.dict() for item in layout_data.layout],
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": current_user.get("email")
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Dashboard layout saved successfully"
    }

@router.post("/api/dashboard/layout/reset")
async def reset_dashboard_layout(current_user: dict = Depends(get_current_user)):
    """Reset dashboard layout to default"""
    
    # Only admins can reset global layout
    if current_user.get("email") != "admin@tsrid.com" and current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can reset global layout")
    
    db = await get_database()
    
    # Delete the global layout to reset to default
    await db.dashboard_layouts.delete_one({"type": "global"})
    
    return {
        "success": True,
        "message": "Dashboard layout reset to default"
    }
