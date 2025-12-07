#!/bin/bash

# DHL Sandbox Testing Script
API_URL="https://hardware-check.preview.emergentagent.com/api/dhl"

echo "=== DHL Sandbox Testing ==="
echo ""

# 1. Health Check
echo "1️⃣ Testing DHL API Connection..."
curl -s "$API_URL/health" | jq '.'
echo ""
echo "---"
echo ""

# 2. Get Mock Shipments (to see data structure)
echo "2️⃣ Getting Mock Shipments (example data)..."
curl -s "$API_URL/shipments/mock" | jq '.'
echo ""
echo "---"
echo ""

# 3. Create a Test Shipment
echo "3️⃣ Creating a Test Shipment..."
curl -X POST "$API_URL/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "TEST-2024-001",
    "sender_name": "Test Firma GmbH",
    "sender_phone": "+491234567890",
    "sender_email": "sender@test.de",
    "sender_street": "Teststraße",
    "sender_house_number": "1",
    "sender_postal_code": "10115",
    "sender_city": "Berlin",
    "receiver_name": "Max Mustermann",
    "receiver_phone": "+49987654321",
    "receiver_email": "max@example.com",
    "receiver_street": "Hauptstraße",
    "receiver_house_number": "123",
    "receiver_postal_code": "80331",
    "receiver_city": "München",
    "receiver_country_code": "DE",
    "package_weight_grams": 2500,
    "package_length_cm": 30,
    "package_width_cm": 20,
    "package_height_cm": 15,
    "package_description": "Test Paket",
    "service_type": "V01PAK"
  }' | jq '.'

echo ""
echo "---"
echo ""
echo "✅ Testing completed!"
echo ""
echo "💡 Tipps:"
echo "- Verwenden Sie die Sandbox-Abrechnungsnummern aus der DHL-Dokumentation"
echo "- Alle Sendungen werden NICHT physisch versendet (Sandbox!)"
echo "- Sie können beliebige Test-Adressen verwenden"
