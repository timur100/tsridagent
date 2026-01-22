# TSRID Agent - Implementierungs-Roadmap

## 🎯 Ziel
Offline-First Electron Agent für 100+ Tablets mit:
- Kiosk-Modus für Kunden (ID-Verification)
- Admin-Modus für Setup & Konfiguration
- SQLite für Offline-Speicherung
- Auto-Sync mit MongoDB Atlas
- Remote Updates

---

## 📅 Implementierungs-Phasen

### Phase 1: Electron App Grundstruktur (Backend)
**Geschätzte Zeit: 1-2 Tage**

- [ ] Neue Projekt-Struktur erstellen
- [ ] SQLite Integration (better-sqlite3)
- [ ] Datenbank-Schema implementieren
- [ ] Geräte-Konfiguration speichern/laden
- [ ] Offline Standort-Cache

**Dateien:**
```
/electron-app/
├── src/
│   ├── main/
│   │   ├── index.js          # Hauptprozess
│   │   ├── database.js       # SQLite Service
│   │   ├── config.js         # Konfig-Management
│   │   └── device-info.js    # Hardware-Infos
│   └── preload/
│       └── index.js          # IPC Bridge
```

---

### Phase 2: Kiosk & Admin Modi (Frontend)
**Geschätzte Zeit: 1-2 Tage**

- [ ] Kiosk-Mode UI (Vollbild, minimal)
- [ ] Admin-Mode UI (Passwort-geschützt)
- [ ] Setup-Wizard für Ersteinrichtung
- [ ] Standort-Auswahl (Offline-fähig)
- [ ] Scanner-Erkennung Anzeige

**Admin-Funktionen:**
- [ ] Standort festlegen
- [ ] Scanner testen
- [ ] Service installieren/deinstallieren
- [ ] Logs anzeigen
- [ ] App-Version & Update-Status

---

### Phase 3: Scanner Integration
**Geschätzte Zeit: 2-3 Tage**

- [ ] Regula SDK Integration
- [ ] Desko SDK Integration
- [ ] Scanner Auto-Detection
- [ ] Scan-Workflow UI
- [ ] Ergebnis-Anzeige (Valid/Invalid)
- [ ] Scan lokal speichern

**Scan-Daten:**
- Dokument-Typ
- Name, Geburtsdatum
- Dokumentnummer
- Ablaufdatum
- MRZ-Daten
- Foto (optional)
- Confidence Score

---

### Phase 4: Sync Engine
**Geschätzte Zeit: 1-2 Tage**

- [ ] MongoDB Atlas Verbindung
- [ ] Scan-Upload Queue
- [ ] Retry-Logik bei Fehlern
- [ ] Sync-Status Anzeige
- [ ] Konflikt-Handling
- [ ] Bandbreiten-Management

**Sync-Verhalten:**
```
Online:  Sofort sync (innerhalb 5 Sek)
Offline: Lokal speichern, Queue aufbauen
Wieder Online: Queue abarbeiten (FIFO)
```

---

### Phase 5: Remote Management
**Geschätzte Zeit: 1 Tag**

- [ ] Heartbeat an Server (alle 60 Sek)
- [ ] Remote-Befehle empfangen
- [ ] Config-Updates verarbeiten
- [ ] Remote Neustart
- [ ] Log-Upload auf Anfrage

**Backend APIs (neuer Router):**
```
POST /api/agent/register        # Gerät registrieren
POST /api/agent/heartbeat       # Status senden
GET  /api/agent/{id}/commands   # Befehle abholen
POST /api/agent/{id}/logs       # Logs hochladen
GET  /api/agent/updates/check   # Update prüfen
GET  /api/agent/updates/download # Update laden
```

---

### Phase 6: Auto-Update System
**Geschätzte Zeit: 1 Tag**

- [ ] electron-updater konfigurieren
- [ ] Update-Server Endpoint im Backend
- [ ] Signierte Updates (Code Signing)
- [ ] Delta-Updates (nur Änderungen)
- [ ] Rollback bei Fehler

---

### Phase 7: Windows Service & Kiosk
**Geschätzte Zeit: 1 Tag**

- [ ] NSSM Service Installation
- [ ] Auto-Start konfigurieren
- [ ] Crash-Recovery
- [ ] Windows Assigned Access Integration
- [ ] Shell Launcher Option

---

### Phase 8: Admin Portal Integration
**Geschätzte Zeit: 1 Tag**

- [ ] "Agents" Seite im Admin Portal
- [ ] Agent-Liste mit Status
- [ ] Remote-Konfiguration UI
- [ ] Scan-Übersicht pro Agent
- [ ] Bulk-Aktionen (Update alle)

---

## 🔧 Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| Desktop App | Electron 28+ |
| Frontend | React 18 |
| Lokale DB | better-sqlite3 |
| Cloud DB | MongoDB Atlas |
| Scanner | Regula SDK, Desko SDK |
| Updates | electron-updater |
| Service | NSSM (Windows) |
| Build | electron-builder |

---

## 📦 Neue npm Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2",
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.7",
    "uuid": "^9.0.0",
    "node-machine-id": "^1.1.12"
  }
}
```

---

## 🚀 Deployment-Workflow

```
1. Entwicklung & Test (hier in Emergent)
   ↓
2. Build für Windows (electron-builder)
   ↓
3. Build auf Server hochladen
   ↓
4. Master-Image erstellen (einmalig)
   ↓
5. Image auf Tablets klonen (100x)
   ↓
6. Vor-Ort Setup (2 Min pro Tablet)
   ↓
7. Remote Updates für alle
```

---

## ❓ Noch zu klären

1. **Regula/Desko SDK Lizenzen vorhanden?**
2. **Code Signing Zertifikat für Updates?**
3. **Server für Update-Distribution?**
4. **VPN oder direkter Internet-Zugang?**

---

## 📞 Nächster Schritt

**Soll ich mit Phase 1 (SQLite + Grundstruktur) beginnen?**

Die Electron App hier im Emergent-Environment kann ich entwickeln und testen.
Der finale Build muss dann auf einem Windows-System erfolgen (da native Module wie better-sqlite3 und node-hid).
