"""
Asset Management V2 API Tests
Testing all CRUD operations for Locations, Slots, Bundles, Assets
Plus relationship management and history tracking
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bundle-inventory-pro.preview.emergentagent.com').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"

class TestAssetManagementV2Stats:
    """Test statistics endpoint"""
    
    def test_get_stats(self):
        """GET /api/asset-mgmt/stats - returns statistics"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        
        stats = data["stats"]
        # Verify all required sections exist
        assert "locations" in stats
        assert "slots" in stats
        assert "bundles" in stats
        assert "assets" in stats
        
        # Verify locations stats structure
        assert "total" in stats["locations"]
        assert "active" in stats["locations"]
        assert "planned" in stats["locations"]
        
        # Verify slots stats structure
        assert "total" in stats["slots"]
        assert "installed" in stats["slots"]
        assert "empty" in stats["slots"]
        
        # Verify bundles stats structure
        assert "total" in stats["bundles"]
        assert "deployed" in stats["bundles"]
        assert "in_storage" in stats["bundles"]
        
        # Verify assets stats structure
        assert "total" in stats["assets"]
        assert "deployed" in stats["assets"]
        assert "in_storage" in stats["assets"]
        
        print(f"Stats: Locations={stats['locations']['total']}, Slots={stats['slots']['total']}, Bundles={stats['bundles']['total']}, Assets={stats['assets']['total']}")


class TestLocationsAPI:
    """Test CRUD for Locations"""
    
    test_location_id = f"{TEST_PREFIX}LOC_{uuid.uuid4().hex[:8].upper()}"
    
    def test_01_create_location(self):
        """POST /api/asset-mgmt/locations - Create location"""
        payload = {
            "location_id": self.test_location_id,
            "country": "DE",
            "customer": "Test Customer",
            "address": "Test Str. 1",
            "city": "Berlin",
            "zip_code": "10115",
            "status": "planned",
            "contact_name": "Test Contact",
            "contact_phone": "+49123456789",
            "contact_email": "test@example.com",
            "notes": "Test location"
        }
        
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/locations", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["location_id"] == self.test_location_id
        print(f"Created location: {self.test_location_id}")
    
    def test_02_list_locations(self):
        """GET /api/asset-mgmt/locations - List locations"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "locations" in data
        assert "total" in data
        assert "filters" in data
        
        # Verify our test location exists
        location_ids = [loc["location_id"] for loc in data["locations"]]
        assert self.test_location_id in location_ids
        print(f"Listed {len(data['locations'])} locations, total: {data['total']}")
    
    def test_03_get_location(self):
        """GET /api/asset-mgmt/locations/{location_id} - Get single location"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations/{self.test_location_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "location" in data
        
        loc = data["location"]
        assert loc["location_id"] == self.test_location_id
        assert loc["country"] == "DE"
        assert loc["customer"] == "Test Customer"
        assert loc["city"] == "Berlin"
        assert "slots" in loc  # Should include slots array
        assert "slot_count" in loc
        print(f"Got location: {loc['location_id']} with {loc['slot_count']} slots")
    
    def test_04_update_location(self):
        """PUT /api/asset-mgmt/locations/{location_id} - Update location"""
        payload = {
            "status": "active",
            "notes": "Updated test location"
        }
        
        response = requests.put(f"{BASE_URL}/api/asset-mgmt/locations/{self.test_location_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations/{self.test_location_id}")
        get_data = get_response.json()
        assert get_data["location"]["status"] == "active"
        assert get_data["location"]["notes"] == "Updated test location"
        print(f"Updated location status to: active")
    
    def test_05_filter_locations(self):
        """GET /api/asset-mgmt/locations with filters"""
        # Filter by country
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?country=DE")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?status=active")
        assert response.status_code == 200
        
        # Search
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?search={TEST_PREFIX}")
        assert response.status_code == 200
        print("Location filters working correctly")
    
    def test_99_delete_location(self):
        """DELETE /api/asset-mgmt/locations/{location_id} - Delete location"""
        response = requests.delete(f"{BASE_URL}/api/asset-mgmt/locations/{self.test_location_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations/{self.test_location_id}")
        assert get_response.status_code == 404
        print(f"Deleted location: {self.test_location_id}")


