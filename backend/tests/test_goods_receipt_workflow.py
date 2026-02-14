"""
Goods Receipt (Wareneingang) Workflow Tests
Tests for inventory intake, unassigned assets listing, and location assignment

Workflow:
1. POST /api/asset-mgmt/inventory/intake - Single device intake with serial number
2. POST /api/asset-mgmt/inventory/intake/batch - Batch intake of multiple devices
3. GET /api/asset-mgmt/inventory/unassigned - List of unassigned devices
4. POST /api/asset-mgmt/inventory/assign/{sn} - Assign device to location, generate Asset-ID
"""
import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def generate_unique_sn():
    """Generate a unique serial number for testing"""
    timestamp = int(time.time())
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"TEST-SN-{timestamp}-{random_suffix}"


class TestGoodsReceiptSingleIntake:
    """Test single device intake endpoint"""
    
    def test_single_intake_success(self):
        """P0: Create single device with serial number - should succeed"""
        unique_sn = generate_unique_sn()
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={
                "manufacturer_sn": unique_sn,
                "type": "tab_tsr",
                "imei": "",
                "mac": "",
                "manufacturer": "TSRID",
                "model": "TSRID Tablet",
                "notes": "Test intake device"
            },
            params={"received_by": "Test Technician"}
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True
        assert data["manufacturer_sn"] == unique_sn
        assert data["type"] == "tab_tsr"
        assert data["status"] == "unassigned"
        assert "type_label" in data
        print(f"✓ Single intake created: {unique_sn}")
    
    def test_single_intake_duplicate_sn(self):
        """P0: Duplicate serial number should fail"""
        unique_sn = generate_unique_sn()
        
        # First intake - should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={
                "manufacturer_sn": unique_sn,
                "type": "tab_tsr"
            }
        )
        assert response1.status_code == 200
        
        # Second intake with same SN - should fail
        response2 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={
                "manufacturer_sn": unique_sn,
                "type": "tab_sp4"
            }
        )
        
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        data = response2.json()
        assert "existiert bereits" in data.get("detail", "")
        print(f"✓ Duplicate SN rejected as expected: {unique_sn}")
    
    def test_single_intake_different_types(self):
        """P1: Test intake with different device types"""
        device_types = ["tab_tsr", "sca_dsk", "tdo_tsr", "cab_usb_c", "adp_hdmi"]
        
        for dtype in device_types:
            unique_sn = generate_unique_sn()
            response = requests.post(
                f"{BASE_URL}/api/asset-mgmt/inventory/intake",
                json={
                    "manufacturer_sn": unique_sn,
                    "type": dtype
                }
            )
            assert response.status_code == 200, f"Failed for type {dtype}: {response.text}"
            data = response.json()
            assert data["type"] == dtype
            print(f"✓ Intake type {dtype}: {unique_sn}")


