#!/bin/bash
# ===========================================
# TSRID Microservices - Atlas Setup Script
# Single Source of Truth Konfiguration
# ===========================================

set -e

echo "🚀 TSRID Microservices Atlas Setup"
echo "=================================="

# Atlas Connection String (URL-encoded)
ATLAS_URL="mongodb+srv://timuremergent:Karaman%231976%21@cluster0.fv0aj6r.mongodb.net/?retryWrites=true&w=majority"

# Base directory
BASE_DIR="/opt/deployments/TSRID.FULL"
BACKEND_DIR="$BASE_DIR/backend"
SERVICES_DIR="$BACKEND_DIR/services"

# Check if directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Verzeichnis $BACKEND_DIR existiert nicht!"
    echo "   Bitte zuerst den Code von GitHub klonen."
    exit 1
fi

echo ""
echo "📝 Aktualisiere .env Dateien..."

# Main Backend
cat > "$BACKEND_DIR/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=tsrid_db
REACT_APP_BACKEND_URL=https://tsrid.cloudnetwrx.com
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=*
EOF
echo "✅ Main Backend -> tsrid_db"

# Auth Service
mkdir -p "$SERVICES_DIR/auth_service"
cat > "$SERVICES_DIR/auth_service/.env" << EOF
SERVICE_NAME=Auth & Identity Service
SERVICE_PORT=8100
SERVICE_TYPE=auth
MONGO_URL=$ATLAS_URL
MONGO_DB_NAME=auth_db
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=RS256
ADMIN_EMAIL=admin@tsrid.com
ADMIN_PASSWORD=admin123
EOF
echo "✅ Auth Service -> auth_db"

# Ticketing Service
mkdir -p "$SERVICES_DIR/ticketing_service"
cat > "$SERVICES_DIR/ticketing_service/.env" << EOF
SERVICE_NAME=Ticketing Service
SERVICE_PORT=8103
SERVICE_TYPE=ticketing
MONGO_URL=$ATLAS_URL
MONGO_DB_NAME=ticketing_db
JWT_SECRET=your-secret-key-change-in-production
EOF
echo "✅ Ticketing Service -> ticketing_db"

# Inventory Service
mkdir -p "$SERVICES_DIR/inventory_service"
cat > "$SERVICES_DIR/inventory_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=inventory_db
SERVICE_PORT=8102
SERVICE_NAME=Inventory Service
EOF
echo "✅ Inventory Service -> inventory_db"

# Device Service
mkdir -p "$SERVICES_DIR/device_service"
cat > "$SERVICES_DIR/device_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=device_db
SERVICE_PORT=8104
SERVICE_NAME=Device Service
EOF
echo "✅ Device Service -> device_db"

# Location Service
mkdir -p "$SERVICES_DIR/location_service"
cat > "$SERVICES_DIR/location_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=location_db
SERVICE_PORT=8105
SERVICE_NAME=Location Service
EOF
echo "✅ Location Service -> location_db"

# Customer Service
mkdir -p "$SERVICES_DIR/customer_service"
cat > "$SERVICES_DIR/customer_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=customer_db
SERVICE_PORT=8107
SERVICE_NAME=Customer Service
EOF
echo "✅ Customer Service -> customer_db"

# Order Service
mkdir -p "$SERVICES_DIR/order_service"
cat > "$SERVICES_DIR/order_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=order_db
SERVICE_PORT=8106
SERVICE_NAME=Order Service
EOF
echo "✅ Order Service -> order_db"

# License Service
mkdir -p "$SERVICES_DIR/license_service"
cat > "$SERVICES_DIR/license_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=license_db
SERVICE_PORT=8108
SERVICE_NAME=License Service
EOF
echo "✅ License Service -> license_db"

# Settings Service
mkdir -p "$SERVICES_DIR/settings_service"
cat > "$SERVICES_DIR/settings_service/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=settings_db
SERVICE_PORT=8109
SERVICE_NAME=Settings Service
EOF
echo "✅ Settings Service -> settings_db"

# ID Verification Service
mkdir -p "$SERVICES_DIR/id_verification"
cat > "$SERVICES_DIR/id_verification/.env" << EOF
MONGO_URL=$ATLAS_URL
DB_NAME=verification_db
SERVICE_PORT=8101
SERVICE_NAME=ID Verification Service
EOF
echo "✅ ID Verification -> verification_db"

echo ""
echo "✅ Alle .env Dateien wurden aktualisiert!"
echo ""
echo "📊 Konfiguration:"
echo "   Main Backend  -> tsrid_db"
echo "   Auth Service  -> auth_db"
echo "   Ticketing     -> ticketing_db"
echo "   Inventory     -> inventory_db"
echo "   Device        -> device_db"
echo "   Location      -> location_db"
echo "   Customer      -> customer_db"
echo "   Order         -> order_db"
echo "   License       -> license_db"
echo "   Settings      -> settings_db"
echo "   Verification  -> verification_db"
echo ""
echo "🔄 Nächster Schritt:"
echo "   cd $BASE_DIR && docker compose up -d --build"
