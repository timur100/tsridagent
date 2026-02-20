# TSRID Mobile App

React Native Mobile App für Zebra TC78 Handheld-Geräte und andere Android-Smartphones.

## Features

### Implementiert
- ✅ **Authentifizierung** - Login/Logout mit Backend-Integration
- ✅ **Dashboard** - Live-Statistiken und Systemübersicht
- ✅ **Scanner** - Kamera-basierter Barcode/QR-Code Scanner
- ✅ **Asset-Liste** - Anzeige und Suche von Assets
- ✅ **Einstellungen** - App-Konfiguration

### Zebra DataWedge Integration
Die App unterstützt native Hardware-Scanner auf Zebra-Geräten (TC78, TC72, etc.) über die DataWedge-API:

- **Automatische Erkennung** von Zebra-Geräten
- **Hardware-Trigger** - Physische Scan-Tasten
- **Profilkonfiguration** - Automatische DataWedge-Profilerstellung
- **Fallback** - Kamera-Scanner auf Nicht-Zebra-Geräten

```javascript
import { dataWedgeService } from './src/services/datawedge';

// Initialisieren
await dataWedgeService.initialize(
  (scanResult) => console.log('Gescannt:', scanResult),
  (status) => console.log('Status:', status)
);

// Soft-Scan auslösen
dataWedgeService.triggerScan();
```

### Bluetooth-Drucker
Unterstützung für mobile Etikettendrucker:

- **Zebra ZQ630** - ZPL II Labels
- **Brother QL-820NWB** - DK Labels

```javascript
import { bluetoothPrinterService } from './src/services/bluetoothPrinter';

// Drucker suchen
const printers = await bluetoothPrinterService.scanForPrinters();

// Verbinden
await bluetoothPrinterService.connect(printers[0]);

// Etikett drucken
await bluetoothPrinterService.printLabel({
  title: 'Asset Label',
  barcode: 'ASSET-001',
  text: 'Beschreibung',
});
```

## Installation

```bash
# Dependencies installieren
yarn install

# iOS (nur Mac)
cd ios && pod install && cd ..

# Starten
yarn start
```

## Entwicklung

### Expo Go (Entwicklung)
```bash
yarn start
```

### Build für Zebra-Geräte
```bash
# Android APK
yarn android

# Signed Release APK
cd android && ./gradlew assembleRelease
```

## Projektstruktur

```
/app/mobile
├── App.js                      # App Entry Point
├── app.json                    # Expo Konfiguration
├── package.json                # Dependencies
├── src/
│   ├── components/             # Wiederverwendbare Komponenten
│   ├── contexts/
│   │   └── AuthContext.js      # Authentifizierungs-State
│   ├── navigation/
│   │   └── AppNavigator.js     # Stack & Tab Navigation
│   ├── screens/
│   │   ├── LoginScreen.js      # Login-Bildschirm
│   │   ├── DashboardScreen.js  # Dashboard
│   │   ├── ScannerScreen.js    # Barcode-Scanner
│   │   ├── AssetsScreen.js     # Asset-Liste
│   │   └── SettingsScreen.js   # Einstellungen
│   ├── services/
│   │   ├── api.js              # Backend-API Client
│   │   ├── datawedge.js        # Zebra DataWedge Integration
│   │   └── bluetoothPrinter.js # Bluetooth-Drucker
│   ├── store/                  # State Management
│   └── utils/
│       └── theme.js            # Design System
└── assets/                     # Bilder, Fonts
```

## API Endpoints

Die App kommuniziert mit dem TSRID Backend:

| Endpoint | Beschreibung |
|----------|--------------|
| `/api/portal/auth/login` | Login |
| `/api/portal/auth/logout` | Logout |
| `/api/asset-mgmt/assets` | Assets abrufen |
| `/api/asset-mgmt/inventory` | Wareneingang |
| `/api/portal/locations/list` | Standorte |
| `/api/tenants/stats` | Dashboard-Stats |

## Theme & Design

Das Theme basiert auf dem TSRID Admin Portal mit dunklem Farbschema:

```javascript
const theme = {
  colors: {
    primary: '#dc2626',      // Rot
    background: '#0f0f0f',   // Dunkel
    surface: '#1a1a1a',      // Karten
    textPrimary: '#ffffff',  // Weiß
    success: '#22c55e',      // Grün
    error: '#ef4444',        // Rot
  }
};
```

## Lizenz

Proprietär - TSRID GmbH
