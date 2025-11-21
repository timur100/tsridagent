from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from utils.db import db, tickets_collection
from utils.auth import verify_token

router = APIRouter(prefix="/staff", tags=["Support Staff"])

# Database collections
auth_db = db.client['auth_db']
staff_collection = auth_db.support_staff

class SupportStaff(BaseModel):
    email: str
    name: str
    role: str = "support_agent"  # support_agent, support_manager, admin
    specialization: Optional[List[str]] = []
    max_active_tickets: int = 10

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[List[str]] = None
    max_active_tickets: Optional[int] = None
    is_active: Optional[bool] = None

class TicketAssignment(BaseModel):
    staff_email: str
    notes: Optional[str] = None

@router.post("/")
async def create_staff(
    staff: SupportStaff,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new support staff member
    Admin only
    """
    try:
        if not token_data or token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if email already exists
        existing = staff_collection.find_one({"email": staff.email})
        if existing:
            raise HTTPException(status_code=400, detail="Staff member with this email already exists")
        
        # Create staff member
        staff_doc = {
            "id": str(uuid.uuid4()),
            "email": staff.email,
            "name": staff.name,
            "role": staff.role,
            "specialization": staff.specialization or [],
            "max_active_tickets": staff.max_active_tickets,
            "is_active": True,
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        staff_collection.insert_one(staff_doc)
        
        # Remove MongoDB _id
        if '_id' in staff_doc:
            del staff_doc['_id']
        
        return {
            "success": True,
            "message": "Support-Mitarbeiter erfolgreich erstellt",
            "staff": staff_doc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create staff error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_all_staff(
    is_active: Optional[bool] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get all support staff members
    Admin/Manager only
    """
    try:
        if not token_data or token_data.get("role") not in ["admin", "support_manager"]:
            raise HTTPException(status_code=403, detail="Admin/Manager access required")
        
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        
        cursor = staff_collection.find(query)
        staff_list = []
        
        async for staff in cursor:
            # Remove MongoDB _id
            if '_id' in staff:
                del staff['_id']
            
            # Get active ticket count
            active_tickets = tickets_collection.count_documents({
                "assigned_to": staff["email"],
                "status": {"$nin": ["resolved", "closed"]}
            })
            staff["active_tickets"] = active_tickets
            
            staff_list.append(staff)
        
        return {
            "success": True,
            "count": len(staff_list),
            "staff": staff_list
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get staff error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{staff_id}")
def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update staff member
    Admin only
    """
    try:
        if not token_data or token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if staff exists
        staff = staff_collection.find_one({"id": staff_id})
        if not staff:
            raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")
        
        # Build update fields
        update_fields = {k: v for k, v in staff_update.dict().items() if v is not None}
        
        if not update_fields:
            return {
                "success": True,
                "message": "Keine Änderungen"
            }
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update staff
        staff_collection.update_one(
            {"id": staff_id},
            {"$set": update_fields}
        )
        
        return {
            "success": True,
            "message": "Mitarbeiter aktualisiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update staff error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{staff_id}")
def delete_staff(
    staff_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete staff member (soft delete)
    Admin only
    """
    try:
        if not token_data or token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Soft delete
        result = staff_collection.update_one(
            {"id": staff_id},
            {"$set": {
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")
        
        return {
            "success": True,
            "message": "Mitarbeiter deaktiviert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete staff error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tickets/{ticket_id}/assign")
def assign_ticket(
    ticket_id: str,
    assignment: TicketAssignment,
    token_data: dict = Depends(verify_token)
):
    """
    Assign ticket to staff member
    Admin/Manager only
    """
    try:
        if not token_data or token_data.get("role") not in ["admin", "support_manager"]:
            raise HTTPException(status_code=403, detail="Admin/Manager access required")
        
        # Check if ticket exists
        ticket = tickets_collection.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
        
        # Check if staff exists and is active
        staff = staff_collection.find_one({
            "email": assignment.staff_email,
            "is_active": True
        })
        if not staff:
            raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden oder nicht aktiv")
        
        # Check if staff has capacity
        active_tickets = tickets_collection.count_documents({
            "assigned_to": assignment.staff_email,
            "status": {"$nin": ["resolved", "closed"]}
        })
        
        if active_tickets >= staff.get("max_active_tickets", 10):
            raise HTTPException(status_code=400, detail=f"Mitarbeiter hat bereits {active_tickets} aktive Tickets")
        
        # Update ticket
        update_fields = {
            "assigned_to": assignment.staff_email,
            "assigned_to_name": staff.get("name"),
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Change status to in_progress if it was open
        if ticket.get("status") == "open":
            update_fields["status"] = "in_progress"
        
        tickets_collection.update_one(
            {"id": ticket_id},
            {"$set": update_fields}
        )
        
        # Add assignment note
        if assignment.notes:
            comment = {
                "id": str(uuid.uuid4()),
                "comment": f"Ticket zugewiesen an {staff.get('name')}. Notiz: {assignment.notes}",
                "created_by": token_data.get("sub"),
                "created_by_name": token_data.get("name", "Admin"),
                "created_by_role": token_data.get("role"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "internal": False,
                "author": token_data.get("name", "Admin"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            tickets_collection.update_one(
                {"id": ticket_id},
                {"$push": {"comments": comment}}
            )
        
        return {
            "success": True,
            "message": f"Ticket erfolgreich zugewiesen an {staff.get('name')}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Assign ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tickets/by-staff")
def get_tickets_by_staff(token_data: dict = Depends(verify_token)):
    """
    Get ticket count grouped by staff member
    Admin/Manager only
    """
    try:
        if not token_data or token_data.get("role") not in ["admin", "support_manager"]:
            raise HTTPException(status_code=403, detail="Admin/Manager access required")
        
        # Get all active staff
        cursor = staff_collection.find({"is_active": True})
        staff_stats = []
        
        async for staff in cursor:
            email = staff.get("email")
            
            # Count tickets by status
            open_count = tickets_collection.count_documents({
                "assigned_to": email,
                "status": "open"
            })
            in_progress_count = tickets_collection.count_documents({
                "assigned_to": email,
                "status": "in_progress"
            })
            waiting_count = tickets_collection.count_documents({
                "assigned_to": email,
                "status": "waiting"
            })
            resolved_count = tickets_collection.count_documents({
                "assigned_to": email,
                "status": "resolved"
            })
            
            total_active = open_count + in_progress_count + waiting_count
            
            staff_stats.append({
                "staff_id": staff.get("id"),
                "email": email,
                "name": staff.get("name"),
                "role": staff.get("role"),
                "max_active_tickets": staff.get("max_active_tickets", 10),
                "tickets": {
                    "open": open_count,
                    "in_progress": in_progress_count,
                    "waiting": waiting_count,
                    "resolved": resolved_count,
                    "total_active": total_active
                },
                "capacity_used_percent": round((total_active / staff.get("max_active_tickets", 10)) * 100, 1)
            })
        
        # Get unassigned tickets
        unassigned_count = tickets_collection.count_documents({
            "$or": [
                {"assigned_to": {"$exists": False}},
                {"assigned_to": None},
                {"assigned_to": ""}
            ],
            "status": {"$nin": ["resolved", "closed"]}
        })
        
        return {
            "success": True,
            "data": {
                "staff_stats": staff_stats,
                "unassigned_tickets": unassigned_count
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get tickets by staff error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
