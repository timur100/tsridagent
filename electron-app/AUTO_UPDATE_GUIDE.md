# 🔄 Auto-Update Strategie für Electron App

## 📊 Update-Matrix

| Was wird geändert? | Automatisch? | Was tun? |
|-------------------|--------------|----------|
| **Frontend (React)** | ✅ JA | Nichts - lädt von Preview-URL |
| **Backend-APIs** | ✅ JA | Nichts - lädt vom Server |
| **Electron main.js** | ❌ NEIN | Dateien ersetzen + neu starten |
| **Electron preload.js** | ❌ NEIN | Dateien ersetzen + neu starten |
| **package.json** | ❌ NEIN | `yarn install` + neu starten |

---

## 🎯 Aktuelle Situation

### Was funktioniert automatisch:

Die Electron-App lädt die Preview-URL:
```javascript
const PREVIEW_URL = 'https://agent-hub-77.preview.emergentagent.com/portal/admin';
```

**Das bedeutet:**
- ✅ **Frontend-Entwicklung:** Sie entwickeln im Portal weiter → Änderungen sind sofort in der Electron-App sichtbar
- ✅ **UI-Updates:** Neue Komponenten, Design-Änderungen → automatisch
- ✅ **Backend-APIs:** Neue Endpunkte → automatisch verfügbar
- ✅ **Datenbank-Änderungen:** Neue Collections → automatisch

### Was NICHT automatisch funktioniert:

- ❌ **Neue USB-Handler** in `main.js`
- ❌ **Neue APIs** in `preload.js`
- ❌ **Neue Dependencies** in `package.json`
- ❌ **Electron-Konfiguration** ändern

---

## 🔄 Option 1: Manuelles Update (aktuell)

### Wenn Sie Electron-spezifische Änderungen machen:

**Schritt 1: Neue Dateien bereitstellen**
```
/app/electron-app/
├── main.js          ← Aktualisiert
├── preload.js       ← Aktualisiert
└── package.json     ← Aktualisiert
```

**Schritt 2: Benutzer lädt Updates herunter**
```bash
# Im electron-app Ordner:
# 1. Alte Dateien überschreiben mit neuen
# 2. Dependencies aktualisieren
yarn install

# 3. App neu starten
yarn start

# Oder neu bauen:
yarn build:win
```

---

## 🚀 Option 2: Automatisches Update (Empfohlen für Produktion)

### Electron Auto-Updater implementieren

Verwendet `electron-updater` für automatische Updates der .exe selbst.

#### Schritt 1: Dependencies hinzufügen

**Datei:** `package.json`
```json
{
  "dependencies": {
    "electron-updater": "^6.1.0"
  },
  "build": {
    "publish": {
      "provider": "github",
      "owner": "ihr-github-username",
      "repo": "ihr-repo-name"
    }
  }
}
```

#### Schritt 2: Auto-Updater in main.js

```javascript
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// Auto-Update Check beim Start
app.whenReady().then(() => {
  createWindow();
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
  
  // Alle 10 Minuten auf Updates prüfen
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 10 * 60 * 1000);
});

// Update Events
autoUpdater.on('update-available', () => {
  console.log('Update verfügbar!');
  // Optional: Dialog zeigen
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update heruntergeladen - wird beim nächsten Start installiert');
  // Optional: Benutzer fragen ob sofort neu starten
  autoUpdater.quitAndInstall();
});
```

#### Schritt 3: GitHub Releases nutzen

```bash
# 1. Neue Version bauen
yarn build:win

# 2. Git Tag erstellen
git tag v1.1.0
git push origin v1.1.0

# 3. GitHub Release erstellen
# - Auf GitHub: Releases → New Release
# - Tag v1.1.0 auswählen
# - Dateien hochladen:
#   - TSRID Admin Portal Setup 1.1.0.exe
#   - latest.yml

# 4. Fertig! Apps prüfen automatisch und aktualisieren sich
```

---

## 🌐 Option 3: Hybrid-Ansatz (Empfehlung)

**Frontend:** Lädt von Preview-URL (automatisch)
**Backend-APIs:** Lädt vom Server (automatisch)
**Electron-Shell:** Auto-Updater (halbautomatisch)

### Vorteile:
- ✅ 95% der Entwicklung braucht **kein Update** der .exe
- ✅ Nur bei neuen USB-Features muss die App aktualisiert werden
- ✅ Benutzer bekommt Benachrichtigung: "Update verfügbar"
- ✅ Update läuft im Hintergrund

---

## 📝 Best Practice: Versionierung

