# MANUELLE INSTALLATION - Wenn Batch-Script fehlschlägt

## Problem: Paket-Installation fehlgeschlagen

### Lösung 1: Als Administrator ausführen

1. **Rechtsklick auf `start_scanner_service.bat`**
2. **"Als Administrator ausführen" wählen**
3. Script nochmal versuchen

### Lösung 2: Manuelle Installation

**Schritt 1: Command Prompt als Administrator öffnen**
```
Win + X → "Windows PowerShell (Admin)" oder "Eingabeaufforderung (Admin)"
```

**Schritt 2: Zu Ihrem Ordner navigieren**
```cmd
cd C:\Desko
```

**Schritt 3: Pip upgraden**
```cmd
python -m pip install --upgrade pip
```

**Schritt 4: Pakete installieren**
```cmd
pip install flask flask-cors
```

**Schritt 5: Service manuell starten**
```cmd
python scanner_service.py
```

### Lösung 3: Python Permissions Problem

Wenn Sie Fehler wie "Access denied" oder "Permission denied" sehen:

**Option A: Virtual Environment verwenden**
```cmd
cd C:\Desko
python -m venv venv
venv\Scripts\activate
pip install flask flask-cors
python scanner_service.py
```

**Option B: User-Installation**
```cmd
pip install --user flask flask-cors
python scanner_service.py
```

### Lösung 4: Proxy/Firewall Problem

Wenn pip keine Verbindung zu PyPI herstellen kann:

```cmd
# Mit Proxy
pip install --proxy http://user:password@proxy:port flask flask-cors

# Timeout erhöhen
pip install --timeout 60 flask flask-cors

# Alternative Index verwenden
pip install --index-url https://pypi.org/simple/ flask flask-cors
```

### Lösung 5: Offline Installation

Falls keine Internet-Verbindung:

**Auf einem PC mit Internet:**
```cmd
pip download flask flask-cors -d C:\pip_packages
```

**Dann auf Ziel-PC kopieren und:**
```cmd
pip install --no-index --find-links=C:\pip_packages flask flask-cors
```

## Nach erfolgreicher Installation

Wenn Pakete installiert sind, starten Sie den Service:

```cmd
cd C:\Desko
python scanner_service.py
```

Sie sollten sehen:
```
============================================================
🚀 Desko Scanner Service Starting...
============================================================

📊 Scanner Status:
   connected: False
   hardware_available: True/False
   simulation_mode: True/False
   ...

🌐 Starting REST API Server...
   URL: http://0.0.0.0:8888
   
✅ Service ready! Press Ctrl+C to stop
============================================================
```

## Prüfen ob Service läuft

**Test 1: Lokal testen**
```cmd
# In neuem Command Prompt Fenster:
curl http://localhost:8888/health
```

**Test 2: Von anderem PC testen**
```cmd
# IP-Adresse herausfinden:
ipconfig

# Von Docker/anderem PC:
curl http://192.168.X.X:8888/health
```

Erwartete Antwort:
```json
{
  "success": true,
  "service": "Desko Scanner Service",
  "version": "1.0.0",
  "scanner_status": {...}
}
```

## Häufige Fehler

### Fehler: "No module named 'flask'"
**Lösung:** Pakete nicht korrekt installiert
```cmd
pip list | findstr flask
# Sollte zeigen: Flask x.x.x und flask-cors x.x.x
```

### Fehler: "Address already in use" / Port 8888 belegt
**Lösung:** Anderer Prozess nutzt Port 8888
```cmd
# Port-Nutzung prüfen:
netstat -ano | findstr :8888

# Prozess beenden:
taskkill /PID <PID> /F

# Oder anderen Port verwenden (in scanner_service.py ändern)
```

### Fehler: "desko_integration" nicht gefunden
**Lösung:** Datei fehlt oder falscher Ordner
```cmd
# Prüfen ob Dateien vorhanden:
dir C:\Desko

# Sollte enthalten:
#   scanner_service.py
#   desko_integration.py
#   desko_sdk\ (Ordner)
```

### Fehler: DLL nicht gefunden
**Lösung:** desko_sdk Ordner fehlt
```cmd
# Prüfen:
dir C:\Desko\desko_sdk

# Sollte enthalten:
#   pagescanapi.dll
#   desko_usb.dll
#   DSB.dll
#   ReaderDesko.dll
#   pagescanapi.properties
```

## Support-Informationen sammeln

Falls weiterhin Probleme:

```cmd
# Python-Version:
python --version

# Installierte Pakete:
pip list

# System-Info:
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"

# Netzwerk-Info:
ipconfig /all
```

Senden Sie diese Informationen für weitere Hilfe.
