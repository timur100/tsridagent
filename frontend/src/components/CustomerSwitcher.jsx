import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Check, ChevronDown } from 'lucide-react';

const CustomerSwitcher = () => {
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show for super_admin
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  useEffect(() => {
    fetchCustomers();
    fetchCurrentCustomer();
  }, []);

  const fetchCustomers = async () => {
    try {
      const result = await apiCall('/api/customers/list');
      if (result.success && result.data) {
        setCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCurrentCustomer = async () => {
    try {
      const result = await apiCall('/api/customers/current/info');
      if (result.success && result.data) {
        setCurrentCustomer(result.data.customer);
      }
    } catch (error) {
      console.error('Error fetching current customer:', error);
    }
  };

  const handleCustomerSwitch = async (customerId) => {
    setLoading(true);
    try {
      // TODO: Implement customer switch endpoint
      // For now, we'll need to update JWT token with new customer_id
      console.log('Switch to customer:', customerId);
      
      // In production: Call /api/admin/switch-customer
      // Then update JWT token and reload
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching customer:', error);
    } finally {
      setLoading(false);
    }
  };

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
