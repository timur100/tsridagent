import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, MapPin, Clock, Car, Bike, Zap, Circle, X, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const MobilityLocations = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Deutschland',
    lat: 52.52,
    lng: 13.405,
    location_type: 'station',
    operating_hours: { open: '06:00', close: '22:00' },
    available_vehicle_types: [],
    active: true
  });
  
  const locationTypes = [
    { id: 'station', label: 'Station' },
    { id: 'parking', label: 'Parkplatz' },
    { id: 'free_floating', label: 'Free Floating Zone' }
  ];
  
  const vehicleTypeOptions = [
    { id: 'car', label: 'Autos', icon: Car },
    { id: 'e_bike', label: 'E-Bikes', icon: Zap },
    { id: 'bike', label: 'Fahrräder', icon: Bike },
    { id: 'e_scooter', label: 'E-Scooter', icon: Zap },
    { id: 'parking', label: 'Parkplätze', icon: MapPin }
  ];
  
  useEffect(() => {
    if (tenantId) {
      loadLocations();
    }
  }, [tenantId]);
  
  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/mobility/locations?tenant_id=${tenantId}`);
      const locationData = response?.data || response || [];
      setLocations(Array.isArray(locationData) ? locationData : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Fehler beim Laden der Standorte');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'Deutschland',
      lat: 52.52,
      lng: 13.405,
      location_type: 'station',
      operating_hours: { open: '06:00', close: '22:00' },
      available_vehicle_types: [],
      active: true
    });
    setShowModal(true);
  };
  
  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postal_code,
      country: location.country || 'Deutschland',
      lat: location.lat,
      lng: location.lng,
      location_type: location.location_type,
      operating_hours: location.operating_hours || { open: '06:00', close: '22:00' },
      available_vehicle_types: location.available_vehicle_types || [],
      active: location.active !== false
    });
    setShowModal(true);
  };
  
  const handleSave = async () => {
    try {
      if (editingLocation) {
        await apiCall(`/api/mobility/locations/${editingLocation.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Standort aktualisiert');
      } else {
        await apiCall(`/api/mobility/locations?tenant_id=${tenantId}`, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Standort erstellt');
      }
      setShowModal(false);
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(error.message || 'Fehler beim Speichern');
    }
  };
  
  const handleDelete = async (location) => {
    if (!window.confirm(`Standort "${location.name}" wirklich löschen?`)) return;
    
    try {
      await apiCall(`/api/mobility/locations/${location.id}`, { method: 'DELETE' });
      toast.success('Standort gelöscht');
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      const errorMsg = error.message || 'Fehler beim Löschen';
      toast.error(errorMsg);
    }
  };
  
  const toggleVehicleType = (typeId) => {
    setFormData(prev => {
      const types = prev.available_vehicle_types || [];
      if (types.includes(typeId)) {
        return { ...prev, available_vehicle_types: types.filter(t => t !== typeId) };
      } else {
        return { ...prev, available_vehicle_types: [...types, typeId] };
      }
    });
  };
  
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
            Standortverwaltung
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stationen und Parkplätze verwalten
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] hover:bg-[#a00000] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Standort hinzufügen
        </button>
      </div>
      
      {/* Location List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {locations.map(location => (
          <Card key={location.id} className="p-6 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#c00000]/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-[#c00000]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{location.name}</h3>
                  <p className="text-sm text-gray-500">{location.city}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(location)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(location)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {location.address}<br />
                {location.postal_code} {location.city}
              </div>
              
              {location.operating_hours && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {location.operating_hours.open} - {location.operating_hours.close} Uhr
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </div>
              
              <div className="pt-3 border-t dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Fahrzeuge:</span>
                  <span className="text-sm font-bold">{location.vehicle_count || 0}</span>
                </div>
                {location.available_vehicle_types && location.available_vehicle_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {location.available_vehicle_types.map(type => {
                      const typeConfig = vehicleTypeOptions.find(v => v.id === type);
                      return typeConfig ? (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          <typeConfig.icon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {locations.length === 0 && (
        <Card className="p-12 text-center bg-white dark:bg-gray-900">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Keine Standorte gefunden</p>
          <button
            onClick={handleCreate}
            className="mt-4 text-[#c00000] hover:underline"
          >
            Ersten Standort erstellen
          </button>
        </Card>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingLocation ? 'Standort bearbeiten' : 'Neuer Standort'}
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
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="z.B. Berlin Hauptbahnhof"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Adresse *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="z.B. Europaplatz 1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Stadt *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">PLZ *</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Typ</label>
                  <select
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    {locationTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Land</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Öffnungszeiten</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={formData.operating_hours.open}
                      onChange={(e) => setFormData({
                        ...formData,
                        operating_hours: { ...formData.operating_hours, open: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <span>bis</span>
                    <input
                      type="time"
                      value={formData.operating_hours.close}
                      onChange={(e) => setFormData({
                        ...formData,
                        operating_hours: { ...formData.operating_hours, close: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Verfügbare Fahrzeugtypen</label>
                  <div className="flex flex-wrap gap-2">
                    {vehicleTypeOptions.map(type => {
                      const isSelected = (formData.available_vehicle_types || []).includes(type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleVehicleType(type.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-[#c00000] text-white border-[#c00000]'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-[#c00000]'
                          }`}
                        >
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
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
                  disabled={!formData.name || !formData.address || !formData.city || !formData.postal_code}
                  className="flex-1 px-4 py-2 bg-[#c00000] hover:bg-[#a00000] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingLocation ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MobilityLocations;