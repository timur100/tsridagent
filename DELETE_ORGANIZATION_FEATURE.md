# Organisation Löschen - Dokumentation

## ✅ Implementiert

### 🎯 Feature: Organisationen sicher löschen

Organisationen können über ein **3-Punkte-Menü** (⋮) bei jeder Organisation in der Sidebar gelöscht werden.

## 🖼️ UI-Flow

### 1. Kontextmenü öffnen
- Bei jeder Organisation erscheint ein **⋮ Button** beim Hover
- Klick öffnet ein Dropdown-Menü mit Aktionen

### 2. Löschen-Dialog
**Sicherheits-Features:**
- ⚠️ **Warnung:** "Diese Aktion kann nicht rückgängig gemacht werden"
- 📊 **Info-Anzeige:** Zeigt Organisations-Details und Standort-Anzahl
- 🔒 **Bestätigungs-Input:** User muss den Organisations-Namen eingeben
- 💾 **Standorte werden behalten:** Echte Standortdaten werden aus Sicherheitsgründen nicht gelöscht

### 3. Bestätigung erforderlich
```
Geben Sie "Puma" ein, um zu bestätigen:
[ Input-Feld ]

[Abbrechen]  [Löschen]
```

**Löschen-Button ist nur aktiv, wenn:**
- Der Name exakt übereinstimmt
- Keine Ladeanimation aktiv ist

## 🛡️ Sicherheitsmechanismen

### Was wird gelöscht:
✅ Organisation-Eintrag  
✅ Gesamte Hierarchie (Kontinente, Länder, Bundesländer, Städte)  
✅ Alle untergeordneten Tenants  

### Was wird NICHT gelöscht:
❌ Standortdaten in `portal_db.tenant_locations`  
❌ Echte Geschäftsdaten

**Grund:** Standortdaten könnten echte Adressen, Konfigurationen oder historische Daten enthalten, die aus Compliance-Gründen erhalten bleiben sollten.

## 🔧 Backend-API

### Endpoint: `DELETE /api/organizations/{tenant_id}`

**Request:**
```bash
DELETE /api/organizations/94317b6b-a478-4df5-9a81-d1fd3c5983c8
Authorization: Bearer <token>
```

**Response (Erfolg):**
```json
{
  "success": true,
  "message": "Organisation \"Puma\" erfolgreich gelöscht",
  "data": {
    "deleted_tenant_id": "94317b6b-a478-4df5-9a81-d1fd3c5983c8",
    "deleted_name": "Puma",
    "hierarchy_items_deleted": 81,
    "locations_preserved": 1,
    "warning": "1 Standorte wurden behalten"
  }
}
```

**Response (Fehler - Org nicht gefunden):**
```json
{
  "detail": "Organisation nicht gefunden"
}
```

## 📊 Lösch-Statistik

**Beispiel: Puma löschen**
```
Organisation: Puma
├─ Gelöschte Hierarchie-Einträge: 81
│  ├─ 1 Organisation
│  ├─ 3 Kontinente
│  ├─ 10 Länder
│  ├─ 30 Bundesländer/Regionen
│  └─ 36 Städte
└─ Behaltene Standorte: 1 (Soltau in Berlin)
```

## 🎨 UI-Komponenten

### 1. Kontextmenü (3-Punkte-Button)
**Position:** Rechts neben Organisations-Badge  
**Sichtbarkeit:** Nur bei `tenant_level: 'organization'`  
**Aktionen:**
- 🗑️ Löschen

### 2. Delete-Modal
**Komponente:** `DeleteOrganizationModal.jsx`

**Elemente:**
- Header mit Trash-Icon
- Warnungs-Box (rot)
- Organisations-Info-Box
- Hinweis über behaltene Standorte (wenn vorhanden)
- Bestätigungs-Input
- Aktions-Buttons (Abbrechen / Löschen)

**States:**
- Loading (während Löschvorgang)
- Error (bei Fehler)
- Success (nach erfolgreichem Löschen)

## 📁 Dateien

