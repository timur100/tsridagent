import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Plus, Edit2, Trash2, Save, X, MapPin, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

const DeliveryZoneManagement = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    center_lat: 52.520008,  // Default: Berlin
    center_lng: 13.404954,
    radius_km: 5,
    delivery_fee: 2.99,
    min_order_value: 10.0,
    estimated_time_min: 30,
    active: true,
    color: '#3b82f6'
  });

  const colorOptions = [
    { color: '#3b82f6', label: 'Blau' },
    { color: '#10b981', label: 'Grün' },
    { color: '#f59e0b', label: 'Orange' },
    { color: '#ef4444', label: 'Rot' },
    { color: '#8b5cf6', label: 'Lila' },
    { color: '#ec4899', label: 'Pink' }
  ];

  useEffect(() => {
    fetchZones();
  }, [tenantId, locationId]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/api/fastfood/delivery-zones?tenant_id=${tenantId}&location_id=${locationId}`);
      if (res?.success) {
        const zonesData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setZones(zonesData);
      }
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      toast.error('Fehler beim Laden der Lieferzonen');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/delivery-zones?tenant_id=${tenantId}&location_id=${locationId}`,
        'POST',
        formData
      );

      if (res?.success) {
        toast.success('Lieferzone erfolgreich erstellt!');
        setShowCreateModal(false);
        resetForm();
        fetchZones();
      } else {
        toast.error('Fehler beim Erstellen der Lieferzone');
      }
    } catch (error) {
      console.error('Error creating delivery zone:', error);
      toast.error('Fehler beim Erstellen der Lieferzone');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/delivery-zones/${editingZone.id}`,
        'PUT',
        formData
      );

      if (res?.success) {
        toast.success('Lieferzone erfolgreich aktualisiert!');
        setEditingZone(null);
        resetForm();
        fetchZones();
      } else {
        toast.error('Fehler beim Aktualisieren der Lieferzone');
      }
    } catch (error) {
      console.error('Error updating delivery zone:', error);
      toast.error('Fehler beim Aktualisieren der Lieferzone');
    }
  };

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Möchten Sie diese Lieferzone wirklich löschen?')) return;

    try {
      const res = await apiCall(`/api/fastfood/delivery-zones/${zoneId}`, 'DELETE');
      
      if (res?.success) {
        toast.success('Lieferzone erfolgreich gelöscht!');
        fetchZones();
      } else {
        toast.error('Fehler beim Löschen der Lieferzone');
      }
    } catch (error) {
      console.error('Error deleting delivery zone:', error);
      toast.error('Fehler beim Löschen der Lieferzone');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      center_lat: 52.520008,
      center_lng: 13.404954,
      radius_km: 5,
      delivery_fee: 2.99,
      min_order_value: 10.0,
      estimated_time_min: 30,
      active: true,
      color: '#3b82f6'
    });
  };

  const openEditModal = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name || '',
      description: zone.description || '',
      center_lat: zone.center_lat || 52.520008,
      center_lng: zone.center_lng || 13.404954,
      radius_km: zone.radius_km || 5,
      delivery_fee: zone.delivery_fee || 2.99,
      min_order_value: zone.min_order_value || 10.0,
      estimated_time_min: zone.estimated_time_min || 30,
      active: zone.active !== undefined ? zone.active : true,
      color: zone.color || '#3b82f6'
    });
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
            Lieferzonen-Verwaltung
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Definieren Sie Lieferzonen, Gebühren und Lieferradien
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
          Neue Zone
        </Button>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones && zones.length > 0 && zones.map((zone) => (
          <Card
            key={zone.id}
            className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: `${zone.color}20` }}
                >
                  <MapPin className="h-6 w-6" style={{ color: zone.color }} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {zone.name}
                  </h3>
                  {zone.description && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {zone.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(zone)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(zone.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Zone Details */}
            <div className="space-y-2 mb-4">
              <div className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <Circle className="h-4 w-4" />
                <span>Radius: {zone.radius_km} km</span>
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                💰 Liefergebühr: {zone.delivery_fee.toFixed(2)} €
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                🛒 Mindestbestellwert: {zone.min_order_value.toFixed(2)} €
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                ⏱️ Lieferzeit: ~{zone.estimated_time_min} Min
              </div>
            </div>

            {/* Coordinates (for debugging) */}
            <div className="mb-3 p-2 rounded bg-gray-100 dark:bg-gray-800">
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                📍 Zentrum: {zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)}
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200 dark:border-gray-700">
              <span
                className={`px-2 py-1 rounded ${
                  zone.active
                    ? 'bg-green-500 bg-opacity-10 text-green-500'
                    : 'bg-gray-500 bg-opacity-10 text-gray-500'
                }`}
              >
                {zone.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Lieferzonen vorhanden
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen Sie Ihre erste Lieferzone
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Zone erstellen
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingZone) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingZone ? 'Lieferzone bearbeiten' : 'Neue Lieferzone erstellen'}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingZone(null);
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
                    Zonenname *
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
                    placeholder="z.B. Innenstadt, Vorort Nord"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows="2"
                    placeholder="Optionale Beschreibung der Zone"
                  />
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Breitengrad (Lat)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.center_lat}
                      onChange={(e) => setFormData({ ...formData, center_lat: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded border ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Längengrad (Lng)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.center_lng}
                      onChange={(e) => setFormData({ ...formData, center_lng: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded border ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div className={`text-xs p-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  💡 Tipp: Verwenden Sie Google Maps, um die Koordinaten Ihres Zentrums zu finden
                </div>

                {/* Radius */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Lieferradius (km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.radius_km}
                    onChange={(e) => setFormData({ ...formData, radius_km: parseFloat(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="0.5"
                  />
                </div>

                {/* Delivery Fee */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Liefergebühr (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="0"
                  />
                </div>

                {/* Min Order Value */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mindestbestellwert (€)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={formData.min_order_value}
                    onChange={(e) => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="0"
                  />
                </div>

                {/* Estimated Time */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Geschätzte Lieferzeit (Minuten)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={formData.estimated_time_min}
                    onChange={(e) => setFormData({ ...formData, estimated_time_min: parseInt(e.target.value) || 30 })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="10"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Farbe (für Karte)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: item.color })}
                        className={`w-full h-10 rounded-lg border-2 transition-all ${
                          formData.color === item.color ? 'border-white ring-2 ring-orange-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.label}
                      />
                    ))}
                  </div>
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
                    Zone ist aktiv
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingZone(null);
                    resetForm();
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={editingZone ? handleUpdate : handleCreate}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!formData.name}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingZone ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeliveryZoneManagement;
