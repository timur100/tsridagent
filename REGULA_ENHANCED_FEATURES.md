# Regula Scanner Integration - Enhanced Features ✨

## 📋 Neue Funktionen (Option A Implementierung)

### ✅ 1. Vorder- & Rückseiten-Verarbeitung

Der Parser verarbeitet jetzt **beide Seiten** eines Dokuments:

**Vorderseite (page_idx=0):**
- Graphics_Data.json - Alle Bilder (Front, Back, Portrait, IR, UV, WHITE)
- Text_Data.json - Persönliche Daten (Name, Geburtsdatum, Dokumentnummer)
- Alle relevanten Textinformationen

**Rückseite (page_idx=1):**
- Images_Data.json - Extrahierte Bilder (Portrait, Signature, Document Front)
- Status_Data.json - ⭐ **Qualitätsbewertung und Verarbeitungsstatus**
- SecurityChecks_Data.json - Zusätzliche Sicherheitsprüfungen

### ✅ 2. TransactionID-basierte Verknüpfung

**Automatische Zusammenführung:**
- Vorder- und Rückseite werden über die **TransactionID** verknüpft
- Wenn die Rückseite später eintrifft, wird sie automatisch mit der Vorderseite gemerged
- Alle Bilder und Qualitätsdaten werden kombiniert

```python
# Beispiel TransactionID
"785c4543-04ef-4db7-8268-38267789d862"
```

**Zwei Verarbeitungsmodi:**

#### Modus 1: Separate Requests
```bash
# Schritt 1: Vorderseite senden
curl -X POST /api/webhooks/regula-scan \
  -H "X-API-Key: xxx" \
  -d '{
    "ChoosenDoctype_Data": {...},
    "Text_Data": {...},
    "page_idx": 0,
    "TransactionID": "785c4543-..."
  }'

# Response:
{
  "scan_id": "uuid-1",
  "side": "front",
  "transaction_id": "785c4543-..."
}

# Schritt 2: Rückseite senden (später)
curl -X POST /api/webhooks/regula-scan \
  -H "X-API-Key: xxx" \
  -d '{
    "ChoosenDoctype_Data": {...},
    "Status_Data": {...},
    "page_idx": 1,
    "TransactionID": "785c4543-..."  // GLEICHE ID!
  }'

# Response:
{
  "scan_id": "uuid-1",  // GLEICHE Scan-ID!
  "linked": true,
  "total_images": 8,
  "quality_score": 95
}
```

#### Modus 2: Combined Request
```bash
curl -X POST /api/webhooks/regula-scan \
  -H "X-API-Key: xxx" \
  -d '{
    "front": {
      "ChoosenDoctype_Data": {...},
      "Text_Data": {...}
    },
    "back": {
      "ChoosenDoctype_Data": {...},
      "Status_Data": {...}
    },
    "tenant_id": "tenant-123"
  }'

# Response:
{
  "scan_id": "uuid",
  "images_saved": 8,
  "quality_score": 95
}
```

### ✅ 3. Status_Data.json Auswertung

**Automatische Qualitätsbewertung:**

```json
{
  "Status": {
    "overallStatus": 1,  // 1=SUCCESS, 2=ERROR
    "optical": 1,
    "rfid": 2,
    "detailsOptical": {
      "text": 1,         // ✅ Text erkannt
      "docType": 1,      // ✅ Dokumenttyp identifiziert
      "security": 1,     // ✅ Sicherheitsmerkmale geprüft
      "expiry": 1,       // ✅ Ablaufdatum validiert
      "mrz": 2,          // ❌ MRZ nicht gelesen (NORMAL bei Führerscheinen!)
      "imageQA": 2       // ⚠️ Bildqualität nicht optimal
    }
  }
}
```

**Quality Score Berechnung:**

Der Parser berechnet automatisch einen Quality Score (0-100):

```python
# Kritische Checks (70% Gewichtung):
- text = 1         ✅
- docType = 1      ✅
- security = 1     ✅
- expiry = 1       ✅
→ 70/70 Punkte

# Optionale Checks (30% Gewichtung):
- imageQA = 1      ✅
- overallStatus = 1 ✅
→ 20/30 Punkte

# Gesamt: 90/100 → Hohe Qualität
```

**Automatische Entscheidung:**
- **Quality Score ≥ 80** → Status: `validated` → Kein Review nötig
- **Quality Score 50-79** → Status: `pending` → Review empfohlen
- **Quality Score < 50** → Status: `rejected` → **Manueller Review erforderlich**

### ✅ 4. Images_Data.json Parser

**Neuer Dateityp (nur Rückseite):**

```json
{
  "Images": {
    "fieldList": [
      {
        "fieldType": 201,
        "fieldName": "Portrait",
        "valueList": [{"value": "Base64..."}]
      },
      {
        "fieldType": 204,
        "fieldName": "Signature",
        "valueList": [{"value": "Base64..."}]
      },
      {
        "fieldType": 207,
        "fieldName": "Document front side",
        "valueList": [{"value": "Base64..."}]
      }
    ]
  }
}
```

