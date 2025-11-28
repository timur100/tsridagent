import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Car, Calendar, Gauge, Palette, Fuel, MapPin, FileText, Edit, Trash2, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const VehicleDetailPage = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const result = await apiCall(`/api/vehicles/${vehicleId}`);
      if (result.success && result.data?.success) {
        setVehicle(result.data.data);
        setFormData(result.data.data);
      } else {
        toast.error('Fahrzeug nicht gefunden');
        navigate('/portal/admin');
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      toast.error('Fehler beim Laden des Fahrzeugs');
      navigate('/portal/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiCall(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (result.success && result.data?.success) {
        toast.success('Fahrzeug erfolgreich aktualisiert');
        setVehicle(result.data.data);
        setShowEditModal(false);
      } else {
        const errorMsg = result.data?.message || result.data?.detail || result.error || 'Fehler beim Aktualisieren';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Fehler beim Aktualisieren des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie dieses Fahrzeug wirklich löschen?')) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });
      
      if (result.success && result.data?.success) {
        toast.success('Fahrzeug erfolgreich gelöscht');
        navigate('/portal/admin');
      } else {
        const errorMsg = result.data?.message || result.data?.detail || result.error || 'Fehler beim Löschen';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Fehler beim Löschen des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <Loader className="h-8 w-8 animate-spin text-[#c00000]" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-600';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'inactive':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'maintenance':
        return 'Wartung';
      case 'inactive':
        return 'Inaktiv';
      default:
        return status;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/portal/admin')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {vehicle.license_plate}
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fahrzeugdetails
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Bearbeiten</span>
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Löschen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Info Card */}
            <div className={`rounded-lg border p-6 ${
              theme === 'dark' ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-3 mb-6">
                <Car className="h-6 w-6 text-[#c00000]" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Fahrzeuginformationen
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kennzeichen
                  </label>
                  <p className={`mt-1 text-lg font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.license_plate}
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </label>
                  <div className="mt-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(vehicle.status)}`}>
                      {getStatusText(vehicle.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Marke
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.brand}
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Modell
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.model}
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar className="h-4 w-4" />
                    <span>Baujahr</span>
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.year}
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Gauge className="h-4 w-4" />
                    <span>Kilometerstand</span>
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.mileage?.toLocaleString('de-DE')} km
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Palette className="h-4 w-4" />
                    <span>Farbe</span>
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.color}
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Fuel className="h-4 w-4" />
                    <span>Kraftstoffart</span>
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.fuel_type}
                  </p>
                </div>

                {vehicle.vin && (
                  <div className="md:col-span-2">
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fahrgestellnummer (VIN)
                    </label>
                    <p className={`mt-1 font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {vehicle.vin}
                    </p>
                  </div>
                )}

                {vehicle.location && (
                  <div className="md:col-span-2">
                    <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin className="h-4 w-4" />
                      <span>Standort</span>
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {vehicle.location}
                    </p>
                  </div>
                )}

                {vehicle.notes && (
                  <div className="md:col-span-2">
                    <label className={`text-sm font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FileText className="h-4 w-4" />
                      <span>Notizen</span>
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {vehicle.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tenant Info */}
            <div className={`rounded-lg border p-6 ${
              theme === 'dark' ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Mandant
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {vehicle.tenant_id}
              </p>
            </div>

            {/* Timestamps */}
            <div className={`rounded-lg border p-6 ${
              theme === 'dark' ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Zeitstempel
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Erstellt am
                  </label>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(vehicle.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aktualisiert am
                  </label>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(vehicle.updated_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Fahrzeug bearbeiten
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Kennzeichen
                    </label>
                    <input
                      type="text"
                      value={formData.license_plate || ''}
                      onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="active">Aktiv</option>
                      <option value="maintenance">Wartung</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Marke
                    </label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Modell
                    </label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Baujahr
                    </label>
                    <input
                      type="number"
                      value={formData.year || ''}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Kilometerstand
                    </label>
                    <input
                      type="number"
                      value={formData.mileage || ''}
                      onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Farbe
                    </label>
                    <input
                      type="text"
                      value={formData.color || ''}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Kraftstoffart
                    </label>
                    <select
                      value={formData.fuel_type || ''}
                      onChange={(e) => setFormData({...formData, fuel_type: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="Benzin">Benzin</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Elektro">Elektro</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standort
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Notizen
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setFormData(vehicle);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Wird aktualisiert...' : 'Aktualisieren'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetailPage;
