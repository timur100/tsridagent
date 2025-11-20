import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Circle, Search, ArrowUpDown, ArrowUp, ArrowDown, Plane, Train, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';

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

const LocationsTabEnhanced = ({
  theme,
  locations,
  loadingLocations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  tenantId,
  isCustomerPortal = false  // New prop to identify customer portal usage
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'location_code', direction: 'asc' });
  const [filters, setFilters] = useState({
    continent: '',
    country: '',
    state: '',
    city: '',
    mainType: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    continents: [],
    countries: [],
    states: [],
    cities: [],
    mainTypes: []
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Hilfsfunktion um Bundesland-Namen zu bekommen
  const getStateName = (stateCode) => {
    return STATE_NAMES[stateCode] || stateCode;
  };

  // Hilfsfunktion um besondere Orte zu identifizieren
  const getSpecialLocationType = (location) => {
    const stationName = (location.station_name || '').toUpperCase();
    const locationCode = (location.location_code || '').toUpperCase();
    const mainType = location.main_type;
    
    const types = [];
    
    // Check for Airport
    if (stationName.includes('AIRPORT') || stationName.includes('FLUGHAFEN') || 
        locationCode.includes('AIR') || mainType === 'A') {
      types.push('Airport');
    }
    
    // Check for Mainstation
    if (stationName.includes('HBF') || stationName.includes('HAUPTBAHNHOF') || 
        stationName.includes('CENTRAL STATION') || stationName.includes('MAIN STATION')) {
      types.push('Mainstation');
    }
    
    // Check for 24h
    if (stationName.includes('24') || stationName.includes('24H') || 
        stationName.includes('24 H') || stationName.includes('24-H')) {
      types.push('24h');
    }
    
    // Check for Hotspot
    if (stationName.includes('HOTSPOT') || mainType === 'CSS') {
      types.push('Hotspot');
    }
    
    return types;
  };

  // Extract filter options from locations data
  useEffect(() => {
    if (!locations || locations.length === 0) {
      setFilterOptions({
        continents: [],
        countries: [],
        states: [],
        cities: [],
        mainTypes: []
      });
      return;
    }

    // Get unique continents
    const uniqueContinents = [...new Set(locations.map(loc => loc.continent).filter(Boolean))].sort();
    
    // Get unique countries (filtered by selected continent if applicable)
    let filteredForCountries = locations;
    if (filters.continent) {
      filteredForCountries = locations.filter(loc => loc.continent === filters.continent);
    }
    const uniqueCountries = [...new Set(filteredForCountries.map(loc => loc.country).filter(Boolean))].sort();
    
    // Get unique states (filtered by selected continent and country if applicable)
    let filteredForStates = locations;
    if (filters.continent) {
      filteredForStates = filteredForStates.filter(loc => loc.continent === filters.continent);
    }
    if (filters.country) {
      filteredForStates = filteredForStates.filter(loc => loc.country === filters.country);
    }
    const uniqueStates = [...new Set(filteredForStates.map(loc => loc.state).filter(Boolean))].sort();
    
    // Get unique cities (filtered by selected continent, country, and state if applicable)
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
    
    // Get special location types (Besondere Orte)
    const allSpecialTypes = new Set();
    locations.forEach(loc => {
      const types = getSpecialLocationType(loc);
      types.forEach(type => allSpecialTypes.add(type));
    });
    const specialTypes = Array.from(allSpecialTypes).sort();
    
    setFilterOptions({
      continents: uniqueContinents,
      countries: uniqueCountries,
      states: uniqueStates,
      cities: uniqueCities,
      mainTypes: specialTypes
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

  // Filter locations based on search and filters
  const filteredLocations = locations.filter(location => {
    // Search filter
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
        location.tv_id?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Dropdown filters
    if (filters.continent && location.continent !== filters.continent) return false;
    if (filters.country && location.country !== filters.country) return false;
    if (filters.state && location.state !== filters.state) return false;
    if (filters.city && location.city !== filters.city) return false;
    
    // Special location type filter (Besondere Orte)
    if (filters.mainType) {
      const specialTypes = getSpecialLocationType(location);
      if (!specialTypes.includes(filters.mainType)) return false;
    }

    return true;
  });

  // Sort locations
  const sortedLocations = [...filteredLocations].sort((a, b) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
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

  const handleRowClick = (location) => {
    if (isCustomerPortal) {
      navigate(`/portal/customer/locations/${location.location_id}`);
    } else {
      navigate(`/portal/admin/tenants/${tenantId}/locations/${location.location_id}`);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Reset dependent filters
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
      // mainType is independent, no dependencies
      
      return newFilters;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Title, Search Bar and Add Button in one row */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Standorte
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {sortedLocations.length} von {locations.length} {locations.length === 1 ? 'Standort' : 'Standorte'}
          </p>
        </div>
        
        {/* Search Bar - takes full width between title and button */}
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Suche nach Code, Name, Stadt, Manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          />
        </div>
        
        {!isCustomerPortal && (
          <button
            onClick={onAddLocation}
            className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Standort hinzufügen
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* Continent Filter */}
        <select
          value={filters.continent}
          onChange={(e) => handleFilterChange('continent', e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Kontinente</option>
          {filterOptions.continents.map(continent => (
            <option key={continent} value={continent}>{continent}</option>
          ))}
        </select>

        {/* Country Filter */}
        <select
          value={filters.country}
          onChange={(e) => handleFilterChange('country', e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          disabled={!filters.continent && filterOptions.countries.length === 0}
        >
          <option value="">Alle Länder</option>
          {filterOptions.countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

        {/* State Filter */}
        <select
          value={filters.state}
          onChange={(e) => handleFilterChange('state', e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Bundesländer</option>
          {filterOptions.states.map(state => (
            <option key={state} value={state}>{getStateName(state)}</option>
          ))}
        </select>

        {/* City Filter */}
        <select
          value={filters.city}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Alle Städte</option>
          {filterOptions.cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        {/* Main Type Filter (Besondere Orte) */}
        <select
          value={filters.mainType}
          onChange={(e) => handleFilterChange('mainType', e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        >
          <option value="">Besondere Orte</option>
          {filterOptions.mainTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {(searchTerm || Object.values(filters).some(f => f)) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({
                continent: '',
                country: '',
                state: '',
                city: '',
                mainType: ''
              });
            }}
            className={`px-4 py-2 rounded-lg border transition-all ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-gray-300 hover:bg-[#333] hover:border-[#c00000]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#c00000]'
            }`}
          >
            Filter löschen
          </button>
        )}
      </div>

      {/* Locations Table */}
      <Card className={`rounded-xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
      }`}>
        {loadingLocations ? (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('location_code')}
                  >
                    <div className="flex items-center">
                      Code
                      {getSortIcon('location_code')}
                    </div>
                  </th>
                  <th className={`px-4 py-3 text-center text-xs font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Typ
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('station_name')}
                  >
                    <div className="flex items-center">
                      Stationsname
                      {getSortIcon('station_name')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('street')}
                  >
                    <div className="flex items-center">
                      Straße
                      {getSortIcon('street')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('postal_code')}
                  >
                    <div className="flex items-center">
                      PLZ
                      {getSortIcon('postal_code')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center">
                      Stadt
                      {getSortIcon('city')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center">
                      Bundesland
                      {getSortIcon('state')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('manager')}
                  >
                    <div className="flex items-center">
                      Manager
                      {getSortIcon('manager')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center">
                      Land
                      {getSortIcon('country')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('continent')}
                  >
                    <div className="flex items-center">
                      Kontinent
                      {getSortIcon('continent')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center">
                      Telefon
                      {getSortIcon('phone')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      E-Mail
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSort('id_checker')}
                  >
                    <div className="flex items-center">
                      IDS
                      {getSortIcon('id_checker')}
                    </div>
                  </th>
                  <th 
                    className={`px-4 py-3 text-center text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Online
                  </th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLocations.map((location) => (
                  <tr
                    key={location.location_id}
                    onClick={() => handleRowClick(location)}
                    className={`border-t cursor-pointer ${
                      theme === 'dark' 
                        ? 'border-gray-700 hover:bg-[#333]' 
                        : 'border-gray-100 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-4 py-3">
                      {getStatusBadge(location)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {location.location_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {(() => {
                          const stationName = (location.station_name || '').toUpperCase();
                          const locationCode = (location.location_code || '').toUpperCase();
                          const mainType = location.main_type;
                          const types = [];
                          
                          // Check for Airport
                          if (stationName.includes('AIRPORT') || stationName.includes('FLUGHAFEN') || 
                              locationCode.includes('AIR') || mainType === 'A') {
                            types.push(<Plane key="airport" className="w-5 h-5" style={{color: '#c00000'}} title="Airport" />);
                          }
                          
                          // Check for Mainstation
                          if (stationName.includes('HBF') || stationName.includes('HAUPTBAHNHOF') || 
                              stationName.includes('CENTRAL STATION') || stationName.includes('MAIN STATION')) {
                            types.push(<Train key="mainstation" className="w-5 h-5" style={{color: '#c00000'}} title="Mainstation" />);
                          }
                          
                          // Check for 24h
                          if (stationName.includes('24') || stationName.includes('24H') || 
                              stationName.includes('24 H') || stationName.includes('24-H')) {
                            types.push(<Clock key="24h" className="w-5 h-5" style={{color: '#c00000'}} title="24h" />);
                          }
                          
                          return types.length > 0 ? types : <span className="text-gray-400">-</span>;
                        })()}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.station_name}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.street || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.postal_code || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.city || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.state ? getStateName(location.state) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.manager || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.country || 'Deutschland'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.continent || 'Europa'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.phone || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.email || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {location.id_checker || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <span 
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold min-w-[55px] ${
                            location.online_device_count > 0
                              ? 'text-white animate-pulse'
                              : 'text-white'
                          }`}
                          style={{
                            backgroundColor: location.online_device_count > 0 ? '#00D150' : '#a13b3b'
                          }}
                        >
                          <span className="font-bold">{location.online_device_count || 0}</span>
                          <span>|</span>
                          <span>{location.device_count || 0}</span>
                        </span>
                      </div>
                    </td>
                    {!isCustomerPortal && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLocation(location);
                            }}
                            className={`p-2 rounded-lg transition-all ${
                              theme === 'dark'
                                ? 'hover:bg-[#1f1f1f] text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                            title="Bearbeiten"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLocation(location.location_id);
                            }}
                            className={`p-2 rounded-lg transition-all ${
                              theme === 'dark'
                                ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-400'
                                : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                            }`}
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LocationsTabEnhanced;
