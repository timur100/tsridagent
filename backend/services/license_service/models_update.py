# Tenant-aware License Model Updates
# Add tenant_id field to all models

# For License model, add:
tenant_id: Optional[str] = None

# For LicenseCreate model, add:
tenant_id: Optional[str] = None

# For LicenseUpdate model, add:
tenant_id: Optional[str] = None
