#!/usr/bin/env python3
"""
Extended Mobility Services API Testing - Additional Endpoints
Tests additional endpoints and edge cases for comprehensive coverage
"""

import requests
import json
import jwt

# Backend URL from environment
BACKEND_URL = "https://devops-central-17.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def authenticate_admin():
    """Authenticate as admin user"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    auth_data = {
        "email": "admin@tsrid.com",
        "password": "admin123"
    }
    
    response = session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    
    if response.status_code != 200:
        print(f"❌ Authentication failed. Status: {response.status_code}")
        return None, None
    
    data = response.json()
    token = data.get("access_token")
    
    if not token:
        print(f"❌ No access token in response")
        return None, None
    
    session.headers.update({
        'Authorization': f'Bearer {token}'
    })
    
    print("✅ Authentication successful")
    return session, token

def test_additional_vehicle_endpoints():
    """Test additional vehicle management endpoints"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Additional Vehicle Endpoints")
    
    # First, get existing vehicles to work with
    response = session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get vehicles for testing")
        return
    
    vehicles = response.json().get("data", [])
    if not vehicles:
        print("❌ No vehicles found for testing")
        return
    
    vehicle_id = vehicles[0]["id"]
    print(f"📋 Using vehicle ID: {vehicle_id}")
    
    # Test GET single vehicle
    response = session.get(f"{API_BASE}/mobility/vehicles/{vehicle_id}")
    if response.status_code == 200:
        print("✅ GET Single Vehicle API - PASS")
    else:
        print(f"❌ GET Single Vehicle API - FAIL (Status: {response.status_code})")
    
    # Test UPDATE vehicle (PUT)
    update_data = {
        "name": "Tesla Model 3 Updated",
        "vehicle_type": "car",
        "brand": "Tesla",
        "model": "Model 3",
        "license_plate": "B-TEST-123-UPD",
        "location_id": vehicles[0]["location_id"],
        "status": "available",
        "pricing": {"hourly": 18.0, "daily": 140.0, "per_km": 0.6},
        "features": ["GPS", "Automatic", "Electric", "Premium"],
        "capacity": 5,
        "battery_level": 95,
        "range_km": 480,
        "active": True
    }
    
    response = session.put(f"{API_BASE}/mobility/vehicles/{vehicle_id}", json=update_data)
    if response.status_code == 200:
        print("✅ PUT Update Vehicle API - PASS")
    else:
        print(f"❌ PUT Update Vehicle API - FAIL (Status: {response.status_code})")
    
    # Test PATCH vehicle status
    response = session.patch(f"{API_BASE}/mobility/vehicles/{vehicle_id}/status?status=maintenance")
    if response.status_code == 200:
        print("✅ PATCH Vehicle Status API - PASS")
    else:
        print(f"❌ PATCH Vehicle Status API - FAIL (Status: {response.status_code})")
    
    # Reset status back to available
    session.patch(f"{API_BASE}/mobility/vehicles/{vehicle_id}/status?status=available")

