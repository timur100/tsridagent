#!/usr/bin/env python3
"""
Quick Menu Error Scenario Testing
Tests error handling for Quick Menu APIs
"""

import requests
import json

# Backend URL from environment
BACKEND_URL = "https://quicktiles-dash.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_error_scenarios():
    """Test error scenarios for Quick Menu APIs"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    # Authenticate first
    auth_data = {
        "email": "admin@tsrid.com",
        "password": "admin123"
    }
    
    auth_response = session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    if auth_response.status_code == 200:
        token = auth_response.json()["access_token"]
        session.headers.update({'Authorization': f'Bearer {token}'})
        print("✅ Authentication successful")
    else:
        print("❌ Authentication failed")
        return
    
    print("\n🧪 TESTING ERROR SCENARIOS")
    print("=" * 50)
    
    # Test 1: Create tile without required fields
    print("\n1. Testing tile creation without required fields...")
    incomplete_tile = {
        "tenant_id": "tenant-europcar"
        # Missing title, target_url
    }
    
    response = session.post(f"{API_BASE}/quick-menu/tiles/create", json=incomplete_tile)
    print(f"   Status: {response.status_code}")
    if response.status_code == 422:  # Validation error
        print("   ✅ Correctly rejected incomplete tile data")
    else:
        print(f"   ❌ Expected 422, got {response.status_code}")
    
    # Test 2: Update non-existent tile
    print("\n2. Testing update of non-existent tile...")
    fake_tile_id = "non-existent-tile-id"
    update_data = {"title": "Updated Title"}
    
    response = session.put(f"{API_BASE}/quick-menu/tiles/update/{fake_tile_id}", json=update_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 404:
        print("   ✅ Correctly returned 404 for non-existent tile")
    else:
        print(f"   ❌ Expected 404, got {response.status_code}")
    
    # Test 3: Delete non-existent tile
    print("\n3. Testing deletion of non-existent tile...")
    response = session.delete(f"{API_BASE}/quick-menu/tiles/delete/{fake_tile_id}")
    print(f"   Status: {response.status_code}")
    if response.status_code == 404:
        print("   ✅ Correctly returned 404 for non-existent tile")
    else:
        print(f"   ❌ Expected 404, got {response.status_code}")
    
    # Test 4: Get tiles for non-existent tenant
    print("\n4. Testing get tiles for non-existent tenant...")
    response = session.get(f"{API_BASE}/quick-menu/tiles/tenant/non-existent-tenant")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("count") == 0:
            print("   ✅ Correctly returned empty list for non-existent tenant")
        else:
            print(f"   ❌ Unexpected response: {data}")
    else:
        print(f"   ❌ Expected 200, got {response.status_code}")
    
    # Test 5: Get config for non-existent tenant (should return default)
    print("\n5. Testing get config for non-existent tenant...")
    response = session.get(f"{API_BASE}/quick-menu/config/tenant/non-existent-tenant")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("config", {}).get("tenant_id") == "non-existent-tenant":
            print("   ✅ Correctly returned default config for non-existent tenant")
        else:
            print(f"   ❌ Unexpected response: {data}")
    else:
        print(f"   ❌ Expected 200, got {response.status_code}")
    
    print("\n" + "=" * 50)
    print("Error scenario testing completed!")

if __name__ == "__main__":
    test_error_scenarios()