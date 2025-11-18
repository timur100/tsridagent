# Tenant-aware Device Model Updates
# Add tenant_id field to all models

# For Device model, add:
tenant_id: Optional[str] = None

# For DeviceCreate model, add:
tenant_id: Optional[str] = None

# For DeviceUpdate model, add:
tenant_id: Optional[str] = None