### Frontend-Changes (keine .exe nötig):
```
v1.0.0 → v1.0.1 → v1.0.2
```
→ Änderungen nur in React-Komponenten
→ Benutzer muss nichts tun

### Electron-Changes (.exe Update nötig):
```
v1.0.0 → v1.1.0
```
→ Neue USB-Handler, neue IPC-Funktionen
→ Benutzer bekommt Update-Benachrichtigung

### Breaking Changes:
```
v1.0.0 → v2.0.0
```
→ Komplette Electron-Neuimplementierung
→ Benutzer muss manuell neu installieren

---

## 🔧 Praktisches Beispiel

### Szenario 1: Neue UI-Komponente (automatisch)
```
Sie: Neues "QR-Code-Scanner" Tab im Frontend erstellen
App: Lädt von Preview-URL → Sofort verfügbar ✅
User: Drückt F5 in der App → Sieht neues Tab ✅
```

### Szenario 2: Neue USB-Funktion (manuell)
```
Sie: Neuer "Barcode-Reader" USB-Handler in main.js
App: Hat alte main.js → Funktion nicht verfügbar ❌
User: Lädt neue main.js → Startet App neu → Funktioniert ✅
```

### Szenario 3: Mit Auto-Updater (halbautomatisch)
```
Sie: Neue Version 1.2.0 auf GitHub Release
App: Prüft alle 10 Min → Findet Update
User: Sieht Benachrichtigung "Update verfügbar"
     → Klickt "Installieren"
     → App startet neu mit neuer Version ✅
```

---

## 💡 Empfehlung für Sie

### Kurzfristig (aktuell):
**Entwickeln Sie primär im Frontend!**

Vorteile:
- ✅ Änderungen sofort in Electron-App sichtbar
- ✅ Keine .exe-Updates nötig
- ✅ Schnellere Entwicklung

**USB-Spezifische Features:**
- Sammeln Sie mehrere Features
- Machen Sie gebündelte Releases (z.B. v1.1.0)
- Dokumentieren Sie Änderungen im Changelog

### Mittelfristig:
**Implementieren Sie Auto-Updater**

1. GitHub Repository für Releases einrichten
2. `electron-updater` integrieren (siehe oben)
3. Bei Electron-Updates: Version hochzählen + Release erstellen
4. Apps aktualisieren sich automatisch

### Langfristig:
**Eigener Update-Server (optional)**

Falls GitHub nicht gewünscht:
- Eigener Server mit Update-Feeds
- Signed Updates für Sicherheit
- Delta-Updates (nur Änderungen laden)

---

## 📋 Checkliste: Entwicklungs-Workflow

### Bei Frontend-Entwicklung:
- [ ] Im Portal weiterentwickeln
- [ ] Testen in Browser
- [ ] Electron-App neu laden (F5)
- [ ] Fertig ✅

### Bei Electron-Entwicklung:
- [ ] `main.js` oder `preload.js` ändern
- [ ] Version in `package.json` erhöhen
- [ ] Testen mit `yarn start`
- [ ] Changelog aktualisieren
- [ ] Release erstellen (GitHub oder manuell)
- [ ] Benutzer informieren über Update

---

## 🎯 Zusammenfassung

| Entwicklungstyp | Update-Methode | Benutzer-Aufwand |
|-----------------|----------------|-------------------|
| **Frontend (React)** | Automatisch via URL | 🟢 Keiner - F5 drücken |
| **Backend-APIs** | Automatisch vom Server | 🟢 Keiner |
| **Electron-Code (ohne Updater)** | Manuell ersetzen | 🔴 Dateien ersetzen + neu starten |
| **Electron-Code (mit Updater)** | Auto-Update | 🟡 Auf "Installieren" klicken |
| **Breaking Changes** | Manuelle Neuinstallation | 🔴 .exe neu installieren |

---

## 🚀 Quick Setup: Auto-Updater in 5 Minuten

```bash
# 1. Dependency hinzufügen
cd /app/electron-app
yarn add electron-updater

# 2. main.js am Ende hinzufügen:
cat >> main.js << 'EOF'

// Auto-Update
const { autoUpdater } = require('electron-updater');
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
EOF

# 3. package.json erweitern (build.publish Sektion)
# Siehe oben

# 4. Build erstellen
yarn build:win

# 5. Auf GitHub als Release veröffentlichen
# Fertig!
```

---

**Ihr aktueller Workflow ist optimal für Entwicklung!** 

Frontend-Änderungen aktualisieren sich automatisch. Für USB-spezifische Features können Sie Updates gebündelt bereitstellen. 🚀
