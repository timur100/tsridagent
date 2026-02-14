#!/usr/bin/env python3
"""
Test Deletion Endpoints and Business Logic Validation
"""

import requests
import json

# Backend URL from environment
BACKEND_URL = "https://inventory-check-in.preview.emergentagent.com"
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

def test_location_deletion_with_vehicles():
    """Test that location deletion is blocked when vehicles exist"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Location Deletion Validation")
    
    # Get locations that have vehicles
    response = session.get(f"{API_BASE}/mobility/locations?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get locations")
        return
    
    locations = response.json().get("data", [])
    location_with_vehicles = None
    
    for location in locations:
        if location.get("vehicle_count", 0) > 0:
            location_with_vehicles = location
            break
    
    if not location_with_vehicles:
        print("❌ No locations with vehicles found for testing")
        return
    
    location_id = location_with_vehicles["id"]
    vehicle_count = location_with_vehicles.get("vehicle_count", 0)
    
    print(f"📋 Testing deletion of location {location_id} with {vehicle_count} vehicles")
    
    # Try to delete location with vehicles - should fail
    response = session.delete(f"{API_BASE}/mobility/locations/{location_id}")
    
    if response.status_code == 400:
        data = response.json()
        if "Cannot delete location with" in data.get("detail", ""):
            print("✅ Location Deletion Validation - PASS (Correctly blocked deletion with vehicles)")
        else:
            print(f"❌ Location Deletion Validation - FAIL (Wrong error message: {data.get('detail')})")
    else:
        print(f"❌ Location Deletion Validation - FAIL (Should have returned 400, got {response.status_code})")

def test_vehicle_deletion():
    """Test vehicle deletion"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Vehicle Deletion")
    
    # Create a test vehicle for deletion
    response = session.get(f"{API_BASE}/mobility/locations?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get locations")
        return
    
    locations = response.json().get("data", [])
    if not locations:
        print("❌ No locations found")
        return
    
    location_id = locations[0]["id"]
    
    # Create a vehicle specifically for deletion testing
    vehicle_data = {
        "name": "Test Vehicle for Deletion",
        "vehicle_type": "bike",
        "brand": "Test Brand",
        "model": "Test Model",
        "license_plate": "DELETE-ME",
        "location_id": location_id,
        "status": "available",
        "pricing": {"hourly": 2.0, "daily": 15.0},
        "features": ["Test"],
        "capacity": 1,
        "active": True
    }
    
    response = session.post(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant", json=vehicle_data)
    if response.status_code != 200:
        print("❌ Failed to create test vehicle for deletion")
        return
    
    vehicle_id = response.json()["data"]["id"]
    print(f"📋 Created test vehicle {vehicle_id} for deletion")
    
    # Delete the vehicle
    response = session.delete(f"{API_BASE}/mobility/vehicles/{vehicle_id}")
    
    if response.status_code == 200:
        # Verify vehicle is actually deleted
        response = session.get(f"{API_BASE}/mobility/vehicles/{vehicle_id}")
        if response.status_code == 404:
            print("✅ Vehicle Deletion - PASS (Vehicle successfully deleted)")
        else:
            print("❌ Vehicle Deletion - FAIL (Vehicle still exists after deletion)")
    else:
        print(f"❌ Vehicle Deletion - FAIL (Status: {response.status_code})")

def test_booking_cancellation():
    """Test booking cancellation (DELETE booking)"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print("🔍 Testing Booking Cancellation")
    
    # Get existing bookings
    response = session.get(f"{API_BASE}/mobility/bookings?tenant_id=test-tenant")
    if response.status_code != 200:
        print("❌ Failed to get bookings")
        return
    
    bookings = response.json().get("data", [])
    
    # Find a booking that can be cancelled (not completed or already cancelled)
    cancellable_booking = None
    for booking in bookings:
        if booking["status"] not in ["completed", "cancelled"]:
            cancellable_booking = booking
            break
    
    if not cancellable_booking:
        print("❌ No cancellable bookings found")
        return
    
    booking_id = cancellable_booking["id"]
    vehicle_id = cancellable_booking["vehicle_id"]
    
    print(f"📋 Testing cancellation of booking {booking_id}")
    
    # Cancel the booking
    response = session.delete(f"{API_BASE}/mobility/bookings/{booking_id}")
    
    if response.status_code == 200:
        # Verify booking status changed to cancelled
        response = session.get(f"{API_BASE}/mobility/bookings/{booking_id}")
        if response.status_code == 200:
            booking_data = response.json()["data"]
            if booking_data["status"] == "cancelled":
                print("✅ Booking Cancellation - PASS (Booking status changed to cancelled)")
                
                # Verify vehicle status changed back to available
                response = session.get(f"{API_BASE}/mobility/vehicles/{vehicle_id}")
                if response.status_code == 200:
                    vehicle_data = response.json()["data"]
                    if vehicle_data["status"] == "available":
                        print("✅ Vehicle Status Update on Cancellation - PASS (Vehicle back to available)")
                    else:
                        print(f"❌ Vehicle Status Update on Cancellation - FAIL (Vehicle status: {vehicle_data['status']})")
            else:
                print(f"❌ Booking Cancellation - FAIL (Booking status: {booking_data['status']})")
        else:
            print("❌ Booking Cancellation - FAIL (Could not retrieve booking after cancellation)")
    else:
        print(f"❌ Booking Cancellation - FAIL (Status: {response.status_code})")

def main():
    """Run deletion and validation tests"""
    print("=" * 80)
    print("DELETION ENDPOINTS AND BUSINESS LOGIC VALIDATION TESTING")
    print("=" * 80)
    print("Testing deletion endpoints and business rule enforcement")
    print("=" * 80)
    print()
    
    test_location_deletion_with_vehicles()
    print()
    
    test_vehicle_deletion()
    print()
    
    test_booking_cancellation()
    print()
    
    print("=" * 80)
    print("DELETION TESTING COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()