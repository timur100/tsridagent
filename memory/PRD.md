# TSRID App - Produkt-Dokumentation

## Original Problem Statement
Mobile App für Zebra TC78 + Web-Portal für Asset-Management, Label-Druck, Barcode-Scanning.

## Aktuelle Versionen

### Web Portal
- **Theme:** Hetzner Dark (fest)
- **Status:** Live
- **URL:** https://tsrid-web-refresh.preview.emergentagent.com

### Mobile App
- **Version:** 2.2.4
- **APK:** https://expo.dev/accounts/timur100/projects/tsrid-mobile/builds/118b85ff-114a-4a4b-9d9c-cfb776882d00
- **Status:** Wartet auf User-Test für Druckfunktion

## Hetzner Dark Theme (28.02.2026) ✅ KOMPLETT

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
- `/app/frontend/src/components/PortalLogin.jsx` - Login-Seite (28.02.2026)
- `/app/frontend/src/components/ReportingOverview.jsx` - Reporting (28.02.2026)

### Design-Merkmale
- Tiefes Schwarz als Haupthintergrund
- Dunkle Karten mit subtilen Borders
- Hetzner-Rot für alle Akzente und CTAs
- Kein Light Mode mehr (fest Dark)
- Angepasste Scrollbars
- PIN-Pad im Theme (Main + Security Login)

## Neue Features

### Helpdesk-System (28.02.2026) ✅ NEU IMPLEMENTIERT

#### Security Helpdesk (`/helpdesk/security`)
- **Funktion:** Dokument-Verifizierung bei Unklarheiten
- **Zugriff:** Separate URL für Helpdesk-Mitarbeiter
- **Features:**
  - Live-Anfragen von allen Tenants/Standorten/Geräten
  - Vorgefertigte Anfrage-Gründe (ohne Tastatur):
    - Dokument beschädigt/unleserlich
    - Hologramm nicht erkennbar
    - Foto stimmt nicht überein
    - Verdacht auf Fälschung
    - u.v.m.
  - Wallboard-Ansicht für Großbildschirme
  - Sound-Benachrichtigung bei neuen Anfragen
  - APPROVED (grün) / NOT APPROVED (rot) Entscheidungen
  - Echtzeit-Status-Updates zum Scanner-Mitarbeiter

#### Technical Helpdesk (`/helpdesk`)
- **Funktion:** Technischer Support & Ticketing
- **Features:**
  - Ticket-Kategorien (Hardware, Software, Netzwerk, Sonstiges)
  - Prioritätsstufen (Niedrig, Mittel, Hoch, Kritisch)
  - Ticket-Erstellung mit Tenant/Standort-Zuweisung
  - Status-Workflow: Offen → In Bearbeitung → Gelöst → Geschlossen
  - Filter nach Status, Priorität, Suche

#### "2. Meinung anfordern" Button
- **Position:** Scan-Anwendung, nach jedem Dokument-Scan
- **Funktion:** Mitarbeiter kann direkt Helpdesk kontaktieren
- **Status-Anzeige:**
  - Gelb pulsierend: "Warte auf Helpdesk..."
  - Blau: "Anfrage in Bearbeitung"
  - Grün/Rot Vollbild: APPROVED / NOT APPROVED

#### Backend-APIs (`/api/helpdesk/*`)
- Security Requests: CRUD + Wallboard
- Technical Tickets: CRUD + Filter
- Helpdesk Users: Verwaltung
- Ticket Categories: Backend-Konfiguration
- Predefined Questions: Vorgefertigte Anfrage-Gründe

#### Default-Zugangsdaten
- **Helpdesk-Agent:** helpdesk / helpdesk123

### Reporting-Übersicht (28.02.2026) ✅ FUNKTIONIERT
- **Zugriff:** FileText-Icon im Admin-Portal Header
- **Report-Vorlagen:** Geräte pro Standort, Standort-Übersicht, Asset-Inventar, Asset-Kit Zusammensetzung, TeamViewer-IDs Liste, Gesamtübersicht
- **Daten:** 216 Geräte, 214 Standorte geladen
- **Filter:** Tenant (Alle/Europcar/Puma), Status, Suche
- **Export:** PDF/Drucken, Excel, CSV
- **API-Endpoints:**
  - Geräte: `/api/tenant-devices/all/devices` oder `/api/tenant-devices/{tenant_id}`
  - Standorte: `/api/tenant-locations/{tenant_id}`
  - Tenants: `/api/tenants`

## Bekannte Probleme

### Mobile App
- **P1:** Assets-Screen möglicherweise leer
- **P2:** Echtzeit-Updates funktionieren nicht automatisch
- **Label-Druck:** Horizontale Spiegelung korrigiert in V2.2.4 (USER VERIFICATION PENDING)

### Web Portal
- **P3:** Label-Vorschau Layout-Problem (QR-Code/Asset-ID überlappen)

## Nächste Schritte
1. ⏳ Mobile APK V2.2.4 testen (Druckfunktion)
2. ✅ Reporting-Feature verifiziert
3. ✅ PIN-Pad Hetzner Theme implementiert
4. ✅ Helpdesk-System implementiert (Security + Technical)
5. 🔜 Label-Vorschau im Web korrigieren
6. 🔜 Mobile Assets-Screen debuggen
7. 🔜 Helpdesk-Login-Seite mit separater Authentifizierung

## Backlog
- Nachbestellungs-Funktion (Web)
- Webcam-Integration für Asset-Fotos (Web)
- Mobile Echtzeit-Updates