class TestSlotsAPI:
    """Test CRUD for Slots"""
    
    # Create a location first for slot tests
    test_location_id = f"{TEST_PREFIX}SLOTLOC_{uuid.uuid4().hex[:8].upper()}"
    test_slot_id = f"{TEST_PREFIX}SLOT_{uuid.uuid4().hex[:8].upper()}"
    
    @classmethod
    def setup_class(cls):
        """Create a location for slot tests"""
        payload = {
            "location_id": cls.test_location_id,
            "country": "DE",
            "customer": "Slot Test Customer",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/locations", json=payload)
        assert response.status_code == 200
        print(f"Setup: Created location {cls.test_location_id}")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup test location"""
        requests.delete(f"{BASE_URL}/api/asset-mgmt/slots/{cls.test_slot_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/locations/{cls.test_location_id}")
        print(f"Teardown: Cleaned up test data")
    
    def test_01_create_slot(self):
        """POST /api/asset-mgmt/slots - Create slot"""
        payload = {
            "slot_id": self.test_slot_id,
            "location_id": self.test_location_id,
            "teamviewer_alias": "TV-Test-001",
            "position_description": "Counter 1",
            "status": "empty"
        }
        
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/slots", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["slot_id"] == self.test_slot_id
        print(f"Created slot: {self.test_slot_id}")
    
    def test_02_list_slots(self):
        """GET /api/asset-mgmt/slots - List slots"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "slots" in data
        assert "total" in data
        print(f"Listed {len(data['slots'])} slots, total: {data['total']}")
    
    def test_03_get_slot(self):
        """GET /api/asset-mgmt/slots/{slot_id} - Get single slot"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "slot" in data
        
        slot = data["slot"]
        assert slot["slot_id"] == self.test_slot_id
        assert slot["location_id"] == self.test_location_id
        assert slot["teamviewer_alias"] == "TV-Test-001"
        print(f"Got slot: {slot['slot_id']}")
    
    def test_04_update_slot(self):
        """PUT /api/asset-mgmt/slots/{slot_id} - Update slot"""
        payload = {
            "teamviewer_alias": "TV-Test-002-Updated",
            "status": "reserved"
        }
        
        response = requests.put(f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}")
        get_data = get_response.json()
        assert get_data["slot"]["teamviewer_alias"] == "TV-Test-002-Updated"
        assert get_data["slot"]["status"] == "reserved"
        print(f"Updated slot")
    
    def test_05_filter_slots_by_location(self):
        """GET /api/asset-mgmt/slots?location_id - Filter by location"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots?location_id={self.test_location_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        # Our test slot should be in the filtered results
        slot_ids = [s["slot_id"] for s in data["slots"]]
        assert self.test_slot_id in slot_ids
        print("Slot filtering by location working")
    
    def test_06_create_slot_invalid_location(self):
        """POST /api/asset-mgmt/slots - Fail for invalid location"""
        payload = {
            "slot_id": f"{TEST_PREFIX}INVALID_SLOT",
            "location_id": "NONEXISTENT_LOCATION",
            "status": "empty"
        }
        
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/slots", json=payload)
        assert response.status_code == 400
        print("Correctly rejected slot with invalid location")


class TestBundlesAPI:
    """Test CRUD for Bundles"""
    
    test_bundle_id = f"{TEST_PREFIX}BDL_{uuid.uuid4().hex[:8].upper()}"
    
    def test_01_create_bundle(self):
        """POST /api/asset-mgmt/bundles - Create bundle"""
        payload = {
            "bundle_id": self.test_bundle_id,
            "country": "DE",
            "description": "Test Bundle Description",
            "status": "in_storage",
            "notes": "Test bundle notes"
        }
        
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/bundles", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["bundle_id"] == self.test_bundle_id
        print(f"Created bundle: {self.test_bundle_id}")
    
    def test_02_list_bundles(self):
        """GET /api/asset-mgmt/bundles - List bundles"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "bundles" in data
        assert "total" in data
        assert "filters" in data
        
        # Verify our test bundle exists
        bundle_ids = [b["bundle_id"] for b in data["bundles"]]
        assert self.test_bundle_id in bundle_ids
        print(f"Listed {len(data['bundles'])} bundles, total: {data['total']}")
    
    def test_03_get_bundle(self):
        """GET /api/asset-mgmt/bundles/{bundle_id} - Get single bundle"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "bundle" in data
        
        bundle = data["bundle"]
        assert bundle["bundle_id"] == self.test_bundle_id
        assert bundle["country"] == "DE"
        assert bundle["description"] == "Test Bundle Description"
        assert "assets" in bundle  # Should include assets array
        assert "asset_count" in bundle
        print(f"Got bundle: {bundle['bundle_id']} with {bundle['asset_count']} assets")
    
    def test_04_update_bundle(self):
        """PUT /api/asset-mgmt/bundles/{bundle_id} - Update bundle"""
        payload = {
            "description": "Updated Test Bundle",
            "status": "in_transit"
        }
        
        response = requests.put(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        get_data = get_response.json()
        assert get_data["bundle"]["description"] == "Updated Test Bundle"
        assert get_data["bundle"]["status"] == "in_transit"
        print("Updated bundle")
    
    def test_05_filter_bundles(self):
        """GET /api/asset-mgmt/bundles with filters"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles?country=DE")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print("Bundle filters working")
    
    def test_99_delete_bundle(self):
        """DELETE /api/asset-mgmt/bundles/{bundle_id} - Delete bundle"""
        response = requests.delete(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        assert get_response.status_code == 404
        print(f"Deleted bundle: {self.test_bundle_id}")


class TestAssetsAPI:
    """Test CRUD for Assets"""
    
    test_asset_id = f"{TEST_PREFIX}TAB_{uuid.uuid4().hex[:8].upper()}"
    test_bundle_id = f"{TEST_PREFIX}ABLD_{uuid.uuid4().hex[:8].upper()}"
    
    @classmethod
    def setup_class(cls):
        """Create a bundle for asset tests"""
        payload = {
            "bundle_id": cls.test_bundle_id,
            "country": "DE",
            "status": "in_storage"
        }
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/bundles", json=payload)
        assert response.status_code == 200
        print(f"Setup: Created bundle {cls.test_bundle_id}")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup test data"""
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{cls.test_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/bundles/{cls.test_bundle_id}")
        print(f"Teardown: Cleaned up test data")
    
    def test_01_create_asset(self):
        """POST /api/asset-mgmt/assets - Create asset"""
        payload = {
            "asset_id": self.test_asset_id,
            "type": "tablet",
            "manufacturer_sn": "SN123456789",
            "imei": "123456789012345",
            "mac": "AA:BB:CC:DD:EE:FF",
            "manufacturer": "Samsung",
            "model": "Galaxy Tab S9",
            "status": "in_storage",
            "country": "DE",
            "notes": "Test asset"
        }
        
        response = requests.post(f"{BASE_URL}/api/asset-mgmt/assets", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["asset_id"] == self.test_asset_id
        print(f"Created asset: {self.test_asset_id}")
    
    def test_02_list_assets(self):
        """GET /api/asset-mgmt/assets - List assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "assets" in data
        assert "total" in data
        assert "filters" in data
        
        asset_ids = [a["asset_id"] for a in data["assets"]]
        assert self.test_asset_id in asset_ids
        print(f"Listed {len(data['assets'])} assets, total: {data['total']}")
    
    def test_03_get_asset(self):
        """GET /api/asset-mgmt/assets/{asset_id} - Get single asset"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "asset" in data
        
        asset = data["asset"]
        assert asset["asset_id"] == self.test_asset_id
        assert asset["type"] == "tablet"
        assert asset["manufacturer_sn"] == "SN123456789"
        assert "history" in asset  # Should have history array
        assert len(asset["history"]) >= 1  # At least the created event
        print(f"Got asset: {asset['asset_id']} with {len(asset['history'])} history events")
    
    def test_04_update_asset(self):
        """PUT /api/asset-mgmt/assets/{asset_id} - Update asset"""
        payload = {
            "status": "deployed",
            "notes": "Updated test asset"
        }
        
        response = requests.put(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        get_data = get_response.json()
        assert get_data["asset"]["status"] == "deployed"
        print("Updated asset")
    
    def test_05_filter_assets(self):
        """GET /api/asset-mgmt/assets with filters"""
        # Filter by type
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets?type=tablet")
        assert response.status_code == 200
        
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets?status=deployed")
        assert response.status_code == 200
        
        # Search by ID
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets?search={TEST_PREFIX}")
        assert response.status_code == 200
        
        print("Asset filters working")
    
    def test_06_asset_history_on_create(self):
        """Verify asset has history event on creation"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        data = response.json()
        
        history = data["asset"]["history"]
        assert len(history) >= 1
        
        # Find the created event
        created_events = [h for h in history if h["event_type"] == "created"]
        assert len(created_events) >= 1
        print(f"Asset has {len(history)} history events including creation")


class TestAssetBundleAssignment:
    """Test asset to bundle assignment operations"""
    
    test_asset_id = f"{TEST_PREFIX}ASSIGN_{uuid.uuid4().hex[:8].upper()}"
    test_bundle_id = f"{TEST_PREFIX}ABDL_{uuid.uuid4().hex[:8].upper()}"
    
    @classmethod
    def setup_class(cls):
        """Create test bundle and asset"""
        # Create bundle
        requests.post(f"{BASE_URL}/api/asset-mgmt/bundles", json={
            "bundle_id": cls.test_bundle_id,
            "country": "DE",
            "status": "in_storage"
        })
        # Create asset
        requests.post(f"{BASE_URL}/api/asset-mgmt/assets", json={
            "asset_id": cls.test_asset_id,
            "type": "scanner",
            "status": "in_storage",
            "country": "DE"
        })
        print(f"Setup: Created bundle and asset")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{cls.test_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/bundles/{cls.test_bundle_id}")
        print(f"Teardown: Cleaned up test data")
    
    def test_01_assign_asset_to_bundle(self):
        """POST /api/asset-mgmt/assets/{asset_id}/assign-bundle - Assign asset to bundle"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}/assign-bundle",
            params={"bundle_id": self.test_bundle_id, "technician": "Test Tech"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        # Verify assignment
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        asset = get_response.json()["asset"]
        assert asset["bundle_id"] == self.test_bundle_id
        
        # Verify history event
        history = asset["history"]
        assign_events = [h for h in history if h["event_type"] == "assigned_to_bundle"]
        assert len(assign_events) >= 1
        print(f"Assigned asset to bundle and verified history")
    
    def test_02_remove_asset_from_bundle(self):
        """POST /api/asset-mgmt/assets/{asset_id}/remove-from-bundle - Remove asset from bundle"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}/remove-from-bundle",
            params={"technician": "Test Tech"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify removal
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        asset = get_response.json()["asset"]
        assert asset["bundle_id"] is None
        
        # Verify history event
        history = asset["history"]
        remove_events = [h for h in history if h["event_type"] == "removed_from_bundle"]
        assert len(remove_events) >= 1
        print(f"Removed asset from bundle and verified history")


class TestSlotBundleInstallation:
    """Test bundle installation into slots"""
    
    test_location_id = f"{TEST_PREFIX}INSTLOC_{uuid.uuid4().hex[:8].upper()}"
    test_slot_id = f"{TEST_PREFIX}INSTSLT_{uuid.uuid4().hex[:8].upper()}"
    test_bundle_id = f"{TEST_PREFIX}INSTBDL_{uuid.uuid4().hex[:8].upper()}"
    test_asset_id = f"{TEST_PREFIX}INSTAST_{uuid.uuid4().hex[:8].upper()}"
    
    @classmethod
    def setup_class(cls):
        """Create test location, slot, bundle, and asset"""
        # Create location
        requests.post(f"{BASE_URL}/api/asset-mgmt/locations", json={
            "location_id": cls.test_location_id,
            "country": "DE",
            "customer": "Install Test",
            "status": "active"
        })
        # Create slot
        requests.post(f"{BASE_URL}/api/asset-mgmt/slots", json={
            "slot_id": cls.test_slot_id,
            "location_id": cls.test_location_id,
            "status": "empty"
        })
        # Create bundle
        requests.post(f"{BASE_URL}/api/asset-mgmt/bundles", json={
            "bundle_id": cls.test_bundle_id,
            "country": "DE",
            "status": "in_storage"
        })
        # Create asset in bundle
        requests.post(f"{BASE_URL}/api/asset-mgmt/assets", json={
            "asset_id": cls.test_asset_id,
            "type": "tablet",
            "bundle_id": cls.test_bundle_id,
            "status": "in_storage"
        })
        print(f"Setup: Created location, slot, bundle, and asset")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup in reverse order"""
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{cls.test_asset_id}")
        # First uninstall bundle if installed
        requests.post(f"{BASE_URL}/api/asset-mgmt/slots/{cls.test_slot_id}/uninstall-bundle")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/bundles/{cls.test_bundle_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/slots/{cls.test_slot_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/locations/{cls.test_location_id}")
        print(f"Teardown: Cleaned up test data")
    
    def test_01_install_bundle_to_slot(self):
        """POST /api/asset-mgmt/slots/{slot_id}/install-bundle - Install bundle into slot"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}/install-bundle",
            params={"bundle_id": self.test_bundle_id, "technician": "Install Tech"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        # Verify slot updated
        slot_response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}")
        slot = slot_response.json()["slot"]
        assert slot["bundle_id"] == self.test_bundle_id
        assert slot["status"] == "installed"
        
        # Verify bundle status updated
        bundle_response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        bundle = bundle_response.json()["bundle"]
        assert bundle["status"] == "deployed"
        
        # Verify asset history has install event
        asset_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        asset = asset_response.json()["asset"]
        install_events = [h for h in asset["history"] if h["event_type"] == "installed"]
        assert len(install_events) >= 1
        print(f"Installed bundle to slot and verified all updates")
    
    def test_02_uninstall_bundle_from_slot(self):
        """POST /api/asset-mgmt/slots/{slot_id}/uninstall-bundle - Uninstall bundle from slot"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}/uninstall-bundle",
            params={"technician": "Uninstall Tech"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify slot updated
        slot_response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots/{self.test_slot_id}")
        slot = slot_response.json()["slot"]
        assert slot["bundle_id"] is None
        assert slot["status"] == "empty"
        
        # Verify bundle status updated
        bundle_response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/{self.test_bundle_id}")
        bundle = bundle_response.json()["bundle"]
        assert bundle["status"] == "in_storage"
        
        # Verify asset history has uninstall event
        asset_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{self.test_asset_id}")
        asset = asset_response.json()["asset"]
        uninstall_events = [h for h in asset["history"] if h["event_type"] == "uninstalled"]
        assert len(uninstall_events) >= 1
        print(f"Uninstalled bundle from slot and verified all updates")


class TestExistingTestData:
    """Verify pre-existing test data mentioned in the request"""
    
    def test_existing_location_bere01(self):
        """Verify Location BERE01 exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations/BERE01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["location"]["location_id"] == "BERE01"
        print(f"Verified existing location BERE01")
    
    def test_existing_bundle_bdl_de_001(self):
        """Verify Bundle BDL-DE-001 exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/bundles/BDL-DE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["bundle"]["bundle_id"] == "BDL-DE-001"
        print(f"Verified existing bundle BDL-DE-001")
    
    def test_existing_slot_bere01_01(self):
        """Verify Slot BERE01-01 exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/slots/BERE01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["slot"]["slot_id"] == "BERE01-01"
        print(f"Verified existing slot BERE01-01")
    
    def test_existing_asset_tab_de_001(self):
        """Verify Asset TAB-DE-001 exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/TAB-DE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["asset"]["asset_id"] == "TAB-DE-001"
        print(f"Verified existing asset TAB-DE-001")
    
    def test_existing_asset_scn_de_001(self):
        """Verify Asset SCN-DE-001 exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/SCN-DE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["asset"]["asset_id"] == "SCN-DE-001"
        print(f"Verified existing asset SCN-DE-001")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
