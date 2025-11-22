from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import os
from models.chat_message import ChatMessageCreate, ChatMessageResponse
from utils.auth import verify_token
from utils.db import get_database

router = APIRouter(prefix="/chat", tags=["Chat Messages"])

# File upload configuration
UPLOAD_DIR = "/app/backend/uploads/chat_files"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8001')

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def broadcast_chat_message(message_doc: dict, ticket: dict):
    """Broadcast chat message via WebSocket"""
    try:
        # Get tenant_id from ticket
        tenant_id = ticket.get('tenant_id')
        
        # Prepare WebSocket broadcast payload
        ws_payload = {
            "type": "chat_message_created",
            "ticket_id": message_doc["ticket_id"],
            "message": message_doc,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Broadcast to tenant room
        if tenant_id:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{BACKEND_URL}/api/ws/broadcast",
                    json={
                        "tenant_id": tenant_id,
                        "message": ws_payload
                    }
                )
                print(f"📨 [Chat Message] Broadcasted to tenant {tenant_id}")
        
        # Also broadcast to admin room 'all'
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{BACKEND_URL}/api/ws/broadcast",
                json={
                    "tenant_id": "all",
                    "message": ws_payload
                }
            )
            print(f"📨 [Chat Message] Broadcasted to admin room 'all'")
            
    except Exception as e:
        print(f"⚠️ [Chat Message] WebSocket broadcast failed: {str(e)}")


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
            "attachments": message.attachments or [],
            "sender_email": sender_email,
            "sender_name": sender_name,
            "sender_role": sender_role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_by": [sender_email],
            "edited": False,
            "deleted": False
        }
        
        await messages_collection.insert_one(message_doc)
        
        # Update ticket's last_activity
        await tickets_collection.update_one(
            {"ticket_number": message.ticket_id},
            {"$set": {"last_activity": datetime.now(timezone.utc).isoformat()}}
        )
        
        if '_id' in message_doc:
            del message_doc['_id']
        
        # Broadcast via WebSocket
        await broadcast_chat_message(message_doc, ticket)
        
        return {
            "success": True,
            "message": "Nachricht gesendet",
            "chat_message": message_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=dict)
