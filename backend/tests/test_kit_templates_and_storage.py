"""
Test Kit-Templates and Storage Overview APIs
Tests for the new Lagerverwaltung features:
1. Kit-Templates CRUD operations
2. Storage Overview with device type categorization
3. Kit availability calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tablet-agent-1.preview.emergentagent.com').rstrip('/')


class TestKitTemplatesAPI:
    """Tests for Kit-Templates CRUD operations"""
    
    def test_list_templates(self):
        """Test listing all kit templates"""
        response = requests.get(f"{BASE_URL}/api/kit-templates/list")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "templates" in data
        assert "total" in data
        assert isinstance(data["templates"], list)
    
    def test_list_templates_with_tenant_filter(self):
        """Test listing templates filtered by tenant"""
        response = requests.get(f"{BASE_URL}/api/kit-templates/list?tenant_id=europcar")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # All returned templates should be for europcar tenant
        for template in data["templates"]:
            assert template["tenant_id"] == "europcar"
    
    def test_get_single_template(self):
        """Test getting a single template by ID"""
        # First get list to find a template ID
        list_response = requests.get(f"{BASE_URL}/api/kit-templates/list")
        templates = list_response.json()["templates"]
        
        if len(templates) > 0:
            template_id = templates[0]["id"]
            response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "template" in data
            assert data["template"]["id"] == template_id
            assert "name" in data["template"]
            assert "components" in data["template"]
    
    def test_get_nonexistent_template(self):
        """Test getting a template that doesn't exist"""
        response = requests.get(f"{BASE_URL}/api/kit-templates/000000000000000000000000")
        assert response.status_code == 404
    
    def test_create_template(self):
        """Test creating a new kit template"""
        payload = {
            "name": "TEST-Template-001",
            "description": "Test template for automated testing",
            "tenant_id": "europcar",
            "components": [
                {"device_type": "tablet", "quantity": 1},
                {"device_type": "scanner_regula", "quantity": 1}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "template_id" in data
        
        # Cleanup - delete the test template
        template_id = data["template_id"]
        requests.delete(f"{BASE_URL}/api/kit-templates/{template_id}")
    
    def test_create_template_missing_name(self):
        """Test creating template without required name field"""
        payload = {
            "description": "Test",
            "tenant_id": "europcar",
            "components": [{"device_type": "tablet", "quantity": 1}]
        }
        response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_update_template(self):
        """Test updating an existing template"""
        # First create a template
        create_payload = {
            "name": "TEST-Update-Template",
            "description": "Original description",
            "tenant_id": "europcar",
            "components": [{"device_type": "tablet", "quantity": 1}]
        }
        create_response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=create_payload)
        template_id = create_response.json()["template_id"]
        
        # Update the template
        update_payload = {
            "description": "Updated description",
            "components": [
                {"device_type": "tablet", "quantity": 2},
                {"device_type": "printer", "quantity": 1}
            ]
        }
        response = requests.put(f"{BASE_URL}/api/kit-templates/{template_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}")
        updated_template = get_response.json()["template"]
        assert updated_template["description"] == "Updated description"
        assert len(updated_template["components"]) == 2
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/kit-templates/{template_id}")
    
    def test_delete_template(self):
        """Test deleting a template"""
        # First create a template
        create_payload = {
            "name": "TEST-Delete-Template",
            "description": "To be deleted",
            "tenant_id": "europcar",
            "components": [{"device_type": "tablet", "quantity": 1}]
        }
        create_response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=create_payload)
        template_id = create_response.json()["template_id"]
        
        # Delete the template
        response = requests.delete(f"{BASE_URL}/api/kit-templates/{template_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}")
        assert get_response.status_code == 404


