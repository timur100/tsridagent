#!/bin/bash

API_URL="https://timetrack-connect.preview.emergentagent.com/api/dhl"

echo "=== DHL Live Sandbox Test mit Ihren Credentials ==="
echo ""

# 1. Health Check
echo "1️⃣ Checking API Status..."
curl -s "$API_URL/health" | jq -r '"Status: " + .mode + " | Message: " + .message'
echo ""
echo "---"
echo ""

# 2. Test mit echtem DHL API Format (Sandbox-Abrechnungsnummer)
echo "2️⃣ Creating Test Shipment mit DHL Sandbox..."
echo "   (Using billing number: 3333333333 01 - DHL Paket)"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "TEST-DHL-001",
    "sender_name": "Test Firma GmbH",
    "sender_phone": "+491234567890",
    "sender_email": "test@firma.de",
    "sender_street": "Schildergasse",
    "sender_house_number": "72",
    "sender_postal_code": "50667",
    "sender_city": "Köln",
    "receiver_name": "Max Mustermann",
    "receiver_phone": "+49987654321",
    "receiver_email": "max.mustermann@example.com",
    "receiver_street": "Hauptstraße",
    "receiver_house_number": "123",
    "receiver_postal_code": "80331",
    "receiver_city": "München",
    "receiver_country_code": "DE",
    "package_weight_grams": 2500,
    "package_length_cm": 30,
    "package_width_cm": 20,
    "package_height_cm": 15,
    "package_description": "Testpaket - Elektronik",
    "service_type": "V01PAK"
  }')

echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
    echo "✅ SUCCESS: Sendung erfolgreich erstellt!"
    SHIPMENT_NO=$(echo "$RESPONSE" | jq -r '.shipment_number')
    TRACKING_URL=$(echo "$RESPONSE" | jq -r '.tracking_url')
    echo ""
    echo "📦 Sendungsnummer: $SHIPMENT_NO"
    echo "🔗 Tracking URL: $TRACKING_URL"
else
    echo "⚠️  Sendung konnte nicht erstellt werden"
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    echo "Grund: $MESSAGE"
    echo ""
    echo "💡 Hinweis: Für echte Sendungserstellung benötigen Sie:"
    echo "   - Einen registrierten DHL Developer Account"
    echo "   - Zugewiesene Abrechnungsnummern (EKP)"
    echo "   - GKP Benutzer-Zugangsdaten"
fi

echo ""
echo "---"
echo ""
echo "📚 Weitere Informationen: /app/QUICK_START.md"
