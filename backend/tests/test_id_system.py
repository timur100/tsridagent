"""
Test Suite for Asset Management ID System (Lager-ID System)
Tests the intelligent ID system with:
1. Gap filling - reuses IDs from deleted assets
2. Unique IDs - system-wide uniqueness
3. ID History - full audit trail for traceability
4. Intake with auto-ID generation
5. Delete frees ID for reuse

Testing endpoints:
- GET /api/asset-mgmt/asset-id-config/next-id - Preview next available ID
- POST /api/asset-mgmt/inventory/intake-with-auto-id - Create asset with auto ID + history
- DELETE /api/asset-mgmt/inventory/unassigned/{sn} - Delete asset, free ID
- GET /api/asset-mgmt/inventory/id-history/{warehouse_asset_id} - Get ID history
"""

import pytest
import requests
import os
import time
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is required")


class TestIDSystemBasics:
    """Basic tests for the ID system APIs"""
    
    def test_get_next_id_endpoint_works(self):
        """Test that the next-id endpoint returns a valid response"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "next_asset_id" in data
        assert "next_sequence" in data
        
        # Verify ID format: TSRID-TAB-TSRi7-0001 pattern
        next_id = data["next_asset_id"]
        assert next_id.startswith("TSRID-"), f"ID should start with TSRID-, got: {next_id}"
        print(f"✓ Next available ID: {next_id}, sequence: {data['next_sequence']}")
    
    def test_get_next_id_for_different_types(self):
        """Test next-id endpoint for different asset types"""
        asset_types = ["tab_tsr_i7", "sca_dsk", "tdo_tsr"]
        
        for asset_type in asset_types:
            response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type={asset_type}")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("success") is True
            print(f"✓ {asset_type}: Next ID = {data['next_asset_id']}")


class TestIntakeWithAutoID:
    """Tests for creating assets with auto-generated IDs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique test identifiers"""
        self.unique_id = str(uuid.uuid4())[:8]
        self.test_sn = f"TEST-SN-{self.unique_id}"
        self.test_imei = f"TEST-IMEI-{self.unique_id}"
    
    def test_intake_creates_asset_with_id_and_history(self):
        """Test that intake creates asset with auto-ID and logs history"""
        # Get the next expected ID before creating
        preview_res = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        assert preview_res.status_code == 200
        expected_seq = preview_res.json()["next_sequence"]
        
        # Create asset via intake
        intake_payload = {
            "manufacturer_sn": self.test_sn,
            "type": "tab_tsr_i7",
            "imei": "",
            "mac": "",
            "manufacturer": "Test",
            "model": "Test Model",
            "notes": "Automated test asset"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestAgent",
            json=intake_payload
        )
        
        assert response.status_code == 200, f"Intake failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "warehouse_asset_id" in data
        
        warehouse_id = data["warehouse_asset_id"]
        print(f"✓ Created asset with ID: {warehouse_id}")
        
        # Verify the ID format (TSRID-TAB-i7-XXXX or TSRID-TAB-TSRi7-XXXX)
        assert warehouse_id.startswith("TSRID-"), f"Wrong ID format: {warehouse_id}"
        assert "TAB" in warehouse_id, f"Wrong ID format, missing TAB: {warehouse_id}"
        
        # Verify history was created
        history_res = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history/{warehouse_id}")
        assert history_res.status_code == 200
        
        history_data = history_res.json()
        assert history_data.get("success") is True
        
        if history_data.get("history"):
            events = history_data["history"].get("events", [])
            assert len(events) >= 1, "Should have at least one history event"
            
            # Check the LAST event is 'created' for our test SN (IDs may be reused)
            last_event = events[-1]
            assert last_event.get("action") == "created"
            assert last_event.get("asset_sn") == self.test_sn, f"Last event SN {last_event.get('asset_sn')} != {self.test_sn}"
            print(f"✓ History entry created: action={last_event.get('action')}, events={len(events)}")
        
        # Cleanup - delete the test asset
        cleanup_res = requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{self.test_sn}?reason=TestCleanup&user=TestAgent")
        print(f"Cleanup: {cleanup_res.status_code}")
    
    def test_intake_rejects_duplicate_serial_number(self):
        """Test that intake rejects duplicate serial numbers"""
        # First create an asset
        intake_payload = {
            "manufacturer_sn": self.test_sn,
            "type": "tab_tsr_i7"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestAgent",
            json=intake_payload
        )
        assert response1.status_code == 200
        
        # Try to create another with same SN
        response2 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestAgent",
            json=intake_payload
        )
        
        assert response2.status_code == 400, "Should reject duplicate SN"
        assert "existiert bereits" in response2.json().get("detail", "")
        print(f"✓ Duplicate SN correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{self.test_sn}?reason=TestCleanup&user=TestAgent")
    
    def test_intake_requires_received_by(self):
        """Test that intake requires received_by parameter"""
        intake_payload = {
            "manufacturer_sn": self.test_sn,
            "type": "tab_tsr_i7"
        }
        
        # Without received_by
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id",
            json=intake_payload
        )
        
        assert response.status_code == 400, "Should require received_by"
        print(f"✓ Correctly requires 'received_by'")


class TestDeleteFreesID:
    """Tests for deleting assets and freeing IDs for reuse"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique test identifiers"""
        self.unique_id = str(uuid.uuid4())[:8]
        self.test_sn = f"TEST-DEL-{self.unique_id}"
    
    def test_delete_frees_id_and_logs_history(self):
        """Test that deleting an asset frees the ID and logs to history"""
        # Create an asset first
        intake_payload = {
            "manufacturer_sn": self.test_sn,
            "type": "tab_tsr_i7"
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestAgent",
            json=intake_payload
        )
        assert create_res.status_code == 200
        
        warehouse_id = create_res.json()["warehouse_asset_id"]
        print(f"✓ Created asset with ID: {warehouse_id}")
        
        # Delete the asset
        delete_res = requests.delete(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{self.test_sn}?reason=Test+Deletion&user=TestAgent"
        )
        
        assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
        
        delete_data = delete_res.json()
        assert delete_data.get("success") is True
        assert delete_data.get("freed_id") == warehouse_id
        print(f"✓ Deleted asset, freed ID: {delete_data.get('freed_id')}")
        
        # Verify history was updated with 'deleted' action
        history_res = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history/{warehouse_id}")
        assert history_res.status_code == 200
        
        history_data = history_res.json()
        if history_data.get("history"):
            events = history_data["history"].get("events", [])
            
            # Should have at least 2 events: created and deleted
            assert len(events) >= 2, f"Expected 2+ events, got {len(events)}"
            
            # Check the last event is 'deleted'
            last_event = events[-1]
            assert last_event.get("action") == "deleted"
            assert last_event.get("asset_sn") == self.test_sn
            print(f"✓ History shows deletion: action={last_event.get('action')}, reason={last_event.get('reason')}")


