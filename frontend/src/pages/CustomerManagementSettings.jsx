import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import toast from 'react-hot-toast';

const CustomerManagementSettings = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    domain: '',
    logo_url: ''
  });

  // Only accessible for super_admin
  if (user?.role !== 'super_admin') {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Zugriff verweigert. Nur Super-Admins können Kunden verwalten.
        </p>
      </Card>
    );
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/customers/list');
      if (result.success && result.data) {
        setCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Fehler beim Laden der Kunden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Kundenname ist erforderlich');
      return;
    }

    try {
      const result = await apiCall('/api/customers/create', {
        method: 'POST',
        body: JSON.stringify(newCustomer)
      });

      if (result.success && result.data) {
        toast.success('Kunde erfolgreich erstellt');
        setShowCreateModal(false);
        setNewCustomer({ name: '', domain: '', logo_url: '' });
        fetchCustomers();
      } else {
        toast.error(result.data?.message || 'Fehler beim Erstellen');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Fehler beim Erstellen des Kunden');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kundenverwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie alle Kunden Ihres SaaS-Systems
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </div>

      {/* Customer List */}
      <Card className={`${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        {loading ? (
          <div className="p-12 text-center">
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lädt...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Keine Kunden vorhanden
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Kunde
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Domain
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Erstellt
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {customers.map((customer) => (
                  <tr key={customer.id} className={theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-[#c00000] mr-3" />
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {customer.domain || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        customer.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {customer.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(customer.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} mr-3`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neuen Kunden erstellen
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kundenname *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. Europcar"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Domain (optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.domain}
                    onChange={(e) => setNewCustomer({ ...newCustomer, domain: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. europcar.de"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Logo URL (optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.logo_url}
                    onChange={(e) => setNewCustomer({ ...newCustomer, logo_url: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleCreateCustomer}
                  className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Erstellen
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCustomer({ name: '', domain: '', logo_url: '' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementSettings;
