#!/usr/bin/env python3
"""
Detailed Customer Portal Location Data Analysis
Analyzes which devices have empty location data and why
"""

import requests
import json
import sys

# Backend URL from environment
BACKEND_URL = "https://location-sync-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def authenticate_tenant_admin():
    """Authenticate as tenant admin user"""
    auth_data = {
        "email": "info@europcar.com",
        "password": "Berlin#2018"
    }
    
    response = requests.post(f"{API_BASE}/portal/auth/login", json=auth_data)
    
    if response.status_code != 200:
        print(f"❌ Authentication failed. Status: {response.status_code}")
        return None
    
    data = response.json()
    return data.get("access_token")

def get_customer_portal_devices(token):
    """Get devices via Customer Portal endpoint"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.get(f"{API_BASE}/portal/europcar-devices", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get devices. Status: {response.status_code}")
        return None
    
    data = response.json()
    
    if not data.get("success"):
        print(f"❌ Response indicates failure: {data}")
        return None
    
    return data.get("data", {}).get("devices", [])

def analyze_location_data(devices):
    """Analyze location data in detail"""
    print(f"\n🔍 DETAILED LOCATION DATA ANALYSIS")
    print(f"Total devices: {len(devices)}")
    
    # Categorize devices
    with_street_and_zip = []
    empty_street = []
    empty_zip = []
    empty_both = []
    no_locationcode = []
    
    for device in devices:
        device_id = device.get('device_id', 'unknown')
        locationcode = device.get('locationcode', '')
        street = device.get('street', '')
        zip_code = device.get('zip', '')
        
        if not locationcode:
            no_locationcode.append({
                'device_id': device_id,
                'locationcode': locationcode,
                'street': street,
                'zip': zip_code
            })
        elif not street and not zip_code:
            empty_both.append({
                'device_id': device_id,
                'locationcode': locationcode,
                'street': street,
                'zip': zip_code
            })
        elif not street:
            empty_street.append({
                'device_id': device_id,
                'locationcode': locationcode,
                'street': street,
                'zip': zip_code
            })
        elif not zip_code:
            empty_zip.append({
                'device_id': device_id,
                'locationcode': locationcode,
                'street': street,
                'zip': zip_code
            })
        else:
            with_street_and_zip.append({
                'device_id': device_id,
                'locationcode': locationcode,
                'street': street,
                'zip': zip_code
            })
    
    print(f"\n📊 LOCATION DATA STATISTICS:")
    print(f"   • Devices with both street and zip: {len(with_street_and_zip)}")
    print(f"   • Devices with empty street only: {len(empty_street)}")
    print(f"   • Devices with empty zip only: {len(empty_zip)}")
    print(f"   • Devices with both empty: {len(empty_both)}")
    print(f"   • Devices with no locationcode: {len(no_locationcode)}")
    
    # Show sample devices with populated data
    if with_street_and_zip:
        print(f"\n✅ SAMPLE DEVICES WITH POPULATED LOCATION DATA:")
        for i, device in enumerate(with_street_and_zip[:5]):
            print(f"   {i+1}. {device['device_id']} ({device['locationcode']}): {device['street']}, {device['zip']}")
    
    # Show devices with issues
    if empty_street:
        print(f"\n⚠️  DEVICES WITH EMPTY STREET:")
        for device in empty_street[:5]:
            print(f"   • {device['device_id']} ({device['locationcode']}): street='{device['street']}', zip='{device['zip']}'")
    
    if empty_zip:
        print(f"\n⚠️  DEVICES WITH EMPTY ZIP:")
        for device in empty_zip[:5]:
            print(f"   • {device['device_id']} ({device['locationcode']}): street='{device['street']}', zip='{device['zip']}'")
    
    if empty_both:
        print(f"\n⚠️  DEVICES WITH BOTH EMPTY:")
        for device in empty_both[:5]:
            print(f"   • {device['device_id']} ({device['locationcode']}): street='{device['street']}', zip='{device['zip']}'")
    
    if no_locationcode:
        print(f"\n⚠️  DEVICES WITH NO LOCATIONCODE:")
        for device in no_locationcode[:5]:
            print(f"   • {device['device_id']}: locationcode='{device['locationcode']}'")
    
    # Calculate success rate
    total_with_location_data = len(with_street_and_zip)
    success_rate = (total_with_location_data / len(devices)) * 100 if devices else 0
    
    print(f"\n📈 SUCCESS RATE: {success_rate:.1f}% ({total_with_location_data}/{len(devices)} devices have complete location data)")
    
    return {
        'total': len(devices),
        'with_complete_data': len(with_street_and_zip),
        'success_rate': success_rate,
        'issues': {
            'empty_street': len(empty_street),
            'empty_zip': len(empty_zip),
            'empty_both': len(empty_both),
            'no_locationcode': len(no_locationcode)
        }
    }

def main():
    print("=" * 80)
    print("DETAILED CUSTOMER PORTAL LOCATION DATA ANALYSIS")
    print("=" * 80)
    
    # Authenticate
    print("🔍 Authenticating as info@europcar.com with Berlin#2018...")
    token = authenticate_tenant_admin()
    if not token:
        print("❌ Authentication failed")
        return False
    
    print("✅ Authentication successful")
    
    # Get devices
    print("\n🔍 Fetching devices from Customer Portal...")
    devices = get_customer_portal_devices(token)
    if not devices:
        print("❌ Failed to fetch devices")
        return False
    
    print(f"✅ Fetched {len(devices)} devices")
    
    # Analyze location data
    analysis = analyze_location_data(devices)
    
    # Final assessment
    print(f"\n" + "=" * 80)
    print("FINAL ASSESSMENT")
    print("=" * 80)
    
    if analysis['success_rate'] >= 95:
        print("🎉 EXCELLENT: Location data enrichment is working very well")
        status = "EXCELLENT"
    elif analysis['success_rate'] >= 90:
        print("✅ GOOD: Location data enrichment is working well with minor gaps")
        status = "GOOD"
    elif analysis['success_rate'] >= 80:
        print("⚠️  ACCEPTABLE: Location data enrichment is working but has some gaps")
        status = "ACCEPTABLE"
    else:
        print("❌ POOR: Location data enrichment has significant issues")
        status = "POOR"
    
    print(f"Success Rate: {analysis['success_rate']:.1f}%")
    print(f"Devices with complete location data: {analysis['with_complete_data']}/{analysis['total']}")
    
    if analysis['issues']['empty_street'] > 0 or analysis['issues']['empty_zip'] > 0:
        print(f"\nNote: Some devices have empty location fields, which may be expected if:")
        print(f"  • The locationcode doesn't exist in the tenant_locations database")
        print(f"  • The location data in the database is incomplete")
        print(f"  • The device doesn't have a valid locationcode")
    
    return status in ["EXCELLENT", "GOOD", "ACCEPTABLE"]

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)