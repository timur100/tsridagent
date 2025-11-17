# TSRID ID Checker - Verification Interface

## 📋 Projektübersicht

Dies ist das **TSRID ID Checker** Projekt - eine professionelle Dokumentenverifizierungs- und Verwaltungsplattform.

### Hauptfunktionen:
- 🔍 **Dokumentenverifikation** mit Scanner-Integration
- 📱 **Multi-Portal-System**: Admin, Customer, Technician, Stock Portal
- 🏢 **Multi-Tenancy**: Kundenverwaltung und Mandantenfähigkeit  
- 📊 **Inventar & Bestellmanagement**
- 🎫 **Ticket-System** für Support
- 📦 **Fulfillment & Eurobox Management**
- 🔐 **Sichere Authentifizierung** mit JWT
- 📄 **PDF-Dokumentenverwaltung**
- 🖥️ **Electron Desktop App** für Windows

---

## 🚀 Schnellstart

### Services starten:
```bash
sudo supervisorctl start all
sudo supervisorctl status
```

### URLs:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## 🏗️ Projektstruktur

```
/app/
├── backend/                      # FastAPI Backend
│   ├── server.py                 # Hauptserver
│   ├── requirements.txt          # Python Dependencies
│   ├── routes/                   # API Routes
│   │   ├── locations.py
│   │   ├── devices.py
│   │   ├── portal_auth.py
│   │   ├── inventory.py
│   │   ├── orders.py
│   │   └── ...                   # Weitere Routes
│   ├── models/                   # Datenmodelle
│   └── middleware/               # Middleware
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── App.js                # Hauptkomponente
│   │   ├── PortalApp.jsx         # Portal-Router
│   │   ├── components/           # UI Komponenten
│   │   │   ├── VerificationInterface.jsx
│   │   │   ├── AdminPanel.jsx
│   │   │   ├── CustomerPortalContent.jsx
│   │   │   ├── InventoryManagement.jsx
│   │   │   ├── OrdersManagement.jsx
│   │   │   └── ...
│   │   ├── pages/                # Seiten
│   │   ├── contexts/             # React Contexts
│   │   └── utils/                # Hilfsfunktionen
│   ├── package.json
│   └── .env
│
├── electron-app/                 # Electron Desktop App
│   ├── main.js
│   ├── build.sh
│   └── renderer/
│
├── uploads/                      # Upload-Verzeichnis
├── tests/                        # Tests
└── *.md                         # Dokumentation

```

---

## 🔧 Technologie-Stack

### Backend:
- **FastAPI** - Modernes Python Web Framework
- **Motor** - Async MongoDB Driver
- **Pydantic** - Datenvalidierung
- **PyJWT** - JWT Authentication
- **Uvicorn** - ASGI Server

### Frontend:
- **React 19** - UI Framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Radix UI** - UI Components
- **Axios** - HTTP Client
- **React Hook Form** - Formularhandling

### Database:
- **MongoDB** - NoSQL Datenbank

---

## 📝 Entwicklung

### Backend entwickeln:
```bash
cd /app/backend

# Dependencies installieren
pip install -r requirements.txt

# Server läuft automatisch via supervisor auf Port 8001
# Hot Reload ist aktiviert

# Logs ansehen:
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
```

### Frontend entwickeln:
```bash
cd /app/frontend

# Dependencies installieren
yarn install

# Server läuft automatisch via supervisor auf Port 3000
# Hot Reload ist aktiviert

# Logs ansehen:
tail -f /var/log/supervisor/frontend.out.log
```

### Services neustarten:
```bash
# Alle Services
sudo supervisorctl restart all

# Nur Backend
sudo supervisorctl restart backend

# Nur Frontend
sudo supervisorctl restart frontend
```

---

## 🌐 Portal-Übersicht

### 1. **Verification Interface** (Standard)
- **URL**: http://localhost:3000/
- Scanner-Integration für Dokumente
- Dokumentenverifizierung
- Gesichtserkennung

### 2. **Admin Portal**
- **URL**: http://localhost:3000/portal/admin
- Vollständige Systemverwaltung
- Benutzer- & Geräteverwaltung
- Settings & Konfiguration

### 3. **Customer Portal**
- **URL**: http://localhost:3000/portal/customer
- Kundenspezifische Ansicht
- Geräteverwaltung
- Ticket-System

### 4. **Stock Portal**
- **URL**: http://localhost:3000/portal/stock
- Inventarverwaltung
- Barcode-Scanning
- Bestellungen

### 5. **Technician Portal**
- **URL**: http://localhost:3000/portal/technician
- Techniker-Dashboard
- Gerätewartung

---

## 🔑 Umgebungsvariablen

### Backend (.env):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=verification_db
CORS_ORIGINS=*
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📚 API-Dokumentation

Swagger Docs verfügbar unter: http://localhost:8001/docs

### Wichtige Endpunkte:

#### Authentication:
- `POST /api/portal/auth/login` - Login
- `POST /api/portal/auth/refresh` - Token erneuern

#### Locations:
- `GET /api/locations` - Alle Standorte
- `POST /api/locations` - Standort erstellen
- `PUT /api/locations/{id}` - Standort aktualisieren

#### Devices:
- `GET /api/portal/devices` - Alle Geräte
- `POST /api/portal/devices` - Gerät erstellen

#### Inventory:
- `GET /api/inventory/components` - Komponenten
- `POST /api/inventory/orders` - Bestellung erstellen

... und viele weitere!

---

## 🧪 Testing

### Backend Tests:
```bash
# Verschiedene Test-Dateien verfügbar:
python /app/backend_test.py
python /app/order_test.py
python /app/fulfillment_picking_test.py
```

### API Tests mit curl:
```bash
# Health Check
curl http://localhost:8001/api/

# Locations abrufen
curl http://localhost:8001/api/locations
```

---

## 📦 Electron App erstellen

Siehe detaillierte Anleitungen:
- **QUICK_START.md** - Schnellanleitung
- **BUILD_GUIDE.md** - Vollständige Build-Anleitung
- **ELECTRON_BUILD_GUIDE.md** - Electron-spezifisch

Kurz:
```bash
# 1. Electron Build
cd /app/electron-app
bash build.sh

# 2. Download-Paket erstellen
cd /app
bash create-electron-package.sh
```

---

## 🔍 Weitere Dokumentation

- **QUICK_START.md** - Schnelleinstieg
- **BUILD_GUIDE.md** - Umfassende Build-Anleitung
- **IMPLEMENTATION_SUMMARY.md** - Feature-Übersicht
- **TESTING_GUIDE.md** - Test-Strategie
- **ENTERPRISE_PORTAL_API.md** - Enterprise API
- **REGULA_INTEGRATION_GUIDE.md** - Scanner-Integration

---

## 🎯 Projekt erfolgreich eingerichtet!

Alle Services laufen und sind bereit für die Entwicklung:
- ✅ MongoDB läuft auf Port 27017
- ✅ Backend läuft auf Port 8001
- ✅ Frontend läuft auf Port 3000

Viel Erfolg bei der Entwicklung! 🚀