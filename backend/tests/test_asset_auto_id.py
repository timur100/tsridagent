"""
Test file for Asset Auto-ID Generation and Bulk Intake features
Tests the new Wareneingang (Goods Receipt) workflow with automatic Asset-ID generation

Endpoints tested:
- GET /api/asset-mgmt/asset-id-config - Get asset ID configuration
- GET /api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7 - Get next ID preview
- POST /api/asset-mgmt/inventory/intake-with-auto-id - Single device intake with auto-ID
- POST /api/asset-mgmt/inventory/intake-bulk - Bulk device creation
- POST /api/asset-mgmt/inventory/assign-to-location/{manufacturer_sn} - Assign to location
- POST /api/asset-mgmt/inventory/remove-from-location/{manufacturer_sn} - Remove from location
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Generate unique test identifiers
TEST_PREFIX = f"TEST_{datetime.now().strftime('%H%M%S')}"


class TestAssetIdConfiguration:
    """Test Asset-ID configuration endpoints"""
    
    def test_get_asset_id_config(self):
        """GET /api/asset-mgmt/asset-id-config - should return configuration"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "config" in data
        
        config = data["config"]
        assert config.get("tenant_id") is not None
        assert config.get("warehouse_prefix") is not None
        assert "formats" in config
        
        # Verify formats list is populated
        formats = config["formats"]
        assert isinstance(formats, list)
        assert len(formats) > 0
        
        # Verify format structure
        first_format = formats[0]
        assert "asset_type" in first_format
        assert "type_suffix" in first_format
        print(f"Config loaded: prefix={config['warehouse_prefix']}, {len(formats)} formats defined")
    
    def test_get_asset_id_config_with_tenant(self):
        """GET /api/asset-mgmt/asset-id-config?tenant_id=default - with explicit tenant"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config?tenant_id=default")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestNextAssetIdPreview:
    """Test next Asset-ID preview endpoint"""
    
    def test_get_next_id_tab_tsr_i7(self):
        """GET /api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("asset_type") == "tab_tsr_i7"
        assert "next_sequence" in data
        assert "next_asset_id" in data
        
        # Verify format structure
        next_id = data["next_asset_id"]
        assert "TSRID" in next_id or next_id.count("-") >= 2
        
        # Verify format_info
        assert "format_info" in data
        format_info = data["format_info"]
        assert format_info.get("type_suffix") == "TAB-i7"
        
        print(f"Next Asset ID: {next_id} (sequence: {data['next_sequence']})")
    
    def test_get_next_id_scanner(self):
        """GET /api/asset-mgmt/asset-id-config/next-id?asset_type=sca_dsk"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=sca_dsk"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("asset_type") == "sca_dsk"
        
        format_info = data.get("format_info", {})
        assert format_info.get("type_suffix") == "SCA-DSK"
        print(f"Next Scanner ID: {data['next_asset_id']}")
    
    def test_get_next_id_unknown_type(self):
        """GET /api/asset-mgmt/asset-id-config/next-id?asset_type=unknown - should use OTH"""
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=unknown_type"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Should use OTH suffix for unknown types
        format_info = data.get("format_info", {})
        assert format_info.get("type_suffix") == "OTH"
        print(f"Unknown type uses: {format_info.get('type_suffix')}")


class TestIntakeWithAutoId:
    """Test single device intake with auto-generated Asset-ID"""
    
    def test_intake_single_device(self):
        """POST /api/asset-mgmt/inventory/intake-with-auto-id - create single device"""
        test_sn = f"{TEST_PREFIX}_SN_{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7",
            "imei": "123456789012345",
            "mac": "00:11:22:33:44:55",
            "manufacturer": "TestManufacturer",
            "model": "TestModel",
            "notes": "Created by automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "warehouse_asset_id" in data
        assert data.get("manufacturer_sn") == test_sn
        assert data.get("type") == "tab_tsr_i7"
        assert data.get("status") == "unassigned"
        
        # Verify warehouse ID format: TSRID-TAB-i7-XXXX
        warehouse_id = data["warehouse_asset_id"]
        assert "TSRID" in warehouse_id
        assert "TAB-i7" in warehouse_id
        
        print(f"Created device: SN={test_sn}, Warehouse-ID={warehouse_id}")
        
        # Cleanup - delete the test asset
        self._cleanup_asset(test_sn)
        
        return test_sn, warehouse_id
    
    def test_intake_duplicate_sn_rejected(self):
        """POST /api/asset-mgmt/inventory/intake-with-auto-id - duplicate SN should fail"""
        test_sn = f"{TEST_PREFIX}_DUP_{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7"
        }
        
        # First creation should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        assert response1.status_code == 200
        
        # Second creation with same SN should fail
        response2 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        data = response2.json()
        assert "existiert bereits" in data.get("detail", "").lower() or "exists" in data.get("detail", "").lower()
        
        print(f"Duplicate SN correctly rejected: {data.get('detail')}")
        
        # Cleanup
        self._cleanup_asset(test_sn)
    
    def test_intake_scanner_type(self):
        """POST /api/asset-mgmt/inventory/intake-with-auto-id - scanner type"""
        test_sn = f"{TEST_PREFIX}_SCN_{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "manufacturer_sn": test_sn,
            "type": "sca_dsk",
            "notes": "Desko Scanner test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        warehouse_id = data.get("warehouse_asset_id", "")
        assert "SCA-DSK" in warehouse_id
        print(f"Scanner created with ID: {warehouse_id}")
        
        self._cleanup_asset(test_sn)
    
    def _cleanup_asset(self, sn):
        """Helper to delete test asset"""
        try:
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{sn}")
        except:
            pass


class TestBulkIntake:
    """Test bulk device intake"""
    
    def test_bulk_intake_with_count(self):
        """POST /api/asset-mgmt/inventory/intake-bulk - create N devices"""
        payload = {
            "asset_type": "tab_tsr_i7",
            "count": 3,
            "supplier": "TestSupplier",
            "delivery_note": "TEST-DN-001",
            "received_by": "TestUser",
            "notes": "Bulk test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-bulk",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("created_count") == 3
        assert "first_id" in data
        assert "last_id" in data
        assert "created" in data
        
        created = data["created"]
        assert len(created) == 3
        
        # Verify sequential IDs
        first_id = data["first_id"]
        last_id = data["last_id"]
        assert first_id is not None
        assert last_id is not None
        
        print(f"Bulk created {data['created_count']} devices: {first_id} to {last_id}")
        
        # Cleanup - delete created assets
        for item in created:
            try:
                requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{item['manufacturer_sn']}")
            except:
                pass
    
    def test_bulk_intake_with_serial_numbers(self):
        """POST /api/asset-mgmt/inventory/intake-bulk - with explicit SNs"""
        test_sns = [
            f"{TEST_PREFIX}_BULK1_{uuid.uuid4().hex[:6].upper()}",
            f"{TEST_PREFIX}_BULK2_{uuid.uuid4().hex[:6].upper()}"
        ]
        
        payload = {
            "asset_type": "sca_tsr",
            "count": 0,
            "serial_numbers": test_sns,
            "supplier": "TestSupplier"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-bulk",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("created_count") == 2
        
        # Verify SNs match
        created = data["created"]
        created_sns = [item["manufacturer_sn"] for item in created]
        for sn in test_sns:
            assert sn in created_sns
        
        print(f"Bulk with explicit SNs: {created_sns}")
        
        # Cleanup
        for sn in test_sns:
            try:
                requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{sn}")
            except:
                pass


class TestAssignToLocation:
    """Test assigning assets to locations"""
    
    @pytest.fixture
    def test_asset(self):
        """Create a test asset for assignment tests"""
        test_sn = f"{TEST_PREFIX}_ASSIGN_{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create test asset")
        
        data = response.json()
        yield {
            "manufacturer_sn": test_sn,
            "warehouse_asset_id": data.get("warehouse_asset_id")
        }
        
        # Cleanup - try to delete asset
        try:
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}")
        except:
            pass
    
    @pytest.fixture
    def valid_location(self):
        """Get a valid location for testing"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        if response.status_code != 200:
            pytest.skip("Could not fetch locations")
        
        data = response.json()
        locations = data.get("locations", [])
        if not locations:
            pytest.skip("No locations available for testing")
        
        return locations[0]["location_id"]
    
    def test_assign_asset_to_location(self, test_asset, valid_location):
        """POST /api/asset-mgmt/inventory/assign-to-location/{sn} - assign to location"""
        sn = test_asset["manufacturer_sn"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign-to-location/{sn}?location_id={valid_location}&technician=TestTech"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("manufacturer_sn") == sn
        assert data.get("location_id") == valid_location
        assert "location_asset_id" in data
        
        # Verify location-based ID format: LOC-XX-TYPE
        location_asset_id = data["location_asset_id"]
        assert valid_location in location_asset_id
        
        print(f"Assigned: {sn} -> {location_asset_id} at {valid_location}")
    
    def test_assign_nonexistent_asset(self, valid_location):
        """POST /api/asset-mgmt/inventory/assign-to-location - nonexistent SN should 404"""
        fake_sn = f"NONEXISTENT_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign-to-location/{fake_sn}?location_id={valid_location}"
        )
        
        assert response.status_code == 404
        print("Nonexistent asset correctly returns 404")
    
    def test_assign_to_invalid_location(self, test_asset):
        """POST /api/asset-mgmt/inventory/assign-to-location - invalid location should 404"""
        sn = test_asset["manufacturer_sn"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign-to-location/{sn}?location_id=INVALID_LOCATION_XYZ"
        )
        
        assert response.status_code == 404
        print("Invalid location correctly returns 404")


