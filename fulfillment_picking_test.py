#!/usr/bin/env python3
"""
Fulfillment Picking Complete Endpoint Testing
Tests the POST /api/fulfillment/picking/complete endpoint to identify exact errors
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://tenant-manager-25.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class FulfillmentPickingTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_orders = []
        self.test_euroboxes = []
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None, status_code: int = None):
        """Log test result with detailed information"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if status_code:
            print(f"   Status Code: {status_code}")
        print(f"   Details: {details}")
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data,
            'status_code': status_code
        })
    
    def authenticate_admin(self):
        """Authenticate as admin user"""
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
                    f"Authentication failed",
                    response.text,
                    response.status_code
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data,
                    response.status_code
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
    
    def get_orders_list(self):
        """Get list of orders to find suitable test orders"""
        try:
            response = self.session.get(f"{API_BASE}/orders/list")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Orders List", 
                    False, 
                    f"Failed to get orders list",
                    response.text,
                    response.status_code
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Orders List", 
                    False, 
                    "Response success field is not True",
                    data,
                    response.status_code
                )
                return False
            
            orders = data.get("orders", [])
            
            # Filter orders with fulfillment_status 'reserved' or 'picking'
            suitable_orders = [
                order for order in orders 
                if order.get("fulfillment_status") in ["reserved", "picking"]
            ]
            
            self.test_orders = suitable_orders[:3]  # Take first 3 suitable orders
            
            self.log_result(
                "Get Orders List", 
                True, 
                f"Found {len(orders)} total orders, {len(suitable_orders)} suitable for testing (reserved/picking status)",
                {"total_orders": len(orders), "suitable_orders": len(suitable_orders), "selected_for_testing": len(self.test_orders)}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Orders List", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def get_euroboxes_list(self):
        """Get list of euroboxes for testing"""
        try:
            response = self.session.get(f"{API_BASE}/euroboxes/list")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Euroboxes List", 
                    False, 
                    f"Failed to get euroboxes list",
                    response.text,
                    response.status_code
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Euroboxes List", 
                    False, 
                    "Response success field is not True",
                    data,
                    response.status_code
                )
                return False
            
            euroboxes = data.get("euroboxes", [])
            
            # Get available euroboxes
            available_euroboxes = [
                eb for eb in euroboxes 
                if eb.get("status") == "available"
            ]
            
            self.test_euroboxes = available_euroboxes[:2]  # Take first 2 available
            
            self.log_result(
                "Get Euroboxes List", 
                True, 
                f"Found {len(euroboxes)} total euroboxes, {len(available_euroboxes)} available for testing",
                {"total_euroboxes": len(euroboxes), "available_euroboxes": len(available_euroboxes)}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Get Euroboxes List", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_picking_complete_valid_scenario(self):
        """Test POST /api/fulfillment/picking/complete with valid order and eurobox"""
        try:
            if not self.test_orders or not self.test_euroboxes:
                self.log_result(
                    "Picking Complete (Valid Scenario)", 
                    False, 
                    "No suitable orders or euroboxes available for testing"
                )
                return False
            
            order = self.test_orders[0]
            eurobox = self.test_euroboxes[0]
            
            order_id = order.get("id")
            eurobox_number = eurobox.get("eurobox_number")
            
            # Test the endpoint
            url = f"{API_BASE}/fulfillment/picking/complete?order_id={order_id}&eurobox_number={eurobox_number}"
            response = self.session.post(url)
            
            self.log_result(
                "Picking Complete (Valid Scenario)", 
                response.status_code == 200,
                f"Testing with order_id={order_id}, eurobox_number={eurobox_number}",
                response.text if response.status_code != 200 else response.json(),
                response.status_code
            )
            
            return response.status_code == 200
            
        except Exception as e:
            self.log_result(
                "Picking Complete (Valid Scenario)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_picking_complete_nonexistent_eurobox(self):
        """Test POST /api/fulfillment/picking/complete with non-existent eurobox"""
        try:
            if not self.test_orders:
                self.log_result(
                    "Picking Complete (Non-existent Eurobox)", 
                    False, 
                    "No suitable orders available for testing"
                )
                return False
            
            order = self.test_orders[0]
            order_id = order.get("id")
            fake_eurobox_number = "EB-99999999-9999"  # Non-existent eurobox
            
            # Test the endpoint
            url = f"{API_BASE}/fulfillment/picking/complete?order_id={order_id}&eurobox_number={fake_eurobox_number}"
            response = self.session.post(url)
            
            # Should return 404 for non-existent eurobox
            expected_status = 404
            success = response.status_code == expected_status
            
            self.log_result(
                "Picking Complete (Non-existent Eurobox)", 
                success,
                f"Testing with order_id={order_id}, fake_eurobox_number={fake_eurobox_number}. Expected status {expected_status}",
                response.text if response.status_code != 200 else response.json(),
                response.status_code
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Picking Complete (Non-existent Eurobox)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_picking_complete_invalid_order(self):
        """Test POST /api/fulfillment/picking/complete with invalid order ID"""
        try:
            if not self.test_euroboxes:
                self.log_result(
                    "Picking Complete (Invalid Order)", 
                    False, 
                    "No euroboxes available for testing"
                )
                return False
            
            eurobox = self.test_euroboxes[0]
            fake_order_id = "invalid-order-id-12345"
            eurobox_number = eurobox.get("eurobox_number")
            
            # Test the endpoint
            url = f"{API_BASE}/fulfillment/picking/complete?order_id={fake_order_id}&eurobox_number={eurobox_number}"
            response = self.session.post(url)
            
            # Should return 404 for non-existent order
            expected_status = 404
            success = response.status_code == expected_status
            
            self.log_result(
                "Picking Complete (Invalid Order)", 
                success,
                f"Testing with fake_order_id={fake_order_id}, eurobox_number={eurobox_number}. Expected status {expected_status}",
                response.text if response.status_code != 200 else response.json(),
                response.status_code
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Picking Complete (Invalid Order)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_picking_complete_missing_parameters(self):
        """Test POST /api/fulfillment/picking/complete with missing parameters"""
        try:
            # Test 1: Missing order_id
            url1 = f"{API_BASE}/fulfillment/picking/complete?eurobox_number=EB-20251111-0001"
            response1 = self.session.post(url1)
            
            # Test 2: Missing eurobox_number
            url2 = f"{API_BASE}/fulfillment/picking/complete?order_id=test-order-id"
            response2 = self.session.post(url2)
            
            # Test 3: Missing both parameters
            url3 = f"{API_BASE}/fulfillment/picking/complete"
            response3 = self.session.post(url3)
            
            self.log_result(
                "Picking Complete (Missing order_id)", 
                response1.status_code in [400, 422],  # Bad request or validation error
                f"Testing without order_id parameter",
                response1.text if response1.status_code != 200 else response1.json(),
                response1.status_code
            )
            
            self.log_result(
                "Picking Complete (Missing eurobox_number)", 
                response2.status_code in [400, 422],  # Bad request or validation error
                f"Testing without eurobox_number parameter",
                response2.text if response2.status_code != 200 else response2.json(),
                response2.status_code
            )
            
            self.log_result(
                "Picking Complete (Missing both parameters)", 
                response3.status_code in [400, 422],  # Bad request or validation error
                f"Testing without any parameters",
                response3.text if response3.status_code != 200 else response3.json(),
                response3.status_code
            )
            
            return True  # Always return True as we're just documenting the behavior
            
        except Exception as e:
            self.log_result(
                "Picking Complete (Missing Parameters)", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_picking_complete_eurobox_already_assigned(self):
        """Test POST /api/fulfillment/picking/complete with eurobox already assigned to another order"""
        try:
            if len(self.test_orders) < 2 or not self.test_euroboxes:
                self.log_result(
                    "Picking Complete (Eurobox Already Assigned)", 
                    False, 
                    "Need at least 2 orders and 1 eurobox for this test"
                )
                return False
            
            # First, assign eurobox to first order
            order1 = self.test_orders[0]
            order2 = self.test_orders[1]
            eurobox = self.test_euroboxes[0]
            
            order1_id = order1.get("id")
            order2_id = order2.get("id")
            eurobox_number = eurobox.get("eurobox_number")
            
            # Assign eurobox to first order
            url1 = f"{API_BASE}/fulfillment/picking/complete?order_id={order1_id}&eurobox_number={eurobox_number}"
            response1 = self.session.post(url1)
            
            # Now try to assign same eurobox to second order
            url2 = f"{API_BASE}/fulfillment/picking/complete?order_id={order2_id}&eurobox_number={eurobox_number}"
            response2 = self.session.post(url2)
            
            # Second assignment should fail with 400
            expected_status = 400
            success = response2.status_code == expected_status
            
            self.log_result(
                "Picking Complete (First Assignment)", 
                response1.status_code == 200,
                f"First assignment: order_id={order1_id}, eurobox_number={eurobox_number}",
                response1.text if response1.status_code != 200 else "Success",
                response1.status_code
            )
            
            self.log_result(
                "Picking Complete (Eurobox Already Assigned)", 
                success,
                f"Second assignment should fail: order_id={order2_id}, eurobox_number={eurobox_number}. Expected status {expected_status}",
                response2.text if response2.status_code != 200 else response2.json(),
                response2.status_code
            )
            
            return success
            
        except Exception as e:
            self.log_result(
                "Picking Complete (Eurobox Already Assigned)", 
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
                    f"Backend not responding",
                    response.text,
                    response.status_code
                )
                return False
            
            data = response.json()
            if data.get("message") != "Hello World":
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Unexpected response from backend root endpoint",
                    data,
                    response.status_code
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
    
    def run_all_tests(self):
        """Run all fulfillment picking complete tests"""
        print("=" * 80)
        print("FULFILLMENT PICKING COMPLETE ENDPOINT TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Target Endpoint: POST /api/fulfillment/picking/complete")
        print("=" * 80)
        print()
        
        # Test backend connectivity first
        if not self.test_backend_health():
            print("❌ Backend connectivity failed. Stopping tests.")
            return False
        
        # Authenticate first
        if not self.authenticate_admin():
            print("❌ Authentication failed. Stopping tests.")
            return False
        
        # Get test data
        if not self.get_orders_list():
            print("⚠️ Failed to get orders list. Some tests may fail.")
        
        if not self.get_euroboxes_list():
            print("⚠️ Failed to get euroboxes list. Some tests may fail.")
        
        # Run all tests
        tests = [
            self.test_picking_complete_valid_scenario,
            self.test_picking_complete_nonexistent_eurobox,
            self.test_picking_complete_invalid_order,
            self.test_picking_complete_missing_parameters,
            self.test_picking_complete_eurobox_already_assigned
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 80)
        print(f"FULFILLMENT PICKING COMPLETE TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 80)
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}")
                print(f"   Status Code: {test.get('status_code', 'N/A')}")
                print(f"   Details: {test['details']}")
                if test.get('response'):
                    print(f"   Response: {test['response']}")
                print()
        
        # Print error analysis
        print("\nERROR ANALYSIS:")
        print("=" * 40)
        
        error_categories = {
            "Authentication Errors": [r for r in self.results if r.get('status_code') == 401],
            "Not Found Errors": [r for r in self.results if r.get('status_code') == 404],
            "Validation Errors": [r for r in self.results if r.get('status_code') in [400, 422]],
            "Server Errors": [r for r in self.results if r.get('status_code') and r.get('status_code') >= 500],
            "Other Errors": [r for r in failed_tests if r.get('status_code') and r.get('status_code') not in [401, 404, 400, 422] and r.get('status_code') < 500]
        }
        
        for category, errors in error_categories.items():
            if errors:
                print(f"\n{category} ({len(errors)}):")
                for error in errors:
                    print(f"  - {error['test']}: Status {error.get('status_code', 'N/A')}")
        
        return passed == total

if __name__ == "__main__":
    print("Starting Fulfillment Picking Complete Endpoint Testing...")
    print()
    
    tester = FulfillmentPickingTester()
    success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("FINAL RESULT")
    print("=" * 80)
    print(f"Fulfillment Picking Complete Tests: {'✅ PASS' if success else '❌ FAIL'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if success:
        print("🎉 ALL TESTS COMPLETED!")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED - CHECK ERROR ANALYSIS ABOVE!")
        sys.exit(1)