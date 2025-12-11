# 🐛 Debug: "Windows Drucker (0)"

## Problem

Die Electron-App zeigt "Windows Drucker (0)" - keine Drucker werden gefunden.

---

## 🔧 Schnelle Diagnose

### Schritt 1: Test-Script ausführen

```cmd
cd electron-app
node test-printer-detection.js
```

**Das Script testet alle 3 Methoden:**
1. WMIC
2. PowerShell
3. Registry

**Erwartetes Ergebnis:**
```
ERGEBNIS: 20 Drucker gefunden

1. Brother QL-1110NWB
2. ZDesigner ZQ630 Plus
...
```

**Falls 0 Drucker:**
→ Siehe "Lösungen" unten

---

## 🔍 Manuelle Tests

### Test 1: WMIC (sollte funktionieren)

```cmd
wmic printer get Name,DriverName /format:csv
```

**Sollte ausgeben:**
```
Node,Default,DriverName,Name
TIMURBUERO,FALSE,Brother QL-1110NWB,Brother QL-1110NWB
TIMURBUERO,FALSE,ZDesigner ZPL,ZDesigner ZQ630 Plus
...
```

**Falls leer/Fehler:**
→ Windows-Druckerdienst Problem

### Test 2: PowerShell

```powershell
Get-WmiObject -Class Win32_Printer | Select-Object Name,DriverName,Default | ConvertTo-Json
```

**Sollte ausgeben:**
```json
[
  {
    "Name": "Brother QL-1110NWB",
    "DriverName": "Brother QL-1110NWB",
    "Default": false
  },
  ...
]
```

### Test 3: Direkt in Windows

```
Windows-Taste → "Drucker"
→ Drucker & Scanner
```

**Sehen Sie dort Drucker?**
- JA → Berechtigungsproblem
- NEIN → Drucker nicht installiert

---

## ✅ Lösungen

### Lösung 1: App als Administrator starten

```cmd
# Rechtsklick auf electron-app Ordner
# → "Terminal als Administrator öffnen"
cd electron-app
yarn start
```

→ Testen Sie erneut

### Lösung 2: Windows-Druckerdienst neu starten

```cmd
# Als Administrator
net stop spooler
net start spooler
```

→ App neu starten

### Lösung 3: PowerShell Execution Policy

```powershell
# Als Administrator
Set-ExecutionPolicy RemoteSigned
```

→ App neu starten

### Lösung 4: Firewall/Antivirus

Temporär deaktivieren:
- Windows Defender
- Antivirus-Software

→ App neu starten

### Lösung 5: Alternative Methode (Direkt über Drucker-Namen)

Falls keine automatische Erkennung funktioniert, können Sie manuell einen Drucker hinzufügen:

**Neue Datei:** `manual-printer-config.json`
```json
{
  "printers": [
    {
      "name": "Brother QL-1110NWB",
      "driver": "Brother QL-1110NWB",
      "status": "OK",
      "isDefault": false
    },
    {
      "name": "Brother QL-1110NWB (Kopie 1)",
      "driver": "Brother QL-1110NWB",
      "status": "OK",
      "isDefault": false
    }
  ]
}
```

Ich kann die App so ändern, dass sie diese Datei liest falls automatische Erkennung fehlschlägt.

---

## 🧪 Debug-Logs aktivieren

### In der Electron-App:

1. App starten
2. F12 drücken (DevTools)
3. Console-Tab
4. "Aktualisieren" klicken

**Was erscheint?**

**Erwartete Ausgabe:**
```
[PRINTER] Starting printer detection...
[PRINTER-WMIC] Found 20 printers
[PRINTER] ✓ WMIC method successful: 20 printers
```

**Falls Fehler:**
```
[PRINTER-WMIC] Error: ...
[PRINTER-PS] Error: ...
[PRINTER-REG] Error: ...
[PRINTER] ✗ All methods failed!
```

→ Senden Sie mir diesen Output!

---

## 🔄 Verbesserte Version implementiert

Ich habe `printer-windows.js` aktualisiert mit:

### 3 Erkennungs-Methoden:

1. **WMIC** (robusteste)
   - Nutzt Windows Management Instrumentation
   - Funktioniert meistens
   
2. **PowerShell mit WMI** (Fallback)
   - Alternative wenn WMIC fehlt
   
3. **Registry** (letzte Option)
   - Liest Drucker aus Registry

**Die App versucht alle 3 nacheinander!**

---

## 📝 Nächste Schritte

**1. Neue Dateien herunterladen:**
```
printer-windows.js          ✏️ UPDATED
test-printer-detection.js   🆕 NEW
```

**2. Test-Script ausführen:**
```cmd
cd electron-app
node test-printer-detection.js
```

**3. Ergebnis mitteilen:**
- Wie viele Drucker gefunden?
- Welche Methode war erfolgreich?
- Fehler-Meldungen?

**4. Falls weiterhin 0 Drucker:**
- Als Administrator ausführen
- Manuell testen (wmic printer list brief)
- Console-Logs senden (F12 in App)

---

## 💡 Warum könnte es nicht funktionieren?

### Häufigste Ursachen:

1. **Berechtigungen** ⚠️
   - Electron-App braucht Admin-Rechte für WMI-Zugriff
   - → Als Administrator starten

2. **Druckerdienst pausiert**
   - Windows Print Spooler läuft nicht
   - → `net start spooler`

3. **PowerShell blockiert**
   - Execution Policy zu restriktiv
   - → `Set-ExecutionPolicy RemoteSigned`

4. **Node.js Child Process Problem**
   - spawn() funktioniert nicht
   - → Manuelles Test-Script zeigt ob Problem bei Node oder Electron

---

## 🎯 Aktionsplan

**Sofort:**
1. ✅ Neue `printer-windows.js` herunterladen
2. ✅ `test-printer-detection.js` herunterladen
3. ✅ Test-Script ausführen

**Falls Test-Script funktioniert (zeigt Drucker):**
→ Electron-App Problem → ich debugge weiter

**Falls Test-Script NICHT funktioniert (0 Drucker):**
→ Windows/Berechtigungen Problem → Lösungen 1-4 versuchen

**Senden Sie mir:**
- Output von `test-printer-detection.js`
- Output von `wmic printer list brief`
- Console-Log aus Electron-App (F12)

Dann kann ich gezielt helfen! 🔧
