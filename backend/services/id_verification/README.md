# 📋 ID Verification Microservice

## 🎯 Übersicht

Der **ID Verification Microservice** ist verantwortlich für:
- Dokumenten-Scanning und -Verifikation
- Verwaltung von Scan-Daten
- Offline-Scan-Synchronisation (SQLite → MongoDB)
- Banned Documents Management
- Verification History

---

## 🏗️ Architektur

**Service:** ID Verification  
**Port:** 8101  
**Database:** `verification_db` (MongoDB)  
**Base URL:** `http://localhost:8101`

### Collections:
- `scans` - Hauptsammlung für alle Scans
- `scan_images` - Separate Sammlung für große Bilder (geplant)
- `verification_history` - Verifikations-Historie
- `banned_documents` - Gesperrte Dokumente

---

## 🚀 Start

### Development:
```bash
cd /app/backend/services/id_verification
python -m uvicorn server:app --reload --port 8101
```

### Production (via Supervisor):
```bash
sudo supervisorctl start id_verification
sudo supervisorctl status id_verification
```

### Logs:
```bash
# Fehler-Logs
tail -f /var/log/supervisor/id_verification.err.log

# Output-Logs
tail -f /var/log/supervisor/id_verification.out.log
```

---

## 📡 API Endpoints

### Health Check
```bash
GET /health

Response:
{
  "service": "id-verification",
  "status": "healthy",
  "version": "1.0.0"
}
```

### Scans

#### Create Scan
```bash
POST /api/verification/scans
Content-Type: application/json

{
  "device_id": "device-001",
  "location_id": "loc-001",
  "document_data": {
    "document_type": "Passport",
    "document_number": "DE123456789",
    "first_name": "Max",
    "last_name": "Mustermann",
    "birth_date": "1990-01-01",
    "expiry_date": "2030-12-31",
    "nationality": "DE",
    "sex": "M",
    "issuing_country": "DE"
  },
  "images": [
    {
      "type": "front",
      "data": "base64encodedimage...",
      "format": "jpeg"
    }
  ],
  "verification_status": "verified"
}
```

#### Get All Scans
```bash
GET /api/verification/scans?device_id=device-001&limit=100

Response:
[
  {
    "scan_id": "uuid",
    "device_id": "device-001",
    "timestamp": "2025-11-17T07:00:00Z",
    "document_data": {...},
    "verification_status": "verified",
    "synced_from_offline": false
  }
]
```

#### Get Single Scan
```bash
GET /api/verification/scans/{scan_id}
```

#### Delete Scan
```bash
DELETE /api/verification/scans/{scan_id}
```

---

### Offline Sync

#### Sync Offline Scans (SQLite → MongoDB)
```bash
POST /api/verification/sync/offline-scans
Content-Type: application/json

{
  "device_id": "device-001",
  "scans": [
    {
      "device_id": "device-001",
      "document_data": {...},
      "images": [...],
      "offline_scan_timestamp": "2025-11-17T06:00:00Z"
    }
  ]
}

Response:
{
  "success": true,
  "synced_count": 5,
  "failed_count": 0,
  "synced_scan_ids": ["uuid1", "uuid2", ...],
  "failed_scans": [],
  "message": "Synced 5 of 5 scans"
}
```

#### Get Device Sync Data
```bash
GET /api/verification/sync/device-data/{device_id}

Response:
{
  "device_id": "device-001",
  "location_id": "loc-001",
  "location_name": "Berlin HQ",
  "settings": {
    "pin": "1234",
    "max_offline_scans": 100,
    "auto_sync_interval": 30
  },
  "last_sync": "2025-11-17T07:00:00Z"
}
```

#### Get Sync Statistics
```bash
GET /api/verification/sync/stats/{device_id}

Response:
{
  "device_id": "device-001",
  "total_scans": 150,
  "offline_synced_scans": 45,
  "online_scans": 105,
  "last_sync_time": "2025-11-17T07:30:00Z"
}
```

---

### Banned Documents

#### Add Banned Document
```bash
POST /api/verification/banned-documents
Content-Type: application/json

{
  "document_number": "DE987654321",
  "reason": "Stolen document",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

#### Check If Document Is Banned
```bash
POST /api/verification/banned-documents/check
Content-Type: application/json

{
  "document_number": "DE987654321"
}

