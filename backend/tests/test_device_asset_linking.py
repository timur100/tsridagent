"""
Device-Asset Linking Tests for Asset Management V2

Tests for the new Device-Asset linking functionality:
- GET /api/asset-mgmt/devices/all - List all devices with asset status
- POST /api/asset-mgmt/devices/{device_id}/create-asset - Create asset from device
- Device-Asset linking - asset_id saved in device
- TSRID Tablet and TSRID Scanner asset types
- Warranty date calculation from purchase date + months
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDeviceAssetListing:
    """Tests for GET /api/asset-mgmt/devices/all endpoint"""
    
    def test_get_all_devices_with_stats(self):
        """Test getting all devices with stats"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "devices" in data
        assert "stats" in data
        assert "total" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_devices" in stats
        assert "with_asset" in stats
        assert "without_asset" in stats
        assert stats["total_devices"] == stats["with_asset"] + stats["without_asset"]
        
        print(f"✓ Stats: Total={stats['total_devices']}, With Asset={stats['with_asset']}, Without Asset={stats['without_asset']}")
    
    def test_devices_filter_by_has_asset(self):
        """Test filtering devices by asset status"""
        # Filter devices WITH asset
        response_yes = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=yes")
        assert response_yes.status_code == 200
        data_yes = response_yes.json()
        
        for device in data_yes["devices"]:
            assert device.get("asset_id") is not None and device.get("asset_id") != ""
        
        # Filter devices WITHOUT asset
        response_no = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no")
        assert response_no.status_code == 200
        data_no = response_no.json()
        
        for device in data_no["devices"]:
            assert device.get("asset_id") is None or device.get("asset_id") == ""
        
        print(f"✓ Filter has_asset=yes returns {len(data_yes['devices'])} devices")
        print(f"✓ Filter has_asset=no returns {len(data_no['devices'])} devices")
    
    def test_devices_search_functionality(self):
        """Test searching devices by device_id, location, etc."""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?search=AAHC01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert len(data["devices"]) > 0
        
        # Verify search matches
        found = False
        for device in data["devices"]:
            if "AAHC01" in device.get("device_id", "") or "AAHC01" in device.get("locationcode", ""):
                found = True
                break
        assert found, "Search should return devices matching AAHC01"
        print(f"✓ Search returned {len(data['devices'])} devices matching 'AAHC01'")
    
    def test_linked_device_has_correct_asset_id(self):
        """Test that AAHC01-01 device has asset AST-AAHC01-01"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?search=AAHC01-01")
        assert response.status_code == 200
        
        data = response.json()
        device = next((d for d in data["devices"] if d["device_id"] == "AAHC01-01"), None)
        assert device is not None, "Device AAHC01-01 should exist"
        assert device.get("asset_id") == "AST-AAHC01-01", f"Expected asset_id AST-AAHC01-01, got {device.get('asset_id')}"
        
        print(f"✓ Device AAHC01-01 has correct asset_id: {device.get('asset_id')}")


class TestAssetCreationFromDevice:
    """Tests for POST /api/asset-mgmt/devices/{device_id}/create-asset endpoint"""
    
    @pytest.fixture
    def test_device_id(self):
        """Find an unlinked device for testing"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no&limit=1")
        if response.status_code == 200 and response.json()["devices"]:
            return response.json()["devices"][0]["device_id"]
        pytest.skip("No unlinked devices available for testing")
    
    def test_create_asset_from_device_basic(self, test_device_id):
        """Test creating asset from device with basic data"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{test_device_id}/create-asset",
            json={
                "device_id": test_device_id,
                "asset_type": "tsrid_tablet",
                "additional_data": {}
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["device_id"] == test_device_id
        assert data["asset_id"] == f"AST-{test_device_id}"
        
        # Verify asset was created
        asset_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{data['asset_id']}")
        assert asset_response.status_code == 200
        asset_data = asset_response.json()
        assert asset_data["asset"]["type"] == "tsrid_tablet"
        assert asset_data["asset"]["linked_device_id"] == test_device_id
        
        print(f"✓ Created asset {data['asset_id']} from device {test_device_id}")
        
        # Cleanup - delete the created asset
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{data['asset_id']}")
        
        # Unlink device
        requests.post(f"{BASE_URL}/api/asset-mgmt/devices/{test_device_id}/unlink-asset")
    
    def test_create_asset_already_exists_error(self):
        """Test error when device already has asset"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/AAHC01-01/create-asset",
            json={
                "device_id": "AAHC01-01",
                "asset_type": "tsrid_tablet",
                "additional_data": {}
            }
        )
        # Should return 400 because AAHC01-01 already has AST-AAHC01-01
        assert response.status_code == 400
        data = response.json()
        assert "bereits" in data["detail"].lower() or "already" in data["detail"].lower()
        print(f"✓ Correctly returned error for device with existing asset")
    
    def test_create_asset_device_not_found_error(self):
        """Test error when device doesn't exist"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/NONEXISTENT-DEVICE-123/create-asset",
            json={
                "device_id": "NONEXISTENT-DEVICE-123",
                "asset_type": "tsrid_tablet",
                "additional_data": {}
            }
        )
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for non-existent device")


class TestTSRIDAssetTypes:
    """Tests for TSRID Tablet and TSRID Scanner asset types"""
    
    def test_tsrid_types_in_metadata(self):
        """Test that TSRID types are in metadata"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "tsrid_tablet" in data["asset_types"]
        assert "tsrid_scanner" in data["asset_types"]
        
        print("✓ TSRID Tablet and TSRID Scanner are in asset types")
    
    def test_create_asset_with_tsrid_tablet_type(self):
        """Test creating asset with TSRID Tablet type"""
        unique_id = f"TEST-TSRID-TABLET-{datetime.now().strftime('%H%M%S')}"
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tsrid_tablet",
                "manufacturer": "TSRID",
                "model": "TSRID Tablet v1",
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        assert verify_response.status_code == 200
        asset = verify_response.json()["asset"]
        assert asset["type"] == "tsrid_tablet"
        
        print(f"✓ Created asset with type tsrid_tablet: {unique_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
    
    def test_create_asset_with_tsrid_scanner_type(self):
        """Test creating asset with TSRID Scanner type"""
        unique_id = f"TEST-TSRID-SCANNER-{datetime.now().strftime('%H%M%S')}"
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tsrid_scanner",
                "manufacturer": "TSRID",
                "model": "TSRID Scanner v1",
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        assert verify_response.status_code == 200
        asset = verify_response.json()["asset"]
        assert asset["type"] == "tsrid_scanner"
        
        print(f"✓ Created asset with type tsrid_scanner: {unique_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")


class TestWarrantyDateCalculation:
    """Tests for warranty end date calculation (purchase date + months)"""
    
    def test_warranty_date_calculation_12_months(self):
        """Test warranty calculation for 12 months"""
        unique_id = f"TEST-WARRANTY-12M-{datetime.now().strftime('%H%M%S')}"
        purchase_date = "2025-01-15"
        # Expected: 2025-01-15 + 12 months = 2026-01-15
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tablet",
                "purchase_date": purchase_date,
                "warranty_until": "2026-01-15",  # 12 months from purchase
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        
        # Verify warranty date
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        assert verify_response.status_code == 200
        asset = verify_response.json()["asset"]
        assert asset["purchase_date"] == purchase_date
        assert asset["warranty_until"] == "2026-01-15"
        
        print(f"✓ Asset with 12 month warranty: purchase={purchase_date}, warranty_until=2026-01-15")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
    
    def test_warranty_date_calculation_24_months(self):
        """Test warranty calculation for 24 months"""
        unique_id = f"TEST-WARRANTY-24M-{datetime.now().strftime('%H%M%S')}"
        purchase_date = "2025-02-01"
        # Expected: 2025-02-01 + 24 months = 2027-02-01
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tablet",
                "purchase_date": purchase_date,
                "warranty_until": "2027-02-01",  # 24 months from purchase
                "warranty_type": "extended",
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        asset = verify_response.json()["asset"]
        assert asset["warranty_until"] == "2027-02-01"
        assert asset["warranty_type"] == "extended"
        
        print(f"✓ Asset with 24 month warranty: purchase={purchase_date}, warranty_until=2027-02-01")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
    
    def test_warranty_date_calculation_36_months(self):
        """Test warranty calculation for 36 months"""
        unique_id = f"TEST-WARRANTY-36M-{datetime.now().strftime('%H%M%S')}"
        purchase_date = "2024-06-15"
        # Expected: 2024-06-15 + 36 months = 2027-06-15
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tsrid_tablet",
                "purchase_date": purchase_date,
                "warranty_until": "2027-06-15",  # 36 months from purchase
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        asset = verify_response.json()["asset"]
        assert asset["warranty_until"] == "2027-06-15"
        
        print(f"✓ Asset with 36 month warranty: purchase={purchase_date}, warranty_until=2027-06-15")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")


class TestLicenseDateCalculation:
    """Tests for license expiry date calculation (activation date + months)"""
    
    def test_license_date_calculation(self):
        """Test license expiry date calculation"""
        unique_id = f"TEST-LICENSE-{datetime.now().strftime('%H%M%S')}"
        activation_date = "2025-01-01"
        # Expected: 2025-01-01 + 12 months = 2026-01-01
        
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/assets",
            json={
                "asset_id": unique_id,
                "type": "tablet",
                "license_type": "subscription",
                "license_activation_date": activation_date,
                "license_expiry_date": "2026-01-01",  # 12 months from activation
                "status": "in_storage"
            }
        )
        assert response.status_code == 200
        
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")
        asset = verify_response.json()["asset"]
        assert asset["license_activation_date"] == activation_date
        assert asset["license_expiry_date"] == "2026-01-01"
        assert asset["license_type"] == "subscription"
        
        print(f"✓ Asset with license: activation={activation_date}, expiry=2026-01-01")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{unique_id}")


