import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomerFilter } from '../contexts/CustomerFilterContext';
import { ChevronDown, Building2, Check } from 'lucide-react';

const CustomerDropdown = () => {
  const { theme } = useTheme();
  const { selectedCustomer, setSelectedCustomer, customers } = useCustomerFilter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customerEmail) => {
    setSelectedCustomer(customerEmail);
    setIsOpen(false);
  };

  const getSelectedCustomerName = () => {
    if (selectedCustomer === 'all') {
      return 'Alle Kunden';
    }
    const customer = customers.find(c => c.email === selectedCustomer);
    return customer ? customer.company : 'Kunde auswählen';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] hover:bg-[#333333] border border-gray-700 text-white'
            : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-900'
        }`}
      >
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">{getSelectedCustomerName()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-2xl z-50 overflow-hidden ${
          theme === 'dark' ? 'bg-[#2a2a2a] border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {/* All Customers Option */}
          <button
            onClick={() => handleSelectCustomer('all')}
            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
              theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'
            } ${
              selectedCustomer === 'all' ? (theme === 'dark' ? 'bg-[#333333]' : 'bg-gray-50') : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <Building2 className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Alle Kunden
              </span>
            </div>
            {selectedCustomer === 'all' && (
              <Check className="h-5 w-5 text-[#c00000]" />
            )}
          </button>

          {/* Divider */}
          <div className={`h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

          {/* Customer List */}
          <div className="max-h-64 overflow-y-auto">
            {customers.map((customer) => (
              <button
                key={customer.email}
                onClick={() => handleSelectCustomer(customer.email)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'
                } ${
                  selectedCustomer === customer.email ? (theme === 'dark' ? 'bg-[#333333]' : 'bg-gray-50') : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    customer.active ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {customer.company}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {customer.name}
                    </p>
                  </div>
                </div>
                {selectedCustomer === customer.email && (
                  <Check className="h-5 w-5 text-[#c00000]" />
                )}
              </button>
            ))}
          </div>

          {customers.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                Keine Kunden vorhanden
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDropdown;