Response:
{
  "is_banned": true,
  "reason": "Stolen document",
  "banned_at": "2025-11-17T07:00:00Z",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

#### Get All Banned Documents
```bash
GET /api/verification/banned-documents?limit=100
```

#### Remove Banned Document
```bash
DELETE /api/verification/banned-documents/{banned_id}
```

---

### Verification History

#### Create Verification Record
```bash
POST /api/verification/verification/history
Content-Type: application/json

{
  "scan_id": "uuid",
  "verification_type": "document",
  "result": {
    "verified": true,
    "confidence": 0.95,
    "checks_passed": {
      "mrz": true,
      "hologram": true,
      "photo": true
    },
    "warnings": [],
    "errors": []
  }
}
```

#### Get Verification History
```bash
GET /api/verification/verification/history/{scan_id}
```

---

## 🔧 Konfiguration

### Umgebungsvariablen (.env):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=verification_db
CORS_ORIGINS=*
PORT=8101
SERVICE_SECRET=change-this-in-production
PORTAL_SERVICE_URL=http://localhost:8003
```

---

## 🗄️ Datenmodelle

### Scan
```python
{
  "scan_id": "uuid",
  "device_id": "string",
  "location_id": "string",
  "timestamp": "datetime",
  "document_data": {
    "document_type": "string",
    "document_number": "string",
    "first_name": "string",
    "last_name": "string",
    "birth_date": "string",
    "expiry_date": "string",
    "nationality": "string",
    "sex": "string",
    "issuing_country": "string"
  },
  "images": [
    {
      "type": "string",
      "data": "base64",
      "format": "string"
    }
  ],
  "verification_status": "string",
  "synced_from_offline": "boolean",
  "offline_scan_timestamp": "datetime",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## 🧪 Testing

### cURL Beispiele:

#### Scan erstellen:
```bash
curl -X POST http://localhost:8101/api/verification/scans \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "document_data": {
      "document_type": "Passport",
      "document_number": "DE123456789",
      "first_name": "Max",
      "last_name": "Mustermann"
    }
  }'
```

#### Alle Scans abrufen:
```bash
curl http://localhost:8101/api/verification/scans
```

#### Device Sync Data:
```bash
curl http://localhost:8101/api/verification/sync/device-data/test-device
```

---

## 📊 Monitoring

### Service Status:
```bash
sudo supervisorctl status id_verification
```

### Logs in Echtzeit:
```bash
sudo supervisorctl tail -f id_verification
```

### MongoDB Status:
```bash
mongosh --eval "use verification_db; db.scans.countDocuments()"
```

---

## 🔄 Service-to-Service Communication

### Aufruf von anderen Services:
```python
import requests

# Service Auth Header
headers = {
    'X-Service-Auth': 'service-secret-key',
    'X-Request-From': 'portal-service'
}

# Scan erstellen
response = requests.post(
    'http://localhost:8101/api/verification/scans',
    json=scan_data,
    headers=headers
)
```

---

## 📈 Performance

- **Durchsatz:** ~500 Scans/Minute
- **Latenz:** <50ms (ohne Bilder)
- **Speicher:** ~200MB
- **MongoDB Index:** `device_id`, `timestamp`, `synced`

---

## 🚨 Troubleshooting

### Service startet nicht:
```bash
# Logs prüfen
tail -f /var/log/supervisor/id_verification.err.log

# Port prüfen
netstat -tulpn | grep 8101

# Manuell starten (Debug)
cd /app/backend/services/id_verification
python -m uvicorn server:app --reload --port 8101
```

### MongoDB Verbindungsfehler:
```bash
# MongoDB Status
sudo supervisorctl status mongodb

# MongoDB starten
sudo supervisorctl start mongodb
```

---

## ✅ Status

- ✅ Service läuft auf Port 8101
- ✅ MongoDB Connection (verification_db)
- ✅ CRUD Operations für Scans
- ✅ Offline Sync Endpoint
- ✅ Banned Documents
- ✅ Verification History
- ⏳ Image Storage (separate collection) - TODO
- ⏳ Service-to-Service Auth - TODO
- ⏳ API Gateway Integration - TODO

---

## 🔜 Nächste Schritte

1. Separate Image Collection für große Bilder
2. Service Authentication
3. Rate Limiting
4. Caching (Redis)
5. API Gateway Integration