**Besonderheit:** Die Rückseite enthält auch ein Bild der **Vorderseite**!

### ✅ 5. MRZ.TXT & Results.TXT Integration

**MRZ.TXT Parser:**
```ini
[Tests]
KnownDoc=0
TestsFailed=0

[Derived Results]
DocumentNumber=J52004ESW82
Surname=KAIMOVA
GivenName=ANGELINA ARKINOVNA

[Photo location]
ROItop=280
ROIleft=44
ROIwidth=436
ROIheight=538
```

**Results.TXT Parser:**
CSV-Format mit Vergleichsdaten zwischen verschiedenen Quellen (MRZ, OCR, RFID, Barcode)

### ✅ 6. Erweiterte Metadaten

**Neue Felder im IDScan-Modell:**

```javascript
{
  "id": "uuid",
  "regula_metadata": {
    "transaction_id": "785c4543-...",
    "page_idx": 0,                    // 0=Front, 1=Back
    "side": "front",                  // "front" oder "back"
    "quality_score": 95,              // 0-100
    "device_type": "DESKO Penta Scanner",
    "device_serial": "201743 00716",
    "sdk_version": "8.3.0.7602",
    "mrz_data": {...},                // Geparste MRZ.TXT Daten
    "back_side_processed": true       // Wurde Rückseite verarbeitet?
  },
  "verification": {
    "confidence_score": 95,
    "authenticity_score": 95,
    "document_validity": true,
    "status_details": {               // Vollständige Status_Data
      "optical_details": {...},
      "rfid_details": {...}
    }
  },
  "requires_manual_review": false,    // Automatisch berechnet
  "status": "validated"               // validated/pending/rejected
}
```

---

## 🔧 API-Verwendung

### Webhook-Endpunkt

**URL:** `POST /api/webhooks/regula-scan`

**Header:**
```
X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
Content-Type: application/json
```

### Response-Beispiel (Separate Requests)

**Vorderseite:**
```json
{
  "success": true,
  "message": "Regula front side scan processed successfully",
  "scan_id": "fe1b0cfc-f542-4f49-8d32-b3c303414dc1",
  "side": "front",
  "transaction_id": "test-transaction-12345",
  "images_saved": 6,
  "quality_score": 0,
  "requires_manual_review": true,
  "personal_data": {
    "name": "MAX MUSTERMANN",
    "document_number": "TEST123456",
    "document_type": "Driving License"
  }
}
```

**Rückseite (verknüpft):**
```json
{
  "success": true,
  "message": "Back side linked to existing scan",
  "scan_id": "fe1b0cfc-f542-4f49-8d32-b3c303414dc1",
  "linked": true,
  "images_saved": 2,
  "total_images": 8,
  "quality_score": 95,
  "requires_manual_review": false
}
```

---

## 📊 Qualitätsbewertung Details

### Status-Codes Interpretation

| Code | Bedeutung | Aktion |
|------|-----------|--------|
| `1` | ✅ SUCCESS | Check erfolgreich |
| `2` | ❌ ERROR/NOT AVAILABLE | Check fehlgeschlagen oder nicht verfügbar |

### Wichtige Checks

#### Kritische Checks (müssen = 1 sein):
- ✅ `text` - Texterkennung
- ✅ `docType` - Dokumenttyp-Identifikation
- ✅ `security` - Sicherheitsmerkmale
- ✅ `expiry` - Ablaufdatum-Validierung

#### Normale Fehler bei Führerscheinen:
- ⚠️ `mrz = 2` - **NORMAL** (Führerscheine haben keine MRZ)
- ⚠️ `rfid = 2` - **NORMAL** (Führerscheine haben keinen Chip)
- ⚠️ `vds = 2` - **NORMAL** (Visible Digital Seal meist nicht vorhanden)

### Automatische Review-Entscheidung

```python
def should_require_manual_review(status, quality_score):
    # Automatisch ablehnen wenn Quality Score zu niedrig
    if quality_score < 50:
        return True
    
    # Prüfe kritische Checks
    critical_checks = [
        status['optical_details']['text'],
        status['optical_details']['docType'],
        status['optical_details']['security']
    ]
    
    # Wenn irgendein kritischer Check fehlschlägt
    if any(check != 1 for check in critical_checks):
        return True
    
    return False
```

---

## 🧪 Testing

### Test-Skript

**Location:** `/app/test_regula_enhanced.py`

**Ausführung:**
```bash
cd /app
python test_regula_enhanced.py
```

**Testszenarien:**
1. ✅ Separate Front & Back Requests mit TransactionID-Verknüpfung
2. ✅ Combined Front+Back Request
3. ✅ Quality Score Berechnung
4. ✅ Automatische Review-Entscheidung

### Manuelle Tests

