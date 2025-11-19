import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Shield, Monitor, MapPin, ShoppingBag, Headphones } from 'lucide-react';
import { Button } from '../components/ui/button';
import ThemeToggle from '../components/ThemeToggle';
import PortalSwitcher from '../components/PortalSwitcher';
import CustomerPortalContent from '../components/CustomerPortalContent';
import CustomerTickets from '../components/CustomerTickets';
import CustomerGlobalSearch from '../components/CustomerGlobalSearch';
import toast from 'react-hot-toast';

const CustomerPortal = () => {
  const { user, logout, apiCall } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [companyLogoDark, setCompanyLogoDark] = useState(null);
  const [companyLogoLight, setCompanyLogoLight] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [tenantInfo, setTenantInfo] = useState(null);
  const [scanStats, setScanStats] = useState({
    total_scans: 0,
    correct_scans: 0,
    unknown_scans: 0,
    failed_scans: 0
  });

  // Set company name from user data immediately
  useEffect(() => {
    if (user) {
      console.log('[CustomerPortal] User object:', user);
      
      // Priority 1: Load tenant info if tenant_ids exist
      const fetchTenantInfo = async () => {
        try {
          const tenantIds = user.tenant_ids || [];
          console.log('[CustomerPortal] Tenant IDs:', tenantIds);
          
          if (tenantIds.length > 0) {
            const tenantId = tenantIds[0];
            console.log('[CustomerPortal] Fetching tenant:', tenantId);
            
            try {
              const tenantData = await apiCall(`/api/tenants/${tenantId}`);
              console.log('[CustomerPortal] Tenant data response:', tenantData);
              
              // Handle the apiCall wrapper response
              const tenant = tenantData?.data || tenantData;
              
              if (tenant && (tenant.display_name || tenant.name)) {
                console.log('[CustomerPortal] Setting company name from tenant:', tenant.display_name || tenant.name);
                setCompanyName(tenant.display_name || tenant.name);
                setTenantInfo(tenant);
              } else {
                console.warn('[CustomerPortal] Tenant data missing display_name/name');
              }
            } catch (tenantError) {
              console.error('[CustomerPortal] Error fetching tenant:', tenantError);
            }
          }
          
          // Priority 2: Fallback to user.company if no tenant_ids
          if (!tenantIds || tenantIds.length === 0) {
            if (user.company) {
              console.log('[CustomerPortal] Setting company from user.company:', user.company);
              setCompanyName(user.company);
            }
          }
        } catch (error) {
          console.error('[CustomerPortal] Error loading tenant info:', error);
        }
      };
      
      fetchTenantInfo();
    }
  }, [user, apiCall]);

  // Load company branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const result = await apiCall('/api/branding/logo');
        if (result.success && result.data) {
          setCompanyLogoDark(result.data.logo_url_dark);
          setCompanyLogoLight(result.data.logo_url_light);
          // Only set company name from branding if not already set from tenant
          if (!companyName) {
            setCompanyName(result.data.company_name || '');
          }
        }
      } catch (error) {


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

        console.error('Error fetching branding:', error);
      }
    };

    fetchBranding();
  }, [apiCall]);

  const handleLogout = () => {
    logout();
    toast.success('Erfolgreich abgemeldet');
  };

  const handleSearchNavigate = (tab, itemId) => {
    setActiveTab(tab);
    // You can add additional logic here to select/highlight the specific item
    // For now, just navigate to the tab
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        {/* Top Header Bar */}
        <div className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-16">
              {/* Left Side: Logo & Title */}
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                onClick={() => {
                  // Navigate to dashboard
                  setActiveTab('dashboard');
                  window.location.hash = '#dashboard';
                }}
              >
                {(theme === 'dark' ? companyLogoDark : companyLogoLight) ? (
                  // Show logo + "Kunden Portal" text (no company name - shown on right side)
                  <>
                    <img 
                      src={theme === 'dark' ? companyLogoDark : companyLogoLight} 
                      alt={companyName} 
                      className="h-10 w-auto max-w-[180px] object-contain"
                    />
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>Kunden Portal</h1>
                  </>
                ) : (
                  // Show default: Shield icon + "TSRID Kunden Portal" (no company name - shown on right side)
                  <>
                    <Shield className={`h-8 w-8 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`} />
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>{companyName} Kunden Portal</h1>
                  </>
                )}
              </div>
              
              {/* Center: Global Search */}
              <div className="flex-1 max-w-2xl mx-4">
                <CustomerGlobalSearch onNavigate={handleSearchNavigate} />
              </div>
              
              {/* Right Side: Portal Switcher, User Info, Theme Toggle, Logout */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <PortalSwitcher />
                <div className="text-right hidden lg:block">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.email || user?.name}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{companyName || user?.company || 'Kunde'}</p>
                </div>
                <ThemeToggle />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className={`flex items-center space-x-2 ${
                    theme === 'dark' 
                      ? 'border-[#c00000] text-white hover:bg-[#c00000]' 
                      : 'border-[#c00000] text-[#c00000] hover:bg-[#c00000] hover:text-white'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Abmelden</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs - Full Width */}
        <div className={`border-b ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Monitor },
                { id: 'devices', label: 'Geräte', icon: Monitor },
                { id: 'locations', label: 'Standorte', icon: MapPin },
                ...(user?.shop_enabled ? [{ id: 'shop', label: 'Shop', icon: ShoppingBag }] : []),
                { id: 'tickets', label: 'Support', icon: Headphones }
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
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <CustomerPortalContent 
          isImpersonation={false} 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          scanStats={scanStats}
        />
      </main>
    </div>
  );
};

export default CustomerPortal;

 
