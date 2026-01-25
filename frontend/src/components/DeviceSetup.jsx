import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Building2, Globe, Map, Search, Monitor, Link2, Check, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * DeviceSetup - Hierarchische Standort- und Geräteauswahl
 * Flow: Kontinent → Land → Stadt → Standort → Gerät auswählen → Koppeln
 */
const DeviceSetup = ({ onComplete }) => {
  // Hierarchische Auswahl States
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // Ausgewählte Werte
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [coupling, setCoupling] = useState(false);
  const [coupledDevice, setCoupledDevice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Lade gespeicherte Kopplung beim Start
  useEffect(() => {
    const saved = localStorage.getItem('deviceConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.coupled_at) {
          setCoupledDevice(config);
        }
      } catch (e) {
        console.error('Fehler beim Laden der Konfiguration:', e);
      }
    }
    // Lade Länder beim Start
    loadCountries();
  }, []);

  // Lade alle verfügbaren Länder
  const loadCountries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/countries`);
      const data = await response.json();
      if (data.success) {
        setCountries(data.countries || []);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Länder:', e);
      // Fallback
      setCountries(['Deutschland', 'Österreich', 'Schweiz']);
    } finally {
      setLoading(false);
    }
  };

  // Lade Städte für ausgewähltes Land
  const loadCities = async (country) => {
    if (!country) return;
    setLoading(true);
    setCities([]);
    setLocations([]);
    setDevices([]);
    setSelectedCity('');
    setSelectedLocation(null);
    setSelectedDevice(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/cities?country=${encodeURIComponent(country)}`);
      const data = await response.json();
      if (data.success) {
        setCities(data.cities || []);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Städte:', e);
    } finally {
      setLoading(false);
    }
  };

  // Lade Standorte für ausgewählte Stadt
  const loadLocations = async (city) => {
    if (!city) return;
    setLoading(true);
    setLocations([]);
    setDevices([]);
    setSelectedLocation(null);
    setSelectedDevice(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/by-city?city=${encodeURIComponent(city)}&country=${encodeURIComponent(selectedCountry)}`);
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Standorte:', e);
    } finally {
      setLoading(false);
    }
  };

  // Lade Geräte für ausgewählten Standort
  const loadDevices = async (locationCode) => {
    if (!locationCode) return;
    setLoading(true);
    setDevices([]);
    setSelectedDevice(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/devices?location_code=${encodeURIComponent(locationCode)}`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Geräte:', e);
    } finally {
      setLoading(false);
    }
  };

  // Handler für Land-Auswahl
  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    loadCities(country);
  };

  // Handler für Stadt-Auswahl
  const handleCityChange = (city) => {
    setSelectedCity(city);
    loadLocations(city);
  };

  // Handler für Standort-Auswahl
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    loadDevices(location.station_code);
  };

  // Handler für Gerät-Auswahl
  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };

  // Gerät koppeln/zuweisen
  const handleCoupleDevice = async () => {
    if (!selectedDevice || !selectedLocation) {
      toast.error('Bitte wählen Sie einen Standort und ein Gerät aus');
      return;
    }
    
    setCoupling(true);
    try {
      // Hole zuerst die detaillierten Standortdaten vom Server
      let stationDetails = {};
      try {
        const detailsResponse = await fetch(
          `${BACKEND_URL}/api/unified-locations/station-details/${selectedLocation.station_code}`
        );
        const detailsData = await detailsResponse.json();
        if (detailsData.success && detailsData.details) {
          stationDetails = detailsData.details;
          console.log('Station details loaded:', stationDetails);
        }
      } catch (e) {
        console.warn('Konnte Standortdetails nicht laden:', e);
      }
      
      // Sende Kopplungsanfrage an Backend
      const response = await fetch(`${BACKEND_URL}/api/agent/couple-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice.device_id,
          location_code: selectedLocation.station_code,
          location_name: stationDetails.name || selectedLocation.name,
          city: stationDetails.city || selectedLocation.city,
          country: stationDetails.country || selectedLocation.country,
          customer: selectedDevice.customer
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Speichere Kopplung lokal mit allen verfügbaren Daten (Station Details haben Priorität)
        const config = {
          device_id: selectedDevice.device_id,
          station_code: selectedLocation.station_code,
          location_code: stationDetails.location_code || selectedDevice.locationcode || selectedLocation.station_code,
          location_name: stationDetails.name || selectedLocation.name,
          street: stationDetails.street || selectedDevice.street || '',
          zip: stationDetails.plz || selectedDevice.plz || '',
          city: stationDetails.city || selectedDevice.city || selectedLocation.city,
          bundesland: stationDetails.bundesland || '',
          country: stationDetails.country || selectedDevice.country || selectedLocation.country,
          continent: stationDetails.continent || 'Europa',
          customer: stationDetails.tenant || selectedDevice.customer,
          manager: stationDetails.manager || '',
          phone: stationDetails.phone || selectedDevice.phone || '',
          phone_intern: stationDetails.phone_intern || '',
          email: stationDetails.email || selectedDevice.email || '',
          tvid: selectedDevice.tvid || selectedDevice.teamviewer_id || stationDetails.tv_id || '',
          sn_pc: selectedDevice.sn_pc || stationDetails.sn_pc || '',
          sn_sc: selectedDevice.sn_sc || stationDetails.sn_sc || '',
          main_typ: stationDetails.main_typ || '',
          switch: stationDetails.switch || '',
          port: stationDetails.port || '',
          opening_hours: stationDetails.opening_hours || null,
          status: selectedDevice.status || 'unknown',
          coupled_at: new Date().toISOString(),
          registered_at: new Date().toISOString()
        };
          status: selectedDevice.status || 'unknown',
          coupled_at: new Date().toISOString(),
          registered_at: new Date().toISOString()
        };
        
        localStorage.setItem('deviceConfig', JSON.stringify(config));
        setCoupledDevice(config);
        
        toast.success(`Gerät ${selectedDevice.device_id} erfolgreich gekoppelt!`);
        
        if (onComplete) {
          onComplete(config);
        }
      } else {
        toast.error(data.message || 'Kopplung fehlgeschlagen');
      }
    } catch (e) {
      console.error('Kopplungsfehler:', e);
      // Offline-Modus: Speichere trotzdem lokal mit allen verfügbaren Daten
      const config = {
        device_id: selectedDevice.device_id,
        station_code: selectedLocation.station_code,
        location_code: selectedDevice.locationcode || selectedLocation.station_code,
        location_name: selectedLocation.name,
        street: selectedDevice.street || selectedLocation.street || '',
        zip: selectedDevice.plz || selectedLocation.zip || '',
        city: selectedDevice.city || selectedLocation.city,
        country: selectedDevice.country || selectedLocation.country,
        customer: selectedDevice.customer,
        tvid: selectedDevice.tvid || selectedDevice.teamviewer_id || '',
        sn_pc: selectedDevice.sn_pc || '',
        sn_sc: selectedDevice.sn_sc || '',
        phone: selectedDevice.phone || selectedDevice.telefon || '',
        email: selectedDevice.email || '',
        status: selectedDevice.status || 'unknown',
        coupled_at: new Date().toISOString(),
        offline_coupled: true
      };
      
      localStorage.setItem('deviceConfig', JSON.stringify(config));
      setCoupledDevice(config);
      toast.success('Gerät lokal gekoppelt (Offline-Modus)');
    } finally {
      setCoupling(false);
    }
  };

  // Kopplung aufheben
  const handleUncoupleDevice = () => {
    localStorage.removeItem('deviceConfig');
    setCoupledDevice(null);
    setSelectedDevice(null);
    toast.success('Kopplung aufgehoben');
  };

  // Gefilterte Standorte basierend auf Suche
  const filteredLocations = locations.filter(loc => 
    !searchQuery || 
    loc.station_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Aktuell gekoppeltes Gerät */}
      {coupledDevice && (
        <Card className="p-4 bg-green-500/10 border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-full">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Gekoppeltes Gerät</p>
                <p className="text-sm text-muted-foreground">
                  {coupledDevice.device_id} @ {coupledDevice.station_code} - {coupledDevice.location_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gekoppelt: {new Date(coupledDevice.coupled_at).toLocaleString('de-DE')}
                  {coupledDevice.offline_coupled && ' (Offline)'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUncoupleDevice}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              Entkoppeln
            </Button>
          </div>
        </Card>
      )}

      {/* Hierarchische Auswahl */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Standort auswählen
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Land Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Globe className="h-4 w-4" /> Land
            </label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger data-testid="country-select">
                <SelectValue placeholder="Land wählen..." />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stadt Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="h-4 w-4" /> Stadt
            </label>
            <Select 
              value={selectedCity} 
              onValueChange={handleCityChange}
              disabled={!selectedCountry || cities.length === 0}
            >
              <SelectTrigger data-testid="city-select">
                <SelectValue placeholder={selectedCountry ? "Stadt wählen..." : "Erst Land wählen"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Suche */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Search className="h-4 w-4" /> Suche
            </label>
            <Input
              placeholder="Standort suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="location-search"
            />
          </div>
        </div>

        {/* Standortliste */}
        {selectedCity && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground">
              Verfügbare Standorte ({filteredLocations.length})
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Lade Standorte...
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Keine Standorte gefunden
                </div>
              ) : (
                filteredLocations.map((location) => (
                  <div
                    key={location.station_code}
                    className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedLocation?.station_code === location.station_code ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => handleLocationSelect(location)}
                    data-testid={`location-${location.station_code}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-primary">{location.station_code}</span>
                        <span className="mx-2 text-muted-foreground">-</span>
                        <span className="text-foreground">{location.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {location.street}, {location.zip} {location.city}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Geräteauswahl */}
      {selectedLocation && (
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Gerät auswählen
            <span className="text-sm font-normal text-muted-foreground">
              ({selectedLocation.station_code})
            </span>
          </h3>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground">
              Verfügbare Geräte ({devices.length})
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Lade Geräte...
                </div>
              ) : devices.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Keine Geräte an diesem Standort registriert
                </div>
              ) : (
                devices.map((device) => (
                  <div
                    key={device.device_id}
                    className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedDevice?.device_id === device.device_id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                    data-testid={`device-${device.device_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-mono font-semibold text-foreground">{device.device_id}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        device.status === 'online' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {device.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                      <span>SN-PC: {device.sn_pc || '-'}</span>
                      <span>SN-SC: {device.sn_sc || '-'}</span>
                      <span>TVID: {device.tvid || '-'}</span>
                      <span>Kunde: {device.customer || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Koppeln Button */}
      {selectedDevice && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Ausgewähltes Gerät</p>
              <p className="text-sm text-muted-foreground">
                {selectedDevice.device_id} @ {selectedLocation.station_code} - {selectedLocation.name}
              </p>
            </div>
            <Button 
              onClick={handleCoupleDevice}
              disabled={coupling}
              className="gap-2"
              data-testid="couple-device-btn"
            >
              {coupling ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Koppeln...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Koppeln / Zuweisen
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeviceSetup;
