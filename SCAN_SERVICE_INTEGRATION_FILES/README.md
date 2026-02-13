# 🔗 Scan-Verify-Hub zu ID-Check Integration

Diese Integration verbindet den Scanner-Service (scan-verify-hub) mit dem ID-Check Service für automatische Datenübertragung nach jedem Scan.

## 📋 Architektur-Übersicht

```
Scan-Verify-Hub (Scanner)
    ↓
[SQLite Offline-Queue] → [Webhook Sender] → [Retry Worker]
                              ↓
                      [API Key Auth]
                              ↓
                  ID-Check Service (dieses Projekt)
                [Webhook Receiver: /api/webhooks/scan-completed]
                              ↓
                      [MongoDB Storage]
                              ↓
                  [ID-Checks Admin Dashboard]
```

## 🚀 Installation

### Schritt 1: Dateien in scan-verify-hub kopieren

Kopieren Sie folgende Dateien in Ihr **scan-verify-hub** Projekt:

```
scan-verify-hub/
├── backend/
│   ├── .env (UPDATE mit WEBHOOK_API_KEY)
│   ├── requirements.txt (UPDATE mit neuen Dependencies)
│   ├── services/
│   │   ├── sqlite_queue.py (NEU)
│   │   └── webhook_sender.py (NEU)
│   ├── workers/
│   │   └── retry_worker.py (NEU)
│   └── routes/
│       └── YOUR_SCAN_ROUTE.py (UPDATE - siehe Integration)
```

### Schritt 2: .env Datei in scan-verify-hub updaten

Fügen Sie folgende Zeilen zur `backend/.env` hinzu:

```env
# Webhook Integration zu ID-Check Service
WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
ID_CHECK_WEBHOOK_URL=https://asset-mgmt-v2.preview.emergentagent.com/api/webhooks/scan-completed
ID_CHECK_IMAGE_UPLOAD_URL=https://asset-mgmt-v2.preview.emergentagent.com/api/webhooks/scan-completed/upload-images
```

### Schritt 3: Dependencies installieren

In Ihrem **scan-verify-hub** Backend:

```bash
cd backend
pip install aiohttp aiofiles aiosqlite
pip freeze > requirements.txt
```

### Schritt 4: SQLite Datenbank initialisieren

Die SQLite-Datenbank wird automatisch beim ersten Start erstellt unter:
```
/app/backend/scan_queue.db
```

### Schritt 5: Integration in Scan-Endpoint

Fügen Sie in Ihrer Scan-Route folgendes hinzu:

```python
from services.sqlite_queue import ScanQueueService
from services.webhook_sender import WebhookSender

# In Ihrem Scan-Endpoint (z.B. nach erfolgreichem Scan)
@router.post("/scan/complete")
async def complete_scan(scan_data: dict):
    # ... Ihr bestehender Scan-Code ...
    
    # Nach erfolgreichem Scan: In Queue speichern und Webhook senden
    queue_service = ScanQueueService()
    webhook_sender = WebhookSender()
    
    # Scandaten formatieren
    webhook_data = {
        "tenant_id": scan_data["tenant_id"],
        "tenant_name": scan_data["tenant_name"],
        "location_id": scan_data.get("location_id"),
        "location_name": scan_data.get("location_name"),
        "device_id": scan_data.get("device_id"),
        "device_name": scan_data.get("device_name"),
        "scanner_id": scan_data.get("scanner_id", "SCANNER-01"),
        "scanner_name": scan_data.get("scanner_name", "Scanner Main"),
        "scan_timestamp": scan_data["timestamp"],
        "document_type": scan_data.get("document_type"),
        "extracted_data": scan_data.get("extracted_data"),
        "verification": scan_data.get("verification"),
        "images": scan_data.get("images", [])  # Array mit {type, file_path}
    }
    
    # In SQLite Queue speichern
    queue_id = await queue_service.add_to_queue(webhook_data)
    
    # Sofort Webhook senden (async, blockiert nicht)
    asyncio.create_task(webhook_sender.send_scan_webhook(queue_id))
    
    return {"success": True, "scan_id": scan_data["id"]}
```

### Schritt 6: Retry Worker starten

Der Retry Worker läuft im Hintergrund und verarbeitet fehlgeschlagene Webhooks:

