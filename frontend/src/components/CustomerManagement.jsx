import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { X, Plus, Mail, Building2, UserCheck, UserX, Trash2, Eye, Monitor, MapPin, Package, Users as UsersIcon, LogIn, Search, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import CustomerDetailsModal from './CustomerDetailsModal';
import SearchInput from './SearchInput';
import TableExportImport from './ui/TableExportImport';
import TableColumnSettings from './ui/TableColumnSettings';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';

// Default column configuration for Customers
const DEFAULT_CUSTOMER_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false },
  { id: 'name', label: 'Name', visible: true, sortable: true },
  { id: 'email', label: 'E-Mail', visible: true, sortable: true },
  { id: 'company', label: 'Unternehmen', visible: true, sortable: true },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'shop_enabled', label: 'Shop-Zugang', visible: true, sortable: true },
  { id: 'devices', label: 'Geräte', visible: false, sortable: true },
  { id: 'locations', label: 'Standorte', visible: false, sortable: true },
  { id: 'created_at', label: 'Erstellt', visible: false, sortable: true },
  { id: 'actions', label: 'Aktionen', visible: true, sortable: false },
];

const CustomerManagement = ({ customers, onRefresh }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const { impersonateCustomer } = useImpersonation();
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('customerColumns');
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOMER_COLUMNS;
  });
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: '',
    password: '',
    role: 'customer',
    shop_enabled: false
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.company?.toLowerCase().includes(search)
    );
  });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.email)));
    }
  };

  const toggleSelectCustomer = (email) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async (importedData) => {
    console.log('Imported customers:', importedData);
    toast.success(`${importedData.length} Kunden bereit zum Import`);
  };

  // Mock stats - will be replaced with real data later
  const getCustomerStats = (customer) => {
    return {
      devices: 0,
      locations: 0,
      licenses: 0,
      employees: 0,
      admins: 0
    };
  };

  const handleLoginAs = async (customer) => {
    setLoading(true);
    try {
      const result = await impersonateCustomer(customer);
      if (result.success) {
        toast.success(`Sie agieren jetzt als ${customer.name}`);
      } else {
        toast.error(result.error || 'Fehler beim Login als Kunde');
      }
    } catch (error) {
      toast.error('Fehler beim Login als Kunde');
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiCall('/api/portal/users/create', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (result.success) {
        toast.success('Kunde erfolgreich erstellt');
        setShowModal(false);
        setFormData({
          email: '',
          name: '',
          company: '',
          password: '',
          role: 'customer',
          shop_enabled: false
        });
        onRefresh();
      } else {
        toast.error(result.message || 'Fehler beim Erstellen des Kunden');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Kunden');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (email, currentStatus) => {
    setLoading(true);
    try {
      const endpoint = currentStatus ? 'deactivate' : 'activate';
      const result = await apiCall(`/api/portal/users/${email}/${endpoint}`, {
        method: 'POST'
      });

      if (result.success) {
        toast.success(currentStatus ? 'Kunde deaktiviert' : 'Kunde aktiviert');
        onRefresh();
      } else {
        toast.error('Fehler beim Aktualisieren des Status');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShopAccess = async (email, currentStatus) => {
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/users/${email}`, {
        method: 'PUT',
        body: JSON.stringify({ shop_enabled: !currentStatus })
      });

      if (result.success) {
        toast.success(currentStatus ? 'Shop-Zugang deaktiviert' : 'Shop-Zugang aktiviert');
        onRefresh();
      } else {
        toast.error('Fehler beim Aktualisieren des Shop-Zugangs');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Shop-Zugangs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (email) => {
    if (!window.confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/users/${email}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Kunde erfolgreich gelöscht');
        onRefresh();
      } else {
        toast.error('Fehler beim Löschen des Kunden');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Kunden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header with Search and Add Button in one row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
        {/* Title on the left */}
        <div className="flex-shrink-0">
          <h2 className={`text-2xl font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kundenverwaltung
          </h2>
        </div>

        {/* Search Bar in the middle - flexible width */}
        <div className="flex-1 w-full lg:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suche nach Name, E-Mail oder Firma..."
            className="w-full"
          />
        </div>

        {/* Export/Import and Column Settings */}
        <div className="flex items-center gap-2">
          <TableExportImport
            data={filteredCustomers}
            columns={columns}
            filename="kunden"
            onImport={handleImport}
            selectedIds={selectedIds}
            idField="email"
          />
          <TableColumnSettings
            columns={columns}
            onColumnsChange={setColumns}
            storageKey="customerColumns"
            defaultColumns={DEFAULT_CUSTOMER_COLUMNS}
          />
        </div>

        {/* Add Button on the right */}
        <div className="flex-shrink-0">
          <Button
            onClick={() => setShowModal(true)}
            className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center space-x-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Kunde hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCustomers.map((customer) => {
          const stats = getCustomerStats(customer);
          return (
          <Card 
            key={customer.email}
            className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            }`}
          >
            {/* Status Badge */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-2">
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  customer.active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {customer.active ? 'Aktiv' : 'Inaktiv'}
                </div>
                {customer.shop_enabled && (
                  <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Shop
                  </div>
                )}
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                theme === 'dark' ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-50 text-gray-600'
              }`}>
                {customer.role === 'customer' ? 'Kunde' : customer.role === 'admin' ? 'Admin' : 'Mitarbeiter'}
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <div>
                <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {customer.name}
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <Building2 className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {customer.company}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {customer.email}
                </span>
              </div>

              {customer.created_at && (
                <div className={`text-xs pt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Erstellt: {new Date(customer.created_at).toLocaleDateString('de-DE')}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className={`grid grid-cols-4 gap-2 mb-6 p-3 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <div className="text-center">
                <Monitor className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.devices}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Geräte</p>
              </div>
              <div className="text-center">
                <MapPin className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.locations}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Standorte</p>
              </div>
              <div className="text-center">
                <Package className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.licenses}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Lizenzen</p>
              </div>
              <div className="text-center">
                <UsersIcon className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.employees}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Mitarbeiter</p>
              </div>
            </div>

            {/* Actions - 2 Zeilen mit je 2 Buttons */}
            <div className="space-y-2">
              {/* Zeile 1: Login as & Details anzeigen */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLoginAs(customer)}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login as</span>
                </button>
                
                <button
                  onClick={() => handleShowDetails(customer)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                    theme === 'dark'
                      ? 'bg-[#c00000] text-white hover:bg-[#a00000]'
                      : 'bg-[#c00000] text-white hover:bg-[#a00000]'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>Details</span>
                </button>
              </div>
              
              {/* Zeile 2: Aktivieren & Löschen */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleToggleActive(customer.email, customer.active)}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                    customer.active
                      ? 'bg-[#c00000]/10 text-[#c00000] hover:bg-[#c00000]/20 border border-[#c00000]/20'
                      : theme === 'dark'
                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                      : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  {customer.active ? (
                    <>
                      <UserX className="h-4 w-4" />
                      <span>Deaktivieren</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Aktivieren</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteCustomer(customer.email)}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] text-gray-400 hover:bg-[#333333] border border-gray-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Löschen</span>
                </button>
              </div>

              {/* Zeile 3: Shop-Zugang Toggle (nur für Kunden) */}
              {customer.role === 'customer' && (
                <div className="grid grid-cols-1">
                  <button
                    onClick={() => handleToggleShopAccess(customer.email, customer.shop_enabled)}
                    disabled={loading}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                      customer.shop_enabled
                        ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20'
                        : theme === 'dark'
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span>{customer.shop_enabled ? 'Shop deaktivieren' : 'Shop aktivieren'}</span>
                  </button>
                </div>
              )}
            </div>
          </Card>
        );
        })}

        {customers.length === 0 && (
          <div className="col-span-full">
            <Card className={`p-16 text-center rounded-2xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-xl' 
                : 'bg-white border border-gray-100 shadow-lg'
            }`}>
              <Users className={`h-20 w-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Keine Kunden vorhanden
              </h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fügen Sie Ihren ersten Kunden hinzu
              </p>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-[#c00000] hover:bg-[#a00000] text-white px-6 py-3 rounded-lg shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Kunde hinzufügen
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-md rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
          }`}>
            {/* Modal Header */}
            <div className={`flex justify-between items-center p-6 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neuen Kunden hinzufügen
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                  } focus:outline-none`}
                  placeholder="Max Mustermann"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Firma *
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                  } focus:outline-none`}
                  placeholder="Mustermann GmbH"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  E-Mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                  } focus:outline-none`}
                  placeholder="kunde@firma.de"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Passwort *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                  } focus:outline-none`}
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rolle *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-[#c00000] focus:ring-2 focus:ring-[#c00000]/20'
                  } focus:outline-none`}
                >
                  <option value="customer">Kunde</option>
                  <option value="employee">Mitarbeiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="shop_enabled"
                    checked={formData.shop_enabled}
                    onChange={(e) => setFormData(prev => ({...prev, shop_enabled: e.target.checked}))}
                    className="w-5 h-5 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000]"
                  />
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Shop-Zugang aktivieren
                  </span>
                </label>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Kunde kann Hardware und Zubehör bestellen
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold bg-[#c00000] hover:bg-[#a00000] text-white shadow-lg transition-all"
                >
                  {loading ? 'Wird erstellt...' : 'Kunde erstellen'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          stats={getCustomerStats(selectedCustomer)}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={onRefresh}
        />
      )}
    </div>
  );
};

export default CustomerManagement;
