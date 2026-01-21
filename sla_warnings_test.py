#!/usr/bin/env python3
"""
SLA Warnings API Test - User Report Investigation
Tests the /api/sla/warnings endpoint to debug "Keine SLA-Daten verfügbar" frontend issue.

User reports seeing "Keine SLA-Daten verfügbar" in frontend but API returns 200 OK.
Need to see exactly what data the API returns to fix the frontend problem.
"""

import requests
import json
import sys
from typing import Dict, Any
import jwt

# Backend URL from environment
BACKEND_URL = "https://stability-rescue-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class SLAWarningsDebugTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.admin_token = None
        
    def authenticate_admin(self):
        """Authenticate as admin user (admin@tsrid.com / admin123)"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            print("🔐 Authenticating as admin@tsrid.com...")
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                print(f"❌ Authentication failed. Status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                print("❌ Authentication response missing access_token")
                print(f"Response: {json.dumps(data, indent=2)}")
                return False
            
            self.admin_token = data["access_token"]
            self.session.headers.update({
                'Authorization': f'Bearer {self.admin_token}'
            })
            
            # Decode token to verify claims
            try:
                decoded = jwt.decode(self.admin_token, options={"verify_signature": False})
                role = decoded.get("role", "")
                customer_id = decoded.get("customer_id", "")
                
                print(f"✅ Successfully authenticated as admin@tsrid.com")
                print(f"   Role: {role}")
                print(f"   Customer ID: {customer_id}")
                return True
            except Exception as decode_error:
                print(f"❌ Failed to decode JWT token: {str(decode_error)}")
                return False
            
        except Exception as e:
            print(f"❌ Exception during authentication: {str(e)}")
            return False

    def test_sla_warnings_endpoint(self):
        """Test GET /api/sla/warnings and print complete response"""
        try:
            print("\n🔍 Testing GET /api/sla/warnings...")
            print(f"URL: {API_BASE}/sla/warnings")
            print(f"Headers: Authorization: Bearer {self.admin_token[:20]}...")
            
            response = self.session.get(f"{API_BASE}/sla/warnings")
            
            print(f"\n📊 RESPONSE STATUS: {response.status_code}")
            print(f"📊 RESPONSE HEADERS:")
            for header, value in response.headers.items():
                print(f"   {header}: {value}")
            
            if response.status_code != 200:
                print(f"❌ Request failed with status {response.status_code}")
                print(f"Response text: {response.text}")
                return False
            
            # Parse JSON response
            try:
                data = response.json()
                print(f"\n📋 COMPLETE JSON RESPONSE:")
                print("=" * 60)
                print(json.dumps(data, indent=2, ensure_ascii=False))
                print("=" * 60)
                
                # Analyze response structure
                print(f"\n🔍 RESPONSE ANALYSIS:")
                print(f"   Response type: {type(data)}")
                
                if isinstance(data, dict):
                    print(f"   Top-level keys: {list(data.keys())}")
                    
                    # Check for success field
                    if "success" in data:
                        print(f"   Success field: {data['success']}")
                    
                    # Check for expected SLA fields
                    expected_fields = ["critical_count", "breached_count", "at_risk_count", "warnings"]
                    found_fields = []
                    missing_fields = []
                    
                    for field in expected_fields:
                        if field in data:
                            found_fields.append(field)
                            print(f"   ✅ Found {field}: {data[field]}")
                        else:
                            missing_fields.append(field)
                            print(f"   ❌ Missing {field}")
                    
                    # Check if data is nested
                    if "data" in data:
                        print(f"   Data field type: {type(data['data'])}")
                        if isinstance(data['data'], dict):
                            print(f"   Data field keys: {list(data['data'].keys())}")
                            
                            # Check for expected fields in data section
                            data_section = data['data']
                            for field in expected_fields:
                                if field in data_section:
                                    if field not in found_fields:
                                        found_fields.append(field)
                                    print(f"   ✅ Found {field} in data: {data_section[field]}")
                    
                    # Check warnings structure if present
                    warnings = data.get("warnings") or (data.get("data", {}).get("warnings") if isinstance(data.get("data"), dict) else None)
                    if warnings:
                        print(f"   Warnings type: {type(warnings)}")
                        if isinstance(warnings, dict):
                            print(f"   Warnings keys: {list(warnings.keys())}")
                            for key, value in warnings.items():
                                if isinstance(value, list):
                                    print(f"   Warnings.{key}: {len(value)} items")
                                else:
                                    print(f"   Warnings.{key}: {value}")
                    
                    print(f"\n📊 SUMMARY:")
                    print(f"   Expected fields found: {found_fields}")
                    print(f"   Expected fields missing: {missing_fields}")
                    
                    # Determine if this explains the frontend issue
                    if not found_fields:
                        print(f"\n🚨 FRONTEND ISSUE DIAGNOSIS:")
                        print(f"   The API returns 200 OK but contains no expected SLA data fields.")
                        print(f"   This explains why frontend shows 'Keine SLA-Daten verfügbar'.")
                        print(f"   Frontend is likely checking for these fields and finding none.")
                    else:
                        print(f"\n✅ FRONTEND ISSUE DIAGNOSIS:")
                        print(f"   The API returns expected SLA data fields: {found_fields}")
                        print(f"   Frontend issue may be related to data structure parsing or field names.")
                
                else:
                    print(f"   Response is not a dictionary: {data}")
                
                return True
                
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse JSON response: {str(e)}")
                print(f"Raw response: {response.text}")
                return False
            
        except Exception as e:
            print(f"❌ Exception during SLA warnings test: {str(e)}")
            return False

    def run_debug_test(self):
        """Run the SLA warnings debug test"""
        print("=" * 80)
        print("SLA WARNINGS API DEBUG TEST")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Endpoint: GET /api/sla/warnings")
        print(f"Purpose: Debug 'Keine SLA-Daten verfügbar' frontend issue")
        print("=" * 80)
        
        try:
            # Step 1: Authenticate as Admin
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with test.")
                return False
            
            # Step 2: Test SLA warnings endpoint
            success = self.test_sla_warnings_endpoint()
            
            print("\n" + "=" * 80)
            print("SLA WARNINGS DEBUG TEST SUMMARY")
            print("=" * 80)
            
            if success:
                print("✅ Test completed successfully")
                print("📋 Complete API response printed above")
                print("🔍 Check the response structure to identify frontend parsing issues")
            else:
                print("❌ Test failed")
                print("🚨 API endpoint may have issues that need to be resolved")
            
            return success
            
        except Exception as e:
            print(f"❌ Error during debug test: {str(e)}")
            return False

def main():
    """Main function to run the SLA warnings debug test"""
    tester = SLAWarningsDebugTester()
    success = tester.run_debug_test()
    
    if success:
        print("\n🎯 NEXT STEPS:")
        print("1. Review the complete JSON response above")
        print("2. Compare with frontend expectations")
        print("3. Fix frontend parsing logic if needed")
        print("4. Verify backend returns expected data structure")
        sys.exit(0)
    else:
        print("\n🚨 ISSUES FOUND:")
        print("1. API endpoint may not be working correctly")
        print("2. Authentication or authorization issues")
        print("3. Backend service may be down")
        sys.exit(1)

if __name__ == "__main__":
    main()