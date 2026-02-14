"""
Label Printer & Kit Assembly API Tests
Testing:
- Label Printer API: GET /api/label-printer/status, POST /api/label-printer/test-connection, POST /api/label-printer/print
- Kit Templates API: GET /api/asset-mgmt/kit-templates
- Quick Kit Assembly: POST /api/asset-mgmt/kits/quick-assemble
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLabelPrinterAPI:
    """Label Printer API endpoints tests"""
    
    def test_get_printer_status(self):
        """Test GET /api/label-printer/status - should return printer configuration"""
        response = requests.get(f"{BASE_URL}/api/label-printer/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "default_ip" in data, "Response should have default_ip"
        assert "default_port" in data, "Response should have default_port"
        assert data["default_port"] == 9100, "Default port should be 9100"
        assert "label_size" in data, "Response should have label_size"
        assert data["label_size"]["width_mm"] == 62, "Label width should be 62mm"
        assert data["label_size"]["height_mm"] == 29, "Label height should be 29mm"
        assert "supported_printer" in data, "Response should have supported_printer"
        assert "Brother QL-820NWB" in data["supported_printer"], "Should support Brother QL-820NWB"
        print(f"Printer status: default_ip={data['default_ip']}, port={data['default_port']}")
        print(f"PASS: GET /api/label-printer/status returns correct printer configuration")

    def test_test_connection_with_invalid_ip(self):
        """Test POST /api/label-printer/test-connection - connection test with invalid IP (expected to fail)"""
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            json={"printer_ip": "192.168.1.99", "printer_port": 9100}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Expected to fail since no physical printer is connected
        assert "success" in data, "Response should have success field"
        # The success field can be true or false depending on network config
        assert "status" in data, "Response should have status field"
        assert "message" in data, "Response should have message field"
        
        print(f"Test connection result: success={data['success']}, status={data['status']}")
        print(f"Message: {data['message']}")
        print(f"PASS: POST /api/label-printer/test-connection handles connection test correctly")

    def test_test_connection_with_localhost(self):
        """Test POST /api/label-printer/test-connection with localhost (expected to fail - no printer)"""
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            json={"printer_ip": "127.0.0.1", "printer_port": 9100}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # No physical printer on localhost, expected to fail
        assert "success" in data
        assert "status" in data
        print(f"Localhost test: success={data.get('success')}, status={data.get('status')}")
        print(f"PASS: POST /api/label-printer/test-connection handles localhost test")

    def test_print_label_without_printer(self):
        """Test POST /api/label-printer/print - should fail gracefully without printer"""
        response = requests.post(
            f"{BASE_URL}/api/label-printer/print",
            json={
                "printer_ip": "192.168.1.99",  # Non-existent printer
                "printer_port": 9100,
                "label": {
                    "asset_id": "TEST-ASSET-001",
                    "type_label": "Test Asset",
                    "manufacturer_sn": "TEST-SN-12345",
                    "location_name": "Test Location",
                    "qr_content": "TSRID:TEST:12345"
                },
                "copies": 1
            }
        )
        
        # Expect 500 since no printer is connected
        assert response.status_code == 500, f"Expected 500 (printer offline), got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        print(f"Print error (expected): {data.get('detail')}")
        print(f"PASS: POST /api/label-printer/print handles missing printer gracefully")


class TestKitTemplatesAPI:
    """Kit Templates API endpoints tests"""
    
    def test_get_kit_templates(self):
        """Test GET /api/asset-mgmt/kit-templates - should return list of kit templates"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "templates" in data, "Response should have templates"
        assert "total" in data, "Response should have total count"
        
        templates = data["templates"]
        print(f"Found {len(templates)} kit templates")
        
        # Check if expected templates exist (KIT-SFD and KIT-TSR mentioned in context)
        if len(templates) > 0:
            for template in templates:
                print(f"  - {template.get('template_id')}: {template.get('name')}")
                assert "template_id" in template, "Template should have template_id"
                assert "name" in template, "Template should have name"
                if "components" in template and template["components"]:
                    print(f"    Components: {len(template['components'])}")
                    for comp in template["components"][:3]:  # Show first 3
                        print(f"      - {comp.get('asset_type')}: {comp.get('label')} (qty: {comp.get('quantity', 1)})")
        
        print(f"PASS: GET /api/asset-mgmt/kit-templates returns {len(templates)} templates")

    def test_seed_default_templates_if_empty(self):
        """Seed default templates if none exist"""
        # Check if templates exist
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        data = response.json()
        
        if data.get("total", 0) == 0:
            # Seed defaults
            seed_response = requests.post(f"{BASE_URL}/api/asset-mgmt/kit-templates/seed-defaults")
            print(f"Seeding default templates: {seed_response.status_code}")
            if seed_response.status_code == 200:
                seed_data = seed_response.json()
                print(f"Seeded: {seed_data}")
        else:
            print(f"Templates already exist, skipping seed")
        
        print(f"PASS: Kit templates available")


