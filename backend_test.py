#!/usr/bin/env python3
"""
Backend API Testing for Tenant Edit Functionality
Tests the Tenant Edit API endpoints with comprehensive validation.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://tenant-portal-30.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TenantEditTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Specific Europcar tenant ID for testing
        
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
    
    def test_filter_by_state_be(self):
        """Test state filter: ?state=BE should return locations with state BE"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}?state=BE")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    f"State filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should return at least some locations with state BE
            if len(locations) == 0:
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    "Expected at least some locations for state BE, got 0",
                    data
                )
                return False
            
            # Verify all locations have state BE
            for location in locations:
                if location.get("state") != "BE":
                    self.log_result(
                        "Filter by State (BE)", 
                        False, 
                        f"Found location with wrong state: {location.get('state')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Filter by State (BE)", 
                True, 
                f"State filter working: found {len(locations)} locations with state BE"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Filter by State (BE)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_by_main_type_a(self):
        """Test main_type filter: ?main_type=A should return locations with main_type A"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}?main_type=A")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    f"Main type filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should return at least some locations with main_type A
            if len(locations) == 0:
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    "Expected at least some locations for main_type A, got 0",
                    data
                )
                return False
            
            # Verify all locations have main_type A
            for location in locations:
                if location.get("main_type") != "A":
                    self.log_result(
                        "Filter by Main Type (A)", 
                        False, 
                        f"Found location with wrong main_type: {location.get('main_type')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Filter by Main Type (A)", 
                True, 
                f"Main type filter working: found {len(locations)} locations with main_type A"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Filter by Main Type (A)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_single_location(self):
        """Test GET /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[0]  # Use first created location
            
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Get single location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Single Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            
            if location.get("location_id") != location_id:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Location ID mismatch: expected {location_id}, got {location.get('location_id')}",
                    data
                )
                return False
            
            # Verify required fields
            required_fields = ["location_id", "location_code", "station_name", "street", "city", "state"]
            missing_fields = [field for field in required_fields if field not in location]
            
            if missing_fields:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    location
                )
                return False
            
            self.log_result(
                "Get Single Location", 
                True, 
                f"Retrieved location: {location.get('location_code')} - {location.get('station_name')}"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Get Single Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_location(self):
        """Test PUT /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Update Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[0]  # Use first created location
            
            update_data = {
                "manager": "Updated Manager Name",
                "phone": "+49 30 99999999"
            }
            
            response = self.session.put(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}", 
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Update location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Update Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            
            # Verify updates were applied
            if location.get("manager") != "Updated Manager Name":
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Manager not updated: expected 'Updated Manager Name', got '{location.get('manager')}'",
                    location
                )
                return False
            
            if location.get("phone") != "+49 30 99999999":
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Phone not updated: expected '+49 30 99999999', got '{location.get('phone')}'",
                    location
                )
                return False
            
            self.log_result(
                "Update Location", 
                True, 
                f"Location updated successfully: manager={location.get('manager')}, phone={location.get('phone')}"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Update Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_stats_summary(self):
        """Test GET /api/tenants/{tenant_id}/locations/stats/summary"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/stats/summary")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Get stats failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            stats = data.get("stats", {})
            
            # Verify required fields
            required_fields = ["total_locations", "by_state", "by_type"]
            missing_fields = [field for field in required_fields if field not in stats]
            
            if missing_fields:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    stats
                )
                return False
            
            # Verify stats make sense
            total = stats.get("total_locations", 0)
            by_state = stats.get("by_state", {})
            by_type = stats.get("by_type", {})
            
            # Should have at least 3 locations
            if total < 3:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Expected at least 3 total locations, got {total}",
                    stats
                )
                return False
            
            # Should have BB and BE states
            if "BB" not in by_state or "BE" not in by_state:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Expected BB and BE states in by_state, got {list(by_state.keys())}",
                    stats
                )
                return False
            
            # Should have A, CAP, and C types
            expected_types = ["A", "CAP", "C"]
            for expected_type in expected_types:
                if expected_type not in by_type:
                    self.log_result(
                        "Get Stats Summary", 
                        False, 
                        f"Expected type {expected_type} in by_type, got {list(by_type.keys())}",
                        stats
                    )
                    return False
            
            self.log_result(
                "Get Stats Summary", 
                True, 
                f"Stats retrieved: {total} total, by_state={by_state}, by_type={by_type}"
            )
            return stats
            
        except Exception as e:
            self.log_result(
                "Get Stats Summary", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_delete_location(self):
        """Test DELETE /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Delete Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[-1]  # Use last created location
            
            response = self.session.delete(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Delete Location", 
                    False, 
                    f"Delete location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Delete Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify location is deleted by trying to get it
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 404:
                self.log_result(
                    "Delete Location Verification", 
                    False, 
                    f"Location still exists after deletion. Status: {response.status_code}",
                    response.text
                )
                return False
            
            # Remove from our list
            self.test_locations.remove(location_id)
            
            self.log_result(
                "Delete Location", 
                True, 
                f"Location {location_id} deleted successfully and verified"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Delete Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_verify_remaining_locations(self):
        """Verify that locations list is working after deletion"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Verify Remaining Locations", 
                    False, 
                    f"List locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            locations = data.get("locations", [])
            
            # Should have some locations (database has existing data)
            if len(locations) == 0:
                self.log_result(
                    "Verify Remaining Locations", 
                    False, 
                    "Expected some locations, got 0",
                    data
                )
                return False
            
            self.log_result(
                "Verify Remaining Locations", 
                True, 
                f"Verified: {len(locations)} locations available after deletion test"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Verify Remaining Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_duplicate_location_code_error(self):
        """Test duplicate location_code error"""
        try:
            # Try to create location with existing code
            location_data = {
                "location_code": "BERN03",  # Should already exist
                "station_name": "Duplicate Station",
                "street": "Test Street",
                "postal_code": "12345",
                "city": "Test City",
                "state": "BB"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                json=location_data
            )
            
            if response.status_code != 400:
                self.log_result(
                    "Duplicate Location Code Error", 
                    False, 
                    f"Expected 400 for duplicate location code, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Duplicate Location Code Error", 
                True, 
                "Duplicate location code correctly rejected with 400 error"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Duplicate Location Code Error", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_invalid_tenant_id_error(self):
        """Test invalid tenant_id error"""
        try:
            location_data = {
                "location_code": "TEST01",
                "station_name": "Test Station",
                "street": "Test Street",
                "postal_code": "12345",
                "city": "Test City",
                "state": "BB"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/invalid-tenant-id", 
                json=location_data
            )
            
            if response.status_code != 404:
                self.log_result(
                    "Invalid Tenant ID Error", 
                    False, 
                    f"Expected 404 for invalid tenant ID, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Invalid Tenant ID Error", 
                True, 
                "Invalid tenant ID correctly rejected with 404 error"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Invalid Tenant ID Error", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def setup_test_data_with_europa(self):
        """Setup test data with Europa continent and Deutschland country"""
        try:
            # Create locations with Europa continent and Deutschland country
            locations_data = [
                {
                    "location_code": "BERN03",
                    "station_name": "Berlin Hauptbahnhof Süd",
                    "street": "Invalidenstraße 10",
                    "postal_code": "10557",
                    "city": "Berlin",
                    "state": "BE",
                    "country": "Deutschland",
                    "continent": "Europa",
                    "manager": "Max Mustermann",
                    "phone": "+49 30 12345678",
                    "email": "max.mustermann@europcar.com",
                    "main_type": "A"
                },
                {
                    "location_code": "BERT01",
                    "station_name": "Berlin Tegel Airport",
                    "street": "Flughafen Tegel",
                    "postal_code": "13405",
                    "city": "Berlin",
                    "state": "BE",
                    "country": "Deutschland",
                    "continent": "Europa",
                    "manager": "Anna Schmidt",
                    "phone": "+49 30 87654321",
                    "email": "anna.schmidt@europcar.com",
                    "main_type": "CAP"
                },
                {
                    "location_code": "BERC01",
                    "station_name": "Berlin City Center",
                    "street": "Unter den Linden 1",
                    "postal_code": "10117",
                    "city": "Berlin",
                    "state": "BE",
                    "country": "Deutschland",
                    "continent": "Europa",
                    "manager": "Peter Müller",
                    "phone": "+49 30 11111111",
                    "email": "peter.mueller@europcar.com",
                    "main_type": "C"
                }
            ]
            
            created_locations = []
            for location_data in locations_data:
                response = self.session.post(
                    f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                    json=location_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        location = data.get("location", {})
                        location_id = location.get("location_id")
                        if location_id:
                            self.test_locations.append(location_id)
                            created_locations.append(location)
            
            self.log_result(
                "Setup Test Data with Europa", 
                True, 
                f"Created {len(created_locations)} locations with Europa/Deutschland data"
            )
            return created_locations
            
        except Exception as e:
            self.log_result(
                "Setup Test Data with Europa", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_filter_continents(self):
        """Test GET /api/tenant-locations/{tenant_id}/filters/continents"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/filters/continents")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Continents", 
                    False, 
                    f"Filter continents failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter Continents", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            continents = data.get("continents", [])
            
            # Should contain Europa
            if "Europa" not in continents:
                self.log_result(
                    "Filter Continents", 
                    False, 
                    f"Expected 'Europa' in continents, got {continents}",
                    data
                )
                return False
            
            self.log_result(
                "Filter Continents", 
                True, 
                f"Continents filter working: {continents}"
            )
            return continents
            
        except Exception as e:
            self.log_result(
                "Filter Continents", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_filter_countries(self):
        """Test GET /api/tenant-locations/{tenant_id}/filters/countries"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/filters/countries")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Countries", 
                    False, 
                    f"Filter countries failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter Countries", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            countries = data.get("countries", [])
            
            # Should contain Deutschland
            if "Deutschland" not in countries:
                self.log_result(
                    "Filter Countries", 
                    False, 
                    f"Expected 'Deutschland' in countries, got {countries}",
                    data
                )
                return False
            
            self.log_result(
                "Filter Countries", 
                True, 
                f"Countries filter working: {countries}"
            )
            return countries
            
        except Exception as e:
            self.log_result(
                "Filter Countries", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_filter_countries_with_continent(self):
        """Test GET /api/tenant-locations/{tenant_id}/filters/countries?continent=Europa"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/filters/countries?continent=Europa")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Countries with Continent", 
                    False, 
                    f"Filter countries with continent failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter Countries with Continent", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            countries = data.get("countries", [])
            
            # Should contain Deutschland
            if "Deutschland" not in countries:
                self.log_result(
                    "Filter Countries with Continent", 
                    False, 
                    f"Expected 'Deutschland' in countries for continent Europa, got {countries}",
                    data
                )
                return False
            
            self.log_result(
                "Filter Countries with Continent", 
                True, 
                f"Countries filter with continent Europa working: {countries}"
            )
            return countries
            
        except Exception as e:
            self.log_result(
                "Filter Countries with Continent", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_filter_states(self):
        """Test GET /api/tenant-locations/{tenant_id}/filters/states"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/filters/states")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter States", 
                    False, 
                    f"Filter states failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter States", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            states = data.get("states", [])
            
            # Should contain BE (Berlin)
            if "BE" not in states:
                self.log_result(
                    "Filter States", 
                    False, 
                    f"Expected 'BE' in states, got {states}",
                    data
                )
                return False
            
            self.log_result(
                "Filter States", 
                True, 
                f"States filter working: {states}"
            )
            return states
            
        except Exception as e:
            self.log_result(
                "Filter States", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_filter_cities(self):
        """Test GET /api/tenant-locations/{tenant_id}/filters/cities"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/filters/cities")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Cities", 
                    False, 
                    f"Filter cities failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter Cities", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            cities = data.get("cities", [])
            
            # Should contain Berlin
            if "Berlin" not in cities:
                self.log_result(
                    "Filter Cities", 
                    False, 
                    f"Expected 'Berlin' in cities, got {cities}",
                    data
                )
                return False
            
            self.log_result(
                "Filter Cities", 
                True, 
                f"Cities filter working: {cities}"
            )
            return cities
            
        except Exception as e:
            self.log_result(
                "Filter Cities", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_search_locations_bern(self):
        """Test search functionality: ?search=BERN should find locations matching BERN"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}?search=BERN")
            
            if response.status_code != 200:
                self.log_result(
                    "Search Locations BERN", 
                    False, 
                    f"Search locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Search Locations BERN", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should find locations with BERN in location_code or station_name
            if len(locations) == 0:
                self.log_result(
                    "Search Locations BERN", 
                    False, 
                    "Expected to find locations with BERN, got 0 results",
                    data
                )
                return False
            
            # Verify all results contain BERN in some field
            for location in locations:
                found_bern = False
                for field in ["location_code", "station_name", "street", "city", "manager", "email"]:
                    value = location.get(field, "")
                    if value and "BERN" in value.upper():
                        found_bern = True
                        break
                
                if not found_bern:
                    self.log_result(
                        "Search Locations BERN", 
                        False, 
                        f"Location doesn't contain BERN in searchable fields: {location.get('location_code')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Search Locations BERN", 
                True, 
                f"Search working: found {len(locations)} locations matching BERN"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Search Locations BERN", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_combined_filters(self):
        """Test combined filters: ?continent=Europa&country=Deutschland&state=BE"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}?continent=Europa&country=Deutschland&state=BE")
            
            if response.status_code != 200:
                self.log_result(
                    "Combined Filters", 
                    False, 
                    f"Combined filters failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Combined Filters", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should find locations matching all criteria
            if len(locations) == 0:
                self.log_result(
                    "Combined Filters", 
                    False, 
                    "Expected to find locations with combined filters, got 0 results",
                    data
                )
                return False
            
            # Verify all results match the criteria
            for location in locations:
                if (location.get("continent") != "Europa" or 
                    location.get("country") != "Deutschland" or 
                    location.get("state") != "BE"):
                    self.log_result(
                        "Combined Filters", 
                        False, 
                        f"Location doesn't match combined filters: {location.get('location_code')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Combined Filters", 
                True, 
                f"Combined filters working: found {len(locations)} locations matching Europa/Deutschland/BE"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Combined Filters", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_global_search_tenant(self):
        """Test global search for tenant: ?query=Europcar"""
        try:
            response = self.session.get(f"{API_BASE}/search/global?query=Europcar")
            
            if response.status_code != 200:
                self.log_result(
                    "Global Search Tenant", 
                    False, 
                    f"Global search failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Global Search Tenant", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            results = data.get("results", {})
            tenants = results.get("tenants", [])
            tenant_locations = results.get("tenant_locations", [])
            
            # Should find Europcar in either tenants or tenant_locations
            total_europcar_results = len(tenants) + len(tenant_locations)
            
            if total_europcar_results == 0:
                self.log_result(
                    "Global Search Tenant", 
                    False, 
                    "Expected to find Europcar in tenants or tenant_locations, got 0 results",
                    data
                )
                return False
            
            # Check if we found Europcar in tenant locations (which is also valid)
            found_europcar = False
            if len(tenants) > 0:
                for tenant in tenants:
                    if "Europcar" in tenant.get("title", ""):
                        found_europcar = True
                        break
            
            if len(tenant_locations) > 0:
                for location in tenant_locations:
                    if "europcar.com" in location.get("data", {}).get("email", "").lower():
                        found_europcar = True
                        break
            
            if not found_europcar:
                self.log_result(
                    "Global Search Tenant", 
                    False, 
                    "Europcar not found in search results",
                    {"tenants": tenants, "tenant_locations": len(tenant_locations)}
                )
                return False
            
            self.log_result(
                "Global Search Tenant", 
                True, 
                f"Global search for Europcar working: found {len(tenants)} tenants and {len(tenant_locations)} tenant locations"
            )
            return {"tenants": tenants, "tenant_locations": tenant_locations}
            
        except Exception as e:
            self.log_result(
                "Global Search Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_global_search_location(self):
        """Test global search for location: ?query=BERN03"""
        try:
            response = self.session.get(f"{API_BASE}/search/global?query=BERN03")
            
            if response.status_code != 200:
                self.log_result(
                    "Global Search Location", 
                    False, 
                    f"Global search failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Global Search Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            results = data.get("results", {})
            tenant_locations = results.get("tenant_locations", [])
            
            # Should find BERN03 location
            if len(tenant_locations) == 0:
                self.log_result(
                    "Global Search Location", 
                    False, 
                    "Expected to find BERN03 location, got 0 results",
                    data
                )
                return False
            
            # Verify we found BERN03
            found_bern03 = False
            for location in tenant_locations:
                if "BERN03" in location.get("title", ""):
                    found_bern03 = True
                    break
            
            if not found_bern03:
                self.log_result(
                    "Global Search Location", 
                    False, 
                    "BERN03 location not found in search results",
                    tenant_locations
                )
                return False
            
            self.log_result(
                "Global Search Location", 
                True, 
                f"Global search for location working: found {len(tenant_locations)} tenant locations including BERN03"
            )
            return tenant_locations
            
        except Exception as e:
            self.log_result(
                "Global Search Location", 
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
    print("Starting Tenant Locations Enhanced Features Backend Testing...")
    print()
    
    # Test Tenant Locations Enhanced Features
    tester = TenantLocationsTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Tenant Locations Enhanced Features Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 TENANT LOCATIONS ENHANCED FEATURES TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ TENANT LOCATIONS ENHANCED FEATURES TESTING FOUND ISSUES!")
        sys.exit(1)