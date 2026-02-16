"""
Test Asset Intake and Unassigned List - Bug Fix Verification

Bug Report: 'gescannte Lager-ID erscheint nicht bei Nicht zugewiesen - ganzer datensatz fehlt'
(scanned warehouse ID does not appear in unassigned list - whole record missing)

This test verifies:
1. POST /api/asset-mgmt/inventory/intake-with-auto-id creates asset correctly
2. GET /api/asset-mgmt/inventory/unassigned returns newly created assets
3. The unassigned count updates after creation
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAssetIntakeUnassignedBugFix:
    """Test the asset intake -> unassigned list flow (bug fix verification)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with unique serial number"""
        self.test_sn = f"TEST-BUG-{uuid.uuid4().hex[:8].upper()}"
        self.created_asset_ids = []
        yield
        # Cleanup: Delete test assets
        for sn in self.created_asset_ids:
            try:
                requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{sn}")
            except:
                pass
    
    def test_01_get_initial_unassigned_count(self):
        """GET /api/asset-mgmt/inventory/unassigned - Get initial count"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") is True, "API should return success=True"
        assert "total" in data, "Response should contain total count"
        assert "assets" in data, "Response should contain assets list"
        assert "type_summary" in data, "Response should contain type_summary"
        
        print(f"Initial unassigned count: {data['total']}")
        return data['total']
    
    def test_02_create_asset_and_verify_in_unassigned(self):
        """
        BUG FIX TEST: Create asset with intake-with-auto-id 
        and immediately verify it appears in unassigned list
        """
        # Step 1: Get initial count
        initial_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        assert initial_response.status_code == 200
        initial_count = initial_response.json().get("total", 0)
        print(f"Initial unassigned count: {initial_count}")
        
        # Step 2: Create new asset via intake-with-auto-id
        intake_payload = {
            "manufacturer_sn": self.test_sn,
            "type": "tab_tsr_i7"  # TSRID Tablet i7
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=intake_payload
        )
        
        assert create_response.status_code == 200, f"Asset creation failed: {create_response.text}"
        create_data = create_response.json()
        
        assert create_data.get("success") is True, "Asset creation should succeed"
        assert "warehouse_asset_id" in create_data, "Response should contain warehouse_asset_id"
        
        warehouse_id = create_data["warehouse_asset_id"]
        self.created_asset_ids.append(self.test_sn)
        print(f"Created asset: SN={self.test_sn}, Warehouse ID={warehouse_id}")
        
        # Step 3: CRITICAL - Immediately fetch unassigned list and verify asset appears
        unassigned_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=100")
        assert unassigned_response.status_code == 200, f"Unassigned list fetch failed: {unassigned_response.text}"
        
        unassigned_data = unassigned_response.json()
        assert unassigned_data.get("success") is True
        
        new_count = unassigned_data.get("total", 0)
        print(f"New unassigned count: {new_count}")
        
        # Verify count increased
        assert new_count > initial_count, f"Unassigned count should have increased from {initial_count} to {new_count}"
        
        # Verify the specific asset appears in the list
        assets = unassigned_data.get("assets", [])
        asset_sns = [a.get("manufacturer_sn") for a in assets]
        
        assert self.test_sn in asset_sns, f"Newly created asset {self.test_sn} should appear in unassigned list"
        
        # Find our specific asset and verify its data
        our_asset = next((a for a in assets if a.get("manufacturer_sn") == self.test_sn), None)
        assert our_asset is not None, "Our created asset should be in the list"
        assert our_asset.get("warehouse_asset_id") == warehouse_id, "Warehouse ID should match"
        assert our_asset.get("status") == "unassigned", "Status should be 'unassigned'"
        assert our_asset.get("type") == "tab_tsr_i7", "Type should match"
        
        print(f"SUCCESS: Asset {self.test_sn} correctly appears in unassigned list with warehouse_id={warehouse_id}")
    
    def test_03_create_multiple_assets_and_verify_count_update(self):
        """Create multiple assets and verify unassigned count updates correctly"""
        # Get initial count
        initial_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        initial_count = initial_response.json().get("total", 0)
        
        # Create 3 assets
        created_sns = []
        for i in range(3):
            sn = f"TEST-MULTI-{uuid.uuid4().hex[:6].upper()}-{i}"
            payload = {
                "manufacturer_sn": sn,
                "type": "sca_dsk"  # Desko Scanner
            }
            response = requests.post(
                f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
                json=payload
            )
            assert response.status_code == 200, f"Failed to create asset {i}: {response.text}"
            created_sns.append(sn)
            self.created_asset_ids.append(sn)
        
        print(f"Created 3 assets: {created_sns}")
        
        # Verify count increased by 3
        final_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        final_count = final_response.json().get("total", 0)
        
        assert final_count == initial_count + 3, f"Count should increase by 3: {initial_count} -> {final_count}"
        
        # Verify type_summary updated
        summary = final_response.json().get("type_summary", {})
        assert "sca_dsk" in summary, "type_summary should include sca_dsk"
        print(f"Type summary: {summary}")
        print(f"SUCCESS: Count correctly updated from {initial_count} to {final_count}")
    
    def test_04_search_unassigned_by_serial_number(self):
        """Test searching unassigned assets by serial number"""
        # Create a uniquely identifiable asset
        unique_sn = f"SEARCH-TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "manufacturer_sn": unique_sn,
            "type": "cab_usb_c"  # USB-C Cable
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        assert create_response.status_code == 200
        self.created_asset_ids.append(unique_sn)
        
        # Search by serial number
        search_response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search={unique_sn}"
        )
        assert search_response.status_code == 200
        
        data = search_response.json()
        assert data.get("success") is True
        
        assets = data.get("assets", [])
        assert len(assets) >= 1, f"Should find at least 1 asset with search '{unique_sn}'"
        
        # First result should be our asset
        found = any(a.get("manufacturer_sn") == unique_sn for a in assets)
        assert found, f"Asset {unique_sn} should be found in search results"
        
        print(f"SUCCESS: Search found asset {unique_sn}")
    
    def test_05_filter_unassigned_by_type(self):
        """Test filtering unassigned assets by type"""
        # Create asset with specific type
        unique_sn = f"FILTER-TEST-{uuid.uuid4().hex[:8].upper()}"
        target_type = "adp_usb_c"  # USB-C Adapter
        
        payload = {
            "manufacturer_sn": unique_sn,
            "type": target_type
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        assert create_response.status_code == 200
        self.created_asset_ids.append(unique_sn)
        
        # Filter by type
        filter_response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?type={target_type}"
        )
        assert filter_response.status_code == 200
        
        data = filter_response.json()
        assets = data.get("assets", [])
        
        # All returned assets should be of the specified type
        for asset in assets:
            assert asset.get("type") == target_type, f"All assets should be type {target_type}"
        
        # Our asset should be in the results
        found = any(a.get("manufacturer_sn") == unique_sn for a in assets)
        assert found, f"Asset {unique_sn} should be in filtered results"
        
        print(f"SUCCESS: Type filter works correctly for {target_type}")
    
    def test_06_delete_unassigned_asset(self):
        """Test deleting an unassigned asset"""
        # Create an asset to delete
        unique_sn = f"DELETE-TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "manufacturer_sn": unique_sn,
            "type": "other"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        assert create_response.status_code == 200
        
        # Get count before delete
        before_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        before_count = before_response.json().get("total", 0)
        
        # Delete the asset
        delete_response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{unique_sn}"
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") is True
        
        # Verify count decreased
        after_response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        after_count = after_response.json().get("total", 0)
        
        assert after_count == before_count - 1, f"Count should decrease by 1: {before_count} -> {after_count}"
        
        # Verify asset no longer in list
        search_response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search={unique_sn}"
        )
        search_data = search_response.json()
        assets = search_data.get("assets", [])
        found = any(a.get("manufacturer_sn") == unique_sn for a in assets)
        assert not found, "Deleted asset should not appear in list"
        
        print(f"SUCCESS: Asset {unique_sn} deleted successfully")


