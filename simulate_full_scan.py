"""
Simuliert einen vollständigen Regula-Scan (Vorder- und Rückseite)
Basierend auf den echten Daten von KAIMOVA ANGELINA ARKINOVNA
"""
import requests
import json
from datetime import datetime

BACKEND_URL = "https://mongo-atlas-migrate.preview.emergentagent.com"
WEBHOOK_URL = f"{BACKEND_URL}/api/webhooks/regula-scan"
API_KEY = "G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"

# TransactionID für Verknüpfung von Vorder- und Rückseite
TRANSACTION_ID = "demo-scan-kaimova-001"

def create_combined_scan_data():
    """
    Erstellt ein kombiniertes Payload mit Vorder- und Rückseite
    Basierend auf echten Regula-Daten
    """
    
    # VORDERSEITE - Basierend auf echten Daten
    front_side = {
        "ChoosenDoctype_Data": {
            "DOC_DOCUMENT_TYPE_DATA": {
                "PageIndex": "0",
                "Info": {
                    "DateTime": datetime.now().isoformat(),
                    "TransactionID": TRANSACTION_ID,
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
                                    "fieldType": "6",
                                    "fieldName": "Nationality",
                                    "valueList": [{"value": "D"}]
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
                                },
                                {
                                    "fieldType": "21",
                                    "fieldName": "Sex",
                                    "valueList": [{"value": "F"}]
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
                                    "value": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCABkAGQDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/iiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q=="
                                },
                                {
                                    "fieldName": "Portrait",
                                    "fieldType": "203",
                                    "value": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAyADIDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/iiiigAooooAKKKKAP/Z"
                                }
                            ]
                        }
                    ]
                }
            }
        },
        "SecurityChecks_Data": {
            "DOC_AUTHENTICITY_CHECK_LIST": {
                "page_idx": 0,
                "AuthenticheckList": {
                    "Count": 1,
                    "Type": 1,
                    "Result": 1,  # SUCCESS
                    "List": [{
                        "Result": 65537,
                        "ElementResult": 1,
                        "ElementDiagnose": 1
                    }]
                }
            }
        }
    }
    
    # RÜCKSEITE - Basierend auf echten Daten
    back_side = {
        "ChoosenDoctype_Data": {
            "DOC_DOCUMENT_TYPE_DATA": {
                "PageIndex": "1",
                "Info": {
                    "DateTime": datetime.now().isoformat(),
                    "TransactionID": TRANSACTION_ID,  # GLEICHE ID!
                    "ComputerName": "TIMURBUERO",
                    "UserName": "timur",
                    "SDKVersion": "8.3.0.7602",
                    "DeviceType": "DESKO Penta Scanner"
                },
                "Document_Candidate": {
                    "DocumentName": "Germany - Driving License (2013) Side B",
                    "ID": "-1387128715"
                }
            }
        },
        "Images_Data": {
            "result_type": 37,
            "page_idx": 1,
            "Images": {
                "fieldList": [
                    {
                        "fieldType": 201,
                        "fieldName": "Portrait",
                        "valueList": [{
                            "value": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAyADIDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/iiiigD/2Q=="
                        }]
                    },
                    {
                        "fieldType": 204,
                        "fieldName": "Signature",
                        "valueList": [{
                            "value": "/9j/4AAQSkZJRgABAQEASABIAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAgAFADAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/iiiigD/2Q=="
                        }]
                    }
                ]
            }
        },
        "Status_Data": {
            "Status": {
                "overallStatus": 1,  # SUCCESS
                "optical": 1,
                "rfid": 2,  # Kein RFID (normal bei Führerscheinen)
                "detailsOptical": {
                    "overallStatus": 1,
                    "mrz": 2,  # Keine MRZ (normal bei Führerscheinen)
                    "text": 1,  # Text erkannt
                    "docType": 1,  # Dokumenttyp erkannt
                    "security": 1,  # Sicherheitsmerkmale OK
                    "imageQA": 1,  # Bildqualität OK
                    "expiry": 1,  # Ablaufdatum OK
                    "pagesCount": 2,
                    "vds": 2
                },
                "detailsRFID": {
                    "overallStatus": 2,
                    "PA": 2,
                    "CA": 2,
                    "AA": 2,
                    "TA": 2,
                    "BAC": 2,
                    "PACE": 2
                },
                "portrait": 1,
                "stopList": 2
            }
        },
        "SecurityChecks_Data": {
            "DOC_AUTHENTICITY_CHECK_LIST": {
                "page_idx": 1,
                "AuthenticheckList": {
                    "Result": 1,
                    "ElementResult": 1
                }
            }
        }
    }
    
    # Kombiniertes Payload
    return {
        "front": front_side,
        "back": back_side,
        "tenant_id": "demo-scanner",
        "tenant_name": "Demo Scanner Station",
        "location_name": "TIMURBUERO",
        "device_name": "DESKO Penta Scanner"
    }


