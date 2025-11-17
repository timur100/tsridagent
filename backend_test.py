#!/usr/bin/env python3
"""
Backend API Testing for Order Service Comprehensive Testing
Tests the newly created Order Service (Port 8106) to ensure all endpoints are working correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://auth-identity-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
ORDER_SERVICE_URL = "http://localhost:8106"

class OrderServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.order_service_session = requests.Session()
        self.order_service_session.headers.update({
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
    
    def test_order_service_health(self):
        """Test Order Service health endpoint"""
        try:
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Order Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Order Service":
                self.log_result(
                    "Order Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Order Service Health Check", 
                True, 
                "Order Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Order Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_location_service_info(self):
        """Test Location Service info endpoint"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/info")
            
            if response.status_code != 200:
                self.log_result(
                    "Location Service Info", 
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
                    "Location Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service_name") != "Location Service":
                self.log_result(
                    "Location Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service_name')}",
                    data
                )
                return False
            
            self.log_result(
                "Location Service Info", 
                True, 
                f"Service info correct: {data.get('service_name')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Location Service Info", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_location_statistics(self):
        """Test Location Service statistics endpoint"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Location Statistics", 
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
                    "Location Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify by_status structure
            status_fields = ["active", "inactive", "temporarily_closed"]
            by_status = data.get("by_status", {})
            missing_status = [field for field in status_fields if field not in by_status]
            
            if missing_status:
                self.log_result(
                    "Location Statistics", 
                    False, 
                    f"Missing status fields: {missing_status}",
                    data
                )
                return False
            
            total = data.get("total", 0)
            active = by_status.get("active", 0)
            by_type = data.get("by_type", {})
            stations = by_type.get("station", 0)
            warehouses = by_type.get("warehouse", 0)
            
            # Expected: 4 total locations, 4 active, 3 stations, 1 warehouse
            expected_total = 4
            expected_active = 4
            expected_stations = 3
            expected_warehouses = 1
            
            if total != expected_total:
                self.log_result(
                    "Location Statistics", 
                    False, 
                    f"Expected {expected_total} total locations, got {total}",
                    data
                )
                return False
            
            if active != expected_active:
                self.log_result(
                    "Location Statistics", 
                    False, 
                    f"Expected {expected_active} active locations, got {active}",
                    data
                )
                return False
            
            if stations != expected_stations:
                self.log_result(
                    "Location Statistics", 
                    False, 
                    f"Expected {expected_stations} stations, got {stations}",
                    data
                )
                return False
            
            if warehouses != expected_warehouses:
                self.log_result(
                    "Location Statistics", 
                    False, 
                    f"Expected {expected_warehouses} warehouses, got {warehouses}",
                    data
                )
                return False
            
            self.log_result(
                "Location Statistics", 
                True, 
                f"Statistics correct: {total} total locations, {active} active, {stations} stations, {warehouses} warehouses"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Location Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_locations(self):
        """Test GET /api/locations endpoint"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Locations", 
                    False, 
                    f"Get locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get All Locations", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Expected: 4 locations exist
            expected_count = 4
            if len(data) != expected_count:
                self.log_result(
                    "Get All Locations", 
                    False, 
                    f"Expected {expected_count} locations, got {len(data)}",
                    data
                )
                return False
            
            # Check location structure if locations exist
            if len(data) > 0:
                location = data[0]
                required_fields = ["id", "location_code", "location_name", "address", "status"]
                missing_fields = [field for field in required_fields if field not in location]
                
                if missing_fields:
                    self.log_result(
                        "Get All Locations", 
                        False, 
                        f"Location missing required fields: {missing_fields}",
                        location
                    )
                    return False
            
            self.log_result(
                "Get All Locations", 
                True, 
                f"Retrieved {len(data)} locations successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get All Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_location_by_code(self):
        """Test GET /api/locations/code/BERN01"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations/code/BERN01")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Location by Code", 
                    False, 
                    f"Get location by code failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an object (not array)
            if isinstance(data, list):
                self.log_result(
                    "Get Location by Code", 
                    False, 
                    f"Response should be an object, not an array",
                    data
                )
                return False
            
            # Verify location_code matches
            if data.get("location_code") != "BERN01":
                self.log_result(
                    "Get Location by Code", 
                    False, 
                    f"Expected location_code BERN01, got {data.get('location_code')}",
                    data
                )
                return False
            
            # Check required fields
            required_fields = ["id", "location_code", "location_name", "address", "status"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Get Location by Code", 
                    False, 
                    f"Location missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Get Location by Code", 
                True, 
                f"Retrieved location BERN01: {data.get('location_name')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Location by Code", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_search_locations(self):
        """Test GET /api/locations/search?query=Berlin"""
        try:
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations/search?query=Berlin")
            
            if response.status_code != 200:
                self.log_result(
                    "Search Locations", 
                    False, 
                    f"Search locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Search Locations", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Expected: Find BERN01 (Berlin Hauptbahnhof)
            found_bern01 = False
            for location in data:
                if location.get("location_code") == "BERN01":
                    found_bern01 = True
                    # Verify it contains "Berlin" in name or address
                    name = location.get("location_name", "").lower()
                    address_obj = location.get("address", {})
                    address_text = ""
                    if isinstance(address_obj, dict):
                        # Combine all address fields
                        address_text = " ".join([
                            str(address_obj.get("street", "")),
                            str(address_obj.get("city", "")),
                            str(address_obj.get("postal_code", "")),
                            str(address_obj.get("country", ""))
                        ]).lower()
                    else:
                        address_text = str(address_obj).lower()
                    
                    if "berlin" not in name and "berlin" not in address_text:
                        self.log_result(
                            "Search Locations", 
                            False, 
                            f"BERN01 found but doesn't contain 'Berlin' in name or address",
                            location
                        )
                        return False
                    break
            
            if not found_bern01:
                self.log_result(
                    "Search Locations", 
                    False, 
                    f"Expected to find BERN01 (Berlin Hauptbahnhof) in search results",
                    data
                )
                return False
            
            self.log_result(
                "Search Locations", 
                True, 
                f"Search found {len(data)} locations including BERN01 (Berlin Hauptbahnhof)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Search Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_by_status_and_type(self):
        """Test filtering locations by status and type"""
        try:
            # Test filter by status=active
            response = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations?status=active")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter by Status", 
                    False, 
                    f"Filter by status failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Filter by Status", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all locations have status = active
            for location in data:
                if location.get("status") != "active":
                    self.log_result(
                        "Filter by Status", 
                        False, 
                        f"Location has wrong status: {location.get('status')}",
                        location
                    )
                    return False
            
            # Test filter by location_type=station
            response2 = self.location_service_session.get(f"{LOCATION_SERVICE_URL}/api/locations?location_type=station")
            
            if response2.status_code != 200:
                self.log_result(
                    "Filter by Type", 
                    False, 
                    f"Filter by type failed. Status: {response2.status_code}",
                    response2.text
                )
                return False
            
            data2 = response2.json()
            
            # Verify response is an array
            if not isinstance(data2, list):
                self.log_result(
                    "Filter by Type", 
                    False, 
                    f"Response is not an array. Type: {type(data2)}",
                    data2
                )
                return False
            
            # Verify all locations have location_type = station
            for location in data2:
                if location.get("location_type") != "station":
                    self.log_result(
                        "Filter by Type", 
                        False, 
                        f"Location has wrong type: {location.get('location_type')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Filter by Status and Type", 
                True, 
                f"Status filter: {len(data)} active locations, Type filter: {len(data2)} stations"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Filter by Status and Type", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_service_registration(self):
        """Test that Location Service appears in /api/portal/services"""
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
            
            # Look for location service
            location_service = None
            for service in data:
                if service.get('service_type') == 'location':
                    location_service = service
                    break
            
            if not location_service:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    "Location Service not found in services list",
                    data
                )
                return False
            
            # Check position (should be 4th after auth, id_verification, device)
            service_types = [s.get('service_type') for s in data]
            location_position = service_types.index('location') if 'location' in service_types else -1
            
            if location_position != 3:  # 0-indexed: auth=0, id_verification=1, device=2, location=3
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"Location Service at position {location_position}, expected position 3",
                    service_types
                )
                return False
            
            self.log_result(
                "Service Registration Verification", 
                True, 
                f"Location Service found at correct position 3 with service_type='location'"
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
        """Test MongoDB integration shows location_db"""
        try:
            response = self.session.get(f"{API_BASE}/portal/mongodb-summary?service_type=location")
            
            if response.status_code != 200:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"MongoDB summary failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # The API returns a list of services, find the location service
            location_service_info = None
            if isinstance(data, list):
                for service in data:
                    if service.get("service_id") == "location_service_001":
                        location_service_info = service
                        break
            else:
                location_service_info = data
            
            if not location_service_info:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Location service not found in MongoDB summary",
                    data
                )
                return False
            
            mongodb_info = location_service_info.get("mongodb_info", {})
            
            # Verify database name
            if mongodb_info.get("database_name") != "location_db":
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"Wrong database name: {mongodb_info.get('database_name')}, expected 'location_db'",
                    mongodb_info
                )
                return False
            
            # Verify collections exist
            collections = mongodb_info.get("collections", [])
            if not any(col.get("name") == "locations" for col in collections):
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Locations collection not found",
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
        """Run all location service tests"""
        print("=" * 70)
        print("LOCATION SERVICE COMPREHENSIVE TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Location Service URL: {LOCATION_SERVICE_URL}")
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
        
        # Step 1: Test Location Service Health & Info
        print("🔍 STEP 1: Testing Location Service Health & Info...")
        if not self.test_location_service_health():
            print("❌ Location service health check failed.")
        
        if not self.test_location_service_info():
            print("❌ Location service info failed.")
        
        # Step 2: Test Location Statistics
        print("\n🔍 STEP 2: Testing Location Statistics...")
        stats = self.test_location_statistics()
        if not stats:
            print("❌ Location statistics failed.")
        
        # Step 3: Test Get All Locations
        print("\n🔍 STEP 3: Testing Get All Locations...")
        locations = self.test_get_all_locations()
        if locations is False:
            print("❌ Get all locations failed.")
        
        # Step 4: Test Get Location by Code
        print("\n🔍 STEP 4: Testing Get Location by Code...")
        if not self.test_get_location_by_code():
            print("❌ Get location by code failed.")
        
        # Step 5: Test Search Locations
        print("\n🔍 STEP 5: Testing Search Locations...")
        if not self.test_search_locations():
            print("❌ Search locations failed.")
        
        # Step 6: Test Filter by Status and Type
        print("\n🔍 STEP 6: Testing Filter by Status and Type...")
        if not self.test_filter_by_status_and_type():
            print("❌ Filter by status and type failed.")
        
        # Step 7: Test Service Registration
        print("\n🔍 STEP 7: Testing Service Registration...")
        if not self.test_service_registration():
            print("❌ Service registration verification failed.")
        
        # Step 8: Test MongoDB Summary
        print("\n🔍 STEP 8: Testing MongoDB Summary...")
        if not self.test_mongodb_summary():
            print("❌ MongoDB summary failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("LOCATION SERVICE TESTING SUMMARY")
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
    print("Starting Location Service Comprehensive Testing...")
    print()
    
    # Test Location Service
    tester = LocationServiceTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Location Service Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 LOCATION SERVICE TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ LOCATION SERVICE TESTING FOUND ISSUES!")
        sys.exit(1)