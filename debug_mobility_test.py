#!/usr/bin/env python3
"""
Debug Mobility Services API - Simple test to identify issues
"""

import requests
import json
import jwt

# Backend URL from environment
BACKEND_URL = "https://datahub-central-4.preview.emergentagent.com"
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
        print(f"Response: {response.text}")
        return None, None
    
    data = response.json()
    token = data.get("access_token")
    
    if not token:
        print(f"❌ No access token in response: {data}")
        return None, None
    
    session.headers.update({
        'Authorization': f'Bearer {token}'
    })
    
    print("✅ Authentication successful")
    return session, token

def test_simple_location_creation():
    """Test simple location creation"""
    session, token = authenticate_admin()
    if not session:
        return
    
    # Very simple location data
    location_data = {
        "name": "Test Location",
        "address": "Test Address",
        "city": "Berlin",
        "postal_code": "10557",
        "country": "Deutschland",
        "lat": 52.5251,
        "lng": 13.3694,
        "location_type": "station",
        "active": True
    }
    
    print(f"🔍 Testing location creation with data: {json.dumps(location_data, indent=2)}")
    
    response = session.post(f"{API_BASE}/mobility/locations?tenant_id=test-tenant", json=location_data)
    
    print(f"📊 Response Status: {response.status_code}")
    print(f"📊 Response Headers: {dict(response.headers)}")
    
    try:
        response_data = response.json()
        print(f"📊 Response Data: {json.dumps(response_data, indent=2)}")
    except:
        print(f"📊 Response Text: {response.text}")

def test_get_vehicles():
    """Test get vehicles to see if endpoint works"""
    session, token = authenticate_admin()
    if not session:
        return
    
    print(f"🔍 Testing get vehicles")
    
    response = session.get(f"{API_BASE}/mobility/vehicles?tenant_id=test-tenant")
    
    print(f"📊 Response Status: {response.status_code}")
    
    try:
        response_data = response.json()
        print(f"📊 Response Data: {json.dumps(response_data, indent=2)}")
    except:
        print(f"📊 Response Text: {response.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("DEBUG MOBILITY SERVICES API")
    print("=" * 60)
    
    print("\n🔍 STEP 1: Test Simple Location Creation")
    test_simple_location_creation()
    
    print("\n🔍 STEP 2: Test Get Vehicles")
    test_get_vehicles()
    
    print("\n" + "=" * 60)