def send_scan_to_webhook(data):
    """Sendet Scan-Daten an den Webhook"""
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        print("📤 Sending combined front+back scan to webhook...")
        print(f"   URL: {WEBHOOK_URL}")
        print(f"   TransactionID: {TRANSACTION_ID}")
        
        response = requests.post(
            WEBHOOK_URL,
            json=data,
            headers=headers,
            timeout=60
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCESS! Scan processed successfully!")
            print("="*60)
            print(f"Scan ID: {result.get('scan_id')}")
            print(f"Images Saved: {result.get('images_saved')}")
            print(f"Quality Score: {result.get('quality_score')}/100")
            print(f"Manual Review Required: {result.get('requires_manual_review')}")
            print("="*60)
            
            personal = result.get('personal_data', {})
            print(f"\n👤 Scanned Person:")
            print(f"   Name: {personal.get('name')}")
            print(f"   Document Type: {personal.get('document_type')}")
            print(f"   Document Number: {personal.get('document_number')}")
            
            print(f"\n🔗 View in Admin Portal:")
            print(f"   URL: {BACKEND_URL}/portal/admin")
            print(f"   Navigate to: ID-Checks")
            print(f"   Look for: {personal.get('name')} - {TRANSACTION_ID}")
            
            return result
        else:
            print(f"\n❌ ERROR: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"\n❌ Error sending scan: {e}")
        return None


def main():
    """Hauptfunktion - Simuliert einen vollständigen Scan"""
    print("\n" + "="*60)
    print("🔬 FULL SCAN SIMULATION")
    print("="*60)
    print("\nSimulating: KAIMOVA ANGELINA ARKINOVNA")
    print("Document: German Driving License (2013)")
    print("Scanner: DESKO Penta Scanner")
    print(f"Location: TIMURBUERO")
    print("="*60)
    
    # Erstelle Scan-Daten
    scan_data = create_combined_scan_data()
    
    # Sende an Webhook
    result = send_scan_to_webhook(scan_data)
    
    if result:
        print("\n" + "="*60)
        print("✅ SCAN SUCCESSFULLY SENT TO ID-CHECKS SYSTEM")
        print("="*60)
        print("\n📋 Next Steps:")
        print("1. Open Admin Portal in browser")
        print(f"   → {BACKEND_URL}/portal/admin")
        print("\n2. Login with admin credentials:")
        print("   → Email: admin@tsrid.com")
        print("   → Password: <your-admin-password>")
        print("\n3. Navigate to: ID-Checks")
        print("\n4. Look for the scan:")
        print(f"   → Name: ANGELINA ARKINOVNA KAIMOVA")
        print(f"   → Doc Number: J52004ESW82")
        print(f"   → TransactionID: {TRANSACTION_ID}")
        print(f"   → Quality: {result.get('quality_score', 0)}/100")
        print("\n5. Click on the entry to see:")
        print("   ✓ All extracted data")
        print("   ✓ Front & back images")
        print("   ✓ Quality assessment")
        print("   ✓ Security checks")
        print("="*60)
    else:
        print("\n❌ Failed to send scan. Check backend logs for details.")


if __name__ == "__main__":
    main()
