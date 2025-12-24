# 🧪 DHL Sandbox Testing Guide

## ✅ Aktuelle Status
- **API-Verbindung**: ✓ LIVE (OAuth2 funktioniert)
- **Health Check**: ✓ Erfolgreich
- **Backend**: ✓ Läuft auf Port 8001

---

## 🔑 Verfügbare Sandbox-Abrechnungsnummern

Laut DHL-Dokumentation sind folgende Test-Abrechnungsnummern in der Sandbox verfügbar:

| Produkt | Abrechnungsnummer | Service |
|---------|-------------------|---------|
| DHL Paket | 3333333333 | Standardversand |
| DHL Paket (mit GoGreen) | 3333333333 | Umweltfreundlicher Versand |

**Wichtig**: Für vollständige Tests benötigen Sie einen registrierten DHL Developer Account mit freigeschalteten Sandbox-Credentials!

---

## 🚀 Testing-Optionen

### Option 1: Browser-Test (Einfachste Methode)

1. **Öffnen Sie in Ihrem Browser**:
   ```
   https://sync-mongo.preview.emergentagent.com/portal/admin
   ```

2. **Login**:
   - Username: `admin@tsrid.com`
   - Password: `admin123`

3. **Navigieren Sie zu**:
   - Klicken Sie auf "R&D" Tab
   - Scrollen Sie im Sidebar nach unten zu "Paketversand"
   - Klicken Sie auf "DHL"

4. **Testen Sie die UI**:
   - Sehen Sie die Mock-Sendungen
   - Erstellen Sie Test-Sendungen über das Interface

---

### Option 2: API-Test mit curl

#### 1. Health Check
```bash
curl -s "https://sync-mongo.preview.emergentagent.com/api/dhl/health" | jq
```

**Erwartetes Ergebnis**:
```json
{
  "success": true,
  "message": "DHL API connection healthy - using live API",
  "has_token": true,
  "mode": "live"
}
```

#### 2. Mock-Daten abrufen
```bash
curl -s "https://sync-mongo.preview.emergentagent.com/api/dhl/shipments/mock" | jq
```

#### 3. Test-Sendung erstellen (Sandbox)
```bash
curl -X POST "https://sync-mongo.preview.emergentagent.com/api/dhl/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "TEST-001",
    "sender_name": "Test Firma GmbH",
    "sender_phone": "+491234567890",
    "sender_email": "test@firma.de",
    "sender_street": "Teststraße",
    "sender_house_number": "1",
    "sender_postal_code": "10115",
    "sender_city": "Berlin",
    "receiver_name": "Max Mustermann",
    "receiver_phone": "+49987654321",
    "receiver_email": "max@test.de",
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
  }' | jq
```

---

### Option 3: Postman Collection verwenden

1. **Download DHL Postman Collection**:
   - Gehen Sie zu: https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
   - Laden Sie die Postman Collection herunter

2. **Importieren Sie in Postman**:
   - Öffnen Sie Postman
   - File → Import → Collection importieren

3. **Konfigurieren Sie die Environment Variables**:
   ```
   client_id: ck5lWqryY9CcpsWMlDi5u1aCOzmK4Apo
   client_secret: FxWOQTAGMj0P2AYE
   base_url: https://api-sandbox.dhl.com/parcel/de/shipping/v2
   ```

4. **Führen Sie die Beispiele aus**

---

## 🎯 Was Sie testen können

### ✅ Aktuell funktionierend:
- ✓ OAuth2 Authentifizierung
- ✓ Token-Generierung und Caching
- ✓ Health Check Endpoint
- ✓ Mock-Daten Endpoint

### ⚠️ Benötigt valide Sandbox-Daten:
- Sendung erstellen (braucht korrekte Abrechnungsnummer)
- Label generieren
- Tracking abrufen

---

## 🔧 Für vollständige Tests benötigen Sie:

### 1. Registrierung bei DHL Developer Portal
1. Gehen Sie zu: https://developer.dhl.com
2. Erstellen Sie einen Account
3. Erstellen Sie eine neue APP
4. Fügen Sie "DHL Paket DE Versenden API" hinzu
5. Warten Sie auf die Freigabe (1-3 Werktage)

### 2. Ihre eigenen API-Credentials
Nach der Freigabe erhalten Sie:
- Ihren persönlichen API Key
- Ihren persönlichen API Secret
- Zugriff auf Sandbox mit Ihren GKP-Daten

### 3. Aktualisieren Sie die Backend-Config
```bash
# In /app/backend/.env
DHL_API_KEY=IHR_API_KEY
DHL_API_SECRET=IHR_API_SECRET
```

---

## 📊 Sandbox-Testdaten (aus DHL-Dokumentation)

### Beispiel-Adressen für Tests:

**Absender (Deutschland)**:
```
Name: Test Firma GmbH
Straße: Teststraße 1
PLZ: 10115
Stadt: Berlin
Land: DE
```

**Empfänger (Deutschland)**:
```
Name: Max Mustermann
Straße: Hauptstraße 123
PLZ: 80331
Stadt: München
Land: DE
```

**Empfänger (Österreich)**:
```
Name: Anna Schmidt
Straße: Wiener Straße 45
PLZ: 1010
Stadt: Wien
Land: AT
```

### Beispiel-Paketdaten:
- Gewicht: 500g - 31.5kg
- Maße: Min 15x11x1cm, Max 120x60x60cm
- Service: "V01PAK" (DHL Paket)

---

## 🐛 Troubleshooting

### Problem: 401 Unauthorized bei Sendungserstellung
**Lösung**: Sie benötigen gültige Sandbox-Abrechnungsnummern. Diese erhalten Sie nach Registrierung im DHL Developer Portal.

### Problem: "RF-UndefinedResource" Error
**Lösung**: Die verwendeten API-Credentials sind Demo-Credentials. Registrieren Sie sich für echte Sandbox-Zugangsdaten.

### Problem: Token abgelaufen
**Lösung**: Der Token wird automatisch erneuert. Warten Sie 5 Sekunden und versuchen Sie es erneut.

---

## 📚 Weiterführende Dokumentation

- **DHL Developer Portal**: https://developer.dhl.com
- **API-Referenz**: https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
- **Authentication Guide**: https://developer.dhl.com/api-reference/authentication-api-post-parcel-germany
- **Support**: https://support-developer.dhl.com

---

## ✅ Schnell-Checkliste für vollständige Tests

- [ ] DHL Developer Account erstellt
- [ ] APP im Developer Portal registriert
- [ ] Sandbox-Zugang beantragt und erhalten
- [ ] Eigene API-Credentials in .env eingetragen
- [ ] Backend neu gestartet
- [ ] Health Check zeigt "live mode"
- [ ] Test-Sendung erfolgreich erstellt
- [ ] Label heruntergeladen
- [ ] Tracking getestet

---

**Hinweis**: Die aktuellen API-Credentials sind Beispiel-Credentials aus der Dokumentation. Für vollständige Tests müssen Sie sich bei DHL registrieren und Ihre eigenen Credentials erhalten!
