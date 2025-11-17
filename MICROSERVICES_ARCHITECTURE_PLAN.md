# 🏗️ Microservices Architecture Plan - Offline-First mit SQLite

## 🎯 Architektur-Ziel

**Vollständig modulare Microservices-Architektur** wo:
- ✅ Jeder Service hat eigene MongoDB
- ✅ Services kommunizieren über REST APIs in Echtzeit
- ✅ Electron-App nutzt SQLite für Offline-Storage
- ✅ Automatische Synchronisation SQLite ↔ MongoDB
- ✅ Services sind vollständig eigenständig und skalierbar

---

## 🏛️ Architektur-Übersicht

```
┌──────────────────────────────────────────────────────────────┐
│                    ELECTRON DESKTOP APP                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               SQLite Database (Offline)                 │ │
│  │  - scans_table                                         │ │
│  │  - device_settings_table                               │ │
│  │  - sync_queue_table                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕ REST API                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Optional)                    │
│  - Request Routing                                           │
│  - Load Balancing                                            │
│  - Authentication                                            │
└──────────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────────┐
│                      MICROSERVICES                           │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 ID Verification Service                         │    │
│  │  - Port: 8001                                       │    │
│  │  - MongoDB: verification_db                         │    │
│  │  - API: /api/verification/*                         │    │
│  │  - Collections:                                     │    │
│  │    • scans                                          │    │
│  │    • scan_images                                    │    │
│  │    • verification_history                           │    │
│  │    • banned_documents                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📦 Inventory Service                               │    │
│  │  - Port: 8002                                       │    │
│  │  - MongoDB: inventory_db                            │    │
│  │  - API: /api/inventory/*                            │    │
│  │  - Collections:                                     │    │
│  │    • components                                     │    │
│  │    • orders                                         │    │
│  │    • stock_levels                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🏢 Portal Service                                  │    │
│  │  - Port: 8003                                       │    │
│  │  - MongoDB: portal_db                               │    │
│  │  - API: /api/portal/*                               │    │
│  │  - Collections:                                     │    │
│  │    • users                                          │    │
│  │    • devices                                        │    │
│  │    • locations                                      │    │
│  │    • customers                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🎫 Ticketing Service                               │    │
│  │  - Port: 8004                                       │    │
│  │  - MongoDB: tickets_db                              │    │
│  │  - API: /api/tickets/*                              │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

          ↕ Service-to-Service Communication (REST)

┌──────────────────────────────────────────────────────────────┐
│                    SHARED SERVICES                           │
│  - Authentication Service                                    │
│  - Notification Service                                      │
│  - File Storage Service                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Service-Details

### 1. 📋 ID Verification Microservice

**Verantwortlichkeiten:**
- Dokumenten-Scanning
- Gesichtserkennung
- Verification History
- Banned Documents Management

**Datenbank:** `verification_db` (MongoDB)

**Collections:**
```javascript
// scans
{
  _id: ObjectId,
  scan_id: String (UUID),
  device_id: String,
  location_id: String,
  timestamp: DateTime,
  document_data: {
    document_type: String,
    document_number: String,
    first_name: String,
    last_name: String,
    birth_date: String,
    expiry_date: String,
    nationality: String,
    sex: String,
    issuing_country: String
  },
  images: [{
    type: String,
    data: String (base64),
    format: String
  }],
  verification_status: String,
  synced_from_offline: Boolean,
  offline_scan_timestamp: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}

// scan_images (separate collection for large images)
{
  _id: ObjectId,
  scan_id: String,
  image_type: String,
  image_data: Binary,
  thumbnail: String (base64),
  created_at: DateTime
}

// verification_history
{
  _id: ObjectId,
  scan_id: String,
  verification_type: String,
  result: Object,
  timestamp: DateTime
}

// banned_documents
{
  _id: ObjectId,
  document_number: String,
  reason: String,
  banned_at: DateTime,
  expires_at: DateTime
}
```

**API Endpoints:**
```
POST   /api/verification/scan              - Create scan
GET    /api/verification/scans             - Get all scans
GET    /api/verification/scans/:id         - Get scan by ID
POST   /api/verification/sync-offline      - Sync offline scans
GET    /api/verification/history           - Get verification history
POST   /api/verification/banned-check      - Check if document is banned
```

---

### 2. 📦 Inventory Microservice

**Verantwortlichkeiten:**
- Komponenten-Verwaltung
- Bestellungen
- Stock-Levels

**Datenbank:** `inventory_db` (MongoDB)

**API Endpoints:**
```
GET    /api/inventory/components           - Get components
POST   /api/inventory/orders               - Create order
GET    /api/inventory/stock-levels         - Get stock levels
```

**Service-to-Service Calls:**
- Ruft Portal Service für Location-Daten auf
- Ruft Ticketing Service bei Low-Stock

---

### 3. 🏢 Portal Microservice

**Verantwortlichkeiten:**
- Benutzer-Verwaltung
- Geräte-Verwaltung
- Standort-Verwaltung
- Customer Management

**Datenbank:** `portal_db` (MongoDB)

**API Endpoints:**
```
GET    /api/portal/users                   - Get users
GET    /api/portal/devices                 - Get devices
GET    /api/portal/locations               - Get locations
GET    /api/portal/customers               - Get customers
```

---

### 4. 🎫 Ticketing Microservice

**Verantwortlichkeiten:**
- Support-Tickets
- Incident Management

**Datenbank:** `tickets_db` (MongoDB)

---

## 💾 SQLite Schema (Electron App)

**Datei:** `/app/electron-app/database/schema.sql`

```sql
-- Main scans table
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT UNIQUE NOT NULL,
  device_id TEXT,
  location_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Document data (JSON)
  document_type TEXT,
  document_number TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  expiry_date TEXT,
  nationality TEXT,
  sex TEXT,
  issuing_country TEXT,
  
  -- Sync status
  synced BOOLEAN DEFAULT 0,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt DATETIME,
  sync_error TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scan images (separate table for performance)
