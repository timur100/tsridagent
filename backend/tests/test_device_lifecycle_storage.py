"""
Test Device Lifecycle Storage and Kit Availability Features
Tests for P0-Blocker fix: 'Geräte-Verfügbarkeit für Kits' Workflow

Features tested:
1. Storage Overview API - /api/device-lifecycle/storage/overview
2. Device creation with status 'in_storage' and tenant_id
3. Kit creation with available devices from storage
4. Device filtering by status and tenant
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://asset-mgmt-v2.preview.emergentagent.com')

class TestStorageOverviewAPI:
    """Tests for /api/device-lifecycle/storage/overview endpoint"""
    
    def test_storage_overview_returns_success(self):
        """Test that storage overview endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "storage" in data
        print(f"✓ Storage overview returned successfully")
    
    def test_storage_overview_has_required_fields(self):
        """Test that storage overview contains all required fields"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        data = response.json()
        storage = data.get("storage", {})
        
        # Check required fields
        assert "total_in_storage" in storage, "Missing total_in_storage"
        assert "available_for_kits" in storage, "Missing available_for_kits"
        assert "by_tenant" in storage, "Missing by_tenant"
        assert "by_type" in storage, "Missing by_type"
        assert "devices" in storage, "Missing devices list"
        print(f"✓ Storage overview has all required fields")
    
    def test_storage_overview_with_tenant_filter(self):
        """Test storage overview with tenant_id filter"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview?tenant_id=europcar")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Storage overview with tenant filter works")
    
    def test_storage_devices_have_available_for_kit_flag(self):
        """Test that devices in storage have available_for_kit flag"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        data = response.json()
        devices = data.get("storage", {}).get("devices", [])
        
        for device in devices:
            assert "available_for_kit" in device, f"Device {device.get('serial_number')} missing available_for_kit flag"
        print(f"✓ All devices have available_for_kit flag")


class TestDeviceCreationWithStorage:
    """Tests for device creation with status 'in_storage'"""
    
    def test_create_device_with_in_storage_status(self):
        """Test creating a device with status 'in_storage'"""
        unique_serial = f"TEST-STORAGE-{uuid.uuid4().hex[:8].upper()}"
        
        device_data = {
            "device_type": "tablet",
            "serial_number": unique_serial,
            "manufacturer": "Test Manufacturer",
            "model": "Test Model",
            "status": "in_storage",
            "tenant_id": "europcar"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/create",
            json=device_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "device_id" in data
        
        device_id = data["device_id"]
        print(f"✓ Created device {unique_serial} with status 'in_storage', ID: {device_id}")
        
        # Verify device appears in storage overview
        storage_response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        storage_data = storage_response.json()
        devices = storage_data.get("storage", {}).get("devices", [])
        
        device_found = any(d.get("serial_number") == unique_serial for d in devices)
        assert device_found, f"Device {unique_serial} not found in storage overview"
        print(f"✓ Device {unique_serial} appears in storage overview")
        
        # Cleanup - delete the test device
        requests.delete(f"{BASE_URL}/api/device-lifecycle/{device_id}")
        return device_id
    
    def test_device_with_in_storage_is_available_for_kit(self):
        """Test that device with status 'in_storage' and no kit_id is available for kits"""
        unique_serial = f"TEST-KIT-AVAIL-{uuid.uuid4().hex[:8].upper()}"
        
        device_data = {
            "device_type": "scanner_regula",
            "serial_number": unique_serial,
            "manufacturer": "Regula",
            "model": "Test Scanner",
            "status": "in_storage",
            "tenant_id": "europcar"
        }
        
        # Create device
        response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/create",
            json=device_data
        )
        data = response.json()
        device_id = data["device_id"]
        
        # Check storage overview
        storage_response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        storage_data = storage_response.json()
        devices = storage_data.get("storage", {}).get("devices", [])
        
        device = next((d for d in devices if d.get("serial_number") == unique_serial), None)
        assert device is not None, f"Device {unique_serial} not found"
        assert device.get("available_for_kit") == True, "Device should be available for kit"
        print(f"✓ Device {unique_serial} is available for kit")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/device-lifecycle/{device_id}")


class TestDeviceListFiltering:
    """Tests for device list filtering by status"""
    
    def test_filter_devices_by_in_storage_status(self):
        """Test filtering devices by status='in_storage'"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/list?status=in_storage")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        devices = data.get("devices", [])
        for device in devices:
            assert device.get("status") == "in_storage", f"Device {device.get('serial_number')} has wrong status"
        print(f"✓ Filter by status='in_storage' works, found {len(devices)} devices")
    
    def test_filter_devices_by_tenant(self):
        """Test filtering devices by tenant_id"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/list?tenant_id=europcar")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        devices = data.get("devices", [])
        for device in devices:
            assert device.get("tenant_id") == "europcar", f"Device {device.get('serial_number')} has wrong tenant"
        print(f"✓ Filter by tenant_id='europcar' works, found {len(devices)} devices")
    
    def test_combined_filter_status_and_tenant(self):
        """Test combined filtering by status and tenant"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/list?status=in_storage&tenant_id=europcar")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        devices = data.get("devices", [])
        for device in devices:
            assert device.get("status") == "in_storage"
            assert device.get("tenant_id") == "europcar"
        print(f"✓ Combined filter works, found {len(devices)} devices")


