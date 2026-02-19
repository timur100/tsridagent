# TSRID Mobile App - Zebra TC78

Eine React Native App für Zebra TC78 Handheld-Geräte mit Echtzeit-DatenSync, Barcode/QR-Scanning und Bluetooth-Label-Druck.

## Features

- 📦 **Wareneingang** - Assets scannen und erfassen
- 🏷️ **Label-Druck** - Zebra ZQ630 & Brother QL-820NWB
- 📍 **Standort-Zuweisung** - Assets Standorten zuweisen
- 🔍 **Asset-Suche** - Assets finden und Details anzeigen
- 📊 **Inventur** - Bestandsaufnahme durchführen
- 🪪 **ID-Scan** - Ausweise und Reisepässe scannen
- 🔄 **Offline-Sync** - Automatische Synchronisation

## Hardware-Unterstützung

- **Handheld:** Zebra TC78
- **Scanner:** Zebra DataWedge (integriert)
- **Drucker:** 
  - Zebra ZQ630 (Bluetooth)
  - Brother QL-820NWB (Bluetooth/WLAN)

## Tech Stack

- React Native 0.73+
- TypeScript
- Zustand (State Management)
- React Query (API Caching)
- Zebra DataWedge SDK
- Zebra Link-OS SDK
- AsyncStorage (Offline Storage)
- NetInfo (Connectivity)

## Projektstruktur

```
mobile-app/
├── src/
│   ├── screens/          # App-Screens
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── GoodsReceiptScreen.tsx
│   │   ├── LabelPrintScreen.tsx
│   │   ├── AssetSearchScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── LocationAssignScreen.tsx
│   │   ├── IDScanScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/       # Wiederverwendbare Komponenten
│   │   ├── Scanner/
│   │   ├── Printer/
│   │   ├── SyncStatus/
│   │   └── ModuleCard/
│   ├── services/         # API & Hardware Services
│   │   ├── api.ts
│   │   ├── datawedge.ts
│   │   ├── printer.ts
│   │   └── sync.ts
│   ├── contexts/         # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── SyncContext.tsx
│   │   └── PrinterContext.tsx
│   ├── hooks/            # Custom Hooks
│   │   ├── useScanner.ts
│   │   ├── usePrinter.ts
│   │   └── useSync.ts
│   ├── utils/            # Hilfsfunktionen
│   │   ├── storage.ts
│   │   └── connectivity.ts
│   └── config/           # Konfiguration
│       ├── modules.ts
│       └── api.ts
├── android/              # Android-spezifisch
├── package.json
└── app.json
```

## Installation

```bash
cd mobile-app
npm install
npx react-native run-android
```

## Konfiguration

Module können in `src/config/modules.ts` aktiviert/deaktiviert werden.

## API-Verbindung

Die App verbindet sich mit dem bestehenden Backend unter:
```
REACT_APP_BACKEND_URL/api/...
```

## Offline-Modus

- Daten werden lokal in AsyncStorage gespeichert
- Bei Verbindung: Sofortige Echtzeit-Synchronisation
- Ohne Verbindung: Queue für spätere Sync
- Sync-Status wird in der UI angezeigt
