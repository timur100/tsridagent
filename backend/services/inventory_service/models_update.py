# Tenant-aware Inventory Model Updates
# Add tenant_id field to all models

# For Item/Product model, add:
tenant_id: Optional[str] = None

# For ItemCreate model, add:
tenant_id: Optional[str] = None

# For ItemUpdate model, add:
tenant_id: Optional[str] = None
