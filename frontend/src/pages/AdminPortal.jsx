import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useTenant } from '../contexts/TenantContext';
import { CustomerFilterProvider, useCustomerFilter } from '../contexts/CustomerFilterContext';
import { LogOut, MapPin, Monitor, Users, Settings, Zap, FileText, Shield, Package, PackageCheck, ChevronDown, UserCheck, Key, Search, Plus, Headphones, Boxes, Bell, ShoppingCart, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import ThemeToggle from '../components/ThemeToggle';
import CustomerManagement from '../components/CustomerManagement';
import CustomerDropdown from '../components/CustomerDropdown';
import PortalSwitcher from '../components/PortalSwitcher';
import CustomerImpersonationDropdown from '../components/CustomerImpersonationDropdown';
import ImpersonationBanner from '../components/ImpersonationBanner';
import CustomerPortalContent from '../components/CustomerPortalContent';
import StandorteManagement from '../components/StandorteManagement';
import AllLocationsTab from '../components/AllLocationsTab';
import DeviceManagement from '../components/DeviceManagement';
import AddDeviceModal from '../components/AddDeviceModal';
import GlobalSearch from '../components/GlobalSearch';
// Removed old modals: DeviceDetailsModal, CustomerDetailsModal, StandortDetailsModal
// Now using navigation to detail pages instead
import AddStandortModal from '../components/AddStandortModal';
import DeviceFileUpload from '../components/DeviceFileUpload';
import TeamViewerSettings from '../components/TeamViewerSettings';
import PortalFeatureSettings from '../components/PortalFeatureSettings';
import SearchInput from '../components/SearchInput';
import InventoryManagement from '../components/InventoryManagement';
import OrdersManagement from '../components/OrdersManagement';
import EuroboxManagement from '../components/EuroboxManagement';
import BackupManagement from '../components/BackupManagement';
import DataManagement from '../components/DataManagement';
import CategoryManagement from '../components/CategoryManagement';
import GoodsReceiptManagement from '../components/GoodsReceiptManagement';
import LowStockAlert from '../components/LowStockAlert';
import SupportManagement from '../components/SupportManagement';
import BrandingSettings from '../components/BrandingSettings';
import LicenseManagement from '../components/LicenseManagement';
import HardwareLicenseManagement from '../components/HardwareLicenseManagement';
import SoftwareLicenseManagement from '../components/SoftwareLicenseManagement';
import APIKeysManagement from '../components/APIKeysManagement';
import ComponentsManagement from '../components/ComponentsManagement';
import ResourcesManagement from './ResourcesManagement';
import SettingsSidebar from '../components/SettingsSidebar';
import CustomerSwitcher from '../components/CustomerSwitcher';
import ServicesConfiguration from '../components/ServicesConfiguration';
import ScannerPinSettings from '../components/ScannerPinSettings';
import TenantsPage from './TenantsPage';
import TenantDetailPage from './TenantDetailPage';
import SubscriptionPlans from './SubscriptionPlans';
import UsersRolesPage from './UsersRolesPage';
import toast from 'react-hot-toast';

const AdminPortalContent = () => {
  const { user, logout, apiCall } = useAuth();
  const { theme } = useTheme();
  const { isImpersonating } = useImpersonation();
  const { selectedCustomer, setCustomers } = useCustomerFilter();
  const { selectedTenantId, selectedTenantName, setSelectedTenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on a nested route (detail page or dedicated overview page)
  const isOnDetailPage = location.pathname !== '/portal/admin' && 
                         (location.pathname.includes('/tenants/') || 
                          location.pathname.includes('/devices/') || 
                          location.pathname.includes('/locations/') ||
                          location.pathname.includes('/in-preparation'));
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenantIdForDetail, setSelectedTenantIdForDetail] = useState(null); // For TenantDetailPage navigation
  const [licenseSubTab, setLicenseSubTab] = useState('hardware'); // hardware or software
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomersState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncMode, setSyncMode] = useState('polling');
  const [europcarStandorte, setEuropcarStandorte] = useState([]);
  const [europcarDevices, setEuropcarDevices] = useState([]);
  const [standorteSearchTerm, setStandorteSearchTerm] = useState('');
  const [devicesSearchTerm, setDevicesSearchTerm] = useState('');
  const [deviceListKey, setDeviceListKey] = useState(0); // Key to force re-render of DeviceManagement
  const [showAddStandortModal, setShowAddStandortModal] = useState(false);
  const [isSavingStandort, setIsSavingStandort] = useState(false);
  
  // Modal states for global search results - now using navigation instead
  // Removed: showCustomerModal, showStandortModal, showDeviceModal
  const [selectedArtikelId, setSelectedArtikelId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [lastCheckedOrders, setLastCheckedOrders] = useState(null);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [lastCheckedTickets, setLastCheckedTickets] = useState(null);
  const [newChangeRequestsCount, setNewChangeRequestsCount] = useState(0);
  const [lastCheckedChangeRequests, setLastCheckedChangeRequests] = useState(null);
  const [settingsTab, setSettingsTab] = useState('branding');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inventoryTab, setInventoryTab] = useState('items'); // 'items' or 'goods-receipt'
  const [companyLogoDark, setCompanyLogoDark] = useState(null);
  const [companyLogoLight, setCompanyLogoLight] = useState(null);
  const [companyName, setCompanyName] = useState('TSRID');
  const [selectedDeviceForModal, setSelectedDeviceForModal] = useState(null);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [tenantInitialTab, setTenantInitialTab] = useState('dashboard');

  // Handle navigation from LocationDetailPage or DeviceDetailPage
  useEffect(() => {
    if (location.state?.selectedTenantId) {
      console.log('[AdminPortal] Navigated from LocationDetailPage with state:', location.state);
      // Use setTimeout to ensure this runs after other useEffects
      setTimeout(() => {
        setActiveTab(location.state.activeTab || 'tenants');
        setSelectedTenantIdForDetail(location.state.selectedTenantId);
        setTenantInitialTab(location.state.tenantInitialTab || 'dashboard');
      }, 100);
    } else if (location.state?.activeTab) {
      // Handle navigation with just activeTab (e.g., from DeviceDetailPage back to devices)
      console.log('[AdminPortal] Navigated with activeTab:', location.state.activeTab);
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const [scanStats, setScanStats] = useState({
    total_scans: 0,
    correct_scans: 0,
    unknown_scans: 0,
    failed_scans: 0
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_tenants: 0,
    total_users: 0,
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    in_preparation: 0,
    total_locations: 0,
    total_licenses: 0,
    total_scans: 0,
    correct_scans: 0,
    unknown_scans: 0,
    failed_scans: 0
  });

  // Check if user is a tenant admin (has tenant_ids but is not superadmin)
  const isTenantAdmin = user?.tenant_ids?.length > 0 && 
                       user?.email !== 'admin@tsrid.com' && 
                       user?.user_type !== 'super_admin';

  // Check for return navigation from location detail page
  useEffect(() => {
    const returnToTenant = sessionStorage.getItem('returnToTenant');
    const returnToTab = sessionStorage.getItem('returnToTab');
    
    if (returnToTenant && returnToTab) {
      // Clear the session storage
      sessionStorage.removeItem('returnToTenant');
      sessionStorage.removeItem('returnToTab');
      
      // Set the tenant, tab, and initial tab for TenantDetailPage
      setTenantInitialTab(returnToTab);
      setSelectedTenantIdForDetail(returnToTenant);
      setActiveTab('tenants');
    }
  }, []);

  // Auto-navigate to TenantDetailPage when specific tenant is selected from CustomerSwitcher
  useEffect(() => {
    console.log('[AdminPortal] selectedTenantId changed:', selectedTenantId);
    
    // If a specific tenant is selected (not 'all') and we're not already viewing tenant details
    if (selectedTenantId && selectedTenantId !== 'all' && selectedTenantId !== selectedTenantIdForDetail) {
      console.log('[AdminPortal] Auto-navigating to TenantDetailPage for tenant:', selectedTenantId);
      // Switch to tenants tab and show the detail page
      setActiveTab('tenants');
      setSelectedTenantIdForDetail(selectedTenantId);
      setTenantInitialTab('dashboard'); // Show dashboard by default
    } else if (selectedTenantId === 'all') {
      // When "Alle Kunden" is selected, go back to tenants overview
      console.log('[AdminPortal] Switching to tenants overview (Alle Kunden)');
      setSelectedTenantIdForDetail(null);
    }
  }, [selectedTenantId]);

  // Load company branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const result = await apiCall('/api/branding/logo');
        if (result.success && result.data) {
          setCompanyLogoDark(result.data.logo_url_dark);
          setCompanyLogoLight(result.data.logo_url_light);
          setCompanyName(result.data.company_name || 'TSRID');
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      }
    };

    fetchBranding();
  }, [apiCall]);


  // Fetch dashboard statistics (tenants, devices, locations, etc.)
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        let result;
        
        if (isTenantAdmin) {
          // Tenant admin - ALWAYS load their specific tenant stats (ignore switcher)
          const tenantId = user.tenant_ids[0];
          console.log('[Dashboard] Tenant Admin - Loading stats for:', tenantId);
          result = await apiCall(`/api/tenants/${tenantId}/dashboard-stats`);
        } else if (!isTenantAdmin && selectedTenantId && selectedTenantId !== 'all') {
          // Superadmin with specific tenant selected - load that tenant's stats
          console.log('[Dashboard] Superadmin - Loading stats for selected tenant:', selectedTenantId);
          result = await apiCall(`/api/tenants/${selectedTenantId}/dashboard-stats`);
        } else {
          // Superadmin with "Alle Kunden" - load global stats
          console.log('[Dashboard] Superadmin - Loading global stats (all tenants)');
          result = await apiCall('/api/tenants/stats');
        }
        
        console.log('[Dashboard] Stats API result:', result);
        if (result && result.success && result.data) {
          console.log('[Dashboard] Setting stats:', result.data);
          setDashboardStats(result.data);
        } else if (result && !result.success) {
          console.error('[Dashboard] API error:', result);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab, apiCall, user, selectedTenantId, isTenantAdmin]);

  // Fetch scan statistics
  useEffect(() => {
    const fetchScanStats = async () => {
      try {
        const result = await apiCall('/api/scan-stats?days=30');
        if (result.success && result.data) {
          const apiResponse = result.data;
          if (apiResponse.success && apiResponse.data) {
            setScanStats(apiResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching scan stats:', error);
      }
    };

    if (activeTab === 'dashboard') {
      fetchScanStats();
    }
  }, [activeTab, apiCall]);


  // Check for new orders periodically
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const result = await apiCall('/api/orders/statistics/summary');
        
        // The apiCall wrapper returns data in result.data
        const statistics = result?.data?.statistics || result?.statistics;
        
        if (result.success && statistics) {
          const currentNewOrders = statistics.new_orders || 0;
          
          // Only update and show toast if count increased
          if (lastCheckedOrders !== null && currentNewOrders > lastCheckedOrders) {
            const diff = currentNewOrders - lastCheckedOrders;
            setNewOrdersCount(currentNewOrders);
            toast.success(`${diff} neue Bestellung${diff > 1 ? 'en' : ''}!`, {
              duration: 5000,
              icon: '🔔'
            });
          } else {
            // Just update the count without toast
            setNewOrdersCount(currentNewOrders);
          }
          
          setLastCheckedOrders(currentNewOrders);
        }
      } catch (error) {
        console.error('Error checking new orders:', error);
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [apiCall, lastCheckedOrders]);

  // Check for new tickets periodically
  useEffect(() => {
    const checkNewTickets = async () => {
      try {
        const result = await apiCall('/api/tickets/stats');
        
        // The apiCall wrapper returns data in result.data
        const stats = result?.data?.stats || result?.stats;
        
        if (result.success && stats) {
          const currentNewTickets = stats.new_tickets || 0;
          
          // Only update and show toast if count increased
          if (lastCheckedTickets !== null && currentNewTickets > lastCheckedTickets) {
            const diff = currentNewTickets - lastCheckedTickets;
            setNewTicketsCount(currentNewTickets);
            toast.success(`${diff} neues Ticket${diff > 1 ? 's' : ''}!`, {
              duration: 5000,
              icon: '🎫'
            });
          } else {
            // Just update the count without toast
            setNewTicketsCount(currentNewTickets);
          }
          
          setLastCheckedTickets(currentNewTickets);
        }
      } catch (error) {
        console.error('Error checking new tickets:', error);
      }
    };

    checkNewTickets();
    const interval = setInterval(checkNewTickets, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [apiCall, lastCheckedTickets]);

  // Check for new change requests periodically
  useEffect(() => {
    const checkNewChangeRequests = async () => {
      try {
        const result = await apiCall('/api/change-requests/stats/summary');
        
        // The apiCall wrapper returns data in result.data
        const stats = result?.data?.stats || result?.stats;
        
        if (result.success && stats) {
          const currentOpenCRs = stats.open || 0;
          
          // Only update and show toast if count increased
          if (lastCheckedChangeRequests !== null && currentOpenCRs > lastCheckedChangeRequests) {
            const diff = currentOpenCRs - lastCheckedChangeRequests;
            setNewChangeRequestsCount(currentOpenCRs);
            toast.success(`${diff} neue Change Request${diff > 1 ? 's' : ''}!`, {
              duration: 5000,
              icon: '📝'
            });
          } else {
            // Just update the count without toast
            setNewChangeRequestsCount(currentOpenCRs);
          }
          
          setLastCheckedChangeRequests(currentOpenCRs);
        }
      } catch (error) {
        console.error('Error checking new change requests:', error);
      }
    };

    checkNewChangeRequests();
    const interval = setInterval(checkNewChangeRequests, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [apiCall, lastCheckedChangeRequests]);

  useEffect(() => {
    loadData();
    loadSyncMode();
  }, []);

  // Load standorte and devices when customer selection changes
  useEffect(() => {
    // Load immediately on mount, then reload on customer selection change
    console.log('[AdminPortal] Loading Europcar data for customer:', selectedCustomer);
    loadEuropcarStandorte();
    loadEuropcarDevices();
  }, [selectedCustomer]);

  // Reset to dashboard when impersonation is activated
  useEffect(() => {
    if (isImpersonating) {
      setActiveTab('dashboard');
      console.log('[AdminPortal] Impersonation activated - switching to dashboard');
    }
  }, [isImpersonating]);

  // Clear new orders badge when orders tab is viewed
  useEffect(() => {
    if (activeTab === 'orders') {
      setNewOrdersCount(0);
    }
    if (activeTab === 'support') {
      setNewTicketsCount(0);
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, locationsRes, usersRes] = await Promise.all([
        apiCall('/api/portal/devices/list'),
        apiCall('/api/portal/locations/list'),
        apiCall('/api/portal/users/list')
      ]);

      if (devicesRes.success) {
        setDevices(devicesRes.data.devices || []);
      }
      if (locationsRes.success) {
        setLocations(locationsRes.data.locations || []);
      }
      if (usersRes.success) {
        const usersList = usersRes.data.users || [];
        // Filter nur echte Kunden (keine Admins)
        const customersList = usersList.filter(u => u.role === 'customer');
        setCustomersState(customersList);
        setCustomers(customersList); // Update context
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncMode = async () => {
    const result = await apiCall('/api/sync/mode');
    if (result.success) {
      setSyncMode(result.data.mode);
    }
  };

  const loadEuropcarStandorte = async () => {
    try {
      // Build URL with customer filter if specific customer is selected
      let url = '/api/portal/customer-data/europcar-stations';
      if (selectedCustomer && selectedCustomer !== 'all') {
        url += `?customer_email=${encodeURIComponent(selectedCustomer)}`;
      }
      
      const result = await apiCall(url);
      if (result.success && result.data) {
        setEuropcarStandorte(result.data.stations || []);
      }
    } catch (error) {
      console.error('Error loading Europcar standorte:', error);
      setEuropcarStandorte([]);
    }
  };

  const loadEuropcarDevices = async () => {
    try {
      // Build URL with customer filter if specific customer is selected
      let url = '/api/portal/europcar-devices';
      if (selectedCustomer && selectedCustomer !== 'all') {
        url += `?customer_email=${encodeURIComponent(selectedCustomer)}`;
      }
      
      const result = await apiCall(url);
      if (result.success && result.data) {
        // Handle double-wrapped response from apiCall
        const responseData = result.data.data || result.data;
        setEuropcarDevices(responseData.devices || []);
      }
    } catch (error) {
      console.error('Error loading Europcar devices:', error);
      setEuropcarDevices([]);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/sync/trigger', { method: 'POST' });
      if (result.success) {
        toast.success('Synchronisation erfolgreich ausgelöst');
      } else {
        toast.error('Synchronisation fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler bei der Synchronisation');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for modals
  const stats = {
    devices: devices.length,
    locations: locations.length,
    onlineDevices: devices.filter(d => d.status === 'online').length,
    offlineDevices: devices.filter(d => d.status === 'offline').length
  };

  const handleLogout = () => {
    logout();
    toast.success('Erfolgreich abgemeldet');
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;

  // Filter data based on selected customer
  const filteredDevices = selectedCustomer === 'all' 
    ? devices 
    : devices.filter(d => d.customer_email === selectedCustomer);
  
  const filteredLocations = selectedCustomer === 'all'
    ? locations
    : locations.filter(l => l.customer_email === selectedCustomer);

  // Calculate display count for locations (include Europcar standorte if applicable)
  const displayedLocationsCount = (() => {
    if (selectedCustomer === 'all') {
      // Show all locations + Europcar standorte
      return filteredLocations.length + europcarStandorte.length;
    } else {
      // Check if selected customer is Europcar (flexible check)
      const customer = customers.find(c => c.email === selectedCustomer);
      if (customer && customer.company && customer.company.toLowerCase().includes('europcar')) {
        // Show Europcar standorte
        return europcarStandorte.length;
      }
      // Show regular locations for this customer
      return filteredLocations.length;
    }
  })();

  // Calculate display count for devices (include Europcar devices if applicable)
  const displayedDevicesCount = (() => {
    if (selectedCustomer === 'all') {
      // Show all devices + Europcar devices
      return filteredDevices.length + europcarDevices.length;
    } else {
      // Check if selected customer is Europcar (flexible check)
      const customer = customers.find(c => c.email === selectedCustomer);
      if (customer && customer.company && customer.company.toLowerCase().includes('europcar')) {
        // Show Europcar devices
        return europcarDevices.length;
      }
      // Show regular devices for this customer
      return filteredDevices.length;
    }
  })();

  const filteredCustomers = selectedCustomer === 'all'
    ? customers
    : customers.filter(c => c.email === selectedCustomer);

  // Calculate online/offline devices including Europcar devices when "Alle Kunden" is selected
  const filteredOnlineDevices = (() => {
    if (selectedCustomer === 'all') {
      // Include both portal devices and Europcar devices
      const portalOnline = filteredDevices.filter(d => d.status === 'online').length;
      const europcarOnline = europcarDevices.filter(d => d.status === 'online').length;
      return portalOnline + europcarOnline;
    } else {
      // Check if selected customer is Europcar (flexible check)
      const customer = customers.find(c => c.email === selectedCustomer);
      if (customer && customer.company && customer.company.toLowerCase().includes('europcar')) {
        // Show only Europcar devices
        return europcarDevices.filter(d => d.status === 'online').length;
      }
      // Show only portal devices for this customer
      return filteredDevices.filter(d => d.status === 'online').length;
    }
  })();

  const filteredOfflineDevices = (() => {
    if (selectedCustomer === 'all') {
      // Include both portal devices and Europcar devices
      const portalOffline = filteredDevices.filter(d => d.status === 'offline').length;
      const europcarOffline = europcarDevices.filter(d => d.status === 'offline').length;
      return portalOffline + europcarOffline;
    } else {
      // Check if selected customer is Europcar (flexible check)
      const customer = customers.find(c => c.email === selectedCustomer);
      if (customer && customer.company && customer.company.toLowerCase().includes('europcar')) {
        // Show only Europcar devices
        return europcarDevices.filter(d => d.status === 'offline').length;
      }
      // Show only portal devices for this customer
      return filteredDevices.filter(d => d.status === 'offline').length;
    }
  })();

  const filteredInPreparationDevices = (() => {
    if (selectedCustomer === 'all') {
      // Include both portal devices and Europcar devices
      const portalInPrep = filteredDevices.filter(d => d.status === 'in_vorbereitung' || d.status === 'pending').length;
      const europcarInPrep = europcarDevices.filter(d => d.status === 'in_vorbereitung' || d.status === 'pending').length;
      return portalInPrep + europcarInPrep;
    } else {
      // Check if selected customer is Europcar
      const customer = customers.find(c => c.email === selectedCustomer);
      if (customer && customer.company === 'Europcar Autovermietung GmbH') {
        // Show only Europcar devices
        return europcarDevices.filter(d => d.status === 'in_vorbereitung' || d.status === 'pending').length;
      }
      // Show only portal devices for this customer
      return filteredDevices.filter(d => d.status === 'in_vorbereitung' || d.status === 'pending').length;
    }
  })();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-[#c00000] to-[#a00000]' : 'bg-white border-b border-gray-200'}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveTab('dashboard')}
            >
              {(theme === 'dark' ? companyLogoDark : companyLogoLight) ? (
                // Show logo + "Admin Portal" text (no Shield, no company name)
                <>
                  <img 
                    src={theme === 'dark' ? companyLogoDark : companyLogoLight} 
                    alt={companyName} 
                    className="h-12 w-auto max-w-[200px] object-contain"
                  />
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>
                    Admin Portal
                  </h1>
                </>
              ) : (
                // Show default: Shield icon + company name + "Admin Portal"
                <>
                  <Shield className={`h-10 w-10 ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`} />
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>
                    {companyName} Admin Portal
                  </h1>
                </>
              )}
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-md mx-8">
              <GlobalSearch 
                onResultSelect={(result) => {
                  if (result.type === 'standort') {
                    // Navigate to Location Detail Page
                    const locationId = result.data.location_id || result.data.id;
                    const tenantId = result.data.tenant_id;
                    if (tenantId) {
                      navigate(`/portal/admin/tenants/${tenantId}/locations/${locationId}`);
                    } else {
                      navigate(`/portal/admin/locations/${locationId}`);
                    }
                  } else if (result.type === 'artikel') {
                    // Switch to inventory tab and open artikel detail
                    setActiveTab('inventory');
                    setSelectedArtikelId(result.data.id);
                  } else if (result.type === 'bestellung') {
                    // Switch to orders tab and open order detail
                    setActiveTab('orders');
                    setSelectedOrderId(result.data.id);
                  } else if (result.type === 'geraet') {
                    // Navigate to Device Detail Page instead of modal
                    const deviceId = result.data.device_id || result.data.id;
                    const tenantId = result.data.tenant_id;
                    if (tenantId) {
                      navigate(`/portal/admin/tenants/${tenantId}/devices/${deviceId}`);
                    } else {
                      navigate(`/portal/admin/devices/${deviceId}`);
                    }
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSync}
                disabled={loading}
                className={`flex items-center space-x-1.5 px-3 py-2 ${
                  theme === 'dark'
                    ? 'bg-white text-[#c00000] hover:bg-red-50'
                    : 'bg-[#c00000] text-white hover:bg-[#a00000]'
                }`}
                size="sm"
              >
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Sync</span>
              </Button>
              
              {/* Bell Icon for New Orders */}
              <button
                onClick={() => setActiveTab('orders')}
                className={`relative p-2 rounded-lg transition-all ${
                  newOrdersCount > 0
                    ? 'animate-heartbeat'
                    : ''
                } ${
                  theme === 'dark'
                    ? 'hover:bg-white/10'
                    : 'hover:bg-gray-100'
                }`}
                title={newOrdersCount > 0 ? `${newOrdersCount} neue Bestellung${newOrdersCount > 1 ? 'en' : ''}` : 'Keine neuen Bestellungen'}
              >
                <Bell className={`h-5 w-5 ${
                  newOrdersCount > 0
                    ? theme === 'dark'
                      ? 'text-white'
                      : 'text-[#c00000]'
                    : theme === 'dark'
                    ? 'text-white/70'
                    : 'text-gray-500'
                }`} />
                {newOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-black animate-heartbeat">
                    {newOrdersCount > 9 ? '9+' : newOrdersCount}
                  </span>
                )}
              </button>
              
              <div className="text-right">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>{user?.name}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-red-100' : 'text-gray-500'}`}>Administrator</p>
              </div>
              <CustomerSwitcher />
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className={`flex items-center space-x-2 ${
                  theme === 'dark'
                    ? 'bg-transparent border-white text-white hover:bg-white hover:text-[#c00000]'
                    : 'border-[#c00000] text-[#c00000] hover:bg-[#c00000] hover:text-white'
                }`}
              >
                <LogOut className="h-4 w-4" />
                <span>Abmelden</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Impersonation Banner */}
      {isImpersonating && <ImpersonationBanner />}

      {/* Conditional Content: Show Customer Portal View when impersonating */}
      {isImpersonating ? (
        <>
          {/* Customer Navigation Tabs */}
          <div className={`border-b ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8">
                {(() => {
                  console.log('[AdminPortal Impersonation] User object:', user);
                  console.log('[AdminPortal Impersonation] shop_enabled:', user?.shop_enabled);
                  const tabs = [
                    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
                    { id: 'devices', label: 'Geräte', icon: Monitor },
                    { id: 'locations', label: 'Standorte', icon: MapPin }
                  ];
                  if (user?.shop_enabled) {
                    tabs.push({ id: 'shop', label: 'Shop', icon: Package });
                  }
                  return tabs;
                })().map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#c00000] text-[#c00000]'
                        : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Customer Portal Content */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <CustomerPortalContent 
              isImpersonation={true} 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </main>
        </>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className={`border-b ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8 overflow-x-auto">{[
                  { id: 'dashboard', label: 'Dashboard', icon: Monitor },
                  { id: 'users-roles', label: 'Users & Roles', icon: Users },
                  { id: 'tenants', label: 'Tenants', icon: Users },
                  { id: 'id-checks', label: 'ID-Checks', icon: UserCheck },
                  { id: 'devices', label: 'Devices', icon: Monitor },
                  { id: 'locations', label: 'Locations', icon: MapPin },
                  { id: 'inventory', label: 'Inventory', icon: Package },
                  { id: 'orders', label: 'Orders', icon: ShoppingCart },
                  { id: 'support', label: 'Support', icon: Headphones },
                  { id: 'licenses', label: 'Licenses', icon: Key },
                  { id: 'settings', label: 'Settings', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#c00000] text-[#c00000]'
                        : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.id === 'orders' && newOrdersCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-heartbeat">
                        {newOrdersCount > 9 ? '9+' : newOrdersCount}
                      </span>
                    )}
                    {tab.id === 'support' && newTicketsCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-heartbeat">
                        {newTicketsCount > 9 ? '9+' : newTicketsCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content - only show when not on detail page */}
          {!isOnDetailPage && (
          <main className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              {/* Dynamic Header based on customer selection */}
              {selectedCustomer && selectedCustomer !== 'all' ? (
                <div className="mb-6">
                  <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {customers.find(c => c.email === selectedCustomer)?.name || 'Kunde'}
                  </h2>
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {customers.find(c => c.email === selectedCustomer)?.company || ''}
                  </p>
                  <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    Kundenansicht
                  </div>
                </div>
              ) : (
                <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  System Übersicht
                </h2>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Row 1: Kunden, Geräte, Standorte, Mitarbeiter */}
                
                {/* Total Customers - nur anzeigen wenn "Alle Kunden" */}
                {(selectedCustomer === 'all' && !isTenantAdmin) && (
                  <Card 
                    onClick={() => setActiveTab('tenants')}
                    className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                      : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Kunden</p>
                        <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{dashboardStats.total_tenants}</p>
                      </div>
                      <Users className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                    </div>
                  </Card>
                )}

                {/* Total Devices */}
                <Card 
                  onClick={() => setActiveTab('devices')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Geräte</p>
                      <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {dashboardStats.total_devices}
                      </p>
                    </div>
                    <Monitor className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  </div>
                </Card>

                {/* Locations */}
                <Card 
                  onClick={() => setActiveTab('locations')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standorte</p>
                      <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {dashboardStats.total_locations}
                      </p>
                    </div>
                    <MapPin className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  </div>
                </Card>

                {/* Employees */}
                <Card 
                  onClick={() => setActiveTab('users-roles')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mitarbeiter</p>
                      <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {dashboardStats.total_users}
                      </p>
                    </div>
                    <UserCheck className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  </div>
                </Card>

                {/* Row 2: Online, Offline, In Vorbereitung */}

                {/* Online Devices */}
                <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Online</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {dashboardStats.online_devices}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
                      <div className="h-6 w-6 bg-green-600 rounded-full animate-heartbeat"></div>
                    </div>
                  </div>
                </Card>

                {/* Offline Devices */}
                <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Offline</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">
                        {dashboardStats.offline_devices}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
                      <div className="h-6 w-6 bg-red-600 rounded-full"></div>
                    </div>
                  </div>
                </Card>

                {/* In Vorbereitung (Pending) */}
                <Card 
                  onClick={() => navigate('/portal/admin/in-preparation')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>In Vorbereitung</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {dashboardStats.in_preparation}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
                      <div className="h-6 w-6 bg-yellow-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </Card>

                {/* Licenses */}
                <Card 
                  onClick={() => setActiveTab('licenses')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Lizenzen</p>
                      <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>0</p>
                    </div>
                    <Key className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  </div>
                </Card>
              </div>
            </div>

            {/* Row 3: Neue Bestellungen, Neue Tickets & Change Requests - Responsive Grid */}
            {(newOrdersCount > 0 || newTicketsCount > 0 || newChangeRequestsCount > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {/* Neue Bestellungen */}
                {newOrdersCount > 0 && (
                  <Card 
                    onClick={() => setActiveTab('orders')}
                    className={`p-5 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_30px_rgba(234,179,8,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-yellow-50 border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_30px_rgba(234,179,8,0.4)] hover:-translate-y-1 animate-heartbeat'
                    }`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className={`text-xs font-bold mb-1 flex items-center gap-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                          🔔 NEUE BESTELLUNGEN
                        </p>
                        <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                          ⚡ {newOrdersCount}
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-yellow-400/70' : 'text-yellow-700'}`}>
                          Aktion erforderlich
                        </p>
                      </div>
                      <ShoppingCart className={`h-10 w-10 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} animate-bounce`} />
                    </div>
                  </Card>
                )}

                {/* Neue Tickets */}
                {newTicketsCount > 0 && (
                  <Card 
                    onClick={() => setActiveTab('support')}
                    className={`p-5 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-orange-500 shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_30px_rgba(249,115,22,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-orange-50 border-2 border-orange-500 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_30px_rgba(249,115,22,0.4)] hover:-translate-y-1 animate-heartbeat'
                    }`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className={`text-xs font-bold mb-1 flex items-center gap-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-800'}`}>
                          🎫 NEUE TICKETS
                        </p>
                        <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                          ⚡ {newTicketsCount}
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-orange-400/70' : 'text-orange-700'}`}>
                          Support benötigt
                        </p>
                      </div>
                      <Headphones className={`h-10 w-10 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'} animate-bounce`} />
                    </div>
                  </Card>
                )}

                {/* Change Requests */}
                {newChangeRequestsCount > 0 && (
                  <Card 
                    onClick={() => setActiveTab('support')}
                    className={`p-5 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-purple-500 shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-purple-50 border-2 border-purple-500 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-1 animate-heartbeat'
                    }`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className={`text-xs font-bold mb-1 flex items-center gap-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-800'}`}>
                          📝 CHANGE REQUESTS
                        </p>
                        <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                          ⚡ {newChangeRequestsCount}
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-purple-400/70' : 'text-purple-700'}`}>
                          Offen
                        </p>
                      </div>
                      <FileText className={`h-10 w-10 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} animate-bounce`} />
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Row 4: Scan Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              {/* Total Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-blue-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-blue-50 border border-blue-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>Scans Insgesamt</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{scanStats.total_scans.toLocaleString()}</p>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Letzte 30 Tage</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Correct Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Korrekte Scans</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{scanStats.correct_scans.toLocaleString()}</p>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {scanStats.total_scans > 0 ? Math.round((scanStats.correct_scans / scanStats.total_scans) * 100) : 0}% Erfolgsrate
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Unknown Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>Unbekannte Scans</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{scanStats.unknown_scans.toLocaleString()}</p>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Überprüfung erforderlich</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Failed Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Fehlgeschlagene Scans</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{scanStats.failed_scans.toLocaleString()}</p>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Fehleranalyse nötig</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sync Status Card */}
            <Card className={`p-6 rounded-xl shadow-lg transition-all duration-300 mt-6 ${
              theme === 'dark' 
                ? 'bg-blue-500/10 border border-blue-500/20' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Zap className={`h-10 w-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>Synchronisations-Modus</h3>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                      Aktueller Modus: <span className="font-semibold">{syncMode === 'websocket' ? 'WebSocket (Echtzeit)' : syncMode === 'polling' ? 'Polling' : 'Manuell'}</span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSync}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all"
                >
                  Jetzt synchronisieren
                </Button>
              </div>
            </Card>

            {/* Low Stock Alerts - Only show for "Alle Kunden" */}
            {selectedCustomer === 'all' && (
              <div>
                <LowStockAlert />
              </div>
            )}

            {/* Recent Devices */}
            <div>
              <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Alle Geräte</h3>
              <div className={`rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-100'}`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gerät</th>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standort</th>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>IP Adresse</th>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zuletzt gesehen</th>
                      <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'bg-[#2a2a2a] divide-gray-800' : 'bg-white divide-gray-100'}`}>
                    {filteredDevices.map((device) => (
                      <tr key={device.device_id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{device.device_id}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{device.station_name}</div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                          {device.location_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                            device.status === 'online'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {device.ip_address || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {device.last_seen ? new Date(device.last_seen).toLocaleString('de-DE') : 'Nie'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          <button className="text-[#c00000] hover:text-[#a00000] transition-colors">Bearbeiten</button>
                        </td>
                      </tr>
                    ))}
                    {filteredDevices.length === 0 && (
                      <tr>
                        <td colSpan="6" className={`px-6 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Monitor className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                          <p className="font-semibold">Keine Geräte vorhanden</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <CustomerManagement customers={filteredCustomers} onRefresh={loadData} />
        )}

        {activeTab === 'users-roles' && (
          <UsersRolesPage />
        )}

        {activeTab === 'tenants' && !selectedTenantIdForDetail && (
          <TenantsPage onSelectTenant={(id) => setSelectedTenantIdForDetail(id)} />
        )}

        {activeTab === 'tenants' && selectedTenantIdForDetail && (
          <TenantDetailPage 
            tenantId={selectedTenantIdForDetail} 
            onBack={() => {
              setSelectedTenantIdForDetail(null);
              setTenantInitialTab('dashboard');
              // Reset tenant context to "Alle Kunden"
              setSelectedTenant('all', 'Alle Kunden');
            }}
            initialTab={tenantInitialTab}
          />
        )}

        {activeTab === 'id-checks' && (
          <Card className={`p-16 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <UserCheck className={`h-20 w-20 mx-auto mb-6 ${theme === 'dark' ? 'text-[#c00000]/50' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>ID-Checks Management</h3>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Connected to ID Verification Service (Port 8101)</p>
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>UI wird in Kürze implementiert...</p>
          </Card>
        )}

        {activeTab === 'devices' && (
          <div>
            {/* Header with Search and Add Button in one row */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
              {/* Title on the left */}
              <div className="flex-shrink-0">
                <h2 className={`text-2xl font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Geräteverwaltung
                </h2>
              </div>

              {/* Search Bar in the middle - flexible width */}
              <div className="flex-1 w-full lg:w-auto">
                <SearchInput
                  value={devicesSearchTerm}
                  onChange={(e) => setDevicesSearchTerm(e.target.value)}
                  placeholder="Suche nach Device-ID, Locationcode, Stadt, SN-PC, SN-SC..."
                  className="w-full"
                />
              </div>

              {/* Add Button on the right */}
              <div className="flex-shrink-0">
                <Button
                  onClick={() => setShowAddDeviceModal(true)}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center space-x-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gerät hinzufügen</span>
                </Button>
              </div>
            </div>

            <DeviceManagement 
              key={deviceListKey}
              searchTerm={devicesSearchTerm}
              onSearchChange={setDevicesSearchTerm}
            />
          </div>
        )}

        {activeTab === 'locations' && (
          <AllLocationsTab 
            theme={theme}
            selectedTenantId={selectedTenantId}
          />
        )}

        {activeTab === 'employees' && (
          <div>
            {/* Header with Search and Add Button in one row */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
              {/* Title on the left */}
              <div className="flex-shrink-0">
                <h2 className={`text-2xl font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Mitarbeiterverwaltung
                </h2>
              </div>

              {/* Search Bar in the middle - flexible width */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    placeholder="Suche nach Name, E-Mail, Abteilung..."
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-red-500`}
                  />
                </div>
              </div>

              {/* Add Button on the right */}
              <div className="flex-shrink-0">
                <Button
                  onClick={() => toast.info('Mitarbeiter hinzufügen - Coming Soon')}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center space-x-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Mitarbeiter hinzufügen</span>
                </Button>
              </div>
            </div>

            {/* Employee management will be implemented */}
            <Card className={`p-16 text-center rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none' 
                : 'bg-white border border-gray-100'
            }`}>
              <Users className={`h-20 w-20 mx-auto mb-6 ${theme === 'dark' ? 'text-[#c00000]/50' : 'text-gray-300'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mitarbeiterverwaltung wird implementiert...</p>
            </Card>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Lagerverwaltung</h2>
            
            {/* Inventory Sub-Tabs */}
            <div className="mb-6">
              <div className={`flex gap-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setInventoryTab('items')}
                  className={`px-6 py-3 font-medium transition-all ${
                    inventoryTab === 'items'
                      ? theme === 'dark'
                        ? 'text-[#c00000] border-b-2 border-[#c00000]'
                        : 'text-[#c00000] border-b-2 border-[#c00000]'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package className="inline h-4 w-4 mr-2" />
                  Inventar
                </button>
                <button
                  onClick={() => setInventoryTab('goods-receipt')}
                  className={`px-6 py-3 font-medium transition-all ${
                    inventoryTab === 'goods-receipt'
                      ? theme === 'dark'
                        ? 'text-[#c00000] border-b-2 border-[#c00000]'
                        : 'text-[#c00000] border-b-2 border-[#c00000]'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PackageCheck className="inline h-4 w-4 mr-2" />
                  Wareneingang
                </button>
              </div>
            </div>

            {/* Inventory Content */}
            {inventoryTab === 'items' && (
              <InventoryManagement 
                selectedItemId={selectedArtikelId}
                onItemOpened={() => setSelectedArtikelId(null)}
              />
            )}

            {inventoryTab === 'goods-receipt' && (
              <GoodsReceiptManagement />
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Bestellungen</h2>
            <OrdersManagement 
              selectedOrderId={selectedOrderId}
              onOrderOpened={() => setSelectedOrderId(null)}
            />
          </div>
        )}

        {activeTab === 'components' && (
          <div>
            <ComponentsManagement />
          </div>
        )}

        {activeTab === 'support' && (
          <div>
            <SupportManagement />
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            <ResourcesManagement />
          </div>
        )}

        {activeTab === 'licenses' && (
          <div>
            {/* License Sub-Navigation */}
            <div className="mb-6 border-b" style={{borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'}}>
              <div className="flex gap-6">
                <button
                  onClick={() => setLicenseSubTab('hardware')}
                  className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                    licenseSubTab === 'hardware'
                      ? 'border-[#c00000] text-[#c00000]'
                      : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-300'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hardware-Lizenzen (Scanner)
                </button>
                <button
                  onClick={() => setLicenseSubTab('software')}
                  className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                    licenseSubTab === 'software'
                      ? 'border-[#c00000] text-[#c00000]'
                      : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-300'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Software-Lizenzen
                </button>
              </div>
            </div>

            {/* Render appropriate component based on sub-tab */}
            {licenseSubTab === 'hardware' && (
              <HardwareLicenseManagement />
            )}
            {licenseSubTab === 'software' && (
              <SoftwareLicenseManagement />
            )}
          </div>
        )}

        {activeTab === 'settings' && (() => {
          return (
            <div className="flex h-[calc(100vh-180px)]">
              {/* Sidebar */}
              <SettingsSidebar
                activeSection={settingsTab}
                onSectionChange={setSettingsTab}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl">
                {settingsTab === 'branding' && (
                  <div>
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Erscheinungsbild & Branding
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Passen Sie Firmenlogo und Design-Einstellungen an
                      </p>
                    </div>
                    <BrandingSettings />
                  </div>
                )}

                {settingsTab === 'backup' && (
                  <div>
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        System & Backup
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Erstellen und verwalten Sie Datenbank-Backups und System-Sicherungen
                      </p>
                    </div>
                    <BackupManagement />
                  </div>
                )}

                {settingsTab === 'portal' && (
                  <div>
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Portal-Funktionen
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Aktivieren oder deaktivieren Sie Portal-Features und Module
                      </p>
                    </div>
                    <PortalFeatureSettings />
                  </div>
                )}

                {settingsTab === 'categories' && (
                  <CategoryManagement />
                )}

                {settingsTab === 'scanner-pin' && (
                  <ScannerPinSettings />
                )}

                {settingsTab === 'microservices' && (
                  <ServicesConfiguration />
                )}

                {settingsTab === 'subscription-plans' && (
                  <SubscriptionPlans />
                )}

                {settingsTab === 'integrations' && (
                  <div>
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Integrationen
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Konfigurieren Sie externe Dienste und Integrationen
                      </p>
                    </div>
                    <TeamViewerSettings />
                  </div>
                )}

                {settingsTab === 'api-keys' && (
                  <div>
                    <APIKeysManagement />
                  </div>
                )}

                {settingsTab === 'data' && (
                  <div className="space-y-8">
                    {/* Data Management & Backup */}
                    <DataManagement />
                    
                    {/* Divider */}
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}></div>
                    
                    {/* File Upload */}
                    <div>
                      <div className="mb-4">
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Datei-Uploads
                        </h3>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Importieren Sie Geräte-Daten aus Dateien
                        </p>
                      </div>
                      <DeviceFileUpload />
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          );
        })()}
          </main>
          )}
        </>
      )}
      
      {/* Global Search now navigates to detail pages instead of modals */}
      
      {showAddDeviceModal && (
        <AddDeviceModal
          onClose={() => setShowAddDeviceModal(false)}
          onDeviceAdded={(newDevice) => {
            // Force re-render of DeviceManagement
            setDeviceListKey(prev => prev + 1);
            setShowAddDeviceModal(false);
          }}
          customers={customers}
          selectedCustomer={selectedCustomer}
        />
      )}

      {/* Outlet for nested routes - renders child routes like DeviceDetailPage */}
      <Outlet />
    </div>
  );
};

// Wrapper with CustomerFilterProvider
const AdminPortal = () => {
  return (
    <CustomerFilterProvider>
      <AdminPortalContent />
    </CustomerFilterProvider>
  );
};

export default AdminPortal;
