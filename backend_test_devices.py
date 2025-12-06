#!/usr/bin/env python3
"""
Backend API Testing for Tenant Devices with Location Data Enrichment
Tests the Tenant Devices API endpoints with location data enrichment functionality.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://asset-manager-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TenantDevicesTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.europcar_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Specific Europcar tenant ID
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_admin(self):
        """Authenticate as admin user for testing"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    f"Authentication failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data
                )
                return False
            
            self.admin_token = data["access_token"]
            self.session.headers.update({
                'Authorization': f'Bearer {self.admin_token}'
            })
            
            self.log_result(
                "Admin Authentication", 
                True, 
                "Successfully authenticated as admin@tsrid.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_tenant_specific_devices(self):
        """Test GET /api/tenant-devices/{tenant_id} - Tenant-specific devices with location data"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-devices/{self.europcar_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Tenant-Specific Devices", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Tenant-Specific Devices", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            response_data = data.get("data", {})
            devices = response_data.get("devices", [])
            summary = response_data.get("summary", {})
            
            if not devices:
                self.log_result(
                    "Tenant-Specific Devices", 
                    False, 
                    "No devices found in response",
                    data
                )
                return False
            
            # Verify each device has required fields including street and zip
            required_fields = ["device_id", "locationcode", "city", "street", "zip"]
            devices_with_location_data = 0
            
            for device in devices:
                missing_fields = [field for field in required_fields if field not in device]
                if missing_fields:
                    self.log_result(
                        "Tenant-Specific Devices", 
                        False, 
                        f"Device missing required fields: {missing_fields}",
                        device
                    )
                    return False
                
                # Check if device has location data (street and zip are not empty)
                if device.get("street") and device.get("zip"):
                    devices_with_location_data += 1
            
            self.log_result(
                "Tenant-Specific Devices", 
                True, 
                f"Retrieved {len(devices)} devices, {devices_with_location_data} with location data. Summary: {summary}"
            )
            return devices
            
        except Exception as e:
            self.log_result(
                "Tenant-Specific Devices", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_all_devices(self):
        """Test GET /api/tenant-devices/all/devices - All devices with location data"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-devices/all/devices")
            
            if response.status_code != 200:
                self.log_result(
                    "All Devices", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "All Devices", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            response_data = data.get("data", {})
            devices = response_data.get("devices", [])
            summary = response_data.get("summary", {})
            
            if not devices:
                self.log_result(
                    "All Devices", 
                    False, 
                    "No devices found in response",
                    data
                )
                return False
            
            # Verify each device has required fields including street and zip
            required_fields = ["device_id", "locationcode", "city", "street", "zip"]
            devices_with_location_data = 0
            
            for device in devices:
                missing_fields = [field for field in required_fields if field not in device]
                if missing_fields:
                    self.log_result(
                        "All Devices", 
                        False, 
                        f"Device missing required fields: {missing_fields}",
                        device
                    )
                    return False
                
                # Check if device has location data (street and zip are not empty)
                if device.get("street") and device.get("zip"):
                    devices_with_location_data += 1
            
            # Should have around 215 devices as mentioned in the review request
            total_devices = len(devices)
            if total_devices < 200:
                self.log_result(
                    "All Devices", 
                    False, 
                    f"Expected around 215 devices, got {total_devices}",
                    {"total": total_devices, "summary": summary}
                )
                return False
            
            self.log_result(
                "All Devices", 
                True, 
                f"Retrieved {total_devices} devices, {devices_with_location_data} with location data. Summary: {summary}"
            )
            return devices
            
        except Exception as e:
            self.log_result(
                "All Devices", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_bern03_device_location_data(self, devices):
        """Test specific BERN03 device location data mapping"""
        try:
            if not devices:
                self.log_result(
                    "BERN03 Device Location Data", 
                    False, 
                    "No devices provided for testing"
                )
                return False
            
            # Find device with locationcode BERN03
            bern03_device = None
            for device in devices:
                if device.get("locationcode") == "BERN03":
                    bern03_device = device
                    break
            
            if not bern03_device:
                self.log_result(
                    "BERN03 Device Location Data", 
                    False, 
                    "No device found with locationcode BERN03",
                    {"available_locationcodes": [d.get("locationcode") for d in devices[:10]]}  # Show first 10
                )
                return False
            
            # Verify expected location data for BERN03
            expected_street = "SCHWANEBECKER CHAUSSEE 12"
            expected_zip = "16321"
            
            actual_street = bern03_device.get("street", "")
            actual_zip = bern03_device.get("zip", "")
            
            if actual_street != expected_street:
                self.log_result(
                    "BERN03 Device Location Data", 
                    False, 
                    f"Street mismatch for BERN03. Expected: '{expected_street}', Got: '{actual_street}'",
                    bern03_device
                )
                return False
            
            if actual_zip != expected_zip:
                self.log_result(
                    "BERN03 Device Location Data", 
                    False, 
                    f"ZIP mismatch for BERN03. Expected: '{expected_zip}', Got: '{actual_zip}'",
                    bern03_device
                )
                return False
            
            self.log_result(
                "BERN03 Device Location Data", 
                True, 
                f"BERN03 device correctly mapped: street='{actual_street}', zip='{actual_zip}'"
            )
            return bern03_device
            
        except Exception as e:
            self.log_result(
                "BERN03 Device Location Data", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_device_location_data_validation(self, devices):
        """Test validation of device location data mapping"""
        try:
            if not devices:
                self.log_result(
                    "Device Location Data Validation", 
                    False, 
                    "No devices provided for testing"
                )
                return False
            
            # Test 3-5 different devices as requested
            test_devices = devices[:5]  # Take first 5 devices
            validated_devices = 0
            devices_with_location = 0
            devices_without_location = 0
            
            for device in test_devices:
                device_id = device.get("device_id", "unknown")
                locationcode = device.get("locationcode", "")
                street = device.get("street", "")
                zip_code = device.get("zip", "")
                
                # Verify that street and zip fields exist (even if empty)
                if "street" not in device or "zip" not in device:
                    self.log_result(
                        "Device Location Data Validation", 
                        False, 
                        f"Device {device_id} missing street or zip fields",
                        device
                    )
                    return False
                
                # Count devices with and without location data
                if street and zip_code:
                    devices_with_location += 1
                    print(f"   Device {device_id} (locationcode: {locationcode}) has location: street='{street}', zip='{zip_code}'")
                else:
                    devices_without_location += 1
                    print(f"   Device {device_id} (locationcode: {locationcode}) has empty location data")
                
                validated_devices += 1
            
            self.log_result(
                "Device Location Data Validation", 
                True, 
                f"Validated {validated_devices} devices: {devices_with_location} with location data, {devices_without_location} without"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Device Location Data Validation", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_edge_cases_devices_without_location_match(self, devices):
        """Test edge cases: devices without location match should have empty strings"""
        try:
            if not devices:
                self.log_result(
                    "Edge Cases - Devices Without Location Match", 
                    False, 
                    "No devices provided for testing"
                )
                return False
            
            # Find devices that should have empty location data
            devices_without_match = []
            devices_with_empty_location = []
            
            for device in devices:
                locationcode = device.get("locationcode", "")
                street = device.get("street", "")
                zip_code = device.get("zip", "")
                
                # If device has no locationcode or empty locationcode
                if not locationcode:
                    devices_without_match.append(device)
                    if street == "" and zip_code == "":
                        devices_with_empty_location.append(device)
                # If device has locationcode but no location data (empty strings)
                elif street == "" and zip_code == "":
                    devices_with_empty_location.append(device)
            
            # Verify that devices without location match have empty strings
            edge_case_count = len(devices_with_empty_location)
            
            if edge_case_count == 0:
                # This might be okay if all devices have location matches
                self.log_result(
                    "Edge Cases - Devices Without Location Match", 
                    True, 
                    "All devices have location data - no edge cases found (this is acceptable)"
                )
                return True
            
            # Verify that devices with empty location data have empty strings (not None or missing)
            for device in devices_with_empty_location[:3]:  # Check first 3
                if device.get("street") != "" or device.get("zip") != "":
                    self.log_result(
                        "Edge Cases - Devices Without Location Match", 
                        False, 
                        f"Device should have empty strings but has: street='{device.get('street')}', zip='{device.get('zip')}'",
                        device
                    )
                    return False
            
            self.log_result(
                "Edge Cases - Devices Without Location Match", 
                True, 
                f"Found {edge_case_count} devices with empty location data (correctly set to empty strings)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Edge Cases - Devices Without Location Match", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all tenant devices tests"""
        print("=" * 70)
        print("TENANT DEVICES WITH LOCATION DATA ENRICHMENT TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Europcar Tenant ID: {self.europcar_tenant_id}")
        print("=" * 70)
        print()
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 1: Test tenant-specific devices
        print("\n🔍 STEP 1: Testing Tenant-Specific Devices...")
        tenant_devices = self.test_tenant_specific_devices()
        
        # Step 2: Test all devices
        print("\n🔍 STEP 2: Testing All Devices...")
        all_devices = self.test_all_devices()
        
        # Step 3: Test specific BERN03 device location data
        print("\n🔍 STEP 3: Testing BERN03 Device Location Data...")
        if tenant_devices:
            self.test_bern03_device_location_data(tenant_devices)
        elif all_devices:
            self.test_bern03_device_location_data(all_devices)
        
        # Step 4: Test device location data validation
        print("\n🔍 STEP 4: Testing Device Location Data Validation...")
        if tenant_devices:
            self.test_device_location_data_validation(tenant_devices)
        elif all_devices:
            self.test_device_location_data_validation(all_devices)
        
        # Step 5: Test edge cases
        print("\n🔍 STEP 5: Testing Edge Cases...")
        if all_devices:
            self.test_edge_cases_devices_without_location_match(all_devices)
        elif tenant_devices:
            self.test_edge_cases_devices_without_location_match(tenant_devices)
        
        # Summary
        print("\n" + "=" * 70)
        print("TENANT DEVICES WITH LOCATION DATA ENRICHMENT TESTING SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\n❌ ISSUES FOUND:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        # Print successful tests
        successful_tests = [r for r in self.results if r['success']]
        if successful_tests:
            print("\n✅ SUCCESSFUL CHECKS:")
            for test in successful_tests:
                print(f"   • {test['test']}")
        
        return len(failed_tests) == 0

if __name__ == "__main__":
    print("Starting Tenant Devices with Location Data Enrichment Backend Testing...")
    print()
    
    # Test Tenant Devices with Location Data Enrichment
    tester = TenantDevicesTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Tenant Devices Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 TENANT DEVICES WITH LOCATION DATA ENRICHMENT TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ TENANT DEVICES WITH LOCATION DATA ENRICHMENT TESTING FOUND ISSUES!")
        sys.exit(1)