import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Settings, Save, Users, MapPin, Monitor } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const PortalFeatureSettings = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    allow_customer_add_device: false,
    allow_customer_add_location: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/settings');
      
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading portal settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const result = await apiCall('/api/portal/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      if (result.success) {
        toast.success('Einstellungen gespeichert');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving portal settings:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-300 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c00000] rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kundenportal-Berechtigungen
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Steuern Sie, welche Aktionen Kunden im Portal durchführen können
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          {/* Allow Add Device */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <Monitor className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Geräte hinzufügen erlauben
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Kunden können neue Geräte zum Portal hinzufügen
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('allow_customer_add_device')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                settings.allow_customer_add_device ? 'bg-[#c00000]' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allow_customer_add_device ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Allow Add Location */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <MapPin className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Standorte hinzufügen erlauben
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Kunden können neue Standorte zum Portal hinzufügen
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('allow_customer_add_location')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                settings.allow_customer_add_location ? 'bg-[#c00000]' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allow_customer_add_location ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#c00000] hover:bg-[#a00000] text-white'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Speichert...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Einstellungen speichern
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PortalFeatureSettings;
