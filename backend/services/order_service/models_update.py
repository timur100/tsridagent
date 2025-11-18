# Tenant-aware Order Model Updates
# Add tenant_id field to all models

# For Order model, add:
tenant_id: Optional[str] = None

# For OrderCreate model, add:
tenant_id: Optional[str] = None

# For OrderUpdate model, add:
tenant_id: Optional[str] = None
