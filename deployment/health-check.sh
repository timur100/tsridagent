#!/bin/bash

# TSRID Health Check Script

echo "==========================================="
echo "  🏥 TSRID Health Check"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check containers
echo "📦 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep tsrid || echo -e "${RED}No TSRID containers running${NC}"
echo ""

# Check endpoints
echo "🌐 Endpoint Health:"

# Get domain from env file
if [ -f "backend/.env.production" ]; then
    DOMAIN=$(grep FRONTEND_URL backend/.env.production | cut -d= -f2 | sed 's/https:\/\///')
fi

if [ ! -z "$DOMAIN" ]; then
    # Check frontend
    if curl -f "https://$DOMAIN" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend OK${NC} (https://$DOMAIN)"
    else
        echo -e "${RED}✗ Frontend FAIL${NC} (https://$DOMAIN)"
    fi
    
    # Check backend
    API_DOMAIN="api.${DOMAIN#*.}"
    if curl -f "https://$API_DOMAIN/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend OK${NC} (https://$API_DOMAIN)"
    else
        echo -e "${RED}✗ Backend FAIL${NC} (https://$API_DOMAIN)"
    fi
else
    echo -e "${YELLOW}⚠  Domain not configured${NC}"
fi

echo ""

# Check disk usage
echo "💾 Disk Usage:"
df -h / | tail -1
echo ""

# Check memory
echo "🧠 Memory Usage:"
free -h | grep Mem
echo ""

# Check docker volumes
echo "📦 Docker Volumes:"
docker volume ls | grep tsrid || echo "No volumes found"
echo ""

# Check logs for errors
echo "📝 Recent Errors (last 10):"
docker-compose logs --tail=100 2>&1 | grep -i error | tail -10 || echo "No recent errors"
echo ""

echo "==========================================="
echo "  ✅ Health Check Complete"
echo "==========================================="
