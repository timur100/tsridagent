"""
Tests for Suppliers Dropdown and Delete Unassigned Assets Features
- GET /api/asset-mgmt/suppliers: List all suppliers
- DELETE /api/asset-mgmt/inventory/unassigned/{sn}: Delete single unassigned asset
- DELETE /api/asset-mgmt/inventory/unassigned/bulk: Delete multiple unassigned assets
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSuppliersEndpoint:
    """Tests for suppliers dropdown API"""
    
    def test_get_suppliers_returns_success(self):
        """Test that GET /api/asset-mgmt/suppliers returns success"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        print(f"TEST PASSED: Suppliers endpoint returns success")
    
    def test_get_suppliers_returns_list(self):
        """Test that suppliers endpoint returns a list of suppliers"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/suppliers")
        assert response.status_code == 200
        data = response.json()
        
        assert "suppliers" in data
        assert isinstance(data["suppliers"], list)
        assert len(data["suppliers"]) > 0
        print(f"TEST PASSED: Suppliers list contains {len(data['suppliers'])} suppliers")
        print(f"Suppliers: {data['suppliers'][:10]}...")  # Print first 10
    
    def test_suppliers_includes_defaults(self):
        """Test that default suppliers are included"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/suppliers")
        assert response.status_code == 200
        data = response.json()
        
        # Check for some default suppliers
        suppliers = data.get("suppliers", [])
        expected_defaults = ["Microsoft", "Dell", "Desko", "TSRID GmbH"]
        
        for supplier in expected_defaults:
            assert supplier in suppliers, f"Expected default supplier '{supplier}' not found"
        
        print(f"TEST PASSED: All expected default suppliers found")
    
    def test_suppliers_are_sorted(self):
        """Test that suppliers are returned in sorted order"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/suppliers")
        assert response.status_code == 200
        data = response.json()
        
        suppliers = data.get("suppliers", [])
        sorted_suppliers = sorted(suppliers)
        assert suppliers == sorted_suppliers, "Suppliers should be sorted alphabetically"
        print(f"TEST PASSED: Suppliers are sorted alphabetically")


class TestDeleteUnassignedAsset:
    """Tests for deleting single unassigned asset"""
    
    @pytest.fixture
    def test_asset_sn(self):
        """Create a test asset for deletion and return its SN"""
        unique_sn = f"TEST-DELETE-{int(time.time())}"
        
        # Create a test unassigned asset via intake
        intake_data = {
            "items": [{
                "manufacturer_sn": unique_sn,
                "type": "tab_tsr_i7",
                "imei": "",
                "mac": "",
                "manufacturer": "Test",
                "model": "Test",
                "notes": "Test asset for deletion"
            }],
            "received_by": "Test Agent",
            "supplier": "Test Supplier",
            "delivery_note": "TEST-DN-001",
            "notes": "Created for deletion test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch",
            json=intake_data
        )
        
        if response.status_code == 200:
            print(f"Created test asset with SN: {unique_sn}")
            return unique_sn
        else:
            pytest.skip(f"Could not create test asset: {response.text}")
    
    def test_delete_unassigned_asset_success(self, test_asset_sn):
        """Test successfully deleting an unassigned asset"""
        response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_asset_sn}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "deleted_sn" in data or "message" in data
        print(f"TEST PASSED: Asset {test_asset_sn} deleted successfully")
        
        # Verify asset is gone
        unassigned = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search={test_asset_sn}")
        unassigned_data = unassigned.json()
        asset_found = any(a["manufacturer_sn"] == test_asset_sn for a in unassigned_data.get("assets", []))
        assert not asset_found, "Asset should be deleted"
        print(f"TEST PASSED: Asset no longer exists in unassigned list")
    
    def test_delete_nonexistent_asset_returns_404(self):
        """Test deleting a non-existent asset returns 404"""
        fake_sn = f"NONEXISTENT-{int(time.time())}"
        response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{fake_sn}"
        )
        
        assert response.status_code == 404
        print(f"TEST PASSED: Non-existent asset returns 404")


class TestBulkDeleteUnassignedAssets:
    """Tests for bulk deleting unassigned assets"""
    
    @pytest.fixture
    def test_assets_sns(self):
        """Create multiple test assets for bulk deletion"""
        timestamp = int(time.time())
        sns = [
            f"BULK-TEST-{timestamp}-1",
            f"BULK-TEST-{timestamp}-2",
            f"BULK-TEST-{timestamp}-3"
        ]
        
        items = [
            {
                "manufacturer_sn": sn,
                "type": "tab_tsr_i7",
                "imei": "",
                "mac": "",
                "manufacturer": "Test",
                "model": "Test",
                "notes": f"Bulk test asset {i+1}"
            }
            for i, sn in enumerate(sns)
        ]
        
        intake_data = {
            "items": items,
            "received_by": "Test Agent",
            "supplier": "Test Supplier",
            "delivery_note": "TEST-BULK-DN",
            "notes": "Created for bulk deletion test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch",
            json=intake_data
        )
        
        if response.status_code == 200:
            print(f"Created {len(sns)} test assets for bulk deletion")
            return sns
        else:
            pytest.skip(f"Could not create test assets: {response.text}")
    
    def test_bulk_delete_success(self, test_assets_sns):
        """Test bulk deleting multiple unassigned assets"""
        response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/bulk",
            json=test_assets_sns
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("deleted_count") == len(test_assets_sns)
        assert data.get("failed_count") == 0
        print(f"TEST PASSED: Bulk deleted {data.get('deleted_count')} assets")
        
        # Verify assets are gone
        for sn in test_assets_sns:
            unassigned = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search={sn}")
            unassigned_data = unassigned.json()
            asset_found = any(a["manufacturer_sn"] == sn for a in unassigned_data.get("assets", []))
            assert not asset_found, f"Asset {sn} should be deleted"
        
        print(f"TEST PASSED: All bulk-deleted assets verified as removed")
    
    def test_bulk_delete_with_nonexistent_returns_partial(self):
        """Test bulk delete with mix of existing and non-existing assets"""
        # Create one real asset
        timestamp = int(time.time())
        real_sn = f"BULK-REAL-{timestamp}"
        fake_sn = f"BULK-FAKE-{timestamp}"
        
        # Create the real asset
        intake_data = {
            "items": [{
                "manufacturer_sn": real_sn,
                "type": "tab_tsr_i7",
                "imei": "",
                "mac": "",
                "manufacturer": "Test",
                "model": "Test",
                "notes": "Test for partial bulk delete"
            }],
            "received_by": "Test",
            "supplier": "",
            "delivery_note": "",
            "notes": ""
        }
        requests.post(f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch", json=intake_data)
        
        # Try to bulk delete both real and fake
        response = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/bulk",
            json=[real_sn, fake_sn]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("deleted_count") >= 1  # At least the real one
        print(f"TEST PASSED: Bulk delete with partial success - deleted: {data.get('deleted_count')}, failed: {data.get('failed_count')}")


class TestUnassignedAssetsList:
    """Tests for listing unassigned assets"""
    
    def test_get_unassigned_assets_returns_success(self):
        """Test GET /api/asset-mgmt/inventory/unassigned returns success"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        print(f"TEST PASSED: Unassigned assets endpoint returns success")
    
    def test_get_unassigned_assets_structure(self):
        """Test the response structure of unassigned assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "assets" in data
        assert "total" in data
        assert "type_summary" in data
        
        print(f"TEST PASSED: Response structure is correct - total: {data.get('total')}")
        
        # Check asset structure if any exist
        if data.get("assets"):
            asset = data["assets"][0]
            assert "manufacturer_sn" in asset
            assert "type" in asset
            assert asset.get("status") == "unassigned"
            assert asset.get("asset_id") is None
            print(f"TEST PASSED: Asset structure is correct")
    
    def test_get_unassigned_assets_with_type_filter(self):
        """Test filtering unassigned assets by type"""
        # First get all to find a type with items
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned")
        data = response.json()
        type_summary = data.get("type_summary", {})
        
        if type_summary:
            # Pick the first type with items
            test_type = list(type_summary.keys())[0]
            expected_count = type_summary[test_type]
            
            # Filter by that type
            response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?type={test_type}")
            filtered_data = response.json()
            
            assert response.status_code == 200
            # All returned assets should match the type
            for asset in filtered_data.get("assets", []):
                assert asset.get("type") == test_type
            
            print(f"TEST PASSED: Type filter works - filtered to {len(filtered_data.get('assets', []))} items of type {test_type}")
        else:
            print("SKIPPED: No unassigned assets to test type filter")
    
    def test_get_unassigned_assets_with_search(self):
        """Test searching unassigned assets"""
        # First get an asset to search for
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?limit=1")
        data = response.json()
        
        if data.get("assets"):
            asset_sn = data["assets"][0]["manufacturer_sn"]
            search_term = asset_sn[:10]  # Use first 10 chars
            
            search_response = requests.get(
                f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search={search_term}"
            )
            search_data = search_response.json()
            
            assert search_response.status_code == 200
            # At least one result should match our search
            found = any(search_term in a["manufacturer_sn"] for a in search_data.get("assets", []))
            assert found, "Search should return matching asset"
            print(f"TEST PASSED: Search filter works - searched for '{search_term}'")
        else:
            print("SKIPPED: No unassigned assets to test search")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