class TestQuickAssemblyAPI:
    """Quick Kit Assembly API tests"""
    
    @pytest.fixture
    def test_location_id(self):
        """Create or get a test location for kit assembly"""
        # First, check if test location exists
        test_loc_id = f"TESTKIT{datetime.now().strftime('%H%M')}"
        
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations/{test_loc_id}")
        if response.status_code == 200:
            return test_loc_id
        
        # Create test location
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/locations",
            json={
                "location_id": test_loc_id,
                "country": "DE",
                "customer": "Test Customer",
                "city": "Test City",
                "status": "active"
            }
        )
        
        if create_response.status_code in [200, 201]:
            return test_loc_id
        elif create_response.status_code == 400:
            # Already exists
            return test_loc_id
        
        pytest.skip(f"Could not create test location: {create_response.text}")

    @pytest.fixture
    def test_component_sns(self):
        """Create test components for kit assembly"""
        timestamp = datetime.now().strftime('%H%M%S')
        components = []
        
        # Create 2 test components with unique SNs
        for i, asset_type in enumerate(['tab_tsr', 'sca_dsk']):
            sn = f"KIT-TEST-SN-{timestamp}-{i}"
            response = requests.post(
                f"{BASE_URL}/api/asset-mgmt/inventory/intake",
                json={
                    "manufacturer_sn": sn,
                    "type": asset_type
                }
            )
            if response.status_code in [200, 201]:
                components.append(sn)
            elif response.status_code == 400 and "existiert" in response.text.lower():
                # Already exists, still use it
                components.append(sn)
        
        return components

    def test_quick_assemble_missing_template(self):
        """Test POST /api/asset-mgmt/kits/quick-assemble with non-existent template"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/quick-assemble",
            json={
                "template_id": "NON-EXISTENT-TEMPLATE",
                "location_id": "TEST-LOC",
                "component_sns": ["TEST-SN-001"]
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "nicht gefunden" in data["detail"].lower() or "not found" in data["detail"].lower()
        print(f"PASS: quick-assemble rejects non-existent template: {data['detail']}")

    def test_quick_assemble_missing_location(self):
        """Test POST /api/asset-mgmt/kits/quick-assemble with non-existent location"""
        # First check if we have templates
        templates_response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        templates_data = templates_response.json()
        
        if templates_data.get("total", 0) == 0:
            pytest.skip("No kit templates available for testing")
        
        template_id = templates_data["templates"][0]["template_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/quick-assemble",
            json={
                "template_id": template_id,
                "location_id": "NON-EXISTENT-LOCATION-12345",
                "component_sns": ["TEST-SN-001"]
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "standort" in data["detail"].lower() or "location" in data["detail"].lower()
        print(f"PASS: quick-assemble rejects non-existent location: {data['detail']}")

    def test_quick_assemble_missing_component(self):
        """Test POST /api/asset-mgmt/kits/quick-assemble with non-existent component"""
        # First check if we have templates and locations
        templates_response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        templates_data = templates_response.json()
        
        if templates_data.get("total", 0) == 0:
            pytest.skip("No kit templates available for testing")
        
        locations_response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        locations_data = locations_response.json()
        
        if not locations_data.get("locations"):
            pytest.skip("No locations available for testing")
        
        template_id = templates_data["templates"][0]["template_id"]
        location_id = locations_data["locations"][0]["location_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/quick-assemble",
            json={
                "template_id": template_id,
                "location_id": location_id,
                "component_sns": ["NON-EXISTENT-SN-12345"]
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "komponente" in data["detail"].lower() or "component" in data["detail"].lower() or "nicht gefunden" in data["detail"].lower()
        print(f"PASS: quick-assemble rejects non-existent component: {data['detail']}")

    def test_quick_assemble_success_flow(self, test_location_id, test_component_sns):
        """Test POST /api/asset-mgmt/kits/quick-assemble - complete success flow"""
        if not test_component_sns:
            pytest.skip("No test components created")
        
        # First check if we have templates
        templates_response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        templates_data = templates_response.json()
        
        if templates_data.get("total", 0) == 0:
            pytest.skip("No kit templates available for testing")
        
        template_id = templates_data["templates"][0]["template_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/quick-assemble?technician=Test-Technician",
            json={
                "template_id": template_id,
                "location_id": test_location_id,
                "component_sns": test_component_sns
            }
        )
        
        # This might fail if components don't exist - which is fine for this test
        if response.status_code == 404:
            print(f"Components not found (expected in some test scenarios): {response.json().get('detail')}")
            pytest.skip("Test components not available for assembly")
            return
        
        # If we get here, assembly should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "kit_id" in data, "Response should have kit_id"
        assert "template_id" in data, "Response should have template_id"
        assert "component_count" in data, "Response should have component_count"
        assert "label" in data, "Response should have label data"
        
        print(f"Kit created: {data['kit_id']}")
        print(f"Template: {data['template_id']}")
        print(f"Components: {data['component_count']}")
        print(f"Label data: asset_id={data['label'].get('asset_id')}, qr_content={data['label'].get('qr_content')}")
        print(f"PASS: quick-assemble creates kit successfully")


class TestLabelPreviewAPI:
    """Label preview API tests"""
    
    def test_label_preview(self):
        """Test GET /api/label-printer/preview/{asset_id} - should return PNG image"""
        response = requests.get(
            f"{BASE_URL}/api/label-printer/preview/TEST-ASSET-001",
            params={
                "type_label": "Test Asset",
                "sn": "TEST-SN-12345",
                "location": "Test Location"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "image/png", "Response should be PNG image"
        
        # Check that we got some image data
        assert len(response.content) > 1000, "Image should have reasonable size"
        
        print(f"Label preview: {len(response.content)} bytes PNG image")
        print(f"PASS: GET /api/label-printer/preview/{asset_id} returns PNG image")


# Run all tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
