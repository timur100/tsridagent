# TSRID Mobile App - Zebra TC78

## Übersicht

Separate Mobile App für Zebra TC78 Handheld-Geräte.
**Nutzt das bestehende Backend** - keine Änderungen an Electron/Portal.

```
┌─────────────────────────────────────────────────────────────┐
│                    TSRID Ökosystem                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Electron   │  │ Admin Portal │  │Kunden Portal │      │
│  │     App      │  │   (React)    │  │   (React)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └────────────┬────┴─────────────────┘               │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────┐                         │
│         │    FastAPI Backend     │                         │
│         │    (MongoDB Atlas)     │                         │
│         └────────────┬───────────┘                         │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────┐       ◄── NEU!          │
│         │   📱 Mobile App        │                         │
│         │   (React Native)       │                         │
│         │   Zebra TC78           │                         │
│         └────────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Bestehende API-Endpoints (werden wiederverwendet)

Die Mobile App nutzt die **gleichen Endpoints** wie das Admin Portal:

### Assets / Wareneingang
- `POST /api/asset-mgmt/inventory/intake-with-auto-id` - Asset erfassen
- `GET /api/asset-mgmt/assets` - Assets abrufen
- `GET /api/asset-mgmt/assets/{asset_id}` - Asset-Details
- `POST /api/asset-mgmt/inventory/bulk-edit` - Bulk-Bearbeitung

### Standorte
- `GET /api/asset-mgmt/locations` - Alle Standorte
- `POST /api/asset-mgmt/inventory/assign-to-location/{sn}` - Zuweisung

### Label-Vorlagen
- `GET /api/label-templates` - Vorlagen abrufen

### Audit
- `GET /api/audit/log` - Audit-Log
- `POST /api/audit/soft-delete` - Archivieren

## Mobile-spezifische Features

### 1. Zebra DataWedge Integration
- Automatisches Scannen über Hardware-Button
- Intent-basierte Kommunikation
- Konfiguration über DataWedge Profile

### 2. Bluetooth-Drucker
- Zebra ZQ630 (Link-OS SDK)
- Brother QL-820NWB (Brother SDK)
- Automatische Drucker-Erkennung

### 3. Offline-Sync
- AsyncStorage für lokale Daten
- Sync-Queue bei Verbindungsverlust
- Automatischer Sync bei Reconnect

### 4. Modulare Architektur
- Module über Config aktivierbar
- Berechtigungen pro Benutzer
- Remote-Konfiguration möglich

## Dateistruktur

```
/app/mobile-app/
├── src/
│   ├── App.tsx                    # Haupteinstieg
│   ├── screens/                   # Bildschirme
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── goods-receipt/
│   │   │   ├── ScanScreen.tsx
│   │   │   └── ConfirmScreen.tsx
│   │   ├── label-print/
│   │   │   └── PrintScreen.tsx
│   │   ├── asset-search/
│   │   │   └── SearchScreen.tsx
│   │   ├── inventory/
│   │   │   └── InventoryScreen.tsx
│   │   ├── location-assign/
│   │   │   └── AssignScreen.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Input.tsx
│   │   ├── scanner/
│   │   │   ├── ScannerView.tsx
│   │   │   └── ScanResult.tsx
│   │   ├── printer/
│   │   │   ├── PrinterSelector.tsx
│   │   │   └── LabelPreview.tsx
│   │   ├── sync/
│   │   │   ├── SyncStatus.tsx
│   │   │   └── SyncQueue.tsx
│   │   └── modules/
│   │       └── ModuleCard.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios-Client
│   │   │   ├── assets.ts          # Asset-API
│   │   │   ├── locations.ts       # Location-API
│   │   │   └── auth.ts            # Auth-API
│   │   ├── hardware/
│   │   │   ├── datawedge.ts       # Zebra Scanner
│   │   │   ├── zebraPrinter.ts    # Zebra ZQ630
│   │   │   └── brotherPrinter.ts  # Brother QL-820NWB
│   │   └── sync/
│   │       ├── syncManager.ts     # Sync-Logik
│   │       ├── offlineQueue.ts    # Offline-Queue
│   │       └── connectivity.ts    # Netzwerk-Status
│   ├── stores/
│   │   ├── authStore.ts           # Auth-State
│   │   ├── assetStore.ts          # Asset-State
│   │   ├── syncStore.ts           # Sync-State
│   │   └── settingsStore.ts       # Einstellungen
│   ├── config/
│   │   ├── api.ts                 # API-URL
│   │   ├── modules.ts             # Modul-Konfiguration
│   │   └── printers.ts            # Drucker-Konfiguration
│   ├── types/
│   │   ├── asset.ts
│   │   ├── location.ts
│   │   └── printer.ts
│   └── utils/
│       ├── storage.ts             # AsyncStorage Helper
│       ├── labelGenerator.ts      # ZPL/ESC-POS Generator
│       └── formatters.ts          # Datum, Nummern, etc.
├── android/                       # Android-spezifisch
│   └── app/
│       └── src/main/
│           └── java/.../
│               └── DataWedgeModule.java
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── app.json
```

## Module

| Modul | Beschreibung | API-Endpoints |
|-------|--------------|---------------|
| Wareneingang | Assets scannen & erfassen | `POST /inventory/intake-with-auto-id` |
| Label-Druck | Labels drucken | `GET /label-templates` |
| Asset-Suche | Assets finden | `GET /assets?search=...` |
| Inventur | Bestandsaufnahme | `GET /assets`, `POST /bulk-edit` |
| Standort-Zuweisung | Assets zuweisen | `POST /assign-to-location` |
| ID-Scan | Ausweise scannen | `POST /id-scans` |

## Drucker-Unterstützung

### Zebra ZQ630
- Verbindung: Bluetooth Classic
- Protokoll: ZPL (Zebra Programming Language)
- SDK: Zebra Link-OS

### Brother QL-820NWB
- Verbindung: Bluetooth / WLAN
- Protokoll: ESC/P (Brother)
- SDK: Brother Print SDK

## Sync-Strategie

```
┌─────────────────────────────────────────────────────────────┐
│                     SYNC ABLAUF                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    Online?    ┌──────────────────┐           │
│  │  Aktion  │──────Yes─────▶│ Sofort an Server │           │
│  │ (Scan)   │               │ senden (Realtime)│           │
│  └────┬─────┘               └──────────────────┘           │
│       │                                                     │
│       │ No                                                  │
│       ▼                                                     │
│  ┌──────────────────┐                                      │
│  │ In Offline-Queue │                                      │
│  │ speichern        │                                      │
│  └────────┬─────────┘                                      │
│           │                                                 │
│           │ Verbindung wiederhergestellt                   │
│           ▼                                                 │
│  ┌──────────────────┐                                      │
│  │ Queue abarbeiten │                                      │
│  │ & synchronisieren│                                      │
│  └──────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Berechtigungen (Android)

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Entwicklung

### Voraussetzungen
- Node.js 18+
- Android Studio
- Zebra TC78 oder Emulator
- React Native CLI

### Setup
```bash
cd /app/mobile-app
npm install
npx react-native run-android
```

### DataWedge Konfiguration
1. DataWedge App auf TC78 öffnen
2. Neues Profil "TSRID" erstellen
3. Intent Output aktivieren
4. Intent Action: `com.tsrid.mobile.SCAN`
