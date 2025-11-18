#!/usr/bin/env python3
"""
Script to add tenant_id field to all microservice models and endpoints
"""
import os
import re

services_to_update = [
    'inventory_service',
    'order_service',
    'ticketing_service',
    'customer_service',
    'license_service',
    'settings_service'
]

def add_tenant_id_to_models(file_path):
    """Add tenant_id field to Pydantic models"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add tenant_id to main model (after id field)
    pattern = r'(class \w+\(BaseModel\):.*?id: str.*?\n)'
    replacement = r'\1    tenant_id: Optional[str] = None  # Tenant association\n'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Add tenant_id to Create models (after first field)
    pattern = r'(class \w+Create\(BaseModel\):.*?""".*?\n\s+\w+:.*?\n)'
    replacement = r'\1    tenant_id: Optional[str] = None  # Tenant association\n'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Add tenant_id to Update models (after first optional field)
    pattern = r'(class \w+Update\(BaseModel\):.*?""".*?\n\s+\w+: Optional.*?\n)'
    replacement = r'\1    tenant_id: Optional[str] = None  # Tenant association\n'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Updated models in {file_path}")

def add_tenant_filter_to_endpoints(file_path):
    """Add tenant_id filter to GET endpoints"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add tenant_id parameter to GET endpoints
    # Pattern: @app.get(...)\nasync def func(...):
    pattern = r'(@app\.get\([^\)]+\)\s*async def \w+\([^)]*)\):'
    
    def add_tenant_param(match):
        params = match.group(1)
        if 'tenant_id' not in params:
            if params.endswith('('):
                return params + 'tenant_id: Optional[str] = None):'
            else:
                return params + ', tenant_id: Optional[str] = None):'
        return match.group(0)
    
    content = re.sub(pattern, add_tenant_param, content)
    
    # Add tenant_id to query filters
    # Find lines like: query = {}
    # And add: if tenant_id: query['tenant_id'] = tenant_id
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Updated endpoints in {file_path}")

def main():
    base_path = '/app/backend/services'
    
    for service in services_to_update:
        server_path = os.path.join(base_path, service, 'server.py')
        if os.path.exists(server_path):
            print(f"\nProcessing {service}...")
            try:
                add_tenant_id_to_models(server_path)
                add_tenant_filter_to_endpoints(server_path)
                print(f"✓ {service} updated successfully")
            except Exception as e:
                print(f"✗ Error updating {service}: {e}")
        else:
            print(f"✗ {server_path} not found")

if __name__ == '__main__':
    main()
