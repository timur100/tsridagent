# 🚀 DHL Sandbox - Schnellstart

## ✅ Sofort testbar (ohne zusätzliche Registrierung)

### 1️⃣ API Health Check (zeigt, dass OAuth2 funktioniert)
```bash
curl "https://fleet-rental-sys.preview.emergentagent.com/api/dhl/health"
```

**Erwartetes Ergebnis**: `"mode": "live"` ✓

---

### 2️⃣ Mock-Daten abrufen (zeigt Datenstruktur)
```bash
curl "https://fleet-rental-sys.preview.emergentagent.com/api/dhl/shipments/mock"
```

**Erwartetes Ergebnis**: 3 Test-Sendungen mit allen Details

---

### 3️⃣ Frontend-Test im Browser

**URL öffnen**:
```
https://fleet-rental-sys.preview.emergentagent.com/portal/admin
```

**Login**:
- Username: `admin@tsrid.com`
- Password: `admin123`

**Navigation**:
1. Klicken Sie auf "R&D" Tab (oben)
2. Scrollen Sie im Sidebar nach unten
3. Finden Sie "Paketversand" Kategorie
4. Klicken Sie auf "DHL" 📦

**Was Sie sehen**:
- ✅ Übersicht mit Statistiken (Gesamt, Unterwegs, Zugestellt, Ausstehend)
- ✅ Tabs: Übersicht, Sendungsverfolgung, Neue Sendung, Historie, Einstellungen
- ✅ Tabelle mit 3 Mock-Sendungen
- ✅ Funktionen zum Erstellen neuer Sendungen

---

## 🎯 Was aktuell funktioniert

### ✅ Backend (voll funktionsfähig):
- OAuth2-Authentifizierung mit DHL Sandbox
- Token-Management (automatische Erneuerung)
- Health-Check-Endpoint
- Mock-Daten-Endpoint
- Shipment-Creation-Endpoint (bereit)

### ✅ Frontend (voll funktionsfähig):
- DHL-Seite mit vollem UI
- Statistik-Dashboard
- Sendungsverwaltung
- Tabellen-Ansicht
- Navigation & Routing

---

## 🔐 Für ECHTE Sendungen benötigen Sie:

### Schritt 1: DHL Developer Account
1. Gehen Sie zu https://developer.dhl.com
2. Erstellen Sie kostenlosen Account
3. Verifizieren Sie Ihre Email

### Schritt 2: APP erstellen
1. Im Developer Portal: "Create New APP"
2. Fügen Sie "DHL Paket DE Versenden API" hinzu
3. Wählen Sie "Customer (Integration) Testing" (Sandbox)

### Schritt 3: Credentials erhalten
Nach 1-3 Werktagen erhalten Sie:
- Ihren API Key
- Ihren API Secret
- Zugang zu Sandbox mit echten Test-Abrechnungsnummern

### Schritt 4: Credentials einsetzen
Ersetzen Sie in `/app/backend/.env`:
```env
DHL_API_KEY=IHR_ECHTER_API_KEY
DHL_API_SECRET=IHR_ECHTES_API_SECRET
```

Restart Backend:
```bash
sudo supervisorctl restart backend
```

### Schritt 5: Testen Sie echte Sendungen!
Jetzt können Sie:
- ✅ Echte Test-Sendungen erstellen
- ✅ DHL-Labels generieren (PDF)
- ✅ Tracking-Informationen abrufen
- ✅ Alle DHL-Services testen

---

## 📊 Beispiel-Request für echte Sendung

```bash
curl -X POST "https://fleet-rental-sys.preview.emergentagent.com/api/dhl/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "ORDER-12345",
    "sender_name": "Ihre Firma GmbH",
    "sender_phone": "+491234567890",
    "sender_email": "versand@ihre-firma.de",
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
    "package_description": "Elektronik",
    "service_type": "V01PAK"
  }'
```

**Hinweis**: Dies funktioniert NUR mit gültigen Sandbox-Credentials!

---

## 💡 Wichtige Links

- **Developer Portal**: https://developer.dhl.com
- **API-Dokumentation**: https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
- **Support**: https://support-developer.dhl.com
- **Detaillierte Testing-Anleitung**: Siehe `/app/DHL_SANDBOX_TESTING.md`

---

## ✅ Zusammenfassung

**Was läuft JETZT**:
- ✓ Backend mit DHL OAuth2 verbunden
- ✓ Frontend-UI vollständig funktionsfähig
- ✓ Mock-Daten für Entwicklung verfügbar
- ✓ Infrastruktur bereit für echte Sendungen

**Was Sie für echte Tests brauchen**:
- DHL Developer Account (kostenlos!)
- APP-Registrierung (5 Minuten)
- Freigabe abwarten (1-3 Werktage)
- Credentials einsetzen (30 Sekunden)

**Dann können Sie**:
- Echte Test-Labels erstellen
- Sendungen tracken
- Vollständige DHL-Integration testen
