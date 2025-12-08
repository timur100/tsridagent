# 🔍 Regula Scanner - Echte Datenstruktur Integration

## 📋 Analysierte Datenstruktur

Basierend auf dem echten Regula Scanner-Output:

### **1. Dokument-Typ (Doctype_Data.json)**
```json
{
  "DocumentName": "Germany - Driving License (2013)",
  "ICAOCode": "D<<",
  "dCountryName": "Germany",
  "dDescription": "Driving License",
  "dYear": "2013"
}
```

### **2. Extrahierte Textdaten (Text_Data.json)**
```json
{
  "Namen": ["KAIMOVA", "ANGELINA ARKINOVNA"],
  "Geburtsdatum": "13.05.2001",
  "Dokumentennummer": "J52004ESW82",
  "Zusätzliche_Daten": {
    "Ausstellungsdatum": "05.11.2024",
    "Ablaufdatum": "04.11.2039",
    "Ausstellungsbehörde": "Kreis Siegen-Wittgenstein",
    "Geburtsort": "Kara-Balta",
    "Alter": "24"
  }
}
```

### **3. Bilder (Graphics_Data.json)**
```json
{
  "DocGraphicsInfo": {
    "nFields": 2,
    "pArrayFields": [
      {
        "FieldType": 201,  // Portrait
        "FieldName": "Portrait",
        "image": {
          "image": "/9j/4AAQSkZJRg...",  // Base64
          "format": ".jpg"
        }
      },
      {
        "FieldType": 204,  // Signature
        "FieldName": "Signature",
        "image": {
          "image": "/9j/4AAQSkZJRg...",
          "format": ".jpg"
        }
      }
    ]
  }
}
```

### **4. Sicherheitsprüfungen (SecurityChecks_Data.json)**
```json
{
  "AuthenticityCheckList": {
    "Type": 1,
    "Result": 1,  // 1 = Erfolgreich
    "Count": 2,
    "pArrayList": [
      {
        "Result": 65537,
        "ElementResult": 1,
        "ElementDiagnose": 1
      }
    ]
  }
}
```

---

## 🔧 Integration in `/app/backend/routes/regula_scanner.py`

### **Aktualisierte send_scan_to_id_checks() Funktion:**

