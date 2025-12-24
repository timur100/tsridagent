import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Save, Monitor, Shield, Users, Globe } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const PortalMetadata = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [activePortal, setActivePortal] = useState('verification');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState({
    verification: {
      browserTitle: 'TSRID | Verifizierung',
      metaDescription: 'ID Verifizierungs-System',
      faviconUrl: '',
      logoUrl: '',
      primaryColor: '#c00000'
    },
    admin: {
      browserTitle: 'TSRID | Admin Portal',
      metaDescription: 'Administrator Dashboard',
      faviconUrl: '',
      logoUrl: '',
      primaryColor: '#c00000'
    },
    customer: {
      browserTitle: 'TSRID | Kundenportal',
      metaDescription: 'Kunden Self-Service Portal',
      faviconUrl: '',
      logoUrl: '',
      primaryColor: '#c00000'
    }
  });

  const portals = [
    { id: 'verification', label: 'Verifizierungs-Seite', icon: Shield, path: '/', description: 'Die Haupt-Scanner-Oberfläche' },
    { id: 'admin', label: 'Admin Portal', icon: Monitor, path: '/portal/admin', description: 'Administrator Dashboard (/portal/admin)' },
    { id: 'customer', label: 'Kunden Portal', icon: Users, path: '/portal/customer', description: 'Kunden Self-Service (/portal/customer)' }
  ];

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const result = await apiCall('/api/portal/metadata');
      console.log('Portal Metadata fetch result:', result);
      
      // Handle different response structures
      let fetchedMetadata = null;
      
      if (result?.data?.data?.metadata) {
        // Double-wrapped: result.data.data.metadata
        fetchedMetadata = result.data.data.metadata;
      } else if (result?.data?.metadata) {
        // Single-wrapped: result.data.metadata
        fetchedMetadata = result.data.metadata;
      } else if (result?.metadata) {
        // Direct: result.metadata
        fetchedMetadata = result.metadata;
      }
      
      if (fetchedMetadata) {
        console.log('Setting metadata:', fetchedMetadata);
        setMetadata(prev => ({ ...prev, ...fetchedMetadata }));
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleSave = async (portalId) => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/metadata', {
        method: 'PUT',
        body: JSON.stringify({
          portal: portalId,
          ...metadata[portalId]
        })
      });

      if (result?.data?.success) {
        toast.success('Metadaten gespeichert!');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/metadata/all', {
        method: 'PUT',
        body: JSON.stringify({ metadata })
      });

      if (result?.data?.success) {
        toast.success('Alle Metadaten gespeichert!');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving all metadata:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const updateMetadata = (portalId, field, value) => {
    setMetadata(prev => ({
      ...prev,
      [portalId]: {
        ...prev[portalId],
        [field]: value
      }
    }));
  };

  const currentPortal = portals.find(p => p.id === activePortal);
  const currentData = metadata[activePortal];
  const PortalIcon = currentPortal?.icon || Globe;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Portal-Metadaten
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Passen Sie Browser-Tab-Titel und Branding für jedes Portal an
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={loading}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Alle speichern
        </Button>
      </div>

      {/* Portal Tabs */}
      <div className="flex gap-2">
        {portals.map((portal) => {
          const Icon = portal.icon;
          const isActive = activePortal === portal.id;
          return (
            <button
              key={portal.id}
              onClick={() => setActivePortal(portal.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#c00000] text-white'
                  : theme === 'dark'
                    ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{portal.label}</span>
            </button>
          );
        })}
      </div>

      {/* Portal Settings Card */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Portal Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#c00000]/20' : 'bg-[#c00000]/10'}`}>
              <PortalIcon className="h-6 w-6 text-[#c00000]" />
            </div>
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {currentPortal?.label}
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentPortal?.description}
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleSave(activePortal)}
            disabled={loading}
            variant="outline"
            className={theme === 'dark' ? 'border-gray-700 text-white hover:bg-[#2a2a2a]' : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            Speichern
          </Button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Browser Tab Title */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Browser-Tab Titel
              </label>
              <input
                type="text"
                value={currentData.browserTitle}
                onChange={(e) => updateMetadata(activePortal, 'browserTitle', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Wird im Browser-Tab angezeigt
              </p>
            </div>

            {/* Favicon */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Favicon
              </label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <Upload className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Klicken zum Hochladen
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  PNG, JPG, SVG oder ICO (max. 5MB)
                </p>
              </div>
              <input
                type="text"
                value={currentData.faviconUrl}
                onChange={(e) => updateMetadata(activePortal, 'faviconUrl', e.target.value)}
                placeholder="https://example.com/favicon.ico"
                className={`w-full px-3 py-2 mt-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Oder geben Sie eine URL ein
              </p>
            </div>

            {/* Primary Color */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Primärfarbe
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border"
                  style={{ backgroundColor: currentData.primaryColor }}
                />
                <input
                  type="text"
                  value={currentData.primaryColor}
                  onChange={(e) => updateMetadata(activePortal, 'primaryColor', e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border font-mono ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Meta Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Meta-Beschreibung
              </label>
              <input
                type="text"
                value={currentData.metaDescription}
                onChange={(e) => updateMetadata(activePortal, 'metaDescription', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Für SEO und Social Media
              </p>
            </div>

            {/* Logo */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Logo
              </label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <Upload className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Klicken zum Hochladen
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  PNG, JPG, SVG oder ICO (max. 5MB)
                </p>
              </div>
              <input
                type="text"
                value={currentData.logoUrl}
                onChange={(e) => updateMetadata(activePortal, 'logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                className={`w-full px-3 py-2 mt-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Oder geben Sie eine URL ein
              </p>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentData.primaryColor }} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Vorschau
            </span>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'
          }`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentData.primaryColor }} />
            <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {currentData.browserTitle}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PortalMetadata;
