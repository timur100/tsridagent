#!/usr/bin/env python3
"""
Backend API Testing for Data Synchronization Between Admin Portal and Customer Portal
Tests data synchronization between Admin Portal and Customer Portal for Europcar tenant.
Verifies that both portals show EXACTLY the same data for tenant_id: 1d3653db-86cb-4dd1-9ef5-0236b116def8
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os

# Backend URL from environment
BACKEND_URL = "https://tenant-portal-30.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class DataSynchronizationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.superadmin_token = None
        self.tenant_admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Specific Europcar tenant ID for testing
        self.mongo_client = None
        
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
    
    def authenticate_superadmin(self):
        """Authenticate as superadmin user (admin@tsrid.com)"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Superadmin Authentication", 
                    False, 
                    f"Authentication failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Superadmin Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data
                )
                return False
            
            self.superadmin_token = data["access_token"]
            
            # Check if token contains tenant_ids
            tenant_ids = data.get("tenant_ids", [])
            
            self.log_result(
                "Superadmin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com (Superadmin) with tenant_ids: {tenant_ids}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Superadmin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

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
    
    def get_admin_portal_devices(self):
        """Get devices via Admin Portal endpoint using superadmin token"""
        try:
            # Set superadmin token in headers
            headers = {
                'Authorization': f'Bearer {self.superadmin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/tenant-devices/{self.test_tenant_id}", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Portal Devices", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Admin Portal Devices", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return None
            
            if not data.get("success"):
                self.log_result(
                    "Admin Portal Devices", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            devices = data.get("devices", [])
            
            # Count online/offline devices
            online_count = sum(1 for d in devices if d.get("status") == "online")
            offline_count = sum(1 for d in devices if d.get("status") == "offline")
            total_count = len(devices)
            
            self.log_result(
                "Admin Portal Devices", 
                True, 
                f"Retrieved {total_count} devices (online: {online_count}, offline: {offline_count})"
            )
            
            return {
                "total": total_count,
                "online": online_count,
                "offline": offline_count,
                "devices": devices
            }
            
        except Exception as e:
            self.log_result(
                "Admin Portal Devices", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def get_customer_portal_devices(self):
        """Get devices via Customer Portal endpoint using tenant admin token"""
        try:
            # Set tenant admin token in headers
            headers = {
                'Authorization': f'Bearer {self.tenant_admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/portal/europcar-devices", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Customer Portal Devices", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Customer Portal Devices", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return None
            
            if not data.get("success"):
                self.log_result(
                    "Customer Portal Devices", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            # Check if we have data structure
            response_data = data.get("data", {})
            devices = response_data.get("devices", [])
            summary = response_data.get("summary", {})
            
            # Extract counts from summary or calculate from devices
            total_count = summary.get("total", len(devices))
            online_count = summary.get("online", sum(1 for d in devices if d.get("status") == "online"))
            offline_count = summary.get("offline", sum(1 for d in devices if d.get("status") == "offline"))
            
            self.log_result(
                "Customer Portal Devices", 
                True, 
                f"Retrieved {total_count} devices (online: {online_count}, offline: {offline_count})"
            )
            
            return {
                "total": total_count,
                "online": online_count,
                "offline": offline_count,
                "devices": devices
            }
            
        except Exception as e:
            self.log_result(
                "Customer Portal Devices", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def get_customer_portal_locations(self):
        """Get locations via Customer Portal endpoint using tenant admin token"""
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
                    "Customer Portal Locations", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "Customer Portal Locations", 
                    False, 
                    "Response is not a dictionary",
                    data
                )
                return None
            
            if not data.get("success"):
                self.log_result(
                    "Customer Portal Locations", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            stations = data.get("stations", [])
            total_count = len(stations)
            
            self.log_result(
                "Customer Portal Locations", 
                True, 
                f"Retrieved {total_count} locations/stations"
            )
            
            return {
                "total": total_count,
                "locations": stations
            }
            
        except Exception as e:
            self.log_result(
                "Customer Portal Locations", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None

    def connect_to_database(self):
        """Connect to MongoDB for direct database verification"""
        try:
            # Connect to MongoDB using the same URL as backend
            mongo_url = "mongodb://localhost:27017"
            self.mongo_client = pymongo.MongoClient(mongo_url)
            
            # Test connection
            self.mongo_client.admin.command('ping')
            
            self.log_result(
                "Database Connection", 
                True, 
                "Successfully connected to MongoDB"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Database Connection", 
                False, 
                f"Failed to connect to MongoDB: {str(e)}"
            )
            return False

    def verify_database_devices(self):
        """Query database directly to verify device data"""
        try:
            if not self.mongo_client:
                self.log_result(
                    "Database Device Verification", 
                    False, 
                    "No database connection available"
                )
                return None
            
            # Query multi_tenant_admin.europcar_devices
            db = self.mongo_client["multi_tenant_admin"]
            collection = db["europcar_devices"]
            
            # Count devices with the specific tenant_id
            device_count = collection.count_documents({"tenant_id": self.test_tenant_id})
            
            # Get sample devices to verify structure
            sample_devices = list(collection.find({"tenant_id": self.test_tenant_id}).limit(5))
            
            self.log_result(
                "Database Device Verification", 
                True, 
                f"Found {device_count} devices in multi_tenant_admin.europcar_devices with tenant_id {self.test_tenant_id}"
            )
            
            return {
                "total": device_count,
                "sample_devices": sample_devices
            }
            
        except Exception as e:
            self.log_result(
                "Database Device Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None

    def verify_database_locations(self):
        """Query database directly to verify location data"""
        try:
            if not self.mongo_client:
                self.log_result(
                    "Database Location Verification", 
                    False, 
                    "No database connection available"
                )
                return None
            
            # Query portal_db.tenant_locations
            db = self.mongo_client["portal_db"]
            collection = db["tenant_locations"]
            
            # Count locations with the specific tenant_id
            location_count = collection.count_documents({"tenant_id": self.test_tenant_id})
            
            # Get sample locations to verify structure
            sample_locations = list(collection.find({"tenant_id": self.test_tenant_id}).limit(5))
            
            self.log_result(
                "Database Location Verification", 
                True, 
                f"Found {location_count} locations in portal_db.tenant_locations with tenant_id {self.test_tenant_id}"
            )
            
            return {
                "total": location_count,
                "sample_locations": sample_locations
            }
            
        except Exception as e:
            self.log_result(
                "Database Location Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def compare_device_counts(self, admin_data, customer_data):
        """Compare device counts between Admin Portal and Customer Portal"""
        try:
            if not admin_data or not customer_data:
                self.log_result(
                    "Device Count Comparison", 
                    False, 
                    "Missing data from one or both portals"
                )
                return False
            
            admin_total = admin_data.get("total", 0)
            admin_online = admin_data.get("online", 0)
            admin_offline = admin_data.get("offline", 0)
            
            customer_total = customer_data.get("total", 0)
            customer_online = customer_data.get("online", 0)
            customer_offline = customer_data.get("offline", 0)
            
            # Check if counts match exactly
            total_match = admin_total == customer_total
            online_match = admin_online == customer_online
            offline_match = admin_offline == customer_offline
            
            all_match = total_match and online_match and offline_match
            
            details = f"Admin Portal: {admin_total} total ({admin_online} online, {admin_offline} offline) | Customer Portal: {customer_total} total ({customer_online} online, {customer_offline} offline)"
            
            if not all_match:
                mismatches = []
                if not total_match:
                    mismatches.append(f"Total: Admin={admin_total}, Customer={customer_total}")
                if not online_match:
                    mismatches.append(f"Online: Admin={admin_online}, Customer={customer_online}")
                if not offline_match:
                    mismatches.append(f"Offline: Admin={admin_offline}, Customer={customer_offline}")
                
                details += f" | MISMATCHES: {', '.join(mismatches)}"
            
            self.log_result(
                "Device Count Comparison", 
                all_match, 
                details
            )
            
            return all_match
            
        except Exception as e:
            self.log_result(
                "Device Count Comparison", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def compare_location_counts(self, customer_data, db_data):
        """Compare location counts between Customer Portal and Database"""
        try:
            if not customer_data or not db_data:
                self.log_result(
                    "Location Count Comparison", 
                    False, 
                    "Missing data from Customer Portal or Database"
                )
                return False
            
            customer_total = customer_data.get("total", 0)
            db_total = db_data.get("total", 0)
            
            # Check if counts match exactly
            counts_match = customer_total == db_total
            
            details = f"Customer Portal: {customer_total} locations | Database: {db_total} locations"
            
            if not counts_match:
                details += f" | MISMATCH: Customer Portal has {customer_total}, Database has {db_total}"
            
            self.log_result(
                "Location Count Comparison", 
                counts_match, 
                details
            )
            
            return counts_match
            
        except Exception as e:
            self.log_result(
                "Location Count Comparison", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all customer portal data endpoint tests"""
        print("=" * 70)
        print("CUSTOMER PORTAL DATA ENDPOINTS TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Tenant ID: {self.test_tenant_id}")
        print("=" * 70)
        print()
        
        # Step 1: Authenticate as admin first
        print("🔍 STEP 1: Authenticating as Tenant Admin...")
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Verify token contains tenant information
        print("\n🔍 STEP 2: Verifying Tenant Admin Token...")
        self.test_tenant_admin_token_verification()
        
        # Step 3: Test europcar-devices endpoint
        print("\n🔍 STEP 3: Testing GET /api/portal/europcar-devices...")
        devices = self.test_europcar_devices_endpoint()
        
        # Step 4: Test europcar-stations endpoint
        print("\n🔍 STEP 4: Testing GET /api/portal/customer-data/europcar-stations...")
        stations = self.test_europcar_stations_endpoint()
        
        # Step 5: Verify database context
        print("\n🔍 STEP 5: Verifying Database Context...")
        self.test_database_context_verification()
        
        # Summary
        print("\n" + "=" * 70)
        print("CUSTOMER PORTAL DATA ENDPOINTS TESTING SUMMARY")
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
    print("Starting Customer Portal Data Endpoints Backend Testing...")
    print()
    
    # Test Customer Portal Data Endpoints
    tester = CustomerPortalTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Customer Portal Data Endpoints Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 CUSTOMER PORTAL DATA ENDPOINTS TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ CUSTOMER PORTAL DATA ENDPOINTS TESTING FOUND ISSUES!")
        sys.exit(1)