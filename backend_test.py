#!/usr/bin/env python3
"""
Backend API Testing for Device Service Comprehensive Testing
Tests the newly created Device Service (Port 8104) to ensure all endpoints are working correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://auth-identity-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
DEVICE_SERVICE_URL = "https://auth-identity-hub.preview.emergentagent.com:8104"

class DeviceServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.device_service_session = requests.Session()
        self.device_service_session.headers.update({
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
    
    def test_device_service_health(self):
        """Test Device Service health endpoint"""
        try:
            response = self.device_service_session.get(f"{DEVICE_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Device Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Device Service":
                self.log_result(
                    "Device Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Device Service Health Check", 
                True, 
                "Device Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Device Service Health Check", 
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
    
    def test_service_count_and_details(self, services):
        """Test service count and validate service details"""
        try:
            if not services:
                self.log_result(
                    "Service Count and Details", 
                    False, 
                    "No services provided for testing"
                )
                return False
            
            total_services = len(services)
            
            # Count services by type
            service_type_counts = {}
            for service in services:
                service_type = service.get('service_type', 'unknown')
                service_type_counts[service_type] = service_type_counts.get(service_type, 0) + 1
            
            # Validate required fields for each service
            required_fields = ['service_id', 'service_name', 'service_type', 'base_url']
            
            for i, service in enumerate(services):
                missing_fields = [field for field in required_fields if field not in service]
                if missing_fields:
                    self.log_result(
                        "Service Count and Details", 
                        False, 
                        f"Service at index {i} missing required fields: {missing_fields}",
                        service
                    )
                    return False
            
            self.log_result(
                "Service Count and Details", 
                True, 
                f"Found {total_services} services with valid structure. Types: {service_type_counts}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Service Count and Details", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all microservices display order tests"""
        print("=" * 70)
        print("MICROSERVICES DISPLAY ORDER TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Expected Order: {' → '.join(self.expected_order)}")
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
        
        # Step 1: Test Portal Services Endpoint
        print("🔍 STEP 1: Testing Portal Services Endpoint...")
        services = self.test_portal_services_endpoint()
        if not services:
            print("❌ Portal services endpoint failed.")
            return False
        
        # Step 2: Test Auth Service First Position
        print("\n🔍 STEP 2: Testing Auth Service First Position...")
        if not self.test_auth_service_first_position(services):
            print("❌ Auth service is not in first position.")
        
        # Step 3: Test Service Order Validation
        print("\n🔍 STEP 3: Testing Service Order Validation...")
        if not self.test_service_order_validation(services):
            print("❌ Service order validation failed.")
        
        # Step 4: Test Service Count and Details
        print("\n🔍 STEP 4: Testing Service Count and Details...")
        if not self.test_service_count_and_details(services):
            print("❌ Service count and details validation failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("MICROSERVICES DISPLAY ORDER SUMMARY")
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
    print("Starting Microservices Display Order Testing...")
    print()
    
    # Test Microservices Display Order
    tester = MicroservicesDisplayOrderTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Microservices Display Order: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 MICROSERVICES DISPLAY ORDER TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ MICROSERVICES DISPLAY ORDER TESTING FOUND ISSUES!")
        sys.exit(1)