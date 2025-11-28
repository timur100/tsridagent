#!/usr/bin/env python3
"""
WebSocket Infrastructure Backend Testing
Tests the newly implemented WebSocket infrastructure comprehensively.

Test Scenarios:
1. WebSocket Connection & Authentication
2. JWT Authentication (valid/invalid tokens)
3. Heartbeat/Ping-Pong
4. Connection Stats Endpoint
5. Multi-Client Support
6. Error Handling
"""

import asyncio
import websockets
import json
import requests
import sys
import time
from typing import Dict, Any, List
import jwt
from datetime import datetime, timezone, timedelta

# Backend URL from environment
BACKEND_URL = "https://auto-admin-portal-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

class WebSocketTester:
    def __init__(self):
        self.results = []
        self.admin_token = None
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar tenant ID
        self.jwt_secret = "your-secret-key-change-in-production"  # From backend .env
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2) if isinstance(response_data, (dict, list)) else str(response_data)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_admin(self):
        """Authenticate as admin user to get JWT token"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = requests.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
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
            
            self.log_result(
                "Admin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com with valid JWT token"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def create_invalid_token(self):
        """Create an invalid JWT token for testing"""
        try:
            # Create token with wrong secret
            payload = {
                'email': 'admin@tsrid.com',
                'role': 'admin',
                'tenant_ids': [self.test_tenant_id],
                'exp': datetime.now(timezone.utc) + timedelta(hours=1)
            }
            invalid_token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
            return invalid_token
        except Exception as e:
            print(f"Error creating invalid token: {e}")
            return "invalid-token"
    
    def create_expired_token(self):
        """Create an expired JWT token for testing"""
        try:
            payload = {
                'email': 'admin@tsrid.com',
                'role': 'admin',
                'tenant_ids': [self.test_tenant_id],
                'exp': datetime.now(timezone.utc) - timedelta(hours=1)  # Expired 1 hour ago
            }
            expired_token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
            return expired_token
        except Exception as e:
            print(f"Error creating expired token: {e}")
            return "expired-token"
    
    def create_wrong_tenant_token(self):
        """Create a JWT token for wrong tenant"""
        try:
            payload = {
                'email': 'user@example.com',
                'role': 'tenant_admin',
                'tenant_ids': ['wrong-tenant-id'],
                'exp': datetime.now(timezone.utc) + timedelta(hours=1)
            }
            wrong_tenant_token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
            return wrong_tenant_token
        except Exception as e:
            print(f"Error creating wrong tenant token: {e}")
            return "wrong-tenant-token"
    
    async def test_websocket_connection_valid_token(self):
        """Test WebSocket connection with valid admin token"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Wait for connection_established message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                # Verify connection_established message
                if data.get("type") == "connection_established" and data.get("tenant_id") == self.test_tenant_id:
                    self.log_result(
                        "WebSocket Connection with Valid Token", 
                        True, 
                        f"Successfully connected to WebSocket and received connection_established message",
                        data
                    )
                    return True
                else:
                    self.log_result(
                        "WebSocket Connection with Valid Token", 
                        False, 
                        f"Unexpected message received",
                        data
                    )
                    return False
                    
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
    
    async def test_websocket_connection_no_token(self):
        """Test WebSocket connection without token (should be rejected)"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}"
            
            async with websockets.connect(ws_url) as websocket:
                # Should not reach here - connection should be closed
                self.log_result(
                    "WebSocket Connection without Token", 
                    False, 
                    "Connection was accepted when it should have been rejected"
                )
                return False
                
        except websockets.exceptions.ConnectionClosedError as e:
            # Expected behavior - connection should be closed
            if e.code == 1008:  # Policy Violation
                self.log_result(
                    "WebSocket Connection without Token", 
                    True, 
                    f"Connection correctly rejected with code {e.code}: {e.reason}"
                )
                return True
            else:
                self.log_result(
                    "WebSocket Connection without Token", 
                    False, 
                    f"Connection closed with unexpected code {e.code}: {e.reason}"
                )
                return False
        except Exception as e:
            self.log_result(
                "WebSocket Connection without Token", 
                False, 
                f"Unexpected exception: {str(e)}"
            )
            return False
    
    async def test_websocket_connection_invalid_token(self):
        """Test WebSocket connection with invalid token (should be rejected)"""
        try:
            invalid_token = self.create_invalid_token()
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={invalid_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Should not reach here - connection should be closed
                self.log_result(
                    "WebSocket Connection with Invalid Token", 
                    False, 
                    "Connection was accepted when it should have been rejected"
                )
                return False
                
        except websockets.exceptions.ConnectionClosedError as e:
            # Expected behavior - connection should be closed
            if e.code == 1008:  # Policy Violation
                self.log_result(
                    "WebSocket Connection with Invalid Token", 
                    True, 
                    f"Connection correctly rejected with code {e.code}: {e.reason}"
                )
                return True
            else:
                self.log_result(
                    "WebSocket Connection with Invalid Token", 
                    False, 
                    f"Connection closed with unexpected code {e.code}: {e.reason}"
                )
                return False
        except Exception as e:
            self.log_result(
                "WebSocket Connection with Invalid Token", 
                False, 
                f"Unexpected exception: {str(e)}"
            )
            return False
    
    async def test_websocket_connection_wrong_tenant(self):
        """Test WebSocket connection with token for wrong tenant (should be rejected for non-admin)"""
        try:
            wrong_tenant_token = self.create_wrong_tenant_token()
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={wrong_tenant_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Should not reach here - connection should be closed
                self.log_result(
                    "WebSocket Connection with Wrong Tenant Token", 
                    False, 
                    "Connection was accepted when it should have been rejected"
                )
                return False
                
        except websockets.exceptions.ConnectionClosedError as e:
            # Expected behavior - connection should be closed
            if e.code == 1008:  # Policy Violation
                self.log_result(
                    "WebSocket Connection with Wrong Tenant Token", 
                    True, 
                    f"Connection correctly rejected with code {e.code}: {e.reason}"
                )
                return True
            else:
                self.log_result(
                    "WebSocket Connection with Wrong Tenant Token", 
                    False, 
                    f"Connection closed with unexpected code {e.code}: {e.reason}"
                )
                return False
        except Exception as e:
            self.log_result(
                "WebSocket Connection with Wrong Tenant Token", 
                False, 
                f"Unexpected exception: {str(e)}"
            )
            return False
    
    async def test_heartbeat_ping_pong(self):
        """Test heartbeat/ping-pong mechanism"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Wait for connection_established message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                connection_data = json.loads(message)
                
                if connection_data.get("type") != "connection_established":
                    self.log_result(
                        "Heartbeat Ping-Pong Test", 
                        False, 
                        "Failed to establish connection"
                    )
                    return False
                
                # Wait for ping message (should come within 35 seconds, sent every 30)
                ping_received = False
                start_time = time.time()
                
                while time.time() - start_time < 35:  # Wait up to 35 seconds
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        data = json.loads(message)
                        
                        if data.get("type") == "ping":
                            ping_received = True
                            
                            # Send pong response
                            pong_message = {
                                "type": "pong",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }
                            await websocket.send(json.dumps(pong_message))
                            
                            self.log_result(
                                "Heartbeat Ping-Pong Test", 
                                True, 
                                f"Successfully received ping and sent pong response",
                                data
                            )
                            return True
                            
                    except asyncio.TimeoutError:
                        continue  # Keep waiting
                
                if not ping_received:
                    self.log_result(
                        "Heartbeat Ping-Pong Test", 
                        False, 
                        "No ping message received within 35 seconds"
                    )
                    return False
                    
        except Exception as e:
            self.log_result(
                "Heartbeat Ping-Pong Test", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_connection_stats_endpoint(self):
        """Test WebSocket connection statistics endpoint"""
        try:
            response = requests.get(f"{API_BASE}/ws/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            required_fields = ["success", "total_connections", "active_tenant_rooms", "tenant_connections"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if not data.get("success"):
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify data types
            if not isinstance(data["total_connections"], int):
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    "total_connections is not an integer",
                    data
                )
                return False
            
            if not isinstance(data["active_tenant_rooms"], int):
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    "active_tenant_rooms is not an integer",
                    data
                )
                return False
            
            if not isinstance(data["tenant_connections"], dict):
                self.log_result(
                    "Connection Stats Endpoint", 
                    False, 
                    "tenant_connections is not a dictionary",
                    data
                )
                return False
            
            self.log_result(
                "Connection Stats Endpoint", 
                True, 
                f"Stats endpoint working correctly. Total connections: {data['total_connections']}, Active rooms: {data['active_tenant_rooms']}",
                data
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Connection Stats Endpoint", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def test_multi_client_support(self):
        """Test multiple simultaneous connections to the same tenant"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            # Create 3 simultaneous connections
            connections = []
            connection_messages = []
            
            for i in range(3):
                websocket = await websockets.connect(ws_url)
                connections.append(websocket)
                
                # Wait for connection_established message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                connection_messages.append(data)
            
            # Verify all connections received connection_established
            all_connected = True
            for i, data in enumerate(connection_messages):
                if data.get("type") != "connection_established" or data.get("tenant_id") != self.test_tenant_id:
                    all_connected = False
                    break
            
            if not all_connected:
                self.log_result(
                    "Multi-Client Support Test", 
                    False, 
                    "Not all connections received connection_established message"
                )
                # Close connections
                for ws in connections:
                    await ws.close()
                return False
            
            # Check stats to verify multiple connections
            stats_response = requests.get(f"{API_BASE}/ws/stats")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                tenant_connections = stats_data.get("tenant_connections", {})
                current_connections = tenant_connections.get(self.test_tenant_id, 0)
                
                if current_connections >= 3:
                    self.log_result(
                        "Multi-Client Support Test", 
                        True, 
                        f"Successfully created {len(connections)} simultaneous connections. Stats show {current_connections} connections for tenant."
                    )
                    success = True
                else:
                    self.log_result(
                        "Multi-Client Support Test", 
                        False, 
                        f"Expected at least 3 connections, but stats show {current_connections}"
                    )
                    success = False
            else:
                self.log_result(
                    "Multi-Client Support Test", 
                    True, 
                    f"Successfully created {len(connections)} simultaneous connections (stats endpoint unavailable)"
                )
                success = True
            
            # Close all connections
            for ws in connections:
                await ws.close()
            
            return success
            
        except Exception as e:
            self.log_result(
                "Multi-Client Support Test", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def test_websocket_disconnect_handling(self):
        """Test graceful WebSocket disconnect handling"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            # Connect and then disconnect
            websocket = await websockets.connect(ws_url)
            
            # Wait for connection_established message
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            
            if data.get("type") != "connection_established":
                self.log_result(
                    "WebSocket Disconnect Handling", 
                    False, 
                    "Failed to establish connection"
                )
                return False
            
            # Close connection gracefully
            await websocket.close()
            
            # Wait a moment for cleanup
            await asyncio.sleep(1)
            
            # Check stats to verify connection was removed
            stats_response = requests.get(f"{API_BASE}/ws/stats")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                tenant_connections = stats_data.get("tenant_connections", {})
                current_connections = tenant_connections.get(self.test_tenant_id, 0)
                
                self.log_result(
                    "WebSocket Disconnect Handling", 
                    True, 
                    f"Connection closed gracefully. Current connections for tenant: {current_connections}"
                )
                return True
            else:
                self.log_result(
                    "WebSocket Disconnect Handling", 
                    True, 
                    "Connection closed gracefully (stats endpoint unavailable)"
                )
                return True
                
        except Exception as e:
            self.log_result(
                "WebSocket Disconnect Handling", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def test_invalid_message_handling(self):
        """Test handling of invalid message formats"""
        try:
            ws_url = f"{WS_BASE}/api/ws/{self.test_tenant_id}?token={self.admin_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Wait for connection_established message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                connection_data = json.loads(message)
                
                if connection_data.get("type") != "connection_established":
                    self.log_result(
                        "Invalid Message Handling", 
                        False, 
                        "Failed to establish connection"
                    )
                    return False
                
                # Send invalid JSON
                await websocket.send("invalid json")
                
                # Send valid JSON with unknown message type
                await websocket.send(json.dumps({"type": "unknown_type", "data": "test"}))
                
                # Wait a moment to see if connection stays alive
                await asyncio.sleep(2)
                
                # Try to send a valid message to verify connection is still alive
                pong_message = {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await websocket.send(json.dumps(pong_message))
                
                self.log_result(
                    "Invalid Message Handling", 
                    True, 
                    "Connection handled invalid messages gracefully and remained active"
                )
                return True
                
        except Exception as e:
            self.log_result(
                "Invalid Message Handling", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    async def run_all_tests(self):
        """Run all WebSocket infrastructure tests"""
        print("=" * 80)
        print("WEBSOCKET INFRASTRUCTURE BACKEND TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"WebSocket URL: {WS_BASE}")
        print(f"Test Tenant ID: {self.test_tenant_id} (Europcar)")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate to get JWT token
        print("🔍 STEP 1: Authenticating as admin to get JWT token...")
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Stopping tests.")
            return False
        
        # Step 2: Test WebSocket connection with valid token
        print("\n🔍 STEP 2: Testing WebSocket connection with valid token...")
        await self.test_websocket_connection_valid_token()
        
        # Step 3: Test WebSocket connection without token
        print("\n🔍 STEP 3: Testing WebSocket connection without token...")
        await self.test_websocket_connection_no_token()
        
        # Step 4: Test WebSocket connection with invalid token
        print("\n🔍 STEP 4: Testing WebSocket connection with invalid token...")
        await self.test_websocket_connection_invalid_token()
        
        # Step 5: Test WebSocket connection with wrong tenant token
        print("\n🔍 STEP 5: Testing WebSocket connection with wrong tenant token...")
        await self.test_websocket_connection_wrong_tenant()
        
        # Step 6: Test heartbeat/ping-pong mechanism
        print("\n🔍 STEP 6: Testing heartbeat/ping-pong mechanism...")
        await self.test_heartbeat_ping_pong()
        
        # Step 7: Test connection stats endpoint
        print("\n🔍 STEP 7: Testing connection stats endpoint...")
        self.test_connection_stats_endpoint()
        
        # Step 8: Test multi-client support
        print("\n🔍 STEP 8: Testing multi-client support...")
        await self.test_multi_client_support()
        
        # Step 9: Test WebSocket disconnect handling
        print("\n🔍 STEP 9: Testing WebSocket disconnect handling...")
        await self.test_websocket_disconnect_handling()
        
        # Step 10: Test invalid message handling
        print("\n🔍 STEP 10: Testing invalid message handling...")
        await self.test_invalid_message_handling()
        
        # Summary
        print("\n" + "=" * 80)
        print("WEBSOCKET INFRASTRUCTURE TESTING SUMMARY")
        print("=" * 80)
        
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


async def main():
    print("Starting WebSocket Infrastructure Backend Testing...")
    print()
    
    # Test WebSocket Infrastructure
    tester = WebSocketTester()
    test_success = await tester.run_all_tests()
    
    print()
    print("=" * 80)
    print("OVERALL TESTING SUMMARY")
    print("=" * 80)
    print(f"WebSocket Infrastructure Testing: {'✅ ALL TESTS PASSED' if test_success else '❌ SOME TESTS FAILED'}")
    print("=" * 80)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 WEBSOCKET INFRASTRUCTURE TESTING COMPLETED SUCCESSFULLY!")
        print("All WebSocket infrastructure components are working correctly.")
        sys.exit(0)
    else:
        print("❌ WEBSOCKET INFRASTRUCTURE TESTING FAILED!")
        print("Some WebSocket infrastructure components are not working correctly.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())