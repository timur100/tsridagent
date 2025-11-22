from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SupportSettings(BaseModel):
    """Support system configuration settings"""
    
    # Chat settings
    enable_user_to_user_chat: bool = Field(default=False, description="Enable chat between users")
    max_file_size_mb: int = Field(default=10, ge=1, le=100, description="Maximum file upload size in MB")
    allowed_file_types: List[str] = Field(
        default_factory=lambda: ["*"],
        description="Allowed file types (* for all)"
    )
    enable_audio_messages: bool = Field(default=True, description="Enable audio message recording")
    max_audio_duration_seconds: int = Field(default=120, ge=10, le=300, description="Max audio duration")
    
    # Archive settings
    enable_auto_archive: bool = Field(default=True, description="Auto-archive old messages")
    archive_after_days: int = Field(default=90, ge=30, le=365, description="Archive messages after X days")
    
    # Notification settings
    enable_email_notifications: bool = Field(default=True, description="Send email notifications")
    enable_push_notifications: bool = Field(default=True, description="Send push notifications")
    
    # Typing indicator
    enable_typing_indicator: bool = Field(default=True, description="Show typing indicators")
    
    # Read receipts
    enable_read_receipts: bool = Field(default=True, description="Show read receipts")
    
    # System info
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None

class SupportSettingsResponse(BaseModel):
    success: bool
    settings: SupportSettings
    message: Optional[str] = None
