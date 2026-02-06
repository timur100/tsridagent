"""
Test script for Regula webhook endpoint
Tests with real data from the uploaded Regula scanner files
"""
import json
import requests
import os

# Get backend URL from env
BACKEND_URL = "https://tablet-agent-1.preview.emergentagent.com"
WEBHOOK_URL = f"{BACKEND_URL}/api/webhooks/regula-scan"

# API Key from backend/.env
API_KEY = "G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"

def load_sample_data():
    """Load sample Regula data from uploaded files"""
    
    # This is a simplified test payload
    # In production, this would contain all the real JSON data from the scanner
    test_payload = {
        "ChoosenDoctype_Data": {
            "DOC_DOCUMENT_TYPE_DATA": {
                "PageIndex": "0",
                "Info": {
                    "DateTime": "2025-11-23T12:09:06.000",
                    "TransactionID": "785c4543-04ef-4db7-8268-38267789d862",
                    "ComputerName": "TIMURBUERO",
                    "UserName": "timur",
                    "SDKVersion": "8.3.0.7602",
                    "Version": "8.4",
                    "DeviceType": "DESKO Penta Scanner",
                    "DeviceNumber": "0x000002cc",
                    "DeviceLabelSerialNumber": "201743 00716"
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
                                {
                                    "fieldType": "0",
                                    "fieldName": "Surname",
                                    "valueList": [{"value": "KAIMOVA"}]
                                },
                                {
                                    "fieldType": "1",
                                    "fieldName": "Given Names",
                                    "valueList": [{"value": "ANGELINA ARKINOVNA"}]
                                },
                                {
                                    "fieldType": "3",
                                    "fieldName": "Date of Birth",
                                    "valueList": [{"value": "13.05.2001"}]
                                },
                                {
                                    "fieldType": "5",
                                    "fieldName": "Document Number",
                                    "valueList": [{"value": "J52004ESW82"}]
                                },
                                {
                                    "fieldType": "8",
                                    "fieldName": "Date of Issue",
                                    "valueList": [{"value": "05.11.2024"}]
                                },
                                {
                                    "fieldType": "7",
                                    "fieldName": "Date of Expiry",
                                    "valueList": [{"value": "04.11.2039"}]
                                },
                                {
                                    "fieldType": "10",
                                    "fieldName": "Issuing Authority",
                                    "valueList": [{"value": "Kreis Siegen-Wittgenstein"}]
                                },
                                {
                                    "fieldType": "11",
                                    "fieldName": "Place of Birth",
                                    "valueList": [{"value": "Kara-Balta"}]
                                }
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
                                {
                                    "fieldName": "Document image light 6 (white)",
                                    "fieldType": "200",
                                    "value": "/9j/4AAQSkZJRg..."  # Truncated Base64
                                },
                                {
                                    "fieldName": "Portrait",
                                    "fieldType": "203",
                                    "value": "/9j/4AAQSkZJRg..."  # Truncated Base64
                                }
                            ]
                        }
                    ]
                }
            }
        },
        # Optional tenant/location info
        "tenant_id": "test-tenant",
        "tenant_name": "Test Tenant",
        "location_name": "Test Location"
    }
    
    return test_payload


def test_regula_webhook():
    """Test the Regula webhook endpoint"""
    
    print("🧪 Testing Regula Webhook Endpoint")
    print("=" * 50)
    
    # Load sample data
    payload = load_sample_data()
    
    print(f"📤 Sending test request to: {WEBHOOK_URL}")
    print(f"   Payload size: {len(json.dumps(payload))} bytes")
    
    # Set headers
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        # Send POST request
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print(f"   Scan ID: {result.get('scan_id')}")
            print(f"   Images Saved: {result.get('images_saved')}")
            
            personal = result.get('personal_data', {})
            print(f"   Name: {personal.get('name')}")
            print(f"   Document Number: {personal.get('document_number')}")
            print(f"   Document Type: {personal.get('document_type')}")
            
        else:
            print("❌ ERROR!")
            print(f"   {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to backend")
        print(f"   Make sure backend is running on {BACKEND_URL}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")


if __name__ == "__main__":
    test_regula_webhook()
