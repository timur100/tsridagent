import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Settings, Save, RotateCcw, MessageSquare, File, 
  Mic, Archive, Bell, Eye, Check, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

const SupportSettings = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/support-settings');
      console.log('[SupportSettings] Fetch result:', result);
      
      // Handle both direct and nested data structures
      const settingsData = result.data?.settings || result.settings;
      console.log('[SupportSettings] Settings data:', settingsData);
      
      if (settingsData) {
        setSettings(settingsData);
        setHasChanges(false);
      } else {
        console.error('[SupportSettings] No settings in response');
        toast.error('Fehler beim Laden der Einstellungen');
      }
    } catch (error) {
      console.error('[SupportSettings] Error fetching settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const result = await apiCall('/api/support-settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      if (result.success) {
        toast.success('Einstellungen gespeichert');
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };
  
  const handleManualArchive = async () => {
    if (!window.confirm(`Wirklich alle Nachrichten archivieren, die älter als ${settings.archive_after_days} Tage sind?`)) {
      return;
    }
    
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('days_old', settings.archive_after_days.toString());
      
      const result = await apiCall('/api/chat/archive', {
        method: 'POST',
        body: formData
      });
      
      if (result.success) {
        const archivedCount = result.archived_count || 0;
        toast.success(`${archivedCount} Nachricht(en) archiviert`);
      }
    } catch (error) {
      console.error('Error archiving messages:', error);
      toast.error('Fehler beim Archivieren');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    if (window.confirm('Alle Änderungen verwerfen?')) {
      fetchSettings();
    }
  };
  
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };
  
  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {loading ? 'Einstellungen werden geladen...' : 'Keine Einstellungen verfügbar'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-blue-500" />
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Support-Einstellungen
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="text-gray-600 dark:text-gray-400"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
          )}
          <Button
            onClick={handleSaveSettings}
            disabled={saving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      </div>
      
      {/* Chat Settings */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Chat-Einstellungen
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* User-to-User Chat */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                User-zu-User Chat
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Ermöglicht Benutzern, sich direkt zu chatten (nicht nur über Tickets)
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_user_to_user_chat', !settings.enable_user_to_user_chat)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_user_to_user_chat
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_user_to_user_chat ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Typing Indicator */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Tipp-Indikator
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Zeigt an, wenn jemand tippt
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_typing_indicator', !settings.enable_typing_indicator)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_typing_indicator
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_typing_indicator ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Read Receipts */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Lesebestätigungen
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Zeigt an, wann Nachrichten gelesen wurden
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_read_receipts', !settings.enable_read_receipts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_read_receipts
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_read_receipts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>
      
      {/* File Upload Settings */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-4">
          <File className="h-5 w-5 text-green-500" />
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Datei-Upload
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Max File Size */}
          <div className="p-4 rounded-lg border dark:border-gray-700">
            <label className={`block font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Maximale Dateigröße (MB)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.max_file_size_mb}
              onChange={(e) => updateSetting('max_file_size_mb', parseInt(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Empfohlen: 10MB
            </p>
          </div>
          
          {/* Allowed File Types */}
          <div className="p-4 rounded-lg border dark:border-gray-700">
            <label className={`block font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Erlaubte Dateitypen
            </label>
            <input
              type="text"
              value={settings.allowed_file_types?.join(', ') || '*'}
              onChange={(e) => {
                const types = e.target.value.split(',').map(t => t.trim());
                updateSetting('allowed_file_types', types);
              }}
              placeholder="* für alle oder z.B. .pdf, .jpg, .png"
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Komma-getrennte Liste oder * für alle Typen
            </p>
          </div>
        </div>
      </Card>
      
      {/* Audio Settings */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Mic className="h-5 w-5 text-purple-500" />
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Audio-Nachrichten
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Enable Audio */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Audio-Nachrichten aktivieren
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Ermöglicht Benutzern, Sprachnachrichten aufzunehmen
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_audio_messages', !settings.enable_audio_messages)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_audio_messages
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_audio_messages ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Max Audio Duration */}
          {settings.enable_audio_messages && (
            <div className="p-4 rounded-lg border dark:border-gray-700">
              <label className={`block font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Maximale Aufnahmedauer (Sekunden)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.max_audio_duration_seconds}
                onChange={(e) => updateSetting('max_audio_duration_seconds', parseInt(e.target.value))}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#3a3a3a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Empfohlen: 120 Sekunden (2 Minuten)
              </p>
            </div>
          )}
        </div>
      </Card>
      
      {/* Archive Settings */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Archive className="h-5 w-5 text-orange-500" />
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Archivierung
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Enable Auto-Archive */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Automatische Archivierung
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Alte Nachrichten automatisch archivieren
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_auto_archive', !settings.enable_auto_archive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_auto_archive
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_auto_archive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Archive After Days */}
          {settings.enable_auto_archive && (
            <div className="p-4 rounded-lg border dark:border-gray-700">
              <label className={`block font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Archivieren nach (Tagen)
              </label>
              <input
                type="number"
                min="30"
                max="365"
                value={settings.archive_after_days}
                onChange={(e) => updateSetting('archive_after_days', parseInt(e.target.value))}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#3a3a3a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Empfohlen: 90 Tage
              </p>
            </div>
          )}
          
          {/* Manual Archive Now Button */}
          <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
            <p className={`font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Sofortige Archivierung
            </p>
            <p className={`text-sm mb-3 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Archiviert alle Nachrichten, die älter als die konfigurierten Tage sind
            </p>
            <Button
              onClick={handleManualArchive}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Archive className="h-4 w-4 mr-2" />
              Jetzt archivieren
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Notification Settings */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-red-500" />
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Benachrichtigungen
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                E-Mail-Benachrichtigungen
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Bei neuen Nachrichten per E-Mail benachrichtigen
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_email_notifications', !settings.enable_email_notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_email_notifications
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700">
            <div>
              <p className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Push-Benachrichtigungen
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Browser-Benachrichtigungen für neue Nachrichten
              </p>
            </div>
            <button
              onClick={() => updateSetting('enable_push_notifications', !settings.enable_push_notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enable_push_notifications
                  ? 'bg-blue-600'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_push_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>
      
      {/* Save Button (Bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            size="lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SupportSettings;