@router.post("/upload/", response_model=dict, include_in_schema=False)
async def upload_file(
    file: UploadFile = File(...),
    ticket_id: str = Form(...),
    is_audio: Optional[str] = Form(None),
    token_data: dict = Depends(verify_token)
):
    """
    Upload a file for chat message
    Max size: 10MB
    Supports regular files and audio messages
    """
    try:
        # Verify file size
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Datei zu groß. Maximum: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Create file metadata
        file_metadata = {
            "id": str(uuid.uuid4()),
            "filename": file.filename,
            "unique_filename": unique_filename,
            "file_path": file_path,
            "file_size": file_size,
            "file_type": file.content_type,
            "is_audio": is_audio and is_audio.lower() in ('true', '1', 'yes'),
            "ticket_id": ticket_id,
            "uploaded_by": token_data.get("sub"),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store metadata in database
        db = await get_database()
        files_collection = db['chat_files']
        await files_collection.insert_one(file_metadata)
        
        if '_id' in file_metadata:
            del file_metadata['_id']
        
        message_text = "Sprachnachricht" if file_metadata['is_audio'] else "Datei hochgeladen"
        
        return {
            "success": True,
            "message": message_text,
            "file": file_metadata
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{file_id}", response_model=dict)
async def download_file(
    file_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get download URL for a file
    """
    try:
        db = await get_database()
        files_collection = db['chat_files']
        
        file_metadata = await files_collection.find_one({"id": file_id})
        if not file_metadata:
            raise HTTPException(status_code=404, detail="Datei nicht gefunden")
        
        if '_id' in file_metadata:
            del file_metadata['_id']
        
        return {
            "success": True,
            "file": file_metadata
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{filename}")
async def serve_file(
    filename: str,
    token_data: dict = Depends(verify_token)
):
    """
    Serve uploaded files (audio, documents, etc.)
    """
    try:
        from fastapi.responses import FileResponse
        
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Datei nicht gefunden")
        
        # Security: Ensure file is within upload directory
        if not os.path.abspath(file_path).startswith(os.path.abspath(UPLOAD_DIR)):
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        # Determine media type
        if filename.endswith('.webm'):
            media_type = 'audio/webm'
        elif filename.endswith('.mp3'):
            media_type = 'audio/mpeg'
        elif filename.endswith('.wav'):
            media_type = 'audio/wav'
        elif filename.endswith('.ogg'):
            media_type = 'audio/ogg'
        elif filename.endswith('.m4a'):
            media_type = 'audio/mp4'
        else:
            media_type = 'application/octet-stream'
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{ticket_id}", response_model=dict)
async def get_ticket_messages(
    ticket_id: str,
    limit: Optional[int] = 100,
    skip: Optional[int] = 0,
    token_data: dict = Depends(verify_token)
):
    """
    Get all messages for a ticket with pagination
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        
        # Get messages with pagination
        messages = []
        async for msg in messages_collection.find(
            {"ticket_id": ticket_id, "deleted": {"$ne": True}}
        ).sort("created_at", 1).skip(skip).limit(limit):
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
            "sender_email": {"$ne": user_email},  # Don't count own messages
            "deleted": {"$ne": True}
        })
        
        return {
            "success": True,
            "unread_count": unread_count
        }
    
    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/typing", response_model=dict)
@router.post("/typing/", response_model=dict, include_in_schema=False)
async def send_typing_indicator(
    ticket_id: str = Form(...),
    is_typing: str = Form(...),
    token_data: dict = Depends(verify_token)
):
    """
    Send typing indicator for real-time feedback
    """
    try:
        db = await get_database()
        tickets_collection = db['tickets']
        
        # Verify ticket exists
        ticket = await tickets_collection.find_one({"ticket_number": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get user info
        sender_email = token_data.get("sub")
        
        # Convert string to boolean
        is_typing_bool = is_typing.lower() in ('true', '1', 'yes')
        
        # Broadcast typing indicator
        tenant_id = ticket.get('tenant_id')
        ws_payload = {
            "type": "user_typing",
            "ticket_id": ticket_id,
            "user_email": sender_email,
            "is_typing": is_typing_bool,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if tenant_id:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{BACKEND_URL}/api/ws/broadcast",
                    json={
                        "tenant_id": tenant_id,
                        "message": ws_payload
                    }
                )
        
        # Also broadcast to admin room
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{BACKEND_URL}/api/ws/broadcast",
                json={
                    "tenant_id": "all",
                    "message": ws_payload
                }
            )
        
        return {
            "success": True,
            "message": "Typing indicator sent"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending typing indicator: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/messages/{message_id}", response_model=dict)
async def edit_message(
    message_id: str,
    new_message: str = Form(...),
    token_data: dict = Depends(verify_token)
):
    """
    Edit a message (only within 5 minutes of creation)
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        
        # Get message
        message = await messages_collection.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")
        
        # Verify ownership
        sender_email = token_data.get("sub")
        if message["sender_email"] != sender_email:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Check time limit (5 minutes)
        created_at = datetime.fromisoformat(message["created_at"])
        time_diff = datetime.now(timezone.utc) - created_at
        if time_diff > timedelta(minutes=5):
            raise HTTPException(
                status_code=403,
                detail="Nachricht kann nur innerhalb von 5 Minuten bearbeitet werden"
            )
        
        # Update message
        await messages_collection.update_one(
            {"id": message_id},
            {
                "$set": {
                    "message": new_message,
                    "edited": True,
                    "edited_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Get updated message
        updated_message = await messages_collection.find_one({"id": message_id})
        if '_id' in updated_message:
            del updated_message['_id']
        
        # Broadcast update
        tickets_collection = db['tickets']
        ticket = await tickets_collection.find_one({"ticket_number": message["ticket_id"]})
        if ticket:
            await broadcast_chat_message(updated_message, ticket)
        
        return {
            "success": True,
            "message": "Nachricht aktualisiert",
            "chat_message": updated_message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error editing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages/{message_id}", response_model=dict)
async def delete_message(
    message_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete a message (soft delete)
    """
    try:
        db = await get_database()
        messages_collection = db['chat_messages']
        
        # Get message
        message = await messages_collection.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")
        
        # Verify ownership or admin
        sender_email = token_data.get("sub")
        sender_role = token_data.get("role")
        if message["sender_email"] != sender_email and sender_role != "admin":
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Soft delete
        await messages_collection.update_one(
            {"id": message_id},
            {
                "$set": {
                    "deleted": True,
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_by": sender_email
                }
            }
        )
        
        return {
            "success": True,
            "message": "Nachricht gelöscht"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/archive", response_model=dict)
@router.post("/archive/", response_model=dict, include_in_schema=False)
async def archive_old_messages(
    days_old: int = Form(default=90),
    token_data: dict = Depends(verify_token)
):
    """
    Archive messages older than X days (Admin only)
    """
    try:
        # Verify admin role
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin-Berechtigung erforderlich")
        
        db = await get_database()
        messages_collection = db['chat_messages']
        archived_collection = db['chat_messages_archive']
        
        # Calculate cutoff date
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        
        # Find old messages
        old_messages = []
        async for msg in messages_collection.find(
            {"created_at": {"$lt": cutoff_date.isoformat()}}
        ):
            old_messages.append(msg)
        
        if old_messages:
            # Move to archive
            await archived_collection.insert_many(old_messages)
            
            # Delete from main collection
            message_ids = [msg["id"] for msg in old_messages]
            await messages_collection.delete_many(
                {"id": {"$in": message_ids}}
            )
        
        return {
            "success": True,
            "message": f"{len(old_messages)} Nachrichten archiviert",
            "archived_count": len(old_messages)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error archiving messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
