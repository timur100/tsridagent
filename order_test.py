#!/usr/bin/env python3
"""
Order Number Generation Testing Suite
Tests the new order number generation system and order display functionality
"""

import requests
import json
import sys
import re
from typing import Dict, Any, List
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://smart-dashboard-ui.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class OrderAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.customer_token = None
        self.created_order_id = None
        self.test_item_id = None
        
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
    
    def test_admin_authentication(self):
        """Test admin authentication for setup"""
        try:
            login_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BACKEND_URL}/api/portal/auth/login", json=login_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if "access_token" not in data:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    "No access token in response",
                    data
                )
                return False
            
            self.admin_token = data["access_token"]
            
            self.log_result(
                "Admin Authentication", 
                True, 
                "Successfully authenticated as admin"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_customer_authentication(self):
        """Test customer authentication (info@europcar.com)"""
        try:
            # First try to register the customer if not exists
            register_data = {
                "email": "info@europcar.com",
                "password": "europcar123",
                "name": "Europcar Customer",
                "company": "Europcar Autovermietung GmbH",
                "role": "customer"
            }
            
            # Try to register (might fail if already exists)
            register_response = self.session.post(f"{BACKEND_URL}/api/portal/auth/register", json=register_data)
            
            # Now try to login
            login_data = {
                "email": "info@europcar.com",
                "password": "europcar123"
            }
            
            response = self.session.post(f"{BACKEND_URL}/api/portal/auth/login", json=login_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Customer Authentication", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if "access_token" not in data:
                self.log_result(
                    "Customer Authentication", 
                    False, 
                    "No access token in response",
                    data
                )
                return False
            
            self.customer_token = data["access_token"]
            
            self.log_result(
                "Customer Authentication", 
                True, 
                "Successfully authenticated as customer info@europcar.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Customer Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_enable_shop_access(self):
        """Enable shop access for customer using admin token"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Enable Shop Access", 
                    False, 
                    "Admin token not available"
                )
                return False
            
            # Update customer to enable shop access
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            update_data = {
                "shop_enabled": True
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/api/portal/users/info@europcar.com", 
                json=update_data,
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Enable Shop Access", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Enable Shop Access", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            self.log_result(
                "Enable Shop Access", 
                True, 
                "Successfully enabled shop access for customer"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Enable Shop Access", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_inventory_item(self):
        """Create test inventory item (Microsoft Surface Pro 4)"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Create Inventory Item", 
                    False, 
                    "Admin token not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            item_data = {
                "name": "Microsoft Surface Pro 4",
                "category": "Hardware",
                "description": "Microsoft Surface Pro 4 Tablet with keyboard",
                "barcode": "MSFT-SP4-001",
                "quantity_in_stock": 10,
                "min_stock_level": 2,
                "unit": "Stück"
            }
            
            response = self.session.post(
                f"{API_BASE}/inventory/items", 
                json=item_data,
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Inventory Item", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Inventory Item", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            self.test_item_id = data["item"]["id"]
            
            self.log_result(
                "Create Inventory Item", 
                True, 
                f"Successfully created inventory item with ID: {self.test_item_id}",
                data["item"]
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Inventory Item", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_order_valid(self):
        """Test POST /api/orders/create with valid data"""
        try:
            if not self.customer_token or not self.test_item_id:
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    "Customer token or test item ID not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.customer_token}"}
            order_data = {
                "location_code": "BERT01",
                "location_name": "Berlin Test Location",
                "items": [
                    {
                        "article_id": self.test_item_id,
                        "article_name": "Microsoft Surface Pro 4",
                        "category": "Hardware",
                        "quantity": 1,
                        "unit": "Stück"
                    }
                ],
                "notes": "Test order for order creation functionality"
            }
            
            response = self.session.post(
                f"{API_BASE}/orders/create", 
                json=order_data,
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            if "order" not in data:
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    "Response missing order object",
                    data
                )
                return False
            
            order = data["order"]
            self.created_order_id = order.get("id")
            
            # Validate order structure
            required_fields = ["id", "customer_email", "location_code", "items", "status", "order_date"]
            missing_fields = [field for field in required_fields if field not in order]
            if missing_fields:
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    f"Order missing required fields: {missing_fields}",
                    order
                )
                return False
            
            # Validate order details
            if order.get("customer_email") != "info@europcar.com":
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    f"Expected customer_email 'info@europcar.com', got '{order.get('customer_email')}'",
                    order
                )
                return False
            
            if order.get("status") != "pending":
                self.log_result(
                    "Create Order (Valid)", 
                    False, 
                    f"Expected status 'pending', got '{order.get('status')}'",
                    order
                )
                return False
            
            self.log_result(
                "Create Order (Valid)", 
                True, 
                f"Successfully created order with ID: {self.created_order_id}",
                order
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Order (Valid)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_verify_stock_reduction(self):
        """Verify that inventory stock was reduced after order creation"""
        try:
            if not self.admin_token or not self.test_item_id:
                self.log_result(
                    "Verify Stock Reduction", 
                    False, 
                    "Admin token or test item ID not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{API_BASE}/inventory/items/{self.test_item_id}",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Verify Stock Reduction", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Verify Stock Reduction", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            item = data.get("item", {})
            current_stock = item.get("quantity_in_stock", 0)
            
            # Stock should be 9 (was 10, ordered 1)
            if current_stock != 9:
                self.log_result(
                    "Verify Stock Reduction", 
                    False, 
                    f"Expected stock to be 9, got {current_stock}",
                    item
                )
                return False
            
            self.log_result(
                "Verify Stock Reduction", 
                True, 
                f"Stock correctly reduced to {current_stock}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Verify Stock Reduction", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_customer_orders(self):
        """Test GET /api/orders/list as customer"""
        try:
            if not self.customer_token:
                self.log_result(
                    "Get Customer Orders", 
                    False, 
                    "Customer token not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.customer_token}"}
            
            response = self.session.get(
                f"{API_BASE}/orders/list",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Get Customer Orders", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Customer Orders", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            orders = data.get("orders", [])
            
            # Should have at least our created order
            if len(orders) == 0:
                self.log_result(
                    "Get Customer Orders", 
                    False, 
                    "No orders found for customer",
                    data
                )
                return False
            
            # Check if our order is in the list
            order_found = False
            for order in orders:
                if order.get("id") == self.created_order_id:
                    order_found = True
                    break
            
            if not order_found:
                self.log_result(
                    "Get Customer Orders", 
                    False, 
                    f"Created order {self.created_order_id} not found in customer order list",
                    orders
                )
                return False
            
            self.log_result(
                "Get Customer Orders", 
                True, 
                f"Successfully retrieved {len(orders)} orders including created order"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Customer Orders", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_admin_orders(self):
        """Test GET /api/orders/list as admin"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Get Admin Orders", 
                    False, 
                    "Admin token not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{API_BASE}/orders/list",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Get Admin Orders", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Admin Orders", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            orders = data.get("orders", [])
            
            # Check if our order is in the admin list
            order_found = False
            for order in orders:
                if order.get("id") == self.created_order_id:
                    order_found = True
                    break
            
            if not order_found:
                self.log_result(
                    "Get Admin Orders", 
                    False, 
                    f"Created order {self.created_order_id} not found in admin order list",
                    orders
                )
                return False
            
            self.log_result(
                "Get Admin Orders", 
                True, 
                f"Successfully retrieved {len(orders)} orders including created order"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Admin Orders", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_order_insufficient_stock(self):
        """Test order creation with insufficient stock"""
        try:
            if not self.customer_token or not self.test_item_id:
                self.log_result(
                    "Create Order (Insufficient Stock)", 
                    False, 
                    "Customer token or test item ID not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.customer_token}"}
            order_data = {
                "location_code": "BERT01",
                "location_name": "Berlin Test Location",
                "items": [
                    {
                        "article_id": self.test_item_id,
                        "article_name": "Microsoft Surface Pro 4",
                        "category": "Hardware",
                        "quantity": 50,  # More than available stock (9)
                        "unit": "Stück"
                    }
                ],
                "notes": "Test order with insufficient stock"
            }
            
            response = self.session.post(
                f"{API_BASE}/orders/create", 
                json=order_data,
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Create Order (Insufficient Stock)", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Should return success=false with insufficient stock error
            if data.get("success") != False:
                self.log_result(
                    "Create Order (Insufficient Stock)", 
                    False, 
                    "Expected success=false for insufficient stock",
                    data
                )
                return False
            
            if data.get("error") != "insufficient_stock":
                self.log_result(
                    "Create Order (Insufficient Stock)", 
                    False, 
                    "Expected error='insufficient_stock'",
                    data
                )
                return False
            
            self.log_result(
                "Create Order (Insufficient Stock)", 
                True, 
                "Correctly rejected order due to insufficient stock",
                data
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Order (Insufficient Stock)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_order_invalid_item(self):
        """Test order creation with invalid item ID"""
        try:
            if not self.customer_token:
                self.log_result(
                    "Create Order (Invalid Item)", 
                    False, 
                    "Customer token not available"
                )
                return False
            
            headers = {"Authorization": f"Bearer {self.customer_token}"}
            order_data = {
                "location_code": "BERT01",
                "location_name": "Berlin Test Location",
                "items": [
                    {
                        "article_id": "invalid-item-id-12345",
                        "article_name": "Non-existent Item",
                        "category": "Hardware",
                        "quantity": 1,
                        "unit": "Stück"
                    }
                ],
                "notes": "Test order with invalid item"
            }
            
            response = self.session.post(
                f"{API_BASE}/orders/create", 
                json=order_data,
                headers=headers
            )
            
            if response.status_code != 404:
                self.log_result(
                    "Create Order (Invalid Item)", 
                    False, 
                    f"Expected status 404, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Create Order (Invalid Item)", 
                True, 
                "Correctly rejected order with invalid item ID (404)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Order (Invalid Item)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_create_order_no_shop_access(self):
        """Test order creation without shop access"""
        try:
            # Create a new customer without shop access
            register_data = {
                "email": "noshop@test.com",
                "password": "test123",
                "name": "No Shop Customer",
                "company": "Test Company",
                "role": "customer"
            }
            
            # Register customer
            self.session.post(f"{BACKEND_URL}/api/portal/auth/register", json=register_data)
            
            # Login as new customer
            login_data = {
                "email": "noshop@test.com",
                "password": "test123"
            }
            
            login_response = self.session.post(f"{BACKEND_URL}/api/portal/auth/login", json=login_data)
            
            if login_response.status_code != 200:
                self.log_result(
                    "Create Order (No Shop Access)", 
                    False, 
                    "Failed to login as test customer",
                    login_response.text
                )
                return False
            
            no_shop_token = login_response.json()["access_token"]
            
            headers = {"Authorization": f"Bearer {no_shop_token}"}
            order_data = {
                "location_code": "BERT01",
                "location_name": "Berlin Test Location",
                "items": [
                    {
                        "article_id": self.test_item_id,
                        "article_name": "Microsoft Surface Pro 4",
                        "category": "Hardware",
                        "quantity": 1,
                        "unit": "Stück"
                    }
                ],
                "notes": "Test order without shop access"
            }
            
            response = self.session.post(
                f"{API_BASE}/orders/create", 
                json=order_data,
                headers=headers
            )
            
            if response.status_code != 403:
                self.log_result(
                    "Create Order (No Shop Access)", 
                    False, 
                    f"Expected status 403, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Create Order (No Shop Access)", 
                True, 
                "Correctly rejected order from customer without shop access (403)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Order (No Shop Access)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all order API tests"""
        print("=" * 60)
        print("ORDER CREATION API TESTING SUITE")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        print()
        
        # Run all order API tests in sequence
        tests = [
            self.test_admin_authentication,
            self.test_customer_authentication,
            self.test_enable_shop_access,
            self.test_create_inventory_item,
            self.test_create_order_valid,
            self.test_verify_stock_reduction,
            self.test_get_customer_orders,
            self.test_get_admin_orders,
            self.test_create_order_insufficient_stock,
            self.test_create_order_invalid_item,
            self.test_create_order_no_shop_access
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"ORDER API TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed == total

if __name__ == "__main__":
    # Run Order API tests (focused on order creation functionality)
    order_tester = OrderAPITester()
    order_success = order_tester.run_all_tests()
    
    print("\n" + "=" * 60)
    print("OVERALL TEST SUMMARY")
    print("=" * 60)
    print(f"Order Creation API Tests: {'✅ PASSED' if order_success else '❌ FAILED'}")
    
    print(f"\nOverall Result: {'✅ ALL TESTS PASSED' if order_success else '❌ SOME TESTS FAILED'}")
    
    # Exit with appropriate code
    sys.exit(0 if order_success else 1)