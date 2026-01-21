#!/usr/bin/env python3
"""
Backend API Testing for Document Upload Feature
Tests the Document Upload API endpoints comprehensively as specified in German review request.
"""

import requests
import json
import sys
import os
import tempfile
from typing import Dict, Any, List
from pathlib import Path

# Backend URL from environment
BACKEND_URL = "https://stability-rescue-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class DocumentUploadTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_tenant_id = None
        self.uploaded_documents = []  # Track uploaded documents for cleanup
        
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
    
    def get_existing_tenant(self):
        """Get an existing tenant for testing"""
        try:
            response = self.session.get(f"{API_BASE}/tenants/")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Existing Tenant", 
                    False, 
                    f"Failed to get tenants. Status: {response.status_code}",
                    response.text
                )
                return False
            
            tenants = response.json()
            
            if not tenants or len(tenants) == 0:
                self.log_result(
                    "Get Existing Tenant", 
                    False, 
                    "No tenants found in database"
                )
                return False
            
            # Use first tenant
            self.test_tenant_id = tenants[0]["tenant_id"]
            tenant_name = tenants[0]["name"]
            
            self.log_result(
                "Get Existing Tenant", 
                True, 
                f"Using tenant: {tenant_name} (ID: {self.test_tenant_id})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Existing Tenant", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def create_test_file(self, filename: str, content: str, size_mb: int = 1) -> str:
        """Create a test file with specified content and size"""
        try:
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            
            # Create content to reach desired size
            base_content = content
            target_size = size_mb * 1024 * 1024  # Convert MB to bytes
            
            # Repeat content to reach target size
            while len(base_content) < target_size:
                base_content += content + "\n"
            
            # Truncate to exact size
            base_content = base_content[:target_size]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(base_content)
            
            return file_path
            
        except Exception as e:
            print(f"Error creating test file: {e}")
            return None
    
    def test_upload_pdf_document(self):
        """Test POST /api/documents/upload with PDF file"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Upload PDF Document", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            # Create test PDF content (simulated)
            test_content = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
            file_path = self.create_test_file("test_contract.pdf", test_content, 1)
            
            if not file_path:
                self.log_result(
                    "Upload PDF Document", 
                    False, 
                    "Failed to create test PDF file"
                )
                return False
            
            # Prepare multipart form data
            with open(file_path, 'rb') as f:
                files = {'file': ('test_contract.pdf', f, 'application/pdf')}
                data = {
                    'tenant_id': self.test_tenant_id,
                    'category': 'contract',
                    'description': 'Test PDF contract document'
                }
                
                # Remove Content-Type header for multipart
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/documents/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
            
            # Clean up test file
            os.remove(file_path)
            
            if response.status_code != 200:
                self.log_result(
                    "Upload PDF Document", 
                    False, 
                    f"Upload failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["success", "document_id", "filename", "file_size"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Upload PDF Document", 
                    False, 
                    f"Missing required fields in response: {missing_fields}",
                    data
                )
                return False
            
            if not data.get("success"):
                self.log_result(
                    "Upload PDF Document", 
                    False, 
                    "Upload response indicates failure",
                    data
                )
                return False
            
            # Store document ID for later tests
            document_id = data.get("document_id")
            if document_id:
                self.uploaded_documents.append(document_id)
            
            self.log_result(
                "Upload PDF Document", 
                True, 
                f"PDF uploaded successfully: {data.get('filename')} ({data.get('file_size')} bytes, ID: {document_id})"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Upload PDF Document", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_upload_word_document(self):
        """Test POST /api/documents/upload with Word document"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Upload Word Document", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            # Create test DOCX content (simulated)
            test_content = "PK\x03\x04\x14\x00\x00\x00\x08\x00Test Word Document Content for Upload Testing"
            file_path = self.create_test_file("test_invoice.docx", test_content, 1)
            
            if not file_path:
                self.log_result(
                    "Upload Word Document", 
                    False, 
                    "Failed to create test Word file"
                )
                return False
            
            # Prepare multipart form data
            with open(file_path, 'rb') as f:
                files = {'file': ('test_invoice.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
                data = {
                    'tenant_id': self.test_tenant_id,
                    'category': 'invoice',
                    'description': 'Test Word invoice document'
                }
                
                # Remove Content-Type header for multipart
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/documents/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
            
            # Clean up test file
            os.remove(file_path)
            
            if response.status_code != 200:
                self.log_result(
                    "Upload Word Document", 
                    False, 
                    f"Upload failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Upload Word Document", 
                    False, 
                    "Upload response indicates failure",
                    data
                )
                return False
            
            # Store document ID for later tests
            document_id = data.get("document_id")
            if document_id:
                self.uploaded_documents.append(document_id)
            
            self.log_result(
                "Upload Word Document", 
                True, 
                f"Word document uploaded successfully: {data.get('filename')} ({data.get('file_size')} bytes, ID: {document_id})"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Upload Word Document", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_upload_excel_document(self):
        """Test POST /api/documents/upload with Excel document"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Upload Excel Document", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            # Create test XLSX content (simulated)
            test_content = "PK\x03\x04\x14\x00\x00\x00\x08\x00Test Excel Document Content for Upload Testing"
            file_path = self.create_test_file("test_report.xlsx", test_content, 1)
            
            if not file_path:
                self.log_result(
                    "Upload Excel Document", 
                    False, 
                    "Failed to create test Excel file"
                )
                return False
            
            # Prepare multipart form data
            with open(file_path, 'rb') as f:
                files = {'file': ('test_report.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                data = {
                    'tenant_id': self.test_tenant_id,
                    'category': 'other',
                    'description': 'Test Excel report document'
                }
                
                # Remove Content-Type header for multipart
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/documents/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
            
            # Clean up test file
            os.remove(file_path)
            
            if response.status_code != 200:
                self.log_result(
                    "Upload Excel Document", 
                    False, 
                    f"Upload failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Upload Excel Document", 
                    False, 
                    "Upload response indicates failure",
                    data
                )
                return False
            
            # Store document ID for later tests
            document_id = data.get("document_id")
            if document_id:
                self.uploaded_documents.append(document_id)
            
            self.log_result(
                "Upload Excel Document", 
                True, 
                f"Excel document uploaded successfully: {data.get('filename')} ({data.get('file_size')} bytes, ID: {document_id})"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Upload Excel Document", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_tenant_documents(self):
        """Test GET /api/documents/tenant/{tenant_id}"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Get Tenant Documents", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            response = self.session.get(f"{API_BASE}/documents/tenant/{self.test_tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Tenant Documents", 
                    False, 
                    f"Get documents failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "Get Tenant Documents", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            if "documents" not in data:
                self.log_result(
                    "Get Tenant Documents", 
                    False, 
                    "Response missing documents array",
                    data
                )
                return False
            
            documents = data["documents"]
            
            # Verify we have the uploaded documents
            uploaded_count = len([doc for doc in documents if doc.get("document_id") in self.uploaded_documents])
            
            self.log_result(
                "Get Tenant Documents", 
                True, 
                f"Retrieved {len(documents)} documents for tenant, {uploaded_count} are our test uploads"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Tenant Documents", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_documents_with_category_filter(self):
        """Test GET /api/documents/tenant/{tenant_id}?category=contract"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Get Documents with Category Filter", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            response = self.session.get(f"{API_BASE}/documents/tenant/{self.test_tenant_id}?category=contract")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Documents with Category Filter", 
                    False, 
                    f"Get filtered documents failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Documents with Category Filter", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            documents = data["documents"]
            
            # Verify all documents have contract category
            non_contract_docs = [doc for doc in documents if doc.get("category") != "contract"]
            if non_contract_docs:
                self.log_result(
                    "Get Documents with Category Filter", 
                    False, 
                    f"Found {len(non_contract_docs)} documents with non-contract category",
                    non_contract_docs
                )
                return False
            
            self.log_result(
                "Get Documents with Category Filter", 
                True, 
                f"Category filter working: found {len(documents)} contract documents"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Documents with Category Filter", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_download_document(self):
        """Test GET /api/documents/download/{document_id}"""
        try:
            if not self.uploaded_documents:
                self.log_result(
                    "Download Document", 
                    False, 
                    "No uploaded documents available for download test"
                )
                return False
            
            document_id = self.uploaded_documents[0]  # Use first uploaded document
            
            response = self.session.get(f"{API_BASE}/documents/download/{document_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Download Document", 
                    False, 
                    f"Download failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            # Verify response is file content
            if not response.content:
                self.log_result(
                    "Download Document", 
                    False, 
                    "Download response is empty"
                )
                return False
            
            # Check content-disposition header for filename
            content_disposition = response.headers.get('content-disposition', '')
            
            self.log_result(
                "Download Document", 
                True, 
                f"Document downloaded successfully: {len(response.content)} bytes, Content-Disposition: {content_disposition}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Download Document", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_invalid_file_type(self):
        """Test upload with invalid file type"""
        try:
            if not self.test_tenant_id:
                self.log_result(
                    "Invalid File Type Validation", 
                    False, 
                    "No test tenant ID available"
                )
                return False
            
            # Create test file with invalid extension
            test_content = "This is a text file that should be rejected"
            file_path = self.create_test_file("invalid_file.txt", test_content, 1)
            
            if not file_path:
                self.log_result(
                    "Invalid File Type Validation", 
                    False, 
                    "Failed to create test file"
                )
                return False
            
            # Prepare multipart form data
            with open(file_path, 'rb') as f:
                files = {'file': ('invalid_file.txt', f, 'text/plain')}
                data = {
                    'tenant_id': self.test_tenant_id,
                    'category': 'other',
                    'description': 'Invalid file type test'
                }
                
                # Remove Content-Type header for multipart
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = requests.post(
                    f"{API_BASE}/documents/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
            
            # Clean up test file
            os.remove(file_path)
            
            if response.status_code != 400:
                self.log_result(
                    "Invalid File Type Validation", 
                    False, 
                    f"Expected 400 error for invalid file type, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Invalid File Type Validation", 
                True, 
                "Invalid file type correctly rejected with 400 error"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Invalid File Type Validation", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_delete_document(self):
        """Test DELETE /api/documents/{document_id}"""
        try:
            if not self.uploaded_documents:
                self.log_result(
                    "Delete Document", 
                    False, 
                    "No uploaded documents available for deletion test"
                )
                return False
            
            document_id = self.uploaded_documents[-1]  # Use last uploaded document
            
            response = self.session.delete(f"{API_BASE}/documents/{document_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Delete Document", 
                    False, 
                    f"Delete failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Delete Document", 
                    False, 
                    "Delete response indicates failure",
                    data
                )
                return False
            
            # Verify document is deleted by trying to download it
            download_response = self.session.get(f"{API_BASE}/documents/download/{document_id}")
            
            if download_response.status_code != 404:
                self.log_result(
                    "Delete Document Verification", 
                    False, 
                    f"Document still exists after deletion. Status: {download_response.status_code}"
                )
                return False
            
            # Remove from our tracking list
            self.uploaded_documents.remove(document_id)
            
            self.log_result(
                "Delete Document", 
                True, 
                f"Document {document_id} deleted successfully and verified"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Delete Document", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def cleanup_test_documents(self):
        """Clean up any remaining test documents"""
        try:
            for document_id in self.uploaded_documents[:]:  # Copy list to avoid modification during iteration
                try:
                    response = self.session.delete(f"{API_BASE}/documents/{document_id}")
                    if response.status_code == 200:
                        self.uploaded_documents.remove(document_id)
                        print(f"✅ Cleaned up test document: {document_id}")
                except:
                    pass  # Ignore cleanup errors
        except:
            pass  # Ignore cleanup errors

    def run_all_tests(self):
        """Run all document upload tests"""
        print("=" * 70)
        print("DOCUMENT UPLOAD API TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 70)
        print()
        
        # Authenticate as admin first
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Get existing tenant
        if not self.get_existing_tenant():
            print("❌ Failed to get existing tenant. Stopping tests.")
            return False
        
        # Step 1: Test PDF Upload
        print("\n🔍 STEP 1: Testing PDF Document Upload...")
        if not self.test_upload_pdf_document():
            print("❌ PDF upload failed.")
        
        # Step 2: Test Word Upload
        print("\n🔍 STEP 2: Testing Word Document Upload...")
        if not self.test_upload_word_document():
            print("❌ Word upload failed.")
        
        # Step 3: Test Excel Upload
        print("\n🔍 STEP 3: Testing Excel Document Upload...")
        if not self.test_upload_excel_document():
            print("❌ Excel upload failed.")
        
        # Step 4: Test Get Tenant Documents
        print("\n🔍 STEP 4: Testing Get Tenant Documents...")
        if not self.test_get_tenant_documents():
            print("❌ Get tenant documents failed.")
        
        # Step 5: Test Category Filter
        print("\n🔍 STEP 5: Testing Category Filter...")
        if not self.test_get_documents_with_category_filter():
            print("❌ Category filter failed.")
        
        # Step 6: Test Document Download
        print("\n🔍 STEP 6: Testing Document Download...")
        if not self.test_download_document():
            print("❌ Document download failed.")
        
        # Step 7: Test Invalid File Type
        print("\n🔍 STEP 7: Testing Invalid File Type Validation...")
        if not self.test_invalid_file_type():
            print("❌ Invalid file type validation failed.")
        
        # Step 8: Test Document Deletion
        print("\n🔍 STEP 8: Testing Document Deletion...")
        if not self.test_delete_document():
            print("❌ Document deletion failed.")
        
        # Cleanup remaining test documents
        print("\n🧹 Cleaning up remaining test documents...")
        self.cleanup_test_documents()
        
        # Summary
        print("\n" + "=" * 70)
        print("DOCUMENT UPLOAD TESTING SUMMARY")
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
    print("Starting Document Upload API Testing...")
    print()
    
    # Test Document Upload
    tester = DocumentUploadTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Document Upload Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 DOCUMENT UPLOAD TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ DOCUMENT UPLOAD TESTING FOUND ISSUES!")
        sys.exit(1)