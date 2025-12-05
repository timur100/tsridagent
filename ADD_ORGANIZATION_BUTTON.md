# "Neue Organisation" Button - Dokumentation

## ✅ Implementiert

### 🎯 Feature: Dynamisches Hinzufügen von Organisationen

Ein **"+" Button** im Sidebar-Header ermöglicht es, neue Organisationen mit automatisch generierter Hierarchie hinzuzufügen.

## 🖼️ UI-Komponenten

### 1. Plus-Button in der Sidebar
**Position:** Sidebar-Header, neben dem Refresh-Button
**Funktion:** Öffnet Modal zum Erstellen einer neuen Organisation

### 2. "Neue Organisation" Modal

**Schritt 1: Grundinformationen**
- **Organisationsname*** (Pflichtfeld)
- **Anzeigename** (optional)
- **Branche** (Dropdown):
  - Einzelhandel (z.B. Rewe, Lidl)
  - Autovermietung (z.B. Europcar, Sixt)
  - Sportartikel (z.B. Puma, Nike, Adidas)
  - Logistik (z.B. DHL, UPS)
  - Gastronomie (z.B. McDonald's, Starbucks)
  - Benutzerdefiniert
- **Checkbox:** "Automatisch Hierarchie generieren"

**Schritt 2: Länder auswählen** (nur wenn Hierarchie-Generation aktiv)
- Zeigt vorgeschlagene Länder basierend auf der Branche
- Länder können an-/abgewählt werden
- Standard: Alle vorgeschlagenen Länder werden verwendet

**Schritt 3: Erstellung**
- Loading-State während der Erstellung
- Success-Message mit Statistik
- Automatisches Schließen und Refresh der Sidebar

## 🏗️ Branchen-Templates

Jede Branche hat vordefinierte Hierarchie-Strukturen:

### Einzelhandel (8 Länder)
```
Europa:
  - Deutschland, Frankreich, Spanien, Italien
  - Niederlande, Belgien, Österreich, Schweiz
```

### Autovermietung (8 Länder)
```
Europa: Deutschland, Frankreich, Spanien, Italien, UK
Nordamerika: USA
Asien-Pazifik: Australien
```

### Sportartikel (10 Länder)
```
Europa: Deutschland, UK, Frankreich, Spanien, Italien, Niederlande
Nordamerika: USA
Asien: China, Japan
```

### Logistik (6 Länder)
```
Europa: Deutschland, Frankreich, UK
Nordamerika: USA
Asien: China, Indien
```

### Gastronomie (7 Länder)
```
Nordamerika: USA
Europa: Deutschland, UK, Frankreich
Asien: China, Japan
```

## 🔧 Backend-API

### Endpoint: `/api/organizations/create`
**Methode:** POST

**Request Body:**
```json
{
  "name": "Adidas",
  "display_name": "Adidas",
  "industry": "sports",
  "generate_hierarchy": true,
  "countries": ["Deutschland", "USA", "China"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organisation \"Adidas\" erfolgreich erstellt",
  "data": {
    "tenant_id": "uuid...",
    "name": "Adidas",
    "display_name": "Adidas",
    "stats": {
      "organization": 1,
      "continents": 3,
      "countries": 3,
      "states": 15,
      "cities": 20,
      "locations": 0
    }
  }
}
```

### Endpoint: `/api/organizations/industries`
**Methode:** GET

Liefert verfügbare Branchen-Templates.

## 📁 Dateien

**Backend:**
- `/app/backend/routes/organization_creator.py` ⭐ API-Endpoint
- `/app/backend/server.py` (aktualisiert)

**Frontend:**
- `/app/frontend/src/components/AddOrganizationModal.jsx` ⭐ Modal-Komponente
- `/app/frontend/src/components/TenantHierarchySidebarV2.jsx` (aktualisiert)

## 🎨 Features

### Automatische Hierarchie-Generierung
- Kontinente, Länder, Regionen, Städte werden automatisch erstellt
- Basierend auf Branchen-Templates
- Anpassbar durch Länder-Auswahl

### Dynamische Sidebar
- Neue Organisationen erscheinen sofort nach Erstellung
- Alphabetisch sortiert
- Keine Code-Änderung nötig

### Intelligente Vorschläge
- Branchen-spezifische Länder-Vorschläge
- Z.B. Einzelhandel → Europa-Fokus
- Logistik → Globale Hub-Städte

## 🧪 Testing

### Beispiel: Adidas hinzufügen

1. In Sidebar auf **"+"** Button klicken
2. **Schritt 1:**
   - Name: "Adidas"
   - Branche: "Sportartikel"
   - Hierarchie-Checkbox: ✅
   - Klick auf "Weiter"
3. **Schritt 2:**
   - Vorgeschlagene Länder werden angezeigt
   - Optional: Länder an-/abwählen
   - Klick auf "Organisation erstellen"
4. **Ergebnis:**
   - "Adidas" erscheint in der Sidebar
   - Mit vollständiger Hierarchie (Kontinente → Länder → Städte)

### Beispiel: Rewe hinzufügen

1. **"+"** Button → Name: "Rewe"
2. Branche: "Einzelhandel"
3. Hierarchie-Generation aktiviert
4. **Ergebnis:** Rewe mit Europa-Hierarchie (8 Länder)

## 🔄 Workflow

```
User klickt "+"
    ↓
Modal öffnet sich
    ↓
Name & Branche eingeben
    ↓
(Optional) Länder auswählen
    ↓
"Erstellen" klicken
    ↓
Backend erstellt Hierarchie
    ↓
Sidebar lädt neu
    ↓
Neue Organisation sichtbar
```

## ✨ Vorteile

1. **Keine Code-Änderung nötig** zum Hinzufügen neuer Organisationen
2. **Konsistente Strukturen** durch Templates
3. **Schnelle Erstellung** mit vordefinierten Hierarchien
4. **Flexibel anpassbar** durch Länder-Auswahl
5. **Sofort verwendbar** nach Erstellung

## 📊 Aktuelle Organisationen

Nach dem Button-Feature:
```
1. Europcar (206 Standorte)
2. Puma (1 Standort)
3. [Weitere über Button hinzufügbar...]
```

## 🎉 Verwendung

**Neue Organisation hinzufügen:**
1. Sidebar öffnen (`/portal/tenants`)
2. **"+"** Button klicken (neben Refresh)
3. Formular ausfüllen
4. Erstellen

**Fertig!** Die neue Organisation erscheint sofort in der Hierarchie.

## 🔮 Erweiterungen

- **Import von Standort-CSV** für neue Organisationen
- **Bearbeiten** bestehender Organisationen
- **Löschen** von Organisationen (mit Bestätigung)
- **Klonen** von Hierarchien
- **Custom Templates** erstellen und speichern
