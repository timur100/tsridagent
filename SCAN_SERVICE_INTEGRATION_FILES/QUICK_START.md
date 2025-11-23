# 🚀 Quick Start Guide - Scan-Service Integration

## ✅ Was wurde bereits implementiert?

### Im ID-Check Service (dieses Projekt):
1. ✅ **API Key Middleware** - `/app/backend/middleware/api_key_auth.py`
2. ✅ **Webhook Empfänger** - `/app/backend/routes/webhooks.py`
   - `POST /api/webhooks/scan-completed` 
   - `POST /api/webhooks/scan-completed/upload-images`
   - `GET /api/webhooks/health`
3. ✅ **API Key generiert** - `G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg`
4. ✅ **.env File aktualisiert** - `WEBHOOK_API_KEY` hinzugefügt
5. ✅ **Server Integration** - Webhook Router in `server.py` registriert
6. ✅ **Dependencies installiert** - `aiofiles` hinzugefügt

### Status: ID-Check Service ist BEREIT ✅

---

## 📦 Was müssen Sie im scan-verify-hub tun?

### Schritt-für-Schritt Anleitung:

### 1️⃣ VSCode für scan-verify-hub öffnen
Öffnen Sie: https://scan-sync-1.preview.emergentagent.com/?folder=/app

### 2️⃣ Dateien kopieren

Kopieren Sie folgende Dateien aus dem aktuellen Projekt in scan-verify-hub:

**A) Services erstellen:**
```bash
# Im scan-verify-hub Terminal:
mkdir -p /app/backend/services
mkdir -p /app/backend/workers
```

**B) Dateien kopieren:**

Von diesem Projekt → scan-verify-hub:

| Quelle (ID-Check) | Ziel (scan-verify-hub) |
|-------------------|------------------------|
| `/app/SCAN_SERVICE_INTEGRATION_FILES/sqlite_queue.py` | `/app/backend/services/sqlite_queue.py` |
| `/app/SCAN_SERVICE_INTEGRATION_FILES/webhook_sender.py` | `/app/backend/services/webhook_sender.py` |
| `/app/SCAN_SERVICE_INTEGRATION_FILES/retry_worker.py` | `/app/backend/workers/retry_worker.py` |
| `/app/SCAN_SERVICE_INTEGRATION_FILES/test_webhook_integration.py` | `/app/backend/test_webhook_integration.py` |

**C) .env File updaten:**

Fügen Sie diese Zeilen zur `/app/backend/.env` im scan-verify-hub hinzu:
```env
# Webhook Integration
WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
ID_CHECK_WEBHOOK_URL=https://scan-sync-1.preview.emergentagent.com/api/webhooks/scan-completed
ID_CHECK_IMAGE_UPLOAD_URL=https://scan-sync-1.preview.emergentagent.com/api/webhooks/scan-completed/upload-images
```

**D) Dependencies installieren:**
```bash
cd /app/backend
pip install aiohttp aiofiles aiosqlite
pip freeze > requirements.txt
```

### 3️⃣ Integration in Scan-Code

Finden Sie im scan-verify-hub den Code, der nach einem Scan ausgeführt wird.

**Fügen Sie folgendes hinzu:**

```python
# Am Anfang der Datei:
import asyncio
from services.sqlite_queue import ScanQueueService
from services.webhook_sender import WebhookSender

# In Ihrer Scan-Completion-Funktion:
@router.post("/scan/complete")  # oder wie auch immer Ihr Endpunkt heißt
async def complete_scan(scan_data: dict):
    # ... Ihr bestehender Scan-Code ...
    
    # NEUER CODE: Webhook Integration
    try:
        queue_service = ScanQueueService()
        webhook_sender = WebhookSender()
        
        # Daten formatieren
        webhook_data = {
            "tenant_id": scan_data.get("tenant_id", "unknown"),
            "tenant_name": scan_data.get("tenant_name", "Unknown Tenant"),
            "location_id": scan_data.get("location_id"),
            "location_name": scan_data.get("location_name"),
            "device_id": scan_data.get("device_id"),
            "device_name": scan_data.get("device_name"),
            "scanner_id": "SCANNER-01",  # Ihre Scanner ID
            "scanner_name": "Scanner Main",  # Ihr Scanner Name
            "scan_timestamp": scan_data.get("timestamp"),
            "document_type": scan_data.get("document_type"),
            "extracted_data": scan_data.get("extracted_data"),
            "verification": scan_data.get("verification")
        }
        
        # Bilder formatieren (wenn vorhanden)
        images = []
        if scan_data.get("images"):
            for img in scan_data["images"]:
                images.append({
                    "type": img.get("type"),  # z.B. "front_original"
                    "file_path": img.get("path")  # Voller Dateipfad
                })
        
        # In Queue speichern
        queue_id = await queue_service.add_to_queue(webhook_data, images)
        
        # Webhook senden (async, blockiert nicht)
        asyncio.create_task(webhook_sender.send_scan_webhook(queue_id))
        
        print(f"✅ [Scan] Webhook queued: {queue_id}")
        
    except Exception as e:
        print(f"⚠️  [Scan] Webhook error (non-critical): {str(e)}")
        # Fehler nicht weiterwerfen - Scan war erfolgreich
    
    return {"success": True, "scan_id": scan_data["id"]}
```

