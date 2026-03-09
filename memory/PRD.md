# TSRID App - Produkt-Dokumentation

## Original Problem Statement
Mobile App für Zebra TC78 + Web-Portal für Asset-Management, Label-Druck, Barcode-Scanning.

## Aktuelle Versionen

### Web Portal
- **Theme:** Hetzner Dark (fest)
- **Status:** Live
- **URL:** https://tablet-fleet-mgmt.preview.emergentagent.com

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

#### "2. Meinung anfordern" Button (bei ERROR/Rot Status)
- **Position:** Scan-Anwendung, nach jedem Dokument-Scan mit Fehler
- **Funktion:** Mitarbeiter kann direkt Helpdesk kontaktieren
- **Status-Anzeige:**
  - Gelb pulsierend: "Warte auf Helpdesk..."
  - Blau: "Anfrage in Bearbeitung"
  - Grün/Rot Vollbild: APPROVED / NOT APPROVED

#### "Dokument zur Datenbank hinzufügen" Workflow (bei WARNING/Gelb Status) ✅ NEU (01.03.2026)
- **Trigger:** Unbekanntes Dokument (Warning-Status)
- **Workflow:**
  1. **1. Warning:** "Bitte erneut scannen" Prompt wird angezeigt
  2. **2. Warning:** "Zur Datenbank hinzufügen" Button erscheint
  3. **Klick:** Anfrage wird an Tenant Security Portal gesendet
  4. **Tenant genehmigt:** Anfrage wird an TSRID weitergeleitet
  5. **TSRID verarbeitet:** Dokument wird zur Datenbank hinzugefügt
- **Komponente:** `DatabaseAdditionButton.jsx`
- **API:** `/api/helpdesk/database-additions`

#### Tenant Security Portal (`/helpdesk/security/tenant`) ✅ NEU (01.03.2026)
- **Funktion:** Portal für Tenant-eigene Security-Mitarbeiter
- **Features:**
  - Tab-Navigation: "Security" und "Datenbank"
  - Verwaltung von Security-Anfragen für den eigenen Tenant
  - Verwaltung von Datenbank-Additions-Anfragen
  - Genehmigung/Ablehnung mit Weiterleitung an TSRID
  - Wallboard-Ansicht
  - Sound-Benachrichtigungen
- **Rollen:** `tenant_security` (nur eigene Tenant-Daten sichtbar)

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

### PowerShell Agent
- **P4:** Agent sperrt agent.log Datei (Live-Debugging nicht möglich)
- **P5:** Agent geht zeitweise offline (blockiert durch P4)

## Nächste Schritte
1. ⏳ Mobile APK V2.2.4 testen (Druckfunktion)
2. ✅ Reporting-Feature verifiziert
3. ✅ PIN-Pad Hetzner Theme implementiert
4. ✅ Helpdesk-System implementiert (Security + Technical)
5. ✅ "Dokument zur DB hinzufügen" Workflow implementiert (01.03.2026)
6. ✅ TSRID-Admin Dashboard für Datenbank-Anfragen (01.03.2026)
7. ✅ "Fehler beim Laden der Kontinente" behoben (01.03.2026)
8. ✅ Standort-Erstellung repariert (08.03.2026)
9. 🔜 PowerShell Agent Log-Datei Sperrung beheben
10. 🔜 Label-Vorschau im Web korrigieren
11. 🔜 Mobile Assets-Screen debuggen

## Device Agent System (06.03.2026) ✅ KOMPLETT

### Backend API (`/api/device-agent/*`)
- `/register` - Geräteregistrierung mit Hardware-Infos
- `/heartbeat` - Statusmeldungen mit Prozess-Status (TV, TSRID)
- `/devices` - Geräteliste mit Online/Offline-Status (90 Sek. Timeout)
- `/devices/{id}` - Gerätedetails
- Auto-Refresh alle 30 Sekunden im Frontend

