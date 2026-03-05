# TSRID Mobile App - Installation auf Zebra TC78

## Option 1: Expo Go (Empfohlen für Tests)

### Schritt 1: Expo Go installieren
1. Öffnen Sie den **Play Store** auf Ihrem TC78
2. Suchen Sie nach **"Expo Go"**
3. Installieren Sie die App

### Schritt 2: App starten
1. Öffnen Sie einen Browser auf dem TC78
2. Gehen Sie zu: **https://expo.dev/@tsrid/tsrid-mobile**
3. Oder scannen Sie diesen QR-Code mit Expo Go

### Schritt 3: DataWedge konfigurieren
Nach der Installation müssen Sie DataWedge für die App konfigurieren:

1. Öffnen Sie **DataWedge** auf dem TC78
2. Erstellen Sie ein neues Profil: **TSRID_Mobile**
3. Konfigurieren Sie:
   - **Barcode Input**: Aktiviert
   - **Intent Output**: Aktiviert
   - **Intent Action**: `com.tsrid.mobile.SCAN`
   - **Intent Delivery**: Broadcast

---

## Option 2: APK Build (Eigenständige App)

Um eine eigenständige APK zu erstellen, benötigen Sie einen Computer mit:
- Node.js 18+
- EAS CLI (`npm install -g eas-cli`)

### Build-Befehle:

```bash
# In den mobile-Ordner wechseln
cd /app/mobile

# EAS CLI installieren
npm install -g eas-cli

# Bei Expo einloggen
eas login

# APK für Zebra TC78 bauen
eas build --platform android --profile zebra-tc78

# Nach dem Build: APK herunterladen und auf TC78 übertragen
```

---

## Option 3: Direkter Download

Falls Sie die APK bereits gebaut haben:

1. Übertragen Sie die APK per USB oder Download auf das TC78
2. Öffnen Sie den **Dateimanager**
3. Navigieren Sie zur APK-Datei
4. Tippen Sie auf die Datei und wählen Sie **Installieren**
5. Bei Sicherheitswarnung: **Trotzdem installieren**

---

## DataWedge-Konfiguration für TSRID Mobile

### Automatische Konfiguration
Die App versucht automatisch ein DataWedge-Profil zu erstellen. Falls dies nicht funktioniert:

### Manuelle Konfiguration

1. **DataWedge öffnen** (App-Drawer → DataWedge)

2. **Neues Profil erstellen**:
   - Menü → New Profile
   - Name: `TSRID_Mobile`

3. **Profil konfigurieren**:
   ```
   Profile enabled: ✓
   
   Associated Apps:
   - com.tsrid.mobile / *
   
   Barcode Input:
   - Enabled: ✓
   - Scanner selection: Auto
   
   Keystroke Output:
   - Enabled: ✗ (deaktiviert)
   
   Intent Output:
   - Enabled: ✓
   - Intent action: com.tsrid.mobile.SCAN
   - Intent category: DEFAULT
   - Intent delivery: Broadcast intent
   ```

4. **Barcode-Typen aktivieren**:
   - Code 128: ✓
   - Code 39: ✓
   - EAN-13: ✓
   - EAN-8: ✓
   - QR Code: ✓
   - Data Matrix: ✓
   - UPC-A: ✓

---

## Fehlerbehebung

### Scanner funktioniert nicht
- Prüfen Sie, ob DataWedge läuft
- Prüfen Sie das aktive Profil
- Starten Sie die App neu

### Keine Verbindung zum Server
- Prüfen Sie die WLAN-Verbindung
- Prüfen Sie, ob die URL erreichbar ist:
  `https://windows-heartbeat.preview.emergentagent.com/api/health`

### App stürzt ab
- Cache leeren: Einstellungen → Apps → TSRID Mobile → Speicher → Cache leeren
- App neu installieren

---

## Support

Bei Problemen kontaktieren Sie:
- E-Mail: support@tsrid.com
- Dokumentation: https://docs.tsrid.com/mobile
