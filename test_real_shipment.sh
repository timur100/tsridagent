#!/bin/bash

API_URL="https://bundle-inventory-pro.preview.emergentagent.com/api/dhl"

echo "=== DHL PRODUKTIV-API Test mit Ihren Credentials ==="
echo ""
echo "🔑 Credentials: tsrtechnologies"
echo "📦 EKP: 6310618144"
echo "💳 Abrechnungsnummer: 63106181440102"
echo ""
echo "---"
echo ""

echo "1️⃣ Health Check..."
curl -s "$API_URL/health" | jq -r '"Status: " + .mode + " | Token: " + (.has_token | tostring)'
echo ""
echo "---"
echo ""

echo "2️⃣ Creating REAL Test Shipment..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "TEST-PROD-001",
    "sender_name": "TSR Technologies",
    "sender_phone": "+491234567890",
    "sender_email": "versand@tsr.de",
    "sender_street": "Hauptstraße",
    "sender_house_number": "10",
    "sender_postal_code": "10115",
    "sender_city": "Berlin",
    "receiver_name": "Max Mustermann",
    "receiver_phone": "+49987654321",
    "receiver_email": "max@example.com",
    "receiver_street": "Berliner Straße",
    "receiver_house_number": "42",
    "receiver_postal_code": "80331",
    "receiver_city": "München",
    "receiver_country_code": "DE",
    "package_weight_grams": 1500,
    "package_length_cm": 25,
    "package_width_cm": 20,
    "package_height_cm": 10,
    "package_description": "Testpaket - Elektronik",
    "service_type": "V01PAK"
  }')

echo "$RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
    echo "🎉 =========================================="
    echo "✅ SUCCESS: Echte DHL-Sendung erstellt!"
    echo "🎉 =========================================="
    echo ""
    SHIPMENT_NO=$(echo "$RESPONSE" | jq -r '.shipment_number')
    TRACKING_URL=$(echo "$RESPONSE" | jq -r '.tracking_url')
    LABEL_URL=$(echo "$RESPONSE" | jq -r '.label_url')
    
    echo "📦 Sendungsnummer: $SHIPMENT_NO"
    echo "🔗 Tracking: $TRACKING_URL"
    echo "🏷️  Label: $LABEL_URL"
    echo ""
    echo "⚠️  WICHTIG: Dies ist eine ECHTE Sendung in der Produktiv-Umgebung!"
else
    echo "❌ Sendung konnte nicht erstellt werden"
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    echo "Fehler: $MESSAGE"
fi
