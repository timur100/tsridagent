# TSRID Mobile App - Produkt-Dokumentation

## Original Problem Statement
Entwicklung einer mobilen App für Zebra TC78 Handhelds zur Verwaltung von Assets, Etikettendruck über Bluetooth (Brother QL-820NWB / Zebra), und Barcode-Scanning.

## Aktuelle Version
- **Version:** 2.2.1
- **Status:** Build in Arbeit
- **APK Build:** https://expo.dev/accounts/timur100/projects/tsrid-mobile/builds/764797fa-e3dc-495b-bb12-e2864e7a65e5

## Änderungen in V2.2.1 (22.02.2026)

### KRITISCH: BrotherRasterGenerator.js komplett neu geschrieben

**Problem:** Drucker zeigte "Empfängt/Receiving" aber druckte nicht.

**Ursachen identifiziert und behoben:**

1. **Invalidate-Befehl korrigiert**
   - Vorher: 200 Null-Bytes
   - Jetzt: 400 Null-Bytes (Brother QL Spezifikation)

2. **Print Information Command (ESC i z) korrigiert**
   - 10 Parameter-Bytes für 62mm Endlos-Etiketten
   - Media type = 0x0A (Continuous)
   - Media width = 0x3E (62mm)
   - Raster-Zeilenanzahl als Little Endian

3. **Raster-Daten Format korrigiert**
   - Format: `0x67` + Länge (1 Byte) + Daten
   - Bild horizontal gespiegelt (Brother-Anforderung)
   - Bits innerhalb jedes Bytes gespiegelt

4. **Print-Befehl vereinfacht**
   - Nur `0x1A` am Ende (nicht `0x1B 0x1A 0x0C`)

### Code-Referenz (Brother QL Raster Protocol)
```
Befehlssequenz:
1. 400x 0x00          - Invalidate (Puffer leeren)
2. 0x1B 0x40          - Initialize (ESC @)
3. 0x1B 0x69 0x61 0x01 - Switch to Raster Mode
4. 0x1B 0x69 0x7A ...  - Print Information (10 Bytes)
5. 0x1B 0x69 0x4D ...  - Auto Cut
6. 0x1B 0x69 0x41 0x01 - Cut Every
7. 0x1B 0x69 0x4B 0x08 - Expanded Mode (Cut at end)
8. 0x1B 0x69 0x64 0x00 0x00 - Margins
9. 0x67 {len} {data}   - Raster Data (pro Zeile)
10. 0x1A               - Print (EOF)
```

## Bekannte Probleme

### P1 - Assets-Screen ist leer (Regression)
- **Status:** Debugging-Logs in V2.2.0 hinzugefügt
- Warten auf Test nach Label-Fix

### P2 - Echtzeit-Updates nicht automatisch
- **Status:** WebSocket + Polling implementiert
- Warten auf Test

## Test-Workflow
1. APK herunterladen (sobald Build fertig)
2. Auf TC78 installieren
3. **Label-Druck testen:**
   - Geräte → Detail-Modal → "Label drucken"
   - Standorte → Detail-Modal → "Label drucken"
   - Assets → "Label drucken"

## Backend API Endpunkte
| Endpunkt | Status |
|----------|--------|
| `/api/asset-mgmt/assets` | ✅ Funktioniert |
| `/api/tenant-locations/{id}` | ✅ Funktioniert |
| `/api/tenant-devices/{id}` | ✅ Funktioniert |

## Geänderte Dateien
- `/app/mobile/src/services/BrotherRasterGenerator.js` - Komplett neu
- `/app/mobile/src/screens/AssetsScreen.js` - Debug-Logs
- `/app/mobile/app.json` - Version 2.2.1, versionCode 19
