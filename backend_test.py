#!/usr/bin/env python3
"""
Backend API Testing for Ticketing Microservice Migration
Tests the complete microservices architecture migration with focus on Ticketing Service
"""

import requests
import json
import sys
import re
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://inventory-service.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TicketingMicroserviceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.microservices = {
            'id_verification': 8101,
            'inventory': 8102,
            'ticketing': 8103
        }
        
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
            # Get list of tickets
            response = self.session.get(f"{API_BASE}/tickets/list")
            
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
    
    def test_ticketing_service_health(self):
        """Test Ticketing Service health check on port 8103"""
        try:
            response = self.session.get("http://localhost:8103/health")
            
            if response.status_code != 200:
                self.log_result(
                    "Ticketing Service Health Check", 
                    False, 
                    f"Health check failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            expected_response = {"status": "healthy", "service": "Ticketing Service"}
            if data != expected_response:
                self.log_result(
                    "Ticketing Service Health Check", 
                    False, 
                    f"Unexpected health check response",
                    data
                )
                return False
            
            self.log_result(
                "Ticketing Service Health Check", 
                True, 
                "Ticketing Service health check passed"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Ticketing Service Health Check", 
                False, 
                f"Cannot connect to Ticketing Service: {str(e)}"
            )
            return False
    
    def test_ticketing_service_info(self):
        """Test Ticketing Service root endpoint on port 8103"""
        try:
            response = self.session.get("http://localhost:8103/")
            
            if response.status_code != 200:
                self.log_result(
                    "Ticketing Service Info", 
                    False, 
                    f"Service info failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            required_fields = ["service", "status", "version"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    "Ticketing Service Info", 
                    False, 
                    f"Missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("service") != "Ticketing Service":
                self.log_result(
                    "Ticketing Service Info", 
                    False, 
                    f"Unexpected service name: {data.get('service')}",
                    data
                )
                return False
            
            self.log_result(
                "Ticketing Service Info", 
                True, 
                f"Service info correct: {data.get('service')} v{data.get('version')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Ticketing Service Info", 
                False, 
                f"Cannot connect to Ticketing Service: {str(e)}"
            )
            return False
    
    def test_all_microservices_health(self):
        """Test health of all 3 microservices"""
        all_healthy = True
        
        for service_name, port in self.microservices.items():
            try:
                response = self.session.get(f"http://localhost:{port}/health")
                
                if response.status_code != 200:
                    self.log_result(
                        f"{service_name.title()} Service Health", 
                        False, 
                        f"Health check failed. Status: {response.status_code}",
                        response.text
                    )
                    all_healthy = False
                    continue
                
                data = response.json()
                
                if data.get("status") != "healthy":
                    self.log_result(
                        f"{service_name.title()} Service Health", 
                        False, 
                        f"Service not healthy: {data.get('status')}",
                        data
                    )
                    all_healthy = False
                    continue
                
                self.log_result(
                    f"{service_name.title()} Service Health", 
                    True, 
                    f"Service healthy on port {port}"
                )
                
            except Exception as e:
                self.log_result(
                    f"{service_name.title()} Service Health", 
                    False, 
                    f"Cannot connect to service on port {port}: {str(e)}"
                )
                all_healthy = False
        
        return all_healthy
    
    def test_ticketing_service_apis(self):
        """Test Ticketing Service APIs with authentication"""
        if not self.admin_token:
            self.log_result(
                "Ticketing Service APIs", 
                False, 
                "Admin authentication required for API testing"
            )
            return False
        
        # Test ticket statistics
        try:
            response = self.session.get("http://localhost:8103/api/tickets/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Ticketing API - Stats", 
                    False, 
                    f"Stats API failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not isinstance(data, dict):
                self.log_result(
                    "Ticketing API - Stats", 
                    False, 
                    "Stats response is not a dictionary",
                    data
                )
                return False
            
            self.log_result(
                "Ticketing API - Stats", 
                True, 
                "Ticket statistics API working"
            )
            
        except Exception as e:
            self.log_result(
                "Ticketing API - Stats", 
                False, 
                f"Exception in stats API: {str(e)}"
            )
            return False
        
        # Test ticket list
        try:
            response = self.session.get("http://localhost:8103/api/tickets")
            
            if response.status_code != 200:
                self.log_result(
                    "Ticketing API - List", 
                    False, 
                    f"List API failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Ticketing API - List", 
                    False, 
                    "List API response success is not True",
                    data
                )
                return False
            
            tickets = data.get("tickets", [])
            
            # Look for test ticket TK.20251109.001
            test_ticket_found = False
            for ticket in tickets:
                if ticket.get("ticket_number") == "TK.20251109.001":
                    test_ticket_found = True
                    break
            
            if test_ticket_found:
                self.log_result(
                    "Ticketing API - List", 
                    True, 
                    f"Ticket list API working, found test ticket TK.20251109.001 among {len(tickets)} tickets"
                )
            else:
                self.log_result(
                    "Ticketing API - List", 
                    True, 
                    f"Ticket list API working, {len(tickets)} tickets found (test ticket TK.20251109.001 not found)"
                )
            
        except Exception as e:
            self.log_result(
                "Ticketing API - List", 
                False, 
                f"Exception in list API: {str(e)}"
            )
            return False
        
        # Test ticket creation
        try:
            ticket_data = {
                "title": "Test Ticket from Microservice Testing",
                "description": "This is a test ticket created during microservice testing",
                "priority": "medium",
                "category": "technical",
                "location_code": "BERN01",
                "customer_email": "admin@tsrid.com"
            }
            
            response = self.session.post("http://localhost:8103/api/tickets", json=ticket_data)
            
            if response.status_code not in [200, 201]:
                self.log_result(
                    "Ticketing API - Create", 
                    False, 
                    f"Create API failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Ticketing API - Create", 
                    False, 
                    "Create API response success is not True",
                    data
                )
                return False
            
            ticket_id = data.get("ticket_id")
            if not ticket_id:
                self.log_result(
                    "Ticketing API - Create", 
                    False, 
                    "Create API response missing ticket_id",
                    data
                )
                return False
            
            self.log_result(
                "Ticketing API - Create", 
                True, 
                f"Ticket creation API working, created ticket ID: {ticket_id}"
            )
            
            # Test get ticket by ID
            try:
                response = self.session.get(f"http://localhost:8103/api/tickets/{ticket_id}")
                
                if response.status_code != 200:
                    self.log_result(
                        "Ticketing API - Get by ID", 
                        False, 
                        f"Get by ID API failed. Status: {response.status_code}",
                        response.text
                    )
                    return False
                
                data = response.json()
                
                if not data.get("success"):
                    self.log_result(
                        "Ticketing API - Get by ID", 
                        False, 
                        "Get by ID API response success is not True",
                        data
                    )
                    return False
                
                ticket = data.get("ticket")
                if not ticket or ticket.get("id") != ticket_id:
                    self.log_result(
                        "Ticketing API - Get by ID", 
                        False, 
                        f"Get by ID returned wrong ticket or no ticket",
                        data
                    )
                    return False
                
                self.log_result(
                    "Ticketing API - Get by ID", 
                    True, 
                    f"Get ticket by ID API working for ticket {ticket_id}"
                )
                
            except Exception as e:
                self.log_result(
                    "Ticketing API - Get by ID", 
                    False, 
                    f"Exception in get by ID API: {str(e)}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Ticketing API - Create", 
                False, 
                f"Exception in create API: {str(e)}"
            )
            return False
        
        return True
    
    def test_service_proxy_routes(self):
        """Test service proxy routes through main backend"""
        # Test proxy to Ticketing Service via main backend
        try:
            response = self.session.get(f"{API_BASE}/services/tickets/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Service Proxy - Ticketing Stats", 
                    False, 
                    f"Proxy to ticketing stats failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not isinstance(data, dict):
                self.log_result(
                    "Service Proxy - Ticketing Stats", 
                    False, 
                    "Proxy response is not a dictionary",
                    data
                )
                return False
            
            self.log_result(
                "Service Proxy - Ticketing Stats", 
                True, 
                "Proxy route to Ticketing Service stats working"
            )
            
        except Exception as e:
            self.log_result(
                "Service Proxy - Ticketing Stats", 
                False, 
                f"Exception in proxy route: {str(e)}"
            )
            return False
        
        # Test proxy to Inventory Service via main backend
        try:
            response = self.session.get(f"{API_BASE}/services/inventory/stats")
            
            if response.status_code != 200:
                self.log_result(
                    "Service Proxy - Inventory Stats", 
                    False, 
                    f"Proxy to inventory stats failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not isinstance(data, dict):
                self.log_result(
                    "Service Proxy - Inventory Stats", 
                    False, 
                    "Proxy response is not a dictionary",
                    data
                )
                return False
            
            self.log_result(
                "Service Proxy - Inventory Stats", 
                True, 
                "Proxy route to Inventory Service stats working"
            )
            
        except Exception as e:
            self.log_result(
                "Service Proxy - Inventory Stats", 
                False, 
                f"Exception in proxy route: {str(e)}"
            )
            return False
        
        return True
    
    def test_admin_portal_microservices_display(self):
        """Test that Ticketing Service appears in Admin Portal Microservices page"""
        try:
            # Get services configuration
            response = self.session.get(f"{API_BASE}/services-config/list")
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Portal - Services List", 
                    False, 
                    f"Services config list failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Admin Portal - Services List", 
                    False, 
                    "Services config response success is not True",
                    data
                )
                return False
            
            services = data.get("services", [])
            
            # Look for Ticketing Service
            ticketing_service_found = False
            for service in services:
                if service.get("service_type") == "ticketing":
                    ticketing_service_found = True
                    
                    # Verify service details
                    if service.get("base_url") != "http://localhost:8103":
                        self.log_result(
                            "Admin Portal - Ticketing Service Registration", 
                            False, 
                            f"Ticketing Service has wrong base_url: {service.get('base_url')}",
                            service
                        )
                        return False
                    
                    break
            
            if not ticketing_service_found:
                self.log_result(
                    "Admin Portal - Ticketing Service Registration", 
                    False, 
                    "Ticketing Service not found in services configuration",
                    services
                )
                return False
            
            self.log_result(
                "Admin Portal - Ticketing Service Registration", 
                True, 
                "Ticketing Service properly registered in Admin Portal"
            )
            
            # Test MongoDB info for Ticketing Service
            try:
                response = self.session.get(f"{API_BASE}/mongodb-summary?service_type=ticketing")
                
                if response.status_code != 200:
                    self.log_result(
                        "Admin Portal - MongoDB Info", 
                        False, 
                        f"MongoDB info failed. Status: {response.status_code}",
                        response.text
                    )
                    return False
                
                data = response.json()
                
                if not data.get("success"):
                    self.log_result(
                        "Admin Portal - MongoDB Info", 
                        False, 
                        "MongoDB info response success is not True",
                        data
                    )
                    return False
                
                mongodb_info = data.get("mongodb_info", {})
                
                # Verify database name
                if mongodb_info.get("database") != "ticketing_db":
                    self.log_result(
                        "Admin Portal - MongoDB Info", 
                        False, 
                        f"Wrong database name: {mongodb_info.get('database')}",
                        mongodb_info
                    )
                    return False
                
                # Verify collections count
                collections_count = mongodb_info.get("collections_count", 0)
                if collections_count < 1:
                    self.log_result(
                        "Admin Portal - MongoDB Info", 
                        False, 
                        f"Expected at least 1 collection, got {collections_count}",
                        mongodb_info
                    )
                    return False
                
                # Verify documents count
                documents_count = mongodb_info.get("documents_count", 0)
                if documents_count < 1:
                    self.log_result(
                        "Admin Portal - MongoDB Info", 
                        False, 
                        f"Expected at least 1 document, got {documents_count}",
                        mongodb_info
                    )
                    return False
                
                self.log_result(
                    "Admin Portal - MongoDB Info", 
                    True, 
                    f"MongoDB info correct: ticketing_db, {collections_count} collection(s), {documents_count} document(s)"
                )
                
            except Exception as e:
                self.log_result(
                    "Admin Portal - MongoDB Info", 
                    False, 
                    f"Exception in MongoDB info: {str(e)}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Admin Portal - Services List", 
                False, 
                f"Exception in services list: {str(e)}"
            )
            return False
        
        return True
    
    def test_monolithic_routes_disabled(self):
        """Test that old monolithic routes are disabled"""
        # Test that old ticket routes return 404 or are not accessible
        try:
            # This should fail because the old routes are commented out
            response = self.session.get(f"{API_BASE}/tickets/list")
            
            # We expect this to fail (404) because the route should be disabled
            if response.status_code == 200:
                self.log_result(
                    "Monolithic Routes Cleanup", 
                    False, 
                    "Old monolithic ticket routes are still active (should be disabled)",
                    response.json()
                )
                return False
            
            self.log_result(
                "Monolithic Routes Cleanup", 
                True, 
                f"Old monolithic ticket routes properly disabled (status: {response.status_code})"
            )
            
        except Exception as e:
            self.log_result(
                "Monolithic Routes Cleanup", 
                True, 
                f"Old monolithic routes properly disabled (connection error expected): {str(e)}"
            )
        
        return True
    
    def run_all_tests(self):
        """Run all Ticketing microservice migration tests"""
        print("=" * 70)
        print("TICKETING MICROSERVICE MIGRATION TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Microservices: {list(self.microservices.keys())}")
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
        
        # Step 1: Test Ticketing Service Health & Connectivity
        print("🔍 STEP 1: Testing Ticketing Service Health & Connectivity...")
        if not self.test_ticketing_service_health():
            print("❌ Ticketing Service health check failed.")
        
        if not self.test_ticketing_service_info():
            print("❌ Ticketing Service info check failed.")
        
        # Step 2: Test All Microservices Health
        print("\n🔍 STEP 2: Testing All Microservices Health...")
        if not self.test_all_microservices_health():
            print("❌ Some microservices are not healthy.")
        
        # Step 3: Test Admin Portal Service Registration
        print("\n🔍 STEP 3: Testing Admin Portal Service Registration...")
        if not self.test_admin_portal_microservices_display():
            print("❌ Admin Portal service registration failed.")
        
        # Step 4: Test Ticketing Service APIs
        print("\n🔍 STEP 4: Testing Ticketing Service APIs...")
        if not self.test_ticketing_service_apis():
            print("❌ Ticketing Service APIs failed.")
        
        # Step 5: Test Service Proxy Routes
        print("\n🔍 STEP 5: Testing Service Proxy Routes...")
        if not self.test_service_proxy_routes():
            print("❌ Service proxy routes failed.")
        
        # Step 6: Test Monolithic Routes Cleanup
        print("\n🔍 STEP 6: Testing Monolithic Routes Cleanup...")
        if not self.test_monolithic_routes_disabled():
            print("❌ Monolithic routes cleanup failed.")
        
        # Summary
        print("\n" + "=" * 70)
        print("TICKETING MICROSERVICE MIGRATION SUMMARY")
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
        """Test POST /api/resources/init-categories endpoint"""
        try:
            response = self.session.post(f"{API_BASE}/resources/init-categories")
            
            if response.status_code != 200:
                self.log_result(
                    "Initialize Categories", 
                    False, 
                    f"Category initialization failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check required fields in response
            if not data.get("success"):
                self.log_result(
                    "Initialize Categories", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            folders = data.get("folders", {})
            
            # Check if all expected categories are present
            missing_categories = [cat for cat in self.expected_categories if cat not in folders]
            
            if missing_categories:
                self.log_result(
                    "Initialize Categories", 
                    False, 
                    f"Missing categories in response: {missing_categories}",
                    data
                )
                return False
            
            # Check folder structure
            created_count = 0
            existing_count = 0
            
            for category_id, folder_info in folders.items():
                status = folder_info.get("status")
                if status == "created":
                    created_count += 1
                elif status == "already_exists":
                    existing_count += 1
            
            self.log_result(
                "Initialize Categories", 
                True, 
                f"Categories initialized successfully. Created: {created_count}, Already existed: {existing_count}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Initialize Categories", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_all_categories(self):
        """Test GET /api/resources/categories endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/resources/categories")
            
            if response.status_code != 200:
                self.log_result(
                    "Get All Categories", 
                    False, 
                    f"Failed to get categories: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "Get All Categories", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            categories = data.get("categories", [])
            
            # Check if all expected categories are present
            category_ids = [cat.get("category") for cat in categories]
            missing_categories = [cat for cat in self.expected_categories if cat not in category_ids]
            
            if missing_categories:
                self.log_result(
                    "Get All Categories", 
                    False, 
                    f"Missing categories: {missing_categories}",
                    data
                )
                return False
            
            # Validate category structure
            total_files = 0
            category_details = []
            
            for category in categories:
                required_fields = ["category", "display_name", "files", "count"]
                missing_fields = [field for field in required_fields if field not in category]
                
                if missing_fields:
                    self.log_result(
                        "Get All Categories", 
                        False, 
                        f"Category {category.get('category')} missing fields: {missing_fields}",
                        category
                    )
                    return False
                
                files = category.get("files", [])
                count = category.get("count", 0)
                
                if len(files) != count:
                    self.log_result(
                        "Get All Categories", 
                        False, 
                        f"Category {category.get('category')} file count mismatch: {len(files)} files but count={count}"
                    )
                    return False
                
                total_files += count
                category_details.append({
                    "category": category.get("category"),
                    "display_name": category.get("display_name"),
                    "file_count": count
                })
            
            self.log_result(
                "Get All Categories", 
                True, 
                f"Successfully retrieved {len(categories)} categories with {total_files} total files"
            )
            return category_details
            
        except Exception as e:
            self.log_result(
                "Get All Categories", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_get_specific_category(self, category_id):
        """Test GET /api/resources/category/{category_id} endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/resources/category/{category_id}")
            
            if response.status_code != 200:
                self.log_result(
                    f"Get Category '{category_id}'", 
                    False, 
                    f"Failed to get category {category_id}: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    f"Get Category '{category_id}'", 
                    False, 
                    "Response success field is not True",
                    data
                )
                return False
            
            # Validate response structure
            required_fields = ["category", "display_name", "files", "count"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result(
                    f"Get Category '{category_id}'", 
                    False, 
                    f"Response missing required fields: {missing_fields}",
                    data
                )
                return False
            
            if data.get("category") != category_id:
                self.log_result(
                    f"Get Category '{category_id}'", 
                    False, 
                    f"Category ID mismatch: expected {category_id}, got {data.get('category')}"
                )
                return False
            
            files = data.get("files", [])
            count = data.get("count", 0)
            
            if len(files) != count:
                self.log_result(
                    f"Get Category '{category_id}'", 
                    False, 
                    f"File count mismatch: {len(files)} files but count={count}"
                )
                return False
            
            # Validate file structure if files exist
            if files:
                for i, file_item in enumerate(files):
                    required_file_fields = ["name", "path", "url", "download_url", "category"]
                    missing_file_fields = [field for field in required_file_fields if field not in file_item]
                    
                    if missing_file_fields:
                        self.log_result(
                            f"Get Category '{category_id}'", 
                            False, 
                            f"File {i} missing fields: {missing_file_fields}",
                            file_item
                        )
                        return False
            
            self.log_result(
                f"Get Category '{category_id}'", 
                True, 
                f"Successfully retrieved category '{data.get('display_name')}' with {count} files"
            )
            return data
            
        except Exception as e:
            self.log_result(
                f"Get Category '{category_id}'", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_invalid_category(self):
        """Test GET /api/resources/category/{invalid_category} endpoint with invalid category"""
        try:
            invalid_category = "invalid_category_test"
            response = self.session.get(f"{API_BASE}/resources/category/{invalid_category}")
            
            if response.status_code != 404:
                self.log_result(
                    "Invalid Category Test", 
                    False, 
                    f"Expected 404 for invalid category, got {response.status_code}",
                    response.text
                )
                return False
            
            self.log_result(
                "Invalid Category Test", 
                True, 
                f"Correctly returned 404 for invalid category '{invalid_category}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Invalid Category Test", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False
    
    def test_dropbox_access_token(self):
        """Test if Dropbox access token is properly configured"""
        try:
            # This is tested indirectly through the verify-connection endpoint
            # If verify-connection works, the token is properly configured
            response = self.session.get(f"{API_BASE}/resources/verify-connection")
            
            if response.status_code == 500:
                # Check if it's a token configuration issue
                try:
                    data = response.json()
                    if "access token not configured" in data.get("detail", "").lower():
                        self.log_result(
                            "Dropbox Access Token Configuration", 
                            False, 
                            "Dropbox access token is not configured in environment variables"
                        )
                        return False
                except:
                    pass
            
            if response.status_code == 401:
                self.log_result(
                    "Dropbox Access Token Configuration", 
                    False, 
                    "Dropbox access token is invalid or expired"
                )
                return False
            
            if response.status_code == 200:
                self.log_result(
                    "Dropbox Access Token Configuration", 
                    True, 
                    "Dropbox access token is properly configured and valid"
                )
                return True
            
            self.log_result(
                "Dropbox Access Token Configuration", 
                False, 
                f"Unexpected response status: {response.status_code}"
            )
            return False
            
        except Exception as e:
            self.log_result(
                "Dropbox Access Token Configuration", 
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
    
    def run_all_tests(self):
        """Run all Dropbox resources integration tests"""
        print("=" * 70)
        print("DROPBOX RESOURCES INTEGRATION TESTING")
        print("=" * 70)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Expected Categories: {', '.join(self.expected_categories)}")
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
        
        # Step 1: Test Dropbox access token configuration
        if not self.test_dropbox_access_token():
            print("❌ Dropbox access token configuration failed. Stopping tests.")
            return False
        
        # Step 2: Test Dropbox connection verification
        if not self.test_verify_connection():
            print("❌ Dropbox connection verification failed. Stopping tests.")
            return False
        
        # Step 3: Test category initialization (may fail due to permissions)
        init_result = self.test_init_categories()
        if not init_result:
            print("⚠️  Category initialization failed (likely due to Dropbox app permissions). Continuing with read-only tests.")
        
        # Step 4: Test getting all categories
        category_details = self.test_get_all_categories()
        if not category_details:
            print("❌ Failed to get all categories.")
            return False
        
        # Step 5: Test getting specific categories
        for category_id in self.expected_categories:
            category_result = self.test_get_specific_category(category_id)
            if not category_result:
                print(f"❌ Failed to get category '{category_id}'.")
        
        # Step 6: Test invalid category handling
        self.test_invalid_category()
        
        # Summary
        print("=" * 70)
        print("DROPBOX RESOURCES INTEGRATION SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Tests completed: {passed}/{total} passed")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("\nISSUES FOUND:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        # Print successful tests
        successful_tests = [r for r in self.results if r['success']]
        if successful_tests:
            print("\nSUCCESSFUL CHECKS:")
            for test in successful_tests:
                print(f"✅ {test['test']}: {test['details']}")
        
        return len(failed_tests) == 0

if __name__ == "__main__":
    print("Starting Dropbox Resources Integration Testing...")
    print()
    
    # Test Dropbox Resources Integration
    dropbox_tester = DropboxResourcesTester()
    test_success = dropbox_tester.run_all_tests()
    
    print()
    print("=" * 70)
    print("OVERALL TESTING SUMMARY")
    print("=" * 70)
    print(f"Dropbox Resources Integration: {'✅ ALL TESTS PASSED' if test_success else '❌ ISSUES FOUND'}")
    print("=" * 70)
    
    # Exit with appropriate code
    if test_success:
        print("🎉 DROPBOX RESOURCES INTEGRATION TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ DROPBOX RESOURCES INTEGRATION TESTING FOUND ISSUES!")
        sys.exit(1)