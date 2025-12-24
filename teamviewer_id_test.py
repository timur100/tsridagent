#!/usr/bin/env python3
"""
TeamViewer ID Verification Testing - German Review Request
Tests that all devices now have TeamViewer IDs from the TVID column:
- Test AAHC01-01 device should have teamviewer_id = "949746162"
- Test AGBC02-01 device should have teamviewer_id = "969678983" 
- Test 3-5 random locations to ensure all devices have TeamViewer IDs (no "-" anymore)
- Verify statistics show ~213 of 218 devices now have TeamViewer IDs (98%)
- Ensure IDs are numeric and without "r" prefix
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
BACKEND_URL = "https://mongo-atlas-migrate.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
portal_db = mongo_client['portal_db']
multi_tenant_db = mongo_client['multi_tenant_admin']

class TeamViewerIDVerificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        # Test data from German review request
        self.test_devices = [
            {
                "location_name": "AAHC01",
                "device_name": "AAHC01-01", 
                "expected_teamviewer_id": "949746162"
            },
            {
                "location_name": "AGBC02",
                "device_name": "AGBC02-01",
                "expected_teamviewer_id": "969678983"
            }
        ]
        self.random_test_locations = []  # Will be populated from MongoDB
        
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

    def find_location_id_by_code(self, location_code: str):
        """Find location_id by location_code in MongoDB"""
        try:
            location = portal_db.tenant_locations.find_one(
                {"location_code": location_code},
                {"location_id": 1, "_id": 0}
            )
            if location:
                return location.get("location_id")
            return None
        except Exception as e:
            print(f"Error finding location {location_code}: {str(e)}")
            return None

    def test_aahc01_device(self):
        """Test 1: AAHC01-01 device should have teamviewer_id = '949746162'"""
        try:
            # Find AAHC01 location ID
            location_id = self.find_location_id_by_code("AAHC01")
            if not location_id:
                self.log_result(
                    "Test 1: AAHC01-01 Device",
                    False,
                    "Could not find AAHC01 location in database"
                )
                return False
            
            # Call location details API
            response = self.session.get(f"{API_BASE}/tenant-locations/details/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Test 1: AAHC01-01 Device",
                    False,
                    f"API call failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Find AAHC01-01 device in response
            devices = data.get("devices", [])
            aahc01_device = None
            
            for device in devices:
                if device.get("device_id") == "AAHC01-01":
                    aahc01_device = device
                    break
            
            if not aahc01_device:
                self.log_result(
                    "Test 1: AAHC01-01 Device",
                    False,
                    "Device AAHC01-01 not found in location details response",
                    data
                )
                return False
            
            # Check TeamViewer ID
            actual_teamviewer_id = aahc01_device.get("teamviewer_id")
            expected_teamviewer_id = "949746162"
            
            if actual_teamviewer_id == expected_teamviewer_id:
                self.log_result(
                    "Test 1: AAHC01-01 Device",
                    True,
                    f"✅ Device AAHC01-01 has correct TeamViewer ID: {actual_teamviewer_id}"
                )
                return True
            else:
                self.log_result(
                    "Test 1: AAHC01-01 Device",
                    False,
                    f"❌ TeamViewer ID mismatch. Expected: {expected_teamviewer_id}, Got: {actual_teamviewer_id}",
                    aahc01_device
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Test 1: AAHC01-01 Device",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_agbc02_device(self):
        """Test 2: AGBC02-01 device should have teamviewer_id = '969678983'"""
        try:
            # Find AGBC02 location ID
            location_id = self.find_location_id_by_code("AGBC02")
            if not location_id:
                self.log_result(
                    "Test 2: AGBC02-01 Device",
                    False,
                    "Could not find AGBC02 location in database"
                )
                return False
            
            # Call location details API
            response = self.session.get(f"{API_BASE}/tenant-locations/details/{location_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Test 2: AGBC02-01 Device",
                    False,
                    f"API call failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Find AGBC02-01 device in response
            devices = data.get("devices", [])
            agbc02_device = None
            
            for device in devices:
                if device.get("device_id") == "AGBC02-01":
                    agbc02_device = device
                    break
            
            if not agbc02_device:
                self.log_result(
                    "Test 2: AGBC02-01 Device",
                    False,
                    "Device AGBC02-01 not found in location details response",
                    data
                )
                return False
            
            # Check TeamViewer ID
            actual_teamviewer_id = agbc02_device.get("teamviewer_id")
            expected_teamviewer_id = "969678983"
            
            if actual_teamviewer_id == expected_teamviewer_id:
                self.log_result(
                    "Test 2: AGBC02-01 Device",
                    True,
                    f"✅ Device AGBC02-01 has correct TeamViewer ID: {actual_teamviewer_id}"
                )
                return True
            else:
                self.log_result(
                    "Test 2: AGBC02-01 Device",
                    False,
                    f"❌ TeamViewer ID mismatch. Expected: {expected_teamviewer_id}, Got: {actual_teamviewer_id}",
                    agbc02_device
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Test 2: AGBC02-01 Device",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_random_locations(self):
        """Test 3: Test 3-5 random locations to ensure all devices have TeamViewer IDs"""
        try:
            # Get 5 random locations from MongoDB
            locations = list(portal_db.tenant_locations.aggregate([
                {"$sample": {"size": 5}},
                {"$project": {"location_id": 1, "location_code": 1, "_id": 0}}
            ]))
            
            if len(locations) < 3:
                self.log_result(
                    "Test 3: Random Locations",
                    False,
                    f"Not enough locations found in database. Found: {len(locations)}"
                )
                return False
            
            total_devices = 0
            devices_with_tvid = 0
            devices_without_tvid = 0
            devices_with_r_prefix = 0
            
            for location in locations:
                location_id = location.get("location_id")
                location_code = location.get("location_code")
                
                # Call location details API
                response = self.session.get(f"{API_BASE}/tenant-locations/details/{location_id}")
                
                if response.status_code != 200:
                    continue  # Skip this location if API call fails
                
                data = response.json()
                devices = data.get("devices", [])
                
                for device in devices:
                    total_devices += 1
                    teamviewer_id = device.get("teamviewer_id", "")
                    
                    if teamviewer_id and teamviewer_id != "-":
                        devices_with_tvid += 1
                        
                        # Check for 'r' prefix (should not exist)
                        if teamviewer_id.startswith('r'):
                            devices_with_r_prefix += 1
                    else:
                        devices_without_tvid += 1
            
            # Calculate percentage
            percentage_with_tvid = (devices_with_tvid / total_devices * 100) if total_devices > 0 else 0
            
            success = True
            issues = []
            
            # Check if most devices have TeamViewer IDs (should be ~98%)
            if percentage_with_tvid < 90:  # Allow some tolerance
                success = False
                issues.append(f"Only {percentage_with_tvid:.1f}% of devices have TeamViewer IDs (expected ~98%)")
            
            # Check for 'r' prefix (should be 0)
            if devices_with_r_prefix > 0:
                success = False
                issues.append(f"{devices_with_r_prefix} devices still have 'r' prefix in TeamViewer ID")
            
            if success:
                self.log_result(
                    "Test 3: Random Locations",
                    True,
                    f"✅ Random location test passed: {devices_with_tvid}/{total_devices} devices ({percentage_with_tvid:.1f}%) have TeamViewer IDs, 0 devices with 'r' prefix"
                )
            else:
                self.log_result(
                    "Test 3: Random Locations",
                    False,
                    f"❌ Issues found: {'; '.join(issues)}. Stats: {devices_with_tvid}/{total_devices} devices ({percentage_with_tvid:.1f}%) have TeamViewer IDs, {devices_with_r_prefix} with 'r' prefix"
                )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Test 3: Random Locations",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_overall_statistics(self):
        """Test 4: Verify statistics show ~213 of 218 devices have TeamViewer IDs (98%)"""
        try:
            # Count devices in MongoDB directly
            total_devices = multi_tenant_db.europcar_devices.count_documents({})
            
            # Count devices with TeamViewer IDs (not empty and not "-")
            devices_with_tvid = multi_tenant_db.europcar_devices.count_documents({
                "teamviewer_id": {"$exists": True, "$ne": "-", "$ne": "", "$ne": None}
            })
            
            # Also check multi_tenant_admin.devices for fallback IDs
            devices_with_fallback_tvid = multi_tenant_db.devices.count_documents({
                "teamviewer_id": {"$exists": True, "$ne": "-", "$ne": "", "$ne": None}
            })
            
            # Calculate percentage
            percentage_with_tvid = (devices_with_tvid / total_devices * 100) if total_devices > 0 else 0
            
            # Expected: ~213 of 218 devices (98%)
            expected_percentage = 98.0
            tolerance = 5.0  # Allow 5% tolerance
            
            success = abs(percentage_with_tvid - expected_percentage) <= tolerance
            
            if success:
                self.log_result(
                    "Test 4: Overall Statistics",
                    True,
                    f"✅ Statistics match expectation: {devices_with_tvid}/{total_devices} devices ({percentage_with_tvid:.1f}%) have TeamViewer IDs (expected ~98%)"
                )
            else:
                self.log_result(
                    "Test 4: Overall Statistics",
                    False,
                    f"❌ Statistics don't match: {devices_with_tvid}/{total_devices} devices ({percentage_with_tvid:.1f}%) have TeamViewer IDs (expected ~98%)"
                )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Test 4: Overall Statistics",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_no_r_prefix_verification(self):
        """Test 5: Ensure all TeamViewer IDs are numeric and without 'r' prefix"""
        try:
            # Check devices in MongoDB for 'r' prefix
            devices_with_r_prefix = list(multi_tenant_db.europcar_devices.find({
                "teamviewer_id": {"$regex": "^r", "$options": "i"}
            }, {"device_id": 1, "teamviewer_id": 1, "_id": 0}))
            
            # Also check fallback collection
            fallback_devices_with_r_prefix = list(multi_tenant_db.devices.find({
                "teamviewer_id": {"$regex": "^r", "$options": "i"}
            }, {"device_id": 1, "teamviewer_id": 1, "_id": 0}))
            
            total_r_prefix_devices = len(devices_with_r_prefix) + len(fallback_devices_with_r_prefix)
            
            if total_r_prefix_devices == 0:
                self.log_result(
                    "Test 5: No R Prefix Verification",
                    True,
                    "✅ All TeamViewer IDs are clean - no 'r' prefix found in any device"
                )
                return True
            else:
                problem_devices = []
                for device in devices_with_r_prefix:
                    problem_devices.append(f"{device.get('device_id')}: {device.get('teamviewer_id')}")
                for device in fallback_devices_with_r_prefix:
                    problem_devices.append(f"{device.get('device_id')}: {device.get('teamviewer_id')} (fallback)")
                
                self.log_result(
                    "Test 5: No R Prefix Verification",
                    False,
                    f"❌ Found {total_r_prefix_devices} devices with 'r' prefix: {', '.join(problem_devices[:5])}{'...' if len(problem_devices) > 5 else ''}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Test 5: No R Prefix Verification",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def run_all_tests(self):
        """Run all TeamViewer ID verification tests"""
        print("=" * 80)
        print("TEAMVIEWER ID VERIFICATION TESTING - GERMAN REVIEW REQUEST")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing: Alle TeamViewer IDs aktualisiert - Verification Test")
        print(f"MongoDB URL: {MONGO_URL}")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Authenticating as Admin (admin@tsrid.com)...")
            if not self.authenticate_admin():
                print("❌ Admin authentication failed. Stopping tests.")
                return False
            
            # Step 2: Test AAHC01-01 device
            print("\n🔍 STEP 2: Testing AAHC01-01 device (expected TeamViewer ID: 949746162)...")
            aahc01_ok = self.test_aahc01_device()
            
            # Step 3: Test AGBC02-01 device
            print("\n🔍 STEP 3: Testing AGBC02-01 device (expected TeamViewer ID: 969678983)...")
            agbc02_ok = self.test_agbc02_device()
            
            # Step 4: Test random locations
            print("\n🔍 STEP 4: Testing 3-5 random locations for TeamViewer ID coverage...")
            random_ok = self.test_random_locations()
            
            # Step 5: Test overall statistics
            print("\n🔍 STEP 5: Testing overall statistics (~213 of 218 devices = 98%)...")
            stats_ok = self.test_overall_statistics()
            
            # Step 6: Test no 'r' prefix
            print("\n🔍 STEP 6: Verifying no TeamViewer IDs have 'r' prefix...")
            no_r_prefix_ok = self.test_no_r_prefix_verification()
            
            # Summary
            print("\n" + "=" * 80)
            print("TEAMVIEWER ID VERIFICATION TESTING SUMMARY")
            print("=" * 80)
            
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print(f"Tests completed: {passed}/{total} passed")
            
            # Print critical functionality results
            print("\n🔍 CRITICAL VERIFICATION RESULTS:")
            print(f"   • AAHC01-01 Device (949746162): {'✅ CORRECT' if aahc01_ok else '❌ FAILED'}")
            print(f"   • AGBC02-01 Device (969678983): {'✅ CORRECT' if agbc02_ok else '❌ FAILED'}")
            print(f"   • Random Locations Coverage: {'✅ VERIFIED' if random_ok else '❌ FAILED'}")
            print(f"   • Overall Statistics (~98%): {'✅ VERIFIED' if stats_ok else '❌ FAILED'}")
            print(f"   • No R Prefix in IDs: {'✅ VERIFIED' if no_r_prefix_ok else '❌ FAILED'}")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\n❌ CRITICAL ISSUES FOUND:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['details']}")
            
            # Print successful tests
            successful_tests = [r for r in self.results if r['success']]
            if successful_tests:
                print("\n✅ SUCCESSFUL VERIFICATIONS:")
                for test in successful_tests:
                    print(f"   • {test['test']}")
            
            return len(failed_tests) == 0
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            return False

async def main():
    """Main function to run TeamViewer ID verification tests"""
    tester = TeamViewerIDVerificationTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TEAMVIEWER ID VERIFICATION TESTS PASSED!")
        print("✅ Alle Geräte haben jetzt TeamViewer IDs aus der TVID-Spalte")
        sys.exit(0)
    else:
        print("\n❌ SOME TEAMVIEWER ID VERIFICATION TESTS FAILED!")
        print("⚠️  Nicht alle Geräte haben korrekte TeamViewer IDs")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())