class TestKitTemplateAvailability:
    """Tests for kit availability calculation"""
    
    def test_template_availability(self):
        """Test checking how many kits can be created"""
        # Get existing template
        list_response = requests.get(f"{BASE_URL}/api/kit-templates/list")
        templates = list_response.json()["templates"]
        
        if len(templates) > 0:
            template_id = templates[0]["id"]
            response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}/availability")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "possible_kits" in data
            assert "component_availability" in data
            assert isinstance(data["possible_kits"], int)
            assert data["possible_kits"] >= 0
            
            # Check component availability structure
            for comp in data["component_availability"]:
                assert "device_type" in comp
                assert "required" in comp
                assert "available" in comp
                assert "possible_kits" in comp


class TestStorageOverviewAPI:
    """Tests for Storage Overview endpoint"""
    
    def test_storage_overview(self):
        """Test getting storage overview"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "storage" in data
        
        storage = data["storage"]
        assert "total_in_storage" in storage
        assert "available_for_kits" in storage
        assert "by_tenant" in storage
        assert "by_type" in storage
        assert "devices" in storage
    
    def test_storage_overview_with_tenant_filter(self):
        """Test storage overview filtered by tenant"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview?tenant_id=europcar")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All devices should be for europcar tenant
        for device in data["storage"]["devices"]:
            assert device["tenant_id"] == "europcar"
    
    def test_storage_by_type_structure(self):
        """Test that by_type contains correct structure"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        data = response.json()
        
        by_type = data["storage"]["by_type"]
        for device_type, type_data in by_type.items():
            assert "total" in type_data
            assert "available_for_kits" in type_data
            assert isinstance(type_data["total"], int)
            assert isinstance(type_data["available_for_kits"], int)
    
    def test_storage_by_tenant_structure(self):
        """Test that by_tenant contains correct structure"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        data = response.json()
        
        by_tenant = data["storage"]["by_tenant"]
        for tenant_id, tenant_data in by_tenant.items():
            assert "total" in tenant_data
            assert "by_type" in tenant_data
            assert "available_for_kits" in tenant_data
    
    def test_device_available_for_kit_flag(self):
        """Test that devices have available_for_kit flag"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        data = response.json()
        
        for device in data["storage"]["devices"]:
            assert "available_for_kit" in device
            assert isinstance(device["available_for_kit"], bool)


class TestExistingTestData:
    """Tests to verify the existing test data is correct"""
    
    def test_standard_scanner_kit_exists(self):
        """Verify Standard-Scanner-Kit template exists with correct components"""
        response = requests.get(f"{BASE_URL}/api/kit-templates/list?tenant_id=europcar")
        data = response.json()
        
        templates = data["templates"]
        standard_kit = next((t for t in templates if t["name"] == "Standard-Scanner-Kit"), None)
        
        assert standard_kit is not None, "Standard-Scanner-Kit should exist"
        assert standard_kit["tenant_id"] == "europcar"
        assert len(standard_kit["components"]) == 3
        
        # Check components
        component_types = [c["device_type"] for c in standard_kit["components"]]
        assert "tablet" in component_types
        assert "scanner_regula" in component_types
        assert "docking_type1" in component_types
    
    def test_storage_has_required_devices(self):
        """Verify storage has the 3 required devices for europcar"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview?tenant_id=europcar")
        data = response.json()
        
        storage = data["storage"]
        assert storage["total_in_storage"] >= 3, "Should have at least 3 devices in storage"
        
        # Check by_type has required types
        by_type = storage["by_type"]
        assert "tablet" in by_type
        assert "scanner_regula" in by_type
        assert "docking_type1" in by_type
    
    def test_kit_availability_shows_1_possible(self):
        """Verify that 1 kit is possible with current stock"""
        # Get Standard-Scanner-Kit template
        list_response = requests.get(f"{BASE_URL}/api/kit-templates/list?tenant_id=europcar")
        templates = list_response.json()["templates"]
        standard_kit = next((t for t in templates if t["name"] == "Standard-Scanner-Kit"), None)
        
        if standard_kit:
            response = requests.get(f"{BASE_URL}/api/kit-templates/{standard_kit['id']}/availability")
            data = response.json()
            
            assert data["success"] == True
            assert data["possible_kits"] == 1, "Should be able to create exactly 1 kit"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
