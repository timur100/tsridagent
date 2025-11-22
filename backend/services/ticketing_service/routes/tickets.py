from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
from models.ticket import TicketCreate, TicketUpdate, TicketComment, TicketStatusUpdate
from utils.db import tickets_collection, db
from utils.auth import verify_token

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/")
@router.post("", include_in_schema=False)
async def create_ticket(
    ticket: TicketCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new ticket
    Customer or Admin
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Determine customer email
        if user_role == "admin":
            # Admin can create ticket for any customer
            customer_email = ticket.customer_email or user_email
        else:
            # Customer can only create for themselves
            customer_email = user_email
        
        # Get customer info from main database
        main_db = db.client['portal_db']
        customer = await main_db.portal_users.find_one({"email": customer_email})
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        # Generate ticket number
        current_date = datetime.now(timezone.utc)
        date_str = current_date.strftime("%Y%m%d")
        
        # Find last ticket of the day
        last_ticket = await tickets_collection.find_one(
            {"ticket_number": {"$regex": f"^TK.{date_str}"}},
            sort=[("ticket_number", -1)]
        )
        
        if last_ticket:
            last_num = int(last_ticket["ticket_number"].split(".")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        ticket_number = f"TK.{date_str}.{new_num:03d}"
        
        # Get location and device details if provided
        location_name = None
        device_name = None
        
        if ticket.location_id:
            location = await main_db.europcar_stations.find_one({"main_code": ticket.location_id})
            if location:
                location_name = f"{location.get('main_code')} - {location.get('stationsname', location.get('name', ''))}"
        
        if ticket.device_id:
            device = await main_db.europcar_devices.find_one({"device_id": ticket.device_id})
            if device:
                device_name = f"{device.get('device_id')} - {device.get('station_name', device.get('locationcode', ''))}"
        
        # Create ticket
        ticket_doc = {
            "id": str(uuid.uuid4()),
            "ticket_number": ticket_number,
            "title": ticket.title,
            "description": ticket.description,
            "status": "open",
            "priority": ticket.priority,
            "category": ticket.category,
            "customer_email": customer_email,
            "customer_name": customer.get("name", ""),
            "customer_company": customer.get("company", ""),
            "location_id": ticket.location_id,
            "location_name": location_name,
            "device_id": ticket.device_id,
            "device_name": device_name,
            "created_by": user_email,
            "created_by_role": user_role,
            "assigned_to": None,
            "resolution_notes": None,
            "created_at": current_date.isoformat(),
            "updated_at": current_date.isoformat(),
            "closed_at": None,
            "comments": []
        }
        
        await tickets_collection.insert_one(ticket_doc)
        
        # Remove MongoDB _id
        if '_id' in ticket_doc:
            del ticket_doc['_id']
        
        return {
            "success": True,
            "message": "Ticket erfolgreich erstellt",
            "ticket": ticket_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
@router.get("", include_in_schema=False)
async def get_tickets(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    customer_email: Optional[str] = None,
    location_id: Optional[str] = None,
    device_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get tickets with filtering
    Admin sees all, Customer sees only their own
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Build query
        query = {}
        
        if user_role == "customer":
            # Customer only sees their own tickets
            query["customer_email"] = user_email
        else:
            # Admin can filter by customer
            if customer_email:
                query["customer_email"] = customer_email
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if location_id:
            query["location_id"] = location_id
        if device_id:
            query["device_id"] = device_id
        
        # Get tickets
        cursor = tickets_collection.find(query).sort("created_at", -1)
        tickets = []
        
        async for ticket in cursor:
            # Remove MongoDB _id and map comment fields
            if '_id' in ticket:
                del ticket['_id']
            
            # Map comment fields for frontend compatibility
            if 'comments' in ticket and ticket['comments']:
                for comment in ticket['comments']:
                    # Map created_by_name to author
                    if 'created_by_name' in comment and 'author' not in comment:
                        comment['author'] = comment['created_by_name']
                    # Map created_at to timestamp
                    if 'created_at' in comment and 'timestamp' not in comment:
                        comment['timestamp'] = comment['created_at']
            
            tickets.append(ticket)
        
        return {
            "success": True,
            "count": len(tickets),
            "tickets": tickets
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get tickets error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_ticket_stats(token_data: dict = Depends(verify_token)):
    """
    Get ticket statistics
    Admin only
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Total tickets
        total = await tickets_collection.count_documents({})
        
        # By status
        open_count = await tickets_collection.count_documents({"status": "open"})
        in_progress_count = await tickets_collection.count_documents({"status": "in_progress"})
        waiting_count = await tickets_collection.count_documents({"status": "waiting"})
        resolved_count = await tickets_collection.count_documents({"status": "resolved"})
        closed_count = await tickets_collection.count_documents({"status": "closed"})
        
        # By priority
        critical_count = await tickets_collection.count_documents({"priority": "critical", "status": {"$nin": ["resolved", "closed"]}})
        high_count = await tickets_collection.count_documents({"priority": "high", "status": {"$nin": ["resolved", "closed"]}})
        
        # NEW tickets: status is 'open' and assigned_to is null or empty
        new_tickets = await tickets_collection.count_documents({
            "status": "open",
            "$or": [
                {"assigned_to": {"$exists": False}},
                {"assigned_to": None},
                {"assigned_to": ""}
            ]
        })
        
        # Average resolution time (for closed tickets in last 30 days)
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        
        cursor = tickets_collection.find({
            "status": "closed",
            "closed_at": {"$ne": None},
            "created_at": {"$gte": thirty_days_ago}
        })
        
        closed_tickets = []
        async for ticket in cursor:
            closed_tickets.append(ticket)
        
        avg_resolution_hours = 0
        if closed_tickets:
            total_hours = 0
            for ticket in closed_tickets:
                created = datetime.fromisoformat(ticket["created_at"])
                closed = datetime.fromisoformat(ticket["closed_at"])
                hours = (closed - created).total_seconds() / 3600
                total_hours += hours
            avg_resolution_hours = round(total_hours / len(closed_tickets), 1)
        
        return {
            "success": True,
            "stats": {
                "total": total,
                "open": open_count,
                "in_progress": in_progress_count,
                "waiting": waiting_count,
                "resolved": resolved_count,
                "closed": closed_count,
                "critical": critical_count,
                "high": high_count,
                "new_tickets": new_tickets,
                "avg_resolution_hours": avg_resolution_hours
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get ticket stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get single ticket
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
        
        # Remove MongoDB _id
        if '_id' in ticket:
            del ticket['_id']
        
        # Get LIVE device status if device_id exists
        if 'device_id' in ticket and ticket['device_id']:
            main_db = db.client['test_database']
            device = await main_db.europcar_devices.find_one(
                {"device_id": ticket['device_id']},
                {"status": 1, "teamviewer_online": 1, "online": 1}
            )
            if device:
                # Update ticket with live device status
                # Priority: status > teamviewer_online > online
                if 'status' in device:
                    ticket['device_status_live'] = device['status']
                elif 'teamviewer_online' in device:
                    ticket['device_status_live'] = 'online' if device['teamviewer_online'] else 'offline'
                elif 'online' in device:
                    ticket['device_status_live'] = 'online' if device['online'] else 'offline'
                else:
                    ticket['device_status_live'] = 'unknown'
            else:
                ticket['device_status_live'] = 'unknown'
        
        # Map comment fields for frontend compatibility
        if 'comments' in ticket and ticket['comments']:
            for comment in ticket['comments']:
                # Map created_by_name to author for frontend
                if 'created_by_name' in comment and 'author' not in comment:
                    comment['author'] = comment['created_by_name']
                # Map created_at to timestamp for frontend
                if 'created_at' in comment and 'timestamp' not in comment:
                    comment['timestamp'] = comment['created_at']
        
        return {
            "success": True,
            "ticket": ticket
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    ticket_update: TicketUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update ticket
    Admin can update all fields, Customer can only update description
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Get ticket
        ticket = await tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer":
            if ticket.get("customer_email") != user_email:
                raise HTTPException(status_code=403, detail="Zugriff verweigert")
            # Customer can only update description
            update_fields = {}
            if ticket_update.description:
                update_fields["description"] = ticket_update.description
        else:
            # Admin can update all fields
            update_fields = {k: v for k, v in ticket_update.dict().items() if v is not None}
            
            # If status changes to closed, set closed_at
            if ticket_update.status == "closed" and ticket.get("status") != "closed":
                update_fields["closed_at"] = datetime.now(timezone.utc).isoformat()
        
        if not update_fields:
            return {
                "success": True,
                "message": "Keine Änderungen"
            }
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update ticket
        await tickets_collection.update_one(
            {"id": ticket_id},
            {"$set": update_fields}
        )
        
        return {
            "success": True,
            "message": "Ticket aktualisiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete ticket
    Admin only
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await tickets_collection.delete_one({"id": ticket_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        return {
            "success": True,
            "message": "Ticket gelöscht"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/comments")
async def add_comment(
    ticket_id: str,
    comment_data: TicketComment,
    token_data: dict = Depends(verify_token)
):
    """
    Add a comment to a ticket
    """
    try:
        if not token_data:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Get ticket
        ticket = await tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        # Customers cannot add internal notes
        if user_role == "customer" and comment_data.internal:
            raise HTTPException(status_code=403, detail="Kunden können keine internen Notizen hinzufügen")
        
        # Get user name from database
        main_db = db.client['test_database']
        user = await main_db.portal_users.find_one({"email": user_email})
        user_name = user.get("name", user_email) if user else user_email
        
        # Create comment
        comment = {
            "id": str(uuid.uuid4()),
            "comment": comment_data.comment,
            "internal": comment_data.internal,
            "created_by": user_email,
            "created_by_name": user_name,
            "created_by_role": user_role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            # Add these for frontend compatibility
            "author": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
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

@router.put("/{ticket_id}/status/{new_status}")
async def update_ticket_status(
    ticket_id: str,
    new_status: str,
    status_update: TicketStatusUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update ticket status
    Admin/Staff only
    """
    try:
        if not token_data or token_data.get("role") not in ["admin", "support_agent", "support_manager"]:
            raise HTTPException(status_code=403, detail="Support access required")
        
        # Validate status
        valid_statuses = ["open", "in_progress", "waiting", "resolved", "closed"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Ungültiger Status. Erlaubt: {', '.join(valid_statuses)}")
        
        # Get ticket
        ticket = await tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        old_status = ticket.get("status")
        
        update_fields = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Set resolved_at when status changes to resolved
        if new_status == "resolved" and old_status != "resolved":
            update_fields["resolved_at"] = datetime.now(timezone.utc).isoformat()
        
        # Set closed_at when status changes to closed
        if new_status == "closed" and old_status != "closed":
            update_fields["closed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update ticket
        await tickets_collection.update_one(
            {"id": ticket_id},
            {"$set": update_fields}
        )
        
        # Add status change note to comments
        user_email = token_data.get("sub")
        main_db = db.client['test_database']
        user = await main_db.portal_users.find_one({"email": user_email})
        user_name = user.get("name", user_email) if user else user_email
        
        status_labels = {
            "open": "Offen",
            "in_progress": "In Bearbeitung",
            "waiting": "Wartend",
            "resolved": "Gelöst",
            "closed": "Geschlossen"
        }
        
        comment_text = f"Status geändert von '{status_labels.get(old_status, old_status)}' zu '{status_labels.get(new_status, new_status)}'"
        if status_update.notes:
            comment_text += f". Notiz: {status_update.notes}"
        
        comment = {
            "id": str(uuid.uuid4()),
            "comment": comment_text,
            "internal": False,
            "created_by": user_email,
            "created_by_name": user_name,
            "created_by_role": token_data.get("role"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "author": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await tickets_collection.update_one(
            {"id": ticket_id},
            {"$push": {"comments": comment}}
        )
        
        return {
            "success": True,
            "message": "Status aktualisiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update ticket status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
