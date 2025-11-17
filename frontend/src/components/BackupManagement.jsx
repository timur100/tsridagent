import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Database, HardDrive, Download, Trash2, RefreshCw, Settings, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BackupManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [backups, setBackups] = useState([]);
  const [config, setConfig] = useState({
    auto_backup_enabled: false,
    backup_interval_hours: 6,
    database_backup_enabled: true,
    full_backup_enabled: false,
    max_backups_to_keep: 10
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, []);

  const fetchBackups = async () => {
    try {
      const result = await apiCall('/api/backup/list');
      if (result.success) {
        setBackups(result.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Fehler beim Laden der Backups');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const result = await apiCall('/api/backup/config');
      if (result) {
        setConfig(result);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const createBackup = async (backupType, description = '') => {
    setCreating(true);
    try {
      const result = await apiCall('/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ backup_type: backupType, description })
      });

      if (result.success) {
        toast.success('Backup erfolgreich erstellt');
        fetchBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Fehler beim Erstellen des Backups');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (backupId, fileName) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/backup/download/${backupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download gestartet');
      } else {
        toast.error('Download fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Fehler beim Download');
    }
  };

  const deleteBackup = async (backupId) => {
    if (!window.confirm('Möchten Sie dieses Backup wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/backup/delete/${backupId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Backup gelöscht');
        fetchBackups();
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const saveConfig = async () => {
    try {
      const result = await apiCall('/api/backup/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });

      if (result.success) {
        toast.success('Einstellungen gespeichert');
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Backup-Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen und verwalten Sie Backups Ihrer Daten
          </p>
        </div>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Settings className="h-4 w-4 mr-2" />
          Einstellungen
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Backup-Einstellungen
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Automatische Backups
                </label>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Backups automatisch nach Zeitplan erstellen
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.auto_backup_enabled}
                onChange={(e) => setConfig({...config, auto_backup_enabled: e.target.checked})}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Backup-Intervall (Stunden)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={config.backup_interval_hours}
                onChange={(e) => setConfig({...config, backup_interval_hours: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Maximale Anzahl Backups
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.max_backups_to_keep}
                onChange={(e) => setConfig({...config, max_backups_to_keep: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowSettings(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Abbrechen
              </Button>
              <Button
                onClick={saveConfig}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                Speichern
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create Backup Buttons */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Neues Backup erstellen
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => createBackup('database', 'Manuelles Datenbank-Backup')}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 h-auto flex flex-col items-center"
          >
            <Database className="h-8 w-8 mb-2" />
            <span className="font-semibold">Datenbank-Backup</span>
            <span className="text-xs mt-1 opacity-80">MongoDB Datenbank sichern</span>
          </Button>

          <Button
            onClick={() => createBackup('full', 'Manuelles Vollständiges Backup')}
            disabled={creating}
            className="bg-purple-600 hover:bg-purple-700 text-white py-4 h-auto flex flex-col items-center"
          >
            <HardDrive className="h-8 w-8 mb-2" />
            <span className="font-semibold">Vollständiges Backup</span>
            <span className="text-xs mt-1 opacity-80">Datenbank + Code sichern</span>
          </Button>
        </div>

        {creating && (
          <div className="mt-4 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500" />
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Backup wird erstellt...
            </p>
          </div>
        )}
      </Card>

      {/* Backup List */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Verfügbare Backups ({backups.length})
          </h3>
          <Button
            onClick={fetchBackups}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8">
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Noch keine Backups vorhanden
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {backup.backup_type === 'database' ? (
                        <Database className="h-5 w-5 text-blue-500" />
                      ) : (
                        <HardDrive className="h-5 w-5 text-purple-500" />
                      )}
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {backup.file_name}
                      </span>
                      {backup.file_exists && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    <div className={`text-sm space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {backup.description && <p>{backup.description}</p>}
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(backup.created_at)}
                        </span>
                        <span>{formatSize(backup.file_size)}</span>
                        <span className="capitalize">{backup.backup_type === 'database' ? 'Datenbank' : 'Vollständig'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => downloadBackup(backup.id, backup.file_name)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!backup.file_exists}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteBackup(backup.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BackupManagement;