### TeamViewer Account Monitoring (08.03.2026) ✅ NEU
- **Backend:** `device_agent.py` speichert TeamViewer Account-Daten korrekt:
  - `teamviewer.account_assigned` - Boolean ob verknüpft
  - `teamviewer.account_email` - Account-Name/E-Mail (OwningManagerAccountName)
  - `teamviewer.account_company` - Firmenname (OwningManagerCompanyName)
- **Frontend:** Device Details Modal zeigt:
  - "Konto-Status" Feld: "Verknüpft" (grün) / "Nicht verknüpft" (rot)
  - "Account Name" und "Firma" Felder wenn verfügbar
  - "TeamViewer nicht mit Konto verknüpft" Warnung im Probleme-Bereich
- **PowerShell Agent V20:** Sammelt Account-Infos aus Registry (WOW6432Node)

### Remote Control System (07.03.2026) ✅ NEU IMPLEMENTIERT
- **Schnellbefehle:** Agent neustarten, PC neustarten, PC herunterfahren, Screenshot
- **Nachricht mit Timer:** Countdown-Timer in Minuten (z.B. 120 für 2h)
- **Nachrichten-Vorlagen:** CRUD-System für wiederverwendbare Nachrichten
  - API: `GET/POST /api/device-agent/templates`, `PUT/DELETE /api/device-agent/templates/{id}`
  - Frontend: Vorlagen erstellen, bearbeiten, löschen, mit einem Klick senden
  - **WYSIWYG-Editor (07.03.2026):** TipTap-basierter Rich-Text-Editor
    - Formatierung: Fett, Kursiv, Unterstrichen
    - Textausrichtung: Links, Zentriert, Rechts
    - HTML-Ausgabe für Windows HTA-Fenster kompatibel
- **Befehlsverlauf:** Zeigt Nachrichteninhalt (HTML-Rendering), Zielgeräte (Namen), Zeitstempel
- **PowerShell Agent V9:**
  - Always-on-top Nachrichtenfenster (HTA)
  - Datum & Uhrzeit der Meldung
  - Countdown-Timer wenn Dauer angegeben
  - Stylisches Vollbild-Fenster mit TSRID-Branding
  - HTML-Formatierung wird korrekt angezeigt

### PowerShell Agent Installer
- **Installer-Dateien:** 
  - `Install-TSRID-Agent.bat` (Doppelklick-Start)
  - `Install-TSRID-Agent.ps1` (Hauptscript)
  - `TSRID-Agent-Service-V9.ps1` (Agent-Script)
- **Features:**
  - Admin-Rechte über Benutzer "ec" / "Berlin#2018"
  - Scheduled Task mit 2 Min. Startverzögerung
  - Prüft TeamViewer + tsrid.exe Prozess-Status
  - Heartbeat alle 60 Sekunden
  - Command-Polling alle 5 Sekunden

## Standortverwaltung (08.03.2026) ✅ BUGFIX + ERWEITERUNG

### Standort-Erstellung repariert
- **Problem:** Beim Erstellen eines neuen Standorts wurde der Standort nicht in der Liste angezeigt
- **Ursache:** Zwei Modals wurden gleichzeitig gerendert:
  1. `LocationModal.jsx` (Zeile 2175-2187)
  2. Inline Modal in TenantDetailPage.jsx (Zeile 3299-3518)
- **Lösung:** Inline Modal mit `false &&` deaktiviert, sodass nur `LocationModal.jsx` verwendet wird
- **Test-Status:** ✅ Verifiziert (100% Erfolgsrate)

### Dynamisches Standort-Modal (NEU)
Das Modal passt sich jetzt an die Tenant-Kategorie an:

