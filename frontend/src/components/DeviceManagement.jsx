import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomerFilter } from '../contexts/CustomerFilterContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Monitor, CheckCircle, XCircle, Clock, Search, Filter, ChevronUp, ChevronDown, Settings, Eye, EyeOff, GripVertical, Check, ExternalLink, Video } from 'lucide-react';
import DeviceDetailsModal from './DeviceDetailsModal';
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

// Default column configuration for Devices
const DEFAULT_DEVICE_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false, width: 'w-10' },
  { id: 'device_id', label: 'Device-ID', visible: true, sortable: true, width: 'w-28' },
  { id: 'status', label: 'Status', visible: true, sortable: true, width: 'w-20' },
  { id: 'teamviewer', label: 'TeamViewer', visible: true, sortable: false, width: 'w-28' },
  { id: 'customer', label: 'Kunde', visible: true, sortable: true, width: 'w-32' },
  { id: 'locationcode', label: 'Location', visible: true, sortable: true, width: 'w-20' },
  { id: 'street', label: 'Straße', visible: true, sortable: true, width: 'w-48' },
  { id: 'zip', label: 'PLZ', visible: true, sortable: true, width: 'w-16' },
  { id: 'city', label: 'Stadt', visible: true, sortable: true, width: 'w-32' },
  { id: 'country', label: 'Land', visible: true, sortable: true, width: 'w-20' },
  { id: 'sn_pc', label: 'SN-PC', visible: true, sortable: true, width: 'w-24' },
  { id: 'sn_sc', label: 'SN-SC', visible: true, sortable: true, width: 'w-24' },
  { id: 'set_id', label: 'Set', visible: true, sortable: true, width: 'w-28' },
  { id: 'tvid', label: 'TVID', visible: false, sortable: true, width: 'w-20' },
  { id: 'ip', label: 'IP', visible: false, sortable: true, width: 'w-24' },
  { id: 'sw_version', label: 'Version', visible: false, sortable: true, width: 'w-20' },
];

