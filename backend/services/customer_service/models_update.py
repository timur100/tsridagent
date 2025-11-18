# Tenant-aware Customer Model Updates
# Add tenant_id field to all models

# For Customer model, add:
tenant_id: Optional[str] = None

# For CustomerCreate model, add:
tenant_id: Optional[str] = None

# For CustomerUpdate model, add:
tenant_id: Optional[str] = None
