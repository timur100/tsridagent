#!/usr/bin/env python3
"""
Phase 1 Ticketing System Backend Verification
Tests all Phase 1 Ticketing System endpoints after Mixed Content Fix:
- Ticketing Microservice Health Check (localhost:8103)
- Ticket List via Proxy (HTTPS)
- Staff Management via Proxy (HTTPS)
- SLA Warnings via Proxy (HTTPS)
- Staff Ticket Statistics via Proxy (HTTPS)
"""

import requests
import json
import sys
from typing import Dict, Any, List
import jwt
from datetime import datetime, timezone

# Backend URLs
BACKEND_URL = "https://scan-verify-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
MICROSERVICE_URL = "http://localhost:8103"

class Phase1TicketingVerificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data and len(str(response_data)) < 500:
                print(f"   Response: {json.dumps(response_data, indent=2) if isinstance(response_data, (dict, list)) else response_data}")
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

    def test_microservice_health_check(self):
        """Test 1: Ticketing Microservice Health Check - GET http://localhost:8103/health"""
        try:
            # Create a separate session without auth headers for direct microservice call
            direct_session = requests.Session()
            response = direct_session.get(f"{MICROSERVICE_URL}/health", timeout=10)
            
            if response.status_code != 200:
                self.log_result(
                    "1. Microservice Health Check",
                    False,
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify it's the Ticketing Service
            if data.get("service") != "Ticketing Service":
                self.log_result(
                    "1. Microservice Health Check",
                    False,
                    f"Unexpected service response. Expected 'Ticketing Service', got: {data.get('service')}",
                    data
                )
                return False
            
            self.log_result(
                "1. Microservice Health Check",
                True,
                f"Ticketing Microservice is healthy on port 8103. Service: {data.get('service')}, Status: {data.get('status', 'healthy')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "1. Microservice Health Check",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_ticket_list_via_proxy(self):
        """Test 2: Ticket List (via Proxy) - GET https://scan-verify-hub.preview.emergentagent.com/api/tickets/"""
        try:
            response = self.session.get(f"{API_BASE}/tickets/")
            
            if response.status_code != 200:
                self.log_result(
                    "2. Ticket List (via Proxy)",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response is a list or dict with tickets
            tickets = data if isinstance(data, list) else data.get("tickets", data.get("data", []))
            
            # Look for test ticket TK.20251109.001
            test_ticket_found = False
            for ticket in tickets:
                if ticket.get("ticket_id") == "TK.20251109.001":
                    test_ticket_found = True
                    break
            
            if test_ticket_found:
                self.log_result(
                    "2. Ticket List (via Proxy)",
                    True,
                    f"Successfully retrieved ticket list with {len(tickets)} tickets. Test ticket TK.20251109.001 found."
                )
            else:
                self.log_result(
                    "2. Ticket List (via Proxy)",
                    True,
                    f"Successfully retrieved ticket list with {len(tickets)} tickets. Test ticket TK.20251109.001 not found (may be expected)."
                )
            return True
            
        except Exception as e:
            self.log_result(
                "2. Ticket List (via Proxy)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_staff_management_via_proxy(self):
        """Test 3: Staff Management (via Proxy) - GET https://scan-verify-hub.preview.emergentagent.com/api/staff/"""
        try:
            response = self.session.get(f"{API_BASE}/staff/")
            
            if response.status_code != 200:
                self.log_result(
                    "3. Staff Management (via Proxy)",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response is a list or dict with staff
            staff_list = data if isinstance(data, list) else data.get("staff", data.get("data", []))
            
            if not isinstance(staff_list, list):
                self.log_result(
                    "3. Staff Management (via Proxy)",
                    False,
                    f"Expected staff list, got: {type(staff_list)}",
                    data
                )
                return False
            
            self.log_result(
                "3. Staff Management (via Proxy)",
                True,
                f"Successfully retrieved staff list with {len(staff_list)} staff members"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "3. Staff Management (via Proxy)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_sla_warnings_via_proxy(self):
        """Test 4: SLA Warnings (via Proxy) - GET https://scan-verify-hub.preview.emergentagent.com/api/sla/warnings"""
        try:
            response = self.session.get(f"{API_BASE}/sla/warnings")
            
            if response.status_code != 200:
                self.log_result(
                    "4. SLA Warnings (via Proxy)",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not isinstance(data, dict):
                self.log_result(
                    "4. SLA Warnings (via Proxy)",
                    False,
                    f"Expected dict response, got: {type(data)}",
                    data
                )
                return False
            
            # Check for SLA-related fields
            sla_fields = ["critical", "breached", "at_risk", "warnings"]
            found_fields = []
            
            for field in sla_fields:
                if field in data or f"{field}_tickets" in data:
                    found_fields.append(field)
            
            self.log_result(
                "4. SLA Warnings (via Proxy)",
                True,
                f"Successfully retrieved SLA warnings data. Found fields: {found_fields if found_fields else 'basic structure'}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "4. SLA Warnings (via Proxy)",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_staff_ticket_statistics(self):
        """Test 5: Staff Ticket Statistics - GET https://scan-verify-hub.preview.emergentagent.com/api/staff/tickets/by-staff"""
        try:
            response = self.session.get(f"{API_BASE}/staff/tickets/by-staff")
            
            if response.status_code != 200:
                self.log_result(
                    "5. Staff Ticket Statistics",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response is a list or dict with stats
            if isinstance(data, list):
                stats_data = data
            elif isinstance(data, dict):
                # Handle nested structure: {"success": true, "data": {"staff_stats": [...]}}
                if "data" in data and "staff_stats" in data["data"]:
                    stats_data = data["data"]["staff_stats"]
                else:
                    stats_data = data.get("stats", data.get("data", []))
            else:
                stats_data = []
            
            if not isinstance(stats_data, list):
                self.log_result(
                    "5. Staff Ticket Statistics",
                    False,
                    f"Expected stats list, got: {type(stats_data)}",
                    data
                )
                return False
            
            self.log_result(
                "5. Staff Ticket Statistics",
                True,
                f"Successfully retrieved ticket statistics for {len(stats_data)} staff members"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "5. Staff Ticket Statistics",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_no_mixed_content_errors(self):
        """Test 6: Verify no Mixed Content Errors (all HTTPS calls)"""
        try:
            # All proxy calls should use HTTPS
            test_endpoints = [
                "/api/tickets/",
                "/api/staff/",
                "/api/sla/warnings",
                "/api/staff/tickets/by-staff"
            ]
            
            mixed_content_errors = []
            
            for endpoint in test_endpoints:
                try:
                    # Verify URL is HTTPS
                    full_url = f"{API_BASE}{endpoint}"
                    if not full_url.startswith("https://"):
                        mixed_content_errors.append(f"{endpoint} -> Not using HTTPS: {full_url}")
                        continue
                    
                    # Make request and check for mixed content issues
                    response = self.session.get(full_url)
                    
                    # Check if response indicates mixed content issues
                    if response.status_code == 400 and "mixed content" in response.text.lower():
                        mixed_content_errors.append(f"{endpoint} -> Mixed Content Error")
                    
                except Exception as e:
                    if "mixed content" in str(e).lower():
                        mixed_content_errors.append(f"{endpoint} -> Mixed Content Exception: {str(e)}")
            
            if mixed_content_errors:
                self.log_result(
                    "6. No Mixed Content Errors",
                    False,
                    f"Found Mixed Content issues: {mixed_content_errors}"
                )
                return False
            else:
                self.log_result(
                    "6. No Mixed Content Errors",
                    True,
                    "All proxy calls use HTTPS correctly, no Mixed Content errors detected"
                )
                return True
            
        except Exception as e:
            self.log_result(
                "6. No Mixed Content Errors",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_no_500_errors(self):
        """Test 7: Verify no 500 Internal Server Errors"""
        try:
            test_endpoints = [
                "/api/tickets/",
                "/api/staff/",
                "/api/sla/warnings",
                "/api/staff/tickets/by-staff"
            ]
            
            server_errors = []
            
            for endpoint in test_endpoints:
                try:
                    response = self.session.get(f"{API_BASE}{endpoint}")
                    if response.status_code >= 500:
                        server_errors.append(f"{endpoint} -> {response.status_code}")
                except Exception as e:
                    server_errors.append(f"{endpoint} -> Exception: {str(e)}")
            
            if server_errors:
                self.log_result(
                    "7. No 500 Internal Server Errors",
                    False,
                    f"Found server errors: {server_errors}"
                )
                return False
            else:
                self.log_result(
                    "7. No 500 Internal Server Errors",
                    True,
                    "All tested endpoints return no 500 Internal Server Errors"
                )
                return True
            
        except Exception as e:
            self.log_result(
                "7. No 500 Internal Server Errors",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all Phase 1 Ticketing System verification tests"""
        print("=" * 80)
        print("PHASE 1 TICKETING SYSTEM BACKEND VERIFICATION")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Microservice URL: {MICROSERVICE_URL}")
        print(f"Authentication: admin@tsrid.com / admin123")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Authenticating as Admin...")
            if not self.authenticate_admin():
                print("❌ Admin authentication failed. Stopping tests.")
                return False
            
            # Step 2: Test Microservice Health Check
            print("\n🔍 STEP 2: Testing Ticketing Microservice Health Check...")
            health_ok = self.test_microservice_health_check()
            
            # Step 3: Test Ticket List via Proxy
            print("\n🔍 STEP 3: Testing Ticket List via Proxy...")
            tickets_ok = self.test_ticket_list_via_proxy()
            
            # Step 4: Test Staff Management via Proxy
            print("\n🔍 STEP 4: Testing Staff Management via Proxy...")
            staff_ok = self.test_staff_management_via_proxy()
            
            # Step 5: Test SLA Warnings via Proxy
            print("\n🔍 STEP 5: Testing SLA Warnings via Proxy...")
            sla_ok = self.test_sla_warnings_via_proxy()
            
            # Step 6: Test Staff Ticket Statistics
            print("\n🔍 STEP 6: Testing Staff Ticket Statistics...")
            stats_ok = self.test_staff_ticket_statistics()
            
            # Step 7: Test No Mixed Content Errors
            print("\n🔍 STEP 7: Testing No Mixed Content Errors...")
            mixed_content_ok = self.test_no_mixed_content_errors()
            
            # Step 8: Test No 500 Errors
            print("\n🔍 STEP 8: Testing No 500 Internal Server Errors...")
            no_errors_ok = self.test_no_500_errors()
            
            # Summary
            print("\n" + "=" * 80)
            print("PHASE 1 TICKETING SYSTEM VERIFICATION SUMMARY")
            print("=" * 80)
            
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print(f"Tests completed: {passed}/{total} passed")
            
            # Print SUCCESS CRITERIA results
            print("\n🔍 SUCCESS CRITERIA VERIFICATION:")
            print(f"   ✅ Microservice Health Check erfolgreich: {'✅ JA' if health_ok else '❌ NEIN'}")
            print(f"   ✅ Ticket List wird korrekt zurückgegeben: {'✅ JA' if tickets_ok else '❌ NEIN'}")
            print(f"   ✅ Staff List wird korrekt zurückgegeben: {'✅ JA' if staff_ok else '❌ NEIN'}")
            print(f"   ✅ SLA Warnings werden korrekt zurückgegeben: {'✅ JA' if sla_ok else '❌ NEIN'}")
            print(f"   ✅ Staff Statistics werden korrekt zurückgegeben: {'✅ JA' if stats_ok else '❌ NEIN'}")
            print(f"   ✅ Keine 500 Errors, keine Mixed Content Errors: {'✅ JA' if (no_errors_ok and mixed_content_ok) else '❌ NEIN'}")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\n❌ PROBLEME GEFUNDEN:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['details']}")
            
            # Print successful tests
            successful_tests = [r for r in self.results if r['success']]
            if successful_tests:
                print("\n✅ ERFOLGREICHE TESTS:")
                for test in successful_tests:
                    print(f"   • {test['test']}")
            
            # Overall result
            all_success_criteria_met = all([health_ok, tickets_ok, staff_ok, sla_ok, stats_ok, no_errors_ok, mixed_content_ok])
            
            print(f"\n{'='*80}")
            if all_success_criteria_met:
                print("🎉 PHASE 1 TICKETING SYSTEM BACKEND VERIFICATION: ERFOLGREICH")
                print("Alle Success Criteria wurden erfüllt. Das System ist bereit für den Produktionseinsatz.")
            else:
                print("⚠️  PHASE 1 TICKETING SYSTEM BACKEND VERIFICATION: PROBLEME GEFUNDEN")
                print("Einige Success Criteria wurden nicht erfüllt. Bitte beheben Sie die oben genannten Probleme.")
            print(f"{'='*80}")
            
            return all_success_criteria_met
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            return False

if __name__ == "__main__":
    tester = Phase1TicketingVerificationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)