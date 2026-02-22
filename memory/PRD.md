# TSRID Mobile App - Produkt-Dokumentation

## Original Problem Statement
Entwicklung einer mobilen App für Zebra TC78 Handhelds zur Verwaltung von Assets, Etikettendruck über Bluetooth (Brother QL-820NWB / Zebra), und Barcode-Scanning.

## Aktuelle Version
- **Version:** 1.6.0 (Build 10 / APK V10)
- **Build-Datum:** 21. Februar 2026
- **Download:** https://expo.dev/artifacts/eas/isreH9DCRwHsuTkFudvz69.apk

## Implementierte Features

### APK V10 (21.02.2026)
- **Fix: Scanner-Erweiterung** - Erkennt jetzt zusätzlich zu Asset-IDs auch:
  - Seriennummern (SN)
  - MAC-Adressen (inkl. WiFi, Bluetooth)
  - IMEI / IMEI2
  - EID
  - SIM-Nummern
- **Fix: Spiegelverkehrter Druck** - Raster-Daten werden jetzt horizontal gespiegelt (Byte-Reihenfolge + Bit-Reihenfolge pro Zeile umgekehrt)
- **Fix: Bluetooth-Verbindungsstabilität** - Verbesserte Reconnection-Logik nach Druckjobs
- **Verbesserung: Match-Typ-Anzeige** - Scanner zeigt an, über welchen Identifier das Asset gefunden wurde
- **Verbesserung: AssetsScreen** - Übernimmt jetzt auch `searchQuery` aus Navigation

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
│   ├── screens/
│   │   ├── DashboardScreen.js
│   │   ├── AssetsScreen.js
│   │   ├── ScannerScreen.js
│   │   ├── SettingsScreen.js
│   │   └── LoginScreen.js
│   ├── services/
│   │   ├── BluetoothPrinterService.js  # Zentrale Drucker-Logik
│   │   ├── BrotherRasterGenerator.js    # Raster-Daten-Generierung
│   │   ├── BrotherPrinterConfig.js      # Label-Formate
│   │   └── api.js                        # Backend-Kommunikation
│   ├── contexts/
│   │   └── AuthContext.js
│   └── utils/
│       └── theme.js
├── app.json                              # Expo-Konfiguration
├── eas.json                              # EAS Build-Profile
└── package.json
```

## Bekannte Probleme / Offene Punkte

### Zu Testen (APK V10)
1. **Spiegelverkehrter Druck** - Fix implementiert, benötigt Benutzer-Test
2. **Bluetooth-Verbindung** - Verbesserte Stabilität, benötigt Test
3. **Scanner mit SN/MAC/IMEI** - Neues Feature, benötigt Test

### Ausstehende Features (P2)
- Dashboard "Labels" und "Standorte" Schnellzugriffe könnten erweitert werden
- Standorte-Filter im AssetsScreen könnte dedizierte Standort-Liste zeigen

## Backlog / Zukünftige Features

### Mobile App
- Nachbestellungs-Funktion
- Offline-Modus
- DataWedge-Integration für Hardware-Scanner

### Web-Portal
- Webcam-Integration für Asset-Fotos
- Refactoring Asset Detail Modal

## Technische Details

### EAS Build
- Profil: `production`
- Platform: Android APK
- Node: 20.18.0
- Expo SDK: 51

### Backend API
- Base URL: https://zebra-asset-scan.preview.emergentagent.com
- Auth: `/api/portal/auth/login`
- Assets: `/api/asset-mgmt/assets`
- Stats: `/api/tenants/stats`

### Drucker-Support
- **Zebra**: BLE-Verbindung, ZPL-Befehle
- **Brother QL-820NWB**: Bluetooth Classic (SPP), ESC/P Raster-Modus

## Test-Credentials
- Web-Portal: admin@tsrid.com / admin123
- Expo Account: timur100 (via EXPO_TOKEN)
