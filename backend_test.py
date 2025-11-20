#!/usr/bin/env python3
"""
WebSocket Backend Authentication Fix Verification
Tests WebSocket backend infrastructure after authentication bug fix.
Verifies WebSocket connections, JWT authentication, multi-tenant rooms, heartbeat mechanism, and message broadcasting.
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

# Backend URL from environment
BACKEND_URL = "https://live-device-sync.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api"

class WebSocketBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar tenant ID for testing
        self.websocket_connections = []
        
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

    async def test_websocket_connection_with_valid_token(self):
        """Test WebSocket connection with valid JWT token"""
        try:
            if not self.admin_token:
                self.log_result(
                    "WebSocket Connection with Valid Token",
                    False,
                    "No admin token available"
                )
                return False
            
            ws_url = f"{WS_BASE}/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            # Connect to WebSocket
            websocket = await websockets.connect(ws_url)
            self.websocket_connections.append(websocket)
            
            # Wait for connection_established message
            message = await asyncio.wait_for(websocket.recv(), timeout=10)
            data = json.loads(message)
            
            # Verify connection_established message
            if data.get("type") != "connection_established":
                self.log_result(
                    "WebSocket Connection with Valid Token",
                    False,
                    f"Expected connection_established message, got: {data.get('type')}"
                )
                return False
            
            if data.get("tenant_id") != self.test_tenant_id:
                self.log_result(
                    "WebSocket Connection with Valid Token",
                    False,
                    f"Expected tenant_id {self.test_tenant_id}, got: {data.get('tenant_id')}"
                )
                return False
            
            # Verify timestamp is present and valid
            timestamp = data.get("timestamp")
            if not timestamp:
                self.log_result(
                    "WebSocket Connection with Valid Token",
                    False,
                    "Missing timestamp in connection_established message"
                )
                return False
            
            self.log_result(
                "WebSocket Connection with Valid Token",
                True,
                f"Successfully connected to WebSocket, received connection_established message with tenant_id={data.get('tenant_id')} and timestamp={timestamp}"
            )
            return True
            
        except asyncio.TimeoutError:
            self.log_result(
                "WebSocket Connection with Valid Token",
                False,
                "Timeout waiting for connection_established message"
            )
            return False
        except Exception as e:
            self.log_result(
                "WebSocket Connection with Valid Token",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def test_heartbeat_ping_pong(self):
        """Test heartbeat/ping-pong mechanism"""
        try:
            if not self.websocket_connections:
                self.log_result(
                    "Heartbeat/Ping-Pong Mechanism",
                    False,
                    "No active WebSocket connection"
                )
                return False
            
            websocket = self.websocket_connections[0]
            
            # Wait for ping message (server sends ping every 30 seconds, but we'll wait up to 35 seconds)
            ping_received = False
            start_time = time.time()
            
            while time.time() - start_time < 35:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5)
                    data = json.loads(message)
                    
                    if data.get("type") == "ping":
                        ping_received = True
                        timestamp = data.get("timestamp")
                        
                        # Send pong response
                        pong_message = {
                            "type": "pong",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        await websocket.send(json.dumps(pong_message))
                        
                        self.log_result(
                            "Heartbeat/Ping-Pong Mechanism",
                            True,
                            f"Successfully received ping message with timestamp={timestamp} and sent pong response"
                        )
                        return True
                        
                except asyncio.TimeoutError:
                    # Continue waiting
                    continue
                except Exception as e:
                    self.log_result(
                        "Heartbeat/Ping-Pong Mechanism",
                        False,
                        f"Error during ping-pong test: {str(e)}"
                    )
                    return False
            
            if not ping_received:
                self.log_result(
                    "Heartbeat/Ping-Pong Mechanism",
                    False,
                    "No ping message received within 35 seconds"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Heartbeat/Ping-Pong Mechanism",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_websocket_stats_endpoint(self):
        """Test WebSocket stats endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/ws/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "WebSocket Stats Endpoint",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "WebSocket Stats Endpoint",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check required fields
            required_fields = ["total_connections", "active_tenant_rooms", "tenant_connections"]
            for field in required_fields:
                if field not in data:
                    self.log_result(
                        "WebSocket Stats Endpoint",
                        False,
                        f"Missing required field: {field}",
                        data
                    )
                    return False
            
            total_connections = data.get("total_connections", 0)
            active_rooms = data.get("active_tenant_rooms", 0)
            tenant_connections = data.get("tenant_connections", {})
            
            self.log_result(
                "WebSocket Stats Endpoint",
                True,
                f"Stats endpoint working: {total_connections} total connections, {active_rooms} active tenant rooms, tenant connections: {tenant_connections}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "WebSocket Stats Endpoint",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def test_multi_tenant_room_management(self):
        """Test multi-tenant room management"""
        try:
            if not self.admin_token:
                self.log_result(
                    "Multi-Tenant Room Management",
                    False,
                    "No admin token available"
                )
                return False
            
            # Connect multiple clients to the same tenant room
            ws_url = f"{WS_BASE}/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            # Connect first client
            websocket1 = await websockets.connect(ws_url)
            self.websocket_connections.append(websocket1)
            
            # Wait for connection_established message
            message1 = await asyncio.wait_for(websocket1.recv(), timeout=10)
            data1 = json.loads(message1)
            
            # Connect second client
            websocket2 = await websockets.connect(ws_url)
            self.websocket_connections.append(websocket2)
            
            # Wait for connection_established message
            message2 = await asyncio.wait_for(websocket2.recv(), timeout=10)
            data2 = json.loads(message2)
            
            # Verify both connections received connection_established
            if data1.get("type") != "connection_established" or data2.get("type") != "connection_established":
                self.log_result(
                    "Multi-Tenant Room Management",
                    False,
                    "One or both connections did not receive connection_established message"
                )
                return False
            
            # Check WebSocket stats to verify multiple connections
            stats_response = self.session.get(f"{API_BASE}/ws/stats")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                total_connections = stats_data.get("total_connections", 0)
                tenant_connections = stats_data.get("tenant_connections", {}).get(self.test_tenant_id, 0)
                
                if total_connections >= 2 and tenant_connections >= 2:
                    self.log_result(
                        "Multi-Tenant Room Management",
                        True,
                        f"Successfully connected multiple clients to tenant room. Total connections: {total_connections}, Tenant {self.test_tenant_id} connections: {tenant_connections}"
                    )
                    return True
                else:
                    self.log_result(
                        "Multi-Tenant Room Management",
                        False,
                        f"Expected at least 2 connections, got total: {total_connections}, tenant: {tenant_connections}"
                    )
                    return False
            else:
                self.log_result(
                    "Multi-Tenant Room Management",
                    False,
                    "Could not verify connection count via stats endpoint"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Multi-Tenant Room Management",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def test_message_broadcasting(self):
        """Test message broadcasting functionality"""
        try:
            if len(self.websocket_connections) < 2:
                self.log_result(
                    "Message Broadcasting",
                    False,
                    "Need at least 2 WebSocket connections for broadcasting test"
                )
                return False
            
            # Test sending a custom message to verify message handling
            websocket1 = self.websocket_connections[0]
            websocket2 = self.websocket_connections[1]
            
            # Send a subscribe message to test message handling
            subscribe_message = {
                "type": "subscribe",
                "types": ["dashboard_stats", "device_update"]
            }
            
            await websocket1.send(json.dumps(subscribe_message))
            
            # Wait for subscription confirmation
            try:
                response = await asyncio.wait_for(websocket1.recv(), timeout=5)
                data = json.loads(response)
                
                if data.get("type") == "subscription_confirmed":
                    self.log_result(
                        "Message Broadcasting",
                        True,
                        f"Successfully sent subscribe message and received confirmation: {data.get('subscriptions')}"
                    )
                    return True
                else:
                    self.log_result(
                        "Message Broadcasting",
                        False,
                        f"Expected subscription_confirmed, got: {data.get('type')}"
                    )
                    return False
                    
            except asyncio.TimeoutError:
                self.log_result(
                    "Message Broadcasting",
                    False,
                    "Timeout waiting for subscription confirmation"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Message Broadcasting",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def test_authentication_edge_cases(self):
        """Test authentication edge cases"""
        try:
            # Test 1: Missing token
            try:
                ws_url = f"{WS_BASE}/ws/{self.test_tenant_id}"
                websocket = await websockets.connect(ws_url)
                self.log_result(
                    "Authentication Edge Cases - Missing Token",
                    False,
                    "Connection should have been rejected for missing token"
                )
                await websocket.close()
                return False
            except Exception:
                self.log_result(
                    "Authentication Edge Cases - Missing Token",
                    True,
                    "Connection correctly rejected for missing token"
                )
            
            # Test 2: Invalid token format
            try:
                ws_url = f"{WS_BASE}/ws/{self.test_tenant_id}?token=invalid_token_format"
                websocket = await websockets.connect(ws_url)
                self.log_result(
                    "Authentication Edge Cases - Invalid Token",
                    False,
                    "Connection should have been rejected for invalid token"
                )
                await websocket.close()
                return False
            except Exception:
                self.log_result(
                    "Authentication Edge Cases - Invalid Token",
                    True,
                    "Connection correctly rejected for invalid token"
                )
            
            # Test 3: Expired token (we'll create a token with past expiration)
            try:
                # Create an expired token
                expired_payload = {
                    "sub": "admin@tsrid.com",
                    "role": "admin",
                    "customer_id": "tsrid",
                    "tenant_ids": [self.test_tenant_id],
                    "exp": int(time.time()) - 3600  # Expired 1 hour ago
                }
                expired_token = jwt.encode(expired_payload, "your-secret-key-keep-it-secret", algorithm="HS256")
                
                ws_url = f"{WS_BASE}/ws/{self.test_tenant_id}?token={expired_token}"
                websocket = await websockets.connect(ws_url)
                self.log_result(
                    "Authentication Edge Cases - Expired Token",
                    False,
                    "Connection should have been rejected for expired token"
                )
                await websocket.close()
                return False
            except Exception:
                self.log_result(
                    "Authentication Edge Cases - Expired Token",
                    True,
                    "Connection correctly rejected for expired token"
                )
            
            return True
            
        except Exception as e:
            self.log_result(
                "Authentication Edge Cases",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def verify_database_locations(self):
        """Query database directly to verify location data"""
        try:
            if not self.mongo_client:
                self.log_result(
                    "Database Location Verification", 
                    False, 
                    "No database connection available"
                )
                return None
            
            # Query portal_db.tenant_locations
            db = self.mongo_client["portal_db"]
            collection = db["tenant_locations"]
            
            # Count locations with the specific tenant_id
            location_count = collection.count_documents({"tenant_id": self.test_tenant_id})
            
            # Get sample locations to verify structure
            sample_locations = list(collection.find({"tenant_id": self.test_tenant_id}).limit(5))
            
            self.log_result(
                "Database Location Verification", 
                True, 
                f"Found {location_count} locations in portal_db.tenant_locations with tenant_id {self.test_tenant_id}"
            )
            
            return {
                "total": location_count,
                "sample_locations": sample_locations
            }
            
        except Exception as e:
            self.log_result(
                "Database Location Verification", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return None
    
    def compare_device_counts(self, admin_data, customer_data):
        """Compare device counts between Admin Portal and Customer Portal"""
        try:
            if not admin_data or not customer_data:
                self.log_result(
                    "Device Count Comparison", 
                    False, 
                    "Missing data from one or both portals"
                )
                return False
            
            admin_total = admin_data.get("total", 0)
            admin_online = admin_data.get("online", 0)
            admin_offline = admin_data.get("offline", 0)
            
            customer_total = customer_data.get("total", 0)
            customer_online = customer_data.get("online", 0)
            customer_offline = customer_data.get("offline", 0)
            
            # Check if counts match exactly
            total_match = admin_total == customer_total
            online_match = admin_online == customer_online
            offline_match = admin_offline == customer_offline
            
            all_match = total_match and online_match and offline_match
            
            details = f"Admin Portal: {admin_total} total ({admin_online} online, {admin_offline} offline) | Customer Portal: {customer_total} total ({customer_online} online, {customer_offline} offline)"
            
            if not all_match:
                mismatches = []
                if not total_match:
                    mismatches.append(f"Total: Admin={admin_total}, Customer={customer_total}")
                if not online_match:
                    mismatches.append(f"Online: Admin={admin_online}, Customer={customer_online}")
                if not offline_match:
                    mismatches.append(f"Offline: Admin={admin_offline}, Customer={customer_offline}")
                
                details += f" | MISMATCHES: {', '.join(mismatches)}"
            
            self.log_result(
                "Device Count Comparison", 
                all_match, 
                details
            )
            
            return all_match
            
        except Exception as e:
            self.log_result(
                "Device Count Comparison", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def compare_location_counts(self, customer_data, db_data):
        """Compare location counts between Customer Portal and Database"""
        try:
            if not customer_data or not db_data:
                self.log_result(
                    "Location Count Comparison", 
                    False, 
                    "Missing data from Customer Portal or Database"
                )
                return False
            
            customer_total = customer_data.get("total", 0)
            db_total = db_data.get("total", 0)
            
            # Check if counts match exactly
            counts_match = customer_total == db_total
            
            details = f"Customer Portal: {customer_total} locations | Database: {db_total} locations"
            
            if not counts_match:
                details += f" | MISMATCH: Customer Portal has {customer_total}, Database has {db_total}"
            
            self.log_result(
                "Location Count Comparison", 
                counts_match, 
                details
            )
            
            return counts_match
            
        except Exception as e:
            self.log_result(
                "Location Count Comparison", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all data synchronization tests"""
        print("=" * 80)
        print("DATA SYNCHRONIZATION TESTING - ADMIN PORTAL vs CUSTOMER PORTAL")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Tenant ID: {self.test_tenant_id} (Europcar)")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate as Superadmin (admin@tsrid.com)
        print("🔍 STEP 1: Authenticating as Superadmin (admin@tsrid.com)...")
        if not self.authenticate_superadmin():
            print("❌ Superadmin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Get devices via Admin Portal endpoint
        print("\n🔍 STEP 2: Getting devices via Admin Portal endpoint...")
        admin_devices = self.get_admin_portal_devices()
        
        # Step 3: Authenticate as Tenant Admin (info@europcar.com)
        print("\n🔍 STEP 3: Authenticating as Tenant Admin (info@europcar.com)...")
        if not self.authenticate_tenant_admin():
            print("❌ Tenant Admin authentication failed. Stopping tests.")
            return False
        
        # Step 4: Get devices via Customer Portal endpoint
        print("\n🔍 STEP 4: Getting devices via Customer Portal endpoint...")
        customer_devices = self.get_customer_portal_devices()
        
        # Step 5: Compare device counts
        print("\n🔍 STEP 5: Comparing device counts between portals...")
        device_sync_ok = self.compare_device_counts(admin_devices, customer_devices)
        
        # Step 6: Get locations via Customer Portal
        print("\n🔍 STEP 6: Getting locations via Customer Portal endpoint...")
        customer_locations = self.get_customer_portal_locations()
        
        # Step 7: Connect to database for direct verification
        print("\n🔍 STEP 7: Connecting to database for direct verification...")
        db_connected = self.connect_to_database()
        
        # Step 8: Verify device data in database
        print("\n🔍 STEP 8: Verifying device data in database...")
        db_devices = None
        if db_connected:
            db_devices = self.verify_database_devices()
        
        # Step 9: Verify location data in database
        print("\n🔍 STEP 9: Verifying location data in database...")
        db_locations = None
        if db_connected:
            db_locations = self.verify_database_locations()
        
        # Step 10: Compare location counts
        print("\n🔍 STEP 10: Comparing location counts...")
        location_sync_ok = self.compare_location_counts(customer_locations, db_locations)
        
        # Summary
        print("\n" + "=" * 80)
        print("DATA SYNCHRONIZATION TESTING SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print critical synchronization results
        print("\n🔍 CRITICAL SYNCHRONIZATION RESULTS:")
        if admin_devices and customer_devices:
            print(f"   • Device Count Sync: {'✅ SYNCHRONIZED' if device_sync_ok else '❌ NOT SYNCHRONIZED'}")
        else:
            print(f"   • Device Count Sync: ❌ UNABLE TO VERIFY (missing data)")
        
        if customer_locations and db_locations:
            print(f"   • Location Count Sync: {'✅ SYNCHRONIZED' if location_sync_ok else '❌ NOT SYNCHRONIZED'}")
        else:
            print(f"   • Location Count Sync: ❌ UNABLE TO VERIFY (missing data)")
        
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
        
        # Close database connection
        if self.mongo_client:
            self.mongo_client.close()
        
        return len(failed_tests) == 0 and device_sync_ok and location_sync_ok

if __name__ == "__main__":
    print("Starting Data Synchronization Testing Between Admin Portal and Customer Portal...")
    print()
    
    # Test Data Synchronization
    tester = DataSynchronizationTester()
    test_success = tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TESTING SUMMARY")
    print("=" * 80)
    print(f"Data Synchronization Testing: {'✅ DATA IS SYNCHRONIZED' if test_success else '❌ DATA SYNCHRONIZATION ISSUES FOUND'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 DATA SYNCHRONIZATION TESTING COMPLETED SUCCESSFULLY!")
        print("Both Admin Portal and Customer Portal show EXACTLY the same data for Europcar tenant.")
        sys.exit(0)
    else:
        print("❌ DATA SYNCHRONIZATION ISSUES FOUND!")
        print("Admin Portal and Customer Portal do NOT show the same data for Europcar tenant.")
        sys.exit(1)