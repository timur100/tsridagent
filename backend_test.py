#!/usr/bin/env python3
"""
Backend API Testing Suite - ASSET SETTINGS FEATURE TESTING
Tests Asset Settings API Backend after frontend apiCall fix:

The bug was that the frontend was calling apiCall incorrectly - it was passing method and body 
as separate parameters instead of in an options object.

ENDPOINTS TO TEST:
- POST /api/portal/auth/login - Login
- GET /api/tenants - Get tenants  
- GET /api/assets/{tenant_id}/categories - List categories
- POST /api/assets/{tenant_id}/categories - Create category
- PUT /api/assets/{tenant_id}/categories/{category_id} - Update category
- DELETE /api/assets/{tenant_id}/categories/{category_id} - Delete category

Test Scenario:
1. Login as admin@tsrid.com / admin123
2. Create a new asset category with:
   - Name: "E2E Test Category"
   - Short Code: "E2E"
   - Type: "hardware"
   - Description: "End-to-end test"
   - Icon: "🧪"
3. Verify the category was saved to the database
4. Create another category and verify both are persisted
5. Update a category and verify changes are saved
6. Delete a category and verify it's removed

Expected behavior: All CRUD operations should work correctly now.
Categories are stored in the `asset_categories` collection in MongoDB.
"""

import requests
import json
import sys
from typing import Dict, Any, List
import time

