#!/usr/bin/env python3
"""
Backend API Testing for Tenant Locations APIs
Tests the Tenant Locations API endpoints comprehensively.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://admin-portal-167.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TenantLocationsTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_tenant_id = None
        self.test_locations = []  # Store created location IDs for cleanup
        
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
    
    def get_existing_tenant(self):
        """Get an existing tenant from the database"""
        try:
            # Get list of tenants
            response = self.session.get(f"{API_BASE}/tenants/")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Existing Tenant", 
                    False, 
                    f"Failed to get tenants. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data or len(data) == 0:
                self.log_result(
                    "Get Existing Tenant", 
                    False, 
                    "No tenants found in database"
                )
                return False
            
            # Use the first tenant
            tenant = data[0]
            self.test_tenant_id = tenant.get("tenant_id")
            
            if not self.test_tenant_id:
                self.log_result(
                    "Get Existing Tenant", 
                    False, 
                    "Tenant missing tenant_id field",
                    tenant
                )
                return False
            
            self.log_result(
                "Get Existing Tenant", 
                True, 
                f"Using tenant: {tenant.get('name', 'Unknown')} (ID: {self.test_tenant_id})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Existing Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_location_1(self):
        """Test creating Location 1: BERN03, BB, Type A"""
        try:
            location_data = {
                "location_code": "BERN03",
                "station_name": "Berlin Hauptbahnhof Süd",
                "street": "Invalidenstraße 10",
                "postal_code": "10557",
                "city": "Berlin",
                "state": "BB",
                "manager": "Max Mustermann",
                "phone": "+49 30 12345678",
                "email": "max.mustermann@europcar.com",
                "main_type": "A"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                json=location_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Location 1 (BERN03)", 
                    False, 
                    f"Location creation failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Location 1 (BERN03)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            location_id = location.get("location_id")
            
            if not location_id:
                self.log_result(
                    "Create Location 1 (BERN03)", 
                    False, 
                    "Response missing location_id",
                    data
                )
                return False
            
            # Store for cleanup
            self.test_locations.append(location_id)
            
            self.log_result(
                "Create Location 1 (BERN03)", 
                True, 
                f"Location created: {location.get('location_code')} - {location.get('station_name')} (ID: {location_id})"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Create Location 1 (BERN03)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_location_2(self):
        """Test creating Location 2: BERT01, BE, Type CAP"""
        try:
            location_data = {
                "location_code": "BERT01",
                "station_name": "Berlin Tegel Airport",
                "street": "Flughafen Tegel",
                "postal_code": "13405",
                "city": "Berlin",
                "state": "BE",
                "manager": "Anna Schmidt",
                "phone": "+49 30 87654321",
                "email": "anna.schmidt@europcar.com",
                "main_type": "CAP"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                json=location_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Location 2 (BERT01)", 
                    False, 
                    f"Location creation failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Location 2 (BERT01)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            location_id = location.get("location_id")
            
            if not location_id:
                self.log_result(
                    "Create Location 2 (BERT01)", 
                    False, 
                    "Response missing location_id",
                    data
                )
                return False
            
            # Store for cleanup
            self.test_locations.append(location_id)
            
            self.log_result(
                "Create Location 2 (BERT01)", 
                True, 
                f"Location created: {location.get('location_code')} - {location.get('station_name')} (ID: {location_id})"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Create Location 2 (BERT01)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_location_3(self):
        """Test creating Location 3: BERC01, BE, Type C"""
        try:
            location_data = {
                "location_code": "BERC01",
                "station_name": "Berlin City Center",
                "street": "Unter den Linden 1",
                "postal_code": "10117",
                "city": "Berlin",
                "state": "BE",
                "manager": "Peter Müller",
                "phone": "+49 30 11111111",
                "email": "peter.mueller@europcar.com",
                "main_type": "C"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                json=location_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Location 3 (BERC01)", 
                    False, 
                    f"Location creation failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Location 3 (BERC01)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            location_id = location.get("location_id")
            
            if not location_id:
                self.log_result(
                    "Create Location 3 (BERC01)", 
                    False, 
                    "Response missing location_id",
                    data
                )
                return False
            
            # Store for cleanup
            self.test_locations.append(location_id)
            
            self.log_result(
                "Create Location 3 (BERC01)", 
                True, 
                f"Location created: {location.get('location_code')} - {location.get('station_name')} (ID: {location_id})"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Create Location 3 (BERC01)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_list_all_locations(self):
        """Test GET /api/tenants/{tenant_id}/locations - List all locations"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "List All Locations", 
                    False, 
                    f"List locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "List All Locations", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            total = data.get("total", 0)
            
            if total != len(locations):
                self.log_result(
                    "List All Locations", 
                    False, 
                    f"Total count mismatch: total={total}, locations count={len(locations)}",
                    data
                )
                return False
            
            # Should have 3 locations
            if len(locations) < 3:
                self.log_result(
                    "List All Locations", 
                    False, 
                    f"Expected at least 3 locations, got {len(locations)}",
                    data
                )
                return False
            
            self.log_result(
                "List All Locations", 
                True, 
                f"Retrieved {len(locations)} locations successfully"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "List All Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_by_state_be(self):
        """Test state filter: ?state=BE should return 2 locations"""
        try:
            response = self.session.get(f"{API_BASE}/tenants/{self.test_tenant_id}/locations?state=BE")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    f"State filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should return 2 locations (BERT01 and BERC01)
            if len(locations) != 2:
                self.log_result(
                    "Filter by State (BE)", 
                    False, 
                    f"Expected 2 locations for state BE, got {len(locations)}",
                    data
                )
                return False
            
            # Verify all locations have state BE
            for location in locations:
                if location.get("state") != "BE":
                    self.log_result(
                        "Filter by State (BE)", 
                        False, 
                        f"Found location with wrong state: {location.get('state')}",
                        location
                    )
                    return False
            
            self.log_result(
                "Filter by State (BE)", 
                True, 
                f"State filter working: found {len(locations)} locations with state BE"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Filter by State (BE)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_by_main_type_a(self):
        """Test main_type filter: ?main_type=A should return 1 location"""
        try:
            response = self.session.get(f"{API_BASE}/tenants/{self.test_tenant_id}/locations?main_type=A")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    f"Main type filter failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            # Should return 1 location (BERN03)
            if len(locations) != 1:
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    f"Expected 1 location for main_type A, got {len(locations)}",
                    data
                )
                return False
            
            # Verify location has main_type A
            location = locations[0]
            if location.get("main_type") != "A":
                self.log_result(
                    "Filter by Main Type (A)", 
                    False, 
                    f"Found location with wrong main_type: {location.get('main_type')}",
                    location
                )
                return False
            
            self.log_result(
                "Filter by Main Type (A)", 
                True, 
                f"Main type filter working: found {len(locations)} location with main_type A"
            )
            return locations
            
        except Exception as e:
            self.log_result(
                "Filter by Main Type (A)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_single_location(self):
        """Test GET /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[0]  # Use first created location
            
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Get single location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Single Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            
            if location.get("location_id") != location_id:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Location ID mismatch: expected {location_id}, got {location.get('location_id')}",
                    data
                )
                return False
            
            # Verify required fields
            required_fields = ["location_id", "location_code", "station_name", "street", "city", "state"]
            missing_fields = [field for field in required_fields if field not in location]
            
            if missing_fields:
                self.log_result(
                    "Get Single Location", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    location
                )
                return False
            
            self.log_result(
                "Get Single Location", 
                True, 
                f"Retrieved location: {location.get('location_code')} - {location.get('station_name')}"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Get Single Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_location(self):
        """Test PUT /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Update Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[0]  # Use first created location
            
            update_data = {
                "manager": "Updated Manager Name",
                "phone": "+49 30 99999999"
            }
            
            response = self.session.put(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}", 
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Update location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Update Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            location = data.get("location", {})
            
            # Verify updates were applied
            if location.get("manager") != "Updated Manager Name":
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Manager not updated: expected 'Updated Manager Name', got '{location.get('manager')}'",
                    location
                )
                return False
            
            if location.get("phone") != "+49 30 99999999":
                self.log_result(
                    "Update Location", 
                    False, 
                    f"Phone not updated: expected '+49 30 99999999', got '{location.get('phone')}'",
                    location
                )
                return False
            
            self.log_result(
                "Update Location", 
                True, 
                f"Location updated successfully: manager={location.get('manager')}, phone={location.get('phone')}"
            )
            return location
            
        except Exception as e:
            self.log_result(
                "Update Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_stats_summary(self):
        """Test GET /api/tenants/{tenant_id}/locations/stats/summary"""
        try:
            response = self.session.get(f"{API_BASE}/tenants/{self.test_tenant_id}/locations/stats/summary")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Get stats failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            stats = data.get("stats", {})
            
            # Verify required fields
            required_fields = ["total_locations", "by_state", "by_type"]
            missing_fields = [field for field in required_fields if field not in stats]
            
            if missing_fields:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    stats
                )
                return False
            
            # Verify stats make sense
            total = stats.get("total_locations", 0)
            by_state = stats.get("by_state", {})
            by_type = stats.get("by_type", {})
            
            # Should have at least 3 locations
            if total < 3:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Expected at least 3 total locations, got {total}",
                    stats
                )
                return False
            
            # Should have BB and BE states
            if "BB" not in by_state or "BE" not in by_state:
                self.log_result(
                    "Get Stats Summary", 
                    False, 
                    f"Expected BB and BE states in by_state, got {list(by_state.keys())}",
                    stats
                )
                return False
            
            # Should have A, CAP, and C types
            expected_types = ["A", "CAP", "C"]
            for expected_type in expected_types:
                if expected_type not in by_type:
                    self.log_result(
                        "Get Stats Summary", 
                        False, 
                        f"Expected type {expected_type} in by_type, got {list(by_type.keys())}",
                        stats
                    )
                    return False
            
            self.log_result(
                "Get Stats Summary", 
                True, 
                f"Stats retrieved: {total} total, by_state={by_state}, by_type={by_type}"
            )
            return stats
            
        except Exception as e:
            self.log_result(
                "Get Stats Summary", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_delete_location(self):
        """Test DELETE /api/tenants/{tenant_id}/locations/{location_id}"""
        try:
            if not self.test_locations:
                self.log_result(
                    "Delete Location", 
                    False, 
                    "No test locations available"
                )
                return False
            
            location_id = self.test_locations[-1]  # Use last created location
            
            response = self.session.delete(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Delete Location", 
                    False, 
                    f"Delete location failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Delete Location", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify location is deleted by trying to get it
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}/{location_id}")
            
            if response.status_code != 404:
                self.log_result(
                    "Delete Location Verification", 
                    False, 
                    f"Location still exists after deletion. Status: {response.status_code}",
                    response.text
                )
                return False
            
            # Remove from our list
            self.test_locations.remove(location_id)
            
            self.log_result(
                "Delete Location", 
                True, 
                f"Location {location_id} deleted successfully and verified"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Delete Location", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_verify_remaining_locations(self):
        """Verify that we have 2 remaining locations after deletion"""
        try:
            response = self.session.get(f"{API_BASE}/tenant-locations/{self.test_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Verify Remaining Locations", 
                    False, 
                    f"List locations failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            locations = data.get("locations", [])
            
            # Should have 2 remaining locations
            if len(locations) != 2:
                self.log_result(
                    "Verify Remaining Locations", 
                    False, 
                    f"Expected 2 remaining locations, got {len(locations)}",
                    data
                )
                return False
            
            self.log_result(
                "Verify Remaining Locations", 
                True, 
                f"Verified: {len(locations)} locations remaining after deletion"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Verify Remaining Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_duplicate_location_code_error(self):
        """Test duplicate location_code error"""
        try:
            # Try to create location with existing code
            location_data = {
                "location_code": "BERN03",  # Should already exist
                "station_name": "Duplicate Station",
                "street": "Test Street",
                "postal_code": "12345",
                "city": "Test City",
                "state": "BB"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenant-locations/{self.test_tenant_id}", 
                json=location_data
            )
            
            if response.status_code != 400:
                self.log_result(
                    "Duplicate Location Code Error", 
                    False, 
                    f"Expected 400 for duplicate location code, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Duplicate Location Code Error", 
                True, 
                "Duplicate location code correctly rejected with 400 error"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Duplicate Location Code Error", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_invalid_tenant_id_error(self):
        """Test invalid tenant_id error"""
        try:
            location_data = {
                "location_code": "TEST01",
                "station_name": "Test Station",
                "street": "Test Street",
                "postal_code": "12345",
                "city": "Test City",
                "state": "BB"
            }
            
            response = self.session.post(
                f"{API_BASE}/tenants/invalid-tenant-id/locations", 
                json=location_data
            )
            
            if response.status_code != 404:
                self.log_result(
                    "Invalid Tenant ID Error", 
                    False, 
                    f"Expected 404 for invalid tenant ID, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Invalid Tenant ID Error", 
                True, 
                "Invalid tenant ID correctly rejected with 404 error"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Invalid Tenant ID Error", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all tenant locations tests"""
        print("=" * 70)
        print("TENANT LOCATIONS BACKEND TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 70)
        print()
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Get existing tenant
        if not self.get_existing_tenant():
            print("❌ Failed to get existing tenant. Stopping tests.")
            return False
        
        # Step 1: Create 3 test locations
        print("\n🔍 STEP 1: Creating Test Locations...")
        self.test_create_location_1()
        self.test_create_location_2()
        self.test_create_location_3()
        
        # Step 2: List all locations
        print("\n🔍 STEP 2: Testing List All Locations...")
        self.test_list_all_locations()
        
        # Step 3: Test filters
        print("\n🔍 STEP 3: Testing Filters...")
        self.test_filter_by_state_be()
        self.test_filter_by_main_type_a()
        
        # Step 4: Get single location
        print("\n🔍 STEP 4: Testing Get Single Location...")
        self.test_get_single_location()
        
        # Step 5: Update location
        print("\n🔍 STEP 5: Testing Update Location...")
        self.test_update_location()
        
        # Step 6: Get statistics
        print("\n🔍 STEP 6: Testing Statistics...")
        self.test_get_stats_summary()
        
        # Step 7: Delete location
        print("\n🔍 STEP 7: Testing Delete Location...")
        self.test_delete_location()
        
        # Step 8: Verify remaining locations
        print("\n🔍 STEP 8: Verifying Remaining Locations...")
        self.test_verify_remaining_locations()
        
        # Step 9: Test error scenarios
        print("\n🔍 STEP 9: Testing Error Scenarios...")
        self.test_duplicate_location_code_error()
        self.test_invalid_tenant_id_error()
        
        # Summary
        print("\n" + "=" * 70)
        print("TENANT LOCATIONS TESTING SUMMARY")
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
    print("Starting Tenant Locations Backend Testing...")
    print()
    
    # Test Tenant Locations
    tester = TenantLocationsTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Tenant Locations Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 TENANT LOCATIONS TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ TENANT LOCATIONS TESTING FOUND ISSUES!")
        sys.exit(1)