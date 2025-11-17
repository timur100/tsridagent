#!/usr/bin/env python3
"""
Backend API Testing for Tenant Management APIs in Auth & Identity Service
Tests the Auth & Identity Service (Port 8100) tenant management functionality comprehensively.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://service-transform.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
AUTH_SERVICE_URL = "http://localhost:8100"

class TenantManagementTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.auth_service_session = requests.Session()
        self.auth_service_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_tenant_id = None
        
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
    
    def test_auth_service_health(self):
        """Test Auth Service health endpoint"""
        try:
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Auth Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Auth & Identity Service":
                self.log_result(
                    "Auth Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Auth Service Health Check", 
                True, 
                "Auth & Identity Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Auth Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_tenant_stats(self):
        """Test GET /api/tenants/stats endpoint"""
        try:
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Tenant Statistics", 
                    False, 
                    f"Stats endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total_tenants", "active_tenants", "trial_tenants", "suspended_tenants", "total_users", "total_devices"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Tenant Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify data types
            for field in required_fields:
                if not isinstance(data[field], int):
                    self.log_result(
                        "Tenant Statistics", 
                        False, 
                        f"Field {field} should be integer, got {type(data[field])}",
                        data
                    )
                    return False
            
            self.log_result(
                "Tenant Statistics", 
                True, 
                f"Statistics retrieved: {data['total_tenants']} total tenants, {data['active_tenants']} active, {data['trial_tenants']} trial, {data['suspended_tenants']} suspended, {data['total_users']} users"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Tenant Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_tenant(self):
        """Test POST /api/tenants/ - Create tenant with admin user"""
        try:
            tenant_data = {
                "name": "test-tenant",
                "display_name": "Test Tenant GmbH",
                "domain": "test-tenant.example.com",
                "description": "Test tenant für Backend-Tests",
                "contact": {
                    "admin_email": "admin@test-tenant.com",
                    "phone": "+49 30 12345678",
                    "address": "Teststraße 123",
                    "city": "Berlin",
                    "country": "Deutschland",
                    "postal_code": "10115"
                },
                "admin_password": "SecurePass123!",
                "subscription_plan": "pro",
                "limits": {
                    "max_users": 50,
                    "max_devices": 500,
                    "max_storage_gb": 100,
                    "max_api_calls_per_day": 5000,
                    "max_locations": 5
                },
                "settings": {},
                "logo_url": None
            }
            
            response = self.auth_service_session.post(f"{AUTH_SERVICE_URL}/api/tenants/", json=tenant_data)
            
            if response.status_code != 201:
                self.log_result(
                    "Create Tenant", 
                    False, 
                    f"Tenant creation failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["tenant_id", "name", "display_name", "status", "enabled", "user_count", "contact", "limits"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Create Tenant", 
                    False, 
                    f"Missing required fields in response: {missing_fields}",
                    data
                )
                return False
            
            # Verify expected values
            if data.get("status") != "trial":
                self.log_result(
                    "Create Tenant", 
                    False, 
                    f"Expected status 'trial', got '{data.get('status')}'",
                    data
                )
                return False
            
            if data.get("enabled") != True:
                self.log_result(
                    "Create Tenant", 
                    False, 
                    f"Expected enabled=true, got {data.get('enabled')}",
                    data
                )
                return False
            
            if data.get("user_count") != 1:
                self.log_result(
                    "Create Tenant", 
                    False, 
                    f"Expected user_count=1 (admin user created), got {data.get('user_count')}",
                    data
                )
                return False
            
            # Store tenant ID for later tests
            self.test_tenant_id = data.get("tenant_id")
            
            self.log_result(
                "Create Tenant", 
                True, 
                f"Tenant created successfully: {data.get('name')} (ID: {self.test_tenant_id}), status: {data.get('status')}, user_count: {data.get('user_count')}"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Create Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_list_tenants(self):
        """Test GET /api/tenants/ - List tenants with pagination"""
        try:
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/?skip=0&limit=10")
            
            if response.status_code != 200:
                self.log_result(
                    "List Tenants", 
                    False, 
                    f"List tenants failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "List Tenants", 
                    False, 
                    f"Response should be an array, got {type(data)}",
                    data
                )
                return False
            
            # Check if our test tenant is in the list
            if self.test_tenant_id:
                test_tenant_found = any(tenant.get("tenant_id") == self.test_tenant_id for tenant in data)
                if not test_tenant_found:
                    self.log_result(
                        "List Tenants", 
                        False, 
                        f"Test tenant {self.test_tenant_id} not found in tenant list",
                        data
                    )
                    return False
            
            self.log_result(
                "List Tenants", 
                True, 
                f"Retrieved {len(data)} tenants successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "List Tenants", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_list_tenants_with_filters(self):
        """Test GET /api/tenants/ with status and plan filters"""
        try:
            # Test status filter
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/?status_filter=trial")
            
            if response.status_code != 200:
                self.log_result(
                    "List Tenants with Status Filter", 
                    False, 
                    f"Status filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify all tenants have trial status
            for tenant in data:
                if tenant.get("status") != "trial":
                    self.log_result(
                        "List Tenants with Status Filter", 
                        False, 
                        f"Status filter not working: found tenant with status '{tenant.get('status')}'",
                        tenant
                    )
                    return False
            
            # Test subscription plan filter
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/?subscription_plan=pro")
            
            if response.status_code != 200:
                self.log_result(
                    "List Tenants with Plan Filter", 
                    False, 
                    f"Plan filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            plan_data = response.json()
            
            # Verify all tenants have pro plan
            for tenant in plan_data:
                if tenant.get("subscription_plan") != "pro":
                    self.log_result(
                        "List Tenants with Plan Filter", 
                        False, 
                        f"Plan filter not working: found tenant with plan '{tenant.get('subscription_plan')}'",
                        tenant
                    )
                    return False
            
            self.log_result(
                "List Tenants with Filters", 
                True, 
                f"Filters working: {len(data)} trial tenants, {len(plan_data)} pro tenants"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "List Tenants with Filters", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_tenant_details(self):
        """Test GET /api/tenants/{tenant_id} - Get specific tenant"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Get Tenant Details", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/{self.test_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Tenant Details", 
                    False, 
                    f"Get tenant details failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify tenant ID matches
            if data.get("tenant_id") != self.test_tenant_id:
                self.log_result(
                    "Get Tenant Details", 
                    False, 
                    f"Tenant ID mismatch: expected {self.test_tenant_id}, got {data.get('tenant_id')}",
                    data
                )
                return False
            
            # Verify required fields
            required_fields = ["tenant_id", "name", "display_name", "contact", "limits", "user_count", "device_count"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Get Tenant Details", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Get Tenant Details", 
                True, 
                f"Tenant details retrieved: {data.get('display_name')} with {data.get('user_count')} users"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Tenant Details", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_search_tenants(self):
        """Test GET /api/tenants/search?query=... - Search tenants"""
        try:
            # Search by name
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/search?query=test")
            
            if response.status_code != 200:
                self.log_result(
                    "Search Tenants by Name", 
                    False, 
                    f"Search by name failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            name_data = response.json()
            
            # Search by email
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/search?query=admin@test-tenant.com")
            
            if response.status_code != 200:
                self.log_result(
                    "Search Tenants by Email", 
                    False, 
                    f"Search by email failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            email_data = response.json()
            
            # Search by domain
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/search?query=test-tenant.example.com")
            
            if response.status_code != 200:
                self.log_result(
                    "Search Tenants by Domain", 
                    False, 
                    f"Search by domain failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            domain_data = response.json()
            
            # Verify our test tenant is found in all searches
            searches = [("name", name_data), ("email", email_data), ("domain", domain_data)]
            
            for search_type, search_results in searches:
                if self.test_tenant_id:
                    found = any(tenant.get("tenant_id") == self.test_tenant_id for tenant in search_results)
                    if not found:
                        self.log_result(
                            "Search Tenants", 
                            False, 
                            f"Test tenant not found in {search_type} search",
                            search_results
                        )
                        return False
            
            self.log_result(
                "Search Tenants", 
                True, 
                f"Search working: name={len(name_data)}, email={len(email_data)}, domain={len(domain_data)} results"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Search Tenants", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_tenant(self):
        """Test PUT /api/tenants/{tenant_id} - Update tenant"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Update Tenant", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            update_data = {
                "status": "active",
                "subscription_plan": "enterprise",
                "enabled": True
            }
            
            response = self.auth_service_session.put(f"{AUTH_SERVICE_URL}/api/tenants/{self.test_tenant_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Update Tenant", 
                    False, 
                    f"Update tenant failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify updates were applied
            if data.get("status") != "active":
                self.log_result(
                    "Update Tenant", 
                    False, 
                    f"Status not updated: expected 'active', got '{data.get('status')}'",
                    data
                )
                return False
            
            if data.get("subscription_plan") != "enterprise":
                self.log_result(
                    "Update Tenant", 
                    False, 
                    f"Plan not updated: expected 'enterprise', got '{data.get('subscription_plan')}'",
                    data
                )
                return False
            
            self.log_result(
                "Update Tenant", 
                True, 
                f"Tenant updated successfully: status={data.get('status')}, plan={data.get('subscription_plan')}"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Update Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_validation_errors(self):
        """Test validation scenarios"""
        try:
            # Test duplicate name
            duplicate_tenant = {
                "name": "test-tenant",  # Same as our test tenant
                "display_name": "Duplicate Test Tenant",
                "contact": {
                    "admin_email": "admin2@test-tenant.com"
                },
                "admin_password": "SecurePass123!"
            }
            
            response = self.auth_service_session.post(f"{AUTH_SERVICE_URL}/api/tenants/", json=duplicate_tenant)
            
            if response.status_code != 400:
                self.log_result(
                    "Validation - Duplicate Name", 
                    False, 
                    f"Expected 400 for duplicate name, got {response.status_code}",
                    response.text
                )
                return False
            
            # Test duplicate email
            duplicate_email_tenant = {
                "name": "test-tenant-2",
                "display_name": "Test Tenant 2",
                "contact": {
                    "admin_email": "admin@test-tenant.com"  # Same as our test tenant
                },
                "admin_password": "SecurePass123!"
            }
            
            response = self.auth_service_session.post(f"{AUTH_SERVICE_URL}/api/tenants/", json=duplicate_email_tenant)
            
            if response.status_code != 400:
                self.log_result(
                    "Validation - Duplicate Email", 
                    False, 
                    f"Expected 400 for duplicate email, got {response.status_code}",
                    response.text
                )
                return False
            
            # Test invalid tenant ID
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/invalid-id")
            
            if response.status_code != 404:
                self.log_result(
                    "Validation - Invalid Tenant ID", 
                    False, 
                    f"Expected 404 for invalid tenant ID, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Validation Tests", 
                True, 
                "All validation scenarios working correctly: duplicate name (400), duplicate email (400), invalid ID (404)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Validation Tests", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_delete_tenant(self):
        """Test DELETE /api/tenants/{tenant_id} - Delete tenant"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Delete Tenant", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            response = self.auth_service_session.delete(f"{AUTH_SERVICE_URL}/api/tenants/{self.test_tenant_id}")
            
            if response.status_code != 204:
                self.log_result(
                    "Delete Tenant", 
                    False, 
                    f"Delete tenant failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            # Verify tenant is deleted by trying to get it
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/{self.test_tenant_id}")
            
            if response.status_code != 404:
                self.log_result(
                    "Delete Tenant Verification", 
                    False, 
                    f"Tenant still exists after deletion. Status: {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Delete Tenant", 
                True, 
                f"Tenant {self.test_tenant_id} deleted successfully and verified"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Delete Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all tenant management tests"""
        print("=" * 70)
        print("TENANT MANAGEMENT BACKEND TESTING - AUTH & IDENTITY SERVICE")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Auth Service URL: {AUTH_SERVICE_URL}")
        print("=" * 70)
        print()
        
        # Test Auth Service health first
        if not self.test_auth_service_health():
            print("❌ Auth Service health check failed. Stopping tests.")
            return False
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 1: Test Tenant Statistics
        print("\n🔍 STEP 1: Testing Tenant Statistics...")
        stats = self.test_tenant_stats()
        if not stats:
            print("❌ Tenant statistics failed.")
        
        # Step 2: Test Tenant Creation
        print("\n🔍 STEP 2: Testing Tenant Creation...")
        created_tenant = self.test_create_tenant()
        if not created_tenant:
            print("❌ Tenant creation failed.")
        
        # Step 3: Test List Tenants
        print("\n🔍 STEP 3: Testing List Tenants...")
        if not self.test_list_tenants():
            print("❌ List tenants failed.")
        
        # Step 4: Test List Tenants with Filters
        print("\n🔍 STEP 4: Testing List Tenants with Filters...")
        if not self.test_list_tenants_with_filters():
            print("❌ List tenants with filters failed.")
        
        # Step 5: Test Get Tenant Details
        print("\n🔍 STEP 5: Testing Get Tenant Details...")
        if not self.test_get_tenant_details():
            print("❌ Get tenant details failed.")
        
        # Step 6: Test Search Tenants
        print("\n🔍 STEP 6: Testing Search Tenants...")
        if not self.test_search_tenants():
            print("❌ Search tenants failed.")
        
        # Step 7: Test Update Tenant
        print("\n🔍 STEP 7: Testing Update Tenant...")
        if not self.test_update_tenant():
            print("❌ Update tenant failed.")
        
        # Step 8: Test Validation Scenarios
        print("\n🔍 STEP 8: Testing Validation Scenarios...")
        if not self.test_validation_errors():
            print("❌ Validation tests failed.")
        
        # Step 9: Test Delete Tenant
        print("\n🔍 STEP 9: Testing Delete Tenant...")
        if not self.test_delete_tenant():
            print("❌ Delete tenant failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("TENANT MANAGEMENT TESTING SUMMARY")
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
    print("Starting Tenant Management Backend Testing...")
    print()
    
    # Test Tenant Management
    tester = TenantManagementTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Tenant Management Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 TENANT MANAGEMENT TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ TENANT MANAGEMENT TESTING FOUND ISSUES!")
        sys.exit(1)
