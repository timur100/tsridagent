import React, { useState, useEffect } from 'react';
import { Download, Upload, RotateCcw, Save, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const SettingsBackup = ({ currentSettings, onRestore }) => {
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load backup history on mount
  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/backup/history?device_id=${currentSettings.deviceId}`);
      const data = await response.json();
      
      if (data.success) {
        setBackupHistory(data.backups || []);
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
    }
  };

  const handleExportSettings = () => {
    try {
      console.log('Starting export with settings:', currentSettings);
      
      // Create JSON string
      const dataStr = JSON.stringify(currentSettings, null, 2);
      console.log('JSON string created, length:', dataStr.length);
      
      // Method 1: Try with data URL (works better in some browsers)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      // Create temporary link element
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `settings_${currentSettings.deviceId}_${new Date().toISOString().split('T')[0]}.json`;
      link.style.display = 'none';
      
      // Append to body
      document.body.appendChild(link);
      console.log('Link appended to body');
      
      // Trigger download
      link.click();
      console.log('Link clicked');
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        console.log('Cleanup completed');
      }, 100);
      
      toast.success('Einstellungen exportiert - Datei wird heruntergeladen');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren: ' + error.message);
    }
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Importing file:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        console.log('Imported settings:', imported);
        onRestore(imported);
        toast.success('Einstellungen importiert');
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Fehler beim Importieren der Einstellungen');
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      toast.error('Fehler beim Lesen der Datei');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSaveBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: currentSettings.deviceId,
          settings: currentSettings,
          description: `Backup vom ${new Date().toLocaleString('de-DE')}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Backup erfolgreich erstellt');
        loadBackupHistory();
      } else {
        toast.error('Fehler beim Erstellen des Backups');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Backups');
      console.error('Error creating backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backup_id: backupId })
      });

      const data = await response.json();
      
      if (data.success) {
        onRestore(data.settings);
        toast.success('Einstellungen wiederhergestellt');
      } else {
        toast.error('Fehler beim Wiederherstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Wiederherstellen');
      console.error('Error restoring backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Backup wirklich löschen?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/backup/${backupId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Backup gelöscht');
        loadBackupHistory();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Wirklich auf Standardwerte zurücksetzen? Alle aktuellen Einstellungen gehen verloren.')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/default`);
      const data = await response.json();
      
      if (data.success) {
        onRestore(data.settings);
        toast.success('Auf Standardwerte zurückgesetzt');
      }
    } catch (error) {
      toast.error('Fehler beim Zurücksetzen');
      console.error('Error resetting to default:', error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Save className="h-5 w-5" />
        Einstellungen Verwaltung
      </h3>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          onClick={handleSaveBackup}
          disabled={loading}
          className="w-full"
          variant="default"
        >
          <Save className="mr-2 h-4 w-4" />
          Backup erstellen
        </Button>

        <Button
          onClick={handleExportSettings}
          className="w-full"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportieren
        </Button>

        <div className="w-full">
          <input
            type="file"
            id="import-settings-file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
          />
          <Button
            onClick={() => document.getElementById('import-settings-file').click()}
            className="w-full"
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importieren
          </Button>
        </div>

        <Button
          onClick={handleResetToDefault}
          className="w-full"
          variant="outline"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Zurücksetzen
        </Button>
      </div>

      {/* Backup History */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Backup-Historie
        </h4>
        
        {backupHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Backups vorhanden
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {backupHistory.map((backup) => (
              <div
                key={backup.backup_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {backup.description || 'Backup'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(backup.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreBackup(backup.backup_id)}
                    disabled={loading}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Wiederherstellen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBackup(backup.backup_id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SettingsBackup;
