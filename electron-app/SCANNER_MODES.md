# 🔄 Scanner-Modi: Live vs. Simulation

## 🎯 Zwei Modi für verschiedene Szenarien

---

## 📝 **Simulation-Modus** (Standard)

### **Wofür?**
- ✅ Entwicklung bei Emergent.sh
- ✅ Testing ohne Hardware
- ✅ UI/UX-Design
- ✅ Feature-Entwicklung

### **Wie funktioniert's?**
- Verwendet Mock-Daten
- Kein physischer Scanner nötig
- Simuliert Scan-Ergebnisse
- Perfekt für Entwicklung

### **Aktivieren:**
```
Admin-Panel → Settings → Scanner-Modus
→ Schalter auf SIMULATION (gelb)
→ "Einstellungen speichern"
```

### **UI-Anzeige:**
- Scanner-Button: **"Scanner (Sim)"**
- Badge: **SIM** (gelb)
- Kein grüner Online-Dot

---

## 🔴 **Live-Modus**

### **Wofür?**
- ✅ Produktion mit echtem Scanner
- ✅ Electron-App auf Windows
- ✅ Echte Dokumente scannen
- ✅ Regula Document Reader

### **Wie funktioniert's?**
- Verbindet mit Regula Scanner (localhost)
- Echte Hardware erforderlich
- Echte Scan-Ergebnisse
- LED-Feedback vom Scanner

### **Aktivieren:**
```
Admin-Panel → Settings → Scanner-Modus
→ Schalter auf LIVE (grün)
→ "Einstellungen speichern"
```

### **UI-Anzeige:**
- Scanner-Button: **"Scanner"**
- Badge: Keines (oder "LIVE")
- Grüner Dot = Scanner online

---

## 🔄 Zwischen Modi wechseln

### **Schritt-für-Schritt:**

1. **Admin-Panel öffnen**
   - Klick auf ⚙️ Zahnrad (oben rechts)

2. **Settings-Tab**
   - "Settings" anklicken

3. **Scanner-Modus finden**
   - Scrolle zu "📡 Scanner-Modus"

4. **Toggle umschalten**
   - Links = SIMULATION (gelb)
   - Rechts = LIVE (grün)

5. **WICHTIG: Speichern!**
   - Klick auf **"Einstellungen speichern"**

6. **Fertig!**
   - Modus ist jetzt aktiv

---

## 🧪 Testing-Szenarien

### **Szenario 1: Entwicklung bei Emergent**

```
Modus: SIMULATION
Warum: Kein Scanner verfügbar
Vorteil: Schnelle Iteration
```

**Workflow:**
1. Code ändern
2. Browser-Refresh (F5)
3. Scanner-Button klicken
4. Mock-Daten werden geladen
5. Testen & iterieren

### **Szenario 2: Electron-App mit Scanner**

```
Modus: LIVE
Warum: Echter Scanner angeschlossen
Vorteil: Echte Scan-Ergebnisse
```

**Workflow:**
1. Electron-App starten
2. Modus auf LIVE stellen
3. Scanner-Button klicken
4. Dokument einlegen
5. Echter Scan wird durchgeführt

### **Szenario 3: Hybrid (Entwicklung → Produktion)**

```
1. Entwicklung: SIMULATION
2. Testing: SIMULATION
3. Deployment: LIVE
```

---

## 📊 Vergleichstabelle

| Feature | Simulation | Live |
|---------|-----------|------|
| Scanner Hardware | ❌ Nicht nötig | ✅ Erforderlich |
| Entwicklung | ✅ Perfekt | ❌ Hardware nötig |
| Produktion | ❌ Nur Test-Daten | ✅ Echte Daten |
| Schnelligkeit | ✅ Sofort | ⚠️ Hardware-abhängig |
| LED-Feedback | ❌ Nein | ✅ Ja |
| RFID | ❌ Mock | ✅ Echt |
| UV/IR Bilder | ❌ Mock | ✅ Echt |

---

## 🔍 Console-Logs

### **Simulation-Modus:**
```
🔍 Scanner-Modus: simulation
📝 Simulation-Modus aktiviert - verwende Mock-Daten
✅ Dokument ist nicht gesperrt, fahre fort...
```

### **Live-Modus:**
```
🔍 Scanner-Modus: live
🔍 Scanning via Electron...
✅ Scanner online (Electron): https://localhost/Regula.SDK.Api
🔄 Starting verification with data: ...
```

---

## ⚠️ Häufige Fehler

### **"Scanner nicht verfügbar" im Live-Modus**

**Problem:** Scanner ist offline
**Lösung:** 
1. Regula Service starten
2. Oder: Modus auf SIMULATION umstellen

### **"Mock-Daten" im Live-Modus**

**Problem:** Modus ist noch auf SIMULATION
**Lösung:**
1. Admin-Panel öffnen
2. Modus auf LIVE stellen
3. **"Einstellungen speichern" klicken!**

### **Modus ändert sich nach Reload**

**Problem:** Settings nicht gespeichert
**Lösung:**
- Nach Toggle-Änderung immer **"Einstellungen speichern"** klicken

---

## 💡 Best Practices

### **Entwicklung:**
```javascript
✅ Simulation-Modus verwenden
✅ Schnell iterieren
✅ Features testen
✅ UI/UX optimieren
```

### **Produktion:**
```javascript
✅ Live-Modus verwenden
✅ Scanner-Status prüfen
✅ LED-Feedback nutzen
✅ Echte Dokumente scannen
```

### **Hybrid:**
```javascript
1. Entwicklung: Simulation
2. Pre-Production: Live (mit Test-Scanner)
3. Production: Live (mit Prod-Scanner)
```

---

## 🎓 Zusammenfassung

**Für Entwicklung (Emergent.sh):**
→ **SIMULATION-Modus** (Standard)

**Für Produktion (Electron-App):**
→ **LIVE-Modus** umschalten

**Wichtig:**
→ Immer **"Einstellungen speichern"** klicken!

---

**Viel Erfolg! 🚀**
