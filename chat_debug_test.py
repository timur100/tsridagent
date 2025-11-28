#!/usr/bin/env python3
"""
Chat Messages Debug Test - CRITICAL DEBUGGING
Tests the specific issue: "chat funktioniert nicht" - messages not appearing

Issue Details:
- Backend logs show: POST /api/chat/messages HTTP/1.1" 200 OK (messages ARE being sent successfully)
- WebSocket broadcasting works: "📨 [Chat Message] Broadcasted to admin room 'all'"
- GET /api/chat/messages returns 0 messages
- Need to verify if messages are being stored in MongoDB chat_messages collection
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os
import jwt
from datetime import datetime, timezone
import time
import uuid

# Backend URL from environment
BACKEND_URL = "https://biometric-verify-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
ticketing_db = mongo_client['ticketing_db']

class ChatMessagesDebugTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.test_ticket_id = "TK.20251122.021"  # Specific ticket from review request
        self.test_message_id = None
        
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
            self.session.headers.update({
                'Authorization': f'Bearer {self.admin_token}'
            })
            
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

    def check_mongodb_chat_messages_before(self):
        """Check MongoDB chat_messages collection BEFORE sending message"""
        try:
            # Check if collection exists
            collections = ticketing_db.list_collection_names()
            if 'chat_messages' not in collections:
                self.log_result(
                    "MongoDB Chat Messages Collection Check (BEFORE)",
                    False,
                    "chat_messages collection does not exist in ticketing_db"
                )
                return False
            
            # Count existing messages for our test ticket
            existing_count = ticketing_db.chat_messages.count_documents({
                "ticket_id": self.test_ticket_id
            })
            
            # Get all messages for debugging
            all_messages = list(ticketing_db.chat_messages.find({
                "ticket_id": self.test_ticket_id
            }))
            
            self.log_result(
                "MongoDB Chat Messages Collection Check (BEFORE)",
                True,
                f"Found {existing_count} existing messages for ticket {self.test_ticket_id} in MongoDB",
                {"existing_messages": all_messages}
            )
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Chat Messages Collection Check (BEFORE)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def send_test_chat_message(self):
        """Send a test chat message to the specific ticket"""
        try:
            if not self.test_ticket_id:
                self.log_result(
                    "Send Test Chat Message",
                    False,
                    "No test ticket ID available"
                )
                return False
            
            # Create unique message to identify it later
            unique_id = str(uuid.uuid4())[:8]
            message_text = f"DEBUG TEST MESSAGE {unique_id} - Testing chat functionality for ticket {self.test_ticket_id}"
            
            message_data = {
                "ticket_id": self.test_ticket_id,
                "message": message_text,
                "message_type": "text"
            }
            
            print(f"🔍 Sending message to ticket: {self.test_ticket_id}")
            print(f"🔍 Message content: {message_text}")
            
            response = self.session.post(f"{API_BASE}/chat/messages", json=message_data)
            
            print(f"🔍 Response status: {response.status_code}")
            print(f"🔍 Response headers: {dict(response.headers)}")
            
            if response.status_code not in [200, 201]:
                self.log_result(
                    "Send Test Chat Message",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            try:
                data = response.json()
            except:
                self.log_result(
                    "Send Test Chat Message",
                    False,
                    f"Response is not valid JSON. Raw response: {response.text}"
                )
                return False
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "Send Test Chat Message",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify chat_message object exists
            chat_message = data.get("chat_message")
            if not chat_message:
                self.log_result(
                    "Send Test Chat Message",
                    False,
                    "Response missing chat_message object",
                    data
                )
                return False
            
            # Store message ID for later verification
            self.test_message_id = chat_message.get("id")
            
            self.log_result(
                "Send Test Chat Message",
                True,
                f"Successfully sent chat message with ID: {self.test_message_id} for ticket: {self.test_ticket_id}",
                data
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Send Test Chat Message",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def check_mongodb_chat_messages_after(self):
        """Check MongoDB chat_messages collection AFTER sending message"""
        try:
            # Count messages for our test ticket after sending
            after_count = ticketing_db.chat_messages.count_documents({
                "ticket_id": self.test_ticket_id
            })
            
            # Get all messages for debugging
            all_messages = list(ticketing_db.chat_messages.find({
                "ticket_id": self.test_ticket_id
            }))
            
            # Look for our specific test message
            test_message_found = False
            if self.test_message_id:
                test_message = ticketing_db.chat_messages.find_one({
                    "id": self.test_message_id
                })
                if test_message:
                    test_message_found = True
            
            self.log_result(
                "MongoDB Chat Messages Collection Check (AFTER)",
                True,
                f"Found {after_count} messages for ticket {self.test_ticket_id} in MongoDB after sending. Test message found: {test_message_found}",
                {"all_messages": all_messages, "test_message_id": self.test_message_id}
            )
            return after_count > 0
            
        except Exception as e:
            self.log_result(
                "MongoDB Chat Messages Collection Check (AFTER)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def get_messages_via_api(self):
        """Get messages for the ticket via API"""
        try:
            if not self.test_ticket_id:
                self.log_result(
                    "Get Messages via API",
                    False,
                    "No test ticket ID available"
                )
                return False
            
            print(f"🔍 Getting messages for ticket: {self.test_ticket_id}")
            
            response = self.session.get(f"{API_BASE}/chat/messages/{self.test_ticket_id}")
            
            print(f"🔍 API Response status: {response.status_code}")
            print(f"🔍 API Response headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Messages via API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            try:
                data = response.json()
            except:
                self.log_result(
                    "Get Messages via API",
                    False,
                    f"Response is not valid JSON. Raw response: {response.text}"
                )
                return False
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "Get Messages via API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            messages = data.get("messages", [])
            count = data.get("count", 0)
            
            # Look for our test message
            test_message_found = False
            if self.test_message_id:
                for msg in messages:
                    if msg.get("id") == self.test_message_id:
                        test_message_found = True
                        break
            
            self.log_result(
                "Get Messages via API",
                True,
                f"API returned {count} messages for ticket {self.test_ticket_id}. Test message found: {test_message_found}",
                data
            )
            
            # Return True if we found messages, False if empty
            return count > 0
            
        except Exception as e:
            self.log_result(
                "Get Messages via API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def compare_mongodb_vs_api(self):
        """Compare MongoDB data vs API response"""
        try:
            # Get MongoDB count
            mongodb_count = ticketing_db.chat_messages.count_documents({
                "ticket_id": self.test_ticket_id
            })
            
            # Get API response
            response = self.session.get(f"{API_BASE}/chat/messages/{self.test_ticket_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Compare MongoDB vs API",
                    False,
                    f"API request failed. Status: {response.status_code}"
                )
                return False
            
            data = response.json()
            api_count = data.get("count", 0)
            
            # Compare counts
            if mongodb_count != api_count:
                self.log_result(
                    "Compare MongoDB vs API",
                    False,
                    f"DATA MISMATCH: MongoDB has {mongodb_count} messages, API returns {api_count} messages for ticket {self.test_ticket_id}",
                    {"mongodb_count": mongodb_count, "api_count": api_count, "api_response": data}
                )
                return False
            else:
                self.log_result(
                    "Compare MongoDB vs API",
                    True,
                    f"Data consistency verified: Both MongoDB and API show {mongodb_count} messages for ticket {self.test_ticket_id}"
                )
                return True
            
        except Exception as e:
            self.log_result(
                "Compare MongoDB vs API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def check_ticket_exists(self):
        """Verify the test ticket exists"""
        try:
            response = self.session.get(f"{API_BASE}/tickets")
            
            if response.status_code != 200:
                self.log_result(
                    "Check Ticket Exists",
                    False,
                    f"Failed to get tickets. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            tickets = data.get("tickets", [])
            
            # Look for our test ticket
            ticket_found = False
            for ticket in tickets:
                if ticket.get("ticket_number") == self.test_ticket_id:
                    ticket_found = True
                    break
            
            self.log_result(
                "Check Ticket Exists",
                ticket_found,
                f"Ticket {self.test_ticket_id} {'found' if ticket_found else 'NOT FOUND'} in tickets list. Total tickets: {len(tickets)}",
                {"ticket_found": ticket_found, "total_tickets": len(tickets)}
            )
            return ticket_found
            
        except Exception as e:
            self.log_result(
                "Check Ticket Exists",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_debug_tests(self):
        """Run all debug tests for chat messages issue"""
        print("=" * 80)
        print("CHAT MESSAGES DEBUG TEST - CRITICAL ISSUE INVESTIGATION")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Ticket ID: {self.test_ticket_id}")
        print(f"Issue: Messages not appearing despite successful POST requests")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Authenticating as Admin (admin@tsrid.com)...")
            if not self.authenticate_admin():
                print("❌ Admin authentication failed. Stopping tests.")
                return False
            
            # Step 2: Check if ticket exists
            print(f"\n🔍 STEP 2: Verifying ticket {self.test_ticket_id} exists...")
            ticket_exists = self.check_ticket_exists()
            
            # Step 3: Check MongoDB BEFORE sending message
            print(f"\n🔍 STEP 3: Checking MongoDB chat_messages collection BEFORE sending message...")
            self.check_mongodb_chat_messages_before()
            
            # Step 4: Send test message
            print(f"\n🔍 STEP 4: Sending test chat message to ticket {self.test_ticket_id}...")
            message_sent = self.send_test_chat_message()
            
            # Step 5: Check MongoDB AFTER sending message
            print(f"\n🔍 STEP 5: Checking MongoDB chat_messages collection AFTER sending message...")
            mongodb_has_messages = self.check_mongodb_chat_messages_after()
            
            # Step 6: Get messages via API
            print(f"\n🔍 STEP 6: Retrieving messages for ticket {self.test_ticket_id} via API...")
            api_has_messages = self.get_messages_via_api()
            
            # Step 7: Compare MongoDB vs API
            print(f"\n🔍 STEP 7: Comparing MongoDB data vs API response...")
            data_consistent = self.compare_mongodb_vs_api()
            
            # Summary
            print("\n" + "=" * 80)
            print("CHAT MESSAGES DEBUG TEST SUMMARY")
            print("=" * 80)
            
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print(f"Tests completed: {passed}/{total} passed")
            
            # Print critical findings
            print("\n🔍 CRITICAL FINDINGS:")
            print(f"   • Ticket {self.test_ticket_id} exists: {'✅ YES' if ticket_exists else '❌ NO'}")
            print(f"   • Message sent successfully: {'✅ YES' if message_sent else '❌ NO'}")
            print(f"   • Messages stored in MongoDB: {'✅ YES' if mongodb_has_messages else '❌ NO'}")
            print(f"   • Messages returned by API: {'✅ YES' if api_has_messages else '❌ NO'}")
            print(f"   • Data consistency (MongoDB vs API): {'✅ YES' if data_consistent else '❌ NO'}")
            
            # Identify the root cause
            print("\n🔍 ROOT CAUSE ANALYSIS:")
            if not ticket_exists:
                print("   ❌ ISSUE: Test ticket does not exist - this could cause message storage issues")
            elif message_sent and not mongodb_has_messages:
                print("   ❌ ISSUE: Messages are sent successfully but NOT stored in MongoDB")
            elif mongodb_has_messages and not api_has_messages:
                print("   ❌ ISSUE: Messages are stored in MongoDB but API is NOT returning them")
            elif not data_consistent:
                print("   ❌ ISSUE: Data inconsistency between MongoDB and API")
            elif message_sent and mongodb_has_messages and api_has_messages and data_consistent:
                print("   ✅ NO ISSUE FOUND: All systems working correctly")
            else:
                print("   ❓ UNCLEAR: Need further investigation")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\n❌ ISSUES FOUND:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['details']}")
            
            return len(failed_tests) == 0
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            return False

def main():
    """Main function to run the debug tests"""
    tester = ChatMessagesDebugTester()
    success = tester.run_debug_tests()
    
    if success:
        print("\n✅ All debug tests passed - chat messages functionality working correctly")
        sys.exit(0)
    else:
        print("\n❌ Debug tests found issues - chat messages functionality has problems")
        sys.exit(1)

if __name__ == "__main__":
    main()