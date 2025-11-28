import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Car, Plus, Search, Filter, Edit2, Trash2, Eye, 
  AlertCircle, RefreshCw, Download, Upload, X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import VehicleDetail from './VehicleDetail';

const VehicleManagement = () => {
  const navigate = useNavigate();
  const { vehicleId } = useParams();
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    inactive: 0
  });
  
  // Filters
  const [searchLicensePlate, setSearchLicensePlate] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    license_plate: '',
    tenant_id: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    vin: '',
    color: '',
    fuel_type: '',
    status: 'active',
    location: '',
    notes: ''
  });
  
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    loadVehicles();
    loadStats();
    loadTenants();
  }, []);

  useEffect(() => {
    // Auto-reload when filters change
    const timeoutId = setTimeout(() => {
      loadVehicles();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchLicensePlate, filterTenant, filterBrand, filterStatus, filterYear]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchLicensePlate) params.append('license_plate', searchLicensePlate);
      if (filterTenant) params.append('tenant_id', filterTenant);
      if (filterBrand) params.append('brand', filterBrand);
      if (filterStatus) params.append('status', filterStatus);
      if (filterYear) params.append('year', filterYear);
      
      const result = await apiCall(`/api/vehicles?${params.toString()}`);
      if (result.success && result.data?.success) {
        setVehicles(result.data.data?.vehicles || []);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Fehler beim Laden der Fahrzeuge');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/api/vehicles/stats/summary');
      if (result.success && result.data?.success) {
        setStats(result.data.data || {});
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTenants = async () => {
    try {
      const result = await apiCall('/api/tenants/');
      if (result.success) {
        // Tenants API returns array directly, not wrapped in { success, data }
        setTenants(result.data || []);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiCall('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      // apiCall returns { success: isOk, data: backendResponse, status }
      // Backend returns { success: true, message: "...", data: {...} }
      if (result.success && result.data?.success) {
        toast.success('Fahrzeug erfolgreich hinzugefügt');
        setShowAddModal(false);
        resetForm();
        loadVehicles();
        loadStats();
      } else {
        const errorMsg = result.data?.message || result.data?.detail || result.error || 'Fehler beim Hinzufügen';
        toast.error(errorMsg);
        console.error('Add vehicle error:', result);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Fehler beim Hinzufügen des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (result.success && result.data?.success) {
        toast.success('Fahrzeug erfolgreich aktualisiert');
        setShowEditModal(false);
        setSelectedVehicle(null);
        resetForm();
        loadVehicles();
      } else {
        const errorMsg = result.data?.message || result.data?.detail || result.error || 'Fehler beim Aktualisieren';
        toast.error(errorMsg);
        console.error('Update vehicle error:', result);
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Fehler beim Aktualisieren des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Möchten Sie dieses Fahrzeug wirklich löschen?')) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });
      
      if (result.success && result.data?.success) {
        toast.success('Fahrzeug erfolgreich gelöscht');
        loadVehicles();
        loadStats();
      } else {
        const errorMsg = result.data?.message || result.data?.detail || result.error || 'Fehler beim Löschen';
        toast.error(errorMsg);
        console.error('Delete vehicle error:', result);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Fehler beim Löschen des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      license_plate: vehicle.license_plate,
      tenant_id: vehicle.tenant_id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      mileage: vehicle.mileage,
      vin: vehicle.vin || '',
      color: vehicle.color || '',
      fuel_type: vehicle.fuel_type || '',
      status: vehicle.status,
      location: vehicle.location || '',
      notes: vehicle.notes || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      license_plate: '',
      tenant_id: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      mileage: 0,
      vin: '',
      color: '',
      fuel_type: '',
      status: 'active',
      location: '',
      notes: ''
    });
  };

  const clearFilters = () => {
    setSearchLicensePlate('');
    setFilterTenant('');
    setFilterBrand('');
    setFilterStatus('');
    setFilterYear('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Aktiv', color: 'bg-green-500' },
      maintenance: { label: 'Wartung', color: 'bg-yellow-500' },
      inactive: { label: 'Inaktiv', color: 'bg-gray-500' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
              <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.total}
              </p>
            </div>
            <Car className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Aktiv
              </p>
              <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.active}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <div className="h-4 w-4 bg-white rounded-full"></div>
            </div>
          </div>
        </Card>
        
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Wartung
              </p>
              <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.maintenance}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Inaktiv
              </p>
              <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.inactive}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center">
              <div className="h-4 w-4 bg-white rounded-full"></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
        <div className="space-y-4">
          {/* Kennzeichen Search - Separate Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Kennzeichen suchen..."
                value={searchLicensePlate}
                onChange={(e) => setSearchLicensePlate(e.target.value.toUpperCase())}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddModal(true)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Hinzufügen
              </Button>
              <Button
                onClick={loadVehicles}
                variant="outline"
                className={`${theme === 'dark' ? 'border-gray-700 text-gray-300' : ''}`}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Other Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Alle Tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Marke filtern..."
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="maintenance">Wartung</option>
              <option value="inactive">Inaktiv</option>
            </select>
            
            <input
              type="number"
              placeholder="Baujahr..."
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            
            <Button
              onClick={clearFilters}
              variant="outline"
              className={`${theme === 'dark' ? 'border-gray-700 text-gray-300' : ''} sm:col-span-2 lg:col-span-1`}
            >
              <X className="h-4 w-4 mr-2" />
              Filter zurücksetzen
            </Button>
          </div>
        </div>
      </Card>

      {/* Vehicles Table */}
      <Card className={`${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Kennzeichen
                </th>
                <th className={`hidden md:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tenant
                </th>
                <th className={`px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Marke / Modell
                </th>
                <th className={`hidden lg:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Baujahr
                </th>
                <th className={`hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  KM-Stand
                </th>
                <th className={`hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Farbe
                </th>
                <th className={`hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Kraftstoff
                </th>
                <th className={`px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Status
                </th>
                <th className={`px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Lade Fahrzeuge...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <Car className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Keine Fahrzeuge gefunden
                    </p>
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.id} 
                    onClick={() => navigate(`/portal/admin/vehicles/${vehicle.id}`)}
                    className={`${theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                  >
                    <td className={`px-4 lg:px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center">
                        <Car className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-semibold">{vehicle.license_plate}</span>
                      </div>
                    </td>
                    <td className={`hidden md:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {vehicle.tenant_name || vehicle.tenant_id}
                    </td>
                    <td className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="flex flex-col">
                        <span className="font-medium">{vehicle.brand}</span>
                        <span className="text-xs">{vehicle.model}</span>
                      </div>
                    </td>
                    <td className={`hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {vehicle.year}
                    </td>
                    <td className={`hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {vehicle.mileage.toLocaleString()} km
                    </td>
                    <td className={`hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {vehicle.color || '-'}
                    </td>
                    <td className={`hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {vehicle.fuel_type || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(vehicle.status)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(vehicle);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Bearbeiten"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVehicle(vehicle.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {showAddModal ? 'Neues Fahrzeug hinzufügen' : 'Fahrzeug bearbeiten'}
              </h3>
            </div>
            
            <form onSubmit={showAddModal ? handleAddVehicle : handleEditVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kennzeichen *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.license_plate}
                    onChange={(e) => setFormData({...formData, license_plate: e.target.value.toUpperCase()})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tenant *
                  </label>
                  <select
                    required
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Tenant auswählen</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Marke *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Modell *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Baujahr *
                  </label>
                  <input
                    type="number"
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    KM-Stand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.mileage}
                    onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    FIN/VIN
                  </label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Farbe
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kraftstoffart
                  </label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({...formData, fuel_type: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Auswählen</option>
                    <option value="Benzin">Benzin</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elektro">Elektro</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Wasserstoff">Wasserstoff</option>
                    <option value="Erdgas">Erdgas</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="active">Aktiv</option>
                    <option value="maintenance">Wartung</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Standort
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Notizen
                </label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    showAddModal ? setShowAddModal(false) : setShowEditModal(false);
                    setSelectedVehicle(null);
                    resetForm();
                  }}
                  className={theme === 'dark' ? 'border-gray-700 text-gray-300' : ''}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Speichern...' : (showAddModal ? 'Hinzufügen' : 'Aktualisieren')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
