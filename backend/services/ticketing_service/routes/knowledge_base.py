from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from models.knowledge_base import (
    KnowledgeBaseArticleCreate,
    KnowledgeBaseArticleUpdate,
    KnowledgeBaseArticleResponse,
    ArticleStatus,
    ArticleCategory
)
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])


@router.post("/articles", response_model=dict)
@router.post("/articles/", response_model=dict, include_in_schema=False)
async def create_article(
    article: KnowledgeBaseArticleCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new knowledge base article (admin only)
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can create articles")
        
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        # Get user name
        main_db = db.client['auth_db']
        user = await main_db.users.find_one({"email": user_email})
        user_name = user.get("name", user_email) if user else user_email
        
        # Create article document
        article_id = str(uuid.uuid4())
        article_doc = {
            "id": article_id,
            "title": article.title,
            "content": article.content,
            "category": article.category,
            "status": ArticleStatus.draft,
            "tags": article.tags,
            "video_url": article.video_url,
            "attachments": article.attachments,
            "is_public": article.is_public,
            "order_index": article.order_index,
            "version": 1,
            "views_count": 0,
            "helpful_count": 0,
            "created_by": user_email,
            "created_by_name": user_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "last_updated_by": None
        }
        
        await kb_collection.insert_one(article_doc)
        
        if '_id' in article_doc:
            del article_doc['_id']
        
        return {
            "success": True,
            "message": "Artikel erfolgreich erstellt",
            "article": article_doc
        }
    
    except Exception as e:
        print(f"Error creating article: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/articles", response_model=dict)
@router.get("/articles/", response_model=dict, include_in_schema=False)
async def get_articles(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all knowledge base articles
    """
    try:
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        user_role = token_data.get("role")
        
        # Build query
        query = {}
        
        # Non-admin users can only see published public articles
        if user_role != 'admin':
            query["status"] = ArticleStatus.published
            query["is_public"] = True
        else:
            if status:
                query["status"] = status
        
        if category:
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}}
            ]
        
        # Get articles
        articles = []
        async for article in kb_collection.find(query).sort([("order_index", 1), ("created_at", -1)]):
            if '_id' in article:
                del article['_id']
            articles.append(article)
        
        return {
            "success": True,
            "count": len(articles),
            "articles": articles
        }
    
    except Exception as e:
        print(f"Error getting articles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/articles/{article_id}", response_model=dict)
async def get_article(
    article_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific article by ID
    """
    try:
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        article = await kb_collection.find_one({"id": article_id})
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Increment view count
        await kb_collection.update_one(
            {"id": article_id},
            {"$inc": {"views_count": 1}}
        )
        
        if '_id' in article:
            del article['_id']
        
        return {
            "success": True,
            "article": article
        }
    
    except Exception as e:
        print(f"Error getting article: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/articles/{article_id}", response_model=dict)
async def update_article(
    article_id: str,
    update_data: KnowledgeBaseArticleUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update an article (admin only)
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update articles")
        
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        # Get current article to increment version
        current_article = await kb_collection.find_one({"id": article_id})
        if not current_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Build update document
        update_doc = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_updated_by": user_email,
            "version": current_article.get("version", 1) + 1
        }
        
        if update_data.title:
            update_doc["title"] = update_data.title
        if update_data.content:
            update_doc["content"] = update_data.content
        if update_data.category:
            update_doc["category"] = update_data.category
        if update_data.status:
            update_doc["status"] = update_data.status
        if update_data.tags is not None:
            update_doc["tags"] = update_data.tags
        if update_data.video_url is not None:
            update_doc["video_url"] = update_data.video_url
        if update_data.attachments is not None:
            update_doc["attachments"] = update_data.attachments
        if update_data.is_public is not None:
            update_doc["is_public"] = update_data.is_public
        if update_data.order_index is not None:
            update_doc["order_index"] = update_data.order_index
        
        result = await kb_collection.update_one(
            {"id": article_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {
            "success": True,
            "message": "Artikel aktualisiert"
        }
    
    except Exception as e:
        print(f"Error updating article: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/articles/{article_id}", response_model=dict)
async def delete_article(
    article_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete an article (admin only)
    """
    try:
        user_role = token_data.get("role")
        
        if user_role != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can delete articles")
        
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        result = await kb_collection.delete_one({"id": article_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {
            "success": True,
            "message": "Artikel gelöscht"
        }
    
    except Exception as e:
        print(f"Error deleting article: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/articles/{article_id}/helpful", response_model=dict)
async def mark_article_helpful(
    article_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Mark an article as helpful
    """
    try:
        db = await get_database()
        kb_collection = db['knowledge_base_articles']
        
        result = await kb_collection.update_one(
            {"id": article_id},
            {"$inc": {"helpful_count": 1}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {
            "success": True,
            "message": "Danke für Ihr Feedback!"
        }
    
    except Exception as e:
        print(f"Error marking article helpful: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
