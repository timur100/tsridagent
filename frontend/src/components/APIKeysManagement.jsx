import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Key, Eye, EyeOff, Plus, Trash2, CheckCircle, Loader } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const APIKeysManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [newKey, setNewKey] = useState({ api_name: '', api_key: '', description: '' });
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [testing, setTesting] = useState({});
  const [editValues, setEditValues] = useState({});
  const [editDescs, setEditDescs] = useState({});

  // Available API types - categorized
  const apiCategories = [
    {
      category: 'Hetzner',
      icon: '☁️',
      items: [
        { name: 'hetzner_api', display: 'Hetzner API Token', description: 'Für Server-Verwaltung und Cloud-Ressourcen', testable: true },
        { name: 'hetzner_dns', display: 'Hetzner DNS Token', description: 'Für DNS-Zonenverwaltung', testable: true },
        { name: 'traefik_dns', display: 'Traefik DNS Token', description: 'Für automatische SSL-Zertifikate', testable: false },
      ]
    },
    {
      category: 'GitHub',
      icon: '🐙',
      items: [
        { name: 'github_pat', display: 'GitHub Personal Access Token', description: 'Für Repository-Zugriff und Deployments', testable: true },
        { name: 'github_webhook', display: 'GitHub Webhook Secret', description: 'Für automatische Deployments', testable: false },
      ]
    },
    {
      category: 'Datenbanken',
      icon: '🗄️',
      items: [
        { name: 'mongodb_atlas', display: 'MongoDB Atlas Connection', description: 'MongoDB Atlas Connection String', testable: true },
        { name: 'redis', display: 'Redis Password', description: 'Redis Cache Authentifizierung', testable: false },
      ]
    },
    {
      category: 'Server-Zugang',
      icon: '🔐',
      items: [
        { name: 'ssh_root', display: 'SSH Root Credentials', description: 'SSH Zugangsdaten für Server', testable: false },
        { name: 'traefik_admin', display: 'Traefik Admin', description: 'Traefik Dashboard Zugangsdaten', testable: false },
      ]
    },
    {
      category: 'Externe APIs',
      icon: '🔌',
      items: [
        { name: 'google_places', display: 'Google Places API', description: 'Für Standort-Autovervollständigung', testable: true },
        { name: 'teamviewer', display: 'TeamViewer API Token', description: 'Für Geräte-Fernwartung', testable: true },
        { name: 'dhl_api', display: 'DHL API Credentials', description: 'Für Versand-Integration', testable: false },
      ]
    },
  ];

  // Flatten for backwards compatibility
  const apiTypes = apiCategories.flatMap(cat => cat.items);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/api-keys');
      console.log('API Keys raw result:', JSON.stringify(result, null, 2));
      
      // Handle different response structures - apiCall may wrap the response
      let keys = [];
      
      // Try different paths to find api_keys array
      if (result?.data?.data?.api_keys) {
        // Double-wrapped: result.data.data.api_keys
        keys = result.data.data.api_keys;
      } else if (result?.data?.api_keys) {
        // Single-wrapped: result.data.api_keys
        keys = result.data.api_keys;
      } else if (result?.api_keys) {
        // Direct: result.api_keys
        keys = result.api_keys;
      } else if (Array.isArray(result?.data)) {
        // Array in data
        keys = result.data;
      } else if (Array.isArray(result)) {
        // Direct array
        keys = result;
      }
      
      // Add masked_key if not present
      keys = keys.map(key => ({
        ...key,
        masked_key: key.masked_key || key.api_key?.substring(0, 10) + '...' || '***'
      }));
      
      console.log('Parsed API keys:', keys.length, keys.map(k => k.api_name));
      setApiKeys(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Fehler beim Laden der API-Keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.api_name || !newKey.api_key) {
      toast.error('Bitte API-Name und Key eingeben');
      return;
    }

    try {
      const result = await apiCall('/api/portal/api-keys', {
        method: 'POST',
        body: JSON.stringify(newKey)
      });

      if (result.success && result.data && result.data.data) {
        toast.success(result.data.message || 'API-Key erfolgreich hinzugefügt');
        setNewKey({ api_name: '', api_key: '', description: '' });
        setShowNewKeyForm(false);
        fetchAPIKeys();
      } else {
        toast.error(result.data?.message || 'Fehler beim Hinzufügen des API-Keys');
      }
    } catch (error) {
      console.error('Error adding API key:', error);
      toast.error('Fehler beim Hinzufügen des API-Keys');
    }
  };

  const handleUpdateKey = async (apiName, keyValue, description) => {
    try {
      const result = await apiCall(`/api/portal/api-keys/${apiName}`, {
        method: 'PUT',
        body: JSON.stringify({ api_key: keyValue, description })
      });

      if (result.success && result.data && result.data.data) {
        toast.success(result.data.message || 'API-Key erfolgreich aktualisiert');
        setEditingKey(null);
        fetchAPIKeys();
      } else {
        toast.error(result.data?.message || 'Fehler beim Aktualisieren des API-Keys');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Fehler beim Aktualisieren des API-Keys');
    }
  };

  const handleDeleteKey = async (apiName) => {
    if (!window.confirm(`API-Key für ${apiName} wirklich löschen?`)) {
      return;
    }

    try {
      const result = await apiCall(`/api/portal/api-keys/${apiName}`, {
        method: 'DELETE'
      });

      if (result.success && result.data && result.data.data) {
        toast.success(result.data.message || 'API-Key erfolgreich gelöscht');
        fetchAPIKeys();
      } else {
        toast.error(result.data?.message || 'Fehler beim Löschen des API-Keys');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Fehler beim Löschen des API-Keys');
    }
  };

  const handleTestKey = async (apiName, keyValue) => {
    setTesting({ ...testing, [apiName]: true });
    
    try {
      const result = await apiCall('/api/portal/api-keys/test', {
        method: 'POST',
        body: JSON.stringify({ api_name: apiName, api_key: keyValue })
      });

      if (result.success && result.data && result.data.data) {
        if (result.data.success) {
          toast.success(result.data.message || 'API-Key funktioniert!');
        } else {
          toast.error(result.data.message || 'API-Key ungültig');
        }
      } else {
        toast.error('Fehler beim Testen des API-Keys');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      toast.error('Fehler beim Testen des API-Keys');
    } finally {
      setTesting({ ...testing, [apiName]: false });
    }
  };

  const toggleShowKey = (apiName) => {
    setShowKey({ ...showKey, [apiName]: !showKey[apiName] });
  };

  const getAPITypeInfo = (apiName) => {
    return apiTypes.find(type => type.name === apiName) || {
      display: apiName,
      description: '',
      testable: false
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-8 w-8 animate-spin text-[#c00000]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            API-Keys Verwaltung
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie API-Keys für externe Dienste
          </p>
        </div>
        <Button
          onClick={() => setShowNewKeyForm(!showNewKeyForm)}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer API-Key
        </Button>
      </div>

      {/* New Key Form */}
      {showNewKeyForm && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4 className={`text-md font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Neuen API-Key hinzufügen
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                API-Typ
              </label>
              <select
                value={newKey.api_name}
                onChange={(e) => setNewKey({ ...newKey, api_name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">API-Typ auswählen...</option>
                {apiCategories.map(category => (
                  <optgroup key={category.category} label={`${category.icon} ${category.category}`}>
                    {category.items.map(type => (
                      <option key={type.name} value={type.name}>
                        {type.display}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {newKey.api_name && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {getAPITypeInfo(newKey.api_name).description}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                API-Key
              </label>
              <input
                type="text"
                value={newKey.api_key}
                onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                placeholder="API-Key eingeben..."
                className={`w-full px-3 py-2 rounded-lg border font-mono ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Beschreibung (Optional)
              </label>
              <textarea
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                placeholder="Beschreibung..."
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddKey}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                Hinzufügen
              </Button>
              <Button
                onClick={() => {
                  setShowNewKeyForm(false);
                  setNewKey({ api_name: '', api_key: '', description: '' });
                }}
                variant="outline"
                className={theme === 'dark' ? 'border-gray-700 text-white' : ''}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys List - Simple List (no category grouping for now) */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <Key className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine API-Keys konfiguriert
            </p>
            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Klicken Sie auf "Neuer API-Key" um Zugangsdaten hinzuzufügen
            </p>
          </Card>
        ) : (
          /* Show all keys in a simple list */
          apiKeys.map((key) => renderKeyCard(key))
        )}
      </div>
    </div>
  );
  
  function renderKeyCard(key) {
            const apiInfo = getAPITypeInfo(key.api_name);
            const isEditing = editingKey === key.api_name;
            const editValue = editValues[key.api_name] || '';
            const editDesc = editDescs[key.api_name] || '';

            return (
              <Card
                key={key.api_name}
                className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`}>
                      <Key className="h-5 w-5 text-[#c00000]" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {apiInfo.display}
                      </h4>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {apiInfo.description}
                      </p>
                      {key.description && (
                        <p className={`text-xs mt-1 italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {key.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeleteKey(key.api_name)}
                    variant="outline"
                    size="sm"
                    className={`text-red-500 hover:text-red-600 ${
                      theme === 'dark' ? 'border-gray-700' : ''
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      API-Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showKey[key.api_name] ? 'text' : 'password'}
                        value={isEditing ? editValue : key.masked_key}
                        onChange={(e) => {
                          if (isEditing) {
                            setEditValues({ ...editValues, [key.api_name]: e.target.value });
                          }
                        }}
                        disabled={!isEditing}
                        className={`flex-1 px-3 py-2 rounded-lg border font-mono text-sm ${
                          theme === 'dark'
                            ? 'bg-[#2a2a2a] border-gray-700 text-white'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        } ${!isEditing && 'cursor-not-allowed'}`}
                      />
                      <Button
                        onClick={() => toggleShowKey(key.api_name)}
                        variant="outline"
                        size="sm"
                        className={theme === 'dark' ? 'border-gray-700' : ''}
                      >
                        {showKey[key.api_name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => handleUpdateKey(key.api_name, editValue, editDesc)}
                          size="sm"
                          className="bg-[#c00000] hover:bg-[#a00000] text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Speichern
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingKey(null);
                            const newEditValues = { ...editValues };
                            delete newEditValues[key.api_name];
                            setEditValues(newEditValues);
                            const newEditDescs = { ...editDescs };
                            delete newEditDescs[key.api_name];
                            setEditDescs(newEditDescs);
                          }}
                          variant="outline"
                          size="sm"
                          className={theme === 'dark' ? 'border-gray-700 text-white' : ''}
                        >
                          Abbrechen
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setEditingKey(key.api_name);
                            setEditValues({ ...editValues, [key.api_name]: '' });
                            setEditDescs({ ...editDescs, [key.api_name]: key.description || '' });
                          }}
                          variant="outline"
                          size="sm"
                          className={theme === 'dark' ? 'border-gray-700 text-white' : ''}
                        >
                          Bearbeiten
                        </Button>
                        {apiInfo.testable && (
                          <Button
                            onClick={() => handleTestKey(key.api_name, key.masked_key)}
                            variant="outline"
                            size="sm"
                            disabled={testing[key.api_name]}
                            className={theme === 'dark' ? 'border-gray-700 text-white' : ''}
                          >
                            {testing[key.api_name] ? (
                              <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Teste...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Testen
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {key.updated_at && (
                  <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Zuletzt aktualisiert: {new Date(key.updated_at).toLocaleString('de-DE')}
                  </p>
                )}
              </Card>
            );
          }
};

export default APIKeysManagement;
