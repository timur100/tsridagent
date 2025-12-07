#!/bin/bash

API_URL="https://fleet-genius-9.preview.emergentagent.com/api/dhl"

echo "=== DHL Live API Test mit aktiven Keys ==="
echo ""

echo "1️⃣ API Status prüfen..."
curl -s "$API_URL/health" | jq -r '"Mode: " + .mode + " | Token: " + (.has_token | tostring)'
echo ""
echo "---"
echo ""

echo "2️⃣ Test-Sendung erstellen..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "TEST-LIVE-001",
    "sender_name": "TSR Technologies GmbH",
    "sender_phone": "+4930123456",
    "sender_email": "versand@tsr.de",
    "sender_street": "Hauptstraße",
    "sender_house_number": "10",
    "sender_postal_code": "10115",
    "sender_city": "Berlin",
    "receiver_name": "Max Mustermann",
    "receiver_phone": "+49987654321",
    "receiver_email": "max@example.com",
    "receiver_street": "Teststraße",
    "receiver_house_number": "42",
    "receiver_postal_code": "80331",
    "receiver_city": "München",
    "receiver_country_code": "DE",
    "package_weight_grams": 2000,
    "package_length_cm": 30,
    "package_width_cm": 20,
    "package_height_cm": 15,
    "package_description": "Test-Sendung",
    "service_type": "V01PAK"
  }')

echo "$RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
    echo "🎉 =========================================="
    echo "✅ ERFOLG: Echte DHL-Sendung erstellt!"
    echo "🎉 =========================================="
    echo ""
    SHIPMENT_NO=$(echo "$RESPONSE" | jq -r '.shipment_number')
    TRACKING_URL=$(echo "$RESPONSE" | jq -r '.tracking_url')
    LABEL_URL=$(echo "$RESPONSE" | jq -r '.label_url')
    
    echo "📦 Sendungsnummer: $SHIPMENT_NO"
    echo "🔗 Tracking: $TRACKING_URL"
    echo "🏷️  Label: $LABEL_URL"
    echo ""
    echo "⚠️  WICHTIG: Dies ist eine ECHTE Sendung!"
    echo "   Sie wurde bei DHL registriert und in der Datenbank gespeichert."
else
    echo "❌ Sendung konnte nicht erstellt werden"
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    echo "Fehler: $MESSAGE"
    echo ""
    echo "Mögliche Gründe:"
    echo "1. Production Access noch nicht freigegeben"
    echo "2. Abrechnungsnummer nicht aktiviert"
    echo "3. Zusätzliche Felder benötigt"
fi

echo ""
echo "---"
echo ""
echo "📊 Aktuelle Sendungen in Datenbank:"
curl -s "$API_URL/shipments/stats/summary" | jq '.statistics'

