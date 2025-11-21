import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { 
  Clock, 
  Search, 
  Monitor, 
  MapPin,
  Building2,
  ChevronUp,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantInPreparationPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('');
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'device_id',
    direction: 'asc'
  });
  const [activeView, setActiveView] = useState('all'); // 'all', 'devices', 'locations'

  useEffect(() => {
    loadTenantName();
    loadInPreparationItems();
  }, [tenantId]);

  useEffect(() => {
    filterItems();
  }, [searchTerm, devices, locations, sortConfig, activeView]);

  const loadTenantName = async () => {
    try {
      const response = await apiCall(`/api/tenants/${tenantId}`);
      setTenantName(response?.display_name || response?.name || 'Tenant');
    } catch (error) {
      console.error('[TenantInPreparation] Error loading tenant name:', error);
    }
  };

  const loadInPreparationItems = async () => {
    setLoading(true);
    try {
      // Load devices for this tenant
      const devicesResponse = await apiCall(`/api/tenant-devices/${tenantId}`);
      const allDevices = devicesResponse?.data || devicesResponse || [];
      
      // Filter only in_preparation devices
      const inPrepDevices = allDevices.filter(d => 
        d.status === 'in_preparation' || d.status === 'preparation'
      );
      
      console.log('[TenantInPreparation] Devices:', inPrepDevices.length);
      setDevices(inPrepDevices);
      
      // Load locations for this tenant
      const locationsResponse = await apiCall(`/api/tenant-locations/tenant/${tenantId}`);
      const allLocations = locationsResponse?.locations || locationsResponse || [];
      
      // Filter only in_preparation locations
      const inPrepLocations = allLocations.filter(l => 
        l.status === 'in_preparation' || l.status === 'preparation'
      );
      
      console.log('[TenantInPreparation] Locations:', inPrepLocations.length);
      setLocations(inPrepLocations);
      
      toast.success(`${inPrepDevices.length + inPrepLocations.length} In Vorbereitung-Artikel geladen`);
    } catch (error) {
      console.error('[TenantInPreparation] Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    // Filter devices
    let filteredDevs = [...devices];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredDevs = filteredDevs.filter(device =>
        device.device_id?.toLowerCase().includes(term) ||
        device.city?.toLowerCase().includes(term) ||
        device.location_code?.toLowerCase().includes(term)
      );
    }
    
    // Filter locations
    let filteredLocs = [...locations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredLocs = filteredLocs.filter(location =>
        location.location_code?.toLowerCase().includes(term) ||
        location.station_name?.toLowerCase().includes(term) ||
        location.city?.toLowerCase().includes(term)
      );
    }

    // Sort devices
    filteredDevs.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Sort locations
    filteredLocs.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredDevices(filteredDevs);
    setFilteredLocations(filteredLocs);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeviceClick = (device) => {
    navigate(`/portal/admin/tenants/${tenantId}/devices/${device.device_id}`);
  };

  const handleLocationClick = (location) => {
    navigate(`/portal/admin/tenants/${tenantId}/locations/${location.location_code}`);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const totalItems = filteredDevices.length + filteredLocations.length;
  const displayedDevices = activeView === 'locations' ? [] : filteredDevices;
  const displayedLocations = activeView === 'devices' ? [] : filteredLocations;

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/portal/admin/tenants/${tenantId}`)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-[#2a2a2a] text-gray-400 hover:text-white'
                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {tenantName} - In Vorbereitung
            </h1>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Alle Geräte und Standorte in Vorbereitung für diesen Mandanten
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
              <p className="text-3xl font-bold text-yellow-500">
                {totalItems}
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-500" />
          </div>
        </Card>

        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Geräte
              </p>
              <p className="text-3xl font-bold text-blue-500">
                {devices.length}
              </p>
            </div>
            <Monitor className="h-12 w-12 text-blue-500" />
          </div>
        </Card>

        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Standorte
              </p>
              <p className="text-3xl font-bold text-green-500">
                {locations.length}
              </p>
            </div>
            <MapPin className="h-12 w-12 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'all'
              ? 'bg-yellow-500 text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              : 'bg-white text-gray-600 hover:text-gray-900'
          }`}
        >
          Alle ({totalItems})
        </button>
        <button
          onClick={() => setActiveView('devices')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'devices'
              ? 'bg-blue-500 text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              : 'bg-white text-gray-600 hover:text-gray-900'
          }`}
        >
          Nur Geräte ({devices.length})
        </button>
        <button
          onClick={() => setActiveView('locations')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'locations'
              ? 'bg-green-500 text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              : 'bg-white text-gray-600 hover:text-gray-900'
          }`}
        >
          Nur Standorte ({locations.length})
        </button>
      </div>

      {/* Search Bar */}
      <Card className={`p-4 rounded-xl mb-6 ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
          : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
      }`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Suchen nach Geräte-ID, Standort, Stadt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
          />
        </div>
      </Card>

      {/* Devices Table */}
      {displayedDevices.length > 0 && (
        <Card className={`rounded-xl overflow-hidden mb-6 ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="p-4 border-b border-gray-700">
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Monitor className="h-5 w-5 text-blue-500" />
              Geräte in Vorbereitung ({displayedDevices.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th 
                    onClick={() => handleSort('device_id')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Geräte-ID <SortIcon columnKey="device_id" />
                  </th>
                  <th 
                    onClick={() => handleSort('location_code')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Standort <SortIcon columnKey="location_code" />
                  </th>
                  <th 
                    onClick={() => handleSort('city')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Stadt <SortIcon columnKey="city" />
                  </th>
                  <th 
                    onClick={() => handleSort('country')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Land <SortIcon columnKey="country" />
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {displayedDevices.map((device, index) => (
                  <tr
                    key={index}
                    onClick={() => handleDeviceClick(device)}
                    className={`cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#333333]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {device.device_id}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {device.location_code || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {device.city || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {device.country || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        In Vorbereitung
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Locations Table */}
      {displayedLocations.length > 0 && (
        <Card className={`rounded-xl overflow-hidden ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="p-4 border-b border-gray-700">
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <MapPin className="h-5 w-5 text-green-500" />
              Standorte in Vorbereitung ({displayedLocations.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th 
                    onClick={() => handleSort('location_code')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Standort-Code <SortIcon columnKey="location_code" />
                  </th>
                  <th 
                    onClick={() => handleSort('station_name')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Name <SortIcon columnKey="station_name" />
                  </th>
                  <th 
                    onClick={() => handleSort('city')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Stadt <SortIcon columnKey="city" />
                  </th>
                  <th 
                    onClick={() => handleSort('street')}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Straße <SortIcon columnKey="street" />
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {displayedLocations.map((location, index) => (
                  <tr
                    key={index}
                    onClick={() => handleLocationClick(location)}
                    className={`cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#333333]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {location.location_code}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {location.station_name || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {location.city || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {location.street || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        In Vorbereitung
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && totalItems === 0 && (
        <Card className={`p-12 text-center rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <Clock className={`h-16 w-16 mx-auto mb-4 ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Keine Artikel in Vorbereitung
          </h3>
          <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Aktuell befinden sich keine Geräte oder Standorte dieses Mandanten im Status "In Vorbereitung"
          </p>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card className={`p-12 text-center rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Daten...
          </p>
        </Card>
      )}
    </div>
  );
};

export default TenantInPreparationPage;
