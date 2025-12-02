"""
Ideas API Routes - Feature Requests and Improvement Suggestions
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.idea import Idea, IdeaCreate, IdeaUpdate
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/ideas", tags=["Ideas"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']


@router.get("/", response_model=List[Idea])
async def get_all_ideas(
    status: Optional[str] = None,
    menu_item: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all ideas, optionally filtered by status and/or menu_item
    """
    try:
        query = {}
        if status and status in ['neu', 'in_entwicklung', 'erledigt']:
            query['status'] = status
        if menu_item:
            query['menu_item'] = menu_item
        
        ideas = await db.ideas.find(query).sort('created_at', -1).to_list(length=None)
        
        # Convert _id to string and remove it
        for idea in ideas:
            if '_id' in idea:
                del idea['_id']
        
        return ideas
    except Exception as e:
        print(f"[Ideas API] Error fetching ideas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{idea_id}", response_model=Idea)
async def get_idea(
    idea_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a single idea by ID
    """
    try:
        idea = await db.ideas.find_one({'id': idea_id})
        
        if not idea:
            raise HTTPException(status_code=404, detail="Idee nicht gefunden")
        
        if '_id' in idea:
            del idea['_id']
        
        return idea
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Ideas API] Error fetching idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Idea)
async def create_idea(
    idea_data: IdeaCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new idea
    """
    try:
        # Get user info from token
        user_email = token_data.get('email', 'admin')
        
        # Create Idea object
        new_idea = Idea(
            title=idea_data.title,
            description=idea_data.description,
            menu_item=idea_data.menu_item,
            created_by=user_email
        )
        
        # Convert to dict for MongoDB
        idea_dict = new_idea.model_dump()
        
        # Insert into database
        result = await db.ideas.insert_one(idea_dict)
        
        print(f"[Ideas API] Created new idea: {new_idea.id} by {user_email}")
        
        return new_idea
    except Exception as e:
        print(f"[Ideas API] Error creating idea: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{idea_id}", response_model=Idea)
async def update_idea(
    idea_id: str,
    update_data: IdeaUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update an existing idea
    """
    try:
        # Find existing idea
        existing_idea = await db.ideas.find_one({'id': idea_id})
        
        if not existing_idea:
            raise HTTPException(status_code=404, detail="Idee nicht gefunden")
        
        # Prepare update data
        update_dict = {}
        if update_data.title is not None:
            update_dict['title'] = update_data.title
        if update_data.description is not None:
            update_dict['description'] = update_data.description
        if update_data.menu_item is not None:
            update_dict['menu_item'] = update_data.menu_item
        if update_data.status is not None:
            update_dict['status'] = update_data.status
        
        # Always update timestamp
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update in database
        await db.ideas.update_one(
            {'id': idea_id},
            {'$set': update_dict}
        )
        
        # Fetch updated idea
        updated_idea = await db.ideas.find_one({'id': idea_id})
        
        if '_id' in updated_idea:
            del updated_idea['_id']
        
        print(f"[Ideas API] Updated idea: {idea_id}")
        
        return updated_idea
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Ideas API] Error updating idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{idea_id}")
async def delete_idea(
    idea_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete an idea
    """
    try:
        result = await db.ideas.delete_one({'id': idea_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Idee nicht gefunden")
        
        print(f"[Ideas API] Deleted idea: {idea_id}")
        
        return {"success": True, "message": "Idee erfolgreich gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Ideas API] Error deleting idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_ideas_stats(
    token_data: dict = Depends(verify_token)
):
    """
    Get statistics about ideas
    """
    try:
        total = await db.ideas.count_documents({})
        neu = await db.ideas.count_documents({'status': 'neu'})
        in_entwicklung = await db.ideas.count_documents({'status': 'in_entwicklung'})
        erledigt = await db.ideas.count_documents({'status': 'erledigt'})
        
        return {
            "total": total,
            "neu": neu,
            "in_entwicklung": in_entwicklung,
            "erledigt": erledigt
        }
    except Exception as e:
        print(f"[Ideas API] Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/menu-items/list")
async def get_menu_items(
    token_data: dict = Depends(verify_token)
):
    """
    Get all unique menu items from existing ideas
    """
    try:
        # Get distinct menu items
        menu_items = await db.ideas.distinct('menu_item')
        
        # Sort alphabetically
        menu_items.sort()
        
        return {"menu_items": menu_items}
    except Exception as e:
        print(f"[Ideas API] Error fetching menu items: {e}")
        raise HTTPException(status_code=500, detail=str(e))
