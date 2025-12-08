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
        self.tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar
        self.created_category_id = None
        self.created_template_id = None
        self.created_rule_id = None
        
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

    def test_get_asset_config_api(self):
        """Test GET /api/assets/{tenant_id}/config - Get asset ID configuration"""
        try:
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/config")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Asset Config API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "GET Asset Config API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "GET Asset Config API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            config = data["data"]
            
            # Verify config structure (should return default if none exists)
            required_fields = ["prefix", "start_number", "padding", "separator", "include_category", "include_location", "include_year"]
            for field in required_fields:
                if field not in config:
                    self.log_result(
                        "GET Asset Config API",
                        False,
                        f"Missing required field in config: {field}",
                        data
                    )
                    return False
            
            self.log_result(
                "GET Asset Config API",
                True,
                f"Successfully retrieved asset config with prefix '{config['prefix']}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Asset Config API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_save_asset_config_api(self):
        """Test POST /api/assets/{tenant_id}/config - Save asset ID configuration"""
        try:
            config_data = {
                "prefix": "EC",
                "pattern": "",
                "start_number": 1000,
                "padding": 6,
                "separator": "-",
                "include_category": True,
                "include_location": True,
                "include_year": False
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/config", json=config_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Save Asset Config API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Save Asset Config API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify the config was saved by retrieving it
            get_response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/config")
            if get_response.status_code == 200:
                get_data = get_response.json()
                if get_data.get("success") and get_data.get("data"):
                    saved_config = get_data["data"]
                    if saved_config.get("prefix") == "EC" and saved_config.get("start_number") == 1000:
                        self.log_result(
                            "POST Save Asset Config API",
                            True,
                            f"Successfully saved asset config with prefix 'EC' and start_number 1000"
                        )
                        return True
            
            self.log_result(
                "POST Save Asset Config API",
                False,
                "Config was not saved correctly",
                data
            )
            return False
            
        except Exception as e:
            self.log_result(
                "POST Save Asset Config API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_categories_crud_api(self):
        """Test Categories CRUD APIs - Create, Read, Update, Delete"""
        try:
            # Test 1: GET Categories (should be empty initially)
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Categories API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "GET Categories API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            initial_categories = data.get("data", [])
            
            # Test 2: POST Create Category
            category_data = {
                "name": "Test Computer",
                "short_code": "TC",
                "type": "hardware",
                "description": "Test description",
                "icon": "💻"
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/categories", json=category_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Category API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "POST Create Category API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Store category ID for update/delete tests
            created_category = data.get("data", {})
            self.created_category_id = created_category.get("id")
            
            if not self.created_category_id:
                self.log_result(
                    "POST Create Category API",
                    False,
                    "No category ID returned in response",
                    data
                )
                return False
            
            # Test 3: GET Categories (should now have 1 more)
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    current_categories = data.get("data", [])
                    if len(current_categories) != len(initial_categories) + 1:
                        self.log_result(
                            "Categories CRUD - Verification",
                            False,
                            f"Expected {len(initial_categories) + 1} categories, got {len(current_categories)}",
                            data
                        )
                        return False
            
            # Test 4: PUT Update Category
            update_data = {
                "name": "Updated Computer",
                "short_code": "UC",
                "type": "hardware",
                "description": "Updated test description",
                "icon": "🖥️"
            }
            
            response = self.session.put(f"{API_BASE}/assets/{self.tenant_id}/categories/{self.created_category_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Category API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "PUT Update Category API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Test 5: DELETE Category
            response = self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/categories/{self.created_category_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "DELETE Category API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "DELETE Category API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify deletion - GET should return original count
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    final_categories = data.get("data", [])
                    if len(final_categories) != len(initial_categories):
                        self.log_result(
                            "Categories CRUD - Delete Verification",
                            False,
                            f"Expected {len(initial_categories)} categories after deletion, got {len(final_categories)}",
                            data
                        )
                        return False
            
            self.log_result(
                "Categories CRUD APIs",
                True,
                f"Successfully tested all Categories CRUD operations (Create, Read, Update, Delete)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Categories CRUD APIs",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_templates_crud_api(self):
        """Test Templates CRUD APIs - Create, Read, Update, Delete"""
        try:
            # First create a category for the template
            category_data = {
                "name": "Laptop Category",
                "short_code": "LC",
                "type": "hardware",
                "description": "Category for laptops",
                "icon": "💻"
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/categories", json=category_data)
            if response.status_code != 200:
                self.log_result(
                    "Templates CRUD - Create Category",
                    False,
                    f"Failed to create category for template test. Status: {response.status_code}",
                    response.text
                )
                return False
            
            category_result = response.json()
            category_id = category_result.get("data", {}).get("id")
            
            # Test 1: GET Templates (should be empty initially)
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/templates")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Templates API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "GET Templates API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            initial_templates = data.get("data", [])
            
            # Test 2: POST Create Template
            template_data = {
                "name": "Laptop Template",
                "category_id": category_id,
                "fields": ["CPU", "RAM", "SSD"],
                "description": "Standard laptop config"
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/templates", json=template_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Template API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "POST Create Template API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Store template ID for update/delete tests
            created_template = data.get("data", {})
            self.created_template_id = created_template.get("id")
            
            if not self.created_template_id:
                self.log_result(
                    "POST Create Template API",
                    False,
                    "No template ID returned in response",
                    data
                )
                return False
            
            # Test 3: PUT Update Template
            update_data = {
                "name": "Updated Laptop Template",
                "category_id": category_id,
                "fields": ["CPU", "RAM", "SSD", "GPU"],
                "description": "Updated laptop config with GPU"
            }
            
            response = self.session.put(f"{API_BASE}/assets/{self.tenant_id}/templates/{self.created_template_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Template API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "PUT Update Template API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Test 4: DELETE Template
            response = self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/templates/{self.created_template_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "DELETE Template API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "DELETE Template API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Clean up category
            self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/categories/{category_id}")
            
            self.log_result(
                "Templates CRUD APIs",
                True,
                f"Successfully tested all Templates CRUD operations (Create, Read, Update, Delete)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Templates CRUD APIs",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_rules_crud_api(self):
        """Test Rules CRUD APIs - Create, Read, Update, Delete"""
        try:
            # Test 1: GET Rules (should be empty initially)
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/rules")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Rules API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "GET Rules API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            initial_rules = data.get("data", [])
            
            # Test 2: POST Create Rule
            rule_data = {
                "name": "Warranty Alert",
                "type": "warranty",
                "condition": "30 days before expiry",
                "action": "Send email",
                "enabled": True
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/rules", json=rule_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Rule API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "POST Create Rule API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Store rule ID for update/delete tests
            created_rule = data.get("data", {})
            self.created_rule_id = created_rule.get("id")
            
            if not self.created_rule_id:
                self.log_result(
                    "POST Create Rule API",
                    False,
                    "No rule ID returned in response",
                    data
                )
                return False
            
            # Test 3: PUT Update Rule (including enabled toggle)
            update_data = {
                "name": "Updated Warranty Alert",
                "type": "warranty",
                "condition": "60 days before expiry",
                "action": "Send email and SMS",
                "enabled": False  # Test enabled toggle
            }
            
            response = self.session.put(f"{API_BASE}/assets/{self.tenant_id}/rules/{self.created_rule_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Rule API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "PUT Update Rule API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Test 4: DELETE Rule
            response = self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/rules/{self.created_rule_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "DELETE Rule API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_result(
                    "DELETE Rule API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            self.log_result(
                "Rules CRUD APIs",
                True,
                f"Successfully tested all Rules CRUD operations (Create, Read, Update, Delete) including enabled toggle"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Rules CRUD APIs",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_authentication_required(self):
        """Test that all endpoints require valid JWT token"""
        try:
            # Create a session without authentication
            unauth_session = requests.Session()
            unauth_session.headers.update({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
            
            # Test endpoints that should require authentication
            endpoints_to_test = [
                f"/assets/{self.tenant_id}/config",
                f"/assets/{self.tenant_id}/categories",
                f"/assets/{self.tenant_id}/templates",
                f"/assets/{self.tenant_id}/rules"
            ]
            
            auth_failures = []
            
            for endpoint in endpoints_to_test:
                response = unauth_session.get(f"{API_BASE}{endpoint}")
                
                # Should return 401 or 403 for unauthorized access
                if response.status_code not in [401, 403]:
                    auth_failures.append(f"{endpoint} returned {response.status_code} instead of 401/403")
            
            if auth_failures:
                self.log_result(
                    "Authentication Required Test",
                    False,
                    f"Authentication not properly enforced: {'; '.join(auth_failures)}",
                    None
                )
                return False
            
            self.log_result(
                "Authentication Required Test",
                True,
                f"Successfully verified authentication is required for all {len(endpoints_to_test)} endpoints"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Authentication Required Test",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        try:
            # Test 1: Invalid tenant ID
            invalid_tenant_id = "invalid-tenant-id"
            response = self.session.get(f"{API_BASE}/assets/{invalid_tenant_id}/categories")
            
            # Should return 200 with empty data (tenant isolation)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("data"), list):
                    error_test_1_passed = True
                    error_1_details = "Invalid tenant ID correctly returns empty data (tenant isolation working)"
                else:
                    error_test_1_passed = False
                    error_1_details = "Invalid tenant ID response structure incorrect"
            else:
                error_test_1_passed = False
                error_1_details = f"Invalid tenant ID returned {response.status_code} instead of 200"
            
            # Test 2: Invalid category ID for update
            invalid_category_id = "invalid-category-id"
            update_data = {
                "name": "Test Category",
                "short_code": "TC",
                "type": "hardware",
                "description": "Test",
                "icon": "💻"
            }
            
            response = self.session.put(f"{API_BASE}/assets/{self.tenant_id}/categories/{invalid_category_id}", json=update_data)
            
            # Should return 404 for not found
            if response.status_code == 404:
                error_test_2_passed = True
                error_2_details = "Invalid category ID correctly returned 404"
            else:
                error_test_2_passed = False
                error_2_details = f"Invalid category ID returned {response.status_code} instead of 404"
            
            # Test 3: Missing required fields
            incomplete_data = {
                "name": "Test Category"
                # Missing required fields: short_code, type
            }
            
            response = self.session.post(f"{API_BASE}/assets/{self.tenant_id}/categories", json=incomplete_data)
            
            # Should return 422 for validation error
            if response.status_code == 422:
                error_test_3_passed = True
                error_3_details = "Missing required fields correctly returned 422"
            else:
                error_test_3_passed = False
                error_3_details = f"Missing required fields returned {response.status_code} instead of 422"
            
            if error_test_1_passed and error_test_2_passed and error_test_3_passed:
                self.log_result(
                    "Error Handling Test",
                    True,
                    f"Successfully tested error cases: {error_1_details}, {error_2_details}, {error_3_details}"
                )
                return True
            else:
                self.log_result(
                    "Error Handling Test",
                    False,
                    f"Error handling failed: {error_1_details}, {error_2_details}, {error_3_details}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Error Handling Test",
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
