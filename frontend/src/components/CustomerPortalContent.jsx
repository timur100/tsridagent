import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MapPin, Monitor, RefreshCw, ChevronUp, ChevronDown, Users, FileText, Plus, ShoppingBag, Clock, Wifi, WifiOff } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import StandortDetailsModal from './StandortDetailsModal';
import AddDeviceModal from './AddDeviceModal';
import AddStandortModal from './AddStandortModal';
import SearchInput from './SearchInput';
import ShopView from './ShopView';
import CustomerTickets from './CustomerTickets';
import LocationsTabEnhanced from './LocationsTabEnhanced';
import { getFullBundeslandName } from '../utils/bundesland';
import { 
  extractGeoFilterOptions, 
  filterByGeo, 
  getAvailableCountries, 
  getAvailableBundeslaender, 
  getAvailableCities,
  SPECIAL_PLACE_TAGS 
} from '../utils/geoFilters';
import { useWebSocket } from '../hooks/useWebSocket';

const CustomerPortalContent = ({ isImpersonation = false, activeTab, setActiveTab, scanStats = { total_scans: 0, correct_scans: 0, unknown_scans: 0, failed_scans: 0 } }) => {
  const { user, token, apiCall } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Use passed activeTab from parent, or manage locally if not provided
  const [localActiveTab, setLocalActiveTab] = useState('dashboard');
  const currentActiveTab = activeTab || localActiveTab;
  const currentSetActiveTab = setActiveTab || setLocalActiveTab;
  
  // Listen for hash changes to navigate to dashboard
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#dashboard') {
        currentSetActiveTab('dashboard');
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentSetActiveTab]);
  const [devices, setDevices] = useState([]);
  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [filteredStandorte, setFilteredStandorte] = useState([]);
  const [loading, setLoading] = useState(false);
  const toastShownRef = useRef(false); // Track if toast was already shown
  const [searchTerm, setSearchTerm] = useState('');
  const [standorteSearchTerm, setStandorteSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [standortStatusFilter, setStandortStatusFilter] = useState('all');
  const [showStandortModal, setShowStandortModal] = useState(false);
  const [selectedStandortForModal, setSelectedStandortForModal] = useState(null);
  const [filters, setFilters] = useState({
    kontinent: 'all',
    land: 'all',
    bundesland: 'all',
    city: 'all',
    specialPlace: 'all'
  });
  const [standortFilters, setStandortFilters] = useState({
    kontinent: 'all',
    land: 'all',
    bundesland: 'all',
    city: 'all',
    specialPlace: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'main_code',
    direction: 'asc'
  });
  const [portalSettings, setPortalSettings] = useState({
    allow_customer_add_device: false,
    allow_customer_add_location: false
  });
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showAddStandortModal, setShowAddStandortModal] = useState(false);
  const [deviceSortConfig, setDeviceSortConfig] = useState({ key: 'device_id', direction: 'asc' });
  const modalOpenRef = useRef(false); // Track if modal is currently open
  
  // Dashboard stats from API (same as Admin Portal)
  const [dashboardStats, setDashboardStats] = useState({
    total_locations: 0,
    online_devices: 0,
    offline_devices: 0,
    total_devices: 0,
    in_preparation: 0
  });

  // WebSocket integration
  const tenantId = user?.tenant_ids?.[0];
  
  // Stable WebSocket callback functions with useCallback to prevent re-registration
  const handleWSLocationUpdate = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket location update:', data);
    // Reload data to reflect the update
    if (!modalOpenRef.current) {
      loadDashboardStats();
      loadData();
      toast.info('Standort wurde aktualisiert', {
        duration: 2000,
        icon: '📍'
      });
    }
  }, []);

  const handleWSDeviceUpdate = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket device update:', data);
    // Reload data to reflect the update
    if (!modalOpenRef.current) {
      loadDashboardStats();
      loadData();
      toast.info('Gerät wurde aktualisiert', {
        duration: 2000,
        icon: '🔄'
      });
    }
  }, []);

  const handleWSDashboardStats = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket dashboard stats:', data);
    // Update dashboard stats directly from WebSocket
    setDashboardStats(prev => ({
      ...prev,
      ...data
    }));
  }, []);

  const handleWSRefreshAll = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket refresh all triggered:', data);
    // Reload all data
    if (!modalOpenRef.current) {
      loadDashboardStats();
      loadData();
      toast.info('Daten aktualisiert', { duration: 2000, icon: '🔄' });
    }
  }, []);

  const handleWSDeviceCreated = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket device created:', data);
    if (!modalOpenRef.current) {
      loadDashboardStats();
      loadData();
      toast.success('Neues Gerät wurde hinzugefügt', {
        duration: 3000,
        icon: '📱'
      });
    }
  }, []);

  const handleWSDeviceDeleted = useCallback((data) => {
    console.log('[CustomerPortal] WebSocket device deleted:', data);
    if (!modalOpenRef.current) {
      loadDashboardStats();
      loadData();
      toast.info('Gerät wurde entfernt', {
        duration: 3000,
        icon: '🗑️'
      });
    }
  }, []);
  
  // WebSocket connection with fallback to polling
  const { 
    connectionStatus, 
    isConnected, 
    lastUpdate 
  } = useWebSocket(tenantId, token, {
    autoConnect: true,
    enableFallback: true,
    pollingInterval: 30000,
    onLocationUpdate: handleWSLocationUpdate,
    onDeviceUpdate: handleWSDeviceUpdate,
    onDeviceCreated: handleWSDeviceCreated,
    onDeviceDeleted: handleWSDeviceDeleted,
    onDashboardStats: handleWSDashboardStats,
    onRefreshAll: handleWSRefreshAll
  });

  // Update ref when modals change
  useEffect(() => {
    modalOpenRef.current = showAddDeviceModal || showAddStandortModal || showStandortModal;
    if (modalOpenRef.current) {
      console.log('[CustomerPortal] Modal opened - polling paused');
    } else {
      console.log('[CustomerPortal] Modal closed - polling will resume');
    }
  }, [showAddDeviceModal, showAddStandortModal, showStandortModal]);

  useEffect(() => {
    console.log('[CustomerPortal] useEffect triggered - user:', user);
    setLoading(true);
    loadData();
    loadPortalSettings();
    loadDashboardStats();
    setLoading(false);
    
    // Fallback polling - only when WebSocket is not connected
    const interval = setInterval(() => {
      // Only poll if WebSocket is not connected and no modal is open
      if (!isConnected && !modalOpenRef.current) {
        console.log('[CustomerPortal] Fallback Polling - WebSocket disconnected, checking for updates...');
        loadData();
        loadDashboardStats();
      } else if (isConnected) {
        console.log('[CustomerPortal] Polling skipped - WebSocket connected');
      } else {
        console.log('[CustomerPortal] Polling skipped - modal is open');
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected]);


  const loadPortalSettings = async () => {
    try {
      const result = await apiCall('/api/portal/settings');
      console.log('[CustomerPortal] Portal settings API full response:', JSON.stringify(result, null, 2));
      
      if (result?.success && result?.data) {
        // Handle double nesting from apiCall wrapper + backend response
        const data = result.data.data || result.data;
        const settings = {
          allow_customer_add_device: data.allow_customer_add_device || false,
          allow_customer_add_location: data.allow_customer_add_location || false
        };
        console.log('[CustomerPortal] Setting portalSettings to:', settings);
        setPortalSettings(settings);
      }
    } catch (error) {
      console.error('Error loading portal settings:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // Get tenant ID from user
      const tenantId = user?.tenant_ids?.[0];
      if (!tenantId) {
        console.log('[CustomerPortal] No tenant ID available for dashboard stats');
        return;
      }

      const result = await apiCall(`/api/tenants/${tenantId}/dashboard-stats`);
      console.log('[CustomerPortal] Dashboard stats API response:', result);
      
      if (result && !result.error) {
        // Handle potential double nesting
        const stats = result.data || result;
        console.log('[CustomerPortal] Setting dashboardStats to:', stats);
        setDashboardStats({
          total_locations: stats.total_locations || 0,
          online_devices: stats.online_devices || 0,
          offline_devices: stats.offline_devices || 0,
          total_devices: stats.total_devices || (stats.online_devices || 0) + (stats.offline_devices || 0),
          in_preparation: stats.in_preparation || 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadData = async () => {
    try {
      // Save scroll positions before loading
      const deviceTableScroll = document.querySelector('#devices-table-container');
      const standorteTableScroll = document.querySelector('#standorte-table-container');
      const deviceScrollPos = deviceTableScroll ? deviceTableScroll.scrollTop : 0;
      const standorteScrollPos = standorteTableScroll ? standorteTableScroll.scrollTop : 0;
      
      // Check if customer has tenant_ids (is a tenant admin/user) OR is Europcar
      const hasTenantId = user?.tenant_ids && user.tenant_ids.length > 0;
      const isEuropcar = user?.company && user.company.toLowerCase().includes('europcar');
      
      if (hasTenantId || isEuropcar) {
        console.log('[CustomerPortal] Loading data - hasTenantId:', hasTenantId, 'isEuropcar:', isEuropcar);
        
        // Get tenant ID for API calls
        const tenantId = user?.tenant_ids?.[0];
        
        // Load data using same APIs as Admin Portal
        const [devicesRes, locationsRes] = await Promise.all([
          apiCall('/api/portal/europcar-devices'),
          tenantId ? apiCall(`/api/tenant-locations/${tenantId}`) : apiCall('/api/portal/customer-data/europcar-stations')
        ]);
        
        console.log('[CustomerPortal] Data loaded - Devices:', devicesRes, 'Locations:', locationsRes);
        
        // Process devices response
        if (devicesRes?.success && devicesRes?.data) {
          // Handle double-wrapped response from apiCall
          const responseData = devicesRes.data.data || devicesRes.data;
          const loadedDevices = responseData.devices || [];
          console.log('[CustomerPortal] Loaded devices count:', loadedDevices.length);
          
          // Check for length change OR status changes (TeamViewer, device status)
          const lengthChanged = devices.length !== loadedDevices.length;
          
          // Check if any TeamViewer status or device status changed
          const statusChanged = loadedDevices.some((newDevice, index) => {
            const oldDevice = devices.find(d => d.device_id === newDevice.device_id);
            if (!oldDevice) return true;
            return oldDevice.status !== newDevice.status || 
                   oldDevice.teamviewer_online !== newDevice.teamviewer_online;
          });
          
          if (lengthChanged || statusChanged) {
            console.log('[CustomerPortal] Device data changed (length or status), updating');
            setLoading(true);
            setDevices(loadedDevices);
            setLoading(false);
          } else {
            console.log('[CustomerPortal] Devices unchanged');
          }
        } else {
          console.error('[CustomerPortal] Devices API failed or no data:', devicesRes);
        }
        
        if (locationsRes?.success && locationsRes?.data) {
          // Handle both API formats: tenant-locations API returns {locations: [...]} and europcar-stations returns {stations: [...]}
          const loadedLocations = locationsRes.data.locations || locationsRes.data.stations || [];
          
          console.log('[CustomerPortal] Loaded locations count:', loadedLocations.length);
          
          // Check for length change OR online status changes OR preparation status changes
          const lengthChanged = locations.length !== loadedLocations.length;
          
          // Check if any location status changed (online, preparation_status, or general status)
          const statusChanged = loadedLocations.some((newLocation) => {
            const oldLocation = locations.find(l => (l.main_code || l.location_code) === (newLocation.main_code || newLocation.location_code));
            if (!oldLocation) return true;
            return oldLocation.online !== newLocation.online || 
                   oldLocation.online_device_count !== newLocation.online_device_count ||
                   oldLocation.preparation_status !== newLocation.preparation_status ||
                   oldLocation.status !== newLocation.status;
          });
          
          if (lengthChanged || statusChanged) {
            console.log('[CustomerPortal] Locations data changed (length or status), updating');
            setLoading(true);
            setLocations(loadedLocations);
            setStations(loadedLocations);
            setLoading(false);
          } else {
            console.log('[CustomerPortal] Locations unchanged');
          }
        }
        
        // Restore scroll positions
        requestAnimationFrame(() => {
          if (deviceTableScroll) deviceTableScroll.scrollTop = deviceScrollPos;
          if (standorteTableScroll) standorteTableScroll.scrollTop = standorteScrollPos;
        });
      } else {
        console.log('[CustomerPortal] Loading generic portal data for company:', user.company);
        
        // Load generic portal data for non-Europcar customers
        const [devicesRes, locationsRes] = await Promise.all([
          apiCall('/api/portal/devices/list'),
          apiCall('/api/portal/locations/list')
        ]);

        if (devicesRes?.success && devicesRes?.data) {
          setDevices(devicesRes.data.devices || []);
        }
        if (locationsRes?.success && locationsRes?.data) {
          setLocations(locationsRes.data.locations || []);
        }
      }
    } catch (error) {
      console.error('[CustomerPortal] Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters for devices
  useEffect(() => {
    // Enrich devices with geo data
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

    // Apply geo filters
    let filtered = filterByGeo(enrichedDevices, filters, (item) => item.bundesland);
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        if (statusFilter === 'online') return d.status === 'online' || d.teamviewer_online;
        if (statusFilter === 'offline') return d.status === 'offline' || !d.teamviewer_online;
        if (statusFilter === 'in_vorbereitung') return d.status === 'in_vorbereitung';
        return true;
      });
    }
    
    // Apply search filter - search across ALL fields
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d => {
        // Search in all string fields
        return Object.values(d).some(value => {
          if (value === null || value === undefined) return false;
          // Convert to string and search
          return String(value).toLowerCase().includes(search);
        });
      });
    }
    
    // Apply sorting for devices
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[deviceSortConfig.key] || '';
      const bValue = b[deviceSortConfig.key] || '';
      
      if (deviceSortConfig.direction === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      } else {
        return String(bValue).localeCompare(String(aValue));
      }
    });
    
    setFilteredDevices(sorted);
  }, [devices, stations, filters, statusFilter, searchTerm, deviceSortConfig]);

  // Handler for device column sorting
  const handleDeviceSort = (key) => {
    setDeviceSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Apply filters for standorte
  useEffect(() => {
    // Enrich standorte with geographic data and use backend-calculated online status
    const enrichedStandorte = stations.map(station => {
      return {
        ...station,
        bundesland: station.bundesl ? getFullBundeslandName(station.bundesl) : null,
        city: station.ort || station.city,
        ort: station.ort || station.city,
        continent: 'Europa',
        hasOnlineDevice: station.online === true, // Use backend-calculated online status
        deviceCount: station.device_count || 0,
        onlineDeviceCount: station.online_device_count || 0
      };
    });

    // Apply geo filters
    let filtered = filterByGeo(enrichedStandorte, standortFilters, (item) => item.bundesland);
    
    // Apply status filter
    if (standortStatusFilter !== 'all') {
      filtered = filtered.filter(s => {
        if (standortStatusFilter === 'online') return s.hasOnlineDevice;
        if (standortStatusFilter === 'offline') return !s.hasOnlineDevice;
        if (standortStatusFilter === 'in_vorbereitung') return s.preparation_status === 'in_vorbereitung';
        return true;
      });
    }
    
    // Apply search filter - search across ALL fields
    if (standorteSearchTerm) {
      const search = standorteSearchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        // Search in all string fields
        return Object.values(s).some(value => {
          if (value === null || value === undefined) return false;
          // Convert to string and search
          return String(value).toLowerCase().includes(search);
        });
      });
    }
    
    // Sort the filtered results
    filtered = sortStandorte(filtered, sortConfig.key, sortConfig.direction);
    
    setFilteredStandorte(filtered);
  }, [stations, devices, standortFilters, standortStatusFilter, standorteSearchTerm, sortConfig]);

  const sortStandorte = (standortList, key, direction) => {
    const sorted = [...standortList].sort((a, b) => {
      let aValue = a[key] || '';
      let bValue = b[key] || '';
      
      // Special handling for bundesland - use full name
      if (key === 'bundesl' || key === 'bundesland') {
        aValue = getFullBundeslandName(aValue);
        bValue = getFullBundeslandName(bValue);
      }
      
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
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Reset cascade filters
      if (filterName === 'kontinent') {
        newFilters.land = 'all';
        newFilters.bundesland = 'all';
        newFilters.city = 'all';
      } else if (filterName === 'land') {
        newFilters.bundesland = 'all';
        newFilters.city = 'all';
      } else if (filterName === 'bundesland') {
        newFilters.city = 'all';
      }
      
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      kontinent: 'all',
      land: 'all',
      bundesland: 'all',
      city: 'all',
      specialPlace: 'all'
    });
    setStatusFilter('all');
    setSearchTerm('');
  };

  const handleResetStandortFilters = () => {
    setStandortFilters({
      kontinent: 'all',
      land: 'all',
      bundesland: 'all',
      city: 'all',
      specialPlace: 'all'
    });
    setStandortStatusFilter('all');
    setStandorteSearchTerm('');
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  const handleStandortStatusFilterChange = (status) => {
    setStandortStatusFilter(status);
  };

  const handleStandortFilterChange = (filterName, value) => {
    setStandortFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Reset cascade filters
      if (filterName === 'kontinent') {
        newFilters.land = 'all';
        newFilters.bundesland = 'all';
        newFilters.city = 'all';
      } else if (filterName === 'land') {
        newFilters.bundesland = 'all';
        newFilters.city = 'all';
      } else if (filterName === 'bundesland') {
        newFilters.city = 'all';
      }
      
      return newFilters;
    });
  };

  const handleDeviceClick = (device) => {
    // Navigate to device detail page (same as Admin Portal)
    navigate(`/portal/customer/devices/${device.device_id}`, {
      state: { fromTab: 'devices' }
    });
  };

  const handleDeviceUpdate = () => {
    // Reload devices after update
    loadData();
  };

  const handleStandortClick = (standort) => {
    // Navigate to new CustomerLocationDetailPage
    if (standort.location_id) {
      navigate(`/portal/customer/locations/${standort.location_id}`);
    } else {
      toast.error('Standort-ID nicht verfügbar');
    }
  };

  const handleStandortUpdate = () => {
    // Reload standorte after update
    loadData();
  };

  // Build geo options for devices
  const enrichedDevices = devices.map(device => {
    const station = stations.find(s => s.main_code === device.locationcode);
    return {
      ...device,
      bundesland: station?.bundesl ? getFullBundeslandName(station.bundesl) : null,
      city: station?.ort || device.city,
      ort: station?.ort || device.city,
      stationsname: device.device_id,
      continent: 'Europa'
    };
  });
  
  const geoOptions = extractGeoFilterOptions(enrichedDevices, (item) => item.bundesland);
  
  // Cascade filter options for devices
  const availableCountries = getAvailableCountries(enrichedDevices, filters.kontinent, (item) => item.bundesland);
  const availableBundeslaender = getAvailableBundeslaender(enrichedDevices, filters.land, (item) => item.bundesland);
  const availableCities = getAvailableCities(enrichedDevices, filters.bundesland, (item) => item.bundesland);

  // Build geo options for standorte
  const enrichedStandorte = stations.map(station => {
    return {
      ...station,
      bundesland: station.bundesl ? getFullBundeslandName(station.bundesl) : null,
      city: station.ort || station.city,
      ort: station.ort || station.city,
      continent: 'Europa',
      hasOnlineDevice: station.online === true, // Use backend-calculated online status
      deviceCount: station.device_count || 0,
      onlineDeviceCount: station.online_device_count || 0
    };
  });
  
  const standortGeoOptions = extractGeoFilterOptions(enrichedStandorte, (item) => item.bundesland);
  
  // Cascade filter options for standorte
  const standortAvailableCountries = getAvailableCountries(enrichedStandorte, standortFilters.kontinent, (item) => item.bundesland);
  const standortAvailableBundeslaender = getAvailableBundeslaender(enrichedStandorte, standortFilters.land, (item) => item.bundesland);
  const standortAvailableCities = getAvailableCities(enrichedStandorte, standortFilters.bundesland, (item) => item.bundesland);

  // Calculate device statistics from ALL devices (not filtered)
  const onlineDevices = devices.filter(d => d.status === 'online' || d.teamviewer_online).length;
  const offlineDevices = devices.filter(d => d.status === 'offline' && !d.teamviewer_online).length;
  const inPreparationDevices = devices.filter(d => d.status === 'in_vorbereitung').length;

  // Calculate standorte statistics from ALL stations (not filtered)
  // Use the online status calculated by backend (based on devices with TeamViewer sync)
  const onlineStandorte = stations.filter(s => s.online === true).length;
  const offlineStandorte = stations.filter(s => s.online !== true).length;
  const inPreparationStandorte = stations.filter(s => s.preparation_status === 'in_vorbereitung').length;

  return (
    <div>
      {/* Content */}
      <div className="space-y-6">
      {currentActiveTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Übersicht
              </h2>
              {/* WebSocket Connection Status Indicator */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      Echtzeit
                    </span>
                  </>
                ) : connectionStatus === 'reconnecting' ? (
                  <>
                    <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Verbinde...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Offline
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                console.log('Customer Portal: Manual refresh triggered');
                loadData();
                loadDashboardStats();
              }}
              className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Geräte Gesamt */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Geräte Gesamt
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {devices.length}
                  </p>
                </div>
                <div className="p-3 bg-[#c00000] rounded-xl">
                  <Monitor className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>

            {/* Standorte */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Standorte
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {locations.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>

            {/* Mitarbeiter */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mitarbeiter
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    0
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>

            {/* Lizenzen */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Lizenzen
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    0
                  </p>
                </div>
                <div className="p-3 bg-orange-500 rounded-xl">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Second Row - Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Online */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Online
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-green-500`}>
                    {onlineDevices}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-xl">
                  <div className="h-8 w-8 bg-white rounded-full"></div>
                </div>
              </div>
            </Card>

            {/* Offline */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Offline
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-red-500`}>
                    {offlineDevices}
                  </p>
                </div>
                <div className="p-3 bg-red-500 rounded-xl">
                  <div className="h-8 w-8 bg-white rounded-full"></div>
                </div>
              </div>
            </Card>

            {/* In Vorbereitung */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    In Vorbereitung
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-yellow-500`}>
                    {inPreparationDevices}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500 rounded-xl">
                  <div className="h-8 w-8 bg-white rounded-full"></div>
                </div>
              </div>
            </Card>
          </div>


          {/* Third Row - Scan Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Scans */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Scans Insgesamt
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-blue-600`}>
                    {scanStats.total_scans.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Letzte 30 Tage
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </Card>

            {/* Correct Scans */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Korrekte Scans
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-green-600`}>
                    {scanStats.correct_scans.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {scanStats.total_scans > 0 ? Math.round((scanStats.correct_scans / scanStats.total_scans) * 100) : 0}% Erfolgsrate
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            {/* Unknown Scans */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Unbekannte Scans
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-yellow-600`}>
                    {scanStats.unknown_scans.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Überprüfung nötig
                  </p>
                </div>
                <div className="p-3 bg-yellow-500 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            {/* Failed Scans */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Fehlgeschlagene Scans
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-red-600`}>
                    {scanStats.failed_scans.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Fehleranalyse nötig
                  </p>
                </div>
                <div className="p-3 bg-red-500 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>


          {/* Letzte Geräte */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Letzte Geräte
            </h3>
            <Card className={`rounded-xl overflow-hidden ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:-translate-y-1'
            }`}>
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Gerät
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Standort
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Zuletzt gesehen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center">
                        <Monitor className={`h-12 w-12 mx-auto mb-2 ${
                          theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                        }`} />
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                          Keine Geräte vorhanden
                        </p>
                      </td>
                    </tr>
                  ) : (
                    devices.slice(0, 5).map((device, index) => (
                      <tr key={index} className={theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'}>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {device.device_id || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {device.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Online/Offline Status Badge - Pill Shape */}
                          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                            device.status === 'online'
                              ? 'bg-[#1e5631] text-[#4ade80]'
                              : 'bg-red-900/40 text-red-400'
                          }`}>
                            {device.status === 'online' && (
                              <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]"></span>
                              </span>
                            )}
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {device.last_seen || 'Nie'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {currentActiveTab === 'devices' && (
        <div className="space-y-6">
          {/* Title with Search and Add Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Geräte ({devices.length})
            </h2>
            <div className="flex flex-1 gap-4 md:ml-8">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Geräte durchsuchen..."
                className="flex-1"
              />
              {portalSettings.allow_customer_add_device && (
                <button
                  onClick={() => setShowAddDeviceModal(true)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    theme === 'dark'
                      ? 'bg-[#c00000] text-white hover:bg-[#a00000]'
                      : 'bg-[#c00000] text-white hover:bg-[#a00000]'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Gerät hinzufügen
                </button>
              )}
            </div>
          </div>
          
          {/* Status Cards - Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Gesamt */}
            <Card 
              onClick={() => handleStatusFilterChange('all')}
              className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                statusFilter === 'all'
                  ? theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  : theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Gesamt
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {devices.length}
                  </p>
                </div>
                <div className="p-3 bg-[#c00000] rounded-xl">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            {/* Online - with pulsing LED */}
            <Card 
              onClick={() => handleStatusFilterChange('online')}
              className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                statusFilter === 'online'
                  ? theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-green-50 border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  : theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
                    Online
                  </p>
                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {onlineDevices}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
                  <div className="relative flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-6 w-6 bg-green-600"></span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Offline */}
            <Card 
              onClick={() => handleStatusFilterChange('offline')}
              className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                statusFilter === 'offline'
                  ? theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-red-50 border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  : theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                    Offline
                  </p>
                  <p className="text-3xl font-bold mt-2 text-red-600">
                    {offlineDevices}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
                  <div className="h-6 w-6 bg-red-600 rounded-full"></div>
                </div>
              </div>
            </Card>

            {/* In Vorbereitung */}
            <Card 
              onClick={() => handleStatusFilterChange('in_vorbereitung')}
              className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                statusFilter === 'in_vorbereitung'
                  ? theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-yellow-50 border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  : theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                    In Vorbereitung
                  </p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600">
                    {inPreparationDevices}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
                  <div className="h-6 w-6 bg-yellow-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-end gap-4">
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
              onClick={handleResetFilters}
              className={`px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              Filter löschen
            </button>
          </div>

          {/* Results count */}
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Zeige {filteredDevices.length} von {devices.length} Geräten
          </div>

          {/* Devices Table */}
          <div id="devices-table-container" className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th 
                    onClick={() => handleDeviceSort('device_id')}
                    className={`w-28 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Device-ID
                      {deviceSortConfig.key === 'device_id' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('locationcode')}
                    className={`w-20 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      {deviceSortConfig.key === 'locationcode' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('street')}
                    className={`w-48 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Straße
                      {deviceSortConfig.key === 'street' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('postal_code')}
                    className={`w-16 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      PLZ
                      {deviceSortConfig.key === 'postal_code' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('city')}
                    className={`w-32 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Stadt
                      {deviceSortConfig.key === 'city' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('country')}
                    className={`w-20 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Land
                      {deviceSortConfig.key === 'country' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('sn_pc')}
                    className={`w-24 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      SN-PC
                      {deviceSortConfig.key === 'sn_pc' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('sn_sc')}
                    className={`w-24 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      SN-SC
                      {deviceSortConfig.key === 'sn_sc' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('tvid')}
                    className={`w-20 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      TVID
                      {deviceSortConfig.key === 'tvid' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('ip_address')}
                    className={`w-24 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      IP
                      {deviceSortConfig.key === 'ip_address' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('sw_version')}
                    className={`w-20 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      SW Vers.
                      {deviceSortConfig.key === 'sw_version' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('status')}
                    className={`w-20 px-2 py-3 text-center text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status
                      {deviceSortConfig.key === 'status' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDeviceSort('hardware_model')}
                    className={`w-28 px-2 py-3 text-left text-xs font-mono font-semibold cursor-pointer hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <div className="flex items-center gap-1">
                      Hardware
                      {deviceSortConfig.key === 'hardware_model' && (
                        <span>{deviceSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                {loading ? (
                  <tr>
                    <td colSpan="13" className="px-4 py-8 text-center">
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        Lädt Geräte...
                      </p>
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-4 py-8 text-center">
                      <Monitor className={`h-12 w-12 mx-auto mb-2 ${
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        Keine Geräte vorhanden
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device, index) => (
                    <tr 
                      key={index}
                      onClick={() => handleDeviceClick(device)}
                      className={`border-t cursor-pointer transition-colors ${
                        theme === 'dark' 
                          ? 'border-gray-700 hover:bg-gray-800/50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {device.device_id || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.locationcode || device.standort || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.street || device.strasse || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.zip || device.plz || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.city || device.stadt || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.country || device.land || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.sn_pc || device.serial_pc || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.sn_sc || device.serial_scanner || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.tvid || device.teamviewer_id || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.ip || device.ip_address || '-'}
                      </td>
                      <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.sw_version || device.software_version || '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                          device.status === 'online' || device.teamviewer_online
                            ? 'bg-green-500/20 text-green-400'
                            : device.status === 'in_vorbereitung'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {(device.status === 'online' || device.teamviewer_online) && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                          {(device.status === 'offline' || (!device.status && !device.teamviewer_online)) && (
                            <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          )}
                          {device.status === 'in_vorbereitung' && (
                            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                          )}
                          {device.status === 'online' || device.teamviewer_online ? 'Online' : device.status === 'in_vorbereitung' ? 'Vorbereitung' : 'Offline'}
                        </span>
                      </td>
                      <td className={`px-2 py-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {device.hardware_model || device.hardware_type || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentActiveTab === 'locations' && (
        <div className="space-y-6">
          {/* Statistics Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Locations */}
            <Card 
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none hover:bg-[#333]' : 'bg-white border border-gray-100 hover:shadow-lg'
              }`}
              onClick={() => {
                // Reset all filters to show all locations
                setStandortStatusFilter('all');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Locations
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.total_locations || stations.length}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#c00000' }}>
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            {/* Total Devices */}
            <Card 
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none hover:bg-[#333]' : 'bg-white border border-gray-100 hover:shadow-lg'
              }`}
              onClick={() => {
                // Reset filter to show all devices
                setStandortStatusFilter('all');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Devices
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.total_devices || dashboardStats.online_devices + dashboardStats.offline_devices || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#c00000' }}>
                  <Monitor className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            {/* Online Devices */}
            <Card 
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none hover:bg-[#333]' : 'bg-white border border-gray-100 hover:shadow-lg'
              }`}
              onClick={() => {
                // Filter to show only locations with online devices
                setStandortStatusFilter('online');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Online Devices
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-green-500`}>
                    {dashboardStats.online_devices || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            {/* Offline Devices */}
            <Card 
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none hover:bg-[#333]' : 'bg-white border border-gray-100 hover:shadow-lg'
              }`}
              onClick={() => {
                // Filter to show only locations with offline devices
                setStandortStatusFilter('offline');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Offline Devices
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-red-500`}>
                    {dashboardStats.offline_devices || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-500">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>

          <LocationsTabEnhanced
            theme={theme}
            locations={stations.map(station => ({
              ...station,
              location_id: station.location_id || station.main_code,
              location_code: station.main_code || station.location_code,
              station_name: station.station_name || station.stationsname,
              online_device_count: station.online_device_count || 0,
              device_count: station.device_count || 0
            })).filter(location => {
              // Apply status filter based on clicked tile
              if (standortStatusFilter === 'online') {
                return location.online_device_count > 0;
              } else if (standortStatusFilter === 'offline') {
                // Show locations with at least one offline device
                const offlineCount = (location.device_count || 0) - (location.online_device_count || 0);
                return offlineCount > 0;
              }
              return true; // 'all' - show everything
            })}
            loadingLocations={loading}
            onAddLocation={() => setShowAddStandortModal(true)}
            onEditLocation={() => {}}
            onDeleteLocation={() => {}}
            tenantId={user?.tenant_ids?.[0]}
            isCustomerPortal={true}
          />
        </div>
      )}

      
      {/* Shop Tab */}
      {currentActiveTab === 'shop' && user?.shop_enabled && (
        <ShopView />
      )}

      {currentActiveTab === 'tickets' && (
        <CustomerTickets />
      )}

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <AddDeviceModal
          onClose={() => setShowAddDeviceModal(false)}
          onAdd={(newDevice) => {
            setShowAddDeviceModal(false);
            setDevices(prev => [...prev, newDevice]);
            loadData();
            toast.success('Gerät erfolgreich hinzugefügt');
          }}
        />
      )}

      {/* Add Standort Modal */}
      {showAddStandortModal && (
        <AddStandortModal
          onClose={() => setShowAddStandortModal(false)}
          onAdd={(newStandort) => {
            setShowAddStandortModal(false); // Modal schließen!
            setStations(prev => [...prev, newStandort]);
            setLocations(prev => [...prev, newStandort]);
            loadData(); // Reload to get fresh data
            toast.success('Standort erfolgreich hinzugefügt');
          }}
        />
      )}
      </div>
    </div>
  );
};

export default CustomerPortalContent;
