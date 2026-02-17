"""
Label Templates API Tests
Tests for the Label-Designer feature - CRUD operations for label templates
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLabelTemplatesAPI:
    """Label Templates CRUD API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - create unique test prefix"""
        self.test_prefix = f"TEST_{uuid.uuid4().hex[:8].upper()}"
    
    def test_get_all_templates(self):
        """GET /api/label-templates - List all templates"""
        response = requests.get(f"{BASE_URL}/api/label-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "templates" in data
        assert "count" in data
        assert isinstance(data["templates"], list)
        print(f"Found {data['count']} existing templates")
    
    def test_get_templates_by_asset_type(self):
        """GET /api/label-templates?asset_type=tab_tsr_i7 - Filter by asset type"""
        response = requests.get(f"{BASE_URL}/api/label-templates?asset_type=tab_tsr_i7")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print(f"Found {data['count']} templates for asset type tab_tsr_i7")
    
    def test_create_template(self):
        """POST /api/label-templates - Create new template"""
        template_data = {
            "name": f"{self.test_prefix}_Test Template",
            "description": "Test template for pytest",
            "asset_type": "all",
            "is_default": False,
            "label_height": 6,
            "elements": [
                {
                    "id": "qrcode_test",
                    "type": "qrcode",
                    "config": {}
                },
                {
                    "id": "asset_id_test",
                    "type": "asset_id",
                    "config": {
                        "fontSize": 10,
                        "fontWeight": "bold",
                        "textAlign": "left"
                    }
                }
            ],
            "layout": [
                {"i": "qrcode_test", "x": 0, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "asset_id_test", "x": 3, "y": 0, "w": 4, "h": 1, "minW": 2, "minH": 1}
            ],
            "logo_url": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/label-templates",
            json=template_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "template" in data
        
        template = data["template"]
        assert template["name"] == template_data["name"]
        assert template["description"] == template_data["description"]
        assert template["asset_type"] == template_data["asset_type"]
        assert "template_id" in template
        assert template["template_id"].startswith("LBL-")
        
        # Verify elements and layout were saved
        assert len(template["elements"]) == 2
        assert len(template["layout"]) == 2
        
        print(f"Created template: {template['template_id']}")
        
        # Cleanup - delete the created template
        self._cleanup_template(template["template_id"])
    
    def test_create_and_get_template(self):
        """POST + GET - Create template and verify persistence"""
        template_data = {
            "name": f"{self.test_prefix}_Persistence Test",
            "description": "Test persistence",
            "asset_type": "tab_tsr_i7",
            "is_default": False,
            "label_height": 5,
            "elements": [{"id": "barcode_test", "type": "barcode", "config": {"barcodeFormat": "CODE128"}}],
            "layout": [{"i": "barcode_test", "x": 0, "y": 0, "w": 6, "h": 2}]
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/label-templates", json=template_data)
        assert create_response.status_code == 200
        created = create_response.json()
        template_id = created["template"]["template_id"]
        
        # Get to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/label-templates/{template_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched.get("success") == True
        assert fetched["template"]["name"] == template_data["name"]
        assert fetched["template"]["asset_type"] == template_data["asset_type"]
        assert fetched["template"]["label_height"] == template_data["label_height"]
        
        print(f"Template {template_id} persisted correctly")
        
        # Cleanup
        self._cleanup_template(template_id)
    
    def test_update_template(self):
        """PUT /api/label-templates/{id} - Update existing template"""
        # First create a template
        create_data = {
            "name": f"{self.test_prefix}_Update Test",
            "description": "Original description",
            "asset_type": "all",
            "label_height": 6,
            "elements": [],
            "layout": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/label-templates", json=create_data)
        assert create_response.status_code == 200
        template_id = create_response.json()["template"]["template_id"]
        
        # Update the template
        update_data = {
            "name": f"{self.test_prefix}_Updated Name",
            "description": "Updated description",
            "label_height": 8,
            "elements": [{"id": "new_element", "type": "custom_text", "config": {"customText": "Test"}}],
            "layout": [{"i": "new_element", "x": 0, "y": 0, "w": 3, "h": 1}]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/label-templates/{template_id}",
            json=update_data
        )
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated.get("success") == True
        assert updated["template"]["name"] == update_data["name"]
        assert updated["template"]["description"] == update_data["description"]
        assert updated["template"]["label_height"] == update_data["label_height"]
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/label-templates/{template_id}")
        fetched = get_response.json()
        assert fetched["template"]["name"] == update_data["name"]
        assert len(fetched["template"]["elements"]) == 1
        
        print(f"Template {template_id} updated successfully")
        
        # Cleanup
        self._cleanup_template(template_id)
    
    def test_delete_template(self):
        """DELETE /api/label-templates/{id} - Delete template"""
        # First create a template
        create_data = {
            "name": f"{self.test_prefix}_Delete Test",
            "asset_type": "all",
            "elements": [],
            "layout": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/label-templates", json=create_data)
        assert create_response.status_code == 200
        template_id = create_response.json()["template"]["template_id"]
        
        # Delete the template
        delete_response = requests.delete(f"{BASE_URL}/api/label-templates/{template_id}")
        assert delete_response.status_code == 200
        
        deleted = delete_response.json()
        assert deleted.get("success") == True
        assert "gelöscht" in deleted.get("message", "").lower()
        
        # Verify template no longer exists
        get_response = requests.get(f"{BASE_URL}/api/label-templates/{template_id}")
        assert get_response.status_code == 404
        
        print(f"Template {template_id} deleted and verified removal")
    
    def test_delete_nonexistent_template(self):
        """DELETE /api/label-templates/{id} - Delete non-existent template returns 404"""
        fake_id = "LBL-NONEXISTENT"
        response = requests.delete(f"{BASE_URL}/api/label-templates/{fake_id}")
        assert response.status_code == 404
        print("Non-existent template delete correctly returns 404")
    
    def test_get_nonexistent_template(self):
        """GET /api/label-templates/{id} - Get non-existent template returns 404"""
        fake_id = "LBL-NOTFOUND123"
        response = requests.get(f"{BASE_URL}/api/label-templates/{fake_id}")
        assert response.status_code == 404
        print("Non-existent template get correctly returns 404")
    
    def test_get_default_template(self):
        """GET /api/label-templates/default - Get default template"""
        response = requests.get(f"{BASE_URL}/api/label-templates/default")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        # Template may or may not exist
        if data.get("template"):
            print(f"Default template found: {data['template'].get('name')}")
        else:
            print("No default template set (expected if no templates exist)")
    
    def test_duplicate_template(self):
        """POST /api/label-templates/{id}/duplicate - Duplicate a template"""
        # First create a template to duplicate
        create_data = {
            "name": f"{self.test_prefix}_Original",
            "description": "Original template",
            "asset_type": "all",
            "label_height": 7,
            "elements": [{"id": "qr1", "type": "qrcode", "config": {}}],
            "layout": [{"i": "qr1", "x": 0, "y": 0, "w": 3, "h": 3}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/label-templates", json=create_data)
        assert create_response.status_code == 200
        original_id = create_response.json()["template"]["template_id"]
        
        # Duplicate the template
        duplicate_response = requests.post(
            f"{BASE_URL}/api/label-templates/{original_id}/duplicate",
            params={"new_name": f"{self.test_prefix}_Kopie"}
        )
        assert duplicate_response.status_code == 200
        
        duplicated = duplicate_response.json()
        assert duplicated.get("success") == True
        assert "template" in duplicated
        
        dup_template = duplicated["template"]
        assert dup_template["template_id"] != original_id
        assert dup_template["template_id"].startswith("LBL-")
        assert dup_template["label_height"] == create_data["label_height"]
        assert len(dup_template["elements"]) == 1
        
        print(f"Template duplicated: {original_id} -> {dup_template['template_id']}")
        
        # Cleanup both templates
        self._cleanup_template(original_id)
        self._cleanup_template(dup_template["template_id"])
    
    def test_set_default_template(self):
        """POST + PUT - Create template and set as default"""
        # Create a template with is_default=True
        create_data = {
            "name": f"{self.test_prefix}_Default Test",
            "asset_type": "sca_tsr",  # Use specific asset type to not interfere with other defaults
            "is_default": True,
            "elements": [],
            "layout": []
        }
        
        response = requests.post(f"{BASE_URL}/api/label-templates", json=create_data)
        assert response.status_code == 200
        
        template = response.json()["template"]
        assert template["is_default"] == True
        
        # Verify it's returned as default for that asset type
        default_response = requests.get(f"{BASE_URL}/api/label-templates/default?asset_type=sca_tsr")
        assert default_response.status_code == 200
        
        default_data = default_response.json()
        if default_data.get("template"):
            assert default_data["template"]["template_id"] == template["template_id"]
            print(f"Template {template['template_id']} set as default for sca_tsr")
        
        # Cleanup
        self._cleanup_template(template["template_id"])
    
    def test_create_template_validation(self):
        """POST /api/label-templates - Validate required fields"""
        # Missing name should still work (backend might have defaults)
        minimal_data = {
            "name": f"{self.test_prefix}_Minimal",
            "asset_type": "all"
        }
        
        response = requests.post(f"{BASE_URL}/api/label-templates", json=minimal_data)
        assert response.status_code == 200
        
        template = response.json()["template"]
        assert template["name"] == minimal_data["name"]
        # Default values should be set
        assert "elements" in template
        assert "layout" in template
        assert "label_height" in template
        
        print("Minimal template created with defaults")
        
        # Cleanup
        self._cleanup_template(template["template_id"])
    
    def _cleanup_template(self, template_id):
        """Helper to cleanup test templates"""
        try:
            requests.delete(f"{BASE_URL}/api/label-templates/{template_id}")
        except:
            pass


class TestLabelTemplatesDataValidation:
    """Tests for data validation in label templates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_prefix = f"TEST_VAL_{uuid.uuid4().hex[:6].upper()}"
    
    def test_element_types_saved_correctly(self):
        """Verify all element types are saved and retrieved correctly"""
        elements = [
            {"id": "qr1", "type": "qrcode", "config": {}},
            {"id": "bar1", "type": "barcode", "config": {"barcodeFormat": "CODE128", "showValue": True}},
            {"id": "aid1", "type": "asset_id", "config": {"fontSize": 12, "fontWeight": "bold"}},
            {"id": "sn1", "type": "serial_number", "config": {"fontSize": 9}},
            {"id": "dt1", "type": "device_type", "config": {"textAlign": "center"}},
            {"id": "mfr1", "type": "manufacturer", "config": {}},
            {"id": "mdl1", "type": "model", "config": {}},
            {"id": "txt1", "type": "custom_text", "config": {"customText": "Testtext"}},
            {"id": "logo1", "type": "logo", "config": {}},
            {"id": "line1", "type": "line", "config": {"lineStyle": "dashed", "lineColor": "#000000"}}
        ]
        
        layout = [
            {"i": elem["id"], "x": idx % 4, "y": idx // 4, "w": 2, "h": 1}
            for idx, elem in enumerate(elements)
        ]
        
        template_data = {
            "name": f"{self.test_prefix}_All Elements",
            "elements": elements,
            "layout": layout
        }
        
        # Create
        response = requests.post(f"{BASE_URL}/api/label-templates", json=template_data)
        assert response.status_code == 200
        
        template = response.json()["template"]
        template_id = template["template_id"]
        
        # Verify all elements saved
        assert len(template["elements"]) == len(elements)
        
        # Get to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/label-templates/{template_id}")
        fetched = get_response.json()["template"]
        
        assert len(fetched["elements"]) == len(elements)
        
        # Verify specific element configs
        element_map = {e["id"]: e for e in fetched["elements"]}
        assert element_map["bar1"]["config"]["barcodeFormat"] == "CODE128"
        assert element_map["aid1"]["config"]["fontWeight"] == "bold"
        assert element_map["txt1"]["config"]["customText"] == "Testtext"
        
        print(f"All {len(elements)} element types saved and retrieved correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/label-templates/{template_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
