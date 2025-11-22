from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
from models.chat_message import ChatMessageCreate, ChatMessageResponse
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/chat", tags=["Chat Messages"])


@router.post("/messages", response_model=dict)
@router.post("/messages/", response_model=dict, include_in_schema=False)
async def send_message(
    message: ChatMessageCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Send a chat message in a ticket
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        tickets_collection = db['tickets']
        
        # Verify ticket exists
        ticket = await tickets_collection.find_one({"ticket_number": message.ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get sender info
        sender_email = token_data.get("sub")
        sender_role = token_data.get("role")
        
        # Get sender name
        main_db = db.client['portal_db']
        user = await main_db.portal_users.find_one({"email": sender_email})
        if not user:
            main_db = db.client['auth_db']
            user = await main_db.users.find_one({"email": sender_email})
        
        sender_name = user.get("name", sender_email) if user else sender_email
        
        # Create message document
        message_id = str(uuid.uuid4())
        message_doc = {
            "id": message_id,
            "ticket_id": message.ticket_id,
            "message": message.message,
            "message_type": message.message_type,
            "attachments": message.attachments,
            "sender_email": sender_email,
            "sender_name": sender_name,
            "sender_role": sender_role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_by": [sender_email]
        }
        
        await messages_collection.insert_one(message_doc)
        
        # Update ticket's last_activity
        await tickets_collection.update_one(
            {"ticket_number": message.ticket_id},
            {"$set": {"last_activity": datetime.now(timezone.utc).isoformat()}}
        )
        
        if '_id' in message_doc:
            del message_doc['_id']
        
        # TODO: Broadcast via WebSocket
        
        return {
            "success": True,
            "message": "Nachricht gesendet",
            "chat_message": message_doc
        }
    
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{ticket_id}", response_model=dict)
async def get_ticket_messages(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get all messages for a ticket
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        
        # Get messages
        messages = []
        async for msg in messages_collection.find({"ticket_id": ticket_id}).sort("created_at", 1):
            if '_id' in msg:
                del msg['_id']
            messages.append(msg)
        
        # Mark messages as read by current user
        user_email = token_data.get("sub")
        await messages_collection.update_many(
            {"ticket_id": ticket_id, "read_by": {"$ne": user_email}},
            {"$addToSet": {"read_by": user_email}}
        )
        
        return {
            "success": True,
            "count": len(messages),
            "messages": messages
        }
    
    except Exception as e:
        print(f"Error getting messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    token_data: dict = Depends(verify_token)
):
    """
    Get count of unread messages for current user
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        
        user_email = token_data.get("sub")
        
        # Count messages where user is not in read_by array
        unread_count = await messages_collection.count_documents({
            "read_by": {"$ne": user_email},
            "sender_email": {"$ne": user_email}  # Don't count own messages
        })
        
        return {
            "success": True,
            "unread_count": unread_count
        }
    
    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
