# 🎯 WICHTIG: Scanner-Fix Installationsanleitung

## ✅ Was wurde behoben?

**Problem:** Die App hat immer den falschen API-Modus verwendet (Streaming-Modus für Desko Pentascanner), aber dein Scanner ist ein **Standard Regula Document Reader SDK Scanner**.

**Lösung:** Die App verwendet jetzt die richtige **Process API** für Standard-Regula-Scanner.

---

## 📦 Schnellstart-Anleitung

### 1. Dateien entpacken
Entpacke diese ZIP-Datei auf deinem **Windows-PC**.

### 2. Abhängigkeiten installieren
Öffne PowerShell oder CMD im `electron-app` Ordner:
```cmd
cd pfad\zu\electron-app
npm install
```

### 3. App bauen
```cmd
npm run package-win
```

### 4. Installation
- Finde die fertige App in: `out/make/squirrel.windows/x64/`
- Installiere die Setup.exe
- Starte die App

---

## 🧪 Testen

1. **Regula SDK Service starten** (falls nicht läuft)
2. **App öffnen**
3. **"Scanner" Button klicken**
4. **Dokument auflegen**
5. **Sollte jetzt funktionieren!** ✅

---

## 📋 Was ist neu?

### Geänderte Dateien:
- **main.js** - Komplett überarbeitete Scanner-Integration
  - ❌ Entfernt: Hardcodierte "Desko Pentascanner" Annahme
  - ✅ Neu: Standard Regula SDK Process API
  - ✅ Neu: Richtige Fehlerbehandlung

### API-Änderungen:
```javascript
// ALT (funktionierte nicht):
GET /Methods/GetImages?AutoScan=true...

// NEU (sollte funktionieren):
POST /Methods/Process
{
  processParam: {
    scenario: 'MRZ',
    resultTypeOutput: ['IMAGES', 'MRZ_TEXT', ...],
    timeout: 30000
  }
}
```

---

## 📄 Weitere Dokumentation

1. **CRITICAL_FIX_SCANNER_API.md** - Technische Details zum Fix
2. **BUILD_FIXED_VERSION.md** - Ausführliche Build-Anleitung
3. **SCANNER-DEBUG.md** - Fehlersuche wenn Scanner offline ist

---

## ❓ Was tun wenn's nicht funktioniert?

### Scanner-Service prüfen:
1. Browser öffnen
2. Gehe zu: `https://localhost/Regula.SDK.Api.Documentation/index`
3. Sollte Dokumentationsseite zeigen ✅

### Logs prüfen:
1. App starten
2. F12 drücken (DevTools)
3. Console-Tab öffnen
4. Nach diesen Meldungen suchen:
   ```
   [ELECTRON] Using standard Regula SDK Process API
   [ELECTRON] ✓ Document detected! Processing...
   ```

### Noch Probleme?
- Logs in: `%APPDATA%\electron-scanner.log`
- Screenshots von Fehlermeldungen machen
- Console-Logs kopieren und senden

---

## 🔍 Erwartete Ausgabe nach Fix

### ✅ ERFOLG:
```
[ELECTRON] Scanner online at: https://localhost/Regula.SDK.Api
[ELECTRON] Using standard Regula SDK Process API
[ELECTRON] Calling Process API with settings
[ELECTRON] ✓ Document detected! Processing...
[ELECTRON] Processing 6 images
[ELECTRON] Document data extracted from ContainerList
[ELECTRON] ✓ Scan complete and processed successfully
```

### ❌ FEHLER (wenn's nicht geht):
```
[ELECTRON] Scanner offline!
[ELECTRON] ⚠️ Scanner returned empty result
[ELECTRON] Scanner error: ...
```

---

## 💡 Wichtige Hinweise

- **Node.js Version:** v18 oder höher empfohlen
- **Regula SDK:** Muss installiert und gestartet sein
- **Windows:** Nur für Windows 10/11 (x64)

---

## 📞 Support

Bei Problemen bitte folgende Infos bereitstellen:
1. Console-Logs (F12 → Console)
2. Electron Log-Datei (`%APPDATA%\electron-scanner.log`)
3. Screenshot von Fehler
4. Regula SDK Version (`GetServiceVersion` Antwort)

---

**Viel Erfolg! 🚀**

*Version: 2025-11-05 - Process API Fix*
