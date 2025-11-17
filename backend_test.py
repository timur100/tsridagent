#!/usr/bin/env python3
"""
Backend API Testing for Customer Service Comprehensive Testing
Tests the newly created Customer Service (Port 8107) to ensure all endpoints are working correctly.
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://auth-identity-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
CUSTOMER_SERVICE_URL = "http://localhost:8107"

class OrderServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.order_service_session = requests.Session()
        self.order_service_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
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
    
    def test_order_service_health(self):
        """Test Order Service health endpoint"""
        try:
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Order Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if data.get("status") != "healthy" or data.get("service") != "Order Service":
                self.log_result(
                    "Order Service Health Check", 
                    False, 
                    f"Unexpected health response",
                    data
                )
                return False
            
            self.log_result(
                "Order Service Health Check", 
                True, 
                "Order Service is healthy"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Order Service Health Check", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_order_service_info(self):
        """Test Order Service info endpoint"""
        try:
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/info")
            
            if response.status_code != 200:
                self.log_result(
                    "Order Service Info", 
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
                    "Order Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service_name") != "Order Service":
                self.log_result(
                    "Order Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service_name')}",
                    data
                )
                return False
            
            self.log_result(
                "Order Service Info", 
                True, 
                f"Service info correct: {data.get('service_name')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Order Service Info", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_order_statistics(self):
        """Test Order Service statistics endpoint"""
        try:
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Order Statistics", 
                    False, 
                    f"Statistics endpoint failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["total", "by_status", "by_payment_status", "total_revenue"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Order Statistics", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            # Verify by_status structure
            status_fields = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
            by_status = data.get("by_status", {})
            missing_status = [field for field in status_fields if field not in by_status]
            
            if missing_status:
                self.log_result(
                    "Order Statistics", 
                    False, 
                    f"Missing status fields: {missing_status}",
                    data
                )
                return False
            
            # Verify by_payment_status structure
            payment_fields = ["paid", "unpaid"]
            by_payment_status = data.get("by_payment_status", {})
            missing_payment = [field for field in payment_fields if field not in by_payment_status]
            
            if missing_payment:
                self.log_result(
                    "Order Statistics", 
                    False, 
                    f"Missing payment status fields: {missing_payment}",
                    data
                )
                return False
            
            total = data.get("total", 0)
            pending = by_status.get("pending", 0)
            unpaid = by_payment_status.get("unpaid", 0)
            total_revenue = data.get("total_revenue", 0)
            
            self.log_result(
                "Order Statistics", 
                True, 
                f"Statistics retrieved: {total} total orders, {pending} pending, {unpaid} unpaid, €{total_revenue} revenue"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Order Statistics", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_orders(self):
        """Test GET /api/orders endpoint"""
        try:
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Orders", 
                    False, 
                    f"Get orders failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get All Orders", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Check order structure if orders exist
            if len(data) > 0:
                order = data[0]
                required_fields = ["id", "order_number", "customer_email", "items", "total_amount", "status"]
                missing_fields = [field for field in required_fields if field not in order]
                
                if missing_fields:
                    self.log_result(
                        "Get All Orders", 
                        False, 
                        f"Order missing required fields: {missing_fields}",
                        order
                    )
                    return False
                
                # Verify order_number format: ORD-YYYYMMDD-XXXX
                order_number = order.get("order_number", "")
                if not order_number.startswith("ORD-") or len(order_number) != 17:
                    self.log_result(
                        "Get All Orders", 
                        False, 
                        f"Invalid order number format: {order_number}, expected ORD-YYYYMMDD-XXXX",
                        order
                    )
                    return False
            
            self.log_result(
                "Get All Orders", 
                True, 
                f"Retrieved {len(data)} orders successfully"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get All Orders", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_order_by_number(self):
        """Test GET /api/orders/number/{order_number}"""
        try:
            # First, get all orders to find a valid order number
            orders_response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders")
            if orders_response.status_code != 200:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    f"Failed to get orders list for test setup. Status: {orders_response.status_code}",
                    orders_response.text
                )
                return False
            
            orders = orders_response.json()
            if not orders:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    "No orders found to test with",
                    None
                )
                return False
            
            # Use the first order's number
            test_order_number = orders[0].get("order_number")
            if not test_order_number:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    "First order missing order_number field",
                    orders[0]
                )
                return False
            
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders/number/{test_order_number}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    f"Get order by number failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an object (not array)
            if isinstance(data, list):
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    f"Response should be an object, not an array",
                    data
                )
                return False
            
            # Verify order_number matches
            if data.get("order_number") != test_order_number:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    f"Expected order_number {test_order_number}, got {data.get('order_number')}",
                    data
                )
                return False
            
            # Check required fields
            required_fields = ["id", "order_number", "customer_email", "items", "total_amount", "status"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Get Order by Number", 
                    False, 
                    f"Order missing required fields: {missing_fields}",
                    data
                )
                return False
            
            self.log_result(
                "Get Order by Number", 
                True, 
                f"Retrieved order {test_order_number} for customer {data.get('customer_email')}"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Order by Number", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_orders_by_customer(self):
        """Test GET /api/orders/customer/{customer_email}"""
        try:
            # First, get all orders to find a valid customer email
            orders_response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders")
            if orders_response.status_code != 200:
                self.log_result(
                    "Get Orders by Customer", 
                    False, 
                    f"Failed to get orders list for test setup. Status: {orders_response.status_code}",
                    orders_response.text
                )
                return False
            
            orders = orders_response.json()
            if not orders:
                self.log_result(
                    "Get Orders by Customer", 
                    False, 
                    "No orders found to test with",
                    None
                )
                return False
            
            # Use the first order's customer email
            test_customer_email = orders[0].get("customer_email")
            if not test_customer_email:
                self.log_result(
                    "Get Orders by Customer", 
                    False, 
                    "First order missing customer_email field",
                    orders[0]
                )
                return False
            
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders/customer/{test_customer_email}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Orders by Customer", 
                    False, 
                    f"Get orders by customer failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Get Orders by Customer", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all orders belong to the customer
            for order in data:
                if order.get("customer_email") != test_customer_email:
                    self.log_result(
                        "Get Orders by Customer", 
                        False, 
                        f"Order belongs to wrong customer: {order.get('customer_email')}",
                        order
                    )
                    return False
            
            self.log_result(
                "Get Orders by Customer", 
                True, 
                f"Found {len(data)} orders for customer {test_customer_email}"
            )
            return data
            
        except Exception as e:
            self.log_result(
                "Get Orders by Customer", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_update_order_status(self):
        """Test updating order status"""
        try:
            # First, get all orders to find one to update
            orders_response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders")
            if orders_response.status_code != 200:
                self.log_result(
                    "Update Order Status", 
                    False, 
                    f"Failed to get orders list for test setup. Status: {orders_response.status_code}",
                    orders_response.text
                )
                return False
            
            orders = orders_response.json()
            if not orders:
                self.log_result(
                    "Update Order Status", 
                    False, 
                    "No orders found to test with",
                    None
                )
                return False
            
            # Use the first order
            test_order = orders[0]
            order_id = test_order.get("id")
            original_status = test_order.get("status")
            
            if not order_id:
                self.log_result(
                    "Update Order Status", 
                    False, 
                    "First order missing id field",
                    test_order
                )
                return False
            
            # Update status to 'confirmed'
            new_status = "confirmed" if original_status != "confirmed" else "processing"
            update_data = {"status": new_status}
            
            response = self.order_service_session.put(
                f"{ORDER_SERVICE_URL}/api/orders/{order_id}", 
                json=update_data
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Update Order Status", 
                    False, 
                    f"Update order failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify status was updated
            if data.get("status") != new_status:
                self.log_result(
                    "Update Order Status", 
                    False, 
                    f"Status not updated. Expected: {new_status}, Got: {data.get('status')}",
                    data
                )
                return False
            
            self.log_result(
                "Update Order Status", 
                True, 
                f"Successfully updated order {order_id} status from {original_status} to {new_status}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Update Order Status", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_filter_orders(self):
        """Test filtering orders by status"""
        try:
            # Test filter by status=pending
            response = self.order_service_session.get(f"{ORDER_SERVICE_URL}/api/orders?status=pending")
            
            if response.status_code != 200:
                self.log_result(
                    "Filter Orders", 
                    False, 
                    f"Filter by status failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response is an array
            if not isinstance(data, list):
                self.log_result(
                    "Filter Orders", 
                    False, 
                    f"Response is not an array. Type: {type(data)}",
                    data
                )
                return False
            
            # Verify all orders have status = pending
            for order in data:
                if order.get("status") != "pending":
                    self.log_result(
                        "Filter Orders", 
                        False, 
                        f"Order has wrong status: {order.get('status')}",
                        order
                    )
                    return False
            
            self.log_result(
                "Filter Orders", 
                True, 
                f"Status filter working: {len(data)} pending orders found"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Filter Orders", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_service_registration(self):
        """Test that Order Service appears in /api/portal/services"""
        try:
            response = self.session.get(f"{API_BASE}/portal/services")
            
            if response.status_code != 200:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"Failed to get services. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Look for order service
            order_service = None
            for service in data:
                if service.get('service_type') == 'order':
                    order_service = service
                    break
            
            if not order_service:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    "Order Service not found in services list",
                    data
                )
                return False
            
            # Check position (should be 6th after auth, id_verification, device, location, inventory)
            service_types = [s.get('service_type') for s in data]
            order_position = service_types.index('order') if 'order' in service_types else -1
            
            # The Order Service should be at position 5 (0-indexed)
            expected_position = 5
            if order_position != expected_position:
                self.log_result(
                    "Service Registration Verification", 
                    False, 
                    f"Order Service at position {order_position}, expected position {expected_position}",
                    service_types
                )
                return False
            
            self.log_result(
                "Service Registration Verification", 
                True, 
                f"Order Service found at correct position {expected_position} with service_type='order'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Service Registration Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_mongodb_summary(self):
        """Test MongoDB integration shows order_db"""
        try:
            response = self.session.get(f"{API_BASE}/portal/mongodb-summary?service_type=order")
            
            if response.status_code != 200:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"MongoDB summary failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # The API returns a list of services, find the order service
            order_service_info = None
            if isinstance(data, list):
                for service in data:
                    if service.get("service_id") == "order_service_001":
                        order_service_info = service
                        break
            else:
                order_service_info = data
            
            if not order_service_info:
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Order service not found in MongoDB summary",
                    data
                )
                return False
            
            mongodb_info = order_service_info.get("mongodb_info", {})
            
            # Verify database name
            if mongodb_info.get("database_name") != "order_db":
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    f"Wrong database name: {mongodb_info.get('database_name')}, expected 'order_db'",
                    mongodb_info
                )
                return False
            
            # Verify collections exist
            collections = mongodb_info.get("collections", [])
            if not any(col.get("name") == "orders" for col in collections):
                self.log_result(
                    "MongoDB Summary", 
                    False, 
                    "Orders collection not found",
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
        """Run all order service tests"""
        print("=" * 70)
        print("ORDER SERVICE COMPREHENSIVE TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Order Service URL: {ORDER_SERVICE_URL}")
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
        
        # Step 1: Test Order Service Health & Info
        print("🔍 STEP 1: Testing Order Service Health & Info...")
        if not self.test_order_service_health():
            print("❌ Order service health check failed.")
        
        if not self.test_order_service_info():
            print("❌ Order service info failed.")
        
        # Step 2: Test Order Statistics
        print("\n🔍 STEP 2: Testing Order Statistics...")
        stats = self.test_order_statistics()
        if not stats:
            print("❌ Order statistics failed.")
        
        # Step 3: Test Get All Orders
        print("\n🔍 STEP 3: Testing Get All Orders...")
        orders = self.test_get_all_orders()
        if orders is False:
            print("❌ Get all orders failed.")
        
        # Step 4: Test Get Order by Number
        print("\n🔍 STEP 4: Testing Get Order by Number...")
        if not self.test_get_order_by_number():
            print("❌ Get order by number failed.")
        
        # Step 5: Test Get Orders by Customer
        print("\n🔍 STEP 5: Testing Get Orders by Customer...")
        if not self.test_get_orders_by_customer():
            print("❌ Get orders by customer failed.")
        
        # Step 6: Test Update Order Status
        print("\n🔍 STEP 6: Testing Update Order Status...")
        if not self.test_update_order_status():
            print("❌ Update order status failed.")
        
        # Step 7: Test Filter Orders
        print("\n🔍 STEP 7: Testing Filter Orders...")
        if not self.test_filter_orders():
            print("❌ Filter orders failed.")
        
        # Step 8: Test Service Registration
        print("\n🔍 STEP 8: Testing Service Registration...")
        if not self.test_service_registration():
            print("❌ Service registration verification failed.")
        
        # Step 9: Test MongoDB Summary
        print("\n🔍 STEP 9: Testing MongoDB Summary...")
        if not self.test_mongodb_summary():
            print("❌ MongoDB summary failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("ORDER SERVICE TESTING SUMMARY")
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
    print("Starting Order Service Comprehensive Testing...")
    print()
    
    # Test Order Service
    tester = OrderServiceTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Order Service Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 ORDER SERVICE TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ ORDER SERVICE TESTING FOUND ISSUES!")
        sys.exit(1)