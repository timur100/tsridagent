import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, MapPin, Circle, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X, Settings, GripVertical, Eye, EyeOff, Users, ChevronDown } from 'lucide-react';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Mapping für Bundesländer-Abkürzungen zu vollen Namen
const STATE_NAMES = {
  'BB': 'Brandenburg',
  'BE': 'Berlin',
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'HB': 'Bremen',
  'HE': 'Hessen',
  'HH': 'Hamburg',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SH': 'Schleswig-Holstein',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'TH': 'Thüringen'
};

// Default column configuration
const DEFAULT_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false, width: 'w-10' },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'tenant_name', label: 'Kunde', visible: true, sortable: true },
  { id: 'location_code', label: 'Code', visible: true, sortable: true },
  { id: 'station_name', label: 'Stationsname', visible: true, sortable: true },
  { id: 'street', label: 'Straße', visible: true, sortable: true },
  { id: 'postal_code', label: 'PLZ', visible: true, sortable: true },
  { id: 'city', label: 'Stadt', visible: true, sortable: true },
  { id: 'state', label: 'Bundesland', visible: true, sortable: true },
  { id: 'country', label: 'Land', visible: false, sortable: true },
  { id: 'manager', label: 'Manager', visible: true, sortable: true },
  { id: 'phone', label: 'Telefon', visible: false, sortable: true },
  { id: 'email', label: 'E-Mail', visible: false, sortable: true },
  { id: 'sn_pc', label: 'SN-PC', visible: true, sortable: true },
  { id: 'sn_sc', label: 'SN-SC', visible: true, sortable: true },
  { id: 'tv_id', label: 'TeamViewer', visible: false, sortable: true },
];

