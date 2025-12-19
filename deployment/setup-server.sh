#!/bin/bash

# TSRID Asset Management - Hetzner Server Setup
# Run this script on your Hetzner server

set -e

echo "==========================================="
echo "  🖥️  TSRID Server Setup"
echo "==========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit 1
fi

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
apt install -y curl git vim htop ufw certbot

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✓ Docker Compose installed"
else
    echo "✓ Docker Compose already installed"
fi

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "✓ Firewall configured"

# Create project directory
echo "📁 Creating project directory..."
mkdir -p /opt/tsrid-app
cd /opt/tsrid-app

# Prompt for GitHub repo
echo ""
echo "==========================================="
read -p "Enter your GitHub repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ No repository URL provided"
    exit 1
fi

echo "📥 Cloning repository..."
git clone "$REPO_URL" .

# Prompt for domain
echo ""
echo "==========================================="
read -p "Enter your domain (e.g., desk-manager.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ No domain provided"
    exit 1
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p nginx/ssl mongo-backup logs

# Generate secret key
echo "🔐 Generating secret key..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Create backend .env
echo "📝 Creating backend .env.production..."
cat > backend/.env.production << EOF
# MongoDB
MONGO_URL=mongodb://mongo:27017/verification_db
DB_NAME=verification_db

# Security
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=https://${DOMAIN}

# Production
ENVIRONMENT=production
DEBUG=false
EOF

# Create frontend .env
echo "📝 Creating frontend .env.production..."
cat > frontend/.env.production << EOF
REACT_APP_BACKEND_URL=https://api.${DOMAIN}
EOF

echo ""
echo "==========================================="
echo "✅ Server setup complete!"
echo "==========================================="
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS: A record for ${DOMAIN} → YOUR_SERVER_IP"
echo "2. Configure DNS: A record for api.${DOMAIN} → YOUR_SERVER_IP"
echo "3. Wait for DNS propagation (5-30 minutes)"
echo "4. Run: certbot certonly --standalone -d ${DOMAIN} -d api.${DOMAIN}"
echo "5. Copy certificates: cp /etc/letsencrypt/live/${DOMAIN}/*.pem /opt/tsrid-app/nginx/ssl/"
echo "6. Run: cd /opt/tsrid-app && ./deployment/deploy.sh"
echo ""
echo "📖 Full guide: /opt/tsrid-app/HETZNER_DEPLOYMENT_GUIDE.md"
echo ""