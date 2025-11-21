import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Monitor, CheckCircle, XCircle, Clock, Search, Filter, ChevronUp, ChevronDown, Plus, Edit2, Check, X } from 'lucide-react';
import DeviceDetailsModal from './DeviceDetailsModal';
import AddDeviceModal from './AddDeviceModal';
import toast from 'react-hot-toast';
import { getFullBundeslandName } from '../utils/bundesland';
import { 
  extractGeoFilterOptions, 
  filterByGeo, 
  getAvailableCountries, 
  getAvailableBundeslaender, 
  getAvailableCities,
  SPECIAL_PLACE_TAGS 
} from '../utils/geoFilters';

const TenantDevicesTab = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [stations, setStations] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    kontinent: 'all',
    land: 'all',
    bundesland: 'all',
    city: 'all',
    specialPlace: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'device_id',
    direction: 'asc'
  });
  
  // Inline editing state
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (tenantId) {
      loadDevices();
      loadStations();
      loadAvailableTenants();
    }
  }, [tenantId]);

  const loadAvailableTenants = async () => {
    try {
      const result = await apiCall('/api/tenants');
      const tenantsArray = result?.data || result || [];
      console.log('[TenantDevicesTab] Loaded tenants:', tenantsArray);
      setAvailableTenants(tenantsArray);
    } catch (error) {
      console.error('[TenantDevicesTab] Error loading tenants:', error);
    }
  };

  useEffect(() => {
    filterDevices();
  }, [searchTerm, filters, devices, stations, sortConfig]);

  const loadDevices = async () => {
    console.log('🔍 TenantDevicesTab: loadDevices called with tenantId:', tenantId);
    setLoading(true);
    
    // Initialize with empty array to prevent undefined errors
    setDevices([]);
    
    try {
      // Load devices for this tenant using apiCall
      const url = `/api/tenant-devices/${tenantId}`;
      console.log('📡 Calling API:', url);
      
      const response = await apiCall(url, {
        method: 'GET'
      });
      
      console.log('📦 Full API Response:', JSON.stringify(response, null, 2));
      
      // Check if response exists
      if (!response) {
        console.error('❌ No response received');
        toast.error('Keine Antwort vom Server');
        return;
      }
      
      console.log('📦 Response.success:', response.success);
      console.log('📦 Response.status:', response.status);
      
      // Check if API call was successful
      if (!response.success) {
        console.error('❌ API call failed:', response);
        toast.error(`Fehler: ${response.error || 'Unbekannter Fehler'}`);
        return;
      }
      
      // Get the backend data
      const backendData = response.data;
      console.log('📦 Backend data type:', typeof backendData);
      console.log('📦 Backend data:', JSON.stringify(backendData, null, 2).substring(0, 500));
      
      // Try to extract devices
      let devicesArray = [];
      
      if (backendData && backendData.data && backendData.data.devices && Array.isArray(backendData.data.devices)) {
        devicesArray = backendData.data.devices;
        console.log('✅ Path 1: Found devices at backendData.data.devices');
      } else if (backendData && backendData.devices && Array.isArray(backendData.devices)) {
        devicesArray = backendData.devices;
        console.log('✅ Path 2: Found devices at backendData.devices');
      } else if (Array.isArray(backendData)) {
        devicesArray = backendData;
        console.log('✅ Path 3: backendData is array');
      } else {
        console.error('❌ Could not find devices array in response');
        console.error('❌ Backend data structure:', Object.keys(backendData || {}));
        toast.error('Keine Geräte gefunden - unerwartetes Datenformat');
        return;
      }
      
      console.log(`✅ Setting ${devicesArray.length} devices`);
      setDevices(devicesArray);
      // Toast removed - only show on errors
      
    } catch (error) {
      console.error('❌ Exception loading devices:', error);
      console.error('❌ Error stack:', error.stack);
      toast.error('Fehler beim Laden der Geräte: ' + (error?.message || 'Unbekannter Fehler'));
      setDevices([]);
    } finally {
      setLoading(false);
      console.log('🏁 Loading finished, final devices count:', devices.length);
    }
  };

  const loadStations = async () => {
    try {
      // Load stations for specific tenant
      const response = await fetch(`${BACKEND_URL}/api/tenant-locations/${tenantId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      // Don't show error toast, stations are optional for filtering
    }
  };

  const filterDevices = () => {
    let filtered = [...devices];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(device => 
        device.device_id?.toLowerCase().includes(searchLower) ||
        device.locationcode?.toLowerCase().includes(searchLower) ||
        device.city?.toLowerCase().includes(searchLower) ||
        device.sn_pc?.toLowerCase().includes(searchLower) ||
        device.sn_sc?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status?.toLowerCase() === filters.status);
    }

    // City filter (kept for direct filtering)
    if (filters.city !== 'all') {
      filtered = filtered.filter(d => d.city === filters.city);
    }

    // Geographic filters - use station lookup to get bundesland
    filtered = filterByGeo(filtered, filters, (device) => {
      // Find station by locationcode
      const station = stations.find(s => s.location_code === device.locationcode);
      if (station && station.state) {
        return station.state;
      }
      return null;
    });

    // Sort the filtered results
    filtered = sortDevices(filtered, sortConfig.key, sortConfig.direction);

    setFilteredDevices(filtered);
  };

  const sortDevices = (deviceList, key, direction) => {
    const sorted = [...deviceList].sort((a, b) => {
      let aValue = a[key] || '';
      let bValue = b[key] || '';
      
      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 inline ml-1" />
      : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleDeviceClick = (device, e) => {
    // Don't navigate if clicking on edit buttons or input fields
    if (e.target.closest('.edit-actions') || e.target.closest('.inline-edit-field')) {
      return;
    }
    
    // Navigate to device detail page instead of modal
    // Pass state to remember we came from devices tab
    navigate(`/portal/admin/tenants/${tenantId}/devices/${device.device_id}`, {
      state: { fromTab: 'devices', tenantId }
    });
  };

  const handleDeviceUpdate = (updatedDevice) => {
    setDevices(prev => prev.map(d => 
      d.device_id === updatedDevice.device_id ? updatedDevice : d
    ));
    toast.success('Gerät aktualisiert');
  };

  // Get unique cities and geo options
  const uniqueCities = [...new Set(devices.map(d => d.city).filter(Boolean))].sort();
  
  // Build geo options from devices using station lookup
  const enrichedDevices = devices.map(device => {
    const station = stations.find(s => s.location_code === device.locationcode);
    return {
      ...device,
      bundesland: station?.state || null,
      city: station?.city || device.city,
      ort: station?.city || device.city,
      stationsname: device.device_id,
      continent: station?.continent || 'Europa'
    };
  });
  
  const geoOptions = extractGeoFilterOptions(enrichedDevices, (item) => item.bundesland);
  
  // Kaskadierte Filter-Optionen
  const availableCountries = getAvailableCountries(enrichedDevices, filters.kontinent, (item) => item.bundesland);
  const availableBundeslaender = getAvailableBundeslaender(enrichedDevices, filters.land, (item) => item.bundesland);
  const availableCities = getAvailableCities(enrichedDevices, filters.bundesland, (item) => item.bundesland);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const summary = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    in_vorbereitung: devices.filter(d => d.status === 'in_vorbereitung').length
  };

  return (
    <div className="space-y-6">
      {/* Title, Search Bar and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <h2 className={`text-2xl font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Geräte
        </h2>
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suche nach Device-ID, Location, Stadt, SN..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Add Device Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            theme === 'dark'
              ? 'bg-[#c00000] text-white hover:bg-[#a00000]'
              : 'bg-[#c00000] text-white hover:bg-[#a00000]'
          }`}
        >
          <Plus className="w-5 h-5" />
          Gerät hinzufügen
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <Card 
          onClick={() => handleFilterChange('status', 'all')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.status === 'all'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{summary.total}</p>
            </div>
            <Monitor className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
          </div>
        </Card>

        <Card 
          onClick={() => handleFilterChange('status', 'online')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.status === 'online'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-green-50 border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Online</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary.online}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
              <div className="h-6 w-6 bg-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </Card>

        <Card 
          onClick={() => handleFilterChange('status', 'offline')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.status === 'offline'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-red-50 border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Offline</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.offline}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
              <div className="h-6 w-6 bg-red-600 rounded-full"></div>
            </div>
          </div>
        </Card>

        <Card 
          onClick={() => handleFilterChange('status', 'in_vorbereitung')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.status === 'in_vorbereitung'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-yellow-50 border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>In Vorbereitung</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{summary.in_vorbereitung}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
              <div className="h-6 w-6 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
          <div>
            <label className={`block text-xs font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Kontinent
            </label>
          <select
            value={filters.kontinent}
            onChange={(e) => handleFilterChange('kontinent', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="all">Alle Kontinente</option>
            {geoOptions.kontinente.map(kontinent => (
              <option key={kontinent} value={kontinent}>{kontinent}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-xs font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Land
          </label>
          <select
            value={filters.land}
            onChange={(e) => handleFilterChange('land', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="all">Alle Länder</option>
            {availableCountries.map(land => (
              <option key={land} value={land}>{land}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-xs font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Bundesland
          </label>
          <select
            value={filters.bundesland}
            onChange={(e) => handleFilterChange('bundesland', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="all">Alle Bundesländer</option>
            {availableBundeslaender.map(bl => (
              <option key={bl} value={bl}>{bl}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-xs font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Stadt
          </label>
          <select
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="all">Alle Städte</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-xs font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Besondere Orte
          </label>
          <select
            value={filters.specialPlace}
            onChange={(e) => handleFilterChange('specialPlace', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="all">Alle Orte</option>
            {Object.entries(SPECIAL_PLACE_TAGS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        </div>
        
        {/* Reset Filter Button */}
        <button
          onClick={() => {
            setFilters({
              status: 'all',
              kontinent: 'all',
              land: 'all',
              bundesland: 'all',
              city: 'all',
              specialPlace: 'all'
            });
            toast.success('Filter zurückgesetzt');
          }}
          className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white hover:bg-[#3a3a3a]'
              : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
          }`}
        >
          Filter zurücksetzen
        </button>
      </div>

      {/* Results count */}
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Zeige {filteredDevices.length} von {devices.length} Geräten
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              <th 
                onClick={() => handleSort('device_id')}
                className={`w-28 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Device-ID {getSortIcon('device_id')}
              </th>
              <th 
                onClick={() => handleSort('locationcode')}
                className={`w-20 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Location {getSortIcon('locationcode')}
              </th>
              <th 
                onClick={() => handleSort('street')}
                className={`w-48 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Straße {getSortIcon('street')}
              </th>
              <th 
                onClick={() => handleSort('zip')}
                className={`w-16 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                PLZ {getSortIcon('zip')}
              </th>
              <th 
                onClick={() => handleSort('city')}
                className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Stadt {getSortIcon('city')}
              </th>
              <th 
                onClick={() => handleSort('country')}
                className={`w-20 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Land {getSortIcon('country')}
              </th>
              <th 
                onClick={() => handleSort('sn_pc')}
                className={`w-24 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                SN-PC {getSortIcon('sn_pc')}
              </th>
              <th 
                onClick={() => handleSort('sn_sc')}
                className={`w-24 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                SN-SC {getSortIcon('sn_sc')}
              </th>
              <th 
                onClick={() => handleSort('set_id')}
                className={`w-28 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Set {getSortIcon('set_id')}
              </th>
              <th 
                onClick={() => handleSort('tvid')}
                className={`w-20 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                TVID {getSortIcon('tvid')}
              </th>
              <th 
                onClick={() => handleSort('ip')}
                className={`w-24 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                IP {getSortIcon('ip')}
              </th>
              <th 
                onClick={() => handleSort('sw_version')}
                className={`w-20 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                SW Vers. {getSortIcon('sw_version')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className={`w-20 px-2 py-3 text-center text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Status {getSortIcon('status')}
              </th>
              <th 
                onClick={() => handleSort('hardware_model')}
                className={`w-28 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Hardware {getSortIcon('hardware_model')}
              </th>
            </tr>
          </thead>
          <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
            {filteredDevices.map((device, index) => (
              <tr 
                key={device.device_id}
                onClick={() => handleDeviceClick(device)}
                className={`border-t cursor-pointer transition-colors ${
                  theme === 'dark' 
                    ? 'border-gray-700 hover:bg-[#1a1a1a]' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {device.device_id}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.locationcode}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.street || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.zip || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.city || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.country || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.sn_pc || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.sn_sc || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.set_id || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.tvid || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.ip || '-'}
                </td>
                <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.sw_version || '-'}
                </td>
                <td className="px-2 py-2 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                    device.status === 'online' 
                      ? 'bg-green-500/20 text-green-400'
                      : device.status === 'offline'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {device.status === 'online' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                    {device.status === 'offline' && (
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    )}
                    {device.status !== 'online' && device.status !== 'offline' && (
                      <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    )}
                    {device.status === 'online' ? 'Online' : device.status === 'offline' ? 'Offline' : 'Vorbereitung'}
                  </span>
                </td>
                <td className={`px-2 py-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {device.hardware_model || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDevices.length === 0 && (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          Keine Geräte gefunden
        </div>
      )}

      {/* Device Details Modal */}
      {showModal && selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          onClose={() => {
            setShowModal(false);
            setSelectedDevice(null);
          }}
          onUpdate={handleDeviceUpdate}
        />
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onDeviceAdded={() => {
            setShowAddModal(false);
            loadDevices(); // Refresh device list
            toast.success('Gerät erfolgreich hinzugefügt');
          }}
          customers={availableTenants}
          selectedCustomer={tenantId}
        />
      )}
    </div>
  );
};

export default TenantDevicesTab;
