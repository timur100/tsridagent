#!/usr/bin/env python3
"""
Backend API Testing Suite - MOBILITY SERVICES PHASE 1 COMPREHENSIVE TESTING
Tests Mobility Services Backend APIs for multi-modal mobility booking system:

VEHICLE MANAGEMENT APIs (8 endpoints):
- POST /api/mobility/vehicles?tenant_id=test-tenant - Create vehicle
- GET /api/mobility/vehicles?tenant_id=test-tenant - Get all vehicles
- GET /api/mobility/vehicles?tenant_id=test-tenant&vehicle_type=car - Filter by type
- GET /api/mobility/vehicles?tenant_id=test-tenant&available_only=true - Filter available only
- GET /api/mobility/vehicles/{vehicle_id} - Get single vehicle
- PUT /api/mobility/vehicles/{vehicle_id} - Update vehicle
- PATCH /api/mobility/vehicles/{vehicle_id}/status?status=maintenance - Update status
- DELETE /api/mobility/vehicles/{vehicle_id} - Delete vehicle

LOCATION MANAGEMENT APIs (5 endpoints):
- POST /api/mobility/locations?tenant_id=test-tenant - Create location
- GET /api/mobility/locations?tenant_id=test-tenant - Get all locations
- GET /api/mobility/locations/{location_id} - Get single location with vehicle counts
- PUT /api/mobility/locations/{location_id} - Update location
- DELETE /api/mobility/locations/{location_id} - Delete location

BOOKING SYSTEM APIs (5 endpoints):
- POST /api/mobility/bookings?tenant_id=test-tenant - Create booking
- GET /api/mobility/bookings?tenant_id=test-tenant - Get all bookings
- GET /api/mobility/bookings/{booking_id} - Get single booking with enriched data
- PATCH /api/mobility/bookings/{booking_id}/status?status=active - Update status
- DELETE /api/mobility/bookings/{booking_id} - Cancel booking

CHECK-IN/CHECK-OUT APIs (2 endpoints):
- POST /api/mobility/bookings/{booking_id}/check-in - Check-in with odometer/fuel data
- POST /api/mobility/bookings/{booking_id}/check-out - Check-out with cost calculation

ADDITIONAL FEATURES (3 endpoints):
- GET /api/mobility/availability?tenant_id=test-tenant&vehicle_type=car&start_time=2025-12-01T10:00:00&end_time=2025-12-01T18:00:00 - Check availability
- POST /api/mobility/calculate-price - Calculate price for booking
- GET /api/mobility/statistics?tenant_id=test-tenant - Get statistics dashboard

Test Data:
- Tenant ID: test-tenant
- Authentication: admin@tsrid.com / admin123
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
import uuid

# Backend URL from environment
BACKEND_URL = "https://fleet-genius-9.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
main_db = mongo_client['main_db']

class MobilityServicesTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        self.created_location_id = None
        self.created_vehicle_id = None
        self.created_booking_id = None
        
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

    def test_create_location_api(self):
        """Test POST /api/mobility/locations?tenant_id=test-tenant - Create location"""
        try:
            # Location test data as specified in review request
            location_data = {
                "name": "Berlin Hauptbahnhof",
                "address": "Europaplatz 1",
                "city": "Berlin",
                "postal_code": "10557",
                "country": "Deutschland",
                "lat": 52.5251,
                "lng": 13.3694,
                "location_type": "station",
                "operating_hours": {"open": "06:00", "close": "22:00"},
                "available_vehicle_types": ["car", "e_bike", "e_scooter"],
                "active": True
            }
            
            response = self.session.post(f"{API_BASE}/mobility/locations?tenant_id=test-tenant", json=location_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Location API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Create Location API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Create Location API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            location = data["data"]
            
            # Verify location structure and data
            required_fields = ["id", "tenant_id", "name", "address", "city", "lat", "lng", "created_at", "updated_at"]
            for field in required_fields:
                if field not in location:
                    self.log_result(
                        "POST Create Location API",
                        False,
                        f"Missing required field in location: {field}",
                        data
                    )
                    return False
            
            # Verify the data matches what we sent
            if location["name"] != location_data["name"]:
                self.log_result(
                    "POST Create Location API",
                    False,
                    f"Name mismatch: expected {location_data['name']}, got {location['name']}",
                    data
                )
                return False
            
            # Store location_id for later tests
            self.created_location_id = location["id"]
            
            self.log_result(
                "POST Create Location API",
                True,
                f"Successfully created location '{location['name']}' with ID {location['id']} in {location['city']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Create Location API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_create_vehicle_api(self):
        """Test POST /api/mobility/vehicles?tenant_id=test-tenant - Create vehicle"""
        try:
            # Use the location_id from the create location test
            if not hasattr(self, 'created_location_id'):
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    "No location_id available from create location test. Run create location test first.",
                    None
                )
                return False
            
            # Vehicle test data as specified in review request
            vehicle_data = {
                "name": "Tesla Model 3",
                "vehicle_type": "car",
                "brand": "Tesla",
                "model": "Model 3",
                "license_plate": "B-TEST-123",
                "location_id": self.created_location_id,
                "status": "available",
                "pricing": {"hourly": 15.0, "daily": 120.0, "per_km": 0.5},
                "features": ["GPS", "Automatic", "Electric"],
                "capacity": 5,
                "battery_level": 100,
                "range_km": 500,
                "active": True
            }
            
            response = self.session.post(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant", json=vehicle_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            vehicle = data["data"]
            
            # Verify vehicle structure and data
            required_fields = ["id", "tenant_id", "name", "vehicle_type", "brand", "model", "license_plate", "location_id", "status", "pricing", "features", "capacity", "created_at", "updated_at"]
            for field in required_fields:
                if field not in vehicle:
                    self.log_result(
                        "POST Create Vehicle API",
                        False,
                        f"Missing required field in vehicle: {field}",
                        data
                    )
                    return False
            
            # Verify the data matches what we sent
            if vehicle["name"] != vehicle_data["name"]:
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    f"Name mismatch: expected {vehicle_data['name']}, got {vehicle['name']}",
                    data
                )
                return False
            
            if vehicle["vehicle_type"] != vehicle_data["vehicle_type"]:
                self.log_result(
                    "POST Create Vehicle API",
                    False,
                    f"Vehicle type mismatch: expected {vehicle_data['vehicle_type']}, got {vehicle['vehicle_type']}",
                    data
                )
                return False
            
            # Store vehicle_id for later tests
            self.created_vehicle_id = vehicle["id"]
            
            self.log_result(
                "POST Create Vehicle API",
                True,
                f"Successfully created vehicle '{vehicle['name']}' ({vehicle['license_plate']}) with ID {vehicle['id']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Create Vehicle API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_vehicles_api(self):
        """Test GET /api/mobility/vehicles?tenant_id=test-tenant - Get all vehicles"""
        try:
            response = self.session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Vehicles API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Vehicles API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Vehicles API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            if "total" not in data:
                self.log_result(
                    "GET Vehicles API",
                    False,
                    "Missing 'total' field in response",
                    data
                )
                return False
            
            vehicles = data["data"]
            
            # Verify vehicles is a list
            if not isinstance(vehicles, list):
                self.log_result(
                    "GET Vehicles API",
                    False,
                    f"Vehicles should be a list, got {type(vehicles)}",
                    data
                )
                return False
            
            # Verify total matches array length
            if data["total"] != len(vehicles):
                self.log_result(
                    "GET Vehicles API",
                    False,
                    f"Total mismatch: total={data['total']}, array length={len(vehicles)}",
                    data
                )
                return False
            
            # Should have at least 1 vehicle (the one we created)
            if len(vehicles) < 1:
                self.log_result(
                    "GET Vehicles API",
                    False,
                    f"Expected at least 1 vehicle for tenant test-tenant, got {len(vehicles)}",
                    data
                )
                return False
            
            # Verify vehicle structure
            if vehicles:
                vehicle = vehicles[0]
                required_fields = ["id", "tenant_id", "name", "vehicle_type", "status", "location_id", "pricing"]
                for field in required_fields:
                    if field not in vehicle:
                        self.log_result(
                            "GET Vehicles API",
                            False,
                            f"Missing required field in vehicle: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Vehicles API",
                True,
                f"Successfully retrieved {len(vehicles)} vehicles for tenant test-tenant"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Vehicles API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_create_booking_api(self):
        """Test POST /api/mobility/bookings?tenant_id=test-tenant - Create booking"""
        try:
            # Use the vehicle_id from the create vehicle test
            if not hasattr(self, 'created_vehicle_id'):
                self.log_result(
                    "POST Create Booking API",
                    False,
                    "No vehicle_id available from create vehicle test. Run create vehicle test first.",
                    None
                )
                return False
            
            if not hasattr(self, 'created_location_id'):
                self.log_result(
                    "POST Create Booking API",
                    False,
                    "No location_id available from create location test. Run create location test first.",
                    None
                )
                return False
            
            # Booking test data as specified in review request
            booking_data = {
                "vehicle_id": self.created_vehicle_id,
                "customer_name": "Max Mustermann",
                "customer_email": "max@example.com",
                "customer_phone": "+49 30 12345678",
                "pickup_location_id": self.created_location_id,
                "return_location_id": self.created_location_id,
                "start_time": "2025-12-01T10:00:00",
                "end_time": "2025-12-01T18:00:00",
                "pricing_model": "daily",
                "estimated_cost": 120.0,
                "requires_license": True,
                "license_number": "B1234567"
            }
            
            response = self.session.post(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant", json=booking_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Booking API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Create Booking API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Create Booking API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            booking = data["data"]
            
            # Verify booking structure and data
            required_fields = ["id", "tenant_id", "vehicle_id", "customer_name", "customer_email", "booking_number", "status", "created_at", "updated_at"]
            for field in required_fields:
                if field not in booking:
                    self.log_result(
                        "POST Create Booking API",
                        False,
                        f"Missing required field in booking: {field}",
                        data
                    )
                    return False
            
            # Verify the data matches what we sent
            if booking["customer_name"] != booking_data["customer_name"]:
                self.log_result(
                    "POST Create Booking API",
                    False,
                    f"Customer name mismatch: expected {booking_data['customer_name']}, got {booking['customer_name']}",
                    data
                )
                return False
            
            if booking["vehicle_id"] != booking_data["vehicle_id"]:
                self.log_result(
                    "POST Create Booking API",
                    False,
                    f"Vehicle ID mismatch: expected {booking_data['vehicle_id']}, got {booking['vehicle_id']}",
                    data
                )
                return False
            
            # Store booking_id for later tests
            self.created_booking_id = booking["id"]
            
            self.log_result(
                "POST Create Booking API",
                True,
                f"Successfully created booking '{booking['booking_number']}' for customer '{booking['customer_name']}' with ID {booking['id']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Create Booking API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_check_in_api(self):
        """Test POST /api/mobility/bookings/{booking_id}/check-in - Check-in with odometer/fuel data"""
        try:
            # Use the booking_id from the create booking test
            if not hasattr(self, 'created_booking_id'):
                self.log_result(
                    "POST Check-in API",
                    False,
                    "No booking_id available from create booking test. Run create booking test first.",
                    None
                )
                return False
            
            if not hasattr(self, 'created_location_id'):
                self.log_result(
                    "POST Check-in API",
                    False,
                    "No location_id available from create location test. Run create location test first.",
                    None
                )
                return False
            
            # Check-in data
            checkin_data = {
                "booking_id": self.created_booking_id,
                "action": "check_in",
                "location_id": self.created_location_id,
                "odometer_reading": 50000,
                "fuel_level": 95,
                "battery_level": 100,
                "damage_reported": False,
                "notes": "Vehicle in excellent condition"
            }
            
            response = self.session.post(f"{API_BASE}/mobility/bookings/{self.created_booking_id}/check-in", json=checkin_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Check-in API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Check-in API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Check-in API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            booking = data["data"]
            
            # Verify booking status changed to active
            if booking["status"] != "active":
                self.log_result(
                    "POST Check-in API",
                    False,
                    f"Expected booking status 'active', got '{booking['status']}'",
                    data
                )
                return False
            
            # Verify check-in data was recorded
            if "check_in_time" not in booking:
                self.log_result(
                    "POST Check-in API",
                    False,
                    "Missing 'check_in_time' field in booking",
                    data
                )
                return False
            
            self.log_result(
                "POST Check-in API",
                True,
                f"Successfully checked in booking {self.created_booking_id}, status changed to '{booking['status']}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Check-in API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_check_out_api(self):
        """Test POST /api/mobility/bookings/{booking_id}/check-out - Check-out with cost calculation"""
        try:
            # Use the booking_id from the create booking test
            if not hasattr(self, 'created_booking_id'):
                self.log_result(
                    "POST Check-out API",
                    False,
                    "No booking_id available from create booking test. Run create booking test first.",
                    None
                )
                return False
            
            if not hasattr(self, 'created_location_id'):
                self.log_result(
                    "POST Check-out API",
                    False,
                    "No location_id available from create location test. Run create location test first.",
                    None
                )
                return False
            
            # Check-out data
            checkout_data = {
                "booking_id": self.created_booking_id,
                "action": "check_out",
                "location_id": self.created_location_id,
                "odometer_reading": 50150,
                "fuel_level": 80,
                "battery_level": 85,
                "damage_reported": False,
                "notes": "Vehicle returned in good condition"
            }
            
            response = self.session.post(f"{API_BASE}/mobility/bookings/{self.created_booking_id}/check-out", json=checkout_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Check-out API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Check-out API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "data" not in data:
                self.log_result(
                    "POST Check-out API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            booking = data["data"]
            
            # Verify booking status changed to completed
            if booking["status"] != "completed":
                self.log_result(
                    "POST Check-out API",
                    False,
                    f"Expected booking status 'completed', got '{booking['status']}'",
                    data
                )
                return False
            
            # Verify check-out data was recorded
            if "check_out_time" not in booking:
                self.log_result(
                    "POST Check-out API",
                    False,
                    "Missing 'check_out_time' field in booking",
                    data
                )
                return False
            
            # Verify cost calculation
            if "actual_cost" not in booking:
                self.log_result(
                    "POST Check-out API",
                    False,
                    "Missing 'actual_cost' field in booking",
                    data
                )
                return False
            
            # Verify distance calculation
            if "distance_km" not in booking:
                self.log_result(
                    "POST Check-out API",
                    False,
                    "Missing 'distance_km' field in booking",
                    data
                )
                return False
            
            self.log_result(
                "POST Check-out API",
                True,
                f"Successfully checked out booking {self.created_booking_id}, status: '{booking['status']}', cost: {booking['actual_cost']}, distance: {booking['distance_km']}km"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Check-out API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_statistics_api(self):
        """Test GET /api/mobility/statistics?tenant_id=test-tenant - Get statistics dashboard"""
        try:
            response = self.session.get(f"{API_BASE}/mobility/statistics?tenant_id=test-tenant")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Statistics API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Statistics API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "statistics" not in data:
                self.log_result(
                    "GET Statistics API",
                    False,
                    "Missing 'statistics' field in response",
                    data
                )
                return False
            
            stats = data["statistics"]
            
            # Verify statistics structure
            required_fields = ["total_vehicles", "vehicle_counts", "available_vehicles", "total_bookings", "completed_bookings", "total_revenue"]
            for field in required_fields:
                if field not in stats:
                    self.log_result(
                        "GET Statistics API",
                        False,
                        f"Missing required field in statistics: {field}",
                        data
                    )
                    return False
            
            # Verify we have at least 1 vehicle and 1 booking from our tests
            if stats["total_vehicles"] < 1:
                self.log_result(
                    "GET Statistics API",
                    False,
                    f"Expected at least 1 vehicle in statistics, got {stats['total_vehicles']}",
                    data
                )
                return False
            
            if stats["total_bookings"] < 1:
                self.log_result(
                    "GET Statistics API",
                    False,
                    f"Expected at least 1 booking in statistics, got {stats['total_bookings']}",
                    data
                )
                return False
            
            self.log_result(
                "GET Statistics API",
                True,
                f"Successfully retrieved statistics: {stats['total_vehicles']} vehicles, {stats['total_bookings']} bookings, €{stats['total_revenue']} revenue"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Statistics API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_vehicle_filtering_apis(self):
        """Test vehicle filtering APIs - by type and available only"""
        try:
            # Test filter by vehicle type
            response = self.session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant&vehicle_type=car")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Vehicles Filter by Type API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "GET Vehicles Filter by Type API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            vehicles = data["data"]
            
            # Verify all vehicles are cars
            for vehicle in vehicles:
                if vehicle["vehicle_type"] != "car":
                    self.log_result(
                        "GET Vehicles Filter by Type API",
                        False,
                        f"Expected vehicle_type 'car', got '{vehicle['vehicle_type']}'",
                        data
                    )
                    return False
            
            # Test filter by available only
            response2 = self.session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant&available_only=true")
            
            if response2.status_code != 200:
                self.log_result(
                    "GET Vehicles Available Only API",
                    False,
                    f"Request failed. Status: {response2.status_code}",
                    response2.text
                )
                return False
            
            data2 = response2.json()
            
            if not data2.get("success"):
                self.log_result(
                    "GET Vehicles Available Only API",
                    False,
                    "Response indicates failure",
                    data2
                )
                return False
            
            available_vehicles = data2["data"]
            
            # Verify all vehicles are available
            for vehicle in available_vehicles:
                if vehicle["status"] != "available":
                    self.log_result(
                        "GET Vehicles Available Only API",
                        False,
                        f"Expected vehicle status 'available', got '{vehicle['status']}'",
                        data2
                    )
                    return False
            
            self.log_result(
                "Vehicle Filtering APIs",
                True,
                f"Successfully tested vehicle filtering: {len(vehicles)} cars, {len(available_vehicles)} available vehicles"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "Vehicle Filtering APIs",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_availability_check_api(self):
        """Test GET /api/mobility/availability - Check availability for time period"""
        try:
            # Test availability check as specified in review request
            params = {
                "tenant_id": "test-tenant",
                "vehicle_type": "car",
                "start_time": "2025-12-01T10:00:00",
                "end_time": "2025-12-01T18:00:00"
            }
            
            response = self.session.get(f"{API_BASE}/mobility/availability", params=params)
            
            if response.status_code != 200:
                self.log_result(
                    "GET Availability Check API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "GET Availability Check API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            required_fields = ["data", "total", "filters"]
            for field in required_fields:
                if field not in data:
                    self.log_result(
                        "GET Availability Check API",
                        False,
                        f"Missing required field: {field}",
                        data
                    )
                    return False
            
            vehicles = data["data"]
            filters = data["filters"]
            
            # Verify filters were applied
            if filters["vehicle_type"] != "car":
                self.log_result(
                    "GET Availability Check API",
                    False,
                    f"Filter not applied correctly: expected vehicle_type 'car', got '{filters['vehicle_type']}'",
                    data
                )
                return False
            
            self.log_result(
                "GET Availability Check API",
                True,
                f"Successfully checked availability: {len(vehicles)} cars available for specified time period"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Availability Check API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_calculate_price_api(self):
        """Test POST /api/mobility/calculate-price - Calculate price for booking"""
        try:
            # Use the vehicle_id from the create vehicle test
            if not hasattr(self, 'created_vehicle_id'):
                self.log_result(
                    "POST Calculate Price API",
                    False,
                    "No vehicle_id available from create vehicle test. Run create vehicle test first.",
                    None
                )
                return False
            
            # Price calculation data
            price_data = {
                "vehicle_id": self.created_vehicle_id,
                "start_time": "2025-12-01T10:00:00",
                "end_time": "2025-12-01T18:00:00",
                "estimated_distance_km": 150
            }
            
            response = self.session.post(f"{API_BASE}/mobility/calculate-price", json=price_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Calculate Price API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_result(
                    "POST Calculate Price API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            required_fields = ["vehicle_id", "duration_hours", "duration_days", "prices", "recommended_pricing"]
            for field in required_fields:
                if field not in data:
                    self.log_result(
                        "POST Calculate Price API",
                        False,
                        f"Missing required field: {field}",
                        data
                    )
                    return False
            
            prices = data["prices"]
            
            # Verify pricing options are calculated
            if "hourly" not in prices and "daily" not in prices:
                self.log_result(
                    "POST Calculate Price API",
                    False,
                    "No pricing options calculated",
                    data
                )
                return False
            
            self.log_result(
                "POST Calculate Price API",
                True,
                f"Successfully calculated prices: {len(prices)} pricing models, recommended: {data['recommended_pricing']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Calculate Price API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_mongodb_persistence(self):
        """Test MongoDB persistence - Verify data is stored correctly"""
        try:
            # Check mobility_vehicles collection
            vehicles_count = main_db.mobility_vehicles.count_documents({"tenant_id": "test-tenant"})
            
            if vehicles_count < 1:
                self.log_result(
                    "MongoDB Persistence - Vehicles",
                    False,
                    f"Expected at least 1 vehicle in MongoDB, found {vehicles_count}",
                    None
                )
                return False
            
            # Check mobility_locations collection
            locations_count = main_db.mobility_locations.count_documents({"tenant_id": "test-tenant"})
            
            if locations_count < 1:
                self.log_result(
                    "MongoDB Persistence - Locations",
                    False,
                    f"Expected at least 1 location in MongoDB, found {locations_count}",
                    None
                )
                return False
            
            # Check mobility_bookings collection
            bookings_count = main_db.mobility_bookings.count_documents({"tenant_id": "test-tenant"})
            
            if bookings_count < 1:
                self.log_result(
                    "MongoDB Persistence - Bookings",
                    False,
                    f"Expected at least 1 booking in MongoDB, found {bookings_count}",
                    None
                )
                return False
            
            # Verify specific data
            vehicle = main_db.mobility_vehicles.find_one({"tenant_id": "test-tenant", "name": "Tesla Model 3"})
            if not vehicle:
                self.log_result(
                    "MongoDB Persistence - Vehicle Data",
                    False,
                    "Tesla Model 3 vehicle not found in MongoDB",
                    None
                )
                return False
            
            location = main_db.mobility_locations.find_one({"tenant_id": "test-tenant", "name": "Berlin Hauptbahnhof"})
            if not location:
                self.log_result(
                    "MongoDB Persistence - Location Data",
                    False,
                    "Berlin Hauptbahnhof location not found in MongoDB",
                    None
                )
                return False
            
            booking = main_db.mobility_bookings.find_one({"tenant_id": "test-tenant", "customer_name": "Max Mustermann"})
            if not booking:
                self.log_result(
                    "MongoDB Persistence - Booking Data",
                    False,
                    "Max Mustermann booking not found in MongoDB",
                    None
                )
                return False
            
            self.log_result(
                "MongoDB Persistence Verification",
                True,
                f"Successfully verified MongoDB persistence: {vehicles_count} vehicles, {locations_count} locations, {bookings_count} bookings"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "MongoDB Persistence Verification",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def run_all_tests(self):
        """Run all Mobility Services API tests"""
        print("=" * 80)
        print("MOBILITY SERVICES PHASE 1 COMPREHENSIVE API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing APIs: Multi-modal mobility booking system with 20+ endpoints")
        print(f"Database: main_db collections: mobility_vehicles, mobility_locations, mobility_bookings")
        print("Test Data: tenant_id=test-tenant, Berlin Hauptbahnhof location, Tesla Model 3 vehicle")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Admin Authentication")
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with tests.")
                return
            print()
            
            # Step 2: Test Location Management
            print("📍 STEP 2: Location Management APIs")
            self.test_create_location_api()
            print()
            
            # Step 3: Test Vehicle Management
            print("🚗 STEP 3: Vehicle Management APIs")
            self.test_create_vehicle_api()
            self.test_get_vehicles_api()
            self.test_vehicle_filtering_apis()
            print()
            
            # Step 4: Test Booking System
            print("📋 STEP 4: Booking System APIs")
            self.test_create_booking_api()
            print()
            
            # Step 5: Test Check-in/Check-out
            print("✅ STEP 5: Check-in/Check-out APIs")
            self.test_check_in_api()
            self.test_check_out_api()
            print()
            
            # Step 6: Test Additional Features
            print("⚡ STEP 6: Additional Features APIs")
            self.test_availability_check_api()
            self.test_calculate_price_api()
            self.test_get_statistics_api()
            print()
            
            # Step 7: Test MongoDB Persistence
            print("💾 STEP 7: MongoDB Persistence Verification")
            self.test_mongodb_persistence()
            print()
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
        
        # Print summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "No tests run")
        print()
        
        if total - passed > 0:
            print("FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("=" * 80)


def main():
    """Main function to run the tests"""
    tester = MobilityServicesTester()
    
    # Run tests
    import asyncio
    asyncio.run(tester.run_all_tests())


if __name__ == "__main__":
    main()
