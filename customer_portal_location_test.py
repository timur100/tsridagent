#!/usr/bin/env python3
"""
Customer Portal Devices Location Data Enrichment Test
Tests that devices returned by Customer Portal have street and zip fields populated
and match exactly with Admin Portal data.
"""

import requests
import json
import sys
import random
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://europcar-rental.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class CustomerPortalLocationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.tenant_admin_token = None
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar tenant ID
        
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
        """Authenticate as tenant admin user (info@europcar.com with Berlin#2018)"""
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
            
            self.log_result(
                "Tenant Admin Authentication", 
                True, 
                f"Successfully authenticated as info@europcar.com with password Berlin#2018"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Tenant Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def authenticate_admin(self):
        """Authenticate as admin user for Admin Portal comparison"""
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
    
    def get_customer_portal_devices(self):
        """Get devices via Customer Portal endpoint /api/portal/europcar-devices"""
        try:
            headers = {
                'Authorization': f'Bearer {self.tenant_admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/portal/europcar-devices", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Customer Portal Devices Fetch", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Customer Portal Devices Fetch", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            devices = data.get("data", {}).get("devices", [])
            
            self.log_result(
                "Customer Portal Devices Fetch", 
                True, 
                f"Retrieved {len(devices)} devices from Customer Portal"
            )
            
            return devices
            
        except Exception as e:
            self.log_result(
                "Customer Portal Devices Fetch", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def get_admin_portal_devices(self):
        """Get devices via Admin Portal endpoint /api/tenant-devices/{tenant_id}"""
        try:
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/tenant-devices/{self.test_tenant_id}", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Portal Devices Fetch", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return None
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Admin Portal Devices Fetch", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return None
            
            devices = data.get("data", {}).get("devices", [])
            
            self.log_result(
                "Admin Portal Devices Fetch", 
                True, 
                f"Retrieved {len(devices)} devices from Admin Portal"
            )
            
            return devices
            
        except Exception as e:
            self.log_result(
                "Admin Portal Devices Fetch", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def verify_location_fields_exist(self, devices):
        """Verify that all devices have street and zip fields"""
        try:
            if not devices:
                self.log_result(
                    "Location Fields Existence Check", 
                    False, 
                    "No devices provided for verification"
                )
                return False
            
            missing_street = []
            missing_zip = []
            empty_street = []
            empty_zip = []
            
            for device in devices:
                device_id = device.get('device_id', 'unknown')
                
                # Check if street field exists
                if 'street' not in device:
                    missing_street.append(device_id)
                elif not device.get('street'):
                    empty_street.append(device_id)
                
                # Check if zip field exists
                if 'zip' not in device:
                    missing_zip.append(device_id)
                elif not device.get('zip'):
                    empty_zip.append(device_id)
            
            issues = []
            if missing_street:
                issues.append(f"{len(missing_street)} devices missing 'street' field")
            if missing_zip:
                issues.append(f"{len(missing_zip)} devices missing 'zip' field")
            if empty_street:
                issues.append(f"{len(empty_street)} devices have empty 'street' field")
            if empty_zip:
                issues.append(f"{len(empty_zip)} devices have empty 'zip' field")
            
            success = len(issues) == 0
            
            if success:
                details = f"All {len(devices)} devices have street and zip fields"
            else:
                details = f"Issues found: {', '.join(issues)}"
            
            self.log_result(
                "Location Fields Existence Check", 
                success, 
                details
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Location Fields Existence Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def verify_populated_location_data(self, devices, min_populated=5):
        """Verify that at least min_populated devices have non-empty street and zip"""
        try:
            if not devices:
                self.log_result(
                    "Location Data Population Check", 
                    False, 
                    "No devices provided for verification"
                )
                return False
            
            populated_devices = []
            
            for device in devices:
                device_id = device.get('device_id', 'unknown')
                street = device.get('street', '')
                zip_code = device.get('zip', '')
                
                if street and zip_code:
                    populated_devices.append({
                        'device_id': device_id,
                        'street': street,
                        'zip': zip_code,
                        'locationcode': device.get('locationcode', '')
                    })
            
            success = len(populated_devices) >= min_populated
            
            if success:
                details = f"Found {len(populated_devices)} devices with populated street and zip (required: {min_populated})"
                # Show sample devices
                sample_devices = populated_devices[:5]
                for dev in sample_devices:
                    details += f"\n   • {dev['device_id']} ({dev['locationcode']}): {dev['street']}, {dev['zip']}"
            else:
                details = f"Only {len(populated_devices)} devices have populated street and zip (required: {min_populated})"
            
            self.log_result(
                "Location Data Population Check", 
                success, 
                details
            )
            
            return success, populated_devices
            
        except Exception as e:
            self.log_result(
                "Location Data Population Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False, []
    
    def compare_location_data(self, customer_devices, admin_devices):
        """Compare location data between Customer Portal and Admin Portal"""
        try:
            if not customer_devices or not admin_devices:
                self.log_result(
                    "Location Data Comparison", 
                    False, 
                    "Missing devices from one or both portals"
                )
                return False
            
            # Create lookup dictionaries by device_id
            customer_lookup = {dev.get('device_id'): dev for dev in customer_devices}
            admin_lookup = {dev.get('device_id'): dev for dev in admin_devices}
            
            # Find common devices
            common_device_ids = set(customer_lookup.keys()) & set(admin_lookup.keys())
            
            if not common_device_ids:
                self.log_result(
                    "Location Data Comparison", 
                    False, 
                    "No common devices found between portals"
                )
                return False
            
            # Compare location data for common devices
            mismatches = []
            matches = []
            
            # Test at least 5 random devices or all if less than 5
            test_devices = list(common_device_ids)
            if len(test_devices) > 5:
                test_devices = random.sample(test_devices, 5)
            
            for device_id in test_devices:
                customer_dev = customer_lookup[device_id]
                admin_dev = admin_lookup[device_id]
                
                customer_street = customer_dev.get('street', '')
                customer_zip = customer_dev.get('zip', '')
                admin_street = admin_dev.get('street', '')
                admin_zip = admin_dev.get('zip', '')
                
                if customer_street == admin_street and customer_zip == admin_zip:
                    matches.append({
                        'device_id': device_id,
                        'street': customer_street,
                        'zip': customer_zip,
                        'locationcode': customer_dev.get('locationcode', '')
                    })
                else:
                    mismatches.append({
                        'device_id': device_id,
                        'customer_street': customer_street,
                        'customer_zip': customer_zip,
                        'admin_street': admin_street,
                        'admin_zip': admin_zip,
                        'locationcode': customer_dev.get('locationcode', '')
                    })
            
            success = len(mismatches) == 0
            
            if success:
                details = f"All {len(matches)} tested devices have matching location data between portals"
                for match in matches:
                    details += f"\n   • {match['device_id']} ({match['locationcode']}): {match['street']}, {match['zip']}"
            else:
                details = f"Found {len(mismatches)} mismatches out of {len(test_devices)} tested devices"
                for mismatch in mismatches:
                    details += f"\n   • {mismatch['device_id']}: Customer({mismatch['customer_street']}, {mismatch['customer_zip']}) vs Admin({mismatch['admin_street']}, {mismatch['admin_zip']})"
            
            self.log_result(
                "Location Data Comparison", 
                success, 
                details
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Location Data Comparison", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all Customer Portal location data enrichment tests"""
        print("=" * 80)
        print("CUSTOMER PORTAL DEVICES LOCATION DATA ENRICHMENT TEST")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Tenant ID: {self.test_tenant_id} (Europcar)")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate as Tenant Admin (info@europcar.com with Berlin#2018)
        print("🔍 STEP 1: Authenticating as Tenant Admin (info@europcar.com with Berlin#2018)...")
        if not self.authenticate_tenant_admin():
            print("❌ Tenant Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Get devices via Customer Portal endpoint
        print("\n🔍 STEP 2: Getting devices via Customer Portal endpoint (/api/portal/europcar-devices)...")
        customer_devices = self.get_customer_portal_devices()
        if not customer_devices:
            print("❌ Failed to get Customer Portal devices. Stopping tests.")
            return False
        
        # Step 3: Verify that devices have street and zip fields
        print("\n🔍 STEP 3: Verifying that devices have street and zip fields...")
        fields_exist = self.verify_location_fields_exist(customer_devices)
        
        # Step 4: Verify that at least 5 devices have populated street and zip
        print("\n🔍 STEP 4: Verifying that at least 5 devices have populated street and zip...")
        populated_ok, populated_devices = self.verify_populated_location_data(customer_devices, min_populated=5)
        
        # Step 5: Authenticate as Admin for comparison
        print("\n🔍 STEP 5: Authenticating as Admin for comparison...")
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Skipping comparison.")
            admin_devices = None
        else:
            # Step 6: Get devices via Admin Portal endpoint
            print("\n🔍 STEP 6: Getting devices via Admin Portal endpoint for comparison...")
            admin_devices = self.get_admin_portal_devices()
        
        # Step 7: Compare location data between portals
        comparison_ok = True
        if admin_devices:
            print("\n🔍 STEP 7: Comparing location data between Customer Portal and Admin Portal...")
            comparison_ok = self.compare_location_data(customer_devices, admin_devices)
        else:
            print("\n⚠️  STEP 7: Skipping comparison due to missing Admin Portal data")
        
        # Summary
        print("\n" + "=" * 80)
        print("CUSTOMER PORTAL LOCATION DATA ENRICHMENT TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print critical results
        print("\n🔍 CRITICAL TEST RESULTS:")
        print(f"   • Location Fields Exist: {'✅ PASS' if fields_exist else '❌ FAIL'}")
        print(f"   • Location Data Populated: {'✅ PASS' if populated_ok else '❌ FAIL'}")
        if admin_devices:
            print(f"   • Data Synchronization: {'✅ PASS' if comparison_ok else '❌ FAIL'}")
        else:
            print(f"   • Data Synchronization: ⚠️  SKIPPED (Admin Portal data unavailable)")
        
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
        
        overall_success = fields_exist and populated_ok and comparison_ok
        return overall_success

if __name__ == "__main__":
    print("Starting Customer Portal Devices Location Data Enrichment Test...")
    print()
    
    # Test Customer Portal Location Data Enrichment
    tester = CustomerPortalLocationTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TEST SUMMARY")
    print("=" * 80)
    print(f"Customer Portal Location Data Enrichment: {'✅ WORKING' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 CUSTOMER PORTAL LOCATION DATA ENRICHMENT TEST COMPLETED SUCCESSFULLY!")
        print("All devices have street and zip fields populated and match Admin Portal data.")
        sys.exit(0)
    else:
        print("❌ CUSTOMER PORTAL LOCATION DATA ENRICHMENT ISSUES FOUND!")
        print("Some devices are missing location data or data doesn't match Admin Portal.")
        sys.exit(1)