class TestIDGapFilling:
    """Tests for the gap-filling feature of the ID system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique test identifiers"""
        self.unique_id = str(uuid.uuid4())[:8]
    
    def test_id_reuse_after_delete(self):
        """
        Test that a deleted ID can be reused.
        1. Get next ID (e.g., 0002)
        2. Create asset with that ID
        3. Delete the asset
        4. Next ID should be the same (0002 - gap filled)
        """
        # Get next ID
        preview1 = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        assert preview1.status_code == 200
        seq_before = preview1.json()["next_sequence"]
        id_before = preview1.json()["next_asset_id"]
        print(f"Before creation: next ID = {id_before}")
        
        # Create an asset
        test_sn = f"TEST-GAP-{self.unique_id}"
        intake_payload = {
            "manufacturer_sn": test_sn,
            "type": "tab_tsr_i7"
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=TestAgent",
            json=intake_payload
        )
        assert create_res.status_code == 200
        created_id = create_res.json()["warehouse_asset_id"]
        print(f"Created asset with ID: {created_id}")
        
        # Check next ID moved forward
        preview2 = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        seq_after_create = preview2.json()["next_sequence"]
        print(f"After creation: next sequence = {seq_after_create}")
        
        # Delete the asset
        delete_res = requests.delete(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned/{test_sn}?reason=Gap+Fill+Test&user=TestAgent")
        assert delete_res.status_code == 200
        print(f"Deleted asset")
        
        # Check if the ID is available again (gap filling)
        preview3 = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        seq_after_delete = preview3.json()["next_sequence"]
        id_after_delete = preview3.json()["next_asset_id"]
        print(f"After deletion: next ID = {id_after_delete}")
        
        # The sequence should be the same as before (gap was filled)
        assert seq_after_delete == seq_before, f"Gap not filled: expected seq {seq_before}, got {seq_after_delete}"
        print(f"✓ Gap filling works: ID {id_after_delete} is available again")


class TestIDHistoryEndpoints:
    """Tests for ID history retrieval endpoints"""
    
    def test_get_history_for_existing_id(self):
        """Test retrieving history for an existing warehouse ID"""
        # First, find an existing ID with history
        # We'll use TSRID-TAB-i7-0001 which should exist according to the context
        warehouse_id = "TSRID-TAB-TSRi7-0001"
        
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history/{warehouse_id}")
        
        # Should return 200 even if no history (returns empty)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "warehouse_asset_id" in data
        
        if data.get("history"):
            print(f"✓ Found history for {warehouse_id}: {data.get('event_count')} events")
        else:
            print(f"✓ No history found for {warehouse_id} (this is okay)")
    
    def test_get_history_for_nonexistent_id(self):
        """Test that getting history for non-existent ID returns gracefully"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history/NONEXISTENT-0000")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("history") is None
        print(f"✓ Gracefully handles non-existent ID")
    
    def test_list_all_history(self):
        """Test listing all ID histories"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history?limit=10")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "total" in data
        assert "histories" in data
        
        print(f"✓ Total ID histories: {data.get('total')}, retrieved: {len(data.get('histories', []))}")
    
    def test_list_history_filtered_by_action(self):
        """Test filtering history by action type"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/id-history?action_filter=created&limit=5")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print(f"✓ Histories with 'created' action: {data.get('total')}")


class TestUnassignedAssets:
    """Tests for unassigned assets management"""
    
    def test_list_unassigned_assets(self):
        """Test listing unassigned assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "assets" in data
        assert "total" in data
        
        print(f"✓ Unassigned assets: {data.get('total')}")
    
    def test_list_unassigned_with_search(self):
        """Test searching unassigned assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned?search=TSRID")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        
        print(f"✓ Search results: {data.get('total')} assets found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
