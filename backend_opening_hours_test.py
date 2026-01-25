#!/usr/bin/env python3
"""
Location Details Opening Hours Sync Testing
Tests that changes to opening hours for location AAHC01 in Admin Portal are showing correctly in Customer Portal.
Verifies cache-control headers and data consistency between Admin and Customer portals.
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os
import time

# Backend URL from environment
BACKEND_URL = "https://multitenantapp-4.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class OpeningHoursTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.customer_token = None
        self.location_id = "f915d9ab-529a-4ed8-af41-00cee4be0e97"  # AAHC01 location ID
        self.location_code = "AAHC01"
        
        # MongoDB connection for direct database verification
        try:
            self.mongo_client = pymongo.MongoClient("mongodb://localhost:27017/")
            self.portal_db = self.mongo_client['portal_db']
        except Exception as e:
            print(f"Warning: Could not connect to MongoDB: {e}")
            self.mongo_client = None
            self.portal_db = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data and isinstance(response_data, dict):
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
            
            self.log_result(
                "Admin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def authenticate_customer(self):
        """Authenticate as customer user (info@europcar.com)"""
        try:
            auth_data = {
                "email": "info@europcar.com",
                "password": "Berlin#2018"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Customer Authentication", 
                    False, 
                    f"Authentication failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Customer Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data
                )
                return False
            
            self.customer_token = data["access_token"]
            
            self.log_result(
                "Customer Authentication", 
                True, 
                f"Successfully authenticated as info@europcar.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Customer Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_opening_hours_in_database(self):
        """Verify Opening Hours in Database - Check MongoDB portal_db.tenant_locations collection for AAHC01"""
        try:
            if self.portal_db is None:
                self.log_result(
                    "Database Opening Hours Verification",
                    False,
                    "MongoDB connection not available"
                )
                return False
            
            # Find location AAHC01 in database
            location = self.portal_db.tenant_locations.find_one({
                "location_code": self.location_code
            })
            
            if not location:
                self.log_result(
                    "Database Opening Hours Verification",
                    False,
                    f"Location {self.location_code} not found in database"
                )
                return False
            
            # Check if opening_hours field exists
            opening_hours = location.get('opening_hours')
            if not opening_hours:
                self.log_result(
                    "Database Opening Hours Verification",
                    False,
                    f"Location {self.location_code} has no opening_hours field in database"
                )
                return False
            
            # Check Monday close_time should be "22:00"
            monday_hours = opening_hours.get('monday', {})
            monday_close_time = monday_hours.get('close_time')
            
            if monday_close_time != "22:00":
                self.log_result(
                    "Database Opening Hours Verification",
                    False,
                    f"Monday close_time is '{monday_close_time}', expected '22:00'",
                    opening_hours
                )
                return False
            
            self.log_result(
                "Database Opening Hours Verification",
                True,
                f"Location {self.location_code} found in database with Monday close_time='22:00' as expected",
                opening_hours
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Database Opening Hours Verification",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_admin_portal_api_get_location_details(self):
        """Test Admin Portal API - GET /api/tenant-locations/details/{location_id} with admin token"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Admin Portal API - Get Location Details",
                    False,
                    "No admin token available"
                )
                return False
            
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{API_BASE}/tenant-locations/details/{self.location_id}",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Portal API - Get Location Details",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify opening_hours is returned in response
            opening_hours = data.get('opening_hours')
            if not opening_hours:
                self.log_result(
                    "Admin Portal API - Get Location Details",
                    False,
                    "Response missing opening_hours field",
                    data
                )
                return False
            
            # Verify Monday close_time is "22:00"
            monday_hours = opening_hours.get('monday', {})
            monday_close_time = monday_hours.get('close_time')
            
            if monday_close_time != "22:00":
                self.log_result(
                    "Admin Portal API - Get Location Details",
                    False,
                    f"Monday close_time is '{monday_close_time}', expected '22:00'",
                    opening_hours
                )
                return False
            
            # Check Cache-Control headers are present
            cache_control = response.headers.get('Cache-Control', '')
            if 'no-cache' not in cache_control or 'no-store' not in cache_control or 'must-revalidate' not in cache_control:
                self.log_result(
                    "Admin Portal API - Get Location Details",
                    False,
                    f"Missing proper Cache-Control headers. Got: '{cache_control}', expected: 'no-cache, no-store, must-revalidate'"
                )
                return False
            
            self.log_result(
                "Admin Portal API - Get Location Details",
                True,
                f"Successfully retrieved location details with Monday close_time='22:00' and proper Cache-Control headers: '{cache_control}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Portal API - Get Location Details",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_customer_portal_api_get_location_details(self):
        """Test Customer Portal API - GET /api/tenant-locations/details/{location_id} with customer token"""
        try:
            if not self.customer_token:
                self.log_result(
                    "Customer Portal API - Get Location Details",
                    False,
                    "No customer token available"
                )
                return False
            
            headers = {
                'Authorization': f'Bearer {self.customer_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{API_BASE}/tenant-locations/details/{self.location_id}",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Customer Portal API - Get Location Details",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify opening_hours is returned in response
            opening_hours = data.get('opening_hours')
            if not opening_hours:
                self.log_result(
                    "Customer Portal API - Get Location Details",
                    False,
                    "Response missing opening_hours field",
                    data
                )
                return False
            
            # Verify Monday close_time is "22:00" (same as admin sees)
            monday_hours = opening_hours.get('monday', {})
            monday_close_time = monday_hours.get('close_time')
            
            if monday_close_time != "22:00":
                self.log_result(
                    "Customer Portal API - Get Location Details",
                    False,
                    f"Monday close_time is '{monday_close_time}', expected '22:00'",
                    opening_hours
                )
                return False
            
            # Check Cache-Control headers are present
            cache_control = response.headers.get('Cache-Control', '')
            if 'no-cache' not in cache_control or 'no-store' not in cache_control or 'must-revalidate' not in cache_control:
                self.log_result(
                    "Customer Portal API - Get Location Details",
                    False,
                    f"Missing proper Cache-Control headers. Got: '{cache_control}', expected: 'no-cache, no-store, must-revalidate'"
                )
                return False
            
            self.log_result(
                "Customer Portal API - Get Location Details",
                True,
                f"Successfully retrieved location details with Monday close_time='22:00' and proper Cache-Control headers: '{cache_control}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Customer Portal API - Get Location Details",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_update_opening_hours(self):
        """Update Opening Hours Test - PUT /api/tenant-locations/details/{location_id}/opening-hours"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Update Opening Hours Test",
                    False,
                    "No admin token available"
                )
                return False
            
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            }
            
            # Update Tuesday close_time from "18:00" to "20:00"
            update_data = {
                "monday": {"day": "Montag", "is_open": True, "open_time": "08:00", "close_time": "22:00"},
                "tuesday": {"day": "Dienstag", "is_open": True, "open_time": "08:00", "close_time": "20:00"},
                "wednesday": {"day": "Mittwoch", "is_open": True, "open_time": "08:00", "close_time": "18:00"},
                "thursday": {"day": "Donnerstag", "is_open": True, "open_time": "08:00", "close_time": "18:00"},
                "friday": {"day": "Freitag", "is_open": True, "open_time": "08:00", "close_time": "18:00"},
                "saturday": {"day": "Samstag", "is_open": True, "open_time": "08:00", "close_time": "18:00"},
                "sunday": {"day": "Sonntag", "is_open": True, "open_time": "08:00", "close_time": "18:00"},
                "manual_override": True
            }
            
            response = requests.put(
                f"{API_BASE}/tenant-locations/details/{self.location_id}/opening-hours",
                headers=headers,
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update Opening Hours Test",
                    False,
                    f"Update request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get('success'):
                self.log_result(
                    "Update Opening Hours Test",
                    False,
                    "Update response indicates failure",
                    data
                )
                return False
            
            # Immediately GET the location details again to verify update
            get_response = requests.get(
                f"{API_BASE}/tenant-locations/details/{self.location_id}",
                headers=headers
            )
            
            if get_response.status_code != 200:
                self.log_result(
                    "Update Opening Hours Test",
                    False,
                    f"Verification GET request failed. Status: {get_response.status_code}"
                )
                return False
            
            get_data = get_response.json()
            opening_hours = get_data.get('opening_hours', {})
            tuesday_hours = opening_hours.get('tuesday', {})
            tuesday_close_time = tuesday_hours.get('close_time')
            
            if tuesday_close_time != "20:00":
                self.log_result(
                    "Update Opening Hours Test",
                    False,
                    f"Tuesday close_time is '{tuesday_close_time}', expected '20:00' after update",
                    opening_hours
                )
                return False
            
            self.log_result(
                "Update Opening Hours Test",
                True,
                f"Successfully updated Tuesday close_time to '20:00' and verified change is immediately visible"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Update Opening Hours Test",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_data_consistency_check(self):
        """Data Consistency Check - Compare opening_hours data between MongoDB, Admin Portal API, and Customer Portal API"""
        try:
            # Get data from MongoDB
            db_opening_hours = None
            if self.portal_db is not None:
                location = self.portal_db.tenant_locations.find_one({
                    "location_id": self.location_id
                })
                if location:
                    db_opening_hours = location.get('opening_hours')
            
            # Get data from Admin Portal API
            admin_opening_hours = None
            if self.admin_token:
                headers = {'Authorization': f'Bearer {self.admin_token}'}
                response = requests.get(
                    f"{API_BASE}/tenant-locations/details/{self.location_id}",
                    headers=headers
                )
                if response.status_code == 200:
                    admin_opening_hours = response.json().get('opening_hours')
            
            # Get data from Customer Portal API
            customer_opening_hours = None
            if self.customer_token:
                headers = {'Authorization': f'Bearer {self.customer_token}'}
                response = requests.get(
                    f"{API_BASE}/tenant-locations/details/{self.location_id}",
                    headers=headers
                )
                if response.status_code == 200:
                    customer_opening_hours = response.json().get('opening_hours')
            
            # Compare all three sources
            if not db_opening_hours:
                self.log_result(
                    "Data Consistency Check",
                    False,
                    "Could not retrieve opening hours from MongoDB"
                )
                return False
            
            if not admin_opening_hours:
                self.log_result(
                    "Data Consistency Check",
                    False,
                    "Could not retrieve opening hours from Admin Portal API"
                )
                return False
            
            if not customer_opening_hours:
                self.log_result(
                    "Data Consistency Check",
                    False,
                    "Could not retrieve opening hours from Customer Portal API"
                )
                return False
            
            # Compare Monday close_time across all sources
            db_monday_close = db_opening_hours.get('monday', {}).get('close_time')
            admin_monday_close = admin_opening_hours.get('monday', {}).get('close_time')
            customer_monday_close = customer_opening_hours.get('monday', {}).get('close_time')
            
            # Compare Tuesday close_time across all sources (should be updated to 20:00)
            db_tuesday_close = db_opening_hours.get('tuesday', {}).get('close_time')
            admin_tuesday_close = admin_opening_hours.get('tuesday', {}).get('close_time')
            customer_tuesday_close = customer_opening_hours.get('tuesday', {}).get('close_time')
            
            # Check consistency
            if db_monday_close != admin_monday_close or admin_monday_close != customer_monday_close:
                self.log_result(
                    "Data Consistency Check",
                    False,
                    f"Monday close_time inconsistent: DB='{db_monday_close}', Admin='{admin_monday_close}', Customer='{customer_monday_close}'"
                )
                return False
            
            if db_tuesday_close != admin_tuesday_close or admin_tuesday_close != customer_tuesday_close:
                self.log_result(
                    "Data Consistency Check",
                    False,
                    f"Tuesday close_time inconsistent: DB='{db_tuesday_close}', Admin='{admin_tuesday_close}', Customer='{customer_tuesday_close}'"
                )
                return False
            
            self.log_result(
                "Data Consistency Check",
                True,
                f"All three sources show identical data: Monday close_time='{admin_monday_close}', Tuesday close_time='{admin_tuesday_close}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Data Consistency Check",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all opening hours sync tests"""
        print("=" * 80)
        print("LOCATION DETAILS OPENING HOURS SYNC TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Location ID: {self.location_id} ({self.location_code})")
        print("Admin Credentials: admin@tsrid.com / admin123")
        print("Customer Credentials: info@europcar.com / Berlin#2018")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Authenticating as Admin (admin@tsrid.com)...")
            admin_auth_ok = self.authenticate_admin()
            
            # Step 2: Authenticate as Customer
            print("\n🔍 STEP 2: Authenticating as Customer (info@europcar.com)...")
            customer_auth_ok = self.authenticate_customer()
            
            if not admin_auth_ok or not customer_auth_ok:
                print("❌ Authentication failed. Stopping tests.")
                return False
            
            # Step 3: Verify Opening Hours in Database
            print("\n🔍 STEP 3: Verifying Opening Hours in Database...")
            db_verification_ok = self.verify_opening_hours_in_database()
            
            # Step 4: Test Admin Portal API
            print("\n🔍 STEP 4: Testing Admin Portal API - Get Location Details...")
            admin_api_ok = self.test_admin_portal_api_get_location_details()
            
            # Step 5: Test Customer Portal API
            print("\n🔍 STEP 5: Testing Customer Portal API - Get Location Details...")
            customer_api_ok = self.test_customer_portal_api_get_location_details()
            
            # Step 6: Update Opening Hours Test
            print("\n🔍 STEP 6: Testing Update Opening Hours...")
            update_ok = self.test_update_opening_hours()
            
            # Step 7: Data Consistency Check
            print("\n🔍 STEP 7: Testing Data Consistency Check...")
            consistency_ok = self.test_data_consistency_check()
            
            # Summary
            print("\n" + "=" * 80)
            print("OPENING HOURS SYNC TESTING SUMMARY")
            print("=" * 80)
            
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print(f"Tests completed: {passed}/{total} passed")
            
            # Print critical results
            print("\n🔍 CRITICAL FUNCTIONALITY:")
            print(f"   • Database Opening Hours Verification: {'✅ WORKING' if db_verification_ok else '❌ FAILED'}")
            print(f"   • Admin Portal API with Cache Headers: {'✅ WORKING' if admin_api_ok else '❌ FAILED'}")
            print(f"   • Customer Portal API with Cache Headers: {'✅ WORKING' if customer_api_ok else '❌ FAILED'}")
            print(f"   • Opening Hours Update Functionality: {'✅ WORKING' if update_ok else '❌ FAILED'}")
            print(f"   • Data Consistency Across All Sources: {'✅ WORKING' if consistency_ok else '❌ FAILED'}")
            
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
            
        except Exception as e:
            print(f"❌ Unexpected error during testing: {str(e)}")
            return False

def main():
    print("Starting Location Details Opening Hours Sync Testing...")
    print()
    
    # Test Opening Hours Sync
    tester = OpeningHoursTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TESTING SUMMARY")
    print("=" * 80)
    print(f"Opening Hours Sync Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 LOCATION DETAILS OPENING HOURS SYNC TESTING COMPLETED SUCCESSFULLY!")
        print("Opening hours sync between Admin and Customer portals is working correctly.")
        sys.exit(0)
    else:
        print("❌ OPENING HOURS SYNC ISSUES FOUND!")
        print("Opening hours sync has issues that need to be addressed.")
        sys.exit(1)

if __name__ == "__main__":
    main()