def test_additional_location_endpoints():
    """Test additional location management endpoints"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Additional Location Endpoints")
    
    # Get existing locations
    response = session.get(f"{API_BASE}/mobility/locations?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get locations for testing")
        return
    
    locations = response.json().get("data", [])
    if not locations:
        print("❌ No locations found for testing")
        return
    
    location_id = locations[0]["id"]
    print(f"📋 Using location ID: {location_id}")
    
    # Test GET single location
    response = session.get(f"{API_BASE}/mobility/locations/{location_id}")
    if response.status_code == 200:
        data = response.json()
        if "vehicle_counts" in data.get("data", {}):
            print("✅ GET Single Location API (with vehicle counts) - PASS")
        else:
            print("❌ GET Single Location API - Missing vehicle counts")
    else:
        print(f"❌ GET Single Location API - FAIL (Status: {response.status_code})")
    
    # Test UPDATE location (PUT)
    update_data = {
        "name": "Berlin Hauptbahnhof Updated",
        "address": "Europaplatz 1 (Updated)",
        "city": "Berlin",
        "postal_code": "10557",
        "country": "Deutschland",
        "lat": 52.5251,
        "lng": 13.3694,
        "location_type": "station",
        "operating_hours": {"open": "05:30", "close": "23:00"},
        "available_vehicle_types": ["car", "e_bike", "e_scooter", "bike"],
        "active": True
    }
    
    response = session.put(f"{API_BASE}/mobility/locations/{location_id}", json=update_data)
    if response.status_code == 200:
        print("✅ PUT Update Location API - PASS")
    else:
        print(f"❌ PUT Update Location API - FAIL (Status: {response.status_code})")

def test_additional_booking_endpoints():
    """Test additional booking management endpoints"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Additional Booking Endpoints")
    
    # Get existing bookings
    response = session.get(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get bookings for testing")
        return
    
    bookings = response.json().get("data", [])
    if not bookings:
        print("❌ No bookings found for testing")
        return
    
    booking_id = bookings[0]["id"]
    print(f"📋 Using booking ID: {booking_id}")
    
    # Test GET single booking
    response = session.get(f"{API_BASE}/mobility/bookings/{booking_id}")
    if response.status_code == 200:
        data = response.json()
        booking_data = data.get("data", {})
        if "vehicle_details" in booking_data and "pickup_location_details" in booking_data:
            print("✅ GET Single Booking API (with enriched data) - PASS")
        else:
            print("❌ GET Single Booking API - Missing enriched data")
    else:
        print(f"❌ GET Single Booking API - FAIL (Status: {response.status_code})")
    
    # Test booking filtering by customer email
    response = session.get(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant&customer_email=max@example.com")
    if response.status_code == 200:
        print("✅ GET Bookings Filter by Customer Email API - PASS")
    else:
        print(f"❌ GET Bookings Filter by Customer Email API - FAIL (Status: {response.status_code})")
    
    # Test booking filtering by vehicle ID
    vehicle_id = bookings[0]["vehicle_id"]
    response = session.get(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant&vehicle_id={vehicle_id}")
    if response.status_code == 200:
        print("✅ GET Bookings Filter by Vehicle ID API - PASS")
    else:
        print(f"❌ GET Bookings Filter by Vehicle ID API - FAIL (Status: {response.status_code})")

def test_conflict_detection():
    """Test booking conflict detection"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Booking Conflict Detection")
    
    # Get existing vehicles
    response = session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant&available_only=true")
    if response.status_code != 200:
        print("❌ Failed to get available vehicles")
        return
    
    vehicles = response.json().get("data", [])
    if not vehicles:
        print("❌ No available vehicles found")
        return
    
    vehicle_id = vehicles[0]["id"]
    location_id = vehicles[0]["location_id"]
    
    # Create first booking
    booking_data_1 = {
        "vehicle_id": vehicle_id,
        "customer_name": "Test Customer 1",
        "customer_email": "test1@example.com",
        "customer_phone": "+49 30 11111111",
        "pickup_location_id": location_id,
        "return_location_id": location_id,
        "start_time": "2025-12-15T10:00:00",
        "end_time": "2025-12-15T18:00:00",
        "pricing_model": "daily",
        "estimated_cost": 120.0,
        "requires_license": True,
        "license_number": "B1111111"
    }
    
    response = session.post(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant", json=booking_data_1)
    if response.status_code == 200:
        print("✅ First booking created successfully")
        
        # Try to create conflicting booking (overlapping time)
        booking_data_2 = {
            "vehicle_id": vehicle_id,
            "customer_name": "Test Customer 2",
            "customer_email": "test2@example.com",
            "customer_phone": "+49 30 22222222",
            "pickup_location_id": location_id,
            "return_location_id": location_id,
            "start_time": "2025-12-15T14:00:00",  # Overlaps with first booking
            "end_time": "2025-12-15T22:00:00",
            "pricing_model": "daily",
            "estimated_cost": 120.0,
            "requires_license": True,
            "license_number": "B2222222"
        }
        
        response = session.post(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant", json=booking_data_2)
        if response.status_code == 400:
            print("✅ Booking Conflict Detection - PASS (Correctly rejected overlapping booking)")
        else:
            print(f"❌ Booking Conflict Detection - FAIL (Should have rejected overlapping booking, got status: {response.status_code})")
    else:
        print(f"❌ Failed to create first booking for conflict test (Status: {response.status_code})")

def test_different_vehicle_types():
    """Test creating different vehicle types"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Different Vehicle Types")
    
    # Get a location to use
    response = session.get(f"{API_BASE}/mobility/locations?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get locations")
        return
    
    locations = response.json().get("data", [])
    if not locations:
        print("❌ No locations found")
        return
    
    location_id = locations[0]["id"]
    
    # Test creating E-Bike
    ebike_data = {
        "name": "E-Bike City Cruiser",
        "vehicle_type": "e_bike",
        "brand": "Bosch",
        "model": "City Cruiser",
        "license_plate": None,
        "location_id": location_id,
        "status": "available",
        "pricing": {"hourly": 5.0, "daily": 25.0},
        "features": ["GPS", "Electric", "Basket"],
        "capacity": 1,
        "battery_level": 85,
        "range_km": 60,
        "active": True
    }
    
    response = session.post(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant", json=ebike_data)
    if response.status_code == 200:
        print("✅ E-Bike Creation - PASS")
    else:
        print(f"❌ E-Bike Creation - FAIL (Status: {response.status_code})")
    
    # Test creating E-Scooter
    escooter_data = {
        "name": "E-Scooter Urban",
        "vehicle_type": "e_scooter",
        "brand": "Xiaomi",
        "model": "Mi Electric Scooter",
        "license_plate": None,
        "location_id": location_id,
        "status": "available",
        "pricing": {"hourly": 3.0, "per_km": 0.2},
        "features": ["GPS", "Electric", "Foldable"],
        "capacity": 1,
        "battery_level": 90,
        "range_km": 30,
        "active": True
    }
    
    response = session.post(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant", json=escooter_data)
    if response.status_code == 200:
        print("✅ E-Scooter Creation - PASS")
    else:
        print(f"❌ E-Scooter Creation - FAIL (Status: {response.status_code})")

def main():
    """Run extended mobility services tests"""
    print("=" * 80)
    print("EXTENDED MOBILITY SERVICES API TESTING")
    print("=" * 80)
    print("Testing additional endpoints and edge cases for comprehensive coverage")
    print("=" * 80)
    print()
    
    test_additional_vehicle_endpoints()
    print()
    
    test_additional_location_endpoints()
    print()
    
    test_additional_booking_endpoints()
    print()
    
    test_conflict_detection()
    print()
    
    test_different_vehicle_types()
    print()
    
    print("=" * 80)
    print("EXTENDED TESTING COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()