#!/bin/bash

# TSRID Asset Management - Auto Deploy Script
# Usage: ./deploy.sh

set -e

echo "==========================================="
echo "  🚀 TSRID Deployment Starting..."
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo -e "${YELLOW}📂 Project directory: $PROJECT_DIR${NC}"
echo ""

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
if git pull origin main; then
    echo -e "${GREEN}✓ Code updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to pull code${NC}"
    exit 1
fi
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml not found!${NC}"
    exit 1
fi

# Build containers
echo -e "${YELLOW}🏗️  Building containers...${NC}"
if docker-compose build --no-cache; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Stop old containers
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker-compose down
echo ""

# Start new containers
echo -e "${YELLOW}🚀 Starting new containers...${NC}"
if docker-compose up -d; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}✗ Failed to start containers${NC}"
    exit 1
fi
echo ""

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check if containers are running
CONTAINERS=$(docker-compose ps -q)
if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}✗ No containers running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All containers running${NC}"

# Check backend health
if command -v curl &> /dev/null; then
    echo "Checking backend health..."
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend health check passed${NC}"
    else
        echo -e "${YELLOW}⚠  Backend health check failed (might need more time)${NC}"
    fi
fi

echo ""
echo "==========================================="
echo -e "  ${GREEN}✅ Deployment Complete!${NC}"
echo "==========================================="
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🔄 Restart with: docker-compose restart"
echo "🛑 Stop with: docker-compose down"
echo ""