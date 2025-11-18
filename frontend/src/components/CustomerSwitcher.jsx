import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Check, ChevronDown } from 'lucide-react';

const CustomerSwitcher = ({ onTenantChange }) => {
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async () => {
    console.log('[CustomerSwitcher] fetchCustomers called');
    try {
      let allCustomers = [];
      
      // Try to fetch customers from old system (may not exist)
      try {
        console.log('[CustomerSwitcher] Fetching from /api/customers/list...');
        const customersResult = await apiCall('/api/customers/list');
        console.log('[CustomerSwitcher] Customers result:', customersResult);
        if (customersResult && customersResult.success && customersResult.data) {
          allCustomers = [...(customersResult.data.customers || [])];
        }
      } catch (error) {
        // Customers endpoint doesn't exist, that's ok
        console.log('[CustomerSwitcher] Customers endpoint not available:', error);
      }
      
      // Fetch tenants from new system
      try {
        console.log('[CustomerSwitcher] Fetching from /api/tenants/...');
        const tenantsResult = await apiCall('/api/tenants/');
        console.log('[CustomerSwitcher] Tenants result:', tenantsResult);
        
        // Check if tenants are in 'data' or 'tenants' field
        const tenantsList = tenantsResult?.tenants || tenantsResult?.data;
        
        if (tenantsList && Array.isArray(tenantsList)) {
          console.log('[CustomerSwitcher] Tenants found:', tenantsList.length);
          const tenants = tenantsList.map(tenant => ({
            id: tenant.tenant_id,
            name: tenant.display_name || tenant.name,
            type: 'tenant' // Mark as tenant for identification
          }));
          console.log('[CustomerSwitcher] Mapped tenants:', tenants);
          allCustomers = [...allCustomers, ...tenants];
        } else {
          console.log('[CustomerSwitcher] No tenants in result. Result structure:', tenantsResult);
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

  const fetchCurrentCustomer = async () => {
    try {
      const result = await apiCall('/api/customers/current/info');
      if (result && result.success && result.data) {
        setCurrentCustomer(result.data.customer);
      }
    } catch (error) {
      // Current customer endpoint doesn't exist, default to "Alle Kunden"
      console.log('Current customer endpoint not available, showing all');
      setCurrentCustomer(null);
    }
  };

  const handleCustomerSwitch = async (customerId) => {
    setLoading(true);
    try {
      // Set the current customer
      const selectedCust = customers.find(c => c.id === customerId);
      setCurrentCustomer(selectedCust || null);
      
      // Call the callback if provided
      if (onTenantChange) {
        onTenantChange(customerId || 'all');
      }
      
      console.log('Switch to customer:', customerId);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[CustomerSwitcher] Component mounted, fetching data...');
    fetchCustomers();
    fetchCurrentCustomer();
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
          {currentCustomer ? currentCustomer.name : 'Alle Kunden'}
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
              
              {/* All Customers Option */}
              <button
                onClick={() => handleCustomerSwitch(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  !currentCustomer
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
                {!currentCustomer && <Check className="h-4 w-4" />}
              </button>

              {/* Customer List */}
              <div className="my-2 border-t border-gray-700" />
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSwitch(customer.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentCustomer?.id === customer.id
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
                  {currentCustomer?.id === customer.id && <Check className="h-4 w-4" />}
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