const AllLocationsTab = ({ theme, selectedTenantId }) => {
  const navigate = useNavigate();
  const { apiCall } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'location_code', direction: 'asc' });
  const [onlineStatusFilter, setOnlineStatusFilter] = useState('all');
  const [filters, setFilters] = useState({
    continent: '',
    country: '',
    state: '',
    city: '',
    mainType: '',
    tenant: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    continents: [],
    countries: [],
    states: [],
    cities: [],
    mainTypes: [],
    tenants: []
  });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [assigningTenant, setAssigningTenant] = useState(null);
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('allLocationsColumns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Save columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem('allLocationsColumns', JSON.stringify(columns));
  }, [columns]);

  const getStateName = (stateCode) => {
    return STATE_NAMES[stateCode] || stateCode;
  };

  const getSpecialLocationType = (location) => {
    const stationName = (location.station_name || '').toUpperCase();
    const locationCode = (location.location_code || '').toUpperCase();
    const mainType = location.main_type;
    
    const types = [];
    
    if (stationName.includes('AIRPORT') || stationName.includes('FLUGHAFEN') || 
        locationCode.includes('AIR') || mainType === 'A') {
      types.push('Airport');
    }
    
    if (stationName.includes('HBF') || stationName.includes('HAUPTBAHNHOF') || 
        stationName.includes('CENTRAL STATION') || stationName.includes('MAIN STATION')) {
      types.push('Mainstation');
    }
    
    if (stationName.includes('24') || stationName.includes('24H') || 
        stationName.includes('24 H') || stationName.includes('24-H')) {
      types.push('24h');
    }
    
    if (stationName.includes('HOTSPOT') || mainType === 'CSS') {
      types.push('Hotspot');
    }
    
    return types;
  };

  // Fetch all locations
  useEffect(() => {
    fetchAllLocations();
    fetchAvailableTenants();
  }, [selectedTenantId]);

  const fetchAllLocations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
      const tenantId = selectedTenantId || 'all';
      const url = `${BACKEND_URL}/api/tenant-locations/${tenantId}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('[AllLocationsTab] Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTenants = async () => {
    try {
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenants/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('[AllLocationsTab] Error fetching tenants:', error);
    }
  };

  // Extract filter options from locations data
  useEffect(() => {
    if (!locations || locations.length === 0) {
      setFilterOptions({
        continents: [],
        countries: [],
        states: [],
        cities: [],
        mainTypes: [],
        tenants: []
      });
      return;
    }

    const uniqueContinents = [...new Set(locations.map(loc => loc.continent).filter(Boolean))].sort();
    
    let filteredForCountries = locations;
    if (filters.continent) {
      filteredForCountries = locations.filter(loc => loc.continent === filters.continent);
    }
    const uniqueCountries = [...new Set(filteredForCountries.map(loc => loc.country).filter(Boolean))].sort();
    
    let filteredForStates = locations;
    if (filters.continent) {
      filteredForStates = filteredForStates.filter(loc => loc.continent === filters.continent);
    }
    if (filters.country) {
      filteredForStates = filteredForStates.filter(loc => loc.country === filters.country);
    }
    const uniqueStates = [...new Set(filteredForStates.map(loc => loc.state).filter(Boolean))].sort();
    
    let filteredForCities = locations;
    if (filters.continent) {
      filteredForCities = filteredForCities.filter(loc => loc.continent === filters.continent);
    }
    if (filters.country) {
      filteredForCities = filteredForCities.filter(loc => loc.country === filters.country);
    }
    if (filters.state) {
      filteredForCities = filteredForCities.filter(loc => loc.state === filters.state);
    }
    const uniqueCities = [...new Set(filteredForCities.map(loc => loc.city).filter(Boolean))].sort();
    
    const allSpecialTypes = new Set();
    locations.forEach(loc => {
      const types = getSpecialLocationType(loc);
      types.forEach(type => allSpecialTypes.add(type));
    });
    const specialTypes = Array.from(allSpecialTypes).sort();
    
    const uniqueTenants = [...new Set(locations.map(loc => loc.tenant_name).filter(Boolean))].sort();
    
    setFilterOptions({
      continents: uniqueContinents,
      countries: uniqueCountries,
      states: uniqueStates,
      cities: uniqueCities,
      mainTypes: specialTypes,
      tenants: uniqueTenants
    });
  }, [locations, filters.continent, filters.country, filters.state]);

  const getStatusBadge = (location) => {
    const isOnline = location.id_checker !== null;
    return (
      <div className="flex items-center gap-1">
        <Circle 
          className={`w-2 h-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} 
        />
        <span className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    );
  };

  // Filter and sort locations
  const filteredLocations = locations.filter(location => {
    const isOnline = location.id_checker !== null;
    if (onlineStatusFilter === 'online' && !isOnline) return false;
    if (onlineStatusFilter === 'offline' && isOnline) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        location.location_code?.toLowerCase().includes(searchLower) ||
        location.station_name?.toLowerCase().includes(searchLower) ||
        location.street?.toLowerCase().includes(searchLower) ||
        location.city?.toLowerCase().includes(searchLower) ||
        location.state?.toLowerCase().includes(searchLower) ||
        location.postal_code?.toLowerCase().includes(searchLower) ||
        location.manager?.toLowerCase().includes(searchLower) ||
        location.email?.toLowerCase().includes(searchLower) ||
        location.phone?.toLowerCase().includes(searchLower) ||
        location.sn_pc?.toLowerCase().includes(searchLower) ||
        location.sn_sc?.toLowerCase().includes(searchLower) ||
        location.tv_id?.toLowerCase().includes(searchLower) ||
        location.tenant_name?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    if (filters.continent && location.continent !== filters.continent) return false;
    if (filters.country && location.country !== filters.country) return false;
    if (filters.state && location.state !== filters.state) return false;
    if (filters.city && location.city !== filters.city) return false;
    if (filters.tenant && location.tenant_name !== filters.tenant) return false;
    
    if (filters.mainType) {
      const specialTypes = getSpecialLocationType(location);
      if (!specialTypes.includes(filters.mainType)) return false;
    }

    return true;
  });

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    if (sortConfig.key === 'status') {
      const aOnline = a.id_checker !== null ? 1 : 0;
      const bOnline = b.id_checker !== null ? 1 : 0;
      return sortConfig.direction === 'asc' ? aOnline - bOnline : bOnline - aOnline;
    }

    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleRowClick = (location, e) => {
    // Don't navigate if clicking on checkbox
    if (e.target.type === 'checkbox' || e.target.closest('.checkbox-cell')) return;
    navigate(`/portal/admin/locations/${location.location_id}`);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      if (filterType === 'continent') {
        newFilters.country = '';
        newFilters.state = '';
        newFilters.city = '';
      } else if (filterType === 'country') {
        newFilters.state = '';
        newFilters.city = '';
      } else if (filterType === 'state') {
        newFilters.city = '';
      }
      
      return newFilters;
    });
  };

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(sortedLocations.map(loc => loc.location_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (locationId, checked) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(locationId);
      } else {
        newSet.delete(locationId);
      }
      return newSet;
    });
  };

  const isAllSelected = sortedLocations.length > 0 && selectedIds.size === sortedLocations.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < sortedLocations.length;

  // Assign locations to tenant
  const handleAssignToTenant = async (tenantId) => {
    if (!tenantId || selectedIds.size === 0) return;
    
    setAssigningTenant(tenantId);
    try {
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
      const locationIds = Array.from(selectedIds);
      
      const response = await fetch(`${BACKEND_URL}/api/locations/assign-tenant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location_ids: locationIds,
          tenant_id: tenantId
        })
      });
      
      if (response.ok) {
        // Refresh locations and clear selection
        await fetchAllLocations();
        setSelectedIds(new Set());
        setShowAssignModal(false);
      } else {
        console.error('Failed to assign locations');
      }
    } catch (error) {
      console.error('Error assigning locations:', error);
    } finally {
      setAssigningTenant(null);
    }
  };

  // Column visibility toggle
  const toggleColumnVisibility = (columnId) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  // Column drag handlers
  const handleDragStart = (e, index) => {
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;
    
    setColumns(prev => {
      const newColumns = [...prev];
      const draggedItem = newColumns[draggedColumn];
      newColumns.splice(draggedColumn, 1);
      newColumns.splice(index, 0, draggedItem);
      setDraggedColumn(index);
      return newColumns;
    });
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem('allLocationsColumns');
  };

  // Get visible columns
  const visibleColumns = columns.filter(col => col.visible);

  // Render cell value based on column id
  const renderCellValue = (location, columnId) => {
    switch (columnId) {
      case 'status':
        return getStatusBadge(location);
      case 'tenant_name':
        return location.tenant_name || <span className="text-gray-400 italic">Nicht zugewiesen</span>;
      case 'location_code':
        return <span className="font-semibold">{location.location_code}</span>;
      case 'state':
        return location.state ? getStateName(location.state) : '-';
      default:
        return location[columnId] || '-';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with selection actions and column settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-[#c00000]/20 border border-[#c00000]/40' : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {selectedIds.size} ausgewählt
              </span>
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#c00000] text-white text-sm rounded-lg hover:bg-[#a00000] transition-colors"
              >
                <Users className="w-4 h-4" />
                Tenant zuweisen
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Column Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-gray-300 hover:bg-[#333]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Spalten</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showColumnSettings ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Column Settings Dropdown */}
          {showColumnSettings && (
            <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-50 ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Spalten konfigurieren
                  </span>
                  <button
                    onClick={resetColumns}
                    className="text-xs text-[#c00000] hover:underline"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ziehen zum Neuordnen, klicken zum Ein-/Ausblenden
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {columns.filter(col => col.id !== 'select').map((column, index) => (
                  <div
                    key={column.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-move transition-colors ${
                      draggedColumn === index
                        ? 'bg-[#c00000]/20'
                        : theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <GripVertical className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <button
                      onClick={() => toggleColumnVisibility(column.id)}
                      className={`flex-1 flex items-center justify-between ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-sm">{column.label}</span>
                      {column.visible ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Suchen nach Code, Name, Adresse, Manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          />
        </div>

        {/* Status Filter */}
        <select
          value={onlineStatusFilter}
          onChange={(e) => setOnlineStatusFilter(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="all">Alle Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        {/* Continent Filter */}
        <select
          value={filters.continent}
          onChange={(e) => handleFilterChange('continent', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Kontinente</option>
          {Array.isArray(filterOptions?.continents) && filterOptions.continents.map(continent => (
            <option key={continent} value={continent}>{continent}</option>
          ))}
        </select>

        {/* Country Filter */}
        <select
          value={filters.country}
          onChange={(e) => handleFilterChange('country', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Länder</option>
          {Array.isArray(filterOptions?.countries) && filterOptions.countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

        {/* State Filter */}
        <select
          value={filters.state}
          onChange={(e) => handleFilterChange('state', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Bundesländer</option>
          {Array.isArray(filterOptions?.states) && filterOptions.states.map(state => (
            <option key={state} value={state}>{getStateName(state)}</option>
          ))}
        </select>

        {/* City Filter */}
        <select
          value={filters.city}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Städte</option>
          {Array.isArray(filterOptions?.cities) && filterOptions.cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        {/* Special Places Filter */}
        <select
          value={filters.mainType}
          onChange={(e) => handleFilterChange('mainType', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Besondere Orte</option>
          {Array.isArray(filterOptions?.mainTypes) && filterOptions.mainTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Tenant Filter */}
        <select
          value={filters.tenant}
          onChange={(e) => handleFilterChange('tenant', e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Kunden</option>
          {Array.isArray(filterOptions?.tenants) && filterOptions.tenants.map(tenant => (
            <option key={tenant} value={tenant}>{tenant}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        {sortedLocations.length} von {locations.length} Standorten
      </div>

      {/* Locations Table */}
      <Card className={`rounded-xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
      }`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
          </div>
        ) : sortedLocations.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Keine Standorte gefunden, die Ihren Suchkriterien entsprechen' 
                : 'Keine Standorte vorhanden'}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  {/* Checkbox header */}
                  <th className={`px-3 py-3 w-10 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000] cursor-pointer"
                    />
                  </th>
                  {visibleColumns.filter(col => col.id !== 'select').map(column => (
                    <th
                      key={column.id}
                      className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                        column.sortable ? 'cursor-pointer hover:bg-opacity-80' : ''
                      } ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => column.sortable && handleSort(column.id)}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {column.sortable && getSortIcon(column.id)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                {sortedLocations.map((location) => (
                  <tr
                    key={location.location_id}
                    onClick={(e) => handleRowClick(location, e)}
                    className={`border-t cursor-pointer transition-colors ${
                      selectedIds.has(location.location_id)
                        ? theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'
                        : theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                    } ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    {/* Checkbox cell */}
                    <td className="px-3 py-3 checkbox-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(location.location_id)}
                        onChange={(e) => handleSelectOne(location.location_id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000] cursor-pointer"
                      />
                    </td>
                    {visibleColumns.filter(col => col.id !== 'select').map(column => (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-sm font-mono ${
                          column.id === 'location_code'
                            ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {renderCellValue(location, column.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assign Tenant Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div
            className={`w-full max-w-md rounded-xl p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tenant zuweisen
            </h3>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedIds.size} Standort(e) ausgewählt. Wählen Sie einen Tenant:
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableTenants.map(tenant => (
                <button
                  key={tenant.tenant_id}
                  onClick={() => handleAssignToTenant(tenant.tenant_id)}
                  disabled={assigningTenant !== null}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    assigningTenant === tenant.tenant_id
                      ? 'bg-[#c00000] text-white border-[#c00000]'
                      : theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white hover:bg-[#333]'
                        : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{tenant.name || tenant.tenant_id}</span>
                  {assigningTenant === tenant.tenant_id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllLocationsTab;
