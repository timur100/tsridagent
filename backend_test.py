#!/usr/bin/env python3
"""
Backend API Testing Suite - HEALTH CHECK AND API KEYS MANAGEMENT TESTING
Tests specific backend fixes as requested:

ENDPOINTS TO TEST:
1. GET /api/health - Health check endpoint
2. POST /api/portal/auth/login - Login authentication
3. GET /api/portal/api-keys - API Keys Management endpoint

Test Scenario:
1. Test health check endpoint (no auth required)
2. Login as admin@tsrid.com / admin123
3. Test API keys management endpoint with authentication
4. Verify all 6 API keys are returned with proper structure

Expected behavior:
- Health check returns 200 OK with {"status": "healthy", "service": "tsrid-backend"}
- API keys endpoint returns 6 keys with proper structure and masked keys
- All expected api_names present: hetzner_api, hetzner_dns, github_pat, mongodb_atlas, ssh_root, traefik_dns
"""

import requests
import json
import sys
from typing import Dict, Any, List
import time

# Backend URL from environment
BACKEND_URL = "https://devops-central-17.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class HealthCheckAndAPIKeysTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.expected_api_names = [
            "hetzner_api", "hetzner_dns", "github_pat", 
            "mongodb_atlas", "ssh_root", "traefik_dns"
        ]
        
    def test_health_check(self) -> bool:
        """Test GET /api/health endpoint"""
        print("🏥 [TEST 1/3] Testing health check endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/health")
            print(f"Health check response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Health check response: {data}")
                
                # Verify expected response structure
                if data.get("status") == "healthy" and data.get("service") == "tsrid-backend":
                    print("✅ Health check endpoint working correctly")
                    print(f"   Status: {data.get('status')}")
                    print(f"   Service: {data.get('service')}")
                    return True
                else:
                    print(f"❌ Unexpected health check response: {data}")
                    return False
            else:
                print(f"❌ Health check failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Health check error: {str(e)}")
            return False
    
    def login(self) -> bool:
        """Login and get JWT token"""
        print("🔐 [TEST 2/3] Authenticating as admin...")
        
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
                    return True
                else:
                    print("❌ No access token in response")
                    print(f"Response data: {data}")
                    return False
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_api_keys_management(self) -> bool:
        """Test GET /api/portal/api-keys endpoint"""
        print("🔑 [TEST 3/3] Testing API Keys Management endpoint...")
        
        try:
            response = self.session.get(f"{API_BASE}/portal/api-keys")
            print(f"API Keys response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"API Keys response structure: {list(data.keys())}")
                
                # Check if response has success field
                if data.get("success") is True:
                    api_keys_data = data.get("data", {})
                    api_keys = api_keys_data.get("api_keys", [])
                    
                    print(f"✅ API Keys endpoint returned success=true")
                    print(f"   Found {len(api_keys)} API keys")
                    
                    # Verify we have exactly 6 keys
                    if len(api_keys) == 6:
                        print("✅ Correct number of API keys (6)")
                    else:
                        print(f"❌ Expected 6 API keys, got {len(api_keys)}")
                        return False
                    
                    # Verify each key has required fields
                    found_api_names = []
                    for i, key in enumerate(api_keys):
                        api_name = key.get("api_name")
                        masked_key = key.get("masked_key")
                        description = key.get("description")
                        is_active = key.get("is_active")
                        created_at = key.get("created_at")
                        updated_at = key.get("updated_at")
                        
                        print(f"   Key {i+1}: {api_name}")
                        print(f"     Masked Key: {masked_key}")
                        print(f"     Description: {description}")
                        print(f"     Active: {is_active}")
                        print(f"     Created: {created_at}")
                        print(f"     Updated: {updated_at}")
                        
                        # Check required fields
                        if not api_name:
                            print(f"❌ Missing api_name for key {i+1}")
                            return False
                        
                        if not masked_key or masked_key == "MISSING":
                            print(f"❌ Invalid masked_key for {api_name}: {masked_key}")
                            return False
                        
                        if description is None:
                            print(f"❌ Missing description for {api_name}")
                            return False
                        
                        if is_active is None:
                            print(f"❌ Missing is_active for {api_name}")
                            return False
                        
                        if not created_at:
                            print(f"❌ Missing created_at for {api_name}")
                            return False
                        
                        if not updated_at:
                            print(f"❌ Missing updated_at for {api_name}")
                            return False
                        
                        found_api_names.append(api_name)
                    
                    # Verify all expected API names are present
                    missing_names = []
                    for expected_name in self.expected_api_names:
                        if expected_name not in found_api_names:
                            missing_names.append(expected_name)
                    
                    if missing_names:
                        print(f"❌ Missing expected API names: {missing_names}")
                        return False
                    else:
                        print("✅ All expected API names found:")
                        for name in self.expected_api_names:
                            print(f"   ✓ {name}")
                    
                    print("✅ All API keys have required fields")
                    print("✅ No masked keys are empty or 'MISSING'")
                    return True
                    
                else:
                    print(f"❌ API returned success=false: {data.get('message', 'Unknown error')}")
                    print(f"Full response: {data}")
                    return False
            else:
                print(f"❌ Failed to get API keys: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ API Keys error: {str(e)}")
            return False
    
    def run_tests(self) -> bool:
        """Run all Health Check and API Keys Management tests"""
        print("🚀 Starting Health Check and API Keys Management Testing...")
        print("=" * 70)
        
        try:
            # Test 1: Health Check (no auth required)
            if not self.test_health_check():
                return False
            
            print()  # Add spacing
            
            # Test 2: Authentication
            if not self.login():
                return False
            
            print()  # Add spacing
            
            # Test 3: API Keys Management
            if not self.test_api_keys_management():
                return False
            
            print("\n" + "=" * 70)
            print("✅ ALL HEALTH CHECK AND API KEYS TESTS PASSED!")
            print("✅ Health check endpoint working correctly")
            print("✅ Authentication working correctly")
            print("✅ API Keys Management endpoint functional")
            print("✅ All 6 API keys returned with proper structure")
            print("✅ All expected api_names present")
            print("✅ No masked keys are empty or 'MISSING'")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Test suite error: {str(e)}")
            return False

def main():
    """Main test execution"""
    tester = AssetManagementAPITester()
    
    success = tester.run_tests()
    
    if success:
        print("\n🎉 Asset Management API testing completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Asset Management API testing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()