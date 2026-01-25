import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Building2, Check, ChevronDown } from 'lucide-react';

const CustomerSwitcher = () => {
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  const { selectedTenantId, selectedTenantName, setSelectedTenant, isSuperAdmin } = useTenant();
  const [customers, setCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async () => {
    console.log('[CustomerSwitcher] fetchCustomers called');
    try {
      let allCustomers = [];
      
      // Fetch tenants from new system (primary source)
      try {
        console.log('[CustomerSwitcher] Fetching from /api/tenants/...');
        const tenantsResult = await apiCall('/api/tenants/');
        console.log('[CustomerSwitcher] Tenants result:', tenantsResult);
        
        // apiCall wraps response in { success, data, status }
        // So tenants are in tenantsResult.data.tenants
        const responseData = tenantsResult?.data || tenantsResult;
        const tenantsList = responseData?.tenants || responseData?.data;
        
        if (tenantsList && Array.isArray(tenantsList)) {
          console.log('[CustomerSwitcher] Tenants found:', tenantsList.length);
          // Filter: nur aktive Tenants mit Namen
          const tenants = tenantsList
            .filter(tenant => {
              const hasName = tenant.display_name || tenant.name;
              const isEnabled = tenant.enabled !== false; // Default to true if not specified
              return hasName && isEnabled;
            })
            .map(tenant => ({
              id: tenant.tenant_id,
              name: tenant.display_name || tenant.name,
              type: 'tenant'
            }));
          console.log('[CustomerSwitcher] Filtered tenants:', tenants);
          allCustomers = [...tenants];
        } else {
          console.log('[CustomerSwitcher] No tenants in result. ResponseData structure:', responseData);
        }
      } catch (error) {
        console.error('[CustomerSwitcher] Error fetching tenants:', error);
      }
      
      console.log('[CustomerSwitcher] Setting customers:', allCustomers);
      setCustomers(allCustomers);
    } catch (error) {
      console.error('[CustomerSwitcher] Error in fetchCustomers:', error);
    }
  };

  const handleCustomerSwitch = async (customerId, customerName) => {
    setLoading(true);
    try {
      // Update the global tenant context
      setSelectedTenant(customerId, customerName);
      
      console.log('[CustomerSwitcher] Switched to tenant:', { customerId, customerName });
      
      setIsOpen(false);
    } catch (error) {
      console.error('[CustomerSwitcher] Error switching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[CustomerSwitcher] Component mounted, fetching data...');
    fetchCustomers();
  }, []);

  // Only show for super_admin and admin
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        }`}
      >
        <Building2 className="h-4 w-4 text-[#c00000]" />
        <span className="text-sm font-medium">
          {selectedTenantName}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-20 ${
            theme === 'dark'
              ? 'bg-[#2a2a2a] border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="p-2">
              <p className={`text-xs font-medium px-3 py-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Kunde wechseln
              </p>
              
              {/* All Customers Option - only for super admin */}
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => handleCustomerSwitch('all', 'Alle Kunden')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTenantId === 'all'
                        ? theme === 'dark'
                          ? 'bg-[#c00000]/20 text-[#c00000]'
                          : 'bg-red-50 text-[#c00000]'
                        : theme === 'dark'
                        ? 'hover:bg-[#3a3a3a] text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                    disabled={loading}
                  >
                    <span>Alle Kunden</span>
                    {selectedTenantId === 'all' && <Check className="h-4 w-4" />}
                  </button>
                  <div className="my-2 border-t border-gray-700" />
                </>
              )}

              {/* Customer List */}
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSwitch(customer.id, customer.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTenantId === customer.id
                      ? theme === 'dark'
                        ? 'bg-[#c00000]/20 text-[#c00000]'
                        : 'bg-red-50 text-[#c00000]'
                      : theme === 'dark'
                      ? 'hover:bg-[#3a3a3a] text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                  disabled={loading}
                >
                  <span>{customer.name}</span>
                  {selectedTenantId === customer.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerSwitcher;
