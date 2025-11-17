import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { UserCircle, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerImpersonationDropdown = () => {
  const { apiCall } = useAuth();
  const { impersonateCustomer, isImpersonating } = useImpersonation();
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const result = await apiCall('/api/portal/users/list');
      if (result.success) {
        // Filter only customer role
        const customerUsers = (result.data.users || []).filter(u => u.role === 'customer');
        setCustomers(customerUsers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleSelectCustomer = async (customer) => {
    setLoading(true);
    setIsOpen(false);
    
    const result = await impersonateCustomer(customer);
    
    if (result.success) {
      toast.success(`Kundenansicht: ${customer.name}`);
    } else {
      toast.error(result.error || 'Fehler beim Wechseln der Ansicht');
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Don't show if already impersonating
  if (isImpersonating) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20 disabled:opacity-50"
      >
        <UserCircle className="h-4 w-4" />
        <span className="font-medium">Kundenansicht</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 w-80 bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kunde suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c00000] focus:border-transparent"
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Keine Kunden gefunden
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.email}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="p-2 rounded-lg bg-[#c00000]">
                      <UserCircle className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {customer.company}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {customer.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700 bg-[#1a1a1a]">
              <p className="text-xs text-gray-400">
                Wählen Sie einen Kunden, um dessen Portal-Ansicht zu sehen
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerImpersonationDropdown;
