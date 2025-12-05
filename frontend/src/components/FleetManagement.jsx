import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Truck, MapPin, Fuel, FileText, Navigation, TrendingUp, AlertTriangle,
  Circle, Calendar, Clock, User, DollarSign, Gauge, Activity, RefreshCw,
  Filter, Download, Trash2, Eye, BarChart3, Leaf
} from 'lucide-react';
import { toast } from 'sonner';

const FleetManagement = ({ selectedTenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Filter
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('all');
  const [showSuspiciousFuel, setShowSuspiciousFuel] = useState(false);
  
  useEffect(() => {
    if (selectedTenantId && selectedTenantId !== 'all') {
      loadLocations();
      loadFleetData();
    }
  }, [selectedTenantId]);
  
  useEffect(() => {
    if (selectedTenantId && selectedTenantId !== 'all') {
      loadFleetData();
    }
  }, [selectedLocation]);
  
  const loadLocations = async () => {
    try {
      const res = await apiCall(`/api/fleet/${selectedTenantId}/locations`);
      setLocations(res.data?.locations || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };
  
  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, rentalsRes, fuelRes, statsRes] = await Promise.all([
        apiCall(`/api/fleet/${selectedTenantId}/vehicles?location=${selectedLocation}`),
        apiCall(`/api/fleet/${selectedTenantId}/rentals?location=${selectedLocation}&limit=50`),
        apiCall(`/api/fleet/${selectedTenantId}/fuel?location=${selectedLocation}`),
        apiCall(`/api/fleet/${selectedTenantId}/statistics?location=${selectedLocation}`)
      ]);
      
      setVehicles(vehiclesRes.data?.vehicles || []);
      setRentals(rentalsRes.data?.rentals || []);
      setFuelRecords(fuelRes.data?.fuel_records || []);
      setStatistics(statsRes.data?.statistics || null);
    } catch (error) {
      console.error('Error loading fleet data:', error);
      toast.error('Fehler beim Laden der Flottendaten');
    } finally {
      setLoading(false);
    }
  };
  
  const regenerateData = async () => {
    try {
      await apiCall(`/api/fleet/${selectedTenantId}/regenerate`, { method: 'POST' });
      toast.success('Mock-Daten neu generiert');
      loadFleetData();
    } catch (error) {
      toast.error('Fehler beim Regenerieren der Daten');
    }
  };
  
  const resetData = async () => {
    if (window.confirm('Möchten Sie alle Mock-Daten löschen? Dies ist erforderlich, um echte Daten zu verwenden.')) {
      try {
        await apiCall(`/api/fleet/${selectedTenantId}/reset`, { method: 'DELETE' });
        toast.success('Mock-Daten gelöscht. Sie können nun echte Daten einbinden.');
        setVehicles([]);
        setTrips([]);
        setFuelRecords([]);
        setStatistics(null);
      } catch (error) {
        toast.error('Fehler beim Löschen der Daten');
      }
    }
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: 'Verfügbar', color: 'bg-green-500', icon: Circle },
      rented: { label: 'Vermietet', color: 'bg-blue-500', icon: Circle },
      cleaning: { label: 'Reinigung', color: 'bg-yellow-500', icon: Circle },
      maintenance: { label: 'Wartung', color: 'bg-red-500', icon: Circle }
    };
    
    const config = statusConfig[status] || statusConfig.available;
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={`w-2 h-2 ${config.color}`} />
        <span className="text-xs">{config.label}</span>
      </div>
    );
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const filteredVehicles = vehicles.filter(v => {
    if (vehicleStatusFilter === 'all') return true;
    return v.status === vehicleStatusFilter;
  });
  
  const filteredFuel = showSuspiciousFuel 
    ? fuelRecords.filter(f => f.suspicious)
    : fuelRecords;
  
  if (!selectedTenantId || selectedTenantId === 'all') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Truck className={`w-20 h-20 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Bitte wählen Sie einen Kunden aus
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Übersicht', icon: BarChart3 },
            { id: 'vehicles', label: 'Fahrzeuge', icon: Truck },
            { id: 'trips', label: 'Fahrten & Routen', icon: Navigation },
            { id: 'fuel', label: 'Kraftstoff', icon: Fuel },
            { id: 'logbook', label: 'Fahrtenbuch', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#c00000] text-[#c00000]'
                    : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Flottenmanagement
              </h1>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                GPS-Tracking, Routenplanung, Kraftstoffverbrauch & Fahrtenbuch
              </p>
            </div>
            
            {/* Location Selector */}
            {locations.length > 0 && (
              <div className="ml-auto">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white hover:bg-gray-800'
                      : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <option value="all">🌐 Gesamtflotte (Alle Standorte)</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      📍 {loc.location_name} • {loc.city} ({loc.vehicle_count} Fzg.)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadFleetData}
            disabled={loading}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
          <button
            onClick={regenerateData}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Mock-Daten neu generieren
          </button>
          <button
            onClick={resetData}
            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Mock-Daten löschen
          </button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Gesamtflotte
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics.total_vehicles}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {statistics.active_vehicles} aktiv
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Gefahrene km (30d)
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics.total_distance_km.toLocaleString('de-DE')}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {statistics.total_trips_30d} Fahrten
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Navigation className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Kraftstoffkosten
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics.total_fuel_cost.toLocaleString('de-DE')} €
                </p>
                <p className="text-xs text-yellow-500 mt-1">
                  {statistics.avg_fuel_consumption_per_100km} l/100km Ø
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Fuel className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  CO₂-Emissionen
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {(statistics.total_co2_emissions_kg / 1000).toFixed(1)} t
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Eco-Score: {statistics.avg_eco_score}/100
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Leaf className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && statistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fahrzeugstatus */}
              <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Fahrzeugstatus
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Verfügbar</span>
                    </div>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.available_vehicles}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Vermietet</span>
                    </div>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.rented_vehicles}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Reinigung</span>
                    </div>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.cleaning_vehicles || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Wartung</span>
                    </div>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.maintenance_vehicles}
                    </span>
                  </div>
                </div>
              </Card>
              
              {/* Kostenübersicht */}
              <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kostenübersicht (30 Tage)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Kraftstoffkosten</span>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.total_fuel_cost.toLocaleString('de-DE')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Kosten pro km</span>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.cost_per_km.toFixed(3)} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Gesamtverbrauch</span>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {statistics.total_fuel_liters.toLocaleString('de-DE')} L
                    </span>
                  </div>
                  {statistics.suspicious_fuel_transactions > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-red-500/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-red-500">Verdächtige Tankvorgänge</span>
                      </div>
                      <span className="font-mono font-bold text-red-500">
                        {statistics.suspicious_fuel_transactions}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
          
          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex gap-2">
                {[
                  { value: 'all', label: `Alle (${vehicles.length})` },
                  { value: 'available', label: `Verfügbar (${vehicles.filter(v => v.status === 'available').length})` },
                  { value: 'rented', label: `Vermietet (${vehicles.filter(v => v.status === 'rented').length})` },
                  { value: 'maintenance', label: `Wartung (${vehicles.filter(v => v.status === 'maintenance').length})` }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setVehicleStatusFilter(filter.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      vehicleStatusFilter === filter.value
                        ? 'bg-[#c00000] text-white'
                        : theme === 'dark'
                        ? 'bg-[#2a2a2a] border border-gray-700 text-gray-400 hover:bg-gray-800'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Table */}
              <Card className={`${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Status
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Kennzeichen
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fahrzeug
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Mieter
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Heimatstandort
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          km-Stand
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tank
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((vehicle, idx) => (
                        <tr
                          key={vehicle.vehicle_id}
                          className={`border-t ${
                            theme === 'dark'
                              ? 'border-gray-700 hover:bg-gray-800/50'
                              : 'border-gray-200 hover:bg-gray-50'
                          } transition-colors cursor-pointer`}
                        >
                          <td className="px-4 py-3">
                            {getStatusBadge(vehicle.status)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {vehicle.license_plate}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {vehicle.model}
                              </div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                {vehicle.type} • {vehicle.year}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {vehicle.current_rental ? (
                                <>
                                  <User className="w-3 h-3" />
                                  <span className="text-sm">{vehicle.current_rental.customer_name}</span>
                                </>
                              ) : (
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                  Nicht vermietet
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-red-500" />
                              <span className="text-sm">{vehicle.home_location.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm">
                              {vehicle.odometer.toLocaleString('de-DE')} km
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    vehicle.fuel_level > 50
                                      ? 'bg-green-500'
                                      : vehicle.fuel_level > 25
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${vehicle.fuel_level}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono w-10 text-right">
                                {vehicle.fuel_level}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
          
          {/* Trips Tab - wird in Teil 2 implementiert */}
          {activeTab === 'trips' && (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <Navigation className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Routenplanung & Fahrten
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Wird in Kürze implementiert
              </p>
            </Card>
          )}
          
          {/* Fuel Tab - wird in Teil 2 implementiert */}
          {activeTab === 'fuel' && (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <Fuel className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kraftstoffverwaltung
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Wird in Kürze implementiert
              </p>
            </Card>
          )}
          
          {/* Logbook Tab - wird in Teil 2 implementiert */}
          {activeTab === 'logbook' && (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <FileText className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Automatisches Fahrtenbuch
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Wird in Kürze implementiert
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default FleetManagement;