```python
async def send_scan_to_id_checks(scan_result: dict) -> str:
    """
    Sendet Regula Scanner-Daten an ID-Checks Dashboard
    
    Args:
        scan_result: Vollständige Response vom Regula Scanner
            - Doctype_Data
            - Text_Data
            - Graphics_Data
            - SecurityChecks_Data
            - etc.
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import uuid
        import json
        import base64
        import os
        
        # MongoDB connection
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
        mongo_client = AsyncIOMotorClient(mongo_url)
        mongo_db = mongo_client.get_database('main_db')
        scans_collection = mongo_db['id_scans']
        
        # Device configuration
        device_id = os.environ.get('DEVICE_ID', 'BERN01-01')
        device_name = os.environ.get('DEVICE_NAME', device_id)
        location_id = os.environ.get('LOCATION_ID', 'LOC-BERLIN-REINICKENDORF')
        location_name = os.environ.get('LOCATION_NAME', 'Berlin North Reinickendorf -IKC-')
        tenant_id = os.environ.get('TENANT_ID', '1d3653db-86cb-4dd1-9ef5-0236b116def8')
        tenant_name = os.environ.get('TENANT_NAME', 'Europcar')
        scanner_id = os.environ.get('SCANNER_ID', device_id)
        scanner_name = os.environ.get('SCANNER_NAME', 'Regula Scanner')
        
        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # ========================================
        # 1. EXTRACT DOCUMENT TYPE
        # ========================================
        doctype_data = scan_result.get('Doctype_Data', {})
        one_candidate = doctype_data.get('OneCandidate', {})
        fds_id_list = one_candidate.get('FDSIDList', {})
        
        document_type = one_candidate.get('DocumentName', 'Unknown')
        country_name = fds_id_list.get('dCountryName', '')
        icao_code = fds_id_list.get('ICAOCode', '')
        
        # ========================================
        # 2. EXTRACT TEXT DATA
        # ========================================
        text_data = scan_result.get('Text_Data', {})
        
        # Namen
        namen = text_data.get('Namen', [])
        last_name = namen[0] if len(namen) > 0 else ''
        first_name = ' '.join(namen[1:]) if len(namen) > 1 else ''
        
        # Basisdaten
        geburtsdatum = text_data.get('Geburtsdatum', '')
        dokumentennummer = text_data.get('Dokumentennummer', '')
        
        # Zusätzliche Daten
        zusatz = text_data.get('Zusätzliche_Daten', {})
        ausstellungsdatum = zusatz.get('Ausstellungsdatum', '')
        ablaufdatum = zusatz.get('Ablaufdatum', '')
        ausstellungsbehoerde = zusatz.get('Ausstellungsbehörde', '')
        geburtsort = zusatz.get('Geburtsort', '')
        alter = zusatz.get('Alter', '')
        
        # ========================================
        # 3. EXTRACT IMAGES
        # ========================================
        graphics_data = scan_result.get('Graphics_Data', {})
        doc_graphics = graphics_data.get('DocGraphicsInfo', {})
        image_fields = doc_graphics.get('pArrayFields', [])
        
        images_array = []
        portrait_data = None
        
        for field in image_fields:
            field_type = field.get('FieldType')
            field_name = field.get('FieldName', '')
            image_obj = field.get('image', {})
            base64_image = image_obj.get('image', '')
            image_format = image_obj.get('format', '.jpg')
            
            # Map field types
            if field_type == 201:  # Portrait
                image_type = 'portrait'
                portrait_data = base64_image
            elif field_type == 204:  # Signature
                image_type = 'signature'
            else:
                image_type = f'field_{field_type}'
            
            if base64_image:
                images_array.append({
                    "image_type": image_type,
                    "image_data": base64_image,
                    "format": image_format.replace('.', ''),
                    "field_name": field_name,
                    "uploaded_at": now
                })
        
        # ========================================
        # 4. EXTRACT SECURITY CHECKS
        # ========================================
        security_data = scan_result.get('SecurityChecks_Data', {})
        auth_check_list = security_data.get('AuthenticityCheckList', {})
        
        security_result = auth_check_list.get('Result', 0)
        security_elements = auth_check_list.get('pArrayList', [])
        
        # Berechne Confidence Score (0-100)
        # Result: 1 = Erfolgreich, ElementResult: 1 = Pass
        passed_checks = sum(1 for elem in security_elements if elem.get('ElementResult') == 1)
        total_checks = len(security_elements) if security_elements else 1
        confidence_score = int((passed_checks / total_checks) * 100)
        
        # Status basierend auf Sicherheitsprüfungen
        if security_result == 1 and confidence_score >= 80:
            status = "validated"
            verification_status = "valid"
        elif confidence_score >= 50:
            status = "pending"
            verification_status = "review_required"
        else:
            status = "rejected"
            verification_status = "invalid"
        
        # ========================================
        # 5. BUILD EXTRACTED_DATA
        # ========================================
        extracted_data = {
            "document_class": document_type,
            "country": country_name,
            "icao_code": icao_code,
            "document_number": dokumentennummer,
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}".strip(),
            "date_of_birth": geburtsdatum,
            "place_of_birth": geburtsort,
            "age": alter,
            "issue_date": ausstellungsdatum,
            "expiry_date": ablaufdatum,
            "issuing_authority": ausstellungsbehoerde,
            "nationality": country_name
        }
        
        # ========================================
        # 6. BUILD VERIFICATION
        # ========================================
        verification = {
            "confidence_score": confidence_score,
            "status": verification_status,
            "checks": {
                "authenticity_check": security_result == 1,
                "document_valid": status == "validated",
                "images_captured": len(images_array) > 0,
                "data_extracted": bool(dokumentennummer),
                "security_elements_count": total_checks,
                "security_elements_passed": passed_checks
            },
            "raw_security_result": security_result
        }
        
        # ========================================
        # 7. CREATE SCAN DOCUMENT
        # ========================================
        scan_data = {
            "id": scan_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "location_id": location_id,
            "location_name": location_name,
            "device_id": device_id,
            "device_name": device_name,
            "scanner_id": scanner_id,
            "scanner_name": scanner_name,
            "scan_timestamp": scan_result.get('timestamp', now),
            "status": status,
            "document_type": document_type,
            "scanned_by": scan_result.get('operator', None),
            "operator_id": scan_result.get('operator_id', None),
            "images": images_array,
            "extracted_data": extracted_data,
            "verification": verification,
            "requires_manual_review": status == "pending",
            "manual_actions": [],
            "created_at": now,
            "updated_at": now,
            "ip_address": scan_result.get('ip_address', None),
            "notes": None,
            "tags": ["regula", "automated", scanner_name.lower()],
            "source": "regula-scanner",
            "raw_scanner_data": scan_result  # Vollständige Original-Daten für Debugging
        }
        
        # Save to MongoDB
        await scans_collection.insert_one(scan_data)
        
        logger.info(f"✅ [ID-Checks] Scan {scan_id} sent to ID-Checks")
        logger.info(f"   Device: {device_name} ({device_id})")
        logger.info(f"   Location: {location_name}")
        logger.info(f"   Scanner: {scanner_name}")
        logger.info(f"   Document: {document_type}")
        logger.info(f"   Holder: {extracted_data['full_name']}")
        logger.info(f"   Doc Number: {dokumentennummer}")
        logger.info(f"   Confidence: {confidence_score}%")
        logger.info(f"   Status: {status}")
        
        return scan_id
        
    except Exception as e:
        logger.error(f"❌ [ID-Checks] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
```

