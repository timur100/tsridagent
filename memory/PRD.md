# TSRID Mobile App - Produkt-Dokumentation

## Original Problem Statement
Entwicklung einer mobilen App für Zebra TC78 Handhelds zur Verwaltung von Assets, Etikettendruck über Bluetooth (Brother QL-820NWB / Zebra), und Barcode-Scanning.

## Aktuelle Version
- **Version:** 2.1.0
- **Status:** In Entwicklung (Änderungen am 22. Februar 2026)
- **Letzter APK Download:** https://expo.dev/artifacts/eas/isreH9DCRwHsuTkFudvz69.apk (V10)

## Letzte Änderungen (22.02.2026)

### Implementiert (Code-Änderungen, kein neuer Build)
1. **API-Endpunkte korrigiert:**
   - `locationsAPI` verwendet jetzt `/api/tenant-locations/{tenant_id}` statt veralteter Endpunkte
   - `devicesAPI` verwendet jetzt `/api/tenant-devices/{tenant_id}` mit korrekter Response-Struktur
   
2. **LocationsScreen verbessert:**
   - Neue tabellenartige Darstellung mit Spalten: Online-Status, Status, Code, Stationsname
   - Suchfunktion hinzugefügt
   - Filter nach Online/Offline Status
   - Statistik-Karten (Gesamt, Online, Offline)
   - Korrekte Feldnamen aus Backend (station_name, location_code, postal_code, etc.)
   
3. **DevicesScreen verbessert:**
   - Korrekte Backend-Feldnamen (device_id, locationcode, sn_pc, sn_sc, etc.)
   - Backend-Summary-Stats werden verwendet
   - Verbesserte Such- und Filterfunktionen
   
4. **Tenant-ID Unterstützung:**
   - Screens unterstützen jetzt sowohl `tenant_id` (singular) als auch `tenant_ids` (array)
   - Erster tenant_id aus dem Array wird automatisch verwendet

### Status der beantragten Aufgaben
- ✅ **Standorte (LocationsScreen):** Code-Änderungen abgeschlossen, wartet auf Build + Test
- ✅ **Geräte-Bildschirm (DevicesScreen):** Code-Änderungen abgeschlossen, wartet auf Build + Test  
- ✅ **Online-Status auf allen Seiten:** Bereits implementiert in CustomHeader im AppNavigator

## Implementierte Features

### APK V10 (21.02.2026)
- **Fix: Scanner-Erweiterung** - Erkennt jetzt zusätzlich zu Asset-IDs auch:
  - Seriennummern (SN)
  - MAC-Adressen (inkl. WiFi, Bluetooth)
  - IMEI / IMEI2
  - EID
  - SIM-Nummern
- **Fix: Spiegelverkehrter Druck** - Raster-Daten werden jetzt horizontal gespiegelt
- **Fix: Bluetooth-Verbindungsstabilität** - Verbesserte Reconnection-Logik
- **Verbesserung: Match-Typ-Anzeige** - Scanner zeigt an, über welchen Identifier das Asset gefunden wurde

### Frühere Versionen (V1-V9)
- Authentifizierung gegen Backend
- Dashboard mit System-Statistiken
- Asset-Liste mit Filterung und Suche
- Asset-Details mit umfangreichen Informationen
- Scanner mit Kamera (QR, Barcode)
- Bluetooth-Integration (BLE für Zebra, Classic für Brother)
- Brother QL-820NWB Raster-Druck-Protokoll
- Label-Format- und Template-Auswahl in Einstellungen
- Asset-Label-Druck (TSRID Standard-Format)

## Code-Architektur
```
/app/mobile/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js          # Tab-Navigation mit CustomHeader
│   ├── screens/
│   │   ├── DashboardScreen.js       # Statistiken, Burger-Menu
│   │   ├── DevicesScreen.js         # Geräteliste (aktualisiert)
│   │   ├── LocationsScreen.js       # Standortliste (aktualisiert)
│   │   ├── AssetsScreen.js
│   │   ├── ScannerScreen.js
│   │   ├── SettingsScreen.js
│   │   └── LoginScreen.js
│   ├── services/
│   │   ├── api.js                   # Backend-Kommunikation (aktualisiert)
│   │   ├── BluetoothPrinterService.js
│   │   ├── BrotherRasterGenerator.js
│   │   └── BrotherPrinterConfig.js
│   ├── contexts/
│   │   └── AuthContext.js
│   └── utils/
│       └── theme.js
├── app.json
├── eas.json
└── package.json
```

## Bekannte Probleme / Offene Punkte

### Nächster Build erforderlich
1. **LocationsScreen/DevicesScreen Änderungen** - Code ist fertig, APK Build erforderlich
2. **Brother Drucker Verbindungsfehler** - `java.io.IOException` beim Koppeln (P1)

### Ausstehende Features (P2)
- Nachbestellungs-Funktion
- Offline-Modus
- DataWedge-Integration für Hardware-Scanner

## Backend API Endpunkte

| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/portal/auth/login` | Authentifizierung |
| `/api/tenant-locations/{tenant_id}` | Standorte eines Tenants |
| `/api/tenant-devices/{tenant_id}` | Geräte eines Tenants |
| `/api/asset-mgmt/assets` | Asset-Verwaltung |
| `/api/tenants/stats` | Dashboard-Statistiken |
| `/api/health` | Health-Check |

## Test-Credentials
- Web-Portal: admin@tsrid.com / admin123
- Expo Account: timur100 (via EXPO_TOKEN)
