import React, { useState, useEffect } from 'react';
import { X, Home, Settings, Users, FileText, BarChart, Shield, Lock, Monitor, Cpu, Wifi, Server, Database, RefreshCw, HardDrive, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const SideMenu = ({ isOpen, onClose, onAdminClick, onHistoryClick }) => {
  const [agentInfo, setAgentInfo] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isElectron, setIsElectron] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);

  useEffect(() => {
    const loadAgentData = async () => {
      if (window.agentAPI && window.agentAPI.isElectron) {
        setIsElectron(true);
        try {
          const [systemInfo, status, dbStatsData, logs] = await Promise.all([
            window.agentAPI.getSystemInfo(),
            window.agentAPI.getStatus(),
            window.agentAPI.getDatabaseStats(),
            window.agentAPI.getSyncLogs()
          ]);
          setAgentInfo({ ...systemInfo, ...status });
          setDbStats(dbStatsData);
          setSyncLogs(logs || []);
        } catch (e) {
          console.log('Agent Info nicht verfügbar:', e);
        }
      }
    };
    
    if (isOpen) {
      loadAgentData();
    }
  }, [isOpen]);

  const toggleKioskMode = async () => {
    const pin = prompt('Admin-PIN für Kiosk-Modus eingeben:');
    if (!pin) return;
    
    try {
      if (kioskMode) {
        const result = await window.agentAPI.disableKioskMode(pin);
        if (result.success) {
          setKioskMode(false);
          alert('Kiosk-Modus deaktiviert');
        } else {
          alert(result.message);
        }
      } else {
        const result = await window.agentAPI.enableKioskMode(pin);
        if (result.success) {
          setKioskMode(true);
          alert('Kiosk-Modus aktiviert');
        } else {
          alert(result.message);
        }
      }
    } catch (e) {
      alert('Fehler: ' + e.message);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Startseite', icon: Home },
    { id: 'verifications', label: 'Verifizierungen', icon: Shield },
    { id: 'statistics', label: 'Statistiken', icon: BarChart },
    { id: 'users', label: 'Benutzer', icon: Users },
    { id: 'reports', label: 'Berichte', icon: FileText },
    { id: 'settings', label: 'Einstellungen', icon: Settings }
  ];

  if (!isOpen) return null;

  const lastSync = syncLogs.find(l => l.status === 'completed');

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Slide Menu */}
      <div className="fixed left-0 top-0 bottom-0 w-96 bg-card border-r-2 border-border z-50 animate-in slide-in-from-left duration-300 flex flex-col">
        {/* Header with Logo */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Menü</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>
          </div>
          
          {/* Logo */}
          <div className="flex items-center justify-center py-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/1angt2am_TSRID_Logo1_white.svg"
              alt="TSRID GmbH"
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Menu Items */}
          <div className="space-y-2 mb-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'verifications') {
                      onHistoryClick();
                    }
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-primary/10 hover:border-primary/30 border-2 border-transparent transition-all group"
                >
                  <Icon className="h-5 w-5 text-primary group-hover:text-primary" />
                  <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Agent System Info (nur in Electron) */}
          {isElectron && agentInfo && (
            <div className="space-y-4">
              {/* Agent Status */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Agent Status</h3>
                  <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
                    agentInfo.status === 'running' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {agentInfo.status === 'running' ? '● Online' : '○ Offline'}
                  </span>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  <InfoRow icon={Monitor} label="Device" value={agentInfo.deviceId} mono />
                  <InfoRow icon={Cpu} label="Hostname" value={agentInfo.hostname} />
                  <InfoRow icon={Wifi} label="IP" value={agentInfo.ipAddresses?.[0]} />
                  {agentInfo.teamviewerId && (
                    <InfoRow icon={Monitor} label="TeamViewer" value={agentInfo.teamviewerId} mono />
                  )}
                  {agentInfo.pcSerial && (
                    <InfoRow icon={Server} label="PC-Serial" value={agentInfo.pcSerial} mono />
                  )}
                  {agentInfo.macAddresses?.[0] && (
                    <InfoRow icon={Wifi} label="MAC" value={agentInfo.macAddresses[0]} mono />
                  )}
                  {agentInfo.lastHeartbeat && (
                    <InfoRow icon={Clock} label="Heartbeat" value={agentInfo.lastHeartbeat} />
                  )}
                </div>
              </div>

              {/* SQLite Database Stats */}
              {dbStats && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-foreground">SQLite Datenbank</h3>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <InfoRow icon={HardDrive} label="Größe" value={dbStats.dbSizeFormatted || '0 B'} />
                    <InfoRow icon={FileText} label="Scans" value={dbStats.tables?.scans || 0} />
                    <InfoRow icon={Server} label="Standorte" value={dbStats.tables?.locations_cache || 0} />
                    <InfoRow icon={Settings} label="Configs" value={dbStats.tables?.device_config || 0} />
                    <InfoRow icon={FileText} label="Logs" value={dbStats.tables?.app_logs || 0} />
                    
                    {dbStats.unsyncedScans > 0 && (
                      <div className="mt-2 p-2 bg-yellow-500/20 rounded text-yellow-400">
                        ⚠ {dbStats.unsyncedScans} unsynced Scans
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Atlas Sync Status */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-5 w-5 text-green-400" />
                  <h3 className="font-semibold text-foreground">Atlas Sync</h3>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  {lastSync ? (
                    <>
                      <InfoRow icon={Clock} label="Letzte Sync" value={formatDate(lastSync.completed_at)} />
                      <InfoRow icon={FileText} label="Aktion" value={lastSync.action} />
                      <InfoRow icon={Database} label="Datensätze" value={lastSync.records_count} />
                      <div className="mt-2 p-2 bg-green-500/20 rounded text-green-400 text-center">
                        ✓ Synchronisiert mit MongoDB Atlas
                      </div>
                    </>
                  ) : (
                    <div className="p-2 bg-yellow-500/20 rounded text-yellow-400 text-center">
                      ⚠ Noch nie synchronisiert
                    </div>
                  )}
                </div>
                
                {syncLogs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Letzte Sync-Aktivitäten:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {syncLogs.slice(0, 5).map((log, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{log.action}</span>
                          <span className={log.status === 'completed' ? 'text-green-400' : 'text-red-400'}>
                            {log.status === 'completed' ? '✓' : '✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Kiosk Mode Toggle */}
              <Button
                onClick={toggleKioskMode}
                variant="outline"
                className="w-full gap-2"
              >
                <Monitor className="h-4 w-4" />
                {kioskMode ? 'Kiosk-Modus deaktivieren (PIN: 9988)' : 'Kiosk-Modus aktivieren (PIN: 9988)'}
              </Button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            onClick={() => {
              onAdminClick();
              onClose();
            }}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Lock className="h-5 w-5" />
            Administrator-Bereich
          </Button>
          
          <Button
            onClick={() => {
              window.location.href = '/portal/admin';
            }}
            variant="outline"
            className="w-full gap-2 border-2 border-primary/50 hover:bg-primary/10"
          >
            <Settings className="h-5 w-5" />
            Admin Portal öffnen
          </Button>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            TSRID GmbH - Version 1.2
          </p>
        </div>
      </div>
    </>
  );
};

// Hilfskomponente für Info-Zeilen
const InfoRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
    <span className="text-muted-foreground">{label}:</span>
    <span className={`text-foreground truncate ${mono ? 'font-mono text-xs' : ''}`}>
      {value || 'N/A'}
    </span>
  </div>
);

// Datum formatieren
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export default SideMenu;
