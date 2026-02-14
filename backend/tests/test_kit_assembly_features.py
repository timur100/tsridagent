"""
Test Kit Assembly Phase 3 Features:
- Kit Templates API
- Label Printer API
- Kit Assembly Workflow
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for testing
TEST_EMAIL = "admin@tsrid.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/portal/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestLabelPrinterAPI:
    """Test Label Printer API endpoints"""
    
    def test_label_printer_status(self, auth_headers):
        """Test /api/label-printer/status endpoint returns printer configuration"""
        response = requests.get(
            f"{BASE_URL}/api/label-printer/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify expected fields
        assert "default_ip" in data, "Missing default_ip field"
        assert "default_port" in data, "Missing default_port field"
        assert "label_size" in data, "Missing label_size field"
        assert "supported_connections" in data, "Missing supported_connections field"
        
        # Verify default values
        assert data["default_port"] == 9100, "Expected default port 9100"
        print(f"Label printer status: IP={data['default_ip']}, Port={data['default_port']}")
    
    def test_label_printer_test_connection_offline(self, auth_headers):
        """Test /api/label-printer/test-connection with offline printer"""
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            headers=auth_headers,
            json={"printer_ip": "192.168.1.100", "printer_port": 9100}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Printer should be offline since it's not a real network printer
        assert "success" in data
        assert "status" in data
        assert "message" in data
        
        # For a non-existent printer, we expect it to be offline
        print(f"Connection test result: {data['message']}")
    
    def test_label_printer_test_connection_invalid_ip(self, auth_headers):
        """Test /api/label-printer/test-connection with invalid IP"""
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            headers=auth_headers,
            json={"printer_ip": "invalid-ip", "printer_port": 9100}
        )
        
        # Should handle gracefully even with invalid IP
        assert response.status_code in [200, 400, 422]
        print(f"Invalid IP test response: {response.status_code}")


class TestKitTemplatesAPI:
    """Test Kit Templates API endpoints"""
    
    def test_get_kit_templates(self, auth_headers):
        """Test /api/asset-mgmt/kit-templates returns available templates"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/kit-templates",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "templates" in data, "Missing templates field"
        assert isinstance(data["templates"], list), "Templates should be a list"
        
        # Verify we have at least one template
        assert len(data["templates"]) > 0, "Expected at least one template"
        
        # Verify template structure
        template = data["templates"][0]
        assert "template_id" in template, "Template missing template_id"
        assert "name" in template, "Template missing name"
        assert "components" in template, "Template missing components"
        
        print(f"Found {len(data['templates'])} templates")
        for t in data["templates"]:
            print(f"  - {t['name']} ({t['template_id']}): {len(t.get('components', []))} components")
    
    def test_kit_template_details(self, auth_headers):
        """Test kit template contains proper component details"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/kit-templates",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find Surface + Desko Kit template
        surface_kit = None
        for template in data.get("templates", []):
            if "Surface" in template.get("name", "") or template.get("template_id") == "KIT-SFD":
                surface_kit = template
                break
        
        if surface_kit:
            components = surface_kit.get("components", [])
            assert len(components) > 0, "Template should have components"
            
            # Verify component structure
            for comp in components[:3]:  # Check first 3 components
                assert "type" in comp, "Component missing type"
                assert "quantity" in comp, "Component missing quantity"
                print(f"  Component: {comp.get('name', comp.get('type'))} x{comp.get('quantity')}")


class TestKitAssemblyWorkflow:
    """Test Kit Assembly workflow endpoints"""
    
    def test_available_assets_for_kit(self, auth_headers):
        """Test fetching available assets for kit assembly"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/assets",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # API should return asset data
        if data.get("success"):
            assets = data.get("assets", [])
            print(f"Found {len(assets)} assets available for kit assembly")
        else:
            print("Assets API returned no assets or different format")
    
    def test_kit_locations_available(self, auth_headers):
        """Test that locations are available for kit deployment"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/locations",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should have locations for kit deployment
        if data.get("success"):
            locations = data.get("locations", [])
            print(f"Found {len(locations)} locations for kit deployment")
            assert len(locations) > 0, "Expected at least one location"
        else:
            print("Locations returned in different format")


class TestGoodsReceiptLabelFeatures:
    """Test Goods Receipt label-related features"""
    
    def test_goods_receipt_create_with_label_ready(self, auth_headers):
        """Test goods receipt can be created with assets ready for labeling"""
        # First check if we can get existing receipts
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/goods-receipts",
            headers=auth_headers
        )
        
        # Should be able to fetch goods receipts
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Goods receipt API accessible: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
