#!/bin/bash

echo "Wechsel zu DHL Sandbox..."

# Backup current .env
cp /app/backend/.env /app/backend/.env.production

# Switch URLs to sandbox
sed -i 's|DHL_BASE_URL=https://api-eu.dhl.com|DHL_BASE_URL=https://api-sandbox.dhl.com|g' /app/backend/.env
sed -i 's|DHL_AUTH_API_URL=https://api-eu.dhl.com|DHL_AUTH_API_URL=https://api-sandbox.dhl.com|g' /app/backend/.env

echo "✅ .env aktualisiert für Sandbox"
echo ""
echo "Neue URLs:"
grep "DHL_BASE_URL\|DHL_AUTH_API_URL" /app/backend/.env

echo ""
echo "Backend wird neu gestartet..."
sudo supervisorctl restart backend
sleep 5

echo ""
echo "Test mit Sandbox..."
curl -s "https://offline-agent.preview.emergentagent.com/api/dhl/health" | jq '.'

