# TSRID Mobile App - Produkt-Dokumentation

## Original Problem Statement
Entwicklung einer mobilen App für Zebra TC78 Handhelds zur Verwaltung von Assets, Etikettendruck über Bluetooth (Brother QL-820NWB / Zebra), und Barcode-Scanning.

## Aktuelle Version
- **Version:** 2.2.0
- **Status:** Build in Arbeit (22. Februar 2026)
- **Letzter APK Build:** https://expo.dev/accounts/timur100/projects/tsrid-mobile/builds/2913f4fc-0524-4a9f-afeb-385622e57981

## Änderungen in V2.2.0 (22.02.2026)

### Implementiert
1. **Fix: Label-Druck (P0) - Korrekter Print-Befehl:**
   - Problem: Drucker zeigte "Receiving Data..." aber druckte nicht
   - Ursache: Falscher Beendigungsbefehl (`0x1A` allein)
   - Lösung: Korrekter Brother Raster-Befehl `ESC SUB FF` (`0x1B 0x1A 0x0C`) implementiert
   - Geänderte Dateien:
     - `BrotherRasterGenerator.js`: `createBrotherRasterLabel`, `createLocationLabel`, `createDeviceLabel`

2. **Assets-Screen Debugging hinzugefügt:**
   - Console.log-Ausgaben zur Diagnose des leeren Bildschirms
   - API-Response-Logging für bessere Fehleranalyse

## Bekannte Probleme (Priorisiert)

### P1 - Assets-Screen ist leer (Regression)
- **Beschreibung:** Benutzer meldet "Assets erscheinen nicht mehr"
- **Status:** Debugging-Logs hinzugefügt, wartet auf APK-Test
- **Debug-Checklist:**
  1. APK bauen und installieren
  2. Logs in Console prüfen (`[AssetsScreen] ...`)
  3. API-Response-Struktur verifizieren

### P2 - Echtzeit-Updates funktionieren nicht automatisch
- **Beschreibung:** Daten aktualisieren sich nicht ohne manuellen Refresh
- **Status:** WebSocket + Polling-Fallback (30s) implementiert
- **Nächste Schritte:**
  1. WebSocket-Verbindung in App-Logs überprüfen
  2. Backend-WebSocket-Events verifizieren

### P3 - Brother Drucker Verbindungsfehler
- **Beschreibung:** `java.io.IOException` bei Verbindung
- **Status:** Niedrige Priorität, wartet auf P0-Bestätigung

## Implementierte Features (Alle Versionen)

### APK V10 (21.02.2026)
- Scanner-Erweiterung: SN, MAC, IMEI, EID, SIM
- Spiegelverkehrter Druck behoben
- Bluetooth-Verbindungsstabilität verbessert

### Frühere Features
- Authentifizierung, Dashboard, Asset-Liste
- Scanner mit Kamera
- Brother QL-820NWB Raster-Druck
- Label-Format- und Template-Auswahl
- WebSocket für Echtzeit-Updates
- Anruf-Button (funktioniert)
- Navigations-Button (funktioniert)

## Code-Architektur
```
/app/mobile/
├── src/
│   ├── screens/
│   │   ├── AssetsScreen.js       # P1-Bug (leer)
│   │   ├── DevicesScreen.js      # Funktioniert
│   │   ├── LocationsScreen.js    # Funktioniert
│   │   └── ...
│   ├── services/
│   │   ├── BrotherRasterGenerator.js  # P0-Fix implementiert
│   │   ├── BluetoothPrinterService.js
│   │   └── WebSocketService.js
│   └── contexts/
│       ├── AuthContext.js
│       └── WebSocketContext.js
└── app.json (v2.2.0, versionCode 18)
```

## Backend API Endpunkte
| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/portal/auth/login` | Authentifizierung |
| `/api/asset-mgmt/assets` | Assets (funktioniert) |
| `/api/tenant-locations/{tenant_id}` | Standorte |
| `/api/tenant-devices/{tenant_id}` | Geräte |
| `/api/health` | Health-Check |

## Test-Workflow
1. APK bauen: `eas build --platform android --profile preview`
2. APK auf TC78 installieren
3. App testen, Logs sammeln
4. Feedback an Entwicklung

## Nächste Schritte
1. APK-Build abwarten
2. Benutzer testet Label-Druck (P0)
3. Falls P0 funktioniert: P1 (Assets) debuggen
4. WebSocket-Verbindung prüfen (P2)
