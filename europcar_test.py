#!/usr/bin/env python3
"""
Europcar CSV Data Integration API Testing
Tests the new Europcar stations endpoint with authentication scenarios
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://europcar-fleet-app.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class EuropcarAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.tokens = {}  # Store tokens for different users
        
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
    
    def authenticate_user(self, email: str, password: str) -> str:
        """Authenticate user and return JWT token"""
        try:
            login_data = {
                "email": email,
                "password": password
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=login_data)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            return data.get("access_token")
            
        except Exception as e:
            print(f"Authentication error for {email}: {str(e)}")
            return None
    
    def test_admin_authentication(self):
        """Test admin user authentication"""
        try:
            token = self.authenticate_user("admin@tsrid.com", "admin123")
            
            if not token:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    "Failed to authenticate admin user"
                )
                return False
            
            self.tokens["admin"] = token
            
            self.log_result(
                "Admin Authentication", 
                True, 
                "Successfully authenticated admin user",
                {"token_length": len(token)}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_europcar_customer_authentication(self):
        """Test Europcar customer authentication"""
        try:
            token = self.authenticate_user("demo@customer.de", "demo123")
            
            if not token:
                self.log_result(
                    "Europcar Customer Authentication", 
                    False, 
                    "Failed to authenticate Europcar customer"
                )
                return False
            
            self.tokens["europcar"] = token
            
            self.log_result(
                "Europcar Customer Authentication", 
                True, 
                "Successfully authenticated Europcar customer",
                {"token_length": len(token)}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Europcar Customer Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_regular_customer_authentication(self):
        """Test regular customer authentication"""
        try:
            token = self.authenticate_user("kunde@test.de", "test123")
            
            if not token:
                self.log_result(
                    "Regular Customer Authentication", 
                    False, 
                    "Failed to authenticate regular customer"
                )
                return False
            
            self.tokens["regular"] = token
            
            self.log_result(
                "Regular Customer Authentication", 
                True, 
                "Successfully authenticated regular customer",
                {"token_length": len(token)}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Regular Customer Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_admin_access_europcar_stations(self):
        """Test admin access to Europcar stations endpoint"""
        if "admin" not in self.tokens:
            self.log_result(
                "Admin Access - Europcar Stations", 
                False, 
                "Admin token not available"
            )
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
            response = self.session.get(f"{API_BASE}/portal/customer-data/europcar-stations", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Access - Europcar Stations", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Validate response structure
            if not data.get("success"):
                self.log_result(
                    "Admin Access - Europcar Stations", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            # Validate summary structure
            summary = data.get("summary", {})
            required_summary_fields = ["total", "ready", "online", "offline"]
            missing_fields = [field for field in required_summary_fields if field not in summary]
            if missing_fields:
                self.log_result(
                    "Admin Access - Europcar Stations", 
                    False, 
                    f"Summary missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Validate expected counts
            expected_total = 213
            expected_ready = 202
            expected_online = 84
            expected_offline = 129
            
            if (summary.get("total") != expected_total or 
                summary.get("ready") != expected_ready or 
                summary.get("online") != expected_online or 
                summary.get("offline") != expected_offline):
                self.log_result(
                    "Admin Access - Europcar Stations", 
                    False, 
                    f"Summary counts don't match expected values. Expected: total={expected_total}, ready={expected_ready}, online={expected_online}, offline={expected_offline}",
                    summary
                )
                return False
            
            # Validate stations array
            stations = data.get("stations", [])
            if len(stations) != expected_total:
                self.log_result(
                    "Admin Access - Europcar Stations", 
                    False, 
                    f"Expected {expected_total} stations, got {len(stations)}",
                    {"stations_count": len(stations)}
                )
                return False
            
            # Validate station structure
            if stations:
                station = stations[0]
                required_station_fields = ["status", "main_code", "stationsname", "ort", "bundesl", "mgr", "id_checker", "online"]
                missing_station_fields = [field for field in required_station_fields if field not in station]
                if missing_station_fields:
                    self.log_result(
                        "Admin Access - Europcar Stations", 
                        False, 
                        f"Station missing required fields: {missing_station_fields}",
                        station
                    )
                    return False
                
                # Check for MongoDB _id field (should not be present)
                if "_id" in station:
                    self.log_result(
                        "Admin Access - Europcar Stations", 
                        False, 
                        "Station contains MongoDB _id field (should be removed)",
                        station
                    )
                    return False
            
            self.log_result(
                "Admin Access - Europcar Stations", 
                True, 
                f"Successfully accessed Europcar stations data. Total: {summary['total']}, Ready: {summary['ready']}, Online: {summary['online']}, Offline: {summary['offline']}",
                summary
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Access - Europcar Stations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_europcar_customer_access(self):
        """Test Europcar customer access to stations endpoint"""
        if "europcar" not in self.tokens:
            self.log_result(
                "Europcar Customer Access - Stations", 
                False, 
                "Europcar customer token not available"
            )
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.tokens['europcar']}"}
            response = self.session.get(f"{API_BASE}/portal/customer-data/europcar-stations", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Europcar Customer Access - Stations", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Validate response structure (same as admin test)
            if not data.get("success"):
                self.log_result(
                    "Europcar Customer Access - Stations", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            # Validate summary
            summary = data.get("summary", {})
            if summary.get("total") != 213:
                self.log_result(
                    "Europcar Customer Access - Stations", 
                    False, 
                    f"Expected 213 total stations, got {summary.get('total')}",
                    summary
                )
                return False
            
            self.log_result(
                "Europcar Customer Access - Stations", 
                True, 
                f"Successfully accessed Europcar stations as active customer. Total: {summary['total']} stations",
                summary
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Europcar Customer Access - Stations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_regular_customer_access_denied(self):
        """Test regular customer access denied to Europcar stations"""
        if "regular" not in self.tokens:
            self.log_result(
                "Regular Customer Access Denied", 
                False, 
                "Regular customer token not available"
            )
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.tokens['regular']}"}
            response = self.session.get(f"{API_BASE}/portal/customer-data/europcar-stations", headers=headers)
            
            if response.status_code != 403:
                self.log_result(
                    "Regular Customer Access Denied", 
                    False, 
                    f"Expected status 403 (Forbidden), got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Regular Customer Access Denied", 
                True, 
                "Regular customer correctly denied access with 403 status",
                {"status_code": response.status_code}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Regular Customer Access Denied", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access without token"""
        try:
            response = self.session.get(f"{API_BASE}/portal/customer-data/europcar-stations")
            
            if response.status_code not in [401, 403]:
                self.log_result(
                    "Unauthorized Access", 
                    False, 
                    f"Expected status 401 or 403, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Unauthorized Access", 
                True, 
                f"Unauthorized access correctly denied with status {response.status_code}",
                {"status_code": response.status_code}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Unauthorized Access", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all Europcar API tests"""
        print("=" * 60)
        print("EUROPCAR CSV DATA INTEGRATION API TESTING SUITE")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        print()
        
        # Run all tests in order
        tests = [
            self.test_admin_authentication,
            self.test_europcar_customer_authentication,
            self.test_regular_customer_authentication,
            self.test_admin_access_europcar_stations,
            self.test_europcar_customer_access,
            self.test_regular_customer_access_denied,
            self.test_unauthorized_access
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"EUROPCAR API TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed == total

if __name__ == "__main__":
    # Run Europcar API tests (as requested in review)
    europcar_tester = EuropcarAPITester()
    europcar_success = europcar_tester.run_all_tests()
    
    print("\n" + "=" * 60)
    print("OVERALL TEST SUMMARY")
    print("=" * 60)
    
    status = "✅ PASS" if europcar_success else "❌ FAIL"
    print(f"{status} Europcar CSV Data Integration API")
    
    print("=" * 60)
    print(f"FINAL RESULT: {'1/1' if europcar_success else '0/1'} test suites passed")
    
    if europcar_success:
        print("🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED!")
        sys.exit(1)