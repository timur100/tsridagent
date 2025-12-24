# 🗄️ MongoDB Atlas - Single Source of Truth Konfiguration

## Übersicht

Alle Microservices verwenden **MongoDB Atlas** als zentrale Datenbank.
Jeder Service hat seine eigene Datenbank für optimale Skalierbarkeit.

## Atlas Connection String

```
mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
```

**Hinweis:** Das `#` im Passwort ist URL-encoded als `%23` → `%231976%21`

---

## Microservice-Architektur

| Service | Port | Datenbank | Beschreibung |
|---------|------|-----------|--------------|
| **Main Backend** | 8001 | `tsrid_db` | Haupt-API, Europcar-Daten |
| **Auth Service** | 8100 | `auth_db` | Tenants, Users, Rollen |
| **ID Verification** | 8101 | `verification_db` | ID-Scans, Assets |
| **Inventory Service** | 8102 | `inventory_db` | Lagerverwaltung |
| **Ticketing Service** | 8103 | `ticketing_db` | Support-Tickets |
| **Device Service** | 8104 | `device_db` | Geräteverwaltung |
| **Location Service** | 8105 | `location_db` | Standortverwaltung |
| **Order Service** | 8106 | `order_db` | Bestellungen |
| **Customer Service** | 8107 | `customer_db` | Kundenverwaltung |
| **License Service** | 8108 | `license_db` | Lizenzverwaltung |
| **Settings Service** | 8109 | `settings_db` | Einstellungen |

---

## Hetzner Deployment mit Microservices

### 1. Docker Compose für alle Services

Erstellen Sie `/opt/deployments/TSRID.FULL/docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: tsrid-backend
    env_file: ./backend/.env
    ports:
      - "8001:8001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  auth-service:
    build: ./backend/services/auth_service
    container_name: tsrid-auth
    env_file: ./backend/services/auth_service/.env
    ports:
      - "8100:8100"
    restart: unless-stopped

  id-verification:
    build: ./backend/services/id_verification
    container_name: tsrid-verification
    env_file: ./backend/services/id_verification/.env
    ports:
      - "8101:8101"
    restart: unless-stopped

  inventory-service:
    build: ./backend/services/inventory_service
    container_name: tsrid-inventory
    env_file: ./backend/services/inventory_service/.env
    ports:
      - "8102:8102"
    restart: unless-stopped

  ticketing-service:
    build: ./backend/services/ticketing_service
    container_name: tsrid-ticketing
    env_file: ./backend/services/ticketing_service/.env
    ports:
      - "8103:8103"
    restart: unless-stopped

  device-service:
    build: ./backend/services/device_service
    container_name: tsrid-device
    env_file: ./backend/services/device_service/.env
    ports:
      - "8104:8104"
    restart: unless-stopped

  location-service:
    build: ./backend/services/location_service
    container_name: tsrid-location
    env_file: ./backend/services/location_service/.env
    ports:
      - "8105:8105"
    restart: unless-stopped

  order-service:
    build: ./backend/services/order_service
    container_name: tsrid-order
    env_file: ./backend/services/order_service/.env
    ports:
      - "8106:8106"
    restart: unless-stopped

  customer-service:
    build: ./backend/services/customer_service
    container_name: tsrid-customer
    env_file: ./backend/services/customer_service/.env
    ports:
      - "8107:8107"
    restart: unless-stopped

  license-service:
    build: ./backend/services/license_service
    container_name: tsrid-license
    env_file: ./backend/services/license_service/.env
    ports:
      - "8108:8108"
    restart: unless-stopped

  settings-service:
    build: ./backend/services/settings_service
    container_name: tsrid-settings
    env_file: ./backend/services/settings_service/.env
    ports:
      - "8109:8109"
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: tsrid-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

---

### 2. Environment-Dateien

#### Main Backend (`backend/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=tsrid_db
REACT_APP_BACKEND_URL=https://tsrid.cloudnetwrx.com
JWT_SECRET=your-secret-key-change-in-production
```

#### Auth Service (`backend/services/auth_service/.env`):
```env
SERVICE_NAME=Auth & Identity Service
SERVICE_PORT=8100
SERVICE_TYPE=auth
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=auth_db
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=RS256
```

#### Ticketing Service (`backend/services/ticketing_service/.env`):
```env
SERVICE_NAME=Ticketing Service
SERVICE_PORT=8103
SERVICE_TYPE=ticketing
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=ticketing_db
JWT_SECRET=your-secret-key-change-in-production
```

#### Inventory Service (`backend/services/inventory_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=inventory_db
SERVICE_PORT=8102
SERVICE_NAME=Inventory Service
```

#### Device Service (`backend/services/device_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=device_db
SERVICE_PORT=8104
SERVICE_NAME=Device Service
```

#### Location Service (`backend/services/location_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=location_db
SERVICE_PORT=8105
SERVICE_NAME=Location Service
```

#### Customer Service (`backend/services/customer_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=customer_db
SERVICE_PORT=8107
SERVICE_NAME=Customer Service
```

#### Order Service (`backend/services/order_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=order_db
SERVICE_PORT=8106
SERVICE_NAME=Order Service
```

#### License Service (`backend/services/license_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=license_db
SERVICE_PORT=8108
SERVICE_NAME=License Service
```

#### Settings Service (`backend/services/settings_service/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=settings_db
SERVICE_PORT=8109
SERVICE_NAME=Settings Service
```

#### ID Verification (`backend/services/id_verification/.env`):
```env
MONGO_URL=mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority
DB_NAME=verification_db
SERVICE_PORT=8101
SERVICE_NAME=ID Verification Service
```

---

### 3. Deployment-Befehle

```bash
# 1. Code aktualisieren
cd /opt/deployments/TSRID.FULL
git pull origin main

# 2. Alle Services starten
docker compose up -d --build

# 3. Status prüfen
docker compose ps

# 4. Logs anzeigen
docker compose logs -f
```

---

## Vorteile dieser Architektur

✅ **Skalierbarkeit**: Jeder Service kann unabhängig skaliert werden
✅ **Performance**: Separate Datenbanken verhindern Engpässe
✅ **Ausfallsicherheit**: Ein Service-Ausfall betrifft nicht die anderen
✅ **Single Source of Truth**: Alle Umgebungen verwenden dieselben Atlas-Datenbanken
✅ **Zukunftssicher**: Einfache Migration zu Kubernetes möglich