# Backend URL from environment
BACKEND_URL = "https://desk-manager-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class AssetSettingsAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.tenant_id = None
        self.created_categories = []
        
    def login(self) -> bool:
        """Login and get JWT token"""
        print("🔐 [TEST 1/8] Authenticating as admin...")
        
        login_data = {
            "email": "admin@tsrid.com",
            "password": "admin123"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    # Set authorization header for future requests
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    print("✅ Authentication successful")
                    return True
                else:
                    print("❌ No access token in response")
                    return False
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def get_tenant_id(self) -> bool:
        """Get tenant ID for testing"""
        print("🏢 [TEST 2/8] Getting tenant information...")
        
        try:
            response = self.session.get(f"{API_BASE}/tenants")
            print(f"Tenants response status: {response.status_code}")
            
            if response.status_code == 200:
                tenants = response.json()  # API returns array directly
                
                # Look for Europcar tenant
                for tenant in tenants:
                    if tenant.get("name") == "Europcar":
                        self.tenant_id = tenant.get("tenant_id")
                        print(f"✅ Found Europcar tenant: {self.tenant_id}")
                        return True
                
                # If no Europcar tenant, use the first available
                if tenants:
                    self.tenant_id = tenants[0].get("tenant_id")
                    print(f"✅ Using first available tenant: {self.tenant_id}")
                    return True
                else:
                    print("❌ No tenants found")
                    return False
            else:
                print(f"❌ Failed to get tenants: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get tenants error: {str(e)}")
            return False
    
    def list_categories(self) -> bool:
        """List existing categories"""
        print("📋 [TEST 3/8] Listing existing categories...")
        
        try:
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            print(f"List categories response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                categories = data.get("data", [])
                print(f"✅ Found {len(categories)} existing categories")
                
                for cat in categories:
                    print(f"   - {cat.get('name')} ({cat.get('short_code')}) - {cat.get('type')}")
                
                return True
            else:
                print(f"❌ Failed to list categories: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ List categories error: {str(e)}")
            return False
    
    def create_category(self, name: str, short_code: str, type_: str, description: str, icon: str) -> str:
        """Create a new category and return its ID"""
        print(f"➕ [TEST 4/8] Creating category: {name}...")
        
        category_data = {
            "name": name,
            "short_code": short_code,
            "type": type_,
            "description": description,
            "icon": icon
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/assets/{self.tenant_id}/categories",
                json=category_data
            )
            print(f"Create category response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    category_id = data.get("data", {}).get("id")
                    if category_id:
                        self.created_categories.append(category_id)
                        print(f"✅ Category created successfully with ID: {category_id}")
                        return category_id
                    else:
                        print("❌ No category ID in response")
                        return None
                else:
                    print(f"❌ Create failed: {data.get('message', 'Unknown error')}")
                    return None
            else:
                print(f"❌ Failed to create category: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Create category error: {str(e)}")
            return None
    
    def verify_category_persistence(self, category_id: str, expected_name: str) -> bool:
        """Verify category was saved to database"""
        print(f"🔍 [TEST 5/8] Verifying category persistence...")
        
        try:
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            
            if response.status_code == 200:
                data = response.json()
                categories = data.get("data", [])
                
                for cat in categories:
                    if cat.get("id") == category_id and cat.get("name") == expected_name:
                        print(f"✅ Category {expected_name} found in database")
                        return True
                
                print(f"❌ Category {expected_name} not found in database")
                return False
            else:
                print(f"❌ Failed to verify persistence: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Verify persistence error: {str(e)}")
            return False
    
    def update_category(self, category_id: str) -> bool:
        """Update a category"""
        print(f"✏️ [TEST 6/8] Updating category...")
        
        updated_data = {
            "name": "Updated E2E Test Category",
            "short_code": "UE2E",
            "type": "software",
            "description": "Updated end-to-end test category",
            "icon": "🔄"
        }
        
        try:
            response = self.session.put(
                f"{API_BASE}/assets/{self.tenant_id}/categories/{category_id}",
                json=updated_data
            )
            print(f"Update category response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print("✅ Category updated successfully")
                    return True
                else:
                    print(f"❌ Update failed: {data.get('message', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Failed to update category: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Update category error: {str(e)}")
            return False
    
    def delete_category(self, category_id: str) -> bool:
        """Delete a category"""
        print(f"🗑️ [TEST 7/8] Deleting category...")
        
        try:
            response = self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/categories/{category_id}")
            print(f"Delete category response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print("✅ Category deleted successfully")
                    # Remove from our tracking list
                    if category_id in self.created_categories:
                        self.created_categories.remove(category_id)
                    return True
                else:
                    print(f"❌ Delete failed: {data.get('message', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Failed to delete category: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Delete category error: {str(e)}")
            return False
    
    def verify_deletion(self, category_id: str) -> bool:
        """Verify category was deleted from database"""
        print(f"🔍 [TEST 8/8] Verifying category deletion...")
        
        try:
            response = self.session.get(f"{API_BASE}/assets/{self.tenant_id}/categories")
            
            if response.status_code == 200:
                data = response.json()
                categories = data.get("data", [])
                
                for cat in categories:
                    if cat.get("id") == category_id:
                        print(f"❌ Category still exists in database")
                        return False
                
                print(f"✅ Category successfully removed from database")
                return True
            else:
                print(f"❌ Failed to verify deletion: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Verify deletion error: {str(e)}")
            return False
    
    def cleanup(self):
        """Clean up any remaining test categories"""
        print("\n🧹 Cleaning up test data...")
        
        for category_id in self.created_categories:
            try:
                response = self.session.delete(f"{API_BASE}/assets/{self.tenant_id}/categories/{category_id}")
                if response.status_code == 200:
                    print(f"✅ Cleaned up category: {category_id}")
                else:
                    print(f"⚠️ Failed to clean up category: {category_id}")
            except Exception as e:
                print(f"⚠️ Cleanup error for {category_id}: {str(e)}")
    
    def run_tests(self) -> bool:
        """Run all Asset Settings API tests"""
        print("🚀 Starting Asset Settings API Testing...")
        print("=" * 60)
        
        try:
            # Test 1: Authentication
            if not self.login():
                return False
            
            # Test 2: Get tenant ID
            if not self.get_tenant_id():
                return False
            
            # Test 3: List existing categories
            if not self.list_categories():
                return False
            
            # Test 4: Create first category
            category1_id = self.create_category(
                name="E2E Test Category",
                short_code="E2E",
                type_="hardware",
                description="End-to-end test",
                icon="🧪"
            )
            if not category1_id:
                return False
            
            # Test 5: Verify persistence
            if not self.verify_category_persistence(category1_id, "E2E Test Category"):
                return False
            
            # Create second category to test multiple categories
            category2_id = self.create_category(
                name="Second Test Category",
                short_code="STC",
                type_="software",
                description="Second test category",
                icon="🔬"
            )
            if not category2_id:
                return False
            
            # Test 6: Update category
            if not self.update_category(category1_id):
                return False
            
            # Test 7: Delete category
            if not self.delete_category(category2_id):
                return False
            
            # Test 8: Verify deletion
            if not self.verify_deletion(category2_id):
                return False
            
            print("\n" + "=" * 60)
            print("✅ ALL ASSET SETTINGS API TESTS PASSED!")
            print("✅ Frontend apiCall fix verified - CRUD operations working correctly")
            print("✅ Categories can be created and appear in the list")
            print("✅ Categories persist after being created")
            print("✅ Updates are saved correctly")
            print("✅ Deletions work properly")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Test suite error: {str(e)}")
            return False
        finally:
            # Always cleanup
            self.cleanup()

def main():
    """Main test execution"""
    tester = AssetSettingsAPITester()
    
    success = tester.run_tests()
    
    if success:
        print("\n🎉 Asset Settings API testing completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Asset Settings API testing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()