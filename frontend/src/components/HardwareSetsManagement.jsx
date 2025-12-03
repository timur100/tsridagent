import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Cpu, Package, Search, Plus, AlertTriangle, CheckCircle, 
  Warehouse, Settings, Edit2, Trash2, Eye, BarChart3, 
  MapPin, Calendar, TrendingUp, ArrowRight, X, Save, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import HardwareSetModal from './HardwareSetModal';
import HardwareDeviceModal from './HardwareDeviceModal';
import HardwareSetDetailModal from './HardwareSetDetailModal';

const HardwareSetsManagement = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, sets, devices, search, warehouse
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [sets, setSets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Modals
  const [showSetModal, setShowSetModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showSetDetail, setShowSetDetail] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  
  // Search
  const [searchSerial, setSearchSerial] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  
  // Global Search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sorting for Sets table
  const [sortField, setSortField] = useState('full_code');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadSets(),
        loadDevices(),
        loadLocations()
      ]);
    } catch (error) {
      console.error('Error loading hardware data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/api/hardware/stats/dashboard');
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSets = async () => {
    try {
      const result = await apiCall(`/api/hardware/sets?tenant_id=${tenantId}`);
      if (result.success && Array.isArray(result.data)) {
        setSets(result.data);
      } else if (Array.isArray(result)) {
        setSets(result);
      }
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const result = await apiCall(`/api/hardware/devices?tenant_id=${tenantId}`);
      if (result.success && Array.isArray(result.data)) {
        setDevices(result.data);
      } else if (Array.isArray(result)) {
        setDevices(result);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadLocations = async () => {
    try {
      // Load locations from hardware sets
      const result = await apiCall(`/api/hardware/sets?tenant_id=${tenantId}`);
      const setsData = result.success ? result.data : result;
      
      if (Array.isArray(setsData)) {
        // Extract unique locations from sets
        const locationMap = new Map();
        setsData.forEach(set => {
          if (set.location_id && !locationMap.has(set.location_id)) {
            locationMap.set(set.location_id, {
              id: set.location_id,
              name: set.set_name?.split(' - Set ')[0] || set.location_code,
              location_code: set.location_code
            });
          }
        });
        setLocations(Array.from(locationMap.values()));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSearchSerial = async () => {
    if (!searchSerial.trim()) {
      toast.error('Bitte Seriennummer eingeben');
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/devices/search/${searchSerial}`);
      if (result.success) {
        setSearchResult(result.data);
        toast.success('Gerät gefunden');
      }
    } catch (error) {
      toast.error('Gerät nicht gefunden');
      setSearchResult(null);
    }
  };

  const handleGlobalSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setGlobalSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await apiCall(`/api/hardware/search?query=${encodeURIComponent(searchQuery)}&tenant_id=${tenantId}`);
      if (result.success) {
        setGlobalSearchResults(result.data);
      } else if (result.sets || result.devices || result.locations) {
        setGlobalSearchResults(result);
      }
    } catch (error) {
      console.error('Search error:', error);
      setGlobalSearchResults({ sets: [], devices: [], locations: [], total_results: 0 });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce global search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalSearchQuery.trim().length >= 2) {
        handleGlobalSearch(globalSearchQuery);
      } else {
        setGlobalSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  const handleCreateSet = async (data) => {
    try {
      const result = await apiCall('/api/hardware/sets', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success || result.id) {
        toast.success('Set erfolgreich erstellt');
        await loadData();
        setShowSetModal(false);
      }
    } catch (error) {
      console.error('Error creating set:', error);
      toast.error('Fehler beim Erstellen des Sets');
      throw error;
    }
  };

  const handleUpdateSet = async (data) => {
    try {
      const result = await apiCall(`/api/hardware/sets/${editingSet.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (result.success || result.id) {
        toast.success('Set erfolgreich aktualisiert');
        await loadData();
        setShowSetModal(false);
        setEditingSet(null);
      }
    } catch (error) {
      console.error('Error updating set:', error);
      toast.error('Fehler beim Aktualisieren des Sets');
      throw error;
    }
  };

  const handleCreateDevice = async (data) => {
    try {
      const result = await apiCall('/api/hardware/devices', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success || result.id) {
        toast.success('Gerät erfolgreich hinzugefügt');
        await loadData();
        setShowDeviceModal(false);
      }
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen des Geräts');
      throw error;
    }
  };

  const handleUpdateDevice = async (data) => {
    try {
      const result = await apiCall(`/api/hardware/devices/${editingDevice.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (result.success || result.id) {
        toast.success('Gerät erfolgreich aktualisiert');
        await loadData();
        setShowDeviceModal(false);
        setEditingDevice(null);
      }
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Fehler beim Aktualisieren des Geräts');
      throw error;
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!window.confirm('Möchten Sie dieses Set wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/sets/${setId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Set erfolgreich gelöscht');
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      toast.error(error.message || 'Fehler beim Löschen des Sets');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Möchten Sie dieses Gerät wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/devices/${deviceId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Gerät erfolgreich gelöscht');
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error(error.message || 'Fehler beim Löschen des Geräts');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'aktiv': { bg: 'bg-green-500', text: 'Aktiv', icon: CheckCircle },
      'verfügbar_lager': { bg: 'bg-blue-500', text: 'Verfügbar', icon: Package },
      'defekt': { bg: 'bg-red-500', text: 'Defekt', icon: AlertTriangle },
      'in_reparatur': { bg: 'bg-yellow-500', text: 'In Reparatur', icon: Settings },
      'ausgemustert': { bg: 'bg-gray-500', text: 'Ausgemustert', icon: X }
    };
    return badges[status] || badges['verfügbar_lager'];
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Sort handler for sets table
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort sets based on current sort field and direction
  const sortedSets = [...sets].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Special handling for device count
    if (sortField === 'device_count') {
      const aDevices = devices.filter(d => d.current_set_id === a.id).length;
      const bDevices = devices.filter(d => d.current_set_id === b.id).length;
      aVal = aDevices;
      bVal = bDevices;
    }
    
    // Special handling for location name
    if (sortField === 'location_name') {
      const aLocation = locations.find(l => l.id === a.location_id);
      const bLocation = locations.find(l => l.id === b.location_id);
      aVal = aLocation?.name || '';
      bVal = bLocation?.name || '';
    }
    
    // Handle null/undefined values
    if (!aVal) aVal = '';
    if (!bVal) bVal = '';
    
    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal, 'de')
        : bVal.localeCompare(aVal, 'de');
    }
    
    // Number comparison
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Filter devices by status
  const filteredDevices = devices.filter(device => {
    if (statusFilter === 'all') return true;
    return device.current_status === statusFilter;
  });

  // Get warehouse devices (available)
  const warehouseDevices = devices.filter(d => d.current_status === 'verfügbar_lager');

  // Get defective devices
  const defectiveDevices = devices.filter(d => d.current_status === 'defekt');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className={`flex gap-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'dashboard'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('sets')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'sets'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Cpu className="h-4 w-4" />
          Sets ({sets.length})
        </button>
        <button
          onClick={() => setActiveView('devices')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'devices'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Package className="h-4 w-4" />
          Geräte ({devices.length})
        </button>
        <button
          onClick={() => setActiveView('warehouse')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'warehouse'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          Lager ({warehouseDevices.length})
        </button>
      </div>

      {/* Global Search Field */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Suche nach Sets, Geräten, Standorten, Seriennummern..."
            className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000] focus:border-transparent`}
          />
          {globalSearchQuery && (
            <button
              onClick={() => {
                setGlobalSearchQuery('');
                setGlobalSearchResults(null);
              }}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#c00000]"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {globalSearchResults && globalSearchResults.total_results > 0 && (
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {globalSearchResults.total_results} Ergebnis{globalSearchResults.total_results !== 1 ? 'se' : ''} gefunden
            </p>
            
            <div className="space-y-4">
              {/* Sets Results */}
              {globalSearchResults.sets && globalSearchResults.sets.length > 0 && (
                <div>
                  <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Cpu className="h-4 w-4 text-[#c00000]" />
                    Hardware-Sets ({globalSearchResults.sets.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {globalSearchResults.sets.map((set) => (
                      <button
                        key={set.id}
                        onClick={() => {
                          setSelectedSet(set);
                          setShowSetDetail(true);
                          setGlobalSearchQuery('');
                          setGlobalSearchResults(null);
                        }}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          theme === 'dark'
                            ? 'bg-[#1f1f1f] hover:bg-[#333] border border-gray-700'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {set.full_code && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-mono font-bold">
                              {set.full_code}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {set.set_name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                          {set.status}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Devices Results */}
              {globalSearchResults.devices && globalSearchResults.devices.length > 0 && (
                <div>
                  <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Package className="h-4 w-4 text-[#c00000]" />
                    Geräte ({globalSearchResults.devices.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {globalSearchResults.devices.map((device) => {
                      const statusBadge = getStatusBadge(device.current_status);
                      return (
                        <button
                          key={device.id}
                          onClick={() => {
                            setEditingDevice(device);
                            setShowDeviceModal(true);
                            setGlobalSearchQuery('');
                            setGlobalSearchResults(null);
                          }}
                          className={`p-3 rounded-lg text-left transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#1f1f1f] hover:bg-[#333] border border-gray-700'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <p className="text-xs text-gray-500 mb-1">{device.hardware_type}</p>
                          <p className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {device.serial_number}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${statusBadge.bg}`}>
                              {statusBadge.text}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Locations Results */}
              {globalSearchResults.locations && globalSearchResults.locations.length > 0 && (
                <div>
                  <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <MapPin className="h-4 w-4 text-[#c00000]" />
                    Standorte ({globalSearchResults.locations.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {globalSearchResults.locations.map((location) => (
                      <div
                        key={location.id}
                        className={`p-3 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1f1f1f] border border-gray-700'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {location.location_code && (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-mono font-bold">
                              {location.location_code}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {location.station_name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                          {location.city}, {location.postal_code}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {globalSearchResults && globalSearchResults.total_results === 0 && (
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Keine Ergebnisse für "{globalSearchQuery}" gefunden
            </p>
          </div>
        )}
      </Card>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aktive Sets
                  </p>
                  <p className="text-3xl font-bold text-[#c00000]">
                    {sets.filter(s => s.status === 'aktiv').length}
                  </p>
                </div>
                <Cpu className="h-12 w-12 text-[#c00000] opacity-20" />
              </div>
            </Card>

            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Geräte Gesamt
                  </p>
                  <p className="text-3xl font-bold text-blue-500">
                    {devices.length}
                  </p>
                </div>
                <Package className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Lager
                  </p>
                  <p className="text-3xl font-bold text-green-500">
                    {warehouseDevices.length}
                  </p>
                </div>
                <Warehouse className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Defekt
                  </p>
                  <p className="text-3xl font-bold text-red-500">
                    {defectiveDevices.length}
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-500 opacity-20" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Schnellaktionen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                onClick={async () => {
                  if (!window.confirm('Möchten Sie bestehende Geräte und Standorte importieren? Dies erstellt automatisch Sets basierend auf den Location Codes.')) {
                    return;
                  }
                  
                  try {
                    const result = await apiCall(`/api/hardware/import/tenant/${tenantId}/from-existing`, {
                      method: 'POST'
                    });
                    
                    if (result.success) {
                      toast.success(`Import erfolgreich! ${result.imported_sets_count} Sets und ${result.imported_devices_count} Geräte importiert.`);
                      await loadData();
                    }
                  } catch (error) {
                    console.error('Import error:', error);
                    toast.error('Fehler beim Import');
                  }
                }}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Daten importieren
              </Button>
              <Button
                onClick={() => {
                  setEditingSet(null);
                  setShowSetModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Plus className="h-4 w-4" />
                Neues Set
              </Button>
              <Button
                onClick={() => {
                  setEditingDevice(null);
                  setShowDeviceModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Neues Gerät
              </Button>
              <Button
                onClick={() => setActiveView('search')}
                variant="outline"
                className={`flex items-center justify-center gap-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300' : ''}`}
              >
                <Search className="h-4 w-4" />
                Suche
              </Button>
            </div>
          </Card>

          {/* Defective Devices Alert */}
          {defectiveDevices.length > 0 && (
            <Card className="p-6 bg-red-50 border-red-200">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-2">
                    Defekte Geräte ({defectiveDevices.length})
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    Es gibt defekte Geräte, die ausgetauscht werden müssen.
                  </p>
                  <button
                    onClick={() => setActiveView('devices')}
                    className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    Details anzeigen
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Sets View */}
      {activeView === 'sets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Hardware-Sets
            </h2>
            <Button
              onClick={() => {
                setEditingSet(null);
                setShowSetModal(true);
              }}
              className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <Plus className="h-4 w-4" />
              Neues Set
            </Button>
          </div>

          {sets.length === 0 ? (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <Cpu className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Noch keine Hardware-Sets vorhanden
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Erstellen Sie Ihr erstes Set, um Geräte zu organisieren
              </p>
            </Card>
          ) : (
            <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Set-Code
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Set-Name
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Standort
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Geräteanzahl
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Erstellt am
                      </th>
                      <th className={`px-6 py-4 text-right text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((set) => {
                      const setDevices = devices.filter(d => d.current_set_id === set.id);
                      const location = locations.find(l => l.id === set.location_id);
                      
                      return (
                        <tr
                          key={set.id}
                          onClick={() => {
                            setSelectedSet(set);
                            setShowSetDetail(true);
                          }}
                          className={`border-t cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            {set.full_code && (
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-mono font-bold">
                                {set.full_code}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold">
                              {set.set_name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {location ? (
                              <div className="flex items-center gap-1 font-mono text-sm">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                {location.name}
                              </div>
                            ) : (
                              <span className="font-mono text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-mono text-sm">
                              <Package className="h-4 w-4 text-gray-500" />
                              {setDevices.length} Gerät{setDevices.length !== 1 ? 'e' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                              set.status === 'aktiv' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                            }`}>
                              {set.status === 'aktiv' ? 'Aktiv' : set.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-mono text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {formatDate(set.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSet(set);
                                  setShowSetDetail(true);
                                }}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Devices View */}
      {activeView === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Alle Geräte
            </h2>
            <Button
              onClick={() => {
                setEditingDevice(null);
                setShowDeviceModal(true);
              }}
              className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <Plus className="h-4 w-4" />
              Neues Gerät
            </Button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'aktiv', 'verfügbar_lager', 'defekt', 'in_reparatur'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#2a2a2a] text-gray-400 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? 'Alle' : status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {filteredDevices.length === 0 ? (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine Geräte gefunden
              </p>
            </Card>
          ) : (
            <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Seriennummer
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Typ
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Hersteller / Modell
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Standort
                      </th>
                      <th className={`px-6 py-4 text-right text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => {
                      const statusBadge = getStatusBadge(device.current_status);
                      const location = locations.find(l => l.id === device.current_location_id);
                      
                      return (
                        <tr
                          key={device.id}
                          onClick={() => {
                            setEditingDevice(device);
                            setShowDeviceModal(true);
                          }}
                          className={`border-t cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold">
                              {device.serial_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{device.hardware_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm">
                              {device.manufacturer && <div className="font-semibold">{device.manufacturer}</div>}
                              {device.model && <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{device.model}</div>}
                              {!device.manufacturer && !device.model && <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${statusBadge.bg}`}>
                              {React.createElement(statusBadge.icon, { className: 'h-3 w-3' })}
                              {statusBadge.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {location ? (
                              <div className="flex items-center gap-1 font-mono text-sm">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                {location.name}
                              </div>
                            ) : (
                              <span className="font-mono text-sm text-gray-400">Lager</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDevice(device);
                                  setShowDeviceModal(true);
                                }}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDevice(device);
                                  setShowDeviceModal(true);
                                }}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                title="Bearbeiten"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Warehouse View */}
      {activeView === 'warehouse' && (
        <div className="space-y-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Lager - Verfügbare Geräte
          </h2>

          {warehouseDevices.length === 0 ? (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
              <Warehouse className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine verfügbaren Geräte im Lager
              </p>
            </Card>
          ) : (
            <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Seriennummer
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Typ
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Hersteller / Modell
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-right text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseDevices.map((device) => {
                      const statusBadge = getStatusBadge(device.current_status);
                      
                      return (
                        <tr
                          key={device.id}
                          onClick={() => {
                            setEditingDevice(device);
                            setShowDeviceModal(true);
                          }}
                          className={`border-t cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold">
                              {device.serial_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{device.hardware_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm">
                              {device.manufacturer && <div className="font-semibold">{device.manufacturer}</div>}
                              {device.model && <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{device.model}</div>}
                              {!device.manufacturer && !device.model && <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${statusBadge.bg}`}>
                              {React.createElement(statusBadge.icon, { className: 'h-3 w-3' })}
                              {statusBadge.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDevice(device);
                                  setShowDeviceModal(true);
                                }}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="text-xs"
                              >
                                Zu Set hinzufügen
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <HardwareSetModal
        show={showSetModal}
        onClose={() => {
          setShowSetModal(false);
          setEditingSet(null);
        }}
        onSubmit={editingSet ? handleUpdateSet : handleCreateSet}
        editing={editingSet}
        locations={locations}
        tenantId={tenantId}
      />

      <HardwareDeviceModal
        show={showDeviceModal}
        onClose={() => {
          setShowDeviceModal(false);
          setEditingDevice(null);
        }}
        onSubmit={editingDevice ? handleUpdateDevice : handleCreateDevice}
        editing={editingDevice}
        tenantId={tenantId}
      />

      <HardwareSetDetailModal
        show={showSetDetail}
        onClose={() => {
          setShowSetDetail(false);
          setSelectedSet(null);
        }}
        set={selectedSet}
        onRefresh={loadData}
      />
    </div>
  );
};

export default HardwareSetsManagement;
