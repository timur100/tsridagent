"""
Test suite for Label Printer API endpoints
Tests: Printer settings, connection tests, print methods
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://direct-print-ipp.preview.emergentagent.com').rstrip('/')


class TestLabelPrinterSettings:
    """Test label printer settings API"""
    
    def test_get_printer_settings(self):
        """GET /api/label-printer/settings - should return default or saved settings"""
        response = requests.get(f"{BASE_URL}/api/label-printer/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get('success') is True
        assert 'settings' in data
        
        settings = data['settings']
        assert 'ip_address' in settings
        assert 'port' in settings
        assert 'name' in settings
        
        # Verify default IP address is prefilled
        assert settings['ip_address'] == '192.168.118.1', "IP should be 192.168.118.1"
        assert settings['port'] == 9100
        print(f"SUCCESS: Printer settings retrieved - IP: {settings['ip_address']}:{settings['port']}")
    
    def test_save_printer_settings(self):
        """POST /api/label-printer/settings - should save new settings"""
        payload = {
            "ip_address": "192.168.118.1",
            "port": 9100,
            "name": "Brother QL-820NWB",
            "print_method": "network",
            "is_default": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/label-printer/settings",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('success') is True
        assert 'message' in data
        print(f"SUCCESS: Printer settings saved - {data.get('message')}")


class TestPrinterConnection:
    """Test printer connection test API"""
    
    def test_connection_with_ip_address_field(self):
        """POST /api/label-printer/test-connection with ip_address field"""
        payload = {
            "ip_address": "192.168.118.1",
            "port": 9100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Connection will fail (printer not reachable from server) but API should work
        assert 'success' in data
        assert 'message' in data
        assert 'status' in data
        
        # Expected: offline because printer is not reachable from server
        print(f"SUCCESS: Connection test API works - Status: {data['status']}, Message: {data['message']}")
    
    def test_connection_with_printer_ip_field(self):
        """POST /api/label-printer/test-connection with printer_ip field (backward compatibility)"""
        payload = {
            "printer_ip": "192.168.118.1",
            "printer_port": 9100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'success' in data
        assert 'message' in data
        print(f"SUCCESS: Connection test with printer_ip field works - {data['message']}")
    
    def test_connection_without_ip(self):
        """POST /api/label-printer/test-connection without IP should return error"""
        payload = {
            "port": 9100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/label-printer/test-connection",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate no IP was provided
        assert data.get('success') is False
        print(f"SUCCESS: API correctly handles missing IP - {data.get('message')}")


class TestPrintMethods:
    """Test print methods endpoint"""
    
    def test_get_print_methods(self):
        """GET /api/label-printer/methods - should return all 3 print methods"""
        response = requests.get(f"{BASE_URL}/api/label-printer/methods")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('success') is True
        assert 'methods' in data
        
        methods = data['methods']
        assert len(methods) == 3, f"Expected 3 print methods, got {len(methods)}"
        
        # Check for all three methods
        method_ids = [m['id'] for m in methods]
        assert 'network' in method_ids, "Network method missing"
        assert 'bluetooth' in method_ids, "Bluetooth method missing"
        assert 'browser' in method_ids, "Browser method missing"
        
        print(f"SUCCESS: All 3 print methods available: {method_ids}")


class TestPrinterStatus:
    """Test printer status endpoint"""
    
    def test_get_printer_status(self):
        """GET /api/label-printer/status - should return printer configuration"""
        response = requests.get(f"{BASE_URL}/api/label-printer/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify status response structure
        assert 'default_ip' in data
        assert 'default_port' in data
        assert 'label_size' in data
        assert 'supported_printer' in data
        
        # Verify expected values
        assert data['default_ip'] == '192.168.118.1'
        assert data['default_port'] == 9100
        assert data['label_size']['width_mm'] == 62
        
        print(f"SUCCESS: Printer status - {data['supported_printer']} at {data['default_ip']}:{data['default_port']}")


class TestLabelPreview:
    """Test label preview endpoint"""
    
    def test_preview_label(self):
        """GET /api/label-printer/preview/{asset_id} - should return PNG image"""
        asset_id = "TEST-ASSET-001"
        
        response = requests.get(
            f"{BASE_URL}/api/label-printer/preview/{asset_id}",
            params={
                "type_label": "Test Label",
                "sn": "TEST-SN-12345"
            }
        )
        
        assert response.status_code == 200
        assert 'image/png' in response.headers.get('content-type', '')
        assert len(response.content) > 0
        
        print(f"SUCCESS: Label preview generated - Size: {len(response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, '-v'])