class TestGoodsReceiptBatchIntake:
    """Test batch intake endpoint"""
    
    def test_batch_intake_success(self):
        """P0: Batch intake of multiple devices - should succeed"""
        items = []
        for i in range(3):
            items.append({
                "manufacturer_sn": generate_unique_sn(),
                "type": "tab_tsr",
                "manufacturer": "TSRID",
                "model": "Test Model"
            })
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch",
            json={
                "items": items,
                "received_by": "Test Technician",
                "supplier": "TSRID GmbH",
                "delivery_note": "TEST-DN-001",
                "notes": "Batch test intake"
            }
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True
        assert data["created_count"] == 3
        assert data["skipped_count"] == 0
        assert len(data["created"]) == 3
        print(f"✓ Batch intake created {data['created_count']} devices")
    
    def test_batch_intake_with_duplicates(self):
        """P0: Batch intake with some duplicates - should skip duplicates"""
        # Create first device
        first_sn = generate_unique_sn()
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": first_sn, "type": "tab_tsr"}
        )
        assert response1.status_code == 200
        
        # Batch with duplicate and new device
        items = [
            {"manufacturer_sn": first_sn, "type": "tab_tsr"},  # Duplicate
            {"manufacturer_sn": generate_unique_sn(), "type": "tab_sp4"}  # New
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch",
            json={
                "items": items,
                "received_by": "Tester"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 1
        assert data["skipped_count"] == 1
        assert len(data["skipped"]) == 1
        assert data["skipped"][0]["manufacturer_sn"] == first_sn
        print(f"✓ Batch handled duplicates: created={data['created_count']}, skipped={data['skipped_count']}")
    
    def test_batch_intake_mixed_types(self):
        """P1: Batch intake with different device types"""
        items = [
            {"manufacturer_sn": generate_unique_sn(), "type": "tab_tsr"},
            {"manufacturer_sn": generate_unique_sn(), "type": "sca_dsk"},
            {"manufacturer_sn": generate_unique_sn(), "type": "tdo_tsr"},
            {"manufacturer_sn": generate_unique_sn(), "type": "cab_usb_c"}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake/batch",
            json={
                "items": items,
                "supplier": "Mixed Supplier"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 4
        
        # Verify types in created items
        types_created = set(item["type"] for item in data["created"])
        assert "tab_tsr" in types_created
        assert "sca_dsk" in types_created
        print(f"✓ Mixed batch created: {types_created}")


class TestUnassignedAssetsList:
    """Test unassigned assets listing endpoint"""
    
    def test_list_unassigned_success(self):
        """P0: List unassigned assets - should return unassigned items"""
        # First create some unassigned devices
        for _ in range(2):
            requests.post(
                f"{BASE_URL}/api/asset-mgmt/inventory/intake",
                json={"manufacturer_sn": generate_unique_sn(), "type": "tab_tsr"}
            )
        
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/unassigned")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True
        assert "assets" in data
        assert "total" in data
        assert "type_summary" in data
        assert data["total"] >= 0
        print(f"✓ Unassigned list: {data['total']} devices, type_summary: {data['type_summary']}")
    
    def test_list_unassigned_with_type_filter(self):
        """P1: Filter unassigned by device type"""
        # Create unassigned device with specific type
        sn_scanner = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": sn_scanner, "type": "sca_dsk"}
        )
        
        # Filter by scanner type
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned",
            params={"type": "sca_dsk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should be of type sca_dsk
        for asset in data["assets"]:
            assert asset["type"] == "sca_dsk", f"Expected sca_dsk, got {asset['type']}"
        print(f"✓ Type filter working: found {len(data['assets'])} sca_dsk devices")
    
    def test_list_unassigned_with_search(self):
        """P1: Search unassigned by serial number"""
        # Create device with unique SN
        unique_sn = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "tab_tsr"}
        )
        
        # Search by partial SN
        search_term = unique_sn.split('-')[2]  # Use timestamp portion
        response = requests.get(
            f"{BASE_URL}/api/asset-mgmt/inventory/unassigned",
            params={"search": unique_sn}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find our device
        sns = [a["manufacturer_sn"] for a in data["assets"]]
        assert unique_sn in sns, f"Device {unique_sn} not found in search results"
        print(f"✓ Search working: found {unique_sn}")


class TestAssetLocationAssignment:
    """Test assigning assets to locations and Asset-ID generation"""
    
    @pytest.fixture(autouse=True)
    def ensure_test_location(self):
        """Ensure a test location exists for assignment tests"""
        # Try to get existing location
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?search=TEST")
        if response.status_code == 200:
            data = response.json()
            if data.get("locations") and len(data["locations"]) > 0:
                self.test_location = data["locations"][0]["location_id"]
                return
        
        # Create test location if not exists
        test_location_id = f"TESTLOC{int(time.time())%1000}"
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/locations",
            json={
                "location_id": test_location_id,
                "country": "DE",
                "customer": "Test Customer",
                "city": "Test City",
                "status": "active"
            }
        )
        
        if response.status_code == 200:
            self.test_location = test_location_id
        else:
            # Try to use an existing location
            response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
            if response.status_code == 200:
                data = response.json()
                if data.get("locations") and len(data["locations"]) > 0:
                    self.test_location = data["locations"][0]["location_id"]
                else:
                    pytest.skip("No locations available for testing")
            else:
                pytest.skip("Cannot create or find test location")
    
    def test_assign_to_location_success(self):
        """P0: Assign unassigned device to location - generates Asset-ID"""
        # Create unassigned device
        unique_sn = generate_unique_sn()
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "tab_tsr"}
        )
        assert response1.status_code == 200
        
        # Assign to location
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/{unique_sn}",
            json={
                "location_id": self.test_location,
                "technician": "Test Technician",
                "notes": "Test assignment"
            }
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True
        assert data["manufacturer_sn"] == unique_sn
        assert data["location_id"] == self.test_location
        assert data["status"] == "in_storage"
        
        # Asset-ID should follow pattern: LOCATION-NN-TYPE-SUFFIX
        asset_id = data["asset_id"]
        assert asset_id is not None
        assert self.test_location in asset_id
        assert "TAB-TSR" in asset_id  # Type suffix for tab_tsr
        
        # Label data should be present
        assert "label" in data
        label = data["label"]
        assert label["asset_id"] == asset_id
        assert label["manufacturer_sn"] == unique_sn
        assert "qr_content" in label
        
        print(f"✓ Assignment success: {unique_sn} → {asset_id}")
        print(f"  Label: {label}")
    
    def test_assign_to_location_not_found(self):
        """P0: Assign to non-existent location - should fail"""
        unique_sn = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "tab_tsr"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/{unique_sn}",
            json={
                "location_id": "NONEXISTENT999",
                "technician": "Tester"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "nicht gefunden" in data.get("detail", "")
        print(f"✓ Non-existent location rejected")
    
    def test_assign_nonexistent_device(self):
        """P0: Assign non-existent device - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/NONEXISTENT-SN-12345",
            json={
                "location_id": self.test_location,
                "technician": "Tester"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent device rejected")
    
    def test_assign_already_assigned_device(self):
        """P0: Assign already-assigned device - should fail"""
        # Create and assign device
        unique_sn = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "tab_tsr"}
        )
        
        # First assignment
        response1 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/{unique_sn}",
            json={"location_id": self.test_location, "technician": "Tech1"}
        )
        assert response1.status_code == 200
        
        # Second assignment attempt
        response2 = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/{unique_sn}",
            json={"location_id": self.test_location, "technician": "Tech2"}
        )
        
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        data = response2.json()
        assert "bereits zugewiesen" in data.get("detail", "")
        print(f"✓ Re-assignment rejected for {unique_sn}")
    
    def test_asset_id_format_correct(self):
        """P0: Verify Asset-ID format follows spec: LOCATION-NN-TYPE-SUFFIX"""
        # Test with scanner type
        unique_sn = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "sca_dsk"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/assign/{unique_sn}",
            json={"location_id": self.test_location, "technician": "Tester"}
        )
        
        assert response.status_code == 200
        data = response.json()
        asset_id = data["asset_id"]
        
        # Parse Asset-ID components
        parts = asset_id.split('-')
        assert len(parts) >= 3, f"Asset-ID should have at least 3 parts: {asset_id}"
        
        # First part is location prefix
        assert self.test_location.startswith(parts[0]) or parts[0] == self.test_location[:len(parts[0])]
        
        # Check type suffix is correct for sca_dsk
        assert "SCA-DSK" in asset_id, f"Expected SCA-DSK suffix in {asset_id}"
        
        print(f"✓ Asset-ID format correct: {asset_id}")


class TestAssetBySerialNumber:
    """Test looking up assets by serial number"""
    
    def test_lookup_unassigned_by_sn(self):
        """P1: Find unassigned device by SN"""
        unique_sn = generate_unique_sn()
        requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/intake",
            json={"manufacturer_sn": unique_sn, "type": "tab_tsr"}
        )
        
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/by-sn/{unique_sn}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["asset"]["manufacturer_sn"] == unique_sn
        assert data["is_assigned"] == False
        assert data["status"] == "unassigned"
        print(f"✓ Lookup unassigned: {unique_sn}")
    
    def test_lookup_nonexistent_sn(self):
        """P1: Lookup non-existent SN - should return 404"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/inventory/by-sn/NONEXISTENT-SN-99999")
        
        assert response.status_code == 404
        print("✓ Non-existent SN lookup returns 404")


