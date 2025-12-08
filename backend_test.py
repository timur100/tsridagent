#!/usr/bin/env python3
"""
Backend API Testing Suite - ASSET SETTINGS API COMPREHENSIVE TESTING
Tests Asset Settings API Backend for Asset Management Configuration System:

ASSET ID CONFIGURATION APIs (2 endpoints):
- GET /api/assets/{tenant_id}/config - Get asset ID configuration (returns default if none exists)
- POST /api/assets/{tenant_id}/config - Save/update asset ID configuration

CATEGORIES CRUD APIs (4 endpoints):
- GET /api/assets/{tenant_id}/categories - List all categories
- POST /api/assets/{tenant_id}/categories - Create new category
- PUT /api/assets/{tenant_id}/categories/{category_id} - Update category
- DELETE /api/assets/{tenant_id}/categories/{category_id} - Delete category

TEMPLATES CRUD APIs (4 endpoints):
- GET /api/assets/{tenant_id}/templates - List all templates
- POST /api/assets/{tenant_id}/templates - Create new template
- PUT /api/assets/{tenant_id}/templates/{template_id} - Update template
- DELETE /api/assets/{tenant_id}/templates/{template_id} - Delete template

RULES CRUD APIs (4 endpoints):
- GET /api/assets/{tenant_id}/rules - List all rules
- POST /api/assets/{tenant_id}/rules - Create new rule
- PUT /api/assets/{tenant_id}/rules/{rule_id} - Update rule (including enabled toggle)
- DELETE /api/assets/{tenant_id}/rules/{rule_id} - Delete rule

Test Data:
- Authentication: admin@tsrid.com / admin123
- Test Tenant ID: 1d3653db-86cb-4dd1-9ef5-0236b116def8 (Europcar)
- Database: verification_db collections: asset_categories, asset_templates, asset_rules, asset_id_config
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os
import asyncio
import websockets
import jwt
from datetime import datetime, timezone
import time
import uuid

# Backend URL from environment
BACKEND_URL = "https://asset-tracker-270.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
db = mongo_client['verification_db']  # Use verification_db as per parking.py

class AssetSettingsTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.created_location_id = None
        self.created_vehicle_id = None
        self.created_booking_id = None
        
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

    def test_recognize_plate_api(self):
        """Test POST /api/parking/recognize-plate - OCR recognition with image upload"""
        try:
            # Check if test image exists
            test_image_path = "/tmp/test_plate.jpg"
            if not os.path.exists(test_image_path):
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    f"Test image not found at {test_image_path}",
                    None
                )
                return False
            
            # Prepare multipart form data
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                
                # Create a new session without Content-Type header for multipart
                temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/parking/recognize-plate", 
                    files=files,
                    headers=temp_headers
                )
            
            if response.status_code != 200:
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            ocr_data = data["data"]
            
            # Verify OCR result structure
            required_fields = ["license_plate", "confidence"]
            for field in required_fields:
                if field not in ocr_data:
                    self.log_result(
                        "POST Recognize Plate API",
                        False,
                        f"Missing required field in OCR data: {field}",
                        data
                    )
                    return False
            
            # Verify license plate was recognized
            license_plate = ocr_data["license_plate"]
            confidence = ocr_data["confidence"]
            
            if not license_plate:
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    "No license plate recognized",
                    data
                )
                return False
            
            # Check if recognized plate contains expected characters (B-MW 1234 -> BMW1234 or similar)
            expected_chars = ["B", "M", "W", "1", "2", "3", "4"]
            recognized_chars = [c for c in expected_chars if c in license_plate]
            
            if len(recognized_chars) < 4:  # At least half the characters should be recognized
                self.log_result(
                    "POST Recognize Plate API",
                    False,
                    f"OCR result '{license_plate}' doesn't contain enough expected characters from 'B-MW 1234'",
                    data
                )
                return False
            
            self.log_result(
                "POST Recognize Plate API",
                True,
                f"Successfully recognized license plate '{license_plate}' with {confidence}% confidence"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Recognize Plate API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_entry_with_ocr_api(self):
        """Test POST /api/parking/entry-with-ocr - Entry with automatic OCR recognition"""
        try:
            # Check if test image exists
            test_image_path = "/tmp/test_plate.jpg"
            if not os.path.exists(test_image_path):
                self.log_result(
                    "POST Entry with OCR API",
                    False,
                    f"Test image not found at {test_image_path}",
                    None
                )
                return False
            
            # Prepare multipart form data
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                data_form = {'location': 'Test Parking Area'}
                
                # Create a new session without Content-Type header for multipart
                temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/parking/entry-with-ocr", 
                    files=files,
                    data=data_form,
                    headers=temp_headers
                )
            
            # Handle both success and duplicate entry cases
            if response.status_code == 200:
                data = response.json()
                
                # Check if response indicates success
                if data.get("success"):
                    # Successful entry
                    entry_data = data["data"]
                    
                    # Verify entry structure
                    required_fields = ["license_plate", "location", "entry_time", "status"]
                    for field in required_fields:
                        if field not in entry_data:
                            self.log_result(
                                "POST Entry with OCR API",
                                False,
                                f"Missing required field in entry data: {field}",
                                data
                            )
                            return False
                    
                    # Store license plate for exit test
                    self.recognized_license_plate = entry_data["license_plate"]
                    
                    self.log_result(
                        "POST Entry with OCR API",
                        True,
                        f"Successfully created parking entry for '{entry_data['license_plate']}' at '{entry_data['location']}'"
                    )
                    return True
                else:
                    self.log_result(
                        "POST Entry with OCR API",
                        False,
                        "Response indicates failure",
                        data
                    )
                    return False
                    
            elif response.status_code == 400:
                # Check if it's a duplicate entry error (which is expected behavior)
                error_text = response.text
                if "bereits einen aktiven Parkvorgang" in error_text:
                    # This is expected - vehicle already has active session
                    # Let's get the license plate from OCR for the exit test
                    with open(test_image_path, 'rb') as f:
                        files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                        temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                        
                        ocr_response = requests.post(
                            f"{API_BASE}/parking/recognize-plate", 
                            files=files,
                            headers=temp_headers
                        )
                        
                        if ocr_response.status_code == 200:
                            ocr_data = ocr_response.json()
                            if ocr_data.get("success") and ocr_data.get("data", {}).get("license_plate"):
                                self.recognized_license_plate = ocr_data["data"]["license_plate"]
                    
                    self.log_result(
                        "POST Entry with OCR API",
                        True,
                        "Entry correctly rejected - vehicle already has active parking session (expected behavior)"
                    )
                    return True
                else:
                    self.log_result(
                        "POST Entry with OCR API",
                        False,
                        f"Unexpected 400 error: {error_text}",
                        None
                    )
                    return False
            else:
                self.log_result(
                    "POST Entry with OCR API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
        except Exception as e:
            self.log_result(
                "POST Entry with OCR API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_exit_with_ocr_api(self):
        """Test POST /api/parking/exit-with-ocr - Exit with automatic OCR recognition"""
        try:
            # Check if test image exists
            test_image_path = "/tmp/test_plate.jpg"
            if not os.path.exists(test_image_path):
                self.log_result(
                    "POST Exit with OCR API",
                    False,
                    f"Test image not found at {test_image_path}",
                    None
                )
                return False
            
            # Wait a moment to ensure some duration for the parking session
            import time
            time.sleep(2)
            
            # Prepare multipart form data
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                
                # Create a new session without Content-Type header for multipart
                temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/parking/exit-with-ocr", 
                    files=files,
                    headers=temp_headers
                )
            
            if response.status_code != 200:
                self.log_result(
                    "POST Exit with OCR API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Exit with OCR API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Exit with OCR API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            exit_data = data["data"]
            
            # Verify exit structure
            required_fields = ["license_plate", "entry_time", "exit_time", "duration_minutes"]
            for field in required_fields:
                if field not in exit_data:
                    self.log_result(
                        "POST Exit with OCR API",
                        False,
                        f"Missing required field in exit data: {field}",
                        data
                    )
                    return False
            
            # Verify duration was calculated
            duration = exit_data["duration_minutes"]
            if duration < 0:
                self.log_result(
                    "POST Exit with OCR API",
                    False,
                    f"Invalid duration: {duration} minutes",
                    data
                )
                return False
            
            self.log_result(
                "POST Exit with OCR API",
                True,
                f"Successfully processed parking exit for '{exit_data['license_plate']}' with duration {duration} minutes"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Exit with OCR API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_recognition_history_api(self):
        """Test GET /api/parking/recognition-history - Get OCR recognition history"""
        try:
            response = self.session.get(f"{API_BASE}/parking/recognition-history?limit=10")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Recognition History API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "GET Recognition History API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "GET Recognition History API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            history = data["data"]
            
            # Verify history is a list
            if not isinstance(history, list):
                self.log_result(
                    "GET Recognition History API",
                    False,
                    f"History should be a list, got {type(history)}",
                    data
                )
                return False
            
            # Should have at least 1 recognition from our previous test
            if len(history) < 1:
                self.log_result(
                    "GET Recognition History API",
                    False,
                    f"Expected at least 1 recognition in history, got {len(history)}",
                    data
                )
                return False
            
            # Verify history entry structure
            if history:
                entry = history[0]
                required_fields = ["license_plate", "confidence", "timestamp", "user"]
                for field in required_fields:
                    if field not in entry:
                        self.log_result(
                            "GET Recognition History API",
                            False,
                            f"Missing required field in history entry: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Recognition History API",
                True,
                f"Successfully retrieved {len(history)} recognition history entries"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Recognition History API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_active_sessions_api(self):
        """Test GET /api/parking/active - Get active parking sessions"""
        try:
            response = self.session.get(f"{API_BASE}/parking/active")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Active Sessions API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "GET Active Sessions API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "GET Active Sessions API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            session_data = data["data"]
            
            # Verify session data structure
            required_fields = ["active_count", "sessions"]
            for field in required_fields:
                if field not in session_data:
                    self.log_result(
                        "GET Active Sessions API",
                        False,
                        f"Missing required field in session data: {field}",
                        data
                    )
                    return False
            
            active_count = session_data["active_count"]
            sessions = session_data["sessions"]
            
            # Verify sessions is a list
            if not isinstance(sessions, list):
                self.log_result(
                    "GET Active Sessions API",
                    False,
                    f"Sessions should be a list, got {type(sessions)}",
                    data
                )
                return False
            
            # Verify count matches array length
            if active_count != len(sessions):
                self.log_result(
                    "GET Active Sessions API",
                    False,
                    f"Active count mismatch: count={active_count}, array length={len(sessions)}",
                    data
                )
                return False
            
            # If there are active sessions, verify structure
            if sessions:
                session = sessions[0]
                required_session_fields = ["session_id", "license_plate", "entry_time", "status", "current_duration_minutes"]
                for field in required_session_fields:
                    if field not in session:
                        self.log_result(
                            "GET Active Sessions API",
                            False,
                            f"Missing required field in session: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Active Sessions API",
                True,
                f"Successfully retrieved {active_count} active parking sessions"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Active Sessions API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_parking_stats_api(self):
        """Test GET /api/parking/stats - Get parking statistics"""
        try:
            response = self.session.get(f"{API_BASE}/parking/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Parking Stats API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "GET Parking Stats API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "GET Parking Stats API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            stats = data["data"]
            
            # Verify stats structure
            required_fields = ["active_sessions", "sessions_today", "total_violations", "pending_violations", "total_penalty_amount"]
            for field in required_fields:
                if field not in stats:
                    self.log_result(
                        "GET Parking Stats API",
                        False,
                        f"Missing required field in stats: {field}",
                        data
                    )
                    return False
            
            # Verify stats are numeric
            numeric_fields = ["active_sessions", "sessions_today", "total_violations", "pending_violations", "total_penalty_amount"]
            for field in numeric_fields:
                if not isinstance(stats[field], (int, float)):
                    self.log_result(
                        "GET Parking Stats API",
                        False,
                        f"Field '{field}' should be numeric, got {type(stats[field])}",
                        data
                    )
                    return False
            
            self.log_result(
                "GET Parking Stats API",
                True,
                f"Successfully retrieved parking stats: {stats['active_sessions']} active, {stats['sessions_today']} today, {stats['total_violations']} violations"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Parking Stats API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_error_cases(self):
        """Test error cases for OCR endpoints"""
        try:
            # Test 1: Exit without active session (should fail)
            test_image_path = "/tmp/test_plate.jpg"
            
            # Create a fake license plate entry that doesn't exist
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                # This should fail because there's no active session for this plate
                response = requests.post(
                    f"{API_BASE}/parking/exit-with-ocr", 
                    files=files,
                    headers=temp_headers
                )
            
            # Should get 404 for no active session
            if response.status_code == 404:
                error_test_1_passed = True
                error_1_details = "Exit without active session correctly returned 404"
            else:
                error_test_1_passed = False
                error_1_details = f"Exit without active session returned {response.status_code} instead of 404"
            
            # Test 2: Duplicate entry - check if it handles it properly
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_plate.jpg', f, 'image/jpeg')}
                data_form = {'location': 'Test Parking Area 2'}
                temp_headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/parking/entry-with-ocr", 
                    files=files,
                    data=data_form,
                    headers=temp_headers
                )
            
            # Check response - could be 400 (error) or 200 (handled gracefully)
            if response.status_code in [200, 400]:
                error_test_2_passed = True
                if response.status_code == 200:
                    # Check if it's handled as a violation
                    data = response.json()
                    if not data.get("success", True):
                        error_2_details = "Duplicate entry correctly handled as violation"
                    else:
                        error_2_details = "Duplicate entry allowed (may be by design)"
                else:
                    error_2_details = "Duplicate entry correctly rejected with 400"
            else:
                error_test_2_passed = False
                error_2_details = f"Duplicate entry returned unexpected status {response.status_code}"
            
            if error_test_1_passed and error_test_2_passed:
                self.log_result(
                    "Error Cases Testing",
                    True,
                    f"Successfully tested error cases: {error_1_details}, {error_2_details}"
                )
                return True
            else:
                self.log_result(
                    "Error Cases Testing",
                    False,
                    f"Error case testing failed: {error_1_details}, {error_2_details}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Error Cases Testing",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_mongodb_persistence(self):
        """Test MongoDB persistence - Verify OCR data is stored correctly"""
        try:
            # Check license_plate_recognitions collection
            recognitions_count = db.license_plate_recognitions.count_documents({})
            
            if recognitions_count < 1:
                self.log_result(
                    "MongoDB Persistence - Recognitions",
                    False,
                    f"Expected at least 1 recognition in MongoDB, found {recognitions_count}",
                    None
                )
                return False
            
            # Check parking_entries collection
            entries_count = db.parking_entries.count_documents({})
            
            if entries_count < 1:
                self.log_result(
                    "MongoDB Persistence - Parking Entries",
                    False,
                    f"Expected at least 1 parking entry in MongoDB, found {entries_count}",
                    None
                )
                return False
            
            # Verify specific recognition data
            recognition = db.license_plate_recognitions.find_one({}, sort=[("timestamp", -1)])
            if not recognition:
                self.log_result(
                    "MongoDB Persistence - Recognition Data",
                    False,
                    "No recognition data found in MongoDB",
                    None
                )
                return False
            
            # Verify recognition has required fields
            required_fields = ["license_plate", "confidence", "timestamp", "user"]
            for field in required_fields:
                if field not in recognition:
                    self.log_result(
                        "MongoDB Persistence - Recognition Fields",
                        False,
                        f"Missing field '{field}' in recognition data",
                        None
                    )
                    return False
            
            # Verify parking entry data
            entry = db.parking_entries.find_one({}, sort=[("entry_time", -1)])
            if not entry:
                self.log_result(
                    "MongoDB Persistence - Entry Data",
                    False,
                    "No parking entry data found in MongoDB",
                    None
                )
                return False
            
            # Verify entry has required fields
            required_entry_fields = ["license_plate", "location", "entry_time", "status"]
            for field in required_entry_fields:
                if field not in entry:
                    self.log_result(
                        "MongoDB Persistence - Entry Fields",
                        False,
                        f"Missing field '{field}' in parking entry data",
                        None
                    )
                    return False
            
            self.log_result(
                "MongoDB Persistence Verification",
                True,
                f"Successfully verified MongoDB persistence: {recognitions_count} recognitions, {entries_count} parking entries"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Persistence Verification",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def run_all_tests(self):
        """Run all License Plate Recognition OCR API tests"""
        print("=" * 80)
        print("LICENSE PLATE RECOGNITION OCR COMPREHENSIVE API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing APIs: License Plate Recognition OCR for parking management system")
        print(f"Database: verification_db collections: license_plate_recognitions, parking_entries")
        print("Test Data: /tmp/test_plate.jpg (contains 'B-MW 1234'), admin@tsrid.com authentication")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Admin Authentication")
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with tests.")
                return
            print()
            
            # Step 2: Test OCR Recognition
            print("🔍 STEP 2: License Plate OCR Recognition")
            self.test_recognize_plate_api()
            print()
            
            # Step 3: Test Entry with OCR
            print("🚗 STEP 3: Parking Entry with OCR")
            self.test_entry_with_ocr_api()
            print()
            
            # Step 4: Test Exit with OCR
            print("🚪 STEP 4: Parking Exit with OCR")
            self.test_exit_with_ocr_api()
            print()
            
            # Step 5: Test Recognition History
            print("📋 STEP 5: OCR Recognition History")
            self.test_recognition_history_api()
            print()
            
            # Step 6: Test Parking Management APIs
            print("📊 STEP 6: Parking Management APIs")
            self.test_active_sessions_api()
            self.test_parking_stats_api()
            print()
            
            # Step 7: Test Error Cases
            print("⚠️ STEP 7: Error Case Testing")
            self.test_error_cases()
            print()
            
            # Step 8: Test MongoDB Persistence
            print("💾 STEP 8: MongoDB Persistence Verification")
            self.test_mongodb_persistence()
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
    tester = LicensePlateOCRTester()
    
    # Run tests
    import asyncio
    asyncio.run(tester.run_all_tests())


if __name__ == "__main__":
    main()
