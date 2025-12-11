import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, useNavigate, useMatch, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useTenant } from '../contexts/TenantContext';
import { CustomerFilterProvider, useCustomerFilter } from '../contexts/CustomerFilterContext';
import { LogOut, MapPin, Monitor, Users, Settings, Zap, FileText, Shield, Package, PackageCheck, ChevronDown, UserCheck, Key, Search, Plus, Headphones, Boxes, Bell, ShoppingCart, FolderOpen, Fingerprint, Ticket, AlertTriangle, RefreshCw, Circle, MessageSquare, Lightbulb, FlaskConical, Car, ParkingCircle, Clock, CreditCard, Truck, TrendingUp, Eye, CheckCircle, DollarSign, Video, Radio, Activity, Grid3x3, UtensilsCrossed, Bike, Navigation, Calendar, Cpu, ChefHat } from 'lucide-react';
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
import AssetSettings from '../components/AssetSettings';
import AssetManagement from '../components/AssetManagement';
import BrandingSettings from '../components/BrandingSettings';
import LicenseManagement from '../components/LicenseManagement';
import HardwareLicenseManagement from '../components/HardwareLicenseManagement';
import SoftwareLicenseManagement from '../components/SoftwareLicenseManagement';
import APIKeysManagement from '../components/APIKeysManagement';
import ComponentsManagement from '../components/ComponentsManagement';
import ResourcesManagement from './ResourcesManagement';
import SettingsSidebar from '../components/SettingsSidebar';
import RnDSidebar from '../components/RnDSidebar';
import VehicleManagement from '../components/VehicleManagement';
import QuickMenuManagement from '../components/QuickMenuManagement';
import CustomerSwitcher from '../components/CustomerSwitcher';
import ServicesConfiguration from '../components/ServicesConfiguration';
import KioskManagement from '../components/KioskManagement';
import KioskConfiguration from '../components/KioskConfiguration';
import KioskMonitoring from '../components/KioskMonitoring';
import KeyAutomatManagement from '../components/KeyAutomatManagement';
import KeyAutomatManagementEnhanced from '../components/KeyAutomatManagementEnhanced';
import KeyAutomatHierarchical from '../components/KeyAutomatHierarchical';
import ScannerPinSettings from '../components/ScannerPinSettings';
import TenantsPage from './TenantsPage';
import TenantDetailPage from './TenantDetailPage';
import SubscriptionPlans from './SubscriptionPlans';
import UsersRolesPage from './UsersRolesPage';
import DashboardGridSimple from '../components/DashboardGridSimple';
import ParkingOverview from './ParkingOverview';
import SubTabNavigation from '../components/SubTabNavigation';
import CameraGrid from '../components/CameraGrid';
import CameraManagement from '../components/CameraManagement';
import EuropcarManagement from '../components/EuropcarManagement';
import DHLShipping from '../components/DHLShipping';
import DocumentScanPage from '../components/DocumentScanPage';
import TimeTrackingPage from '../components/TimeTrackingPage';
import PlacetelManagement from '../components/PlacetelManagement';
import FleetManagement from '../components/FleetManagement';
import AIAnalysisManagement from '../components/AIAnalysisManagement';
import AISearchManagement from '../components/AISearchManagement';
import ImageProcessingManagement from '../components/ImageProcessingManagement';
import AutomationManagement from '../components/AutomationManagement';
import DataCheckPage from '../components/DataCheckPage';
import FastfoodMenuManagement from '../components/FastfoodMenuManagement';
import OrderKiosk from '../components/OrderKiosk';
import KioskTerminal from '../components/KioskTerminal';
import FastfoodOrdersManagement from '../components/FastfoodOrdersManagement';
import KitchenDisplay from '../components/KitchenDisplay';
import CustomerDisplay from '../components/CustomerDisplay';
import FastfoodTerminalManagement from '../components/FastfoodTerminalManagement';
import FastfoodStationManagement from '../components/FastfoodStationManagement';
import DriverManagement from '../components/DriverManagement';
import DeliveryZoneManagement from '../components/DeliveryZoneManagement';
import LicensePlateRecognition from '../components/LicensePlateRecognition';
import USBDeviceManager from '../components/USBDeviceManager';
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
                          location.pathname.includes('/vehicles/') ||
                          location.pathname.includes('/in-preparation') ||
                          location.pathname.includes('/ideas') ||
                          (location.pathname.includes('/id-checks/') && !location.pathname.endsWith('/id-checks')));
  
  // Determine initial activeTab based on current path
  const getInitialTab = () => {
    if (location.pathname.includes('/id-checks')) return 'id-checks';
    return 'dashboard';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedTenantIdForDetail, setSelectedTenantIdForDetail] = useState(null); // For TenantDetailPage navigation
  const [assetsSubTab, setAssetsSubTab] = useState('hardware'); // hardware or software
  const [licenseSubTab, setLicenseSubTab] = useState('hardware'); // hardware or software
  const [parkingSubTab, setParkingSubTab] = useState('overview'); // overview, history, violations, config, whitelist
  const [vehicleSubTab, setVehicleSubTab] = useState('overview'); // overview, list, add, reports
  const [facematchSubTab, setFacematchSubTab] = useState('overview'); // overview, compare, history, settings
  const [fingerprintSubTab, setFingerprintSubTab] = useState('overview'); // overview, scan, history, settings
  const [irisSubTab, setIrisSubTab] = useState('overview'); // overview, scan, history, settings
  const [licensePlateSubTab, setLicensePlateSubTab] = useState('overview'); // overview, recognition, history, settings
  const [fleetSubTab, setFleetSubTab] = useState('overview'); // overview, vehicles, drivers, maintenance, reports
  const [europcarSubTab, setEuropcarSubTab] = useState('vehicles'); // vehicles, reservations, customers, contracts, returns, reports
  const [parkingSystemSubTab, setParkingSystemSubTab] = useState('overview'); // overview, access, monitoring, reports
  const [parkingPaymentSubTab, setParkingPaymentSubTab] = useState('overview'); // overview, transactions, pricing, reports
  const [accessControlSubTab, setAccessControlSubTab] = useState('overview'); // overview, access, visitors, logs
  const [timeTrackingSubTab, setTimeTrackingSubTab] = useState('overview'); // overview, terminal, reports, settings
  const [controlSubTab, setControlSubTab] = useState('overview'); // overview, devices, automation, settings
  const [surveillanceSubTab, setSurveillanceSubTab] = useState('overview'); // overview, cameras, monitoring, alerts
  const [fastfoodSubTab, setFastfoodSubTab] = useState('overview'); // overview, menu, orders, analytics
  const [ordersView, setOrdersView] = useState('management'); // management, kiosk, kitchen, customer
  const [deliverySubTab, setDeliverySubTab] = useState('overview'); // overview, orders, drivers, tracking
  const [mobilitySubTab, setMobilitySubTab] = useState('overview'); // overview, vehicles, bookings, routes
  const [kioskManagementSubTab, setKioskManagementSubTab] = useState('overview'); // overview, list, add, settings
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
  const [deviceStatusFilter, setDeviceStatusFilter] = useState(null); // For filtering devices by status (online/offline)
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
  const [rndTab, setRndTab] = useState('facematch');
  const [rndSidebarCollapsed, setRndSidebarCollapsed] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null); // For opening vehicle detail from global search
  const [inventoryTab, setInventoryTab] = useState('items'); // 'items' or 'goods-receipt'
  const [companyLogoDark, setCompanyLogoDark] = useState(null);
  
  // Reset selectedVehicleId when changing tabs
  useEffect(() => {
    if (rndTab !== 'vehicle-management') {
      setSelectedVehicleId(null);
    }
  }, [rndTab]);
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

  // Sync activeTab with current URL
  useEffect(() => {
    if (location.pathname.includes('/id-checks')) {
      setActiveTab('id-checks');
    }
  }, [location.pathname]);

  // Clear new orders badge when orders tab is viewed
  useEffect(() => {
    if (activeTab === 'orders') {
      setNewOrdersCount(0);
    }
    if (activeTab === 'support') {
      setNewTicketsCount(0);
    }
    // Reset device status filter when leaving devices tab
    if (activeTab !== 'devices') {
      setDeviceStatusFilter(null);
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
                  if (result.type === 'asset') {
                    // Open Asset Management with this asset
                    setActiveTab('assets');
                    setAssetsSubTab('hardware');
                    // Show asset details modal after tab switch
                    setTimeout(() => {
                      if (window.showAssetDetails) {
                        window.showAssetDetails(result.data.asset_id, result.data.tenant_id);
                      } else {
                        toast.success(`Asset gefunden: ${result.data.asset_id}`);
                      }
                    }, 200);
                  } else if (result.type === 'vehicle') {
                    // Open vehicle detail in Fahrzeugverwaltung
                    const vehicleId = result.data.id || result.id;
                    setRndTab('vehicle-management');
                    setSelectedVehicleId(vehicleId);
                  } else if (result.type === 'standort') {
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
                  } else if (result.type === 'id-check') {
                    // Navigate to ID-Check Detail Page
                    const checkId = result.data.id || result.id;
                    navigate(`/portal/admin/id-checks/${checkId}`);
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
              
              {/* Ideas Button - Navigate to Ideas Page */}
              <button
                onClick={() => navigate('/portal/admin/ideas')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-yellow-400'
                    : 'hover:bg-gray-100 text-yellow-600'
                }`}
                title="Ideen & Verbesserungsvorschläge"
              >
                <Lightbulb className="h-5 w-5" />
              </button>
              
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
                  { id: 'assets', label: 'Assets', icon: Boxes },
                  { id: 'devices', label: 'Devices', icon: Monitor },
                  { id: 'locations', label: 'Locations', icon: MapPin },
                  { id: 'inventory', label: 'Inventory', icon: Package },
                  { id: 'orders', label: 'Orders', icon: ShoppingCart },
                  { id: 'support', label: 'Support', icon: Headphones },
                  { id: 'licenses', label: 'Licenses', icon: Key },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'rnd', label: 'R&D', icon: FlaskConical }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      // Navigate to nested routes for certain tabs
                      if (tab.id === 'id-checks') {
                        navigate('/portal/admin/id-checks');
                      } else if (location.pathname !== '/portal/admin') {
                        // Navigate back to /portal/admin if we're on a nested route
                        navigate('/portal/admin');
                      }
                    }}
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

          {/* Content - only show when not on detail page and not on specific routes */}
          {!isOnDetailPage && 
           !location.pathname.includes('/id-checks') && 
           !location.pathname.includes('/facematch') && 
           !location.pathname.includes('/fingerprint') && 
           !location.pathname.includes('/ki-search') && 
           !location.pathname.includes('/ideas') && (
          <main className="px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Old ID-Checks Sub-Tabs - Now moved above */}
        {false && activeTab === 'id-checks' && (
          <div className={`mb-4 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  'bg-[#c00000] text-white'
                }`}
              >
                <FileText className="h-5 w-5" />
                Dokumentenscan
              </button>
              <button
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-[#3a3a3a]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-5 w-5" />
                Facematch
              </button>
              <button
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-[#3a3a3a]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Fingerprint className="h-5 w-5" />
                Fingerprint
              </button>
              <button
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-[#3a3a3a]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Search className="h-5 w-5" />
                KI-Suche
              </button>
            </div>
          </div>
        )}
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
              
              <DashboardGridSimple>
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
                <Card 
                  onClick={() => {
                    setActiveTab('devices');
                    setDeviceStatusFilter('online');
                    setDeviceListKey(prev => prev + 1);
                  }}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
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
                <Card 
                  onClick={() => {
                    setActiveTab('devices');
                    setDeviceStatusFilter('offline');
                    setDeviceListKey(prev => prev + 1);
                  }}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
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
                
                {/* Neue Bestellungen */}
                {newOrdersCount > 0 && (
                  <Card 
                    onClick={() => setActiveTab('orders')}
                    className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-yellow-50 border-2 border-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 animate-heartbeat'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                          Neue Bestellungen
                        </p>
                        <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                          {newOrdersCount}
                        </p>
                      </div>
                      <ShoppingCart className={`h-12 w-12 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} animate-bounce`} />
                    </div>
                  </Card>
                )}

                {/* Neue Tickets */}
                {newTicketsCount > 0 && (
                  <Card 
                    onClick={() => setActiveTab('support')}
                    className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-orange-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-orange-50 border-2 border-orange-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 animate-heartbeat'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-800'}`}>
                          Neue Tickets
                        </p>
                        <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                          {newTicketsCount}
                        </p>
                      </div>
                      <Headphones className={`h-12 w-12 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'} animate-bounce`} />
                    </div>
                  </Card>
                )}

                {/* Change Requests - Always show */}
                <Card 
                  onClick={() => setActiveTab('support')}
                  className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                    newChangeRequestsCount > 0
                      ? theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-2 border-purple-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1 animate-heartbeat' 
                        : 'bg-purple-50 border-2 border-purple-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 animate-heartbeat'
                      : theme === 'dark'
                        ? 'bg-[#2a2a2a] border border-purple-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1'
                        : 'bg-purple-50 border border-purple-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-800'}`}>
                        Change Requests
                      </p>
                      <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                        {newChangeRequestsCount}
                      </p>
                    </div>
                    <FileText className={`h-12 w-12 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} ${newChangeRequestsCount > 0 ? 'animate-bounce' : ''}`} />
                  </div>
                </Card>
                
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
              </DashboardGridSimple>
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
              <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gerät</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standort</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>IP Adresse</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zuletzt gesehen</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                    {filteredDevices.map((device) => (
                      <tr key={device.device_id} className={`border-t cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap font-mono">
                          <div>
                            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{device.device_id}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{device.station_name}</div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {device.location_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            device.status === 'online'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {device.ip_address || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {device.last_seen ? new Date(device.last_seen).toLocaleString('de-DE') : 'Nie'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold">
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
              initialStatusFilter={deviceStatusFilter}
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
            <div className={`mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
              <div className="flex gap-2">
                <button
                  onClick={() => setInventoryTab('items')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    inventoryTab === 'items'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Package className="h-5 w-5" />
                  Inventar
                </button>
                <button
                  onClick={() => setInventoryTab('goods-receipt')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    inventoryTab === 'goods-receipt'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PackageCheck className="h-5 w-5" />
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

        {activeTab === 'assets' && (
          <div>
            {/* Assets Sub-Navigation */}
            <div className={`mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssetsSubTab('hardware')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assetsSubTab === 'hardware'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Monitor className="h-5 w-5" />
                  Hardware Assets
                </button>
                <button
                  onClick={() => setAssetsSubTab('software')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assetsSubTab === 'software'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Package className="h-5 w-5" />
                  Software Assets
                </button>
              </div>
            </div>

            {/* Render appropriate component based on sub-tab */}
            {assetsSubTab === 'hardware' && (
              <AssetManagement />
            )}
            {assetsSubTab === 'software' && (
              <AssetManagement />
            )}
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
            <div className={`mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
              <div className="flex gap-2">
                <button
                  onClick={() => setLicenseSubTab('hardware')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    licenseSubTab === 'hardware'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Key className="h-5 w-5" />
                  Hardware-Lizenzen (Scanner)
                </button>
                <button
                  onClick={() => setLicenseSubTab('software')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    licenseSubTab === 'software'
                      ? 'bg-[#c00000] text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-[#3a3a3a]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="h-5 w-5" />
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

        {activeTab === 'rnd' && (() => {
          return (
            <div className="flex h-[calc(100vh-180px)]">
              {/* R&D Sidebar */}
              <RnDSidebar
                activeSection={rndTab}
                onSectionChange={setRndTab}
                collapsed={rndSidebarCollapsed}
                onToggleCollapse={() => setRndSidebarCollapsed(!rndSidebarCollapsed)}
              />
              
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 w-full">
                  {/* Facematch */}
                    {rndTab === 'facematch' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'compare', label: 'Vergleichen', icon: Users },
                            { id: 'history', label: 'Historie', icon: Clock },
                            { id: 'settings', label: 'Einstellungen', icon: Settings }
                          ]}
                          activeTab={facematchSubTab}
                          onTabChange={setFacematchSubTab}
                        />

                        {facematchSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Facematch - Biometrische Gesichtserkennung
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                KI-gestützte Gesichtserkennung mit 468 Landmarks, Iris-Tracking und automatischer Hintergrund-Entfernung
                              </p>
                            </div>

                            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                                  <UserCheck className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Features
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="px-3 py-1.5 text-sm font-medium bg-green-500 bg-opacity-10 text-green-500 rounded-lg">
                                      ✓ MediaPipe Face Mesh
                                    </span>
                                    <span className="px-3 py-1.5 text-sm font-medium bg-blue-500 bg-opacity-10 text-blue-500 rounded-lg">
                                      ✓ Iris Tracking
                                    </span>
                                    <span className="px-3 py-1.5 text-sm font-medium bg-purple-500 bg-opacity-10 text-purple-500 rounded-lg">
                                      ✓ Auto-Capture
                                    </span>
                                    <span className="px-3 py-1.5 text-sm font-medium bg-orange-500 bg-opacity-10 text-orange-500 rounded-lg">
                                      ✓ Background Removal
                                    </span>
                                  </div>
                                  
                                  <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      Beschreibung
                                    </h4>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                      Hochpräzise Gesichtserkennung für biometrische Authentifizierung. Das System nutzt Google MediaPipe für 
                                      Echtzeit-Gesichtsmesh-Erkennung mit 468 Landmarks und automatischer Position-Optimierung.
                                    </p>
                                  </div>
                                  
                                  <button
                                    onClick={() => navigate('/portal/admin/id-checks/facematch')}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                  >
                                    Facematch starten →
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}
                        
                        {facematchSubTab === 'compare' && (
                          <div className="text-center p-12">
                            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Gesichtsvergleich - In Entwicklung</p>
                          </div>
                        )}
                        {facematchSubTab === 'history' && (
                          <div className="text-center p-12">
                            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Historie - In Entwicklung</p>
                          </div>
                        )}
                        {facematchSubTab === 'settings' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fingerprint - Placeholder */}
                    {rndTab === 'fingerprint' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'scan', label: 'Scannen', icon: Fingerprint },
                            { id: 'history', label: 'Historie', icon: Clock },
                            { id: 'settings', label: 'Einstellungen', icon: Settings }
                          ]}
                          activeTab={fingerprintSubTab}
                          onTabChange={setFingerprintSubTab}
                        />

                        {fingerprintSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Fingerprint - Fingerabdruck-Erkennung
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Biometrische Authentifizierung via Fingerabdruck
                              </p>
                            </div>
                            
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <Fingerprint className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Entwicklung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Dieses Feature wird derzeit entwickelt und steht bald zur Verfügung.
                              </p>
                            </Card>
                          </div>
                        )}

                        {fingerprintSubTab === 'scan' && (
                          <div className="text-center p-12">
                            <Fingerprint className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Scan-Funktion - In Entwicklung</p>
                          </div>
                        )}
                        {fingerprintSubTab === 'history' && (
                          <div className="text-center p-12">
                            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Historie - In Entwicklung</p>
                          </div>
                        )}
                        {fingerprintSubTab === 'settings' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Iris Scan - Placeholder */}
                    {rndTab === 'iris-scan' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'scan', label: 'Scannen', icon: Eye },
                            { id: 'history', label: 'Historie', icon: Clock },
                            { id: 'settings', label: 'Einstellungen', icon: Settings }
                          ]}
                          activeTab={irisSubTab}
                          onTabChange={setIrisSubTab}
                        />

                        {irisSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Iris Scan - Iris-Erkennung
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Hochpräzise biometrische Authentifizierung durch Iris-Scan
                              </p>
                            </div>
                            
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="inline-block p-4 bg-blue-500 bg-opacity-10 rounded-full mb-4">
                                <svg className="h-16 w-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </div>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Dieses Feature befindet sich in der Planungsphase.
                              </p>
                            </Card>
                          </div>
                        )}

                        {irisSubTab === 'scan' && (
                          <div className="text-center p-12">
                            <Eye className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Scan-Funktion - In Entwicklung</p>
                          </div>
                        )}
                        {irisSubTab === 'history' && (
                          <div className="text-center p-12">
                            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Historie - In Entwicklung</p>
                          </div>
                        )}
                        {irisSubTab === 'settings' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Kennzeichenerkennung */}
                    {rndTab === 'license-plate-recognition' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'recognition', label: 'Erkennung', icon: Car },
                            { id: 'history', label: 'Historie', icon: Clock },
                            { id: 'settings', label: 'Einstellungen', icon: Settings }
                          ]}
                          activeTab={licensePlateSubTab}
                          onTabChange={setLicensePlateSubTab}
                        />

                        {licensePlateSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Kennzeichenerkennung (LPR)
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Automatische Erkennung und Verarbeitung von Fahrzeugkennzeichen
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                                  <Car className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Hauptfunktionen
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Echtzeit-Kennzeichenerkennung mit KI</li>
                                    <li>✓ Unterstützung für EU-Kennzeichen</li>
                                    <li>✓ Integration mit Fahrzeugdatenbanken</li>
                                    <li>✓ Automatische Zufahrtskontrolle</li>
                                    <li>✓ Videostream-Verarbeitung</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                KI-basierte Kennzeichenerkennung wird entwickelt
                              </p>
                            </Card>
                          </div>
                        )}

                        {licensePlateSubTab === 'recognition' && (
                          <LicensePlateRecognition />
                        )}
                        {licensePlateSubTab === 'history' && (
                          <div className="text-center p-12">
                            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Historie - In Entwicklung</p>
                          </div>
                        )}
                        {licensePlateSubTab === 'settings' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fahrzeugverwaltung */}
                    {rndTab === 'vehicle-management' && (
                      <div>
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'list', label: 'Fahrzeugliste', icon: Car },
                            { id: 'add', label: 'Hinzufügen', icon: Plus },
                            { id: 'reports', label: 'Berichte', icon: FileText }
                          ]}
                          activeTab={vehicleSubTab}
                          onTabChange={setVehicleSubTab}
                        />

                        {vehicleSubTab === 'overview' && (
                          <div className="mb-6">
                            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              Fahrzeugverwaltung
                            </h2>
                            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Zentrale Verwaltung aller Fahrzeuge und Fahrzeugdaten
                            </p>
                          </div>
                        )}
                        {vehicleSubTab === 'list' && (
                          <div className="text-center p-12">
                            <Car className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Fahrzeugliste - In Entwicklung</p>
                          </div>
                        )}
                        {vehicleSubTab === 'add' && (
                          <div className="text-center p-12">
                            <Plus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Fahrzeug hinzufügen - In Entwicklung</p>
                          </div>
                        )}
                        {vehicleSubTab === 'reports' && (
                          <div className="text-center p-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Berichte - In Entwicklung</p>
                          </div>
                        )}
                        
                        {vehicleSubTab === 'overview' && (
                          <>
                            <VehicleManagement 
                              initialVehicleId={selectedVehicleId}
                              key={selectedVehicleId} // Force re-render when vehicle changes
                            />
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Flottenmanagement */}
                    {rndTab === 'fleet-management' && (
                      <FleetManagement selectedTenantId={selectedTenantId} />
                    )}
                    
                    {/* Europcar Integration */}
                    {rndTab === 'europcar-integration' && (
                      <EuropcarManagement 
                        activeSubTab={europcarSubTab}
                        setActiveSubTab={setEuropcarSubTab}
                      />
                    )}
                    
                    {/* Parkhaussystem */}
                    {rndTab === 'parking-system' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'access', label: 'Zufahrtskontrolle', icon: Shield },
                            { id: 'monitoring', label: 'Überwachung', icon: Video },
                            { id: 'reports', label: 'Berichte', icon: FileText }
                          ]}
                          activeTab={parkingSystemSubTab}
                          onTabChange={setParkingSystemSubTab}
                        />

                        {parkingSystemSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Parkhaussystem mit Kennzeichenerkennung
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Intelligentes Parkraummanagement
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                                  <ParkingCircle className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    System-Features
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Kennzeichenerkennung Ein-/Ausfahrt</li>
                                    <li>✓ Automatische Schrankensteuerung</li>
                                    <li>✓ Echtzeit-Belegungsanzeige</li>
                                    <li>✓ Parkplatz-Reservierung</li>
                                    <li>✓ Besucherverwaltung</li>
                                    <li>✓ Integration mit Bezahlsystem</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Intelligentes Parkhaussystem in Entwicklung
                              </p>
                            </Card>
                          </div>
                        )}

                        {parkingSystemSubTab === 'access' && (
                          <div className="text-center p-12">
                            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Zufahrtskontrolle - In Entwicklung</p>
                          </div>
                        )}
                        {parkingSystemSubTab === 'monitoring' && (
                          <div className="text-center p-12">
                            <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Überwachung - In Entwicklung</p>
                          </div>
                        )}
                        {parkingSystemSubTab === 'reports' && (
                          <div className="text-center p-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Berichte - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Parkhaus-Bezahlsystem */}
                    {rndTab === 'parking-payment' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'transactions', label: 'Transaktionen', icon: CreditCard },
                            { id: 'pricing', label: 'Preisgestaltung', icon: DollarSign },
                            { id: 'reports', label: 'Berichte', icon: FileText }
                          ]}
                          activeTab={parkingPaymentSubTab}
                          onTabChange={setParkingPaymentSubTab}
                        />

                        {parkingPaymentSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Parkhaus-Bezahlsystem
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Automatisiertes Bezahlsystem für Parkgebühren
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-500 bg-opacity-10 rounded-lg">
                                  <CreditCard className="h-8 w-8 text-green-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Zahlungsmethoden
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Kennzeichen-basierte Abrechnung</li>
                                    <li>✓ Kreditkarten-Integration</li>
                                    <li>✓ Mobile Payment (Apple Pay, Google Pay)</li>
                                    <li>✓ Monatskarten & Abonnements</li>
                                    <li>✓ Automatische Rechnungsstellung</li>
                                    <li>✓ Integration mit Buchhaltungssystemen</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Entwicklung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Bezahlsystem-Integration wird vorbereitet
                              </p>
                            </Card>
                          </div>
                        )}

                        {parkingPaymentSubTab === 'transactions' && (
                          <div className="text-center p-12">
                            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Transaktionen - In Entwicklung</p>
                          </div>
                        )}
                        {parkingPaymentSubTab === 'pricing' && (
                          <div className="text-center p-12">
                            <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Preisgestaltung - In Entwicklung</p>
                          </div>
                        )}
                        {parkingPaymentSubTab === 'reports' && (
                          <div className="text-center p-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Berichte - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Parkzeitüberschreitung */}
                    {rndTab === 'parking-overstay' && (
                      <div>
                        {/* Parking Sub-Navigation */}
                        <div className={`mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
                          <div className="flex gap-2 overflow-x-auto">
                            <button
                              onClick={() => setParkingSubTab('overview')}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                parkingSubTab === 'overview'
                                  ? 'bg-[#c00000] text-white'
                                  : theme === 'dark'
                                  ? 'text-gray-400 hover:bg-[#3a3a3a]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <TrendingUp className="h-5 w-5" />
                              Übersicht
                            </button>
                            <button
                              onClick={() => setParkingSubTab('history')}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                parkingSubTab === 'history'
                                  ? 'bg-[#c00000] text-white'
                                  : theme === 'dark'
                                  ? 'text-gray-400 hover:bg-[#3a3a3a]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Clock className="h-5 w-5" />
                              Historie
                            </button>
                            <button
                              onClick={() => setParkingSubTab('violations')}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                parkingSubTab === 'violations'
                                  ? 'bg-[#c00000] text-white'
                                  : theme === 'dark'
                                  ? 'text-gray-400 hover:bg-[#3a3a3a]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <AlertTriangle className="h-5 w-5" />
                              Verstöße
                            </button>
                            <button
                              onClick={() => setParkingSubTab('config')}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                parkingSubTab === 'config'
                                  ? 'bg-[#c00000] text-white'
                                  : theme === 'dark'
                                  ? 'text-gray-400 hover:bg-[#3a3a3a]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Settings className="h-5 w-5" />
                              Konfiguration
                            </button>
                            <button
                              onClick={() => setParkingSubTab('whitelist')}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                parkingSubTab === 'whitelist'
                                  ? 'bg-[#c00000] text-white'
                                  : theme === 'dark'
                                  ? 'text-gray-400 hover:bg-[#3a3a3a]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Shield className="h-5 w-5" />
                              Whitelist
                            </button>
                          </div>
                        </div>

                        {/* Render appropriate component based on sub-tab */}
                        {parkingSubTab === 'overview' && (
                          <ParkingOverview />
                        )}
                        {parkingSubTab === 'history' && (
                          <div className="text-center p-12">
                            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Historie-Ansicht - In Entwicklung</p>
                          </div>
                        )}
                        {parkingSubTab === 'violations' && (
                          <div className="text-center p-12">
                            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Verstöße-Ansicht - In Entwicklung</p>
                          </div>
                        )}
                        {parkingSubTab === 'config' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Konfiguration - In Entwicklung</p>
                          </div>
                        )}
                        {parkingSubTab === 'whitelist' && (
                          <div className="text-center p-12">
                            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Whitelist-Verwaltung - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Zutrittssysteme */}
                    {rndTab === 'access-control' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'access', label: 'Zutrittsverwaltung', icon: Shield },
                            { id: 'visitors', label: 'Besucher', icon: Users },
                            { id: 'logs', label: 'Protokolle', icon: FileText }
                          ]}
                          activeTab={accessControlSubTab}
                          onTabChange={setAccessControlSubTab}
                        />

                        {accessControlSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Zutrittssysteme
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Intelligente Zutrittskontrolle und Sicherheitssysteme
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-500 bg-opacity-10 rounded-lg">
                                  <Shield className="h-8 w-8 text-red-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Zutrittsmethoden
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Biometrische Authentifizierung (Gesicht, Fingerabdruck)</li>
                                    <li>✓ RFID-Karten & Transponder</li>
                                    <li>✓ Mobile Access (Smartphone)</li>
                                    <li>✓ PIN-Code Eingabe</li>
                                    <li>✓ QR-Code Scanning</li>
                                    <li>✓ Zeitbasierte Zugangsrechte</li>
                                    <li>✓ Besuchermanagement</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Entwicklung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Zutrittskontrollsystem wird implementiert
                              </p>
                            </Card>
                          </div>
                        )}

                        {accessControlSubTab === 'access' && (
                          <div className="text-center p-12">
                            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Zutrittsverwaltung - In Entwicklung</p>
                          </div>
                        )}
                        {accessControlSubTab === 'visitors' && (
                          <div className="text-center p-12">
                            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Besucherverwaltung - In Entwicklung</p>
                          </div>
                        )}
                        {accessControlSubTab === 'logs' && (
                          <div className="text-center p-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Protokolle - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Zeiterfassung */}
                    {rndTab === 'time-tracking' && (
                      <TimeTrackingPage />
                    )}
                    
                    {/* KI-Suche */}
                    {rndTab === 'ki-search' && (
                      <AISearchManagement />
                    )}

                    {/* Dokumentenanalyse */}
                    {rndTab === 'document-analysis' && (
                      <AIAnalysisManagement />
                    )}

                    {/* Anomalieerkennung */}
                    {rndTab === 'anomaly-detection' && (
                      <AIAnalysisManagement />
                    )}

                    {/* Hintergrund-Entfernung */}
                    {rndTab === 'background-removal' && (
                      <ImageProcessingManagement />
                    )}

                    {/* Bildverbesserung */}
                    {rndTab === 'image-enhancement' && (
                      <ImageProcessingManagement />
                    )}

                    {/* Erweiterte OCR */}
                    {rndTab === 'ocr-advanced' && (
                      <ImageProcessingManagement />
                    )}
                    
                    {/* Steuerung */}
                    {rndTab === 'control-system' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'devices', label: 'Geräte', icon: Radio },
                            { id: 'automation', label: 'Automatisierung', icon: Zap },
                            { id: 'settings', label: 'Einstellungen', icon: Settings }
                          ]}
                          activeTab={controlSubTab}
                          onTabChange={setControlSubTab}
                        />

                        {controlSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Steuerungssysteme
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Zentrale Steuerung und Verwaltung von IoT-Geräten
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-cyan-500 bg-opacity-10 rounded-lg">
                                  <Radio className="h-8 w-8 text-cyan-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Features
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Zentrale Gerätesteuerung</li>
                                    <li>✓ IoT-Integration</li>
                                    <li>✓ Automatische Regelungen</li>
                                    <li>✓ Szenarien-Management</li>
                                    <li>✓ Remote-Zugriff</li>
                                    <li>✓ Echtzeit-Monitoring</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Steuerungssystem wird konzipiert
                              </p>
                            </Card>
                          </div>
                        )}

                        {controlSubTab === 'devices' && (
                          <div className="text-center p-12">
                            <Radio className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Geräteverwaltung - In Entwicklung</p>
                          </div>
                        )}
                        {controlSubTab === 'automation' && (
                          <div className="text-center p-12">
                            <Zap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Automatisierung - In Entwicklung</p>
                          </div>
                        )}
                        {controlSubTab === 'settings' && (
                          <div className="text-center p-12">
                            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Surveillance */}
                    {rndTab === 'surveillance-system' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'cameras', label: 'Kameras', icon: Video },
                            { id: 'monitoring', label: 'Monitoring', icon: Activity },
                            { id: 'alerts', label: 'Alarme', icon: Bell }
                          ]}
                          activeTab={surveillanceSubTab}
                          onTabChange={setSurveillanceSubTab}
                        />

                        {surveillanceSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Surveillance - IP-Kamera Überwachung
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Live-Ansicht aller registrierten Kameras im Raster
                              </p>
                            </div>
                            
                            <CameraGrid />
                          </div>
                        )}

                        {surveillanceSubTab === 'cameras' && (
                          <CameraManagement />
                        )}
                        {surveillanceSubTab === 'monitoring' && (
                          <div className="text-center p-12">
                            <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Live-Monitoring - In Entwicklung</p>
                          </div>
                        )}
                        {surveillanceSubTab === 'alerts' && (
                          <div className="text-center p-12">
                            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Alarm-System - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fastfood Bestellsystem */}
                    {rndTab === 'fastfood-system' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'menu', label: 'Menü-Verwaltung', icon: UtensilsCrossed },
                            { id: 'orders', label: 'Bestellungen', icon: ShoppingCart },
                            { id: 'terminals', label: 'Terminals', icon: Monitor },
                            { id: 'stations', label: 'Stationen', icon: ChefHat },
                            { id: 'delivery', label: 'Lieferservice', icon: Truck },
                            { id: 'analytics', label: 'Analysen', icon: FileText }
                          ]}
                          activeTab={fastfoodSubTab}
                          onTabChange={setFastfoodSubTab}
                        />

                        {fastfoodSubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Fastfood Bestellsystem
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Digitales Bestell- und Verwaltungssystem für Fastfood-Restaurants
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-500 bg-opacity-10 rounded-lg">
                                  <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Features
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Digitale Menü-Karten mit Bildern</li>
                                    <li>✓ Self-Service Kiosk-System</li>
                                    <li>✓ Mobile App Bestellung</li>
                                    <li>✓ Echtzeit-Küchen-Display</li>
                                    <li>✓ Zahlungsintegration (Karte, Cash, Mobile)</li>
                                    <li>✓ Gutschein & Rabatt-System</li>
                                    <li>✓ Umsatz & Verkaufsanalysen</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Fastfood Bestellsystem wird konzipiert
                              </p>
                            </Card>
                          </div>
                        )}

                        {fastfoodSubTab === 'menu' && (
                          <FastfoodMenuManagement />
                        )}
                        {fastfoodSubTab === 'orders' && (
                          <div className="space-y-4">
                            {/* Orders Sub Navigation */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                onClick={() => setOrdersView('management')}
                                variant={ordersView === 'management' ? 'default' : 'outline'}
                              >
                                📊 Bestellübersicht (Admin)
                              </Button>
                              <Button
                                onClick={() => setOrdersView('kiosk')}
                                variant={ordersView === 'kiosk' ? 'default' : 'outline'}
                              >
                                🖥️ Bestellterminal (Alt)
                              </Button>
                              <Button
                                onClick={() => setOrdersView('kioskNew')}
                                variant={ordersView === 'kioskNew' ? 'default' : 'outline'}
                                className="bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600"
                              >
                                ⭐ Kiosk-Terminal (NEU)
                              </Button>
                              <Button
                                onClick={() => setOrdersView('kitchen')}
                                variant={ordersView === 'kitchen' ? 'default' : 'outline'}
                              >
                                👨‍🍳 Küchendisplay (KDS)
                              </Button>
                              <Button
                                onClick={() => setOrdersView('customer')}
                                variant={ordersView === 'customer' ? 'default' : 'outline'}
                              >
                                📺 Kundendisplay
                              </Button>
                            </div>

                            {/* Content */}
                            {ordersView === 'management' && (
                              <FastfoodOrdersManagement tenantId="default-tenant" />
                            )}
                            {ordersView === 'kiosk' && (
                              <OrderKiosk tenantId="default-tenant" locationId="default-location" />
                            )}
                            {ordersView === 'kioskNew' && (
                              <KioskTerminal tenantId="default-tenant" locationId="default-location" />
                            )}
                            {ordersView === 'kitchen' && (
                              <KitchenDisplay tenantId="default-tenant" locationId="default-location" />
                            )}
                            {ordersView === 'customer' && (
                              <CustomerDisplay tenantId="default-tenant" locationId="default-location" />
                            )}
                          </div>
                        )}
                        {fastfoodSubTab === 'analytics' && (
                          <div className="text-center p-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Analysen - In Entwicklung</p>
                          </div>
                        )}
                        
                        {fastfoodSubTab === 'terminals' && (
                          <FastfoodTerminalManagement tenantId="default-tenant" />
                        )}
                        
                        {fastfoodSubTab === 'stations' && (
                          <FastfoodStationManagement tenantId="default-tenant" locationId="default-location" />
                        )}
                        
                        {fastfoodSubTab === 'delivery' && (
                          <div className="space-y-8">
                            <DeliveryZoneManagement tenantId="default-tenant" locationId="default-location" />
                            <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
                            <DriverManagement tenantId="default-tenant" locationId="default-location" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Lieferservice */}
                    {rndTab === 'delivery-service' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'orders', label: 'Aufträge', icon: Package },
                            { id: 'drivers', label: 'Fahrer', icon: Users },
                            { id: 'tracking', label: 'Live-Tracking', icon: Navigation }
                          ]}
                          activeTab={deliverySubTab}
                          onTabChange={setDeliverySubTab}
                        />

                        {deliverySubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Lieferservice Management
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Vollständige Lösung für Lieferdienst-Verwaltung und Logistik
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                                  <Truck className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Features
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ Auftrags-Management System</li>
                                    <li>✓ Echtzeit GPS-Tracking</li>
                                    <li>✓ Fahrer-App mit Navigation</li>
                                    <li>✓ Automatische Routenoptimierung</li>
                                    <li>✓ Kunden-Benachrichtigungen (SMS/Push)</li>
                                    <li>✓ Liefer-Zeitfenster-Planung</li>
                                    <li>✓ Proof of Delivery (Foto/Signatur)</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Lieferservice-System wird entwickelt
                              </p>
                            </Card>
                          </div>
                        )}

                        {deliverySubTab === 'orders' && (
                          <div className="text-center p-12">
                            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Auftrags-Verwaltung - In Entwicklung</p>
                          </div>
                        )}
                        {deliverySubTab === 'drivers' && (
                          <div className="text-center p-12">
                            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Fahrer-Management - In Entwicklung</p>
                          </div>
                        )}
                        {deliverySubTab === 'tracking' && (
                          <div className="text-center p-12">
                            <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Live-Tracking - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Workflow Builder */}
                    {rndTab === 'workflow-builder' && (
                      <AutomationManagement />
                    )}

                    {/* Stapelverarbeitung */}
                    {rndTab === 'batch-processing' && (
                      <AutomationManagement />
                    )}

                    {/* API Testing */}
                    {rndTab === 'api-testing' && (
                      <AutomationManagement />
                    )}

                    {/* Quick Menu Management */}
                    {rndTab === 'quick-menu' && (
                      <div className="w-full">
                        <QuickMenuManagement theme={theme} />
                      </div>
                    )}

                    {/* Kiosk Management */}
                    {rndTab === 'kiosk-management' && (
                      <div className="w-full">
                        <KioskManagement theme={theme} />
                      </div>
                    )}

                    {/* Kiosk Configuration */}
                    {rndTab === 'kiosk-configuration' && (
                      <div className="w-full">
                        <KioskConfiguration theme={theme} />
                      </div>
                    )}

                    {/* Kiosk Monitoring */}
                    {rndTab === 'kiosk-monitoring' && (
                      <div className="w-full">
                        <KioskMonitoring theme={theme} />
                      </div>
                    )}

                    {/* Key Automat */}
                    {rndTab === 'key-automat' && (
                      <KeyAutomatManagement />
                    )}

                    {/* Mobility Services */}
                    {rndTab === 'mobility-services' && (
                      <div className="w-full">
                        <SubTabNavigation
                          tabs={[
                            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                            { id: 'vehicles', label: 'Fahrzeuge', icon: Car },
                            { id: 'bookings', label: 'Buchungen', icon: Calendar },
                            { id: 'routes', label: 'Routen', icon: Navigation }
                          ]}
                          activeTab={mobilitySubTab}
                          onTabChange={setMobilitySubTab}
                        />

                        {mobilitySubTab === 'overview' && (
                          <div>
                            <div className="mb-6">
                              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Mobility Services
                              </h2>
                              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Shared Mobility, Carsharing und Mikromobilität-Lösungen
                              </p>
                            </div>
                            
                            <Card className={`p-6 mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-500 bg-opacity-10 rounded-lg">
                                  <Bike className="h-8 w-8 text-green-500" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Features
                                  </h3>
                                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>✓ E-Scooter & E-Bike Sharing</li>
                                    <li>✓ Carsharing-Platform</li>
                                    <li>✓ Mobile App mit GPS-Suche</li>
                                    <li>✓ Flexibles Preismodell (Minuten/Stunden/Tage)</li>
                                    <li>✓ IoT-Integration (Smart Locks)</li>
                                    <li>✓ Wartungs- & Batterie-Management</li>
                                    <li>✓ Multimodal Routing</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                In Planung
                              </h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Mobility Services-Platform wird konzipiert
                              </p>
                            </Card>
                          </div>
                        )}

                        {mobilitySubTab === 'vehicles' && (
                          <div className="text-center p-12">
                            <Car className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Fahrzeug-Verwaltung - In Entwicklung</p>
                          </div>
                        )}
                        {mobilitySubTab === 'bookings' && (
                          <div className="text-center p-12">
                            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Buchungs-System - In Entwicklung</p>
                          </div>
                        )}
                        {mobilitySubTab === 'routes' && (
                          <div className="text-center p-12">
                            <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500">Routen-Planung - In Entwicklung</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DHL Shipping */}
                    {rndTab === 'dhl-shipping' && (
                      <DHLShipping />
                    )}

                    {/* Placetel */}
                    {rndTab === 'placetel' && (
                      <PlacetelManagement />
                    )}

                    {/* Document Scan */}
                    {rndTab === 'document-scan' && (
                      <DocumentScanPage />
                    )}

                    {/* Data Check */}
                    {rndTab === 'data-check' && (
                      <DataCheckPage />
                    )}

                    {/* USB Device Manager */}
                    {rndTab === 'usb-devices' && (
                      <div className="w-full">
                        <div className="mb-6">
                          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            USB Device Manager
                          </h2>
                          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            USB-Geräte verwalten und testen (nur in Desktop App verfügbar)
                          </p>
                        </div>
                        <USBDeviceManager />
                      </div>
                    )}
                    
                    {/* Default Placeholder für alle anderen Tabs */}
                    {!['facematch', 'fingerprint', 'iris-scan', 'document-scan', 'ki-search', 'license-plate-recognition', 
                        'vehicle-management', 'fleet-management', 'europcar-integration', 'parking-system', 
                        'parking-payment', 'parking-overstay', 'access-control', 'time-tracking', 'control-system', 'surveillance-system',
                        'fastfood-system', 'delivery-service', 'mobility-services', 'dhl-shipping', 'placetel', 'data-check', 'usb-devices'].includes(rndTab) && (
                      <div className="w-full">
                        <div className="mb-6">
                          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {rndTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h2>
                          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Experimentelles Feature
                          </p>
                        </div>
                        
                        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                          <FlaskConical className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            In Planung
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Dieses Feature befindet sich in der Planungsphase und wird bald verfügbar sein.
                          </p>
                        </Card>
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })()}

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
                <div className="w-full">
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

                {settingsTab === 'assets' && (
                  <AssetSettings />
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
