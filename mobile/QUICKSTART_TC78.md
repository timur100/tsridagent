# TSRID Mobile - Schnellstart für Zebra TC78

## Schritt 1: Expo Go installieren

1. Öffnen Sie den **Play Store** auf Ihrem TC78
2. Suchen Sie nach **"Expo Go"** (von Expo Project)
3. Installieren Sie die App (~50 MB)

## Schritt 2: App testen

### Option A: Expo Snack (Empfohlen)

Öffnen Sie diesen Link im Browser des TC78:

**https://snack.expo.dev/@emergent/tsrid-mobile-demo**

Dieser Link enthält eine Demo-Version der App, die Sie sofort testen können.

---

### Option B: Lokaler Build

Falls Sie die vollständige App lokal bauen möchten:

1. **Auf Ihrem Computer** (mit Node.js installiert):

```bash
# Repository klonen oder Dateien kopieren
cd tsrid-mobile

# Dependencies installieren
npm install

# Expo starten
npx expo start
```

2. **QR-Code scannen**:
   - Öffnen Sie **Expo Go** auf dem TC78
   - Tippen Sie auf "Scan QR Code"
   - Scannen Sie den QR-Code vom Terminal

---

## Schritt 3: DataWedge konfigurieren

Nach dem ersten Start der App:

1. Öffnen Sie **DataWedge** (im App-Drawer)
2. Erstellen Sie ein neues Profil: **TSRID_Mobile**
3. Aktivieren Sie:
   - Barcode Input: ✓
   - Intent Output: ✓
   - Intent Action: `com.tsrid.mobile.SCAN`

---

## Test-Anleitung

### Scanner testen
1. App öffnen → Scanner Tab
2. Hardware-Scan-Taste drücken (gelbe Tasten seitlich)
3. Barcode scannen
4. Ergebnis wird angezeigt

### Login testen
- E-Mail: `admin@tsrid.com`
- Passwort: `admin123`

### API-Verbindung
Die App verbindet sich mit:
`https://tc78-device-portal.preview.emergentagent.com`

---

## Häufige Probleme

### "Network Error"
→ WLAN-Verbindung prüfen

### Scanner funktioniert nicht
→ DataWedge-Profil prüfen

### App lädt nicht
→ Cache leeren und neu starten
