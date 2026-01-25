import React, { useState, useEffect, useCallback } from 'react';
import { Server, MapPin, Save, RefreshCw, Check, AlertTriangle, Wifi, WifiOff, Database, Settings, Download, Search, Plus, Building2, Filter } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * DeviceSetup - Komponente zur Geräteeinrichtung mit Offline-Support
 * - Lädt Standorte von Atlas (unified_locations)
 * - Speichert in SQLite für Offline-Zugriff
 * - Unterstützt Multi-Tenant-Filterung
 * - Echtzeit-Sync wenn Internet verfügbar
 */
const DeviceSetup = ({ onComplete }) => {
  const [stationCode, setStationCode] = useState('');
  const [deviceNumber, setDeviceNumber] = useState('01');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stationInfo, setStationInfo] = useState(null);
  const [registeredDevice, setRegisteredDevice] = useState(null);
  const [error, setError] = useState(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [systemInfo, setSystemInfo] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Multi-Tenant State
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Online/Offline Status überwachen
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Verbindung wiederhergestellt - Synchronisiere...');
      syncLocationsFromAtlas();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Offline-Modus aktiviert');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Prüfe ob Electron
    if (window.agentAPI && window.agentAPI.isElectron) {
      setIsElectron(true);
      loadSystemInfo();
      loadSavedConfig();
    }
    
    // Lade Tenants und Standorte
    loadTenants();
    loadLocations();
  }, []);

  // Wenn Tenant geändert wird, lade Standorte neu
  useEffect(() => {
    if (selectedTenant !== undefined) {
      loadLocations();
    }
  }, [selectedTenant]);

  // Suchfilter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocations(allLocations);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLocations(
        allLocations.filter(loc => 
          loc.name?.toLowerCase().includes(query) ||
          loc.station_code?.toLowerCase().includes(query) ||
          loc.city?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allLocations]);

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

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      // Lade zuerst die Root-Organisationen (Europcar, Puma, etc.)
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/tenants/top-level`);
      const data = await response.json();
      
      if (data.success && data.tenants) {
        // "Alle anzeigen" Option + Root-Organisationen
        const topLevel = [
          { tenant_id: '', name: 'Alle Tenants', display_name: 'Alle anzeigen' },
          ...data.tenants
        ];
        setTenants(topLevel);
        console.log('Loaded tenants:', topLevel.length);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Tenants:', e);
      // Fallback: Setze Standard-Optionen
      setTenants([
        { tenant_id: '', name: 'Alle Tenants', display_name: 'Alle anzeigen' },
        { tenant_id: '1d3653db-86cb-4dd1-9ef5-0236b116def8', name: 'Europcar', display_name: 'Europcar' }
      ]);
    } finally {
      setLoadingTenants(false);
    }
  };

  const loadLocations = async () => {
    // Versuche zuerst von Atlas zu laden
    if (isOnline) {
      await syncLocationsFromAtlas();
    } else {
      // Offline: Lade von SQLite/LocalStorage
      await loadLocationsFromCache();
    }
  };

  const syncLocationsFromAtlas = async () => {
    setSyncing(true);
    try {
      // Baue URL mit optionalem Tenant-Filter
      let url = `${BACKEND_URL}/api/unified-locations/all`;
      if (selectedTenant) {
        url += `?tenant_id=${encodeURIComponent(selectedTenant)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.locations) {
        setAllLocations(data.locations);
        setFilteredLocations(data.locations);
        setLastSyncTime(new Date().toISOString());
        
        // Speichere in Cache (Electron SQLite oder LocalStorage)
        if (window.agentAPI && window.agentAPI.syncLocations) {
          await window.agentAPI.syncLocations(data.locations);
        } else {
          localStorage.setItem('cachedLocations', JSON.stringify({
            locations: data.locations,
            syncTime: new Date().toISOString(),
            tenant: selectedTenant
          }));
        }
        
        const tenantInfo = selectedTenant ? ` (${selectedTenant})` : '';
        toast.success(`${data.total} Standorte synchronisiert${tenantInfo}`);
      }
    } catch (e) {
      console.error('Sync fehlgeschlagen:', e);
      // Fallback auf Cache
      await loadLocationsFromCache();
    } finally {
      setSyncing(false);
    }
  };

  const loadLocationsFromCache = async () => {
    try {
      // Electron: SQLite
      if (window.agentAPI && window.agentAPI.getCachedLocations) {
        const cached = await window.agentAPI.getCachedLocations();
        if (cached && cached.length > 0) {
          setAllLocations(cached);
          setFilteredLocations(cached);
          toast.success(`${cached.length} Standorte aus Cache geladen`);
          return;
        }
      }
      
      // Web: LocalStorage
      const cached = localStorage.getItem('cachedLocations');
      if (cached) {
        const data = JSON.parse(cached);
        setAllLocations(data.locations || []);
        setFilteredLocations(data.locations || []);
        setLastSyncTime(data.syncTime);
        toast.success(`${data.locations?.length || 0} Standorte aus Cache geladen`);
      }
    } catch (e) {
      console.error('Cache laden fehlgeschlagen:', e);
    }
  };

  const handleSelectLocation = (location) => {
    setStationCode(location.station_code);
    setStationInfo(location);
    setShowLocationPicker(false);
    toast.success(`${location.name} ausgewählt`);
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
      // Zuerst im lokalen Cache suchen
      const localMatch = allLocations.find(l => 
        l.station_code?.toLowerCase() === stationCode.toLowerCase()
      );
      
      if (localMatch) {
        setStationInfo(localMatch);
        toast.success('Station gefunden (Cache)');
        setLoading(false);
        return;
      }

      // Falls online, von Atlas laden
      if (isOnline) {
        const response = await fetch(`${BACKEND_URL}/api/unified-locations/station/${stationCode.toUpperCase()}`);
        const data = await response.json();

        if (data.success) {
          setStationInfo(data.station);
          toast.success('Station gefunden (Atlas)');
        } else {
          setError(data.detail || 'Station nicht gefunden');
          toast.error('Station nicht gefunden');
        }
      } else {
        setError('Station nicht im Offline-Cache gefunden');
        toast.error('Offline: Station nicht im Cache');
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

      // Online: Bei Atlas registrieren
      if (isOnline) {
        const response = await fetch(`${BACKEND_URL}/api/agent/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (data.success) {
          setRegisteredDevice(data);
          await saveDeviceConfig(data);
          toast.success('Gerät erfolgreich registriert!');
          
          if (onComplete) {
            onComplete(data);
          }
        } else {
          setError(data.detail || 'Registrierung fehlgeschlagen');
          toast.error('Registrierung fehlgeschlagen');
        }
      } else {
        // Offline: Lokal speichern, später synchronisieren
        const offlineData = {
          ...registrationData,
          station: stationInfo,
          registered_offline: true,
          registered_at: new Date().toISOString()
        };
        
        await saveDeviceConfig(offlineData);
        setRegisteredDevice(offlineData);
        toast.success('Gerät lokal registriert (Sync bei Verbindung)');
      }
    } catch (e) {
      setError('Fehler: ' + e.message);
      toast.error('Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const saveDeviceConfig = async (data) => {
    const config = {
      station_code: stationCode.toUpperCase(),
      device_number: deviceNumber,
      device_id: data.device_id,
      station: data.station || stationInfo,
      registered_at: new Date().toISOString()
    };
    
    // Electron: SQLite
    if (window.agentAPI && window.agentAPI.saveDeviceConfig) {
      await window.agentAPI.saveDeviceConfig(config);
    }
    
    // Web: LocalStorage
    localStorage.setItem('deviceConfig', JSON.stringify(config));
  };

  return (
    <div className="space-y-6">
      {/* Header mit Online-Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Geräteeinrichtung</h2>
            <p className="text-sm text-muted-foreground">
              Registrieren Sie dieses Gerät mit dem Stationscode
            </p>
          </div>
        </div>
        
        {/* Online/Offline Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isOnline 
            ? 'bg-green-500/20 text-green-600' 
            : 'bg-yellow-500/20 text-yellow-600'
        }`}>
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              Offline
            </>
          )}
        </div>
      </div>

      {/* Sync-Status */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {allLocations.length} Standorte verfügbar
              </p>
              <p className="text-xs text-muted-foreground">
                {lastSyncTime 
                  ? `Letzte Sync: ${new Date(lastSyncTime).toLocaleString('de-DE')}`
                  : 'Noch nicht synchronisiert'}
                {selectedTenant && ` • Filter: ${selectedTenant}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tenant-Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                disabled={loadingTenants}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="tenant-filter-dropdown"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.display_name || tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              onClick={syncLocationsFromAtlas} 
              disabled={syncing || !isOnline}
              variant="outline" 
              size="sm"
              className="gap-2"
              data-testid="sync-locations-btn"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sync...' : 'Sync'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bereits registriert */}
      {registeredDevice && (
        <Card className="p-4 bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-600">Gerät registriert</p>
              <p className="text-sm text-muted-foreground">
                {registeredDevice.station?.name || registeredDevice.station_code} - Gerät {registeredDevice.device_number || deviceNumber}
                {registeredDevice.registered_offline && ' (Offline)'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Eingabeformular */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stationscode mit Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Stationscode *
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                placeholder="z.B. BERN01"
                className="font-mono text-lg"
                maxLength={20}
              />
              <Button
                onClick={() => setShowLocationPicker(true)}
                variant="outline"
                title="Station auswählen"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Gerätenummer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Gerätenummer *
            </label>
            <Input
              type="text"
              value={deviceNumber}
              onChange={(e) => setDeviceNumber(e.target.value)}
              placeholder="z.B. 01"
              className="font-mono text-lg"
              maxLength={3}
            />
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
            <InfoField label="Standortname" value={stationInfo.name} />
            <InfoField label="Stationscode" value={stationInfo.station_code} mono />
            <InfoField label="Straße" value={stationInfo.street} />
            <InfoField label="PLZ / Stadt" value={`${stationInfo.zip || ''} ${stationInfo.city || ''}`} />
            <InfoField label="Bundesland" value={stationInfo.state} />
            <InfoField label="Land" value={stationInfo.country} />
            <InfoField label="Telefon" value={stationInfo.phone} />
            <InfoField label="E-Mail" value={stationInfo.email} />
            <InfoField label="TeamViewer-ID" value={stationInfo.tvid} mono />
            <InfoField label="Quelle" value={stationInfo.source} />
          </div>
        </Card>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg">Standort auswählen</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowLocationPicker(false)}>
                ✕
              </Button>
            </div>
            
            <div className="p-4 border-b border-border">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen nach Name, Code oder Stadt..."
                className="w-full"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {filteredLocations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Keine Standorte gefunden
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLocations.map((loc, i) => (
                    <button
                      key={loc.station_code || i}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full p-3 text-left hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {loc.station_code} • {loc.city}, {loc.country}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
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
