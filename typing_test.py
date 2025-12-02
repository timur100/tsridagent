#!/usr/bin/env python3
"""
Test the typing indicator endpoint to see why it's returning 422 errors
"""

import requests
import json

# Backend URL from environment
BACKEND_URL = "https://timeflow-portal-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_typing_indicator():
    session = requests.Session()
    
    # Authenticate first
    auth_data = {
        "email": "admin@tsrid.com",
        "password": "admin123"
    }
    
    response = session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    if response.status_code != 200:
        print(f"❌ Authentication failed: {response.status_code}")
        return
    
    token = response.json()["access_token"]
    session.headers.update({'Authorization': f'Bearer {token}'})
    
    # Test typing indicator with different payloads
    test_cases = [
        {
            "name": "JSON payload",
            "headers": {'Content-Type': 'application/json'},
            "data": json.dumps({
                "ticket_id": "TK.20251122.021",
                "is_typing": True
            })
        },
        {
            "name": "Form data",
            "headers": {'Content-Type': 'application/x-www-form-urlencoded'},
            "data": {
                "ticket_id": "TK.20251122.021",
                "is_typing": "true"
            }
        },
        {
            "name": "Multipart form data",
            "headers": {},  # Let requests set the boundary
            "files": {
                "ticket_id": (None, "TK.20251122.021"),
                "is_typing": (None, "true")
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🔍 Testing {test_case['name']}...")
        
        if 'files' in test_case:
            response = session.post(
                f"{API_BASE}/chat/typing",
                files=test_case['files']
            )
        else:
            response = session.post(
                f"{API_BASE}/chat/typing",
                headers=test_case['headers'],
                data=test_case['data']
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_typing_indicator()