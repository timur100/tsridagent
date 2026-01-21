from fastapi import APIRouter, HTTPException, Depends
from db.connection import get_mongo_client
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from routes.portal_auth import verify_token

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str = "medium"  # low, medium, high, critical
    category: str  # technical, billing, general, hardware, software
    customer_email: Optional[str] = None  # If admin creates for customer
    location_id: Optional[str] = None
    device_id: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # open, in_progress, waiting, resolved, closed
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class TicketComment(BaseModel):
    comment: str
    internal: bool = False  # Internal notes only visible to admins

class TicketStatusUpdate(BaseModel):
    notes: Optional[str] = None

@router.post("/", include_in_schema=False)
@router.post("")
async def create_ticket(
    ticket: TicketCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new ticket
    Customer or Admin
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Determine customer email
        if user_role == "admin":
            # Admin can create ticket for any customer
            customer_email = ticket.customer_email or user_email
        else:
            # Customer can only create for themselves
            customer_email = user_email
        
        # Get customer info
        customer = db.portal_users.find_one({"email": customer_email})
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        # Generate ticket number
        current_date = datetime.now(timezone.utc)
        date_str = current_date.strftime("%Y%m%d")
        
        # Find last ticket of the day
        last_ticket = db.tickets.find_one(
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
            location = db.europcar_stations.find_one({"main_code": ticket.location_id})
            if location:
                location_name = f"{location.get('main_code')} - {location.get('stationsname', location.get('name', ''))}"
        
        if ticket.device_id:
            device = db.europcar_devices.find_one({"device_id": ticket.device_id})
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
        
        db.tickets.insert_one(ticket_doc)
        
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

@router.get("/", include_in_schema=False)
@router.get("")
async def get_tickets(
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
        
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if location_id:
            query["location_id"] = location_id
        if device_id:
            query["device_id"] = device_id
        
        # Get tickets
        tickets = list(db.tickets.find(query).sort("created_at", -1))
        
        # Remove MongoDB _id and map comment fields
        for ticket in tickets:
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
        
        return {
            "success": True,
            "data": {
                "count": len(tickets),
                "tickets": tickets
            }
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
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Total tickets
        total = db.tickets.count_documents({})
        
        # By status
        open_count = db.tickets.count_documents({"status": "open"})
        in_progress_count = db.tickets.count_documents({"status": "in_progress"})
        waiting_count = db.tickets.count_documents({"status": "waiting"})
        resolved_count = db.tickets.count_documents({"status": "resolved"})
        closed_count = db.tickets.count_documents({"status": "closed"})
        
        # By priority
        critical_count = db.tickets.count_documents({"priority": "critical", "status": {"$nin": ["resolved", "closed"]}})
        high_count = db.tickets.count_documents({"priority": "high", "status": {"$nin": ["resolved", "closed"]}})
        
        # NEW tickets: status is 'open' and assigned_to is null or empty
        new_tickets = db.tickets.count_documents({
            "status": "open",
            "$or": [
                {"assigned_to": {"$exists": False}},
                {"assigned_to": None},
                {"assigned_to": ""}
            ]
        })
        
        # Average resolution time (for closed tickets in last 30 days)
        from datetime import timedelta
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        
        closed_tickets = list(db.tickets.find({
            "status": "closed",
            "closed_at": {"$ne": None},
            "created_at": {"$gte": thirty_days_ago}
        }))
        
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
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = db.tickets.find_one({"id": ticket_id})
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
            device = db.europcar_devices.find_one(
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
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        # Get ticket
        ticket = db.tickets.find_one({"id": ticket_id})
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
        db.tickets.update_one(
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
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        user_name = token_data.get("name", user_email)
        
        # Get ticket
        ticket = db.tickets.find_one({"id": ticket_id})
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
        db.tickets.update_one(
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
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = db.tickets.delete_one({"id": ticket_id})
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
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = db.tickets.find_one({"id": ticket_id})
        
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
            db.tickets.update_one(
                {"id": ticket_id},
                {
                    "$set": update_data,
                    "$push": {"comments": comment}
                }
            )
        else:
            db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
        
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
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = db.tickets.find_one({"id": ticket_id})
        
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
            db.tickets.update_one(
                {"id": ticket_id},
                {
                    "$set": update_data,
                    "$push": {"comments": comment}
                }
            )
        else:
            db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
        
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
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user_email = token_data.get("sub")
        ticket = db.tickets.find_one({"id": ticket_id})
        
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
        
        db.tickets.update_one(
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
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = db.tickets.find_one({"id": ticket_id})
        
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
        
        db.tickets.update_one(
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
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = db.tickets.find_one({"id": ticket_id})
        
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
        
        db.tickets.update_one(
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

@router.get("/{ticket_id}/location-details")
async def get_ticket_location_details(
    ticket_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get full location details for a ticket
    """
    try:
        user_role = token_data.get("role")
        user_email = token_data.get("sub")
        
        ticket = db.tickets.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check access
        if user_role == "customer" and ticket.get("customer_email") != user_email:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        location_id = ticket.get("location_id")
        if not location_id:
            return {
                "success": True,
                "location": None
            }
        
        # Get location details
        location = db.europcar_stations.find_one({"main_code": location_id})
        
        if not location:
            return {
                "success": True,
                "location": None
            }
        
        # Remove MongoDB _id
        if '_id' in location:
            del location['_id']
        
        # Get devices for this location
        devices = list(db.europcar_devices.find({"locationcode": location_id}))
        for device in devices:
            if '_id' in device:
                del device['_id']
        
        location_data = {
            "main_code": location.get("main_code"),
            "stationsname": location.get("stationsname"),
            "str": location.get("str"),
            "plz": location.get("plz"),
            "ort": location.get("ort"),
            "bundesl": location.get("bundesl"),
            "land": location.get("land"),
            "kontinent": location.get("kontinent"),
            "telefon": location.get("telefon"),
            "email": location.get("email"),
            "mgr": location.get("mgr"),
            "opening_hours": location.get("opening_hours", "Nicht verfügbar"),
            "devices": devices,
            "device_count": len(devices)
        }
        
        return {
            "success": True,
            "location": location_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get location details error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

