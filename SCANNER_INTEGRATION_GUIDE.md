# 🔌 Scanner zu ID-Checks Integration - Anleitung

## ✅ Was wurde vorbereitet?

Die komplette Webhook-Kommunikation zwischen dem Scanner-Service (scan-verify-hub) und dem ID-Check Service ist **fertig vorbereitet** und bereit zur Integration!

---

## 🎯 Übersicht: Wie funktioniert die Integration?

```
Scanner-Service (scan-verify-hub)
         ↓
  [Scan durchgeführt]
         ↓
 [SQLite Offline-Queue] ← Daten werden sofort gespeichert
         ↓
   [Webhook Sender] ← Sendet automatisch an ID-Check Service
         ↓
ID-Check Service (dieses Projekt)
         ↓
  [Webhook Empfänger]
         ↓
  [MongoDB Speicherung]
         ↓
[ID-Checks Admin Dashboard] ← Scan erscheint automatisch!
```

---

## 📦 Bereitgestellte Dateien

Alle Integrationsdateien befinden sich in: `/app/SCAN_SERVICE_INTEGRATION_FILES/`

### Für scan-verify-hub benötigt:

1. **`sqlite_queue.py`** - Offline-First Queue Service
   - Speichert alle Scans lokal in SQLite
   - Status-Tracking (pending → sent/failed)
   - Ausfallsicher

2. **`webhook_sender.py`** - Webhook Kommunikation
   - Sendet Scans an ID-Check Service
   - API Key Authentifizierung
   - Automatische Wiederholung bei Fehlern

3. **`retry_worker.py`** - Background Worker
   - Läuft im Hintergrund
   - Versucht fehlgeschlagene Scans erneut (1min, 5min, 15min, 30min, 60min)
   - Exponentieller Backoff

4. **`test_webhook_integration.py`** - Test-Script
   - Vollständiger Integrationstest
   - Überprüft alle Komponenten

5. **Dokumentation:**
   - `README.md` - Vollständige technische Doku
   - `QUICK_START.md` - Schritt-für-Schritt Anleitung
   - `scan_service_env_template.txt` - .env Vorlage
   - `requirements_additions.txt` - Python Dependencies

---

## 🚀 Test der Integration JETZT

### Option 1: Simulierten Scan erstellen (Empfohlen für Testing)

```bash
# Erstellt einen Test-Scan direkt in der ID-Checks Tabelle
curl -X POST https://asset-id-formatter.preview.emergentagent.com/api/test/simulate-scan
```

**Ergebnis:**
```json
{
  "success": true,
  "scan_id": "08f71876-2ba7-4bdc-8863-7d53c4ae57cd",
  "view_url": "/portal/admin/id-checks/08f71876-2ba7-4bdc-8863-7d53c4ae57cd"
}
```

### Option 2: Webhook-Service Status überprüfen

```bash
# Überprüft ob der Webhook-Empfänger läuft
curl https://asset-id-formatter.preview.emergentagent.com/api/webhooks/health
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "service": "Webhook Service",
  "status": "operational"
}
```

---

## 📋 Integration in scan-verify-hub (3 Schritte)

### Schritt 1: Dateien kopieren

Öffnen Sie scan-verify-hub in VSCode:
https://asset-id-formatter.preview.emergentagent.com/?folder=/app

Kopieren Sie diese Dateien in scan-verify-hub:

```bash
# Im scan-verify-hub Terminal:
mkdir -p /app/backend/services
mkdir -p /app/backend/workers
```

**Dateien kopieren:**
- `SCAN_SERVICE_INTEGRATION_FILES/sqlite_queue.py` → `/app/backend/services/`
- `SCAN_SERVICE_INTEGRATION_FILES/webhook_sender.py` → `/app/backend/services/`
- `SCAN_SERVICE_INTEGRATION_FILES/retry_worker.py` → `/app/backend/workers/`
- `SCAN_SERVICE_INTEGRATION_FILES/test_webhook_integration.py` → `/app/backend/`

### Schritt 2: Umgebungsvariablen setzen

Fügen Sie zur `/app/backend/.env` im scan-verify-hub hinzu:

```env
# Webhook Integration
WEBHOOK_API_KEY=G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
ID_CHECK_WEBHOOK_URL=https://asset-id-formatter.preview.emergentagent.com/api/webhooks/scan-completed
ID_CHECK_IMAGE_UPLOAD_URL=https://asset-id-formatter.preview.emergentagent.com/api/webhooks/scan-completed/upload-images
```

### Schritt 3: Dependencies installieren

```bash
cd /app/backend
pip install aiohttp aiofiles aiosqlite
pip freeze > requirements.txt
```

---

## 🔧 Code-Integration im Scanner

### Im Scan-Completion-Code:

