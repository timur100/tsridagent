#!/usr/bin/env python3
"""
Final Customer Portal Location Enrichment Test
Tests all requirements from the review request:
1. Login as info@europcar.com with password Berlin#2018
2. GET /api/portal/europcar-devices
3. Check that devices have street and zip fields populated
4. Verify at least 5 random devices have street and zip populated
5. Compare with Admin Portal endpoint to ensure values are identical
"""

import requests
import json
import sys
import random

# Backend URL from environment
BACKEND_URL = "https://identity-checks.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class FinalLocationEnrichmentTester:
    def __init__(self):
        self.results = []
        self.tenant_admin_token = None
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"
        
    def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        print(f"   {details}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
    
    def test_step_1_authentication(self):
        """Step 1: Login as info@europcar.com with password Berlin#2018"""
        try:
            auth_data = {
                "email": "info@europcar.com",
                "password": "Berlin#2018"
            }
            
            response = requests.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Step 1: Authentication as info@europcar.com",
                    False,
                    f"Authentication failed with status {response.status_code}"
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Step 1: Authentication as info@europcar.com",
                    False,
                    "No access token received"
                )
                return False
            
            self.tenant_admin_token = data["access_token"]
            
            self.log_result(
                "Step 1: Authentication as info@europcar.com",
                True,
                "Successfully authenticated with password Berlin#2018 and received tenant admin token"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Step 1: Authentication as info@europcar.com",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    def test_step_2_get_devices(self):
        """Step 2: GET /api/portal/europcar-devices"""
        try:
            headers = {
                'Authorization': f'Bearer {self.tenant_admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/portal/europcar-devices", headers=headers)
            
            if response.status_code != 200:
                self.log_result(
                    "Step 2: GET /api/portal/europcar-devices",
                    False,
                    f"Request failed with status {response.status_code}"
                )
                return None
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Step 2: GET /api/portal/europcar-devices",
                    False,
                    f"API returned success=false: {data}"
                )
                return None
            
            devices = data.get("data", {}).get("devices", [])
            
            self.log_result(
                "Step 2: GET /api/portal/europcar-devices",
                True,
                f"Successfully retrieved {len(devices)} devices from Customer Portal endpoint"
            )
            
            return devices
            
        except Exception as e:
            self.log_result(
                "Step 2: GET /api/portal/europcar-devices",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    def test_step_3_check_fields(self, devices):
        """Step 3: Check that devices have street and zip fields populated"""
        try:
            if not devices:
                self.log_result(
                    "Step 3: Check street and zip fields exist",
                    False,
                    "No devices provided"
                )
                return False
            
            devices_with_fields = 0
            devices_with_populated_fields = 0
            sample_devices = []
            
            for device in devices:
                has_street_field = 'street' in device
                has_zip_field = 'zip' in device
                
                if has_street_field and has_zip_field:
                    devices_with_fields += 1
                    
                    street = device.get('street', '')
                    zip_code = device.get('zip', '')
                    
                    if street and zip_code:
                        devices_with_populated_fields += 1
                        if len(sample_devices) < 3:
                            sample_devices.append({
                                'device_id': device.get('device_id'),
                                'locationcode': device.get('locationcode'),
                                'street': street,
                                'zip': zip_code
                            })
            
            success = devices_with_fields == len(devices)
            
            details = f"All {len(devices)} devices have street and zip fields. "
            details += f"{devices_with_populated_fields} devices have populated data ({(devices_with_populated_fields/len(devices)*100):.1f}%). "
            
            if sample_devices:
                details += "Sample populated devices: "
                for dev in sample_devices:
                    details += f"{dev['device_id']} ({dev['locationcode']}): {dev['street']}, {dev['zip']}; "
            
            self.log_result(
                "Step 3: Check street and zip fields exist",
                success,
                details
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Step 3: Check street and zip fields exist",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    def test_step_4_verify_populated(self, devices):
        """Step 4: Verify at least 5 random devices have street and zip populated"""
        try:
            if not devices:
                self.log_result(
                    "Step 4: Verify 5+ devices have populated location data",
                    False,
                    "No devices provided"
                )
                return False
            
            # Find devices with populated street and zip
            populated_devices = []
            for device in devices:
                street = device.get('street', '')
                zip_code = device.get('zip', '')
                
                if street and zip_code:
                    populated_devices.append({
                        'device_id': device.get('device_id'),
                        'locationcode': device.get('locationcode'),
                        'street': street,
                        'zip': zip_code
                    })
            
            success = len(populated_devices) >= 5
            
            if success:
                # Select 5 random devices to show
                random_devices = random.sample(populated_devices, min(5, len(populated_devices)))
                details = f"Found {len(populated_devices)} devices with populated street and zip data. Random sample of 5: "
                for i, dev in enumerate(random_devices):
                    details += f"{i+1}. {dev['device_id']} ({dev['locationcode']}): {dev['street']}, {dev['zip']}; "
            else:
                details = f"Only found {len(populated_devices)} devices with populated street and zip data (required: 5)"
            
            self.log_result(
                "Step 4: Verify 5+ devices have populated location data",
                success,
                details
            )
            
            return success, populated_devices
            
        except Exception as e:
            self.log_result(
                "Step 4: Verify 5+ devices have populated location data",
                False,
                f"Exception: {str(e)}"
            )
            return False, []
    
    def authenticate_admin(self):
        """Authenticate as admin for comparison"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = requests.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                return self.admin_token is not None
            
            return False
            
        except Exception:
            return False
    
    def get_admin_portal_device(self, device_id):
        """Get a specific device from Admin Portal for comparison"""
        try:
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/tenant-devices/{self.test_tenant_id}", headers=headers)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            if not data.get("success"):
                return None
            
            devices = data.get("data", {}).get("devices", [])
            
            # Find the specific device
            for device in devices:
                if device.get('device_id') == device_id:
                    return device
            
            return None
            
        except Exception:
            return None
    
    def test_step_5_compare_admin_portal(self, customer_devices):
        """Step 5: Compare with Admin Portal endpoint to ensure values are identical"""
        try:
            # Authenticate as admin
            if not self.authenticate_admin():
                self.log_result(
                    "Step 5: Compare with Admin Portal data",
                    False,
                    "Failed to authenticate as admin for comparison"
                )
                return False
            
            # Get populated customer devices
            populated_customer_devices = []
            for device in customer_devices:
                street = device.get('street', '')
                zip_code = device.get('zip', '')
                
                if street and zip_code:
                    populated_customer_devices.append(device)
            
            if len(populated_customer_devices) < 1:
                self.log_result(
                    "Step 5: Compare with Admin Portal data",
                    False,
                    "No populated customer devices to compare"
                )
                return False
            
            # Test a sample of devices (up to 3 for detailed comparison)
            test_devices = random.sample(populated_customer_devices, min(3, len(populated_customer_devices)))
            
            matches = []
            mismatches = []
            
            for customer_device in test_devices:
                device_id = customer_device.get('device_id')
                admin_device = self.get_admin_portal_device(device_id)
                
                if not admin_device:
                    mismatches.append(f"{device_id}: Not found in Admin Portal")
                    continue
                
                customer_street = customer_device.get('street', '')
                customer_zip = customer_device.get('zip', '')
                admin_street = admin_device.get('street', '')
                admin_zip = admin_device.get('zip', '')
                
                if customer_street == admin_street and customer_zip == admin_zip:
                    matches.append(f"{device_id}: {customer_street}, {customer_zip}")
                else:
                    mismatches.append(f"{device_id}: Customer({customer_street}, {customer_zip}) vs Admin({admin_street}, {admin_zip})")
            
            success = len(mismatches) == 0
            
            if success:
                details = f"All {len(matches)} tested devices have identical location data between Customer Portal and Admin Portal. Matches: {'; '.join(matches)}"
            else:
                details = f"Found {len(mismatches)} mismatches out of {len(test_devices)} tested devices. Issues: {'; '.join(mismatches)}"
            
            self.log_result(
                "Step 5: Compare with Admin Portal data",
                success,
                details
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Step 5: Compare with Admin Portal data",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all tests according to review request requirements"""
        print("=" * 80)
        print("FINAL CUSTOMER PORTAL LOCATION ENRICHMENT TEST")
        print("Testing all requirements from review request")
        print("=" * 80)
        print()
        
        # Step 1: Login as info@europcar.com with password Berlin#2018
        print("🔍 STEP 1: Login as info@europcar.com with password Berlin#2018")
        if not self.test_step_1_authentication():
            return False
        
        # Step 2: GET /api/portal/europcar-devices
        print("🔍 STEP 2: GET /api/portal/europcar-devices")
        devices = self.test_step_2_get_devices()
        if not devices:
            return False
        
        # Step 3: Check that devices have street and zip fields populated
        print("🔍 STEP 3: Check that devices have street and zip fields")
        fields_ok = self.test_step_3_check_fields(devices)
        
        # Step 4: Verify at least 5 random devices have street and zip populated
        print("🔍 STEP 4: Verify at least 5 devices have populated location data")
        populated_ok, populated_devices = self.test_step_4_verify_populated(devices)
        
        # Step 5: Compare with Admin Portal endpoint
        print("🔍 STEP 5: Compare with Admin Portal endpoint for data synchronization")
        comparison_ok = self.test_step_5_compare_admin_portal(devices)
        
        # Summary
        print("=" * 80)
        print("FINAL TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        print()
        
        print("📋 REVIEW REQUEST REQUIREMENTS:")
        print(f"   1. Login as info@europcar.com with Berlin#2018: {'✅ PASS' if self.results[0]['success'] else '❌ FAIL'}")
        print(f"   2. GET /api/portal/europcar-devices: {'✅ PASS' if self.results[1]['success'] else '❌ FAIL'}")
        print(f"   3. Devices have street and zip fields: {'✅ PASS' if fields_ok else '❌ FAIL'}")
        print(f"   4. At least 5 devices have populated data: {'✅ PASS' if populated_ok else '❌ FAIL'}")
        print(f"   5. Data matches Admin Portal exactly: {'✅ PASS' if comparison_ok else '❌ FAIL'}")
        
        overall_success = all(r['success'] for r in self.results)
        
        print()
        if overall_success:
            print("🎉 ALL REQUIREMENTS MET - CUSTOMER PORTAL LOCATION ENRICHMENT WORKING PERFECTLY!")
            print("✅ Devices have street and zip fields populated")
            print("✅ Location data synchronization between Admin Portal and Customer Portal is perfect")
        else:
            print("❌ SOME REQUIREMENTS NOT MET - ISSUES FOUND")
            failed_tests = [r for r in self.results if not r['success']]
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return overall_success

if __name__ == "__main__":
    tester = FinalLocationEnrichmentTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)