CREATE TABLE IF NOT EXISTS scan_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL,
  image_type TEXT,
  image_data BLOB,
  thumbnail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES scans(scan_id)
);

-- Device settings cache
CREATE TABLE IF NOT EXISTS device_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE,
  location_id TEXT,
  location_name TEXT,
  settings_json TEXT,
  last_sync DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync queue for failed syncs
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  next_retry DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES scans(scan_id)
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scans_synced ON scans(synced);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
CREATE INDEX IF NOT EXISTS idx_scans_device ON scans(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_next_retry ON sync_queue(next_retry);
```

---

## 🔄 Sync-Mechanismus

### Electron → Backend Sync

**Flow:**
```
1. Scan in Electron-App durchgeführt
2. → Speichern in SQLite (scans + scan_images)
3. → In sync_queue einfügen
4. → Sync-Service prüft Netzwerkstatus
5. → POST /api/verification/sync-offline
6. → Bei Erfolg: synced = 1
7. → Bei Fehler: retry_count++, next_retry = +5min
```

**Sync-Service Features:**
- Auto-Retry mit Exponential Backoff
- Batch-Upload (bis zu 10 Scans gleichzeitig)
- Priority Queue (neueste Scans zuerst)
- Network-aware (pausiert bei Offline)

---

## 🔌 Service-to-Service Communication

### Beispiel: Verification → Portal Service

```javascript
// In ID Verification Service
async function getDeviceInfo(deviceId) {
  const response = await axios.get(
    `http://portal-service:8003/api/portal/devices/${deviceId}`,
    {
      headers: {
        'X-Service-Auth': process.env.SERVICE_SECRET,
        'X-Request-From': 'verification-service'
      }
    }
  );
  return response.data;
}
```

### API Gateway Pattern (Optional)

```
Client → API Gateway → Service
                ↓
          - Authentication
          - Rate Limiting
          - Request Routing
          - Load Balancing
```

---

## 🚀 Implementierungsplan

### Phase 1: ID Verification Microservice

**1.1 Projektstruktur:**
```
/app/backend/services/
├── id_verification/
│   ├── server.py                 # FastAPI App
│   ├── requirements.txt
│   ├── .env
│   ├── models/
│   │   ├── scan.py
│   │   ├── verification.py
│   │   └── banned_document.py
│   ├── routes/
│   │   ├── scans.py
│   │   ├── sync.py
│   │   └── verification.py
│   ├── services/
│   │   ├── scanner_service.py
│   │   └── sync_service.py
│   └── utils/
│       └── db.py
```

**1.2 Backend erstellen:**
- [ ] ID Verification Service Setup
- [ ] MongoDB Connection (verification_db)
- [ ] API Routes implementieren
- [ ] Sync-Endpoint erstellen

---

### Phase 2: SQLite in Electron

**2.1 SQLite Integration:**
```
/app/electron-app/
├── database/
│   ├── schema.sql
│   ├── sqlite-manager.js        # SQLite Operations
│   └── migrations/
├── services/
│   ├── sync-service.js          # Sync mit Backend
│   └── network-monitor.js       # Online/Offline Detection
└── main.js                      # Updated mit SQLite
```

**2.2 Electron Updates:**
- [ ] SQLite3 installieren (`better-sqlite3`)
- [ ] Database Manager erstellen
- [ ] Sync Service implementieren
- [ ] IPC Handlers für SQLite

---

### Phase 3: Frontend Anpassungen

**3.1 Offline UI Components:**
- [ ] Offline Indicator
- [ ] Sync Status Display
- [ ] Scan History (PIN-geschützt)
- [ ] Manual Sync Button

---

### Phase 4: Service Migration

**4.1 Weitere Services aufteilen:**
- [ ] Inventory Service extrahieren
- [ ] Portal Service extrahieren
- [ ] Ticketing Service extrahieren

**4.2 Service Communication:**
- [ ] REST Client Library
- [ ] Service Discovery (optional)
- [ ] Health Checks

---

## 🔐 Sicherheit

### Service-to-Service Auth:
```
- Shared Secret (X-Service-Auth Header)
- JWT für externe Clients
- API Keys für Electron-App
```

### SQLite Encryption:
```
- SQLCipher für verschlüsselte SQLite DB
- Key in electron-store gespeichert
```

---

## 📊 Monitoring & Logging

### Service Health:
```
GET /health
{
  "service": "id-verification",
  "status": "healthy",
  "database": "connected",
  "uptime": 3600
}
```

### Centralized Logging (Optional):
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch
- Grafana + Prometheus

---

## ✅ Nächste Schritte

**Soll ich beginnen mit:**

1. **Phase 1**: ID Verification Microservice erstellen (MongoDB + API)
2. **Phase 2**: SQLite in Electron integrieren + Sync
3. **Phase 3**: Frontend UI Updates
4. **Alle Phasen**: Komplett durchziehen

**Was ist Ihre Präferenz?**
