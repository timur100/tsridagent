import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RefreshCw, CheckCircle, Activity, Clock, Power, PlayCircle, StopCircle } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const TeamViewerSettings = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState('unknown');

  useEffect(() => {
    loadSyncStatus();
    loadAutoSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/teamviewer/sync-status');
      
      if (result.success && result.data) {
        setLastSync(result.data);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutoSyncStatus = async () => {
    try {
      const result = await apiCall('/api/portal/teamviewer/auto-sync/status');
      
      if (result.success && result.data) {
        setAutoSyncEnabled(result.data.enabled || false);
        setAutoSyncStatus(result.data.status || 'unknown');
      }
    } catch (error) {
      console.error('Error loading auto-sync status:', error);
    }
  };

  const startAutoSync = async () => {
    try {
      const result = await apiCall('/api/portal/teamviewer/auto-sync/start', {
        method: 'POST'
      });
      
      if (result.success) {
        toast.success('Auto-Sync gestartet (alle 30 Sekunden)');
        setAutoSyncEnabled(true);
        setAutoSyncStatus('running');
        loadSyncStatus();
      } else {
        toast.error('Fehler beim Starten des Auto-Sync');
      }
    } catch (error) {
      console.error('Error starting auto-sync:', error);
      toast.error('Fehler beim Starten des Auto-Sync');
    }
  };

  const stopAutoSync = async () => {
    try {
      const result = await apiCall('/api/portal/teamviewer/auto-sync/stop', {
        method: 'POST'
      });
      
      if (result.success) {
        toast.success('Auto-Sync gestoppt');
        setAutoSyncEnabled(false);
        setAutoSyncStatus('stopped');
      } else {
        toast.error('Fehler beim Stoppen des Auto-Sync');
      }
    } catch (error) {
      console.error('Error stopping auto-sync:', error);
      toast.error('Fehler beim Stoppen des Auto-Sync');
    }
  };

  const syncDeviceStatus = async () => {
    setSyncing(true);
    try {
      const result = await apiCall('/api/portal/teamviewer/sync-status', {
        method: 'POST'
      });
      
      if (result.success && result.data) {
        toast.success(result.data.message || 'Synchronisierung gestartet');
        
        // Wait a bit then reload sync status
        setTimeout(() => {
          loadSyncStatus();
        }, 3000);
      } else {
        toast.error('Fehler bei der Synchronisierung');
      }
    } catch (error) {
      console.error('Error syncing status:', error);
      toast.error('Fehler bei der Synchronisierung');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          TeamViewer Integration
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Synchronisieren Sie den Online-Status Ihrer Geräte mit TeamViewer
        </p>
      </div>

      {/* Sync Status Card */}
      <Card className={`p-6 ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none' 
          : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <Activity className={`h-6 w-6 ${
                lastSync?.status === 'success' ? 'text-green-500' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Status-Synchronisierung
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {lastSync?.status === 'success' ? 'Aktiv' : lastSync?.status === 'never_synced' ? 'Nicht synchronisiert' : 'Fehler'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Manual Sync Button */}
            <button
              onClick={syncDeviceStatus}
              disabled={syncing}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                syncing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#c00000] hover:bg-[#a00000] text-white'
              }`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Synchronisiere...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Manueller Sync
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auto-Sync Control Section */}
        <div className={`mt-6 p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Power className={`h-5 w-5 ${
                autoSyncEnabled ? 'text-green-500' : 'text-gray-400'
              }`} />
              <div>
                <h5 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Automatische Synchronisierung
                </h5>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {autoSyncEnabled 
                    ? 'Läuft automatisch alle 30 Sekunden' 
                    : 'Derzeit gestoppt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                autoSyncEnabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {autoSyncStatus === 'running' ? 'Läuft' : 'Gestoppt'}
              </span>
              
              {autoSyncEnabled ? (
                <button
                  onClick={stopAutoSync}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Stoppen
                </button>
              ) : (
                <button
                  onClick={startAutoSync}
                  className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Starten
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sync Statistics */}
        {!loading && lastSync && lastSync.last_sync && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }">
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Letzte Synchronisierung
                </p>
              </div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(lastSync.last_sync)}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Geräte synchronisiert
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {lastSync.devices_synced || 0}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Online
              </p>
              <p className="text-2xl font-bold text-green-500">
                {lastSync.devices_online || 0}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Offline
              </p>
              <p className="text-2xl font-bold text-red-500">
                {lastSync.devices_offline || 0}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className={`p-6 ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none' 
          : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Über die TeamViewer-Synchronisierung
            </h4>
            <ul className={`text-sm space-y-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <li>• Synchronisiert den Online/Offline-Status aller Geräte mit TeamViewer IDs</li>
              <li>• Aktualisiert automatisch die Status-Anzeige in der Geräteverwaltung</li>
              <li>• Die Synchronisierung läuft im Hintergrund und dauert ca. 10-30 Sekunden</li>
              <li>• Geräte ohne TeamViewer ID werden nicht synchronisiert</li>
              <li>• Mit aktiviertem Auto-Sync wird der Status alle 30 Sekunden automatisch aktualisiert</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TeamViewerSettings;
