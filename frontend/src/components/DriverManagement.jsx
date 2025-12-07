import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Plus, Edit2, Trash2, Save, X, User, Car, Bike } from 'lucide-react';
import toast from 'react-hot-toast';

const DriverManagement = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle_type: 'Auto',
    vehicle_number: '',
    status: 'offline',
    active: true
  });

  const vehicleTypes = [
    { value: 'Auto', label: 'Auto 🚗', icon: Car },
    { value: 'Motorrad', label: 'Motorrad 🏍️', icon: Motorcycle },
    { value: 'Fahrrad', label: 'Fahrrad 🚴', icon: Bike }
  ];

  const statusOptions = [
    { value: 'available', label: 'Verfügbar', color: 'green' },
    { value: 'busy', label: 'Beschäftigt', color: 'orange' },
    { value: 'on_break', label: 'Pause', color: 'blue' },
    { value: 'offline', label: 'Offline', color: 'gray' }
  ];

  useEffect(() => {
    fetchDrivers();
  }, [tenantId, locationId]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/api/fastfood/drivers?tenant_id=${tenantId}&location_id=${locationId}`);
      if (res?.success) {
        const driversData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setDrivers(driversData);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Fehler beim Laden der Fahrer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/drivers?tenant_id=${tenantId}&location_id=${locationId}`,
        'POST',
        formData
      );

      if (res?.success) {
        toast.success('Fahrer erfolgreich erstellt!');
        setShowCreateModal(false);
        resetForm();
        fetchDrivers();
      } else {
        toast.error('Fehler beim Erstellen des Fahrers');
      }
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error('Fehler beim Erstellen des Fahrers');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/drivers/${editingDriver.id}`,
        'PUT',
        formData
      );

      if (res?.success) {
        toast.success('Fahrer erfolgreich aktualisiert!');
        setEditingDriver(null);
        resetForm();
        fetchDrivers();
      } else {
        toast.error('Fehler beim Aktualisieren des Fahrers');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Fehler beim Aktualisieren des Fahrers');
    }
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm('Möchten Sie diesen Fahrer wirklich löschen?')) return;

    try {
      const res = await apiCall(`/api/fastfood/drivers/${driverId}`, 'DELETE');
      
      if (res?.success) {
        toast.success('Fahrer erfolgreich gelöscht!');
        fetchDrivers();
      } else {
        toast.error('Fehler beim Löschen des Fahrers');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Fehler beim Löschen des Fahrers');
    }
  };

  const handleStatusChange = async (driverId, newStatus) => {
    try {
      const res = await apiCall(
        `/api/fastfood/drivers/${driverId}/status?status=${newStatus}`,
        'PATCH'
      );
      
      if (res?.success) {
        toast.success('Status aktualisiert!');
        fetchDrivers();
      } else {
        toast.error('Fehler beim Aktualisieren des Status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      vehicle_type: 'Auto',
      vehicle_number: '',
      status: 'offline',
      active: true
    });
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      vehicle_type: driver.vehicle_type || 'Auto',
      vehicle_number: driver.vehicle_number || '',
      status: driver.status || 'offline',
      active: driver.active !== undefined ? driver.active : true
    });
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? option.color : 'gray';
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? option.label : status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Fahrer-Verwaltung
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Lieferfahrer und deren Status
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Fahrer
        </Button>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers && drivers.length > 0 && drivers.map((driver) => {
          const VehicleIcon = vehicleTypes.find(v => v.value === driver.vehicle_type)?.icon || Car;
          const statusColor = getStatusColor(driver.status);
          
          return (
            <Card
              key={driver.id}
              className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    statusColor === 'green' ? 'bg-green-500' :
                    statusColor === 'orange' ? 'bg-orange-500' :
                    statusColor === 'blue' ? 'bg-blue-500' :
                    'bg-gray-500'
                  } bg-opacity-10`}>
                    <VehicleIcon className={`h-6 w-6 ${
                      statusColor === 'green' ? 'text-green-500' :
                      statusColor === 'orange' ? 'text-orange-500' :
                      statusColor === 'blue' ? 'text-blue-500' :
                      'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {driver.name}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {driver.vehicle_type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(driver)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(driver.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  📞 {driver.phone}
                </div>
                {driver.email && (
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    ✉️ {driver.email}
                  </div>
                )}
                {driver.vehicle_number && (
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    🚗 {driver.vehicle_number}
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div className="mb-3">
                <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status:
                </label>
                <select
                  value={driver.status}
                  onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                  Lieferungen: {driver.total_deliveries || 0}
                </span>
                {driver.current_order_id && (
                  <span className="px-2 py-1 rounded bg-orange-500 bg-opacity-10 text-orange-500">
                    Aktive Bestellung
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Fahrer vorhanden
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fügen Sie Ihren ersten Lieferfahrer hinzu
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Fahrer hinzufügen
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDriver) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingDriver ? 'Fahrer bearbeiten' : 'Neuen Fahrer hinzufügen'}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Max Mustermann"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="+49 123 456789"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="fahrer@example.com"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Fahrzeugtyp
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {vehicleTypes.map(vt => (
                      <option key={vt.value} value={vt.value}>{vt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kennzeichen / Fahrzeugnummer
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="B-XX 1234"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Anfangsstatus
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <label
                    htmlFor="active"
                    className={`text-sm font-medium cursor-pointer ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Fahrer ist aktiv
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={editingDriver ? handleUpdate : handleCreate}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!formData.name || !formData.phone}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingDriver ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
