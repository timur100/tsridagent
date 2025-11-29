from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import uuid4
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

class Camera(BaseModel):
    id: Optional[str] = None
    name: str
    location: str
    ip_address: str
    port: int = 554
    stream_url: str
    username: Optional[str] = None
    password: Optional[str] = None
    resolution: str = "1920x1080"
    fps: int = 30
    status: str = "offline"
    tenant_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    stream_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    status: Optional[str] = None

def get_current_user():
    return {"user_id": "admin", "tenant_id": "default"}

@router.get("/cameras")
async def get_cameras(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status
        
        cameras = await db.cameras.find(query, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "data": {
                "cameras": cameras,
                "total": len(cameras)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cameras")
async def create_camera(
    camera: Camera,
    current_user: dict = Depends(get_current_user)
):
    try:
        camera_dict = camera.dict()
        camera_dict["id"] = str(uuid4())
        camera_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        camera_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.cameras.insert_one(camera_dict)
        
        return {
            "success": True,
            "message": "Camera created successfully",
            "data": {"camera_id": camera_dict["id"]}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cameras/{camera_id}")
async def get_camera(
    camera_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        camera = await db.cameras.find_one({"id": camera_id}, {"_id": 0})
        
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        return {
            "success": True,
            "data": camera
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/cameras/{camera_id}")
async def update_camera(
    camera_id: str,
    camera_update: CameraUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        update_data = {k: v for k, v in camera_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.cameras.update_one(
            {"id": camera_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        updated_camera = await db.cameras.find_one({"id": camera_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Camera updated successfully",
            "data": updated_camera
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cameras/{camera_id}")
async def delete_camera(
    camera_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        result = await db.cameras.delete_one({"id": camera_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        return {
            "success": True,
            "message": "Camera deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cameras/stats/summary")
async def get_camera_stats(
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        total = await db.cameras.count_documents(query)
        online = await db.cameras.count_documents({**query, "status": "online"})
        offline = await db.cameras.count_documents({**query, "status": "offline"})
        
        return {
            "success": True,
            "data": {
                "total": total,
                "online": online,
                "offline": offline
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
