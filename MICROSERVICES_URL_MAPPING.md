# 🌐 Microservices URL-Mapping

## Problem gelöst: Localhost → Externe URL

### ❌ Vorher:
- Service URL: `http://localhost:8101`
- Von außen nicht erreichbar
- "Öffnen"-Button funktioniert nicht

### ✅ Jetzt:
- **Automatische URL-Konvertierung**
- **Backend-Proxy** für alle Microservices
- Externe URLs funktionieren perfekt!

---

## 🔧 Wie funktioniert es?

### 1. Backend-Proxy (`/api/services/{port}/{path}`)

Alle Anfragen an Microservices werden durch den Hauptbackend-Server geproxyt:

```
Externe URL:                    Interne URL:
https://preview.emergentagent   http://localhost:8101
  .com/api/services/8101/health   /health
        ↓                              ↓
    [Backend Proxy]  ─────────────►  [Microservice]
```

**Beispiele:**
```bash
# Health Check
https://preview-url/api/services/8101/health
→ http://localhost:8101/health

# Scans abrufen
https://preview-url/api/services/8101/api/verification/scans
→ http://localhost:8101/api/verification/scans

# Beliebiger Endpoint
https://preview-url/api/services/{PORT}/{PATH}
→ http://localhost:{PORT}/{PATH}
```

---

### 2. Automatische URL-Konvertierung im Frontend

```javascript
const convertToExternalUrl = (internalUrl) => {
  // localhost:8101 → preview-url/api/services/8101
  
  const currentDomain = window.location.origin;
  const port = extractPort(internalUrl);
  
  return `${currentDomain}/api/services/${port}`;
};
```

**Beispiel:**
- **Intern**: `http://localhost:8101`
- **Automatisch konvertiert**: `https://preview-url/api/services/8101`

---

### 3. Externe URL-Feld (Optional)

Jeder Service kann eine manuelle externe URL haben:

**Im Admin-Panel:**
```
Base URL (Intern): http://localhost:8101
Externe URL:       https://custom-domain.com/verification
                   (oder leer für automatisch)
```

**Priorität:**
1. Wenn `external_url` gesetzt → Diese verwenden
2. Sonst: Automatische Konvertierung

---

## 📋 Service-Konfiguration

### Beispiel: ID Verification Service

```json
{
  "service_name": "ID Verification Service",
  "service_type": "id_verification",
  "base_url": "http://localhost:8101",      // Intern
  "settings": {
    "external_url": ""                       // Leer = Auto
  }
}
```

**Beim Klick auf "Öffnen":**
```
1. Frontend prüft: Gibt es external_url?
   → Nein
   
2. Automatische Konvertierung:
   http://localhost:8101
   → https://preview-url/api/services/8101
   
3. Browser öffnet neuen Tab mit externer URL
```

---

## 🚀 Verwendung

### Als Administrator:

**Option 1: Automatische URL (Empfohlen)**
1. Service mit `http://localhost:PORT` erstellen
2. Externes URL-Feld **leer lassen**
3. System konvertiert automatisch
4. ✅ "Öffnen"-Button funktioniert!

**Option 2: Manuelle externe URL**
1. Service erstellen
2. Externes URL-Feld ausfüllen: `https://your-domain.com/service`
3. Diese URL wird immer verwendet
4. ✅ Volle Kontrolle

---

## 🔒 Sicherheit

**Backend-Proxy:**
- ✅ Prüft Port-Bereiche (nur bekannte Ports)
- ✅ Timeout: 30 Sekunden
- ✅ Error Handling
- ✅ Logs alle Proxy-Anfragen

**Keine direkten Ports nach außen:**
- ❌ Port 8101 nicht öffentlich
- ✅ Nur über Backend-Proxy erreichbar
- ✅ Zusätzliche Sicherheitsebene

---

## 🧪 Testen

### 1. Proxy testen:
```bash
# Health Check über Proxy
curl https://preview-url/api/services/8101/health

# Expected:
{
  "service": "id-verification",
  "status": "healthy"
}
```

### 2. UI testen:
1. Admin-Portal → Microservices
2. "Öffnen"-Button klicken
3. Neuer Tab öffnet sich mit Proxy-URL
4. ✅ Service lädt erfolgreich

---

## 📊 Port-Mapping

| Microservice        | Intern Port | Externe URL                      |
|---------------------|-------------|----------------------------------|
| Backend             | 8001        | /api                             |
| ID Verification     | 8101        | /api/services/8101              |
| Inventory           | 8102        | /api/services/8102              |
| Portal              | 8103        | /api/services/8103              |
| Ticketing           | 8104        | /api/services/8104              |

---

## ✅ Vorteile

**1. Keine manuelle Konfiguration:**
- Alle localhost-URLs funktionieren automatisch
- Keine Port-Weiterleitungen nötig

**2. Flexibilität:**
- Optional manuelle externe URLs
- Hybrid-Ansatz möglich

**3. Sicherheit:**
- Services nicht direkt exponiert
- Backend kontrolliert Zugriff

**4. Entwicklung:**
- Lokale Entwicklung unverändert
- Production-URLs automatisch

---

## 🔧 Troubleshooting

### "Service nicht erreichbar"
```
1. Prüfen: Läuft der Service?
   sudo supervisorctl status id_verification

2. Prüfen: Ist der Port korrekt?
   curl http://localhost:8101/health

3. Prüfen: Funktioniert der Proxy?
   curl https://preview-url/api/services/8101/health
```

### "Falsche URL"
```
1. External URL prüfen (Admin → Microservices)
2. Leer lassen für automatische Konvertierung
3. Oder manuelle URL eintragen
```

---

## 🎯 Best Practices

1. ✅ **Interne URLs**: Immer `http://localhost:{PORT}` verwenden
2. ✅ **Externe URLs**: Leer lassen für automatisch
3. ✅ **Custom Domains**: Nur wenn wirklich nötig
4. ✅ **Testing**: Beide URLs testen (intern & extern)

---

**Alles automatisch, alles funktioniert!** 🚀