class TestKitCreationWithStorageDevices:
    """Tests for kit creation with devices from storage"""
    
    def test_kit_list_endpoint(self):
        """Test that kit list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "kits" in data
        print(f"✓ Kit list endpoint works, found {len(data.get('kits', []))} kits")
    
    def test_create_kit_with_storage_device(self):
        """Test creating a kit with a device from storage"""
        # First create a test device in storage
        unique_serial = f"TEST-KIT-DEV-{uuid.uuid4().hex[:8].upper()}"
        
        device_data = {
            "device_type": "tablet",
            "serial_number": unique_serial,
            "manufacturer": "Test",
            "model": "Kit Test Device",
            "status": "in_storage",
            "tenant_id": "europcar"
        }
        
        device_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/create",
            json=device_data
        )
        device_id = device_response.json().get("device_id")
        print(f"✓ Created test device {unique_serial} for kit")
        
        # Create a kit with this device
        kit_name = f"TEST-KIT-{uuid.uuid4().hex[:6].upper()}"
        kit_data = {
            "kit_name": kit_name,
            "tenant_id": "europcar",
            "location_code": "TEST01",
            "device_number": 1,
            "description": "Test kit for storage device",
            "device_ids": [device_id]
        }
        
        kit_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/create",
            json=kit_data
        )
        
        assert kit_response.status_code == 200
        kit_data_response = kit_response.json()
        assert kit_data_response.get("success") == True
        kit_id = kit_data_response.get("kit_id")
        print(f"✓ Created kit {kit_name} with device {unique_serial}")
        
        # Verify device is now linked to kit (not available for other kits)
        storage_response = requests.get(f"{BASE_URL}/api/device-lifecycle/storage/overview")
        storage_data = storage_response.json()
        devices = storage_data.get("storage", {}).get("devices", [])
        
        device = next((d for d in devices if d.get("serial_number") == unique_serial), None)
        if device:
            # Device might still be in storage but should have kit_id
            assert device.get("available_for_kit") == False or device.get("kit_id") is not None
        print(f"✓ Device correctly linked to kit")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/device-lifecycle/kits/{kit_id}")
        requests.delete(f"{BASE_URL}/api/device-lifecycle/{device_id}")


class TestDeviceStatuses:
    """Tests for device status definitions"""
    
    def test_get_device_statuses(self):
        """Test that device statuses endpoint returns all statuses"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/statuses")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        statuses = data.get("statuses", {})
        assert "in_storage" in statuses, "Missing 'in_storage' status"
        assert "active" in statuses, "Missing 'active' status"
        assert "defective" in statuses, "Missing 'defective' status"
        assert "out_of_service" in statuses, "Missing 'out_of_service' status"
        
        # Verify in_storage has correct label
        in_storage = statuses.get("in_storage", {})
        assert in_storage.get("label") == "Im Lager"
        print(f"✓ All device statuses present with correct labels")


class TestDeviceTypes:
    """Tests for device types"""
    
    def test_get_device_types(self):
        """Test that device types endpoint returns all types"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/types")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        types = data.get("types", {})
        assert "tablet" in types, "Missing 'tablet' type"
        assert "scanner_regula" in types or "scanner_desko" in types, "Missing scanner types"
        print(f"✓ Device types endpoint works, found {len(types)} types")


class TestTenantIntegration:
    """Tests for tenant integration with device lifecycle"""
    
    def test_tenants_endpoint(self):
        """Test that tenants endpoint returns available tenants"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        tenants = data.get("tenants", [])
        assert len(tenants) > 0, "No tenants found"
        
        # Check tenant structure
        for tenant in tenants:
            assert "tenant_id" in tenant
            assert "name" in tenant or "display_name" in tenant
        print(f"✓ Tenants endpoint works, found {len(tenants)} tenants")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
