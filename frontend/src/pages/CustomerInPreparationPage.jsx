import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { 
  Clock, 
  Search, 
  Monitor, 
  MapPin,
  ChevronUp,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerInPreparationPage = () => {
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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

  // Get tenant ID from user
  const tenantId = user?.tenant_ids?.[0];

  useEffect(() => {
    if (tenantId) {
      loadInPreparationItems();
    }
  }, [tenantId]);

  useEffect(() => {
    filterItems();
  }, [searchTerm, devices, locations, sortConfig, activeView]);

  const loadInPreparationItems = async () => {
    setLoading(true);
    try {
      console.log('[CustomerInPreparation] Loading items for tenant:', tenantId);
      
      // Use the new tenant-specific in-preparation endpoint
      const response = await apiCall(`/api/tenant-devices/${tenantId}/in-preparation`);
      console.log('[CustomerInPreparation] API response:', response);
      
      // Extract data from response
      let devicesData = [];
      let locationsData = [];
      
      if (response?.data?.devices && Array.isArray(response.data.devices)) {
        devicesData = response.data.devices;
      } else if (response?.data?.data?.devices && Array.isArray(response.data.data.devices)) {
        devicesData = response.data.data.devices;
      }
      
      if (response?.data?.locations && Array.isArray(response.data.locations)) {
        locationsData = response.data.locations;
      } else if (response?.data?.data?.locations && Array.isArray(response.data.data.locations)) {
        locationsData = response.data.data.locations;
      }
      
      console.log('[CustomerInPreparation] Devices:', devicesData.length, 'Locations:', locationsData.length);
      
      setDevices(devicesData);
      setLocations(locationsData);
      
      const totalItems = devicesData.length + locationsData.length;
      if (totalItems > 0) {
        toast.success(`${totalItems} In Vorbereitung-Artikel geladen`);
      }
    } catch (error) {
      console.error('[CustomerInPreparation] Error loading data:', error);
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
        device.locationcode?.toLowerCase().includes(term) ||
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
    navigate(`/portal/customer/devices/${device.device_id}`, {
      state: { fromTab: 'in-preparation' }
    });
  };

  const handleLocationClick = (location) => {
    navigate(`/portal/customer/locations/${location.location_id}`);
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
            onClick={() => navigate('/portal/customer')}
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
              In Vorbereitung
            </h1>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Alle Ihre Geräte und Standorte in Vorbereitung
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
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Alle ({totalItems})
        </button>
        <button
          onClick={() => setActiveView('devices')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'devices'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Nur Geräte ({devices.length})
        </button>
        <button
          onClick={() => setActiveView('locations')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'locations'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Nur Standorte ({locations.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Suchen nach Device-ID, Standort, Stadt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
        </div>
      ) : totalItems === 0 ? (
        <Card className={`p-12 text-center ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none' 
            : 'bg-white border border-gray-100'
        }`}>
          <Clock className={`h-16 w-16 mx-auto mb-4 ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Keine Einträge in Vorbereitung
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Es gibt derzeit keine Geräte oder Standorte im Status "In Vorbereitung"
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Devices Table */}
          {displayedDevices.length > 0 && (
            <Card className={`overflow-hidden ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none' 
                : 'bg-white border border-gray-100'
            }`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Geräte ({displayedDevices.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                    <tr>
                      <th 
                        onClick={() => handleSort('device_id')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Device-ID <SortIcon columnKey="device_id" />
                      </th>
                      <th 
                        onClick={() => handleSort('locationcode')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Standort <SortIcon columnKey="locationcode" />
                      </th>
                      <th 
                        onClick={() => handleSort('city')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Stadt <SortIcon columnKey="city" />
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-semibold ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
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
                            ? 'hover:bg-[#1f1f1f]' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {device.device_id || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {device.locationcode || device.location_code || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {device.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
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
            <Card className={`overflow-hidden ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none' 
                : 'bg-white border border-gray-100'
            }`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Standorte ({displayedLocations.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                    <tr>
                      <th 
                        onClick={() => handleSort('location_code')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Standort-Code <SortIcon columnKey="location_code" />
                      </th>
                      <th 
                        onClick={() => handleSort('station_name')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Name <SortIcon columnKey="station_name" />
                      </th>
                      <th 
                        onClick={() => handleSort('city')}
                        className={`px-6 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-opacity-80 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        Stadt <SortIcon columnKey="city" />
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-semibold ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
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
                            ? 'hover:bg-[#1f1f1f]' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {location.location_code || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {location.station_name || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {location.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
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
        </div>
      )}
    </div>
  );
};

export default CustomerInPreparationPage;
