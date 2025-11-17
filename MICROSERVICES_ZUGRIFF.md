# 🔧 Zugriff auf Microservices-Konfiguration

## 📍 So finden Sie den Microservices-Bereich:

### Option 1: Über das Admin Panel (mit Login)

1. **Öffnen Sie:** http://localhost:3000/portal/admin
2. **Login mit Demo-Credentials:**
   - E-Mail: `admin@tsrid.com`
   - Passwort: `admin123`
3. **Navigieren Sie zu:**
   - Klicken Sie auf das **Zahnrad-Symbol** (⚙️) oben rechts ODER
   - Klicken Sie auf **"Einstellungen"** im Menü
4. **Im Settings-Menü links:**
   - Scrollen Sie zu **"System"**
   - Klicken Sie auf **"System"** um es aufzuklappen
   - Klicken Sie auf **"⚙️ Microservices"**

### Option 2: Direkter API-Zugriff (ohne UI)

Sie können die Services auch direkt über die API verwalten:

```bash
# Alle Services abrufen
curl http://localhost:8001/api/portal/services

# Health Check aller Services
curl http://localhost:8001/api/portal/services/health/all

# Neuen Service hinzufügen
curl -X POST http://localhost:8001/api/portal/services \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "My Service",
    "service_type": "other",
    "base_url": "http://localhost:8080",
    "enabled": true
  }'
```

---

## 🐛 Troubleshooting

### "Ich sehe den Microservices-Menüpunkt nicht"

**Lösung 1: Frontend neu laden**
```bash
sudo supervisorctl restart frontend
# Warten Sie 10 Sekunden
# Dann Browser-Cache leeren (Ctrl+Shift+R)
```

**Lösung 2: Browser-Cache leeren**
- Drücken Sie `Ctrl + Shift + Delete`
- Wählen Sie "Cached images and files"
- Klicken Sie auf "Clear data"
- Laden Sie die Seite neu

**Lösung 3: Prüfen ob Component geladen wird**
```bash
# Prüfen Sie die Frontend-Logs
tail -f /var/log/supervisor/frontend.err.log
```

### "Settings-Seite lädt nicht"

Das Admin Panel benötigt Login. Falls der Login nicht funktioniert:

```bash
# Backend neu starten
sudo supervisorctl restart backend

# Prüfen ob Backend läuft
curl http://localhost:8001/health
```

---

## 📊 Aktueller Service-Status

Sie können jederzeit den Status überprüfen:

```bash
# ID Verification Service Status
curl http://localhost:8101/health

# Service Configuration Status
curl http://localhost:8001/api/portal/services
```

---

## ✅ Bereits konfigurierte Services:

1. **ID Verification Service**
   - URL: http://localhost:8101
   - Status: ✅ Running
   - Health: http://localhost:8101/health

---

## 🎯 Nächste Schritte

Wenn Sie den Microservices-Bereich erreichen, können Sie:

1. ✅ Neue Services hinzufügen
2. ✅ URLs & API Keys konfigurieren
3. ✅ Health Status überwachen
4. ✅ Services aktivieren/deaktivieren
5. ✅ Response Time sehen

---

## 📞 Noch Probleme?

Falls Sie den Bereich immer noch nicht finden:

1. **Screenshot machen** von dem was Sie sehen
2. **Browser Console öffnen** (F12) und nach Fehlern suchen
3. **Frontend Logs prüfen:**
   ```bash
   tail -50 /var/log/supervisor/frontend.err.log
   ```
