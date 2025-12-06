#!/usr/bin/env python3
"""
Tenant Locations Device Count Testing
Tests that tenant locations endpoint returns device_count and online_device_count fields correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://asset-manager-pro-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TenantLocationsDeviceCountTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar tenant ID
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data and not success:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_admin(self):
        """Authenticate as admin user"""
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
            
            self.log_result(
                "Admin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def get_tenant_locations(self):
        """Get tenant locations with device counts"""
        try:
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Get Tenant Locations", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            if not isinstance(data, dict):
                self.log_result(
                    "Get Tenant Locations", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return None
            
            if not data.get("success"):
                self.log_result(
                    "Get Tenant Locations", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            locations = data.get("locations", [])
            total = data.get("total", 0)
            
            self.log_result(
                "Get Tenant Locations", 
                True, 
                f"Successfully retrieved {total} locations"
            )
            
            return locations
            
        except Exception as e:
            self.log_result(
                "Get Tenant Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None

    def verify_device_count_fields(self, locations):
        """Verify that all locations have device_count and online_device_count fields"""
        try:
            if not locations:
                self.log_result(
                    "Device Count Fields Verification", 
                    False, 
                    "No locations provided for verification"
                )
                return False
            
            missing_fields = []
            locations_with_fields = 0
            
            for location in locations:
                location_code = location.get('location_code', 'Unknown')
                has_device_count = 'device_count' in location
                has_online_device_count = 'online_device_count' in location
                
                if not has_device_count:
                    missing_fields.append(f"{location_code}: missing device_count")
                if not has_online_device_count:
                    missing_fields.append(f"{location_code}: missing online_device_count")
                
                if has_device_count and has_online_device_count:
                    locations_with_fields += 1
            
            success = len(missing_fields) == 0
            
            if success:
                self.log_result(
                    "Device Count Fields Verification", 
                    True, 
                    f"All {len(locations)} locations have device_count and online_device_count fields"
                )
            else:
                self.log_result(
                    "Device Count Fields Verification", 
                    False, 
                    f"Missing fields found: {', '.join(missing_fields[:10])}" + ("..." if len(missing_fields) > 10 else "")
                )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Device Count Fields Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_device_count_values(self, locations):
        """Verify that device count values are reasonable (non-negative integers)"""
        try:
            if not locations:
                self.log_result(
                    "Device Count Values Verification", 
                    False, 
                    "No locations provided for verification"
                )
                return False
            
            invalid_values = []
            valid_locations = 0
            total_devices = 0
            total_online = 0
            
            for location in locations:
                location_code = location.get('location_code', 'Unknown')
                device_count = location.get('device_count')
                online_device_count = location.get('online_device_count')
                
                # Check device_count
                if not isinstance(device_count, int) or device_count < 0:
                    invalid_values.append(f"{location_code}: device_count={device_count} (should be non-negative integer)")
                
                # Check online_device_count
                if not isinstance(online_device_count, int) or online_device_count < 0:
                    invalid_values.append(f"{location_code}: online_device_count={online_device_count} (should be non-negative integer)")
                
                # Check logical consistency (online <= total)
                if isinstance(device_count, int) and isinstance(online_device_count, int):
                    if online_device_count > device_count:
                        invalid_values.append(f"{location_code}: online_device_count ({online_device_count}) > device_count ({device_count})")
                    else:
                        valid_locations += 1
                        total_devices += device_count
                        total_online += online_device_count
            
            success = len(invalid_values) == 0
            
            if success:
                self.log_result(
                    "Device Count Values Verification", 
                    True, 
                    f"All {len(locations)} locations have valid device counts. Total devices: {total_devices}, Total online: {total_online}"
                )
            else:
                self.log_result(
                    "Device Count Values Verification", 
                    False, 
                    f"Invalid values found: {', '.join(invalid_values[:5])}" + ("..." if len(invalid_values) > 5 else "")
                )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Device Count Values Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_sample_locations(self, locations, sample_size=5):
        """Verify device counts for a sample of locations"""
        try:
            if not locations:
                self.log_result(
                    "Sample Locations Verification", 
                    False, 
                    "No locations provided for verification"
                )
                return False
            
            # Take first N locations or all if less than sample_size
            sample_locations = locations[:min(sample_size, len(locations))]
            
            verified_locations = []
            
            for location in sample_locations:
                location_code = location.get('location_code', 'Unknown')
                station_name = location.get('station_name', 'Unknown')
                device_count = location.get('device_count', 0)
                online_device_count = location.get('online_device_count', 0)
                
                verified_locations.append({
                    'location_code': location_code,
                    'station_name': station_name,
                    'device_count': device_count,
                    'online_device_count': online_device_count
                })
            
            self.log_result(
                "Sample Locations Verification", 
                True, 
                f"Verified {len(verified_locations)} sample locations with device counts",
                verified_locations
            )
            
            return True
            
        except Exception as e:
            self.log_result(
                "Sample Locations Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_bern03_location(self, locations):
        """Verify BERN03 location specifically"""
        try:
            bern03_location = None
            
            for location in locations:
                if location.get('location_code') == 'BERN03':
                    bern03_location = location
                    break
            
            if not bern03_location:
                self.log_result(
                    "BERN03 Location Verification", 
                    False, 
                    "BERN03 location not found in the locations list"
                )
                return False
            
            location_code = bern03_location.get('location_code')
            station_name = bern03_location.get('station_name', 'Unknown')
            device_count = bern03_location.get('device_count', 0)
            online_device_count = bern03_location.get('online_device_count', 0)
            
            # Verify required fields exist
            has_device_count = 'device_count' in bern03_location
            has_online_device_count = 'online_device_count' in bern03_location
            
            if not has_device_count or not has_online_device_count:
                missing = []
                if not has_device_count:
                    missing.append('device_count')
                if not has_online_device_count:
                    missing.append('online_device_count')
                
                self.log_result(
                    "BERN03 Location Verification", 
                    False, 
                    f"BERN03 location missing fields: {', '.join(missing)}"
                )
                return False
            
            self.log_result(
                "BERN03 Location Verification", 
                True, 
                f"BERN03 ({station_name}) has device_count={device_count}, online_device_count={online_device_count}",
                {
                    'location_code': location_code,
                    'station_name': station_name,
                    'device_count': device_count,
                    'online_device_count': online_device_count
                }
            )
            
            return True
            
        except Exception as e:
            self.log_result(
                "BERN03 Location Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all tenant locations device count tests"""
        print("=" * 80)
        print("TENANT LOCATIONS DEVICE COUNT TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Tenant ID: {self.test_tenant_id} (Europcar)")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate as admin
        print("🔍 STEP 1: Authenticating as admin@tsrid.com...")
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Get tenant locations
        print("\n🔍 STEP 2: Getting tenant locations with device counts...")
        locations = self.get_tenant_locations()
        if not locations:
            print("❌ Failed to get tenant locations. Stopping tests.")
            return False
        
        # Step 3: Verify device count fields exist
        print("\n🔍 STEP 3: Verifying device count fields exist...")
        fields_ok = self.verify_device_count_fields(locations)
        
        # Step 4: Verify device count values are valid
        print("\n🔍 STEP 4: Verifying device count values are valid...")
        values_ok = self.verify_device_count_values(locations)
        
        # Step 5: Verify sample locations (at least 5)
        print("\n🔍 STEP 5: Verifying sample locations...")
        sample_ok = self.verify_sample_locations(locations, 5)
        
        # Step 6: Verify BERN03 location specifically
        print("\n🔍 STEP 6: Verifying BERN03 location...")
        bern03_ok = self.verify_bern03_location(locations)
        
        # Summary
        print("\n" + "=" * 80)
        print("TENANT LOCATIONS DEVICE COUNT TESTING SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print critical results
        print("\n🔍 CRITICAL RESULTS:")
        print(f"   • Device Count Fields: {'✅ PRESENT' if fields_ok else '❌ MISSING'}")
        print(f"   • Device Count Values: {'✅ VALID' if values_ok else '❌ INVALID'}")
        print(f"   • Sample Verification: {'✅ PASSED' if sample_ok else '❌ FAILED'}")
        print(f"   • BERN03 Verification: {'✅ PASSED' if bern03_ok else '❌ FAILED'}")
        
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
        
        return len(failed_tests) == 0 and fields_ok and values_ok and sample_ok and bern03_ok

if __name__ == "__main__":
    print("Starting Tenant Locations Device Count Testing...")
    print()
    
    # Test Tenant Locations Device Counts
    tester = TenantLocationsDeviceCountTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TESTING SUMMARY")
    print("=" * 80)
    print(f"Tenant Locations Device Count Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 TENANT LOCATIONS DEVICE COUNT TESTING COMPLETED SUCCESSFULLY!")
        print("All locations have device_count and online_device_count fields with correct values.")
        sys.exit(0)
    else:
        print("❌ TENANT LOCATIONS DEVICE COUNT TESTING ISSUES FOUND!")
        print("Some locations are missing device count fields or have invalid values.")
        sys.exit(1)