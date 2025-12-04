# Placetel Webhook-Integration Einrichtung

## 🎯 Übersicht
Diese Anleitung zeigt, wie du Echtzeit-Anrufbenachrichtigungen von Placetel zu deinem Admin-Portal aktivierst.

## 🔧 Schritt 1: Webhook-Secret festlegen (Optional)

Für zusätzliche Sicherheit solltest du ein Webhook-Secret festlegen:

1. Öffne `/app/backend/.env`
2. Füge hinzu:
```bash
PLACETEL_WEBHOOK_SECRET=dein_geheimes_passwort_hier
```
3. Backend neu starten:
```bash
sudo supervisorctl restart backend
```

## 🌐 Schritt 2: Webhook in Placetel konfigurieren

### A. Placetel Web-Portal öffnen
1. Gehe zu https://web.placetel.de
2. Melde dich an

### B. API-Einstellungen öffnen
1. Navigation: **Einstellungen** → **Externe APIs** → **Notify API**
2. Oder direkt: https://web.placetel.de/settings/notify_api

### C. Webhook-URL konfigurieren

**Deine Webhook-URL:**
```
https://DEINE-DOMAIN.com/api/placetel/webhook
```

**Beispiele:**
- Produktion: `https://asset-sync-app.emergentagent.com/api/placetel/webhook`
- Lokal (für Tests): `https://dein-ngrok-url.ngrok.io/api/placetel/webhook`

### D. Einstellungen

1. **URL:** Trage deine Webhook-URL ein
2. **Shared Secret:** 
   - Wenn du `PLACETEL_WEBHOOK_SECRET` gesetzt hast: Trage hier denselben Wert ein
   - Sonst: Leer lassen (nicht empfohlen für Produktion)
3. **Events aktivieren:**
   - ✅ Eingehende Anrufe (incoming)
   - ✅ Ausgehende Anrufe (outgoing)
   - ✅ Anruf angenommen (accepted)
   - ✅ Anruf beendet (hangup)
4. **Speichern** klicken

## 🧪 Schritt 3: Test

### A. Test-Anruf tätigen
1. Rufe eine deiner Placetel-Nummern an
2. Warte 1-2 Sekunden

### B. Im Admin-Portal prüfen
1. Öffne: http://localhost:3000/portal/admin
2. Navigation: **R&D** → **Telefonie** → **Placetel**
3. Klicke auf **Anrufe**-Tab
4. Du solltest sehen:
   - 🔴 **"Live: Webhook aktiv"** (roter pulsierender Punkt)
   - Eine Toast-Benachrichtigung: "📞 Eingehender Anruf von..."
   - Der Anruf erscheint **sofort** in der Tabelle

### C. Webhook-Events prüfen
API-Aufruf um gespeicherte Events zu sehen:
```bash
curl http://localhost:8001/api/placetel/events
```

## 🔍 Troubleshooting

### Problem: "Live: Webhook aktiv" erscheint nicht
- **Lösung:** 
  1. Überprüfe Backend-Logs: `tail -f /var/log/supervisor/backend.err.log`
  2. Stelle sicher, dass der SSE-Endpoint erreichbar ist
  3. Überprüfe CORS-Einstellungen

### Problem: Webhook empfängt keine Daten
- **Lösung:**
  1. Überprüfe Webhook-URL in Placetel (muss öffentlich erreichbar sein)
  2. Für lokale Tests: Nutze ngrok oder ähnliche Tools
  3. Prüfe Firewall-Einstellungen
  4. Teste manuell:
     ```bash
     curl -X POST "https://DEINE-URL/api/placetel/webhook" \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "event=incoming&from=030123456&to=01727070710&timestamp=$(date +%s)"
     ```

### Problem: "Invalid signature" Fehler
- **Lösung:**
  1. Stelle sicher, dass `PLACETEL_WEBHOOK_SECRET` in `.env` identisch mit dem Wert in Placetel ist
  2. Keine Leerzeichen oder Zeilenumbrüche im Secret
  3. Backend neu starten nach Änderung

### Problem: Anrufe erscheinen verzögert
- **Mögliche Ursachen:**
  - Placetel sendet Events manchmal mit 5-10 Sekunden Verzögerung
  - Netzwerk-Latenz
  - Prüfe Placetel-Status: https://status.placetel.de

## 📊 Webhook-Events Format

Placetel sendet folgende Events:

### Eingehender Anruf (incoming)
```
event=incoming
call_id=abc123
from=+49123456789
to=+49301234567
timestamp=1712345678
direction=in
status=ringing
```

### Ausgehender Anruf (outgoing)
```
event=outgoing
call_id=def456
from=+49301234567
to=+49987654321
timestamp=1712345678
direction=out
status=ringing
```

### Anruf angenommen (accepted)
```
event=accepted
call_id=abc123
timestamp=1712345680
```

### Anruf beendet (hangup)
```
event=hangup
call_id=abc123
duration=120
timestamp=1712345800
```

## 🔐 Sicherheit

### Produktion-Checklist:
- ✅ `PLACETEL_WEBHOOK_SECRET` gesetzt
- ✅ HTTPS aktiviert (nicht HTTP)
- ✅ Webhook-URL nicht öffentlich dokumentiert
- ✅ Rate Limiting aktiviert (optional)
- ✅ Logs überwachen

## 🚀 Vorteile vs. Polling

| Feature | Webhook (Echtzeit) | Polling (alle 5s) |
|---------|-------------------|-------------------|
| Latenz | < 1 Sekunde | 0-5 Sekunden |
| Server-Last | Sehr niedrig | Mittel |
| Daten-Aktualität | Sofort | Verzögert |
| API-Calls | Nur bei Events | Alle 5 Sekunden |

## 📞 Support

Bei Fragen zur Webhook-Konfiguration:
- Placetel Support: https://www.placetel.de/support
- Placetel API Docs: https://www.placetel.de/developers
- GitHub: https://github.com/Placetel/call-control-notify-api
