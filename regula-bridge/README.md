# Regula Bridge Service - Setup-Anleitung

## Überblick

Die **RegulaService** ist eine Windows Tray-Anwendung, die als Bridge zwischen dem TSRID Electron Agent und der Regula SDK fungiert.

```
┌─────────────────┐     HTTP REST      ┌──────────────────┐     COM     ┌────────────┐
│  TSRID Agent    │ ◄────────────────► │  RegulaService   │ ◄─────────► │  Regula    │
│  (Electron)     │   localhost:5000   │  (Tray App)      │             │  SDK       │
└─────────────────┘                     └──────────────────┘             └────────────┘
                                                                              │
                                                                              │ USB
                                                                              ▼
                                                                        ┌────────────┐
                                                                        │  Scanner   │
                                                                        │  7028M.111 │
                                                                        └────────────┘
```

## Installation

### 1. Voraussetzungen

- Windows 10/11
- Visual Studio 2022 (oder neuer)
- .NET 6.0 SDK
- Regula SDK installiert

### 2. Projekt öffnen

```bash
# Solution in Visual Studio öffnen
RegulaService.sln
```

### 3. Regula SDK Referenz hinzufügen

**Option A: COM-Referenz (Empfohlen)**

1. Rechtsklick auf "Dependencies" → "Add COM Reference..."
2. Suchen Sie nach "READERDEMO" oder "Regula"
3. Auswählen und OK klicken

**Option B: DLL-Referenz**

1. Rechtsklick auf "Dependencies" → "Add Project Reference..."
2. Browse → Navigieren zu `C:\Program Files\Regula\Document Reader SDK\bin\`
3. Wählen Sie die relevanten DLLs aus

### 4. RegulaWrapper.cs anpassen

Öffnen Sie `RegulaWrapper.cs` und:

1. Entfernen Sie `_demoMode = true;`
2. Uncommentieren Sie den Regula SDK Code
3. Passen Sie die Initialisierung an Ihre SDK-Version an

### 5. Build & Test

```bash
# Debug-Build
dotnet build

# Release-Build
dotnet build -c Release

# Ausführen
dotnet run
```

## API Endpoints

Der HTTP-Server läuft auf `http://localhost:5000/`

### GET /status
Gibt den aktuellen Status zurück.

```json
{
  "service": "RegulaService",
  "version": "1.0.0",
  "status": "running",
  "scanner": {
    "connected": true,
    "initialized": true,
    "scanInProgress": false
  }
}
```

### POST /connect
Verbindet den Scanner.

### POST /disconnect
Trennt den Scanner.

### POST /scan
Führt einen Scan durch und gibt das Ergebnis zurück.

```json
{
  "success": true,
  "result": {
    "scanId": "abc-123",
    "documentType": "ID Card",
    "isValid": true,
    "mrzData": {
      "firstName": "MAX",
      "lastName": "MUSTERMANN",
      "documentNumber": "T220001293",
      "nationality": "DEU"
    },
    "authenticityChecks": [
      { "checkType": "UV", "result": "OK", "score": 95 }
    ]
  }
}
```

### GET /scan/result
Gibt das letzte Scan-Ergebnis zurück.

### GET /scan/images
Gibt die Bilder des letzten Scans als Base64 zurück.

## TSRID Agent Integration

Im Electron Agent wird die Bridge so angesprochen:

```javascript
// In preload.js oder main.js
const REGULA_SERVICE_URL = 'http://localhost:5000';

async function checkRegulaStatus() {
  const response = await fetch(`${REGULA_SERVICE_URL}/status`);
  return await response.json();
}

async function startScan() {
  const response = await fetch(`${REGULA_SERVICE_URL}/scan`, {
    method: 'POST'
  });
  return await response.json();
}
```

## Autostart einrichten

Um die Bridge automatisch mit Windows zu starten:

1. `Win + R` → `shell:startup`
2. Verknüpfung zur `RegulaService.exe` erstellen
3. Oder: Registry-Eintrag unter `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`

## Fehlerbehebung

### "HTTP-Server konnte nicht gestartet werden"
- Prüfen Sie ob Port 5000 frei ist: `netstat -an | find "5000"`
- Führen Sie als Administrator aus

### "Scanner nicht gefunden"
- Prüfen Sie USB-Verbindung
- Installieren Sie Regula Treiber
- Prüfen Sie Geräte-Manager

### "COM-Komponente nicht registriert"
- Führen Sie Regula Setup erneut aus
- Oder: `regsvr32 READERDEMO.dll`

## Support

Bei Fragen zur Regula SDK Integration kontaktieren Sie den Regula Support oder schauen Sie in die offizielle Dokumentation.
