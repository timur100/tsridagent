# 🚀 TSRID Asset Management - Hetzner Server Deployment

## 🎯 Ziel:

Emergent-Projekt auf Hetzner-Server deployen - **komplett autark und produktionsreif**.

---

## 📋 Übersicht:

**Was wird deployt:**
- ✅ FastAPI Backend (Port 8001)
- ✅ React Frontend (Port 3000)
- ✅ MongoDB (Port 27017)
- ✅ Nginx Reverse Proxy (Port 80/443)
- ✅ SSL/HTTPS (Let's Encrypt)
- ✅ Auto-Deploy via GitHub

**Server-Specs (Empfehlung):**
- CPX21 (3 vCPU, 4GB RAM, 80GB SSD): ~8€/Monat
- Oder: CPX31 (4 vCPU, 8GB RAM): ~15€/Monat

---

## 🛠️ Phase 1: Server-Vorbereitung

### 1.1 Server bei Hetzner erstellen

```bash
# Hetzner Cloud Console:
1. Neuer Server
2. Location: Falkenstein oder Nürnberg
3. Image: Ubuntu 22.04
4. Type: CPX21 (empfohlen)
5. SSH-Key hinzufügen
6. Server erstellen
```

### 1.2 Domain konfigurieren

```bash
# DNS-Einträge (bei Ihrem Domain-Provider):
A     desk-manager.ihre-domain.de  →  <HETZNER-SERVER-IP>
A     api.desk-manager.ihre-domain.de  →  <HETZNER-SERVER-IP>
```

### 1.3 Erste Verbindung

```bash
# Von Ihrem PC:
ssh root@<HETZNER-SERVER-IP>

# Passwort wurde per Email gesendet
# Beim ersten Login: Passwort ändern
```

---

## 🐳 Phase 2: Docker Installation

### 2.1 System aktualisieren

```bash
apt update && apt upgrade -y
apt install -y curl git vim htop
```

### 2.2 Docker installieren

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose installieren
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Testen
docker --version
docker-compose --version
```

---

## 📦 Phase 3: Projekt-Setup

### 3.1 Projekt von GitHub clonen

```bash
# Falls noch nicht auf GitHub:
# → Erst auf GitHub pushen von Emergent

# Auf Hetzner:
cd /opt
git clone https://github.com/IHR-USERNAME/IHR-REPO.git tsrid-app
cd tsrid-app
```

### 3.2 Production Environment erstellen

```bash
# Backend .env
cat > backend/.env.production << 'EOF'
# MongoDB
MONGO_URL=mongodb://mongo:27017/verification_db
DB_NAME=verification_db

# Security
SECRET_KEY=<GENERIERE-EINEN-SICHEREN-KEY>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=https://desk-manager.ihre-domain.de

# Production
ENVIRONMENT=production
DEBUG=false
EOF

# Frontend .env
cat > frontend/.env.production << 'EOF'
REACT_APP_BACKEND_URL=https://api.desk-manager.ihre-domain.de
EOF
```

**WICHTIG: Secret Key generieren:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Ergebnis in backend/.env.production einfügen
```

---

## 🐋 Phase 4: Docker-Setup

### 4.1 Dockerfile für Backend erstellen

```dockerfile
# /opt/tsrid-app/backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Expose port
EXPOSE 8001

# Run
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 4.2 Dockerfile für Frontend erstellen

```dockerfile
# /opt/tsrid-app/frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build
COPY . .
RUN yarn build

# Production
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 Nginx Config für Frontend

```nginx
# /opt/tsrid-app/frontend/nginx.conf
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.4 Docker Compose erstellen

```yaml
# /opt/tsrid-app/docker-compose.yml
version: '3.8'

services:
  # MongoDB
  mongo:
    image: mongo:7
    container_name: tsrid-mongo
    restart: always
    volumes:
      - mongo-data:/data/db
      - ./mongo-backup:/backup
    environment:
      MONGO_INITDB_DATABASE: verification_db
    networks:
      - tsrid-network

  # Backend
  backend:
    build: ./backend
    container_name: tsrid-backend
    restart: always
    env_file:
      - ./backend/.env.production
    depends_on:
      - mongo
    networks:
      - tsrid-network

  # Frontend
  frontend:
    build: ./frontend
    container_name: tsrid-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - tsrid-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: tsrid-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - tsrid-network

volumes:
  mongo-data:

networks:
  tsrid-network:
    driver: bridge
```

---

## 🌐 Phase 5: Nginx Reverse Proxy

### 5.1 Nginx Config erstellen

```bash
mkdir -p /opt/tsrid-app/nginx
```

```nginx
# /opt/tsrid-app/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8001;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name desk-manager.ihre-domain.de api.desk-manager.ihre-domain.de;
        return 301 https://$server_name$request_uri;
    }

    # Frontend
    server {
        listen 443 ssl http2;
        server_name desk-manager.ihre-domain.de;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Backend API
    server {
        listen 443 ssl http2;
        server_name api.desk-manager.ihre-domain.de;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS
            add_header Access-Control-Allow-Origin https://desk-manager.ihre-domain.de;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type";
        }
    }
}
```

---

## 🔒 Phase 6: SSL/HTTPS (Let's Encrypt)

### 6.1 Certbot installieren

```bash
apt install -y certbot
```

### 6.2 SSL-Zertifikate erstellen

```bash
# Zertifikate holen
certbot certonly --standalone -d desk-manager.ihre-domain.de -d api.desk-manager.ihre-domain.de

