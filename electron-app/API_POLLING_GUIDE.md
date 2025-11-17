# 🔗 API-Polling: Direkte Verbindung zu ReaderDemo.exe

## ✅ Die Lösung

Die Electron App **verbindet sich direkt** mit ReaderDemo.exe über die **Regula SDK API**!

### Wie es funktioniert:

```
1. ReaderDemo.exe läuft minimiert im Hintergrund
2. Benutzer scannt Dokument in ReaderDemo.exe
3. ReaderDemo.exe speichert Ergebnisse in Regula SDK API
4. Electron App fragt die API ab (Polling)
5. Neue Ergebnisse werden sofort angezeigt
```

## 🔄 Workflow

```
┌─────────────────────────┐
│   Electron App          │
│   (Vordergrund)         │
│   - User klickt Scanner │
└────────────┬────────────┘
             │
             │ 1. Start API-Polling
             ↓
┌─────────────────────────┐
│   Regula SDK API        │
│   https://localhost     │
│   /Regula.SDK.Api       │
└────────────┬────────────┘
             ↑
             │ 2. Speichert Scan
             │
┌─────────────────────────┐
│   ReaderDemo.exe        │
│   (minimiert)           │
│   - User scannt Dokument│
└─────────────────────────┘
             
    
┌─────────────────────────┐
│   Electron App          │
│   - Erkennt neuen Scan  │ ← 3. GET /Methods/CheckReaderResultJSON
│   - Zeigt Daten an      │
└─────────────────────────┘
```

## 🔧 Technische Details

### API-Endpoints verwendet:

#### 1. Scan-Zähler prüfen
```
GET /Regula.SDK.Api/Methods/IsReaderResultTypeAvailable?AType=15
```
**Antwort:** Zahl (Anzahl der verfügbaren Ergebnisse)

#### 2. Scan-Ergebnisse abrufen
```
GET /Regula.SDK.Api/Methods/CheckReaderResultJSON?AType=15&AIdx=0
```
**Antwort:** JSON mit Bildern und Dokumentdaten

### Polling-Mechanismus:

```javascript
// Initialer Zähler
let initialCount = await GET('/Methods/IsReaderResultTypeAvailable?AType=15');

// Alle 1 Sekunde prüfen (max 60 Sekunden)
setInterval(() => {
  let newCount = await GET('/Methods/IsReaderResultTypeAvailable?AType=15');
  
  if (newCount > initialCount) {
    // Neuer Scan! Daten abrufen
    let results = await GET('/Methods/CheckReaderResultJSON?AType=15&AIdx=0');
    showResults(results);
  }
}, 1000);
```

## ✅ Vorteile dieser Lösung

1. **✅ Direkte Verbindung** - Keine File-System-Abhängigkeit
2. **✅ Echtzeit** - Ergebnisse sofort verfügbar (1 Sek Polling)
3. **✅ Zuverlässig** - Nutzt offizielle Regula SDK API
4. **✅ Sauber** - Keine temporären Dateien
5. **✅ Einfach** - ReaderDemo.exe muss nur laufen

## 📊 Was wird abgerufen?

### Bilder:
- **White Light** - Normales Bild
- **UV Light** - UV-Prüfung
- **IR Light** - Infrarot-Prüfung
- **RFID Images** - Falls RFID-Chip gelesen

### Dokumentdaten:
- **Dokumenttyp** - Personalausweis, Reisepass, etc.
- **Dokumentnummer**
- **Name** (Vorname, Nachname)
- **Geburtsdatum**
- **Ablaufdatum**
- **Nationalität**
- **Geschlecht**
- **Ausstellungsland**

## 🎯 Benutzer-Workflow

### Aus Sicht des Benutzers:

1. **Electron App öffnen**
2. **"Scanner" Button klicken**
3. **Dokument auf Scanner legen** (ReaderDemo.exe läuft minimiert)
4. **Scan wird automatisch erkannt**
5. **Ergebnisse erscheinen in Electron App** 🎉

### Aus Sicht der Technik:

1. Electron App startet API-Polling
2. Zeigt "Warte auf Scan..." an
3. Prüft jede Sekunde ob neue Ergebnisse da sind
4. Wenn ja: Lädt Daten und zeigt sie an
5. LED wird grün bei Erfolg

## 🔍 Logs zum Debuggen

### Erfolgreicher Scan:
```
[ELECTRON] performScanHybrid called - using ReaderDemo.exe backend with API polling
[ELECTRON] ReaderDemo.exe is running in background
[ELECTRON] Scanner API online at: https://localhost/Regula.SDK.Api
[ELECTRON] Waiting for scan in ReaderDemo.exe...
[ELECTRON] Initial result count: 5
[ELECTRON] Poll 1/60 - Result count: 5
[ELECTRON] Poll 2/60 - Result count: 5
[ELECTRON] Poll 3/60 - Result count: 6
[ELECTRON] ✓ New scan detected! Fetching results...
[ELECTRON] ✓ Scan results retrieved from API
[ELECTRON] Found 6 images
[ELECTRON] ✓ Document data extracted: {...}
```

### Timeout (kein Scan):
```
[ELECTRON] Poll 58/60 - Result count: 5
[ELECTRON] Poll 59/60 - Result count: 5
[ELECTRON] Poll 60/60 - Result count: 5
[ELECTRON] ⚠️ Polling timeout - no new scan detected in 60 seconds
```

## ⚙️ Konfiguration

### In scanner_settings:
```javascript
{
  use_hybrid_mode: true,           // Hybrid-Modus aktiviert
  auto_start_reader_demo: true,    // ReaderDemo.exe auto-start
  poll_interval: 1000,             // Polling alle 1 Sekunde
  poll_timeout: 60000              // Max 60 Sekunden warten
}
```

## 🐛 Troubleshooting

### Problem: "Scanner API not available"
**Lösung:** 
1. Prüfe ob Regula SDK Service läuft
2. Öffne Browser: `https://localhost/Regula.SDK.Api.Documentation/index`
3. Sollte Dokumentation zeigen

### Problem: "No scan detected"
**Lösung:**
1. Ist ReaderDemo.exe gestartet?
2. Wurde wirklich ein Dokument gescannt?
3. Läuft ReaderDemo.exe im richtigen Modus?

### Problem: "Polling timeout"
**Lösung:**
1. Scanne innerhalb von 60 Sekunden nach Klick auf "Scanner"
2. Stelle sicher dass ReaderDemo.exe nicht blockiert ist
3. Prüfe ob Scanner angeschlossen und erkannt ist

## 💡 Erweiterte Features

### LED-Feedback:
- **Gelb** - Warte auf Scan
- **Grün** - Scan erfolgreich
- **Rot** - Fehler oder Timeout

### PIN-Schutz:
- "Details" Button → PIN-Eingabe
- Bei korrekter PIN: ReaderDemo.exe in Vordergrund
- Beim Schließen: Wieder minimieren

## 🎯 Zusammenfassung

**Das Beste aus beiden Welten:**
- ✅ ReaderDemo.exe macht die Scanner-Kommunikation (bewährt, funktioniert)
- ✅ Electron App zeigt schöne UI (Benutzerfreundlich)
- ✅ API-Verbindung dazwischen (Schnell, zuverlässig)

**Kein File-Watching mehr nötig!**
**Direkte API-Kommunikation!**
**Sofortige Ergebnisse!**

---

**Version:** API-Polling v1.0
**Datum:** 2025-11-05
**Status:** Produktionsbereit 🚀
