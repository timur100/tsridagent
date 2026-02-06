"""
Test mit echten Regula-Daten von hochgeladenen Dateien
"""
import requests
import json

BACKEND_URL = "https://tablet-agent-1.preview.emergentagent.com"
WEBHOOK_URL = f"{BACKEND_URL}/api/webhooks/regula-scan"
API_KEY = "G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"

# URLs der hochgeladenen echten Dateien (Vorderseite)
FRONT_URLS = {
    "Graphics_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/2cw6jqxh_Graphics_Data.json",
    "Text_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/pz8krlbl_Text_Data.json",
    "ChoosenDoctype_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/ixpgynni_ChoosenDoctype_Data.json",
    "SecurityChecks_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/2b8tak9n_SecurityChecks_Data.json",
}

# URLs der hochgeladenen echten Dateien (Rückseite)
BACK_URLS = {
    "Images_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/vn0ajze3_Images_Data.json",
    "ChoosenDoctype_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/2dgs97o5_ChoosenDoctype_Data.json",
    "Status_Data": "https://customer-assets.emergentagent.com/job_scan-sync-1/artifacts/43wnf4jm_Status_Data.json",
}


def download_json(url):
    """Download JSON from URL"""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️  Failed to download {url}: {response.status_code}")
            return None
    except Exception as e:
        print(f"⚠️  Error downloading {url}: {e}")
        return None


def test_with_real_front_data():
    """Test mit echten Vorderseiten-Daten"""
    print("\n" + "="*60)
    print("🧪 TEST: Echte Vorderseiten-Daten (KAIMOVA ANGELINA)")
    print("="*60)
    
    # Download all front side data
    print("\n📥 Downloading front side data...")
    front_data = {}
    
    for key, url in FRONT_URLS.items():
        print(f"   Downloading {key}...")
        data = download_json(url)
        if data:
            front_data[key] = data
            print(f"   ✅ {key} downloaded")
        else:
            print(f"   ❌ {key} failed")
    
    if not front_data:
        print("❌ No data downloaded!")
        return
    
    # Add tenant info
    front_data['tenant_id'] = 'real-test-tenant'
    front_data['tenant_name'] = 'Real Data Test'
    front_data['location_name'] = 'TIMURBUERO'
    
    # Send to webhook
    print("\n📤 Sending to webhook...")
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(WEBHOOK_URL, json=front_data, headers=headers, timeout=60)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ SUCCESS!")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Side: {result.get('side')}")
            print(f"   TransactionID: {result.get('transaction_id')}")
            print(f"   Images Saved: {result.get('images_saved')}")
            print(f"   Quality Score: {result.get('quality_score')}")
            print(f"   Manual Review: {result.get('requires_manual_review')}")
            
            personal = result.get('personal_data', {})
            print(f"\n   👤 Person:")
            print(f"      Name: {personal.get('name')}")
            print(f"      Document: {personal.get('document_type')}")
            print(f"      Number: {personal.get('document_number')}")
            
            return result.get('scan_id')
        else:
            print(f"\n❌ ERROR: {response.text}")
            return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None


def test_with_real_back_data():
    """Test mit echten Rückseiten-Daten"""
    print("\n" + "="*60)
    print("🧪 TEST: Echte Rückseiten-Daten")
    print("="*60)
    
    # Download all back side data
    print("\n📥 Downloading back side data...")
    back_data = {}
    
    for key, url in BACK_URLS.items():
        print(f"   Downloading {key}...")
        data = download_json(url)
        if data:
            back_data[key] = data
            print(f"   ✅ {key} downloaded")
        else:
            print(f"   ❌ {key} failed")
    
    if not back_data:
        print("❌ No data downloaded!")
        return
    
    # Add tenant info
    back_data['tenant_id'] = 'real-test-tenant'
    back_data['tenant_name'] = 'Real Data Test'
    
    # Send to webhook
    print("\n📤 Sending to webhook...")
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(WEBHOOK_URL, json=back_data, headers=headers, timeout=60)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ SUCCESS!")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Linked: {result.get('linked', False)}")
            print(f"   Total Images: {result.get('total_images', 0)}")
            print(f"   Quality Score: {result.get('quality_score')}")
            print(f"   Manual Review: {result.get('requires_manual_review')}")
            
            if result.get('linked'):
                print(f"\n   🔗 Back side successfully linked to front side!")
        else:
            print(f"\n❌ ERROR: {response.text}")
    except Exception as e:
        print(f"\n❌ Error: {e}")


def main():
    """Run tests with real data"""
    print("\n🚀 Testing with REAL Regula Scanner Data")
    print(f"Backend: {WEBHOOK_URL}")
    print(f"Source: KAIMOVA ANGELINA ARKINOVNA - German Driving License")
    
    # Test front side
    scan_id = test_with_real_front_data()
    
    # Test back side (will link to front)
    if scan_id:
        print(f"\n💡 Front side scan_id: {scan_id}")
        print("   Now sending back side to link...")
        test_with_real_back_data()
    
    print("\n" + "="*60)
    print("✅ Real data tests completed!")
    print("="*60)


if __name__ == "__main__":
    main()
