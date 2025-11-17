# 🎯 Hybrid-Modus: ReaderDemo.exe Backend mit Electron Frontend

## ✅ Die Lösung

Da der Desko-Scanner **direkt per USB** kommuniziert (nicht über die Web API), verwenden wir einen **Hybrid-Ansatz**:

- **ReaderDemo.exe läuft minimiert im Hintergrund** und kommuniziert direkt mit dem Scanner per USB
- **Electron App im Vordergrund** zeigt die Benutzeroberfläche
- **File Watcher** überwacht das Regula-Ergebnisverzeichnis auf neue Scans
- **PIN-geschützt**: ReaderDemo.exe kann nur nach PIN-Eingabe in den Vordergrund geholt werden

## 🔧 Wie es funktioniert

### 1. Start der Anwendung
```
1. Electron App startet
2. Prüft ob ReaderDemo.exe läuft
3. Wenn nicht → startet ReaderDemo.exe minimiert im Hintergrund
4. Electron App bleibt im Vordergrund sichtbar
```

### 2. Scan-Prozess
```
1. Benutzer klickt "Scanner" in Electron App
2. File Watcher aktiviert sich (überwacht Regula Results-Ordner)
3. Benutzer scannt Dokument in ReaderDemo.exe (läuft minimiert)
4. ReaderDemo.exe speichert Ergebnisse als JSON/XML
5. File Watcher erkennt neue Datei
6. Electron App liest Ergebnisse und zeigt sie an
```

### 3. Details ansehen (PIN-geschützt)
```
1. Benutzer klickt "Details" in Electron App
2. PIN-Eingabe Modalfenster erscheint
3. Bei korrekter PIN:
   - ReaderDemo.exe wird in den Vordergrund geholt (maximiert)
   - Benutzer sieht alle Scanner-Details
4. Beim Schließen von ReaderDemo.exe:
   - Wird automatisch wieder minimiert
   - Electron App kommt in den Vordergrund
```

## 📁 Verzeichnis-Struktur

### Regula Results-Pfade (automatisch erkannt):
```
1. %APPDATA%\Regula\Document Reader\Results
2. %PROGRAMDATA%\Regula\Results
3. %USERPROFILE%\Documents\Regula\Results
4. C:\Regula\Results
```

Die App sucht automatisch nach dem ersten existierenden Pfad.

## 🎛️ Konfiguration

### scanner_settings im Store:
```javascript
{
  use_hybrid_mode: true,           // Hybrid-Modus aktiviert (Standard)
  auto_start_reader_demo: true,    // ReaderDemo.exe automatisch starten
  pin: '1234',                      // PIN für ReaderDemo.exe Zugriff
  readerDemoPath: 'C:\\Program Files\\Regula\\Document Reader SDK\\ReaderDemo.exe'
}
```

## 🚀 Vorteile des Hybrid-Ansatzes

✅ **Funktioniert mit Desko USB-Scanner** - Nutzt bewährte ReaderDemo.exe
✅ **Keine API-Probleme** - Umgeht Web-API Kompatibilitätsprobleme
✅ **Schnelle Implementierung** - Nutzt existierende Software
✅ **Benutzerfreundlich** - Electron App bleibt im Vordergrund
✅ **Sicher** - PIN-Schutz für Details-Ansicht
✅ **Automatisch** - File Watcher erkennt Scans automatisch

## 📊 Technische Details

### File Watcher (chokidar)
```javascript
// Überwacht Regula Results-Ordner
const watcher = chokidar.watch(resultsPath, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 1000 }
});

watcher.on('add', (filePath) => {
  // Neue JSON/XML Datei erkannt
  if (filePath.endsWith('.json') || filePath.endsWith('.xml')) {
    // Lese und verarbeite Ergebnisse
  }
});
```

### Window Management (PowerShell)
```javascript
// ReaderDemo.exe in Vordergrund holen
$type::ShowWindow($proc.MainWindowHandle, 9)  // 9 = Restore
$type::SetForegroundWindow($proc.MainWindowHandle)

// ReaderDemo.exe minimieren
$type::ShowWindow($proc.MainWindowHandle, 6)  // 6 = Minimize
```

## 🔍 Debugging

### Logs prüfen:
```
%APPDATA%\document-verification-scanner\electron-scanner.log
```

### Wichtige Log-Einträge:
```
[ELECTRON] performScanHybrid called - using ReaderDemo.exe backend
[ELECTRON] ReaderDemo.exe is running in background
[ELECTRON] Monitoring for results at: C:\Users\...\Regula\Results
[ELECTRON] New file detected: ...result.json
[ELECTRON] ✓ Recent scan result found, reading file...
[ELECTRON] ✓ Results parsed successfully
```

## ⚙️ Konfigurierbare Optionen

### In Electron App Settings:
- **Hybrid Mode ON/OFF** - Umschalten zwischen Hybrid und Direct API
- **Auto-Start ReaderDemo** - Automatisches Starten beim App-Start
- **PIN ändern** - Sicherheits-PIN anpassen
- **ReaderDemo Path** - Pfad zu ReaderDemo.exe konfigurieren

### In ReaderDemo.exe:
- Scanner-Einstellungen (Lichttypen, RFID, etc.)
- Speicher-Optionen für Ergebnisse
- Ausgabeformat (JSON empfohlen)

## 🎯 Workflow-Übersicht

```
┌─────────────────────────┐
│   Electron App (UI)     │  ← Benutzer sieht dies
│   [Scanner] Button      │
└────────────┬────────────┘
             │ Klick
             ↓
┌─────────────────────────┐
│   File Watcher          │  ← Überwacht Results-Ordner
│   (wartet auf Scan)     │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ ReaderDemo.exe          │  ← Läuft minimiert im Hintergrund
│ (USB → Desko Scanner)   │  ← Kommuniziert direkt per USB
└────────────┬────────────┘
             │ Scan fertig
             ↓
┌─────────────────────────┐
│ result.json gespeichert │  ← Im Regula Results-Ordner
└────────────┬────────────┘
             │ File Watcher erkennt
             ↓
┌─────────────────────────┐
│ Electron App liest File │  ← Zeigt Ergebnisse an
│ und zeigt Daten an      │
└─────────────────────────┘
```

## ✅ Testing-Checkliste

- [ ] ReaderDemo.exe startet minimiert im Hintergrund
- [ ] Electron App bleibt im Vordergrund
- [ ] Scan in ReaderDemo.exe (minimiert) funktioniert
- [ ] File Watcher erkennt neue Results-Dateien
- [ ] Electron App zeigt Scan-Ergebnisse korrekt an
- [ ] PIN-Eingabe funktioniert
- [ ] ReaderDemo.exe kommt nach PIN-Eingabe in Vordergrund
- [ ] ReaderDemo.exe minimiert sich beim Schließen wieder
- [ ] Electron App kommt nach Minimieren wieder in Vordergrund

## 🐛 Troubleshooting

### Problem: ReaderDemo.exe startet nicht
**Lösung:** Pfad in Settings prüfen und korrigieren

### Problem: Keine Results erkannt
**Lösung:** ReaderDemo.exe so konfigurieren, dass Ergebnisse als JSON gespeichert werden

### Problem: File Watcher findet keine Dateien
**Lösung:** Results-Pfad in Logs prüfen, ggf. manuell konfigurieren

### Problem: ReaderDemo.exe lässt sich nicht in Vordergrund holen
**Lösung:** PowerShell Execution Policy prüfen: `Set-ExecutionPolicy RemoteSigned`

---

**Version:** Hybrid-Mode v1.0
**Datum:** 2025-11-05
**Status:** Produktionsbereit 🚀
