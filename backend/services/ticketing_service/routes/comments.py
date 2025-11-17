from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from models.ticket import TicketComment
from utils.db import tickets_collection
from utils.auth import verify_token

router = APIRouter(prefix="/tickets", tags=["Comments"])

@router.post("/{ticket_id}/comments")
async def add_comment(
    ticket_id: str,
    comment_data: TicketComment,
    token_data: dict = Depends(verify_token)
):
    """
    Add comment to ticket
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        user_name = token_data.get("name", user_email)
        
        # Get ticket
        ticket = await tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        # Create comment
        comment = {
            "id": str(uuid.uuid4()),
            "comment": comment_data.comment,
            "internal": comment_data.internal if user_role == "admin" else False,
            "created_by": user_email,
            "created_by_name": user_name,
            "created_by_role": user_role,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add comment to ticket
        await tickets_collection.update_one(
            {"id": ticket_id},
            {
                "$push": {"comments": comment},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": "Kommentar hinzugefügt",
            "comment": comment
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Add comment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