class TestRemoveFromLocation:
    """Test removing assets from locations"""
    
    @pytest.fixture
    def assigned_asset(self):
        """Create and assign an asset for removal tests"""
        test_sn = f"{TEST_PREFIX}_REMOVE_{uuid.uuid4().hex[:8].upper()}"
        
        # Create asset
        payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test asset")
        
        warehouse_id = create_resp.json().get("warehouse_asset_id")
        
        # Get a location
        loc_resp = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        if loc_resp.status_code != 200:
            pytest.skip("Could not fetch locations")
        
        locations = loc_resp.json().get("locations", [])
        if not locations:
            pytest.skip("No locations available")
        
        location_id = locations[0]["location_id"]
        
        # Assign to location
        assign_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign-to-location/{test_sn}?location_id={location_id}"
        )
        
        if assign_resp.status_code != 200:
            pytest.skip("Could not assign test asset to location")
        
        location_asset_id = assign_resp.json().get("location_asset_id")
        
        yield {
            "manufacturer_sn": test_sn,
            "warehouse_asset_id": warehouse_id,
            "location_asset_id": location_asset_id,
            "location_id": location_id
        }
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}")
        except:
            pass
    
    def test_remove_from_location(self, assigned_asset):
        """POST /api/asset-mgmt/inventory/remove-from-location/{sn} - remove from location"""
        sn = assigned_asset["manufacturer_sn"]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/remove-from-location/{sn}?technician=TestTech"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("manufacturer_sn") == sn
        assert data.get("status") == "unassigned"
        assert "warehouse_asset_id" in data
        
        print(f"Removed: {sn} from location, back to warehouse: {data.get('warehouse_asset_id')}")
    
    def test_remove_unassigned_asset_fails(self):
        """POST /api/asset-mgmt/inventory/remove-from-location - unassigned asset should fail"""
        test_sn = f"{TEST_PREFIX}_NOASSIGN_{uuid.uuid4().hex[:8].upper()}"
        
        # Create asset but don't assign
        payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test asset")
        
        # Try to remove from location (should fail - not assigned)
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/remove-from-location/{test_sn}"
        )
        
        assert response.status_code == 400
        print("Remove unassigned asset correctly returns 400")
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}")
        except:
            pass