**Option A: Als Background Task in FastAPI**

In `server.py`:

```python
from workers.retry_worker import RetryWorker
import asyncio

@app.on_event("startup")
async def startup_event():
    # Starte Retry Worker im Hintergrund
    retry_worker = RetryWorker()
    asyncio.create_task(retry_worker.start())
```

**Option B: Als separater Prozess via Supervisor**

Fügen Sie zu `/etc/supervisor/conf.d/programs.conf` hinzu:

```ini
[program:webhook_retry_worker]
command=python -m workers.retry_worker
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/webhook_retry_worker.err.log
stdout_logfile=/var/log/supervisor/webhook_retry_worker.out.log
```

Dann:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start webhook_retry_worker
```

## 🔍 Testing

### Test 1: Webhook Receiver Health Check

```bash
curl -X GET https://asset-mgmt-v2.preview.emergentagent.com/api/webhooks/health
```

Erwartete Antwort:
```json
{
  "success": true,
  "service": "Webhook Service",
  "status": "operational"
}
```

### Test 2: Manueller Webhook Test

Im **scan-verify-hub** Backend:

```bash
python test_webhook_integration.py
```

(Test-Script siehe `test_webhook_integration.py`)

### Test 3: SQLite Queue überprüfen

```bash
sqlite3 /app/backend/scan_queue.db "SELECT * FROM scan_queue ORDER BY created_at DESC LIMIT 5;"
```

## 📊 Monitoring

### Queue Status überprüfen

```python
from services.sqlite_queue import ScanQueueService

queue = ScanQueueService()
stats = await queue.get_queue_stats()
print(f"Pending: {stats['pending']}")
print(f"Sent: {stats['sent']}")
print(f"Failed: {stats['failed']}")
```

### Logs überprüfen

```bash
# Backend Logs
tail -f /var/log/supervisor/backend.*.log | grep "Webhook"

# Retry Worker Logs
tail -f /var/log/supervisor/webhook_retry_worker.*.log
```

## 🔧 Troubleshooting

### Problem: "Invalid API key"

**Lösung:** Überprüfen Sie, dass beide `.env` Files denselben `WEBHOOK_API_KEY` haben:
- scan-verify-hub: `/app/backend/.env`
- ID-Check: `/app/backend/.env`

### Problem: Webhooks werden nicht gesendet

**Lösung:** 
1. Überprüfen Sie die Queue: `sqlite3 /app/backend/scan_queue.db "SELECT * FROM scan_queue;"`
2. Prüfen Sie Backend Logs auf Fehler
3. Testen Sie die Netzwerkverbindung: `curl https://asset-mgmt-v2.preview.emergentagent.com/api/webhooks/health`

### Problem: Retry Worker läuft nicht

**Lösung:**
```bash
sudo supervisorctl status webhook_retry_worker
sudo supervisorctl tail -f webhook_retry_worker
```

## 📝 Status-Übersicht

| Status | Bedeutung |
|--------|-----------|
| `pending` | Scan in Queue, noch nicht gesendet |
| `sent` | Erfolgreich an ID-Check Service gesendet |
| `failed` | Fehler beim Senden (wird automatisch wiederholt) |
| `abandoned` | Nach 5 Versuchen aufgegeben |

## 🔄 Retry-Strategie

| Versuch | Wartezeit | Backoff |
|---------|-----------|---------|
| 1 | Sofort | - |
| 2 | 1 min | Exponentiell |
| 3 | 5 min | Exponentiell |
| 4 | 15 min | Exponentiell |
| 5 | 30 min | Exponentiell |
| 6 | 60 min | Final |

Nach 6 Versuchen: Status → `abandoned`

## 🎯 Vorteile dieser Lösung

✅ **Offline-First:** Scans werden sofort in SQLite gespeichert, auch wenn Netzwerk ausfällt
✅ **Ausfallsicher:** Automatische Wiederholung bei Fehlern
✅ **Nachvollziehbar:** Vollständige Historie in SQLite
✅ **Performance:** Fire-and-forget Pattern, blockiert Scanner nicht
✅ **Monitoring:** Einfache Überprüfung via SQLite Queries

## 📞 Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Logs
2. Testen Sie die Health-Endpoints
3. Prüfen Sie die SQLite Queue
