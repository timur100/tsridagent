"""
Test TeamViewer Account Data Storage and Retrieval
Tests that the backend correctly stores and returns TeamViewer account information
(account_assigned, account_email, account_company) from device registration.

Bug fix verification: device_agent.py lines 147-155
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestTeamViewerAccountData:
    """Tests for TeamViewer Account Data storage in device registration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique device ID for each test"""
        self.test_device_id = f"TEST-TV-ACCOUNT-{uuid.uuid4().hex[:8]}"
        self.test_computername = f"TEST-COMPUTER-{uuid.uuid4().hex[:4]}"
        yield
        # Cleanup: delete test device after each test
        try:
            requests.delete(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        except:
            pass
    
    def test_register_device_with_teamviewer_account_assigned_true(self):
        """Test: POST /api/device-agent/register stores TeamViewer account_assigned=true"""
        
        device_data = {
            "device_id": self.test_device_id,
            "computername": self.test_computername,
            "hostname": self.test_computername,
            "teamviewer_id": "1234567890",
            "teamviewer_version": "15.47.3",
            "teamviewer_status": "running",
            "teamviewer_account_assigned": True,
            "teamviewer_account_email": "test@europcar.com",
            "teamviewer_account_company": "Europcar Germany",
            "manufacturer": "Microsoft",
            "model": "Surface Pro 6",
            "ip_address": "192.168.1.100"
        }
        
        # Register the device
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True, f"Registration not successful: {data}"
        assert data["device_id"] == self.test_device_id
        
        # GET device to verify TeamViewer account data was stored
        get_response = requests.get(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        assert get_response.status_code == 200, f"GET device failed: {get_response.text}"
        
        device = get_response.json()["device"]
        
        # Verify TeamViewer account data is present in response
        assert "teamviewer" in device, "teamviewer object not in device response"
        
        tv_data = device["teamviewer"]
        assert tv_data.get("account_assigned") is True, f"account_assigned should be True, got: {tv_data.get('account_assigned')}"
        assert tv_data.get("account_email") == "test@europcar.com", f"account_email mismatch: {tv_data.get('account_email')}"
        assert tv_data.get("account_company") == "Europcar Germany", f"account_company mismatch: {tv_data.get('account_company')}"
        
        print(f"✓ TeamViewer account data stored correctly:")
        print(f"  - account_assigned: {tv_data.get('account_assigned')}")
        print(f"  - account_email: {tv_data.get('account_email')}")
        print(f"  - account_company: {tv_data.get('account_company')}")
    
    def test_register_device_with_teamviewer_account_assigned_false(self):
        """Test: POST /api/device-agent/register stores TeamViewer account_assigned=false"""
        
        device_data = {
            "device_id": self.test_device_id,
            "computername": self.test_computername,
            "hostname": self.test_computername,
            "teamviewer_id": "9876543210",
            "teamviewer_version": "15.47.3",
            "teamviewer_status": "running",
            "teamviewer_account_assigned": False,
            "teamviewer_account_email": None,
            "teamviewer_account_company": None,
            "manufacturer": "Microsoft",
            "model": "Surface Pro 4"
        }
        
        # Register the device
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        # GET device to verify TeamViewer account data was stored
        get_response = requests.get(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        assert get_response.status_code == 200
        
        device = get_response.json()["device"]
        tv_data = device["teamviewer"]
        
        assert tv_data.get("account_assigned") is False, f"account_assigned should be False, got: {tv_data.get('account_assigned')}"
        assert tv_data.get("account_email") is None, f"account_email should be None, got: {tv_data.get('account_email')}"
        
        print(f"✓ TeamViewer not linked device stored correctly:")
        print(f"  - account_assigned: {tv_data.get('account_assigned')}")
    
    def test_register_device_update_teamviewer_account_data(self):
        """Test: Updating device registration updates TeamViewer account data"""
        
        # First registration - not linked
        device_data = {
            "device_id": self.test_device_id,
            "computername": self.test_computername,
            "teamviewer_id": "5555555555",
            "teamviewer_version": "15.47.3",
            "teamviewer_account_assigned": False,
            "teamviewer_account_email": None,
            "teamviewer_account_company": None
        }
        
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200
        
        # Verify initial state
        get_response = requests.get(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        device = get_response.json()["device"]
        assert device["teamviewer"]["account_assigned"] is False
        
        # Second registration - now linked to account
        device_data["teamviewer_account_assigned"] = True
        device_data["teamviewer_account_email"] = "linked@europcar.com"
        device_data["teamviewer_account_company"] = "Europcar Fleet"
        
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200
        
        # Verify updated state
        get_response = requests.get(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        device = get_response.json()["device"]
        
        assert device["teamviewer"]["account_assigned"] is True, "account_assigned should be True after update"
        assert device["teamviewer"]["account_email"] == "linked@europcar.com", "account_email should be updated"
        assert device["teamviewer"]["account_company"] == "Europcar Fleet", "account_company should be updated"
        
        print("✓ TeamViewer account data updated correctly on re-registration")
    
    def test_devices_list_includes_teamviewer_account_data(self):
        """Test: GET /api/device-agent/devices list includes TeamViewer account data"""
        
        # Register a device with account data
        device_data = {
            "device_id": self.test_device_id,
            "computername": self.test_computername,
            "teamviewer_id": "1111111111",
            "teamviewer_version": "15.47.3",
            "teamviewer_account_assigned": True,
            "teamviewer_account_email": "list-test@europcar.com",
            "teamviewer_account_company": "Europcar Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200
        
        # Get devices list with search for our test device
        list_response = requests.get(f"{BASE_URL}/api/device-agent/devices?search={self.test_computername}")
        assert list_response.status_code == 200
        
        data = list_response.json()
        assert data["success"] is True
        
        # Find our test device in the list
        test_device = None
        for d in data["devices"]:
            if d["device_id"] == self.test_device_id:
                test_device = d
                break
        
        assert test_device is not None, "Test device not found in devices list"
        assert "teamviewer" in test_device, "teamviewer object missing from device in list"
        assert test_device["teamviewer"]["account_assigned"] is True
        assert test_device["teamviewer"]["account_email"] == "list-test@europcar.com"
        
        print("✓ Devices list includes TeamViewer account data")


class TestTeamViewerAccountEdgeCases:
    """Edge case tests for TeamViewer account data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_device_id = f"TEST-TV-EDGE-{uuid.uuid4().hex[:8]}"
        self.test_computername = f"TEST-EDGE-{uuid.uuid4().hex[:4]}"
        yield
        try:
            requests.delete(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        except:
            pass
    
    def test_register_device_without_teamviewer_account_fields(self):
        """Test: Device registration without TeamViewer account fields (backward compatibility)"""
        
        device_data = {
            "device_id": self.test_device_id,
            "computername": self.test_computername,
            "teamviewer_id": "2222222222",
            "teamviewer_version": "15.47.3",
            "teamviewer_status": "running"
            # Note: No account_assigned, account_email, account_company fields
        }
        
        response = requests.post(f"{BASE_URL}/api/device-agent/register", json=device_data)
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        # GET device - teamviewer object should still be present
        get_response = requests.get(f"{BASE_URL}/api/device-agent/devices/{self.test_device_id}")
        assert get_response.status_code == 200
        
        device = get_response.json()["device"]
        assert "teamviewer" in device
        
        # Account fields should be None/null if not provided
        tv_data = device["teamviewer"]
        print(f"✓ Device without account fields registered successfully")
        print(f"  - account_assigned: {tv_data.get('account_assigned')}")
        print(f"  - account_email: {tv_data.get('account_email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
