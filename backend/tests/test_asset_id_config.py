"""
Test Asset-ID Configuration Endpoints
Tests: GET /api/asset-mgmt/asset-id-config, PUT /api/asset-mgmt/asset-id-config, 
       GET /api/asset-mgmt/asset-id-config/next-id, POST /api/asset-mgmt/asset-id-config/reset-counter
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestAssetIdConfig:
    """Tests for Asset-ID Configuration endpoints"""
    
    def test_get_asset_id_config(self):
        """Test GET /api/asset-mgmt/asset-id-config - Retrieve configuration"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "config" in data
        
        config = data["config"]
        assert "tenant_id" in config
        assert "warehouse_prefix" in config
        assert "formats" in config
        
        # Verify formats list contains asset types
        formats = config["formats"]
        assert isinstance(formats, list)
        assert len(formats) > 0
        
        # Check structure of format entries
        if formats:
            format_entry = formats[0]
            assert "asset_type" in format_entry
            assert "type_suffix" in format_entry
            assert "warehouse_example" in format_entry
            assert "location_example" in format_entry
        
        print(f"GET /asset-id-config PASSED - Warehouse prefix: {config['warehouse_prefix']}, Formats count: {len(formats)}")
    
    def test_get_next_id_tab_tsr_i7(self):
        """Test GET /api/asset-mgmt/asset-id-config/next-id for tab_tsr_i7"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify response structure
        assert "asset_type" in data
        assert data["asset_type"] == "tab_tsr_i7"
        assert "next_sequence" in data
        assert "next_asset_id" in data
        assert "format_info" in data
        
        # Verify format info
        format_info = data["format_info"]
        assert "prefix" in format_info
        assert "type_suffix" in format_info
        
        # Verify next_asset_id format matches pattern
        next_id = data["next_asset_id"]
        assert "-TAB-i7-" in next_id or "-TAB-TSRi7-" in next_id
        
        print(f"GET /asset-id-config/next-id PASSED - Next ID: {next_id}, Sequence: {data['next_sequence']}")
    
    def test_get_next_id_various_types(self):
        """Test GET /api/asset-mgmt/asset-id-config/next-id for various asset types"""
        test_types = ["tab_sp4", "sca_dsk", "sca_tsr", "tab_sp6"]
        
        for asset_type in test_types:
            response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type={asset_type}")
            
            assert response.status_code == 200, f"Failed for type {asset_type}"
            data = response.json()
            assert data["success"] is True, f"Failed for type {asset_type}"
            assert data["asset_type"] == asset_type
            assert "next_asset_id" in data
            
            print(f"  {asset_type}: {data['next_asset_id']}")
        
        print(f"GET /asset-id-config/next-id for various types PASSED")
    
    def test_update_prefix(self):
        """Test PUT /api/asset-mgmt/asset-id-config - Update warehouse prefix"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config")
        original_prefix = get_response.json()["config"]["warehouse_prefix"]
        
        # Update to a test prefix
        test_prefix = "TEST"
        response = requests.put(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config",
            json={
                "tenant_id": "default",
                "warehouse_prefix": test_prefix
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify the update was applied
        verify_response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config")
        verify_data = verify_response.json()
        assert verify_data["config"]["warehouse_prefix"] == test_prefix
        
        # Verify next-id uses new prefix
        next_id_response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        next_id_data = next_id_response.json()
        assert next_id_data["next_asset_id"].startswith(test_prefix)
        
        # Restore original prefix
        restore_response = requests.put(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config",
            json={
                "tenant_id": "default",
                "warehouse_prefix": original_prefix
            }
        )
        assert restore_response.status_code == 200
        
        print(f"PUT /asset-id-config PASSED - Updated to '{test_prefix}', restored to '{original_prefix}'")
    
    def test_reset_counter_with_warning(self):
        """Test POST /api/asset-mgmt/asset-id-config/reset-counter"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/reset-counter",
            json={
                "asset_type": "tab_tsr_i7",
                "new_value": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify response structure
        assert "asset_type" in data
        assert data["asset_type"] == "tab_tsr_i7"
        assert "current_next_sequence" in data
        assert "current_next_id" in data
        assert "requested_value" in data
        assert data["requested_value"] == 1
        assert "note" in data
        
        # Warning may or may not be present depending on existing assets
        # If assets exist with sequence >= 1, warning should be present
        if data.get("warning"):
            print(f"  Warning received (expected): {data['warning']}")
        else:
            print(f"  No warning - no existing assets with sequence >= 1")
        
        print(f"POST /asset-id-config/reset-counter PASSED - Current next: {data['current_next_id']}")
    
    def test_reset_counter_with_high_value(self):
        """Test reset-counter with a high value (should produce warning if assets exist)"""
        # Get current next sequence first
        next_id_response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=tab_tsr_i7")
        current_next = next_id_response.json()["next_sequence"]
        
        # Try to reset to a value lower than current next (should warn if assets exist)
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/reset-counter",
            json={
                "asset_type": "tab_tsr_i7",
                "new_value": max(1, current_next - 1)
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        print(f"POST /asset-id-config/reset-counter (high value) PASSED")


class TestAssetIdConfigEdgeCases:
    """Edge case tests for Asset-ID Config"""
    
    def test_get_next_id_unknown_type(self):
        """Test next-id with an unknown asset type"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=unknown_type_xyz")
        
        assert response.status_code == 200
        data = response.json()
        # Should return OTH suffix for unknown types
        assert "OTH" in data.get("next_asset_id", "") or "OTH" in data.get("format_info", {}).get("type_suffix", "")
        
        print(f"GET /asset-id-config/next-id (unknown type) PASSED - Falls back to OTH")
    
    def test_update_prefix_empty_string(self):
        """Test updating prefix with empty string (should handle gracefully)"""
        # This tests error handling - empty prefix might not be allowed
        response = requests.put(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config",
            json={
                "tenant_id": "default",
                "warehouse_prefix": ""
            }
        )
        
        # Either 200 (accepted) or 400/422 (validation error) is acceptable
        assert response.status_code in [200, 400, 422]
        
        # Restore to TSRID if empty was accepted
        if response.status_code == 200:
            requests.put(
                f"{BASE_URL}/api/asset-mgmt/asset-id-config",
                json={
                    "tenant_id": "default",
                    "warehouse_prefix": "TSRID"
                }
            )
        
        print(f"PUT /asset-id-config (empty prefix) PASSED - Status: {response.status_code}")
    
    def test_reset_counter_invalid_value(self):
        """Test reset-counter with invalid value (0 or negative)"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/asset-id-config/reset-counter",
            json={
                "asset_type": "tab_tsr_i7",
                "new_value": 0  # Invalid - must be >= 1
            }
        )
        
        # Should return validation error
        assert response.status_code == 422
        
        print(f"POST /asset-id-config/reset-counter (invalid value) PASSED - Returns 422")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