class TestBulkAssignment:
    """Test bulk assignment of multiple devices to a location"""
    
    @pytest.fixture(autouse=True)
    def ensure_test_location(self):
        """Ensure a test location exists"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        if response.status_code == 200:
            data = response.json()
            if data.get("locations") and len(data["locations"]) > 0:
                self.test_location = data["locations"][0]["location_id"]
            else:
                pytest.skip("No locations available for bulk test")
        else:
            pytest.skip("Cannot fetch locations")
    
    def test_bulk_assign_success(self):
        """P1: Bulk assign multiple devices to location"""
        # Create multiple unassigned devices
        serial_numbers = []
        for _ in range(3):
            sn = generate_unique_sn()
            response = requests.post(
                f"{BASE_URL}/api/asset-mgmt/inventory/intake",
                json={"manufacturer_sn": sn, "type": "tab_tsr"}
            )
            if response.status_code == 200:
                serial_numbers.append(sn)
        
        assert len(serial_numbers) >= 2, "Need at least 2 devices for bulk test"
        
        # Bulk assign
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/inventory/bulk-assign",
            params={
                "location_id": self.test_location,
                "technician": "Bulk Tester"
            },
            json=serial_numbers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["assigned_count"] >= 1
        print(f"✓ Bulk assigned: {data['assigned_count']} devices")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
