"""
Test Asset ID Format Feature
Tests the new Asset ID format: [device_id]-[type_suffix]
Example: AAHC01-01-TAB for a tablet

Suffixes:
- TAB: Tablet
- SCA: Scanner
- TDO: Tablet Dock
- SDO: Scanner Dock
- TPS: Tablet PSU
- SPS: Scanner PSU
- USB: USB Extension
- LAN: LAN Extension
- 12V: 12V Extension
- KIT: Bundle
- OTH: Other
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://inventory-check-in.preview.emergentagent.com"


class TestMetadataEndpoint:
    """Test GET /api/asset-mgmt/metadata returns suffix map"""
    
    def test_metadata_returns_suffix_map(self):
        """Verify metadata endpoint returns asset_type_suffix_map"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "asset_type_suffix_map" in data
        
        suffix_map = data["asset_type_suffix_map"]
        
        # Verify expected suffixes
        assert suffix_map.get("tablet") == "TAB"
        assert suffix_map.get("tsrid_tablet") == "TAB"
        assert suffix_map.get("scanner") == "SCA"
        assert suffix_map.get("tsrid_scanner") == "SCA"
        assert suffix_map.get("tablet_dock") == "TDO"
        assert suffix_map.get("scanner_dock") == "SDO"
        assert suffix_map.get("tablet_psu") == "TPS"
        assert suffix_map.get("scanner_psu") == "SPS"
        assert suffix_map.get("usb_extension") == "USB"
        assert suffix_map.get("lan_extension") == "LAN"
        assert suffix_map.get("12v_extension") == "12V"
        assert suffix_map.get("bundle") == "KIT"
        assert suffix_map.get("other") == "OTH"
        
        print(f"PASS: Metadata endpoint returns suffix map with {len(suffix_map)} types")
    
    def test_metadata_contains_categories_with_suffixes(self):
        """Verify categories include suffix info"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("asset_type_categories", {})
        
        # Check TSRID category
        tsrid_items = categories.get("TSRID", [])
        assert len(tsrid_items) >= 2
        
        # Each item should have value, label, and suffix
        for item in tsrid_items:
            assert "value" in item
            assert "label" in item
            assert "suffix" in item
        
        # Verify specific TSRID items
        tsrid_values = {item["value"]: item for item in tsrid_items}
        assert "tsrid_tablet" in tsrid_values
        assert tsrid_values["tsrid_tablet"]["suffix"] == "TAB"
        assert "tsrid_scanner" in tsrid_values
        assert tsrid_values["tsrid_scanner"]["suffix"] == "SCA"
        
        print(f"PASS: Categories contain suffix info for {len(categories)} categories")


class TestAssetIDGeneration:
    """Test Asset ID generation with new format"""
    
    def test_create_asset_tablet_format(self):
        """Create asset from device with TAB suffix"""
        # Find a device without asset
        devices_response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no&limit=1")
        assert devices_response.status_code == 200
        
        devices = devices_response.json().get("devices", [])
        if not devices:
            pytest.skip("No unlinked devices available")
        
        device_id = devices[0]["device_id"]
        
        # Create asset with type tsrid_tablet
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{device_id}/create-asset",
            json={
                "device_id": device_id,
                "asset_type": "tsrid_tablet",
                "additional_data": {}
            }
        )
        
        assert create_response.status_code == 200, f"Failed: {create_response.text}"
        data = create_response.json()
        
        # Verify new format: device_id-TAB
        expected_asset_id = f"{device_id}-TAB"
        assert data.get("asset_id") == expected_asset_id, f"Expected {expected_asset_id}, got {data.get('asset_id')}"
        
        print(f"PASS: Created asset {data.get('asset_id')} with new format")
        
        # Cleanup: delete the created asset
        delete_response = requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
        # Also unset asset_id from device
        from pymongo import MongoClient
        # We can't unset directly via API, so we just note this needs cleanup
        
        return expected_asset_id, device_id
    
    def test_create_asset_scanner_format(self):
        """Create asset from device with SCA suffix"""
        # Find a device without asset
        devices_response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no&limit=1")
        assert devices_response.status_code == 200
        
        devices = devices_response.json().get("devices", [])
        if not devices:
            pytest.skip("No unlinked devices available")
        
        device_id = devices[0]["device_id"]
        
        # Create asset with type scanner
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{device_id}/create-asset",
            json={
                "device_id": device_id,
                "asset_type": "scanner",
                "additional_data": {}
            }
        )
        
        assert create_response.status_code == 200, f"Failed: {create_response.text}"
        data = create_response.json()
        
        # Verify new format: device_id-SCA
        expected_asset_id = f"{device_id}-SCA"
        assert data.get("asset_id") == expected_asset_id, f"Expected {expected_asset_id}, got {data.get('asset_id')}"
        
        print(f"PASS: Created asset {data.get('asset_id')} with scanner format")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
        
        return expected_asset_id
    
    def test_asset_id_format_for_all_suffixes(self):
        """Verify get_asset_type_suffix returns correct suffix for all types"""
        # Test by checking metadata
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200
        
        suffix_map = response.json().get("asset_type_suffix_map", {})
        
        expected_suffixes = {
            # Tablets
            "tablet": "TAB",
            "tsrid_tablet": "TAB",
            "surface_pro_4": "TAB",
            "surface_pro_6": "TAB",
            "surface_pro_7": "TAB",
            "surface_go": "TAB",
            # Scanners
            "scanner": "SCA",
            "tsrid_scanner": "SCA",
            "scanner_desko": "SCA",
            "scanner_regula": "SCA",
            # Tablet Docks
            "tablet_dock": "TDO",
            "dock_surface": "TDO",
            "dock": "TDO",
            # Scanner Docks
            "scanner_dock": "SDO",
            "dock_desko": "SDO",
            # Tablet PSU
            "tablet_psu": "TPS",
            "psu_surface": "TPS",
            "psu": "TPS",
            # Scanner PSU
            "scanner_psu": "SPS",
            "psu_desko": "SPS",
            # Extensions
            "usb_extension": "USB",
            "lan_extension": "LAN",
            "12v_extension": "12V",
            # Bundle
            "bundle": "KIT",
            # Other
            "other": "OTH"
        }
        
        for asset_type, expected_suffix in expected_suffixes.items():
            actual_suffix = suffix_map.get(asset_type)
            assert actual_suffix == expected_suffix, f"Type {asset_type}: expected {expected_suffix}, got {actual_suffix}"
        
        print(f"PASS: All {len(expected_suffixes)} asset types have correct suffixes")


class TestBulkCreateAssets:
    """Test bulk asset creation with new format"""
    
    def test_bulk_create_endpoint_exists(self):
        """Verify bulk create endpoint is accessible"""
        # Just test endpoint exists, don't actually create
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/bulk-create-assets?asset_type=tsrid_tablet",
            json=[]  # Empty list
        )
        
        # Should either succeed (with 0 processed) or return 4xx for empty list
        assert response.status_code in [200, 400, 422]
        
        print(f"PASS: Bulk create endpoint accessible (status: {response.status_code})")


class TestExistingAssetsWithNewFormat:
    """Test existing assets follow the new format"""
    
    def test_existing_assets_with_new_format(self):
        """Verify existing assets with new format are accessible"""
        # Get assets
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assets = data.get("assets", [])
        
        new_format_assets = []
        old_format_assets = []
        
        for asset in assets:
            asset_id = asset.get("asset_id", "")
            # New format: ends with -TAB, -SCA, -TDO, etc.
            if asset_id and any(asset_id.endswith(f"-{suffix}") for suffix in ["TAB", "SCA", "TDO", "SDO", "TPS", "SPS", "USB", "LAN", "12V", "KIT", "OTH"]):
                new_format_assets.append(asset_id)
            else:
                old_format_assets.append(asset_id)
        
        print(f"New format assets: {new_format_assets}")
        print(f"Old format assets: {old_format_assets}")
        
        # Expected: AGBC02-01-TAB, BCOC01-01-SCA exist
        assert "AGBC02-01-TAB" in new_format_assets or len(new_format_assets) > 0, "Expected new format assets"
        
        print(f"PASS: Found {len(new_format_assets)} assets with new format")


class TestAssetIDPreviewFormat:
    """Test asset ID preview logic matches backend generation"""
    
    def test_preview_format_matches_creation(self):
        """Verify the format shown in preview matches actual created asset"""
        # Get devices
        devices_response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no&limit=1")
        devices = devices_response.json().get("devices", [])
        
        if not devices:
            pytest.skip("No unlinked devices")
        
        device_id = devices[0]["device_id"]
        
        # Get metadata for suffix
        meta_response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        suffix_map = meta_response.json().get("asset_type_suffix_map", {})
        
        # For tablet_dock type
        asset_type = "tablet_dock"
        expected_suffix = suffix_map.get(asset_type, "OTH")
        expected_preview = f"{device_id}-{expected_suffix}"
        
        # Create asset
        create_response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{device_id}/create-asset",
            json={
                "device_id": device_id,
                "asset_type": asset_type,
                "additional_data": {}
            }
        )
        
        assert create_response.status_code == 200
        actual_asset_id = create_response.json().get("asset_id")
        
        assert actual_asset_id == expected_preview, f"Preview {expected_preview} != Created {actual_asset_id}"
        
        print(f"PASS: Preview format {expected_preview} matches created asset {actual_asset_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{actual_asset_id}")


class TestDuplicateAssetPrevention:
    """Test that duplicate asset IDs are prevented"""
    
    def test_cannot_create_duplicate_asset_id(self):
        """Creating asset with same device_id and type should fail"""
        # First, check if AGBC02-01-TAB exists
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets/AGBC02-01-TAB")
        
        if response.status_code == 200:
            # Asset exists, try to create duplicate
            create_response = requests.post(
                f"{BASE_URL}/api/asset-mgmt/devices/AGBC02-01/create-asset",
                json={
                    "device_id": "AGBC02-01",
                    "asset_type": "tsrid_tablet",  # TAB suffix
                    "additional_data": {}
                }
            )
            
            # Should fail with 400 or similar
            assert create_response.status_code in [400, 409], f"Expected error for duplicate, got {create_response.status_code}"
            print(f"PASS: Duplicate asset creation prevented (status: {create_response.status_code})")
        else:
            print("SKIP: Test asset AGBC02-01-TAB not found, skipping duplicate test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
