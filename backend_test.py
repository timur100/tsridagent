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
    
    def test_portal_services_endpoint(self):
        """Test GET /api/portal/services endpoint and verify service order"""
        try:
            response = self.session.get(f"{API_BASE}/portal/services")
            
            if response.status_code != 200:
                self.log_result(
                    "Portal Services Endpoint", 
                    False, 
                    f"Failed to get services. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Portal Services Endpoint", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            if len(data) == 0:
                self.log_result(
                    "Portal Services Endpoint", 
                    False, 
                    "No services returned in response",
                    data
                )
                return False
            
            self.log_result(
                "Portal Services Endpoint", 
                True, 
                f"Successfully retrieved {len(data)} services"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Portal Services Endpoint", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_auth_service_first_position(self, services):
        """Test that Auth & Identity Service is in the first position"""
        try:
            if not services or len(services) == 0:
                self.log_result(
                    "Auth Service First Position", 
                    False, 
                    "No services provided for testing"
                )
                return False
            
            first_service = services[0]
            
            # Check if first service has service_type = 'auth'
            service_type = first_service.get('service_type')
            if service_type != 'auth':
                self.log_result(
                    "Auth Service First Position", 
                    False, 
                    f"First service has service_type='{service_type}', expected 'auth'",
                    first_service
                )
                return False
            
            # Check if service name is 'Auth & Identity Service'
            service_name = first_service.get('service_name')
            if service_name != 'Auth & Identity Service':
                self.log_result(
                    "Auth Service First Position", 
                    False, 
                    f"First service has service_name='{service_name}', expected 'Auth & Identity Service'",
                    first_service
                )
                return False
            
            self.log_result(
                "Auth Service First Position", 
                True, 
                f"Auth & Identity Service is correctly positioned first (service_type='auth')"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Auth Service First Position", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_service_order_validation(self, services):
        """Test that services are ordered correctly: auth, id_verification, inventory, support"""
        try:
            if not services or len(services) == 0:
                self.log_result(
                    "Service Order Validation", 
                    False, 
                    "No services provided for testing"
                )
                return False
            
            # Extract service types in order
            service_types = [service.get('service_type') for service in services]
            service_names = [service.get('service_name') for service in services]
            
            print(f"   Found services in order:")
            for i, (service_type, service_name) in enumerate(zip(service_types, service_names)):
                print(f"   {i+1}. {service_name} (type: {service_type})")
            
            # Check if auth is first
            if len(service_types) > 0 and service_types[0] != 'auth':
                self.log_result(
                    "Service Order Validation", 
                    False, 
                    f"Auth service is not first. Order: {service_types}"
                )
                return False
            
            # Verify expected order for services that exist
            expected_positions = {
                'auth': 0,
                'id_verification': 1,
                'inventory': 2,
                'support': 3
            }
            
            # Check positions of expected services
            for service_type, expected_pos in expected_positions.items():
                if service_type in service_types:
                    actual_pos = service_types.index(service_type)
                    if actual_pos != expected_pos:
                        self.log_result(
                            "Service Order Validation", 
                            False, 
                            f"Service '{service_type}' is at position {actual_pos}, expected position {expected_pos}"
                        )
                        return False
            
            self.log_result(
                "Service Order Validation", 
                True, 
                f"Services are correctly ordered: {service_types}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Service Order Validation", 
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