# Zertifikate kopieren
mkdir -p /opt/tsrid-app/nginx/ssl
cp /etc/letsencrypt/live/desk-manager.ihre-domain.de/fullchain.pem /opt/tsrid-app/nginx/ssl/
cp /etc/letsencrypt/live/desk-manager.ihre-domain.de/privkey.pem /opt/tsrid-app/nginx/ssl/
```

### 6.3 Auto-Renewal einrichten

```bash
# Cron Job für Auto-Renewal
crontab -e

# Folgendes hinzufügen:
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/desk-manager.ihre-domain.de/*.pem /opt/tsrid-app/nginx/ssl/ && docker restart tsrid-nginx
```

---

## 🚀 Phase 7: Erste Deployment

### 7.1 Build & Start

```bash
cd /opt/tsrid-app

# Bauen
docker-compose build

# Starten
docker-compose up -d

# Logs checken
docker-compose logs -f
```

### 7.2 Status prüfen

```bash
# Container status
docker ps

# Logs ansehen
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongo

# Nginx testen
curl -I https://desk-manager.ihre-domain.de
curl -I https://api.desk-manager.ihre-domain.de
```

---

## 🔄 Phase 8: Auto-Deploy Setup

### 8.1 Deploy-Script erstellen

```bash
# /opt/tsrid-app/deploy.sh
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Rebuild containers
echo "🏗️  Rebuilding containers..."
docker-compose build

# Restart services
echo "🔄 Restarting services..."
docker-compose down
docker-compose up -d

# Health check
echo "🏥 Health check..."
sleep 10
curl -f https://api.desk-manager.ihre-domain.de/health || echo "⚠️  Backend health check failed"
curl -f https://desk-manager.ihre-domain.de || echo "⚠️  Frontend health check failed"

echo "✅ Deployment complete!"
echo "📊 Container status:"
docker ps
```

```bash
chmod +x /opt/tsrid-app/deploy.sh
```

### 8.2 Webhook für GitHub (Optional)

```bash
# /opt/tsrid-app/webhook-server.py
from flask import Flask, request
import subprocess
import hmac
import hashlib

app = Flask(__name__)
SECRET = "IHR-GITHUB-WEBHOOK-SECRET"

@app.route("/deploy", methods=["POST"])
def deploy():
    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256")
    if signature:
        mac = hmac.new(SECRET.encode(), request.data, hashlib.sha256)
        if not hmac.compare_digest(f"sha256={mac.hexdigest()}", signature):
            return "Invalid signature", 403
    
    # Run deployment
    subprocess.Popen(["/opt/tsrid-app/deploy.sh"])
    return "Deployment started", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000)
```

---

## 📊 Phase 9: Monitoring & Logs

### 9.1 Logs ansehen

```bash
# Alle Container
docker-compose logs -f

# Nur Backend
docker-compose logs -f backend

# Letzte 100 Zeilen
docker-compose logs --tail=100 backend
```

### 9.2 Resource-Monitoring

```bash
# Container Resources
docker stats

# Disk usage
docker system df

# Cleanup
docker system prune -a
```

### 9.3 Health-Check Script

```bash
# /opt/tsrid-app/health-check.sh
#!/bin/bash

echo "🏥 TSRID Health Check"
echo "===================="

# Check containers
echo "📦 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check endpoints
echo -e "\n🌐 Endpoint Health:"
curl -f https://desk-manager.ihre-domain.de > /dev/null 2>&1 && echo "✓ Frontend OK" || echo "✗ Frontend FAIL"
curl -f https://api.desk-manager.ihre-domain.de/health > /dev/null 2>&1 && echo "✓ Backend OK" || echo "✗ Backend FAIL"

# Check disk
echo -e "\n💾 Disk Usage:"
df -h /

# Check memory
echo -e "\n🧠 Memory Usage:"
free -h
```

```bash
chmod +x /opt/tsrid-app/health-check.sh
```

---

## 💾 Phase 10: Backup-System

### 10.1 MongoDB Backup Script

```bash
# /opt/tsrid-app/backup.sh
#!/bin/bash

BACKUP_DIR="/opt/tsrid-app/mongo-backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.gz"

echo "📦 Creating MongoDB backup..."

# Create backup
docker exec tsrid-mongo mongodump --archive=/backup/${BACKUP_FILE} --gzip

# Keep only last 7 days
find ${BACKUP_DIR} -name "backup_*.gz" -mtime +7 -delete

echo "✅ Backup created: ${BACKUP_FILE}"
```

```bash
chmod +x /opt/tsrid-app/backup.sh
```

### 10.2 Auto-Backup Cron

```bash
# Backup jeden Tag um 2 Uhr
crontab -e

# Hinzufügen:
0 2 * * * /opt/tsrid-app/backup.sh >> /var/log/tsrid-backup.log 2>&1
```

---

## 🔥 Schnell-Start Kommandos:

```bash
# Deploy
cd /opt/tsrid-app && ./deploy.sh

# Logs
docker-compose logs -f

# Status
docker ps

# Neustart
docker-compose restart

# Stoppen
docker-compose down

# Komplett neu bauen
docker-compose down && docker-compose build && docker-compose up -d

# Backup
./backup.sh
```

---

## 🎯 Checkliste:

- [ ] Hetzner Server erstellt
- [ ] Domain konfiguriert (DNS)
- [ ] Docker installiert
- [ ] Projekt von GitHub gecloned
- [ ] .env.production erstellt
- [ ] Dockerfiles erstellt
- [ ] docker-compose.yml erstellt
- [ ] SSL-Zertifikate erstellt
- [ ] Nginx konfiguriert
- [ ] Erste Deployment durchgeführt
- [ ] Health-Check OK
- [ ] Deploy-Script getestet
- [ ] Backup-System eingerichtet

---

## 💰 Kosten:

**Hetzner Server CPX21:**
- 8,21€/Monat
- 3 vCPU, 4GB RAM, 80GB SSD
- 20TB Traffic

**vs. Emergent:**
- Keine laufenden Kosten
- Volle Kontrolle
- Eigene Domain
- Unbegrenzte Nutzer

**ROI: < 1 Monat**

---

## 🚀 Ready to Deploy!

Folgen Sie den Phasen 1-10 und Ihre App läuft autark auf Hetzner! 🎉