**Test 1: Nur Vorderseite**
```bash
curl -X POST https://tenant-manager-58.preview.emergentagent.com/api/webhooks/regula-scan \
  -H "X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg" \
  -H "Content-Type: application/json" \
  -d @front_side_data.json
```

**Test 2: Rückseite hinzufügen**
```bash
curl -X POST https://tenant-manager-58.preview.emergentagent.com/api/webhooks/regula-scan \
  -H "X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg" \
  -H "Content-Type: application/json" \
  -d @back_side_data.json
```

**Test 3: Kombiniert**
```bash
curl -X POST https://tenant-manager-58.preview.emergentagent.com/api/webhooks/regula-scan \
  -H "X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg" \
  -H "Content-Type: application/json" \
  -d @combined_data.json
```

---

## 📂 Code-Struktur

### Neue/Aktualisierte Dateien

1. **`/app/backend/utils/regula_parser.py`** ⭐ ERWEITERT
   - `parse_all_data()` - Erkennt automatisch Front/Back
   - `_parse_front_side()` - Front-spezifische Logik
   - `_parse_back_side()` - Back-spezifische Logik
   - `_parse_images_data()` - Images_Data.json Parser
   - `_parse_status_data()` - Status_Data.json Parser
   - `_calculate_quality_score()` - Quality Score Berechnung
   - `_parse_mrz_txt()` - MRZ.TXT Parser
   - `_parse_results_txt()` - Results.TXT Parser
   - `should_require_manual_review()` - Review-Entscheidung

2. **`/app/backend/routes/webhooks.py`** ⭐ ERWEITERT
   - `regula_scan_webhook()` - Haupt-Endpoint mit Front/Back-Erkennung
   - `_process_combined_scan()` - Verarbeitung kombinierter Requests
   - `_save_image()` - Helper für Bildspeicherung
   - TransactionID-basierte Verknüpfung

3. **`/app/test_regula_enhanced.py`** ✨ NEU
   - Umfassende Tests für beide Modi
   - TransactionID-Verknüpfung testen
   - Quality Score Validierung

4. **`/app/REGULA_ENHANCED_FEATURES.md`** ✨ NEU
   - Diese Dokumentation

---

## ✅ Erfolgskriterien

### Funktionale Tests
- [x] Vorderseite einzeln verarbeiten
- [x] Rückseite einzeln verarbeiten
- [x] TransactionID-Verknüpfung funktioniert
- [x] Kombinierter Front+Back Request
- [x] Quality Score wird berechnet
- [x] Manual Review Entscheidung korrekt
- [x] Alle Bildtypen werden gespeichert
- [x] Status_Data wird korrekt geparst
- [x] Metadaten vollständig

### Datenbank-Validierung
- [x] TransactionID gespeichert
- [x] page_idx korrekt (0/1)
- [x] side korrekt ("front"/"back")
- [x] quality_score vorhanden
- [x] requires_manual_review gesetzt
- [x] Alle Bilder verknüpft

---

## 🎯 Vorteile der Implementierung

### 1. **Automatische Qualitätskontrolle**
   - Scans mit hohem Quality Score werden automatisch akzeptiert
   - Nur problematische Scans erfordern manuellen Review
   - Spart Zeit und Ressourcen

### 2. **Robuste Vorder-/Rückseiten-Verknüpfung**
   - Funktioniert auch wenn Seiten zeitversetzt ankommen
   - TransactionID garantiert korrekte Zuordnung
   - Keine manuellen Zusammenführungen nötig

### 3. **Vollständige Datentransparenz**
   - Alle Qualitäts-Checks einsehbar
   - Status_Data für Debugging und Audit
   - MRZ-Daten für zusätzliche Validierung

### 4. **Flexible Integration**
   - Unterstützt beide Verarbeitungsmodi
   - Scanner kann Seiten einzeln oder zusammen senden
   - Keine Änderungen am Scanner notwendig

### 5. **Compliance-Ready**
   - Vollständiger Audit-Trail
   - Alle Metadaten gespeichert
   - Qualitätsnachweise vorhanden

---

## 📞 Support & Troubleshooting

### Häufige Fragen

**Q: Warum ist mrz=2 bei Führerscheinen?**
A: Deutsche Führerscheine haben keine Machine Readable Zone (MRZ). Das ist normal und kein Fehler.

**Q: Warum ist rfid=2?**
A: Führerscheine haben keinen RFID-Chip. Nur Reisepässe und Personalausweise haben Chips.

**Q: Was bedeutet Quality Score 0?**
A: Die Rückseite wurde noch nicht verarbeitet. Status_Data ist nur auf der Rückseite verfügbar.

**Q: Wie kann ich die Verknüpfung testen?**
A: Verwenden Sie das Test-Skript `/app/test_regula_enhanced.py` - es testet beide Szenarien.

---

**Status:** ✅ Vollständig implementiert und getestet (November 2025)
**Version:** 2.0 (Enhanced with Front/Back support)
