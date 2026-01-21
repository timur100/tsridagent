#!/usr/bin/env python3
"""
Debug Resources Upload Endpoint
Detailed debugging to understand why category parameter isn't working
"""

import requests
import json
import sys
import io

# Backend URL from environment
BACKEND_URL = "https://datahub-central-4.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def authenticate_admin():
    """Authenticate as admin user"""
    session = requests.Session()
    session.headers.update({
        'Accept': 'application/json'
    })
    
    auth_data = {
        "email": "admin@tsrid.com",
        "password": "admin123"
    }
    
    response = session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    
    if response.status_code != 200:
        print(f"❌ Authentication failed: {response.status_code}")
        return None
    
    data = response.json()
    token = data.get("access_token")
    
    if not token:
        print(f"❌ No access token in response")
        return None
    
    session.headers.update({
        'Authorization': f'Bearer {token}'
    })
    
    print(f"✅ Authenticated successfully")
    return session

def debug_upload_with_category(session):
    """Debug upload with category parameter"""
    print("\n🔍 Debugging upload with category parameter...")
    
    # Create test file
    test_content = "Debug test file content"
    test_file = io.BytesIO(test_content.encode('utf-8'))
    
    # Method 1: Using files and data parameters
    print("\n📤 Method 1: Using files and data parameters")
    files = {
        'file': ('debug_test_1.txt', test_file, 'text/plain')
    }
    data = {
        'category': 'anleitungen'
    }
    
    headers = {k: v for k, v in session.headers.items() if k.lower() != 'content-type'}
    
    response = session.post(
        f"{API_BASE}/resources/upload",
        files=files,
        data=data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"File path: {result.get('file', {}).get('path')}")
        print(f"Expected: /anleitungen/debug_test_1.txt")
        print(f"Match: {'✅' if result.get('file', {}).get('path', '').startswith('/anleitungen/') else '❌'}")
    else:
        print(f"Error: {response.text}")
    
    # Method 2: Using Form class
    print("\n📤 Method 2: Using Form parameter in URL")
    test_file.seek(0)  # Reset file pointer
    
    files = {
        'file': ('debug_test_2.txt', test_file, 'text/plain')
    }
    
    response = session.post(
        f"{API_BASE}/resources/upload?category=anleitungen",
        files=files,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"File path: {result.get('file', {}).get('path')}")
        print(f"Expected: /anleitungen/debug_test_2.txt")
        print(f"Match: {'✅' if result.get('file', {}).get('path', '').startswith('/anleitungen/') else '❌'}")
    else:
        print(f"Error: {response.text}")
    
    # Method 3: Check what's actually being received
    print("\n📤 Method 3: Testing with different form encoding")
    test_file.seek(0)  # Reset file pointer
    
    # Try with explicit multipart boundary
    import uuid
    boundary = str(uuid.uuid4())
    
    # Manually construct multipart data
    multipart_data = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="category"\r\n\r\n'
        f'anleitungen\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="debug_test_3.txt"\r\n'
        f'Content-Type: text/plain\r\n\r\n'
        f'{test_content}\r\n'
        f'--{boundary}--\r\n'
    ).encode('utf-8')
    
    headers_manual = {k: v for k, v in session.headers.items() if k.lower() != 'content-type'}
    headers_manual['Content-Type'] = f'multipart/form-data; boundary={boundary}'
    
    response = session.post(
        f"{API_BASE}/resources/upload",
        data=multipart_data,
        headers=headers_manual
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"File path: {result.get('file', {}).get('path')}")
        print(f"Expected: /anleitungen/debug_test_3.txt")
        print(f"Match: {'✅' if result.get('file', {}).get('path', '').startswith('/anleitungen/') else '❌'}")
    else:
        print(f"Error: {response.text}")

def test_invalid_category(session):
    """Test invalid category handling"""
    print("\n🔍 Testing invalid category handling...")
    
    test_content = "Invalid category test"
    test_file = io.BytesIO(test_content.encode('utf-8'))
    
    files = {
        'file': ('invalid_test.txt', test_file, 'text/plain')
    }
    data = {
        'category': 'invalid_category_name'
    }
    
    headers = {k: v for k, v in session.headers.items() if k.lower() != 'content-type'}
    
    response = session.post(
        f"{API_BASE}/resources/upload",
        files=files,
        data=data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Expected: 400 (Bad Request)")
    print(f"Match: {'✅' if response.status_code == 400 else '❌'}")
    
    if response.status_code != 400:
        try:
            result = response.json()
            print(f"Unexpected success response: {json.dumps(result, indent=2)}")
        except:
            print(f"Response text: {response.text}")

def main():
    print("=" * 70)
    print("DEBUG RESOURCES UPLOAD ENDPOINT")
    print("=" * 70)
    
    # Authenticate
    session = authenticate_admin()
    if not session:
        return False
    
    # Debug upload with category
    debug_upload_with_category(session)
    
    # Test invalid category
    test_invalid_category(session)
    
    print("\n" + "=" * 70)
    print("DEBUG COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()