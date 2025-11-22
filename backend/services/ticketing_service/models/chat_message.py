from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    text = "text"
    system = "system"
    file = "file"
    image = "image"

class ChatMessageCreate(BaseModel):
    ticket_id: str
    message: str = Field(..., min_length=1, max_length=5000)
    message_type: MessageType = Field(default=MessageType.text)
    attachments: Optional[List[str]] = Field(default_factory=list)

class ChatMessageResponse(BaseModel):
    id: str
    ticket_id: str
    message: str
    message_type: MessageType
    attachments: List[str]
    sender_email: str
    sender_name: str
    sender_role: str
    created_at: str
    read_by: List[str] = Field(default_factory=list)
