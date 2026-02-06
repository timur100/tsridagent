#!/usr/bin/env python3
"""
Fastfood Station Management Backend API Testing Suite
Tests Fastfood Stationen-Verwaltung (Station Management) Backend APIs

Station Endpoints:
- POST /api/fastfood/stations?tenant_id=test-tenant&location_id=test-location - Create a new station
- GET /api/fastfood/stations?tenant_id=default-tenant&location_id=default-location - Get all stations
- PUT /api/fastfood/stations/{station_id} - Update a station
- DELETE /api/fastfood/stations/{station_id} - Delete a station

Test Data:
- Test Tenant: test-tenant
- Test Location: test-location
- Default Tenant: default-tenant (should have 3 existing stations)
- Default Location: default-location
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os
import jwt
from datetime import datetime, timezone
import time
import uuid

# Backend URL from environment
BACKEND_URL = "https://tablet-agent-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
fastfood_db = mongo_client['fastfood_db']

class FastfoodStationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.created_station_id = None
        
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
        """Authenticate as admin user (admin@tsrid.com)"""
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
            
            # Decode token to verify claims
            try:
                decoded = jwt.decode(self.admin_token, options={"verify_signature": False})
                tenant_ids = decoded.get("tenant_ids", [])
                role = decoded.get("role", "")
                customer_id = decoded.get("customer_id", "")
                
                self.log_result(
                    "Admin Authentication", 
                    True, 
                    f"Successfully authenticated as admin@tsrid.com with role='{role}', customer_id='{customer_id}', tenant_ids={tenant_ids}"
                )
                return True
            except Exception as decode_error:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    f"Failed to decode JWT token: {str(decode_error)}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_create_station_api(self):
        """Test POST /api/fastfood/stations - Create a new station"""
        try:
            # Create station data as specified in review request
            station_data = {
                "name": "Test Grill Station",
                "name_en": "Test Grill",
                "description": "Test description",
                "icon": "🔥",
                "color": "#ef4444",
                "display_order": 99,
                "active": True,
                "category_ids": []
            }
            
            # Use query parameters for tenant_id and location_id
            params = {
                "tenant_id": "test-tenant",
                "location_id": "test-location"
            }
            
            response = self.session.post(f"{API_BASE}/fastfood/stations", json=station_data, params=params)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Station API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Create Station API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Create Station API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            station = data["data"]
            
            # Verify station structure and data
            required_fields = ["id", "tenant_id", "location_id", "name", "name_en", "description", "icon", "color", "display_order", "active", "category_ids", "created_at", "updated_at"]
            for field in required_fields:
                if field not in station:
                    self.log_result(
                        "POST Create Station API",
                        False,
                        f"Missing required field in station: {field}",
                        data
                    )
                    return False
            
            # Verify the data matches what we sent
            if station["name"] != station_data["name"]:
                self.log_result(
                    "POST Create Station API",
                    False,
                    f"Name mismatch: expected {station_data['name']}, got {station['name']}",
                    data
                )
                return False
            
            if station["color"] != station_data["color"]:
                self.log_result(
                    "POST Create Station API",
                    False,
                    f"Color mismatch: expected {station_data['color']}, got {station['color']}",
                    data
                )
                return False
            
            # Store station_id for later tests
            self.created_station_id = station["id"]
            
            self.log_result(
                "POST Create Station API",
                True,
                f"Successfully created station '{station['name']}' with ID {station['id']} for tenant {station['tenant_id']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Create Station API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_stations_api(self):
        """Test GET /api/fastfood/stations - Get all stations for default tenant"""
        try:
            # Use query parameters for tenant_id and location_id
            params = {
                "tenant_id": "default-tenant",
                "location_id": "default-location"
            }
            
            response = self.session.get(f"{API_BASE}/fastfood/stations", params=params)
            
            if response.status_code != 200:
                self.log_result(
                    "GET Stations API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Stations API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Stations API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            stations = data["data"]
            
            # Verify stations is a list
            if not isinstance(stations, list):
                self.log_result(
                    "GET Stations API",
                    False,
                    f"Stations should be a list, got {type(stations)}",
                    data
                )
                return False
            
            # Should have 3 existing stations as mentioned in review request
            expected_count = 3
            actual_count = len(stations)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Stations API",
                    False,
                    f"Expected {expected_count} stations, got {actual_count}",
                    data
                )
                return False
            
            # Verify station structure and expected stations
            expected_stations = ["Grill Station", "Pommes Station", "Getränke Station"]
            found_stations = []
            
            for station in stations:
                required_fields = ["id", "name", "name_en", "description", "icon", "color", "display_order", "active", "category_ids"]
                for field in required_fields:
                    if field not in station:
                        self.log_result(
                            "GET Stations API",
                            False,
                            f"Missing required field in station: {field}",
                            data
                        )
                        return False
                found_stations.append(station["name"])
            
            # Check if stations are sorted by display_order
            display_orders = [station["display_order"] for station in stations]
            if display_orders != sorted(display_orders):
                self.log_result(
                    "GET Stations API",
                    False,
                    f"Stations not sorted by display_order: {display_orders}",
                    data
                )
                return False
            
            self.log_result(
                "GET Stations API",
                True,
                f"Successfully retrieved {actual_count} stations: {', '.join(found_stations)}, sorted by display_order"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Stations API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_update_station_api(self):
        """Test PUT /api/fastfood/stations/{station_id} - Update a station"""
        try:
            # Use the station_id from the create test
            if not hasattr(self, 'created_station_id') or not self.created_station_id:
                self.log_result(
                    "PUT Update Station API",
                    False,
                    "No station_id available from create test. Run create test first.",
                    None
                )
                return False
            
            station_id = self.created_station_id
            
            # Update station data
            update_data = {
                "name": "Updated Grill Station",
                "color": "#ff0000",  # Red color
                "description": "Updated test description for grill station"
            }
            
            response = self.session.put(f"{API_BASE}/fastfood/stations/{station_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Station API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "PUT Update Station API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            self.log_result(
                "PUT Update Station API",
                True,
                f"Successfully updated station {station_id} with new name, color, and description"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "PUT Update Station API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_delete_station_api(self):
        """Test DELETE /api/fastfood/stations/{station_id} - Delete a station"""
        try:
            # Use the station_id from the create test
            if not hasattr(self, 'created_station_id') or not self.created_station_id:
                self.log_result(
                    "DELETE Station API",
                    False,
                    "No station_id available from create test. Run create test first.",
                    None
                )
                return False
            
            station_id = self.created_station_id
            
            response = self.session.delete(f"{API_BASE}/fastfood/stations/{station_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "DELETE Station API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "DELETE Station API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            self.log_result(
                "DELETE Station API",
                True,
                f"Successfully deleted station {station_id} (soft delete - active=false)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "DELETE Station API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_mongodb_persistence(self):
        """Verify MongoDB persistence for all operations"""
        try:
            # Check if the created station exists in MongoDB
            if hasattr(self, 'created_station_id') and self.created_station_id:
                station = fastfood_db.stations.find_one({"id": self.created_station_id})
                
                if station:
                    # Check if it's soft deleted (active=false)
                    if station.get("active") == False:
                        self.log_result(
                            "MongoDB Persistence Verification",
                            True,
                            f"Station {self.created_station_id} found in MongoDB with active=false (soft deleted)"
                        )
                    else:
                        self.log_result(
                            "MongoDB Persistence Verification",
                            True,
                            f"Station {self.created_station_id} found in MongoDB with active=true"
                        )
                else:
                    self.log_result(
                        "MongoDB Persistence Verification",
                        False,
                        f"Station {self.created_station_id} not found in MongoDB"
                    )
                    return False
            
            # Check default stations exist
            default_stations = list(fastfood_db.stations.find({
                "tenant_id": "default-tenant",
                "location_id": "default-location",
                "active": True
            }))
            
            if len(default_stations) >= 3:
                station_names = [s.get("name") for s in default_stations]
                self.log_result(
                    "MongoDB Default Stations Verification",
                    True,
                    f"Found {len(default_stations)} default stations in MongoDB: {', '.join(station_names)}"
                )
            else:
                self.log_result(
                    "MongoDB Default Stations Verification",
                    False,
                    f"Expected at least 3 default stations, found {len(default_stations)}"
                )
                return False
            
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Persistence Verification",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all Fastfood Station Management API tests"""
        print("=" * 80)
        print("FASTFOOD STATION MANAGEMENT API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing APIs: Fastfood Stationen-Verwaltung (Station Management) Backend APIs")
        print(f"Database: fastfood_db.stations collection")
        print("Test Data: test-tenant/test-location (new station), default-tenant/default-location (existing stations)")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Admin Authentication")
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with tests.")
                return
            print()
            
            # Step 2: Test Station Creation
            print("➕ STEP 2: Station Creation API")
            self.test_create_station_api()
            print()
            
            # Step 3: Test Station Retrieval
            print("📋 STEP 3: Station Retrieval API")
            self.test_get_stations_api()
            print()
            
            # Step 4: Test Station Updates
            print("✏️ STEP 4: Station Update API")
            self.test_update_station_api()
            print()
            
            # Step 5: Test Station Deletion
            print("🗑️ STEP 5: Station Deletion API")
            self.test_delete_station_api()
            print()
            
            # Step 6: Verify MongoDB Persistence
            print("💾 STEP 6: MongoDB Persistence Verification")
            self.verify_mongodb_persistence()
            print()
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
        
        # Print summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "No tests run")
        print()
        
        if total - passed > 0:
            print("FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("=" * 80)


def main():
    """Main function to run the tests"""
    tester = FastfoodStationTester()
    
    # Run tests
    tester.run_all_tests()


if __name__ == "__main__":
    main()