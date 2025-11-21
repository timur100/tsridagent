#!/usr/bin/env python3
"""
Order Number Generation Testing Suite
Tests the new order number generation system specifically
"""

import requests
import json
import sys
import re
from typing import Dict, Any, List
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://portal-live.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class OrderNumberTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.customer_token = None
        self.created_order_ids = []
        self.existing_item_id = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data and isinstance(response_data, dict):
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_customer(self):
        """Authenticate as customer user"""
        try:
            login_data = {
                "email": "info@europcar.com",
                "password": "europcar123"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.customer_token = data.get("access_token")
                self.session.headers.update({
                    'Authorization': f'Bearer {self.customer_token}'
                })
                self.log_result(
                    "Customer Authentication", 
                    True, 
                    "Successfully authenticated as info@europcar.com"
                )
                return True
            else:
                self.log_result(
                    "Customer Authentication", 
                    False, 
                    f"Failed to authenticate customer. Status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Customer Authentication", 
                False, 
                f"Exception during customer authentication: {str(e)}"
            )
            return False
    
    def get_existing_inventory_item(self):
        """Get an existing inventory item for testing"""
        try:
            if not self.customer_token:
                return False
            
            response = self.session.get(f"{API_BASE}/inventory/items/available")
            
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                
                if len(items) > 0:
                    # Use the first available item
                    self.existing_item_id = items[0].get("id")
                    self.log_result(
                        "Get Existing Inventory Item", 
                        True, 
                        f"Found existing item: {items[0].get('name')} with {items[0].get('quantity_in_stock')} units"
                    )
                    return True
                else:
                    self.log_result(
                        "Get Existing Inventory Item", 
                        False, 
                        "No available inventory items found"
                    )
                    return False
            else:
                self.log_result(
                    "Get Existing Inventory Item", 
                    False, 
                    f"Failed to get inventory items. Status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Get Existing Inventory Item", 
                False, 
                f"Exception getting inventory item: {str(e)}"
            )
            return False
    
    def test_create_order_with_order_number(self):
        """Test creating order and verify order number format BE.YYYYMMDD.XXX"""
        try:
            if not self.customer_token or not self.existing_item_id:
                return False
            
            # Get item details first
            item_response = self.session.get(f"{API_BASE}/inventory/items/available")
            if item_response.status_code != 200:
                return False
            
            items_data = item_response.json()
            test_item = None
            for item in items_data.get("items", []):
                if item.get("id") == self.existing_item_id:
                    test_item = item
                    break
            
            if not test_item:
                return False
            
            order_data = {
                "location_code": "BERN01",
                "location_name": "BERN01 - BERNAU BEI BERLIN",
                "items": [
                    {
                        "article_id": test_item["id"],
                        "article_name": test_item["name"],
                        "category": test_item["category"],
                        "quantity": 1,
                        "unit": test_item.get("unit", "Stück")
                    }
                ],
                "notes": "Test order for order number generation"
            }
            
            response = self.session.post(f"{API_BASE}/orders/create", json=order_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    "Order creation failed",
                    data
                )
                return False
            
            order = data.get("order")
            if not order:
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    "No order object in response",
                    data
                )
                return False
            
            # Verify order number format: BE.YYYYMMDD.XXX
            order_number = order.get("order_number")
            if not order_number:
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    "Order number missing from response",
                    order
                )
                return False
            
            # Check format
            pattern = r'^BE\.\d{8}\.\d{3}$'
            if not re.match(pattern, order_number):
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    f"Order number format incorrect. Expected BE.YYYYMMDD.XXX, got: {order_number}",
                    order
                )
                return False
            
            # Verify date part matches today
            today = datetime.now().strftime('%Y%m%d')
            if not order_number.startswith(f"BE.{today}"):
                self.log_result(
                    "Create Order with Order Number", 
                    False, 
                    f"Order number date incorrect. Expected BE.{today}.XXX, got: {order_number}",
                    order
                )
                return False
            
            # Store order ID for later tests
            self.created_order_ids.append(order.get("id"))
            
            self.log_result(
                "Create Order with Order Number", 
                True, 
                f"Successfully created order with correct format: {order_number}",
                {"order_id": order.get("id"), "order_number": order_number}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Create Order with Order Number", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_sequential_order_numbering(self):
        """Test creating multiple orders on same day for sequential numbering"""
        try:
            if not self.customer_token or not self.existing_item_id:
                return False
            
            # Get item details first
            item_response = self.session.get(f"{API_BASE}/inventory/items/available")
            if item_response.status_code != 200:
                return False
            
            items_data = item_response.json()
            test_item = None
            for item in items_data.get("items", []):
                if item.get("id") == self.existing_item_id:
                    test_item = item
                    break
            
            if not test_item:
                return False
            
            created_orders = []
            
            # Create 3 orders
            for i in range(3):
                order_data = {
                    "location_code": "BERN01",
                    "location_name": "BERN01 - BERNAU BEI BERLIN",
                    "items": [
                        {
                            "article_id": test_item["id"],
                            "article_name": test_item["name"],
                            "category": test_item["category"],
                            "quantity": 1,
                            "unit": test_item.get("unit", "Stück")
                        }
                    ],
                    "notes": f"Sequential test order #{i+1}"
                }
                
                response = self.session.post(f"{API_BASE}/orders/create", json=order_data)
                
                if response.status_code != 200:
                    self.log_result(
                        "Sequential Order Numbering", 
                        False, 
                        f"Failed to create order #{i+1}. Status: {response.status_code}",
                        response.text
                    )
                    return False
                
                data = response.json()
                if not data.get("success"):
                    self.log_result(
                        "Sequential Order Numbering", 
                        False, 
                        f"Order #{i+1} creation failed",
                        data
                    )
                    return False
                
                order = data.get("order")
                created_orders.append(order)
                self.created_order_ids.append(order.get("id"))
            
            # Verify sequential numbering
            order_numbers = [order.get("order_number") for order in created_orders]
            
            # Extract sequence numbers
            sequences = []
            for order_number in order_numbers:
                try:
                    seq = int(order_number.split(".")[-1])
                    sequences.append(seq)
                except (ValueError, IndexError):
                    self.log_result(
                        "Sequential Order Numbering", 
                        False, 
                        f"Invalid order number format: {order_number}",
                        order_numbers
                    )
                    return False
            
            # Check if sequences are consecutive
            sequences.sort()
            for i in range(1, len(sequences)):
                if sequences[i] != sequences[i-1] + 1:
                    self.log_result(
                        "Sequential Order Numbering", 
                        False, 
                        f"Non-sequential order numbers: {order_numbers}",
                        {"sequences": sequences}
                    )
                    return False
            
            self.log_result(
                "Sequential Order Numbering", 
                True, 
                f"Successfully created 3 orders with sequential numbering: {order_numbers}",
                {"order_numbers": order_numbers, "sequences": sequences}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Sequential Order Numbering", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_order_retrieval_with_order_number(self):
        """Test retrieving orders and verify order_number field is present"""
        try:
            if not self.customer_token:
                return False
            
            response = self.session.get(f"{API_BASE}/orders/list")
            
            if response.status_code != 200:
                self.log_result(
                    "Order Retrieval with Order Number", 
                    False, 
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Order Retrieval with Order Number", 
                    False, 
                    "Failed to get orders list",
                    data
                )
                return False
            
            orders = data.get("orders", [])
            if len(orders) == 0:
                self.log_result(
                    "Order Retrieval with Order Number", 
                    False, 
                    "No orders found in list",
                    data
                )
                return False
            
            # Check if any orders have order_number field
            orders_with_number = [order for order in orders if order.get("order_number")]
            
            if len(orders_with_number) == 0:
                self.log_result(
                    "Order Retrieval with Order Number", 
                    False, 
                    f"None of the {len(orders)} orders have order_number field",
                    {"sample_order": orders[0] if orders else None}
                )
                return False
            
            # Verify the order number format for orders that have it
            valid_format_count = 0
            for order in orders_with_number:
                order_number = order.get("order_number")
                pattern = r'^BE\.\d{8}\.\d{3}$'
                if re.match(pattern, order_number):
                    valid_format_count += 1
            
            # Verify required fields are present
            sample_order = orders_with_number[0]
            required_fields = [
                "id", "order_number", "customer_email", "location_code", 
                "location_name", "items", "status", "order_date"
            ]
            
            missing_fields = [field for field in required_fields if field not in sample_order]
            if missing_fields:
                self.log_result(
                    "Order Retrieval with Order Number", 
                    False, 
                    f"Order missing required fields: {missing_fields}",
                    sample_order
                )
                return False
            
            # Verify items array has required fields
            items = sample_order.get("items", [])
            if len(items) > 0:
                item = items[0]
                required_item_fields = ["article_name", "category", "quantity", "unit"]
                missing_item_fields = [field for field in required_item_fields if field not in item]
                if missing_item_fields:
                    self.log_result(
                        "Order Retrieval with Order Number", 
                        False, 
                        f"Order item missing required fields: {missing_item_fields}",
                        item
                    )
                    return False
            
            self.log_result(
                "Order Retrieval with Order Number", 
                True, 
                f"Successfully retrieved {len(orders_with_number)} orders with order numbers (out of {len(orders)} total). {valid_format_count} have valid format.",
                {
                    "total_orders": len(orders), 
                    "orders_with_numbers": len(orders_with_number),
                    "valid_format_count": valid_format_count,
                    "sample_order_number": sample_order.get("order_number")
                }
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Order Retrieval with Order Number", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all order number generation tests"""
        print("=" * 60)
        print("ORDER NUMBER GENERATION TESTING SUITE")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        print()
        
        # Setup tests
        setup_tests = [
            self.authenticate_customer,
            self.get_existing_inventory_item
        ]
        
        for test in setup_tests:
            if not test():
                print("❌ Setup failed. Stopping order number tests.")
                return False
        
        # Main tests
        tests = [
            self.test_create_order_with_order_number,
            self.test_sequential_order_numbering,
            self.test_order_retrieval_with_order_number
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"ORDER NUMBER TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed == total

if __name__ == "__main__":
    # Run Order Number Generation Testing Suite
    print("🚀 Starting Order Number Generation Testing Suite")
    print("=" * 80)
    
    # Test Order Number Generation
    tester = OrderNumberTester()
    passed = tester.run_all_tests()
    
    print("\n" + "=" * 80)
    print("🏁 FINAL RESULTS")
    print("=" * 80)
    
    if passed:
        print("✅ ALL ORDER NUMBER TESTS PASSED! Order number generation system is working correctly.")
        sys.exit(0)
    else:
        print("❌ SOME ORDER NUMBER TESTS FAILED! Check the details above.")
        sys.exit(1)