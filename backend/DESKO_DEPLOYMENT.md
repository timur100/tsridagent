# Desko Scanner Hardware Integration - Deployment Guide

## ✅ Status

Die Desko SDK DLLs sind vorhanden und das System ist bereit für Hardware-Integration:

```
/app/backend/desko_sdk/
├── desko_usb.dll          (302 KB)
├── DSB.dll                (1.6 MB)
├── pagescanapi.dll        (48 MB) <- Haupt-API
├── pagescanapi.properties (1.6 KB)
└── ReaderDesko.dll        (2.3 MB)
```

## 🚀 Deployment-Optionen

### Option 1: Windows Native Deployment (EMPFOHLEN)

**Vorteile:**
- Direkte Hardware-Anbindung
- Beste Performance
- Volle SDK-Unterstützung

**Schritte:**
1. Windows Server vorbereiten (Windows 10/11 oder Server 2019+)
2. Desko Treiber installieren
3. Scanner per USB anschließen
4. Python 3.9+ installieren
5. Application deployen:
   ```powershell
   git clone <repo>
   cd backend
   pip install -r requirements.txt
   python server.py
   ```
6. System erkennt DLLs automatisch unter `./desko_sdk/`
7. Connect im Scanner-Tab → Hardware-Modus aktiviert

**Voraussetzungen:**
- Windows OS
- USB 3.0 Port
- Desko Treiber
- Admin-Rechte für USB-Zugriff

---

### Option 2: Docker mit USB-Passthrough

**Für Linux-Host mit USB-Scanner:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    image: your-app:latest
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    volumes:
      - ./desko_sdk:/app/backend/desko_sdk:ro
    environment:
      - DESKO_SDK_PATH=/app/backend/desko_sdk
```

**Limitation:**
- Windows DLLs benötigen Wine
- USB-Passthrough kann instabil sein
- Nicht production-ready

---

### Option 3: Scanner-Service (Hybrid-Ansatz)

**Architektur:**
```
[Linux/Docker App] <--HTTP--> [Windows Scanner-Service]
                                        |
                                  [Desko Scanner]
```

**Windows Scanner-Service:**
```python
# scanner_service.py (auf Windows)
from flask import Flask, jsonify
from desko_integration import get_scanner

app = Flask(__name__)
scanner = get_scanner()

@app.route('/connect', methods=['POST'])
def connect():
    result = scanner.connect()
    return jsonify(result)

@app.route('/scan', methods=['POST'])
def scan():
    result = scanner.scan()
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8888)
```

**Main App anpassen:**
```python
# In scanner.py - Remote Scanner Mode
SCANNER_SERVICE_URL = os.getenv('SCANNER_SERVICE_URL')
if SCANNER_SERVICE_URL:
    response = requests.post(f"{SCANNER_SERVICE_URL}/connect")
```

---

## 🔧 Technische Details

### DLL-Funktionen (Desko Page Scan API)

Erwartete Funktionen basierend auf Desko SDK:
```c
int PageScan_Init(void);
int PageScan_Connect(void);
int PageScan_Disconnect(void);
int PageScan_Scan(char* outputPath);
int PageScan_GetFirmwareVersion(char* buffer, int size);
int PageScan_GetStatus(void);
int PageScan_SetResolution(int dpi);
int PageScan_SetBrightness(int level);
```

### Return Codes

```
0 = Success
-1 = General Error
-2 = Device Not Found
-3 = Communication Error
-4 = Timeout
```

---

## 🧪 Testing

### Test in Simulation Mode (Current):
```bash
cd /app/backend
python3 desko_integration.py
```

### Test in Hardware Mode (Windows):
1. Starte Backend auf Windows
2. Admin Panel → Scanner Tab
3. Scanner konfigurieren (Desko)
4. "Verbinden" klicken
5. Status zeigt "Hardware Mode"
6. "Schnelltest" ausführen

---

## 📊 Status-Monitoring

**Logs überprüfen:**
```bash
# Backend logs
tail -f /var/log/supervisor/backend.*.log | grep -i desko

# Scanner-spezifische Logs (Windows)
tail -f %APPDATA%\Desko GMBH\PageScanApi\PageScanAPI.log
```

**API-Status:**
```bash
curl http://localhost:8001/api/scanner/status | jq .
```

**Expected Response (Hardware Mode):**
```json
{
  "success": true,
  "connected": true,
  "scanner_type": "desko",
  "scanner_info": {...},
  "firmware_version": "v2.4.1",
  "driver_version": "v5.2.3",
  "configuration": {...},
  "hardware_mode": true
}
```

---

## ⚠️ Troubleshooting

### Problem: DLL not found
**Solution:**
- Prüfe Pfad: `/app/backend/desko_sdk/pagescanapi.dll`
- DLLs müssen zusammen liegen (Dependencies)

### Problem: "Verbindung fehlgeschlagen"
**Check:**
1. USB-Kabel angeschlossen?
2. Desko Treiber installiert?
3. Windows Geräte-Manager → Scanner sichtbar?
4. Andere Software nutzt Scanner?

### Problem: "Function not available"
**Solution:**
- DLL-Version prüfen
- Eventuell andere Funktionsnamen
- Mit `dumpbin /EXPORTS pagescanapi.dll` prüfen

### Problem: Simulation Mode auf Windows
**Check:**
1. `desko_sdk` Ordner vorhanden?
2. PATH enthält DLL-Verzeichnis?
3. Admin-Rechte für DLL-Load?

---

## 🎯 Empfohlene Deployment-Strategie

**Für Production:**

1. **Windows VM/Container:**
   - Azure Windows Container Instance
   - AWS Windows EC2
   - Eigener Windows Server

2. **Hybrid Setup:**
   - Main App: Linux Docker (gut skalierbar)
   - Scanner Service: Windows VM (dedicated)
   - Kommunikation via REST API

3. **Monitoring:**
   - Health-Check Endpoint
   - Scanner-Status-Dashboard
   - Alert bei Verbindungsabbruch

---

## 📞 Support

Bei Fragen zur Desko API:
- Desko Support: support@desko.com
- SDK Dokumentation: https://www.desko.com/en/support/

Bei Integration-Fragen:
- Siehe Code-Kommentare in `desko_integration.py`
- Backend logs prüfen
- Scanner-Event-Log in Admin Panel
