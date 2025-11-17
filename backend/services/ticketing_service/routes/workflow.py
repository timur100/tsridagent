from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from models.ticket import TicketStatusUpdate
from utils.db import tickets_collection
from utils.auth import verify_token

router = APIRouter(prefix="/tickets", tags=["Workflow"])

@router.post("/{ticket_id}/accept")
async def accept_ticket(
    ticket_id: str,
    data: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Accept a ticket (Status: open -> accepted)
    Admin only
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        if ticket.get("status") not in ["open", "new"]:
            raise HTTPException(status_code=400, detail="Ticket kann nur im Status 'open' angenommen werden")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "status": "accepted",
            "assigned_to": user_email,
            "accepted_at": now,
            "accepted_by": user_email,
            "updated_at": now
        }
        
        if data.notes:
            comment = {
                "comment": f"Ticket angenommen. Notiz: {data.notes}",
                "author": user_email,
                "internal": True,
                "timestamp": now
            }
            await tickets_collection.update_one(
                {"id": ticket_id},
                {
                    "$set": update_data,
                    "$push": {"comments": comment}
                }
            )
        else:
            await tickets_collection.update_one({"id": ticket_id}, {"$set": update_data})
        
        return {
            "success": True,
            "message": "Ticket angenommen"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Accept ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/start")
async def start_work_on_ticket(
    ticket_id: str,
    data: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Start working on ticket (Status: accepted -> in_progress)
    Admin only
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        if ticket.get("status") not in ["accepted", "open"]:
            raise HTTPException(status_code=400, detail="Ticket muss angenommen sein, um Bearbeitung zu starten")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "status": "in_progress",
            "started_at": now,
            "started_by": user_email,
            "updated_at": now
        }
        
        if not ticket.get("assigned_to"):
            update_data["assigned_to"] = user_email
        
        if data.notes:
            comment = {
                "comment": f"Bearbeitung gestartet. Notiz: {data.notes}",
                "author": user_email,
                "internal": True,
                "timestamp": now
            }
            await tickets_collection.update_one(
                {"id": ticket_id},
                {
                    "$set": update_data,
                    "$push": {"comments": comment}
                }
            )
        else:
            await tickets_collection.update_one({"id": ticket_id}, {"$set": update_data})
        
        return {
            "success": True,
            "message": "Bearbeitung gestartet"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Start work error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: str,
    data: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Mark ticket as resolved (Status: in_progress -> resolved)
    Admin only
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "status": "resolved",
            "resolved_at": now,
            "resolved_by": user_email,
            "resolution_notes": data.notes or "",
            "updated_at": now
        }
        
        comment = {
            "comment": f"Ticket als gelöst markiert. {data.notes or ''}",
            "author": user_email,
            "internal": False,
            "timestamp": now
        }
        
        await tickets_collection.update_one(
            {"id": ticket_id},
            {
                "$set": update_data,
                "$push": {"comments": comment}
            }
        )
        
        return {
            "success": True,
            "message": "Ticket als gelöst markiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Resolve ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    data: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Close ticket (Status: resolved -> closed)
    Admin or Customer (if resolved)
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        # Customer can only close if resolved
        if user_role == "customer" and ticket.get("status") != "resolved":
            raise HTTPException(status_code=400, detail="Kunde kann nur gelöste Tickets schließen")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "status": "closed",
            "closed_at": now,
            "closed_by": user_email,
            "updated_at": now
        }
        
        comment_text = "Ticket geschlossen."
        if data.notes:
            comment_text += f" {data.notes}"
        
        comment = {
            "comment": comment_text,
            "author": user_email,
            "internal": False,
            "timestamp": now
        }
        
        await tickets_collection.update_one(
            {"id": ticket_id},
            {
                "$set": update_data,
                "$push": {"comments": comment}
            }
        )
        
        return {
            "success": True,
            "message": "Ticket geschlossen"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Close ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: str,
    data: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Reopen a closed ticket
    Admin or Customer
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = await tickets_collection.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "status": "open",
            "reopened_at": now,
            "reopened_by": user_email,
            "updated_at": now
        }
        
        comment_text = "Ticket wieder geöffnet."
        if data.notes:
            comment_text += f" Grund: {data.notes}"
        
        comment = {
            "comment": comment_text,
            "author": user_email,
            "internal": False,
            "timestamp": now
        }
        
        await tickets_collection.update_one(
            {"id": ticket_id},
            {
                "$set": update_data,
                "$push": {"comments": comment}
            }
        )
        
        return {
            "success": True,
            "message": "Ticket wieder geöffnet"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reopen ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
