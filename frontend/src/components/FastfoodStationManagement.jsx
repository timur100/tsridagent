import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Plus, Edit2, Trash2, Save, X, Flame, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

const FastfoodStationManagement = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    icon: '🔥',
    color: '#ef4444',
    display_order: 1,
    active: true,
    category_ids: []
  });

  // Available icons for stations
  const availableIcons = [
    { icon: '🔥', label: 'Grill' },
    { icon: '🍟', label: 'Pommes' },
    { icon: '🥤', label: 'Getränke' },
    { icon: '🍰', label: 'Dessert' },
    { icon: '☕', label: 'Kaffee' },
    { icon: '🥗', label: 'Salat' },
    { icon: '🍕', label: 'Pizza' },
    { icon: '🌮', label: 'Tacos' },
    { icon: '🍔', label: 'Burger' },
    { icon: '🥙', label: 'Wrap' }
  ];

  // Available colors
  const availableColors = [
    { color: '#ef4444', label: 'Rot' },
    { color: '#f59e0b', label: 'Orange' },
    { color: '#eab308', label: 'Gelb' },
    { color: '#22c55e', label: 'Grün' },
    { color: '#3b82f6', label: 'Blau' },
    { color: '#a855f7', label: 'Lila' },
    { color: '#ec4899', label: 'Pink' },
    { color: '#6b7280', label: 'Grau' }
  ];

  useEffect(() => {
    fetchData();
  }, [tenantId, locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stations
      const stationsRes = await apiCall(`/api/fastfood/stations?tenant_id=${tenantId}&location_id=${locationId}`);
      
      if (stationsRes?.success) {
        // Handle both array and nested object responses
        let stationsData = [];
        if (Array.isArray(stationsRes.data)) {
          stationsData = stationsRes.data;
        } else if (stationsRes.data && Array.isArray(stationsRes.data.data)) {
          stationsData = stationsRes.data.data;
        }
        setStations(stationsData);
      }

      // Fetch categories for linking
      const categoriesRes = await apiCall(`/api/fastfood/categories?tenant_id=${tenantId}&location_id=${locationId}`);
      if (categoriesRes?.success) {
        // Handle both array and nested object responses
        let categoriesData = [];
        if (Array.isArray(categoriesRes.data)) {
          categoriesData = categoriesRes.data;
        } else if (categoriesRes.data && Array.isArray(categoriesRes.data.data)) {
          categoriesData = categoriesRes.data.data;
        }
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/stations?tenant_id=${tenantId}&location_id=${locationId}`,
        'POST',
        formData
      );

      if (res?.success) {
        toast.success('Station erfolgreich erstellt!');
        setShowCreateModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error('Fehler beim Erstellen der Station');
      }
    } catch (error) {
      console.error('Error creating station:', error);
      toast.error('Fehler beim Erstellen der Station');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await apiCall(
        `/api/fastfood/stations/${editingStation.id}`,
        'PUT',
        formData
      );

      if (res?.success) {
        toast.success('Station erfolgreich aktualisiert!');
        setEditingStation(null);
        resetForm();
        fetchData();
      } else {
        toast.error('Fehler beim Aktualisieren der Station');
      }
    } catch (error) {
      console.error('Error updating station:', error);
      toast.error('Fehler beim Aktualisieren der Station');
    }
  };

  const handleDelete = async (stationId) => {
    if (!window.confirm('Möchten Sie diese Station wirklich löschen?')) return;

    try {
      const res = await apiCall(`/api/fastfood/stations/${stationId}`, 'DELETE');
      
      if (res?.success) {
        toast.success('Station erfolgreich gelöscht!');
        fetchData();
      } else {
        toast.error('Fehler beim Löschen der Station');
      }
    } catch (error) {
      console.error('Error deleting station:', error);
      toast.error('Fehler beim Löschen der Station');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      description: '',
      icon: '🔥',
      color: '#ef4444',
      display_order: 1,
      active: true,
      category_ids: []
    });
  };

  const openEditModal = (station) => {
    setEditingStation(station);
    setFormData({
      name: station.name || '',
      name_en: station.name_en || '',
      description: station.description || '',
      icon: station.icon || '🔥',
      color: station.color || '#ef4444',
      display_order: station.display_order || 1,
      active: station.active !== undefined ? station.active : true,
      category_ids: station.category_ids || []
    });
  };

  const toggleCategory = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }));
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
            Stationen-Verwaltung
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Küchenstationen wie Grill, Pommes, Getränke, etc.
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
          Neue Station
        </Button>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations && stations.length > 0 && stations.map((station) => (
          <Card
            key={station.id}
            className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="text-4xl p-3 rounded-lg"
                  style={{ backgroundColor: `${station.color}20` }}
                >
                  {station.icon}
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {station.name}
                  </h3>
                  {station.name_en && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {station.name_en}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(station)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(station.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {station.description && (
              <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {station.description}
              </p>
            )}

            {/* Zugeordnete Produktkategorien - Prominent Display */}
            {station.category_ids && station.category_ids.length > 0 ? (
              <div className="mb-3 p-3 rounded-lg bg-opacity-10" style={{ backgroundColor: `${station.color}20` }}>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  📋 Zubereitet:
                </p>
                <div className="flex flex-wrap gap-2">
                  {station.category_ids.map((catId) => {
                    const cat = categories.find(c => c.id === catId);
                    return cat ? (
                      <span
                        key={catId}
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          theme === 'dark' 
                            ? 'bg-gray-700 text-gray-200' 
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {cat.icon && `${cat.icon} `}{cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  ⚠️ Keine Kategorien zugeordnet
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                Reihenfolge: {station.display_order}
              </span>
              <span
                className={`px-2 py-1 rounded ${
                  station.active
                    ? 'bg-green-500 bg-opacity-10 text-green-500'
                    : 'bg-gray-500 bg-opacity-10 text-gray-500'
                }`}
              >
                {station.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {stations.length === 0 && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Stationen vorhanden
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen Sie Ihre erste Küchenstation
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Station erstellen
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStation) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingStation ? 'Station bearbeiten' : 'Neue Station erstellen'}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingStation(null);
                    resetForm();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Name (German) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name (Deutsch) *
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
                    placeholder="z.B. Grill Station"
                  />
                </div>

                {/* Name (English) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name (English)
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g. Grill Station"
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
                    rows="3"
                    placeholder="Beschreibung der Station"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Icon
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {availableIcons.map((item) => (
                      <button
                        key={item.icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: item.icon })}
                        className={`p-3 text-3xl rounded-lg border-2 transition-all ${
                          formData.icon === item.icon
                            ? 'border-orange-500 bg-orange-500 bg-opacity-10'
                            : theme === 'dark'
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Farbe
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {availableColors.map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: item.color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === item.color ? 'border-white ring-2 ring-orange-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Display Order */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Anzeigereihenfolge
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="1"
                  />
                </div>

                {/* Category Assignment */}
                {categories.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Kategorien zuweisen
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
                      {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.category_ids.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="rounded"
                          />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {cat.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

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
                    Station ist aktiv
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingStation(null);
                    resetForm();
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={editingStation ? handleUpdate : handleCreate}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!formData.name}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingStation ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FastfoodStationManagement;
