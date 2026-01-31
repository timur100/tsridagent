import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Key, Check, X, AlertCircle, Package, Monitor, 
  Search, Plus, Trash2, TrendingUp, Download, Settings
} from 'lucide-react';
import TableExportImport from './ui/TableExportImport';
import TableColumnSettings from './ui/TableColumnSettings';
import toast from 'react-hot-toast';

// Default column configuration for Licenses
const DEFAULT_LICENSE_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false },
  { id: 'license_key', label: 'Lizenzschlüssel', visible: true, sortable: true },
  { id: 'customer', label: 'Kunde', visible: true, sortable: true },
  { id: 'package', label: 'Paket', visible: true, sortable: true },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'start_date', label: 'Start', visible: true, sortable: true },
  { id: 'end_date', label: 'Ende', visible: true, sortable: true },
  { id: 'devices', label: 'Geräte', visible: false, sortable: true },
  { id: 'actions', label: 'Aktionen', visible: true, sortable: false },
];

const LicenseManagement = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [validation, setValidation] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [packages, setPackages] = useState([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('licenseColumns');
    return saved ? JSON.parse(saved) : DEFAULT_LICENSE_COLUMNS;
  });
  
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    features: [],
    duration_months: 12,
    price: 0
  });
  const [availableFeatures, setAvailableFeatures] = useState([]);
  
  // Create license form
  const [createForm, setCreateForm] = useState({
    customer_email: '',
    package_id: '',
    quantity: 1,
    start_date: new Date().toISOString().split('T')[0],
    duration_months: 12,
    reminder_days: 30
  });
  
  // Extend license form
  const [extendForm, setExtendForm] = useState({
    duration_months: 12
  });

  useEffect(() => {
    // Only load once
    if (dataLoaded) return;
    
    const loadData = async () => {
      try {
        setDataLoaded(true);
        // Load data with delays between calls to prevent clone errors
        await fetchCustomers();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchPackages();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchFeatures();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchOverview();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchDevices();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchExpiringLicenses();
      } catch (error) {
        console.error('Error loading data:', error);
        setDataLoaded(false); // Allow retry
      }
    };
    loadData();
  }, [dataLoaded]);

  useEffect(() => {
    // Skip initial load (handled by main useEffect)
    if (!dataLoaded) return;
    
    const loadOverview = async () => {
      // Add small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (selectedCustomer) {
        await fetchOverview(selectedCustomer);
      } else {
        await fetchOverview();
      }
    };
    loadOverview();
  }, [selectedCustomer, dataLoaded]);

  const fetchCustomers = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await apiCall('/api/portal/users/list?role=customer');
      
      // Handle double-nested response structure
      let users = null;
      if (result.success && result.data) {
        if (result.data.data && result.data.data.users) {
          users = result.data.data.users;
        } else if (result.data.users) {
          users = result.data.users;
        }
      }
      
      if (users) {
        setCustomers(users);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await apiCall('/api/licenses/packages');
      
      // Handle double-nested response structure from XMLHttpRequest
      let packages = null;
      if (result.success && result.data) {
        // If data contains a data property, it means we have double nesting
        if (result.data.data && result.data.data.packages) {
          packages = result.data.data.packages;
        } 
        // Otherwise check direct packages
        else if (result.data.packages) {
          packages = result.data.packages;
        }
      }
      
      if (packages) {
        setPackages(packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchFeatures = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await apiCall('/api/licenses/features');
      
      // Handle double-nested response structure from XMLHttpRequest
      let features = null;
      if (result.success && result.data) {
        // If data contains a data property, it means we have double nesting
        if (result.data.data && result.data.data.features) {
          features = result.data.data.features;
        } 
        // Otherwise check direct features
        else if (result.data.features) {
          features = result.data.features;
        }
      }
      
      if (features && features.length > 0) {
        setAvailableFeatures(features);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    }
  };

  const fetchOverview = async (customerEmail = null) => {
    try {
      setLoading(true);
      let url = '/api/licenses/overview';
      if (customerEmail) {
        url += `?customer_email=${encodeURIComponent(customerEmail)}`;
      }
      
      const result = await apiCall(url);
      
      // Handle double-nested response structure from XMLHttpRequest
      let overviewData = null;
      if (result.success && result.data) {
        // If data contains a data property, it means we have double nesting
        if (result.data.data) {
          overviewData = result.data.data;
        } 
        // Otherwise use direct data
        else {
          overviewData = result.data;
        }
      }
      
      if (overviewData) {
        setOverview(overviewData);
      } else if (result.error) {
        console.error('Error fetching overview:', result.error);
        // Don't show toast on initial load
        if (overview) {
          toast.error('Fehler beim Laden der Lizenzübersicht');
        }
      }
    } catch (error) {
      console.error('Error fetching license overview:', error);
      if (overview) {
        toast.error('Fehler beim Laden der Lizenzübersicht');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await apiCall('/api/portal/europcar-devices');
      if (result.success) {
        const devicesData = result.data?.data || result.data || {};
        setDevices(devicesData.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleAssignLicense = async (deviceId) => {
    if (!selectedLicense) return;
    
    try {
      const result = await apiCall('/api/licenses/assign', {
        method: 'POST',
        body: JSON.stringify({
          license_key: selectedLicense.license_key,
          device_id: deviceId
        })
      });
      
      if (result.success) {
        toast.success('Lizenz erfolgreich zugewiesen');
        setShowAssignModal(false);
        setSelectedLicense(null);
        fetchOverview(selectedCustomer);
      } else {
        toast.error(result.error || 'Fehler beim Zuweisen der Lizenz');
      }
    } catch (error) {
      toast.error('Fehler beim Zuweisen der Lizenz');
    }
  };

  const handleUnassignLicense = async (licenseKey) => {
    if (!confirm('Möchten Sie diese Lizenz wirklich vom Gerät entfernen?')) return;
    
    try {
      const result = await apiCall(`/api/licenses/unassign/${licenseKey}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Lizenz erfolgreich entfernt');
        fetchOverview(selectedCustomer);
      } else {
        toast.error(result.error || 'Fehler beim Entfernen der Lizenz');
      }
    } catch (error) {
      toast.error('Fehler beim Entfernen der Lizenz');
    }
  };

  const fetchExpiringLicenses = async (days = 30) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await apiCall(`/api/licenses/expiring-soon?days=${days}`);
      
      // Handle double-nested response structure
      let licenses = null;
      if (result.success && result.data) {
        if (result.data.data && result.data.data.licenses) {
          licenses = result.data.data.licenses;
        } else if (result.data.licenses) {
          licenses = result.data.licenses;
        }
      }
      
      if (licenses) {
        setExpiringLicenses(licenses);
      }
    } catch (error) {
      console.error('Error fetching expiring licenses:', error);
    }
  };

  const handleCreateLicense = async () => {
    // Validate required fields
    if (!createForm.customer_email) {
      toast.error('Bitte wählen Sie einen Kunden aus');
      return;
    }
    if (!createForm.package_id) {
      toast.error('Bitte wählen Sie ein Lizenzpaket aus');
      return;
    }
    
    try {
      const result = await apiCall('/api/licenses/create', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      
      if (result.success) {
        toast.success(`${createForm.quantity} Lizenz(en) erfolgreich erstellt`);
        setShowCreateModal(false);
        setCreateForm({
          customer_email: '',
          package_id: '',
          quantity: 1,
          start_date: new Date().toISOString().split('T')[0],
          duration_months: 12,
          reminder_days: 30
        });
        fetchOverview(selectedCustomer);
      } else {
        toast.error(result.error || result.data?.detail || 'Fehler beim Erstellen der Lizenz');
      }
    } catch (error) {
      console.error('License creation error:', error);
      toast.error('Fehler beim Erstellen der Lizenz');
    }
  };

  const handleCreatePackage = async () => {
    // Validate
    if (!packageForm.name.trim()) {
      toast.error('Bitte geben Sie einen Paketnamen ein');
      return;
    }
    if (packageForm.features.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Funktion aus');
      return;
    }

    try {
      const result = await apiCall('/api/licenses/packages', {
        method: 'POST',
        body: JSON.stringify(packageForm)
      });

      if (result.success) {
        toast.success('Paket erfolgreich erstellt');
        setShowPackageModal(false);
        setPackageForm({
          name: '',
          description: '',
          features: [],
          duration_months: 12,
          price: 0
        });
        fetchPackages();
      } else {
        toast.error(result.error || result.data?.detail || 'Fehler beim Erstellen des Pakets');
      }
    } catch (error) {
      console.error('Package creation error:', error);
      toast.error('Fehler beim Erstellen des Pakets');
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (!window.confirm('Möchten Sie dieses Paket wirklich löschen?')) return;

    try {
      const result = await apiCall(`/api/licenses/packages/${packageId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Paket erfolgreich gelöscht');
        fetchPackages();
      } else {
        toast.error(result.error || result.data?.detail || 'Fehler beim Löschen des Pakets');
      }
    } catch (error) {
      console.error('Package deletion error:', error);
      toast.error('Fehler beim Löschen des Pakets');
    }
  };

  const toggleFeature = (featureKey) => {
    setPackageForm(prev => ({
      ...prev,
      features: prev.features.includes(featureKey)
        ? prev.features.filter(f => f !== featureKey)
        : [...prev.features, featureKey]
    }));
  };

  const handleExtendLicense = async () => {
    if (!selectedLicense) return;
    
    try {
      const result = await apiCall('/api/licenses/extend', {
        method: 'POST',
        body: JSON.stringify({
          license_key: selectedLicense.license_key,
          duration_months: extendForm.duration_months
        })
      });
      
      if (result.success) {
        toast.success(`Lizenz um ${extendForm.duration_months} Monate verlängert`);
        setShowExtendModal(false);
        setSelectedLicense(null);
        setExtendForm({ duration_months: 12 });
        fetchOverview(selectedCustomer);
        fetchExpiringLicenses();
      } else {
        toast.error(result.error || 'Fehler beim Verlängern der Lizenz');
      }
    } catch (error) {
      toast.error('Fehler beim Verlängern der Lizenz');
    }
  };

  const fetchValidation = async () => {
    try {
      const result = await apiCall('/api/licenses/validation');
      
      // Handle double-nested response structure
      let validationData = null;
      if (result.success && result.data) {
        if (result.data.data) {
          validationData = result.data.data;
        } else {
          validationData = result.data;
        }
      }
      
      if (validationData) {
        setValidation(validationData);
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching validation:', error);
      toast.error('Fehler beim Laden der Validierung');
    }
  };

  // Hardware License Functions







  const getFilteredDevices = () => {
    if (!deviceSearch) return devices;
    
    const search = deviceSearch.toLowerCase();
    return devices.filter(device =>
      device.device_id?.toLowerCase().includes(search) ||
      device.station_name?.toLowerCase().includes(search) ||
      device.locationcode?.toLowerCase().includes(search)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000] mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Lizenzübersicht...
          </p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Keine Lizenzdaten verfügbar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Software Licenses Only - Hardware moved to separate component */}

      {/* Software Licenses Section */}
      <div className="mt-12 pt-12 border-t" style={{borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'}}>
        {/* Software License Header with Buttons */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Software-Lizenzen
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Verwaltung der Software-Lizenzpakete und Zuweisungen
            </p>
          </div>
          
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <TableExportImport
                data={overview?.licenses || []}
                columns={columns}
                filename="lizenzen"
                selectedIds={selectedIds}
                idField="license_key"
              />
              <TableColumnSettings
                columns={columns}
                onColumnsChange={setColumns}
                storageKey="licenseColumns"
                defaultColumns={DEFAULT_LICENSE_COLUMNS}
              />
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Lizenz
              </Button>
              <Button
                onClick={() => setShowPackageModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Package className="h-4 w-4 mr-2" />
                Pakete verwalten
              </Button>
              <Button
                onClick={fetchValidation}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Validierung
              </Button>
            </div>
          )}
        </div>

      {/* Expiring Soon Alert */}
      {expiringLicenses.length > 0 && (
        <Card className={`p-4 border-l-4 border-orange-500 mb-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-orange-50'}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {expiringLicenses.length} Lizenz(en) laufen bald ab
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                Die folgenden Lizenzen laufen in den nächsten 30 Tagen ab:
              </p>
              <div className="mt-2 space-y-1">
                {expiringLicenses.slice(0, 3).map(lic => (
                  <div key={lic.license_key} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                    <span className="font-mono">{lic.license_key}</span>
                    {' - '}
                    <span className={lic.days_until_expiry <= 7 ? 'text-red-500 font-bold' : 'text-orange-500'}>
                      {lic.days_until_expiry} Tage
                    </span>
                    {lic.device && ` (${lic.device.device_id})`}
                  </div>
                ))}
                {expiringLicenses.length > 3 && (
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    ... und {expiringLicenses.length - 3} weitere
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Customer Filter */}
      {user?.role === 'admin' && (
        <Card className={`p-4 mb-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center gap-4">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Kunde filtern:
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className={`flex-1 px-4 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Alle Kunden</option>
              {customers.map(customer => (
                <option key={customer.email} value={customer.email}>
                  {customer.company || customer.name} ({customer.email})
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {overview.statistics?.total || 0}
              </p>
            </div>
            <Package className={`h-12 w-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Aktiv
              </p>
              <p className={`text-3xl font-bold mt-2 text-green-500`}>
                {overview.statistics?.active || 0}
              </p>
            </div>
            <Check className="h-12 w-12 text-green-500" />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Zugewiesen
              </p>
              <p className={`text-3xl font-bold mt-2 text-blue-500`}>
                {overview.statistics?.assigned || 0}
              </p>
            </div>
            <Monitor className="h-12 w-12 text-blue-500" />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Nicht zugewiesen
              </p>
              <p className={`text-3xl font-bold mt-2 text-orange-500`}>
                {overview.statistics?.unassigned || 0}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-500" />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Abgelaufen
              </p>
              <p className={`text-3xl font-bold mt-2 text-red-500`}>
                {overview.statistics?.expired || 0}
              </p>
            </div>
            <X className="h-12 w-12 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Unassigned Active Licenses */}
      {overview.unassigned_active && overview.unassigned_active.length > 0 && (
        <Card className={`p-6 mt-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Nicht zugewiesene aktive Lizenzen ({overview.unassigned_active.length})
            </h3>
            <AlertCircle className="h-6 w-6 text-orange-500" />
          </div>
          
          <div className="space-y-4">
            {overview.unassigned_active.map(license => (
              <div
                key={license.license_key}
                className={`p-5 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {license.license_key}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Features: {license.features?.join(', ') || 'Keine'}
                          </span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Läuft ab: {new Date(license.expires_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <Button
                      onClick={() => {
                        setSelectedLicense(license);
                        setShowAssignModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Zuweisen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assigned Licenses */}
      <Card className={`mt-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="p-6 border-b border-gray-700">
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Zugewiesene Lizenzen ({overview.assigned_licenses?.length || 0})
          </h3>
        </div>

        {overview.assigned_licenses && overview.assigned_licenses.length > 0 ? (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Lizenzschlüssel
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gerät
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Standort
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Features
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ablaufdatum
                  </th>
                  {user?.role === 'admin' && (
                    <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                {overview.assigned_licenses.map(license => (
                  <tr
                    key={license.license_key}
                    className={`border-t cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-[#1a1a1a]'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`py-3 px-4 font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {license.license_key}
                    </td>
                    <td className={`py-3 px-4 font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{license.device_id}</p>
                          {license.device_name && (
                            <p className="text-xs text-gray-500">{license.device_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {license.location_code || '-'}
                    </td>
                    <td className={`py-3 px-4 text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {license.features?.slice(0, 2).join(', ')}
                      {license.features?.length > 2 && ' ...'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        license.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {license.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(license.expires_at).toLocaleDateString('de-DE')}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLicense(license);
                              setShowExtendModal(true);
                            }}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Lizenz verlängern"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUnassignLicense(license.license_key)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Lizenz entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Monitor className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Keine zugewiesenen Lizenzen vorhanden
            </p>
          </div>
        )}
      </Card>
      </div>
      {/* End of Software Licenses Section */}

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neue Lizenz erstellen
              </h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kunde
                </label>
                <select
                  value={createForm.customer_email}
                  onChange={(e) => setCreateForm({...createForm, customer_email: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">Kunde auswählen</option>
                  {customers.map(c => (
                    <option key={c.email} value={c.email}>{c.company || c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lizenzpaket
                </label>
                <select
                  value={createForm.package_id}
                  onChange={(e) => setCreateForm({...createForm, package_id: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">Paket auswählen</option>
                  {packages.map(p => (
                    <option key={p.package_id} value={p.package_id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({...createForm, start_date: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Laufzeit
                  </label>
                  <select
                    value={createForm.duration_months}
                    onChange={(e) => setCreateForm({...createForm, duration_months: parseInt(e.target.value)})}
                    className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value={12}>12 Monate</option>
                    <option value={24}>24 Monate</option>
                    <option value={36}>36 Monate</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Anzahl
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.quantity}
                    onChange={(e) => setCreateForm({...createForm, quantity: parseInt(e.target.value)})}
                    className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Erinnerung (Tage vorher)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={createForm.reminder_days}
                    onChange={(e) => setCreateForm({...createForm, reminder_days: parseInt(e.target.value)})}
                    className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>
            </div>
            
            <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button onClick={() => setShowCreateModal(false)} className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateLicense} className="bg-green-600 hover:bg-green-700 text-white">
                Erstellen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extend License Modal */}
      {showExtendModal && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Lizenz verlängern
              </h2>
              <button onClick={() => { setShowExtendModal(false); setSelectedLicense(null); }} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lizenzschlüssel
                </label>
                <p className={`font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedLicense.license_key}
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Aktuelles Ablaufdatum
                </label>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(selectedLicense.expires_at).toLocaleDateString('de-DE')}
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Verlängerung
                </label>
                <select
                  value={extendForm.duration_months}
                  onChange={(e) => setExtendForm({duration_months: parseInt(e.target.value)})}
                  className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value={12}>12 Monate</option>
                  <option value={24}>24 Monate</option>
                  <option value={36}>36 Monate</option>
                </select>
              </div>
            </div>
            
            <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button onClick={() => { setShowExtendModal(false); setSelectedLicense(null); }} className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}>
                Abbrechen
              </Button>
              <Button onClick={handleExtendLicense} className="bg-blue-600 hover:bg-blue-700 text-white">
                Verlängern
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && validation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Lizenzzuweisung Validierung
              </h2>
              <button onClick={() => setShowValidationModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-green-50'}`}>
                  <p className="text-sm text-gray-600">Korrekt zugewiesen</p>
                  <p className="text-2xl font-bold text-green-500">{validation.summary.correctly_assigned}</p>
                </Card>
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-600">Falsch zugewiesen</p>
                  <p className="text-2xl font-bold text-red-500">{validation.summary.wrongly_assigned}</p>
                </Card>
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-orange-50'}`}>
                  <p className="text-sm text-gray-600">Ohne Lizenz</p>
                  <p className="text-2xl font-bold text-orange-500">{validation.summary.unlicensed_devices}</p>
                </Card>
              </div>
              
              {/* Wrongly Assigned */}
              {validation.wrongly_assigned?.length > 0 && (
                <div>
                  <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Falsch zugewiesene Lizenzen
                  </h3>
                  <div className="space-y-2">
                    {validation.wrongly_assigned.map(item => (
                      <div key={item.license_key} className={`p-3 rounded border-l-4 border-red-500 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-red-50'}`}>
                        <p className="font-mono text-sm">{item.license_key}</p>
                        <p className="text-xs text-red-600">{item.reason}: {item.device_id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Unlicensed Devices */}
              {validation.unlicensed_devices?.length > 0 && (
                <div>
                  <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Geräte ohne Lizenz ({validation.unlicensed_devices.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {validation.unlicensed_devices.map(device => (
                      <div key={device.device_id} className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                        <p className="font-bold">{device.device_id}</p>
                        <p className="text-sm text-gray-600">{device.station_name} - {device.locationcode}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignModal && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'
            }`}>
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Lizenz zuweisen
                </h2>
                <p className={`text-sm mt-1 font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedLicense.license_key}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedLicense(null);
                }}
                className={`p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'hover:bg-[#3a3a3a] text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Gerät suchen (ID, Name, Standort)..."
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Device List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getFilteredDevices().slice(0, 50).map(device => (
                  <div
                    key={device.device_id}
                    onClick={() => handleAssignLicense(device.device_id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 hover:bg-[#3a3a3a]'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {device.device_id}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {device.station_name} - {device.locationcode}
                          </p>
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>

              {getFilteredDevices().length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Keine Geräte gefunden
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`sticky bottom-0 flex justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'
            }`}>
              <Button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedLicense(null);
                }}
                className={theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Package Management Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Lizenzpakete verwalten
              </h2>
              <button onClick={() => setShowPackageModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Create New Package Section */}
              <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Neues Paket erstellen
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Paketname *
                    </label>
                    <input
                      type="text"
                      value={packageForm.name}
                      onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                      placeholder="z.B. Standard, Premium, Enterprise"
                      className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Beschreibung
                    </label>
                    <textarea
                      value={packageForm.description}
                      onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                      placeholder="Beschreibung des Pakets"
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Gültigkeitsdauer
                      </label>
                      <select
                        value={packageForm.duration_months}
                        onChange={(e) => setPackageForm({...packageForm, duration_months: parseInt(e.target.value)})}
                        className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                      >
                        <option value={1}>1 Monat</option>
                        <option value={3}>3 Monate</option>
                        <option value={6}>6 Monate</option>
                        <option value={12}>1 Jahr</option>
                        <option value={24}>2 Jahre</option>
                        <option value={36}>3 Jahre</option>
                        <option value={-1}>Lebenslang</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Preis (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm({...packageForm, price: parseFloat(e.target.value)})}
                        className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Funktionen auswählen * ({packageForm.features.length} von {availableFeatures.length})
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg" style={{
                      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
                      borderColor: theme === 'dark' ? '#374151' : '#d1d5db'
                    }}>
                      {availableFeatures.map(feature => (
                        <label
                          key={feature.key}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            packageForm.features.includes(feature.key)
                              ? theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
                              : theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={packageForm.features.includes(feature.key)}
                            onChange={() => toggleFeature(feature.key)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {feature.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPackageForm({...packageForm, features: availableFeatures.map(f => f.key)})}
                      className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm`}
                    >
                      Alle auswählen
                    </Button>
                    <Button
                      onClick={() => setPackageForm({...packageForm, features: []})}
                      className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm`}
                    >
                      Alle abwählen
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleCreatePackage}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Paket erstellen
                  </Button>
                </div>
              </Card>
              
              {/* Existing Packages */}
              <div>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Vorhandene Pakete ({packages.length})
                </h3>
                
                {packages.length === 0 ? (
                  <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <Package className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Noch keine Pakete erstellt
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {packages.map(pkg => (
                      <Card key={pkg.package_id} className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Package className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                              <div>
                                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {pkg.name}
                                </h4>
                                {pkg.description && (
                                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {pkg.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              {pkg.features?.map(feature => (
                                <span
                                  key={feature}
                                  className={`text-xs px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {availableFeatures.find(f => f.key === feature)?.name || feature}
                                </span>
                              ))}
                            </div>
                            
                            <div className="mt-2 flex gap-4 text-sm">
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                Laufzeit: {pkg.duration_months === -1 ? 'Lebenslang' : `${pkg.duration_months} Monate`}
                              </span>
                              {pkg.price > 0 && (
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                  Preis: €{pkg.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleDeletePackage(pkg.package_id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button onClick={() => setShowPackageModal(false)} className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LicenseManagement;