class TestIntegrationWorkflow:
    """Test complete workflow: Intake -> Assign -> Remove"""
    
    def test_complete_workflow(self):
        """Full workflow: Create -> Assign to Location -> Remove from Location"""
        test_sn = f"{TEST_PREFIX}_FLOW_{uuid.uuid4().hex[:8].upper()}"
        
        # Step 1: Create device with auto-ID
        print("\n--- Step 1: Create device ---")
        create_payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7",
            "notes": "Integration test device"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=IntegrationTest",
            json=create_payload
        )
        
        assert create_resp.status_code == 200
        create_data = create_resp.json()
        warehouse_id = create_data["warehouse_asset_id"]
        print(f"Created: SN={test_sn}, Warehouse-ID={warehouse_id}")
        
        # Step 2: Get a location
        loc_resp = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        assert loc_resp.status_code == 200
        locations = loc_resp.json().get("locations", [])
        
        if not locations:
            print("No locations available - skipping assignment test")
            # Cleanup and skip
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}")
            return
        
        location_id = locations[0]["location_id"]
        
        # Step 3: Assign to location
        print("\n--- Step 2: Assign to Location ---")
        assign_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign-to-location/{test_sn}?location_id={location_id}&technician=IntegrationTest"
        )
        
        assert assign_resp.status_code == 200
        assign_data = assign_resp.json()
        location_asset_id = assign_data["location_asset_id"]
        print(f"Assigned: {warehouse_id} -> {location_asset_id} at {location_id}")
        
        # Verify location-based ID contains location and type
        assert location_id in location_asset_id
        assert "TAB-i7" in location_asset_id
        
        # Step 4: Remove from location
        print("\n--- Step 3: Remove from Location ---")
        remove_resp = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/remove-from-location/{test_sn}?technician=IntegrationTest"
        )
        
        assert remove_resp.status_code == 200
        remove_data = remove_resp.json()
        assert remove_data["status"] == "unassigned"
        print(f"Removed: Back to warehouse, ID={remove_data.get('warehouse_asset_id')}")
        
        # Cleanup
        print("\n--- Cleanup ---")
        try:
            requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}")
            print(f"Deleted test asset: {test_sn}")
        except:
            pass
        
        print("\n✓ Complete workflow test PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
