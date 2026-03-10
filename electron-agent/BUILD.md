# TSR Electron Agent - Build & Deployment

## Übersicht

Der TSR Electron Agent ist eine Desktop-Anwendung für die ID-Verifikation mit Regula Scanner-Integration. Diese Anleitung beschreibt, wie Sie die Build-Pipeline einrichten und den Agent auf Geräte verteilen.

## Voraussetzungen

- Node.js 20+
- Yarn
- GitHub Account (für CI/CD)
- Code Signing Zertifikate (optional, für Produktion)

## Lokale Entwicklung

```bash
cd electron-agent

# Dependencies installieren
yarn install

# Development Mode starten
yarn dev

# Production Build erstellen
yarn build
```

## GitHub Actions Pipeline

Die Pipeline baut automatisch für alle Plattformen wenn ein Version-Tag erstellt wird.

### Workflow aktivieren

1. Pushen Sie den `electron-agent/` Ordner zu Ihrem GitHub Repository
2. Der Workflow ist bereits in `.github/workflows/build.yml` definiert
3. Erstellen Sie einen Release-Tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

4. GitHub Actions startet automatisch den Build
5. Nach erfolgreichem Build werden die Artefakte als GitHub Release veröffentlicht
6. Das Portal wird automatisch benachrichtigt (wenn `PORTAL_API_URL` und `PORTAL_API_KEY` Secrets konfiguriert sind)

### GitHub Secrets konfigurieren

| Secret | Beschreibung |
|--------|--------------|
| `PORTAL_API_URL` | URL des TSR Portals (z.B. `https://agent.tsrid.com`) |
| `PORTAL_API_KEY` | API-Key für die Build-Benachrichtigung |

## Build-Artefakte

| Plattform | Datei | Beschreibung |
|-----------|-------|--------------|
| Windows | `tsr-agent-{version}-setup.exe` | Installer mit UAC |
| Windows | `tsr-agent-{version}-portable.exe` | Portable Version |
| macOS | `tsr-agent-{version}.dmg` | Disk Image |
| Linux | `tsr-agent-{version}.AppImage` | Portable AppImage |
| Linux | `tsr-agent-{version}.deb` | Debian Package |

## Auto-Update Konfiguration

Der Agent prüft automatisch auf Updates beim Start. Die Update-URL ist in `package.json` konfiguriert:

```json
"publish": {
  "provider": "generic",
  "url": "https://agent.tsrid.com/electron/updates"
}
```

Für GitHub Releases:

```json
"publish": {
  "provider": "github",
  "owner": "ihr-github-user",
  "repo": "tsr-agent"
}
```

## Code Signing (Produktion)

### Windows

1. Erwerben Sie ein Code Signing Zertifikat (z.B. DigiCert, Sectigo)
2. Konfigurieren Sie die GitHub Secrets:
   - `WIN_CSC_LINK`: Base64-codiertes .pfx Zertifikat
   - `WIN_CSC_KEY_PASSWORD`: Zertifikat-Passwort

### macOS

1. Apple Developer Programm Mitgliedschaft
2. Developer ID Application Zertifikat
3. Konfigurieren Sie:
   - `CSC_LINK`: Base64-codiertes .p12 Zertifikat
   - `CSC_KEY_PASSWORD`: Zertifikat-Passwort
   - `APPLE_ID`: Apple Developer Email
   - `APPLE_ID_PASSWORD`: App-spezifisches Passwort
   - `APPLE_TEAM_ID`: Team ID

## Fehlerbehebung

### Build schlägt fehl

1. Prüfen Sie die GitHub Actions Logs
2. Stellen Sie sicher, dass `yarn.lock` vorhanden ist
3. Prüfen Sie die Node.js Version (20+)

### Update funktioniert nicht

1. Prüfen Sie die Update-URL in `package.json`
2. Stellen Sie sicher, dass `latest.yml` veröffentlicht wird
3. Prüfen Sie CORS-Einstellungen auf dem Server

### Scanner wird nicht erkannt

1. Regula SDK muss lokal installiert sein
2. Scanner muss per USB verbunden sein
3. Prüfen Sie die Logs: `%APPDATA%/tsr-agent/logs/`

## Support

Bei Fragen wenden Sie sich an: support@tsrid.com
