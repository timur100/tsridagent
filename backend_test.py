#!/usr/bin/env python3
"""
Backend API Testing for Location Service Comprehensive Testing
Tests the newly created Location Service (Port 8105) to ensure all endpoints are working correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://auth-identity-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
LOCATION_SERVICE_URL = "http://localhost:8105"

class LocationServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.location_service_session = requests.Session()
        self.location_service_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
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
    
    def test_backend_health(self):
        """Test basic backend connectivity"""
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code != 200:
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Backend not responding. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if data.get("message") != "Hello World":
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Unexpected response from backend root endpoint",
                    data
                )
                return False
            
            self.log_result(
                "Backend Health Check", 
                True, 
                "Backend is responding correctly"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Backend Health Check", 
                False, 
                f"Cannot connect to backend: {str(e)}"
            )
            return False
    
    def test_location_service_health(self):
        """Test Location Service health endpoint"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Location Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Location Service":
                self.log_result(
                    "Location Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Location Service Health Check", 
                True, 
                "Location Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Location Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_device_service_info(self):
        """Test Device Service info endpoint"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/info")
            
            if response.status_code != 200:
                self.log_result(
                    "Device Service Info", 
                    False, 
                    f"Info endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["service_name", "version", "description", "endpoints"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Device Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service_name") != "Device Service":
                self.log_result(
                    "Device Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service_name')}",
                    data
                )
                return False
            
            self.log_result(
                "Device Service Info", 
                True, 
                f"Service info correct: {data.get('service_name')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Device Service Info", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_device_statistics(self):
        """Test Device Service statistics endpoint"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/api/devices/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Device Statistics", 
                    False, 
                    f"Statistics endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total", "by_status", "by_type"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Device Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify by_status structure
            status_fields = ["active", "inactive", "maintenance", "offline"]
            by_status = data.get("by_status", {})
            missing_status = [field for field in status_fields if field not in by_status]
            
            if missing_status:
                self.log_result(
                    "Device Statistics", 
                    False, 
                    f"Missing status fields: {missing_status}",
                    data
                )
                return False
            
            total = data.get("total", 0)
            active = by_status.get("active", 0)
            maintenance = by_status.get("maintenance", 0)
            
            self.log_result(
                "Device Statistics", 
                True, 
                f"Statistics retrieved: {total} total devices, {active} active, {maintenance} maintenance"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Device Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_devices(self):
        """Test GET /api/devices endpoint"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/api/devices")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Devices", 
                    False, 
                    f"Get devices failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get All Devices", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Check device structure if devices exist
            if len(data) > 0:
                device = data[0]
                required_fields = ["id", "device_id", "device_type", "status"]
                missing_fields = [field for field in required_fields if field not in device]
                
                if missing_fields:
                    self.log_result(
                        "Get All Devices", 
                        False, 
                        f"Device missing required fields: {missing_fields}",
                        device
                    )
                    return False
            
            self.log_result(
                "Get All Devices", 
                True, 
                f"Retrieved {len(data)} devices successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get All Devices", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_devices_by_location(self):
        """Test GET /api/devices?location_code=BERN01"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/api/devices?location_code=BERN01")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Devices by Location", 
                    False, 
                    f"Get devices by location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get Devices by Location", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all devices have the correct location_code
            for device in data:
                if device.get("location_code") != "BERN01":
                    self.log_result(
                        "Get Devices by Location", 
                        False, 
                        f"Device has wrong location_code: {device.get('location_code')}",
                        device
                    )
                    return False
            
            self.log_result(
                "Get Devices by Location", 
                True, 
                f"Retrieved {len(data)} devices for location BERN01"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Devices by Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_devices_by_status(self):
        """Test GET /api/devices?status=active"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/api/devices?status=active")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Devices by Status", 
                    False, 
                    f"Get devices by status failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get Devices by Status", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all devices have status = active
            for device in data:
                if device.get("status") != "active":
                    self.log_result(
                        "Get Devices by Status", 
                        False, 
                        f"Device has wrong status: {device.get('status')}",
                        device
                    )
                    return False
            
            self.log_result(
                "Get Devices by Status", 
                True, 
                f"Retrieved {len(data)} active devices"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Devices by Status", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_service_registration(self):
        """Test that Device Service appears in /api/portal/services"""
        try:
            response = self.session.get(f"{API_BASE}/portal/services")
            
            if response.status_code != 200:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"Failed to get services. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Look for device service
            device_service = None
            for service in data:
                if service.get('service_type') == 'device':
                    device_service = service
                    break
            
            if not device_service:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    "Device Service not found in services list",
                    data
                )
                return False
            
            # Check position (should be 3rd after auth, id_verification)
            service_types = [s.get('service_type') for s in data]
            device_position = service_types.index('device') if 'device' in service_types else -1
            
            if device_position != 2:  # 0-indexed: auth=0, id_verification=1, device=2
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"Device Service at position {device_position}, expected position 2",
                    service_types
                )
                return False
            
            self.log_result(
                "Service Registration Verification", 
                True, 
                f"Device Service found at correct position 2 with service_type='device'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Service Registration Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_mongodb_summary(self):
        """Test MongoDB integration shows device_db"""
        try:
            response = self.session.get(f"{API_BASE}/portal/mongodb-summary?service_type=device")
            
            if response.status_code != 200:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"MongoDB summary failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # The API returns a list of services, find the device service
            device_service_info = None
            if isinstance(data, list):
                for service in data:
                    if service.get("service_id") == "device_service_001":
                        device_service_info = service
                        break
            else:
                device_service_info = data
            
            if not device_service_info:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Device service not found in MongoDB summary",
                    data
                )
                return False
            
            mongodb_info = device_service_info.get("mongodb_info", {})
            
            # Verify database name
            if mongodb_info.get("database_name") != "device_db":
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"Wrong database name: {mongodb_info.get('database_name')}, expected 'device_db'",
                    mongodb_info
                )
                return False
            
            # Verify collections exist
            collections = mongodb_info.get("collections", [])
            if not any(col.get("name") == "devices" for col in collections):
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Devices collection not found",
                    mongodb_info
                )
                return False
            
            # Verify document count
            total_documents = mongodb_info.get("total_documents", 0)
            
            self.log_result(
                "MongoDB Summary", 
                True, 
                f"MongoDB integration working: {mongodb_info.get('database_name')} with {len(collections)} collections, {total_documents} documents"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Summary", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all device service tests"""
        print("=" * 70)
        print("DEVICE SERVICE COMPREHENSIVE TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Device Service URL: {DEVICE_SERVICE_URL}")
        print("=" * 70)
        print()
        
        # Test backend connectivity first
        if not self.test_backend_health():
            print("❌ Backend connectivity failed. Stopping tests.")
            return False
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 1: Test Device Service Health & Info
        print("🔍 STEP 1: Testing Device Service Health & Info...")
        if not self.test_device_service_health():
            print("❌ Device service health check failed.")
        
        if not self.test_device_service_info():
            print("❌ Device service info failed.")
        
        # Step 2: Test Device Statistics
        print("\n🔍 STEP 2: Testing Device Statistics...")
        stats = self.test_device_statistics()
        if not stats:
            print("❌ Device statistics failed.")
        
        # Step 3: Test Get All Devices
        print("\n🔍 STEP 3: Testing Get All Devices...")
        devices = self.test_get_all_devices()
        if devices is False:
            print("❌ Get all devices failed.")
        
        # Step 4: Test Get Devices by Location
        print("\n🔍 STEP 4: Testing Get Devices by Location...")
        if not self.test_devices_by_location():
            print("❌ Get devices by location failed.")
        
        # Step 5: Test Get Devices by Status
        print("\n🔍 STEP 5: Testing Get Devices by Status...")
        if not self.test_devices_by_status():
            print("❌ Get devices by status failed.")
        
        # Step 6: Test Service Registration
        print("\n🔍 STEP 6: Testing Service Registration...")
        if not self.test_service_registration():
            print("❌ Service registration verification failed.")
        
        # Step 7: Test MongoDB Summary
        print("\n🔍 STEP 7: Testing MongoDB Summary...")
        if not self.test_mongodb_summary():
            print("❌ MongoDB summary failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("DEVICE SERVICE TESTING SUMMARY")
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
    print("Starting Device Service Comprehensive Testing...")
    print()
    
    # Test Device Service
    tester = DeviceServiceTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Device Service Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 DEVICE SERVICE TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ DEVICE SERVICE TESTING FOUND ISSUES!")
        sys.exit(1)