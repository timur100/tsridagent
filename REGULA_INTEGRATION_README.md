# Regula Scanner Integration - Dokumentation

## 📋 Überblick

Diese Integration ermöglicht es, Scan-Daten von Regula-Dokumentenscannern über einen Webhook-Endpunkt an die `identity-checks` Anwendung zu senden.

## 🎯 Funktionsweise

### 1. Datenformat & Zwei-Seiten-Scan

Der Regula-Scanner erzeugt für **jede Seite** eines Dokuments mehrere JSON/XML-Dateien:

**VORDERSEITE (page_idx=0):**

**JSON-Dateien:**
- `Graphics_Data.json` - Enthält Base64-kodierte Bilder
- `Text_Data.json` - Enthält extrahierte Textdaten (Name, Geburtsdatum, etc.)
- `ChoosenDoctype_Data.json` - Dokumenttyp und Scan-Metadaten
- `SecurityChecks_Data.json` - Sicherheitsprüfungsergebnisse
- `IR.json`, `UV.json`, `WHITE.json` - Spezielle Lichtbilder
- `DocumentPosition_Data.json`, `LexicalAnalyze_Data.json`, `Visual_OCR_Data.json`

**Zusätzliche Dateien:**
- XML-Versionen aller JSON-Dateien
- `Report.pdf` - Visueller Bericht
- `Photo.jpg` - Portraitfoto

### 2. Webhook-Endpunkt

**URL:** `POST /api/webhooks/regula-scan`

**Authentifizierung:** API-Schlüssel über `X-API-Key` Header

**Request Format:**
```json
{
  "Graphics_Data": { /* JSON-Struktur mit Base64-Bildern */ },
  "Text_Data": { /* JSON-Struktur mit Textfeldern */ },
  "ChoosenDoctype_Data": { /* Dokumenttyp und Metadaten */ },
  "SecurityChecks_Data": { /* Sicherheitsprüfungen */ },
  "IR": { /* Infrarot-Bild */ },
  "UV": { /* UV-Licht-Bild */ },
  "WHITE": { /* Weißlicht-Bild */ },
  
  // Optional: Tenant/Location-Informationen
  "tenant_id": "your-tenant-id",
  "tenant_name": "Your Tenant Name",
  "location_id": "location-123",
  "location_name": "Scanner Location",
  "device_id": "device-456",
  "device_name": "Scanner Device"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Regula scan processed successfully",
  "scan_id": "uuid-generated-id",
  "images_saved": 5,
  "personal_data": {
    "name": "ANGELINA ARKINOVNA KAIMOVA",
    "document_number": "J52004ESW82",
    "document_type": "Driving License"
  }
}
```

### 3. Datenverarbeitung

Der Webhook:

1. **Parst** alle Regula-JSON-Strukturen
2. **Extrahiert** persönliche Daten aus `Text_Data.json`
3. **Dekodiert** Base64-Bilder aus `Graphics_Data.json` und speziellen Lichtdateien
4. **Speichert** Bilder auf der Festplatte (`/app/backend/uploads/id_scans/`)
5. **Erstellt** einen `IDScan`-Eintrag in der MongoDB
6. **Gibt** Scan-ID und Zusammenfassung zurück

### 4. Extrahierte Datenfelder

**Persönliche Informationen:**
- `first_name` (Vorname)
- `last_name` (Nachname)
- `date_of_birth` (Geburtsdatum)
- `place_of_birth` (Geburtsort)
- `nationality` (Staatsangehörigkeit)
- `sex` (Geschlecht)

**Dokumentinformationen:**
- `document_number` (Dokumentnummer)
- `document_type` (Dokumenttyp, z.B. "Driving License")
- `issuing_authority` (Ausstellende Behörde)
- `issue_date` (Ausstellungsdatum)
- `expiry_date` (Ablaufdatum)
- `issuing_country` (Ausstellendes Land)

**Scan-Metadaten:**
- `scan_datetime` (Scan-Zeitstempel)
- `device_type` (z.B. "DESKO Penta Scanner")
- `device_serial` (Seriennummer des Scanners)
- `transaction_id` (Eindeutige Transaktions-ID)

**Bilder:**
- `front_original` (Vorderseite, weißes Licht)
- `back_original` (Rückseite)
- `portrait` (Portraitfoto)
- `front_ir` (Infrarot)
- `front_uv` (UV-Licht)
- `front_white` (Weißlicht)

## 🔧 API-Schlüssel

Der API-Schlüssel wird in `/app/backend/.env` gespeichert:

```
WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
```

**Verwendung im Request:**
```bash
curl -X POST https://multitenantapp-4.preview.emergentagent.com/api/webhooks/regula-scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg" \
  -d @regula_scan_data.json
```

## 📝 Code-Struktur

### Backend-Dateien

1. **`/app/backend/utils/regula_parser.py`**
   - `RegulaParser` Klasse für das Parsen aller Regula-Datenstrukturen
   - `create_idscan_from_regula()` Funktion zum Konvertieren in IDScan-Format
   - Methoden zum Dekodieren von Base64-Bildern

2. **`/app/backend/routes/webhooks.py`**
   - `POST /api/webhooks/regula-scan` Endpunkt
   - Authentifizierung via API-Schlüssel
   - Bildverarbeitung und Speicherung
   - MongoDB-Integration

