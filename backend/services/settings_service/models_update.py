# Tenant-aware Settings Model Updates
# Add tenant_id field to all models

# For Setting model, add:
tenant_id: Optional[str] = None

# For SettingCreate model, add:
tenant_id: Optional[str] = None

# For SettingUpdate model, add:
tenant_id: Optional[str] = None
