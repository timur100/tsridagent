# TSRID Mobile App

Mobile Anwendung für Zebra TC78 Handheld-Geräte zur Echtzeit-Asset-Verwaltung, Barcode-Scanning und Label-Druck.

## Features

- **Login**: Sichere Authentifizierung über bestehende Backend-API
- **Dashboard**: Systemübersicht mit Statistiken und Schnellzugriff
- **Scanner**: Barcode/QR-Code Scanning mit Kamera
- **Assets**: Asset-Verwaltung und -Suche
- **Einstellungen**: Scanner-, Drucker- und Sync-Konfiguration

## Technologie-Stack

- **Framework**: React Native mit Expo
- **Navigation**: React Navigation 6
- **State Management**: React Context API
- **API-Client**: Axios
- **Secure Storage**: Expo SecureStore

## Installation

```bash
cd /app/mobile
yarn install
```

## Entwicklung

```bash
# Expo Start
yarn start

# Android Emulator
yarn android

# iOS Simulator (nur macOS)
yarn ios
```

## Design

Die App verwendet das gleiche Design wie das Admin Portal:
- Primärfarbe: #c00000 (Rot)
- Hintergrund: #1a1a1a (Dunkel)
- Oberflächen: #2a2a2a (Dunkelgrau)

## Zielgerät

- **Zebra TC78**: Android Enterprise Handheld
- **Unterstützte Drucker**:
  - Zebra ZQ630 (Bluetooth)
  - Brother QL-820NWB (Bluetooth/WiFi)

## API-Endpoints

Die App verwendet die bestehenden Backend-APIs:
- `/api/portal/auth/login` - Authentifizierung
- `/api/asset-mgmt/inventory/all` - Assets laden
- `/api/tenants/stats` - Dashboard-Statistiken
- `/api/health` - Server-Status

## Ordnerstruktur

```
/app/mobile/
├── App.js                 # Haupt-App-Komponente
├── app.json               # Expo-Konfiguration
├── package.json           # Dependencies
├── src/
│   ├── components/        # Wiederverwendbare Komponenten
│   ├── contexts/          # React Context (Auth)
│   ├── navigation/        # Navigation Setup
│   ├── screens/           # App-Screens
│   ├── services/          # API-Services
│   ├── store/             # State Management (zukünftig)
│   └── utils/             # Hilfsfunktionen & Theme
└── assets/                # Bilder & Icons
```

## Geplante Features

- [ ] Offline-Synchronisation
- [ ] Native Zebra DataWedge Scanner-Integration
- [ ] Bluetooth-Drucker-Anbindung
- [ ] Konfigurierbare Module
- [ ] Push-Benachrichtigungen
