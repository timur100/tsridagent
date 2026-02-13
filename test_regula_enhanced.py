"""
Enhanced test script for Regula webhook endpoint
Tests front/back side processing and TransactionID linking
"""
import json
import requests
import os
from datetime import datetime

# Configuration
BACKEND_URL = "https://hardware-slot-months.preview.emergentagent.com"
WEBHOOK_URL = f"{BACKEND_URL}/api/webhooks/regula-scan"
API_KEY = "G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"

# Shared TransactionID for linking front and back
TRANSACTION_ID = "test-transaction-12345"


def create_front_side_payload():
    """Create a test payload for front side"""
    return {
        "ChoosenDoctype_Data": {
            "DOC_DOCUMENT_TYPE_DATA": {
                "PageIndex": "0",
                "Info": {
                    "DateTime": datetime.now().isoformat(),
                    "TransactionID": TRANSACTION_ID,
                    "ComputerName": "TEST-COMPUTER",
                    "UserName": "testuser",
                    "SDKVersion": "8.3.0.7602",
                    "Version": "8.4",
                    "DeviceType": "TEST Scanner",
                    "DeviceNumber": "0x000002cc",
                    "DeviceLabelSerialNumber": "TEST12345"
                },
                "Document_Candidate": {
                    "DocumentName": "Germany - Driving License (2013)",
                    "ID": "-1539142713",
                    "FID": {
                        "ICAOCode": "D<<",
                        "Description": "Driving License",
                        "Year": "2013",
                        "CountryName": "Germany"
                    }
                }
            }
        },
        "Text_Data": {
            "ContainerList": {
                "List": {
                    "Container_Text": [
                        {
                            "fieldList": [
                                {"fieldType": "0", "fieldName": "Surname", "valueList": [{"value": "MUSTERMANN"}]},
                                {"fieldType": "1", "fieldName": "Given Names", "valueList": [{"value": "MAX"}]},
                                {"fieldType": "3", "fieldName": "Date of Birth", "valueList": [{"value": "01.01.1990"}]},
                                {"fieldType": "5", "fieldName": "Document Number", "valueList": [{"value": "TEST123456"}]},
                                {"fieldType": "8", "fieldName": "Date of Issue", "valueList": [{"value": "01.01.2020"}]},
                                {"fieldType": "7", "fieldName": "Date of Expiry", "valueList": [{"value": "31.12.2030"}]},
                                {"fieldType": "10", "fieldName": "Issuing Authority", "valueList": [{"value": "Test Authority"}]},
                                {"fieldType": "11", "fieldName": "Place of Birth", "valueList": [{"value": "Berlin"}]}
                            ]
                        }
                    ]
                }
            }
        },
        "Graphics_Data": {
            "ContainerList": {
                "List": {
                    "Container_Graphics": [
                        {
                            "fieldList": [
                                {"fieldName": "Document image light 6 (white)", "fieldType": "200", "value": "/9j/4AAQSkZJRgABAQEASABIAAD/"},
                                {"fieldName": "Portrait", "fieldType": "203", "value": "/9j/4AAQSkZJRgABAQEASABIAAD/"}
                            ]
                        }
                    ]
                }
            }
        },
        "tenant_id": "test-tenant",
        "tenant_name": "Test Tenant",
        "location_name": "Test Location"
    }


def create_back_side_payload():
    """Create a test payload for back side"""
    return {
        "ChoosenDoctype_Data": {
            "DOC_DOCUMENT_TYPE_DATA": {
                "PageIndex": "1",
                "Info": {
                    "DateTime": datetime.now().isoformat(),
                    "TransactionID": TRANSACTION_ID,  # SAME as front
                    "ComputerName": "TEST-COMPUTER",
                    "UserName": "testuser",
                    "SDKVersion": "8.3.0.7602",
                    "DeviceType": "TEST Scanner"
                },
                "Document_Candidate": {
                    "DocumentName": "Germany - Driving License (2013) Side B",
                    "ID": "-1387128715"
                }
            }
        },
        "Images_Data": {
            "Images": {
                "fieldList": [
                    {"fieldType": 201, "fieldName": "Portrait", "valueList": [{"value": "/9j/4AAQSkZJRgABAQEASABIAAD/"}]},
                    {"fieldType": 204, "fieldName": "Signature", "valueList": [{"value": "/9j/4AAQSkZJRgABAQEASABIAAD/"}]}
                ]
            }
        },
        "Status_Data": {
            "Status": {
                "overallStatus": 1,
                "optical": 1,
                "rfid": 2,
                "detailsOptical": {
                    "overallStatus": 1,
                    "mrz": 2,
                    "text": 1,
                    "docType": 1,
                    "security": 1,
                    "imageQA": 1,
                    "expiry": 1,
                    "pagesCount": 2,
                    "vds": 2
                },
                "detailsRFID": {
                    "overallStatus": 2
                },
                "portrait": 1,
                "stopList": 2
            }
        },
        "tenant_id": "test-tenant",
        "tenant_name": "Test Tenant"
    }


def test_scenario_1_separate_sides():
    """Test Scenario 1: Send front and back as separate requests"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 1: Separate Front & Back Requests")
    print("="*60)
    
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    
    # Step 1: Send front side
    print("\n📤 Step 1: Sending FRONT side...")
    front_payload = create_front_side_payload()
    
    try:
        response = requests.post(WEBHOOK_URL, json=front_payload, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Front side processed")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Side: {result.get('side')}")
            print(f"   TransactionID: {result.get('transaction_id')}")
            print(f"   Images: {result.get('images_saved')}")
            front_scan_id = result.get('scan_id')
        else:
            print(f"   ❌ Error: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return
    
    # Step 2: Send back side
    print("\n📤 Step 2: Sending BACK side...")
    back_payload = create_back_side_payload()
    
    try:
        response = requests.post(WEBHOOK_URL, json=back_payload, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Back side processed")
            print(f"   Linked: {result.get('linked', False)}")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Total Images: {result.get('total_images', 0)}")
            print(f"   Quality Score: {result.get('quality_score', 0)}/100")
            print(f"   Manual Review: {result.get('requires_manual_review', False)}")
            
            if result.get('linked'):
                print(f"\n   🔗 SUCCESS: Back side linked to front side!")
        else:
            print(f"   ❌ Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")


def test_scenario_2_combined():
    """Test Scenario 2: Send front and back in one request"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 2: Combined Front+Back Request")
    print("="*60)
    
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    
    combined_payload = {
        "front": create_front_side_payload(),
        "back": create_back_side_payload(),
        "tenant_id": "test-tenant",
        "tenant_name": "Test Tenant"
    }
    
    print("\n📤 Sending combined front+back...")
    
    try:
        response = requests.post(WEBHOOK_URL, json=combined_payload, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Combined scan processed")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Images: {result.get('images_saved')}")
            print(f"   Quality Score: {result.get('quality_score', 0)}/100")
            print(f"   Manual Review: {result.get('requires_manual_review', False)}")
            print(f"   Name: {result.get('personal_data', {}).get('name')}")
            print(f"   Document: {result.get('personal_data', {}).get('document_type')}")
        else:
            print(f"   ❌ Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")


def main():
    """Run all test scenarios"""
    print("\n🚀 Enhanced Regula Webhook Tests")
    print(f"Backend URL: {WEBHOOK_URL}")
    print(f"TransactionID: {TRANSACTION_ID}")
    
    # Run tests
    test_scenario_1_separate_sides()
    test_scenario_2_combined()
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60)


if __name__ == "__main__":
    main()