**Kategorien:**
- **Allgemein** - Nur Basisdaten
- **Autovermietung** - Für Europcar, Sixt, etc. (Stations-Typ, ID Checker, SN-PC, SN-SC, TV-ID, etc.)
- **Logistik** - Für Speditionen (Lager-Code, Laderampen, Lagerkapazität, Gabelstapler)
- **Einzelhandel** - Für Shops (Filialnummer, Verkaufsfläche, Kassen, Öffnungszeiten)
- **Gesundheitswesen** - Für Kliniken (Einrichtungstyp, Betten, Abteilung)

**Eigene Felder:**
- Benutzer können eigene Felder mit Namen und Typ (Text, Zahl, E-Mail, Tel, Datum, URL) hinzufügen
- Felder werden mit dem Standort in der DB gespeichert

**Geänderte Dateien:**
- `/app/frontend/src/components/LocationModal.jsx` - Komplett überarbeitet
- `/app/backend/routes/tenant_locations.py` - Pydantic-Modelle erweitert (tenant_category, custom_fields, kategorie-spezifische Felder)

### Stationszuweisung Fix (08.03.2026)
- **Problem:** TSR Tenant-Daten wurden nicht in der Stationszuweisung angezeigt
- **Ursache:** Die API `/api/device-agent/locations-by-tenant` las nur aus der alten `tsrid_db.tenants` Collection, aber neue Standorte werden in `portal_db.tenant_locations` gespeichert
- **Lösung:** API erweitert, um aus beiden Datenquellen zu lesen und Ergebnisse zu kombinieren
- **Geänderte Dateien:**
  - `/app/backend/routes/device_agent.py` - `get_locations_by_tenant()` liest jetzt aus beiden Collections

## P0 Bug Fix: Stationszuweisung wird nicht mehr überschrieben (09.03.2026) ✅ KRITISCH

### Problem (Wiederkehrender Bug - 3+ Mal gemeldet)
Nach der Zuweisung einer Station (z.B. `TSRID00-01`) wurde der `location_code` bei jedem Agent-Register wieder auf den alten Wert (z.B. `MUCT01`) zurückgesetzt.

### Ursache
Die `/register` Endpoint-Logik suchte zuerst in der falschen Collection (`device_assignments`) statt in `registered_devices`. Außerdem wurde eine Variable (`existing_device`) innerhalb der TeamViewer-Historie-Logik überschrieben, was dazu führte, dass das Gerät als "nicht zugewiesen" behandelt wurde.

### Lösung
1. **Primäre Quelle korrigiert:** Die Suche erfolgt jetzt zuerst in `registered_devices` (authoritative Quelle)
2. **Variable-Shadowing behoben:** `existing_device` wird nicht mehr in der TeamViewer-Logik überschrieben
3. **Priorisierte Zuweisungslogik:** Server-seitige Zuweisungen werden NIEMALS durch Agent-Daten überschrieben
4. **Ausführliches Logging:** Jeder Schritt wird protokolliert für besseres Debugging

### Geänderte Dateien
- `/app/backend/routes/device_agent.py` - `register_device()` komplett überarbeitet

### Test
- Neuer Regression-Test: `test_station_assignment_not_overwritten_by_agent`
- Manueller API-Test erfolgreich: Agent sendete `MUCT01`, Server behielt `TSRID00-01`

### Frontend Dashboard
- Grid-Layout für Geräteliste (1-4 Spalten responsive)
- Klick auf Gerät öffnet Modal mit Details
- TV/TSRID Lampen nur grün wenn online UND Prozess läuft

## Backlog
- (P1) PowerShell Agent Log-Datei-Sperre beheben - Write-Log Funktion hält Datei gesperrt
- (P1) Agent-to-Agent Kommunikation innerhalb eines Tenants
- (P1) TeamViewer-ähnliche Remote-Control Funktion
- (P2) Nachbestellungs-Funktion (Web)
- (P3) Webcam-Integration für Asset-Fotos (Web)
- Mobile Echtzeit-Updates
- Zentrale Geräte-Konfiguration vom Portal
- Mobile App Label-Druck verifizieren (APK v2.2.4)
