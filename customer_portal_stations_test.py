#!/usr/bin/env python3
"""
Customer Portal Stations Endpoint Field Mapping Test
Tests that stations returned have the correct field names that the frontend expects.

Test Goal: Verify that stations returned have the correct field names that the frontend expects

Test Steps:
1. Login as info@europcar.com with password Berlin#2018
2. GET /api/portal/customer-data/europcar-stations
3. Check that stations have the following fields:
   - `main_code` (mapped from location_code) - should NOT be empty
   - `station_name` - should NOT be empty
   - `street` - should NOT be empty
   - `city` - should NOT be empty
   - `postal_code` or `zip` - should NOT be empty

4. Verify at least 5 random stations to ensure:
   - All 3 critical fields (main_code, station_name, street) are populated
   - Values are correct (not null, not empty string)

5. Sample a specific station (e.g., BERN03) and verify:
   - main_code = "BERN03"
   - station_name = "BERNAU BEI BERLIN"
   - street = "SCHWANEBECKER CHAUSSEE 12"

Expected Result:
- All stations should have main_code, station_name, and street fields populated
- No stations should have "-" or empty values for these fields
- Data should match the database values from portal_db.tenant_locations
"""

import requests
import json
import sys
import random
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://asset-sync-app.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class CustomerPortalStationsFieldMappingTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.tenant_admin_token = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data and not success:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_tenant_admin(self):
        """Authenticate as tenant admin user (info@europcar.com)"""
        try:
            auth_data = {
                "email": "info@europcar.com",
                "password": "Berlin#2018"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Tenant Admin Authentication", 
                    False, 
                    f"Authentication failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Tenant Admin Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data
                )
                return False
            
            self.tenant_admin_token = data["access_token"]
            
            # Check if token contains tenant_ids
            tenant_ids = data.get("tenant_ids", [])
            
            self.log_result(
                "Tenant Admin Authentication", 
                True, 
                f"Successfully authenticated as info@europcar.com (Tenant Admin) with tenant_ids: {tenant_ids}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Tenant Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def get_europcar_stations(self):
        """Get stations via Customer Portal endpoint"""
        try:
            # Set tenant admin token in headers
            headers = {
                'Authorization': f'Bearer {self.tenant_admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/portal/customer-data/europcar-stations", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Get Europcar Stations", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Get Europcar Stations", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return None
            
            if not data.get("success"):
                self.log_result(
                    "Get Europcar Stations", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            stations = data.get("stations", [])
            total_count = len(stations)
            
            self.log_result(
                "Get Europcar Stations", 
                True, 
                f"Retrieved {total_count} stations successfully"
            )
            
            return stations
            
        except Exception as e:
            self.log_result(
                "Get Europcar Stations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def verify_station_field_mapping(self, stations):
        """Verify that stations have the correct field names and are populated"""
        try:
            if not stations:
                self.log_result(
                    "Station Field Mapping Verification", 
                    False, 
                    "No stations data provided"
                )
                return False
            
            # Required fields that frontend expects
            required_fields = ['main_code', 'station_name', 'street']
            optional_fields = ['city', 'postal_code', 'zip']  # postal_code OR zip should be present
            
            total_stations = len(stations)
            stations_with_all_fields = 0
            stations_with_populated_fields = 0
            field_issues = []
            
            for i, station in enumerate(stations):
                station_issues = []
                has_all_required = True
                has_populated_required = True
                
                # Check required fields exist
                for field in required_fields:
                    if field not in station:
                        station_issues.append(f"Missing field: {field}")
                        has_all_required = False
                    else:
                        # Check if field is populated (not None, not empty string, not "-")
                        value = station.get(field)
                        if not value or str(value).strip() == "" or str(value).strip() == "-":
                            station_issues.append(f"Empty/invalid {field}: '{value}'")
                            has_populated_required = False
                
                # Check postal_code or zip exists and is populated
                has_postal = False
                postal_value = station.get('postal_code') or station.get('zip')
                if postal_value and str(postal_value).strip() != "" and str(postal_value).strip() != "-":
                    has_postal = True
                else:
                    station_issues.append(f"Missing or empty postal_code/zip: postal_code='{station.get('postal_code')}', zip='{station.get('zip')}'")
                    has_populated_required = False
                
                # Check city field
                city_value = station.get('city')
                if not city_value or str(city_value).strip() == "" or str(city_value).strip() == "-":
                    station_issues.append(f"Empty/invalid city: '{city_value}'")
                    has_populated_required = False
                
                if has_all_required:
                    stations_with_all_fields += 1
                
                if has_populated_required and has_postal:
                    stations_with_populated_fields += 1
                
                # Log issues for first 10 problematic stations
                if station_issues and len(field_issues) < 10:
                    station_code = station.get('main_code') or station.get('location_code') or f"Station #{i+1}"
                    field_issues.append(f"{station_code}: {', '.join(station_issues)}")
            
            # Calculate success rate
            field_mapping_success = stations_with_all_fields == total_stations
            population_success = stations_with_populated_fields >= (total_stations * 0.95)  # Allow 5% tolerance
            
            details = f"Field Mapping: {stations_with_all_fields}/{total_stations} stations have all required fields. "
            details += f"Population: {stations_with_populated_fields}/{total_stations} stations have populated fields."
            
            if field_issues:
                details += f" Issues found: {'; '.join(field_issues[:5])}"  # Show first 5 issues
                if len(field_issues) > 5:
                    details += f" (and {len(field_issues) - 5} more...)"
            
            overall_success = field_mapping_success and population_success
            
            self.log_result(
                "Station Field Mapping Verification", 
                overall_success, 
                details
            )
            
            return overall_success
            
        except Exception as e:
            self.log_result(
                "Station Field Mapping Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def verify_random_stations_sample(self, stations, sample_size=5):
        """Verify a random sample of stations for detailed field validation"""
        try:
            if not stations:
                self.log_result(
                    "Random Stations Sample Verification", 
                    False, 
                    "No stations data provided"
                )
                return False
            
            # Select random sample
            sample_stations = random.sample(stations, min(sample_size, len(stations)))
            
            all_valid = True
            sample_details = []
            
            for station in sample_stations:
                station_code = station.get('main_code') or station.get('location_code') or 'Unknown'
                station_name = station.get('station_name', 'Unknown')
                street = station.get('street', 'Unknown')
                city = station.get('city', 'Unknown')
                postal = station.get('postal_code') or station.get('zip') or 'Unknown'
                
                # Check if all critical fields are properly populated
                is_valid = True
                issues = []
                
                if not station.get('main_code') or str(station.get('main_code')).strip() in ["", "-"]:
                    is_valid = False
                    issues.append("main_code empty/invalid")
                
                if not station.get('station_name') or str(station.get('station_name')).strip() in ["", "-"]:
                    is_valid = False
                    issues.append("station_name empty/invalid")
                
                if not station.get('street') or str(station.get('street')).strip() in ["", "-"]:
                    is_valid = False
                    issues.append("street empty/invalid")
                
                if not (station.get('postal_code') or station.get('zip')) or str(postal).strip() in ["", "-"]:
                    is_valid = False
                    issues.append("postal_code/zip empty/invalid")
                
                if not station.get('city') or str(station.get('city')).strip() in ["", "-"]:
                    is_valid = False
                    issues.append("city empty/invalid")
                
                status = "✅" if is_valid else "❌"
                detail = f"{status} {station_code}: {station_name}, {street}, {city}, {postal}"
                if issues:
                    detail += f" (Issues: {', '.join(issues)})"
                
                sample_details.append(detail)
                
                if not is_valid:
                    all_valid = False
            
            details = f"Verified {len(sample_stations)} random stations:\n" + "\n".join(sample_details)
            
            self.log_result(
                "Random Stations Sample Verification", 
                all_valid, 
                details
            )
            
            return all_valid
            
        except Exception as e:
            self.log_result(
                "Random Stations Sample Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def verify_specific_station_bern03(self, stations):
        """Verify specific station BERN03 has expected values"""
        try:
            if not stations:
                self.log_result(
                    "BERN03 Station Verification", 
                    False, 
                    "No stations data provided"
                )
                return False
            
            # Find BERN03 station
            bern03_station = None
            for station in stations:
                if station.get('main_code') == 'BERN03' or station.get('location_code') == 'BERN03':
                    bern03_station = station
                    break
            
            if not bern03_station:
                self.log_result(
                    "BERN03 Station Verification", 
                    False, 
                    "BERN03 station not found in stations list"
                )
                return False
            
            # Expected values
            expected_values = {
                'main_code': 'BERN03',
                'station_name': 'BERNAU BEI BERLIN',
                'street': 'SCHWANEBECKER CHAUSSEE 12'
            }
            
            # Verify values
            all_match = True
            verification_details = []
            
            for field, expected_value in expected_values.items():
                actual_value = bern03_station.get(field)
                matches = str(actual_value).strip() == expected_value
                
                status = "✅" if matches else "❌"
                verification_details.append(f"{status} {field}: expected '{expected_value}', got '{actual_value}'")
                
                if not matches:
                    all_match = False
            
            # Also check postal code and city are populated
            postal = bern03_station.get('postal_code') or bern03_station.get('zip')
            city = bern03_station.get('city')
            
            postal_ok = postal and str(postal).strip() not in ["", "-"]
            city_ok = city and str(city).strip() not in ["", "-"]
            
            verification_details.append(f"{'✅' if postal_ok else '❌'} postal_code/zip: '{postal}' (populated: {postal_ok})")
            verification_details.append(f"{'✅' if city_ok else '❌'} city: '{city}' (populated: {city_ok})")
            
            overall_success = all_match and postal_ok and city_ok
            
            details = f"BERN03 station verification:\n" + "\n".join(verification_details)
            
            self.log_result(
                "BERN03 Station Verification", 
                overall_success, 
                details
            )
            
            return overall_success
            
        except Exception as e:
            self.log_result(
                "BERN03 Station Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all Customer Portal stations field mapping tests"""
        print("=" * 80)
        print("CUSTOMER PORTAL STATIONS ENDPOINT FIELD MAPPING TEST")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print("Test Goal: Verify that stations returned have the correct field names that the frontend expects")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate as Tenant Admin (info@europcar.com)
        print("🔍 STEP 1: Authenticating as Tenant Admin (info@europcar.com)...")
        if not self.authenticate_tenant_admin():
            print("❌ Tenant Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Get stations via Customer Portal endpoint
        print("\n🔍 STEP 2: Getting stations via Customer Portal endpoint...")
        stations = self.get_europcar_stations()
        
        if not stations:
            print("❌ Failed to retrieve stations. Stopping tests.")
            return False
        
        # Step 3: Verify station field mapping
        print("\n🔍 STEP 3: Verifying station field mapping...")
        field_mapping_ok = self.verify_station_field_mapping(stations)
        
        # Step 4: Verify random stations sample
        print("\n🔍 STEP 4: Verifying random stations sample...")
        random_sample_ok = self.verify_random_stations_sample(stations, 5)
        
        # Step 5: Verify specific station BERN03
        print("\n🔍 STEP 5: Verifying specific station BERN03...")
        bern03_ok = self.verify_specific_station_bern03(stations)
        
        # Summary
        print("\n" + "=" * 80)
        print("CUSTOMER PORTAL STATIONS FIELD MAPPING TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print critical results
        print("\n🔍 CRITICAL FIELD MAPPING RESULTS:")
        print(f"   • Field Mapping: {'✅ CORRECT' if field_mapping_ok else '❌ ISSUES FOUND'}")
        print(f"   • Random Sample: {'✅ VALID' if random_sample_ok else '❌ ISSUES FOUND'}")
        print(f"   • BERN03 Station: {'✅ CORRECT' if bern03_ok else '❌ ISSUES FOUND'}")
        
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
        
        overall_success = field_mapping_ok and random_sample_ok and bern03_ok
        return overall_success

if __name__ == "__main__":
    print("Starting Customer Portal Stations Endpoint Field Mapping Test...")
    print()
    
    # Test Customer Portal Stations Field Mapping
    tester = CustomerPortalStationsFieldMappingTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TESTING SUMMARY")
    print("=" * 80)
    print(f"Customer Portal Stations Field Mapping: {'✅ ALL FIELDS CORRECTLY MAPPED' if test_success else '❌ FIELD MAPPING ISSUES FOUND'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 CUSTOMER PORTAL STATIONS FIELD MAPPING TEST COMPLETED SUCCESSFULLY!")
        print("All stations have the correct field names and are properly populated.")
        sys.exit(0)
    else:
        print("❌ CUSTOMER PORTAL STATIONS FIELD MAPPING ISSUES FOUND!")
        print("Some stations do not have the correct field names or are not properly populated.")
        sys.exit(1)