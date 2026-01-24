import React, { useState, useEffect } from 'react';
import { X, Home, Settings, Users, FileText, BarChart, Shield, Lock, Monitor, Server, Database, RefreshCw, Clock, Scan, Power } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const SideMenu = ({ isOpen, onClose, onAdminClick, onHistoryClick, onShowPinPad }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Prüfe ob User als Admin eingeloggt ist
    const adminStatus = sessionStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    
    // Prüfe ob Electron
    if (window.agentAPI && window.agentAPI.isElectron) {
      setIsElectron(true);
    }
  }, [isOpen]);

  const loadDeviceInfo = async () => {
    if (!window.agentAPI) return;
    
    try {
      const [systemInfo, status, dbStatsData] = await Promise.all([
        window.agentAPI.getSystemInfo ? window.agentAPI.getSystemInfo() : Promise.resolve({}),
        window.agentAPI.getStatus ? window.agentAPI.getStatus() : Promise.resolve({}),
        window.agentAPI.getDatabaseStats ? window.agentAPI.getDatabaseStats() : Promise.resolve(null)
      ]);
      setAgentInfo({ ...systemInfo, ...status });
      setDbStats(dbStatsData);
    } catch (e) {
      console.log('Agent Info nicht verfügbar:', e);
    }
  };

  const handleShowPinPad = () => {
    // Zeige das ursprüngliche PIN-Pad (ScannerPinPrompt) für Admin-Login
    if (onShowPinPad) {
      onShowPinPad();
    }
    onClose();
  };

  const handleQuitApp = async () => {
    // Bestätigung vor dem Beenden
    const confirmed = window.confirm('Möchten Sie die Anwendung wirklich komplett beenden?');
    if (!confirmed) return;

    // Versuche über Electron API zu beenden
    if (window.agentAPI && window.agentAPI.quitApp) {
      try {
        await window.agentAPI.quitApp();
      } catch (e) {
        console.error('Fehler beim Beenden:', e);
        alert('Die Anwendung konnte nicht beendet werden. Bitte schließen Sie das Fenster manuell.');
      }
    } else {
      alert('Diese Funktion ist nur im TSRID Agent verfügbar.');
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

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Slide Menu */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r-2 border-border z-50 animate-in slide-in-from-left duration-300 flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Menü</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
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
          
          {/* Admin Badge */}
          {isAdmin && (
            <div className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full text-center">
              ✓ Administrator-Modus aktiv
            </div>
          )}
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
                    if (item.id === 'verifications') onHistoryClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-primary/10 border-2 border-transparent transition-all"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Admin-Only: Geräteinformationen */}
          {isAdmin && isElectron && (
            <div className="mb-4">
              <Button
                onClick={() => {
                  setShowDeviceInfo(!showDeviceInfo);
                  if (!showDeviceInfo && !agentInfo) loadDeviceInfo();
                }}
                variant="outline"
                className="w-full gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Server className="h-4 w-4" />
                Geräteinformationen
                <span className="ml-auto">{showDeviceInfo ? '▲' : '▼'}</span>
              </Button>
              
              {showDeviceInfo && (
                <DeviceInfoPanel agentInfo={agentInfo} dbStats={dbStats} onRefresh={loadDeviceInfo} />
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Agent-Admin Button - zeigt PIN-Pad oder öffnet AdminPanel wenn bereits Admin */}
          <Button
            onClick={() => {
              if (isAdmin) {
                // Bereits als Admin eingeloggt - direkt AdminPanel öffnen
                onClose();
                if (onAdminClick) {
                  // Kleiner Delay damit das Menü erst schließt
                  setTimeout(() => onAdminClick(), 100);
                }
              } else {
                // Nicht als Admin - zeige PIN-Pad
                if (onShowPinPad) {
                  onShowPinPad();
                }
                onClose();
              }
            }}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Lock className="h-5 w-5" />
            Agent-Admin
          </Button>
          
          {/* Admin ist eingeloggt - zeige Beenden Button */}
          {isAdmin && (
            <>
              <Button
                onClick={() => {
                  sessionStorage.removeItem('isAdmin');
                  sessionStorage.setItem('userRole', 'user');
                  setIsAdmin(false);
                  setShowDeviceInfo(false);
                  alert('Admin-Modus beendet');
                }}
                variant="outline"
                className="w-full gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Lock className="h-5 w-5" />
                Admin-Modus beenden
              </Button>
              
              {/* Applikation beenden - nur für Admins */}
              <Button
                onClick={handleQuitApp}
                variant="outline"
                className="w-full gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10 font-semibold"
              >
                <Power className="h-5 w-5" />
                Applikation beenden
              </Button>
            </>
          )}
          
          <Button
            onClick={() => window.location.href = '/portal/admin'}
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

// Geräteinformationen Panel - NUR für Admins sichtbar
const DeviceInfoPanel = ({ agentInfo, dbStats, onRefresh }) => {
  if (!agentInfo) {
    return (
      <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground text-center">Lade Geräteinformationen...</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Agent Status */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Server className="h-3 w-3" /> Agent Status
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            agentInfo.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {agentInfo.status === 'running' ? '● Online' : '○ Offline'}
          </span>
        </div>
        <div className="space-y-1 text-xs">
          <InfoRow label="Device ID" value={agentInfo.deviceId} mono />
          <InfoRow label="Hostname" value={agentInfo.hostname} />
          <InfoRow label="IP-Adresse" value={agentInfo.ipAddresses?.[0] || agentInfo.ipAddresses?.ipv4?.[0]} />
          <InfoRow label="MAC-Adresse" value={agentInfo.macAddresses?.[0]} mono />
          <InfoRow label="TeamViewer-ID" value={agentInfo.teamviewerId} mono />
          <InfoRow label="PC-Serial" value={agentInfo.pcSerial} mono />
          <InfoRow label="Scanner-Serial" value={agentInfo.connectedScanners?.[0]?.serial || 'Kein Scanner'} mono />
          <InfoRow label="Heartbeat" value={agentInfo.lastHeartbeat} />
        </div>
      </div>

      {/* SQLite Stats */}
      {dbStats && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
            <Database className="h-3 w-3" /> SQLite Datenbank
          </span>
          <div className="space-y-1 text-xs">
            <InfoRow label="Größe" value={dbStats.dbSizeFormatted} />
            <InfoRow label="Scans" value={dbStats.tables?.scans || 0} />
            <InfoRow label="Standorte" value={dbStats.tables?.locations_cache || 0} />
            <InfoRow label="Configs" value={dbStats.tables?.device_config || 0} />
            {dbStats.unsyncedScans > 0 && (
              <div className="mt-1 p-1.5 bg-yellow-500/20 rounded text-yellow-400 text-center">
                ⚠ {dbStats.unsyncedScans} unsynced
              </div>
            )}
          </div>
        </div>
      )}

      {/* Atlas Sync */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
          <RefreshCw className="h-3 w-3" /> Atlas Sync
        </span>
        {dbStats?.lastSync ? (
          <div className="space-y-1 text-xs">
            <InfoRow label="Letzter Sync" value={formatDate(dbStats.lastSync.completedAt)} />
            <InfoRow label="Datensätze" value={dbStats.lastSync.recordsCount} />
            <div className="mt-1 p-1.5 bg-green-500/20 rounded text-green-400 text-center">
              ✓ Synchronisiert
            </div>
          </div>
        ) : (
          <div className="p-1.5 bg-yellow-500/20 rounded text-yellow-400 text-center text-xs">
            ⚠ Noch nie synchronisiert
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <Button onClick={onRefresh} variant="outline" size="sm" className="w-full gap-2">
        <RefreshCw className="h-3 w-3" /> Aktualisieren
      </Button>
    </div>
  );
};

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}:</span>
    <span className={`text-foreground truncate max-w-[150px] ${mono ? 'font-mono text-[10px]' : ''}`}>
      {value || 'N/A'}
    </span>
  </div>
);

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString('de-DE');
  } catch { return dateStr; }
};

export default SideMenu;
