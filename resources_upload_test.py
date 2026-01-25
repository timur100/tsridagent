#!/usr/bin/env python3
"""
Resources Upload Endpoint Testing
Tests the POST /api/resources/upload endpoint to identify why it's not working
"""

import requests
import json
import sys
import io
import os
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://multitenantapp-4.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class ResourcesUploadTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2) if isinstance(response_data, dict) else response_data}")
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
    
    def test_backend_health(self):
        """Test basic backend connectivity"""
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code != 200:
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Backend not responding. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            if data.get("message") != "Hello World":
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Unexpected response from backend root endpoint",
                    data
                )
                return False
            
            self.log_result(
                "Backend Health Check", 
                True, 
                "Backend is responding correctly"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Backend Health Check", 
                False, 
                f"Cannot connect to backend: {str(e)}"
            )
            return False
    
    def test_dropbox_connection(self):
        """Test Dropbox connection verification"""
        try:
            response = self.session.get(f"{API_BASE}/resources/verify-connection")
            
            if response.status_code == 500:
                try:
                    data = response.json()
                    if "access token not configured" in data.get("detail", "").lower():
                        self.log_result(
                            "Dropbox Connection", 
                            False, 
                            "Dropbox access token is not configured in environment variables",
                            data
                        )
                        return False
                except:
                    pass
            
            if response.status_code == 401:
                try:
                    data = response.json()
                    self.log_result(
                        "Dropbox Connection", 
                        False, 
                        f"Dropbox access token is invalid or expired: {data.get('detail', 'Unknown error')}",
                        data
                    )
                except:
                    self.log_result(
                        "Dropbox Connection", 
                        False, 
                        "Dropbox access token is invalid or expired",
                        response.text
                    )
                return False
            
            if response.status_code != 200:
                self.log_result(
                    "Dropbox Connection", 
                    False, 
                    f"Dropbox connection failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            self.log_result(
                "Dropbox Connection", 
                True, 
                f"Dropbox connection successful. User: {data.get('user')}, Email: {data.get('email')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Dropbox Connection", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def create_test_file(self, filename: str, content: str = "Test file content for upload testing"):
        """Create a test file for upload"""
        return io.BytesIO(content.encode('utf-8'))
    
    def test_upload_without_category(self):
        """Test POST /api/resources/upload without category"""
        try:
            # Create test file
            test_content = "This is a test file for upload testing without category"
            test_file = self.create_test_file("test_upload_no_category.txt", test_content)
            
            # Prepare multipart form data
            files = {
                'file': ('test_upload_no_category.txt', test_file, 'text/plain')
            }
            
            # Remove Content-Type header to let requests set it for multipart
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{API_BASE}/resources/upload",
                files=files,
                headers=headers
            )
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    self.log_result(
                        "Upload Without Category", 
                        False, 
                        f"Upload failed. Status: {response.status_code}, Error: {error_data.get('detail', 'Unknown error')}",
                        error_data
                    )
                except:
                    self.log_result(
                        "Upload Without Category", 
                        False, 
                        f"Upload failed. Status: {response.status_code}",
                        response.text
                    )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Upload Without Category", 
                    False, 
                    "Upload response success field is not True",
                    data
                )
                return False
            
            # Validate response structure
            file_info = data.get("file", {})
            required_fields = ["name", "path", "url", "download_url", "size"]
            missing_fields = [field for field in required_fields if field not in file_info]
            
            if missing_fields:
                self.log_result(
                    "Upload Without Category", 
                    False, 
                    f"Response missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Upload Without Category", 
                True, 
                f"File uploaded successfully: {file_info.get('name')} ({file_info.get('size')} bytes)"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Upload Without Category", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_upload_with_valid_category(self):
        """Test POST /api/resources/upload with valid category"""
        try:
            # Create test file
            test_content = "This is a test file for upload testing with anleitungen category"
            test_file = self.create_test_file("test_upload_anleitungen.txt", test_content)
            
            # Prepare multipart form data with category
            files = {
                'file': ('test_upload_anleitungen.txt', test_file, 'text/plain')
            }
            data = {
                'category': 'anleitungen'
            }
            
            # Remove Content-Type header to let requests set it for multipart
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{API_BASE}/resources/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    self.log_result(
                        "Upload With Valid Category", 
                        False, 
                        f"Upload failed. Status: {response.status_code}, Error: {error_data.get('detail', 'Unknown error')}",
                        error_data
                    )
                except:
                    self.log_result(
                        "Upload With Valid Category", 
                        False, 
                        f"Upload failed. Status: {response.status_code}",
                        response.text
                    )
                return False
            
            response_data = response.json()
            
            if not response_data.get("success"):
                self.log_result(
                    "Upload With Valid Category", 
                    False, 
                    "Upload response success field is not True",
                    response_data
                )
                return False
            
            # Validate response structure
            file_info = response_data.get("file", {})
            required_fields = ["name", "path", "url", "download_url", "size"]
            missing_fields = [field for field in required_fields if field not in file_info]
            
            if missing_fields:
                self.log_result(
                    "Upload With Valid Category", 
                    False, 
                    f"Response missing required fields: {missing_fields}",
                    response_data
                )
                return False
            
            # Check if file was uploaded to correct category path
            expected_path = f"/anleitungen/{file_info.get('name')}"
            actual_path = file_info.get('path')
            
            if not actual_path.startswith('/anleitungen/'):
                self.log_result(
                    "Upload With Valid Category", 
                    False, 
                    f"File not uploaded to correct category path. Expected path starting with '/anleitungen/', got: {actual_path}",
                    response_data
                )
                return False
            
            self.log_result(
                "Upload With Valid Category", 
                True, 
                f"File uploaded successfully to category 'anleitungen': {file_info.get('name')} ({file_info.get('size')} bytes)"
            )
            return response_data
            
        except Exception as e:
            self.log_result(
                "Upload With Valid Category", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_upload_with_invalid_category(self):
        """Test POST /api/resources/upload with invalid category"""
        try:
            # Create test file
            test_content = "This is a test file for upload testing with invalid category"
            test_file = self.create_test_file("test_upload_invalid.txt", test_content)
            
            # Prepare multipart form data with invalid category
            files = {
                'file': ('test_upload_invalid.txt', test_file, 'text/plain')
            }
            data = {
                'category': 'invalid_category'
            }
            
            # Remove Content-Type header to let requests set it for multipart
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{API_BASE}/resources/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code != 400:
                self.log_result(
                    "Upload With Invalid Category", 
                    False, 
                    f"Expected 400 error for invalid category, got {response.status_code}",
                    response.text
                )
                return False
            
            try:
                error_data = response.json()
                if "invalid category" not in error_data.get("detail", "").lower():
                    self.log_result(
                        "Upload With Invalid Category", 
                        False, 
                        f"Expected 'Invalid category' error message, got: {error_data.get('detail')}",
                        error_data
                    )
                    return False
            except:
                self.log_result(
                    "Upload With Invalid Category", 
                    False, 
                    "Could not parse error response as JSON",
                    response.text
                )
                return False
            
            self.log_result(
                "Upload With Invalid Category", 
                True, 
                "Correctly rejected upload with invalid category"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Upload With Invalid Category", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_upload_without_file(self):
        """Test POST /api/resources/upload without file"""
        try:
            # Prepare form data without file
            data = {
                'category': 'anleitungen'
            }
            
            # Remove Content-Type header to let requests set it for multipart
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{API_BASE}/resources/upload",
                data=data,
                headers=headers
            )
            
            if response.status_code != 422:  # FastAPI validation error
                self.log_result(
                    "Upload Without File", 
                    False, 
                    f"Expected 422 validation error for missing file, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Upload Without File", 
                True, 
                "Correctly rejected upload without file"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Upload Without File", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_cors_headers(self):
        """Test CORS headers on upload endpoint"""
        try:
            # Send OPTIONS request to check CORS with Origin header
            headers = dict(self.session.headers)
            headers['Origin'] = BACKEND_URL
            response = self.session.options(f"{API_BASE}/resources/upload", headers=headers)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
            }
            
            # Check if CORS is properly configured
            if not cors_headers['Access-Control-Allow-Origin']:
                self.log_result(
                    "CORS Headers Check", 
                    False, 
                    "Missing Access-Control-Allow-Origin header",
                    cors_headers
                )
                return False
            
            if cors_headers['Access-Control-Allow-Origin'] not in ['*', BACKEND_URL]:
                self.log_result(
                    "CORS Headers Check", 
                    False, 
                    f"Unexpected Access-Control-Allow-Origin: {cors_headers['Access-Control-Allow-Origin']}",
                    cors_headers
                )
                return False
            
            self.log_result(
                "CORS Headers Check", 
                True, 
                f"CORS headers properly configured. Origin: {cors_headers['Access-Control-Allow-Origin']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "CORS Headers Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_large_file_upload(self):
        """Test upload with larger file (1MB)"""
        try:
            # Create larger test file (1MB)
            test_content = "A" * (1024 * 1024)  # 1MB of 'A' characters
            test_file = self.create_test_file("test_large_file.txt", test_content)
            
            # Prepare multipart form data
            files = {
                'file': ('test_large_file.txt', test_file, 'text/plain')
            }
            data = {
                'category': 'tools'
            }
            
            # Remove Content-Type header to let requests set it for multipart
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{API_BASE}/resources/upload",
                files=files,
                data=data,
                headers=headers,
                timeout=60  # Longer timeout for large file
            )
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    self.log_result(
                        "Large File Upload", 
                        False, 
                        f"Large file upload failed. Status: {response.status_code}, Error: {error_data.get('detail', 'Unknown error')}",
                        error_data
                    )
                except:
                    self.log_result(
                        "Large File Upload", 
                        False, 
                        f"Large file upload failed. Status: {response.status_code}",
                        response.text
                    )
                return False
            
            response_data = response.json()
            
            if not response_data.get("success"):
                self.log_result(
                    "Large File Upload", 
                    False, 
                    "Large file upload response success field is not True",
                    response_data
                )
                return False
            
            file_info = response_data.get("file", {})
            uploaded_size = file_info.get("size", 0)
            
            # Check if size matches (approximately, allowing for some variance)
            expected_size = 1024 * 1024
            if abs(uploaded_size - expected_size) > 100:  # Allow 100 bytes variance
                self.log_result(
                    "Large File Upload", 
                    False, 
                    f"File size mismatch. Expected ~{expected_size}, got {uploaded_size}",
                    response_data
                )
                return False
            
            self.log_result(
                "Large File Upload", 
                True, 
                f"Large file uploaded successfully: {file_info.get('name')} ({uploaded_size} bytes)"
            )
            return response_data
            
        except Exception as e:
            self.log_result(
                "Large File Upload", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all resources upload tests"""
        print("=" * 70)
        print("RESOURCES UPLOAD ENDPOINT TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Target Endpoint: POST {API_BASE}/resources/upload")
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
        
        # Test Dropbox connection
        if not self.test_dropbox_connection():
            print("❌ Dropbox connection failed. Upload tests may fail.")
        
        # Test CORS headers
        print("🔍 Testing CORS configuration...")
        self.test_cors_headers()
        
        # Test upload scenarios
        print("\n🔍 Testing upload scenarios...")
        
        # Test 1: Upload without category
        print("\n📤 Test 1: Upload without category...")
        self.test_upload_without_category()
        
        # Test 2: Upload with valid category
        print("\n📤 Test 2: Upload with valid category (anleitungen)...")
        self.test_upload_with_valid_category()
        
        # Test 3: Upload with invalid category
        print("\n📤 Test 3: Upload with invalid category...")
        self.test_upload_with_invalid_category()
        
        # Test 4: Upload without file
        print("\n📤 Test 4: Upload without file...")
        self.test_upload_without_file()
        
        # Test 5: Large file upload
        print("\n📤 Test 5: Large file upload (1MB)...")
        self.test_large_file_upload()
        
        # Summary
        print("\n" + "=" * 70)
        print("RESOURCES UPLOAD TESTING SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        # Print successful tests
        successful_tests = [r for r in self.results if r['success']]
        if successful_tests:
            print("\n✅ SUCCESSFUL TESTS:")
            for test in successful_tests:
                print(f"   • {test['test']}")
        
        return len(failed_tests) == 0

if __name__ == "__main__":
    print("Starting Resources Upload Endpoint Testing...")
    print()
    
    # Test Resources Upload
    upload_tester = ResourcesUploadTester()
    test_success = upload_tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Resources Upload Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 RESOURCES UPLOAD TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ RESOURCES UPLOAD TESTING FOUND ISSUES!")
        sys.exit(1)