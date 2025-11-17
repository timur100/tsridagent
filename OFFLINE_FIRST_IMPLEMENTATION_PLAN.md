# 🔌 Offline-First Implementation Plan

## 📋 Ziel
Die Electron Desktop-App offline-fähig machen mit folgenden Features:
- ✅ Offline scannen erlauben
- ✅ Scanergebnisse + Bilder lokal speichern
- ✅ Letzte 100 Scans mit PIN-Schutz abrufbar
- ✅ Automatische + manuelle Synchronisation
- ✅ Wichtigste Stammdaten für Geräteeinrichtung

---

## 🏗️ Architektur

### Komponenten:

```
┌─────────────────────────────────────────┐
│     Electron Main Process               │
│  ┌──────────────────────────────────┐  │
│  │  Offline Storage Manager         │  │
│  │  - IndexedDB via Dexie.js        │  │
│  │  - Scans + Bilder speichern      │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Sync Manager                    │  │
│  │  - Auto-Sync (alle 30 Sek)       │  │
│  │  - Manueller Sync                │  │
│  │  - Conflict Resolution           │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Network Status Monitor          │  │
│  │  - Online/Offline Detection      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↕ IPC
┌─────────────────────────────────────────┐
│     Renderer Process (React)            │
│  ┌──────────────────────────────────┐  │
│  │  Scanner Interface               │  │
│  │  - Offline Mode Indicator        │  │
│  │  - Local Save on Scan            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Offline Scan History (PIN)      │  │
│  │  - Last 100 Scans                │  │
│  │  - Image Preview                 │  │
│  │  - Sync Status                   │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 📦 Dependencies

Neue Pakete für Electron:
```json
{
  "dexie": "^3.2.4",           // IndexedDB Wrapper
  "electron-is-online": "^2.1.0"  // Network Status
}
```

---

## 🔧 Implementierung

### Phase 1: Offline Storage (IndexedDB)

**Datei**: `/app/electron-app/offline-storage.js`

```javascript
// IndexedDB Schema:
// - scans: { id, timestamp, deviceId, locationId, scanData, images, synced, syncedAt }
// - devices: { id, name, locationId, settings, lastSync }
// - locations: { id, name, address, settings, lastSync }
// - settings: { key, value }
```

Features:
- ✅ Scans mit Bildern speichern (base64)
- ✅ Last 100 Scans behalten (FIFO)
- ✅ Sync-Status tracken
- ✅ Geräte-Stammdaten cachen

---

### Phase 2: Sync Manager

**Datei**: `/app/electron-app/sync-manager.js`

Sync-Logik:
1. **Beim Start**: Stammdaten laden (Device, Location)
2. **Auto-Sync**: Alle 30 Sekunden wenn online
3. **Manueller Sync**: Button in UI
4. **Upload-Queue**: Unsynced Scans hochladen
5. **Conflict Resolution**: Server hat Vorrang

API Endpunkte:
- `POST /api/offline/sync-scans` - Scans hochladen
- `GET /api/offline/device-data/:deviceId` - Gerätedaten
- `GET /api/offline/location-data/:locationId` - Standortdaten

---

### Phase 3: Network Status Monitor

**Integration in**: `main.js`

```javascript
const isOnline = require('electron-is-online');

// Check every 10 seconds
setInterval(async () => {
  const online = await isOnline();
  mainWindow.webContents.send('network-status', { online });
  
  if (online) {
    syncManager.startAutoSync();
  }
}, 10000);
```

---

### Phase 4: UI Anpassungen

#### 1. **Offline Indicator**
Zeigt Netzwerkstatus in `VerificationInterface.jsx`

#### 2. **Scan History Modal (PIN-geschützt)**
Neue Komponente: `/app/frontend/src/components/OfflineScanHistory.jsx`

Features:
- PIN-Eingabe (4-stellig)
- Liste der letzten 100 Scans
- Bildvorschau
- Sync-Status (✓ synced, ⏳ pending, ❌ failed)
- Filter nach Datum

#### 3. **Manual Sync Button**
In StatusBar: "Synchronisieren" Button

---

## 🎯 Implementierungsschritte

### Schritt 1: Electron Main Process
1. ✅ `offline-storage.js` erstellen
2. ✅ `sync-manager.js` erstellen  
3. ✅ IPC Handlers in `main.js` hinzufügen
4. ✅ Network Monitor integrieren

### Schritt 2: Backend API
1. ✅ `/api/offline/sync-scans` Endpoint
2. ✅ `/api/offline/device-data/:id` Endpoint
3. ✅ `/api/offline/location-data/:id` Endpoint
4. ✅ Batch-Upload für Scans

### Schritt 3: Frontend UI
1. ✅ `OfflineScanHistory.jsx` erstellen
2. ✅ `VerificationInterface.jsx` anpassen
3. ✅ Offline-Modus Indicator
4. ✅ Sync-Button in StatusBar

### Schritt 4: Testing
1. ✅ Offline-Scan testen
2. ✅ Sync testen (auto + manual)
3. ✅ History mit PIN testen
4. ✅ Netzwerk-Unterbrechung simulieren

---

## 🔐 Sicherheit

### PIN-Schutz
- Standard-PIN: `1234` (änderbar in Settings)
- 3 Fehlversuche → 5 Minuten Sperre
- PIN in `electron-store` verschlüsselt

### Datenspeicherung
- Bilder als base64 in IndexedDB
- Maximale Speichergröße: ~500MB
- Auto-Cleanup: Älteste Scans > 100 löschen

---

## 📊 Datenfluss

### Offline-Scan:
```
1. Benutzer scannt Dokument
2. Scanner liefert Daten + Bilder
3. → Speichern in IndexedDB (offline-storage)
4. → UI zeigt "Gespeichert (nicht synchronisiert)"
5. → Sync-Queue updaten
```

### Auto-Sync:
```
1. Network Monitor erkennt Online-Status
2. Sync Manager prüft Queue
3. → Unsynced Scans laden
4. → POST /api/offline/sync-scans
5. → Bei Erfolg: Sync-Flag setzen
6. → UI updaten
```

### Manual Sync:
```
1. Benutzer klickt "Synchronisieren"
2. → Zeige Fortschritt-Modal
3. → Sync alle pending Scans
4. → Zeige Ergebnis (X synced, Y failed)
```

---

## 🚀 Deployment

### Electron App Build:
```bash
cd /app/electron-app

# Frontend in electron/renderer kopieren
bash build.sh

# Electron App erstellen
npm run build

# Portable Version
npm run build-portable
```

### Initiales Setup beim ersten Start:
```
1. App startet
2. → Device-ID eingeben (oder Auto-Detect)
3. → Online: Stammdaten laden
4. → Offline: Mit lokalen Daten fortfahren
```

---

## ✅ Erfolgs-Kriterien

- [ ] Offline scannen funktioniert ohne Internet
- [ ] Scans werden lokal gespeichert mit Bildern
- [ ] History zeigt letzte 100 Scans mit PIN
- [ ] Auto-Sync funktioniert alle 30 Sek
- [ ] Manueller Sync-Button funktioniert
- [ ] Network Indicator zeigt Status korrekt
- [ ] Keine Datenverluste bei Netzwerkausfall

---

## 📝 Nächste Schritte

Soll ich mit der Implementierung beginnen?

1. ✅ **Phase 1**: Offline Storage + Sync Manager (Backend + Electron)
2. ✅ **Phase 2**: UI Components (Frontend)
3. ✅ **Phase 3**: Testing & Polishing
