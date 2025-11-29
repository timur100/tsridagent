#!/usr/bin/env python3
"""
Quick Parking Test - Test overstay scenario with minimal wait time
"""

import requests
import json
import time

# Backend URL
BACKEND_URL = "https://admin-portal-dash-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_overstay_quick():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    # Authenticate
    auth_data = {"email": "admin@tsrid.com", "password": "admin123"}
    auth_response = session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    
    if auth_response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    token = auth_response.json()["access_token"]
    session.headers.update({'Authorization': f'Bearer {token}'})
    
    # Set config to 0 minutes free parking
    config_data = {"max_free_duration_minutes": 0, "penalty_per_hour": 20.0, "enabled": True}
    config_response = session.put(f"{API_BASE}/parking/config", json=config_data)
    print(f"Config update: {config_response.status_code}")
    
    # Register entry
    entry_data = {"license_plate": "QUICK-TEST", "zone": "default"}
    entry_response = session.post(f"{API_BASE}/parking/entry", json=entry_data)
    print(f"Entry: {entry_response.status_code}")
    
    if entry_response.status_code == 200:
        entry_result = entry_response.json()
        print(f"Entry result: {entry_result}")
    
    # Wait 62 seconds
    print("Waiting 62 seconds...")
    time.sleep(62)
    
    # Register exit
    exit_data = {"license_plate": "QUICK-TEST"}
    exit_response = session.post(f"{API_BASE}/parking/exit", json=exit_data)
    print(f"Exit: {exit_response.status_code}")
    
    if exit_response.status_code == 200:
        exit_result = exit_response.json()
        print(f"Exit result: {json.dumps(exit_result, indent=2)}")
        
        data = exit_result.get("data", {})
        duration = data.get("duration_minutes", 0)
        penalty = data.get("penalty_amount", 0)
        violation_created = data.get("violation_created", False)
        
        print(f"\n📊 Results:")
        print(f"Duration: {duration} minutes")
        print(f"Penalty: €{penalty}")
        print(f"Violation created: {violation_created}")
        
        if duration >= 1 and penalty > 0 and violation_created:
            print("✅ Overstay scenario working correctly!")
        else:
            print("❌ Overstay scenario not working as expected")
    else:
        print(f"❌ Exit failed: {exit_response.text}")

if __name__ == "__main__":
    test_overstay_quick()