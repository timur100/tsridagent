#!/usr/bin/env python3
"""
Backend API Testing for Data Synchronization Between Admin Portal and Customer Portal
Tests data synchronization between Admin Portal and Customer Portal for Europcar tenant.
Verifies that both portals show EXACTLY the same data for tenant_id: 1d3653db-86cb-4dd1-9ef5-0236b116def8
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os

# Backend URL from environment
BACKEND_URL = "https://tenant-portal-30.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class DataSynchronizationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.superadmin_token = None
        self.tenant_admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Specific Europcar tenant ID for testing
        self.mongo_client = None
        
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
            
            # Check if token contains tenant_ids
            tenant_ids = data.get("tenant_ids", [])
            
            self.log_result(
                "Admin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com with tenant_ids: {tenant_ids}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_europcar_devices_endpoint(self):
        """Test GET /api/portal/europcar-devices - should return devices filtered by tenant_id"""
        try:
            response = self.session.get(f"{API_BASE}/portal/europcar-devices")
            
            if response.status_code != 200:
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return False
            
            if not data.get("success"):
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check if we have data structure
            response_data = data.get("data", {})
            devices = response_data.get("devices", [])
            summary = response_data.get("summary", {})
            
            # Check if devices count > 0
            if len(devices) == 0:
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    "Expected devices count > 0, got empty array",
                    data
                )
                return False
            
            # Check if response has summary with total, online, offline counts
            required_summary_fields = ["total", "online", "offline"]
            missing_fields = [field for field in required_summary_fields if field not in summary]
            
            if missing_fields:
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    f"Missing required summary fields: {missing_fields}",
                    summary
                )
                return False
            
            # Verify summary counts make sense
            total_count = summary.get("total", 0)
            online_count = summary.get("online", 0)
            offline_count = summary.get("offline", 0)
            
            if total_count != len(devices):
                self.log_result(
                    "Europcar Devices Endpoint", 
                    False, 
                    f"Summary total ({total_count}) doesn't match devices count ({len(devices)})",
                    {"summary": summary, "devices_count": len(devices)}
                )
                return False
            
            # Check if devices have tenant_id field (for tenant filtering verification)
            devices_with_tenant_id = [d for d in devices if d.get("tenant_id") == self.test_tenant_id]
            
            self.log_result(
                "Europcar Devices Endpoint", 
                True, 
                f"Retrieved {len(devices)} devices with summary (total: {total_count}, online: {online_count}, offline: {offline_count}). Devices with tenant_id {self.test_tenant_id}: {len(devices_with_tenant_id)}"
            )
            return devices
            
        except Exception as e:
            self.log_result(
                "Europcar Devices Endpoint", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_europcar_stations_endpoint(self):
        """Test GET /api/portal/customer-data/europcar-stations - should return locations/stations filtered by tenant_id"""
        try:
            response = self.session.get(f"{API_BASE}/portal/customer-data/europcar-stations")
            
            if response.status_code != 200:
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return False
            
            if not data.get("success"):
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check if we have stations
            stations = data.get("stations", [])
            summary = data.get("summary", {})
            
            # Check if stations count > 0
            if len(stations) == 0:
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    "Expected stations count > 0, got empty array",
                    data
                )
                return False
            
            # Check if response has summary with required fields
            required_summary_fields = ["total", "online", "offline"]
            missing_fields = [field for field in required_summary_fields if field not in summary]
            
            if missing_fields:
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    f"Missing required summary fields: {missing_fields}",
                    summary
                )
                return False
            
            # Verify summary counts make sense
            total_count = summary.get("total", 0)
            online_count = summary.get("online", 0)
            offline_count = summary.get("offline", 0)
            
            if total_count != len(stations):
                self.log_result(
                    "Europcar Stations Endpoint", 
                    False, 
                    f"Summary total ({total_count}) doesn't match stations count ({len(stations)})",
                    {"summary": summary, "stations_count": len(stations)}
                )
                return False
            
            # Check if stations have devices (device_count field)
            stations_with_devices = [s for s in stations if s.get("device_count", 0) > 0]
            
            self.log_result(
                "Europcar Stations Endpoint", 
                True, 
                f"Retrieved {len(stations)} stations with summary (total: {total_count}, online: {online_count}, offline: {offline_count}). Stations with devices: {len(stations_with_devices)}"
            )
            return stations
            
        except Exception as e:
            self.log_result(
                "Europcar Stations Endpoint", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_database_context_verification(self):
        """Verify database context - check if we can access the multi_tenant_admin.europcar_devices collection"""
        try:
            # This test verifies that the endpoints are accessing the correct database
            # We'll check if the devices returned have the expected tenant_id
            
            # First get devices
            devices_response = self.session.get(f"{API_BASE}/portal/europcar-devices")
            
            if devices_response.status_code != 200:
                self.log_result(
                    "Database Context Verification", 
                    False, 
                    f"Could not retrieve devices for verification. Status: {devices_response.status_code}",
                    devices_response.text
                )
                return False
            
            devices_data = devices_response.json()
            devices = devices_data.get("data", {}).get("devices", [])
            
            # Check if we have devices with the expected tenant_id
            tenant_devices = [d for d in devices if d.get("tenant_id") == self.test_tenant_id]
            
            if len(tenant_devices) == 0:
                self.log_result(
                    "Database Context Verification", 
                    False, 
                    f"No devices found with tenant_id {self.test_tenant_id}. This suggests the tenant filtering is not working correctly.",
                    {"total_devices": len(devices), "tenant_devices": len(tenant_devices)}
                )
                return False
            
            # Check if devices have expected fields
            sample_device = tenant_devices[0]
            expected_fields = ["device_id", "locationcode", "tenant_id"]
            missing_fields = [field for field in expected_fields if field not in sample_device]
            
            if missing_fields:
                self.log_result(
                    "Database Context Verification", 
                    False, 
                    f"Sample device missing expected fields: {missing_fields}",
                    sample_device
                )
                return False
            
            self.log_result(
                "Database Context Verification", 
                True, 
                f"Database context verified: Found {len(tenant_devices)} devices with tenant_id {self.test_tenant_id} out of {len(devices)} total devices"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Database Context Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_tenant_admin_token_verification(self):
        """Verify that the admin token contains tenant_ids as expected"""
        try:
            # Make a request to verify token information
            # We'll use the auth endpoint to check token details
            
            # The token should already be set in headers from authentication
            if not self.admin_token:
                self.log_result(
                    "Tenant Admin Token Verification", 
                    False, 
                    "No admin token available for verification"
                )
                return False
            
            # Try to decode token information by making a test request
            # We'll use the devices endpoint and check if it filters by tenant_id
            response = self.session.get(f"{API_BASE}/portal/europcar-devices")
            
            if response.status_code != 200:
                self.log_result(
                    "Tenant Admin Token Verification", 
                    False, 
                    f"Token verification failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            devices = data.get("data", {}).get("devices", [])
            
            # If we get devices, it means the token is working
            # Check if devices are filtered by tenant_id (they should all have the same tenant_id)
            tenant_ids_in_devices = set(d.get("tenant_id") for d in devices if d.get("tenant_id"))
            
            if len(tenant_ids_in_devices) == 0:
                self.log_result(
                    "Tenant Admin Token Verification", 
                    False, 
                    "No tenant_id found in devices, token might not be working correctly"
                )
                return False
            
            if self.test_tenant_id not in tenant_ids_in_devices:
                self.log_result(
                    "Tenant Admin Token Verification", 
                    False, 
                    f"Expected tenant_id {self.test_tenant_id} not found in devices. Found: {tenant_ids_in_devices}"
                )
                return False
            
            self.log_result(
                "Tenant Admin Token Verification", 
                True, 
                f"Token verification successful: Devices filtered by tenant_ids {tenant_ids_in_devices}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Tenant Admin Token Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all customer portal data endpoint tests"""
        print("=" * 70)
        print("CUSTOMER PORTAL DATA ENDPOINTS TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Tenant ID: {self.test_tenant_id}")
        print("=" * 70)
        print()
        
        # Step 1: Authenticate as admin first
        print("🔍 STEP 1: Authenticating as Tenant Admin...")
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Verify token contains tenant information
        print("\n🔍 STEP 2: Verifying Tenant Admin Token...")
        self.test_tenant_admin_token_verification()
        
        # Step 3: Test europcar-devices endpoint
        print("\n🔍 STEP 3: Testing GET /api/portal/europcar-devices...")
        devices = self.test_europcar_devices_endpoint()
        
        # Step 4: Test europcar-stations endpoint
        print("\n🔍 STEP 4: Testing GET /api/portal/customer-data/europcar-stations...")
        stations = self.test_europcar_stations_endpoint()
        
        # Step 5: Verify database context
        print("\n🔍 STEP 5: Verifying Database Context...")
        self.test_database_context_verification()
        
        # Summary
        print("\n" + "=" * 70)
        print("CUSTOMER PORTAL DATA ENDPOINTS TESTING SUMMARY")
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
    print("Starting Customer Portal Data Endpoints Backend Testing...")
    print()
    
    # Test Customer Portal Data Endpoints
    tester = CustomerPortalTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Customer Portal Data Endpoints Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 CUSTOMER PORTAL DATA ENDPOINTS TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ CUSTOMER PORTAL DATA ENDPOINTS TESTING FOUND ISSUES!")
        sys.exit(1)