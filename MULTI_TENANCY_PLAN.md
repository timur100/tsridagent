# Multi-Tenancy Migration Plan

## Ziel
SaaS-System mit vielen Kunden, wobei jeder Kunde viele Standorte weltweit haben kann.

## Architektur-Entscheidung: Hybrid-Ansatz (Option C)

### Globale Collections (Shared)
- `customers` - Kundenliste (Firmen)
- `users` - Alle User mit customer_id Zuordnung
- `system_settings` - Globale System-Einstellungen
- `integrations` (optional) - Shared API-Keys

### Tenant-spezifische Collections (mit customer_id)
- `europcar_stations` → `locations` (customer_id)
- `tickets` (customer_id)
- `devices` (customer_id)
- `orders` (customer_id)
- `components` (customer_id)
- `eurobox` (customer_id)
- `employees` (customer_id)
- `software_licenses` (customer_id)

### User-Rollen
1. **super_admin** - Kann alle Kunden sehen/verwalten
2. **customer_admin** - Kann nur eigenen Kunden verwalten
3. **employee** - Normaler Mitarbeiter im Kunden-Kontext
4. **customer_user** - Endkunde (Portal-Zugang)

## Datenbank Schema Änderungen

### Neue Collection: `customers`
```javascript
{
  id: "uuid",
  name: "Europcar Deutschland",
  domain: "europcar.de",
  logo_url: "",
  settings: {
    branding: { ... },
    features_enabled: ["tickets", "catalog", "kiosk"]
  },
  created_at: "2024-01-01",
  active: true
}
```

### Erweiterte `users` Collection
```javascript
{
  id: "uuid",
  email: "admin@europcar.de",
  password_hash: "...",
  role: "customer_admin", // super_admin | customer_admin | employee | customer_user
  customer_id: "customer-uuid", // null für super_admin
  name: "Max Mustermann",
  created_at: "2024-01-01"
}
```

### Alle bestehenden Collections bekommen:
```javascript
{
  customer_id: "customer-uuid", // NEU
  ... existing fields
}
```

## Backend-Implementierung

### 1. Middleware für automatisches Filtern
```python
# middleware/tenant_context.py
- Liest customer_id aus JWT token
- Fügt customer_id automatisch zu allen Queries hinzu
- Super-Admins können customer_id überschreiben
```

### 2. Customer-Switcher für Super-Admin
```python
# routes/admin.py
GET /api/admin/customers - Liste aller Kunden
POST /api/admin/switch-customer - Wechsle zu anderem Kunden
```

### 3. Authentication erweitern
```python
# JWT Token enthält:
{
  user_id: "...",
  customer_id: "...",
  role: "customer_admin"
}
```

## Frontend-Implementierung

### 1. Customer-Switcher UI (nur für super_admin)
- Dropdown in Header
- Zeigt aktuellen Kunden
- Kann zwischen Kunden wechseln

### 2. Alle API-Calls prüfen customer_id
- Automatisch via JWT
- Keine Code-Änderungen in bestehenden Components nötig

## Migration-Schritte (SICHER!)

### Schritt 1: ✅ Vorbereitung (NICHT-DESTRUKTIV)
- [ ] Neue Collections erstellen
- [ ] Migration-Scripts erstellen
- [ ] Backup aller Daten

### Schritt 2: ✅ Backend erweitern (ABWÄRTSKOMPATIBEL)
- [ ] Middleware implementieren
- [ ] Auth-System erweitern
- [ ] Neue API-Endpoints

### Schritt 3: ✅ Daten migrieren
- [ ] Erstelle ersten Test-Kunden "Europcar"
- [ ] Migriere bestehende Daten mit customer_id
- [ ] Teste alle Funktionen

### Schritt 4: ✅ Frontend anpassen
- [ ] Customer-Switcher hinzufügen
- [ ] User-Management erweitern
- [ ] Testen, testen, testen

### Schritt 5: ✅ Produktiv schalten
- [ ] Alle alten Queries löschen
- [ ] Middleware erzwingen
- [ ] Monitoring aktivieren

## Zeitplan
- **Tag 1-2:** Backend-Struktur (Middleware, Auth)
- **Tag 3:** Daten-Migration
- **Tag 4:** Frontend UI
- **Tag 5:** Testing & Bug-Fixes

## Sicherheits-Checkliste
✅ Alle Queries filtern nach customer_id
✅ Super-Admin kann customer_id überschreiben
✅ Customer-Admin kann NUR eigene Daten sehen
✅ JWT-Token enthält customer_id
✅ Middleware erzwingt Isolation

## Status: 🟡 BEREIT ZUR IMPLEMENTIERUNG
