# TSRID Mobile App & Web Portal - Produkt-Dokumentation

## Original Problem Statement
Entwicklung einer mobilen App für Zebra TC78 Handhelds und eines Web-Portals zur Verwaltung von Assets, Etikettendruck über Bluetooth (Brother QL-820NWB), und Barcode-Scanning.

## Aktuelle Versionen

### Mobile App
- **Version:** 2.2.4
- **APK:** https://expo.dev/accounts/timur100/projects/tsrid-mobile/builds/118b85ff-114a-4a4b-9d9c-cfb776882d00
- **Fixes:** 
  - Horizontale Spiegelung korrigiert
  - Größere Labels (350px Höhe)
  - Scale 5/4/3 für bessere Lesbarkeit

### Web Portal
- **Neu:** Reporting-Übersicht Feature implementiert

## Neue Features (22.02.2026)

### Reporting-Übersicht (Web Portal)
Neuer Menüpunkt im Header mit folgenden Funktionen:

**Report-Vorlagen:**
1. Geräte pro Standort - Alle Devices mit Location-Zuordnung
2. Standort-Übersicht - Alle Locations mit Details
3. Asset-Inventar - Alle Assets mit Status
4. Asset-Kit Zusammensetzung - Kit-Komponenten
5. TeamViewer-IDs Liste - Schnellübersicht
6. Gesamtübersicht - Alle Daten kombiniert

**Filter-Optionen:**
- Tenant-Auswahl (oder "Alle Tenants")
- Status-Filter (aktiv, inaktiv, auf Lager, in Vorbereitung)
- Suchfeld für alle Felder

**Export-Funktionen:**
- PDF / Drucken (öffnet Druck-Dialog)
- Excel (.xls Export)
- CSV (mit Semikolon-Trennung, UTF-8)

**Zugriff:**
- Grünes Dokument-Icon (FileText) im Header
- Zwischen Ideen-Button und Theme-Toggle

## Bekannte Probleme

### Mobile App
- **P1:** Assets-Screen möglicherweise leer (Debugging-Logs vorhanden)
- **P2:** Echtzeit-Updates - WebSocket + 30s Polling implementiert
- **P3:** Brother Drucker Verbindungsfehler

### Web Portal
- Label-Template "TSRID Tablet Label" wurde auf ursprünglichen Zustand zurückgesetzt

## Code-Architektur

### Neue Dateien
```
/app/frontend/src/components/ReportingOverview.jsx  # NEU - Reporting Feature
```

### Geänderte Dateien
```
/app/frontend/src/pages/AdminPortal.jsx             # Reporting-Button + State
/app/mobile/src/services/BrotherRasterGenerator.js  # Label-Druck Fix
```

## Backend API Endpunkte für Reporting
| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/tenants` | Alle Tenants |
| `/api/devices` | Geräte (mit ?tenant_id Filter) |
| `/api/standorte` | Standorte (mit ?tenant_id Filter) |
| `/api/asset-mgmt/assets` | Alle Assets |
| `/api/kit-templates` | Kit-Vorlagen |

## Nächste Schritte
1. Mobile APK testen (Label-Druck)
2. Reporting-Feature im Web-Portal testen
3. Assets-Screen in Mobile App prüfen
4. Echtzeit-Updates verifizieren