class TestAssetIntakeValidation:
    """Test intake validation rules"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_assets = []
        yield
        # Cleanup
        for sn in self.created_assets:
            try:
                requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{sn}")
            except:
                pass
    
    def test_intake_requires_received_by(self):
        """Intake should fail without received_by parameter"""
        payload = {
            "manufacturer_sn": f"TEST-VAL-{uuid.uuid4().hex[:8]}",
            "type": "tab_tsr_i7"
        }
        
        # Without received_by
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=payload
        )
        
        assert response.status_code == 400, "Should fail without received_by"
        data = response.json()
        assert "erforderlich" in str(data.get("detail", "")).lower() or "required" in str(data.get("detail", "")).lower()
        print("SUCCESS: Validation correctly rejects missing received_by")
    
    def test_intake_duplicate_serial_number_rejected(self):
        """Intake should reject duplicate serial numbers"""
        unique_sn = f"DUP-TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "manufacturer_sn": unique_sn,
            "type": "tab_tsr_i7"
        }
        
        # First creation should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        assert response1.status_code == 200, f"First creation should succeed: {response1.text}"
        self.created_assets.append(unique_sn)
        
        # Second creation with same SN should fail
        response2 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestUser",
            json=payload
        )
        assert response2.status_code == 400, f"Duplicate SN should be rejected: {response2.text}"
        
        data = response2.json()
        assert "existiert bereits" in str(data.get("detail", "")).lower() or "exists" in str(data.get("detail", "")).lower()
        print(f"SUCCESS: Duplicate SN '{unique_sn}' correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
