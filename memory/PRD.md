# TSRID App - Produkt-Dokumentation

## Original Problem Statement
Mobile App für Zebra TC78 + Web-Portal für Asset-Management, Label-Druck, Barcode-Scanning.

## Aktuelle Versionen

### Web Portal
- **Theme:** Hetzner Dark (fest)
- **Status:** Live

### Mobile App
- **Version:** 2.2.4
- **APK:** https://expo.dev/accounts/timur100/projects/tsrid-mobile/builds/118b85ff-114a-4a4b-9d9c-cfb776882d00

## Hetzner Dark Theme (22.02.2026)

### Implementiert
Das gesamte Web-Portal wurde auf das Hetzner Dark Theme umgestellt:

**Farbpalette:**
| Element | Hex-Wert | HSL |
|---------|----------|-----|
| Hintergrund | #141414 | 0 0% 8% |
| Karten | #262626 | 0 0% 15% |
| Header/Toolbar | #383838 | 0 0% 22% |
| Input-Felder | #212121 | 0 0% 13% |
| Borders | #595959 | 0 0% 35% |
| Text | #ededed | 0 0% 93% |
| Akzent (Rot) | #d50c2d | 352 89% 44% |
| Akzent Hover | #ed0d32 | 352 93% 49% |

**Geänderte Dateien:**
- `/app/frontend/src/index.css` - CSS-Variablen
- `/app/frontend/tailwind.config.js` - Hetzner-Farben
- `/app/frontend/src/contexts/ThemeContext.jsx` - Nur Dark Mode
- `/app/frontend/src/components/ThemeToggle.jsx` - Deaktiviert

### Design-Merkmale
- Tiefes Schwarz als Haupthintergrund
- Dunkle Karten mit subtilen Borders
- Hetzner-Rot für alle Akzente und CTAs
- Kein Light Mode mehr (fest Dark)
- Angepasste Scrollbars

## Neue Features

### Reporting-Übersicht
- Zugriff: Grünes FileText-Icon im Header
- Report-Vorlagen: Geräte, Standorte, Assets, Kits, TeamViewer
- Filter: Tenant, Status, Suche
- Export: PDF, Excel, CSV

## Bekannte Probleme

### Mobile App
- P1: Assets-Screen möglicherweise leer
- P2: Echtzeit-Updates
- Label-Druck: Horizontale Spiegelung korrigiert in V2.2.4

## Nächste Schritte
1. Mobile APK V2.2.4 testen
2. Reporting-Feature verifizieren
3. Feedback zum neuen Theme sammeln