3. **`/app/backend/middleware/api_key_auth.py`**
   - API-Schlüssel-Validierung für Webhooks

### Test-Skript

**`/app/test_regula_webhook.py`**
- Testet den Webhook mit Beispieldaten
- Verifiziert erfolgreiche Datenverarbeitung

**Ausführung:**
```bash
cd /app
python test_regula_webhook.py
```

## 🚀 Integration mit Scanner-Service

Für die Integration mit einem separaten Scanner-Service (z.B. `scan-verify-hub`):

### Option 1: Direktes POST vom Scanner

```python
import requests
import json

# Nach dem Scan: Alle Daten sammeln
scan_data = {
    "Graphics_Data": graphics_data,
    "Text_Data": text_data,
    "ChoosenDoctype_Data": doctype_data,
    # ... weitere Dateien
    "tenant_id": "scanner-location-1",
    "tenant_name": "Location Name"
}

# Webhook aufrufen
response = requests.post(
    "https://multitenantapp-4.preview.emergentagent.com/api/webhooks/regula-scan",
    json=scan_data,
    headers={"X-API-Key": "G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"}
)

if response.status_code == 200:
    result = response.json()
    print(f"Scan erfolgreich: {result['scan_id']}")
```

### Option 2: Queue-basierter Ansatz

Verwenden Sie die Dateien in `/app/SCAN_SERVICE_INTEGRATION_FILES/`:

1. **`webhook_sender.py`** - Sendet Daten an den Webhook
2. **`sqlite_queue.py`** - Persistente Warteschlange für offline-Szenarien
3. **`retry_worker.py`** - Hintergrund-Worker für Wiederholungsversuche

## 📊 Datenbankschema

Gespeichert in der `id_scans` Collection:

```json
{
  "id": "uuid",
  "tenant_id": "string",
  "tenant_name": "string",
  "location_name": "string",
  "device_name": "string",
  "scan_timestamp": "ISO datetime",
  "status": "pending",
  "extracted_data": {
    "first_name": "string",
    "last_name": "string",
    "document_number": "string",
    // ... weitere Felder
  },
  "images": [
    {
      "image_type": "front_original",
      "file_path": "/app/backend/uploads/id_scans/uuid_front.jpg",
      "file_size": 12345,
      "uploaded_at": "ISO datetime"
    }
  ],
  "verification": {
    "confidence_score": null,
    // ... Verifikationsdaten
  },
  "regula_metadata": {
    "transaction_id": "string",
    "device_type": "string",
    "device_serial": "string"
  },
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

## 🔍 Debugging

### Backend-Logs prüfen

```bash
tail -f /var/log/supervisor/backend.err.log
```

Erfolgreiche Webhooks zeigen:
```
📄 [Regula Webhook] Parsing incoming scan data...
✅ [Regula Webhook] Saved front image (123456 bytes)
✅ [Regula Webhook] Saved portrait image (67890 bytes)
✅ [Regula Webhook] Scan uuid processed successfully
   Name: ANGELINA ARKINOVNA KAIMOVA
   Document: Driving License
   Number: J52004ESW82
   Images: 2 saved
```

### MongoDB-Abfrage

```bash
mongosh mongodb://localhost:27017/main_db --eval "db.id_scans.find().sort({created_at: -1}).limit(1).pretty()"
```

### Test mit curl

```bash
curl -X POST https://multitenantapp-4.preview.emergentagent.com/api/webhooks/regula-scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg" \
  -d '{
    "ChoosenDoctype_Data": {
      "DOC_DOCUMENT_TYPE_DATA": {
        "Info": {
          "DateTime": "2025-11-23T12:00:00",
          "DeviceType": "Test Scanner"
        }
      }
    },
    "Text_Data": {
      "ContainerList": {
        "List": {
          "Container_Text": [{
            "fieldList": [{
              "fieldType": "0",
              "valueList": [{"value": "MUSTERMANN"}]
            }]
          }]
        }
      }
    },
    "tenant_id": "test",
    "tenant_name": "Test Tenant"
  }'
```

## ✅ Erfolgskriterien

Ein erfolgreicher Scan zeigt:

✅ HTTP Status 200  
✅ `success: true` in der Response  
✅ Generierte `scan_id`  
✅ Anzahl gespeicherter Bilder > 0  
✅ Extrahierte persönliche Daten in der Response  
✅ Eintrag in der `id_scans` MongoDB-Collection  
✅ Gespeicherte Bilder in `/app/backend/uploads/id_scans/`

## 🔐 Sicherheit

- **API-Schlüssel-Authentifizierung** für alle Webhook-Anfragen
- **Maximale Dateigröße** von 10MB pro Bild
- **Input-Validierung** für alle Datenfelder
- **Sichere Bildspeicherung** außerhalb des Web-Roots

## 📞 Support

Bei Fragen oder Problemen:

1. Backend-Logs prüfen
2. Test-Skript ausführen
3. MongoDB-Einträge überprüfen
4. Beispiel-Payload mit vollständigen Daten testen

---

**Status:** ✅ Implementiert und getestet (23.11.2025)
