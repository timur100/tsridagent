#!/bin/bash

API_URL="https://device-portal-4.preview.emergentagent.com/api/dhl"

echo "=== DHL Sendungshistorie testen ==="
echo ""

echo "1️⃣ Alle Sendungen abrufen..."
curl -s "$API_URL/shipments" | jq '.'
echo ""
echo "---"
echo ""

echo "2️⃣ Statistiken abrufen..."
curl -s "$API_URL/shipments/stats/summary" | jq '.'
echo ""
echo "---"
echo ""

echo "✅ Test abgeschlossen!"
