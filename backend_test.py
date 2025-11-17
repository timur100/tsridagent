#!/usr/bin/env python3
"""
Backend API Testing for License Service Comprehensive Testing
Tests the newly created License Service (Port 8108) to ensure all endpoints are working correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://auth-identity-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
LICENSE_SERVICE_URL = "http://localhost:8108"

class LicenseServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.license_service_session = requests.Session()
        self.license_service_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_license_key = None
        self.test_license_id = None
        
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
    
    def test_license_service_health(self):
        """Test License Service health endpoint"""
        try:
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "License Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "License Service":
                self.log_result(
                    "License Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "License Service Health Check", 
                True, 
                "License Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "License Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_license_service_info(self):
        """Test License Service info endpoint"""
        try:
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/info")
            
            if response.status_code != 200:
                self.log_result(
                    "License Service Info", 
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
                    "License Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service_name") != "License Service":
                self.log_result(
                    "License Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service_name')}",
                    data
                )
                return False
            
            self.log_result(
                "License Service Info", 
                True, 
                f"Service info correct: {data.get('service_name')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "License Service Info", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_license_statistics(self):
        """Test License Service statistics endpoint"""
        try:
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/api/licenses/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "License Statistics", 
                    False, 
                    f"Statistics endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total", "by_status", "by_type", "expiring_soon"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "License Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify by_status structure
            status_fields = ["active", "expired", "suspended", "revoked"]
            by_status = data.get("by_status", {})
            missing_status = [field for field in status_fields if field not in by_status]
            
            if missing_status:
                self.log_result(
                    "License Statistics", 
                    False, 
                    f"Missing status fields: {missing_status}",
                    data
                )
                return False
            
            # Verify by_type structure
            type_fields = ["subscription", "perpetual", "trial"]
            by_type = data.get("by_type", {})
            missing_type = [field for field in type_fields if field not in by_type]
            
            if missing_type:
                self.log_result(
                    "License Statistics", 
                    False, 
                    f"Missing type fields: {missing_type}",
                    data
                )
                return False
            
            total = data.get("total", 0)
            active = by_status.get("active", 0)
            subscription = by_type.get("subscription", 0)
            perpetual = by_type.get("perpetual", 0)
            trial = by_type.get("trial", 0)
            expiring_soon = data.get("expiring_soon", 0)
            
            self.log_result(
                "License Statistics", 
                True, 
                f"Statistics retrieved: {total} total licenses, {active} active, {subscription} subscription, {perpetual} perpetual, {trial} trial, {expiring_soon} expiring soon"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "License Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_licenses(self):
        """Test GET /api/licenses endpoint"""
        try:
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/api/licenses")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Licenses", 
                    False, 
                    f"Get licenses failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get All Licenses", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Check license structure if licenses exist
            if len(data) > 0:
                license_obj = data[0]
                required_fields = ["id", "license_key", "product_name", "license_type", "status"]
                missing_fields = [field for field in required_fields if field not in license_obj]
                
                if missing_fields:
                    self.log_result(
                        "Get All Licenses", 
                        False, 
                        f"License missing required fields: {missing_fields}",
                        license_obj
                    )
                    return False
                
                # Verify license_key format: LIC-XXXXXX-XXXXXX-XXXXXX (flexible length)
                license_key = license_obj.get("license_key", "")
                if not license_key.startswith("LIC-") or license_key.count("-") != 3:
                    self.log_result(
                        "Get All Licenses", 
                        False, 
                        f"Invalid license key format: {license_key}, expected LIC-XXXXXX-XXXXXX-XXXXXX",
                        license_obj
                    )
                    return False
                
                # Store first license key for later tests
                if not self.test_license_key:
                    self.test_license_key = license_key
                    self.test_license_id = license_obj.get("id")
            
            self.log_result(
                "Get All Licenses", 
                True, 
                f"Retrieved {len(data)} licenses successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get All Licenses", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_license_validation(self):
        """Test POST /api/licenses/validate/{license_key}"""
        try:
            if not self.test_license_key:
                self.log_result(
                    "License Validation", 
                    False, 
                    "No test license key available for validation test"
                )
                return False
            
            response = self.license_service_session.post(f"{LICENSE_SERVICE_URL}/api/licenses/validate/{self.test_license_key}")
            
            if response.status_code != 200:
                self.log_result(
                    "License Validation", 
                    False, 
                    f"License validation failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["valid", "status", "message"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "License Validation", 
                    False, 
                    f"Validation response missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Check if license is valid and active
            if not data.get("valid") or data.get("status") != "active":
                self.log_result(
                    "License Validation", 
                    False, 
                    f"License validation failed: valid={data.get('valid')}, status={data.get('status')}",
                    data
                )
                return False
            
            # Verify license_info is present for valid licenses
            if not data.get("license_info"):
                self.log_result(
                    "License Validation", 
                    False, 
                    "Valid license should include license_info",
                    data
                )
                return False
            
            license_info = data.get("license_info", {})
            if not license_info.get("product_name"):
                self.log_result(
                    "License Validation", 
                    False, 
                    "License info should include product_name",
                    data
                )
                return False
            
            self.log_result(
                "License Validation", 
                True, 
                f"License validation successful: {data.get('message')}, product: {license_info.get('product_name')}"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "License Validation", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_license_by_key(self):
        """Test GET /api/licenses/key/{license_key}"""
        try:
            if not self.test_license_key:
                self.log_result(
                    "Get License by Key", 
                    False, 
                    "No test license key available for get by key test"
                )
                return False
            
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/api/licenses/key/{self.test_license_key}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get License by Key", 
                    False, 
                    f"Get license by key failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an object (not array)
            if isinstance(data, list):
                self.log_result(
                    "Get License by Key", 
                    False, 
                    f"Response should be an object, not an array",
                    data
                )
                return False
            
            # Verify license_key matches
            if data.get("license_key") != self.test_license_key:
                self.log_result(
                    "Get License by Key", 
                    False, 
                    f"Expected license_key {self.test_license_key}, got {data.get('license_key')}",
                    data
                )
                return False
            
            # Check required fields
            required_fields = ["id", "license_key", "product_name", "license_type", "status"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Get License by Key", 
                    False, 
                    f"License missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Get License by Key", 
                True, 
                f"Retrieved license by key {self.test_license_key}: {data.get('product_name')} ({data.get('license_type')})"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get License by Key", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_licenses(self):
        """Test filtering licenses by license_type"""
        try:
            # Test filter by license_type=subscription
            response = self.license_service_session.get(f"{LICENSE_SERVICE_URL}/api/licenses?license_type=subscription")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Licenses", 
                    False, 
                    f"Filter by license_type failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Filter Licenses", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all licenses have license_type = subscription
            for license_obj in data:
                if license_obj.get("license_type") != "subscription":
                    self.log_result(
                        "Filter Licenses", 
                        False, 
                        f"License has wrong type: {license_obj.get('license_type')}",
                        license_obj
                    )
                    return False
            
            self.log_result(
                "Filter Licenses", 
                True, 
                f"License type filter working: {len(data)} subscription licenses found"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Filter Licenses", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_license_status(self):
        """Test updating license status"""
        try:
            if not self.test_license_id:
                self.log_result(
                    "Update License Status", 
                    False, 
                    "No test license ID available for update test"
                )
                return False
            
            # Update license status to suspended
            update_data = {
                "status": "suspended",
                "notes": "Test status update"
            }
            
            response = self.license_service_session.put(
                f"{LICENSE_SERVICE_URL}/api/licenses/{self.test_license_id}", 
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update License Status", 
                    False, 
                    f"Update license failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an object (not array)
            if isinstance(data, list):
                self.log_result(
                    "Update License Status", 
                    False, 
                    f"Response should be an object, not an array",
                    data
                )
                return False
            
            # Verify status was updated
            if data.get("status") != "suspended":
                self.log_result(
                    "Update License Status", 
                    False, 
                    f"Status not updated. Expected 'suspended', got '{data.get('status')}'",
                    data
                )
                return False
            
            # Verify notes were updated
            if data.get("notes") != "Test status update":
                self.log_result(
                    "Update License Status", 
                    False, 
                    f"Notes not updated. Expected 'Test status update', got '{data.get('notes')}'",
                    data
                )
                return False
            
            self.log_result(
                "Update License Status", 
                True, 
                f"License status updated successfully: {data.get('license_key')} -> {data.get('status')}"
            )
            
            # Revert status back to active for other tests
            revert_data = {"status": "active", "notes": "Reverted after test"}
            revert_response = self.license_service_session.put(
                f"{LICENSE_SERVICE_URL}/api/licenses/{self.test_license_id}", 
                json=revert_data
            )
            
            return True
            
        except Exception as e:
            self.log_result(
                "Update License Status", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_service_registration(self):
        """Test that License Service appears in /api/portal/services"""
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
            
            # Look for license service
            license_service = None
            for service in data:
                if service.get('service_type') == 'license':
                    license_service = service
                    break
            
            if not license_service:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    "License Service not found in services list",
                    data
                )
                return False
            
            # Check position (should be 8th after auth, id_verification, device, location, inventory, order, customer)
            service_types = [s.get('service_type') for s in data]
            license_position = service_types.index('license') if 'license' in service_types else -1
            
            # The License Service should be at position 7 (0-indexed)
            expected_position = 7
            if license_position != expected_position:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"License Service at position {license_position}, expected position {expected_position}",
                    service_types
                )
                return False
            
            self.log_result(
                "Service Registration Verification", 
                True, 
                f"License Service found at correct position {expected_position} with service_type='license'"
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
        """Test MongoDB integration shows license_db"""
        try:
            response = self.session.get(f"{API_BASE}/portal/mongodb-summary?service_type=license")
            
            if response.status_code != 200:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"MongoDB summary failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # The API returns a list of services, find the license service
            license_service_info = None
            if isinstance(data, list):
                for service in data:
                    if service.get("service_id") == "license_service_001":
                        license_service_info = service
                        break
            else:
                license_service_info = data
            
            if not license_service_info:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "License service not found in MongoDB summary",
                    data
                )
                return False
            
            mongodb_info = license_service_info.get("mongodb_info", {})
            
            # Verify database name
            if mongodb_info.get("database_name") != "license_db":
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"Wrong database name: {mongodb_info.get('database_name')}, expected 'license_db'",
                    mongodb_info
                )
                return False
            
            # Verify collections exist
            collections = mongodb_info.get("collections", [])
            if not any(col.get("name") == "licenses" for col in collections):
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Licenses collection not found",
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
        """Run all license service tests"""
        print("=" * 70)
        print("LICENSE SERVICE COMPREHENSIVE TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"License Service URL: {LICENSE_SERVICE_URL}")
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
        
        # Step 1: Test License Service Health & Info
        print("🔍 STEP 1: Testing License Service Health & Info...")
        if not self.test_license_service_health():
            print("❌ License service health check failed.")
        
        if not self.test_license_service_info():
            print("❌ License service info failed.")
        
        # Step 2: Test License Statistics
        print("\n🔍 STEP 2: Testing License Statistics...")
        stats = self.test_license_statistics()
        if not stats:
            print("❌ License statistics failed.")
        
        # Step 3: Test Get All Licenses
        print("\n🔍 STEP 3: Testing Get All Licenses...")
        licenses = self.test_get_all_licenses()
        if licenses is False:
            print("❌ Get all licenses failed.")
        
        # Step 4: Test License Validation
        print("\n🔍 STEP 4: Testing License Validation...")
        if not self.test_license_validation():
            print("❌ License validation failed.")
        
        # Step 5: Test Get License by Key
        print("\n🔍 STEP 5: Testing Get License by Key...")
        if not self.test_get_license_by_key():
            print("❌ Get license by key failed.")
        
        # Step 6: Test Filter Licenses
        print("\n🔍 STEP 6: Testing Filter Licenses...")
        if not self.test_filter_licenses():
            print("❌ Filter licenses failed.")
        
        # Step 7: Test Update License Status
        print("\n🔍 STEP 7: Testing Update License Status...")
        if not self.test_update_license_status():
            print("❌ Update license status failed.")
        
        # Step 8: Test Service Registration
        print("\n🔍 STEP 8: Testing Service Registration...")
        if not self.test_service_registration():
            print("❌ Service registration verification failed.")
        
        # Step 9: Test MongoDB Summary
        print("\n🔍 STEP 9: Testing MongoDB Summary...")
        if not self.test_mongodb_summary():
            print("❌ MongoDB summary failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("LICENSE SERVICE TESTING SUMMARY")
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
    print("Starting License Service Comprehensive Testing...")
    print()
    
    # Test License Service
    tester = LicenseServiceTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"License Service Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 LICENSE SERVICE TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ LICENSE SERVICE TESTING FOUND ISSUES!")
        sys.exit(1)