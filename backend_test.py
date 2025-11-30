#!/usr/bin/env python3
"""
Backend API Testing Suite - EUROPCAR PKW-VERMIETUNGSSYSTEM TESTING
Tests Europcar PKW-Vermietungssystem Backend APIs for car rental management:

Fahrzeugverwaltung APIs:
- GET /api/europcar/vehicles/list - List all vehicles (should show 8 vehicles)
- GET /api/europcar/vehicles/availability/check - Check vehicle availability

Reservierungen APIs:
- GET /api/europcar/reservations/list - List all reservations (should show 10 reservations)

Kunden APIs:
- GET /api/europcar/customers/list - List all customers (should show 5 customers)

Analytics APIs:
- GET /api/europcar/analytics/dashboard - Dashboard statistics

Stationen APIs:
- GET /api/europcar/stations/list - List all stations (should show 1 station)

Schadenmanagement APIs:
- GET /api/europcar/damage/reports/list - List damage reports (should show 3 reports)

Preisberechnung APIs:
- POST /api/europcar/pricing/calculate - Calculate pricing for rental

Expected Demo Data:
- 8 Fahrzeuge, 5 Kunden, 10 Reservierungen, 3 Schäden, 1 Station
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
BACKEND_URL = "https://smart-dashboard-ui.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
tsrid_db = mongo_client['tsrid_db']

class EuropcarSystemTester:
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

    def test_vehicles_list_api(self):
        """Test GET /api/europcar/vehicles/list - Should show 8 vehicles"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/vehicles/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            vehicles_data = data["data"]
            if "vehicles" not in vehicles_data:
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    "Missing 'vehicles' field in data",
                    data
                )
                return False
            
            vehicles = vehicles_data["vehicles"]
            
            # Verify vehicles is a list
            if not isinstance(vehicles, list):
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    f"Vehicles should be a list, got {type(vehicles)}",
                    data
                )
                return False
            
            # Check expected count (should be 8 vehicles)
            expected_count = 8
            actual_count = len(vehicles)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Vehicles List API",
                    False,
                    f"Expected {expected_count} vehicles, got {actual_count}",
                    data
                )
                return False
            
            # Verify vehicle structure
            if vehicles:
                vehicle = vehicles[0]
                required_fields = ["id", "marke", "modell", "kennzeichen", "status"]
                for field in required_fields:
                    if field not in vehicle:
                        self.log_result(
                            "GET Vehicles List API",
                            False,
                            f"Missing required field in vehicle: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Vehicles List API",
                True,
                f"Successfully retrieved {actual_count} vehicles (expected {expected_count})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Vehicles List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_vehicles_availability_check_api(self):
        """Test GET /api/europcar/vehicles/availability/check - Check vehicle availability"""
        try:
            # Test with specific date range
            params = {
                "start_date": "2024-12-01",
                "end_date": "2024-12-07"
            }
            
            response = self.session.get(f"{API_BASE}/europcar/vehicles/availability/check", params=params)
            
            if response.status_code != 200:
                self.log_result(
                    "GET Vehicle Availability API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "GET Vehicle Availability API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Vehicle Availability API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            availability_data = data["data"]
            required_fields = ["available_vehicles", "count"]
            
            for field in required_fields:
                if field not in availability_data:
                    self.log_result(
                        "GET Vehicle Availability API",
                        False,
                        f"Missing required field in data: {field}",
                        data
                    )
                    return False
            
            # Verify available_vehicles is a list
            if not isinstance(availability_data["available_vehicles"], list):
                self.log_result(
                    "GET Vehicle Availability API",
                    False,
                    f"Available vehicles should be a list, got {type(availability_data['available_vehicles'])}",
                    data
                )
                return False
            
            # Verify count matches array length
            if availability_data["count"] != len(availability_data["available_vehicles"]):
                self.log_result(
                    "GET Vehicle Availability API",
                    False,
                    f"Count mismatch: count={availability_data['count']}, array length={len(availability_data['available_vehicles'])}",
                    data
                )
                return False
            
            self.log_result(
                "GET Vehicle Availability API",
                True,
                f"Successfully checked availability for 2024-12-01 to 2024-12-07: {availability_data['count']} vehicles available"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Vehicle Availability API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_reservations_list_api(self):
        """Test GET /api/europcar/reservations/list - Should show 10 reservations"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/reservations/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Reservations List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Reservations List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Reservations List API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            reservations_data = data["data"]
            if "reservations" not in reservations_data:
                self.log_result(
                    "GET Reservations List API",
                    False,
                    "Missing 'reservations' field in data",
                    data
                )
                return False
            
            reservations = reservations_data["reservations"]
            
            # Verify reservations is a list
            if not isinstance(reservations, list):
                self.log_result(
                    "GET Reservations List API",
                    False,
                    f"Reservations should be a list, got {type(reservations)}",
                    data
                )
                return False
            
            # Check expected count (should be 10 reservations)
            expected_count = 10
            actual_count = len(reservations)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Reservations List API",
                    False,
                    f"Expected {expected_count} reservations, got {actual_count}",
                    data
                )
                return False
            
            # Verify reservation structure
            if reservations:
                reservation = reservations[0]
                required_fields = ["id", "customer_id", "vehicle_id", "start_date", "end_date", "status"]
                for field in required_fields:
                    if field not in reservation:
                        self.log_result(
                            "GET Reservations List API",
                            False,
                            f"Missing required field in reservation: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Reservations List API",
                True,
                f"Successfully retrieved {actual_count} reservations (expected {expected_count})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Reservations List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_customers_list_api(self):
        """Test GET /api/europcar/customers/list - Should show 5 customers"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/customers/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Customers List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Customers List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Customers List API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            customers_data = data["data"]
            if "customers" not in customers_data:
                self.log_result(
                    "GET Customers List API",
                    False,
                    "Missing 'customers' field in data",
                    data
                )
                return False
            
            customers = customers_data["customers"]
            
            # Verify customers is a list
            if not isinstance(customers, list):
                self.log_result(
                    "GET Customers List API",
                    False,
                    f"Customers should be a list, got {type(customers)}",
                    data
                )
                return False
            
            # Check expected count (should be 5 customers)
            expected_count = 5
            actual_count = len(customers)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Customers List API",
                    False,
                    f"Expected {expected_count} customers, got {actual_count}",
                    data
                )
                return False
            
            # Verify customer structure
            if customers:
                customer = customers[0]
                required_fields = ["id", "vorname", "nachname", "email", "customer_type"]
                for field in required_fields:
                    if field not in customer:
                        self.log_result(
                            "GET Customers List API",
                            False,
                            f"Missing required field in customer: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Customers List API",
                True,
                f"Successfully retrieved {actual_count} customers (expected {expected_count})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Customers List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_analytics_dashboard_api(self):
        """Test GET /api/europcar/analytics/dashboard - Dashboard statistics"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/analytics/dashboard")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            dashboard_data = data["data"]
            required_sections = ["vehicles", "customers", "reservations", "damages"]
            
            for section in required_sections:
                if section not in dashboard_data:
                    self.log_result(
                        "GET Analytics Dashboard API",
                        False,
                        f"Missing required section in dashboard: {section}",
                        data
                    )
                    return False
            
            # Verify expected values
            vehicles = dashboard_data["vehicles"]
            customers = dashboard_data["customers"]
            reservations = dashboard_data["reservations"]
            damages = dashboard_data["damages"]
            
            # Check expected counts
            expected_vehicles = 8
            expected_customers = 5
            expected_reservations = 10
            expected_damages = 3
            
            if vehicles.get("total") != expected_vehicles:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    f"Expected {expected_vehicles} total vehicles, got {vehicles.get('total')}",
                    data
                )
                return False
            
            if customers.get("total") != expected_customers:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    f"Expected {expected_customers} total customers, got {customers.get('total')}",
                    data
                )
                return False
            
            if reservations.get("total") != expected_reservations:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    f"Expected {expected_reservations} total reservations, got {reservations.get('total')}",
                    data
                )
                return False
            
            if damages.get("total") != expected_damages:
                self.log_result(
                    "GET Analytics Dashboard API",
                    False,
                    f"Expected {expected_damages} total damages, got {damages.get('total')}",
                    data
                )
                return False
            
            self.log_result(
                "GET Analytics Dashboard API",
                True,
                f"Successfully retrieved dashboard statistics: vehicles={vehicles.get('total')}, customers={customers.get('total')}, reservations={reservations.get('total')}, damages={damages.get('total')}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Analytics Dashboard API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_stations_list_api(self):
        """Test GET /api/europcar/stations/list - Should show 1 station"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/stations/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Stations List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Stations List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Stations List API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            stations_data = data["data"]
            if "stations" not in stations_data:
                self.log_result(
                    "GET Stations List API",
                    False,
                    "Missing 'stations' field in data",
                    data
                )
                return False
            
            stations = stations_data["stations"]
            
            # Verify stations is a list
            if not isinstance(stations, list):
                self.log_result(
                    "GET Stations List API",
                    False,
                    f"Stations should be a list, got {type(stations)}",
                    data
                )
                return False
            
            # Check expected count (should be 1 station)
            expected_count = 1
            actual_count = len(stations)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Stations List API",
                    False,
                    f"Expected {expected_count} station, got {actual_count}",
                    data
                )
                return False
            
            # Verify station structure
            if stations:
                station = stations[0]
                required_fields = ["id", "name", "adresse", "stadt", "status"]
                for field in required_fields:
                    if field not in station:
                        self.log_result(
                            "GET Stations List API",
                            False,
                            f"Missing required field in station: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Stations List API",
                True,
                f"Successfully retrieved {actual_count} station (expected {expected_count})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Stations List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_damage_reports_list_api(self):
        """Test GET /api/europcar/damage/reports/list - Should show 3 damage reports"""
        try:
            response = self.session.get(f"{API_BASE}/europcar/damage/reports/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            reports_data = data["data"]
            if "reports" not in reports_data:
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    "Missing 'reports' field in data",
                    data
                )
                return False
            
            reports = reports_data["reports"]
            
            # Verify reports is a list
            if not isinstance(reports, list):
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    f"Reports should be a list, got {type(reports)}",
                    data
                )
                return False
            
            # Check expected count (should be 3 damage reports)
            expected_count = 3
            actual_count = len(reports)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Damage Reports List API",
                    False,
                    f"Expected {expected_count} damage reports, got {actual_count}",
                    data
                )
                return False
            
            # Verify report structure
            if reports:
                report = reports[0]
                required_fields = ["id", "vehicle_id", "damage_type", "severity", "repair_status"]
                for field in required_fields:
                    if field not in report:
                        self.log_result(
                            "GET Damage Reports List API",
                            False,
                            f"Missing required field in report: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Damage Reports List API",
                True,
                f"Successfully retrieved {actual_count} damage reports (expected {expected_count})"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Damage Reports List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_pricing_calculate_api(self):
        """Test POST /api/europcar/pricing/calculate - Calculate pricing for rental"""
        try:
            # First get a real vehicle ID
            vehicles_response = self.session.get(f"{API_BASE}/europcar/vehicles/list")
            if vehicles_response.status_code != 200:
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    "Could not get vehicles list to find valid vehicle ID",
                    vehicles_response.text
                )
                return False
            
            vehicles_data = vehicles_response.json()
            if not vehicles_data.get("success") or not vehicles_data.get("data", {}).get("vehicles"):
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    "No vehicles available for pricing test",
                    vehicles_data
                )
                return False
            
            # Use the first available vehicle
            vehicle_id = vehicles_data["data"]["vehicles"][0]["id"]
            
            # Test pricing calculation with real vehicle ID
            pricing_data = {
                "vehicle_id": vehicle_id,
                "start_date": "2024-12-01",
                "end_date": "2024-12-07"
            }
            
            response = self.session.post(f"{API_BASE}/europcar/pricing/calculate", json=pricing_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "data" not in data:
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    "Missing 'data' field in response",
                    data
                )
                return False
            
            pricing_result = data["data"]
            required_fields = ["base_price", "final_price", "days", "daily_rate"]
            
            for field in required_fields:
                if field not in pricing_result:
                    self.log_result(
                        "POST Pricing Calculate API",
                        False,
                        f"Missing required field in pricing result: {field}",
                        data
                    )
                    return False
            
            # Verify field types
            for field in ["base_price", "final_price", "daily_rate"]:
                if not isinstance(pricing_result[field], (int, float)):
                    self.log_result(
                        "POST Pricing Calculate API",
                        False,
                        f"Pricing field {field} should be number, got {type(pricing_result[field])}",
                        data
                    )
                    return False
            
            if not isinstance(pricing_result["days"], int):
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    f"Days should be int, got {type(pricing_result['days'])}",
                    data
                )
                return False
            
            # Verify calculation makes sense (7 days from 2024-12-01 to 2024-12-07)
            expected_days = 7
            if pricing_result["days"] != expected_days:
                self.log_result(
                    "POST Pricing Calculate API",
                    False,
                    f"Expected {expected_days} days, got {pricing_result['days']}",
                    data
                )
                return False
            
            self.log_result(
                "POST Pricing Calculate API",
                True,
                f"Successfully calculated pricing: {pricing_result['days']} days, €{pricing_result['final_price']} total (€{pricing_result['daily_rate']}/day)"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Pricing Calculate API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def run_all_tests(self):
        """Run all Europcar PKW-Vermietungssystem API tests"""
        print("=" * 80)
        print("EUROPCAR PKW-VERMIETUNGSSYSTEM API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing APIs: Europcar Car Rental Management System")
        print(f"Database: tsrid_db collections: europcar_vehicles, europcar_customers, europcar_reservations, etc.")
        print("Expected Demo Data: 8 Fahrzeuge, 5 Kunden, 10 Reservierungen, 3 Schäden, 1 Station")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Admin Authentication")
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with tests.")
                return
            print()
            
            # Step 2: Test Fahrzeugverwaltung APIs
            print("🚗 STEP 2: Fahrzeugverwaltung APIs")
            self.test_vehicles_list_api()
            self.test_vehicles_availability_check_api()
            print()
            
            # Step 3: Test Reservierungen APIs
            print("📋 STEP 3: Reservierungen APIs")
            self.test_reservations_list_api()
            print()
            
            # Step 4: Test Kunden APIs
            print("👥 STEP 4: Kunden APIs")
            self.test_customers_list_api()
            print()
            
            # Step 5: Test Analytics APIs
            print("📊 STEP 5: Analytics Dashboard APIs")
            self.test_analytics_dashboard_api()
            print()
            
            # Step 6: Test Stationen APIs
            print("🏢 STEP 6: Stationen APIs")
            self.test_stations_list_api()
            print()
            
            # Step 7: Test Schadenmanagement APIs
            print("🔧 STEP 7: Schadenmanagement APIs")
            self.test_damage_reports_list_api()
            print()
            
            # Step 8: Test Preisberechnung APIs
            print("💰 STEP 8: Preisberechnung APIs")
            self.test_pricing_calculate_api()
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
    tester = EuropcarSystemTester()
    
    # Run tests
    import asyncio
    asyncio.run(tester.run_all_tests())


if __name__ == "__main__":
    main()
