import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Car, Bike, Zap, MapPin, DollarSign, Battery, Navigation2, Circle, X } from 'lucide-react';
import { toast } from 'sonner';

const MobilityVehicles = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    vehicle_type: 'car',
    brand: '',
    model: '',
    license_plate: '',
    location_id: '',
    status: 'available',
    pricing: { hourly: 0, daily: 0, per_km: 0 },
    features: [],
    capacity: 1,
    battery_level: 100,
    range_km: 0,
    active: true
  });
  
  const vehicleTypes = [
    { id: 'car', label: 'Auto', icon: Car },
    { id: 'e_bike', label: 'E-Bike', icon: Zap },
    { id: 'bike', label: 'Fahrrad', icon: Bike },
    { id: 'e_scooter', label: 'E-Scooter', icon: Zap },
    { id: 'parking', label: 'Parkplatz', icon: MapPin }
  ];
  
  const statusOptions = [
    { id: 'available', label: 'Verfügbar', color: 'green' },
    { id: 'booked', label: 'Gebucht', color: 'blue' },
    { id: 'in_use', label: 'In Nutzung', color: 'yellow' },
    { id: 'maintenance', label: 'Wartung', color: 'red' },
    { id: 'offline', label: 'Offline', color: 'gray' }
  ];
  
  const featureOptions = ['GPS', 'Child Seat', 'Automatic', 'Electric', 'Bluetooth', 'USB Charging'];
  
  useEffect(() => {
    if (tenantId) {
      loadVehicles();
      loadLocations();
    }
  }, [tenantId, filterType, filterStatus]);
  
  const loadVehicles = async () => {
    setLoading(true);
    try {
      let url = `/api/mobility/vehicles?tenant_id=${tenantId}`;
      if (filterType !== 'all') url += `&vehicle_type=${filterType}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      
      const response = await apiCall(url);
      const vehicleData = response?.data || response || [];
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Fehler beim Laden der Fahrzeuge');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadLocations = async () => {
    try {
      const response = await apiCall(`/api/mobility/locations?tenant_id=${tenantId}`);
      const locationData = response?.data || response || [];
      setLocations(Array.isArray(locationData) ? locationData : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };
  
  const handleCreate = () => {
    setEditingVehicle(null);
    setFormData({
      name: '',
      vehicle_type: 'car',
      brand: '',
      model: '',
      license_plate: '',
      location_id: locations[0]?.id || '',
      status: 'available',
      pricing: { hourly: 0, daily: 0, per_km: 0 },
      features: [],
      capacity: 1,
      battery_level: 100,
      range_km: 0,
      active: true
    });
    setShowModal(true);
  };
  
  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      vehicle_type: vehicle.vehicle_type,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      license_plate: vehicle.license_plate || '',
      location_id: vehicle.location_id,
      status: vehicle.status,
      pricing: vehicle.pricing || { hourly: 0, daily: 0, per_km: 0 },
      features: vehicle.features || [],
      capacity: vehicle.capacity || 1,
      battery_level: vehicle.battery_level || 100,
      range_km: vehicle.range_km || 0,
      active: vehicle.active !== false
    });
    setShowModal(true);
  };
  
  const handleSave = async () => {
    try {
      if (editingVehicle) {
        await apiCall(`/api/mobility/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Fahrzeug aktualisiert');
      } else {
        await apiCall(`/api/mobility/vehicles?tenant_id=${tenantId}`, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Fahrzeug erstellt');
      }
      setShowModal(false);
      loadVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Fehler beim Speichern');
    }
  };
  
  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Fahrzeug "${vehicle.name}" wirklich löschen?`)) return;
    
    try {
      await apiCall(`/api/mobility/vehicles/${vehicle.id}`, { method: 'DELETE' });
      toast.success('Fahrzeug gelöscht');
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Fehler beim Löschen');
    }
  };
  
  const getVehicleIcon = (type) => {
    const config = vehicleTypes.find(v => v.id === type);
    return config ? config.icon : Car;
  };
  
  const getStatusBadge = (status) => {
    const config = statusOptions.find(s => s.id === status);
    if (!config) return null;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
        <Circle className="w-2 h-2" fill="currentColor" />
        {config.label}
      </span>
    );
  };
  
  const filteredVehicles = vehicles;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Fahrzeugverwaltung
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Multi-modale Flotte verwalten
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] hover:bg-[#a00000] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Fahrzeug hinzufügen
        </button>
      </div>
      
      {/* Filters */}
      <Card className="p-4 bg-white dark:bg-gray-900">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Fahrzeugtyp</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Alle Typen</option>
              {vehicleTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Alle Status</option>
              {statusOptions.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>
      
      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map(vehicle => {
          const VehicleIcon = getVehicleIcon(vehicle.vehicle_type);
          const location = locations.find(l => l.id === vehicle.location_id);
          
          return (
            <Card key={vehicle.id} className="p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#c00000]/10 rounded-lg">
                    <VehicleIcon className="w-6 h-6 text-[#c00000]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{vehicle.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.brand} {vehicle.model}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  {getStatusBadge(vehicle.status)}
                </div>
                
                {vehicle.license_plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Kennzeichen:</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{vehicle.license_plate}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{location?.name || 'Unbekannt'}</span>
                </div>
                
                {(vehicle.vehicle_type === 'e_bike' || vehicle.vehicle_type === 'e_scooter') && vehicle.battery_level !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Akku:</span>
                    <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                      <Battery className="w-4 h-4" />
                      <span>{vehicle.battery_level}%</span>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 mt-2 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Preise:</span>
                    <div className="flex gap-2 text-gray-900 dark:text-white">
                      {vehicle.pricing?.hourly > 0 && (
                        <span>{vehicle.pricing.hourly}€/h</span>
                      )}
                      {vehicle.pricing?.daily > 0 && (
                        <span>{vehicle.pricing.daily}€/Tag</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {filteredVehicles.length === 0 && (
        <Card className="p-12 text-center bg-white dark:bg-gray-900">
          <Car className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-500 dark:text-gray-400">Keine Fahrzeuge gefunden</p>
          <button
            onClick={handleCreate}
            className="mt-4 text-[#c00000] hover:underline font-medium"
          >
            Erstes Fahrzeug erstellen
          </button>
        </Card>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="z.B. Tesla Model 3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Fahrzeugtyp *</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {statusOptions.map(status => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Marke</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Modell</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kennzeichen</label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Standort *</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Bitte wählen</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Preisgestaltung</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Stündlich (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricing.hourly}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          pricing: { ...formData.pricing, hourly: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Täglich (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricing.daily}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          pricing: { ...formData.pricing, daily: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Pro km (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricing.per_km}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          pricing: { ...formData.pricing, per_km: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                
                {(formData.vehicle_type === 'e_bike' || formData.vehicle_type === 'e_scooter') && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Akkuladung (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.battery_level}
                      onChange={(e) => setFormData({ ...formData, battery_level: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kapazität (Personen)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name || !formData.location_id}
                  className="flex-1 px-4 py-2 bg-[#c00000] hover:bg-[#a00000] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingVehicle ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MobilityVehicles;