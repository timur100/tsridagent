# 🚀 Desko Scanner Windows Service - Setup Anleitung

## Schnellstart

### 1. Dateien auf Ihren Windows PC kopieren

Kopieren Sie diese Dateien von `/app/backend/` auf Ihren Windows PC:

```
C:\Desko\
├── scanner_service.py
├── desko_integration.py
├── start_scanner_service.bat
└── desko_sdk\
    ├── pagescanapi.dll
    ├── desko_usb.dll
    ├── DSB.dll
    ├── ReaderDesko.dll
    └── pagescanapi.properties
```

### 2. Scanner Service starten

**Option A: Doppelklick auf Batch-Datei**
```
Doppelklick auf: start_scanner_service.bat
```

**Option B: Manuell mit Command Prompt**
```cmd
cd C:\Desko
pip install flask flask-cors
python scanner_service.py
```

### 3. Service-URL notieren

Der Service startet auf:
```
http://192.168.X.X:8888  (Ihre lokale IP)
```

### 4. Docker App konfigurieren

Fügen Sie die Umgebungsvariable zur Backend .env hinzu:

```bash
# In /app/backend/.env
SCANNER_SERVICE_URL=http://192.168.X.X:8888
```

Ersetzen Sie `192.168.X.X` mit Ihrer tatsächlichen Windows PC IP-Adresse.

### 5. Backend neu starten

```bash
sudo supervisorctl restart backend
```

### 6. Scanner verbinden

1. Admin Panel öffnen (PIN: 1234)
2. Scanner Tab
3. Scanner konfigurieren (Desko)
4. "Verbinden" klicken
5. Status zeigt: "Scanner verbunden (Hardware Mode) (Remote Service)"

---

## 🔍 Troubleshooting

### Service startet nicht

**Problem:** Python nicht gefunden
```
Lösung: Python 3.9+ installieren von python.org
         Bei Installation "Add Python to PATH" aktivieren
```

**Problem:** Flask nicht installiert
```cmd
pip install flask flask-cors
```

**Problem:** Port 8888 bereits belegt
```cmd
# In scanner_service.py ändern:
app.run(host='0.0.0.0', port=9999)  # Anderen Port verwenden
```

### Scanner wird nicht erkannt

**Prüfen Sie:**
1. ✅ Desko Treiber installiert?
2. ✅ Scanner per USB angeschlossen?
3. ✅ Scanner eingeschaltet?
4. ✅ Windows Geräte-Manager → Scanner sichtbar?

**Test:**
```cmd
python desko_integration.py
```

Erwartete Ausgabe:
```
✅ Found DLL: C:\Desko\desko_sdk\pagescanapi.dll
✅ Desko SDK loaded successfully!
✅ PageScan_Init found
✅ PageScan_Connect found
...
```

### Docker App kann nicht verbinden

**Problem:** Connection refused
```
Lösung: 
1. Windows Firewall → Port 8888 freigeben
2. Oder: Firewall temporär deaktivieren zum Testen
```

**Firewall-Regel erstellen:**
```powershell
# Als Administrator ausführen
netsh advfirewall firewall add rule name="Desko Scanner Service" dir=in action=allow protocol=TCP localport=8888
```

**Problem:** Falsche IP-Adresse
```cmd
# Ihre Windows IP herausfinden:
ipconfig

# Suchen Sie nach "IPv4-Adresse"
# Beispiel: 192.168.1.100
```

### Verbindung funktioniert, aber Scanner antwortet nicht

**Prüfen Sie Logs:**

Windows Scanner Service Konsole:
```
🔌 Attempting to connect...
   Result: {'success': True, 'message': 'Scanner verbunden (Hardware Mode)', ...}
```

Docker Backend Logs:
```bash
tail -f /var/log/supervisor/backend.err.log | grep -i scanner
```

---

## 📊 Service-Status prüfen

### Health Check
```bash
curl http://192.168.X.X:8888/health
```

Erwartete Antwort:
```json
{
  "success": true,
  "service": "Desko Scanner Service",
  "version": "1.0.0",
  "scanner_status": {
    "connected": false,
    "hardware_available": true,
    "simulation_mode": false,
    ...
  }
}
```

### Von Docker App testen
```bash
# Im Docker Container
curl http://192.168.X.X:8888/health
```

---

## 🔧 Erweiterte Konfiguration

### Service als Windows-Dienst einrichten

Für Production: Service sollte automatisch beim Systemstart starten

**Mit NSSM (Non-Sucking Service Manager):**

1. NSSM herunterladen: https://nssm.cc/download
2. Als Administrator ausführen:
```cmd
nssm install DeskoScannerService "C:\Python39\python.exe" "C:\Desko\scanner_service.py"
nssm start DeskoScannerService
```

### Logging aktivieren

Scanner Service Logs:
```
Windows: %APPDATA%\Desko GMBH\PageScanApi\PageScanAPI.log
```

Flask Service Logs:
```python
# In scanner_service.py ändern:
app.run(host='0.0.0.0', port=8888, debug=True)
```

---

## 📝 API-Endpunkte

Der Scanner Service bietet folgende Endpunkte:

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Service-Status |
| `/status` | GET | Scanner-Status |
| `/connect` | POST | Scanner verbinden |
| `/disconnect` | POST | Scanner trennen |
| `/scan` | POST | Scan durchführen |
| `/test` | POST | Scanner testen |
| `/firmware` | GET | Firmware-Version |

---

## ✅ Erfolgreiche Verbindung

Wenn alles funktioniert, sehen Sie im Admin Panel:

```
Scanner-Status
├─ Desko Pentascanner
├─ Firmware: v2.4.1
├─ Treiber: v5.2.3
├─ Status: Verbunden (Hardware Mode) (Remote Service)
└─ [Schnelltest] [Vollständiger Test] Buttons aktiv
```

---

## 💡 Tipps

1. **Service im Hintergrund laufen lassen**
   - Minimieren Sie das Console-Fenster
   - Oder: Als Windows-Dienst installieren (siehe oben)

2. **Automatischer Start**
   - Verknüpfung zu `start_scanner_service.bat` in Windows Autostart-Ordner legen
   - `Win + R` → `shell:startup` → Verknüpfung hierher kopieren

3. **Netzwerk-Sicherheit**
   - Service läuft nur im lokalen Netzwerk
   - Für Internet-Zugriff: VPN oder SSH-Tunnel verwenden

4. **Performance**
   - Service ist leichtgewichtig (~20 MB RAM)
   - Keine spürbare CPU-Last im Idle

---

## 📞 Support

Bei Problemen:
1. Scanner Service Console-Ausgabe prüfen
2. Docker Backend Logs prüfen
3. Windows Event Viewer → Application Logs
4. Desko Support kontaktieren für SDK-spezifische Fragen