```python
# Am Anfang der Datei
import asyncio
from services.sqlite_queue import ScanQueueService
from services.webhook_sender import WebhookSender

# Nach erfolgreichem Scan:
@router.post("/scan/complete")
async def complete_scan(scan_data: dict):
    # ... Ihr bestehender Scan-Code ...
    
    # NEUE INTEGRATION: Webhook-Kommunikation
    try:
        queue_service = ScanQueueService()
        webhook_sender = WebhookSender()
        
        # Daten für ID-Check formatieren
        webhook_data = {
            "tenant_id": scan_data.get("tenant_id", "unknown"),
            "tenant_name": scan_data.get("tenant_name", "Unknown"),
            "location_id": scan_data.get("location_id"),
            "location_name": scan_data.get("location_name"),
            "device_id": scan_data.get("device_id"),
            "device_name": scan_data.get("device_name"),
            "scanner_id": scan_data.get("scanner_id", "SCANNER-01"),
            "scanner_name": scan_data.get("scanner_name", "Main Scanner"),
            "scan_timestamp": scan_data.get("timestamp"),
            "document_type": scan_data.get("document_type"),
            "extracted_data": scan_data.get("extracted_data"),
            "verification": scan_data.get("verification"),
            "ip_address": scan_data.get("ip_address")
        }
        
        # Bilder formatieren
        images = []
        if scan_data.get("images"):
            for img in scan_data["images"]:
                images.append({
                    "type": img.get("type"),  # z.B. "front_original"
                    "file_path": img.get("path")
                })
        
        # In SQLite Queue speichern
        queue_id = await queue_service.add_to_queue(webhook_data, images)
        
        # Webhook asynchron senden (blockiert nicht!)
        asyncio.create_task(webhook_sender.send_scan_webhook(queue_id))
        
        print(f"✅ [Scan] Webhook queued: {queue_id}")
        
    except Exception as e:
        print(f"⚠️  [Scan] Webhook error (non-critical): {str(e)}")
        # Fehler nicht weiterwerfen - Scan war erfolgreich!
    
    return {"success": True, "scan_id": scan_data["id"]}
```

---

## 🔄 Retry Worker starten

### Option A: In server.py (Empfohlen)

```python
# In /app/backend/server.py im scan-verify-hub
from workers.retry_worker import RetryWorker
import asyncio

@app.on_event("startup")
async def startup_event():
    retry_worker = RetryWorker()
    asyncio.create_task(retry_worker.start())
    print("🚀 Webhook Retry Worker started")
```

### Option B: Als separater Service (Alternative)

```ini
# In /etc/supervisor/conf.d/programs.conf hinzufügen:
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

---

## 🧪 Testing nach Integration

### Test 1: Test-Script ausführen

```bash
# Im scan-verify-hub Backend
python test_webhook_integration.py
```

### Test 2: Ersten echten Scan durchführen

1. Scanner-App öffnen
2. Scan durchführen
3. Überprüfen:
   - Console-Logs: `[Scan] Webhook queued: <queue_id>`
   - SQLite: `sqlite3 /app/backend/scan_queue.db "SELECT * FROM scan_queue;"`
   - ID-Checks Dashboard: Scan sollte erscheinen!

### Test 3: Webhook-Status überprüfen

```bash
curl https://asset-id-formatter.preview.emergentagent.com/api/webhooks/health
```

---

## 📊 Monitoring

### Queue-Status überprüfen

```bash
sqlite3 /app/backend/scan_queue.db "SELECT webhook_status, COUNT(*) FROM scan_queue GROUP BY webhook_status;"
```

### Backend-Logs

```bash
# scan-verify-hub
tail -f /var/log/supervisor/backend.*.log | grep "Webhook"

# ID-Check Service
tail -f /var/log/supervisor/backend.*.log | grep "Webhook"
```

---

## ✅ Erwartetes Verhalten

1. **Scan durchgeführt** → Daten sofort in SQLite gespeichert
2. **Webhook gesendet** → Automatisch an ID-Check Service
3. **Scan erscheint** → Im ID-Checks Admin Dashboard
4. **Bei Fehler** → Automatische Wiederholung (bis zu 5x)

---

## 🎯 Quick Test JETZT

Erstellen Sie einen Test-Scan im ID-Check Service:

```bash
curl -X POST https://asset-id-formatter.preview.emergentagent.com/api/test/simulate-scan
```

Dann öffnen Sie das Admin-Portal:
```
https://asset-id-formatter.preview.emergentagent.com/portal/admin/id-checks
```

Der Scan sollte dort erscheinen! ✅

---

## 📞 Nächste Schritte

1. ✅ Test-Scan erstellen (siehe oben)
2. ✅ Im Admin-Portal überprüfen
3. 📋 Dateien in scan-verify-hub kopieren
4. 🔧 Code-Integration im Scanner
5. 🧪 Ersten echten Scan durchführen
6. 🎉 Fertig!

Bei Fragen: Siehe `/app/SCAN_SERVICE_INTEGRATION_FILES/README.md`
