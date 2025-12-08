import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Settings, Cpu, Package, Key, BarChart3, 
  Plus, Edit2, Trash2, Save, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssetSettings = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeTab, setActiveTab] = useState('asset-ids'); // asset-ids, categories, templates, rules
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Asset ID Configuration
  const [assetIdConfig, setAssetIdConfig] = useState({
    prefix: '',
    pattern: '',
    start_number: 1,
    padding: 5,
    separator: '-',
    include_category: true,
    include_location: false,
    include_year: false
  });

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadAssetIdConfig();
    }
  }, [selectedTenantId]);

  const loadTenants = async () => {
    try {
      const result = await apiCall('/api/tenants');
      if (result.success) {
        const tenantsList = result.data?.data || result.data || [];
        setTenants(tenantsList);
        if (tenantsList.length > 0 && !selectedTenantId) {
          setSelectedTenantId(tenantsList[0].tenant_id);
        }
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Fehler beim Laden der Tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadAssetIdConfig = async () => {
    try {
      // TODO: Backend API endpoint
      // const result = await apiCall(`/api/assets/${selectedTenantId}/config`);
      // For now, use default values
      console.log('Loading asset config for tenant:', selectedTenantId);
    } catch (error) {
      console.error('Error loading asset config:', error);
    }
  };

  const saveAssetIdConfig = async () => {
    try {
      // TODO: Backend API endpoint
      // const result = await apiCall(`/api/assets/${selectedTenantId}/config`, 'POST', assetIdConfig);
      toast.success('Konfiguration gespeichert');
      console.log('Saving asset config:', assetIdConfig);
    } catch (error) {
      console.error('Error saving asset config:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const getExampleAssetId = () => {
    const { prefix, separator, padding, include_category, include_location, include_year } = assetIdConfig;
    let example = prefix || 'ASSET';
    
    if (include_year) {
      example += separator + new Date().getFullYear();
    }
    
    if (include_category) {
      example += separator + 'HW';
    }
    
    if (include_location) {
      example += separator + 'LOC1';
    }
    
    example += separator + String(1).padStart(padding, '0');
    
    return example;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Card className={`p-1 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('asset-ids')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'asset-ids'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-5 w-5" />
            Asset-IDs
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package className="h-5 w-5" />
            Kategorien
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Cpu className="h-5 w-5" />
            Vorlagen
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Key className="h-5 w-5" />
            Regeln
          </button>
        </div>
      </Card>

      {/* Tab Content */}
      {!selectedTenantId ? (
        <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="text-center">
            <Building2 className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Bitte wählen Sie einen Tenant aus
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Asset IDs Tab */}
          {activeTab === 'asset-ids' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <div className="space-y-6">
                <div>
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Asset-ID Konfiguration
                  </h4>
                  <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Definieren Sie das Format und die Struktur Ihrer Asset-IDs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prefix */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Präfix
                    </label>
                    <input
                      type="text"
                      value={assetIdConfig.prefix}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, prefix: e.target.value})}
                      placeholder="z.B. ASSET, PC, MON"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Separator */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Trennzeichen
                    </label>
                    <input
                      type="text"
                      value={assetIdConfig.separator}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, separator: e.target.value})}
                      placeholder="-"
                      maxLength={1}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Start Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Startnummer
                    </label>
                    <input
                      type="number"
                      value={assetIdConfig.start_number}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, start_number: parseInt(e.target.value)})}
                      min="1"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Padding */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Ziffern (Padding)
                    </label>
                    <input
                      type="number"
                      value={assetIdConfig.padding}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, padding: parseInt(e.target.value)})}
                      min="1"
                      max="10"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_category}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_category: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Kategorie einbeziehen (z.B. HW, SW)</span>
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_location}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_location: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Standort einbeziehen</span>
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_year}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_year: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Jahr einbeziehen</span>
                  </label>
                </div>

                {/* Example */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Beispiel Asset-ID:
                  </label>
                  <code className={`text-lg font-mono ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {getExampleAssetId()}
                  </code>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={saveAssetIdConfig}
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Konfiguration speichern
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Asset-Kategorien
              </h4>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Definieren Sie Kategorien für Hardware und Software Assets
              </p>
              <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1f1f1f]' : 'border-gray-300 bg-gray-50'
              }`}>
                <Package className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Asset-Kategorien Verwaltung wird hier angezeigt
                </p>
              </div>
            </Card>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Asset-Vorlagen
              </h4>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Erstellen Sie Vorlagen für verschiedene Asset-Typen
              </p>
              <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1f1f1f]' : 'border-gray-300 bg-gray-50'
              }`}>
                <Cpu className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Asset-Vorlagen Verwaltung wird hier angezeigt
                </p>
              </div>
            </Card>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Asset-Regeln
              </h4>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Definieren Sie automatische Regeln und Validierungen
              </p>
              <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1f1f1f]' : 'border-gray-300 bg-gray-50'
              }`}>
                <Key className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Asset-Regeln Verwaltung wird hier angezeigt
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AssetSettings;
