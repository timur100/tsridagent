from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ArticleStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class ArticleCategory(str, Enum):
    faq = "faq"
    how_to = "how_to"
    troubleshooting = "troubleshooting"
    policy = "policy"
    video_tutorial = "video_tutorial"
    quick_guide = "quick_guide"

class KnowledgeBaseArticleCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)
    category: ArticleCategory
    tags: Optional[List[str]] = Field(default_factory=list)
    video_url: Optional[str] = None
    attachments: Optional[List[str]] = Field(default_factory=list)
    is_public: bool = Field(default=True)  # Visible to customers
    order_index: Optional[int] = 0

class KnowledgeBaseArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[ArticleCategory] = None
    status: Optional[ArticleStatus] = None
    tags: Optional[List[str]] = None
    video_url: Optional[str] = None
    attachments: Optional[List[str]] = None
    is_public: Optional[bool] = None
    order_index: Optional[int] = None

class KnowledgeBaseArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    category: ArticleCategory
    status: ArticleStatus
    tags: List[str]
    video_url: Optional[str] = None
    attachments: List[str]
    is_public: bool
    order_index: int
    version: int
    views_count: int
    helpful_count: int
    created_by: str
    created_by_name: str
    created_at: str
    updated_at: Optional[str] = None
    last_updated_by: Optional[str] = None
