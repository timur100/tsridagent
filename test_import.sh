#!/bin/bash

API_URL="https://asset-tracker-270.preview.emergentagent.com/api/dhl"

echo "=== DHL Sendungs-Import Test ==="
echo ""

echo "1️⃣ Import-Info abrufen..."
curl -s -X POST "$API_URL/shipments/import" | jq '.'
echo ""
echo "---"
echo ""

echo "2️⃣ Einzelne Sendung importieren (Test mit ungültiger Nummer)..."
curl -s -X POST "$API_URL/shipments/import/TEST123456" | jq '.'
echo ""