class TestDeviceAssetLink:
    """Tests for device-asset link relationship"""
    
    def test_linked_asset_has_device_data(self):
        """Test that linked asset contains device information"""
        # Get the existing linked asset
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/AST-AAHC01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        asset = data["asset"]
        
        # Check that asset has linked_device_id
        assert asset.get("linked_device_id") == "AAHC01-01"
        
        print(f"✓ Asset AST-AAHC01-01 has linked_device_id: {asset.get('linked_device_id')}")
    
    def test_get_asset_with_device_data_endpoint(self):
        """Test GET /api/asset-mgmt/assets/{asset_id}/with-device endpoint"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/AST-AAHC01-01/with-device")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        asset = data["asset"]
        
        # Should have device_data enriched
        if asset.get("device_data"):
            device_data = asset["device_data"]
            assert device_data.get("device_id") == "AAHC01-01"
            assert device_data.get("locationcode") == "AAHC01"
            print(f"✓ Asset has enriched device_data: {device_data.get('device_id')}, location: {device_data.get('locationcode')}")
        else:
            print(f"✓ Asset linked_device_id: {asset.get('linked_device_id')}")


class TestUnlinkedDevicesEndpoint:
    """Tests for GET /api/asset-mgmt/devices/unlinked endpoint"""
    
    def test_get_unlinked_devices(self):
        """Test getting devices without assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/unlinked?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "devices" in data
        assert "total" in data
        
        # All returned devices should have no asset_id
        for device in data["devices"]:
            assert device.get("asset_id") is None or device.get("asset_id") == ""
        
        print(f"✓ Found {data['total']} unlinked devices")


class TestLinkedDevicesEndpoint:
    """Tests for GET /api/asset-mgmt/devices/linked endpoint"""
    
    def test_get_linked_devices(self):
        """Test getting devices with assets"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/linked")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "devices" in data
        assert "total" in data
        
        # All returned devices should have asset_id
        for device in data["devices"]:
            assert device.get("asset_id") is not None and device.get("asset_id") != ""
        
        print(f"✓ Found {data['total']} linked devices")
        if data["devices"]:
            print(f"✓ First linked device: {data['devices'][0]['device_id']} -> {data['devices'][0]['asset_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
