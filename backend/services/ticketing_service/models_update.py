# Tenant-aware Ticket Model Updates
# Add tenant_id field to all models

# For Ticket model, add:
tenant_id: Optional[str] = None

# For TicketCreate model, add:
tenant_id: Optional[str] = None

# For TicketUpdate model, add:
tenant_id: Optional[str] = None
