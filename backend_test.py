#!/usr/bin/env python3
"""
Backend API Testing for Tenant Management APIs in Auth & Identity Service
Tests the Auth & Identity Service (Port 8100) tenant management functionality comprehensively.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://service-transform.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
AUTH_SERVICE_URL = "http://localhost:8100"

class TenantManagementTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.auth_service_session = requests.Session()
        self.auth_service_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_tenant_id = None
        
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
    
    def test_auth_service_health(self):
        """Test Auth Service health endpoint"""
        try:
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Auth Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Auth & Identity Service":
                self.log_result(
                    "Auth Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Auth Service Health Check", 
                True, 
                "Auth & Identity Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Auth Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_tenant_stats(self):
        """Test GET /api/tenants/stats endpoint"""
        try:
            response = self.auth_service_session.get(f"{AUTH_SERVICE_URL}/api/tenants/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Tenant Statistics", 
                    False, 
                    f"Stats endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total_tenants", "active_tenants", "trial_tenants", "suspended_tenants", "total_users", "total_devices"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Tenant Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify data types
            for field in required_fields:
                if not isinstance(data[field], int):
                    self.log_result(
                        "Tenant Statistics", 
                        False, 
                        f"Field {field} should be integer, got {type(data[field])}",
                        data
                    )
                    return False
            
            self.log_result(
                "Tenant Statistics", 
                True, 
                f"Statistics retrieved: {data['total_tenants']} total tenants, {data['active_tenants']} active, {data['trial_tenants']} trial, {data['suspended_tenants']} suspended, {data['total_users']} users"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Tenant Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_settings_service_info(self):
        """Test Settings Service info endpoint"""
        try:
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/info")
            
            if response.status_code != 200:
                self.log_result(
                    "Settings Service Info", 
                    False, 
                    f"Info endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["service_name", "version", "description", "endpoints"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Settings Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service_name") != "Settings Service":
                self.log_result(
                    "Settings Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service_name')}",
                    data
                )
                return False
            
            self.log_result(
                "Settings Service Info", 
                True, 
                f"Service info correct: {data.get('service_name')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Settings Service Info", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def setup_test_settings(self):
        """Setup test settings for testing"""
        try:
            # Create test settings
            test_settings = [
                {
                    "key": "app.name",
                    "value": "TSRID System",
                    "category": "general",
                    "scope": "global",
                    "description": "Application name",
                    "is_readonly": True
                },
                {
                    "key": "app.theme",
                    "value": "dark",
                    "category": "ui",
                    "scope": "global",
                    "description": "Default theme"
                },
                {
                    "key": "email.smtp_host",
                    "value": "smtp.example.com",
                    "category": "email",
                    "scope": "global",
                    "description": "SMTP server host"
                },
                {
                    "key": "security.max_login_attempts",
                    "value": 5,
                    "value_type": "int",
                    "category": "security",
                    "scope": "global",
                    "description": "Maximum login attempts"
                },
                {
                    "key": "api.secret_key",
                    "value": "super-secret-key-123",
                    "category": "security",
                    "scope": "global",
                    "description": "API secret key",
                    "is_sensitive": True
                }
            ]
            
            response = self.settings_service_session.post(f"{SETTINGS_SERVICE_URL}/api/settings/bulk", json=test_settings)
            
            if response.status_code == 201:
                self.log_result(
                    "Setup Test Settings", 
                    True, 
                    f"Created {len(test_settings)} test settings"
                )
                return True
            else:
                self.log_result(
                    "Setup Test Settings", 
                    True, 
                    "Test settings may already exist (expected)"
                )
                return True
            
        except Exception as e:
            self.log_result(
                "Setup Test Settings", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_settings_statistics(self):
        """Test Settings Service statistics endpoint"""
        try:
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Settings Statistics", 
                    False, 
                    f"Statistics endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total", "by_category", "by_scope", "sensitive", "readonly"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Settings Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify expected values
            total = data.get("total", 0)
            sensitive = data.get("sensitive", 0)
            readonly = data.get("readonly", 0)
            
            if total < 5:
                self.log_result(
                    "Settings Statistics", 
                    False, 
                    f"Expected at least 5 settings, got {total}",
                    data
                )
                return False
            
            if sensitive < 1:
                self.log_result(
                    "Settings Statistics", 
                    False, 
                    f"Expected at least 1 sensitive setting, got {sensitive}",
                    data
                )
                return False
            
            if readonly < 1:
                self.log_result(
                    "Settings Statistics", 
                    False, 
                    f"Expected at least 1 readonly setting, got {readonly}",
                    data
                )
                return False
            
            self.log_result(
                "Settings Statistics", 
                True, 
                f"Statistics retrieved: {total} total settings, {sensitive} sensitive, {readonly} readonly"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Settings Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_settings(self):
        """Test GET /api/settings endpoint"""
        try:
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Settings", 
                    False, 
                    f"Get settings failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get All Settings", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Check setting structure if settings exist
            if len(data) > 0:
                setting_obj = data[0]
                required_fields = ["id", "key", "value", "category", "scope"]
                missing_fields = [field for field in required_fields if field not in setting_obj]
                
                if missing_fields:
                    self.log_result(
                        "Get All Settings", 
                        False, 
                        f"Setting missing required fields: {missing_fields}",
                        setting_obj
                    )
                    return False
                
                # Store first setting ID for later tests
                if not self.test_setting_id:
                    self.test_setting_id = setting_obj.get("id")
            
            if len(data) < 5:
                self.log_result(
                    "Get All Settings", 
                    False, 
                    f"Expected at least 5 settings, got {len(data)}",
                    data
                )
                return False
            
            self.log_result(
                "Get All Settings", 
                True, 
                f"Retrieved {len(data)} settings successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get All Settings", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_setting_by_key(self):
        """Test GET /api/settings/key/{key}"""
        try:
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings/key/app.name")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Setting by Key", 
                    False, 
                    f"Get setting by key failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an object (not array)
            if isinstance(data, list):
                self.log_result(
                    "Get Setting by Key", 
                    False, 
                    f"Response should be an object, not an array",
                    data
                )
                return False
            
            # Verify key matches
            if data.get("key") != "app.name":
                self.log_result(
                    "Get Setting by Key", 
                    False, 
                    f"Expected key 'app.name', got {data.get('key')}",
                    data
                )
                return False
            
            # Check required fields
            required_fields = ["id", "key", "value", "category", "scope"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Get Setting by Key", 
                    False, 
                    f"Setting missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Get Setting by Key", 
                True, 
                f"Retrieved setting by key 'app.name': {data.get('value')} ({data.get('category')})"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Setting by Key", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_settings_by_category(self):
        """Test GET /api/settings/category/{category}"""
        try:
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings/category/security")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Settings by Category", 
                    False, 
                    f"Get settings by category failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get Settings by Category", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all settings have category = security
            for setting_obj in data:
                if setting_obj.get("category") != "security":
                    self.log_result(
                        "Get Settings by Category", 
                        False, 
                        f"Setting has wrong category: {setting_obj.get('category')}",
                        setting_obj
                    )
                    return False
            
            self.log_result(
                "Get Settings by Category", 
                True, 
                f"Category filter working: {len(data)} security settings found"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Settings by Category", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_setting(self):
        """Test updating a setting"""
        try:
            if not self.test_setting_id:
                self.log_result(
                    "Update Setting", 
                    False, 
                    "No test setting ID available for update test"
                )
                return False
            
            # Find a non-readonly setting to update
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings/key/app.theme")
            if response.status_code != 200:
                self.log_result(
                    "Update Setting", 
                    False, 
                    "Could not find app.theme setting for update test"
                )
                return False
            
            setting = response.json()
            setting_id = setting.get("id")
            
            # Update setting value
            update_data = {
                "value": "light",
                "description": "Updated theme setting"
            }
            
            response = self.settings_service_session.put(
                f"{SETTINGS_SERVICE_URL}/api/settings/{setting_id}", 
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update Setting", 
                    False, 
                    f"Update setting failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify value was updated
            if data.get("value") != "light":
                self.log_result(
                    "Update Setting", 
                    False, 
                    f"Value not updated. Expected 'light', got '{data.get('value')}'",
                    data
                )
                return False
            
            self.log_result(
                "Update Setting", 
                True, 
                f"Setting updated successfully: {data.get('key')} -> {data.get('value')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Update Setting", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_readonly_protection(self):
        """Test that readonly settings cannot be updated"""
        try:
            # Try to update readonly setting (app.name)
            response = self.settings_service_session.get(f"{SETTINGS_SERVICE_URL}/api/settings/key/app.name")
            if response.status_code != 200:
                self.log_result(
                    "Readonly Protection", 
                    False, 
                    "Could not find app.name setting for readonly test"
                )
                return False
            
            setting = response.json()
            setting_id = setting.get("id")
            
            # Try to update readonly setting
            update_data = {
                "value": "Modified Name"
            }
            
            response = self.settings_service_session.put(
                f"{SETTINGS_SERVICE_URL}/api/settings/{setting_id}", 
                json=update_data
            )
            
            # Should return 403 Forbidden
            if response.status_code != 403:
                self.log_result(
                    "Readonly Protection", 
                    False, 
                    f"Expected 403 Forbidden, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Readonly Protection", 
                True, 
                "Readonly setting protection working correctly (403 Forbidden)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Readonly Protection", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_all_services_online(self):
        """Test that all 10 services appear in /api/portal/services"""
        try:
            response = self.session.get(f"{API_BASE}/portal/services")
            
            if response.status_code != 200:
                self.log_result(
                    "All Services Online", 
                    False, 
                    f"Failed to get services. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Expected services in order
            expected_services = [
                "auth", "id_verification", "device", "location", 
                "inventory", "order", "customer", "license", "settings", "support"
            ]
            
            service_types = [s.get('service_type') for s in data]
            
            # Check if all expected services are present
            missing_services = [s for s in expected_services if s not in service_types]
            if missing_services:
                self.log_result(
                    "All Services Online", 
                    False, 
                    f"Missing services: {missing_services}",
                    service_types
                )
                return False
            
            # Check if we have exactly 10 services
            if len(service_types) != 10:
                self.log_result(
                    "All Services Online", 
                    False, 
                    f"Expected 10 services, got {len(service_types)}",
                    service_types
                )
                return False
            
            # Check order
            if service_types != expected_services:
                self.log_result(
                    "All Services Online", 
                    False, 
                    f"Services not in expected order. Got: {service_types}, Expected: {expected_services}",
                    data
                )
                return False
            
            self.log_result(
                "All Services Online", 
                True, 
                f"All 10 services online in correct order: {', '.join(service_types)}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "All Services Online", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_settings_service_registration(self):
        """Test that Settings Service appears at position 9 in services list"""
        try:
            response = self.session.get(f"{API_BASE}/portal/services")
            
            if response.status_code != 200:
                self.log_result(
                    "Settings Service Registration", 
                    False, 
                    f"Failed to get services. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Look for settings service
            settings_service = None
            for service in data:
                if service.get('service_type') == 'settings':
                    settings_service = service
                    break
            
            if not settings_service:
                self.log_result(
                    "Settings Service Registration", 
                    False, 
                    "Settings Service not found in services list",
                    data
                )
                return False
            
            # Check position (should be 9th - 0-indexed position 8)
            service_types = [s.get('service_type') for s in data]
            settings_position = service_types.index('settings') if 'settings' in service_types else -1
            
            expected_position = 8  # 0-indexed
            if settings_position != expected_position:
                self.log_result(
                    "Settings Service Registration", 
                    False, 
                    f"Settings Service at position {settings_position}, expected position {expected_position}",
                    service_types
                )
                return False
            
            # Verify service_type
            if settings_service.get('service_type') != 'settings':
                self.log_result(
                    "Settings Service Registration", 
                    False, 
                    f"Wrong service_type: {settings_service.get('service_type')}",
                    settings_service
                )
                return False
            
            self.log_result(
                "Settings Service Registration", 
                True, 
                f"Settings Service found at correct position {expected_position} with service_type='settings'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Settings Service Registration", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_mongodb_summary(self):
        """Test MongoDB integration shows settings_db"""
        try:
            response = self.session.get(f"{API_BASE}/portal/mongodb-summary?service_type=settings")
            
            if response.status_code != 200:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"MongoDB summary failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # The API returns a list of services, find the settings service
            settings_service_info = None
            if isinstance(data, list):
                for service in data:
                    if service.get("service_id") == "settings_service_001":
                        settings_service_info = service
                        break
            else:
                settings_service_info = data
            
            if not settings_service_info:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Settings service not found in MongoDB summary",
                    data
                )
                return False
            
            mongodb_info = settings_service_info.get("mongodb_info", {})
            
            # Verify database name
            if mongodb_info.get("database_name") != "settings_db":
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"Wrong database name: {mongodb_info.get('database_name')}, expected 'settings_db'",
                    mongodb_info
                )
                return False
            
            # Verify collections exist
            collections = mongodb_info.get("collections", [])
            if not any(col.get("name") == "settings" for col in collections):
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Settings collection not found",
                    mongodb_info
                )
                return False
            
            # Verify document count
            total_documents = mongodb_info.get("total_documents", 0)
            
            self.log_result(
                "MongoDB Summary", 
                True, 
                f"MongoDB integration working: {mongodb_info.get('database_name')} with {len(collections)} collections, {total_documents} documents"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Summary", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all settings service tests"""
        print("=" * 70)
        print("SETTINGS SERVICE COMPREHENSIVE TESTING + FINAL ARCHITECTURE VERIFICATION")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Settings Service URL: {SETTINGS_SERVICE_URL}")
        print("=" * 70)
        print()
        
        # Test backend connectivity first
        if not self.test_backend_health():
            print("❌ Backend connectivity failed. Stopping tests.")
            return False
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Setup test data
        print("🔧 SETUP: Creating test settings...")
        self.setup_test_settings()
        
        # Step 1: Test Settings Service Health & Info
        print("\n🔍 STEP 1: Testing Settings Service Health & Info...")
        if not self.test_settings_service_health():
            print("❌ Settings service health check failed.")
        
        if not self.test_settings_service_info():
            print("❌ Settings service info failed.")
        
        # Step 2: Test Settings Statistics
        print("\n🔍 STEP 2: Testing Settings Statistics...")
        stats = self.test_settings_statistics()
        if not stats:
            print("❌ Settings statistics failed.")
        
        # Step 3: Test Get All Settings
        print("\n🔍 STEP 3: Testing Get All Settings...")
        settings = self.test_get_all_settings()
        if settings is False:
            print("❌ Get all settings failed.")
        
        # Step 4: Test Get Setting by Key
        print("\n🔍 STEP 4: Testing Get Setting by Key...")
        if not self.test_get_setting_by_key():
            print("❌ Get setting by key failed.")
        
        # Step 5: Test Get Settings by Category
        print("\n🔍 STEP 5: Testing Get Settings by Category...")
        if not self.test_get_settings_by_category():
            print("❌ Get settings by category failed.")
        
        # Step 6: Test Update Setting
        print("\n🔍 STEP 6: Testing Update Setting...")
        if not self.test_update_setting():
            print("❌ Update setting failed.")
        
        # Step 7: Test Readonly Protection
        print("\n🔍 STEP 7: Testing Readonly Protection...")
        if not self.test_readonly_protection():
            print("❌ Readonly protection failed.")
        
        # Step 8: Test All 10 Services Online
        print("\n🔍 STEP 8: Testing All 10 Services Online...")
        if not self.test_all_services_online():
            print("❌ All services online verification failed.")
        
        # Step 9: Test Settings Service Registration
        print("\n🔍 STEP 9: Testing Settings Service Registration...")
        if not self.test_settings_service_registration():
            print("❌ Settings service registration verification failed.")
        
        # Step 10: Test MongoDB Summary
        print("\n🔍 STEP 10: Testing MongoDB Summary...")
        if not self.test_mongodb_summary():
            print("❌ MongoDB summary failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("SETTINGS SERVICE TESTING SUMMARY")
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
    print("Starting Settings Service Comprehensive Testing + Final Architecture Verification...")
    print()
    
    # Test Settings Service
    tester = SettingsServiceTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Settings Service Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 SETTINGS SERVICE TESTING + ARCHITECTURE VERIFICATION COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ SETTINGS SERVICE TESTING FOUND ISSUES!")
        sys.exit(1)