### 4️⃣ Retry Worker starten

**Option A: In server.py** (Empfohlen)

```python
# In /app/backend/server.py
from workers.retry_worker import RetryWorker
import asyncio

@app.on_event("startup")
async def startup_event():
    # Starte Retry Worker
    retry_worker = RetryWorker()
    asyncio.create_task(retry_worker.start())
    print("🚀 Retry Worker started")
```

**Option B: Als separater Service** (Alternative)

In `/etc/supervisor/conf.d/programs.conf` hinzufügen:
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
```

### 5️⃣ Services neustarten

```bash
sudo supervisorctl restart all
```

### 6️⃣ Testen

```bash
# Im scan-verify-hub Backend:
python test_webhook_integration.py
```

---

## 🧪 Manuelle Tests

### Test 1: Health Check
```bash
curl https://scan-sync-1.preview.emergentagent.com/api/webhooks/health
```
Erwartete Antwort:
```json
{"success": true, "service": "Webhook Service", "status": "operational"}
```

### Test 2: Queue Status
```bash
# Im scan-verify-hub:
sqlite3 /app/backend/scan_queue.db "SELECT id, webhook_status, retry_count FROM scan_queue ORDER BY created_at DESC LIMIT 5;"
```

### Test 3: Logs überprüfen
```bash
# Backend Logs
tail -f /var/log/supervisor/backend.*.log | grep -E "(Webhook|SQLite)"

# Retry Worker Logs (falls als Service)
tail -f /var/log/supervisor/webhook_retry_worker.*.log
```

---

## 🎯 Erwartetes Verhalten

1. **Scan durchführen** in scan-verify-hub
2. **Sofortige Speicherung** in SQLite Queue (Status: `pending`)
3. **Automatischer Webhook-Versand** an ID-Check Service
4. **Status-Update** auf `sent` bei Erfolg
5. **Erscheinen** im ID-Checks Admin Dashboard
6. **Bei Fehler:** Automatische Wiederholung mit Backoff (1min, 5min, 15min, 30min, 60min)

---

## 📊 Monitoring

### Queue Statistiken überprüfen
```python
from services.sqlite_queue import ScanQueueService
queue = ScanQueueService()
stats = await queue.get_queue_stats()
print(stats)
# {'total': 10, 'pending': 2, 'sent': 7, 'failed': 1, 'abandoned': 0}
```

### Backend Logs
```bash
tail -f /var/log/supervisor/backend.*.log | grep "Webhook"
```

---

## 🐛 Troubleshooting

### Problem: "Invalid API key"
**Lösung:** Beide .env Files müssen denselben API Key haben:
- ✅ ID-Check: `WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg`
- ✅ scan-verify-hub: `WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg`

### Problem: Webhooks werden nicht gesendet
**Lösung:**
1. Queue prüfen: `sqlite3 /app/backend/scan_queue.db "SELECT * FROM scan_queue;"`
2. Logs prüfen: `tail -f /var/log/supervisor/backend.*.log`
3. Health Check: `curl https://scan-sync-1.preview.emergentagent.com/api/webhooks/health`

### Problem: Retry Worker läuft nicht
**Lösung:**
```bash
sudo supervisorctl status
sudo supervisorctl tail -f backend
# Oder wenn als separater Service:
sudo supervisorctl status webhook_retry_worker
```

---

## 📞 Nächste Schritte

1. ✅ Dateien in scan-verify-hub kopieren
2. ✅ .env File updaten
3. ✅ Dependencies installieren  
4. ✅ Scan-Code integrieren
5. ✅ Retry Worker starten
6. ✅ Testen
7. ✅ Ersten echten Scan durchführen und im ID-Check Dashboard überprüfen!

Bei Fragen oder Problemen: Logs überprüfen und Test-Script ausführen!