---

## 🎯 Mapping-Übersicht

| Regula Scanner Feld | ID-Checks Feld |
|---------------------|----------------|
| `Doctype_Data.OneCandidate.DocumentName` | `document_type` |
| `Text_Data.Namen[0]` | `last_name` |
| `Text_Data.Namen[1+]` | `first_name` |
| `Text_Data.Geburtsdatum` | `date_of_birth` |
| `Text_Data.Dokumentennummer` | `document_number` |
| `Text_Data.Zusätzliche_Daten.Geburtsort` | `place_of_birth` |
| `Text_Data.Zusätzliche_Daten.Ausstellungsdatum` | `issue_date` |
| `Text_Data.Zusätzliche_Daten.Ablaufdatum` | `expiry_date` |
| `Graphics_Data.pArrayFields[FieldType=201]` | `portrait` image |
| `Graphics_Data.pArrayFields[FieldType=204]` | `signature` image |
| `SecurityChecks_Data.AuthenticityCheckList.Result` | `verification.status` |

---

## 🧪 Testing

Nach der Integration:

1. **Scan durchführen** mit echtem Dokument
2. **Backend-Logs prüfen:**
   ```bash
   tail -f /var/log/supervisor/backend.out.log | grep "ID-Checks"
   ```
3. **Dashboard öffnen:**
   ```
   https://asset-tracker-270.preview.emergentagent.com/portal/admin/id-checks
   ```

**Erwartetes Ergebnis:**
- ✅ Korrekter Name: "ANGELINA ARKINOVNA KAIMOVA"
- ✅ Geburtsdatum: "13.05.2001"
- ✅ Dokumentennummer: "J52004ESW82"
- ✅ Portrait-Bild sichtbar
- ✅ Standort: "Berlin North Reinickendorf -IKC-"
- ✅ Gerät: "BERN01-01"
- ✅ Status: "validated" (wenn Sicherheitschecks erfolgreich)

---

## 📝 Nächste Schritte

1. ✅ Datenstruktur analysiert
2. ⏳ Code in `regula_scanner.py` updaten
3. ⏳ Backend neu starten
4. ⏳ Echten Scan durchführen
5. ⏳ Im Dashboard überprüfen