const DeviceManagement = ({ searchTerm: externalSearchTerm, onSearchChange, initialStatusFilter }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const { selectedCustomer, customers } = useCustomerFilter();
  const { selectedTenantId, selectedTenantName } = useTenant();
  const [devices, setDevices] = useState([]);
  const [stations, setStations] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: initialStatusFilter || 'all',
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
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('deviceManagementColumns');
    return saved ? JSON.parse(saved) : DEFAULT_DEVICE_COLUMNS;
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Use external searchTerm if provided, otherwise use internal
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchChange || setInternalSearchTerm;
  
  // Close column settings when clicking outside
  useEffect(() => {
    if (!showColumnSettings) return; // Only add listener when dropdown is open
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-column-settings]')) {
        setShowColumnSettings(false);
      }
    };
    
    // Use setTimeout to avoid immediate close on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showColumnSettings]);
  
  // Save columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem('deviceManagementColumns', JSON.stringify(columns));
  }, [columns]);
  
  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDevices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDevices.map(d => d.device_id || d._id)));
    }
  };
  
  const toggleSelectDevice = (deviceId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedIds(newSelected);
  };
  
  // Column visibility toggle
  const toggleColumnVisibility = (columnId) => {
    if (columnId === 'select') return; // Cannot hide checkbox column
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };
  
  // Column drag & drop handlers
  const handleDragStart = (e, columnId) => {
    if (columnId === 'select') return;
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (columnId === 'select' || columnId === draggedColumn) return;
    
    const dragIndex = columns.findIndex(c => c.id === draggedColumn);
    const hoverIndex = columns.findIndex(c => c.id === columnId);
    
    if (dragIndex === -1 || hoverIndex === -1) return;
    
    const newColumns = [...columns];
    const [removed] = newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, removed);
    setColumns(newColumns);
  };
  
  const handleDragEnd = () => {
    setDraggedColumn(null);
  };
  
  // Reset columns to default
  const resetColumns = () => {
    setColumns(DEFAULT_DEVICE_COLUMNS);
    localStorage.removeItem('deviceManagementColumns');
  };

  // Check if user has access to Europcar devices
  const hasAccess = user?.role === 'admin' || (user?.company && user.company.toLowerCase().includes('europcar'));

  // Check if Europcar is selected
  const isEuropcarSelected = () => {
    if (!customers || customers.length === 0) return false;
    
    if (selectedCustomer === 'all') {
      return customers.some(c => c.company && c.company.toLowerCase().includes('europcar'));
    }
    
    const selected = customers.find(c => c.email === selectedCustomer);
    return selected?.company && selected.company.toLowerCase().includes('europcar');
  };

  // Get customer/tenant name for title
  const getCustomerTitle = () => {
    // Use tenant name if available
    if (selectedTenantId && selectedTenantId !== 'all') {
      return `${selectedTenantName} - Geräte`;
    }
    
    if (selectedTenantId === 'all') {
      return 'Alle Kunden - Geräte';
    }
    
    // Fallback to customer filter
    if (selectedCustomer === 'all') {
      return 'Geräte'; // Alle Kunden
    }
    
    const customer = customers.find(c => c.email === selectedCustomer);
    if (customer) {
      return `${customer.company} Geräte`;
    }
    
    return 'Geräte';
  };

  useEffect(() => {
    if (hasAccess) {
      // Load devices when tenant selection changes
      loadDevices();
      loadStations();
    } else {
      setLoading(false);
    }
  }, [selectedCustomer, selectedTenantId]);

  // Load devices on mount (for when component re-mounts via key change)
  useEffect(() => {
    if (hasAccess) {
      loadDevices();
    }
  }, []);

  // Update filter when initialStatusFilter changes
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== 'all') {
      setFilters(prev => ({
        ...prev,
        status: initialStatusFilter
      }));
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    filterDevices();
  }, [searchTerm, filters, devices, stations, sortConfig]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      console.log('🔍 DeviceManagement: Loading devices for tenant:', selectedTenantId, selectedTenantName);
      
      let allDevices = [];
      
      // If a specific tenant is selected, load only that tenant's devices
      if (selectedTenantId && selectedTenantId !== 'all') {
        console.log(`📡 Calling: /api/tenant-devices/${selectedTenantId}`);
        const result = await apiCall(`/api/tenant-devices/${selectedTenantId}`);
        
        console.log('📦 API Result:', result);
        
        if (result.success && result.data) {
          const responseData = result.data.data || result.data;
          allDevices = responseData.devices || [];
          console.log(`✅ Loaded ${allDevices.length} devices for tenant ${selectedTenantName}`);
        }
      } else {
        // Load all devices from all tenants
        console.log('📡 Calling: /api/tenant-devices/all/devices');
        const result = await apiCall('/api/tenant-devices/all/devices');
        
        console.log('📦 API Result:', result);
        
        if (result.success && result.data) {
          const responseData = result.data.data || result.data;
          allDevices = responseData.devices || [];
          console.log(`✅ Loaded ${allDevices.length} devices (all tenants)`);
        }
      }
      
      setDevices(allDevices);
    } catch (error) {
      console.error('❌ Error loading devices:', error);
      toast.error('Fehler beim Laden der Geräte');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStations = async () => {
    try {
      // Build API URL with customer filter
      let apiUrl = '/api/portal/customer-data/europcar-stations';
      if (selectedCustomer && selectedCustomer !== 'all') {
        apiUrl += `?customer_email=${encodeURIComponent(selectedCustomer)}`;
      }
      
      const result = await apiCall(apiUrl);
      
      if (result.success && result.data) {
        setStations(result.data.stations || []);
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
      const station = stations.find(s => s.main_code === device.locationcode);
      if (station && station.bundesl) {
        return getFullBundeslandName(station.bundesl);
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

  const handleDeviceClick = (device) => {
    // Navigate to device detail page
    // If we have a specific tenant selected, use tenant-specific route
    if (selectedTenantId && selectedTenantId !== 'all') {
      navigate(`/portal/admin/tenants/${selectedTenantId}/devices/${device.device_id}`, {
        state: { fromTab: 'devices', tenantId: selectedTenantId }
      });
    } else {
      // For "Alle Kunden" view, use global device route
      navigate(`/portal/admin/devices/${device.device_id}`, {
        state: { fromAllDevices: true }
      });
    }
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
    const station = stations.find(s => s.main_code === device.locationcode);
    return {
      ...device,
      bundesland: station?.bundesl ? getFullBundeslandName(station.bundesl) : null,
      city: station?.ort || device.city,
      ort: station?.ort || device.city,
      stationsname: device.device_id,
      continent: 'Europa' // Alle Europcar Geräte sind in Europa
    };
  });
  
  const geoOptions = extractGeoFilterOptions(enrichedDevices, (item) => item.bundesland);
  
  // Kaskadierte Filter-Optionen
  const availableCountries = getAvailableCountries(enrichedDevices, filters.kontinent, (item) => item.bundesland);
  const availableBundeslaender = getAvailableBundeslaender(enrichedDevices, filters.land, (item) => item.bundesland);
  const availableCities = getAvailableCities(enrichedDevices, filters.bundesland, (item) => item.bundesland);

  if (!hasAccess) {
    return (
      <div className={`p-8 rounded-2xl text-center ${
        theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
      }`}>
        <XCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          Zugriff verweigert. Diese Seite ist nur für Europcar-Kunden und Administratoren verfügbar.
        </p>
      </div>
    );
  }

  // Remove Europcar-only restriction - show devices for all customers
  // if (!isEuropcarSelected()) {
  //   return (
  //     <div className={`p-8 rounded-2xl text-center ${
  //       theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
  //     }`}>
  //       <Monitor className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
  //       <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
  //         Keine Geräte-Daten verfügbar.
  //       </p>
  //       <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
  //         Bitte wählen Sie Europcar im Kundenfilter aus.
  //       </p>
  //     </div>
  //   );
  // }

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
      {/* Title */}
      <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {getCustomerTitle()}
      </h2>

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

      {/* Results count and Selection Info */}
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        {selectedIds.size > 0 ? (
          <span className="font-medium text-primary">
            {selectedIds.size} von {filteredDevices.length} Geräten ausgewählt
          </span>
        ) : (
          `Zeige ${filteredDevices.length} von ${devices.length} Geräten`
        )}
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              {/* Checkbox + Settings header (like Locations) */}
              <th className={`px-3 py-3 w-20 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredDevices.length && filteredDevices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000] cursor-pointer"
                  />
                  {/* Settings gear icon */}
                  <div className="relative" data-column-settings>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColumnSettings(!showColumnSettings);
                      }}
                      className={`p-1 rounded transition-colors ${
                        showColumnSettings
                          ? 'bg-[#c00000] text-white'
                          : theme === 'dark' ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-200 text-gray-400'
                      }`}
                      title="Spalten konfigurieren"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Column Settings Dropdown */}
                    {showColumnSettings && (
                      <div 
                        className={`absolute left-0 top-full mt-1 w-72 rounded-xl border shadow-xl z-50 ${
                          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
                        }`}
                      >
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
                              onDragStart={(e) => handleDragStart(e, column.id)}
                              onDragOver={(e) => handleDragOver(e, column.id)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-move transition-colors ${
                                draggedColumn === column.id
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
              </th>
              {columns.filter(c => c.id !== 'select' && c.visible).map(col => (
                <th 
                  key={col.id}
                  onClick={() => col.sortable && handleSort(col.id)}
                  className={`${col.width || 'w-auto'} px-2 py-3 text-left text-xs font-semibold font-mono whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:bg-opacity-80' : ''
                  } ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {col.label} {col.sortable && getSortIcon(col.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
            {filteredDevices.map((device) => (
              <tr 
                key={device.device_id}
                onClick={(e) => {
                  // Don't navigate if clicking checkbox
                  if (e.target.type === 'checkbox') return;
                  handleDeviceClick(device);
                }}
                className={`border-t cursor-pointer transition-colors ${
                  selectedIds.has(device.device_id || device._id) 
                    ? theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'
                    : ''
                } ${theme === 'dark' 
                    ? 'border-gray-700 hover:bg-[#1a1a1a]' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* Checkbox cell */}
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(device.device_id || device._id)}
                    onChange={() => toggleSelectDevice(device.device_id || device._id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000] cursor-pointer"
                  />
                </td>
                {/* Dynamic columns */}
                {columns.filter(c => c.id !== 'select' && c.visible).map(col => {
                  const cellClass = `px-2 py-2 text-sm font-mono whitespace-nowrap ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`;
                  
                  switch(col.id) {
                    case 'device_id':
                      return (
                        <td key={col.id} className={`${cellClass} ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {device.device_id}
                        </td>
                      );
                    case 'status':
                      return (
                        <td key={col.id} className="px-2 py-2 text-center whitespace-nowrap">
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
                            {device.status === 'offline' && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                            {device.status !== 'online' && device.status !== 'offline' && (
                              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                            )}
                            {device.status === 'online' ? 'Online' : device.status === 'offline' ? 'Offline' : 'Vorbereitung'}
                          </span>
                        </td>
                      );
                    case 'teamviewer':
                      return (
                        <td key={col.id} className="px-2 py-2 text-center whitespace-nowrap">
                          {device.tvid ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`teamviewer10://control?device=${device.tvid}`, '_blank');
                              }}
                              disabled={device.status !== 'online'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                device.status === 'online'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                  : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                              }`}
                              title={device.status === 'online' ? `Verbinden mit ${device.tvid}` : 'Gerät ist offline'}
                            >
                              <Video className="h-3.5 w-3.5" />
                              {device.status === 'online' ? 'Verbinden' : 'Offline'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">Keine TVID</span>
                          )}
                        </td>
                      );
                    case 'customer':
                      return selectedCustomer === 'all' ? (
                        <td key={col.id} className={cellClass}>{device.customer || 'Europcar'}</td>
                      ) : null;
                    case 'locationcode':
                      return <td key={col.id} className={cellClass}>{device.locationcode}</td>;
                    case 'street':
                      return <td key={col.id} className={cellClass}>{device.street || '-'}</td>;
                    case 'zip':
                      return <td key={col.id} className={cellClass}>{device.zip || '-'}</td>;
                    case 'city':
                      return <td key={col.id} className={cellClass}>{device.city || '-'}</td>;
                    case 'country':
                      return <td key={col.id} className={cellClass}>{device.country || '-'}</td>;
                    case 'sn_pc':
                      return <td key={col.id} className={cellClass}>{device.sn_pc || '-'}</td>;
                    case 'sn_sc':
                      return <td key={col.id} className={cellClass}>{device.sn_sc || '-'}</td>;
                    case 'set_id':
                      return <td key={col.id} className={cellClass}>{device.set_id || '-'}</td>;
                    case 'tvid':
                      return <td key={col.id} className={cellClass}>{device.tvid || '-'}</td>;
                    case 'ip':
                      return <td key={col.id} className={cellClass}>{device.ip || '-'}</td>;
                    case 'sw_version':
                      return <td key={col.id} className={cellClass}>{device.sw_version || '-'}</td>;
                    default:
                      return <td key={col.id} className={cellClass}>-</td>;
                  }
                })}
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
    </div>
  );
};

export default DeviceManagement;
