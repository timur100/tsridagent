#!/usr/bin/env python3
"""
Backend API Testing for Opening Hours Data Structure Investigation
Tests the opening hours data structure for location BERN03 (BERNAU BEI BERLIN)
"""

import requests
import json
import sys
import re
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://smart-dashboard-ui.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class OpeningHoursTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.target_location = "BERN03"
        self.location_name = "BERNAU BEI BERLIN"
        
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
    
    def query_location_in_database(self):
        """Query the database directly for BERN03 location opening hours structure"""
        try:
            # Try to find location data through locations API
            response = self.session.get(f"{API_BASE}/locations/search?locationCode={self.target_location}")
            
            if response.status_code != 200:
                self.log_result(
                    "Query Location Database", 
                    False, 
                    f"Failed to query location {self.target_location}. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Query Location Database", 
                    False, 
                    f"Location query unsuccessful",
                    data
                )
                return False
            
            locations = data.get("locations", [])
            
            if not locations:
                self.log_result(
                    "Query Location Database", 
                    False, 
                    f"No locations found for {self.target_location}",
                    data
                )
                return False
            
            # Find BERN03 location
            bern03_location = None
            for location in locations:
                if location.get("locationCode") == self.target_location:
                    bern03_location = location
                    break
            
            if not bern03_location:
                self.log_result(
                    "Query Location Database", 
                    False, 
                    f"Location {self.target_location} not found in results",
                    locations
                )
                return False
            
            # Check opening_hours field structure
            opening_hours = bern03_location.get("opening_hours")
            
            if opening_hours is None:
                self.log_result(
                    "Query Location Database", 
                    True, 
                    f"Location {self.target_location} found but opening_hours field is NULL/missing",
                    bern03_location
                )
                return {"type": "null", "data": None, "location": bern03_location}
            
            # Determine the type of opening_hours data
            opening_hours_type = type(opening_hours).__name__
            
            if isinstance(opening_hours, str):
                self.log_result(
                    "Query Location Database", 
                    True, 
                    f"Location {self.target_location} opening_hours is stored as STRING: '{opening_hours}'",
                    bern03_location
                )
                return {"type": "string", "data": opening_hours, "location": bern03_location}
            
            elif isinstance(opening_hours, dict):
                self.log_result(
                    "Query Location Database", 
                    True, 
                    f"Location {self.target_location} opening_hours is stored as OBJECT with keys: {list(opening_hours.keys())}",
                    bern03_location
                )
                return {"type": "object", "data": opening_hours, "location": bern03_location}
            
            elif isinstance(opening_hours, list):
                self.log_result(
                    "Query Location Database", 
                    True, 
                    f"Location {self.target_location} opening_hours is stored as ARRAY with {len(opening_hours)} items",
                    bern03_location
                )
                return {"type": "array", "data": opening_hours, "location": bern03_location}
            
            else:
                self.log_result(
                    "Query Location Database", 
                    True, 
                    f"Location {self.target_location} opening_hours has unexpected type: {opening_hours_type}",
                    bern03_location
                )
                return {"type": opening_hours_type, "data": opening_hours, "location": bern03_location}
            
        except Exception as e:
            self.log_result(
                "Query Location Database", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def find_ticket_with_bern03_location(self):
        """Find a ticket that has BERN03 location to test location-details endpoint"""
        try:
            # Get list of tickets - use correct endpoint
            response = self.session.get(f"{API_BASE}/tickets")
            
            if response.status_code != 200:
                self.log_result(
                    "Find BERN03 Ticket", 
                    False, 
                    f"Failed to get tickets list. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Find BERN03 Ticket", 
                    False, 
                    f"Tickets list query unsuccessful",
                    data
                )
                return False
            
            tickets = data.get("tickets", [])
            
            if not tickets:
                self.log_result(
                    "Find BERN03 Ticket", 
                    False, 
                    f"No tickets found in system",
                    data
                )
                return False
            
            # Look for tickets with BERN03 location
            bern03_tickets = []
            for ticket in tickets:
                location_code = ticket.get("location_code") or ticket.get("locationCode")
                if location_code == self.target_location:
                    bern03_tickets.append(ticket)
            
            if not bern03_tickets:
                self.log_result(
                    "Find BERN03 Ticket", 
                    False, 
                    f"No tickets found with location {self.target_location}. Available locations: {list(set([t.get('location_code') or t.get('locationCode') for t in tickets if t.get('location_code') or t.get('locationCode')]))}"
                )
                return False
            
            # Use the first BERN03 ticket found
            target_ticket = bern03_tickets[0]
            ticket_id = target_ticket.get("id") or target_ticket.get("ticket_id")
            
            self.log_result(
                "Find BERN03 Ticket", 
                True, 
                f"Found {len(bern03_tickets)} tickets with location {self.target_location}. Using ticket ID: {ticket_id}"
            )
            
            return {"ticket_id": ticket_id, "ticket": target_ticket, "all_bern03_tickets": bern03_tickets}
            
        except Exception as e:
            self.log_result(
                "Find BERN03 Ticket", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def create_test_ticket_with_bern03(self):
        """Create a test ticket with BERN03 location for testing"""
        try:
            ticket_data = {
                "title": "Test Ticket for Opening Hours Investigation",
                "description": "This is a test ticket created to investigate opening hours data structure for BERN03 location.",
                "priority": "low",
                "category": "technical",
                "location_id": self.target_location
            }
            
            response = self.session.post(f"{API_BASE}/tickets", json=ticket_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Create Test Ticket", 
                    False, 
                    f"Failed to create test ticket. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Create Test Ticket", 
                    False, 
                    f"Test ticket creation unsuccessful",
                    data
                )
                return False
            
            ticket = data.get("ticket", {})
            ticket_id = ticket.get("id")
            
            self.log_result(
                "Create Test Ticket", 
                True, 
                f"Successfully created test ticket with ID: {ticket_id} for location {self.target_location}"
            )
            
            return {"ticket_id": ticket_id, "ticket": ticket}
            
        except Exception as e:
            self.log_result(
                "Create Test Ticket", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_ticket_location_details(self, ticket_id):
        """Test GET /api/tickets/{ticket_id}/location-details endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/tickets/{ticket_id}/location-details")
            
            if response.status_code != 200:
                self.log_result(
                    "Ticket Location Details", 
                    False, 
                    f"Failed to get location details for ticket {ticket_id}. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Ticket Location Details", 
                    False, 
                    f"Location details query unsuccessful for ticket {ticket_id}",
                    data
                )
                return False
            
            # Check what's returned in opening_hours field
            location_details = data.get("location", {})
            opening_hours = location_details.get("opening_hours")
            
            if opening_hours is None:
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours as NULL/missing",
                    data
                )
                return {"type": "null", "data": None, "response": data}
            
            # Check if it's "Nicht verfügbar"
            if isinstance(opening_hours, str) and opening_hours == "Nicht verfügbar":
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours as 'Nicht verfügbar' (this is the reported issue)",
                    data
                )
                return {"type": "nicht_verfuegbar", "data": opening_hours, "response": data}
            
            # Determine the type of opening_hours data
            opening_hours_type = type(opening_hours).__name__
            
            if isinstance(opening_hours, str):
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours as STRING: '{opening_hours}'",
                    data
                )
                return {"type": "string", "data": opening_hours, "response": data}
            
            elif isinstance(opening_hours, dict):
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours as OBJECT with keys: {list(opening_hours.keys())}",
                    data
                )
                return {"type": "object", "data": opening_hours, "response": data}
            
            elif isinstance(opening_hours, list):
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours as ARRAY with {len(opening_hours)} items",
                    data
                )
                return {"type": "array", "data": opening_hours, "response": data}
            
            else:
                self.log_result(
                    "Ticket Location Details", 
                    True, 
                    f"Ticket {ticket_id} location-details returns opening_hours with unexpected type: {opening_hours_type}",
                    data
                )
                return {"type": opening_hours_type, "data": opening_hours, "response": data}
            
        except Exception as e:
            self.log_result(
                "Ticket Location Details", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def check_stations_collection(self):
        """Check if there's a stations collection with opening hours data"""
        try:
            # Try to get location by code directly
            response = self.session.get(f"{API_BASE}/locations/{self.target_location}")
            
            if response.status_code != 200:
                self.log_result(
                    "Check Stations Collection", 
                    False, 
                    f"Failed to get location {self.target_location} directly. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check opening_hours field structure in direct location lookup
            opening_hours = data.get("opening_hours")
            
            if opening_hours is None:
                self.log_result(
                    "Check Stations Collection", 
                    True, 
                    f"Direct location lookup for {self.target_location} returns opening_hours as NULL/missing",
                    data
                )
                return {"type": "null", "data": None, "location": data}
            
            # Determine the type of opening_hours data
            opening_hours_type = type(opening_hours).__name__
            
            if isinstance(opening_hours, str):
                self.log_result(
                    "Check Stations Collection", 
                    True, 
                    f"Direct location lookup for {self.target_location} returns opening_hours as STRING: '{opening_hours}'",
                    data
                )
                return {"type": "string", "data": opening_hours, "location": data}
            
            elif isinstance(opening_hours, dict):
                self.log_result(
                    "Check Stations Collection", 
                    True, 
                    f"Direct location lookup for {self.target_location} returns opening_hours as OBJECT with keys: {list(opening_hours.keys())}",
                    data
                )
                return {"type": "object", "data": opening_hours, "location": data}
            
            elif isinstance(opening_hours, list):
                self.log_result(
                    "Check Stations Collection", 
                    True, 
                    f"Direct location lookup for {self.target_location} returns opening_hours as ARRAY with {len(opening_hours)} items",
                    data
                )
                return {"type": "array", "data": opening_hours, "location": data}
            
            else:
                self.log_result(
                    "Check Stations Collection", 
                    True, 
                    f"Direct location lookup for {self.target_location} returns opening_hours with unexpected type: {opening_hours_type}",
                    data
                )
                return {"type": opening_hours_type, "data": opening_hours, "location": data}
            
        except Exception as e:
            self.log_result(
                "Check Stations Collection", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all opening hours investigation tests"""
        print("=" * 70)
        print("OPENING HOURS DATA STRUCTURE INVESTIGATION")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Target Location: {self.target_location} ({self.location_name})")
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
        
        # Step 1: Query location database structure
        print("🔍 STEP 1: Querying location database for opening hours structure...")
        location_result = self.query_location_in_database()
        if location_result:
            print(f"   📊 Database opening_hours type: {location_result.get('type')}")
            if location_result.get('data'):
                print(f"   📊 Database opening_hours data: {location_result.get('data')}")
        
        # Step 2: Check stations collection directly
        print("\n🔍 STEP 2: Checking stations collection directly...")
        stations_result = self.check_stations_collection()
        if stations_result:
            print(f"   📊 Stations opening_hours type: {stations_result.get('type')}")
            if stations_result.get('data'):
                print(f"   📊 Stations opening_hours data: {stations_result.get('data')}")
        
        # Step 3: Find ticket with BERN03 location
        print("\n🔍 STEP 3: Finding ticket with BERN03 location...")
        ticket_result = self.find_ticket_with_bern03_location()
        
        if not ticket_result:
            # No existing ticket found, create one for testing
            print("   📝 No existing BERN03 ticket found, creating test ticket...")
            ticket_result = self.create_test_ticket_with_bern03()
        
        if ticket_result:
            ticket_id = ticket_result.get('ticket_id')
            print(f"   🎫 Using ticket ID: {ticket_id}")
            
            # Step 4: Test ticket location-details endpoint
            print(f"\n🔍 STEP 4: Testing ticket location-details endpoint...")
            details_result = self.test_ticket_location_details(ticket_id)
            if details_result:
                print(f"   📊 Ticket API opening_hours type: {details_result.get('type')}")
                if details_result.get('data'):
                    print(f"   📊 Ticket API opening_hours data: {details_result.get('data')}")
        else:
            print("   ❌ Could not find or create a ticket with BERN03 location")
            details_result = None
        
        # Summary
        print("\n" + "=" * 70)
        print("OPENING HOURS INVESTIGATION SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Analysis
        print("\n📋 ANALYSIS:")
        
        if location_result:
            print(f"• Database Query: opening_hours stored as {location_result.get('type')}")
            if location_result.get('type') == 'string' and location_result.get('data'):
                print(f"  - String value: '{location_result.get('data')}'")
            elif location_result.get('type') == 'object' and location_result.get('data'):
                print(f"  - Object keys: {list(location_result.get('data').keys())}")
            elif location_result.get('type') == 'null':
                print(f"  - Field is NULL/missing in database")
        
        if stations_result:
            print(f"• Stations Collection: opening_hours stored as {stations_result.get('type')}")
            if stations_result.get('type') == 'string' and stations_result.get('data'):
                print(f"  - String value: '{stations_result.get('data')}'")
            elif stations_result.get('type') == 'object' and stations_result.get('data'):
                print(f"  - Object keys: {list(stations_result.get('data').keys())}")
            elif stations_result.get('type') == 'null':
                print(f"  - Field is NULL/missing in stations collection")
        
        if ticket_result and details_result:
            print(f"• Ticket API Response: opening_hours returned as {details_result.get('type')}")
            if details_result.get('type') == 'nicht_verfuegbar':
                print(f"  - ⚠️  ISSUE CONFIRMED: API returns 'Nicht verfügbar' instead of actual hours")
            elif details_result.get('type') == 'string' and details_result.get('data'):
                print(f"  - String value: '{details_result.get('data')}'")
            elif details_result.get('type') == 'object' and details_result.get('data'):
                print(f"  - Object keys: {list(details_result.get('data').keys())}")
            elif details_result.get('type') == 'null':
                print(f"  - Field is NULL/missing in API response")
        
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
    print("Starting Opening Hours Data Structure Investigation...")
    print()
    
    # Test Opening Hours Investigation
    opening_hours_tester = OpeningHoursTester()
    test_success = opening_hours_tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL INVESTIGATION SUMMARY")
    print("=" * 70)
    print(f"Opening Hours Investigation: {'✅ COMPLETED SUCCESSFULLY' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 OPENING HOURS INVESTIGATION COMPLETED!")
        sys.exit(0)
    else:
        print("❌ OPENING HOURS INVESTIGATION FOUND ISSUES!")
        sys.exit(1)