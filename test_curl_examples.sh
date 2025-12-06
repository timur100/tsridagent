#!/bin/bash

# Regula Webhook Test mit curl
# Führen Sie diese Befehle aus, um die Webhook-Integration zu testen

API_KEY="G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg"
WEBHOOK_URL="https://asset-manager-hub.preview.emergentagent.com/api/webhooks/regula-scan"

echo "🧪 Regula Webhook Tests mit curl"
echo "================================"
echo ""

# Test 1: Vorderseite
echo "📤 Test 1: Vorderseite senden..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "ChoosenDoctype_Data": {
      "DOC_DOCUMENT_TYPE_DATA": {
        "PageIndex": "0",
        "Info": {
          "DateTime": "2025-11-23T12:09:06.000",
          "TransactionID": "curl-test-transaction-123",
          "ComputerName": "TEST-COMPUTER",
          "UserName": "testuser",
          "DeviceType": "DESKO Penta Scanner"
        },
        "Document_Candidate": {
          "DocumentName": "Germany - Driving License (2013)",
          "ID": "-1539142713"
        }
      }
    },
    "Text_Data": {
      "ContainerList": {
        "List": {
          "Container_Text": [{
            "fieldList": [
              {"fieldType": "0", "valueList": [{"value": "MUSTERMANN"}]},
              {"fieldType": "1", "valueList": [{"value": "ERIKA"}]},
              {"fieldType": "3", "valueList": [{"value": "15.08.1985"}]},
              {"fieldType": "5", "valueList": [{"value": "D123456789"}]}
            ]
          }]
        }
      }
    },
    "tenant_id": "curl-test",
    "tenant_name": "Curl Test"
  }' | jq

echo ""
echo "⏳ Warte 2 Sekunden..."
sleep 2
echo ""

# Test 2: Rückseite (wird mit Vorderseite verknüpft)
echo "📤 Test 2: Rückseite senden (sollte verknüpft werden)..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "ChoosenDoctype_Data": {
      "DOC_DOCUMENT_TYPE_DATA": {
        "PageIndex": "1",
        "Info": {
          "DateTime": "2025-11-23T12:09:06.266",
          "TransactionID": "curl-test-transaction-123",
          "DeviceType": "DESKO Penta Scanner"
        },
        "Document_Candidate": {
          "DocumentName": "Germany - Driving License (2013) Side B",
          "ID": "-1387128715"
        }
      }
    },
    "Status_Data": {
      "Status": {
        "overallStatus": 1,
        "optical": 1,
        "detailsOptical": {
          "text": 1,
          "docType": 1,
          "security": 1,
          "expiry": 1
        }
      }
    },
    "tenant_id": "curl-test"
  }' | jq

echo ""
echo "✅ Tests abgeschlossen!"
echo ""
echo "📊 Prüfen Sie die Ergebnisse in der Datenbank:"
echo "mongosh mongodb://localhost:27017/main_db --eval \"db.id_scans.find({'regula_metadata.transaction_id': 'curl-test-transaction-123'}).pretty()\""
