import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomerFilter } from '../contexts/CustomerFilterContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Database, CheckCircle, Clock, XCircle, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import StandortDetailsModal from './StandortDetailsModal';
import toast from 'react-hot-toast';
import { getFullBundeslandName } from '../utils/bundesland';
import { 
  extractGeoFilterOptions, 
  filterByGeo, 
  getAvailableCountries, 
  getAvailableBundeslaender, 
  getAvailableCities,
  SPECIAL_PLACE_TAGS,
  fetchCategories
} from '../utils/geoFilters';

const StandorteManagement = ({ searchTerm: externalSearchTerm, onSearchChange, addModalOpen = false, isSavingStandort = false }) => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const { selectedCustomer, customers } = useCustomerFilter();
  const [standorte, setStandorte] = useState([]);
  const [devices, setDevices] = useState([]); // Add devices state
  const [filteredStandorte, setFilteredStandorte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [selectedStandort, setSelectedStandort] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const toastShownRef = useRef(false); // Track if toast was already shown
  const prevCustomerRef = useRef(selectedCustomer); // Track previous customer selection
  const modalOpenRef = useRef(false); // Track if modal is currently open
  const [filters, setFilters] = useState({
    status: 'all',
    bundesland: 'all',
    online: 'all',
    kontinent: 'all',
    land: 'all',
    stadt: 'all',
    specialPlace: 'all',
    preparation: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'main_code',
    direction: 'asc'
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use external searchTerm if provided, otherwise use internal
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchChange || setInternalSearchTerm;
  const [summary, setSummary] = useState({
    total: 0,
    ready: 0,
    online: 0,
    offline: 0,
    in_vorbereitung: 0
  });

  // Check if user has access (Admin or Europcar customer)
  const hasAccess = user?.role === 'admin' || (user?.company && user.company.toLowerCase().includes('europcar'));
  
  // Check if Europcar is selected (for admin filtering)
  const isEuropcarSelected = () => {
    if (selectedCustomer === 'all') {
      return true; // Show all data including Europcar
    }
    
    // Find the selected customer in the customers list
    const customer = customers.find(c => c.email === selectedCustomer);
    if (customer && customer.company && customer.company.toLowerCase().includes('europcar')) {
      return true;
    }
    
    return false;
  };

  // Get customer name for title
  const getCustomerTitle = () => {
    if (selectedCustomer === 'all') {
      return 'Standorte'; // Alle Kunden
    }
    
    const customer = customers.find(c => c.email === selectedCustomer);
    if (customer) {
      return `${customer.company} Standorte`;
    }
    
    return 'Standorte';
  };

  // Initial data load effect (without showModal dependency)
  useEffect(() => {
    if (hasAccess) {
      // Load categories on mount (pre-cache for filtering)
      if (isInitialLoad) {
        fetchCategories().catch(err => console.error('Failed to load categories:', err));
      }
      
      // Only clear data on initial load or customer change
      // Don't clear during polling to prevent flickering
      if (isInitialLoad || selectedCustomer !== prevCustomerRef.current) {
        setStandorte([]);
        setDevices([]);
        setFilteredStandorte([]);
        setSummary({ total: 0, ready: 0, online: 0, offline: 0, in_vorbereitung: 0 });
        prevCustomerRef.current = selectedCustomer;
      }
      
      // Load new data
      setLoading(true);
      fetchStandorte(false); // Don't show toast on customer change
      fetchDevices();
      setLoading(false);
      setIsInitialLoad(false);
    } else {
      // Clear data if no access
      setStandorte([]);
      setDevices([]);
      setFilteredStandorte([]);
      setSummary({ total: 0, ready: 0, online: 0, offline: 0, in_vorbereitung: 0 });
      setLoading(false);
      setIsInitialLoad(true); // Reset for next load
    }
  }, [hasAccess, selectedCustomer, customers]); // NO showModal here!

  // Update ref when showModal OR addModalOpen OR isSavingStandort changes
  useEffect(() => {
    modalOpenRef.current = showModal || addModalOpen || isSavingStandort;
    if (showModal || addModalOpen) {
      console.log('Admin Portal: Modal opened - polling paused');
    } else if (isSavingStandort) {
      console.log('Admin Portal: Saving standort - polling paused');
    } else {
      console.log('Admin Portal: Modal closed and saved - polling will resume');
    }
  }, [showModal, addModalOpen, isSavingStandort]);

  // Separate polling effect that respects modal state via ref
  useEffect(() => {
    if (!hasAccess) return;
    
    // Setup auto-refresh polling for real-time status updates (every 10 seconds)
    const pollInterval = setInterval(() => {
      // Only refresh if window is visible and modal is NOT open (check via ref!)
      if (document.visibilityState === 'visible' && !modalOpenRef.current) {
        console.log('Admin Portal: Polling - checking for status updates...');
        fetchStandorte(false); // Silent polling for standorte
        fetchDevices(); // Updates TeamViewer status for devices
      } else if (modalOpenRef.current) {
        console.log('Admin Portal: Polling skipped - modal is open');
      }
    }, 10000); // 10 seconds
    
    console.log('Admin Portal: Polling interval created');
    
    // Cleanup interval on component unmount
    return () => {
      clearInterval(pollInterval);
      console.log('Admin Portal: Polling interval cleared');
    };
  }, [hasAccess]); // Only depends on hasAccess, NOT showModal!

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, standorte, devices, sortConfig]); // Add devices dependency

  const fetchDevices = async () => {
    try {
      // Build API URL with customer filter
      let apiUrl = '/api/portal/europcar-devices';
      if (selectedCustomer && selectedCustomer !== 'all') {
        apiUrl += `?customer_email=${encodeURIComponent(selectedCustomer)}`;
      }
      
      const result = await apiCall(apiUrl);
      
      if (result.success && result.data) {
        // apiCall returns { success, data, status } where data is the backend response
        // Backend response contains { success, data: { devices: [...] } }
        const responseData = result.data.data || result.data;
        setDevices(responseData.devices || []);
        console.log('Loaded devices:', responseData.devices?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchStandorte = async (showToast = false) => {
    try {
      // Save scroll position before fetching
      const scrollContainer = document.querySelector('.overflow-x-auto');
      const scrollPosition = scrollContainer ? scrollContainer.scrollTop : 0;
      
      // Build API URL with customer filter
      let apiUrl = '/api/portal/customer-data/europcar-stations';
      if (selectedCustomer && selectedCustomer !== 'all') {
        apiUrl += `?customer_email=${encodeURIComponent(selectedCustomer)}`;
      }
      
      const result = await apiCall(apiUrl);
      
      if (result.success && result.data) {
        // apiCall returns { success, data, status } where data is the backend response
        // Backend response is { success, summary, stations }
        const newStandorte = result.data.stations || [];
        const newSummary = result.data.summary || { total: 0, ready: 0, online: 0, offline: 0, in_vorbereitung: 0 };
        
        // Batch state updates to prevent flickering
        console.log('Updating Standorte data:', { 
          customer: selectedCustomer,
          count: newStandorte.length,
          summary: newSummary
        });
        
        // Use React's automatic batching by updating states together
        setStandorte(newStandorte);
        setSummary(newSummary);
        
        // Restore scroll position after update
        if (scrollContainer) {
          requestAnimationFrame(() => {
            scrollContainer.scrollTop = scrollPosition;
          });
        }
        
        // Only show toast on initial load or when explicitly requested
        if (showToast && !toastShownRef.current) {
          toast.success(`${result.data.summary.total} Standorte geladen`);
          toastShownRef.current = true;
          setTimeout(() => {
            toastShownRef.current = false;
          }, 1000);
        }
      } else {
        if (showToast && !toastShownRef.current) {
          toast.error('Fehler beim Laden der Standorte');
          toastShownRef.current = true;
          setTimeout(() => {
            toastShownRef.current = false;
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching Standorte:', error);
      if (showToast && !toastShownRef.current) {
        toast.error('Fehler beim Laden der Standorte');
        toastShownRef.current = true;
        setTimeout(() => {
          toastShownRef.current = false;
        }, 1000);
      }
    }
  };

  // Helper function to check if a station has any online device
  const isStationOnline = (stationCode) => {
    return devices.some(device => 
      device.locationcode === stationCode && 
      device.status === 'online'
    );
  };

  // Get online device count for a station
  const getOnlineDeviceCount = (stationCode) => {
    return devices.filter(device => 
      device.locationcode === stationCode && 
      device.status === 'online'
    ).length;
  };

  // Get total device count for a station
  const getTotalDeviceCount = (stationCode) => {
    return devices.filter(device => 
      device.locationcode === stationCode
    ).length;
  };

  const applyFilters = () => {
    let filtered = [...standorte];

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(station => {
        return (
          station.status?.toLowerCase().includes(searchLower) ||
          station.main_code?.toLowerCase().includes(searchLower) ||
          station.plz?.toLowerCase().includes(searchLower) ||
          station.ort?.toLowerCase().includes(searchLower) ||
          station.str?.toLowerCase().includes(searchLower) ||
          station.telefon?.toLowerCase().includes(searchLower) ||
          station.email?.toLowerCase().includes(searchLower) ||
          station.main_typ?.toLowerCase().includes(searchLower) ||
          station.stationsname?.toLowerCase().includes(searchLower) ||
          station.mgr?.toLowerCase().includes(searchLower) ||
          station.bundesl?.toLowerCase().includes(searchLower) ||
          station.switch?.toLowerCase().includes(searchLower) ||
          station.port?.toLowerCase().includes(searchLower) ||
          station.it_kommentar?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(station => 
        station.status?.toUpperCase().includes(filters.status.toUpperCase())
      );
    }

    // Apply bundesland filter
    if (filters.bundesland !== 'all') {
      filtered = filtered.filter(station => getFullBundeslandName(station.bundesl) === filters.bundesland);
    }

    // Apply online filter (based on device status)
    if (filters.online !== 'all') {
      const isOnline = filters.online === 'online';
      filtered = filtered.filter(station => isStationOnline(station.main_code) === isOnline);
    }

    // Apply preparation status filter
    if (filters.preparation !== 'all') {
      filtered = filtered.filter(station => station.preparation_status === filters.preparation);
    }

    // Apply stadt filter  
    if (filters.stadt !== 'all') {
      filtered = filtered.filter(s => s.ort === filters.stadt);
    }

    // Apply geographic filters
    filtered = filterByGeo(filtered, filters, (station) => getFullBundeslandName(station.bundesl));

    // Sort the filtered results
    filtered = sortStandorte(filtered, sortConfig.key, sortConfig.direction);

    setFilteredStandorte(filtered);
    
    // Update summary with online/offline counts
    const onlineStations = standorte.filter(station => isStationOnline(station.main_code)).length;
    const offlineStations = standorte.length - onlineStations;
    
    setSummary(prev => ({
      ...prev,
      online: onlineStations,
      offline: offlineStations
    }));
  };

  const sortStandorte = (standortList, key, direction) => {
    const sorted = [...standortList].sort((a, b) => {
      let aValue = a[key] || '';
      let bValue = b[key] || '';
      
      // Special handling for bundesland - use full name
      if (key === 'bundesl') {
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

  const handleFilterChange = (filterType, value) => {
    // When clicking on summary tiles, reset the other summary filters
    if (filterType === 'online' || filterType === 'preparation') {
      setFilters(prev => ({
        ...prev,
        online: filterType === 'online' ? value : 'all',
        preparation: filterType === 'preparation' ? value : 'all'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      bundesland: 'all',
      online: 'all',
      kontinent: 'all',
      land: 'all',
      stadt: 'all',
      specialPlace: 'all',
      preparation: 'all'
    });
  };

  const handleRowClick = (station) => {
    setSelectedStandort(station);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStandort(null);
  };

  const handleUpdateStandort = (updatedData) => {
    // Update the standort in the list
    setStandorte(prev => prev.map(s => 
      s.main_code === selectedStandort.main_code ? { ...s, ...updatedData } : s
    ));
    toast.success('Standort aktualisiert');
  };

  // Get unique values for filters
  const uniqueBundeslaender = [...new Set(standorte.map(s => s.bundesl).filter(Boolean))].sort();
  const uniqueStaedte = [...new Set(standorte.map(s => s.ort).filter(Boolean))].sort();
  
  // Enrich standorte with continent info
  const enrichedStandorte = standorte.map(station => ({
    ...station,
    city: station.ort || station.city,
    ort: station.ort || station.city,
    continent: 'Europa' // Alle Europcar Standorte sind in Europa
  }));
  
  const geoOptions = extractGeoFilterOptions(enrichedStandorte, (station) => getFullBundeslandName(station.bundesl));
  
  // Kaskadierte Filter-Optionen
  const availableCountries = getAvailableCountries(enrichedStandorte, filters.kontinent, (station) => getFullBundeslandName(station.bundesl));
  const availableBundeslaender = getAvailableBundeslaender(enrichedStandorte, filters.land, (station) => getFullBundeslandName(station.bundesl));
  const availableCities = getAvailableCities(enrichedStandorte, filters.bundesland, (station) => getFullBundeslandName(station.bundesl));

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

  // Show message if non-Europcar customer is selected
  if (!isEuropcarSelected()) {
    return (
      <div className={`p-8 rounded-2xl text-center ${
        theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
      }`}>
        <Database className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          Keine Standort-Daten verfügbar.
        </p>
        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
          Bitte wählen Sie einen Kunden im Kundenfilter aus.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header Section */}
      <div className={`sticky top-0 z-30 pb-4 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        {/* Title */}
        <div className="mb-6">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {getCustomerTitle()}
          </h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Gesamt Card */}
        <Card 
          onClick={() => handleFilterChange('online', 'all')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.online === 'all'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border-2 border-[#c00000] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standorte Gesamt</p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{summary.total}</p>
            </div>
            <Database className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
          </div>
        </Card>

        {/* Online Card */}
        <Card 
          onClick={() => handleFilterChange('online', 'online')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.online === 'online'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-green-50 border-2 border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Standorte Online</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary.online}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
              <span className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500"></span>
              </span>
            </div>
          </div>
        </Card>

        {/* Offline Card */}
        <Card 
          onClick={() => handleFilterChange('online', 'offline')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.online === 'offline'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-red-50 border-2 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Standorte Offline</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.offline}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
              <div className="h-6 w-6 bg-red-600 rounded-full"></div>
            </div>
          </div>
        </Card>

        {/* In Vorbereitung Card */}
        <Card 
          onClick={() => handleFilterChange('preparation', 'in_vorbereitung')}
          className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
            filters.preparation === 'in_vorbereitung'
              ? theme === 'dark' 
                ? 'bg-[#2a2a2a] border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-yellow-50 border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              : theme === 'dark' 
                ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>Standorte in Vorbereitung</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{summary.in_vorbereitung}</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className={`p-6 rounded-2xl ${
        theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
      }`}>
        <div className="space-y-4">
          {/* Row 1: Geografische Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
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

            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
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

            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
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
                  <option key={bl} value={getFullBundeslandName(bl)}>{getFullBundeslandName(bl)}</option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
              }`}>
                Stadt
              </label>
              <select
                value={filters.stadt}
                onChange={(e) => handleFilterChange('stadt', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-red-500`}
              >
                <option value="all">Alle Städte</option>
                {availableCities.map(stadt => (
                  <option key={stadt} value={stadt}>{stadt}</option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
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

          {/* Row 2: Status Filter & Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
              }`}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-red-500`}
              >
                <option value="all">Alle Status</option>
                <option value="ready">Ready</option>
                <option value="closing">Closing</option>
              </select>
            </div>

            <div className="w-full">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
              }`}>
                Online Status
              </label>
              <select
                value={filters.online}
                onChange={(e) => handleFilterChange('online', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-red-500`}
              >
                <option value="all">Alle</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="w-full flex items-end">
              <button
                onClick={resetFilters}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Zeige {filteredStandorte.length} von {standorte.length} Standorten
          </div>
        </div>
      </Card>
      </div>
      {/* End of Sticky Header */}

      {/* Standorte Table */}
      <Card className={`rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
      }`}>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
              <tr>
                <th 
                  onClick={() => handleSort('status')}
                  className={`w-24 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Status {getSortIcon('status')}
                </th>
                <th 
                  onClick={() => handleSort('main_code')}
                  className={`w-20 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Code {getSortIcon('main_code')}
                </th>
                <th 
                  onClick={() => handleSort('stationsname')}
                  className={`w-40 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Stationsname {getSortIcon('stationsname')}
                </th>
                <th 
                  onClick={() => handleSort('str')}
                  className={`w-48 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Straße {getSortIcon('str')}
                </th>
                <th 
                  onClick={() => handleSort('plz')}
                  className={`w-16 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  PLZ {getSortIcon('plz')}
                </th>
                <th 
                  onClick={() => handleSort('ort')}
                  className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Stadt {getSortIcon('ort')}
                </th>
                <th 
                  onClick={() => handleSort('bundesl')}
                  className={`w-40 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Bundesland {getSortIcon('bundesl')}
                </th>
                <th 
                  onClick={() => handleSort('land')}
                  className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Land {getSortIcon('land')}
                </th>
                <th 
                  onClick={() => handleSort('kontinent')}
                  className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Kontinent {getSortIcon('kontinent')}
                </th>
                <th 
                  onClick={() => handleSort('telefon')}
                  className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Telefon {getSortIcon('telefon')}
                </th>
                <th 
                  onClick={() => handleSort('email')}
                  className={`w-40 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  E-Mail {getSortIcon('email')}
                </th>
                <th 
                  onClick={() => handleSort('mgr')}
                  className={`w-32 px-2 py-3 text-left text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Manager {getSortIcon('mgr')}
                </th>
                <th 
                  onClick={() => handleSort('id_checker')}
                  className={`w-20 px-2 py-3 text-center text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Anzahl ID {getSortIcon('id_checker')}
                </th>
                <th 
                  onClick={() => handleSort('online')}
                  className={`w-16 px-2 py-3 text-center text-xs font-semibold font-mono cursor-pointer hover:bg-opacity-80 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Online {getSortIcon('online')}
                </th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
              {filteredStandorte.map((station, index) => (
                <tr
                  key={index}
                  onClick={() => handleRowClick(station)}
                  className={`border-t cursor-pointer transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-700 hover:bg-[#1a1a1a]' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${
                      station.preparation_status === 'in_vorbereitung'
                        ? theme === 'dark'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-yellow-200 text-yellow-900'
                        : station.status?.includes('READY')
                        ? theme === 'dark'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-green-100 text-green-700'
                        : theme === 'dark'
                        ? 'bg-gray-500/10 text-gray-400'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {station.preparation_status === 'in_vorbereitung' ? 'In Vorbereitung' : station.status}
                    </span>
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {station.main_code}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.stationsname}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.str || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.plz || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.ort || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getFullBundeslandName(station.bundesl) || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.land || 'Deutschland'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.kontinent || 'Europa'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.telefon || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.email || '-'}
                  </td>
                  <td className={`px-2 py-2 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {station.mgr || '-'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-sm font-mono ${
                      station.id_checker > 0
                        ? theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {station.id_checker || '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {isStationOnline(station.main_code) ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Online ({getOnlineDeviceCount(station.main_code)}/{getTotalDeviceCount(station.main_code)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        Offline ({getTotalDeviceCount(station.main_code)})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStandorte.length === 0 && (
          <div className="text-center py-12">
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Keine Standorte gefunden
            </p>
          </div>
        )}
      </Card>

      {/* Standort Details Modal */}
      {showModal && selectedStandort && (
        <StandortDetailsModal
          standort={selectedStandort}
          onClose={handleCloseModal}
          onUpdate={handleUpdateStandort}
        />
      )}
    </div>
  );
};

export default StandorteManagement;
