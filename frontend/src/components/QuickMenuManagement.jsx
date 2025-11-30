import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical, Save, X, Eye, LayoutGrid, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import * as Icons from 'lucide-react';

const QuickMenuManagement = ({ theme }) => {
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('tiles'); // tiles, config, preview
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTileModal, setShowTileModal] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Available Lucide icons for tile selection
  const availableIcons = [
    'Home', 'Users', 'Settings', 'FileText', 'Box', 'Package', 
    'Truck', 'ShoppingCart', 'BarChart', 'PieChart', 'Activity',
    'Bell', 'Calendar', 'Camera', 'Check', 'Clock', 'Database',
    'Download', 'Upload', 'Folder', 'Grid', 'Hash', 'Heart',
    'Image', 'Info', 'Key', 'Layout', 'List', 'Lock', 'Mail',
    'Map', 'MessageSquare', 'Monitor', 'Phone', 'Play', 'Plus',
    'Search', 'Send', 'Shield', 'Star', 'Tag', 'Target', 'Tool',
    'Trash', 'TrendingUp', 'User', 'Video', 'Wifi', 'Zap'
  ];

  // Available colors for tiles
  const availableColors = [
    { name: 'Rot', value: '#c00000' },
    { name: 'Blau', value: '#0066cc' },
    { name: 'Grün', value: '#00aa00' },
    { name: 'Orange', value: '#ff8800' },
    { name: 'Lila', value: '#8800cc' },
    { name: 'Türkis', value: '#00aacc' },
    { name: 'Pink', value: '#ff0088' },
    { name: 'Gelb', value: '#ffaa00' },
    { name: 'Grau', value: '#666666' },
  ];

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      loadTenantData();
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      console.log('🔍 Loading tenants from API...');
      const response = await apiCall('/api/quick-menu/tenants/list', 'GET');
      console.log('📦 API Response:', response);
      
      // apiCall wraps response in {success, data, status}
      const tenantData = response.data || response;
      const tenantsList = tenantData.tenants || [];
      
      console.log('📋 Tenants list:', tenantsList);
      
      if (tenantsList && tenantsList.length > 0) {
        console.log('✅ Found', tenantsList.length, 'tenants');
        setTenants(tenantsList);
        setSelectedTenant(tenantsList[0]);
        toast.success(`${tenantsList.length} Tenants geladen`);
      } else {
        console.error('❌ No tenants in response:', response);
        toast.error('Keine Tenants gefunden');
      }
    } catch (error) {
      console.error('❌ Error loading tenants:', error);
      toast.error('Fehler beim Laden der Tenants: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantData = async () => {
    if (!selectedTenant) return;
    
    setLoading(true);
    try {
      console.log('📂 Loading data for tenant:', selectedTenant.id);
      
      // Load tiles
      const tilesResponse = await apiCall(
        `/api/quick-menu/tiles/tenant/${selectedTenant.id}`,
        'GET'
      );
      const tilesData = tilesResponse.data || tilesResponse;
      const tilesList = tilesData.tiles || [];
      console.log('📋 Loaded tiles:', tilesList.length);
      setTiles(tilesList);

      // Load config
      const configResponse = await apiCall(
        `/api/quick-menu/config/tenant/${selectedTenant.id}`,
        'GET'
      );
      const configData = configResponse.data || configResponse;
      const configObj = configData.config || null;
      console.log('⚙️ Loaded config:', configObj);
      setConfig(configObj);
    } catch (error) {
      console.error('❌ Error loading tenant data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTile = () => {
    setEditingTile({
      title: '',
      description: '',
      icon: 'Box',
      color: '#c00000',
      target_url: '',
      target_type: 'internal',
      order: tiles.length
    });
    setShowTileModal(true);
  };

  const handleEditTile = (tile) => {
    setEditingTile(tile);
    setShowTileModal(true);
  };

  const handleSaveTile = async (tileData) => {
    try {
      console.log('💾 Saving tile:', tileData);
      
      let response;
      if (tileData.tile_id) {
        // Update existing
        console.log('📝 Updating tile:', tileData.tile_id);
        response = await apiCall(
          `/api/quick-menu/tiles/update/${tileData.tile_id}`,
          { method: 'PUT', body: tileData }
        );
      } else {
        // Create new
        console.log('➕ Creating new tile for tenant:', selectedTenant.id);
        response = await apiCall('/api/quick-menu/tiles/create', {
          method: 'POST',
          body: {
            ...tileData,
            tenant_id: selectedTenant.id
          }
        });
      }
      
      console.log('✅ Save response:', response);
      
      const success = response?.success || response?.data?.success;
      if (success) {
        toast.success(tileData.tile_id ? 'Kachel aktualisiert' : 'Kachel erstellt');
        setShowTileModal(false);
        setEditingTile(null);
        await loadTenantData();
      } else {
        throw new Error('Server returned unsuccessful response');
      }
    } catch (error) {
      console.error('❌ Error saving tile:', error);
      toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
    }
  };

  const handleDeleteTile = async (tileId) => {
    if (!window.confirm('Kachel wirklich löschen?')) return;
    
    try {
      await apiCall(`/api/quick-menu/tiles/delete/${tileId}`, { method: 'DELETE' });
      toast.success('Kachel gelöscht');
      loadTenantData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      await apiCall(
        `/api/quick-menu/config/update/${selectedTenant.id}`,
        { method: 'PUT', body: configData }
      );
      toast.success('Konfiguration gespeichert');
      setShowConfigModal(false);
      loadTenantData();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const renderTileIcon = (iconName) => {
    const IconComponent = Icons[iconName];
    return IconComponent ? <IconComponent className="h-6 w-6" /> : <Icons.Box className="h-6 w-6" />;
  };

  if (loading && !selectedTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Schnellmenü Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Konfigurieren Sie Schnellmenüs für jeden Tenant
          </p>
        </div>
      </div>

      {/* Tenant Selector */}
      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Tenant auswählen
          </label>
          <button
            onClick={loadTenants}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] text-gray-400 hover:bg-[#333333]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔄 Neu laden
          </button>
        </div>
        {tenants.length === 0 ? (
          <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="text-sm mb-2">Keine Tenants gefunden</p>
            <button
              onClick={loadTenants}
              className="text-sm text-[#c00000] hover:text-[#a00000] font-semibold"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <select
            value={selectedTenant?.id || ''}
            onChange={(e) => {
              const tenant = tenants.find(t => t.id === e.target.value);
              setSelectedTenant(tenant);
            }}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('tiles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'tiles'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333333]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Kacheln
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'config'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333333]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          Konfiguration
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'preview'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333333]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Eye className="h-4 w-4" />
          Vorschau
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tiles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kacheln ({tiles.length})
            </h3>
            <button
              onClick={handleCreateTile}
              className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neue Kachel
            </button>
          </div>

          {tiles.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <LayoutGrid className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine Kacheln vorhanden
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Erstellen Sie die erste Kachel für diesen Tenant
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiles.map((tile) => (
                <div
                  key={tile.tile_id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${tile.color}20`, color: tile.color }}
                    >
                      {renderTileIcon(tile.icon)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTile(tile)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-[#1a1a1a] text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTile(tile.tile_id)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-[#1a1a1a] text-red-400'
                            : 'hover:bg-gray-100 text-red-600'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tile.title}
                  </h4>
                  {tile.description && (
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {tile.description}
                    </p>
                  )}
                  <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {tile.target_url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <ConfigEditor
          theme={theme}
          config={config}
          tenantId={selectedTenant?.id}
          onSave={handleSaveConfig}
        />
      )}

      {activeTab === 'preview' && (
        <QuickMenuPreview
          theme={theme}
          tenantId={selectedTenant?.id}
          tiles={tiles}
          config={config}
        />
      )}

      {/* Tile Modal */}
      {showTileModal && (
        <TileEditorModal
          theme={theme}
          tile={editingTile}
          availableIcons={availableIcons}
          availableColors={availableColors}
          onSave={handleSaveTile}
          onClose={() => {
            setShowTileModal(false);
            setEditingTile(null);
          }}
          renderTileIcon={renderTileIcon}
        />
      )}
    </div>
  );
};

// Tile Editor Modal Component
const TileEditorModal = ({ theme, tile, availableIcons, availableColors, onSave, onClose, renderTileIcon }) => {
  const [formData, setFormData] = useState(tile);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {formData.tile_id ? 'Kachel bearbeiten' : 'Neue Kachel'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-[#1a1a1a] text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Titel *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Beschreibung
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {availableIcons.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Farbe
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-white scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Ziel-URL *
            </label>
            <input
              type="text"
              value={formData.target_url}
              onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              required
              placeholder="/portal/admin/devices"
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Link-Typ
            </label>
            <select
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="internal">Intern</option>
              <option value="external">Extern</option>
            </select>
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Vorschau:
            </p>
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: `${formData.color}20`, color: formData.color }}
              >
                {renderTileIcon(formData.icon)}
              </div>
              <div>
                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formData.title || 'Titel'}
                </h4>
                {formData.description && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors font-semibold"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#333333]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Config Editor Component
const ConfigEditor = ({ theme, config, tenantId, onSave }) => {
  const [formData, setFormData] = useState(
    config || {
      logo_url: '',
      background_color: '#1a1a1a',
      show_logo: true,
      title: 'Schnellmenü',
      subtitle: '',
      is_active: true,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-lg font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Menü-Konfiguration
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Titel
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Untertitel
          </label>
          <input
            type="text"
            value={formData.subtitle || ''}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Logo URL
          </label>
          <input
            type="text"
            value={formData.logo_url || ''}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            placeholder="https://example.com/logo.png"
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Hintergrundfarbe
          </label>
          <input
            type="color"
            value={formData.background_color}
            onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
            className="w-full h-12 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show_logo"
            checked={formData.show_logo}
            onChange={(e) => setFormData({ ...formData, show_logo: e.target.checked })}
            className="w-4 h-4"
          />
          <label
            htmlFor="show_logo"
            className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Logo anzeigen
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          <label
            htmlFor="is_active"
            className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Schnellmenü aktiv
          </label>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors font-semibold"
        >
          Konfiguration speichern
        </button>
      </form>
    </div>
  );
};

// Preview Component
const QuickMenuPreview = ({ theme, tenantId, tiles, config }) => {
  const renderTileIcon = (iconName) => {
    const IconComponent = Icons[iconName];
    return IconComponent ? <IconComponent className="h-8 w-8" /> : <Icons.Box className="h-8 w-8" />;
  };

  return (
    <div
      className="rounded-xl p-8 min-h-[600px]"
      style={{ backgroundColor: config?.background_color || '#1a1a1a' }}
    >
      {config?.show_logo && config?.logo_url && (
        <div className="text-center mb-8">
          <img src={config.logo_url} alt="Logo" className="h-16 mx-auto" />
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">{config?.title || 'Schnellmenü'}</h1>
        {config?.subtitle && <p className="text-gray-400">{config.subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {tiles.map((tile) => (
          <div
            key={tile.tile_id}
            className="p-6 rounded-xl cursor-pointer transition-all hover:scale-105"
            style={{
              backgroundColor: `${tile.color}20`,
              borderLeft: `4px solid ${tile.color}`,
            }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div style={{ color: tile.color }}>
                {renderTileIcon(tile.icon)}
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">{tile.title}</h3>
                {tile.description && (
                  <p className="text-sm text-gray-400">{tile.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tiles.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Keine Kacheln vorhanden</p>
        </div>
      )}
    </div>
  );
};

export default QuickMenuManagement;
