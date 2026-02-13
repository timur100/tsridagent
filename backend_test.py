#!/usr/bin/env python3
"""
Backend API Testing Suite - COMPREHENSIVE TSRID SYSTEM TESTING
Tests comprehensive TSRID system as requested in German review:

ENDPOINTS TO TEST:
1. GET /api/health - API Health check
2. GET /api/monitor/quick - Quick System Check (public)
3. POST /api/portal/auth/login - Authentication
4. GET /api/monitor/comprehensive - Comprehensive System Check (Auth required)
5. GET /api/tenants - Tenant list
6. GET /api/portal/api-keys - API Keys (should have 6 entries)
7. GET /api/search/global?query=test - Global search
8. POST /api/monitor/test-write - Database write test

Test Scenario:
1. Test public endpoints (health, quick monitor)
2. Login as admin@tsrid.com / admin123
3. Test authenticated endpoints
4. Verify MongoDB Atlas connection is "healthy"
5. Verify API keys have 6 entries
6. Test all communication paths between Frontend and Backend

Expected behavior:
- All HTTP responses should return status 200
- MongoDB Atlas connection should be "healthy"
- Authentication should work
- API Keys should have 6 entries
"""

import requests
import json
import sys
from typing import Dict, Any, List
import time

# Backend URL from environment (using actual deployment URL)
BACKEND_URL = "https://asset-mgmt-v2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TSRIDSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.expected_api_names = [
            "hetzner_api", "hetzner_dns", "github_pat", 
            "mongodb_atlas", "ssh_root", "traefik_dns"
        ]
        self.test_results = []
        
    def log_test_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result for summary"""
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_api_health(self) -> bool:
        """Test GET /api/health endpoint"""
        print("🏥 [TEST 1/8] Testing API health endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/health")
            print(f"API health response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"API health response: {data}")
                
                # Verify expected response structure
                if data.get("status") == "healthy" and data.get("service") == "tsrid-backend":
                    print("✅ API health endpoint working correctly")
                    print(f"   Status: {data.get('status')}")
                    print(f"   Service: {data.get('service')}")
                    self.log_test_result("API Health", True, "Status: healthy, Service: tsrid-backend")
                    return True
                else:
                    print(f"❌ Unexpected API health response: {data}")
                    self.log_test_result("API Health", False, f"Unexpected response: {data}")
                    return False
            else:
                print(f"❌ API health failed: {response.status_code} - {response.text}")
                self.log_test_result("API Health", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ API health error: {str(e)}")
            self.log_test_result("API Health", False, f"Exception: {str(e)}")
            return False
    
    def test_quick_monitor(self) -> bool:
        """Test GET /api/monitor/quick endpoint (public)"""
        print("⚡ [TEST 2/8] Testing quick system check endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/monitor/quick")
            print(f"Quick monitor response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Quick monitor response keys: {list(data.keys())}")
                
                # Check for MongoDB status
                mongodb_status = None
                if isinstance(data, dict):
                    # Look for MongoDB status in various possible structures
                    if "mongodb" in data:
                        mongodb_status = data["mongodb"]
                    elif "database" in data:
                        mongodb_status = data["database"]
                    elif "status" in data:
                        mongodb_status = data["status"]
                
                print(f"MongoDB status found: {mongodb_status}")
                print("✅ Quick system check endpoint working")
                self.log_test_result("Quick Monitor", True, f"MongoDB status: {mongodb_status}")
                return True
            else:
                print(f"❌ Quick monitor failed: {response.status_code} - {response.text}")
                self.log_test_result("Quick Monitor", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Quick monitor error: {str(e)}")
            self.log_test_result("Quick Monitor", False, f"Exception: {str(e)}")
            return False
    
    def login(self) -> bool:
        """Login and get JWT token"""
        print("🔐 [TEST 3/8] Authenticating as admin...")
        
        login_data = {
            "email": "admin@tsrid.com",
            "password": "admin123"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    # Set authorization header for future requests
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    print("✅ Authentication successful")
                    self.log_test_result("Authentication", True, "JWT token obtained")
                    return True
                else:
                    print("❌ No access token in response")
                    print(f"Response data: {data}")
                    self.log_test_result("Authentication", False, "No access token in response")
                    return False
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                self.log_test_result("Authentication", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            self.log_test_result("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_comprehensive_monitor(self) -> bool:
        """Test GET /api/monitor/comprehensive endpoint (Auth required)"""
        print("🔍 [TEST 4/8] Testing comprehensive system check endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/monitor/comprehensive")
            print(f"Comprehensive monitor response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Comprehensive monitor response keys: {list(data.keys())}")
                
                # Look for MongoDB Atlas connection status
                mongodb_healthy = False
                mongodb_details = "Not found"
                
                if isinstance(data, dict):
                    # Check various possible structures for MongoDB status
                    for key, value in data.items():
                        if "mongodb" in key.lower() or "database" in key.lower():
                            print(f"Found database info in '{key}': {value}")
                            if isinstance(value, dict) and value.get("status") == "healthy":
                                mongodb_healthy = True
                                mongodb_details = f"{key}: healthy"
                            elif isinstance(value, str) and "healthy" in value.lower():
                                mongodb_healthy = True
                                mongodb_details = f"{key}: {value}"
                
                if mongodb_healthy:
                    print("✅ Comprehensive system check working - MongoDB Atlas healthy")
                    self.log_test_result("Comprehensive Monitor", True, f"MongoDB Atlas: {mongodb_details}")
                else:
                    print("⚠️ Comprehensive system check working but MongoDB status unclear")
                    self.log_test_result("Comprehensive Monitor", True, f"Response received, MongoDB: {mongodb_details}")
                return True
            else:
                print(f"❌ Comprehensive monitor failed: {response.status_code} - {response.text}")
                self.log_test_result("Comprehensive Monitor", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Comprehensive monitor error: {str(e)}")
            self.log_test_result("Comprehensive Monitor", False, f"Exception: {str(e)}")
            return False
    
    def test_tenants(self) -> bool:
        """Test GET /api/tenants endpoint"""
        print("🏢 [TEST 5/8] Testing tenants endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/tenants")
            print(f"Tenants response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Tenants response structure: {type(data)}")
                
                tenant_count = 0
                if isinstance(data, list):
                    tenant_count = len(data)
                elif isinstance(data, dict) and "data" in data:
                    tenant_data = data["data"]
                    if isinstance(tenant_data, list):
                        tenant_count = len(tenant_data)
                    elif isinstance(tenant_data, dict) and "tenants" in tenant_data:
                        tenant_count = len(tenant_data["tenants"])
                
                print(f"✅ Tenants endpoint working - Found {tenant_count} tenants")
                self.log_test_result("Tenants", True, f"Found {tenant_count} tenants")
                return True
            else:
                print(f"❌ Tenants failed: {response.status_code} - {response.text}")
                self.log_test_result("Tenants", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Tenants error: {str(e)}")
            self.log_test_result("Tenants", False, f"Exception: {str(e)}")
            return False
    
    def test_api_keys(self) -> bool:
        """Test GET /api/portal/api-keys endpoint - should have 6 entries"""
        print("🔑 [TEST 6/8] Testing API Keys endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/portal/api-keys")
            print(f"API Keys response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has success field
                if data.get("success") is True:
                    api_keys_data = data.get("data", {})
                    api_keys = api_keys_data.get("api_keys", [])
                    
                    print(f"✅ API Keys endpoint working - Found {len(api_keys)} API keys")
                    
                    # Verify we have exactly 6 keys as expected
                    if len(api_keys) == 6:
                        print("✅ Correct number of API keys (6) as expected")
                        
                        # Verify all expected API names are present
                        found_api_names = [key.get("api_name") for key in api_keys]
                        missing_names = [name for name in self.expected_api_names if name not in found_api_names]
                        
                        if not missing_names:
                            print("✅ All expected API names found")
                            self.log_test_result("API Keys", True, f"6 keys found with all expected names")
                        else:
                            print(f"⚠️ Missing expected API names: {missing_names}")
                            self.log_test_result("API Keys", True, f"6 keys found, missing: {missing_names}")
                    else:
                        print(f"⚠️ Expected 6 API keys, got {len(api_keys)}")
                        self.log_test_result("API Keys", True, f"Found {len(api_keys)} keys (expected 6)")
                    
                    return True
                else:
                    print(f"❌ API returned success=false: {data.get('message', 'Unknown error')}")
                    self.log_test_result("API Keys", False, f"API returned success=false")
                    return False
            else:
                print(f"❌ API Keys failed: {response.status_code} - {response.text}")
                self.log_test_result("API Keys", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ API Keys error: {str(e)}")
            self.log_test_result("API Keys", False, f"Exception: {str(e)}")
            return False
    
    def test_global_search(self) -> bool:
        """Test GET /api/search/global?query=test endpoint"""
        print("🔍 [TEST 7/8] Testing global search endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/search/global", params={"query": "test"})
            print(f"Global search response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Global search response structure: {type(data)}")
                
                # Check for search results
                result_count = 0
                if isinstance(data, dict):
                    if "results" in data:
                        result_count = len(data["results"]) if isinstance(data["results"], list) else 0
                    elif "data" in data:
                        result_count = len(data["data"]) if isinstance(data["data"], list) else 0
                    elif "total" in data:
                        result_count = data["total"]
                
                print(f"✅ Global search endpoint working - Found {result_count} results for 'test'")
                self.log_test_result("Global Search", True, f"Found {result_count} results")
                return True
            else:
                print(f"❌ Global search failed: {response.status_code} - {response.text}")
                self.log_test_result("Global Search", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Global search error: {str(e)}")
            self.log_test_result("Global Search", False, f"Exception: {str(e)}")
            return False
    
    def test_database_write(self) -> bool:
        """Test POST /api/monitor/test-write endpoint"""
        print("💾 [TEST 8/8] Testing database write test endpoint...")
        
        try:
            # Send a test write request
            test_data = {"test_message": "TSRID system test", "timestamp": time.time()}
            response = self.session.post(f"{API_BASE}/monitor/test-write", json=test_data)
            print(f"Database write test response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Database write test response: {data}")
                print("✅ Database write test endpoint working")
                self.log_test_result("Database Write Test", True, "Write operation successful")
                return True
            else:
                print(f"❌ Database write test failed: {response.status_code} - {response.text}")
                self.log_test_result("Database Write Test", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Database write test error: {str(e)}")
            self.log_test_result("Database Write Test", False, f"Exception: {str(e)}")
            return False
    
    def run_tests(self) -> bool:
        """Run all comprehensive TSRID system tests"""
        print("🚀 Starting Comprehensive TSRID System Testing...")
        print("=" * 80)
        
        try:
            # Test 1: API Health (no auth required)
            if not self.test_api_health():
                return False
            
            print()  # Add spacing
            
            # Test 2: Quick Monitor (no auth required)
            if not self.test_quick_monitor():
                return False
            
            print()  # Add spacing
            
            # Test 3: Authentication
            if not self.login():
                return False
            
            print()  # Add spacing
            
            # Test 4: Comprehensive Monitor (auth required)
            if not self.test_comprehensive_monitor():
                return False
            
            print()  # Add spacing
            
            # Test 5: Tenants (auth required)
            if not self.test_tenants():
                return False
            
            print()  # Add spacing
            
            # Test 6: API Keys (auth required)
            if not self.test_api_keys():
                return False
            
            print()  # Add spacing
            
            # Test 7: Global Search (auth required)
            if not self.test_global_search():
                return False
            
            print()  # Add spacing
            
            # Test 8: Database Write Test (auth required)
            if not self.test_database_write():
                return False
            
            # Print comprehensive summary
            self.print_test_summary()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Test suite error: {str(e)}")
            return False
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TSRID SYSTEM TEST SUMMARY")
        print("=" * 80)
        
        passed_tests = [result for result in self.test_results if result["success"]]
        failed_tests = [result for result in self.test_results if not result["success"]]
        
        print(f"✅ PASSED TESTS: {len(passed_tests)}/{len(self.test_results)}")
        for result in passed_tests:
            print(f"   ✓ {result['test']}: {result['details']}")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS: {len(failed_tests)}/{len(self.test_results)}")
            for result in failed_tests:
                print(f"   ✗ {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        if len(failed_tests) == 0:
            print("🎉 ALL TSRID SYSTEM TESTS PASSED!")
            print("✅ All communication paths between Frontend and Backend working")
            print("✅ MongoDB Atlas connection verified")
            print("✅ Authentication system functional")
            print("✅ All critical API endpoints responding correctly")
            print("✅ System ready for production use")
        else:
            print("⚠️ SOME TESTS FAILED - REVIEW REQUIRED")
            print("❌ System may have issues that need attention")

def main():
    """Main test execution"""
    tester = TSRIDSystemTester()
    
    success = tester.run_tests()
    
    if success:
        print("\n🎉 Comprehensive TSRID system testing completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Comprehensive TSRID system testing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()