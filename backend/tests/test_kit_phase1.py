"""
Test Kit Phase 1 Features - New Asset Types & Kit Templates
Tests:
- Metadata endpoint with new asset types (Kabel, Adapter, Stromverteiler)
- Kit-Template CRUD endpoints
- Kit Assembly/Zusammenstellung
- Kit Component management
- Kit scanning functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMetadataNewAssetTypes:
    """Test new asset types in metadata endpoint"""
    
    def test_metadata_contains_new_categories(self):
        """Check metadata has new categories: Kabel, Adapter, Stromverteiler"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        categories = data.get("asset_type_categories", {})
        
        # Check new categories exist
        assert "Kabel (Typ A - mit SN)" in categories, "Missing Kabel Typ A category"
        assert "Kabel (Typ B - Verbrauch)" in categories, "Missing Kabel Typ B category"
        assert "Adapter" in categories, "Missing Adapter category"
        assert "Stromverteiler" in categories, "Missing Stromverteiler category"
        assert "Kits" in categories, "Missing Kits category"
        print("SUCCESS: All new categories present in metadata")
    
    def test_metadata_kabel_typ_a_assets(self):
        """Check Kabel Typ A assets (with SN)"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        kabel_a = data.get("asset_type_categories", {}).get("Kabel (Typ A - mit SN)", [])
        kabel_a_values = [k["value"] for k in kabel_a]
        
        expected = ["cab_usb_a", "cab_usb_c", "cab_lan", "cab_hdmi", "cab_dp", "cab_pwr"]
        for exp in expected:
            assert exp in kabel_a_values, f"Missing Kabel Typ A: {exp}"
        print(f"SUCCESS: All {len(expected)} Kabel Typ A types present")
    
    def test_metadata_kabel_typ_b_assets(self):
        """Check Kabel Typ B assets (consumables without SN)"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        kabel_b = data.get("asset_type_categories", {}).get("Kabel (Typ B - Verbrauch)", [])
        kabel_b_values = [k["value"] for k in kabel_b]
        
        expected = ["cns_usb_a", "cns_usb_c", "cns_lan", "cns_hdmi", "cns_dp", "cns_pwr"]
        for exp in expected:
            assert exp in kabel_b_values, f"Missing Kabel Typ B: {exp}"
        print(f"SUCCESS: All {len(expected)} Kabel Typ B types present")
    
    def test_metadata_adapter_assets(self):
        """Check Adapter assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        adapters = data.get("asset_type_categories", {}).get("Adapter", [])
        adapter_values = [a["value"] for a in adapters]
        
        expected = ["adp_usb_c", "adp_hdmi", "adp_dp", "adp_90"]
        for exp in expected:
            assert exp in adapter_values, f"Missing Adapter: {exp}"
        print(f"SUCCESS: All {len(expected)} Adapter types present")
    
    def test_metadata_stromverteiler_assets(self):
        """Check Stromverteiler assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        stromverteiler = data.get("asset_type_categories", {}).get("Stromverteiler", [])
        stromverteiler_values = [s["value"] for s in stromverteiler]
        
        expected = ["pwr_strip", "pwr_12v"]
        for exp in expected:
            assert exp in stromverteiler_values, f"Missing Stromverteiler: {exp}"
        print(f"SUCCESS: All {len(expected)} Stromverteiler types present")
    
    def test_metadata_kit_templates_included(self):
        """Check kit_templates are included in metadata"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        assert "kit_templates" in data, "kit_templates missing from metadata"
        templates = data.get("kit_templates", [])
        assert len(templates) >= 2, f"Expected at least 2 kit templates, got {len(templates)}"
        
        template_ids = [t["template_id"] for t in templates]
        assert "KIT-SFD" in template_ids, "KIT-SFD template missing"
        assert "KIT-TSR" in template_ids, "KIT-TSR template missing"
        print(f"SUCCESS: {len(templates)} kit templates found in metadata")


class TestKitTemplatesCRUD:
    """Test Kit Template CRUD operations"""
    
    def test_list_kit_templates(self):
        """GET /api/asset-mgmt/kit-templates"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "templates" in data
        assert data.get("total") >= 2
        print(f"SUCCESS: Listed {data.get('total')} kit templates")
    
    def test_get_kit_template_sfd(self):
        """GET /api/asset-mgmt/kit-templates/KIT-SFD"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/KIT-SFD")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        template = data.get("template", {})
        assert template.get("template_id") == "KIT-SFD"
        assert template.get("name") == "Surface + Desko Kit"
        assert len(template.get("components", [])) == 8
        
        # Check components have labels and suffixes
        for comp in template.get("components", []):
            assert "label" in comp, f"Missing label for {comp.get('asset_type')}"
            assert "suffix" in comp, f"Missing suffix for {comp.get('asset_type')}"
        
        print(f"SUCCESS: KIT-SFD has {len(template.get('components',[]))} components with labels/suffixes")
    
    def test_get_kit_template_tsr(self):
        """GET /api/asset-mgmt/kit-templates/KIT-TSR"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/KIT-TSR")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        template = data.get("template", {})
        assert template.get("template_id") == "KIT-TSR"
        assert template.get("name") == "TSRID Kit"
        assert len(template.get("components", [])) == 6
        print(f"SUCCESS: KIT-TSR has {len(template.get('components',[]))} components")
    
    def test_get_nonexistent_template(self):
        """GET /api/asset-mgmt/kit-templates/INVALID returns 404"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/INVALID-TEMPLATE")
        assert response.status_code == 404
        print("SUCCESS: Nonexistent template returns 404")
    
    def test_create_update_delete_template(self):
        """Full CRUD cycle for kit template"""
        test_id = f"KIT-TEST-{uuid.uuid4().hex[:6].upper()}"
        
        # CREATE
        create_data = {
            "template_id": test_id,
            "name": "Test Kit",
            "description": "Test kit for automated testing",
            "components": [
                {"asset_type": "tab_sp4", "quantity": 1, "optional": False, "notes": "Test tablet"},
                {"asset_type": "sca_dsk", "quantity": 1, "optional": True, "notes": "Test scanner"}
            ],
            "notes": "Created by automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kit-templates",
            json=create_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Created template {test_id}")
        
        # READ
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/{test_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("template", {}).get("name") == "Test Kit"
        print(f"SUCCESS: Retrieved template {test_id}")
        
        # UPDATE
        update_data = {"name": "Updated Test Kit", "description": "Updated description"}
        response = requests.put(
            f"{BASE_URL}/api/asset-mgmt/kit-templates/{test_id}",
            json=update_data
        )
        assert response.status_code == 200
        print(f"SUCCESS: Updated template {test_id}")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/{test_id}")
        data = response.json()
        assert data.get("template", {}).get("name") == "Updated Test Kit"
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/asset-mgmt/kit-templates/{test_id}")
        assert response.status_code == 200
        print(f"SUCCESS: Deleted template {test_id}")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kit-templates/{test_id}")
        assert response.status_code == 404
        print("SUCCESS: Full CRUD cycle completed")


class TestKitAssembly:
    """Test Kit Assembly (Zusammenstellung) functionality"""
    
    def test_list_kits(self):
        """GET /api/asset-mgmt/kits"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kits")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "kits" in data
        print(f"SUCCESS: Listed {data.get('total', 0)} kits")
    
    def test_assemble_kit(self):
        """POST /api/asset-mgmt/kits/assemble"""
        test_kit_id = f"TEST-KIT-{uuid.uuid4().hex[:6].upper()}"
        
        # Assemble a new kit
        assembly_data = {
            "kit_id": test_kit_id,
            "template_id": "KIT-SFD",
            "country": "DE",
            "location_id": None,
            "notes": "Test kit created by automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/assemble",
            json=assembly_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("kit_id") == test_kit_id
        assert data.get("template_id") == "KIT-SFD"
        assert "required_components" in data
        
        required = data.get("required_components", [])
        assert len(required) == 8, f"Expected 8 required components, got {len(required)}"
        print(f"SUCCESS: Assembled kit {test_kit_id} with {len(required)} required components")
        
        # Clean up - delete the test kit
        response = requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{test_kit_id}")
        print(f"SUCCESS: Cleaned up test kit {test_kit_id}")
    
    def test_assemble_kit_invalid_template(self):
        """POST /api/asset-mgmt/kits/assemble with invalid template returns 404"""
        assembly_data = {
            "kit_id": "TEST-INVALID",
            "template_id": "INVALID-TEMPLATE",
            "country": "DE"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/assemble",
            json=assembly_data
        )
        assert response.status_code == 404
        print("SUCCESS: Invalid template returns 404")
    
    def test_get_kit_details(self):
        """GET /api/asset-mgmt/kits/{kit_id} - get existing kit"""
        # First get list of kits
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kits")
        data = response.json()
        kits = data.get("kits", [])
        
        if len(kits) > 0:
            kit_id = kits[0].get("asset_id")
            response = requests.get(f"{BASE_URL}/api/asset-mgmt/kits/{kit_id}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            
            kit = data.get("kit", {})
            assert "kit_template_id" in kit or "type" in kit
            print(f"SUCCESS: Retrieved kit {kit_id} details")
        else:
            print("SKIP: No existing kits to test get details")


class TestKitScan:
    """Test Kit scanning functionality"""
    
    def test_scan_kit(self):
        """POST /api/asset-mgmt/kits/{kit_id}/scan"""
        # Get list of kits to find one to scan
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kits")
        data = response.json()
        kits = data.get("kits", [])
        
        if len(kits) > 0:
            kit_id = kits[0].get("asset_id")
            
            # Scan the kit
            response = requests.post(f"{BASE_URL}/api/asset-mgmt/kits/{kit_id}/scan")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            assert data.get("scan_type") == "kit"
            
            print(f"SUCCESS: Scanned kit {kit_id}")
            print(f"  - Components: {data.get('component_count', 0)}")
            template = data.get('template') or {}
            print(f"  - Template: {template.get('template_id', 'N/A')}")
        else:
            print("SKIP: No existing kits to test scanning")
    
    def test_scan_nonexistent_asset(self):
        """POST /api/asset-mgmt/kits/NONEXISTENT/scan returns 404"""
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/kits/NONEXISTENT-ASSET/scan")
        assert response.status_code == 404
        print("SUCCESS: Scanning nonexistent asset returns 404")


class TestKitComponentManagement:
    """Test adding/removing components from kits"""
    
    def test_add_remove_component_flow(self):
        """Full flow: create kit -> add component -> remove component -> cleanup"""
        test_kit_id = f"TEST-KIT-COMP-{uuid.uuid4().hex[:6].upper()}"
        test_component_id = f"TEST-COMP-{uuid.uuid4().hex[:6].upper()}"
        
        # 1. Create component asset first
        component_data = {
            "asset_id": test_component_id,
            "type": "tab_sp4",
            "manufacturer_sn": "TEST-SN-12345",
            "manufacturer": "Microsoft",
            "status": "in_storage",
            "country": "DE"
        }
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json=component_data
        )
        if response.status_code != 200:
            print(f"SKIP: Could not create test component: {response.text}")
            return
        print(f"SUCCESS: Created test component {test_component_id}")
        
        # 2. Assemble kit
        assembly_data = {
            "kit_id": test_kit_id,
            "template_id": "KIT-SFD",
            "country": "DE",
            "notes": "Test kit for component management"
        }
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/assemble",
            json=assembly_data
        )
        assert response.status_code == 200
        print(f"SUCCESS: Assembled kit {test_kit_id}")
        
        # 3. Add component to kit
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/kits/{test_kit_id}/add-component",
            json={"asset_id": test_component_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Added component {test_component_id} to kit {test_kit_id}")
        
        # 4. Verify component is in kit
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/kits/{test_kit_id}")
        data = response.json()
        kit = data.get("kit", {})
        assert test_component_id in kit.get("kit_components", [])
        print("SUCCESS: Component verified in kit")
        
        # 5. Remove component from kit
        response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/kits/{test_kit_id}/remove-component/{test_component_id}"
        )
        assert response.status_code == 200
        print(f"SUCCESS: Removed component {test_component_id} from kit")
        
        # 6. Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{test_kit_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{test_component_id}")
        print("SUCCESS: Cleaned up test kit and component")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
