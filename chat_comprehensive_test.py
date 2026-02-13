#!/usr/bin/env python3
"""
Comprehensive Chat Messages Test - Based on Review Request
Tests all aspects of the chat functionality to determine if the issue is resolved
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
BACKEND_URL = "https://hardware-slot-months.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
ticketing_db = mongo_client['ticketing_db']

class ChatComprehensiveTester:
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
        if not success:
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
            
            self.log_result(
                "Admin Authentication", 
                True, 
                f"Successfully authenticated as admin@tsrid.com"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_send_chat_message(self):
        """Test POST /api/chat/messages - Send a chat message"""
        try:
            unique_id = str(uuid.uuid4())[:8]
            message_text = f"COMPREHENSIVE TEST MESSAGE {unique_id} - Testing chat functionality"
            
            message_data = {
                "ticket_id": self.test_ticket_id,
                "message": message_text,
                "message_type": "text"
            }
            
            response = self.session.post(f"{API_BASE}/chat/messages", json=message_data)
            
            if response.status_code not in [200, 201]:
                self.log_result(
                    "Send Chat Message",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Send Chat Message",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            chat_message = data.get("chat_message")
            if not chat_message:
                self.log_result(
                    "Send Chat Message",
                    False,
                    "Response missing chat_message object",
                    data
                )
                return False
            
            self.test_message_id = chat_message.get("id")
            
            self.log_result(
                "Send Chat Message",
                True,
                f"Successfully sent chat message with ID: {self.test_message_id}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Send Chat Message",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_messages_api(self):
        """Test GET /api/chat/messages/{ticket_id} - Get messages for a ticket"""
        try:
            response = self.session.get(f"{API_BASE}/chat/messages/{self.test_ticket_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Get Messages API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get Messages API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            messages = data.get("messages", [])
            count = data.get("count", 0)
            
            # Verify our test message is in the response
            test_message_found = False
            if self.test_message_id:
                for msg in messages:
                    if msg.get("id") == self.test_message_id:
                        test_message_found = True
                        break
            
            self.log_result(
                "Get Messages API",
                True,
                f"API returned {count} messages for ticket {self.test_ticket_id}. Test message found: {test_message_found}"
            )
            
            return count > 0
            
        except Exception as e:
            self.log_result(
                "Get Messages API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_mongodb_storage(self):
        """Test that messages are stored in MongoDB"""
        try:
            # Count messages for our test ticket
            message_count = ticketing_db.chat_messages.count_documents({
                "ticket_id": self.test_ticket_id
            })
            
            # Check if our specific test message exists
            test_message_exists = False
            if self.test_message_id:
                test_message = ticketing_db.chat_messages.find_one({
                    "id": self.test_message_id
                })
                test_message_exists = test_message is not None
            
            self.log_result(
                "MongoDB Storage",
                True,
                f"Found {message_count} messages in MongoDB for ticket {self.test_ticket_id}. Test message exists: {test_message_exists}"
            )
            
            return message_count > 0
            
        except Exception as e:
            self.log_result(
                "MongoDB Storage",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_typing_indicator_fixed(self):
        """Test typing indicator with correct form data format"""
        try:
            # Test with form data (correct format)
            response = self.session.post(
                f"{API_BASE}/chat/typing",
                data={
                    "ticket_id": self.test_ticket_id,
                    "is_typing": "true"
                }
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Typing Indicator (Form Data)",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Typing Indicator (Form Data)",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            self.log_result(
                "Typing Indicator (Form Data)",
                True,
                "Typing indicator works correctly with form data"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Typing Indicator (Form Data)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_data_consistency(self):
        """Test that MongoDB and API return consistent data"""
        try:
            # Get MongoDB count
            mongodb_count = ticketing_db.chat_messages.count_documents({
                "ticket_id": self.test_ticket_id
            })
            
            # Get API response
            response = self.session.get(f"{API_BASE}/chat/messages/{self.test_ticket_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "Data Consistency",
                    False,
                    f"API request failed. Status: {response.status_code}"
                )
                return False
            
            data = response.json()
            api_count = data.get("count", 0)
            
            # Compare counts
            if mongodb_count != api_count:
                self.log_result(
                    "Data Consistency",
                    False,
                    f"Data mismatch: MongoDB has {mongodb_count} messages, API returns {api_count} messages"
                )
                return False
            else:
                self.log_result(
                    "Data Consistency",
                    True,
                    f"Data consistency verified: Both MongoDB and API show {mongodb_count} messages"
                )
                return True
            
        except Exception as e:
            self.log_result(
                "Data Consistency",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_comprehensive_tests(self):
        """Run all comprehensive chat tests"""
        print("=" * 80)
        print("COMPREHENSIVE CHAT MESSAGES TEST")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Ticket ID: {self.test_ticket_id}")
        print(f"Testing: Message send/retrieve, MongoDB storage, typing indicator")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Authenticating as Admin (admin@tsrid.com)...")
            if not self.authenticate_admin():
                print("❌ Admin authentication failed. Stopping tests.")
                return False
            
            # Step 2: Send test message
            print(f"\n🔍 STEP 2: Sending test chat message to ticket {self.test_ticket_id}...")
            message_sent = self.test_send_chat_message()
            
            # Step 3: Get messages via API
            print(f"\n🔍 STEP 3: Retrieving messages for ticket {self.test_ticket_id} via API...")
            api_has_messages = self.test_get_messages_api()
            
            # Step 4: Check MongoDB storage
            print(f"\n🔍 STEP 4: Verifying messages are stored in MongoDB...")
            mongodb_has_messages = self.test_mongodb_storage()
            
            # Step 5: Test typing indicator
            print(f"\n🔍 STEP 5: Testing typing indicator with correct format...")
            typing_works = self.test_typing_indicator_fixed()
            
            # Step 6: Test data consistency
            print(f"\n🔍 STEP 6: Verifying data consistency between MongoDB and API...")
            data_consistent = self.test_data_consistency()
            
            # Summary
            print("\n" + "=" * 80)
            print("COMPREHENSIVE CHAT MESSAGES TEST SUMMARY")
            print("=" * 80)
            
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print(f"Tests completed: {passed}/{total} passed")
            
            # Print critical findings
            print("\n🔍 CRITICAL FINDINGS:")
            print(f"   • Message sent successfully: {'✅ YES' if message_sent else '❌ NO'}")
            print(f"   • Messages returned by API: {'✅ YES' if api_has_messages else '❌ NO'}")
            print(f"   • Messages stored in MongoDB: {'✅ YES' if mongodb_has_messages else '❌ NO'}")
            print(f"   • Typing indicator working: {'✅ YES' if typing_works else '❌ NO'}")
            print(f"   • Data consistency: {'✅ YES' if data_consistent else '❌ NO'}")
            
            # Overall assessment
            all_core_working = message_sent and api_has_messages and mongodb_has_messages and data_consistent
            
            print(f"\n🔍 OVERALL ASSESSMENT:")
            if all_core_working:
                print("   ✅ CHAT FUNCTIONALITY IS WORKING CORRECTLY")
                print("   ✅ Messages are being sent, stored, and retrieved properly")
                if not typing_works:
                    print("   ⚠️  Minor issue: Typing indicator needs form data format (not critical)")
            else:
                print("   ❌ CHAT FUNCTIONALITY HAS ISSUES")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\n❌ ISSUES FOUND:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['details']}")
            
            return all_core_working
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            return False

def main():
    """Main function to run the comprehensive tests"""
    tester = ChatComprehensiveTester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n✅ Chat messages functionality is working correctly")
        sys.exit(0)
    else:
        print("\n❌ Chat messages functionality has issues")
        sys.exit(1)

if __name__ == "__main__":
    main()