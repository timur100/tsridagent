import React, { useState, useEffect } from 'react';
import { Server, RefreshCw, Check, X, Clock, AlertCircle, Users } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MasterSyncManager = ({ currentDeviceId, currentSettings }) => {
  const [masterConfig, setMasterConfig] = useState(null);
  const [devices, setDevices] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);

  useEffect(() => {
    loadMasterConfig();
    loadDevices();
    loadSyncHistory();
    registerCurrentDevice();
  }, [currentDeviceId]);

  const registerCurrentDevice = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/master-sync/register-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: currentDeviceId,
          device_name: currentSettings.stationName || currentDeviceId,
          location: currentSettings.location || ''
        })
      });
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  const loadMasterConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/master`);
      const data = await response.json();
      
      if (data.success && data.has_master) {
        setMasterConfig(data.master);
        setAutoSyncEnabled(data.master.auto_sync_enabled);
        setSyncInterval(data.master.sync_interval_minutes);
      }
    } catch (error) {
      console.error('Error loading master config:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/devices`);
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/history?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setSyncHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  };

  const handleSetAsMaster = async () => {
    if (!window.confirm(`Dieses Gerät (${currentDeviceId}) als Master festlegen?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/set-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_device_id: currentDeviceId,
          auto_sync_enabled: false,
          sync_interval_minutes: 5
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Als Master-Gerät festgelegt');
        loadMasterConfig();
      } else {
        toast.error('Fehler beim Festlegen des Masters');
      }
    } catch (error) {
      toast.error('Fehler beim Festlegen des Masters');
      console.error('Set master error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePushSettings = async () => {
    if (!masterConfig || masterConfig.master_device_id !== currentDeviceId) {
      toast.error('Nur das Master-Gerät kann Einstellungen verteilen');
      return;
    }

    if (!window.confirm(`Einstellungen an alle ${devices.length} Geräte verteilen?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: currentSettings,
          description: `Manuelle Synchronisation von ${currentDeviceId}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Einstellungen an ${data.success_count} Geräte übertragen`);
        loadDevices();
        loadSyncHistory();
      } else {
        toast.error('Fehler bei der Synchronisation');
      }
    } catch (error) {
      toast.error('Fehler bei der Synchronisation');
      console.error('Push error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSync = async (enabled) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/master-sync/auto-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enabled,
          interval_minutes: syncInterval
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAutoSyncEnabled(enabled);
        toast.success(data.message);
        loadMasterConfig();
      }
    } catch (error) {
      toast.error('Fehler beim Konfigurieren der Auto-Sync');
      console.error('Auto-sync error:', error);
    }
  };

  const isMasterDevice = masterConfig && masterConfig.master_device_id === currentDeviceId;

  const formatDate = (isoString) => {
    if (!isoString) return 'Nie';
    return new Date(isoString).toLocaleString('de-DE');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-600">Synchronisiert</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehler</Badge>;
      case 'never_synced':
        return <Badge variant="secondary">Noch nie synchronisiert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Server className="h-6 w-6" />
          Master-Gerät Synchronisation
        </h2>
      </div>

      {/* Master Device Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Master-Gerät Status</h3>
        
        {masterConfig && masterConfig.has_master !== false ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Aktuelles Master-Gerät</p>
                <p className="text-lg font-semibold text-foreground">{masterConfig.master_device_id}</p>
                {isMasterDevice && (
                  <Badge className="mt-2 bg-primary">Dies ist das Master-Gerät</Badge>
                )}
              </div>
              <Server className="h-8 w-8 text-primary" />
            </div>

            {isMasterDevice && (
              <>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">Automatische Synchronisation</p>
                      <p className="text-sm text-muted-foreground">
                        Einstellungen automatisch alle {syncInterval} Minuten verteilen
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => handleToggleAutoSync(e.target.checked)}
                      className="h-5 w-5"
                    />
                  </div>

                  {autoSyncEnabled && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Synchronisations-Intervall (Minuten)
                      </label>
                      <select
                        value={syncInterval}
                        onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                      >
                        <option value={1}>1 Minute</option>
                        <option value={5}>5 Minuten</option>
                        <option value={15}>15 Minuten</option>
                        <option value={30}>30 Minuten</option>
                        <option value={60}>60 Minuten</option>
                      </select>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handlePushSettings}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Kein Master-Gerät konfiguriert</p>
            <Button onClick={handleSetAsMaster} disabled={loading}>
              <Server className="mr-2 h-4 w-4" />
              Dieses Gerät als Master festlegen
            </Button>
          </div>
        )}
      </Card>

      {/* Registered Devices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registrierte Geräte ({devices.length})
          </h3>
          <Button variant="outline" size="sm" onClick={loadDevices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>

        {devices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Keine Geräte registriert</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.device_id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30"
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{device.device_name}</p>
                  <p className="text-sm text-muted-foreground">{device.device_id}</p>
                  {device.location && (
                    <p className="text-xs text-muted-foreground mt-1">{device.location}</p>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(device.sync_status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(device.last_sync)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sync History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Synchronisations-Historie
        </h3>

        {syncHistory.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Keine Historie vorhanden</p>
        ) : (
          <div className="space-y-3">
            {syncHistory.map((entry) => (
              <div
                key={entry.sync_id}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{entry.description || 'Synchronisation'}</p>
                    <p className="text-sm text-muted-foreground">
                      Master: {entry.master_device_id}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</p>
                </div>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{entry.success_count} erfolgreich</span>
                  </div>
                  {entry.failed_count > 0 && (
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-destructive" />
                      <span className="text-sm">{entry.failed_count} fehlgeschlagen</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MasterSyncManager;
