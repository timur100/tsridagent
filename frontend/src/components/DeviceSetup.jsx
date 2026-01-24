import React, { useState, useEffect } from 'react';
import { Server, MapPin, Save, RefreshCw, Check, AlertTriangle, Wifi, Database, Settings, Download } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * DeviceSetup - Komponente zur Geräteeinrichtung
 * Ermöglicht die Registrierung eines Geräts mit Stationscode und Gerätenummer
 */
const DeviceSetup = ({ onComplete }) => {
  const [stationCode, setStationCode] = useState('');
  const [deviceNumber, setDeviceNumber] = useState('01');
  const [loading, setLoading] = useState(false);
  const [stationInfo, setStationInfo] = useState(null);
  const [registeredDevice, setRegisteredDevice] = useState(null);
  const [error, setError] = useState(null);
  const [isElectron, setIsElectron] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    // Prüfe ob Electron
    if (window.agentAPI && window.agentAPI.isElectron) {
      setIsElectron(true);
      loadSystemInfo();
      loadSavedConfig();
    }
  }, []);

  const loadSystemInfo = async () => {
    try {
      if (window.agentAPI && window.agentAPI.getSystemInfo) {
        const info = await window.agentAPI.getSystemInfo();
        setSystemInfo(info);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Systeminfo:', e);
    }
  };

  const loadSavedConfig = async () => {
    try {
      if (window.agentAPI && window.agentAPI.getDeviceConfig) {
        const config = await window.agentAPI.getDeviceConfig();
        if (config && config.station_code) {
          setStationCode(config.station_code);
          setDeviceNumber(config.device_number || '01');
          setRegisteredDevice(config);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Konfiguration:', e);
    }
  };

  const handleLookupStation = async () => {
    if (!stationCode.trim()) {
      setError('Bitte geben Sie einen Stationscode ein');
      return;
    }

    setLoading(true);
    setError(null);
    setStationInfo(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/agent/station/${stationCode.toUpperCase()}?device_number=${deviceNumber}`);
      const data = await response.json();

      if (data.success) {
        setStationInfo(data.station);
        toast.success('Station gefunden!');
      } else {
        setError(data.detail || 'Station nicht gefunden');
        toast.error('Station nicht gefunden');
      }
    } catch (e) {
      setError('Verbindungsfehler: ' + e.message);
      toast.error('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async () => {
    if (!stationInfo) {
      setError('Bitte suchen Sie zuerst eine Station');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registrationData = {
        station_code: stationCode.toUpperCase(),
        device_number: deviceNumber,
        device_id: systemInfo?.deviceId,
        hostname: systemInfo?.hostname,
        mac_address: systemInfo?.macAddresses?.[0],
        ip_address: systemInfo?.ipAddresses?.ipv4?.[0] || systemInfo?.ipAddresses?.[0],
        pc_serial: systemInfo?.pcSerial,
        scanner_serial: systemInfo?.connectedScanners?.[0]?.serial,
        teamviewer_id: systemInfo?.teamviewerId
      };

      const response = await fetch(`${BACKEND_URL}/api/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (data.success) {
        setRegisteredDevice(data);
        
        // Speichere Konfiguration im Electron Agent
        if (window.agentAPI && window.agentAPI.saveDeviceConfig) {
          await window.agentAPI.saveDeviceConfig({
            station_code: stationCode.toUpperCase(),
            device_number: deviceNumber,
            device_id: data.device_id,
            station: data.station,
            registered_at: new Date().toISOString()
          });
        }

        // Speichere auch im localStorage für Web-Zugriff
        localStorage.setItem('deviceConfig', JSON.stringify({
          station_code: stationCode.toUpperCase(),
          device_number: deviceNumber,
          device_id: data.device_id,
          station: data.station
        }));

        toast.success('Gerät erfolgreich registriert!');
        
        if (onComplete) {
          onComplete(data);
        }
      } else {
        setError(data.detail || 'Registrierung fehlgeschlagen');
        toast.error('Registrierung fehlgeschlagen');
      }
    } catch (e) {
      setError('Verbindungsfehler: ' + e.message);
      toast.error('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/agent/stations`);
      const data = await response.json();

      if (data.success && window.agentAPI && window.agentAPI.syncLocations) {
        await window.agentAPI.syncLocations(data.stations);
        toast.success(`${data.total} Standorte synchronisiert!`);
      } else if (data.success) {
        toast.success(`${data.total} Standorte geladen`);
      }
    } catch (e) {
      toast.error('Sync fehlgeschlagen: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Server className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Geräteeinrichtung</h2>
          <p className="text-sm text-muted-foreground">
            Registrieren Sie dieses Gerät mit dem Stationscode
          </p>
        </div>
      </div>

      {/* Bereits registriert */}
      {registeredDevice && (
        <Card className="p-4 bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-600">Gerät registriert</p>
              <p className="text-sm text-muted-foreground">
                {registeredDevice.station?.location_name || registeredDevice.station_code} - Gerät {registeredDevice.device_number || deviceNumber}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Eingabeformular */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stationscode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Stationscode *
            </label>
            <input
              type="text"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
              placeholder="z.B. BERN01"
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-mono text-lg"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Der Stationscode wird vom Administrator vergeben
            </p>
          </div>

          {/* Gerätenummer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Gerätenummer *
            </label>
            <input
              type="text"
              value={deviceNumber}
              onChange={(e) => setDeviceNumber(e.target.value)}
              placeholder="z.B. 01"
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-mono text-lg"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              Gerät 01, 02, 03 usw. an diesem Standort
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleLookupStation}
            disabled={loading || !stationCode.trim()}
            variant="outline"
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Station suchen
          </Button>

          <Button
            onClick={handleRegisterDevice}
            disabled={loading || !stationInfo}
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Gerät registrieren
          </Button>
        </div>

        {/* Fehler */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </Card>

      {/* Station Info */}
      {stationInfo && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <h3 className="font-semibold">Standortinformationen</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label="Standortname" value={stationInfo.location_name} />
            <InfoField label="Stationscode" value={stationInfo.station_code} mono />
            <InfoField label="Straße" value={stationInfo.street} />
            <InfoField label="PLZ / Stadt" value={`${stationInfo.zip} ${stationInfo.city}`} />
            <InfoField label="Bundesland" value={stationInfo.state} />
            <InfoField label="Land" value={stationInfo.country} />
            <InfoField label="Telefon" value={stationInfo.phone} />
            <InfoField label="E-Mail" value={stationInfo.email} />
            <InfoField label="TeamViewer-ID" value={stationInfo.tvid} mono />
            <InfoField label="Station-Seriennr." value={stationInfo.sn_station} mono />
          </div>
        </Card>
      )}

      {/* System Info (nur Electron) */}
      {isElectron && systemInfo && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              <h3 className="font-semibold">Geräteinformationen</h3>
            </div>
            <Button onClick={loadSystemInfo} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label="Hostname" value={systemInfo.hostname} />
            <InfoField label="Device-ID" value={systemInfo.deviceId} mono />
            <InfoField label="PC-Seriennummer" value={systemInfo.pcSerial} mono />
            <InfoField label="MAC-Adresse" value={systemInfo.macAddresses?.[0]} mono />
            <InfoField label="IP-Adresse" value={systemInfo.ipAddresses?.ipv4?.[0] || systemInfo.ipAddresses?.[0]} />
            <InfoField label="TeamViewer-ID" value={systemInfo.teamviewerId} mono />
            <InfoField label="Scanner" value={systemInfo.connectedScanners?.[0]?.serial || 'Nicht erkannt'} mono />
          </div>
        </Card>
      )}

      {/* Sync Button */}
      {isElectron && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Standorte synchronisieren</p>
                <p className="text-sm text-muted-foreground">
                  Lädt alle Standorte für den Offline-Betrieb
                </p>
              </div>
            </div>
            <Button onClick={handleSyncLocations} disabled={loading} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Sync
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

// Hilfskomponente für Info-Felder
const InfoField = ({ label, value, mono = false }) => (
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">{label}</label>
    <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>
      {value || '-'}
    </p>
  </div>
);

export default DeviceSetup;