**Backend:**
- `/app/backend/routes/organization_creator.py` (erweitert)
  - `DELETE /{tenant_id}` Endpoint hinzugefügt

**Frontend:**
- `/app/frontend/src/components/DeleteOrganizationModal.jsx` ⭐ Neue Komponente
- `/app/frontend/src/components/TenantHierarchySidebarV2.jsx` (aktualisiert)
  - 3-Punkte-Menü hinzugefügt
  - Delete-Modal integriert

## 🧪 Testing

### Test-Szenario 1: Organisation ohne Standorte löschen

1. Neue Test-Organisation erstellen:
   ```
   Name: "Test Firma"
   Branche: Einzelhandel
   Hierarchie: ✅
   ```
2. In Sidebar: **Test Firma** → **⋮** → **Löschen**
3. Dialog öffnet sich
4. "Test Firma" eingeben
5. **Löschen** klicken
6. ✅ Organisation verschwindet aus Sidebar
7. ✅ Keine Warnungen (0 Standorte)

### Test-Szenario 2: Organisation mit Standorten löschen

1. **Puma** → **⋮** → **Löschen**
2. Dialog zeigt: "1 Standorte (werden behalten)"
3. Hinweis: "Die 1 Standortdaten werden aus Sicherheitsgründen nicht gelöscht"
4. "Puma" eingeben → **Löschen**
5. ✅ Puma verschwindet aus Sidebar
6. ✅ Standortdaten bleiben in `portal_db.tenant_locations`

### Test-Szenario 3: Abbruch

1. Organisation auswählen → **⋮** → **Löschen**
2. **Abbrechen** klicken ODER **X** klicken
3. ✅ Dialog schließt sich
4. ✅ Keine Änderungen vorgenommen

### Test-Szenario 4: Falsche Bestätigung

1. Organisation auswählen → **Löschen**
2. Falschen Namen eingeben (z.B. "puma" statt "Puma")
3. ❌ Löschen-Button bleibt deaktiviert
4. ✅ Keine versehentliche Löschung möglich

## 🔄 Workflow

```
User klickt ⋮ bei Organisation
    ↓
Kontextmenü öffnet sich
    ↓
"Löschen" klicken
    ↓
Delete-Modal öffnet sich
    ↓
Organisations-Name eingeben
    ↓
"Löschen" bestätigen
    ↓
Backend löscht Hierarchie
    ↓
Sidebar lädt neu
    ↓
Organisation ist verschwunden
```

## ⚠️ Wichtige Hinweise

### Für Entwickler:
- **Keine Soft-Delete:** Einträge werden permanent aus `tsrid_db.tenants` gelöscht
- **Standortdaten bleiben:** `portal_db.tenant_locations` wird nicht berührt
- **Cascading Delete:** Alle Kinder (Kontinente → ... → Städte) werden gelöscht
- **Regex-Matching:** Verwendet `^{tenant_id}-` Pattern für Kinder

### Für User:
- ⚠️ **Keine Rückgängig-Funktion!**
- 💡 Tipp: Notieren Sie die Tenant-ID vor dem Löschen (für Recovery)
- 🔒 Standortdaten bleiben aus Sicherheitsgründen erhalten
- 📊 Dialog zeigt genau, was gelöscht wird

## 🎉 Vorteile

1. **Sicher:** Mehrfache Bestätigung verhindert versehentliches Löschen
2. **Transparent:** Zeigt genau, was gelöscht wird
3. **Datenschutz:** Standortdaten werden geschützt
4. **Benutzerfreundlich:** Klares UI, verständliche Warnungen
5. **Konsistent:** Folgt dem gleichen Pattern wie "Organisation hinzufügen"

## 🔮 Zukünftige Erweiterungen

- **Soft-Delete Option:** Organisationen deaktivieren statt löschen
- **Wiederherstellung:** Gelöschte Organisationen wiederherstellen (innerhalb 30 Tage)
- **Bulk-Delete:** Mehrere Organisationen auf einmal löschen
- **Export vor Löschen:** Automatischer Backup-Download
- **Audit-Log:** Protokollierung aller Lösch-Aktionen
